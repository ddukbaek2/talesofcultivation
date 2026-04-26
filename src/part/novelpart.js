//==============================================================================
// 포함 모듈 목록.
//==============================================================================
const System = globalThis;
import { Object } from "../../libs/vanilla.js/src/base/object.js";
import { AudioBeepPlayer, BeepWaveform } from "../base/audiobeepplayer.js";


//==============================================================================
// 상수.
//==============================================================================
const SIDE_MARGIN = 16;
const TEXTBOX_HEIGHT = 220;
const TEXTBOX_BOTTOM_MARGIN = 24;
const NAME_BOX_HEIGHT = 40;
const NAME_BOX_PADDING_X = 24;
const NAME_BOX_MIN_WIDTH = 80;
const NAME_BOX_FONT = "bold 18px GyeonggiBatangBold, sans-serif";
const TYPING_CHARS_PER_SECOND = 28;
const FAST_FORWARD_SPEED_MULTIPLIER = 8;
const CONTINUE_ICON_BOB_AMPLITUDE = 3;
const CONTINUE_ICON_BOB_FREQUENCY = 1.6;
const CONTINUE_ICON_GAP = 10;


//==============================================================================
// 비주얼 노벨 파트.
// - 외부에서 dialoguetable 의 모든 행을 setDialogues 로 받아둠.
// - playScene(sceneName) 으로 특정 장면의 대사들만 sequence 순으로 추출해 시작.
// - 대사 한 줄씩 타이핑 효과로 출력.
// - 누르면 진행 (타이핑 중이면 즉시 완성, 완성 상태면 다음 대사).
// - 마지막 대사 이후 한 번 더 누르면 isFinished = true.
//==============================================================================
export class NovelPart extends Object {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @private @type { Array<{ id: number, scene: string, sequence: number, speaker: string, text: string }> } */ #allDialogues;
	/** @private @type { Array<{ id: number, scene: string, sequence: number, speaker: string, text: string }> } */ #dialogues;
	/** @private @type { string } */ #currentScene;
	/** @private @type { number } */ #currentIndex;
	/** @private @type { number } */ #revealedChars;
	/** @private @type { boolean } */ #isFinished;
	/** @private @type { boolean } */ #wasTouchPressed;
	/** @private @type { boolean } */ #hasReceivedFirstInput;
	/** @private @type { number } */ #elapsedTime;
	/** @private @type { AudioBeepPlayer | null } */ #audioBeepPlayer;

	//==============================================================================
	// 생성.
	//==============================================================================
	constructor() {
		super();
		this.#allDialogues = [];
		this.#dialogues = [];
		this.#currentScene = "";
		this.#currentIndex = 0;
		this.#revealedChars = 0;
		this.#isFinished = false;
		this.#wasTouchPressed = false;
		this.#hasReceivedFirstInput = false;
		this.#elapsedTime = 0;
		this.#audioBeepPlayer = null;
	}

	//==============================================================================
	// 외부에서 대사 테이블 (모든 행) 주입.
	//==============================================================================
	/**
	 * @param { Array<{ id: number, scene: string, sequence: number, speaker: string, text: string }> } allDialogues
	 */
	setDialogues(allDialogues) {
		this.#allDialogues = System.Array.isArray(allDialogues) ? allDialogues : [];
		// 현재 재생 중인 장면이 있으면 데이터 갱신 후 그 장면을 다시 추출.
		if (this.#currentScene && this.#currentScene.length > 0) {
			this.playScene(this.#currentScene);
		}
	}

	//==============================================================================
	// 특정 장면의 대사들을 sequence 오름차순으로 추출해 처음부터 시작.
	//==============================================================================
	/**
	 * @param { string } sceneName
	 */
	playScene(sceneName) {
		this.#currentScene = sceneName;
		const filtered = this.#allDialogues.filter((d) => d.scene === sceneName);
		filtered.sort((a, b) => {
			const av = typeof a.sequence === "number" ? a.sequence : 0;
			const bv = typeof b.sequence === "number" ? b.sequence : 0;
			return av - bv;
		});
		this.#dialogues = filtered;
		this.#currentIndex = 0;
		this.#revealedChars = 0;
		this.#isFinished = this.#dialogues.length === 0;
		this.#wasTouchPressed = false;
	}

	//==============================================================================
	// 처음으로 (현재 장면을 다시 처음부터). 장면이 비어 있으면 즉시 종료 상태.
	//==============================================================================
	reset() {
		this.#currentIndex = 0;
		this.#revealedChars = 0;
		this.#isFinished = this.#dialogues.length === 0;
		this.#wasTouchPressed = false;
	}

	//==============================================================================
	// 종료 여부 (모든 대사 끝남).
	//==============================================================================
	/**
	 * @returns { boolean }
	 */
	isFinished() {
		return this.#isFinished;
	}

	//==============================================================================
	// 갱신.
	//==============================================================================
	/**
	 * @param { number } timeDelta
	 * @param { import("../libs/vanilla.js/src/core/inputmanager.js").InputManager } inputManager
	 * @param { { x: number, y: number, width: number, height: number } } popupRect
	 */
	tick(timeDelta, inputManager, popupRect) {
		this.#elapsedTime += timeDelta;
		if (this.#isFinished) {
			return;
		}
		if (this.#dialogues.length === 0) {
			this.#isFinished = true;
			return;
		}

		// 첫 입력 대기.
		// 브라우저 자동재생 정책 때문에 첫 사용자 제스처 전에는 AudioContext 가 잠겨있어
		// 비프음이 들리지 않는다. 첫 클릭으로 컨텍스트를 깨운 뒤 타이핑을 시작한다.
		if (!this.#hasReceivedFirstInput) {
			const firstIsPressed = inputManager.isTouchPressed();
			if (firstIsPressed && !this.#wasTouchPressed) {
				this.#hasReceivedFirstInput = true;
				const startupAudioBeepPlayer = this.getAudioBeepPlayer();
				if (startupAudioBeepPlayer) {
					const startupAudioContext = startupAudioBeepPlayer.getAudioContext();
					if (startupAudioContext && startupAudioContext.state === "suspended") {
						startupAudioContext.resume();
					}
				}
			}
			this.#wasTouchPressed = firstIsPressed;
			return;
		}

		// Control 키를 누르고 있으면 고속 재생 (타이핑 가속 + 자동 진행, 비프 묵음).
		const isFastForward = inputManager.isKeyPressed("ControlLeft") || inputManager.isKeyPressed("ControlRight");
		const typingCharsPerSecond = isFastForward ? TYPING_CHARS_PER_SECOND * FAST_FORWARD_SPEED_MULTIPLIER : TYPING_CHARS_PER_SECOND;

		// 타이핑 진행.
		const currentDialogue = this.#dialogues[this.#currentIndex];
		const previousRevealedCharIndex = System.Math.floor(this.#revealedChars);
		if (this.#revealedChars < currentDialogue.text.length) {
			this.#revealedChars += typingCharsPerSecond * timeDelta;
			if (this.#revealedChars > currentDialogue.text.length) {
				this.#revealedChars = currentDialogue.text.length;
			}
		}

		// 새로 드러난 글자마다 타이핑 비프 재생 (공백/구두점 제외, 고속 재생 중에는 묵음).
		const nextRevealedCharIndex = System.Math.floor(this.#revealedChars);
		if (!isFastForward && nextRevealedCharIndex > previousRevealedCharIndex) {
			const typingAudioBeepPlayer = this.getAudioBeepPlayer();
			if (typingAudioBeepPlayer) {
				for (let charIndex = previousRevealedCharIndex; charIndex < nextRevealedCharIndex; ++charIndex) {
					const typedCharacter = currentDialogue.text.charAt(charIndex);
					if (this.isTypingBeepCharacter(typedCharacter)) {
						typingAudioBeepPlayer.playTone(720, 18, BeepWaveform.square, 0.12, 0.0);
					}
				}
			}
		}

		const fullyRevealed = this.#revealedChars >= currentDialogue.text.length;

		// Control 고속 재생 중 완성된 대사는 클릭 없이 자동 진행 (효과음 없음).
		if (isFastForward && fullyRevealed) {
			if (this.#currentIndex + 1 < this.#dialogues.length) {
				++this.#currentIndex;
				this.#revealedChars = 0;
			}
			else {
				this.#isFinished = true;
			}
			this.#wasTouchPressed = inputManager.isTouchPressed();
			return;
		}

		// 입력 처리 (just-pressed 트리거).
		const isPressed = inputManager.isTouchPressed();
		if (isPressed && !this.#wasTouchPressed) {
			const clickAudioBeepPlayer = this.getAudioBeepPlayer();
			if (!fullyRevealed) {
				// 타이핑 중이면 즉시 완성.
				this.#revealedChars = currentDialogue.text.length;
				if (clickAudioBeepPlayer) {
					clickAudioBeepPlayer.playClick();
				}
			}
			else {
				// 다음 대사 또는 종료.
				if (this.#currentIndex + 1 < this.#dialogues.length) {
					++this.#currentIndex;
					this.#revealedChars = 0;
					if (clickAudioBeepPlayer) {
						clickAudioBeepPlayer.playClick();
					}
				}
				else {
					this.#isFinished = true;
					if (clickAudioBeepPlayer) {
						clickAudioBeepPlayer.playConfirm();
					}
				}
			}
		}
		this.#wasTouchPressed = isPressed;
	}

	//==============================================================================
	// 출력.
	//==============================================================================
	/**
	 * @param { import("../libs/vanilla.js/src/core/graphic.js").Graphic } graphic
	 * @param { { x: number, y: number, width: number, height: number } } popupRect
	 */
	draw(graphic, popupRect) {
		const canvasRenderingContext = graphic.getCanvasRenderingContext();
		const popupCenterX = popupRect.x + popupRect.width * 0.5;

		// 배경 (어두운 그라데이션 느낌으로 단색).
		canvasRenderingContext.fillStyle = "#0a0a14";
		canvasRenderingContext.fillRect(popupRect.x, popupRect.y, popupRect.width, popupRect.height);

		// 가운데 위쪽에 장면 타이틀 (가라).
		canvasRenderingContext.fillStyle = "#cccccc";
		canvasRenderingContext.font = "16px GyeonggiBatang, sans-serif";
		canvasRenderingContext.textAlign = "center";
		canvasRenderingContext.textBaseline = "top";
		canvasRenderingContext.fillText("검종 산문 앞", popupCenterX, popupRect.y + 24);

		if (this.#dialogues.length === 0) {
			return;
		}

		const currentDialogue = this.#dialogues[this.#currentIndex];
		const visibleText = currentDialogue.text.slice(0, System.Math.floor(this.#revealedChars));

		// 대사 박스.
		const textBoxX = popupRect.x + SIDE_MARGIN;
		const textBoxY = popupRect.y + popupRect.height - TEXTBOX_HEIGHT - TEXTBOX_BOTTOM_MARGIN;
		const textBoxWidth = popupRect.width - SIDE_MARGIN * 2;
		canvasRenderingContext.fillStyle = "rgba(20, 20, 30, 0.92)";
		canvasRenderingContext.fillRect(textBoxX, textBoxY, textBoxWidth, TEXTBOX_HEIGHT);
		canvasRenderingContext.strokeStyle = "#d4b46a";
		canvasRenderingContext.lineWidth = 2;
		canvasRenderingContext.strokeRect(textBoxX, textBoxY, textBoxWidth, TEXTBOX_HEIGHT);

		// 화자 이름 박스 (대사 박스 좌상단 위로). 폭은 이름 길이에 맞춰 가변.
		canvasRenderingContext.font = NAME_BOX_FONT;
		const nameMetrics = canvasRenderingContext.measureText(currentDialogue.speaker);
		const nameBoxWidth = System.Math.max(NAME_BOX_MIN_WIDTH, System.Math.ceil(nameMetrics.width) + NAME_BOX_PADDING_X * 2);
		const nameBoxX = textBoxX + 24;
		const nameBoxY = textBoxY - NAME_BOX_HEIGHT * 0.5;
		canvasRenderingContext.fillStyle = "#d4b46a";
		canvasRenderingContext.fillRect(nameBoxX, nameBoxY, nameBoxWidth, NAME_BOX_HEIGHT);
		canvasRenderingContext.fillStyle = "#1a1a14";
		canvasRenderingContext.textAlign = "center";
		canvasRenderingContext.textBaseline = "middle";
		canvasRenderingContext.fillText(currentDialogue.speaker, nameBoxX + nameBoxWidth * 0.5, nameBoxY + NAME_BOX_HEIGHT * 0.5);

		// 대사 본문 (자동 줄바꿈).
		canvasRenderingContext.fillStyle = "#ffffff";
		canvasRenderingContext.font = "20px GyeonggiBatang, sans-serif";
		canvasRenderingContext.textAlign = "left";
		canvasRenderingContext.textBaseline = "top";
		const textPaddingX = 28;
		const textPaddingY = 36;
		const textMaxWidth = textBoxWidth - textPaddingX * 2;
		const lines = this.wrapTextByWidth(canvasRenderingContext, visibleText, textMaxWidth);
		const lineHeight = 30;
		for (let i = 0; i < lines.length; ++i) {
			canvasRenderingContext.fillText(lines[i], textBoxX + textPaddingX, textBoxY + textPaddingY + i * lineHeight);
		}

		// 진행 안내.
		// 첫 입력 대기 상태에서는 타이핑이 멈춰 있으므로 "클릭하여 시작" 만 표시한다.
		if (!this.#hasReceivedFirstInput) {
			canvasRenderingContext.fillStyle = "#aaaaaa";
			canvasRenderingContext.font = "13px GyeonggiBatang, sans-serif";
			canvasRenderingContext.textAlign = "right";
			canvasRenderingContext.textBaseline = "bottom";
			canvasRenderingContext.fillText("▼ 클릭하여 시작", textBoxX + textBoxWidth - 16, textBoxY + TEXTBOX_HEIGHT - 12);
		}
		else {
			const fullyRevealed = this.#revealedChars >= currentDialogue.text.length;
			if (fullyRevealed && lines.length > 0) {
				// 대사 본문과 동일한 폰트로 마지막 줄 폭을 측정하여 글자 바로 뒤에 ▼ 아이콘을 위치시킨다.
				canvasRenderingContext.font = "20px GyeonggiBatang, sans-serif";
				canvasRenderingContext.textAlign = "left";
				canvasRenderingContext.textBaseline = "top";
				const lastLineIndex = lines.length - 1;
				const lastLineText = lines[lastLineIndex];
				const lastLineMetrics = canvasRenderingContext.measureText(lastLineText);
				const lastLineWidth = lastLineMetrics.width;
				const continueIconX = textBoxX + textPaddingX + lastLineWidth + CONTINUE_ICON_GAP;
				const continueIconBaseY = textBoxY + textPaddingY + lastLineIndex * lineHeight;
				const continueIconBobOffset = System.Math.sin(this.#elapsedTime * CONTINUE_ICON_BOB_FREQUENCY * System.Math.PI * 2) * CONTINUE_ICON_BOB_AMPLITUDE;
				canvasRenderingContext.fillStyle = "#d4b46a";
				canvasRenderingContext.fillText("▼", continueIconX, continueIconBaseY + continueIconBobOffset);
			}
		}

		// 페이지 표시 (우상단).
		canvasRenderingContext.fillStyle = "#888888";
		canvasRenderingContext.font = "12px GyeonggiBatang, sans-serif";
		canvasRenderingContext.textAlign = "right";
		canvasRenderingContext.textBaseline = "top";
		canvasRenderingContext.fillText(`${this.#currentIndex + 1} / ${this.#dialogues.length}`, popupRect.x + popupRect.width - 24, popupRect.y + 24);
	}

	//==============================================================================
	// 한국어 자동 줄바꿈 (글자 단위).
	//==============================================================================
	/**
	 * @param { CanvasRenderingContext2D } canvasRenderingContext
	 * @param { string } text
	 * @param { number } maxWidth
	 * @returns { string[] }
	 */
	wrapTextByWidth(canvasRenderingContext, text, maxWidth) {
		const lines = [];
		let currentLine = "";
		for (const ch of text) {
			if (ch === "\n") {
				lines.push(currentLine);
				currentLine = "";
				continue;
			}
			const tentative = currentLine + ch;
			if (canvasRenderingContext.measureText(tentative).width > maxWidth && currentLine.length > 0) {
				lines.push(currentLine);
				currentLine = ch;
			}
			else {
				currentLine = tentative;
			}
		}
		if (currentLine.length > 0) {
			lines.push(currentLine);
		}
		return lines;
	}

	//==============================================================================
	// 오디오 비프 플레이어 설정. 주입되지 않으면 비프음 없이 동작.
	//==============================================================================
	/**
	 * @param { AudioBeepPlayer } audioBeepPlayer
	 */
	setAudioBeepPlayer(audioBeepPlayer) {
		this.#audioBeepPlayer = audioBeepPlayer;
	}

	//==============================================================================
	// 오디오 비프 플레이어 반환.
	//==============================================================================
	/**
	 * @returns { AudioBeepPlayer | null }
	 */
	getAudioBeepPlayer() {
		return this.#audioBeepPlayer;
	}

	//==============================================================================
	// 타이핑 비프 대상 글자 여부 (공백/개행/구두점은 묵음 처리).
	//==============================================================================
	/**
	 * @param { string } character
	 * @returns { boolean }
	 */
	isTypingBeepCharacter(character) {
		if (character === " " || character === "\n" || character === "\t") {
			return false;
		}
		const punctuationCharacters = ".,!?:;\"'`~()[]{}<>…—·";
		if (punctuationCharacters.indexOf(character) >= 0) {
			return false;
		}
		return true;
	}
}

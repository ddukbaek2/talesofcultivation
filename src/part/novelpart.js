//==============================================================================
// 포함 모듈 목록.
//==============================================================================
const System = globalThis;
import { Object } from "../../libs/vanilla.js/src/base/object.js";


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
		if (this.#isFinished) {
			return;
		}
		if (this.#dialogues.length === 0) {
			this.#isFinished = true;
			return;
		}

		// 타이핑 진행.
		const currentDialogue = this.#dialogues[this.#currentIndex];
		if (this.#revealedChars < currentDialogue.text.length) {
			this.#revealedChars += TYPING_CHARS_PER_SECOND * timeDelta;
			if (this.#revealedChars > currentDialogue.text.length) {
				this.#revealedChars = currentDialogue.text.length;
			}
		}

		// 입력 처리 (just-pressed 트리거).
		const isPressed = inputManager.isTouchPressed();
		if (isPressed && !this.#wasTouchPressed) {
			const fullyRevealed = this.#revealedChars >= currentDialogue.text.length;
			if (!fullyRevealed) {
				// 타이핑 중이면 즉시 완성.
				this.#revealedChars = currentDialogue.text.length;
			}
			else {
				// 다음 대사 또는 종료.
				if (this.#currentIndex + 1 < this.#dialogues.length) {
					++this.#currentIndex;
					this.#revealedChars = 0;
				}
				else {
					this.#isFinished = true;
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

		// 진행 안내 (타이핑 끝났을 때).
		const fullyRevealed = this.#revealedChars >= currentDialogue.text.length;
		if (fullyRevealed) {
			canvasRenderingContext.fillStyle = "#aaaaaa";
			canvasRenderingContext.font = "13px GyeonggiBatang, sans-serif";
			canvasRenderingContext.textAlign = "right";
			canvasRenderingContext.textBaseline = "bottom";
			const isLast = this.#currentIndex + 1 >= this.#dialogues.length;
			const guide = isLast ? "▼ 클릭하여 시작" : "▼ 클릭하여 계속";
			canvasRenderingContext.fillText(guide, textBoxX + textBoxWidth - 16, textBoxY + TEXTBOX_HEIGHT - 12);
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
}

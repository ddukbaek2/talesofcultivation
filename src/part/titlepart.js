//==============================================================================
// 포함 모듈 목록.
//==============================================================================
const System = globalThis;
import { Object } from "../../libs/vanilla.js/src/base/object.js";
import { AudioBeepPlayer } from "../base/audiobeepplayer.js";
import { drawInputHintBadge, isActionPressed, InputAction } from "../base/inputhint.js";


//==============================================================================
// 상수.
//==============================================================================
const TITLE_FONT = "bold 56px GyeonggiBatangBold, sans-serif";
const SUBTITLE_FONT = "20px GyeonggiBatang, sans-serif";
const BUTTON_FONT = "bold 22px GyeonggiBatangBold, sans-serif";
const BUTTON_WIDTH = 320;
const BUTTON_HEIGHT = 64;
const BUTTON_GAP = 20;


//==============================================================================
// 타이틀 메뉴 버튼 종류.
//==============================================================================
const TitleButtonKey = System.Object.freeze({
	start: "start",
	continueGame: "continueGame",
	settings: "settings",
	quit: "quit",
});


//==============================================================================
// 타이틀 단일 메뉴 버튼.
//==============================================================================
class TitleMenuButton extends Object {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @type { string } */ key;
	/** @type { string } */ label;
	/** @type { boolean } */ isEnabled;

	//==============================================================================
	// 생성.
	//==============================================================================
	constructor(key, label, isEnabled) {
		super();
		this.key = key;
		this.label = label;
		this.isEnabled = isEnabled;
	}
}


//==============================================================================
// 타이틀 메뉴 버튼 hit-test 영역.
//==============================================================================
class TitleMenuButtonLayout extends Object {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @type { TitleMenuButton } */ button;
	/** @type { number } */ x;
	/** @type { number } */ y;
	/** @type { number } */ width;
	/** @type { number } */ height;

	//==============================================================================
	// 생성.
	//==============================================================================
	constructor(button, x, y, width, height) {
		super();
		this.button = button;
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
	}
}


//==============================================================================
// 타이틀 파트.
// - 게임의 첫 화면. 시작 / 이어하기 / 설정 / 종료 메뉴 버튼.
// - 시작 버튼 클릭 시 onStart 콜백을 호출하여 외부 매니저가 다음 파트(대사 → 전투)로 전환.
// - 이 클릭이 첫 사용자 제스처가 되어 AudioContext 도 깨운다.
//==============================================================================
export class TitlePart extends Object {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @private @type { string } */ #titleText;
	/** @private @type { string } */ #subtitleText;
	/** @private @type { TitleMenuButton[] } */ #buttons;
	/** @private @type { TitleMenuButtonLayout[] } */ #buttonLayouts;
	/** @private @type { number } */ #elapsedTime;
	/** @private @type { boolean } */ #wasTouchPressed;
	/** @private @type { boolean } */ #wasConfirmActionPressed;
	/** @private @type { (() => void) | null } */ #onStart;
	/** @private @type { (() => void) | null } */ #onContinue;
	/** @private @type { (() => void) | null } */ #onSettings;
	/** @private @type { (() => void) | null } */ #onQuit;
	/** @private @type { AudioBeepPlayer | null } */ #audioBeepPlayer;

	//==============================================================================
	// 생성.
	//==============================================================================
	constructor() {
		super();
		this.#titleText = "수선전";
		this.#subtitleText = "Tales of Cultivation";
		this.#buttons = [];
		this.#buttonLayouts = [];
		this.#elapsedTime = 0;
		this.#wasTouchPressed = false;
		this.#wasConfirmActionPressed = false;
		this.#onStart = null;
		this.#onContinue = null;
		this.#onSettings = null;
		this.#onQuit = null;
		this.#audioBeepPlayer = null;
		this.installDefaultMenu();
	}

	//==============================================================================
	// 콜백 / 상태 주입.
	//==============================================================================
	/**
	 * @param { string } titleText
	 * @param { string } subtitleText
	 */
	setTitleText(titleText, subtitleText) {
		this.#titleText = titleText;
		this.#subtitleText = subtitleText;
	}

	/**
	 * @param { boolean } isContinueAvailable
	 */
	setContinueAvailable(isContinueAvailable) {
		for (const button of this.#buttons) {
			if (button.key === TitleButtonKey.continueGame) {
				button.isEnabled = isContinueAvailable;
				return;
			}
		}
	}

	/**
	 * @param { () => void } callback
	 */
	setOnStart(callback) {
		this.#onStart = callback;
	}

	/**
	 * @param { () => void } callback
	 */
	setOnContinue(callback) {
		this.#onContinue = callback;
	}

	/**
	 * @param { () => void } callback
	 */
	setOnSettings(callback) {
		this.#onSettings = callback;
	}

	/**
	 * @param { () => void } callback
	 */
	setOnQuit(callback) {
		this.#onQuit = callback;
	}

	//==============================================================================
	// 활성화 시 누름 상태 리셋.
	//==============================================================================
	reset() {
		this.#wasTouchPressed = false;
		this.#wasConfirmActionPressed = false;
	}

	//==============================================================================
	// 갱신.
	//==============================================================================
	/**
	 * @param { number } timeDelta
	 * @param { import("../../libs/vanilla.js/src/core/inputmanager.js").InputManager } inputManager
	 * @param { { x: number, y: number, width: number, height: number } } popupRect
	 */
	tick(timeDelta, inputManager, popupRect) {
		this.#elapsedTime += timeDelta;
		const isPressed = inputManager.isTouchPressed();
		if (isPressed && !this.#wasTouchPressed) {
			const viewInputPosition = inputManager.getViewInputPosition();
			this.handleClick(viewInputPosition);
		}
		this.#wasTouchPressed = isPressed;

		// 활성 입력 모드의 confirm 액션 (키보드 Enter / 게임패드 A) just-pressed → 시작 버튼 트리거.
		const isConfirmActive = isActionPressed(inputManager, InputAction.confirm);
		if (isConfirmActive && !this.#wasConfirmActionPressed) {
			this.triggerStartButton();
		}
		this.#wasConfirmActionPressed = isConfirmActive;
	}

	//==============================================================================
	// 시작 버튼을 클릭한 것과 동일한 효과 (키보드 / 게임패드 단축키 진입점).
	//==============================================================================
	triggerStartButton() {
		for (const button of this.#buttons) {
			if (button.key === TitleButtonKey.start && button.isEnabled) {
				const beepPlayer = this.getAudioBeepPlayer();
				if (beepPlayer) {
					const audioContext = beepPlayer.getAudioContext();
					if (audioContext && audioContext.state === "suspended") {
						audioContext.resume();
					}
					beepPlayer.playConfirm();
				}
				if (this.#onStart) {
					this.#onStart();
				}
				return;
			}
		}
	}

	//==============================================================================
	// 클릭 처리. 버튼 hit → 콜백 호출 (시작 버튼은 AudioContext 도 깨운다).
	//==============================================================================
	/**
	 * @param { { x: number, y: number } } viewInputPosition
	 */
	handleClick(viewInputPosition) {
		for (const buttonLayout of this.#buttonLayouts) {
			if (this.isInsideRect(viewInputPosition, buttonLayout.x, buttonLayout.y, buttonLayout.width, buttonLayout.height)) {
				if (!buttonLayout.button.isEnabled) {
					return;
				}
				const beepPlayer = this.getAudioBeepPlayer();
				if (beepPlayer) {
					const audioContext = beepPlayer.getAudioContext();
					if (audioContext && audioContext.state === "suspended") {
						audioContext.resume();
					}
					beepPlayer.playConfirm();
				}
				switch (buttonLayout.button.key) {
					case TitleButtonKey.start: {
						if (this.#onStart) {
							this.#onStart();
						}
						break;
					}
					case TitleButtonKey.continueGame: {
						if (this.#onContinue) {
							this.#onContinue();
						}
						break;
					}
					case TitleButtonKey.settings: {
						if (this.#onSettings) {
							this.#onSettings();
						}
						break;
					}
					case TitleButtonKey.quit: {
						if (this.#onQuit) {
							this.#onQuit();
						}
						break;
					}
				}
				return;
			}
		}
	}

	//==============================================================================
	// 출력.
	//==============================================================================
	/**
	 * @param { import("../../libs/vanilla.js/src/core/graphic.js").Graphic } graphic
	 * @param { { x: number, y: number, width: number, height: number } } popupRect
	 */
	draw(graphic, popupRect) {
		const canvasRenderingContext = graphic.getCanvasRenderingContext();

		// 배경 (어두운 단색 + 약한 그라데이션 느낌의 도형).
		canvasRenderingContext.fillStyle = "#0a0a14";
		canvasRenderingContext.fillRect(popupRect.x, popupRect.y, popupRect.width, popupRect.height);

		const popupCenterX = popupRect.x + popupRect.width * 0.5;

		// 타이틀 (위에서 1/3 지점).
		const titleCenterY = popupRect.y + popupRect.height * 0.32;
		canvasRenderingContext.fillStyle = "#d4b46a";
		canvasRenderingContext.font = TITLE_FONT;
		canvasRenderingContext.textAlign = "center";
		canvasRenderingContext.textBaseline = "middle";
		canvasRenderingContext.fillText(this.#titleText, popupCenterX, titleCenterY);

		canvasRenderingContext.fillStyle = "#aaaabb";
		canvasRenderingContext.font = SUBTITLE_FONT;
		canvasRenderingContext.fillText(this.#subtitleText, popupCenterX, titleCenterY + 56);

		// 메뉴 버튼 (가운데 정렬, 세로 스택).
		this.#buttonLayouts = [];
		const buttonsTotalHeight = this.#buttons.length * BUTTON_HEIGHT + (this.#buttons.length - 1) * BUTTON_GAP;
		const buttonsTopY = popupRect.y + popupRect.height * 0.58 - buttonsTotalHeight * 0.5;
		const buttonInsetX = popupCenterX - BUTTON_WIDTH * 0.5;
		for (let buttonIndex = 0; buttonIndex < this.#buttons.length; ++buttonIndex) {
			const button = this.#buttons[buttonIndex];
			const buttonY = buttonsTopY + buttonIndex * (BUTTON_HEIGHT + BUTTON_GAP);
			this.drawMenuButton(canvasRenderingContext, button, buttonInsetX, buttonY, BUTTON_WIDTH, BUTTON_HEIGHT);
			this.#buttonLayouts.push(new TitleMenuButtonLayout(button, buttonInsetX, buttonY, BUTTON_WIDTH, BUTTON_HEIGHT));
		}

		// 하단 안내 (저작권 / 빌드).
		canvasRenderingContext.fillStyle = "#555566";
		canvasRenderingContext.font = "12px GyeonggiBatang, sans-serif";
		canvasRenderingContext.textAlign = "center";
		canvasRenderingContext.textBaseline = "bottom";
		canvasRenderingContext.fillText("개발 중 · 인하우스 빌드", popupCenterX, popupRect.y + popupRect.height - 16);
	}

	//==============================================================================
	// 단일 메뉴 버튼 출력 + 입력 모드 힌트 배지.
	//==============================================================================
	/**
	 * @param { CanvasRenderingContext2D } canvasRenderingContext
	 * @param { TitleMenuButton } button
	 * @param { number } x
	 * @param { number } y
	 * @param { number } width
	 * @param { number } height
	 */
	drawMenuButton(canvasRenderingContext, button, x, y, width, height) {
		const fillColor = button.isEnabled ? "#1a2240" : "#16182a";
		canvasRenderingContext.fillStyle = fillColor;
		canvasRenderingContext.fillRect(x, y, width, height);
		canvasRenderingContext.strokeStyle = button.isEnabled ? "#d4b46a" : "#3a3a4a";
		canvasRenderingContext.lineWidth = 2;
		canvasRenderingContext.strokeRect(x, y, width, height);

		const textColor = button.isEnabled ? "#ffffff" : "#666677";
		canvasRenderingContext.fillStyle = textColor;
		canvasRenderingContext.font = BUTTON_FONT;
		canvasRenderingContext.textAlign = "center";
		canvasRenderingContext.textBaseline = "middle";
		canvasRenderingContext.fillText(button.label, x + width * 0.5, y + height * 0.5);

		// 입력 모드 힌트 (시작 버튼만 confirm 액션 매핑) — 좌측하단 외곽.
		if (button.isEnabled && button.key === TitleButtonKey.start) {
			drawInputHintBadge(canvasRenderingContext, InputAction.confirm, x, y + height);
		}
	}

	//==============================================================================
	// 좌표가 사각형 내부인지.
	//==============================================================================
	/**
	 * @param { { x: number, y: number } } viewInputPosition
	 * @param { number } x
	 * @param { number } y
	 * @param { number } width
	 * @param { number } height
	 * @returns { boolean }
	 */
	isInsideRect(viewInputPosition, x, y, width, height) {
		const insideX = viewInputPosition.x >= x && viewInputPosition.x <= x + width;
		const insideY = viewInputPosition.y >= y && viewInputPosition.y <= y + height;
		return insideX && insideY;
	}

	//==============================================================================
	// 기본 메뉴 4종 설치.
	//==============================================================================
	installDefaultMenu() {
		const buttons = [];
		buttons.push(new TitleMenuButton(TitleButtonKey.start, "시작", true));
		buttons.push(new TitleMenuButton(TitleButtonKey.continueGame, "이어하기", false));
		buttons.push(new TitleMenuButton(TitleButtonKey.settings, "설정", true));
		buttons.push(new TitleMenuButton(TitleButtonKey.quit, "종료", true));
		this.#buttons = buttons;
	}

	//==============================================================================
	// 오디오 비프 플레이어 설정.
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
}


//==============================================================================
// 외부 사용을 위한 식별자 / 클래스 재공개.
//==============================================================================
export { TitleButtonKey, TitleMenuButton };

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
const TITLE_FONT = "bold 64px GyeonggiBatangBold, sans-serif";
const SUBTITLE_FONT = "18px GyeonggiBatang, sans-serif";
const BUTTON_FONT = "bold 20px GyeonggiBatangBold, sans-serif";
const BUTTON_WIDTH = 320;
const BUTTON_HEIGHT = 64;
const BUTTON_GAP = 20;


//==============================================================================
// 게임오버 메뉴 버튼 식별자.
//==============================================================================
const GameOverButtonKey = System.Object.freeze({
	saveLoad: "saveLoad",
	title: "title",
});


//==============================================================================
// 단일 메뉴 버튼.
//==============================================================================
class GameOverMenuButton extends Object {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @type { string } */ key;
	/** @type { string } */ label;

	//==============================================================================
	// 생성.
	//==============================================================================
	constructor(key, label) {
		super();
		this.key = key;
		this.label = label;
	}
}


//==============================================================================
// 메뉴 버튼 hit-test 영역.
//==============================================================================
class GameOverButtonLayout extends Object {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @type { GameOverMenuButton } */ button;
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
// 게임 오버 파트.
// - 패배 후 진입. 큰 "GAME OVER" 와 두 개의 버튼 (세이브/로드, 타이틀로) 만 노출.
// - 일반 게임 진행 (맵·전투·이벤트 등) 은 진입 불가.
//==============================================================================
export class GameOverPart extends Object {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @private @type { GameOverMenuButton[] } */ #buttons;
	/** @private @type { GameOverButtonLayout[] } */ #buttonLayouts;
	/** @private @type { string } */ #subtitleText;
	/** @private @type { boolean } */ #wasTouchPressed;
	/** @private @type { boolean } */ #wasConfirmActionPressed;
	/** @private @type { number } */ #focusedButtonIndex;
	/** @private @type { boolean } */ #wasFocusPrevPressed;
	/** @private @type { boolean } */ #wasFocusNextPressed;
	/** @private @type { (() => void) | null } */ #onSaveLoadSelected;
	/** @private @type { (() => void) | null } */ #onTitleSelected;
	/** @private @type { AudioBeepPlayer | null } */ #audioBeepPlayer;

	//==============================================================================
	// 생성.
	//==============================================================================
	constructor() {
		super();
		this.#buttons = [
			new GameOverMenuButton(GameOverButtonKey.saveLoad, "세이브 / 로드"),
			new GameOverMenuButton(GameOverButtonKey.title, "타이틀로"),
		];
		this.#buttonLayouts = [];
		this.#subtitleText = "검 앞에서 길이 끊겼다.";
		this.#wasTouchPressed = false;
		this.#wasConfirmActionPressed = false;
		this.#focusedButtonIndex = 0;
		this.#wasFocusPrevPressed = false;
		this.#wasFocusNextPressed = false;
		this.#onSaveLoadSelected = null;
		this.#onTitleSelected = null;
		this.#audioBeepPlayer = null;
	}

	//==============================================================================
	// 데이터 / 콜백 주입.
	//==============================================================================
	/**
	 * @param { string } subtitleText
	 */
	setSubtitleText(subtitleText) {
		this.#subtitleText = subtitleText;
	}

	/**
	 * @param { () => void } callback
	 */
	setOnSaveLoadSelected(callback) {
		this.#onSaveLoadSelected = callback;
	}

	/**
	 * @param { () => void } callback
	 */
	setOnTitleSelected(callback) {
		this.#onTitleSelected = callback;
	}

	//==============================================================================
	// 활성화 시 입력 누름 / 포커스 리셋.
	//==============================================================================
	reset() {
		this.#wasTouchPressed = false;
		this.#wasConfirmActionPressed = false;
		this.#focusedButtonIndex = 0;
		this.#wasFocusPrevPressed = false;
		this.#wasFocusNextPressed = false;
	}

	//==============================================================================
	// 갱신.
	//==============================================================================
	/**
	 * @param { number } timeDelta
	 * @param { InputManager } inputManager
	 * @param { { x: number, y: number, width: number, height: number } } popupRect
	 */
	tick(timeDelta, inputManager, popupRect) {
		const isPressed = inputManager.isTouchPressed();
		if (isPressed && !this.#wasTouchPressed) {
			const viewInputPosition = inputManager.getViewInputPosition();
			this.handleClick(viewInputPosition);
		}
		this.#wasTouchPressed = isPressed;

		// focusPrev / focusNext 로 버튼 포커스 이동.
		const buttonCount = this.#buttons.length;
		const isFocusPrevActive = isActionPressed(inputManager, InputAction.focusPrev);
		const isFocusNextActive = isActionPressed(inputManager, InputAction.focusNext);
		if (buttonCount > 0) {
			if (isFocusPrevActive && !this.#wasFocusPrevPressed) {
				this.#focusedButtonIndex = (this.#focusedButtonIndex - 1 + buttonCount) % buttonCount;
				const focusAudioBeepPlayer = this.getAudioBeepPlayer();
				if (focusAudioBeepPlayer) {
					focusAudioBeepPlayer.playClick();
				}
			}
			if (isFocusNextActive && !this.#wasFocusNextPressed) {
				this.#focusedButtonIndex = (this.#focusedButtonIndex + 1) % buttonCount;
				const focusAudioBeepPlayer = this.getAudioBeepPlayer();
				if (focusAudioBeepPlayer) {
					focusAudioBeepPlayer.playClick();
				}
			}
		}
		this.#wasFocusPrevPressed = isFocusPrevActive;
		this.#wasFocusNextPressed = isFocusNextActive;

		// confirm 액션 (Enter / A) 으로 포커스 버튼 실행.
		const isConfirmActive = isActionPressed(inputManager, InputAction.confirm);
		if (isConfirmActive && !this.#wasConfirmActionPressed && buttonCount > 0) {
			this.invokeButton(this.#buttons[this.#focusedButtonIndex]);
		}
		this.#wasConfirmActionPressed = isConfirmActive;
	}

	//==============================================================================
	// 클릭 처리.
	//==============================================================================
	/**
	 * @param { { x: number, y: number } } viewInputPosition
	 */
	handleClick(viewInputPosition) {
		for (let buttonIndex = 0; buttonIndex < this.#buttonLayouts.length; ++buttonIndex) {
			const buttonLayout = this.#buttonLayouts[buttonIndex];
			if (this.isInsideRect(viewInputPosition, buttonLayout.x, buttonLayout.y, buttonLayout.width, buttonLayout.height)) {
				this.#focusedButtonIndex = buttonIndex;
				this.invokeButton(buttonLayout.button);
				return;
			}
		}
	}

	//==============================================================================
	// 버튼 실행.
	//==============================================================================
	/**
	 * @param { GameOverMenuButton } button
	 */
	invokeButton(button) {
		const beepPlayer = this.getAudioBeepPlayer();
		if (beepPlayer) {
			beepPlayer.playConfirm();
		}
		switch (button.key) {
			case GameOverButtonKey.saveLoad: {
				if (this.#onSaveLoadSelected) {
					this.#onSaveLoadSelected();
				}
				break;
			}
			case GameOverButtonKey.title: {
				if (this.#onTitleSelected) {
					this.#onTitleSelected();
				}
				break;
			}
		}
	}

	//==============================================================================
	// 출력.
	//==============================================================================
	/**
	 * @param { Graphic } graphic
	 * @param { { x: number, y: number, width: number, height: number } } popupRect
	 */
	draw(graphic, popupRect) {
		const canvasRenderingContext = graphic.getCanvasRenderingContext();

		canvasRenderingContext.fillStyle = "#0a0a14";
		canvasRenderingContext.fillRect(popupRect.x, popupRect.y, popupRect.width, popupRect.height);

		const popupCenterX = popupRect.x + popupRect.width * 0.5;

		// "GAME OVER" 큰 글자.
		const titleCenterY = popupRect.y + popupRect.height * 0.34;
		canvasRenderingContext.fillStyle = "#aa3333";
		canvasRenderingContext.font = TITLE_FONT;
		canvasRenderingContext.textAlign = "center";
		canvasRenderingContext.textBaseline = "middle";
		canvasRenderingContext.fillText("GAME OVER", popupCenterX, titleCenterY);

		canvasRenderingContext.fillStyle = "#aaaabb";
		canvasRenderingContext.font = SUBTITLE_FONT;
		canvasRenderingContext.fillText(this.#subtitleText, popupCenterX, titleCenterY + 56);

		// 메뉴 버튼.
		this.#buttonLayouts = [];
		const buttonCount = this.#buttons.length;
		const buttonsTotalHeight = buttonCount * BUTTON_HEIGHT + (buttonCount - 1) * BUTTON_GAP;
		const buttonsTopY = popupRect.y + popupRect.height * 0.62 - buttonsTotalHeight * 0.5;
		const buttonInsetX = popupCenterX - BUTTON_WIDTH * 0.5;
		for (let buttonIndex = 0; buttonIndex < buttonCount; ++buttonIndex) {
			const button = this.#buttons[buttonIndex];
			const buttonY = buttonsTopY + buttonIndex * (BUTTON_HEIGHT + BUTTON_GAP);
			const isFocused = buttonIndex === this.#focusedButtonIndex;
			this.drawMenuButton(canvasRenderingContext, button, buttonInsetX, buttonY, BUTTON_WIDTH, BUTTON_HEIGHT, isFocused);
			this.#buttonLayouts.push(new GameOverButtonLayout(button, buttonInsetX, buttonY, BUTTON_WIDTH, BUTTON_HEIGHT));
		}
	}

	//==============================================================================
	// 단일 버튼 출력 + 입력 힌트 배지 (포커스 버튼만).
	//==============================================================================
	/**
	 * @param { CanvasRenderingContext2D } canvasRenderingContext
	 * @param { GameOverMenuButton } button
	 * @param { number } x
	 * @param { number } y
	 * @param { number } width
	 * @param { number } height
	 * @param { boolean } isFocused
	 */
	drawMenuButton(canvasRenderingContext, button, x, y, width, height, isFocused) {
		canvasRenderingContext.fillStyle = isFocused ? "#3a2a55" : "#1a1a2e";
		canvasRenderingContext.fillRect(x, y, width, height);
		canvasRenderingContext.strokeStyle = isFocused ? "#d4b46a" : "#3a3a4a";
		canvasRenderingContext.lineWidth = isFocused ? 2 : 1;
		canvasRenderingContext.strokeRect(x, y, width, height);
		canvasRenderingContext.fillStyle = "#ffffff";
		canvasRenderingContext.font = BUTTON_FONT;
		canvasRenderingContext.textAlign = "center";
		canvasRenderingContext.textBaseline = "middle";
		canvasRenderingContext.fillText(button.label, x + width * 0.5, y + height * 0.5);
		if (isFocused) {
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
export { GameOverButtonKey, GameOverMenuButton };

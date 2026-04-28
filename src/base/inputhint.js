//==============================================================================
// 포함 모듈 목록.
//==============================================================================
const System = globalThis;
import { Object } from "../../libs/vanilla.js/src/base/object.js";
import { GamepadButtonCode } from "../../libs/vanilla.js/src/core/gamepadmanager.js";


//==============================================================================
// 입력 모드 식별자. main.js 의 detectInputMode 와 동일한 문자열을 사용한다.
//==============================================================================
const InputMode = System.Object.freeze({
	keyboard: "keyboard",
	gamepad: "gamepad",
	touch: "touch",
});


//==============================================================================
// 시맨틱 입력 액션 식별자. 각 버튼이 본인이 담당하는 액션을 지정한다.
//==============================================================================
const InputAction = System.Object.freeze({
	menu: "menu",
	confirm: "confirm",
	cancel: "cancel",
	endTurn: "endTurn",
	abandon: "abandon",
	enterRoom: "enterRoom",
	completeRoom: "completeRoom",
	escape: "escape",
	move: "move",
	previousTab: "previousTab",
	nextTab: "nextTab",
	focusPrev: "focusPrev",
	focusNext: "focusNext",
});


//==============================================================================
// 단일 모드 단일 액션의 힌트 표기 (버튼 모서리에 그릴 짧은 라벨).
//==============================================================================
class InputHintLabel extends Object {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @type { string } */ text;
	/** @type { boolean } */ isLetter;

	//==============================================================================
	// 생성.
	//==============================================================================
	constructor(text, isLetter) {
		super();
		this.text = text;
		this.isLetter = isLetter;
	}
}


//==============================================================================
// 모듈 전역 — 매 프레임 main.js 의 setActiveInputMode 로 갱신됨.
//==============================================================================
let activeInputMode = InputMode.keyboard;


//==============================================================================
// 활성 입력 모드 갱신 (main.js 가 매 프레임 호출).
//==============================================================================
/**
 * @param { string } inputMode
 */
export function setActiveInputMode(inputMode) {
	activeInputMode = inputMode;
}


//==============================================================================
// 활성 입력 모드 반환.
//==============================================================================
/**
 * @returns { string }
 */
export function getActiveInputMode() {
	return activeInputMode;
}


//==============================================================================
// (입력 모드, 액션) 으로 버튼 모서리에 표시할 힌트 라벨 결정.
// 매핑되지 않은 액션은 null 반환 → 그리지 않음.
//==============================================================================
/**
 * @param { string } inputMode
 * @param { string } actionKey
 * @returns { InputHintLabel | null }
 */
export function resolveInputHintLabel(inputMode, actionKey) {
	if (inputMode === InputMode.gamepad) {
		switch (actionKey) {
			case InputAction.menu: {
				return new InputHintLabel("OPT", false);
			}
			case InputAction.confirm:
			case InputAction.enterRoom:
			case InputAction.completeRoom:
			case InputAction.move: {
				return new InputHintLabel("A", true);
			}
			case InputAction.cancel:
			case InputAction.escape: {
				return new InputHintLabel("B", true);
			}
			case InputAction.endTurn: {
				return new InputHintLabel("Y", true);
			}
			case InputAction.abandon: {
				return null;
			}
			case InputAction.previousTab: {
				return new InputHintLabel("L1", false);
			}
			case InputAction.nextTab: {
				return new InputHintLabel("R1", false);
			}
			case InputAction.focusPrev: {
				return new InputHintLabel("◀", true);
			}
			case InputAction.focusNext: {
				return new InputHintLabel("▶", true);
			}
			default: {
				return null;
			}
		}
	}
	if (inputMode === InputMode.keyboard) {
		switch (actionKey) {
			case InputAction.menu: {
				return new InputHintLabel("ESC", false);
			}
			case InputAction.confirm:
			case InputAction.enterRoom:
			case InputAction.completeRoom:
			case InputAction.move: {
				return new InputHintLabel("Z", true);
			}
			case InputAction.cancel:
			case InputAction.escape: {
				return new InputHintLabel("X", true);
			}
			case InputAction.endTurn: {
				return new InputHintLabel("V", true);
			}
			case InputAction.abandon: {
				return null;
			}
			case InputAction.previousTab: {
				return new InputHintLabel("←", true);
			}
			case InputAction.nextTab: {
				return new InputHintLabel("→", true);
			}
			case InputAction.focusPrev: {
				return new InputHintLabel("◀", true);
			}
			case InputAction.focusNext: {
				return new InputHintLabel("▶", true);
			}
			default: {
				return null;
			}
		}
	}
	// 터치 모드: 모든 클릭 가능 버튼은 동일한 터치 표시.
	return new InputHintLabel("탭", false);
}


//==============================================================================
// 버튼 좌측 하단 외곽에 액션 힌트 배지 출력. 16px 정사각 배지 (작게).
// 라벨이 글자(A/B/P 등) 면 약간 큰 폰트, 텍스트(SPC/ESC) 면 작은 폰트.
// 좌측하단 모서리에 절반쯤 겹쳐 그려진다.
//==============================================================================
/**
 * @param { CanvasRenderingContext2D } canvasRenderingContext
 * @param { string } actionKey
 * @param { number } buttonLeftX  버튼의 좌측 X
 * @param { number } buttonBottomY  버튼의 하단 Y
 */
export function drawInputHintBadge(canvasRenderingContext, actionKey, buttonLeftX, buttonBottomY) {
	const hintLabel = resolveInputHintLabel(activeInputMode, actionKey);
	if (hintLabel === null) {
		return;
	}
	const badgeSize = 16;
	// 좌측하단 외곽에 살짝 걸치게 (왼쪽 + 아래로 절반 만큼 튀어나옴).
	const badgeX = buttonLeftX - badgeSize * 0.5;
	const badgeY = buttonBottomY - badgeSize * 0.5;

	// 모드별 배경색 (게임패드 = 짙은 자주, 키보드 = 짙은 청회색, 터치 = 짙은 회색).
	let backgroundColor = "#222233";
	let borderColor = "#ffffff";
	if (activeInputMode === InputMode.gamepad) {
		backgroundColor = "#3a1a55";
		borderColor = "#d4b46a";
	}
	else if (activeInputMode === InputMode.keyboard) {
		backgroundColor = "#1a2240";
		borderColor = "#aaccff";
	}
	else {
		backgroundColor = "#2a2a40";
		borderColor = "#ffeecc";
	}

	canvasRenderingContext.fillStyle = backgroundColor;
	canvasRenderingContext.fillRect(badgeX, badgeY, badgeSize, badgeSize);
	canvasRenderingContext.strokeStyle = borderColor;
	canvasRenderingContext.lineWidth = 1;
	canvasRenderingContext.strokeRect(badgeX, badgeY, badgeSize, badgeSize);

	canvasRenderingContext.fillStyle = "#ffffff";
	const fontSize = hintLabel.isLetter ? 11 : 8;
	canvasRenderingContext.font = `bold ${fontSize}px monospace`;
	canvasRenderingContext.textAlign = "center";
	canvasRenderingContext.textBaseline = "middle";
	canvasRenderingContext.fillText(hintLabel.text, badgeX + badgeSize * 0.5, badgeY + badgeSize * 0.5);
}


//==============================================================================
// (모드 무관) 액션 → 키보드 KeyboardEvent.code 매핑.
// 매핑 없으면 null. 키보드 모드일 때 isActionPressed 가 사용한다.
//==============================================================================
/**
 * @param { string } actionKey
 * @returns { string | null }
 */
export function resolveKeyboardKeyCode(actionKey) {
	switch (actionKey) {
		case InputAction.menu: {
			return "Escape";
		}
		case InputAction.confirm:
		case InputAction.enterRoom:
		case InputAction.completeRoom:
		case InputAction.move: {
			return "KeyZ";
		}
		case InputAction.cancel:
		case InputAction.escape: {
			return "KeyX";
		}
		case InputAction.endTurn: {
			return "KeyV";
		}
		case InputAction.abandon: {
			return null;
		}
		case InputAction.previousTab: {
			return "BracketLeft";
		}
		case InputAction.nextTab: {
			return "BracketRight";
		}
		case InputAction.focusPrev: {
			return "ArrowLeft";
		}
		case InputAction.focusNext: {
			return "ArrowRight";
		}
		default: {
			return null;
		}
	}
}


//==============================================================================
// (모드 무관) 액션 → 게임패드 버튼 인덱스 매핑.
// 매핑 없으면 -1. 게임패드 모드일 때 isActionPressed 가 사용한다.
//==============================================================================
/**
 * @param { string } actionKey
 * @returns { number }
 */
export function resolveGamepadButtonIndex(actionKey) {
	switch (actionKey) {
		case InputAction.menu: {
			return GamepadButtonCode.OPTIONS_MENU;
		}
		case InputAction.confirm:
		case InputAction.enterRoom:
		case InputAction.completeRoom:
		case InputAction.move: {
			return GamepadButtonCode.A_CROSS;
		}
		case InputAction.cancel:
		case InputAction.escape: {
			return GamepadButtonCode.B_CIRCLE;
		}
		case InputAction.endTurn: {
			return GamepadButtonCode.Y_TRIANGLE;
		}
		case InputAction.abandon: {
			return -1;
		}
		case InputAction.previousTab: {
			return GamepadButtonCode.L1;
		}
		case InputAction.nextTab: {
			return GamepadButtonCode.R1;
		}
		case InputAction.focusPrev: {
			return GamepadButtonCode.DPAD_LEFT;
		}
		case InputAction.focusNext: {
			return GamepadButtonCode.DPAD_RIGHT;
		}
		default: {
			return -1;
		}
	}
}


//==============================================================================
// 활성 입력 모드의 액션 키가 현재 눌려 있는지.
// - 키보드 모드: resolveKeyboardKeyCode 가 가리키는 키.
// - 게임패드 모드: resolveGamepadButtonIndex 가 가리키는 버튼 (연결된 모든 패드 OR).
// - 터치 모드: 항상 false (터치는 화면 클릭으로 처리).
// "just pressed" 가 필요한 호출자는 자체 prev 상태를 유지한 뒤 비교해야 한다.
//==============================================================================
/**
 * @param { import("../../libs/vanilla.js/src/core/inputmanager.js").InputManager } inputManager
 * @param { string } actionKey
 * @returns { boolean }
 */
export function isActionPressed(inputManager, actionKey) {
	if (activeInputMode === InputMode.gamepad) {
		const buttonIndex = resolveGamepadButtonIndex(actionKey);
		if (buttonIndex < 0) {
			return false;
		}
		const gamepadManager = inputManager.getGamepadManager();
		if (!gamepadManager) {
			return false;
		}
		const connectedGamepads = gamepadManager.getAllConnectedGamepads();
		for (const connectedGamepad of connectedGamepads) {
			if (gamepadManager.isButtonPressed(connectedGamepad.index, buttonIndex)) {
				return true;
			}
		}
		return false;
	}
	if (activeInputMode === InputMode.keyboard) {
		const keyCode = resolveKeyboardKeyCode(actionKey);
		if (keyCode === null) {
			return false;
		}
		return inputManager.isKeyPressed(keyCode);
	}
	return false;
}


//==============================================================================
// 외부 사용을 위한 식별자 / 클래스 재공개.
//==============================================================================
export { InputMode, InputAction, InputHintLabel };

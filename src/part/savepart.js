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
const SIDE_MARGIN = 32;
const HEADER_HEIGHT = 64;
const HEADER_TO_BAR_GAP = 16;
const FOOTER_HEIGHT = 48;
const MODE_BAR_HEIGHT = 48;
const BAR_TO_GRID_GAP = 16;
const SLOT_GAP = 16;
const SLOT_INNER_PADDING = 18;
const SAVE_SLOT_COUNT = 6;


//==============================================================================
// 페이지 모드 (저장 / 불러오기).
//==============================================================================
const SavePartMode = System.Object.freeze({
	save: "save",
	load: "load",
});


//==============================================================================
// 단일 세이브 슬롯 데이터.
// isEmpty=true 면 비어 있는 슬롯. 채워진 슬롯은 캐릭터/경지/일자/타임스탬프 포함.
//==============================================================================
class SaveSlot extends Object {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @type { number } */ slotIndex;
	/** @type { boolean } */ isEmpty;
	/** @type { string } */ characterName;
	/** @type { string } */ realmName;
	/** @type { number } */ daysPassed;
	/** @type { string } */ savedAt;
	/** @type { string } */ chapterName;

	//==============================================================================
	// 생성.
	//==============================================================================
	constructor(slotIndex, isEmpty, characterName, realmName, daysPassed, savedAt, chapterName) {
		super();
		this.slotIndex = slotIndex;
		this.isEmpty = isEmpty;
		this.characterName = characterName;
		this.realmName = realmName;
		this.daysPassed = daysPassed;
		this.savedAt = savedAt;
		this.chapterName = chapterName;
	}
}


//==============================================================================
// 슬롯 hit-test 영역.
//==============================================================================
class SaveSlotLayout extends Object {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @type { SaveSlot } */ slot;
	/** @type { number } */ x;
	/** @type { number } */ y;
	/** @type { number } */ width;
	/** @type { number } */ height;

	//==============================================================================
	// 생성.
	//==============================================================================
	constructor(slot, x, y, width, height) {
		super();
		this.slot = slot;
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
	}
}


//==============================================================================
// 모드 토글 버튼 hit-test 영역.
//==============================================================================
class ModeButtonLayout extends Object {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @type { string } */ mode;
	/** @type { number } */ x;
	/** @type { number } */ y;
	/** @type { number } */ width;
	/** @type { number } */ height;

	//==============================================================================
	// 생성.
	//==============================================================================
	constructor(mode, x, y, width, height) {
		super();
		this.mode = mode;
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
	}
}


//==============================================================================
// 세이브 / 로드 파트 (콘솔 게임 풍).
// - 상단에 모드 토글 (저장 / 불러오기).
// - 슬롯 6개를 2열 × 3행으로 표시. 각 슬롯에 캐릭터 / 경지 / 일자 / 저장 시각.
// - 슬롯 클릭 시 외부 onSlotSelected(slot, mode) 콜백으로 위임.
// - 저장 데이터는 임시 — installSampleSlots 가 6개 슬롯 (일부는 채움 / 일부는 빈) 으로 미리 채움.
//==============================================================================
export class SavePart extends Object {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @private @type { SaveSlot[] } */ #slots;
	/** @private @type { string } */ #mode;
	/** @private @type { SaveSlotLayout[] } */ #slotLayouts;
	/** @private @type { ModeButtonLayout[] } */ #modeButtonLayouts;
	/** @private @type { boolean } */ #wasTouchPressed;
	/** @private @type { boolean } */ #wasCancelActionPressed;
	/** @private @type { ((SaveSlot, string) => void) | null } */ #onSlotSelected;
	/** @private @type { (() => void) | null } */ #onClose;
	/** @private @type { AudioBeepPlayer | null } */ #audioBeepPlayer;

	//==============================================================================
	// 생성.
	//==============================================================================
	constructor() {
		super();
		this.#slots = [];
		this.#mode = SavePartMode.save;
		this.#slotLayouts = [];
		this.#modeButtonLayouts = [];
		this.#wasTouchPressed = false;
		this.#wasCancelActionPressed = false;
		this.#onSlotSelected = null;
		this.#onClose = null;
		this.#audioBeepPlayer = null;
		this.installSampleSlots();
	}

	//==============================================================================
	// 데이터 / 콜백 주입.
	//==============================================================================
	/**
	 * @param { SaveSlot[] } slots
	 */
	setSlots(slots) {
		this.#slots = System.Array.isArray(slots) ? slots : [];
	}

	/**
	 * @param { string } mode
	 */
	setMode(mode) {
		if (mode === SavePartMode.save || mode === SavePartMode.load) {
			this.#mode = mode;
		}
	}

	/**
	 * @param { (slot: SaveSlot, mode: string) => void } callback
	 */
	setOnSlotSelected(callback) {
		this.#onSlotSelected = callback;
	}

	/**
	 * @param { () => void } callback
	 */
	setOnClose(callback) {
		this.#onClose = callback;
	}

	//==============================================================================
	// 활성화 시 입력 누름 상태 리셋.
	//==============================================================================
	reset() {
		this.#wasTouchPressed = false;
		this.#wasCancelActionPressed = false;
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
		const isPressed = inputManager.isTouchPressed();
		if (isPressed && !this.#wasTouchPressed) {
			const viewInputPosition = inputManager.getViewInputPosition();
			this.handleClick(viewInputPosition);
		}
		this.#wasTouchPressed = isPressed;
		// cancel 액션으로 닫기.
		const isCancelActive = isActionPressed(inputManager, InputAction.cancel);
		if (isCancelActive && !this.#wasCancelActionPressed && this.#onClose) {
			this.#onClose();
		}
		this.#wasCancelActionPressed = isCancelActive;
	}

	//==============================================================================
	// 클릭 처리.
	//==============================================================================
	/**
	 * @param { { x: number, y: number } } viewInputPosition
	 */
	handleClick(viewInputPosition) {
		for (const buttonLayout of this.#modeButtonLayouts) {
			if (this.isInsideRect(viewInputPosition, buttonLayout.x, buttonLayout.y, buttonLayout.width, buttonLayout.height)) {
				if (this.#mode !== buttonLayout.mode) {
					this.#mode = buttonLayout.mode;
					const tabAudioBeepPlayer = this.getAudioBeepPlayer();
					if (tabAudioBeepPlayer) {
						tabAudioBeepPlayer.playClick();
					}
				}
				return;
			}
		}
		for (const slotLayout of this.#slotLayouts) {
			if (this.isInsideRect(viewInputPosition, slotLayout.x, slotLayout.y, slotLayout.width, slotLayout.height)) {
				// 불러오기 모드에서 비어 있는 슬롯은 비활성.
				if (this.#mode === SavePartMode.load && slotLayout.slot.isEmpty) {
					return;
				}
				const slotAudioBeepPlayer = this.getAudioBeepPlayer();
				if (slotAudioBeepPlayer) {
					slotAudioBeepPlayer.playConfirm();
				}
				if (this.#onSlotSelected) {
					this.#onSlotSelected(slotLayout.slot, this.#mode);
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

		// 배경.
		canvasRenderingContext.fillStyle = "#0a0e1c";
		canvasRenderingContext.fillRect(popupRect.x, popupRect.y, popupRect.width, popupRect.height);

		this.drawHeader(canvasRenderingContext, popupRect);
		this.drawModeBar(canvasRenderingContext, popupRect);

		// 슬롯 그리드 (2열 × 3행).
		this.#slotLayouts = [];
		const gridX = popupRect.x + SIDE_MARGIN;
		const gridY = popupRect.y + HEADER_HEIGHT + HEADER_TO_BAR_GAP + MODE_BAR_HEIGHT + BAR_TO_GRID_GAP;
		const gridWidth = popupRect.width - SIDE_MARGIN * 2;
		const gridHeight = popupRect.height - (gridY - popupRect.y) - FOOTER_HEIGHT - 16;
		const columnCount = 2;
		const rowCount = System.Math.ceil(SAVE_SLOT_COUNT / columnCount);
		const cellWidth = (gridWidth - SLOT_GAP * (columnCount - 1)) / columnCount;
		const cellHeight = (gridHeight - SLOT_GAP * (rowCount - 1)) / rowCount;
		for (let slotIndex = 0; slotIndex < SAVE_SLOT_COUNT; ++slotIndex) {
			const slot = this.#slots[slotIndex];
			if (!slot) {
				continue;
			}
			const columnIndex = slotIndex % columnCount;
			const rowIndex = System.Math.floor(slotIndex / columnCount);
			const slotX = gridX + columnIndex * (cellWidth + SLOT_GAP);
			const slotY = gridY + rowIndex * (cellHeight + SLOT_GAP);
			this.drawSlot(canvasRenderingContext, slot, slotX, slotY, cellWidth, cellHeight);
			this.#slotLayouts.push(new SaveSlotLayout(slot, slotX, slotY, cellWidth, cellHeight));
		}

		this.drawFooter(canvasRenderingContext, popupRect);
	}

	//==============================================================================
	// 헤더.
	//==============================================================================
	/**
	 * @param { CanvasRenderingContext2D } canvasRenderingContext
	 * @param { { x: number, y: number, width: number, height: number } } popupRect
	 */
	drawHeader(canvasRenderingContext, popupRect) {
		const headerRightInset = 140;
		const headerBarWidth = popupRect.width - headerRightInset;
		canvasRenderingContext.fillStyle = "#1a2240";
		canvasRenderingContext.fillRect(popupRect.x, popupRect.y, headerBarWidth, HEADER_HEIGHT);
		canvasRenderingContext.strokeStyle = "#d4b46a";
		canvasRenderingContext.lineWidth = 1;
		canvasRenderingContext.beginPath();
		canvasRenderingContext.moveTo(popupRect.x, popupRect.y + HEADER_HEIGHT);
		canvasRenderingContext.lineTo(popupRect.x + headerBarWidth, popupRect.y + HEADER_HEIGHT);
		canvasRenderingContext.stroke();

		canvasRenderingContext.fillStyle = "#ffffff";
		canvasRenderingContext.font = "bold 22px GyeonggiBatangBold, sans-serif";
		canvasRenderingContext.textAlign = "left";
		canvasRenderingContext.textBaseline = "middle";
		canvasRenderingContext.fillText("저장 / 불러오기", popupRect.x + SIDE_MARGIN, popupRect.y + HEADER_HEIGHT * 0.5);
	}

	//==============================================================================
	// 모드 토글 바 (저장 / 불러오기).
	//==============================================================================
	/**
	 * @param { CanvasRenderingContext2D } canvasRenderingContext
	 * @param { { x: number, y: number, width: number, height: number } } popupRect
	 */
	drawModeBar(canvasRenderingContext, popupRect) {
		this.#modeButtonLayouts = [];
		const barY = popupRect.y + HEADER_HEIGHT + HEADER_TO_BAR_GAP;
		const buttonModes = [SavePartMode.save, SavePartMode.load];
		const buttonGap = 8;
		const buttonAreaWidth = popupRect.width - SIDE_MARGIN * 2;
		const buttonWidth = (buttonAreaWidth - buttonGap) * 0.5;
		for (let modeIndex = 0; modeIndex < buttonModes.length; ++modeIndex) {
			const buttonMode = buttonModes[modeIndex];
			const buttonX = popupRect.x + SIDE_MARGIN + modeIndex * (buttonWidth + buttonGap);
			const isActive = buttonMode === this.#mode;
			canvasRenderingContext.fillStyle = isActive ? "#2c3a66" : "#16203a";
			canvasRenderingContext.fillRect(buttonX, barY, buttonWidth, MODE_BAR_HEIGHT);
			canvasRenderingContext.strokeStyle = isActive ? "#d4b46a" : "#3a4a6a";
			canvasRenderingContext.lineWidth = isActive ? 2 : 1;
			canvasRenderingContext.strokeRect(buttonX, barY, buttonWidth, MODE_BAR_HEIGHT);
			canvasRenderingContext.fillStyle = isActive ? "#ffffff" : "#aaaabb";
			canvasRenderingContext.font = "bold 16px GyeonggiBatangBold, sans-serif";
			canvasRenderingContext.textAlign = "center";
			canvasRenderingContext.textBaseline = "middle";
			canvasRenderingContext.fillText(buttonMode === SavePartMode.save ? "저장" : "불러오기", buttonX + buttonWidth * 0.5, barY + MODE_BAR_HEIGHT * 0.5);
			this.#modeButtonLayouts.push(new ModeButtonLayout(buttonMode, buttonX, barY, buttonWidth, MODE_BAR_HEIGHT));
		}
	}

	//==============================================================================
	// 단일 슬롯 출력.
	//==============================================================================
	/**
	 * @param { CanvasRenderingContext2D } canvasRenderingContext
	 * @param { SaveSlot } slot
	 * @param { number } x
	 * @param { number } y
	 * @param { number } width
	 * @param { number } height
	 */
	drawSlot(canvasRenderingContext, slot, x, y, width, height) {
		const isLoadDisabled = this.#mode === SavePartMode.load && slot.isEmpty;
		const backgroundColor = slot.isEmpty ? "#16203a" : "#1f2a48";
		canvasRenderingContext.fillStyle = backgroundColor;
		canvasRenderingContext.fillRect(x, y, width, height);
		canvasRenderingContext.strokeStyle = isLoadDisabled ? "#2a2a40" : "#3a4a6a";
		canvasRenderingContext.lineWidth = 1;
		canvasRenderingContext.strokeRect(x, y, width, height);

		// 슬롯 번호.
		const slotNumberColor = isLoadDisabled ? "#444455" : "#d4b46a";
		canvasRenderingContext.fillStyle = slotNumberColor;
		canvasRenderingContext.font = "bold 14px GyeonggiBatangBold, sans-serif";
		canvasRenderingContext.textAlign = "left";
		canvasRenderingContext.textBaseline = "top";
		canvasRenderingContext.fillText(`SLOT ${slot.slotIndex + 1}`, x + SLOT_INNER_PADDING, y + SLOT_INNER_PADDING);

		if (slot.isEmpty) {
			const emptyTextColor = isLoadDisabled ? "#444455" : "#888899";
			canvasRenderingContext.fillStyle = emptyTextColor;
			canvasRenderingContext.font = "16px GyeonggiBatang, sans-serif";
			canvasRenderingContext.textAlign = "center";
			canvasRenderingContext.textBaseline = "middle";
			canvasRenderingContext.fillText("- 비어 있음 -", x + width * 0.5, y + height * 0.5);
			if (this.#mode === SavePartMode.save) {
				canvasRenderingContext.fillStyle = "#aaaabb";
				canvasRenderingContext.font = "12px GyeonggiBatang, sans-serif";
				canvasRenderingContext.fillText("클릭하여 저장", x + width * 0.5, y + height * 0.5 + 28);
			}
			return;
		}

		// 채워진 슬롯: 캐릭터 / 경지 / 일자 / 저장 시각 / 챕터.
		const innerX = x + SLOT_INNER_PADDING;
		canvasRenderingContext.fillStyle = "#ffffff";
		canvasRenderingContext.font = "bold 18px GyeonggiBatangBold, sans-serif";
		canvasRenderingContext.textAlign = "left";
		canvasRenderingContext.textBaseline = "top";
		canvasRenderingContext.fillText(slot.characterName, innerX, y + 44);

		canvasRenderingContext.fillStyle = "#ffcc88";
		canvasRenderingContext.font = "13px GyeonggiBatang, sans-serif";
		canvasRenderingContext.fillText(`${slot.realmName}  ·  ${slot.daysPassed}일차`, innerX, y + 72);

		canvasRenderingContext.fillStyle = "#dddddd";
		canvasRenderingContext.font = "13px GyeonggiBatang, sans-serif";
		canvasRenderingContext.fillText(slot.chapterName, innerX, y + height - 48);

		canvasRenderingContext.fillStyle = "#888899";
		canvasRenderingContext.font = "11px GyeonggiBatang, sans-serif";
		canvasRenderingContext.fillText(slot.savedAt, innerX, y + height - 24);
	}

	//==============================================================================
	// 푸터 안내.
	//==============================================================================
	/**
	 * @param { CanvasRenderingContext2D } canvasRenderingContext
	 * @param { { x: number, y: number, width: number, height: number } } popupRect
	 */
	drawFooter(canvasRenderingContext, popupRect) {
		const footerY = popupRect.y + popupRect.height - FOOTER_HEIGHT;
		canvasRenderingContext.fillStyle = "#1a2240";
		canvasRenderingContext.fillRect(popupRect.x, footerY, popupRect.width, FOOTER_HEIGHT);
		canvasRenderingContext.fillStyle = "#aaaabb";
		canvasRenderingContext.font = "12px GyeonggiBatang, sans-serif";
		canvasRenderingContext.textAlign = "center";
		canvasRenderingContext.textBaseline = "middle";
		const message = this.#mode === SavePartMode.save
			? "슬롯을 클릭해 현재 진행 상태를 저장한다."
			: "채워진 슬롯을 클릭해 진행 상태를 불러온다.";
		canvasRenderingContext.fillText(message, popupRect.x + popupRect.width * 0.5, footerY + FOOTER_HEIGHT * 0.5);
		// 우하단 cancel 힌트.
		drawInputHintBadge(canvasRenderingContext, InputAction.cancel, popupRect.x + popupRect.width - SIDE_MARGIN, footerY + FOOTER_HEIGHT * 0.5);
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
	// 임시 샘플 슬롯 (실제 저장 데이터 시스템 도입 전 미리보기용).
	//==============================================================================
	installSampleSlots() {
		const sampleSlots = [];
		sampleSlots.push(new SaveSlot(0, false, "한두백", "연기", 1, "2026-04-28 14:32", "검종 입문 시험"));
		sampleSlots.push(new SaveSlot(1, false, "한두백", "연기", 3, "2026-04-28 15:10", "검종 본전 - 수련"));
		sampleSlots.push(new SaveSlot(2, true, "", "", 0, "", ""));
		sampleSlots.push(new SaveSlot(3, false, "한두백", "결단", 12, "2026-04-27 22:48", "강호 시장 - 첫 만남"));
		sampleSlots.push(new SaveSlot(4, true, "", "", 0, "", ""));
		sampleSlots.push(new SaveSlot(5, true, "", "", 0, "", ""));
		this.setSlots(sampleSlots);
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
export { SavePartMode, SaveSlot };

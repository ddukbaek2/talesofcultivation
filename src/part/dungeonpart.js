//==============================================================================
// 포함 모듈 목록.
//==============================================================================
const System = globalThis;
import { Object } from "../../libs/vanilla.js/src/base/object.js";
import { AudioBeepPlayer } from "../base/audiobeepplayer.js";


//==============================================================================
// 상수.
//==============================================================================
const SIDE_MARGIN = 32;
const HEADER_HEIGHT = 64;
const HEADER_TO_CONTENT_GAP = 20;
const FOOTER_HEIGHT = 48;
const ROOM_LIST_WIDTH_RATIO = 0.36;
const ROOM_LIST_ROW_HEIGHT = 64;
const ROOM_LIST_ROW_GAP = 8;
const ACTION_BUTTON_HEIGHT = 48;
const ACTION_BUTTON_GAP = 12;


//==============================================================================
// 던전 룸 종류 (각 룸이 진입 시 어떤 내부 파트를 트리거할지).
//==============================================================================
const DungeonRoomKind = System.Object.freeze({
	combat: "combat",
	dialogue: "dialogue",
	event: "event",
	rest: "rest",
	treasure: "treasure",
	exit: "exit",
});


//==============================================================================
// 던전 진행 결과.
//==============================================================================
const DungeonOutcomeKind = System.Object.freeze({
	inProgress: "inProgress",
	completed: "completed",
	escaped: "escaped",
	defeated: "defeated",
});


//==============================================================================
// 던전 보상 항목 (완료 시에만 지급).
//==============================================================================
class DungeonReward extends Object {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @type { string } */ kind;
	/** @type { number } */ id;
	/** @type { string } */ label;
	/** @type { number } */ amount;

	//==============================================================================
	// 생성.
	//==============================================================================
	constructor(kind, id, label, amount) {
		super();
		this.kind = kind;
		this.id = id;
		this.label = label;
		this.amount = amount;
	}
}


//==============================================================================
// 던전 룸 (정해진 규칙에 따라 정의되는 노드).
//==============================================================================
class DungeonRoom extends Object {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @type { number } */ id;
	/** @type { string } */ kind;
	/** @type { string } */ name;
	/** @type { string } */ description;
	/** @type { number[] } */ nextRoomIds;
	/** @type { string } */ payloadKey;
	/** @type { boolean } */ isCleared;

	//==============================================================================
	// 생성.
	//==============================================================================
	constructor(id, kind, name, description, nextRoomIds, payloadKey) {
		super();
		this.id = id;
		this.kind = kind;
		this.name = name;
		this.description = description;
		this.nextRoomIds = System.Array.isArray(nextRoomIds) ? nextRoomIds : [];
		this.payloadKey = typeof payloadKey === "string" ? payloadKey : "";
		this.isCleared = false;
	}
}


//==============================================================================
// 던전 정의.
//==============================================================================
class DungeonDefinition extends Object {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @type { number } */ id;
	/** @type { string } */ name;
	/** @type { string } */ description;
	/** @type { number } */ entryRoomId;
	/** @type { DungeonRoom[] } */ rooms;
	/** @type { DungeonReward[] } */ completionRewards;

	//==============================================================================
	// 생성.
	//==============================================================================
	constructor(id, name, description, entryRoomId, rooms, completionRewards) {
		super();
		this.id = id;
		this.name = name;
		this.description = description;
		this.entryRoomId = entryRoomId;
		this.rooms = System.Array.isArray(rooms) ? rooms : [];
		this.completionRewards = System.Array.isArray(completionRewards) ? completionRewards : [];
	}
}


//==============================================================================
// 룸 행 hit-test 영역.
//==============================================================================
class DungeonRoomRowLayout extends Object {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @type { DungeonRoom } */ room;
	/** @type { boolean } */ isReachable;
	/** @type { number } */ x;
	/** @type { number } */ y;
	/** @type { number } */ width;
	/** @type { number } */ height;

	//==============================================================================
	// 생성.
	//==============================================================================
	constructor(room, isReachable, x, y, width, height) {
		super();
		this.room = room;
		this.isReachable = isReachable;
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
	}
}


//==============================================================================
// 액션 버튼 hit-test 영역.
//==============================================================================
class DungeonActionButtonLayout extends Object {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @type { string } */ actionKey;
	/** @type { number } */ x;
	/** @type { number } */ y;
	/** @type { number } */ width;
	/** @type { number } */ height;

	//==============================================================================
	// 생성.
	//==============================================================================
	constructor(actionKey, x, y, width, height) {
		super();
		this.actionKey = actionKey;
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
	}
}


//==============================================================================
// 던전 액션 식별자.
//==============================================================================
const DungeonActionKey = System.Object.freeze({
	enterRoom: "enterRoom",
	completeRoom: "completeRoom",
	escape: "escape",
});


//==============================================================================
// 던전 파트.
// - 메인 사이클(맵→활동→전투) 과는 분리된 서브 사이클.
// - 진입하면 정해진 던전 정의 (DungeonDefinition) 의 룸들을 규칙에 따라 진행.
// - 각 룸은 종류별로 내부에서 적절한 파트(전투/대사/이벤트/휴식/보물)를 트리거하도록
//   외부 콜백 onRoomEntered(room) 으로 위임. 내부 파트가 끝나면 외부에서 markCurrentRoomCleared() 호출.
// - "탈출" 은 보상 없이 던전 종료. "완료" (출구 룸 도달) 는 정의된 보상을 onCompleted(rewards) 콜백으로 전달.
// - 외부 매니저 (main.js) 가 onCompleted / onEscaped 결과를 받아 PlayerProfile 에 반영.
//==============================================================================
export class DungeonPart extends Object {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @private @type { DungeonDefinition | null } */ #definition;
	/** @private @type { number } */ #currentRoomId;
	/** @private @type { number } */ #selectedRoomId;
	/** @private @type { string } */ #outcome;
	/** @private @type { Set<number> } */ #visitedRoomIds;
	/** @private @type { DungeonRoomRowLayout[] } */ #roomRowLayouts;
	/** @private @type { DungeonActionButtonLayout[] } */ #actionButtonLayouts;
	/** @private @type { boolean } */ #wasTouchPressed;
	/** @private @type { ((DungeonRoom) => void) | null } */ #onRoomEntered;
	/** @private @type { ((DungeonReward[]) => void) | null } */ #onCompleted;
	/** @private @type { (() => void) | null } */ #onEscaped;
	/** @private @type { AudioBeepPlayer | null } */ #audioBeepPlayer;

	//==============================================================================
	// 생성.
	//==============================================================================
	constructor() {
		super();
		this.#definition = null;
		this.#currentRoomId = 0;
		this.#selectedRoomId = 0;
		this.#outcome = DungeonOutcomeKind.inProgress;
		this.#visitedRoomIds = new System.Set();
		this.#roomRowLayouts = [];
		this.#actionButtonLayouts = [];
		this.#wasTouchPressed = false;
		this.#onRoomEntered = null;
		this.#onCompleted = null;
		this.#onEscaped = null;
		this.#audioBeepPlayer = null;
		this.installSampleDefinition();
	}

	//==============================================================================
	// 정의 / 콜백 주입.
	//==============================================================================
	/**
	 * @param { DungeonDefinition } definition
	 */
	setDefinition(definition) {
		this.#definition = definition;
		this.reset();
	}

	/**
	 * @param { (room: DungeonRoom) => void } callback
	 */
	setOnRoomEntered(callback) {
		this.#onRoomEntered = callback;
	}

	/**
	 * @param { (rewards: DungeonReward[]) => void } callback
	 */
	setOnCompleted(callback) {
		this.#onCompleted = callback;
	}

	/**
	 * @param { () => void } callback
	 */
	setOnEscaped(callback) {
		this.#onEscaped = callback;
	}

	//==============================================================================
	// 던전 진입 / 재시작.
	//==============================================================================
	reset() {
		this.#wasTouchPressed = false;
		this.#outcome = DungeonOutcomeKind.inProgress;
		this.#visitedRoomIds = new System.Set();
		if (this.#definition === null) {
			this.#currentRoomId = 0;
			this.#selectedRoomId = 0;
			return;
		}
		this.#currentRoomId = this.#definition.entryRoomId;
		this.#selectedRoomId = this.#definition.entryRoomId;
		for (const room of this.#definition.rooms) {
			room.isCleared = false;
		}
		const entryRoom = this.findRoomById(this.#currentRoomId);
		if (entryRoom !== null) {
			this.#visitedRoomIds.add(entryRoom.id);
		}
	}

	//==============================================================================
	// 외부에서 현재 룸의 내부 파트가 끝났음을 알릴 때 호출.
	// 룸이 완료되면 isCleared = true. 출구 룸이면 던전 완료.
	//==============================================================================
	markCurrentRoomCleared() {
		const currentRoom = this.findRoomById(this.#currentRoomId);
		if (currentRoom === null) {
			return;
		}
		currentRoom.isCleared = true;
		if (currentRoom.kind === DungeonRoomKind.exit) {
			this.completeDungeon();
		}
	}

	//==============================================================================
	// 진행 결과 반환 (외부에서 던전 종료 후 분기 결정에 사용).
	//==============================================================================
	/**
	 * @returns { string }
	 */
	getOutcome() {
		return this.#outcome;
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
		if (this.#outcome !== DungeonOutcomeKind.inProgress) {
			return;
		}
		const isPressed = inputManager.isTouchPressed();
		if (isPressed && !this.#wasTouchPressed) {
			const viewInputPosition = inputManager.getViewInputPosition();
			this.handleClick(viewInputPosition);
		}
		this.#wasTouchPressed = isPressed;
	}

	//==============================================================================
	// 클릭 처리.
	// - 룸 행 hit & 진입 가능 → 선택 변경.
	// - 액션 버튼 hit → 진입 / 완료 / 탈출.
	//==============================================================================
	/**
	 * @param { { x: number, y: number } } viewInputPosition
	 */
	handleClick(viewInputPosition) {
		for (const rowLayout of this.#roomRowLayouts) {
			if (this.isInsideRect(viewInputPosition, rowLayout.x, rowLayout.y, rowLayout.width, rowLayout.height)) {
				if (!rowLayout.isReachable) {
					return;
				}
				this.#selectedRoomId = rowLayout.room.id;
				const clickAudioBeepPlayer = this.getAudioBeepPlayer();
				if (clickAudioBeepPlayer) {
					clickAudioBeepPlayer.playClick();
				}
				return;
			}
		}
		for (const buttonLayout of this.#actionButtonLayouts) {
			if (this.isInsideRect(viewInputPosition, buttonLayout.x, buttonLayout.y, buttonLayout.width, buttonLayout.height)) {
				this.executeAction(buttonLayout.actionKey);
				return;
			}
		}
	}

	//==============================================================================
	// 액션 실행.
	//==============================================================================
	/**
	 * @param { string } actionKey
	 */
	executeAction(actionKey) {
		const confirmAudioBeepPlayer = this.getAudioBeepPlayer();
		if (actionKey === DungeonActionKey.enterRoom) {
			const targetRoom = this.findRoomById(this.#selectedRoomId);
			if (targetRoom === null) {
				return;
			}
			if (!this.isRoomReachable(targetRoom)) {
				return;
			}
			this.#currentRoomId = targetRoom.id;
			this.#visitedRoomIds.add(targetRoom.id);
			if (confirmAudioBeepPlayer) {
				confirmAudioBeepPlayer.playConfirm();
			}
			if (this.#onRoomEntered) {
				this.#onRoomEntered(targetRoom);
			}
			return;
		}
		if (actionKey === DungeonActionKey.completeRoom) {
			this.markCurrentRoomCleared();
			if (confirmAudioBeepPlayer) {
				confirmAudioBeepPlayer.playConfirm();
			}
			return;
		}
		if (actionKey === DungeonActionKey.escape) {
			this.escapeDungeon();
			if (confirmAudioBeepPlayer) {
				confirmAudioBeepPlayer.playCancel();
			}
			return;
		}
	}

	//==============================================================================
	// 던전 완료 처리. 보상은 외부 콜백으로 전달.
	//==============================================================================
	completeDungeon() {
		this.#outcome = DungeonOutcomeKind.completed;
		if (this.#onCompleted && this.#definition) {
			this.#onCompleted(this.#definition.completionRewards);
		}
	}

	//==============================================================================
	// 던전 탈출 처리. 보상 없음.
	//==============================================================================
	escapeDungeon() {
		this.#outcome = DungeonOutcomeKind.escaped;
		if (this.#onEscaped) {
			this.#onEscaped();
		}
	}

	//==============================================================================
	// 던전 패배 처리 (외부에서 호출). 보상 없음.
	//==============================================================================
	defeatInDungeon() {
		this.#outcome = DungeonOutcomeKind.defeated;
		if (this.#onEscaped) {
			this.#onEscaped();
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
		canvasRenderingContext.fillStyle = "#0e0e1c";
		canvasRenderingContext.fillRect(popupRect.x, popupRect.y, popupRect.width, popupRect.height);

		// 헤더.
		this.drawHeader(canvasRenderingContext, popupRect);

		// 진행 중 / 종료 분기 출력.
		if (this.#outcome === DungeonOutcomeKind.inProgress) {
			const contentX = popupRect.x + SIDE_MARGIN;
			const contentY = popupRect.y + HEADER_HEIGHT + HEADER_TO_CONTENT_GAP;
			const contentWidth = popupRect.width - SIDE_MARGIN * 2;
			const contentHeight = popupRect.height - HEADER_HEIGHT - HEADER_TO_CONTENT_GAP - FOOTER_HEIGHT - 16;
			const roomListWidth = System.Math.floor(contentWidth * ROOM_LIST_WIDTH_RATIO);
			const roomDetailX = contentX + roomListWidth + 20;
			const roomDetailWidth = contentWidth - roomListWidth - 20;
			this.drawRoomList(canvasRenderingContext, contentX, contentY, roomListWidth, contentHeight);
			this.drawRoomDetail(canvasRenderingContext, roomDetailX, contentY, roomDetailWidth, contentHeight);
		}
		else {
			this.drawOutcome(canvasRenderingContext, popupRect);
		}

		// 푸터.
		this.drawFooter(canvasRenderingContext, popupRect);
	}

	//==============================================================================
	// 헤더 (좌측 던전명 + 우측 진행 상황).
	//==============================================================================
	/**
	 * @param { CanvasRenderingContext2D } canvasRenderingContext
	 * @param { { x: number, y: number, width: number, height: number } } popupRect
	 */
	drawHeader(canvasRenderingContext, popupRect) {
		canvasRenderingContext.fillStyle = "#241a3a";
		canvasRenderingContext.fillRect(popupRect.x, popupRect.y, popupRect.width, HEADER_HEIGHT);
		canvasRenderingContext.strokeStyle = "#d4b46a";
		canvasRenderingContext.lineWidth = 1;
		canvasRenderingContext.beginPath();
		canvasRenderingContext.moveTo(popupRect.x, popupRect.y + HEADER_HEIGHT);
		canvasRenderingContext.lineTo(popupRect.x + popupRect.width, popupRect.y + HEADER_HEIGHT);
		canvasRenderingContext.stroke();

		const dungeonName = this.#definition ? this.#definition.name : "던전";
		canvasRenderingContext.fillStyle = "#ffffff";
		canvasRenderingContext.font = "bold 22px GyeonggiBatangBold, sans-serif";
		canvasRenderingContext.textAlign = "left";
		canvasRenderingContext.textBaseline = "middle";
		canvasRenderingContext.fillText(dungeonName, popupRect.x + SIDE_MARGIN, popupRect.y + HEADER_HEIGHT * 0.5);

		if (this.#definition) {
			const totalRooms = this.#definition.rooms.length;
			const clearedRooms = this.#definition.rooms.filter((r) => r.isCleared).length;
			canvasRenderingContext.fillStyle = "#ffcc88";
			canvasRenderingContext.font = "16px GyeonggiBatang, sans-serif";
			canvasRenderingContext.textAlign = "right";
			canvasRenderingContext.textBaseline = "middle";
			canvasRenderingContext.fillText(`진척 ${clearedRooms} / ${totalRooms}`, popupRect.x + popupRect.width - SIDE_MARGIN, popupRect.y + HEADER_HEIGHT * 0.5);
		}
	}

	//==============================================================================
	// 좌측 룸 목록.
	//==============================================================================
	/**
	 * @param { CanvasRenderingContext2D } canvasRenderingContext
	 * @param { number } x
	 * @param { number } y
	 * @param { number } width
	 * @param { number } height
	 */
	drawRoomList(canvasRenderingContext, x, y, width, height) {
		this.#roomRowLayouts = [];
		canvasRenderingContext.fillStyle = "#1a1730";
		canvasRenderingContext.fillRect(x, y, width, height);
		canvasRenderingContext.strokeStyle = "#3a3a5a";
		canvasRenderingContext.lineWidth = 1;
		canvasRenderingContext.strokeRect(x, y, width, height);

		canvasRenderingContext.fillStyle = "#cccccc";
		canvasRenderingContext.font = "13px GyeonggiBatang, sans-serif";
		canvasRenderingContext.textAlign = "left";
		canvasRenderingContext.textBaseline = "top";
		canvasRenderingContext.fillText("던전 룸", x + 12, y + 10);

		if (this.#definition === null) {
			return;
		}

		const listTopY = y + 48;
		const listInnerWidth = width - 32;
		for (let roomIndex = 0; roomIndex < this.#definition.rooms.length; ++roomIndex) {
			const room = this.#definition.rooms[roomIndex];
			const isReachable = this.isRoomReachable(room);
			const rowX = x + 8;
			const rowY = listTopY + roomIndex * (ROOM_LIST_ROW_HEIGHT + ROOM_LIST_ROW_GAP);
			if (rowY + ROOM_LIST_ROW_HEIGHT > y + height - 4) {
				break;
			}
			this.drawRoomRow(canvasRenderingContext, room, isReachable, rowX, rowY, listInnerWidth, ROOM_LIST_ROW_HEIGHT);
			this.#roomRowLayouts.push(new DungeonRoomRowLayout(room, isReachable, rowX, rowY, listInnerWidth, ROOM_LIST_ROW_HEIGHT));
		}
	}

	//==============================================================================
	// 단일 룸 행.
	//==============================================================================
	/**
	 * @param { CanvasRenderingContext2D } canvasRenderingContext
	 * @param { DungeonRoom } room
	 * @param { boolean } isReachable
	 * @param { number } x
	 * @param { number } y
	 * @param { number } width
	 * @param { number } height
	 */
	drawRoomRow(canvasRenderingContext, room, isReachable, x, y, width, height) {
		const isSelected = room.id === this.#selectedRoomId;
		const isCurrent = room.id === this.#currentRoomId;
		let backgroundColor = "#1f1a35";
		if (!isReachable && !isCurrent) {
			backgroundColor = "#16162a";
		}
		else if (isCurrent) {
			backgroundColor = "#3a2a55";
		}
		else if (isSelected) {
			backgroundColor = "#2c2855";
		}
		canvasRenderingContext.fillStyle = backgroundColor;
		canvasRenderingContext.fillRect(x, y, width, height);
		const borderColor = isCurrent ? "#d4b46a" : (isSelected ? "#aa88dd" : "#3a3a5a");
		canvasRenderingContext.strokeStyle = borderColor;
		canvasRenderingContext.lineWidth = (isCurrent || isSelected) ? 2 : 1;
		canvasRenderingContext.strokeRect(x, y, width, height);

		const titleColor = (!isReachable && !isCurrent) ? "#666677" : (isCurrent ? "#ffffff" : "#dddddd");
		canvasRenderingContext.fillStyle = titleColor;
		canvasRenderingContext.font = "bold 15px GyeonggiBatangBold, sans-serif";
		canvasRenderingContext.textAlign = "left";
		canvasRenderingContext.textBaseline = "top";
		canvasRenderingContext.fillText(`${this.roomKindIcon(room.kind)} ${room.name}`, x + 12, y + 8);

		const subColor = (!isReachable && !isCurrent) ? "#555566" : "#aaaabb";
		canvasRenderingContext.fillStyle = subColor;
		canvasRenderingContext.font = "12px GyeonggiBatang, sans-serif";
		canvasRenderingContext.fillText(this.roomKindLabel(room.kind), x + 12, y + 30);

		if (isCurrent) {
			canvasRenderingContext.fillStyle = "#d4b46a";
			canvasRenderingContext.font = "bold 11px GyeonggiBatangBold, sans-serif";
			canvasRenderingContext.textAlign = "right";
			canvasRenderingContext.textBaseline = "top";
			canvasRenderingContext.fillText("현재 위치", x + width - 10, y + 8);
		}
		else if (room.isCleared) {
			canvasRenderingContext.fillStyle = "#88dd88";
			canvasRenderingContext.font = "bold 11px GyeonggiBatangBold, sans-serif";
			canvasRenderingContext.textAlign = "right";
			canvasRenderingContext.textBaseline = "top";
			canvasRenderingContext.fillText("완료", x + width - 10, y + 8);
		}
	}

	//==============================================================================
	// 우측 룸 상세 + 액션 버튼.
	//==============================================================================
	/**
	 * @param { CanvasRenderingContext2D } canvasRenderingContext
	 * @param { number } x
	 * @param { number } y
	 * @param { number } width
	 * @param { number } height
	 */
	drawRoomDetail(canvasRenderingContext, x, y, width, height) {
		this.#actionButtonLayouts = [];
		canvasRenderingContext.fillStyle = "#1a1730";
		canvasRenderingContext.fillRect(x, y, width, height);
		canvasRenderingContext.strokeStyle = "#3a3a5a";
		canvasRenderingContext.lineWidth = 1;
		canvasRenderingContext.strokeRect(x, y, width, height);

		const selectedRoom = this.findRoomById(this.#selectedRoomId);
		if (selectedRoom === null) {
			canvasRenderingContext.fillStyle = "#888899";
			canvasRenderingContext.font = "16px GyeonggiBatang, sans-serif";
			canvasRenderingContext.textAlign = "center";
			canvasRenderingContext.textBaseline = "middle";
			canvasRenderingContext.fillText("선택된 룸이 없다.", x + width * 0.5, y + height * 0.5);
			return;
		}

		canvasRenderingContext.fillStyle = "#ffffff";
		canvasRenderingContext.font = "bold 20px GyeonggiBatangBold, sans-serif";
		canvasRenderingContext.textAlign = "left";
		canvasRenderingContext.textBaseline = "top";
		canvasRenderingContext.fillText(`${this.roomKindIcon(selectedRoom.kind)} ${selectedRoom.name}`, x + 16, y + 12);

		canvasRenderingContext.fillStyle = "#ffcc88";
		canvasRenderingContext.font = "13px GyeonggiBatang, sans-serif";
		canvasRenderingContext.fillText(this.roomKindLabel(selectedRoom.kind), x + 16, y + 38);

		canvasRenderingContext.fillStyle = "#dddddd";
		canvasRenderingContext.font = "14px GyeonggiBatang, sans-serif";
		const descriptionMaxWidth = width - 32;
		const descriptionLines = this.wrapTextByWidth(canvasRenderingContext, selectedRoom.description, descriptionMaxWidth);
		const descriptionLineHeight = 20;
		const descriptionTopY = y + 70;
		for (let lineIndex = 0; lineIndex < descriptionLines.length; ++lineIndex) {
			canvasRenderingContext.fillText(descriptionLines[lineIndex], x + 16, descriptionTopY + lineIndex * descriptionLineHeight);
		}

		// 액션 버튼.
		const actionButtonKeys = this.computeAvailableActionKeys(selectedRoom);
		if (actionButtonKeys.length === 0) {
			return;
		}
		const buttonsTotalHeight = actionButtonKeys.length * ACTION_BUTTON_HEIGHT + (actionButtonKeys.length - 1) * ACTION_BUTTON_GAP;
		const buttonsTopY = y + height - buttonsTotalHeight - 16;
		const buttonInsetX = x + 16;
		const buttonWidth = width - 32;
		for (let buttonIndex = 0; buttonIndex < actionButtonKeys.length; ++buttonIndex) {
			const actionKey = actionButtonKeys[buttonIndex];
			const buttonY = buttonsTopY + buttonIndex * (ACTION_BUTTON_HEIGHT + ACTION_BUTTON_GAP);
			this.drawActionButton(canvasRenderingContext, actionKey, buttonInsetX, buttonY, buttonWidth, ACTION_BUTTON_HEIGHT);
			this.#actionButtonLayouts.push(new DungeonActionButtonLayout(actionKey, buttonInsetX, buttonY, buttonWidth, ACTION_BUTTON_HEIGHT));
		}
	}

	//==============================================================================
	// 선택된 룸 / 현재 룸 상태에 따른 사용 가능 액션 키 목록.
	//==============================================================================
	/**
	 * @param { DungeonRoom } selectedRoom
	 * @returns { string[] }
	 */
	computeAvailableActionKeys(selectedRoom) {
		const actionKeys = [];
		const isCurrent = selectedRoom.id === this.#currentRoomId;
		const isReachable = this.isRoomReachable(selectedRoom);
		const currentRoom = this.findRoomById(this.#currentRoomId);
		if (isCurrent) {
			if (currentRoom !== null && !currentRoom.isCleared) {
				actionKeys.push(DungeonActionKey.completeRoom);
			}
		}
		else if (isReachable) {
			actionKeys.push(DungeonActionKey.enterRoom);
		}
		actionKeys.push(DungeonActionKey.escape);
		return actionKeys;
	}

	//==============================================================================
	// 단일 액션 버튼.
	//==============================================================================
	/**
	 * @param { CanvasRenderingContext2D } canvasRenderingContext
	 * @param { string } actionKey
	 * @param { number } x
	 * @param { number } y
	 * @param { number } width
	 * @param { number } height
	 */
	drawActionButton(canvasRenderingContext, actionKey, x, y, width, height) {
		const fillColor = this.actionFillColor(actionKey);
		canvasRenderingContext.fillStyle = fillColor;
		canvasRenderingContext.fillRect(x, y, width, height);
		canvasRenderingContext.strokeStyle = "#ffffff";
		canvasRenderingContext.lineWidth = 1;
		canvasRenderingContext.strokeRect(x, y, width, height);
		canvasRenderingContext.fillStyle = "#ffffff";
		canvasRenderingContext.font = "bold 16px GyeonggiBatangBold, sans-serif";
		canvasRenderingContext.textAlign = "left";
		canvasRenderingContext.textBaseline = "middle";
		canvasRenderingContext.fillText(this.actionLabel(actionKey), x + 14, y + height * 0.5);
		canvasRenderingContext.fillStyle = "#dddddd";
		canvasRenderingContext.font = "12px GyeonggiBatang, sans-serif";
		canvasRenderingContext.textAlign = "right";
		canvasRenderingContext.textBaseline = "middle";
		canvasRenderingContext.fillText(this.actionDescription(actionKey), x + width - 14, y + height * 0.5);
	}

	//==============================================================================
	// 액션 라벨 / 설명 / 색상 / 룸 종류 라벨·아이콘.
	//==============================================================================
	/**
	 * @param { string } actionKey
	 * @returns { string }
	 */
	actionLabel(actionKey) {
		switch (actionKey) {
			case DungeonActionKey.enterRoom: {
				return "진입";
			}
			case DungeonActionKey.completeRoom: {
				return "완료";
			}
			case DungeonActionKey.escape: {
				return "탈출";
			}
			default: {
				return "";
			}
		}
	}

	/**
	 * @param { string } actionKey
	 * @returns { string }
	 */
	actionDescription(actionKey) {
		switch (actionKey) {
			case DungeonActionKey.enterRoom: {
				return "이 룸으로 이동";
			}
			case DungeonActionKey.completeRoom: {
				return "현재 룸 종료";
			}
			case DungeonActionKey.escape: {
				return "보상 없이 탈출";
			}
			default: {
				return "";
			}
		}
	}

	/**
	 * @param { string } actionKey
	 * @returns { string }
	 */
	actionFillColor(actionKey) {
		switch (actionKey) {
			case DungeonActionKey.enterRoom: {
				return "#3a3a99";
			}
			case DungeonActionKey.completeRoom: {
				return "#3a7755";
			}
			case DungeonActionKey.escape: {
				return "#993333";
			}
			default: {
				return "#444466";
			}
		}
	}

	/**
	 * @param { string } roomKind
	 * @returns { string }
	 */
	roomKindLabel(roomKind) {
		switch (roomKind) {
			case DungeonRoomKind.combat: {
				return "전투";
			}
			case DungeonRoomKind.dialogue: {
				return "대사";
			}
			case DungeonRoomKind.event: {
				return "이벤트";
			}
			case DungeonRoomKind.rest: {
				return "휴식";
			}
			case DungeonRoomKind.treasure: {
				return "보물";
			}
			case DungeonRoomKind.exit: {
				return "출구";
			}
			default: {
				return "";
			}
		}
	}

	/**
	 * @param { string } roomKind
	 * @returns { string }
	 */
	roomKindIcon(roomKind) {
		switch (roomKind) {
			case DungeonRoomKind.combat: {
				return "⚔";
			}
			case DungeonRoomKind.dialogue: {
				return "💬";
			}
			case DungeonRoomKind.event: {
				return "❓";
			}
			case DungeonRoomKind.rest: {
				return "🛌";
			}
			case DungeonRoomKind.treasure: {
				return "💎";
			}
			case DungeonRoomKind.exit: {
				return "🏁";
			}
			default: {
				return "•";
			}
		}
	}

	//==============================================================================
	// 종료 화면 (완료 / 탈출 / 패배 공통 출력).
	//==============================================================================
	/**
	 * @param { CanvasRenderingContext2D } canvasRenderingContext
	 * @param { { x: number, y: number, width: number, height: number } } popupRect
	 */
	drawOutcome(canvasRenderingContext, popupRect) {
		const centerX = popupRect.x + popupRect.width * 0.5;
		const centerY = popupRect.y + popupRect.height * 0.5;
		let titleText = "";
		let titleColor = "#ffffff";
		let bodyText = "";
		switch (this.#outcome) {
			case DungeonOutcomeKind.completed: {
				titleText = "던전 완료";
				titleColor = "#88dd88";
				bodyText = "보상이 지급되었다.";
				break;
			}
			case DungeonOutcomeKind.escaped: {
				titleText = "탈출";
				titleColor = "#dddd88";
				bodyText = "보상은 받지 못했다.";
				break;
			}
			case DungeonOutcomeKind.defeated: {
				titleText = "패배";
				titleColor = "#dd6666";
				bodyText = "던전에서 쫓겨났다.";
				break;
			}
			default: {
				return;
			}
		}
		canvasRenderingContext.fillStyle = titleColor;
		canvasRenderingContext.font = "bold 32px GyeonggiBatangBold, sans-serif";
		canvasRenderingContext.textAlign = "center";
		canvasRenderingContext.textBaseline = "middle";
		canvasRenderingContext.fillText(titleText, centerX, centerY - 24);
		canvasRenderingContext.fillStyle = "#dddddd";
		canvasRenderingContext.font = "16px GyeonggiBatang, sans-serif";
		canvasRenderingContext.fillText(bodyText, centerX, centerY + 16);

		// 완료 시 보상 목록.
		if (this.#outcome === DungeonOutcomeKind.completed && this.#definition && this.#definition.completionRewards.length > 0) {
			canvasRenderingContext.fillStyle = "#ffcc88";
			canvasRenderingContext.font = "14px GyeonggiBatang, sans-serif";
			let rewardLineY = centerY + 56;
			for (const reward of this.#definition.completionRewards) {
				const amountSuffix = reward.amount > 1 ? ` x${reward.amount}` : "";
				canvasRenderingContext.fillText(`${reward.label}${amountSuffix}`, centerX, rewardLineY);
				rewardLineY += 22;
			}
		}
	}

	//==============================================================================
	// 푸터 안내 문구.
	//==============================================================================
	/**
	 * @param { CanvasRenderingContext2D } canvasRenderingContext
	 * @param { { x: number, y: number, width: number, height: number } } popupRect
	 */
	drawFooter(canvasRenderingContext, popupRect) {
		const footerY = popupRect.y + popupRect.height - FOOTER_HEIGHT;
		canvasRenderingContext.fillStyle = "#241a3a";
		canvasRenderingContext.fillRect(popupRect.x, footerY, popupRect.width, FOOTER_HEIGHT);
		canvasRenderingContext.fillStyle = "#aaaabb";
		canvasRenderingContext.font = "12px GyeonggiBatang, sans-serif";
		canvasRenderingContext.textAlign = "center";
		canvasRenderingContext.textBaseline = "middle";
		const message = this.#outcome === DungeonOutcomeKind.inProgress
			? "현재 룸을 완료해야 다음 룸으로 진입할 수 있다. 출구에 도달하면 보상을 받는다."
			: "던전 종료. 외부 매니저가 다음 단계를 진행한다.";
		canvasRenderingContext.fillText(message, popupRect.x + popupRect.width * 0.5, footerY + FOOTER_HEIGHT * 0.5);
	}

	//==============================================================================
	// 룸 진입 가능 여부.
	// - 현재 룸의 nextRoomIds 에 들어 있고
	// - 현재 룸이 완료된 상태여야 다음 룸으로 진입 가능.
	//==============================================================================
	/**
	 * @param { DungeonRoom } room
	 * @returns { boolean }
	 */
	isRoomReachable(room) {
		if (this.#definition === null) {
			return false;
		}
		const currentRoom = this.findRoomById(this.#currentRoomId);
		if (currentRoom === null) {
			return room.id === this.#definition.entryRoomId;
		}
		if (room.id === currentRoom.id) {
			return true;
		}
		if (!currentRoom.isCleared) {
			return false;
		}
		return currentRoom.nextRoomIds.indexOf(room.id) >= 0;
	}

	//==============================================================================
	// id 로 룸 검색.
	//==============================================================================
	/**
	 * @param { number } roomId
	 * @returns { DungeonRoom | null }
	 */
	findRoomById(roomId) {
		if (this.#definition === null) {
			return null;
		}
		for (const room of this.#definition.rooms) {
			if (room.id === roomId) {
				return room;
			}
		}
		return null;
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
		for (const character of text) {
			if (character === "\n") {
				lines.push(currentLine);
				currentLine = "";
				continue;
			}
			const tentative = currentLine + character;
			if (canvasRenderingContext.measureText(tentative).width > maxWidth && currentLine.length > 0) {
				lines.push(currentLine);
				currentLine = character;
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
	// 외부 데이터 주입 전 임시 샘플 던전 (개발 중 미리보기용).
	//==============================================================================
	installSampleDefinition() {
		const sampleRooms = [];
		sampleRooms.push(new DungeonRoom(1, DungeonRoomKind.combat, "동굴 입구", "박쥐 한 무리가 매달려 있다.", [2], "encounter_bats"));
		sampleRooms.push(new DungeonRoom(2, DungeonRoomKind.event, "갈림길", "두 갈래 길이 나뉘어 있다.", [3, 4], "fork_choice"));
		sampleRooms.push(new DungeonRoom(3, DungeonRoomKind.treasure, "감춰진 보고", "낡은 궤짝이 놓여 있다.", [5], "hidden_chest"));
		sampleRooms.push(new DungeonRoom(4, DungeonRoomKind.combat, "수호자 방", "거대한 골렘이 길을 막는다.", [5], "encounter_golem"));
		sampleRooms.push(new DungeonRoom(5, DungeonRoomKind.exit, "출구", "바깥으로 통하는 빛이 보인다.", [], ""));

		const sampleRewards = [];
		sampleRewards.push(new DungeonReward("resource", 1, "영석", 50));
		sampleRewards.push(new DungeonReward("card", 12000015, "강타 (카드)", 1));
		sampleRewards.push(new DungeonReward("treasure", 1, "검령패 (보유물품)", 1));

		const sampleDefinition = new DungeonDefinition(
			1,
			"검종 후산 동굴",
			"사람 발길이 끊긴 후산의 동굴. 무언가 숨겨져 있다는 풍문이 있다.",
			1,
			sampleRooms,
			sampleRewards,
		);
		this.setDefinition(sampleDefinition);
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
export { DungeonRoomKind, DungeonOutcomeKind, DungeonActionKey, DungeonRoom, DungeonDefinition, DungeonReward };

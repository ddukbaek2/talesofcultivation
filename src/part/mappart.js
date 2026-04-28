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
const NODE_LIST_WIDTH_RATIO = 0.36;
const NODE_LIST_ROW_HEIGHT = 64;
const NODE_LIST_ROW_GAP = 8;
const NODE_LIST_INNER_PADDING = 16;
const ACTIVITY_BUTTON_HEIGHT = 48;
const ACTIVITY_BUTTON_GAP = 12;
const DETAIL_INNER_PADDING = 20;


//==============================================================================
// 맵 노드 활동 종류.
//==============================================================================
const MapActivityKey = System.Object.freeze({
	move: "move",
	cultivate: "cultivate",
	growth: "growth",
	event: "event",
	dialogue: "dialogue",
	battle: "battle",
});


//==============================================================================
// 맵 노드 단일 활동 정의 (활동 버튼 1개에 대응).
//==============================================================================
class MapActivity extends Object {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @type { string } */ key;
	/** @type { string } */ label;
	/** @type { string } */ description;

	//==============================================================================
	// 생성.
	//==============================================================================
	constructor(key, label, description) {
		super();
		this.key = key;
		this.label = label;
		this.description = description;
	}
}


//==============================================================================
// 맵 노드 (지점) 정의. 외부 데이터 (maptable.json 예정) 로 주입될 수 있다.
//==============================================================================
class MapNode extends Object {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @type { number } */ id;
	/** @type { string } */ name;
	/** @type { string } */ region;
	/** @type { string } */ description;
	/** @type { boolean } */ isLocked;
	/** @type { string } */ lockReason;
	/** @type { MapActivity[] } */ activities;

	//==============================================================================
	// 생성.
	//==============================================================================
	constructor(id, name, region, description, isLocked, lockReason, activities) {
		super();
		this.id = id;
		this.name = name;
		this.region = region;
		this.description = description;
		this.isLocked = isLocked;
		this.lockReason = lockReason;
		this.activities = activities;
	}
}


//==============================================================================
// 맵 노드 행 hit-test 영역.
//==============================================================================
class MapNodeRowLayout extends Object {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @type { MapNode } */ node;
	/** @type { number } */ x;
	/** @type { number } */ y;
	/** @type { number } */ width;
	/** @type { number } */ height;

	//==============================================================================
	// 생성.
	//==============================================================================
	constructor(node, x, y, width, height) {
		super();
		this.node = node;
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
	}
}


//==============================================================================
// 활동 버튼 hit-test 영역.
//==============================================================================
class MapActivityButtonLayout extends Object {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @type { MapActivity } */ activity;
	/** @type { number } */ x;
	/** @type { number } */ y;
	/** @type { number } */ width;
	/** @type { number } */ height;

	//==============================================================================
	// 생성.
	//==============================================================================
	constructor(activity, x, y, width, height) {
		super();
		this.activity = activity;
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
	}
}


//==============================================================================
// 맵 파트.
// - 좌측: 표시 가능한 맵 노드 목록 (잠긴 노드는 회색 + 잠금 사유).
// - 우측: 선택된 노드의 상세 + 활동 버튼 (이동 / 수련 / 성장 / 이벤트 / 대사 / 전투).
// - 활동 선택은 외부 onActivitySelected 콜백으로 위임 (메인 매니저가 파트 전환 처리).
//==============================================================================
export class MapPart extends Object {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @private @type { MapNode[] } */ #nodes;
	/** @private @type { number } */ #currentNodeId;
	/** @private @type { number } */ #selectedNodeId;
	/** @private @type { MapNodeRowLayout[] } */ #nodeRowLayouts;
	/** @private @type { MapActivityButtonLayout[] } */ #activityButtonLayouts;
	/** @private @type { boolean } */ #wasTouchPressed;
	/** @private @type { ((MapNode, MapActivity) => void) | null } */ #onActivitySelected;
	/** @private @type { string } */ #playerName;
	/** @private @type { string } */ #playerStageName;
	/** @private @type { number } */ #daysPassed;
	/** @private @type { AudioBeepPlayer | null } */ #audioBeepPlayer;

	//==============================================================================
	// 생성.
	//==============================================================================
	constructor() {
		super();
		this.#nodes = [];
		this.#currentNodeId = 0;
		this.#selectedNodeId = 0;
		this.#nodeRowLayouts = [];
		this.#activityButtonLayouts = [];
		this.#wasTouchPressed = false;
		this.#onActivitySelected = null;
		this.#playerName = "";
		this.#playerStageName = "";
		this.#daysPassed = 0;
		this.#audioBeepPlayer = null;
		this.installSampleNodes();
	}

	//==============================================================================
	// 데이터 / 콜백 / 상태 주입.
	//==============================================================================
	/**
	 * @param { MapNode[] } nodes
	 */
	setNodes(nodes) {
		this.#nodes = System.Array.isArray(nodes) ? nodes : [];
		if (this.#nodes.length > 0 && this.findNodeById(this.#selectedNodeId) === null) {
			this.#selectedNodeId = this.#nodes[0].id;
		}
	}

	/**
	 * @param { number } nodeId
	 */
	setCurrentNodeId(nodeId) {
		this.#currentNodeId = nodeId;
		if (this.findNodeById(this.#selectedNodeId) === null) {
			this.#selectedNodeId = nodeId;
		}
	}

	/**
	 * @param { string } playerName
	 * @param { string } playerStageName
	 */
	setPlayerLabel(playerName, playerStageName) {
		this.#playerName = playerName;
		this.#playerStageName = playerStageName;
	}

	/**
	 * @param { number } daysPassed
	 */
	setDaysPassed(daysPassed) {
		this.#daysPassed = daysPassed;
	}

	/**
	 * @param { (node: MapNode, activity: MapActivity) => void } callback
	 */
	setOnActivitySelected(callback) {
		this.#onActivitySelected = callback;
	}

	//==============================================================================
	// 활성화 시 초기 상태 (선택 / 입력 누름 상태) 리셋.
	//==============================================================================
	reset() {
		this.#wasTouchPressed = false;
		if (this.findNodeById(this.#selectedNodeId) === null && this.#nodes.length > 0) {
			this.#selectedNodeId = this.#nodes[0].id;
		}
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
	}

	//==============================================================================
	// 클릭 처리. 노드 행 hit → 선택 변경. 활동 버튼 hit → 콜백 호출.
	//==============================================================================
	/**
	 * @param { { x: number, y: number } } viewInputPosition
	 */
	handleClick(viewInputPosition) {
		for (const rowLayout of this.#nodeRowLayouts) {
			if (this.isInsideRect(viewInputPosition, rowLayout.x, rowLayout.y, rowLayout.width, rowLayout.height)) {
				if (rowLayout.node.isLocked) {
					return;
				}
				this.#selectedNodeId = rowLayout.node.id;
				const clickAudioBeepPlayer = this.getAudioBeepPlayer();
				if (clickAudioBeepPlayer) {
					clickAudioBeepPlayer.playClick();
				}
				return;
			}
		}
		for (const buttonLayout of this.#activityButtonLayouts) {
			if (this.isInsideRect(viewInputPosition, buttonLayout.x, buttonLayout.y, buttonLayout.width, buttonLayout.height)) {
				const confirmAudioBeepPlayer = this.getAudioBeepPlayer();
				if (confirmAudioBeepPlayer) {
					confirmAudioBeepPlayer.playConfirm();
				}
				const selectedNode = this.findNodeById(this.#selectedNodeId);
				if (selectedNode === null) {
					return;
				}
				if (this.#onActivitySelected) {
					this.#onActivitySelected(selectedNode, buttonLayout.activity);
				}
				if (buttonLayout.activity.key === MapActivityKey.move) {
					this.#currentNodeId = selectedNode.id;
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
		canvasRenderingContext.fillStyle = "#0e1428";
		canvasRenderingContext.fillRect(popupRect.x, popupRect.y, popupRect.width, popupRect.height);

		// 헤더.
		this.drawHeader(canvasRenderingContext, popupRect);

		// 컨텐츠 영역.
		const contentX = popupRect.x + SIDE_MARGIN;
		const contentY = popupRect.y + HEADER_HEIGHT + HEADER_TO_CONTENT_GAP;
		const contentWidth = popupRect.width - SIDE_MARGIN * 2;
		const contentHeight = popupRect.height - HEADER_HEIGHT - HEADER_TO_CONTENT_GAP - FOOTER_HEIGHT - 16;
		const nodeListWidth = System.Math.floor(contentWidth * NODE_LIST_WIDTH_RATIO);
		const nodeDetailX = contentX + nodeListWidth + 20;
		const nodeDetailWidth = contentWidth - nodeListWidth - 20;

		this.drawNodeList(canvasRenderingContext, contentX, contentY, nodeListWidth, contentHeight);
		this.drawNodeDetail(canvasRenderingContext, nodeDetailX, contentY, nodeDetailWidth, contentHeight);

		// 푸터 (안내).
		this.drawFooter(canvasRenderingContext, popupRect);
	}

	//==============================================================================
	// 헤더 (좌측 타이틀 + 우측 플레이어 / 일자).
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
		canvasRenderingContext.fillText("맵", popupRect.x + SIDE_MARGIN, popupRect.y + HEADER_HEIGHT * 0.5);

		const playerLabelParts = [];
		if (this.#playerName.length > 0) {
			playerLabelParts.push(this.#playerName);
		}
		if (this.#playerStageName.length > 0) {
			playerLabelParts.push(`[${this.#playerStageName}]`);
		}
		if (this.#daysPassed > 0) {
			playerLabelParts.push(`${this.#daysPassed}일차`);
		}
		const playerLabel = playerLabelParts.join("  ");
		if (playerLabel.length > 0) {
			canvasRenderingContext.fillStyle = "#ffcc88";
			canvasRenderingContext.font = "16px GyeonggiBatang, sans-serif";
			canvasRenderingContext.textAlign = "right";
			canvasRenderingContext.textBaseline = "middle";
			canvasRenderingContext.fillText(playerLabel, popupRect.x + headerBarWidth - SIDE_MARGIN, popupRect.y + HEADER_HEIGHT * 0.5);
		}
	}

	//==============================================================================
	// 좌측 노드 목록.
	//==============================================================================
	/**
	 * @param { CanvasRenderingContext2D } canvasRenderingContext
	 * @param { number } x
	 * @param { number } y
	 * @param { number } width
	 * @param { number } height
	 */
	drawNodeList(canvasRenderingContext, x, y, width, height) {
		this.#nodeRowLayouts = [];
		canvasRenderingContext.fillStyle = "#16203a";
		canvasRenderingContext.fillRect(x, y, width, height);
		canvasRenderingContext.strokeStyle = "#3a4a6a";
		canvasRenderingContext.lineWidth = 1;
		canvasRenderingContext.strokeRect(x, y, width, height);

		canvasRenderingContext.fillStyle = "#cccccc";
		canvasRenderingContext.font = "13px GyeonggiBatang, sans-serif";
		canvasRenderingContext.textAlign = "left";
		canvasRenderingContext.textBaseline = "top";
		canvasRenderingContext.fillText("지점", x + 12, y + 10);

		const listTopY = y + 48;
		const listInnerWidth = width - NODE_LIST_INNER_PADDING * 2;
		for (let nodeIndex = 0; nodeIndex < this.#nodes.length; ++nodeIndex) {
			const node = this.#nodes[nodeIndex];
			const rowX = x + 8;
			const rowY = listTopY + nodeIndex * (NODE_LIST_ROW_HEIGHT + NODE_LIST_ROW_GAP);
			if (rowY + NODE_LIST_ROW_HEIGHT > y + height - 4) {
				break;
			}
			this.drawNodeRow(canvasRenderingContext, node, rowX, rowY, listInnerWidth, NODE_LIST_ROW_HEIGHT);
			this.#nodeRowLayouts.push(new MapNodeRowLayout(node, rowX, rowY, listInnerWidth, NODE_LIST_ROW_HEIGHT));
		}
	}

	//==============================================================================
	// 단일 노드 행. 잠긴 노드는 회색 + 자물쇠. 선택 / 현재 위치 표시.
	//==============================================================================
	/**
	 * @param { CanvasRenderingContext2D } canvasRenderingContext
	 * @param { MapNode } node
	 * @param { number } x
	 * @param { number } y
	 * @param { number } width
	 * @param { number } height
	 */
	drawNodeRow(canvasRenderingContext, node, x, y, width, height) {
		const isSelected = node.id === this.#selectedNodeId;
		const isCurrent = node.id === this.#currentNodeId;
		let backgroundColor = "#1f2a48";
		if (node.isLocked) {
			backgroundColor = "#16182a";
		}
		else if (isSelected) {
			backgroundColor = "#2c3a66";
		}
		canvasRenderingContext.fillStyle = backgroundColor;
		canvasRenderingContext.fillRect(x, y, width, height);
		canvasRenderingContext.strokeStyle = isSelected ? "#d4b46a" : "#3a4a6a";
		canvasRenderingContext.lineWidth = isSelected ? 2 : 1;
		canvasRenderingContext.strokeRect(x, y, width, height);

		const titleColor = node.isLocked ? "#666677" : (isSelected ? "#ffffff" : "#dddddd");
		canvasRenderingContext.fillStyle = titleColor;
		canvasRenderingContext.font = "bold 15px GyeonggiBatangBold, sans-serif";
		canvasRenderingContext.textAlign = "left";
		canvasRenderingContext.textBaseline = "top";
		canvasRenderingContext.fillText(node.name, x + 12, y + 8);

		const subColor = node.isLocked ? "#555566" : "#aaaabb";
		canvasRenderingContext.fillStyle = subColor;
		canvasRenderingContext.font = "12px GyeonggiBatang, sans-serif";
		const subLine = node.isLocked && node.lockReason.length > 0 ? `🔒 ${node.lockReason}` : node.region;
		canvasRenderingContext.fillText(subLine, x + 12, y + 30);

		if (isCurrent) {
			canvasRenderingContext.fillStyle = "#d4b46a";
			canvasRenderingContext.font = "bold 11px GyeonggiBatangBold, sans-serif";
			canvasRenderingContext.textAlign = "right";
			canvasRenderingContext.textBaseline = "top";
			canvasRenderingContext.fillText("현재 위치", x + width - 10, y + 8);
		}
	}

	//==============================================================================
	// 우측 노드 상세 + 활동 버튼.
	//==============================================================================
	/**
	 * @param { CanvasRenderingContext2D } canvasRenderingContext
	 * @param { number } x
	 * @param { number } y
	 * @param { number } width
	 * @param { number } height
	 */
	drawNodeDetail(canvasRenderingContext, x, y, width, height) {
		this.#activityButtonLayouts = [];
		canvasRenderingContext.fillStyle = "#16203a";
		canvasRenderingContext.fillRect(x, y, width, height);
		canvasRenderingContext.strokeStyle = "#3a4a6a";
		canvasRenderingContext.lineWidth = 1;
		canvasRenderingContext.strokeRect(x, y, width, height);

		const selectedNode = this.findNodeById(this.#selectedNodeId);
		if (selectedNode === null) {
			canvasRenderingContext.fillStyle = "#888899";
			canvasRenderingContext.font = "16px GyeonggiBatang, sans-serif";
			canvasRenderingContext.textAlign = "center";
			canvasRenderingContext.textBaseline = "middle";
			canvasRenderingContext.fillText("선택된 지점이 없다.", x + width * 0.5, y + height * 0.5);
			return;
		}

		// 노드 이름 / 지역.
		canvasRenderingContext.fillStyle = "#ffffff";
		canvasRenderingContext.font = "bold 20px GyeonggiBatangBold, sans-serif";
		canvasRenderingContext.textAlign = "left";
		canvasRenderingContext.textBaseline = "top";
		canvasRenderingContext.fillText(selectedNode.name, x + 16, y + 12);

		canvasRenderingContext.fillStyle = "#ffcc88";
		canvasRenderingContext.font = "13px GyeonggiBatang, sans-serif";
		canvasRenderingContext.fillText(selectedNode.region, x + 16, y + 38);

		// 노드 설명 (자동 줄바꿈).
		canvasRenderingContext.fillStyle = "#dddddd";
		canvasRenderingContext.font = "14px GyeonggiBatang, sans-serif";
		const descriptionMaxWidth = width - 32;
		const descriptionLines = this.wrapTextByWidth(canvasRenderingContext, selectedNode.description, descriptionMaxWidth);
		const descriptionLineHeight = 20;
		const descriptionTopY = y + 70;
		for (let lineIndex = 0; lineIndex < descriptionLines.length; ++lineIndex) {
			canvasRenderingContext.fillText(descriptionLines[lineIndex], x + 16, descriptionTopY + lineIndex * descriptionLineHeight);
		}

		// 잠겨 있으면 사유 표기 후 활동 버튼 미출력.
		if (selectedNode.isLocked) {
			canvasRenderingContext.fillStyle = "#aa6666";
			canvasRenderingContext.font = "bold 14px GyeonggiBatangBold, sans-serif";
			canvasRenderingContext.fillText(`🔒 ${selectedNode.lockReason}`, x + 16, descriptionTopY + descriptionLines.length * descriptionLineHeight + 16);
			return;
		}

		// 활동 버튼 (하단 정렬).
		const buttonsTotalHeight = selectedNode.activities.length * ACTIVITY_BUTTON_HEIGHT + (selectedNode.activities.length - 1) * ACTIVITY_BUTTON_GAP;
		const buttonsTopY = y + height - buttonsTotalHeight - 16;
		const buttonInsetX = x + 16;
		const buttonWidth = width - 32;
		for (let activityIndex = 0; activityIndex < selectedNode.activities.length; ++activityIndex) {
			const activity = selectedNode.activities[activityIndex];
			const buttonY = buttonsTopY + activityIndex * (ACTIVITY_BUTTON_HEIGHT + ACTIVITY_BUTTON_GAP);
			this.drawActivityButton(canvasRenderingContext, activity, buttonInsetX, buttonY, buttonWidth, ACTIVITY_BUTTON_HEIGHT);
			this.#activityButtonLayouts.push(new MapActivityButtonLayout(activity, buttonInsetX, buttonY, buttonWidth, ACTIVITY_BUTTON_HEIGHT));
		}
	}

	//==============================================================================
	// 단일 활동 버튼.
	//==============================================================================
	/**
	 * @param { CanvasRenderingContext2D } canvasRenderingContext
	 * @param { MapActivity } activity
	 * @param { number } x
	 * @param { number } y
	 * @param { number } width
	 * @param { number } height
	 */
	drawActivityButton(canvasRenderingContext, activity, x, y, width, height) {
		const fillColor = this.activityFillColor(activity.key);
		canvasRenderingContext.fillStyle = fillColor;
		canvasRenderingContext.fillRect(x, y, width, height);
		canvasRenderingContext.strokeStyle = "#ffffff";
		canvasRenderingContext.lineWidth = 1;
		canvasRenderingContext.strokeRect(x, y, width, height);

		canvasRenderingContext.fillStyle = "#ffffff";
		canvasRenderingContext.font = "bold 16px GyeonggiBatangBold, sans-serif";
		canvasRenderingContext.textAlign = "left";
		canvasRenderingContext.textBaseline = "middle";
		canvasRenderingContext.fillText(activity.label, x + 14, y + height * 0.5);

		canvasRenderingContext.fillStyle = "#dddddd";
		canvasRenderingContext.font = "12px GyeonggiBatang, sans-serif";
		canvasRenderingContext.textAlign = "right";
		canvasRenderingContext.textBaseline = "middle";
		canvasRenderingContext.fillText(activity.description, x + width - 14, y + height * 0.5);
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
		canvasRenderingContext.fillStyle = "#1a2240";
		canvasRenderingContext.fillRect(popupRect.x, footerY, popupRect.width, FOOTER_HEIGHT);
		canvasRenderingContext.fillStyle = "#aaaabb";
		canvasRenderingContext.font = "12px GyeonggiBatang, sans-serif";
		canvasRenderingContext.textAlign = "center";
		canvasRenderingContext.textBaseline = "middle";
		canvasRenderingContext.fillText("좌측 목록에서 지점을 선택한 뒤 우측 활동 버튼을 누른다.", popupRect.x + popupRect.width * 0.5, footerY + FOOTER_HEIGHT * 0.5);
	}

	//==============================================================================
	// 노드 활동 종류별 색상.
	//==============================================================================
	/**
	 * @param { string } activityKey
	 * @returns { string }
	 */
	activityFillColor(activityKey) {
		switch (activityKey) {
			case MapActivityKey.move: {
				return "#3a5a99";
			}
			case MapActivityKey.cultivate: {
				return "#5a3a99";
			}
			case MapActivityKey.growth: {
				return "#3a7755";
			}
			case MapActivityKey.event: {
				return "#996644";
			}
			case MapActivityKey.dialogue: {
				return "#664488";
			}
			case MapActivityKey.battle: {
				return "#993344";
			}
			default: {
				return "#444466";
			}
		}
	}

	//==============================================================================
	// id 로 노드 검색.
	//==============================================================================
	/**
	 * @param { number } nodeId
	 * @returns { MapNode | null }
	 */
	findNodeById(nodeId) {
		for (const node of this.#nodes) {
			if (node.id === nodeId) {
				return node;
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
	// 외부 데이터 주입 전 임시 샘플 노드 (개발 중 미리보기용).
	//==============================================================================
	installSampleNodes() {
		const sampleNodes = [];
		sampleNodes.push(new MapNode(
			1, "검종 산문 앞", "검종",
			"입문 시험을 치르는 곳. 거대한 산문이 우뚝 서 있다.",
			false, "",
			[
				new MapActivity(MapActivityKey.dialogue, "대화", "장로와 이야기"),
				new MapActivity(MapActivityKey.battle, "전투", "입문 시험"),
			],
		));
		sampleNodes.push(new MapNode(
			2, "검종 본전", "검종",
			"종파의 중심. 상점·대장간·도장이 모여 있다.",
			false, "",
			[
				new MapActivity(MapActivityKey.move, "이동", "이 지점으로 이동"),
				new MapActivity(MapActivityKey.growth, "성장", "장비 / 덱 정비"),
				new MapActivity(MapActivityKey.cultivate, "수련", "기초 수련"),
			],
		));
		sampleNodes.push(new MapNode(
			3, "검종 후산 동굴", "검종",
			"사람 발길이 끊긴 곳. 무언가 숨겨져 있다는 풍문이 있다.",
			true, "검종 장로 격파 후 진입 가능",
			[
				new MapActivity(MapActivityKey.move, "이동", "이 지점으로 이동"),
				new MapActivity(MapActivityKey.event, "이벤트", "동굴 탐색"),
			],
		));
		sampleNodes.push(new MapNode(
			4, "강호 시장", "강호",
			"여러 종파의 수사들이 오가는 떠들썩한 시장.",
			true, "검종 본전을 먼저 방문할 것",
			[
				new MapActivity(MapActivityKey.move, "이동", "이 지점으로 이동"),
				new MapActivity(MapActivityKey.growth, "성장", "특수 보유물품 거래"),
			],
		));
		this.setNodes(sampleNodes);
		this.setCurrentNodeId(1);
		this.#selectedNodeId = 1;
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
// 외부에서 활동 종류를 참조할 수 있도록 재공개.
//==============================================================================
export { MapActivityKey, MapActivity, MapNode };

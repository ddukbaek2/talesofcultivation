//==============================================================================
// 포함 모듈 목록.
//==============================================================================
const System = globalThis;
import { WorldNode } from "../../libs/vanilla.js/src/core/node/worldnode.js";
import { Object } from "../../libs/vanilla.js/src/base/object.js";
import { AudioBeepPlayer } from "../base/audiobeepplayer.js";
import { drawInputHintBadge, isActionPressed, InputAction } from "../base/inputhint.js";
import { branchTable } from "../table/branchtabledata.js";


//==============================================================================
// 상수.
//==============================================================================
const SIDE_MARGIN = 32;
const HEADER_HEIGHT = 64;
const HEADER_TO_CONTENT_GAP = 20;
const FOOTER_HEIGHT = 48;
const SCENE_NODE_WIDTH = 160;
const SCENE_NODE_HEIGHT = 120;
const SCENE_PORTRAIT_RADIUS = 26;
const DETAIL_INNER_PADDING = 20;
const SCENE_CELL_SPACING_X = 240;
const SCENE_CELL_SPACING_Y = 180;
const SCENE_CELL_PADDING = 32;
const SCROLL_BAR_WIDTH = 8;
const SCROLL_KEYBOARD_SPEED = 320;


//==============================================================================
// 분기 씬 진행 상태.
//==============================================================================
const StorySceneStatus = System.Object.freeze({
	unvisited: "unvisited",
	visited: "visited",
	current: "current",
});


//==============================================================================
// 단일 분기 씬 노드 (포트레이트 + 메타).
// row / column 으로 격자 배치 좌표를 결정.
//==============================================================================
class StoryScene extends Object {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @type { number } */ id;
	/** @type { string } */ name;
	/** @type { string } */ description;
	/** @type { string } */ portraitLabel;
	/** @type { string } */ portraitColor;
	/** @type { number } */ row;
	/** @type { number } */ column;
	/** @type { string } */ status;
	/** @type { number[] } */ nextSceneIds;

	//==============================================================================
	// 생성.
	//==============================================================================
	constructor(id, name, description, portraitLabel, portraitColor, row, column, status, nextSceneIds) {
		super();
		this.id = id;
		this.name = name;
		this.description = description;
		this.portraitLabel = portraitLabel;
		this.portraitColor = portraitColor;
		this.row = row;
		this.column = column;
		this.status = status;
		this.nextSceneIds = System.Array.isArray(nextSceneIds) ? nextSceneIds : [];
	}
}


//==============================================================================
// 노드 출력 시 계산된 화면 좌표.
//==============================================================================
class StorySceneNodeLayout extends Object {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @type { StoryScene } */ scene;
	/** @type { number } */ x;
	/** @type { number } */ y;
	/** @type { number } */ width;
	/** @type { number } */ height;

	//==============================================================================
	// 생성.
	//==============================================================================
	constructor(scene, x, y, width, height) {
		super();
		this.scene = scene;
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
	}
}


//==============================================================================
// 분기점 뷰 파트.
// - 시나리오의 모든 씬을 격자로 나열.
// - 각 노드에 포트레이트(이미지 대체용 색칠 원 + 글자) + 이름 + 상태 표기.
// - 노드 간 연결선 (현 노드의 nextSceneIds 가 가리키는 다음 노드들).
// - 단축키 T 로 토글 — 외부 매니저가 활성/비활성 처리.
//==============================================================================
export class BranchPartNode extends WorldNode {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @private @type { StoryScene[] } */ #scenes;
	/** @private @type { number } */ #selectedSceneId;
	/** @private @type { StorySceneNodeLayout[] } */ #nodeLayouts;
	/** @private @type { boolean } */ #wasTouchPressed;
	/** @private @type { boolean } */ #wasCancelActionPressed;
	/** @private @type { boolean } */ #wasConfirmActionPressed;
	/** @private @type { { x: number, y: number, width: number, height: number } | null } */ #visitButtonRect;
	/** @private @type { (() => void) | null } */ #onClose;
	/** @private @type { ((StoryScene) => void) | null } */ #onSceneVisited;
	/** @private @type { number } */ #scrollX;
	/** @private @type { number } */ #scrollY;
	/** @private @type { number } */ #lastScrollMaxX;
	/** @private @type { number } */ #lastScrollMaxY;
	/** @private @type { number } */ #lastGraphAreaWidth;
	/** @private @type { number } */ #lastGraphAreaHeight;
	/** @private @type { number } */ #lastGraphContentWidth;
	/** @private @type { number } */ #lastGraphContentHeight;
	/** @private @type { { x: number, y: number } | null } */ #dragLastPosition;
	/** @private @type { number } */ #pendingWheelDeltaY;
	/** @private @type { AudioBeepPlayer | null } */ #audioBeepPlayer;
	/** @private @type { InputManager | null } */ #inputManager;
	/** @private @type { { x: number, y: number, width: number, height: number } | null } */ #popupRect;

	//==============================================================================
	// 생성.
	//==============================================================================
	constructor() {
		super();
		this.#scenes = [];
		this.#selectedSceneId = 0;
		this.#nodeLayouts = [];
		this.#wasTouchPressed = false;
		this.#wasCancelActionPressed = false;
		this.#wasConfirmActionPressed = false;
		this.#visitButtonRect = null;
		this.#onClose = null;
		this.#onSceneVisited = null;
		this.#scrollX = 0;
		this.#scrollY = 0;
		this.#lastScrollMaxX = 0;
		this.#lastScrollMaxY = 0;
		this.#lastGraphAreaWidth = 0;
		this.#lastGraphAreaHeight = 0;
		this.#lastGraphContentWidth = 0;
		this.#lastGraphContentHeight = 0;
		this.#dragLastPosition = null;
		this.#pendingWheelDeltaY = 0;
		this.#audioBeepPlayer = null;
		this.#inputManager = null;
		this.#popupRect = null;
		this.installSampleScenes();
		// 마우스 휠 입력은 InputManager 가 다루지 않으므로 직접 이벤트를 받아 누적한다.
		// 누적된 양은 다음 tick 에서 scrollY 에 반영.
		if (typeof window !== "undefined") {
			window.addEventListener("wheel", (wheelEvent) => {
				this.#pendingWheelDeltaY += wheelEvent.deltaY;
			}, { passive: true });
		}
	}

	//==============================================================================
	// 데이터 / 콜백 주입.
	//==============================================================================
	/**
	 * @param { StoryScene[] } scenes
	 */
	setScenes(scenes) {
		this.#scenes = System.Array.isArray(scenes) ? scenes : [];
	}

	/**
	 * @param { () => void } callback
	 */
	setOnClose(callback) {
		this.#onClose = callback;
	}

	/**
	 * @param { (scene: StoryScene) => void } callback
	 */
	setOnSceneVisited(callback) {
		this.#onSceneVisited = callback;
	}

	//==============================================================================
	// 입력 컨텍스트 주입 (매 프레임 tick 전에 호출).
	//==============================================================================
	/**
	 * @param { InputManager | null } inputManager
	 * @param { { x: number, y: number, width: number, height: number } | null } popupRect
	 */
	setInputContext(inputManager, popupRect) {
		this.#inputManager = inputManager;
		this.#popupRect = popupRect;
	}

	//==============================================================================
	// 활성화 시 입력 누름 상태 리셋.
	//==============================================================================
	reset() {
		this.#wasTouchPressed = false;
		this.#wasCancelActionPressed = false;
		this.#wasConfirmActionPressed = false;
	}

	//==============================================================================
	// 갱신.
	//==============================================================================
	/**
	 * @override
	 * @param { number } timeDelta
	 */
	tick(timeDelta) {
		if (!this.isActive()) {
			return;
		}
		const inputManager = this.#inputManager;
		const popupRect = this.#popupRect;
		if (!inputManager || !popupRect) {
			return;
		}
		const isPressed = inputManager.isTouchPressed();
		const isMoving = inputManager.isTouchMoved();
		const viewInputPosition = inputManager.getViewInputPosition();

		// 누르는 동안 위치 추적 (드래그 스크롤).
		// 주의: isTouchPressed 는 mousedown 한 프레임만 true. 드래그 유지 판정은 isTouchMoved 로 한다.
		if (isPressed && !this.#wasTouchPressed) {
			this.handleClick(viewInputPosition);
			this.#dragLastPosition = { x: viewInputPosition.x, y: viewInputPosition.y };
		}
		else if (isMoving && this.#dragLastPosition !== null) {
			const dragDeltaX = viewInputPosition.x - this.#dragLastPosition.x;
			const dragDeltaY = viewInputPosition.y - this.#dragLastPosition.y;
			this.#scrollX -= dragDeltaX;
			this.#scrollY -= dragDeltaY;
			this.#dragLastPosition = { x: viewInputPosition.x, y: viewInputPosition.y };
		}
		else if (!isMoving) {
			this.#dragLastPosition = null;
		}
		this.#wasTouchPressed = isPressed;

		// 마우스 휠 누적분을 적용.
		if (this.#pendingWheelDeltaY !== 0) {
			this.#scrollY += this.#pendingWheelDeltaY;
			this.#pendingWheelDeltaY = 0;
		}

		// 키보드 방향키로 스크롤.
		if (inputManager.isKeyPressed("ArrowUp")) {
			this.#scrollY -= SCROLL_KEYBOARD_SPEED * timeDelta;
		}
		if (inputManager.isKeyPressed("ArrowDown")) {
			this.#scrollY += SCROLL_KEYBOARD_SPEED * timeDelta;
		}
		if (inputManager.isKeyPressed("ArrowLeft")) {
			this.#scrollX -= SCROLL_KEYBOARD_SPEED * timeDelta;
		}
		if (inputManager.isKeyPressed("ArrowRight")) {
			this.#scrollX += SCROLL_KEYBOARD_SPEED * timeDelta;
		}

		// 스크롤 범위 클램프.
		if (this.#scrollX < 0) {
			this.#scrollX = 0;
		}
		if (this.#scrollX > this.#lastScrollMaxX) {
			this.#scrollX = this.#lastScrollMaxX;
		}
		if (this.#scrollY < 0) {
			this.#scrollY = 0;
		}
		if (this.#scrollY > this.#lastScrollMaxY) {
			this.#scrollY = this.#lastScrollMaxY;
		}

		const isCancelActive = isActionPressed(inputManager, InputAction.cancel);
		if (isCancelActive && !this.#wasCancelActionPressed && this.#onClose) {
			this.#onClose();
		}
		this.#wasCancelActionPressed = isCancelActive;
		// confirm 액션 = 선택 씬으로 이동 (방문 가능한 경우만).
		const isConfirmActive = isActionPressed(inputManager, InputAction.confirm);
		if (isConfirmActive && !this.#wasConfirmActionPressed) {
			this.tryVisitSelectedScene();
		}
		this.#wasConfirmActionPressed = isConfirmActive;
	}

	//==============================================================================
	// 현재 선택된 씬으로 "이동" — 잠긴 씬은 무시.
	//==============================================================================
	tryVisitSelectedScene() {
		const selectedScene = this.findSceneById(this.#selectedSceneId);
		if (selectedScene === null) {
			return;
		}
		if (selectedScene.status === StorySceneStatus.current) {
			return;
		}
		const visitAudioBeepPlayer = this.getAudioBeepPlayer();
		if (visitAudioBeepPlayer) {
			visitAudioBeepPlayer.playConfirm();
		}
		if (this.#onSceneVisited) {
			this.#onSceneVisited(selectedScene);
		}
	}

	//==============================================================================
	// 클릭 처리. 노드 hit → 선택.
	//==============================================================================
	/**
	 * @param { { x: number, y: number } } viewInputPosition
	 */
	handleClick(viewInputPosition) {
		// 이동 버튼.
		if (this.#visitButtonRect && this.isInsideRect(viewInputPosition, this.#visitButtonRect.x, this.#visitButtonRect.y, this.#visitButtonRect.width, this.#visitButtonRect.height)) {
			this.tryVisitSelectedScene();
			return;
		}
		for (const nodeLayout of this.#nodeLayouts) {
			if (this.isInsideRect(viewInputPosition, nodeLayout.x, nodeLayout.y, nodeLayout.width, nodeLayout.height)) {
				this.#selectedSceneId = nodeLayout.scene.id;
				const clickAudioBeepPlayer = this.getAudioBeepPlayer();
				if (clickAudioBeepPlayer) {
					clickAudioBeepPlayer.playClick();
				}
				return;
			}
		}
	}

	//==============================================================================
	// 출력.
	//==============================================================================
	/**
	 * @override
	 * @param { Graphic } graphic
	 */
	draw(graphic) {
		if (!this.isActive()) {
			return;
		}
		const popupRect = this.#popupRect;
		if (!popupRect) {
			return;
		}
		const canvasRenderingContext = graphic.getCanvasRenderingContext();

		canvasRenderingContext.fillStyle = "#0a0e1c";
		canvasRenderingContext.fillRect(popupRect.x, popupRect.y, popupRect.width, popupRect.height);

		this.drawHeader(canvasRenderingContext, popupRect);
		this.drawFooterProgress(canvasRenderingContext, popupRect);

		// 컨텐츠 영역 (그래프 + 우측 상세).
		const contentX = popupRect.x + SIDE_MARGIN;
		const contentY = popupRect.y + HEADER_HEIGHT + HEADER_TO_CONTENT_GAP;
		const contentWidth = popupRect.width - SIDE_MARGIN * 2;
		const contentHeight = popupRect.height - (contentY - popupRect.y) - FOOTER_HEIGHT - 8;
		const detailWidth = 300;
		const graphAreaWidth = contentWidth - detailWidth - 20;

		this.drawSceneGraph(canvasRenderingContext, contentX, contentY, graphAreaWidth, contentHeight);
		this.drawSceneDetail(canvasRenderingContext, contentX + graphAreaWidth + 20, contentY, detailWidth, contentHeight);
	}

	//==============================================================================
	// 헤더.
	//==============================================================================
	/**
	 * @param { CanvasRenderingContext2D } canvasRenderingContext
	 * @param { { x: number, y: number, width: number, height: number } } popupRect
	 */
	drawHeader(canvasRenderingContext, popupRect) {
		canvasRenderingContext.fillStyle = "#1a2240";
		canvasRenderingContext.fillRect(popupRect.x, popupRect.y, popupRect.width, HEADER_HEIGHT);
		canvasRenderingContext.strokeStyle = "#d4b46a";
		canvasRenderingContext.lineWidth = 1;
		canvasRenderingContext.beginPath();
		canvasRenderingContext.moveTo(popupRect.x, popupRect.y + HEADER_HEIGHT);
		canvasRenderingContext.lineTo(popupRect.x + popupRect.width, popupRect.y + HEADER_HEIGHT);
		canvasRenderingContext.stroke();

		canvasRenderingContext.fillStyle = "#ffffff";
		canvasRenderingContext.font = "bold 22px GyeonggiBatangBold, sans-serif";
		canvasRenderingContext.textAlign = "left";
		canvasRenderingContext.textBaseline = "middle";
		canvasRenderingContext.fillText("분기점", popupRect.x + SIDE_MARGIN, popupRect.y + HEADER_HEIGHT * 0.5);
	}

	//==============================================================================
	// 하단 진척도 바.
	//==============================================================================
	/**
	 * @param { CanvasRenderingContext2D } canvasRenderingContext
	 * @param { { x: number, y: number, width: number, height: number } } popupRect
	 */
	drawFooterProgress(canvasRenderingContext, popupRect) {
		let visitedCount = 0;
		for (const scene of this.#scenes) {
			if (scene.status === StorySceneStatus.visited || scene.status === StorySceneStatus.current) {
				++visitedCount;
			}
		}
		const footerY = popupRect.y + popupRect.height - FOOTER_HEIGHT;
		canvasRenderingContext.fillStyle = "#1a2240";
		canvasRenderingContext.fillRect(popupRect.x, footerY, popupRect.width, FOOTER_HEIGHT);
		canvasRenderingContext.strokeStyle = "#d4b46a";
		canvasRenderingContext.lineWidth = 1;
		canvasRenderingContext.beginPath();
		canvasRenderingContext.moveTo(popupRect.x, footerY);
		canvasRenderingContext.lineTo(popupRect.x + popupRect.width, footerY);
		canvasRenderingContext.stroke();
		canvasRenderingContext.fillStyle = "#ffcc88";
		canvasRenderingContext.font = "16px GyeonggiBatang, sans-serif";
		canvasRenderingContext.textAlign = "left";
		canvasRenderingContext.textBaseline = "middle";
		canvasRenderingContext.fillText(`경험 ${visitedCount} / ${this.#scenes.length}`, popupRect.x + SIDE_MARGIN, footerY + FOOTER_HEIGHT * 0.5);
	}

	//==============================================================================
	// 씬 그래프 출력 (격자 배치 + 연결선 + 노드).
	//==============================================================================
	/**
	 * @param { CanvasRenderingContext2D } canvasRenderingContext
	 * @param { number } x
	 * @param { number } y
	 * @param { number } width
	 * @param { number } height
	 */
	drawSceneGraph(canvasRenderingContext, x, y, width, height) {
		this.#nodeLayouts = [];
		canvasRenderingContext.fillStyle = "#16203a";
		canvasRenderingContext.fillRect(x, y, width, height);
		canvasRenderingContext.strokeStyle = "#3a4a6a";
		canvasRenderingContext.lineWidth = 1;
		canvasRenderingContext.strokeRect(x, y, width, height);

		// 그래프 영역 클리핑.
		canvasRenderingContext.save();
		canvasRenderingContext.beginPath();
		canvasRenderingContext.rect(x + 1, y + 1, width - 2, height - 2);
		canvasRenderingContext.clip();

		// 컨텐츠 전체 크기 계산.
		let maxRow = 0;
		let maxColumn = 0;
		for (const scene of this.#scenes) {
			if (scene.row > maxRow) {
				maxRow = scene.row;
			}
			if (scene.column > maxColumn) {
				maxColumn = scene.column;
			}
		}
		const totalColumns = maxColumn + 1;
		const totalRows = maxRow + 1;
		const totalContentWidth = (totalColumns - 1) * SCENE_CELL_SPACING_X + SCENE_NODE_WIDTH + SCENE_CELL_PADDING * 2;
		const totalContentHeight = (totalRows - 1) * SCENE_CELL_SPACING_Y + SCENE_NODE_HEIGHT + SCENE_CELL_PADDING * 2;
		this.#lastGraphAreaWidth = width;
		this.#lastGraphAreaHeight = height;
		this.#lastGraphContentWidth = totalContentWidth;
		this.#lastGraphContentHeight = totalContentHeight;
		this.#lastScrollMaxX = System.Math.max(0, totalContentWidth - width);
		this.#lastScrollMaxY = System.Math.max(0, totalContentHeight - height);

		// 컨텐츠가 영역보다 작으면 가운데 정렬, 크면 스크롤 오프셋 적용.
		const offsetX = totalContentWidth < width ? (width - totalContentWidth) * 0.5 : -this.#scrollX;
		const offsetY = totalContentHeight < height ? (height - totalContentHeight) * 0.5 : -this.#scrollY;
		const baseGridX = x + SCENE_CELL_PADDING + offsetX;
		const baseGridY = y + SCENE_CELL_PADDING + offsetY;

		// 노드 중심 좌표 사전 계산.
		const nodeCenterById = new System.Map();
		for (const scene of this.#scenes) {
			const nodeCenterX = baseGridX + scene.column * SCENE_CELL_SPACING_X + SCENE_NODE_WIDTH * 0.5;
			const nodeCenterY = baseGridY + scene.row * SCENE_CELL_SPACING_Y + SCENE_NODE_HEIGHT * 0.5;
			nodeCenterById.set(scene.id, { x: nodeCenterX, y: nodeCenterY });
		}

		// 히스토리 경로 계산 (시작 → 현재 씬).
		const historyPath = this.computeHistoryPath();
		const historySceneIds = historyPath.sceneIds;
		const historyEdgePairs = historyPath.edgePairs;

		// 연결선 1단계: 비-히스토리 간선 (회색, 아래에 그려짐).
		canvasRenderingContext.strokeStyle = "#3a4a6a";
		canvasRenderingContext.lineWidth = 1;
		for (const scene of this.#scenes) {
			const fromCenter = nodeCenterById.get(scene.id);
			if (!fromCenter) {
				continue;
			}
			for (const nextId of scene.nextSceneIds) {
				const edgeKey = `${scene.id}_${nextId}`;
				if (historyEdgePairs.has(edgeKey)) {
					continue;
				}
				const toCenter = nodeCenterById.get(nextId);
				if (!toCenter) {
					continue;
				}
				canvasRenderingContext.beginPath();
				canvasRenderingContext.moveTo(fromCenter.x, fromCenter.y);
				canvasRenderingContext.lineTo(toCenter.x, toCenter.y);
				canvasRenderingContext.stroke();
			}
		}

		// 연결선 2단계: 히스토리 간선 (골드, 위에 그려짐).
		canvasRenderingContext.strokeStyle = "#d4b46a";
		canvasRenderingContext.lineWidth = 3;
		for (const scene of this.#scenes) {
			const fromCenter = nodeCenterById.get(scene.id);
			if (!fromCenter) {
				continue;
			}
			for (const nextId of scene.nextSceneIds) {
				const edgeKey = `${scene.id}_${nextId}`;
				if (!historyEdgePairs.has(edgeKey)) {
					continue;
				}
				const toCenter = nodeCenterById.get(nextId);
				if (!toCenter) {
					continue;
				}
				canvasRenderingContext.beginPath();
				canvasRenderingContext.moveTo(fromCenter.x, fromCenter.y);
				canvasRenderingContext.lineTo(toCenter.x, toCenter.y);
				canvasRenderingContext.stroke();
			}
		}

		// 노드 출력.
		for (const scene of this.#scenes) {
			const nodeCenter = nodeCenterById.get(scene.id);
			if (!nodeCenter) {
				continue;
			}
			const nodeX = nodeCenter.x - SCENE_NODE_WIDTH * 0.5;
			const nodeY = nodeCenter.y - SCENE_NODE_HEIGHT * 0.5;
			const isOnHistoryPath = historySceneIds.has(scene.id);
			this.drawSceneNode(canvasRenderingContext, scene, nodeX, nodeY, SCENE_NODE_WIDTH, SCENE_NODE_HEIGHT, isOnHistoryPath);
			this.#nodeLayouts.push(new StorySceneNodeLayout(scene, nodeX, nodeY, SCENE_NODE_WIDTH, SCENE_NODE_HEIGHT));
		}

		canvasRenderingContext.restore();

		// 세로 스크롤바 (우측 가장자리).
		if (this.#lastScrollMaxY > 0) {
			const scrollTrackX = x + width - SCROLL_BAR_WIDTH - 4;
			const scrollTrackY = y + 4;
			const scrollTrackHeight = height - 8;
			canvasRenderingContext.fillStyle = "#1a1a2e";
			canvasRenderingContext.fillRect(scrollTrackX, scrollTrackY, SCROLL_BAR_WIDTH, scrollTrackHeight);
			canvasRenderingContext.strokeStyle = "#3a3a5a";
			canvasRenderingContext.lineWidth = 1;
			canvasRenderingContext.strokeRect(scrollTrackX, scrollTrackY, SCROLL_BAR_WIDTH, scrollTrackHeight);
			const thumbHeight = System.Math.max(28, scrollTrackHeight * (this.#lastGraphAreaHeight / this.#lastGraphContentHeight));
			const thumbY = scrollTrackY + (this.#scrollY / this.#lastScrollMaxY) * (scrollTrackHeight - thumbHeight);
			canvasRenderingContext.fillStyle = "#d4b46a";
			canvasRenderingContext.fillRect(scrollTrackX, thumbY, SCROLL_BAR_WIDTH, thumbHeight);
		}

		// 가로 스크롤바 (하단 가장자리).
		if (this.#lastScrollMaxX > 0) {
			const scrollTrackX = x + 4;
			const scrollTrackY = y + height - SCROLL_BAR_WIDTH - 4;
			const scrollTrackWidth = width - 8;
			canvasRenderingContext.fillStyle = "#1a1a2e";
			canvasRenderingContext.fillRect(scrollTrackX, scrollTrackY, scrollTrackWidth, SCROLL_BAR_WIDTH);
			canvasRenderingContext.strokeStyle = "#3a3a5a";
			canvasRenderingContext.lineWidth = 1;
			canvasRenderingContext.strokeRect(scrollTrackX, scrollTrackY, scrollTrackWidth, SCROLL_BAR_WIDTH);
			const thumbWidth = System.Math.max(28, scrollTrackWidth * (this.#lastGraphAreaWidth / this.#lastGraphContentWidth));
			const thumbX = scrollTrackX + (this.#scrollX / this.#lastScrollMaxX) * (scrollTrackWidth - thumbWidth);
			canvasRenderingContext.fillStyle = "#d4b46a";
			canvasRenderingContext.fillRect(thumbX, scrollTrackY, thumbWidth, SCROLL_BAR_WIDTH);
		}
	}

	//==============================================================================
	// 단일 씬 노드 카드.
	//==============================================================================
	/**
	 * @param { CanvasRenderingContext2D } canvasRenderingContext
	 * @param { StoryScene } scene
	 * @param { number } x
	 * @param { number } y
	 * @param { number } width
	 * @param { number } height
	 */
	drawSceneNode(canvasRenderingContext, scene, x, y, width, height, isOnHistoryPath) {
		const isUnvisited = scene.status === StorySceneStatus.unvisited;
		const isCurrent = scene.status === StorySceneStatus.current;
		const isSelected = scene.id === this.#selectedSceneId;

		// 배경.
		let backgroundColor = "#14182a";
		if (isOnHistoryPath && !isCurrent) {
			backgroundColor = "#1a2a40";
		}
		if (isCurrent) {
			backgroundColor = "#2a1840";
		}
		canvasRenderingContext.fillStyle = backgroundColor;
		canvasRenderingContext.fillRect(x, y, width, height);

		// 외곽선.
		let borderColor = "#2a3450";
		let borderWidth = 1;
		if (isCurrent) {
			borderColor = "#d4b46a";
			borderWidth = 3;
		}
		else if (isSelected) {
			borderColor = "#aaccff";
			borderWidth = 2;
		}
		else if (isOnHistoryPath) {
			borderColor = "#5a8a5a";
			borderWidth = 2;
		}
		canvasRenderingContext.strokeStyle = borderColor;
		canvasRenderingContext.lineWidth = borderWidth;
		canvasRenderingContext.strokeRect(x, y, width, height);

		// 포트레이트 원.
		const portraitCenterX = x + width * 0.5;
		const portraitCenterY = y + 38;
		canvasRenderingContext.fillStyle = isUnvisited ? "#1e2038" : scene.portraitColor;
		canvasRenderingContext.beginPath();
		canvasRenderingContext.arc(portraitCenterX, portraitCenterY, SCENE_PORTRAIT_RADIUS, 0, System.Math.PI * 2);
		canvasRenderingContext.fill();
		canvasRenderingContext.strokeStyle = isUnvisited ? "#2a2a44" : (isCurrent ? "#d4b46a" : "#ffffff");
		canvasRenderingContext.lineWidth = isCurrent ? 2 : 1.5;
		canvasRenderingContext.stroke();

		// 포트레이트 레이블.
		canvasRenderingContext.fillStyle = isUnvisited ? "#404055" : "#ffffff";
		canvasRenderingContext.font = "bold 18px GyeonggiBatangBold, sans-serif";
		canvasRenderingContext.textAlign = "center";
		canvasRenderingContext.textBaseline = "middle";
		canvasRenderingContext.fillText(scene.portraitLabel, portraitCenterX, portraitCenterY);

		// 씬 이름.
		canvasRenderingContext.fillStyle = isUnvisited ? "#555566" : (isCurrent ? "#ffffff" : "#aaccaa");
		canvasRenderingContext.font = "bold 13px GyeonggiBatangBold, sans-serif";
		canvasRenderingContext.textAlign = "center";
		canvasRenderingContext.textBaseline = "top";
		canvasRenderingContext.fillText(scene.name, x + width * 0.5, y + 76);

		// 현재 위치 표시 (현재 씬만).
		if (isCurrent) {
			canvasRenderingContext.fillStyle = "#d4b46a";
			canvasRenderingContext.font = "11px GyeonggiBatang, sans-serif";
			canvasRenderingContext.textAlign = "center";
			canvasRenderingContext.textBaseline = "bottom";
			canvasRenderingContext.fillText("현재 위치", x + width * 0.5, y + height - 8);
		}
	}

	//==============================================================================
	// 우측 씬 상세 패널.
	//==============================================================================
	/**
	 * @param { CanvasRenderingContext2D } canvasRenderingContext
	 * @param { number } x
	 * @param { number } y
	 * @param { number } width
	 * @param { number } height
	 */
	drawSceneDetail(canvasRenderingContext, x, y, width, height) {
		this.#visitButtonRect = null;
		canvasRenderingContext.fillStyle = "#16203a";
		canvasRenderingContext.fillRect(x, y, width, height);
		canvasRenderingContext.strokeStyle = "#3a4a6a";
		canvasRenderingContext.lineWidth = 1;
		canvasRenderingContext.strokeRect(x, y, width, height);

		const selectedScene = this.findSceneById(this.#selectedSceneId);
		if (selectedScene === null) {
			canvasRenderingContext.fillStyle = "#888899";
			canvasRenderingContext.font = "14px GyeonggiBatang, sans-serif";
			canvasRenderingContext.textAlign = "center";
			canvasRenderingContext.textBaseline = "middle";
			canvasRenderingContext.fillText("씬을 선택하세요.", x + width * 0.5, y + height * 0.5);
			return;
		}

		const isCurrent = selectedScene.status === StorySceneStatus.current;
		const innerX = x + DETAIL_INNER_PADDING;
		const innerY = y + DETAIL_INNER_PADDING;

		canvasRenderingContext.fillStyle = "#ffffff";
		canvasRenderingContext.font = "bold 18px GyeonggiBatangBold, sans-serif";
		canvasRenderingContext.textAlign = "left";
		canvasRenderingContext.textBaseline = "top";
		canvasRenderingContext.fillText(selectedScene.name, innerX, innerY);

		canvasRenderingContext.fillStyle = this.statusLabelColor(selectedScene.status);
		canvasRenderingContext.font = "13px GyeonggiBatang, sans-serif";
		canvasRenderingContext.fillText(this.statusLabel(selectedScene.status), innerX, innerY + 26);

		canvasRenderingContext.fillStyle = "#dddddd";
		canvasRenderingContext.font = "13px GyeonggiBatang, sans-serif";
		const descriptionLines = this.wrapTextByWidth(canvasRenderingContext, selectedScene.description, width - 32);
		const descriptionLineHeight = 19;
		for (let lineIndex = 0; lineIndex < descriptionLines.length; ++lineIndex) {
			canvasRenderingContext.fillText(descriptionLines[lineIndex], innerX, innerY + 56 + lineIndex * descriptionLineHeight);
		}

		// 다음 씬 목록.
		if (selectedScene.nextSceneIds.length > 0) {
			const nextHeaderY = innerY + 56 + descriptionLines.length * descriptionLineHeight + 16;
			canvasRenderingContext.fillStyle = "#ffcc88";
			canvasRenderingContext.font = "13px GyeonggiBatang, sans-serif";
			canvasRenderingContext.fillText("다음 씬", innerX, nextHeaderY);
			canvasRenderingContext.fillStyle = "#dddddd";
			for (let nextIndex = 0; nextIndex < selectedScene.nextSceneIds.length; ++nextIndex) {
				const nextScene = this.findSceneById(selectedScene.nextSceneIds[nextIndex]);
				const nextLabel = nextScene === null ? "???" : nextScene.name;
				canvasRenderingContext.fillText(`· ${nextLabel}`, innerX, nextHeaderY + 22 + nextIndex * 18);
			}
		}

		// 이동 버튼 (하단). 현재 씬이면 비활성.
		const visitButtonHeight = 44;
		const visitButtonX = x + 16;
		const visitButtonY = y + height - visitButtonHeight - 16;
		const visitButtonWidth = width - 32;
		this.#visitButtonRect = isCurrent ? null : { x: visitButtonX, y: visitButtonY, width: visitButtonWidth, height: visitButtonHeight };
		canvasRenderingContext.fillStyle = isCurrent ? "#2a2a40" : "#3a5a99";
		canvasRenderingContext.fillRect(visitButtonX, visitButtonY, visitButtonWidth, visitButtonHeight);
		canvasRenderingContext.strokeStyle = isCurrent ? "#3a3a5a" : "#ffffff";
		canvasRenderingContext.lineWidth = 1;
		canvasRenderingContext.strokeRect(visitButtonX, visitButtonY, visitButtonWidth, visitButtonHeight);
		canvasRenderingContext.fillStyle = isCurrent ? "#555566" : "#ffffff";
		canvasRenderingContext.font = "bold 16px GyeonggiBatangBold, sans-serif";
		canvasRenderingContext.textAlign = "center";
		canvasRenderingContext.textBaseline = "middle";
		canvasRenderingContext.fillText(isCurrent ? "현재 위치" : "이동", visitButtonX + visitButtonWidth * 0.5, visitButtonY + visitButtonHeight * 0.5);
		if (!isCurrent) {
			drawInputHintBadge(canvasRenderingContext, InputAction.confirm, visitButtonX, visitButtonY + visitButtonHeight);
		}
	}

	//==============================================================================
	// 푸터.
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
		canvasRenderingContext.fillText("T 키 / 취소 키로 닫기.", popupRect.x + popupRect.width * 0.5, footerY + FOOTER_HEIGHT * 0.5);
		drawInputHintBadge(canvasRenderingContext, InputAction.cancel, popupRect.x + popupRect.width - SIDE_MARGIN, footerY + FOOTER_HEIGHT * 0.5);
	}

	//==============================================================================
	// 상태 라벨 / 색상.
	//==============================================================================
	/**
	 * @param { string } status
	 * @returns { string }
	 */
	statusLabel(status) {
		switch (status) {
			case StorySceneStatus.unvisited: {
				return "미방문";
			}
			case StorySceneStatus.visited: {
				return "방문함";
			}
			case StorySceneStatus.current: {
				return "현재 위치";
			}
			default: {
				return "";
			}
		}
	}

	/**
	 * @param { string } status
	 * @returns { string }
	 */
	statusLabelColor(status) {
		switch (status) {
			case StorySceneStatus.unvisited: {
				return "#666677";
			}
			case StorySceneStatus.visited: {
				return "#88aa88";
			}
			case StorySceneStatus.current: {
				return "#d4b46a";
			}
			default: {
				return "#888899";
			}
		}
	}

	//==============================================================================
	// id 로 씬 검색.
	//==============================================================================
	/**
	 * @param { number } sceneId
	 * @returns { StoryScene | null }
	 */
	findSceneById(sceneId) {
		for (const scene of this.#scenes) {
			if (scene.id === sceneId) {
				return scene;
			}
		}
		return null;
	}

	//==============================================================================
	// 시작 노드에서 현재 노드까지의 히스토리 경로 계산 (BFS).
	// 방문한 노드(visited / current) 만 경유하며 시작 → 현재 경로를 추적.
	// 반환: { sceneIds: Set<number>, edgePairs: Set<string> }
	//==============================================================================
	computeHistoryPath() {
		const resultSceneIds = new System.Set();
		const resultEdgePairs = new System.Set();
		if (this.#scenes.length === 0) {
			return { sceneIds: resultSceneIds, edgePairs: resultEdgePairs };
		}
		const startSceneId = this.#scenes[0].id;
		let targetSceneId = -1;
		for (const scene of this.#scenes) {
			if (scene.status === StorySceneStatus.current) {
				targetSceneId = scene.id;
				break;
			}
		}
		if (targetSceneId === -1) {
			return { sceneIds: resultSceneIds, edgePairs: resultEdgePairs };
		}
		const parentOf = new System.Map();
		const seen = new System.Set();
		seen.add(startSceneId);
		const queue = [startSceneId];
		let foundTarget = false;
		while (queue.length > 0) {
			const currentId = queue.shift();
			if (currentId === targetSceneId) {
				foundTarget = true;
				break;
			}
			const currentScene = this.findSceneById(currentId);
			if (currentScene === null) {
				continue;
			}
			for (const nextId of currentScene.nextSceneIds) {
				if (seen.has(nextId)) {
					continue;
				}
				const nextScene = this.findSceneById(nextId);
				if (nextScene === null) {
					continue;
				}
				if (nextScene.status !== StorySceneStatus.visited && nextScene.status !== StorySceneStatus.current) {
					continue;
				}
				seen.add(nextId);
				parentOf.set(nextId, currentId);
				queue.push(nextId);
			}
		}
		if (!foundTarget) {
			return { sceneIds: resultSceneIds, edgePairs: resultEdgePairs };
		}
		let traceId = targetSceneId;
		while (traceId !== undefined && traceId !== null) {
			resultSceneIds.add(traceId);
			const parentId = parentOf.get(traceId);
			if (parentId !== undefined) {
				resultEdgePairs.add(`${parentId}_${traceId}`);
			}
			traceId = parentId;
		}
		return { sceneIds: resultSceneIds, edgePairs: resultEdgePairs };
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
	// 한국어 자동 줄바꿈.
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
	// 임시 샘플 분기 데이터.
	//==============================================================================
	installSampleScenes() {
		const scenes = [];
		for (const data of branchTable) {
			scenes.push(new StoryScene(data.id, data.name, data.description, data.portraitLabel, data.portraitColor, data.row, data.column, data.status, data.nextSceneIds));
		}
		this.setScenes(scenes);
		this.#selectedSceneId = 14;
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
export { StorySceneStatus, StoryScene };

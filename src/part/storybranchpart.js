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
	locked: "locked",
	available: "available",
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
export class StoryBranchPart extends Object {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @private @type { StoryScene[] } */ #scenes;
	/** @private @type { number } */ #selectedSceneId;
	/** @private @type { StorySceneNodeLayout[] } */ #nodeLayouts;
	/** @private @type { boolean } */ #wasTouchPressed;
	/** @private @type { boolean } */ #wasCancelActionPressed;
	/** @private @type { boolean } */ #wasConfirmActionPressed;
	/** @private @type { { x: number, y: number, width: number, height: number } | null } */ #closeButtonRect;
	/** @private @type { { x: number, y: number, width: number, height: number } | null } */ #visitButtonRect;
	/** @private @type { (() => void) | null } */ #onClose;
	/** @private @type { ((StoryScene) => void) | null } */ #onSceneVisited;
	/** @private @type { number } */ #scrollY;
	/** @private @type { number } */ #lastScrollMaxY;
	/** @private @type { number } */ #lastGraphAreaHeight;
	/** @private @type { number } */ #lastGraphContentHeight;
	/** @private @type { { x: number, y: number } | null } */ #dragLastPosition;
	/** @private @type { number } */ #pendingWheelDeltaY;
	/** @private @type { AudioBeepPlayer | null } */ #audioBeepPlayer;

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
		this.#closeButtonRect = null;
		this.#visitButtonRect = null;
		this.#onClose = null;
		this.#onSceneVisited = null;
		this.#scrollY = 0;
		this.#lastScrollMaxY = 0;
		this.#lastGraphAreaHeight = 0;
		this.#lastGraphContentHeight = 0;
		this.#dragLastPosition = null;
		this.#pendingWheelDeltaY = 0;
		this.#audioBeepPlayer = null;
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
	 * @param { number } timeDelta
	 * @param { import("../../libs/vanilla.js/src/core/inputmanager.js").InputManager } inputManager
	 * @param { { x: number, y: number, width: number, height: number } } popupRect
	 */
	tick(timeDelta, inputManager, popupRect) {
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
			const dragDeltaY = viewInputPosition.y - this.#dragLastPosition.y;
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

		// 키보드 ↑↓ 로 스크롤.
		if (inputManager.isKeyPressed("ArrowUp")) {
			this.#scrollY -= SCROLL_KEYBOARD_SPEED * timeDelta;
		}
		if (inputManager.isKeyPressed("ArrowDown")) {
			this.#scrollY += SCROLL_KEYBOARD_SPEED * timeDelta;
		}

		// 스크롤 범위 클램프.
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
		if (selectedScene.status === StorySceneStatus.locked) {
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
		// 닫기 버튼.
		if (this.#closeButtonRect && this.isInsideRect(viewInputPosition, this.#closeButtonRect.x, this.#closeButtonRect.y, this.#closeButtonRect.width, this.#closeButtonRect.height)) {
			const closeAudioBeepPlayer = this.getAudioBeepPlayer();
			if (closeAudioBeepPlayer) {
				closeAudioBeepPlayer.playCancel();
			}
			if (this.#onClose) {
				this.#onClose();
			}
			return;
		}
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
	 * @param { import("../../libs/vanilla.js/src/core/graphic.js").Graphic } graphic
	 * @param { { x: number, y: number, width: number, height: number } } popupRect
	 */
	draw(graphic, popupRect) {
		const canvasRenderingContext = graphic.getCanvasRenderingContext();

		canvasRenderingContext.fillStyle = "#0a0e1c";
		canvasRenderingContext.fillRect(popupRect.x, popupRect.y, popupRect.width, popupRect.height);

		this.drawHeader(canvasRenderingContext, popupRect);

		// 컨텐츠 영역 (그래프 + 우측 상세).
		const contentX = popupRect.x + SIDE_MARGIN;
		const contentY = popupRect.y + HEADER_HEIGHT + HEADER_TO_CONTENT_GAP;
		const contentWidth = popupRect.width - SIDE_MARGIN * 2;
		const contentHeight = popupRect.height - (contentY - popupRect.y) - FOOTER_HEIGHT - 16;
		const detailWidth = 300;
		const graphAreaWidth = contentWidth - detailWidth - 20;

		this.drawSceneGraph(canvasRenderingContext, contentX, contentY, graphAreaWidth, contentHeight);
		this.drawSceneDetail(canvasRenderingContext, contentX + graphAreaWidth + 20, contentY, detailWidth, contentHeight);
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

		// 우측: 닫기(X) 버튼 + 진척도 (방문한 씬 수 / 전체).
		// 글로벌 메뉴/입력 아이콘이 우상단(140px) 을 차지하므로 그 안쪽에 배치.
		const closeSize = 32;
		const closeX = popupRect.x + popupRect.width - headerRightInset - SIDE_MARGIN - closeSize;
		const closeY = popupRect.y + (HEADER_HEIGHT - closeSize) * 0.5;
		this.#closeButtonRect = { x: closeX, y: closeY, width: closeSize, height: closeSize };
		canvasRenderingContext.fillStyle = "#993333";
		canvasRenderingContext.fillRect(closeX, closeY, closeSize, closeSize);
		canvasRenderingContext.strokeStyle = "#ffffff";
		canvasRenderingContext.lineWidth = 1;
		canvasRenderingContext.strokeRect(closeX, closeY, closeSize, closeSize);
		canvasRenderingContext.fillStyle = "#ffffff";
		canvasRenderingContext.font = "bold 18px GyeonggiBatangBold, sans-serif";
		canvasRenderingContext.textAlign = "center";
		canvasRenderingContext.textBaseline = "middle";
		canvasRenderingContext.fillText("X", closeX + closeSize * 0.5, closeY + closeSize * 0.5);

		let visitedCount = 0;
		for (const scene of this.#scenes) {
			if (scene.status === StorySceneStatus.visited || scene.status === StorySceneStatus.current) {
				++visitedCount;
			}
		}
		canvasRenderingContext.fillStyle = "#ffcc88";
		canvasRenderingContext.font = "16px GyeonggiBatang, sans-serif";
		canvasRenderingContext.textAlign = "right";
		canvasRenderingContext.textBaseline = "middle";
		canvasRenderingContext.fillText(`경험 ${visitedCount} / ${this.#scenes.length}`, closeX - 16, popupRect.y + HEADER_HEIGHT * 0.5);
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

		// 그래프 영역 안으로 클리핑 — 노드 / 연결선이 영역을 벗어나도 잘려서 그려진다.
		canvasRenderingContext.save();
		canvasRenderingContext.beginPath();
		canvasRenderingContext.rect(x + 1, y + 1, width - 2, height - 2);
		canvasRenderingContext.clip();

		// 격자: 고정 셀 크기 사용. 컨텐츠가 영역보다 크면 세로 스크롤 가능.
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
		const totalRows = maxRow + 1;
		const totalColumns = maxColumn + 1;
		const totalContentWidth = (totalColumns - 1) * SCENE_CELL_SPACING_X + SCENE_NODE_WIDTH + SCENE_CELL_PADDING * 2;
		const totalContentHeight = (totalRows - 1) * SCENE_CELL_SPACING_Y + SCENE_NODE_HEIGHT + SCENE_CELL_PADDING * 2;
		this.#lastGraphAreaHeight = height;
		this.#lastGraphContentHeight = totalContentHeight;
		this.#lastScrollMaxY = System.Math.max(0, totalContentHeight - height);
		// 컨텐츠가 영역보다 작으면 가운데 정렬, 크면 좌상단 정렬 + 스크롤.
		const offsetX = totalContentWidth < width ? (width - totalContentWidth) * 0.5 : 0;
		const offsetY = totalContentHeight < height ? (height - totalContentHeight) * 0.5 : -this.#scrollY;
		const baseGridX = x + SCENE_CELL_PADDING + offsetX;
		const baseGridY = y + SCENE_CELL_PADDING + offsetY;

		// 노드 위치 사전 계산 (연결선과 노드 출력에서 공유).
		const nodeCenterById = new System.Map();
		for (const scene of this.#scenes) {
			const nodeCenterX = baseGridX + scene.column * SCENE_CELL_SPACING_X + SCENE_NODE_WIDTH * 0.5;
			const nodeCenterY = baseGridY + scene.row * SCENE_CELL_SPACING_Y + SCENE_NODE_HEIGHT * 0.5;
			nodeCenterById.set(scene.id, { x: nodeCenterX, y: nodeCenterY });
		}

		// 1) 연결선 먼저 (노드 뒤에 그리도록).
		for (const scene of this.#scenes) {
			const fromCenter = nodeCenterById.get(scene.id);
			if (!fromCenter) {
				continue;
			}
			for (const nextSceneId of scene.nextSceneIds) {
				const toCenter = nodeCenterById.get(nextSceneId);
				if (!toCenter) {
					continue;
				}
				const isLineActive = scene.status === StorySceneStatus.visited || scene.status === StorySceneStatus.current;
				canvasRenderingContext.strokeStyle = isLineActive ? "#d4b46a" : "#3a4a6a";
				canvasRenderingContext.lineWidth = isLineActive ? 2 : 1;
				canvasRenderingContext.beginPath();
				canvasRenderingContext.moveTo(fromCenter.x, fromCenter.y);
				canvasRenderingContext.lineTo(toCenter.x, toCenter.y);
				canvasRenderingContext.stroke();
			}
		}

		// 2) 노드 출력.
		for (const scene of this.#scenes) {
			const nodeCenter = nodeCenterById.get(scene.id);
			if (!nodeCenter) {
				continue;
			}
			const nodeX = nodeCenter.x - SCENE_NODE_WIDTH * 0.5;
			const nodeY = nodeCenter.y - SCENE_NODE_HEIGHT * 0.5;
			this.drawSceneNode(canvasRenderingContext, scene, nodeX, nodeY, SCENE_NODE_WIDTH, SCENE_NODE_HEIGHT);
			this.#nodeLayouts.push(new StorySceneNodeLayout(scene, nodeX, nodeY, SCENE_NODE_WIDTH, SCENE_NODE_HEIGHT));
		}

		canvasRenderingContext.restore();

		// 스크롤바 (오버플로우 시 우측 가장자리에 골드 바).
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
	drawSceneNode(canvasRenderingContext, scene, x, y, width, height) {
		const isLocked = scene.status === StorySceneStatus.locked;
		const isCurrent = scene.status === StorySceneStatus.current;
		const isVisited = scene.status === StorySceneStatus.visited;
		const isSelected = scene.id === this.#selectedSceneId;

		// 배경.
		let backgroundColor = "#1f2a48";
		if (isLocked) {
			backgroundColor = "#16182a";
		}
		else if (isCurrent) {
			backgroundColor = "#3a2a55";
		}
		canvasRenderingContext.fillStyle = backgroundColor;
		canvasRenderingContext.fillRect(x, y, width, height);

		// 외곽선.
		let borderColor = "#3a4a6a";
		let borderWidth = 1;
		if (isCurrent) {
			borderColor = "#d4b46a";
			borderWidth = 3;
		}
		else if (isSelected) {
			borderColor = "#aaccff";
			borderWidth = 2;
		}
		else if (isVisited) {
			borderColor = "#88aa88";
		}
		canvasRenderingContext.strokeStyle = borderColor;
		canvasRenderingContext.lineWidth = borderWidth;
		canvasRenderingContext.strokeRect(x, y, width, height);

		// 포트레이트 (이미지 대체용 색칠 원 + 한 글자).
		const portraitCenterX = x + width * 0.5;
		const portraitCenterY = y + 38;
		canvasRenderingContext.fillStyle = isLocked ? "#2a2a40" : scene.portraitColor;
		canvasRenderingContext.beginPath();
		canvasRenderingContext.arc(portraitCenterX, portraitCenterY, SCENE_PORTRAIT_RADIUS, 0, System.Math.PI * 2);
		canvasRenderingContext.fill();
		canvasRenderingContext.strokeStyle = isLocked ? "#444455" : "#ffffff";
		canvasRenderingContext.lineWidth = 1.5;
		canvasRenderingContext.stroke();

		canvasRenderingContext.fillStyle = isLocked ? "#666677" : "#ffffff";
		canvasRenderingContext.font = "bold 18px GyeonggiBatangBold, sans-serif";
		canvasRenderingContext.textAlign = "center";
		canvasRenderingContext.textBaseline = "middle";
		canvasRenderingContext.fillText(scene.portraitLabel, portraitCenterX, portraitCenterY);

		// 씬 이름.
		const titleColor = isLocked ? "#666677" : "#ffffff";
		canvasRenderingContext.fillStyle = titleColor;
		canvasRenderingContext.font = "bold 13px GyeonggiBatangBold, sans-serif";
		canvasRenderingContext.textAlign = "center";
		canvasRenderingContext.textBaseline = "top";
		canvasRenderingContext.fillText(isLocked ? "???" : scene.name, x + width * 0.5, y + 76);

		// 상태 라벨.
		const statusLabelText = this.statusLabel(scene.status);
		const statusLabelColor = this.statusLabelColor(scene.status);
		canvasRenderingContext.fillStyle = statusLabelColor;
		canvasRenderingContext.font = "11px GyeonggiBatang, sans-serif";
		canvasRenderingContext.textAlign = "center";
		canvasRenderingContext.textBaseline = "bottom";
		canvasRenderingContext.fillText(statusLabelText, x + width * 0.5, y + height - 10);
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

		const isLocked = selectedScene.status === StorySceneStatus.locked;
		const innerX = x + DETAIL_INNER_PADDING;
		const innerY = y + DETAIL_INNER_PADDING;

		canvasRenderingContext.fillStyle = "#ffffff";
		canvasRenderingContext.font = "bold 18px GyeonggiBatangBold, sans-serif";
		canvasRenderingContext.textAlign = "left";
		canvasRenderingContext.textBaseline = "top";
		canvasRenderingContext.fillText(isLocked ? "???" : selectedScene.name, innerX, innerY);

		canvasRenderingContext.fillStyle = this.statusLabelColor(selectedScene.status);
		canvasRenderingContext.font = "13px GyeonggiBatang, sans-serif";
		canvasRenderingContext.fillText(this.statusLabel(selectedScene.status), innerX, innerY + 26);

		canvasRenderingContext.fillStyle = "#dddddd";
		canvasRenderingContext.font = "13px GyeonggiBatang, sans-serif";
		const descriptionText = isLocked ? "아직 도달하지 못한 씬." : selectedScene.description;
		const descriptionLines = this.wrapTextByWidth(canvasRenderingContext, descriptionText, width - 32);
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
				const nextLabel = nextScene === null ? "???" : (nextScene.status === StorySceneStatus.locked ? "???" : nextScene.name);
				canvasRenderingContext.fillText(`· ${nextLabel}`, innerX, nextHeaderY + 22 + nextIndex * 18);
			}
		}

		// 이동 버튼 (하단). 잠긴 씬은 비활성.
		const visitButtonHeight = 44;
		const visitButtonX = x + 16;
		const visitButtonY = y + height - visitButtonHeight - 16;
		const visitButtonWidth = width - 32;
		this.#visitButtonRect = isLocked ? null : { x: visitButtonX, y: visitButtonY, width: visitButtonWidth, height: visitButtonHeight };
		canvasRenderingContext.fillStyle = isLocked ? "#16182a" : "#3a5a99";
		canvasRenderingContext.fillRect(visitButtonX, visitButtonY, visitButtonWidth, visitButtonHeight);
		canvasRenderingContext.strokeStyle = isLocked ? "#3a3a4a" : "#ffffff";
		canvasRenderingContext.lineWidth = 1;
		canvasRenderingContext.strokeRect(visitButtonX, visitButtonY, visitButtonWidth, visitButtonHeight);
		canvasRenderingContext.fillStyle = isLocked ? "#666677" : "#ffffff";
		canvasRenderingContext.font = "bold 16px GyeonggiBatangBold, sans-serif";
		canvasRenderingContext.textAlign = "center";
		canvasRenderingContext.textBaseline = "middle";
		canvasRenderingContext.fillText(isLocked ? "이동 불가" : "이동", visitButtonX + visitButtonWidth * 0.5, visitButtonY + visitButtonHeight * 0.5);
		if (!isLocked) {
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
			case StorySceneStatus.locked: {
				return "잠김";
			}
			case StorySceneStatus.available: {
				return "갈 수 있음";
			}
			case StorySceneStatus.visited: {
				return "경험함";
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
			case StorySceneStatus.locked: {
				return "#666677";
			}
			case StorySceneStatus.available: {
				return "#aaccff";
			}
			case StorySceneStatus.visited: {
				return "#88dd88";
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
		const sampleScenes = [];
		sampleScenes.push(new StoryScene(1, "검종 산문 앞", "검종 입문 시험을 치르는 곳.", "산", "#5577aa", 0, 0, StorySceneStatus.visited, [2]));
		sampleScenes.push(new StoryScene(2, "검종 본전", "종파의 중심. 상점·대장간·도장이 모여 있다.", "본", "#88aa88", 1, 1, StorySceneStatus.current, [3, 4]));
		sampleScenes.push(new StoryScene(3, "검종 후산 동굴", "사람 발길이 끊긴 곳.", "후", "#664488", 0, 2, StorySceneStatus.available, [5]));
		sampleScenes.push(new StoryScene(4, "강호 시장", "여러 종파의 수사들이 오가는 떠들썩한 시장.", "시", "#cc8844", 2, 2, StorySceneStatus.available, [5]));
		sampleScenes.push(new StoryScene(5, "비검문 외곽", "또 다른 종파의 영역.", "비", "#aa3344", 1, 3, StorySceneStatus.locked, [6]));
		sampleScenes.push(new StoryScene(6, "?? ", "감춰진 진실.", "?", "#444455", 1, 4, StorySceneStatus.locked, []));
		this.setScenes(sampleScenes);
		this.#selectedSceneId = 2;
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

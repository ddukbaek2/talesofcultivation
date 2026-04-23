//==============================================================================
// 포함 모듈 목록.
//==============================================================================
const System = globalThis;
import { Vector2 } from "../../libs/vanilla.js/src/base/vector2.js";


//==============================================================================
// 상수 목록.
//==============================================================================
const GRID_COLUMNS = 6;
const GRID_ROWS = 8;
const SPAWN_INTERVAL = 2.5;
const MAX_LEVEL = 7;
const BOARD_PADDING = 24;
const HEADER_HEIGHT = 56;


//==============================================================================
// 타일 색상. 레벨 - 1 을 인덱스로 사용. 길이를 넘어가면 모듈로.
//==============================================================================
const TileColors = [
	"#4488ff",
	"#44cc44",
	"#ff88aa",
	"#9944cc",
	"#ff4444",
	"#ffcc00",
	"#ffffff",
];


//==============================================================================
// 타일.
//==============================================================================
class Tile {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @type { number } */ id;
	/** @type { number } */ gridX;
	/** @type { number } */ gridY;
	/** @type { number } */ level;
	/** @type { Vector2 } */ position;

	//==============================================================================
	// 생성.
	//==============================================================================
	constructor(id, gridX, gridY, level, position) {
		this.id = id;
		this.gridX = gridX;
		this.gridY = gridY;
		this.level = level;
		this.position = position;
	}
}


//==============================================================================
// 머지 게임.
// 그리드 위에서 동일 레벨 타일 두 개를 합치면 다음 레벨로 승급.
// 일정 간격으로 빈 칸에 레벨 1 타일이 자동 스폰.
//==============================================================================
export class MergeGame {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @private @type { Array<Array<Tile|null>> } */ #grid;
	/** @private @type { Tile[] } */ #tiles;
	/** @private @type { number } */ #score;
	/** @private @type { number } */ #spawnTime;
	/** @private @type { number } */ #boardX;
	/** @private @type { number } */ #boardY;
	/** @private @type { number } */ #cellSize;
	/** @private @type { number } */ #nextTileId;
	/** @private @type { Tile | null } */ #draggedTile;
	/** @private @type { Vector2 } */ #dragOffset;
	/** @private @type { boolean } */ #isDragging;

	//==============================================================================
	// 생성.
	//==============================================================================
	constructor() {
		this.#grid = null;
		this.#tiles = [];
		this.#score = 0;
		this.#spawnTime = SPAWN_INTERVAL;
		this.#boardX = 0;
		this.#boardY = 0;
		this.#cellSize = 80;
		this.#nextTileId = 1;
		this.#draggedTile = null;
		this.#dragOffset = Vector2.zero();
		this.#isDragging = false;
		this.reset();
	}

	//==============================================================================
	// 재시작.
	//==============================================================================
	reset() {
		this.#grid = System.Array(GRID_COLUMNS).fill(null).map(() => System.Array(GRID_ROWS).fill(null));
		this.#tiles = [];
		this.#score = 0;
		this.#spawnTime = SPAWN_INTERVAL;
		this.#nextTileId = 1;
		this.#draggedTile = null;
		this.#isDragging = false;
		for (let i = 0; i < 5; ++i) {
			this.spawnRandomTile();
		}
	}

	//==============================================================================
	// 점수 반환.
	//==============================================================================
	/**
	 * @returns { number }
	 */
	getScore() {
		return this.#score;
	}

	//==============================================================================
	// 팝업 사각 영역 기반으로 보드 위치/셀 사이즈 갱신.
	// 매 프레임 호출되며 팝업 크기가 바뀌어도 자동으로 보드가 재배치된다.
	//==============================================================================
	/**
	 * @param { { x: number, y: number, width: number, height: number } } popupRect
	 */
	layoutBoard(popupRect) {
		const availableWidth = popupRect.width - BOARD_PADDING * 2;
		const availableHeight = popupRect.height - BOARD_PADDING * 2 - HEADER_HEIGHT;
		const cellSizeByWidth = availableWidth / GRID_COLUMNS;
		const cellSizeByHeight = availableHeight / GRID_ROWS;
		const cellSize = System.Math.floor(System.Math.min(cellSizeByWidth, cellSizeByHeight));
		const boardWidth = cellSize * GRID_COLUMNS;
		const boardHeight = cellSize * GRID_ROWS;
		const boardX = popupRect.x + System.Math.floor((popupRect.width - boardWidth) * 0.5);
		const boardY = popupRect.y + HEADER_HEIGHT + System.Math.floor((popupRect.height - HEADER_HEIGHT - boardHeight) * 0.5);
		this.#boardX = boardX;
		this.#boardY = boardY;
		this.#cellSize = cellSize;
		// 드래그 중인 타일을 제외한 모든 타일의 화면 위치를 새 셀에 맞춰 갱신.
		for (const tile of this.#tiles) {
			if (tile === this.#draggedTile) {
				continue;
			}
			const newPosition = this.gridToWorldPosition(tile.gridX, tile.gridY);
			tile.position = newPosition;
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
		this.layoutBoard(popupRect);

		// 자동 스폰. 드래그 중에는 스폰 타이머를 정지시켜 게임 흐름을 방해하지 않음.
		if (!this.#isDragging) {
			this.#spawnTime -= timeDelta;
			if (this.#spawnTime <= 0) {
				this.spawnRandomTile();
				this.#spawnTime = SPAWN_INTERVAL;
			}
		}

		const viewInputPosition = inputManager.getViewInputPosition();

		// 터치 시작.
		if (inputManager.isTouchPressed()) {
			const pickedTile = this.getTileAtPosition(viewInputPosition);
			if (pickedTile) {
				this.#draggedTile = pickedTile;
				this.#dragOffset = viewInputPosition.subtract(pickedTile.position);
				this.#grid[pickedTile.gridX][pickedTile.gridY] = null;
				this.#isDragging = true;
			}
		}

		// 터치 이동.
		if (inputManager.isTouchMoved() && this.#draggedTile) {
			const newPosition = viewInputPosition.subtract(this.#dragOffset);
			this.#draggedTile.position = newPosition;
		}

		// 터치 종료. 합치기 / 이동 / 복귀를 차례대로 시도.
		if (inputManager.isTouchReleased() && this.#draggedTile) {
			const releasedTile = this.#draggedTile;
			this.#draggedTile = null;
			this.#isDragging = false;

			const targetGridPoint = this.worldPositionToGridPoint(viewInputPosition);
			const targetTile = targetGridPoint ? this.#grid[targetGridPoint.x][targetGridPoint.y] : null;

			if (targetTile && targetTile.id !== releasedTile.id && targetTile.level === releasedTile.level && targetTile.level < MAX_LEVEL) {
				// 합치기: 대상 타일을 한 단계 승급, 드롭한 타일 제거.
				this.#tiles = this.#tiles.filter((t) => t.id !== releasedTile.id);
				++targetTile.level;
				this.#score += targetTile.level * 10;
			}
			else if (targetGridPoint && !targetTile) {
				// 빈 칸으로 이동.
				releasedTile.gridX = targetGridPoint.x;
				releasedTile.gridY = targetGridPoint.y;
				releasedTile.position = this.gridToWorldPosition(targetGridPoint.x, targetGridPoint.y);
				this.#grid[targetGridPoint.x][targetGridPoint.y] = releasedTile;
			}
			else {
				// 원래 자리로 복귀 (보드 밖이거나 같은 타일과 합칠 수 없음).
				this.#grid[releasedTile.gridX][releasedTile.gridY] = releasedTile;
				releasedTile.position = this.gridToWorldPosition(releasedTile.gridX, releasedTile.gridY);
			}
		}
	}

	//==============================================================================
	// 출력. 팝업 박스는 호출자가 그려주므로 여기서는 내용물만 그린다.
	//==============================================================================
	/**
	 * @param { import("../../libs/vanilla.js/src/core/graphic.js").Graphic } graphic
	 * @param { { x: number, y: number, width: number, height: number } } popupRect
	 */
	draw(graphic, popupRect) {
		const canvasRenderingContext = graphic.getCanvasRenderingContext();

		// 점수 (팝업 좌상단).
		canvasRenderingContext.fillStyle = "#ffffff";
		canvasRenderingContext.font = "20px GyeonggiBatang";
		canvasRenderingContext.textAlign = "left";
		canvasRenderingContext.textBaseline = "top";
		canvasRenderingContext.fillText(`Score: ${this.#score}`, popupRect.x + 20, popupRect.y + 20);

		// 보드 배경.
		const boardWidth = GRID_COLUMNS * this.#cellSize;
		const boardHeight = GRID_ROWS * this.#cellSize;
		canvasRenderingContext.fillStyle = "#2a2a3a";
		canvasRenderingContext.fillRect(this.#boardX, this.#boardY, boardWidth, boardHeight);

		// 격자.
		canvasRenderingContext.strokeStyle = "#3f3f55";
		canvasRenderingContext.lineWidth = 1;
		for (let y = 0; y < GRID_ROWS; ++y) {
			for (let x = 0; x < GRID_COLUMNS; ++x) {
				const cellX = this.#boardX + x * this.#cellSize;
				const cellY = this.#boardY + y * this.#cellSize;
				canvasRenderingContext.strokeRect(cellX, cellY, this.#cellSize, this.#cellSize);
			}
		}

		// 타일 출력. 드래그 중인 타일은 가장 위에 그려야 하므로 마지막에 한 번 더 그림.
		for (const tile of this.#tiles) {
			if (tile === this.#draggedTile) {
				continue;
			}
			this.drawTile(canvasRenderingContext, tile);
		}
		if (this.#draggedTile) {
			this.drawTile(canvasRenderingContext, this.#draggedTile);
		}
	}

	//==============================================================================
	// 단일 타일 출력.
	//==============================================================================
	/**
	 * @param { CanvasRenderingContext2D } canvasRenderingContext
	 * @param { Tile } tile
	 */
	drawTile(canvasRenderingContext, tile) {
		const tileRadius = this.#cellSize * 0.42;
		const colorIndex = (tile.level - 1) % TileColors.length;
		canvasRenderingContext.beginPath();
		canvasRenderingContext.arc(tile.position.x, tile.position.y, tileRadius, 0, System.Math.PI * 2);
		canvasRenderingContext.fillStyle = TileColors[colorIndex];
		canvasRenderingContext.fill();
		canvasRenderingContext.strokeStyle = "#ffffff";
		canvasRenderingContext.lineWidth = 3;
		canvasRenderingContext.stroke();
		canvasRenderingContext.fillStyle = "#000000";
		const fontSize = System.Math.floor(this.#cellSize * 0.32);
		canvasRenderingContext.font = `bold ${fontSize}px GyeonggiBatangBold`;
		canvasRenderingContext.textAlign = "center";
		canvasRenderingContext.textBaseline = "middle";
		canvasRenderingContext.fillText(tile.level.toString(), tile.position.x, tile.position.y);
	}

	//==============================================================================
	// 빈 칸에 랜덤 위치로 레벨 1 타일을 스폰. 빈 칸이 없으면 null.
	//==============================================================================
	/**
	 * @returns { Tile | null }
	 */
	spawnRandomTile() {
		const emptyCells = [];
		for (let x = 0; x < GRID_COLUMNS; ++x) {
			for (let y = 0; y < GRID_ROWS; ++y) {
				if (this.#grid[x][y] === null) {
					emptyCells.push({ x: x, y: y });
				}
			}
		}
		if (emptyCells.length === 0) {
			return null;
		}
		const cellIndex = System.Math.floor(System.Math.random() * emptyCells.length);
		const cell = emptyCells[cellIndex];
		const level = 1;
		const position = this.gridToWorldPosition(cell.x, cell.y);
		const tileId = this.#nextTileId;
		++this.#nextTileId;
		const tile = new Tile(tileId, cell.x, cell.y, level, position);
		this.#grid[cell.x][cell.y] = tile;
		this.#tiles.push(tile);
		return tile;
	}

	//==============================================================================
	// 뷰 좌표가 타일 안에 있는지 검사하여 가장 위의 타일을 반환.
	//==============================================================================
	/**
	 * @param { Vector2 } viewPosition
	 * @returns { Tile | null }
	 */
	getTileAtPosition(viewPosition) {
		for (let i = this.#tiles.length - 1; i >= 0; --i) {
			const tile = this.#tiles[i];
			const tileHalfSize = this.#cellSize * 0.42;
			const insideX = viewPosition.x >= tile.position.x - tileHalfSize && viewPosition.x <= tile.position.x + tileHalfSize;
			const insideY = viewPosition.y >= tile.position.y - tileHalfSize && viewPosition.y <= tile.position.y + tileHalfSize;
			if (insideX && insideY) {
				return tile;
			}
		}
		return null;
	}

	//==============================================================================
	// 뷰 좌표 → 그리드 인덱스 변환. 보드 밖이면 null.
	//==============================================================================
	/**
	 * @param { Vector2 } viewPosition
	 * @returns { { x: number, y: number } | null }
	 */
	worldPositionToGridPoint(viewPosition) {
		const gridX = System.Math.floor((viewPosition.x - this.#boardX) / this.#cellSize);
		const gridY = System.Math.floor((viewPosition.y - this.#boardY) / this.#cellSize);
		if (gridX < 0 || gridX >= GRID_COLUMNS || gridY < 0 || gridY >= GRID_ROWS) {
			return null;
		}
		return { x: gridX, y: gridY };
	}

	//==============================================================================
	// 그리드 인덱스 → 셀 중앙의 뷰 좌표 변환.
	//==============================================================================
	/**
	 * @param { number } gridX
	 * @param { number } gridY
	 * @returns { Vector2 }
	 */
	gridToWorldPosition(gridX, gridY) {
		const x = this.#boardX + gridX * this.#cellSize + this.#cellSize * 0.5;
		const y = this.#boardY + gridY * this.#cellSize + this.#cellSize * 0.5;
		return Vector2.create(x, y);
	}
}

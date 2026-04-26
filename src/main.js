//==============================================================================
// 포함 모듈 목록.
//==============================================================================
const System = globalThis;
import { Vector2 } from "../libs/vanilla.js/src/base/vector2.js";
import { Color } from "../libs/vanilla.js/src/base/color.js";
import { Rect } from "../libs/vanilla.js/src/base/rect.js";
import { EngineConfiguration, Engine } from "../libs/vanilla.js/src/core/engine.js";
import { Scene } from "../libs/vanilla.js/src/core/scene.js";
import { Graphic } from "../libs/vanilla.js/src/core/graphic.js";
import { ImageAsset } from "../libs/vanilla.js/src/resource/imageasset.js";
import { AudioAsset } from "../libs/vanilla.js/src/resource/audioasset.js";
import { FontAsset } from "../libs/vanilla.js/src/resource/fontasset.js";
import { JsonAsset } from "../libs/vanilla.js/src/resource/jsonasset.js";
import { DEVTools } from "../libs/vanilla.js/src/misc/devtools.js";
import { ViewScaleMode } from "../libs/vanilla.js/src/core/viewmanager.js";
import { Colors } from "../libs/vanilla.js/src/base/colors.js";
import { MergeGame } from "./minigame/mergegame.js";
import { BattlePart } from "./part/battlepart.js";
import { DialoguePart } from "./part/dialoguepart.js";
import { MapPart } from "./part/mappart.js";
import { PlayerPart } from "./part/playerpart.js";
import { DungeonPart } from "./part/dungeonpart.js";
import { AudioBeepPlayer } from "./base/audiobeepplayer.js";


//==============================================================================
// 활성 파트 식별자.
//==============================================================================
const PartKey = System.Object.freeze({
	dialogue: "dialogue",
	battle: "battle",
	merge: "merge",
	map: "map",
	dungeon: "dungeon",
});


//==============================================================================
// JSON 데이터 애셋 식별자.
//==============================================================================
const JsonId = System.Object.freeze({
	cardTable: 1,
	sectTable: 2,
	realmTable: 3,
	characterTable: 4,
	gradeTable: 5,
	buffTable: 6,
	dialogueTable: 7,
});


//==============================================================================
// 폰트 애셋 식별자.
//==============================================================================
const FontId = System.Object.freeze({
	gyeonggiBatangRegular: 1,
	gyeonggiBatangBold: 2,
});


//==============================================================================
// 수선전.
//==============================================================================
export class TalesOfCultivation extends Scene {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @private @type { DEVTools } */ #devtools;
	/** @private @type { Map<number, ImageAsset> } */ #loadedImageAssets;
	/** @private @type { Map<number, AudioAsset> } */ #loadedAudioAssets;
	/** @private @type { Map<number, FontAsset> } */ #loadedFontAssets;
	/** @private @type { Map<number, JsonAsset> } */ #loadedJsonAssets;
	/** @private @type { Array<{ id: number, path: string }> } */ #pendingImageLoads;
	/** @private @type { Array<{ id: number, path: string }> } */ #pendingAudioLoads;
	/** @private @type { Array<{ id: number, name: string, path: string }> } */ #pendingFontLoads;
	/** @private @type { Array<{ id: number, path: string }> } */ #pendingJsonLoads;
	/** @private @type { number } */ #loadedAssetCount;
	/** @private @type { number } */ #totalAssetCount;
	/** @private @type { string } */ #loadingAssetPath;
	/** @private @type { MergeGame } */ #mergeGame;
	/** @private @type { BattlePart } */ #battlePart;
	/** @private @type { DialoguePart } */ #dialoguePart;
	/** @private @type { MapPart } */ #mapPart;
	/** @private @type { PlayerPart } */ #playerPart;
	/** @private @type { DungeonPart } */ #dungeonPart;
	/** @private @type { AudioBeepPlayer } */ #audioBeepPlayer;
	/** @private @type { string } */ #activePartKey;
	/** @private @type { boolean } */ #prevIsKey1;
	/** @private @type { boolean } */ #prevIsKey2;
	/** @private @type { boolean } */ #prevIsKey3;
	/** @private @type { boolean } */ #prevIsKey4;
	/** @private @type { boolean } */ #prevIsKey5;
	/** @private @type { boolean } */ #prevIsKeyP;
	/** @private @type { boolean } */ #isPlayerOverlayVisible;
	/** @private @type { boolean } */ #prevIsTouchPressed;
	/** @private @type { { x: number, y: number, width: number, height: number } | null } */ #menuButtonRect;

	//==============================================================================
	// 생성.
	//==============================================================================
	constructor() {
		super();
	}

	//==============================================================================
	// 생성.
	//==============================================================================
	/**
	 * @override
	 */
	create() {
		super.create();
		this.#devtools = null;
		this.#loadedImageAssets = new System.Map();
		this.#loadedAudioAssets = new System.Map();
		this.#loadedFontAssets = new System.Map();
		this.#loadedJsonAssets = new System.Map();
		this.#pendingImageLoads = [];
		this.#pendingAudioLoads = [];
		this.#pendingFontLoads = [];
		this.#pendingJsonLoads = [];
		// 로딩 화면.
		this.#loadedAssetCount = 0;
		this.#totalAssetCount = 0;
		this.#loadingAssetPath = "";
		// 파트 (팝업으로 표시됨). 게임 시작은 대사 파트.
		// 대사 끝나면 자동으로 전투 파트로 전환.
		// 키 1~5 또는 setActivePartKey 로 강제 전환 가능 (1: 대사, 2: 전투, 3: 머지, 4: 맵, 5: 던전).
		// P 키: 플레이어 정보창 오버레이 토글 (기저 파트 위에 덮임).
		this.#mergeGame = new MergeGame();
		this.#battlePart = new BattlePart();
		this.#dialoguePart = new DialoguePart();
		this.#mapPart = new MapPart();
		this.#playerPart = new PlayerPart();
		this.#dungeonPart = new DungeonPart();
		this.#audioBeepPlayer = null;
		this.#activePartKey = PartKey.dialogue;
		this.#prevIsKey1 = false;
		this.#prevIsKey2 = false;
		this.#prevIsKey3 = false;
		this.#prevIsKey4 = false;
		this.#prevIsKey5 = false;
		this.#prevIsKeyP = false;
		this.#isPlayerOverlayVisible = false;
		this.#prevIsTouchPressed = false;
		this.#menuButtonRect = null;
	}

	//==============================================================================
	// 비동기 로딩.
	//==============================================================================
	/**
	 * @override
	 * @param { Engine } engine
	 */
	async load(engine) {
		await super.load(engine);

		const viewManager = engine.getViewManager();
		viewManager.setViewScaleMode(ViewScaleMode.stretchHeightExpandWidth);

		// 개발자 도구 초기화.
		this.#devtools = new DEVTools();
		this.#devtools.setEngine(engine);

		// 폰트 애셋 예약 (경기천년바탕체 Regular / Bold).
		this.loadFontAsset(FontId.gyeonggiBatangRegular, "GyeonggiBatang", "./assets/fonts/GyeonggiMillenniumBatang_Regular.woff2");
		this.loadFontAsset(FontId.gyeonggiBatangBold, "GyeonggiBatangBold", "./assets/fonts/GyeonggiMillenniumBatang_Bold.woff2");

		// 데이터 애셋 예약 (테이블별 json. 시트명 = 파일명 = 테이블 이름).
		this.loadJsonAsset(JsonId.cardTable, "./assets/data/table/cardtable.json");
		this.loadJsonAsset(JsonId.sectTable, "./assets/data/table/secttable.json");
		this.loadJsonAsset(JsonId.realmTable, "./assets/data/table/realmtable.json");
		this.loadJsonAsset(JsonId.characterTable, "./assets/data/table/charactertable.json");
		this.loadJsonAsset(JsonId.gradeTable, "./assets/data/table/gradetable.json");
		this.loadJsonAsset(JsonId.buffTable, "./assets/data/table/bufftable.json");
		this.loadJsonAsset(JsonId.dialogueTable, "./assets/data/table/dialoguetable.json");

		// 예약된 모든 리소스 로드.
		await this.loadAllAssets();
	}

	//==============================================================================
	// 초기화.
	//==============================================================================
	/**
	 * @override
	 * @param { Engine } engine
	 */
	initialize(engine) {
		super.initialize(engine);

		// 하이어라키 루트 노드 등록.
		const root = this.getRoot();
		this.#devtools.setRootNodes([root]);

		// 데이터 테이블을 카드배틀 게임에 주입.
		// 카드 정의를 마지막에 주입해야 reset 호출 시 등급/종파/버프 정의가 이미 들어있음.
		const gradeTableAsset = this.getLoadedJsonAsset(JsonId.gradeTable);
		if (gradeTableAsset && System.Array.isArray(gradeTableAsset.data)) {
			this.#battlePart.setGradeDefinitions(gradeTableAsset.data);
		}
		const sectTableAsset = this.getLoadedJsonAsset(JsonId.sectTable);
		if (sectTableAsset && System.Array.isArray(sectTableAsset.data)) {
			this.#battlePart.setSectDefinitions(sectTableAsset.data);
		}
		const buffTableAsset = this.getLoadedJsonAsset(JsonId.buffTable);
		if (buffTableAsset && System.Array.isArray(buffTableAsset.data)) {
			this.#battlePart.setBuffDefinitions(buffTableAsset.data);
		}
		const realmTableAsset = this.getLoadedJsonAsset(JsonId.realmTable);
		if (realmTableAsset && System.Array.isArray(realmTableAsset.data)) {
			this.#battlePart.setRealmDefinitions(realmTableAsset.data);
		}
		const characterTableAsset = this.getLoadedJsonAsset(JsonId.characterTable);
		if (characterTableAsset && System.Array.isArray(characterTableAsset.data)) {
			this.#battlePart.setCharacterDefinitions(characterTableAsset.data);
		}
		const cardTableAsset = this.getLoadedJsonAsset(JsonId.cardTable);
		if (cardTableAsset && System.Array.isArray(cardTableAsset.data)) {
			this.#battlePart.setCardDefinitions(cardTableAsset.data);
		}
		// 전투 셋업: 한두백 (10000001) vs 검종 장로 (10000002).
		this.#battlePart.setBattleCharacters(10000001, 10000002);

		// 오디오 비프 플레이어 생성 후 각 파트/미니게임에 주입 (파일 없는 효과음 합성).
		const audioManager = engine.getAudioManager();
		const audioContext = audioManager.getAudioContext();
		this.#audioBeepPlayer = new AudioBeepPlayer(audioContext);
		this.#dialoguePart.setAudioBeepPlayer(this.#audioBeepPlayer);
		this.#battlePart.setAudioBeepPlayer(this.#audioBeepPlayer);
		this.#mergeGame.setAudioBeepPlayer(this.#audioBeepPlayer);
		this.#mapPart.setAudioBeepPlayer(this.#audioBeepPlayer);
		this.#playerPart.setAudioBeepPlayer(this.#audioBeepPlayer);
		this.#dungeonPart.setAudioBeepPlayer(this.#audioBeepPlayer);

		// 대사 테이블 주입 후 인트로 장면 시작.
		const dialogueTableAsset = this.getLoadedJsonAsset(JsonId.dialogueTable);
		if (dialogueTableAsset && System.Array.isArray(dialogueTableAsset.data)) {
			this.#dialoguePart.setDialogues(dialogueTableAsset.data);
			this.#dialoguePart.playScene("intro");
		}
	}

	//==============================================================================
	// 갱신.
	//==============================================================================
	/**
	 * @override
	 * @param { number } timeDelta
	 */
	tick(timeDelta) {
		super.tick(timeDelta);

		// timeScale 영향 없는 경과 시간.
		const engine = this.getEngine();
		const timeManager = engine.getTimeManager();
		const unscaledTimeDelta = timeManager.getUnscaleDeltaTime();

		// 개발자 도구 갱신 (항상 최우선).
		this.#devtools.tick(unscaledTimeDelta);

		// 파트 강제 전환 (1: 대사, 2: 전투, 3: 머지, 4: 맵, 5: 던전). just-pressed 트리거.
		// P: 플레이어 정보창 오버레이 토글 (기저 파트 위에 덮임).
		const inputManager = engine.getInputManager();
		const isKey1 = inputManager.isKeyPressed("Digit1");
		const isKey2 = inputManager.isKeyPressed("Digit2");
		const isKey3 = inputManager.isKeyPressed("Digit3");
		const isKey4 = inputManager.isKeyPressed("Digit4");
		const isKey5 = inputManager.isKeyPressed("Digit5");
		const isKeyP = inputManager.isKeyPressed("KeyP");
		if (isKey1 && !this.#prevIsKey1) {
			this.setActivePartKey(PartKey.dialogue);
		}
		if (isKey2 && !this.#prevIsKey2) {
			this.setActivePartKey(PartKey.battle);
		}
		if (isKey3 && !this.#prevIsKey3) {
			this.setActivePartKey(PartKey.merge);
		}
		if (isKey4 && !this.#prevIsKey4) {
			this.setActivePartKey(PartKey.map);
		}
		if (isKey5 && !this.#prevIsKey5) {
			this.setActivePartKey(PartKey.dungeon);
		}
		if (isKeyP && !this.#prevIsKeyP) {
			this.#isPlayerOverlayVisible = !this.#isPlayerOverlayVisible;
			if (this.#isPlayerOverlayVisible) {
				this.#playerPart.reset();
			}
		}
		this.#prevIsKey1 = isKey1;
		this.#prevIsKey2 = isKey2;
		this.#prevIsKey3 = isKey3;
		this.#prevIsKey4 = isKey4;
		this.#prevIsKey5 = isKey5;
		this.#prevIsKeyP = isKeyP;

		// 우상단 메뉴 버튼 hit 검사 (모든 파트보다 우선). 클릭이 메뉴에서 소비되면 기저 파트로 전달하지 않음.
		// 플레이어 오버레이가 떠 있으면 기저 파트는 입력을 받지 않고, 오버레이가 입력을 독점한다.
		let consumedByMenuButton = false;
		if (!this.isHierarchyCapturingInput()) {
			const isTouchPressed = inputManager.isTouchPressed();
			if (isTouchPressed && !this.#prevIsTouchPressed) {
				const viewInputPosition = inputManager.getViewInputPosition();
				if (this.#menuButtonRect && this.isInsideRect(viewInputPosition, this.#menuButtonRect)) {
					this.#isPlayerOverlayVisible = !this.#isPlayerOverlayVisible;
					if (this.#isPlayerOverlayVisible) {
						this.#playerPart.reset();
					}
					if (this.#audioBeepPlayer) {
						this.#audioBeepPlayer.playClick();
					}
					consumedByMenuButton = true;
				}
			}
			this.#prevIsTouchPressed = isTouchPressed;
		}

		// 활성 파트 갱신 (780x780 팝업 영역 안에서). 데브툴 패널 위에서는 입력 차단.
		if (!this.isHierarchyCapturingInput() && !consumedByMenuButton) {
			const viewManager = engine.getViewManager();
			const viewSize = viewManager.getViewSize();
			const popupRect = this.computeMinigamePopupRect(viewSize);
			if (this.#isPlayerOverlayVisible) {
				this.#playerPart.tick(timeDelta, inputManager, popupRect);
			}
			else if (this.#activePartKey === PartKey.dialogue) {
				this.#dialoguePart.tick(timeDelta, inputManager, popupRect);
				if (this.#dialoguePart.isFinished()) {
					this.setActivePartKey(PartKey.battle);
				}
			}
			else if (this.#activePartKey === PartKey.battle) {
				this.#battlePart.tick(timeDelta, inputManager, popupRect);
			}
			else if (this.#activePartKey === PartKey.merge) {
				this.#mergeGame.tick(timeDelta, inputManager, popupRect);
			}
			else if (this.#activePartKey === PartKey.map) {
				this.#mapPart.tick(timeDelta, inputManager, popupRect);
			}
			else if (this.#activePartKey === PartKey.dungeon) {
				this.#dungeonPart.tick(timeDelta, inputManager, popupRect);
			}
		}
	}

	//==============================================================================
	// 이전 출력.
	//==============================================================================
	/**
	 * @override
	 * @param { Graphic } graphic
	 */
	preDraw(graphic) {
		super.preDraw(graphic);

		const canvasRenderingContext = graphic.getCanvasRenderingContext();
		const viewManager = engine.getViewManager();
		const canvasNativeSize = viewManager.getCanvasNativeSize();
		const viewSize = viewManager.getViewSize();

		// 전체 화면 칠하기.
		viewManager.applyCanvasNativeRect(canvasRenderingContext);
		graphic.setFillColor(Colors.darkVanilla);
		graphic.drawRect(Rect.create(0, 0, canvasNativeSize.x, canvasNativeSize.y));

		// 게임 영역 칠하기.
		viewManager.applyViewRect(canvasRenderingContext);
		// graphic.setFillColor(Colors.lightVanilla);
		// graphic.drawRect(Rect.create(0, 0, viewSize.x, viewSize.y));
	}

	//==============================================================================
	// 출력.
	//==============================================================================
	/**
	 * @override
	 * @param { Graphic } graphic
	 */
	draw(graphic) {
		super.draw(graphic);

		const engine = this.getEngine();
		const viewManager = engine.getViewManager();
		const viewSize = viewManager.getViewSize();
		const popupRect = this.computeMinigamePopupRect(viewSize);
		const canvasRenderingContext = graphic.getCanvasRenderingContext();

		// 전경 딤드 (팝업이 위에 떠 있음을 강조).
		canvasRenderingContext.fillStyle = "rgba(0, 0, 0, 0.55)";
		canvasRenderingContext.fillRect(0, 0, viewSize.x, viewSize.y);

		// 팝업 박스 (배경 + 골드 테두리).
		canvasRenderingContext.fillStyle = "#1a1a2e";
		canvasRenderingContext.fillRect(popupRect.x, popupRect.y, popupRect.width, popupRect.height);
		canvasRenderingContext.strokeStyle = "#d4b46a";
		canvasRenderingContext.lineWidth = 3;
		canvasRenderingContext.strokeRect(popupRect.x, popupRect.y, popupRect.width, popupRect.height);

		// 활성 파트 출력 (팝업 내부에 한정).
		if (this.#activePartKey === PartKey.dialogue) {
			this.#dialoguePart.draw(graphic, popupRect);
		}
		else if (this.#activePartKey === PartKey.battle) {
			this.#battlePart.draw(graphic, popupRect);
		}
		else if (this.#activePartKey === PartKey.merge) {
			this.#mergeGame.draw(graphic, popupRect);
		}
		else if (this.#activePartKey === PartKey.map) {
			this.#mapPart.draw(graphic, popupRect);
		}
		else if (this.#activePartKey === PartKey.dungeon) {
			this.#dungeonPart.draw(graphic, popupRect);
		}

		// 플레이어 정보창 오버레이 (기저 파트 위에 어두운 백드롭 + PlayerPart 출력).
		if (this.#isPlayerOverlayVisible) {
			canvasRenderingContext.fillStyle = "rgba(0, 0, 0, 0.55)";
			canvasRenderingContext.fillRect(popupRect.x, popupRect.y, popupRect.width, popupRect.height);
			this.#playerPart.draw(graphic, popupRect);
		}

		// 메뉴 바 (오버레이보다도 위에 그려서 항상 클릭 가능).
		this.drawMenuBar(canvasRenderingContext, popupRect);
	}

	//==============================================================================
	// 우상단 메뉴 바 출력 + hit 영역 갱신.
	// - 클릭 시 PlayerPart 오버레이 토글 (P 키와 동일).
	// - 오버레이 활성 상태에 따라 색상 변동.
	//==============================================================================
	/**
	 * @param { CanvasRenderingContext2D } canvasRenderingContext
	 * @param { { x: number, y: number, width: number, height: number } } popupRect
	 */
	drawMenuBar(canvasRenderingContext, popupRect) {
		const menuButtonSize = 44;
		const menuButtonMargin = 12;
		const menuButtonX = popupRect.x + popupRect.width - menuButtonSize - menuButtonMargin;
		const menuButtonY = popupRect.y + menuButtonMargin;
		this.#menuButtonRect = { x: menuButtonX, y: menuButtonY, width: menuButtonSize, height: menuButtonSize };

		const isOpen = this.#isPlayerOverlayVisible;
		canvasRenderingContext.fillStyle = isOpen ? "#3a2a55" : "#1a2240";
		canvasRenderingContext.fillRect(menuButtonX, menuButtonY, menuButtonSize, menuButtonSize);
		canvasRenderingContext.strokeStyle = "#d4b46a";
		canvasRenderingContext.lineWidth = 2;
		canvasRenderingContext.strokeRect(menuButtonX, menuButtonY, menuButtonSize, menuButtonSize);

		// 햄버거 아이콘 (3줄).
		canvasRenderingContext.strokeStyle = isOpen ? "#ffeecc" : "#ffffff";
		canvasRenderingContext.lineWidth = 2;
		const iconCenterX = menuButtonX + menuButtonSize * 0.5;
		const iconCenterY = menuButtonY + menuButtonSize * 0.5;
		const iconHalfWidth = menuButtonSize * 0.28;
		const iconLineGap = 6;
		for (let lineIndex = -1; lineIndex <= 1; ++lineIndex) {
			const lineY = iconCenterY + lineIndex * iconLineGap;
			canvasRenderingContext.beginPath();
			canvasRenderingContext.moveTo(iconCenterX - iconHalfWidth, lineY);
			canvasRenderingContext.lineTo(iconCenterX + iconHalfWidth, lineY);
			canvasRenderingContext.stroke();
		}
	}

	//==============================================================================
	// 좌표가 사각형 내부인지 (메뉴 버튼 hit 등 공통 사용).
	//==============================================================================
	/**
	 * @param { { x: number, y: number } } viewInputPosition
	 * @param { { x: number, y: number, width: number, height: number } } rect
	 * @returns { boolean }
	 */
	isInsideRect(viewInputPosition, rect) {
		const insideX = viewInputPosition.x >= rect.x && viewInputPosition.x <= rect.x + rect.width;
		const insideY = viewInputPosition.y >= rect.y && viewInputPosition.y <= rect.y + rect.height;
		return insideX && insideY;
	}

	//==============================================================================
	// 미니게임 팝업 사각 영역 계산.
	// 세로 800 기준에 가로는 뷰 폭 전체를 사용하는 늘여붙이기 방식.
	//==============================================================================
	/**
	 * @param { Vector2 } viewSize
	 * @returns { { x: number, y: number, width: number, height: number } }
	 */
	computeMinigamePopupRect(viewSize) {
		return { x: 0, y: 0, width: viewSize.x, height: viewSize.y };
	}

	//==============================================================================
	// 활성 파트 식별자 설정. 전환 시 대상 파트를 처음 상태로 reset.
	// 외부 메뉴/내비게이션 또는 키 1/2/3 핸들러 / 노벨 종료 자동 전환에서 호출.
	//==============================================================================
	/**
	 * @param { string } partKey
	 */
	setActivePartKey(partKey) {
		this.#activePartKey = partKey;
		if (partKey === PartKey.dialogue) {
			this.#dialoguePart.reset();
		}
		else if (partKey === PartKey.battle) {
			this.#battlePart.reset();
		}
		else if (partKey === PartKey.merge) {
			this.#mergeGame.reset();
		}
		else if (partKey === PartKey.map) {
			this.#mapPart.reset();
		}
		else if (partKey === PartKey.dungeon) {
			this.#dungeonPart.reset();
		}
	}

	//==============================================================================
	// 이후 출력.
	//==============================================================================
	/**
	 * @override
	 * @param { Graphic } graphic
	 */
	postDraw(graphic) {
		super.postDraw(graphic);

		// FPS 표시 (좌측 상단).
		this.drawFramePerSecond(graphic);

		const canvasRenderingContext = graphic.getCanvasRenderingContext();
		const viewManager = engine.getViewManager();
		const canvasNativeSize = viewManager.getCanvasNativeSize();
		const viewSize = viewManager.getViewSize();

		// 전체 화면 칠하기.
		// viewManager.applyCanvasNativeRect(canvasRenderingContext);
		// graphic.setFillColor(Colors.darkVanilla);
		// graphic.drawRect(Rect.create(0, 0, canvasNativeSize.x, canvasNativeSize.y));

		// 개발자 도구 패널 출력 (항상 최상단).
		this.#devtools.draw(graphic);
	}

	//==============================================================================
	// 로딩 중 출력. (엔진이 isLoaded() === false 인 동안 이 메서드만 호출함)
	//==============================================================================
	/**
	 * @override
	 * @param { Graphic } graphic
	 */
	drawOnLoad(graphic) {
		super.drawOnLoad(graphic);

		const engine = this.getEngine();
		const canvasRenderingContext = graphic.getCanvasRenderingContext();
		const viewManager = engine.getViewManager();
		const canvasNativeSize = viewManager.getCanvasNativeSize();
		const viewSize = viewManager.getViewSize();

		// 전체 화면 칠하기.
		viewManager.applyCanvasNativeRect(canvasRenderingContext);
		graphic.setFillColor(Color.black());
		graphic.drawRect(Rect.create(0, 0, canvasNativeSize.x, canvasNativeSize.y));

		// 게임 영역 칠하기.
		viewManager.applyViewRect(canvasRenderingContext);
		graphic.setFillColor(Color.black());
		graphic.drawRect(Rect.create(0, 0, viewSize.x, viewSize.y));

		this.drawLoadingScreen(graphic);
	}

	//==============================================================================
	// 로딩 화면 출력.
	//==============================================================================
	/**
	 * @param { Graphic } graphic
	 */
	drawLoadingScreen(graphic) {
		const canvasRenderingContext = graphic.getCanvasRenderingContext();
		const engine = this.getEngine();
		const viewManager = engine.getViewManager();
		const viewSize = viewManager.getViewSize();

		// 검은 배경.
		canvasRenderingContext.fillStyle = "#000000";
		canvasRenderingContext.fillRect(0, 0, viewSize.x, viewSize.y);

		const progress = this.#totalAssetCount > 0 ? this.#loadedAssetCount / this.#totalAssetCount : 0;

		const barWidth = 500;
		const barHeight = 20;
		const barX = (viewSize.x - barWidth) / 2;
		const barY = viewSize.y / 2 + 40;

		// 초기 0/N 과도기에는 로딩바/텍스트를 모두 숨김.
		if (this.#loadedAssetCount > 0) {
			// 로딩바 배경.
			canvasRenderingContext.fillStyle = "#333333";
			canvasRenderingContext.fillRect(barX, barY, barWidth, barHeight);

			// 로딩바 채우기.
			canvasRenderingContext.fillStyle = "#ffffff";
			const filledWidth = barWidth * progress;
			canvasRenderingContext.fillRect(barX, barY, filledWidth, barHeight);

			// 진행률 텍스트.
			canvasRenderingContext.fillStyle = "#aaaaaa";
			canvasRenderingContext.font = "16px sans-serif";
			canvasRenderingContext.textAlign = "center";
			canvasRenderingContext.textBaseline = "middle";
			const progressText = `${this.#loadedAssetCount} / ${this.#totalAssetCount}`;
			canvasRenderingContext.fillText(progressText, viewSize.x / 2, barY - 20);

			// 현재 로딩 중인 리소스 경로.
			canvasRenderingContext.fillStyle = "#666666";
			canvasRenderingContext.font = "12px sans-serif";
			canvasRenderingContext.fillText(this.#loadingAssetPath, viewSize.x / 2, barY + barHeight + 20);
		}
	}

	//==============================================================================
	// FPS 표시 (좌측 상단 오버레이). 30미만 빨강, 30~50 노랑, 50이상 초록.
	//==============================================================================
	/**
	 * @param { Graphic } graphic
	 */
	drawFramePerSecond(graphic) {
		if (!this.#devtools || !this.#devtools.isFramePerSecondVisible()) {
			return;
		}
		const engine = this.getEngine();
		if (!engine) {
			return;
		}
		const timeManager = engine.getTimeManager();
		if (!timeManager) {
			return;
		}
		const canvasRenderingContext = graphic.getCanvasRenderingContext();
		if (!canvasRenderingContext) {
			return;
		}

		const framePerSecond = timeManager.getFramePerSecond();
		const displayText = `FPS ${framePerSecond}`;

		const boxPaddingX = 10;
		const boxPaddingY = 4;
		const boxMarginX = 12;
		const boxMarginY = 12;
		const boxCornerRadius = 6;
		const fontSize = 18;

		canvasRenderingContext.save();
		canvasRenderingContext.font = `bold ${fontSize}px monospace`;
		canvasRenderingContext.textAlign = "left";
		canvasRenderingContext.textBaseline = "top";
		const textMetrics = canvasRenderingContext.measureText(displayText);
		const boxWidth = textMetrics.width + boxPaddingX * 2;
		const boxHeight = fontSize + boxPaddingY * 2;
		const boxX = boxMarginX;
		const boxY = boxMarginY;

		// 배경 라운드 박스.
		canvasRenderingContext.fillStyle = "rgba(0, 0, 0, 0.6)";
		canvasRenderingContext.beginPath();
		canvasRenderingContext.moveTo(boxX + boxCornerRadius, boxY);
		canvasRenderingContext.lineTo(boxX + boxWidth - boxCornerRadius, boxY);
		canvasRenderingContext.quadraticCurveTo(boxX + boxWidth, boxY, boxX + boxWidth, boxY + boxCornerRadius);
		canvasRenderingContext.lineTo(boxX + boxWidth, boxY + boxHeight - boxCornerRadius);
		canvasRenderingContext.quadraticCurveTo(boxX + boxWidth, boxY + boxHeight, boxX + boxWidth - boxCornerRadius, boxY + boxHeight);
		canvasRenderingContext.lineTo(boxX + boxCornerRadius, boxY + boxHeight);
		canvasRenderingContext.quadraticCurveTo(boxX, boxY + boxHeight, boxX, boxY + boxHeight - boxCornerRadius);
		canvasRenderingContext.lineTo(boxX, boxY + boxCornerRadius);
		canvasRenderingContext.quadraticCurveTo(boxX, boxY, boxX + boxCornerRadius, boxY);
		canvasRenderingContext.closePath();
		canvasRenderingContext.fill();

		// 성능별 텍스트 색상 (60 이상 초록, 30~59 노랑, 30 미만 빨강).
		let textColor = "#7fff7f";
		if (framePerSecond < 30) {
			textColor = "#ff6060";
		}
		else if (framePerSecond < 50) {
			textColor = "#ffcc55";
		}
		canvasRenderingContext.fillStyle = textColor;
		canvasRenderingContext.fillText(displayText, boxX + boxPaddingX, boxY + boxPaddingY);

		canvasRenderingContext.restore();
	}

	//==============================================================================
	// 이미지 불러오기 예약.
	//==============================================================================
	/**
	 * @param { number } imageId
	 * @param { string } assetPath
	 */
	loadImageAsset(imageId, assetPath) {
		if (typeof imageId === "string") {
			imageId = Number.parseInt(imageId);
		}
		this.#pendingImageLoads.push({ id: imageId, path: assetPath });
		++this.#totalAssetCount;
	}

	//==============================================================================
	// 불러온 이미지 반환.
	//==============================================================================
	/**
	 * @param { number } imageId
	 * @returns { ImageAsset }
	 */
	getLoadedImageAsset(imageId) {
		// 루프를 돌면 문자열로 넘어올 수 있으므로 문자열일 경우 정수로 변환.
		if (typeof imageId === "string") {
			imageId = Number.parseInt(imageId);
		}
		const loadedImageAsset = this.#loadedImageAssets.get(imageId);
		return loadedImageAsset;
	}

	//==============================================================================
	// 오디오 불러오기 예약.
	//==============================================================================
	/**
	 * @param { number } audioId
	 * @param { string } assetPath
	 */
	loadAudioAsset(audioId, assetPath) {
		if (typeof audioId === "string") {
			audioId = Number.parseInt(audioId);
		}
		this.#pendingAudioLoads.push({ id: audioId, path: assetPath });
		++this.#totalAssetCount;
	}

	//==============================================================================
	// 불러온 오디오 반환.
	//==============================================================================
	/**
	 * @param { number } audioId
	 * @returns { AudioAsset }
	 */
	getLoadedAudioAsset(audioId) {
		// 루프를 돌면 문자열로 넘어올 수 있으므로 문자열일 경우 정수로 변환.
		if (typeof audioId === "string") {
			audioId = Number.parseInt(audioId);
		}
		const loadedAudioAsset = this.#loadedAudioAssets.get(audioId);
		return loadedAudioAsset;
	}

	//==============================================================================
	// 폰트 불러오기 예약.
	//==============================================================================
	/**
	 * @param { number } fontId
	 * @param { string } fontName
	 * @param { string } assetPath
	 */
	loadFontAsset(fontId, fontName, assetPath) {
		if (typeof fontId === "string") {
			fontId = Number.parseInt(fontId);
		}
		this.#pendingFontLoads.push({ id: fontId, name: fontName, path: assetPath });
		++this.#totalAssetCount;
	}

	//==============================================================================
	// 불러온 폰트 반환.
	//==============================================================================
	/**
	 * @param { number } fontId
	 * @returns { FontAsset }
	 */
	getLoadedFontAsset(fontId) {
		// 루프를 돌면 문자열로 넘어올 수 있으므로 문자열일 경우 정수로 변환.
		if (typeof fontId === "string") {
			fontId = Number.parseInt(fontId);
		}
		const loadedFontAsset = this.#loadedFontAssets.get(fontId);
		return loadedFontAsset;
	}

	//==============================================================================
	// JSON 불러오기 예약.
	//==============================================================================
	/**
	 * @param { number } jsonId
	 * @param { string } assetPath
	 */
	loadJsonAsset(jsonId, assetPath) {
		if (typeof jsonId === "string") {
			jsonId = Number.parseInt(jsonId);
		}
		this.#pendingJsonLoads.push({ id: jsonId, path: assetPath });
		++this.#totalAssetCount;
	}

	//==============================================================================
	// 불러온 JSON 반환.
	//==============================================================================
	/**
	 * @param { number } jsonId
	 * @returns { JsonAsset }
	 */
	getLoadedJsonAsset(jsonId) {
		if (typeof jsonId === "string") {
			jsonId = Number.parseInt(jsonId);
		}
		const loadedJsonAsset = this.#loadedJsonAssets.get(jsonId);
		return loadedJsonAsset;
	}

	//==============================================================================
	// 예약된 모든 리소스를 순차적으로 로드.
	//==============================================================================
	async loadAllAssets() {
		for (const pendingImage of this.#pendingImageLoads) {
			this.#loadingAssetPath = pendingImage.path;
			const imageAsset = new ImageAsset();
			await imageAsset.load(pendingImage.path);
			this.#loadedImageAssets.set(pendingImage.id, imageAsset);
			++this.#loadedAssetCount;
		}
		for (const pendingAudio of this.#pendingAudioLoads) {
			this.#loadingAssetPath = pendingAudio.path;
			const audioAsset = new AudioAsset();
			await audioAsset.load(pendingAudio.path);
			this.#loadedAudioAssets.set(pendingAudio.id, audioAsset);
			++this.#loadedAssetCount;
		}
		for (const pendingFont of this.#pendingFontLoads) {
			this.#loadingAssetPath = pendingFont.path;
			const fontAsset = new FontAsset();
			await fontAsset.loadFont(pendingFont.name, pendingFont.path);
			this.#loadedFontAssets.set(pendingFont.id, fontAsset);
			++this.#loadedAssetCount;
		}
		for (const pendingJson of this.#pendingJsonLoads) {
			this.#loadingAssetPath = pendingJson.path;
			const jsonAsset = new JsonAsset();
			await jsonAsset.load(pendingJson.path);
			this.#loadedJsonAssets.set(pendingJson.id, jsonAsset);
			++this.#loadedAssetCount;
		}
		this.#pendingImageLoads = [];
		this.#pendingAudioLoads = [];
		this.#pendingFontLoads = [];
		this.#pendingJsonLoads = [];
	}

	//==============================================================================
	// 하이어라키가 입력을 소비 중인지 반환.
	//==============================================================================
	/**
	 * @returns { boolean }
	 */
	isHierarchyCapturingInput() {
		return this.#devtools.isVisible() && this.#devtools.isPointerInsidePanel();
	}
}



// 엔진 설정.
const engineConfiguration = new EngineConfiguration();
engineConfiguration.canvasId = "mainCanvas";
engineConfiguration.useStatistics = false;
engineConfiguration.referenceResolutionSize = Vector2.create(1280, 800);
engineConfiguration.autoResizeOnWindowResize = true;
engineConfiguration.title = "Tales Of Cultivation";
const talesOfCultivation = new TalesOfCultivation();
const engine = new Engine(engineConfiguration);
engine.run(talesOfCultivation);

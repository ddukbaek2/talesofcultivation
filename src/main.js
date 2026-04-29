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
import { MenuPartNode } from "./part/menupartnode.js";
import { DungeonPart } from "./part/dungeonpart.js";
import { TitlePart } from "./part/titlepart.js";
import { SavePart } from "./part/savepart.js";
import { StoryBranchPart } from "./part/storybranchpart.js";
import { GameOverPart } from "./part/gameoverpart.js";
import { AudioBeepPlayer } from "./base/audiobeepplayer.js";
import { setActiveInputMode, drawInputHintBadge, isActionPressed, InputAction } from "./base/inputhint.js";
import { loadUserSettings } from "./base/usersettings.js";


//==============================================================================
// 활성 파트 식별자.
//==============================================================================
const PartKey = System.Object.freeze({
	title: "title",
	dialogue: "dialogue",
	battle: "battle",
	merge: "merge",
	map: "map",
	dungeon: "dungeon",
	storyBranch: "storyBranch",
	gameOver: "gameOver",
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
	/** @private @type { MenuPartNode } */ #menuPart;
	/** @private @type { DungeonPart } */ #dungeonPart;
	/** @private @type { TitlePart } */ #titlePart;
	/** @private @type { SavePart } */ #savePart;
	/** @private @type { StoryBranchPart } */ #storyBranchPart;
	/** @private @type { GameOverPart } */ #gameOverPart;
	/** @private @type { boolean } */ #prevIsKeyT;
	/** @private @type { boolean } */ #prevIsKeyEscapeMenu;
	/** @private @type { string } */ #partKeyBeforeStoryBranch;
	/** @private @type { AudioBeepPlayer } */ #audioBeepPlayer;
	/** @private @type { string } */ #activePartKey;
	/** @private @type { boolean } */ #prevIsKey1;
	/** @private @type { boolean } */ #prevIsKey2;
	/** @private @type { boolean } */ #prevIsKey3;
	/** @private @type { boolean } */ #prevIsKey4;
	/** @private @type { boolean } */ #prevIsKey5;
	/** @private @type { boolean } */ #prevIsKeyP;
	/** @private @type { boolean } */ #isMenuOverlayVisible;
	/** @private @type { boolean } */ #isSaveOverlayVisible;
	/** @private @type { boolean } */ #prevIsTouchPressed;
	/** @private @type { { x: number, y: number, width: number, height: number } | null } */ #menuButtonRect;
	/** @private @type { boolean } */ #isTouchDevice;

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
		// 사용자 설정 (localStorage) 을 가장 먼저 불러온다 — 이후 MenuPart 생성 시 즉시 반영되도록.
		loadUserSettings();
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
		// 파트 (팝업으로 표시됨). 게임 시작은 타이틀 파트.
		// 타이틀의 시작 버튼 → 대사 파트, 대사 끝나면 자동으로 전투 파트.
		// 키 1~5 또는 setActivePartKey 로 강제 전환 가능 (1: 대사, 2: 전투, 3: 머지, 4: 맵, 5: 던전).
		// P 키: 플레이어 정보창 오버레이 토글 (기저 파트 위에 덮임).
		this.#mergeGame = new MergeGame();
		this.#battlePart = new BattlePart();
		this.#dialoguePart = new DialoguePart();
		this.#mapPart = new MapPart();
		this.#menuPart = new MenuPartNode();
		this.#dungeonPart = new DungeonPart();
		this.#titlePart = new TitlePart();
		this.#savePart = new SavePart();
		this.#storyBranchPart = new StoryBranchPart();
		this.#gameOverPart = new GameOverPart();
		this.#prevIsKeyT = false;
		this.#prevIsKeyEscapeMenu = false;
		this.#partKeyBeforeStoryBranch = PartKey.battle;
		this.#audioBeepPlayer = null;
		this.#activePartKey = PartKey.title;
		this.#prevIsKey1 = false;
		this.#prevIsKey2 = false;
		this.#prevIsKey3 = false;
		this.#prevIsKey4 = false;
		this.#prevIsKey5 = false;
		this.#prevIsKeyP = false;
		this.#isMenuOverlayVisible = false;
		this.#isSaveOverlayVisible = false;
		this.#prevIsTouchPressed = false;
		this.#menuButtonRect = null;
		// 터치 가능 장치 여부 (한 번만 감지). 게임패드는 매 프레임 폴링.
		const navigatorReference = System.navigator;
		const hasOnTouchStart = typeof window !== "undefined" && "ontouchstart" in window;
		const hasMaxTouchPoints = navigatorReference && typeof navigatorReference.maxTouchPoints === "number" && navigatorReference.maxTouchPoints > 0;
		this.#isTouchDevice = hasOnTouchStart || hasMaxTouchPoints;

		// Xbox 컨트롤러의 Menu(OPTIONS) 버튼이 일부 환경에서 키보드 F11 으로도 변환되어
		// 브라우저 기본 풀스크린이 동시에 발화하는 문제 방지. capture 단계에서 차단해
		// 엔진의 keydown 핸들러나 브라우저 기본 동작이 F11 을 처리하지 못하게 한다.
		if (typeof window !== "undefined") {
			window.addEventListener("keydown", (keyboardEvent) => {
				if (keyboardEvent.code === "F11") {
					keyboardEvent.preventDefault();
					keyboardEvent.stopPropagation();
				}
			}, true);
		}
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
		this.#menuPart.setAudioBeepPlayer(this.#audioBeepPlayer);
		this.#dungeonPart.setAudioBeepPlayer(this.#audioBeepPlayer);
		this.#titlePart.setAudioBeepPlayer(this.#audioBeepPlayer);
		this.#savePart.setAudioBeepPlayer(this.#audioBeepPlayer);
		this.#storyBranchPart.setAudioBeepPlayer(this.#audioBeepPlayer);
		this.#gameOverPart.setAudioBeepPlayer(this.#audioBeepPlayer);

		// 대사 테이블 주입 (인트로 장면은 미리 추출만 해두고, 타이틀의 시작 버튼 → 대사 파트 진입 시 재생).
		const dialogueTableAsset = this.getLoadedJsonAsset(JsonId.dialogueTable);
		if (dialogueTableAsset && System.Array.isArray(dialogueTableAsset.data)) {
			this.#dialoguePart.setDialogues(dialogueTableAsset.data);
			this.#dialoguePart.playScene("intro");
		}

		// 타이틀 시작 버튼 → 인트로 대사 파트로 전환. 시작 클릭이 첫 사용자 제스처가 되어
		// AudioContext 가 깨어나므로 대사 파트의 첫 입력 대기는 건너뛴다.
		this.#titlePart.setOnStart(() => {
			this.#dialoguePart.playScene("intro");
			this.#dialoguePart.markFirstInputReceived();
			this.setActivePartKey(PartKey.dialogue);
		});

		// SavePart 슬롯 선택 — 임시 (실제 저장/로드 로직은 PlayerProfile 시스템 도입 후 연결).
		// 슬롯 처리 후엔 SavePart 오버레이 닫기.
		this.#savePart.setOnSlotSelected((slot, mode) => {
			this.#isSaveOverlayVisible = false;
		});

		// SavePart 닫기 (X 버튼 / 취소 액션) → SavePart 오버레이만 닫음 (메뉴는 그대로).
		this.#savePart.setOnClose(() => {
			this.#isSaveOverlayVisible = false;
		});

		// StoryBranchPart 의 닫기 (X 버튼 / 취소 액션) → 진입 시점 파트로 복귀.
		this.#storyBranchPart.setOnClose(() => {
			this.setActivePartKey(this.#partKeyBeforeStoryBranch);
		});

		// GameOverPart 메뉴.
		this.#gameOverPart.setOnSaveLoadSelected(() => {
			this.#savePart.setMode("load");
			this.#savePart.reset();
			this.#isSaveOverlayVisible = true;
		});
		this.#gameOverPart.setOnTitleSelected(() => {
			this.setActivePartKey(PartKey.title);
		});

		// 패배 → 패배 대사 → 게임오버 파트.
		this.#battlePart.setOnPlayerDefeated(() => {
			this.#dialoguePart.playScene("defeat");
			this.#dialoguePart.markFirstInputReceived();
			this.setActivePartKey(PartKey.dialogue);
		});

		// MenuPart 설정 탭 액션 — 저장 / 불러오기 / 처음으로 라우팅.
		// 저장 / 불러오기는 메뉴를 닫지 않고 메뉴 위에 별개 레이어로 SavePart 오버레이를 띄움.
		this.#menuPart.setOnSettingActionInvoked((settingKey) => {
			if (settingKey === "save" || settingKey === "load") {
				this.#savePart.setMode(settingKey === "save" ? "save" : "load");
				this.#savePart.reset();
				this.#isSaveOverlayVisible = true;
			}
			else if (settingKey === "restart") {
				this.#isMenuOverlayVisible = false;
				this.#isSaveOverlayVisible = false;
				this.setActivePartKey(PartKey.title);
			}
		});

		// StoryBranchPart 의 씬 이동 콜백 (분기점에서 "이동" 클릭).
		this.#storyBranchPart.setOnSceneVisited((scene) => {
			// 임시 — 실제 씬 진입 라우팅은 추후. 우선 분기점 닫고 전투로 복귀.
			this.setActivePartKey(PartKey.battle);
		});
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
		// 메뉴 액션은 활성 입력 모드에 따라 자동 매핑 (키보드 ESC / 게임패드 OPTIONS).
		const isMenuActionActive = isActionPressed(inputManager, InputAction.menu);
		const isKeyT = inputManager.isKeyPressed("KeyT");
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
		if (isMenuActionActive && !this.#prevIsKeyP) {
			// 세이브 오버레이가 떠 있으면 메뉴 액션은 세이브 오버레이만 닫음.
			if (this.#isSaveOverlayVisible) {
				this.#isSaveOverlayVisible = false;
			}
			else {
				this.#isMenuOverlayVisible = !this.#isMenuOverlayVisible;
				if (this.#isMenuOverlayVisible) {
					this.#menuPart.reset();
				}
			}
		}
		// T 키로 분기점 뷰 토글 — 전투 / 맵 / 대사 등 일반 파트에서만 동작.
		if (isKeyT && !this.#prevIsKeyT && this.canOpenStoryBranchView()) {
			if (this.#activePartKey === PartKey.storyBranch) {
				this.setActivePartKey(this.#partKeyBeforeStoryBranch);
			}
			else {
				this.#partKeyBeforeStoryBranch = this.#activePartKey;
				this.setActivePartKey(PartKey.storyBranch);
			}
		}
		this.#prevIsKey1 = isKey1;
		this.#prevIsKey2 = isKey2;
		this.#prevIsKey3 = isKey3;
		this.#prevIsKey4 = isKey4;
		this.#prevIsKey5 = isKey5;
		this.#prevIsKeyP = isMenuActionActive;
		this.#prevIsKeyT = isKeyT;

		// 입력 모드를 inputhint 모듈에 매 프레임 전파 (모든 파트의 버튼 힌트가 이 값에 따라 갱신됨).
		setActiveInputMode(this.detectInputMode());

		// 우상단 메뉴 버튼 hit 검사 (모든 파트보다 우선). 클릭이 메뉴에서 소비되면 기저 파트로 전달하지 않음.
		// 플레이어 오버레이가 떠 있으면 기저 파트는 입력을 받지 않고, 오버레이가 입력을 독점한다.
		let consumedByMenuButton = false;
		if (!this.isHierarchyCapturingInput()) {
			const isTouchPressed = inputManager.isTouchPressed();
			if (isTouchPressed && !this.#prevIsTouchPressed) {
				const viewInputPosition = inputManager.getViewInputPosition();
				if (this.#menuButtonRect && this.isInsideRect(viewInputPosition, this.#menuButtonRect)) {
					// 세이브 오버레이가 떠 있으면 메뉴 버튼 클릭으로는 동작하지 않음 (세이브가 우선 닫혀야 함).
					if (!this.#isSaveOverlayVisible) {
						this.#isMenuOverlayVisible = !this.#isMenuOverlayVisible;
						if (this.#isMenuOverlayVisible) {
							this.#menuPart.reset();
						}
						if (this.#audioBeepPlayer) {
							this.#audioBeepPlayer.playClick();
						}
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
			// 입력 우선순위: 세이브 오버레이 > 메뉴 오버레이 > 활성 파트.
			if (this.#isSaveOverlayVisible) {
				this.#savePart.tick(timeDelta, inputManager, popupRect);
			}
			else if (this.#isMenuOverlayVisible) {
				this.#menuPart.tick(timeDelta, inputManager, popupRect);
			}
			else if (this.#activePartKey === PartKey.title) {
				this.#titlePart.tick(timeDelta, inputManager, popupRect);
			}
			else if (this.#activePartKey === PartKey.dialogue) {
				this.#dialoguePart.tick(timeDelta, inputManager, popupRect);
				if (this.#dialoguePart.isFinished()) {
					// 끝난 씬에 따른 라우팅: 패배 씬 끝나면 게임오버, 그 외엔 전투.
					const finishedSceneName = this.#dialoguePart.getCurrentScene();
					if (finishedSceneName === "defeat") {
						this.setActivePartKey(PartKey.gameOver);
					}
					else {
						this.setActivePartKey(PartKey.battle);
					}
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
			else if (this.#activePartKey === PartKey.storyBranch) {
				this.#storyBranchPart.tick(timeDelta, inputManager, popupRect);
			}
			else if (this.#activePartKey === PartKey.gameOver) {
				this.#gameOverPart.tick(timeDelta, inputManager, popupRect);
			}
		}
	}

	//==============================================================================
	// 분기점 뷰 토글 가능 여부 (타이틀 / 게임오버 / 세이브 화면에서는 비허용).
	//==============================================================================
	/**
	 * @returns { boolean }
	 */
	canOpenStoryBranchView() {
		if (this.#activePartKey === PartKey.title) {
			return false;
		}
		if (this.#activePartKey === PartKey.gameOver) {
			return false;
		}
		// 세이브 오버레이가 떠 있는 동안에는 분기점 토글 비허용.
		if (this.#isSaveOverlayVisible) {
			return false;
		}
		return true;
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
		if (this.#activePartKey === PartKey.title) {
			this.#titlePart.draw(graphic, popupRect);
		}
		else if (this.#activePartKey === PartKey.dialogue) {
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
		else if (this.#activePartKey === PartKey.storyBranch) {
			this.#storyBranchPart.draw(graphic, popupRect);
		}
		else if (this.#activePartKey === PartKey.gameOver) {
			this.#gameOverPart.draw(graphic, popupRect);
		}

		// 메뉴 오버레이 (기저 파트 위에 어두운 백드롭 + MenuPart 출력).
		if (this.#isMenuOverlayVisible) {
			canvasRenderingContext.fillStyle = "rgba(0, 0, 0, 0.55)";
			canvasRenderingContext.fillRect(popupRect.x, popupRect.y, popupRect.width, popupRect.height);
			this.#menuPart.draw(graphic, popupRect);
		}

		// 세이브 / 로드 오버레이 (메뉴 위에 또 다른 백드롭 + SavePart 출력).
		if (this.#isSaveOverlayVisible) {
			canvasRenderingContext.fillStyle = "rgba(0, 0, 0, 0.55)";
			canvasRenderingContext.fillRect(popupRect.x, popupRect.y, popupRect.width, popupRect.height);
			this.#savePart.draw(graphic, popupRect);
		}

		// 메뉴 바 (오버레이보다도 위에 그려서 항상 클릭 가능).
		this.drawMenuBar(canvasRenderingContext, popupRect);
	}

	//==============================================================================
	// 우상단 메뉴 바 출력 + hit 영역 갱신.
	// - 우측: 메뉴 버튼 (MenuPart 오버레이 토글, ESC 키와 동일).
	// - 좌측: 입력 모드 표시 (게임패드 / 키보드 / 터치). 표시 전용, 클릭 동작 없음.
	//==============================================================================
	/**
	 * @param { CanvasRenderingContext2D } canvasRenderingContext
	 * @param { { x: number, y: number, width: number, height: number } } popupRect
	 */
	drawMenuBar(canvasRenderingContext, popupRect) {
		const buttonSize = 40;
		const buttonMargin = 12;
		const buttonGap = 10;
		const menuButtonX = popupRect.x + popupRect.width - buttonSize - buttonMargin;
		const menuButtonY = popupRect.y + buttonMargin;
		const inputModeX = menuButtonX - buttonSize - buttonGap;
		const inputModeY = menuButtonY;
		this.#menuButtonRect = { x: menuButtonX, y: menuButtonY, width: buttonSize, height: buttonSize };

		// 입력 모드 아이콘 (좌).
		const inputMode = this.detectInputMode();
		this.drawInputModeIcon(canvasRenderingContext, inputMode, inputModeX, inputModeY, buttonSize);

		// 메뉴 버튼 (우).
		const isOpen = this.#isMenuOverlayVisible;
		canvasRenderingContext.fillStyle = isOpen ? "#3a2a55" : "#1a2240";
		canvasRenderingContext.fillRect(menuButtonX, menuButtonY, buttonSize, buttonSize);
		canvasRenderingContext.strokeStyle = "#d4b46a";
		canvasRenderingContext.lineWidth = 2;
		canvasRenderingContext.strokeRect(menuButtonX, menuButtonY, buttonSize, buttonSize);

		// 햄버거 아이콘 (3줄).
		canvasRenderingContext.strokeStyle = isOpen ? "#ffeecc" : "#ffffff";
		canvasRenderingContext.lineWidth = 2;
		const iconCenterX = menuButtonX + buttonSize * 0.5;
		const iconCenterY = menuButtonY + buttonSize * 0.5;
		const iconHalfWidth = buttonSize * 0.28;
		const iconLineGap = 6;
		for (let lineIndex = -1; lineIndex <= 1; ++lineIndex) {
			const lineY = iconCenterY + lineIndex * iconLineGap;
			canvasRenderingContext.beginPath();
			canvasRenderingContext.moveTo(iconCenterX - iconHalfWidth, lineY);
			canvasRenderingContext.lineTo(iconCenterX + iconHalfWidth, lineY);
			canvasRenderingContext.stroke();
		}

		// 입력 모드 힌트 배지 (메뉴 버튼 좌측하단 외곽).
		drawInputHintBadge(canvasRenderingContext, InputAction.menu, menuButtonX, menuButtonY + buttonSize);
	}

	//==============================================================================
	// 현재 활성 입력 모드 감지.
	// - 게임패드 1개 이상 연결되어 있으면 "gamepad".
	// - 그 외 터치 가능 장치면 "touch".
	// - 그 외(데스크탑 등) 면 "keyboard".
	//
	// 브라우저는 보안상 gamepadconnected 이벤트를 게임패드의 첫 입력 시점에서야 발화시키므로,
	// 패드만 꽂혀 있고 입력이 없는 상태에서도 인지할 수 있도록 매 프레임 navigator.getGamepads()
	// 를 직접 폴링하여 새 패드를 GamepadManager 에 등록한다.
	//==============================================================================
	/**
	 * @returns { string }
	 */
	detectInputMode() {
		const engine = this.getEngine();
		const inputManager = engine ? engine.getInputManager() : null;
		const gamepadManager = inputManager ? inputManager.getGamepadManager() : null;

		// (1) 이미 등록된 패드가 있으면 즉시 게임패드 모드.
		if (gamepadManager && gamepadManager.getConnectedGamepadCount() > 0) {
			return "gamepad";
		}

		// (2) 폴링 — navigator.getGamepads() 를 직접 조회해 미등록 패드를 잡아 등록.
		// 일부 브라우저는 connected 플래그를 안 채우거나 false 로 두는 경우가 있어,
		// 객체가 존재하고 id 문자열이 비어 있지 않으면 유효한 패드로 간주한다.
		if (System.navigator && typeof System.navigator.getGamepads === "function") {
			const polledGamepads = System.navigator.getGamepads();
			if (polledGamepads) {
				for (let polledIndex = 0; polledIndex < polledGamepads.length; ++polledIndex) {
					const polledGamepad = polledGamepads[polledIndex];
					if (polledGamepad === null || polledGamepad === undefined) {
						continue;
					}
					const hasIdentifier = typeof polledGamepad.id === "string" && polledGamepad.id.length > 0;
					if (polledGamepad.connected || hasIdentifier) {
						if (gamepadManager) {
							gamepadManager.connect(polledGamepad);
						}
						return "gamepad";
					}
				}
			}
		}

		if (this.#isTouchDevice) {
			return "touch";
		}
		return "keyboard";
	}

	//==============================================================================
	// 입력 모드 아이콘 출력 (게임패드 / 키보드 / 터치).
	//==============================================================================
	/**
	 * @param { CanvasRenderingContext2D } canvasRenderingContext
	 * @param { string } inputMode
	 * @param { number } x
	 * @param { number } y
	 * @param { number } size
	 */
	drawInputModeIcon(canvasRenderingContext, inputMode, x, y, size) {
		// 원형 배지 (클릭 가능한 버튼처럼 보이지 않도록 사각이 아닌 원으로).
		const centerX = x + size * 0.5;
		const centerY = y + size * 0.5;
		const badgeRadius = size * 0.5;
		canvasRenderingContext.fillStyle = "#1a2240";
		canvasRenderingContext.beginPath();
		canvasRenderingContext.arc(centerX, centerY, badgeRadius, 0, System.Math.PI * 2);
		canvasRenderingContext.fill();
		canvasRenderingContext.strokeStyle = "#d4b46a";
		canvasRenderingContext.lineWidth = 2;
		canvasRenderingContext.stroke();

		canvasRenderingContext.strokeStyle = "#ffffff";
		canvasRenderingContext.fillStyle = "#ffffff";
		canvasRenderingContext.lineWidth = 2;

		if (inputMode === "gamepad") {
			// 컨트롤러 본체 (가로로 긴 둥근 사각형) + 좌우 두 개의 원 (스틱).
			const bodyHalfWidth = size * 0.32;
			const bodyHalfHeight = size * 0.18;
			canvasRenderingContext.strokeRect(centerX - bodyHalfWidth, centerY - bodyHalfHeight, bodyHalfWidth * 2, bodyHalfHeight * 2);
			const stickRadius = size * 0.07;
			canvasRenderingContext.beginPath();
			canvasRenderingContext.arc(centerX - bodyHalfWidth * 0.55, centerY, stickRadius, 0, System.Math.PI * 2);
			canvasRenderingContext.fill();
			canvasRenderingContext.beginPath();
			canvasRenderingContext.arc(centerX + bodyHalfWidth * 0.55, centerY, stickRadius, 0, System.Math.PI * 2);
			canvasRenderingContext.fill();
		}
		else if (inputMode === "touch") {
			// 손가락 끝 + 터치 동심원.
			const fingerCenterY = centerY + size * 0.05;
			const fingerRadius = size * 0.1;
			canvasRenderingContext.beginPath();
			canvasRenderingContext.arc(centerX, fingerCenterY, fingerRadius, 0, System.Math.PI * 2);
			canvasRenderingContext.fill();
			// 터치 파동 호 2개.
			canvasRenderingContext.beginPath();
			canvasRenderingContext.arc(centerX, fingerCenterY, fingerRadius + 6, System.Math.PI * 1.15, System.Math.PI * 1.85);
			canvasRenderingContext.stroke();
			canvasRenderingContext.beginPath();
			canvasRenderingContext.arc(centerX, fingerCenterY, fingerRadius + 12, System.Math.PI * 1.2, System.Math.PI * 1.8);
			canvasRenderingContext.stroke();
		}
		else {
			// 키보드 — 가로 긴 사각형 + 3 행의 작은 키들.
			const bodyHalfWidth = size * 0.36;
			const bodyHalfHeight = size * 0.22;
			canvasRenderingContext.strokeRect(centerX - bodyHalfWidth, centerY - bodyHalfHeight, bodyHalfWidth * 2, bodyHalfHeight * 2);
			const keyRowGap = size * 0.1;
			const keyCellWidth = bodyHalfWidth * 2 / 5;
			canvasRenderingContext.lineWidth = 1.4;
			for (let rowIndex = -1; rowIndex <= 1; ++rowIndex) {
				const rowY = centerY + rowIndex * keyRowGap;
				for (let keyIndex = 0; keyIndex < 4; ++keyIndex) {
					const keyX = centerX - bodyHalfWidth + keyCellWidth * (keyIndex + 0.5);
					canvasRenderingContext.beginPath();
					canvasRenderingContext.moveTo(keyX - keyCellWidth * 0.3, rowY);
					canvasRenderingContext.lineTo(keyX + keyCellWidth * 0.3, rowY);
					canvasRenderingContext.stroke();
				}
			}
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
		if (partKey === PartKey.title) {
			this.#titlePart.reset();
		}
		else if (partKey === PartKey.dialogue) {
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
		else if (partKey === PartKey.storyBranch) {
			this.#storyBranchPart.reset();
		}
		else if (partKey === PartKey.gameOver) {
			this.#gameOverPart.reset();
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

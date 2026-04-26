//==============================================================================
// 포함 모듈 목록.
//==============================================================================
const System = globalThis;
import { Object } from "../../libs/vanilla.js/src/base/object.js";
import { AudioBeepPlayer } from "../base/audiobeepplayer.js";


//==============================================================================
// 상수 목록.
//==============================================================================
const DECK_SIZE = 20;
const STARTING_HAND_SIZE = 4;
const MAX_HAND_SIZE = 10;
const STARTING_HEALTH = 30;
const MAX_ENERGY = 5;
const STARTING_ACTION_POINT_CAP = 3;
const STARTING_ACTION_POINTS = 1;
const ACTION_POINT_GAIN_PER_TURN = 1;
const OPPONENT_TURN_DELAY = 1.0;
const ENTER_DURATION = 0.35;
const LOG_MAX_ENTRIES = 8;

// 카드 사용 3단계 애니메이션:
//   1) cast: 손에서 무대 중앙으로 (확대).
//   2) hold: 중앙에 머물며 발동 (펄스). 이 동안 캐릭터 인터랙션 표출.
//   3) discard: 중앙에서 무덤으로 (축소+페이드).
const CARD_CAST_DURATION = 0.25;
const CARD_HOLD_DURATION = 1.0;
const CARD_DISCARD_DURATION = 0.4;
const CARD_LIFE_DURATION = CARD_CAST_DURATION + CARD_HOLD_DURATION + CARD_DISCARD_DURATION;
const CARD_CAST_SCALE = 1.2;
const CARD_DISCARD_END_SCALE = 0.8;

// 발동 단계가 끝난 뒤(0.1초 여유) 다음 적 카드 진행. 카드들이 중앙에 겹쳐 보이지 않도록.
const OPPONENT_BETWEEN_CARDS_DELAY = CARD_LIFE_DURATION + 0.1;

// 무대 캐릭터 인터랙션.
const STAGE_ACTOR_PULSE_AMOUNT = 0.08;
const STAGE_TARGET_SHAKE_AMOUNT = 6;
const STAGE_TARGET_FLASH_PEAK = 0.5;

const SIDE_MARGIN = 16;
const PLAYER_CARD_WIDTH = 126;
const PLAYER_CARD_HEIGHT = 186;
const OPPONENT_CARD_WIDTH = 70;
const OPPONENT_CARD_HEIGHT = 96;
const OPPONENT_CARD_GAP = 8;
const SLOT_WIDTH = PLAYER_CARD_WIDTH;
const SLOT_HEIGHT = PLAYER_CARD_HEIGHT;
const PORTRAIT_WIDTH = 240;
const PORTRAIT_HEIGHT = 194;
const END_TURN_BUTTON_WIDTH = SLOT_WIDTH;
const END_TURN_BUTTON_HEIGHT = 40;
const HAND_BOTTOM_MARGIN = 20;
const PICKED_CARD_SCALE = 1.55;
const PICKED_CARD_LIFT = 40;
const SELECTION_TWEEN_SPEED = 8.0; // 1초당 0→1 8회 (≈0.125초). 큰 값일수록 빠르게.
const FLOATING_TEXT_DURATION = 0.9;
const FLOATING_TEXT_RISE = 60;

// 부채꼴 (플레이어 손패).
const FAN_ARC_RADIUS = 540;
const FAN_ANGLE_PER_CARD_DEG = 5;
const FAN_MAX_TOTAL_SPREAD_DEG = 60;

// 버프 아이콘.
const BUFF_ICON_SIZE = 22;
const BUFF_ICON_GAP = 4;
const BUFFS_PER_ROW = 6;

// 중앙 무대 (두 캐릭터 자리표시).
const STAGE_FIGURE_WIDTH = 120;
const STAGE_FIGURE_HEIGHT = 200;
const STAGE_FIGURE_GAP = 240;


//==============================================================================
// 룩업 기본값 (테이블이 주입되기 전, 또는 정의가 누락된 경우 fallback).
//==============================================================================
const DEFAULT_GRADE_COLOR = "#cccccc";
const DEFAULT_SECT_BACK_COLOR = "#3a3a55";
const DEFAULT_SECT_EMBLEM_COLOR = "#5a5a8a";


//==============================================================================
// 플레이어 진영.
//==============================================================================
const PlayerSide = System.Object.freeze({
	player: "player",
	opponent: "opponent",
});


//==============================================================================
// 단일 버프 / 디버프. id 는 bufftable.json 의 key, value 는 누적 강도.
//==============================================================================
class Buff extends Object {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @type { string } */ id;
	/** @type { number } */ value;

	//==============================================================================
	// 생성.
	//==============================================================================
	constructor(id, value) {
		super();
		this.id = id;
		this.value = value;
	}
}


//==============================================================================
// 화면 위로 떠오르며 사라지는 단일 텍스트. (피해 / 회복 / 방어 등 즉시 피드백)
//==============================================================================
class FloatingText extends Object {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @type { string } */ text;
	/** @type { string } */ color;
	/** @type { number } */ x;
	/** @type { number } */ y;
	/** @type { number } */ time;

	//==============================================================================
	// 생성.
	//==============================================================================
	constructor(text, color, x, y, time) {
		super();
		this.text = text;
		this.color = color;
		this.x = x;
		this.y = y;
		this.time = time;
	}
}


//==============================================================================
// 카드 인스턴스. cardId 는 외부 데이터 (cardtable.json) 의 카드 식별자.
//==============================================================================
class Card extends Object {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @type { number } */ id;
	/** @type { string } */ cardId;
	/** @type { number } */ enterTime;
	/** @type { number } */ selectionProgress;

	//==============================================================================
	// 생성.
	//==============================================================================
	constructor(id, cardId) {
		super();
		this.id = id;
		this.cardId = cardId;
		this.enterTime = 0;
		this.selectionProgress = 0;
	}
}


//==============================================================================
// 한 플레이어의 상태 (체력 / 영력 / 덱 / 핸드 / 무덤 / 버프 목록).
//==============================================================================
class PlayerState extends Object {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @type { string } */ side;
	/** @type { string } */ nickname;
	/** @type { string } */ stageName;
	/** @type { number } */ health;
	/** @type { number } */ maxHealth;
	/** @type { number } */ maxEnergy;
	/** @type { number } */ currentEnergy;
	/** @type { number } */ energyCap;
	/** @type { number } */ energyGainPerTurn;
	/** @type { number } */ actionPoints;
	/** @type { number } */ maxActionPoints;
	/** @type { number } */ actionPointCap;
	/** @type { number } */ actionPointGainPerTurn;
	/** @type { Card[] } */ deck;
	/** @type { Card[] } */ hand;
	/** @type { Card[] } */ discard;
	/** @type { Buff[] } */ buffs;

	//==============================================================================
	// 생성.
	//==============================================================================
	constructor(side) {
		super();
		this.side = side;
		this.nickname = "";
		this.stageName = "";
		this.health = STARTING_HEALTH;
		this.maxHealth = STARTING_HEALTH;
		this.maxEnergy = 0;
		this.currentEnergy = 0;
		this.energyCap = MAX_ENERGY;
		this.energyGainPerTurn = 1;
		this.actionPoints = 0;
		this.maxActionPoints = 0;
		this.actionPointCap = STARTING_ACTION_POINT_CAP;
		this.actionPointGainPerTurn = 1;
		this.deck = [];
		this.hand = [];
		this.discard = [];
		this.buffs = [];
	}
}


//==============================================================================
// 전투 파트 (BattlePart). 카드 배틀 진행 + 영력/버프/덱/무덤 관리.
//==============================================================================
export class BattlePart extends Object {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @private @type { Array | null } */ #cardDefinitions;
	/** @private @type { Array | null } */ #gradeDefinitions;
	/** @private @type { Array | null } */ #sectDefinitions;
	/** @private @type { Array | null } */ #buffDefinitions;
	/** @private @type { Array | null } */ #realmDefinitions;
	/** @private @type { Array | null } */ #characterDefinitions;
	/** @private @type { number } */ #playerCharacterId;
	/** @private @type { number } */ #opponentCharacterId;
	/** @private @type { PlayerState } */ #player;
	/** @private @type { PlayerState } */ #opponent;
	/** @private @type { string } */ #currentSide;
	/** @private @type { Array<{ card: Card, centerX: number, centerY: number, rotation: number, scale: number }> } */ #playerHandLayouts;
	/** @private @type { Array<{ x: number, y: number, width: number, height: number }> } */ #opponentCardLayouts;
	/** @private @type { Array<{ card: Card, layout: { x: number, y: number, width: number, height: number }, elapsed: number, actorSide: string, targetSide: string, isReveal: boolean }> } */ #playerExitingCards;
	/** @private @type { Array<{ card: Card, layout: { x: number, y: number, width: number, height: number }, elapsed: number, actorSide: string, targetSide: string, isReveal: boolean }> } */ #opponentExitingCards;
	/** @private @type { { x: number, y: number, width: number, height: number } | null } */ #endTurnButtonRect;
	/** @private @type { { x: number, y: number, width: number, height: number } | null } */ #abandonButtonRect;
	/** @private @type { { x: number, y: number, width: number, height: number } | null } */ #deckViewCloseRect;
	/** @private @type { { x: number, y: number, width: number, height: number } | null } */ #deckViewPanelRect;
	/** @private @type { boolean } */ #isDeckViewOpen;
	/** @private @type { string } */ #viewedPileTitle;
	/** @private @type { Card[] } */ #viewedPileCards;
	/** @private @type { number | null } */ #selectedCardId;
	/** @private @type { string } */ #endGameMessage;
	/** @private @type { number } */ #nextCardId;
	/** @private @type { number } */ #opponentTurnTime;
	/** @private @type { string[] } */ #log;
	/** @private @type { Array<{ buff: { id: string, value: number }, x: number, y: number, width: number, height: number }> } */ #playerBuffLayouts;
	/** @private @type { Array<{ buff: { id: string, value: number }, x: number, y: number, width: number, height: number }> } */ #opponentBuffLayouts;
	/** @private @type { { x: number, y: number, width: number, height: number } | null } */ #playerPortraitRect;
	/** @private @type { { x: number, y: number, width: number, height: number } | null } */ #opponentPortraitRect;
	/** @private @type { { side: string, buff: { id: string, value: number } } | null } */ #pressedBuffInfo;
	/** @private @type { { x: number, y: number } | null } */ #playerDeckSlotCenter;
	/** @private @type { { x: number, y: number } | null } */ #playerDiscardSlotCenter;
	/** @private @type { { x: number, y: number } | null } */ #opponentDeckSlotCenter;
	/** @private @type { { x: number, y: number } | null } */ #opponentDiscardSlotCenter;
	/** @private @type { FloatingText[] } */ #floatingTexts;
	/** @private @type { { x: number, y: number } | null } */ #playerStageCenter;
	/** @private @type { { x: number, y: number } | null } */ #opponentStageCenter;
	/** @private @type { AudioBeepPlayer | null } */ #audioBeepPlayer;

	//==============================================================================
	// 생성.
	//==============================================================================
	constructor() {
		super();
		this.#cardDefinitions = null;
		this.#gradeDefinitions = null;
		this.#sectDefinitions = null;
		this.#buffDefinitions = null;
		this.#realmDefinitions = null;
		this.#characterDefinitions = null;
		this.#playerCharacterId = 0;
		this.#opponentCharacterId = 0;
		this.#player = new PlayerState(PlayerSide.player);
		this.#opponent = new PlayerState(PlayerSide.opponent);
		this.#currentSide = PlayerSide.player;
		this.#playerHandLayouts = [];
		this.#opponentCardLayouts = [];
		this.#playerExitingCards = [];
		this.#opponentExitingCards = [];
		this.#endTurnButtonRect = null;
		this.#abandonButtonRect = null;
		this.#deckViewCloseRect = null;
		this.#deckViewPanelRect = null;
		this.#isDeckViewOpen = false;
		this.#viewedPileTitle = "";
		this.#viewedPileCards = [];
		this.#selectedCardId = null;
		this.#endGameMessage = "";
		this.#nextCardId = 1;
		this.#opponentTurnTime = 0;
		this.#log = [];
		this.#playerBuffLayouts = [];
		this.#opponentBuffLayouts = [];
		this.#playerPortraitRect = null;
		this.#opponentPortraitRect = null;
		this.#pressedBuffInfo = null;
		this.#playerDeckSlotCenter = null;
		this.#playerDiscardSlotCenter = null;
		this.#opponentDeckSlotCenter = null;
		this.#opponentDiscardSlotCenter = null;
		this.#floatingTexts = [];
		this.#playerStageCenter = null;
		this.#opponentStageCenter = null;
		this.#audioBeepPlayer = null;
	}

	//==============================================================================
	// 외부에서 카드 정의 주입. 호출 시 게임이 처음 상태로.
	//==============================================================================
	/**
	 * @param { Array } cardDefinitions
	 */
	setCardDefinitions(cardDefinitions) {
		this.#cardDefinitions = cardDefinitions;
		this.reset();
	}

	//==============================================================================
	// 등급 / 종파 / 버프 정의 주입.
	//==============================================================================
	/**
	 * @param { Array } gradeDefinitions
	 */
	setGradeDefinitions(gradeDefinitions) {
		this.#gradeDefinitions = gradeDefinitions;
	}

	/**
	 * @param { Array } sectDefinitions
	 */
	setSectDefinitions(sectDefinitions) {
		this.#sectDefinitions = sectDefinitions;
	}

	/**
	 * @param { Array } buffDefinitions
	 */
	setBuffDefinitions(buffDefinitions) {
		this.#buffDefinitions = buffDefinitions;
	}

	/**
	 * @param { Array } characterDefinitions
	 */
	setCharacterDefinitions(characterDefinitions) {
		this.#characterDefinitions = characterDefinitions;
	}

	/**
	 * @param { Array } realmDefinitions
	 */
	setRealmDefinitions(realmDefinitions) {
		this.#realmDefinitions = realmDefinitions;
	}

	//==============================================================================
	// 경지 정의 검색.
	//==============================================================================
	/**
	 * @param { number } realmId
	 * @returns { Object | null }
	 */
	findRealmDefinition(realmId) {
		if (this.#realmDefinitions === null) {
			return null;
		}
		const found = this.#realmDefinitions.find((r) => r.id === realmId);
		return found ? found : null;
	}

	//==============================================================================
	// 전투 상대 캐릭터 설정 (양쪽 id). 호출 시 자동 reset (덱이 양쪽 캐릭터의 cardIds 로 구성됨).
	//==============================================================================
	/**
	 * @param { number } playerCharacterId
	 * @param { number } opponentCharacterId
	 */
	setBattleCharacters(playerCharacterId, opponentCharacterId) {
		this.#playerCharacterId = playerCharacterId;
		this.#opponentCharacterId = opponentCharacterId;
		this.reset();
	}

	//==============================================================================
	// 캐릭터 정의 (id) 검색.
	//==============================================================================
	/**
	 * @param { number } characterId
	 * @returns { Object | null }
	 */
	findCharacterDefinition(characterId) {
		if (this.#characterDefinitions === null) {
			return null;
		}
		const found = this.#characterDefinitions.find((c) => c.id === characterId);
		return found ? found : null;
	}

	//==============================================================================
	// 등급 정의 (rank 1~6) 검색.
	//==============================================================================
	/**
	 * @param { number } rank
	 * @returns { Object | null }
	 */
	findGradeDefinition(rank) {
		if (this.#gradeDefinitions === null) {
			return null;
		}
		const found = this.#gradeDefinitions.find((g) => g.rank === rank);
		return found ? found : null;
	}

	//==============================================================================
	// 종파 정의 (id) 검색.
	//==============================================================================
	/**
	 * @param { number } sectId
	 * @returns { Object | null }
	 */
	findSectDefinition(sectId) {
		if (this.#sectDefinitions === null) {
			return null;
		}
		const found = this.#sectDefinitions.find((s) => s.id === sectId);
		return found ? found : null;
	}

	//==============================================================================
	// 버프 정의 (key 문자열) 검색. bufftable 의 key 컬럼 = buff 인스턴스의 id.
	// (테이블 자체의 id 는 8자리 숫자, 카드 effect.type 은 key 와 매칭)
	//==============================================================================
	/**
	 * @param { string } buffKey
	 * @returns { Object | null }
	 */
	findBuffDefinition(buffKey) {
		if (this.#buffDefinitions === null) {
			return null;
		}
		const found = this.#buffDefinitions.find((b) => b.key === buffKey);
		return found ? found : null;
	}

	//==============================================================================
	// 재시작. 시작 시 플레이어에게 시연용 버프 / 디버프 한 세트 부여.
	//==============================================================================
	reset() {
		this.#player = new PlayerState(PlayerSide.player);
		this.#opponent = new PlayerState(PlayerSide.opponent);
		this.#currentSide = PlayerSide.player;
		this.#playerHandLayouts = [];
		this.#opponentCardLayouts = [];
		this.#playerExitingCards = [];
		this.#opponentExitingCards = [];
		this.#endTurnButtonRect = null;
		this.#abandonButtonRect = null;
		this.#deckViewCloseRect = null;
		this.#deckViewPanelRect = null;
		this.#isDeckViewOpen = false;
		this.#viewedPileTitle = "";
		this.#viewedPileCards = [];
		this.#selectedCardId = null;
		this.#endGameMessage = "";
		this.#nextCardId = 1;
		this.#opponentTurnTime = 0;
		this.#log = [];
		this.#playerBuffLayouts = [];
		this.#opponentBuffLayouts = [];
		this.#playerPortraitRect = null;
		this.#opponentPortraitRect = null;
		this.#pressedBuffInfo = null;
		this.#playerDeckSlotCenter = null;
		this.#playerDiscardSlotCenter = null;
		this.#opponentDeckSlotCenter = null;
		this.#opponentDiscardSlotCenter = null;
		this.#floatingTexts = [];
		this.#playerStageCenter = null;
		this.#opponentStageCenter = null;
		// 양쪽 캐릭터 정의에서 닉네임/경지/덱(cardIds) 가져오기. 정의 없으면 fallback.
		this.applyCharacterToPlayer(this.#player, this.#playerCharacterId, "한두백");
		this.applyCharacterToPlayer(this.#opponent, this.#opponentCharacterId, "적");
		for (let i = 0; i < STARTING_HAND_SIZE; ++i) {
			this.drawCardFromDeck(this.#player);
			this.drawCardFromDeck(this.#opponent);
		}
	}

	//==============================================================================
	// 카드 정의 검색.
	//==============================================================================
	/**
	 * @param { string } cardId
	 * @returns { Object | null }
	 */
	findCardDefinition(cardId) {
		if (this.#cardDefinitions === null) {
			return null;
		}
		const definition = this.#cardDefinitions.find((d) => d.id === cardId);
		return definition ? definition : null;
	}

	//==============================================================================
	// 캐릭터 정의를 PlayerState 에 반영 (닉네임/경지/덱).
	// characterId 가 없거나 정의를 못 찾으면 fallback 닉네임 + 랜덤 덱.
	//==============================================================================
	/**
	 * @param { PlayerState } playerState
	 * @param { number } characterId
	 * @param { string } fallbackNickname
	 */
	applyCharacterToPlayer(playerState, characterId, fallbackNickname) {
		const definition = this.findCharacterDefinition(characterId);
		// 캐릭터별 체력 / 영력 / 행동력 파라미터 적용. 정의에 없으면 기본값.
		const characterMaxHealth = definition && typeof definition.maxHealth === "number" ? definition.maxHealth : STARTING_HEALTH;
		const characterEnergyCap = definition && typeof definition.energyCap === "number" ? definition.energyCap : MAX_ENERGY;
		const characterStartingEnergy = definition && typeof definition.startingEnergy === "number" ? definition.startingEnergy : 1;
		const characterEnergyGainPerTurn = definition && typeof definition.energyGainPerTurn === "number" ? definition.energyGainPerTurn : 1;
		const characterActionPointCap = definition && typeof definition.actionPointCap === "number" ? definition.actionPointCap : STARTING_ACTION_POINT_CAP;
		const characterStartingActionPoints = definition && typeof definition.startingActionPoints === "number" ? definition.startingActionPoints : STARTING_ACTION_POINTS;
		const characterActionPointGainPerTurn = definition && typeof definition.actionPointGainPerTurn === "number" ? definition.actionPointGainPerTurn : ACTION_POINT_GAIN_PER_TURN;
		playerState.maxHealth = characterMaxHealth;
		playerState.health = characterMaxHealth;
		playerState.energyCap = characterEnergyCap;
		playerState.energyGainPerTurn = characterEnergyGainPerTurn;
		playerState.actionPointCap = characterActionPointCap;
		playerState.actionPointGainPerTurn = characterActionPointGainPerTurn;
		// 플레이어는 첫 턴 startTurn 호출 없이 바로 행동 → 시작값을 그대로 세팅.
		// 상대는 첫 턴이 startTurn 으로 시작 → startTurn 의 +gainPerTurn 을 거꾸로 빼두어 시작값에 도달하게 한다.
		if (playerState.side === PlayerSide.player) {
			playerState.maxEnergy = characterStartingEnergy;
			playerState.currentEnergy = characterStartingEnergy;
			playerState.maxActionPoints = characterStartingActionPoints;
			playerState.actionPoints = characterStartingActionPoints;
		}
		else {
			const opponentInitialMaxEnergy = System.Math.max(0, characterStartingEnergy - characterEnergyGainPerTurn);
			playerState.maxEnergy = opponentInitialMaxEnergy;
			playerState.currentEnergy = 0;
			const opponentInitialMaxActionPoints = System.Math.max(0, characterStartingActionPoints - characterActionPointGainPerTurn);
			playerState.maxActionPoints = opponentInitialMaxActionPoints;
			playerState.actionPoints = 0;
		}
		if (definition) {
			playerState.nickname = definition.name || fallbackNickname;
			// 경지: realm 정의에서 이름 룩업. 없으면 빈 문자열.
			const realmDefinition = this.findRealmDefinition(definition.realmId);
			playerState.stageName = realmDefinition ? realmDefinition.name : "";
			if (System.Array.isArray(definition.cardIds) && definition.cardIds.length > 0) {
				playerState.deck = this.createDeckFromCardIds(definition.cardIds);
				return;
			}
		}
		else {
			playerState.nickname = fallbackNickname;
			playerState.stageName = "";
		}
		playerState.deck = this.createRandomDeck();
	}

	//==============================================================================
	// 카드 id 배열 → Card 배열 (입력 순서 유지). 정의 없는 id 는 무시.
	//==============================================================================
	/**
	 * @param { number[] } cardIds
	 * @returns { Card[] }
	 */
	createDeckFromCardIds(cardIds) {
		const deck = [];
		for (const cardId of cardIds) {
			const definition = this.findCardDefinition(cardId);
			if (definition === null) {
				continue;
			}
			const newId = this.#nextCardId;
			++this.#nextCardId;
			deck.push(new Card(newId, cardId));
		}
		return deck;
	}

	//==============================================================================
	// 랜덤 덱 생성 (캐릭터 cardIds 가 없을 때만 fallback 으로 사용).
	//==============================================================================
	/**
	 * @returns { Card[] }
	 */
	createRandomDeck() {
		const deck = [];
		if (this.#cardDefinitions === null || this.#cardDefinitions.length === 0) {
			return deck;
		}
		for (let i = 0; i < DECK_SIZE; ++i) {
			const definitionIndex = System.Math.floor(System.Math.random() * this.#cardDefinitions.length);
			const definition = this.#cardDefinitions[definitionIndex];
			const cardId = this.#nextCardId;
			++this.#nextCardId;
			const card = new Card(cardId, definition.id);
			deck.push(card);
		}
		return deck;
	}

	//==============================================================================
	// 무덤을 셔플하여 덱으로 재활용.
	//==============================================================================
	/**
	 * @param { PlayerState } playerState
	 */
	recycleDiscardToDeck(playerState) {
		if (playerState.discard.length === 0) {
			return;
		}
		const recycled = playerState.discard.slice();
		for (let i = recycled.length - 1; i > 0; --i) {
			const swapIndex = System.Math.floor(System.Math.random() * (i + 1));
			const temp = recycled[i];
			recycled[i] = recycled[swapIndex];
			recycled[swapIndex] = temp;
		}
		playerState.deck = recycled;
		playerState.discard = [];
		const sideName = playerState.side === PlayerSide.player ? "당신" : "적";
		this.appendLog(`${sideName}: 묘패→산패 재활용`);
	}

	//==============================================================================
	// 덱 맨 위 한 장을 핸드로. 덱 비면 무덤 셔플. 핸드 가득이면 무덤으로 폐기.
	//==============================================================================
	/**
	 * @param { PlayerState } playerState
	 */
	drawCardFromDeck(playerState) {
		if (playerState.deck.length === 0) {
			this.recycleDiscardToDeck(playerState);
			if (playerState.deck.length === 0) {
				return;
			}
		}
		const card = playerState.deck.pop();
		if (playerState.hand.length >= MAX_HAND_SIZE) {
			playerState.discard.push(card);
			return;
		}
		card.enterTime = ENTER_DURATION;
		playerState.hand.push(card);
	}

	//==============================================================================
	// 버프 추가. 같은 id 가 있으면 value 합산. 0 이하 되면 제거.
	//==============================================================================
	/**
	 * @param { PlayerState } playerState
	 * @param { string } buffId
	 * @param { number } value
	 */
	addBuff(playerState, buffId, value) {
		const existing = playerState.buffs.find((b) => b.id === buffId);
		if (existing) {
			existing.value += value;
			if (existing.value <= 0) {
				playerState.buffs = playerState.buffs.filter((b) => b !== existing);
			}
		}
		else if (value > 0) {
			playerState.buffs.push(new Buff(buffId, value));
		}
	}

	//==============================================================================
	// 카드 사용. 영력 부족 / 정의 없음이면 false.
	//==============================================================================
	/**
	 * @param { PlayerState } actor
	 * @param { PlayerState } target
	 * @param { Card } card
	 * @returns { boolean }
	 */
	playCard(actor, target, card) {
		const definition = this.findCardDefinition(card.cardId);
		if (definition === null) {
			return false;
		}
		const cost = typeof definition.cost === "number" ? definition.cost : 0;
		if (actor.actionPoints < cost) {
			if (actor.side === PlayerSide.player) {
				this.appendLog(`행동력 부족 (${definition.displayName})`);
			}
			return false;
		}

		actor.actionPoints -= cost;

		// 카드 사용자(actor) 의 발화 대사 (정의에 castLines 가 있을 때).
		this.spawnActorCastLine(actor, definition);

		const strengthBuff = actor.buffs.find((b) => b.id === "strength");
		const dexterityBuff = actor.buffs.find((b) => b.id === "dexterity");
		const weakenBuff = actor.buffs.find((b) => b.id === "weaken");
		const focusBuff = actor.buffs.find((b) => b.id === "focus");
		const empowerBuff = actor.buffs.find((b) => b.id === "empower");
		const strengthBonus = strengthBuff ? strengthBuff.value : 0;
		const dexterityBonus = dexterityBuff ? dexterityBuff.value : 0;
		const weakenAmount = weakenBuff ? weakenBuff.value : 0;
		const focusBonus = focusBuff ? focusBuff.value : 0;
		const empowerBonus = empowerBuff ? empowerBuff.value : 0;

		// 검술 (attack 타입) 카드면 focus / 내공(empower) 보너스를 데미지에 더한다.
		const isAttackCard = definition.cardType === "attack";

		for (const effect of definition.effects) {
			switch (effect.type) {
				case "damage": {
					let damageValue = effect.value + strengthBonus;
					if (isAttackCard) {
						damageValue += focusBonus + empowerBonus;
					}
					if (weakenAmount > 0) {
						damageValue = System.Math.floor(damageValue * 0.75);
					}
					if (damageValue < 0) {
						damageValue = 0;
					}
					this.applyDamage(target, damageValue);
					this.spawnTargetReceiveLine(target, definition);
					break;
				}
				case "block": {
					const blockValue = effect.value + dexterityBonus;
					this.addBuff(actor, "block", blockValue);
					this.spawnStageFloatingText(actor.side, `방 +${blockValue}`, "#88ccff");
					break;
				}
				case "heal": {
					const previousHealth = actor.health;
					const healed = System.Math.min(actor.maxHealth, actor.health + effect.value);
					actor.health = healed;
					const healedAmount = healed - previousHealth;
					if (healedAmount > 0) {
						this.spawnStageFloatingText(actor.side, `+${healedAmount}`, "#5cff7c");
					}
					break;
				}
				case "actionPoint": {
					const previousActionPoints = actor.actionPoints;
					const restoredActionPoints = System.Math.min(actor.actionPointCap, actor.actionPoints + effect.value);
					actor.actionPoints = restoredActionPoints;
					if (actor.maxActionPoints < restoredActionPoints) {
						actor.maxActionPoints = restoredActionPoints;
					}
					const restoredAmount = restoredActionPoints - previousActionPoints;
					if (restoredAmount > 0) {
						this.spawnStageFloatingText(actor.side, `행동력 +${restoredAmount}`, "#e2b94a");
					}
					break;
				}
				case "weaken":
				case "vulnerable": {
					// 디버프는 상대(target) 에게 부여한다.
					this.addBuff(target, effect.type, effect.value);
					this.spawnBuffFloatingText(target.side, effect.type, effect.value);
					this.spawnTargetReceiveLine(target, definition);
					break;
				}
				case "strength":
				case "dexterity":
				case "focus":
				case "dodge":
				case "empower": {
					this.addBuff(actor, effect.type, effect.value);
					this.spawnBuffFloatingText(actor.side, effect.type, effect.value);
					break;
				}
			}
		}

		// focus 는 검술 카드 1회 사용 후 소비.
		if (isAttackCard && focusBuff) {
			actor.buffs = actor.buffs.filter((b) => b.id !== "focus");
		}

		// 사용 애니메이션 등록.
		const handIndex = actor.hand.findIndex((c) => c.id === card.id);
		if (handIndex >= 0) {
			let sourceLayout = null;
			if (actor.side === PlayerSide.player) {
				const layoutEntry = this.#playerHandLayouts[handIndex];
				if (layoutEntry) {
					const halfWidth = PLAYER_CARD_WIDTH * 0.5;
					const halfHeight = PLAYER_CARD_HEIGHT * 0.5;
					sourceLayout = {
						x: layoutEntry.centerX - halfWidth,
						y: layoutEntry.centerY - halfHeight,
						width: PLAYER_CARD_WIDTH,
						height: PLAYER_CARD_HEIGHT,
					};
				}
			}
			else {
				sourceLayout = this.#opponentCardLayouts[handIndex] || null;
			}
			if (sourceLayout) {
				// 카드의 주 효과가 데미지면 상대 측, 아니면 자기 측을 인터랙션 대상으로 잡음.
				let isDamageEffect = false;
				for (const effect of definition.effects) {
					if (effect.type === "damage") {
						isDamageEffect = true;
						break;
					}
				}
				const targetSide = isDamageEffect
					? (actor.side === PlayerSide.player ? PlayerSide.opponent : PlayerSide.player)
					: actor.side;
				const exitingEntry = {
					card: card,
					layout: { x: sourceLayout.x, y: sourceLayout.y, width: sourceLayout.width, height: sourceLayout.height },
					elapsed: 0,
					actorSide: actor.side,
					targetSide: targetSide,
					isReveal: definition.isSpecial,
				};
				if (actor.side === PlayerSide.player) {
					this.#playerExitingCards.push(exitingEntry);
				}
				else {
					this.#opponentExitingCards.push(exitingEntry);
				}
			}
		}

		actor.hand = actor.hand.filter((c) => c.id !== card.id);
		actor.discard.push(card);

		const actorName = actor.side === PlayerSide.player ? "당신" : "적";
		this.appendLog(`${actorName} ▶ ${definition.displayName}`);

		this.checkGameOver();
		return true;
	}

	//==============================================================================
	// 데미지 처리. vulnerable 있으면 받는 쪽 데미지 1.5배. block 부터 흡수.
	//==============================================================================
	/**
	 * @param { PlayerState } target
	 * @param { number } amount
	 */
	applyDamage(target, amount) {
		// 회피: 공격 1회를 통째로 무효화하고 회피 수치를 1 감소시킨다.
		const dodgeBuff = target.buffs.find((b) => b.id === "dodge");
		if (dodgeBuff && dodgeBuff.value > 0) {
			dodgeBuff.value -= 1;
			if (dodgeBuff.value <= 0) {
				target.buffs = target.buffs.filter((b) => b !== dodgeBuff);
			}
			this.spawnStageFloatingText(target.side, "회피!", "#aaccdd");
			return;
		}
		let actualDamage = amount;
		const vulnerableBuff = target.buffs.find((b) => b.id === "vulnerable");
		if (vulnerableBuff && vulnerableBuff.value > 0) {
			actualDamage = System.Math.floor(actualDamage * 1.5);
		}
		let remaining = actualDamage;
		const blockBuff = target.buffs.find((b) => b.id === "block");
		let absorbedByBlock = 0;
		if (blockBuff && blockBuff.value > 0) {
			absorbedByBlock = System.Math.min(blockBuff.value, remaining);
			blockBuff.value -= absorbedByBlock;
			remaining -= absorbedByBlock;
			if (blockBuff.value <= 0) {
				target.buffs = target.buffs.filter((b) => b !== blockBuff);
			}
		}
		target.health -= remaining;
		if (target.health < 0) {
			target.health = 0;
		}
		// 플로팅 피드백: 방어 흡수 분과 체력 손실 분을 분리하여 표시.
		if (absorbedByBlock > 0) {
			this.spawnStageFloatingText(target.side, `방 -${absorbedByBlock}`, "#88ccff");
		}
		if (remaining > 0) {
			this.spawnStageFloatingText(target.side, `-${remaining}`, "#ff5555");
		}
	}

	//==============================================================================
	// 무대(중앙) 캐릭터 위치에 플로팅 텍스트를 띄운다.
	// 같은 위치에 여러 텍스트가 겹치지 않도록 약간의 무작위 오프셋을 준다.
	//==============================================================================
	/**
	 * @param { string } side
	 * @param { string } text
	 * @param { string } color
	 */
	spawnStageFloatingText(side, text, color) {
		const stageCenter = side === PlayerSide.player ? this.#playerStageCenter : this.#opponentStageCenter;
		if (stageCenter === null) {
			return;
		}
		const horizontalJitter = (System.Math.random() - 0.5) * STAGE_FIGURE_WIDTH * 0.6;
		const verticalJitter = (System.Math.random() - 0.5) * STAGE_FIGURE_HEIGHT * 0.4;
		this.addFloatingText(text, color, stageCenter.x + horizontalJitter, stageCenter.y + verticalJitter);
	}

	//==============================================================================
	// 카드 사용자 발화 대사 (카드 정의의 castLines 중 무작위 1개).
	//==============================================================================
	/**
	 * @param { PlayerState } actor
	 * @param { Object } definition
	 */
	spawnActorCastLine(actor, definition) {
		if (!definition || !System.Array.isArray(definition.castLines) || definition.castLines.length === 0) {
			return;
		}
		const lineIndex = System.Math.floor(System.Math.random() * definition.castLines.length);
		const lineText = definition.castLines[lineIndex];
		const speakerName = actor.nickname && actor.nickname.length > 0 ? actor.nickname : (actor.side === PlayerSide.player ? "당신" : "적");
		this.spawnStageDialogueBubble(actor.side, `${speakerName}: ${lineText}`, "#ffffff");
	}

	//==============================================================================
	// 카드 피적용자 반응 대사 (카드 정의의 receiveLines 중 무작위 1개).
	//==============================================================================
	/**
	 * @param { PlayerState } target
	 * @param { Object } definition
	 */
	spawnTargetReceiveLine(target, definition) {
		if (!definition || !System.Array.isArray(definition.receiveLines) || definition.receiveLines.length === 0) {
			return;
		}
		const lineIndex = System.Math.floor(System.Math.random() * definition.receiveLines.length);
		const lineText = definition.receiveLines[lineIndex];
		const speakerName = target.nickname && target.nickname.length > 0 ? target.nickname : (target.side === PlayerSide.player ? "당신" : "적");
		this.spawnStageDialogueBubble(target.side, `${speakerName}: ${lineText}`, "#ffeecc");
	}

	//==============================================================================
	// 무대 캐릭터 위에 길게 떠 있는 대사 말풍선 (수치 피드백보다 길게 표시).
	//==============================================================================
	/**
	 * @param { string } side
	 * @param { string } text
	 * @param { string } color
	 */
	spawnStageDialogueBubble(side, text, color) {
		const stageCenter = side === PlayerSide.player ? this.#playerStageCenter : this.#opponentStageCenter;
		if (stageCenter === null) {
			return;
		}
		const bubbleX = stageCenter.x;
		const bubbleY = stageCenter.y - STAGE_FIGURE_HEIGHT * 0.5 - 18;
		const bubbleDuration = FLOATING_TEXT_DURATION * 2.4;
		this.#floatingTexts.push(new FloatingText(text, color, bubbleX, bubbleY, bubbleDuration));
	}

	//==============================================================================
	// 버프 부여 플로팅 텍스트 (버프 정의의 displayName / color 사용).
	//==============================================================================
	/**
	 * @param { string } side
	 * @param { string } buffKey
	 * @param { number } value
	 */
	spawnBuffFloatingText(side, buffKey, value) {
		const buffDefinition = this.findBuffDefinition(buffKey);
		const buffName = buffDefinition && buffDefinition.displayName ? buffDefinition.displayName : buffKey;
		const buffColor = buffDefinition && buffDefinition.color ? buffDefinition.color : "#ffffff";
		this.spawnStageFloatingText(side, `${buffName} +${value}`, buffColor);
	}

	//==============================================================================
	// 양쪽 체력 검사 후 종료 메시지 설정.
	//==============================================================================
	checkGameOver() {
		if (this.#endGameMessage !== "") {
			return;
		}
		if (this.#player.health <= 0) {
			this.#endGameMessage = "패배!";
			const loseAudioBeepPlayer = this.getAudioBeepPlayer();
			if (loseAudioBeepPlayer) {
				loseAudioBeepPlayer.playError();
			}
		}
		else if (this.#opponent.health <= 0) {
			this.#endGameMessage = "승리!";
			const winAudioBeepPlayer = this.getAudioBeepPlayer();
			if (winAudioBeepPlayer) {
				winAudioBeepPlayer.playSuccess();
			}
		}
	}

	//==============================================================================
	// 턴 종료 후 다음 플레이어 턴 시작 처리.
	//==============================================================================
	endTurn() {
		if (this.#endGameMessage !== "") {
			return;
		}
		this.#selectedCardId = null;
		const nextSide = this.#currentSide === PlayerSide.player ? PlayerSide.opponent : PlayerSide.player;
		this.#currentSide = nextSide;
		const nextPlayer = nextSide === PlayerSide.player ? this.#player : this.#opponent;
		this.startTurn(nextPlayer);
		this.appendLog(nextSide === PlayerSide.player ? "── 당신의 턴 ──" : "── 적의 턴 ──");
		if (nextSide === PlayerSide.opponent) {
			this.#opponentTurnTime = OPPONENT_TURN_DELAY;
		}
	}

	//==============================================================================
	// 턴 시작 처리.
	//==============================================================================
	/**
	 * @param { PlayerState } playerState
	 */
	startTurn(playerState) {
		// 일시 버프 (block 등) 제거.
		playerState.buffs = playerState.buffs.filter((b) => {
			const definition = this.findBuffDefinition(b.id);
			if (definition && definition.isTurnTemporary) {
				return false;
			}
			return true;
		});
		// 감쇠 버프 (weaken / vulnerable) value -1, 0 되면 제거.
		for (const buff of playerState.buffs) {
			const definition = this.findBuffDefinition(buff.id);
			if (definition && definition.decayPerTurn) {
				buff.value -= 1;
			}
		}
		playerState.buffs = playerState.buffs.filter((b) => b.value > 0);
		playerState.maxEnergy = System.Math.min(playerState.energyCap, playerState.maxEnergy + playerState.energyGainPerTurn);
		playerState.currentEnergy = playerState.maxEnergy;
		playerState.maxActionPoints = System.Math.min(playerState.actionPointCap, playerState.maxActionPoints + playerState.actionPointGainPerTurn);
		playerState.actionPoints = playerState.maxActionPoints;
		this.drawCardFromDeck(playerState);
	}

	//==============================================================================
	// 로그 추가.
	//==============================================================================
	/**
	 * @param { string } text
	 */
	appendLog(text) {
		this.#log.push(text);
		while (this.#log.length > LOG_MAX_ENTRIES) {
			this.#log.shift();
		}
	}

	//==============================================================================
	// 애니메이션 시간 감소.
	//==============================================================================
	/**
	 * @param { number } timeDelta
	 */
	tickAnimations(timeDelta) {
		for (const card of this.#player.hand) {
			if (card.enterTime > 0) {
				card.enterTime -= timeDelta;
				if (card.enterTime < 0) {
					card.enterTime = 0;
				}
			}
			// 선택 트윈: 선택 상태면 1, 아니면 0 으로 보간.
			const targetSelection = card.id === this.#selectedCardId ? 1 : 0;
			const diff = targetSelection - card.selectionProgress;
			const step = SELECTION_TWEEN_SPEED * timeDelta;
			if (System.Math.abs(diff) <= step) {
				card.selectionProgress = targetSelection;
			}
			else {
				card.selectionProgress += System.Math.sign(diff) * step;
			}
		}
		for (const card of this.#opponent.hand) {
			if (card.enterTime > 0) {
				card.enterTime -= timeDelta;
				if (card.enterTime < 0) {
					card.enterTime = 0;
				}
			}
		}
		for (let i = this.#playerExitingCards.length - 1; i >= 0; --i) {
			this.#playerExitingCards[i].elapsed += timeDelta;
			if (this.#playerExitingCards[i].elapsed >= CARD_LIFE_DURATION) {
				this.#playerExitingCards.splice(i, 1);
			}
		}
		for (let i = this.#opponentExitingCards.length - 1; i >= 0; --i) {
			this.#opponentExitingCards[i].elapsed += timeDelta;
			if (this.#opponentExitingCards[i].elapsed >= CARD_LIFE_DURATION) {
				this.#opponentExitingCards.splice(i, 1);
			}
		}
		// 플로팅 텍스트 시간 감소.
		for (let i = this.#floatingTexts.length - 1; i >= 0; --i) {
			this.#floatingTexts[i].time -= timeDelta;
			if (this.#floatingTexts[i].time <= 0) {
				this.#floatingTexts.splice(i, 1);
			}
		}
	}

	//==============================================================================
	// 플로팅 텍스트 추가.
	//==============================================================================
	/**
	 * @param { string } text
	 * @param { string } color
	 * @param { number } x
	 * @param { number } y
	 */
	addFloatingText(text, color, x, y) {
		this.#floatingTexts.push(new FloatingText(text, color, x, y, FLOATING_TEXT_DURATION));
	}

	//==============================================================================
	// 턴종료 버튼 활성화 여부.
	//==============================================================================
	/**
	 * @returns { boolean }
	 */
	isEndTurnButtonEnabled() {
		if (this.#currentSide !== PlayerSide.player) {
			return false;
		}
		if (this.#endGameMessage !== "") {
			return false;
		}
		if (this.#selectedCardId !== null) {
			return false;
		}
		if (this.#playerExitingCards.length > 0 || this.#opponentExitingCards.length > 0) {
			return false;
		}
		return true;
	}

	//==============================================================================
	// 갱신.
	//==============================================================================
	/**
	 * @param { number } timeDelta
	 * @param { import("../libs/vanilla.js/src/core/inputmanager.js").InputManager } inputManager
	 * @param { { x: number, y: number, width: number, height: number } } popupRect
	 */
	tick(timeDelta, inputManager, popupRect) {
		this.tickAnimations(timeDelta);

		if (this.#endGameMessage !== "") {
			if (inputManager.isTouchPressed()) {
				const resetAudioBeepPlayer = this.getAudioBeepPlayer();
				if (resetAudioBeepPlayer) {
					resetAudioBeepPlayer.playClick();
				}
				this.reset();
			}
			return;
		}

		// 산패 보기 팝업이 열려 있으면 모달로 동작 (다른 입력 차단).
		if (this.#isDeckViewOpen) {
			if (inputManager.isTouchPressed()) {
				const viewInputPosition = inputManager.getViewInputPosition();
				const closeAudioBeepPlayer = this.getAudioBeepPlayer();
				if (closeAudioBeepPlayer) {
					closeAudioBeepPlayer.playClick();
				}
				// 닫기 버튼 또는 팝업 외부 클릭으로 닫음.
				if (this.#deckViewCloseRect && this.isInsideRect(viewInputPosition, this.#deckViewCloseRect)) {
					this.#isDeckViewOpen = false;
				}
				else if (this.#deckViewPanelRect && !this.isInsideRect(viewInputPosition, this.#deckViewPanelRect)) {
					this.#isDeckViewOpen = false;
				}
			}
			return;
		}

		if (this.#currentSide === PlayerSide.opponent) {
			this.#opponentTurnTime -= timeDelta;
			if (this.#opponentTurnTime <= 0) {
				this.runOpponentTurn();
			}
			return;
		}

		const viewInputPosition = inputManager.getViewInputPosition();

		// 클릭(press) 한 번 = 선택. 같은 카드를 다시 클릭 = 사용. 카드 외부 클릭 = 취소.
		// 영력 체크는 "사용" 시점 (두 번째 클릭) 에서.
		if (inputManager.isTouchPressed()) {
			// 1) 턴종료 / 전투포기 버튼.
			if (this.#endTurnButtonRect && this.isInsideRect(viewInputPosition, this.#endTurnButtonRect)) {
				if (this.isEndTurnButtonEnabled()) {
					const endTurnAudioBeepPlayer = this.getAudioBeepPlayer();
					if (endTurnAudioBeepPlayer) {
						endTurnAudioBeepPlayer.playClick();
					}
					this.endTurn();
				}
				return;
			}
			if (this.#abandonButtonRect && this.isInsideRect(viewInputPosition, this.#abandonButtonRect)) {
				if (this.#endGameMessage === "") {
					const abandonAudioBeepPlayer = this.getAudioBeepPlayer();
					if (abandonAudioBeepPlayer) {
						abandonAudioBeepPlayer.playCancel();
					}
					this.appendLog("당신: 전투 포기");
					this.#player.health = 0;
					this.checkGameOver();
				}
				return;
			}
			// 4개 슬롯 (내/적 × 산패/묘패) 클릭 → 해당 더미 보기 팝업.
			if (this.tryOpenPileViewBySlotHit(viewInputPosition)) {
				return;
			}

			// 2) 손패 카드 hit.
			const pickedHandIndex = this.findHandCardIndexAtPosition(viewInputPosition);
			if (pickedHandIndex >= 0) {
				const pickedCard = this.#player.hand[pickedHandIndex];
				const cardAudioBeepPlayer = this.getAudioBeepPlayer();
				if (this.#selectedCardId === pickedCard.id) {
					// 같은 카드 두 번째 클릭 → 사용 (영력 체크는 playCard 안에서).
					const layoutEntry = this.#playerHandLayouts.find((entry) => entry.card.id === pickedCard.id);
					const feedbackX = layoutEntry ? layoutEntry.centerX : viewInputPosition.x;
					const feedbackY = layoutEntry ? layoutEntry.centerY : viewInputPosition.y;
					const success = this.playCard(this.#player, this.#opponent, pickedCard);
					if (success) {
						this.addFloatingText("사용!", "#5cff7c", feedbackX, feedbackY);
						this.#selectedCardId = null;
						if (cardAudioBeepPlayer) {
							cardAudioBeepPlayer.playConfirm();
						}
					}
					else {
						this.addFloatingText("행동력 부족", "#ff6060", feedbackX, feedbackY);
						// 행동력 부족이면 선택은 그대로 유지 (외부 클릭 시 취소).
						if (cardAudioBeepPlayer) {
							cardAudioBeepPlayer.playError();
						}
					}
				}
				else {
					// 다른 카드 (또는 첫 선택) → 그 카드를 새로 선택.
					this.#selectedCardId = pickedCard.id;
					if (cardAudioBeepPlayer) {
						cardAudioBeepPlayer.playClick();
					}
				}
				return;
			}

			// 3) 버프 hit (정보 표시용 — 누르고 있는 동안만 툴팁).
			const playerBuffEntry = this.findBuffEntryAtPosition(viewInputPosition, this.#playerBuffLayouts);
			if (playerBuffEntry) {
				this.#pressedBuffInfo = { side: PlayerSide.player, buff: playerBuffEntry.buff };
				return;
			}
			const opponentBuffEntry = this.findBuffEntryAtPosition(viewInputPosition, this.#opponentBuffLayouts);
			if (opponentBuffEntry) {
				this.#pressedBuffInfo = { side: PlayerSide.opponent, buff: opponentBuffEntry.buff };
				return;
			}

			// 4) 그 외 (카드 외부 빈 영역) → 선택 카드가 있으면 취소.
			if (this.#selectedCardId !== null) {
				this.#selectedCardId = null;
			}
		}

		// 뗌: 버프 툴팁만 해제. 카드는 hold 와 무관하므로 건드리지 않음.
		if (inputManager.isTouchReleased()) {
			this.#pressedBuffInfo = null;
		}
	}

	//==============================================================================
	// 상대 AI 턴: 행동력 한도 내 시간차로 한 장씩 사용.
	//==============================================================================
	runOpponentTurn() {
		if (this.#opponent.hand.length === 0 || this.#opponent.actionPoints <= 0) {
			this.endTurn();
			return;
		}
		const bestCard = this.pickOpponentBestCard();
		if (bestCard === null) {
			this.endTurn();
			return;
		}
		const success = this.playCard(this.#opponent, this.#player, bestCard);
		if (this.#endGameMessage !== "") {
			return;
		}
		if (!success || this.#opponent.actionPoints <= 0 || this.#opponent.hand.length === 0) {
			this.endTurn();
		}
		else {
			this.#opponentTurnTime = OPPONENT_BETWEEN_CARDS_DELAY;
		}
	}

	//==============================================================================
	// 상대 AI 카드 선택.
	//==============================================================================
	/**
	 * @returns { Card | null }
	 */
	pickOpponentBestCard() {
		if (this.#opponent.hand.length === 0) {
			return null;
		}
		let bestCard = null;
		let bestScore = -1;
		for (const card of this.#opponent.hand) {
			const definition = this.findCardDefinition(card.cardId);
			if (definition === null) {
				continue;
			}
			const cost = typeof definition.cost === "number" ? definition.cost : 0;
			if (cost > this.#opponent.actionPoints) {
				continue;
			}
			let cardScore = 0;
			for (const effect of definition.effects) {
				if (effect.type === "damage") {
					cardScore += effect.value;
				}
				else if (effect.type === "block") {
					cardScore += effect.value * 0.7;
				}
				else if (effect.type === "heal") {
					const missingHealth = this.#opponent.maxHealth - this.#opponent.health;
					cardScore += missingHealth >= effect.value ? effect.value : 0;
				}
			}
			if (cardScore > bestScore) {
				bestScore = cardScore;
				bestCard = card;
			}
		}
		return bestCard;
	}

	//==============================================================================
	// 출력.
	//==============================================================================
	/**
	 * @param { import("../libs/vanilla.js/src/core/graphic.js").Graphic } graphic
	 * @param { { x: number, y: number, width: number, height: number } } popupRect
	 */
	draw(graphic, popupRect) {
		const canvasRenderingContext = graphic.getCanvasRenderingContext();
		const popupCenterX = popupRect.x + popupRect.width * 0.5;
		const popupCenterY = popupRect.y + popupRect.height * 0.5;

		// 적 손패 + 무덤/저물대. 슬롯 top 이 popupRect.y + HAND_BOTTOM_MARGIN 에 오도록
		// (플레이어 슬롯 bottom 이 popupRect.bottom - HAND_BOTTOM_MARGIN 인 것과 대칭).
		const opponentHandTopY = popupRect.y + HAND_BOTTOM_MARGIN + (SLOT_HEIGHT - OPPONENT_CARD_HEIGHT) * 0.5;
		const opponentCardCenterY = opponentHandTopY + OPPONENT_CARD_HEIGHT * 0.5;
		this.drawOpponentHand(canvasRenderingContext, popupRect, opponentCardCenterY);
		const opponentSlotY = opponentHandTopY + (OPPONENT_CARD_HEIGHT - SLOT_HEIGHT) * 0.5;
		const opponentDiscardX = popupRect.x + SIDE_MARGIN;
		const opponentDeckX = popupRect.x + popupRect.width - SIDE_MARGIN - SLOT_WIDTH;
		this.drawPileSlot(canvasRenderingContext, opponentDiscardX, opponentSlotY, "묘패", this.#opponent.discard.length);
		this.drawPileSlot(canvasRenderingContext, opponentDeckX, opponentSlotY, "산패", this.#opponent.deck.length);
		this.#opponentDiscardSlotCenter = { x: opponentDiscardX + SLOT_WIDTH * 0.5, y: opponentSlotY + SLOT_HEIGHT * 0.5 };
		this.#opponentDeckSlotCenter = { x: opponentDeckX + SLOT_WIDTH * 0.5, y: opponentSlotY + SLOT_HEIGHT * 0.5 };

		// 적 손패 영역 외곽선 (무덤/저물대 사이).
		const opponentHandAreaX = popupRect.x + SIDE_MARGIN + SLOT_WIDTH + 8;
		const opponentHandAreaWidth = popupRect.width - (SIDE_MARGIN + SLOT_WIDTH + 8) * 2;
		canvasRenderingContext.strokeStyle = "#888899";
		canvasRenderingContext.lineWidth = 1;
		canvasRenderingContext.strokeRect(opponentHandAreaX, opponentSlotY, opponentHandAreaWidth, SLOT_HEIGHT);

		// 적 초상화 (우측 상단).
		const opponentPortraitX = popupRect.x + popupRect.width - PORTRAIT_WIDTH - SIDE_MARGIN;
		const opponentPortraitY = opponentSlotY + SLOT_HEIGHT + 16;
		this.drawPlayerPortrait(canvasRenderingContext, this.#opponent, opponentPortraitX, opponentPortraitY, PORTRAIT_WIDTH, PORTRAIT_HEIGHT, false);

		// 플레이어 손패 라인 + 무덤/덱.
		const playerHandLineY = popupRect.y + popupRect.height - HAND_BOTTOM_MARGIN - PLAYER_CARD_HEIGHT * 0.5;
		const playerSlotY = playerHandLineY - SLOT_HEIGHT * 0.5;
		const playerDiscardX = popupRect.x + SIDE_MARGIN;
		this.drawPileSlot(canvasRenderingContext, playerDiscardX, playerSlotY, "묘패", this.#player.discard.length);
		const playerDeckX = popupRect.x + popupRect.width - SIDE_MARGIN - SLOT_WIDTH;
		this.drawPileSlot(canvasRenderingContext, playerDeckX, playerSlotY, "산패", this.#player.deck.length);
		this.#playerDiscardSlotCenter = { x: playerDiscardX + SLOT_WIDTH * 0.5, y: playerSlotY + SLOT_HEIGHT * 0.5 };
		this.#playerDeckSlotCenter = { x: playerDeckX + SLOT_WIDTH * 0.5, y: playerSlotY + SLOT_HEIGHT * 0.5 };

		// 행동종료 + 전투포기 버튼 (덱 위. 위에서 아래 순서: 전투포기 → 행동종료).
		const endTurnButtonX = playerDeckX + (SLOT_WIDTH - END_TURN_BUTTON_WIDTH) * 0.5;
		const endTurnButtonY = playerSlotY - END_TURN_BUTTON_HEIGHT - 16;
		const abandonButtonY = endTurnButtonY - END_TURN_BUTTON_HEIGHT - 8;
		this.drawAbandonButton(canvasRenderingContext, endTurnButtonX, abandonButtonY, this.#endGameMessage === "");
		this.drawEndTurnButton(canvasRenderingContext, endTurnButtonX, endTurnButtonY, this.isEndTurnButtonEnabled());

		// 플레이어 초상화 (좌측, 손패 라인 위). 적과 동일하게 16 간격.
		const playerPortraitX = popupRect.x + SIDE_MARGIN;
		const playerPortraitY = playerSlotY - PORTRAIT_HEIGHT - 16;
		this.drawPlayerPortrait(canvasRenderingContext, this.#player, playerPortraitX, playerPortraitY, PORTRAIT_WIDTH, PORTRAIT_HEIGHT, true);

		// 중앙 무대 (이미지 없이 두 캐릭터를 도형으로 표현).
		this.drawBattleStage(canvasRenderingContext, popupRect);

		// 로그 (우측, 정보창 너비). 위/아래 모두 16 간격 (다른 영역들과 통일).
		const logX = popupRect.x + popupRect.width - PORTRAIT_WIDTH - SIDE_MARGIN;
		const logY = opponentPortraitY + PORTRAIT_HEIGHT + 16;
		const logHeight = (abandonButtonY - 16) - logY;
		if (logHeight > 60) {
			this.drawLog(canvasRenderingContext, logX, logY, PORTRAIT_WIDTH, logHeight);
		}

		// 턴 표시는 화면에 띄우지 않고 로그에만 (endTurn 에서 appendLog 처리).

		// 손패 영역 외곽선 (무덤/저물대 사이, 손패 라인).
		const handAreaX = popupRect.x + SIDE_MARGIN + SLOT_WIDTH + 8;
		const handAreaWidth = popupRect.width - (SIDE_MARGIN + SLOT_WIDTH + 8) * 2;
		const handAreaY = playerSlotY;
		const handAreaHeight = SLOT_HEIGHT;
		canvasRenderingContext.strokeStyle = "#888899";
		canvasRenderingContext.lineWidth = 1;
		canvasRenderingContext.strokeRect(handAreaX, handAreaY, handAreaWidth, handAreaHeight);

		// 플레이어 손패 (부채꼴, 우측이 위).
		this.drawPlayerHand(canvasRenderingContext, popupRect, playerHandLineY);

		// 사용 애니메이션.
		this.drawExitingCards(canvasRenderingContext, popupRect);

		// 누르고 있는 버프의 툴팁 (플레이어 버프 → 정보창 우측, 적 버프 → 정보창 좌측).
		if (this.#pressedBuffInfo !== null) {
			const portraitRect = this.#pressedBuffInfo.side === PlayerSide.player ? this.#playerPortraitRect : this.#opponentPortraitRect;
			if (portraitRect) {
				this.drawBuffTooltip(canvasRenderingContext, this.#pressedBuffInfo.buff, portraitRect, this.#pressedBuffInfo.side);
			}
		}

		// 선택된 카드의 효과 미리보기 (카드 좌/우 중 영역이 더 넓은 쪽).
		if (this.#selectedCardId !== null) {
			const selectedLayout = this.#playerHandLayouts.find((entry) => entry.card.id === this.#selectedCardId);
			if (selectedLayout) {
				this.drawSelectedCardTooltip(canvasRenderingContext, selectedLayout, popupRect);
			}
		}

		// 플로팅 텍스트 (사용/취소/영력 부족 등 행동 피드백).
		this.drawFloatingTexts(canvasRenderingContext);

		// 산패 보기 팝업 (모달, 다른 모든 요소 위에 출력).
		if (this.#isDeckViewOpen) {
			this.drawDeckViewPopup(canvasRenderingContext, popupRect);
		}
		else {
			this.#deckViewPanelRect = null;
			this.#deckViewCloseRect = null;
		}

		// 종료 오버레이.
		if (this.#endGameMessage !== "") {
			canvasRenderingContext.fillStyle = "rgba(0, 0, 0, 0.6)";
			canvasRenderingContext.fillRect(popupRect.x, popupRect.y, popupRect.width, popupRect.height);
			canvasRenderingContext.fillStyle = "#ffffff";
			canvasRenderingContext.font = "bold 64px GyeonggiBatangBold";
			canvasRenderingContext.textAlign = "center";
			canvasRenderingContext.textBaseline = "middle";
			canvasRenderingContext.fillText(this.#endGameMessage, popupCenterX, popupCenterY);
			canvasRenderingContext.font = "20px GyeonggiBatang";
			canvasRenderingContext.fillText("화면을 클릭하여 다시 시작", popupCenterX, popupCenterY + 60);
		}
	}

	//==============================================================================
	// 한 플레이어의 초상화 패널 (초상화 원 + 이름 + 체력바 + 영력바 + 버프 줄).
	//==============================================================================
	/**
	 * @param { CanvasRenderingContext2D } canvasRenderingContext
	 * @param { PlayerState } playerState
	 * @param { number } x
	 * @param { number } y
	 * @param { number } width
	 * @param { number } height
	 * @param { string } label
	 * @param { boolean } isMe
	 */
	drawPlayerPortrait(canvasRenderingContext, playerState, x, y, width, height, isMe) {
		const label = playerState.nickname || (isMe ? "당신" : "적");
		canvasRenderingContext.fillStyle = isMe ? "#1f3a5a" : "#5a1f33";
		canvasRenderingContext.fillRect(x, y, width, height);
		canvasRenderingContext.strokeStyle = "#ffffff";
		canvasRenderingContext.lineWidth = 2;
		canvasRenderingContext.strokeRect(x, y, width, height);

		// 좌측 초상화 원.
		const portraitRadius = 32;
		const portraitCenterX = x + 14 + portraitRadius;
		const portraitCenterY = y + 14 + portraitRadius;
		canvasRenderingContext.fillStyle = isMe ? "#3388cc" : "#cc3366";
		canvasRenderingContext.beginPath();
		canvasRenderingContext.arc(portraitCenterX, portraitCenterY, portraitRadius, 0, System.Math.PI * 2);
		canvasRenderingContext.fill();
		canvasRenderingContext.strokeStyle = "#ffffff";
		canvasRenderingContext.lineWidth = 2;
		canvasRenderingContext.stroke();

		// 우측 텍스트 영역.
		const textX = x + 14 + portraitRadius * 2 + 12;
		const textWidth = width - (textX - x) - 14;

		// 이름 + 경지 (경지가 있으면 옆에 작게).
		canvasRenderingContext.fillStyle = "#ffffff";
		canvasRenderingContext.font = "bold 16px GyeonggiBatangBold";
		canvasRenderingContext.textAlign = "left";
		canvasRenderingContext.textBaseline = "top";
		canvasRenderingContext.fillText(label, textX, y + 16);
		if (playerState.stageName && playerState.stageName.length > 0) {
			const labelWidth = canvasRenderingContext.measureText(label).width;
			canvasRenderingContext.fillStyle = "#ffcc88";
			canvasRenderingContext.font = "13px GyeonggiBatang";
			canvasRenderingContext.fillText(`[${playerState.stageName}]`, textX + labelWidth + 6, y + 19);
		}

		// 체력바 (붉은색).
		const healthBarY = y + 46;
		const barHeight = 20;
		canvasRenderingContext.fillStyle = "#331111";
		canvasRenderingContext.fillRect(textX, healthBarY, textWidth, barHeight);
		const healthRatio = playerState.maxHealth > 0 ? playerState.health / playerState.maxHealth : 0;
		const clampedHealthRatio = System.Math.max(0, System.Math.min(1, healthRatio));
		canvasRenderingContext.fillStyle = "#cc3344";
		canvasRenderingContext.fillRect(textX, healthBarY, textWidth * clampedHealthRatio, barHeight);
		canvasRenderingContext.strokeStyle = "#ffffff";
		canvasRenderingContext.lineWidth = 1;
		canvasRenderingContext.strokeRect(textX, healthBarY, textWidth, barHeight);
		canvasRenderingContext.fillStyle = "#ffffff";
		canvasRenderingContext.font = "bold 13px GyeonggiBatangBold";
		canvasRenderingContext.textAlign = "center";
		canvasRenderingContext.textBaseline = "middle";
		canvasRenderingContext.fillText(`${playerState.health}/${playerState.maxHealth}`, textX + textWidth * 0.5, healthBarY + barHeight * 0.5);

		// 행동력바 (체력바와 동일 모양, 노란색).
		const actionBarY = healthBarY + barHeight + 6;
		canvasRenderingContext.fillStyle = "#332a11";
		canvasRenderingContext.fillRect(textX, actionBarY, textWidth, barHeight);
		const actionRatio = playerState.maxActionPoints > 0 ? playerState.actionPoints / playerState.maxActionPoints : 0;
		const clampedActionRatio = System.Math.max(0, System.Math.min(1, actionRatio));
		canvasRenderingContext.fillStyle = "#e2b94a";
		canvasRenderingContext.fillRect(textX, actionBarY, textWidth * clampedActionRatio, barHeight);
		canvasRenderingContext.strokeStyle = "#ffffff";
		canvasRenderingContext.lineWidth = 1;
		canvasRenderingContext.strokeRect(textX, actionBarY, textWidth, barHeight);
		canvasRenderingContext.fillStyle = "#ffffff";
		canvasRenderingContext.font = "bold 13px GyeonggiBatangBold";
		canvasRenderingContext.textAlign = "center";
		canvasRenderingContext.textBaseline = "middle";
		canvasRenderingContext.fillText(`${playerState.actionPoints}/${playerState.maxActionPoints}`, textX + textWidth * 0.5, actionBarY + barHeight * 0.5);

		// 영력바 (체력바와 동일 모양, 파란색).
		const energyBarY = actionBarY + barHeight + 6;
		canvasRenderingContext.fillStyle = "#112233";
		canvasRenderingContext.fillRect(textX, energyBarY, textWidth, barHeight);
		const energyRatio = playerState.maxEnergy > 0 ? playerState.currentEnergy / playerState.maxEnergy : 0;
		const clampedEnergyRatio = System.Math.max(0, System.Math.min(1, energyRatio));
		canvasRenderingContext.fillStyle = "#3388ee";
		canvasRenderingContext.fillRect(textX, energyBarY, textWidth * clampedEnergyRatio, barHeight);
		canvasRenderingContext.strokeStyle = "#ffffff";
		canvasRenderingContext.lineWidth = 1;
		canvasRenderingContext.strokeRect(textX, energyBarY, textWidth, barHeight);
		canvasRenderingContext.fillStyle = "#ffffff";
		canvasRenderingContext.font = "bold 13px GyeonggiBatangBold";
		canvasRenderingContext.textAlign = "center";
		canvasRenderingContext.textBaseline = "middle";
		canvasRenderingContext.fillText(`${playerState.currentEnergy}/${playerState.maxEnergy}`, textX + textWidth * 0.5, energyBarY + barHeight * 0.5);

		// 버프 줄.
		const buffsTopY = energyBarY + barHeight + 8;
		this.drawBuffs(canvasRenderingContext, playerState, x + 14, buffsTopY, width - 28, height - (buffsTopY - y) - 10, isMe);

		// 정보창 영역 저장 (버프 툴팁 위치 계산에 사용).
		const portraitRect = { x: x, y: y, width: width, height: height };
		if (isMe) {
			this.#playerPortraitRect = portraitRect;
		}
		else {
			this.#opponentPortraitRect = portraitRect;
		}
	}

	//==============================================================================
	// 버프 출력. 숫자 대신 한 글자 아이콘 표시. 위치는 #playerBuffLayouts /
	// #opponentBuffLayouts 에 저장되어 누름 hit test 에 사용된다.
	//==============================================================================
	/**
	 * @param { CanvasRenderingContext2D } canvasRenderingContext
	 * @param { PlayerState } playerState
	 * @param { number } x
	 * @param { number } y
	 * @param { number } width
	 * @param { number } height
	 * @param { boolean } isMe
	 */
	drawBuffs(canvasRenderingContext, playerState, x, y, width, height, isMe) {
		const layoutTarget = isMe ? this.#playerBuffLayouts : this.#opponentBuffLayouts;
		layoutTarget.length = 0;
		const buffs = playerState.buffs;
		if (buffs.length === 0) {
			return;
		}
		for (let i = 0; i < buffs.length; ++i) {
			const buff = buffs[i];
			const definition = this.findBuffDefinition(buff.id) || { displayName: buff.id, isDebuff: false, icon: "?" };
			const row = System.Math.floor(i / BUFFS_PER_ROW);
			const column = i % BUFFS_PER_ROW;
			const buffX = x + column * (BUFF_ICON_SIZE + BUFF_ICON_GAP);
			const buffY = y + row * (BUFF_ICON_SIZE + BUFF_ICON_GAP);
			if (buffY + BUFF_ICON_SIZE > y + height) {
				break;
			}
			// 이득/손해만 색상 구분 (이득=청록, 손해=빨강).
			const buffBackgroundColor = definition.isDebuff ? "#993344" : "#33885a";
			canvasRenderingContext.fillStyle = buffBackgroundColor;
			canvasRenderingContext.fillRect(buffX, buffY, BUFF_ICON_SIZE, BUFF_ICON_SIZE);
			// 누르고 있는 버프와 일치하면 노란 테두리, 아니면 흰 테두리.
			const isPressed = this.#pressedBuffInfo !== null
				&& this.#pressedBuffInfo.buff === buff
				&& this.#pressedBuffInfo.side === (isMe ? PlayerSide.player : PlayerSide.opponent);
			canvasRenderingContext.strokeStyle = isPressed ? "#ffcc33" : "#ffffff";
			canvasRenderingContext.lineWidth = isPressed ? 2 : 1;
			canvasRenderingContext.strokeRect(buffX, buffY, BUFF_ICON_SIZE, BUFF_ICON_SIZE);
			canvasRenderingContext.fillStyle = "#ffffff";
			canvasRenderingContext.font = "bold 14px GyeonggiBatangBold";
			canvasRenderingContext.textAlign = "center";
			canvasRenderingContext.textBaseline = "middle";
			canvasRenderingContext.fillText(definition.icon, buffX + BUFF_ICON_SIZE * 0.5, buffY + BUFF_ICON_SIZE * 0.5);
			layoutTarget.push({ buff: buff, x: buffX, y: buffY, width: BUFF_ICON_SIZE, height: BUFF_ICON_SIZE });
		}
	}

	//==============================================================================
	// 단일 더미 슬롯 (덱 또는 무덤).
	//==============================================================================
	/**
	 * @param { CanvasRenderingContext2D } canvasRenderingContext
	 * @param { number } x
	 * @param { number } y
	 * @param { string } label
	 * @param { number } count
	 */
	drawPileSlot(canvasRenderingContext, x, y, label, count) {
		canvasRenderingContext.fillStyle = "#26263c";
		canvasRenderingContext.fillRect(x, y, SLOT_WIDTH, SLOT_HEIGHT);
		canvasRenderingContext.strokeStyle = "#888899";
		canvasRenderingContext.lineWidth = 2;
		canvasRenderingContext.strokeRect(x, y, SLOT_WIDTH, SLOT_HEIGHT);
		canvasRenderingContext.fillStyle = "#ffffff";
		canvasRenderingContext.font = "13px GyeonggiBatang";
		canvasRenderingContext.textAlign = "center";
		canvasRenderingContext.textBaseline = "top";
		canvasRenderingContext.fillText(label, x + SLOT_WIDTH * 0.5, y + 10);
		canvasRenderingContext.font = "bold 36px GyeonggiBatangBold";
		canvasRenderingContext.textBaseline = "middle";
		canvasRenderingContext.fillText(count.toString(), x + SLOT_WIDTH * 0.5, y + SLOT_HEIGHT * 0.6);
	}

	//==============================================================================
	// 로그.
	//==============================================================================
	/**
	 * @param { CanvasRenderingContext2D } canvasRenderingContext
	 * @param { number } x
	 * @param { number } y
	 * @param { number } width
	 * @param { number } height
	 */
	drawLog(canvasRenderingContext, x, y, width, height) {
		canvasRenderingContext.fillStyle = "rgba(0, 0, 0, 0.35)";
		canvasRenderingContext.fillRect(x, y, width, height);
		canvasRenderingContext.strokeStyle = "#555566";
		canvasRenderingContext.lineWidth = 1;
		canvasRenderingContext.strokeRect(x, y, width, height);

		canvasRenderingContext.fillStyle = "#aaaabb";
		canvasRenderingContext.font = "11px GyeonggiBatang";
		canvasRenderingContext.textAlign = "left";
		canvasRenderingContext.textBaseline = "top";
		canvasRenderingContext.fillText("전투 기록", x + 8, y + 6);

		canvasRenderingContext.fillStyle = "#dddddd";
		canvasRenderingContext.font = "12px GyeonggiBatang";
		const lineHeight = 15;
		const startY = y + 24;
		const maxLines = System.Math.floor((height - 28) / lineHeight);
		const visible = this.#log.slice(-maxLines);
		for (let i = 0; i < visible.length; ++i) {
			canvasRenderingContext.fillText(visible[i], x + 10, startY + i * lineHeight);
		}
	}

	//==============================================================================
	// 부채꼴 손패의 i 번째 카드 위치/회전 계산.
	// 인원이 많을수록 카드당 각도를 자동으로 줄여 총 펼침이 일정 한도 안에 들어옴.
	//==============================================================================
	/**
	 * @param { number } index
	 * @param { number } handCount
	 * @param { number } popupCenterX
	 * @param { number } popupBottomY
	 * @returns { { centerX: number, centerY: number, rotation: number } }
	 */
	computeFanCardLayout(index, handCount, popupCenterX, popupBottomY) {
		const middleCardCenterY = popupBottomY - HAND_BOTTOM_MARGIN - PLAYER_CARD_HEIGHT * 0.5;
		const fanCenterY = middleCardCenterY + FAN_ARC_RADIUS;
		const middleIndex = (handCount - 1) * 0.5;
		// 손패 많아지면 카드당 각도 자동 축소.
		const desiredPerCard = handCount > 1 ? System.Math.min(FAN_ANGLE_PER_CARD_DEG, FAN_MAX_TOTAL_SPREAD_DEG / (handCount - 1)) : 0;
		const angleDeg = (index - middleIndex) * desiredPerCard;
		const angleRad = (angleDeg * System.Math.PI) / 180;
		const centerX = popupCenterX + FAN_ARC_RADIUS * System.Math.sin(angleRad);
		const centerY = fanCenterY - FAN_ARC_RADIUS * System.Math.cos(angleRad);
		return { centerX: centerX, centerY: centerY, rotation: angleRad };
	}

	//==============================================================================
	// 플레이어 손패 출력 (부채꼴). 좌(인덱스 작음) → 우 (인덱스 큼) 순서로 그려서
	// 우측 카드가 위에 쌓임. 선택된 카드는 회전 0 + 확대 + 맨 위.
	//==============================================================================
	/**
	 * @param { CanvasRenderingContext2D } canvasRenderingContext
	 * @param { { x: number, y: number, width: number, height: number } } popupRect
	 * @param { number } cardCenterY
	 */
	drawPlayerHand(canvasRenderingContext, popupRect, cardCenterY) {
		this.#playerHandLayouts = [];
		const handCount = this.#player.hand.length;
		if (handCount === 0) {
			return;
		}
		const popupCenterX = popupRect.x + popupRect.width * 0.5;
		const popupBottomY = popupRect.y + popupRect.height;

		const allLayouts = [];
		for (let i = 0; i < handCount; ++i) {
			const card = this.#player.hand[i];
			const fanLayout = this.computeFanCardLayout(i, handCount, popupCenterX, popupBottomY);
			// 선택 트윈 보간 (0=부채꼴, 1=픽업).
			const sp = card.selectionProgress;
			const layoutEntry = {
				card: card,
				centerX: fanLayout.centerX,
				centerY: fanLayout.centerY - PICKED_CARD_LIFT * sp,
				rotation: fanLayout.rotation * (1 - sp),
				scale: 1 + (PICKED_CARD_SCALE - 1) * sp,
			};
			allLayouts.push(layoutEntry);
			this.#playerHandLayouts.push(layoutEntry);
		}

		// 좌(인덱스 작음) → 우 (인덱스 큼) 순서로 그림. 선택 진행 중인 카드는 맨 위로.
		for (const layoutEntry of allLayouts) {
			if (layoutEntry.card.selectionProgress > 0) {
				continue;
			}
			this.drawHandCard(canvasRenderingContext, layoutEntry);
		}
		for (const layoutEntry of allLayouts) {
			if (layoutEntry.card.selectionProgress > 0) {
				this.drawHandCard(canvasRenderingContext, layoutEntry);
			}
		}
	}

	//==============================================================================
	// 손패 카드 한 장 (회전/스케일 적용).
	//==============================================================================
	/**
	 * @param { CanvasRenderingContext2D } canvasRenderingContext
	 * @param { { card: Card, centerX: number, centerY: number, rotation: number, scale: number } } layoutEntry
	 */
	drawHandCard(canvasRenderingContext, layoutEntry) {
		const card = layoutEntry.card;
		// 진입 애니메이션: 덱 슬롯 위치에서 부채꼴 위치로 보간.
		let drawCenterX = layoutEntry.centerX;
		let drawCenterY = layoutEntry.centerY;
		let drawRotation = layoutEntry.rotation;
		let alpha = 1;
		if (card.enterTime > 0 && this.#playerDeckSlotCenter) {
			const progress = 1 - card.enterTime / ENTER_DURATION;
			const eased = this.easeOutCubic(progress);
			drawCenterX = this.lerp(this.#playerDeckSlotCenter.x, layoutEntry.centerX, eased);
			drawCenterY = this.lerp(this.#playerDeckSlotCenter.y, layoutEntry.centerY, eased);
			drawRotation = layoutEntry.rotation * eased;
			alpha = progress;
		}
		canvasRenderingContext.save();
		canvasRenderingContext.translate(drawCenterX, drawCenterY);
		canvasRenderingContext.rotate(drawRotation);
		canvasRenderingContext.scale(layoutEntry.scale, layoutEntry.scale);
		const localLayout = {
			x: -PLAYER_CARD_WIDTH * 0.5,
			y: -PLAYER_CARD_HEIGHT * 0.5,
			width: PLAYER_CARD_WIDTH,
			height: PLAYER_CARD_HEIGHT,
		};
		// 행동력 부족 여부 (현재 행동력 < 카드 cost) → cost 원 빨간색으로 강조.
		// 선택 진행 중이면 카드 외곽선 자체를 노랑으로 (별도 테두리 추가 X).
		const definition = this.findCardDefinition(card.cardId);
		const cost = definition && typeof definition.cost === "number" ? definition.cost : 0;
		const isAffordable = this.#player.actionPoints >= cost;
		const isSelected = card.selectionProgress >= 0.5;
		// 손패 카드는 현재 버프 상태가 반영된 설명을 표시 (피해 +힘 / 약화 / 취약 / 내공 등).
		const effectiveDescription = this.getEffectiveCardDescription(definition, this.#player, this.#opponent);
		this.drawCard(canvasRenderingContext, card, localLayout, alpha, false, isAffordable, isSelected, effectiveDescription);
		canvasRenderingContext.restore();
	}

	//==============================================================================
	// 상대 부채꼴 카드 위치 계산. 플레이어 부채꼴의 상하 대칭.
	// fanCenter 는 카드 라인 위쪽에 위치하여 카드들이 아래로 호를 그린다.
	//==============================================================================
	/**
	 * @param { number } index
	 * @param { number } handCount
	 * @param { number } popupCenterX
	 * @param { number } middleCardCenterY
	 * @returns { { centerX: number, centerY: number, rotation: number } }
	 */
	computeOpponentFanCardLayout(index, handCount, popupCenterX, middleCardCenterY) {
		const fanCenterY = middleCardCenterY - FAN_ARC_RADIUS;
		const middleIndex = (handCount - 1) * 0.5;
		const desiredPerCard = handCount > 1 ? System.Math.min(FAN_ANGLE_PER_CARD_DEG, FAN_MAX_TOTAL_SPREAD_DEG / (handCount - 1)) : 0;
		const angleDeg = (index - middleIndex) * desiredPerCard;
		const angleRad = (angleDeg * System.Math.PI) / 180;
		const centerX = popupCenterX + FAN_ARC_RADIUS * System.Math.sin(angleRad);
		const centerY = fanCenterY + FAN_ARC_RADIUS * System.Math.cos(angleRad);
		return { centerX: centerX, centerY: centerY, rotation: -angleRad };
	}

	//==============================================================================
	// 상대 핸드 출력 (뒷면, 부채꼴). hit 용 layout 은 회전 무시 axis-aligned 로 저장.
	//==============================================================================
	/**
	 * @param { CanvasRenderingContext2D } canvasRenderingContext
	 * @param { { x: number, y: number, width: number, height: number } } popupRect
	 * @param { number } cardCenterY
	 */
	drawOpponentHand(canvasRenderingContext, popupRect, cardCenterY) {
		this.#opponentCardLayouts = [];
		const handCount = this.#opponent.hand.length;
		if (handCount === 0) {
			return;
		}
		const popupCenterX = popupRect.x + popupRect.width * 0.5;
		for (let i = 0; i < handCount; ++i) {
			const card = this.#opponent.hand[i];
			const fanLayout = this.computeOpponentFanCardLayout(i, handCount, popupCenterX, cardCenterY);
			// 진입 보간: 적 덱 슬롯 → 부채꼴 위치.
			let drawCenterX = fanLayout.centerX;
			let drawCenterY = fanLayout.centerY;
			let drawRotation = fanLayout.rotation;
			let alpha = 1;
			if (card.enterTime > 0 && this.#opponentDeckSlotCenter) {
				const progress = 1 - card.enterTime / ENTER_DURATION;
				const eased = this.easeOutCubic(progress);
				drawCenterX = this.lerp(this.#opponentDeckSlotCenter.x, fanLayout.centerX, eased);
				drawCenterY = this.lerp(this.#opponentDeckSlotCenter.y, fanLayout.centerY, eased);
				drawRotation = fanLayout.rotation * eased;
				alpha = progress;
			}
			canvasRenderingContext.save();
			canvasRenderingContext.translate(drawCenterX, drawCenterY);
			canvasRenderingContext.rotate(drawRotation);
			const localLayout = {
				x: -OPPONENT_CARD_WIDTH * 0.5,
				y: -OPPONENT_CARD_HEIGHT * 0.5,
				width: OPPONENT_CARD_WIDTH,
				height: OPPONENT_CARD_HEIGHT,
			};
			this.drawCard(canvasRenderingContext, card, localLayout, alpha, true);
			canvasRenderingContext.restore();

			// hit / exit 등록용 axis-aligned 사각형 (회전된 카드를 단순 사각형으로 근사).
			const halfWidth = OPPONENT_CARD_WIDTH * 0.5;
			const halfHeight = OPPONENT_CARD_HEIGHT * 0.5;
			this.#opponentCardLayouts.push({
				x: fanLayout.centerX - halfWidth,
				y: fanLayout.centerY - halfHeight,
				width: OPPONENT_CARD_WIDTH,
				height: OPPONENT_CARD_HEIGHT,
			});
		}
	}

	//==============================================================================
	// 진입 애니메이션 보간.
	//==============================================================================
	/**
	 * @param { Card } card
	 * @param { boolean } isOpponent
	 * @returns { { yOffset: number, alpha: number } }
	 */
	computeEnterAnimation(card, isOpponent) {
		if (card.enterTime <= 0) {
			return { yOffset: 0, alpha: 1 };
		}
		const progress = 1 - card.enterTime / ENTER_DURATION;
		const slideDistance = isOpponent ? -50 : 50;
		const yOffset = (1 - progress) * slideDistance;
		const alpha = progress;
		return { yOffset: yOffset, alpha: alpha };
	}

	//==============================================================================
	// 사용 중인 카드 출력 (3단계: cast → hold → discard).
	//==============================================================================
	/**
	 * @param { CanvasRenderingContext2D } canvasRenderingContext
	 * @param { { x: number, y: number, width: number, height: number } } popupRect
	 */
	drawExitingCards(canvasRenderingContext, popupRect) {
		// 발동 위치 (무대 중앙).
		const castCenter = this.computeCastCenter(popupRect);

		// 플레이어 카드.
		for (const exitingEntry of this.#playerExitingCards) {
			const sourceCenterX = exitingEntry.layout.x + exitingEntry.layout.width * 0.5;
			const sourceCenterY = exitingEntry.layout.y + exitingEntry.layout.height * 0.5;
			const targetCenterX = this.#playerDiscardSlotCenter ? this.#playerDiscardSlotCenter.x : sourceCenterX;
			const targetCenterY = this.#playerDiscardSlotCenter ? this.#playerDiscardSlotCenter.y : sourceCenterY;
			this.drawExitingCardEntry(canvasRenderingContext, exitingEntry, sourceCenterX, sourceCenterY, castCenter.x, castCenter.y, targetCenterX, targetCenterY, false);
		}
		// 적 카드.
		for (const exitingEntry of this.#opponentExitingCards) {
			const sourceCenterX = exitingEntry.layout.x + exitingEntry.layout.width * 0.5;
			const sourceCenterY = exitingEntry.layout.y + exitingEntry.layout.height * 0.5;
			const targetCenterX = this.#opponentDiscardSlotCenter ? this.#opponentDiscardSlotCenter.x : sourceCenterX;
			const targetCenterY = this.#opponentDiscardSlotCenter ? this.#opponentDiscardSlotCenter.y : sourceCenterY;
			const isFaceDown = !exitingEntry.isReveal;
			this.drawExitingCardEntry(canvasRenderingContext, exitingEntry, sourceCenterX, sourceCenterY, castCenter.x, castCenter.y, targetCenterX, targetCenterY, isFaceDown);
		}
	}

	//==============================================================================
	// 사용 중 단일 카드 출력. 단계별 위치/크기/알파 계산.
	//==============================================================================
	/**
	 * @param { CanvasRenderingContext2D } canvasRenderingContext
	 * @param { { card: Card, layout: { x: number, y: number, width: number, height: number }, elapsed: number, actorSide: string, targetSide: string, isReveal: boolean } } exitingEntry
	 * @param { number } sourceCenterX
	 * @param { number } sourceCenterY
	 * @param { number } castCenterX
	 * @param { number } castCenterY
	 * @param { number } targetCenterX
	 * @param { number } targetCenterY
	 * @param { boolean } isFaceDown
	 */
	drawExitingCardEntry(canvasRenderingContext, exitingEntry, sourceCenterX, sourceCenterY, castCenterX, castCenterY, targetCenterX, targetCenterY, isFaceDown) {
		const elapsed = exitingEntry.elapsed;
		let drawCenterX = sourceCenterX;
		let drawCenterY = sourceCenterY;
		let cardScale = 1.0;
		let alpha = 1.0;
		if (elapsed < CARD_CAST_DURATION) {
			// 1) cast: 손에서 발동 위치로 이동, 1.0 → CARD_CAST_SCALE.
			const phaseT = elapsed / CARD_CAST_DURATION;
			const easedT = this.easeOutCubic(phaseT);
			drawCenterX = this.lerp(sourceCenterX, castCenterX, easedT);
			drawCenterY = this.lerp(sourceCenterY, castCenterY, easedT);
			cardScale = this.lerp(1.0, CARD_CAST_SCALE, easedT);
			alpha = 1.0;
		}
		else if (elapsed < CARD_CAST_DURATION + CARD_HOLD_DURATION) {
			// 2) hold: 발동 위치에 머무름, 미세 펄스.
			const phaseT = (elapsed - CARD_CAST_DURATION) / CARD_HOLD_DURATION;
			drawCenterX = castCenterX;
			drawCenterY = castCenterY;
			cardScale = CARD_CAST_SCALE + System.Math.sin(phaseT * System.Math.PI * 2.0) * 0.05;
			alpha = 1.0;
		}
		else {
			// 3) discard: 발동 위치에서 무덤으로, CARD_CAST_SCALE → CARD_DISCARD_END_SCALE + 페이드.
			const phaseT = (elapsed - CARD_CAST_DURATION - CARD_HOLD_DURATION) / CARD_DISCARD_DURATION;
			const easedT = this.easeOutCubic(phaseT);
			drawCenterX = this.lerp(castCenterX, targetCenterX, easedT);
			drawCenterY = this.lerp(castCenterY, targetCenterY, easedT);
			cardScale = this.lerp(CARD_CAST_SCALE, CARD_DISCARD_END_SCALE, easedT);
			alpha = 1.0 - phaseT * 0.5;
		}

		// 카드 내부 요소(폰트/원/여백 등)가 따로 늘었다 줄지 않도록 캔버스 변환으로 통째 스케일.
		// 원래 layout 사이즈로 (0,0) 기준에 그리고, 외부에서 중심 정렬 + scale 만 적용.
		const baseWidth = exitingEntry.layout.width;
		const baseHeight = exitingEntry.layout.height;
		const drawLayout = {
			x: 0,
			y: 0,
			width: baseWidth,
			height: baseHeight,
		};
		canvasRenderingContext.save();
		canvasRenderingContext.translate(drawCenterX, drawCenterY);
		canvasRenderingContext.scale(cardScale, cardScale);
		canvasRenderingContext.translate(-baseWidth * 0.5, -baseHeight * 0.5);
		this.drawCard(canvasRenderingContext, exitingEntry.card, drawLayout, alpha, isFaceDown);
		canvasRenderingContext.restore();
	}

	//==============================================================================
	// 카드 발동 위치 (무대 중앙) 계산.
	//==============================================================================
	/**
	 * @param { { x: number, y: number, width: number, height: number } } popupRect
	 * @returns { { x: number, y: number } }
	 */
	computeCastCenter(popupRect) {
		const opponentHandTopY = popupRect.y + HAND_BOTTOM_MARGIN + (SLOT_HEIGHT - OPPONENT_CARD_HEIGHT) * 0.5;
		const opponentSlotY = opponentHandTopY + (OPPONENT_CARD_HEIGHT - SLOT_HEIGHT) * 0.5;
		const playerHandLineY = popupRect.y + popupRect.height - HAND_BOTTOM_MARGIN - PLAYER_CARD_HEIGHT * 0.5;
		const playerSlotY = playerHandLineY - SLOT_HEIGHT * 0.5;
		const stageAreaTop = opponentSlotY + SLOT_HEIGHT;
		const stageAreaBottom = playerSlotY;
		const castCenterX = popupRect.x + popupRect.width * 0.5;
		const castCenterY = (stageAreaTop + stageAreaBottom) * 0.5;
		return { x: castCenterX, y: castCenterY };
	}

	//==============================================================================
	// 현재 cast/hold 단계에 있는 가장 최근 사용 카드 반환 (없으면 null).
	// - 무대 캐릭터 인터랙션 계산용.
	//==============================================================================
	/**
	 * @returns { { actorSide: string, targetSide: string, elapsed: number } | null }
	 */
	findActiveCast() {
		let latest = null;
		const allLists = [this.#playerExitingCards, this.#opponentExitingCards];
		for (const list of allLists) {
			for (const entry of list) {
				if (entry.elapsed < CARD_CAST_DURATION + CARD_HOLD_DURATION) {
					if (latest === null || entry.elapsed < latest.elapsed) {
						latest = entry;
					}
				}
			}
		}
		return latest;
	}

	//==============================================================================
	// 무대 캐릭터에 적용할 인터랙션 효과 계산.
	// - 시전자: cast/hold 동안 펄스 스케일.
	// - 피격자(시전자와 다를 때): hold 동안 흔들림 + 붉은 플래시.
	//==============================================================================
	/**
	 * @param { string } side
	 * @param { { actorSide: string, targetSide: string, elapsed: number } | null } activeCast
	 * @returns { { scale: number, offsetX: number, offsetY: number, flashIntensity: number } }
	 */
	computeStageInteraction(side, activeCast) {
		const result = { scale: 1.0, offsetX: 0, offsetY: 0, flashIntensity: 0 };
		if (activeCast === null) {
			return result;
		}
		const elapsed = activeCast.elapsed;
		const isInHoldPhase = elapsed >= CARD_CAST_DURATION;
		if (side === activeCast.actorSide) {
			const totalPhaseT = elapsed / (CARD_CAST_DURATION + CARD_HOLD_DURATION);
			result.scale = 1.0 + System.Math.sin(totalPhaseT * System.Math.PI) * STAGE_ACTOR_PULSE_AMOUNT;
		}
		if (side === activeCast.targetSide && side !== activeCast.actorSide && isInHoldPhase) {
			const holdT = (elapsed - CARD_CAST_DURATION) / CARD_HOLD_DURATION;
			const decay = 1.0 - holdT;
			result.offsetX = System.Math.sin(holdT * System.Math.PI * 8.0) * STAGE_TARGET_SHAKE_AMOUNT * decay;
			result.flashIntensity = decay * STAGE_TARGET_FLASH_PEAK;
		}
		return result;
	}

	//==============================================================================
	// 카드 effects 의 각 값에 actor / target 의 현재 버프 보정을 적용한 결과 배열.
	// damage 효과는 strength + (attack 카드면 focus + 내공) + 약화 25% 감소 + target 취약 50% 증가 순.
	// block 효과는 dexterity 가산. 그 외는 정의값 그대로.
	//==============================================================================
	/**
	 * @param { Object } definition
	 * @param { PlayerState } actor
	 * @param { PlayerState | null } target
	 * @returns { number[] }
	 */
	computeAdjustedEffectValues(definition, actor, target) {
		const adjustedValues = [];
		if (!definition || !System.Array.isArray(definition.effects)) {
			return adjustedValues;
		}
		const strengthBuff = actor.buffs.find((b) => b.id === "strength");
		const dexterityBuff = actor.buffs.find((b) => b.id === "dexterity");
		const weakenBuff = actor.buffs.find((b) => b.id === "weaken");
		const focusBuff = actor.buffs.find((b) => b.id === "focus");
		const empowerBuff = actor.buffs.find((b) => b.id === "empower");
		const targetVulnerableBuff = target ? target.buffs.find((b) => b.id === "vulnerable") : null;
		const strengthBonus = strengthBuff ? strengthBuff.value : 0;
		const dexterityBonus = dexterityBuff ? dexterityBuff.value : 0;
		const weakenAmount = weakenBuff ? weakenBuff.value : 0;
		const focusBonus = focusBuff ? focusBuff.value : 0;
		const empowerBonus = empowerBuff ? empowerBuff.value : 0;
		const targetVulnerableAmount = targetVulnerableBuff ? targetVulnerableBuff.value : 0;
		const isAttackCard = definition.cardType === "attack";
		for (const effect of definition.effects) {
			if (effect.type === "damage") {
				let damageValue = effect.value + strengthBonus;
				if (isAttackCard) {
					damageValue += focusBonus + empowerBonus;
				}
				if (weakenAmount > 0) {
					damageValue = System.Math.floor(damageValue * 0.75);
				}
				if (targetVulnerableAmount > 0) {
					damageValue = System.Math.floor(damageValue * 1.5);
				}
				if (damageValue < 0) {
					damageValue = 0;
				}
				adjustedValues.push(damageValue);
			}
			else if (effect.type === "block") {
				const blockValue = effect.value + dexterityBonus;
				adjustedValues.push(blockValue);
			}
			else if (typeof effect.value === "number") {
				adjustedValues.push(effect.value);
			}
		}
		return adjustedValues;
	}

	//==============================================================================
	// 카드 설명 안의 숫자를 effects 순서대로 보정값으로 치환.
	// 정의에 effects 가 없거나 description 이 없으면 원문 반환.
	//==============================================================================
	/**
	 * @param { Object } definition
	 * @param { PlayerState } actor
	 * @param { PlayerState | null } target
	 * @returns { string }
	 */
	getEffectiveCardDescription(definition, actor, target) {
		if (!definition || typeof definition.description !== "string") {
			return "";
		}
		const baseDescription = definition.description;
		const adjustedValues = this.computeAdjustedEffectValues(definition, actor, target);
		if (adjustedValues.length === 0) {
			return baseDescription;
		}
		let result = "";
		let valueIndex = 0;
		let charIndex = 0;
		while (charIndex < baseDescription.length) {
			const ch = baseDescription.charAt(charIndex);
			if (ch >= "0" && ch <= "9") {
				let endIndex = charIndex + 1;
				while (endIndex < baseDescription.length && baseDescription.charAt(endIndex) >= "0" && baseDescription.charAt(endIndex) <= "9") {
					endIndex += 1;
				}
				if (valueIndex < adjustedValues.length) {
					result += adjustedValues[valueIndex].toString();
					valueIndex += 1;
				}
				else {
					result += baseDescription.slice(charIndex, endIndex);
				}
				charIndex = endIndex;
			}
			else {
				result += ch;
				charIndex += 1;
			}
		}
		return result;
	}

	//==============================================================================
	// 단일 카드 출력. 영력 cost 원의 배경색은 등급에 따른 색상 (GRADE_COLORS).
	//==============================================================================
	/**
	 * @param { CanvasRenderingContext2D } canvasRenderingContext
	 * @param { Card } card
	 * @param { { x: number, y: number, width: number, height: number } } cardLayout
	 * @param { number } alpha
	 * @param { boolean } isFaceDown
	 */
	drawCard(canvasRenderingContext, card, cardLayout, alpha, isFaceDown, isAffordable, isSelected, effectiveDescription) {
		if (typeof isAffordable !== "boolean") {
			isAffordable = true;
		}
		if (typeof isSelected !== "boolean") {
			isSelected = false;
		}
		const cardBorderColor = isSelected ? "#ffcc33" : "#ffffff";
		const cardBorderWidth = isSelected ? 3 : 2;
		canvasRenderingContext.save();
		canvasRenderingContext.globalAlpha = alpha;
		if (isFaceDown) {
			// 종파별 고유 뒷면색 (secttable.json 의 backColor / emblemColor).
			const cardDefinition = this.findCardDefinition(card.cardId);
			const sectId = cardDefinition && typeof cardDefinition.sect === "number" ? cardDefinition.sect : 0;
			const sectDefinition = this.findSectDefinition(sectId);
			const sectBackground = sectDefinition && sectDefinition.backColor ? sectDefinition.backColor : DEFAULT_SECT_BACK_COLOR;
			const sectEmblem = sectDefinition && sectDefinition.emblemColor ? sectDefinition.emblemColor : DEFAULT_SECT_EMBLEM_COLOR;
			canvasRenderingContext.fillStyle = sectBackground;
			canvasRenderingContext.fillRect(cardLayout.x, cardLayout.y, cardLayout.width, cardLayout.height);
			canvasRenderingContext.strokeStyle = cardBorderColor;
			canvasRenderingContext.lineWidth = cardBorderWidth;
			canvasRenderingContext.strokeRect(cardLayout.x, cardLayout.y, cardLayout.width, cardLayout.height);
			canvasRenderingContext.fillStyle = sectEmblem;
			const centerX = cardLayout.x + cardLayout.width * 0.5;
			const centerY = cardLayout.y + cardLayout.height * 0.5;
			const halfDiamond = System.Math.min(cardLayout.width, cardLayout.height) * 0.25;
			canvasRenderingContext.beginPath();
			canvasRenderingContext.moveTo(centerX, centerY - halfDiamond);
			canvasRenderingContext.lineTo(centerX + halfDiamond, centerY);
			canvasRenderingContext.lineTo(centerX, centerY + halfDiamond);
			canvasRenderingContext.lineTo(centerX - halfDiamond, centerY);
			canvasRenderingContext.closePath();
			canvasRenderingContext.fill();
		}
		else {
			const definition = this.findCardDefinition(card.cardId);
			const cardColor = definition ? definition.color : "#666666";
			const displayName = definition ? definition.displayName : "?";
			const description = typeof effectiveDescription === "string" ? effectiveDescription : (definition ? definition.description : "");
			const cost = definition && typeof definition.cost === "number" ? definition.cost : 0;
			const grade = definition && typeof definition.grade === "number" ? definition.grade : 1;
			const gradeDefinition = this.findGradeDefinition(grade);
			const gradeColor = gradeDefinition && gradeDefinition.color ? gradeDefinition.color : DEFAULT_GRADE_COLOR;

			// 1) 배경 + 외곽선 (클리핑 없음). 선택 카드면 외곽선 노랑 + 굵게.
			canvasRenderingContext.fillStyle = cardColor;
			canvasRenderingContext.fillRect(cardLayout.x, cardLayout.y, cardLayout.width, cardLayout.height);
			canvasRenderingContext.strokeStyle = cardBorderColor;
			canvasRenderingContext.lineWidth = cardBorderWidth;
			canvasRenderingContext.strokeRect(cardLayout.x, cardLayout.y, cardLayout.width, cardLayout.height);

			// 폰트 절대 크기: 기존 (84px 카드 기준 13/10) 의 75%. 1.5배 커진 카드 폭(126) 에 맞춘 계수.
			const baseTitleFontSize = System.Math.max(8, System.Math.floor(cardLayout.width * 0.08));
			const descriptionFontSize = System.Math.max(8, System.Math.floor(cardLayout.width * 0.07));
			const nameAreaTop = cardLayout.y;
			const nameAreaBottom = cardLayout.y + cardLayout.height * 0.22;
			const descriptionAreaTop = cardLayout.y + cardLayout.height * 0.30;
			const descriptionAreaBottom = cardLayout.y + cardLayout.height - 4;

			// 2) 설명 영역 배경 (반투명 검정 박스).
			canvasRenderingContext.fillStyle = "rgba(0, 0, 0, 0.45)";
			canvasRenderingContext.fillRect(cardLayout.x + 4, descriptionAreaTop, cardLayout.width - 8, descriptionAreaBottom - descriptionAreaTop);

			// 3) 카드 영역 안의 글자만 클리핑 (이름 + 설명).
			canvasRenderingContext.save();
			canvasRenderingContext.beginPath();
			canvasRenderingContext.rect(cardLayout.x, cardLayout.y, cardLayout.width, cardLayout.height);
			canvasRenderingContext.clip();

			// 이름. 카드 폭에 맞춰 자동 축소 (최대 10자급 제목 수용).
			canvasRenderingContext.fillStyle = "#ffffff";
			canvasRenderingContext.textAlign = "center";
			canvasRenderingContext.textBaseline = "middle";
			const titleMaxWidth = cardLayout.width - 8;
			let titleFontSize = baseTitleFontSize;
			canvasRenderingContext.font = `bold ${titleFontSize}px GyeonggiBatangBold`;
			let titleMetrics = canvasRenderingContext.measureText(displayName);
			while (titleMetrics.width > titleMaxWidth && titleFontSize > 7) {
				titleFontSize -= 1;
				canvasRenderingContext.font = `bold ${titleFontSize}px GyeonggiBatangBold`;
				titleMetrics = canvasRenderingContext.measureText(displayName);
			}
			const nameCenterY = (nameAreaTop + nameAreaBottom) * 0.5;
			canvasRenderingContext.fillText(displayName, cardLayout.x + cardLayout.width * 0.5, nameCenterY);

			// 설명 (자동 줄바꿈, 숫자만 형광녹색).
			if (cardLayout.height >= 90 && description.length > 0) {
				canvasRenderingContext.font = `${descriptionFontSize}px GyeonggiBatang`;
				const descriptionPaddingX = 6;
				const descriptionMaxWidth = cardLayout.width - descriptionPaddingX * 2;
				const descriptionLines = this.wrapTextByWidth(canvasRenderingContext, description, descriptionMaxWidth);
				const descriptionLineHeight = descriptionFontSize + 3;
				const descriptionTotalHeight = descriptionLines.length * descriptionLineHeight;
				const descriptionCenterY = (descriptionAreaTop + descriptionAreaBottom) * 0.5;
				const descriptionStartY = descriptionCenterY - descriptionTotalHeight * 0.5 + descriptionLineHeight * 0.5;
				canvasRenderingContext.textBaseline = "middle";
				for (let i = 0; i < descriptionLines.length; ++i) {
					this.drawColoredDescriptionLine(canvasRenderingContext, descriptionLines[i], cardLayout.x + cardLayout.width * 0.5, descriptionStartY + i * descriptionLineHeight);
				}
			}

			canvasRenderingContext.restore();

			// 4) 영력 cost 원 (좌상 모서리 외곽, 클리핑 영향 없음).
			//    영력 부족이면 빨간색으로 덮어 등급색보다 우선 강조.
			const costRadius = System.Math.max(6, System.Math.floor(cardLayout.width * 0.09));
			const costCenterX = cardLayout.x + costRadius * 0.3;
			const costCenterY = cardLayout.y + costRadius * 0.3;
			const costFillColor = isAffordable ? gradeColor : "#cc2233";
			const costStrokeColor = isAffordable ? "#222222" : "#660000";
			canvasRenderingContext.fillStyle = costFillColor;
			canvasRenderingContext.beginPath();
			canvasRenderingContext.arc(costCenterX, costCenterY, costRadius, 0, System.Math.PI * 2);
			canvasRenderingContext.fill();
			canvasRenderingContext.strokeStyle = costStrokeColor;
			canvasRenderingContext.lineWidth = isAffordable ? 1.5 : 2;
			canvasRenderingContext.stroke();
			const isLightBg = isAffordable && (grade === 1 || grade === 6);
			canvasRenderingContext.fillStyle = isLightBg ? "#222222" : "#ffffff";
			canvasRenderingContext.font = `bold ${costRadius + 2}px GyeonggiBatangBold`;
			canvasRenderingContext.textAlign = "center";
			canvasRenderingContext.textBaseline = "middle";
			canvasRenderingContext.fillText(cost.toString(), costCenterX, costCenterY);
		}
		canvasRenderingContext.restore();
	}

	//==============================================================================
	// 한 줄 텍스트를 숫자/비숫자 토큰으로 분할.
	//==============================================================================
	/**
	 * @param { string } line
	 * @returns { Array<{ text: string, isDigit: boolean }> }
	 */
	tokenizeForColor(line) {
		const tokens = [];
		let buffer = "";
		let bufferIsDigit = false;
		for (const ch of line) {
			const isDigit = ch >= "0" && ch <= "9";
			if (buffer.length === 0) {
				buffer = ch;
				bufferIsDigit = isDigit;
				continue;
			}
			if (isDigit === bufferIsDigit) {
				buffer += ch;
			}
			else {
				tokens.push({ text: buffer, isDigit: bufferIsDigit });
				buffer = ch;
				bufferIsDigit = isDigit;
			}
		}
		if (buffer.length > 0) {
			tokens.push({ text: buffer, isDigit: bufferIsDigit });
		}
		return tokens;
	}

	//==============================================================================
	// 카드 설명 한 줄 (가운데 정렬). 숫자는 형광녹색, 그 외는 흰색.
	//==============================================================================
	/**
	 * @param { CanvasRenderingContext2D } canvasRenderingContext
	 * @param { string } line
	 * @param { number } centerX
	 * @param { number } y
	 */
	drawColoredDescriptionLine(canvasRenderingContext, line, centerX, y) {
		const tokens = this.tokenizeForColor(line);
		let totalWidth = 0;
		for (const token of tokens) {
			totalWidth += canvasRenderingContext.measureText(token.text).width;
		}
		canvasRenderingContext.textAlign = "left";
		let cursorX = centerX - totalWidth * 0.5;
		for (const token of tokens) {
			canvasRenderingContext.fillStyle = token.isDigit ? "#5cff7c" : "#ffffff";
			canvasRenderingContext.fillText(token.text, cursorX, y);
			cursorX += canvasRenderingContext.measureText(token.text).width;
		}
	}

	//==============================================================================
	// 일반 텍스트 한 줄 (좌측 시작 x 기준). 숫자는 형광녹색, 그 외는 회색.
	//==============================================================================
	/**
	 * @param { CanvasRenderingContext2D } canvasRenderingContext
	 * @param { string } line
	 * @param { number } startX
	 * @param { number } y
	 */
	drawColoredTextLine(canvasRenderingContext, line, startX, y) {
		const tokens = this.tokenizeForColor(line);
		canvasRenderingContext.textAlign = "left";
		let cursorX = startX;
		for (const token of tokens) {
			canvasRenderingContext.fillStyle = token.isDigit ? "#5cff7c" : "#cccccc";
			canvasRenderingContext.fillText(token.text, cursorX, y);
			cursorX += canvasRenderingContext.measureText(token.text).width;
		}
	}

	//==============================================================================
	// 턴종료 버튼. enabled = false 면 회색 + 클릭 무효.
	//==============================================================================
	/**
	 * @param { CanvasRenderingContext2D } canvasRenderingContext
	 * @param { number } x
	 * @param { number } y
	 * @param { boolean } enabled
	 */
	drawAbandonButton(canvasRenderingContext, x, y, enabled) {
		this.#abandonButtonRect = { x: x, y: y, width: END_TURN_BUTTON_WIDTH, height: END_TURN_BUTTON_HEIGHT };
		canvasRenderingContext.fillStyle = enabled ? "#993333" : "#3a2a2a";
		canvasRenderingContext.fillRect(x, y, END_TURN_BUTTON_WIDTH, END_TURN_BUTTON_HEIGHT);
		canvasRenderingContext.strokeStyle = enabled ? "#ffffff" : "#666666";
		canvasRenderingContext.lineWidth = 2;
		canvasRenderingContext.strokeRect(x, y, END_TURN_BUTTON_WIDTH, END_TURN_BUTTON_HEIGHT);
		canvasRenderingContext.fillStyle = enabled ? "#ffffff" : "#888888";
		canvasRenderingContext.font = "bold 16px GyeonggiBatangBold, sans-serif";
		canvasRenderingContext.textAlign = "center";
		canvasRenderingContext.textBaseline = "middle";
		canvasRenderingContext.fillText("전투 포기", x + END_TURN_BUTTON_WIDTH * 0.5, y + END_TURN_BUTTON_HEIGHT * 0.5);
	}

	drawEndTurnButton(canvasRenderingContext, x, y, enabled) {
		this.#endTurnButtonRect = { x: x, y: y, width: END_TURN_BUTTON_WIDTH, height: END_TURN_BUTTON_HEIGHT };
		canvasRenderingContext.fillStyle = enabled ? "#aa6633" : "#3a3a3a";
		canvasRenderingContext.fillRect(x, y, END_TURN_BUTTON_WIDTH, END_TURN_BUTTON_HEIGHT);
		canvasRenderingContext.strokeStyle = enabled ? "#ffffff" : "#666666";
		canvasRenderingContext.lineWidth = 2;
		canvasRenderingContext.strokeRect(x, y, END_TURN_BUTTON_WIDTH, END_TURN_BUTTON_HEIGHT);
		canvasRenderingContext.fillStyle = enabled ? "#ffffff" : "#888888";
		canvasRenderingContext.font = "bold 16px GyeonggiBatangBold, sans-serif";
		canvasRenderingContext.textAlign = "center";
		canvasRenderingContext.textBaseline = "middle";
		canvasRenderingContext.fillText("행동 종료", x + END_TURN_BUTTON_WIDTH * 0.5, y + END_TURN_BUTTON_HEIGHT * 0.5);
	}

	//==============================================================================
	// 4개 더미 슬롯 hit-test → 해당 더미 보기 팝업 열기.
	// - 내 산패 / 내 묘패 / 적의 산패 / 적의 묘패.
	// - 슬롯 위치는 draw() 에서 매 프레임 갱신되는 *SlotCenter 필드를 사용해 사각형으로 환원.
	//==============================================================================
	/**
	 * @param { import("../libs/vanilla.js/src/base/vector2.js").Vector2 } viewInputPosition
	 * @returns { boolean }
	 */
	tryOpenPileViewBySlotHit(viewInputPosition) {
		const slotChecks = [
			{ center: this.#playerDeckSlotCenter, title: "내 산패", cards: this.#player.deck },
			{ center: this.#playerDiscardSlotCenter, title: "내 묘패", cards: this.#player.discard },
			{ center: this.#opponentDeckSlotCenter, title: "적의 산패", cards: this.#opponent.deck },
			{ center: this.#opponentDiscardSlotCenter, title: "적의 묘패", cards: this.#opponent.discard },
		];
		for (const slotCheck of slotChecks) {
			if (!slotCheck.center) {
				continue;
			}
			const slotRect = {
				x: slotCheck.center.x - SLOT_WIDTH * 0.5,
				y: slotCheck.center.y - SLOT_HEIGHT * 0.5,
				width: SLOT_WIDTH,
				height: SLOT_HEIGHT,
			};
			if (this.isInsideRect(viewInputPosition, slotRect)) {
				this.openPileView(slotCheck.title, slotCheck.cards);
				return true;
			}
		}
		return false;
	}

	//==============================================================================
	// 더미 보기 팝업 열기.
	//==============================================================================
	/**
	 * @param { string } title
	 * @param { Card[] } cards
	 */
	openPileView(title, cards) {
		this.#viewedPileTitle = title;
		this.#viewedPileCards = cards;
		this.#isDeckViewOpen = true;
		const openAudioBeepPlayer = this.getAudioBeepPlayer();
		if (openAudioBeepPlayer) {
			openAudioBeepPlayer.playClick();
		}
	}

	//==============================================================================
	// 더미 보기 팝업.
	// #viewedPileCards 의 카드를 같은 종류끼리 묶어 (cost, 이름) 오름차순으로 표시.
	//==============================================================================
	/**
	 * @param { CanvasRenderingContext2D } canvasRenderingContext
	 * @param { { x: number, y: number, width: number, height: number } } popupRect
	 */
	drawDeckViewPopup(canvasRenderingContext, popupRect) {
		// 어두운 백드롭 (전체 팝업 영역).
		canvasRenderingContext.fillStyle = "rgba(0, 0, 0, 0.65)";
		canvasRenderingContext.fillRect(popupRect.x, popupRect.y, popupRect.width, popupRect.height);

		// 패널 영역 (popupRect 의 60% 폭, 78% 높이).
		const panelWidth = System.Math.min(560, System.Math.floor(popupRect.width * 0.6));
		const panelHeight = System.Math.min(640, System.Math.floor(popupRect.height * 0.78));
		const panelX = popupRect.x + System.Math.floor((popupRect.width - panelWidth) * 0.5);
		const panelY = popupRect.y + System.Math.floor((popupRect.height - panelHeight) * 0.5);
		this.#deckViewPanelRect = { x: panelX, y: panelY, width: panelWidth, height: panelHeight };

		// 패널 배경.
		canvasRenderingContext.fillStyle = "#1a1a2e";
		canvasRenderingContext.fillRect(panelX, panelY, panelWidth, panelHeight);

		// 헤더 (타이틀 + 닫기 버튼) — 테두리보다 먼저 채워서 이후 stroke 가 헤더 위에 온전히 그려지도록 한다.
		const headerHeight = 44;
		canvasRenderingContext.fillStyle = "#2a2a40";
		canvasRenderingContext.fillRect(panelX, panelY, panelWidth, headerHeight);

		// 패널 골드 테두리 (헤더 채우기 후 마지막에 stroke 해 상하좌우 굵기를 동일하게 유지).
		canvasRenderingContext.strokeStyle = "#d4b46a";
		canvasRenderingContext.lineWidth = 2;
		canvasRenderingContext.strokeRect(panelX, panelY, panelWidth, panelHeight);
		canvasRenderingContext.fillStyle = "#ffffff";
		canvasRenderingContext.font = "bold 18px GyeonggiBatangBold, sans-serif";
		canvasRenderingContext.textAlign = "left";
		canvasRenderingContext.textBaseline = "middle";
		const titleText = `${this.#viewedPileTitle} (${this.#viewedPileCards.length}장)`;
		canvasRenderingContext.fillText(titleText, panelX + 16, panelY + headerHeight * 0.5);

		// 닫기 버튼 (헤더 우측).
		const closeSize = 28;
		const closeX = panelX + panelWidth - closeSize - 8;
		const closeY = panelY + (headerHeight - closeSize) * 0.5;
		this.#deckViewCloseRect = { x: closeX, y: closeY, width: closeSize, height: closeSize };
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

		// 카드 목록 영역. 들어온 순서 그대로 (정렬/그룹핑 없음).
		const listX = panelX + 16;
		const listY = panelY + headerHeight + 12;
		const listWidth = panelWidth - 32;
		const listHeight = panelHeight - headerHeight - 24;
		const rowHeight = 52;
		const maxRows = System.Math.floor(listHeight / rowHeight);

		if (this.#viewedPileCards.length === 0) {
			canvasRenderingContext.fillStyle = "#888888";
			canvasRenderingContext.font = "16px GyeonggiBatang, sans-serif";
			canvasRenderingContext.textAlign = "center";
			canvasRenderingContext.textBaseline = "middle";
			canvasRenderingContext.fillText("비어있다.", panelX + panelWidth * 0.5, listY + listHeight * 0.5);
			return;
		}

		const visibleCardCount = System.Math.min(this.#viewedPileCards.length, maxRows);
		for (let rowIndex = 0; rowIndex < visibleCardCount; ++rowIndex) {
			const card = this.#viewedPileCards[rowIndex];
			const definition = this.findCardDefinition(card.cardId);
			if (definition === null) {
				continue;
			}
			const rowY = listY + rowIndex * rowHeight;

			// 행 구분 줄 (얇은 underline).
			canvasRenderingContext.strokeStyle = "rgba(255, 255, 255, 0.06)";
			canvasRenderingContext.lineWidth = 1;
			canvasRenderingContext.beginPath();
			canvasRenderingContext.moveTo(listX, rowY + rowHeight - 1);
			canvasRenderingContext.lineTo(listX + listWidth, rowY + rowHeight - 1);
			canvasRenderingContext.stroke();

			// cost 원 (행 좌측, 세로 중앙).
			const costRadius = 13;
			const costCenterX = listX + costRadius + 2;
			const costCenterY = rowY + rowHeight * 0.5;
			canvasRenderingContext.fillStyle = "#3a4a6a";
			canvasRenderingContext.beginPath();
			canvasRenderingContext.arc(costCenterX, costCenterY, costRadius, 0, System.Math.PI * 2);
			canvasRenderingContext.fill();
			canvasRenderingContext.strokeStyle = "#ffffff";
			canvasRenderingContext.lineWidth = 1;
			canvasRenderingContext.stroke();
			canvasRenderingContext.fillStyle = "#ffffff";
			canvasRenderingContext.font = "bold 14px GyeonggiBatangBold, sans-serif";
			canvasRenderingContext.textAlign = "center";
			canvasRenderingContext.textBaseline = "middle";
			const costText = typeof definition.cost === "number" ? definition.cost.toString() : "0";
			canvasRenderingContext.fillText(costText, costCenterX, costCenterY);

			// 우측 정보 영역 (이름 + 설명).
			const infoTextX = costCenterX + costRadius + 12;
			const infoTextMaxWidth = listX + listWidth - infoTextX;

			// 카드 이름 (상단).
			canvasRenderingContext.fillStyle = "#ffffff";
			canvasRenderingContext.font = "bold 16px GyeonggiBatangBold, sans-serif";
			canvasRenderingContext.textAlign = "left";
			canvasRenderingContext.textBaseline = "top";
			const cardDisplayName = typeof definition.displayName === "string" ? definition.displayName : "";
			canvasRenderingContext.fillText(cardDisplayName, infoTextX, rowY + 6);

			// 카드 설명 (하단, 한 줄로 자르고 넘치면 줄임표).
			canvasRenderingContext.fillStyle = "#bbbbbb";
			canvasRenderingContext.font = "13px GyeonggiBatang, sans-serif";
			canvasRenderingContext.textAlign = "left";
			canvasRenderingContext.textBaseline = "top";
			const cardDescription = typeof definition.description === "string" ? definition.description : "";
			const descriptionLine = this.fitTextToWidth(canvasRenderingContext, cardDescription, infoTextMaxWidth);
			canvasRenderingContext.fillText(descriptionLine, infoTextX, rowY + 28);
		}

		// 잘린 행이 있으면 더 있다는 표시.
		if (this.#viewedPileCards.length > visibleCardCount) {
			const remaining = this.#viewedPileCards.length - visibleCardCount;
			canvasRenderingContext.fillStyle = "#888888";
			canvasRenderingContext.font = "13px GyeonggiBatang, sans-serif";
			canvasRenderingContext.textAlign = "center";
			canvasRenderingContext.textBaseline = "bottom";
			canvasRenderingContext.fillText(`(외 ${remaining}장 더)`, panelX + panelWidth * 0.5, panelY + panelHeight - 6);
		}
	}

	//==============================================================================
	// 한 줄로 자르되 폭을 넘기면 끝에 줄임표를 붙인다.
	//==============================================================================
	/**
	 * @param { CanvasRenderingContext2D } canvasRenderingContext
	 * @param { string } text
	 * @param { number } maxWidth
	 * @returns { string }
	 */
	fitTextToWidth(canvasRenderingContext, text, maxWidth) {
		if (text.length === 0) {
			return "";
		}
		const fullMetrics = canvasRenderingContext.measureText(text);
		if (fullMetrics.width <= maxWidth) {
			return text;
		}
		const ellipsis = "…";
		const ellipsisMetrics = canvasRenderingContext.measureText(ellipsis);
		const ellipsisWidth = ellipsisMetrics.width;
		let truncatedText = "";
		for (let charIndex = 0; charIndex < text.length; ++charIndex) {
			const tentative = truncatedText + text.charAt(charIndex);
			const tentativeMetrics = canvasRenderingContext.measureText(tentative);
			if (tentativeMetrics.width + ellipsisWidth > maxWidth) {
				break;
			}
			truncatedText = tentative;
		}
		return truncatedText + ellipsis;
	}

	//==============================================================================
	// 손패 카드 hit test. 우측 카드가 위에 있으므로 인덱스 큰 쪽부터.
	//==============================================================================
	/**
	 * @param { import("../libs/vanilla.js/src/base/vector2.js").Vector2 } viewInputPosition
	 * @returns { number }
	 */
	findHandCardIndexAtPosition(viewInputPosition) {
		for (let i = this.#playerHandLayouts.length - 1; i >= 0; --i) {
			const layoutEntry = this.#playerHandLayouts[i];
			if (this.isInsideHandCard(viewInputPosition, layoutEntry)) {
				return i;
			}
		}
		return -1;
	}

	//==============================================================================
	// 회전/스케일 적용된 카드 안에 좌표가 있는지.
	//==============================================================================
	/**
	 * @param { import("../libs/vanilla.js/src/base/vector2.js").Vector2 } viewInputPosition
	 * @param { { centerX: number, centerY: number, rotation: number, scale: number } } layoutEntry
	 * @returns { boolean }
	 */
	isInsideHandCard(viewInputPosition, layoutEntry) {
		const dx = viewInputPosition.x - layoutEntry.centerX;
		const dy = viewInputPosition.y - layoutEntry.centerY;
		const cosTheta = System.Math.cos(-layoutEntry.rotation);
		const sinTheta = System.Math.sin(-layoutEntry.rotation);
		const localX = (dx * cosTheta - dy * sinTheta) / layoutEntry.scale;
		const localY = (dx * sinTheta + dy * cosTheta) / layoutEntry.scale;
		const halfWidth = PLAYER_CARD_WIDTH * 0.5;
		const halfHeight = PLAYER_CARD_HEIGHT * 0.5;
		return localX >= -halfWidth && localX <= halfWidth && localY >= -halfHeight && localY <= halfHeight;
	}

	//==============================================================================
	// 좌표가 사각 영역 내부인지.
	//==============================================================================
	/**
	 * @param { import("../libs/vanilla.js/src/base/vector2.js").Vector2 } viewInputPosition
	 * @param { { x: number, y: number, width: number, height: number } } rect
	 * @returns { boolean }
	 */
	isInsideRect(viewInputPosition, rect) {
		const insideX = viewInputPosition.x >= rect.x && viewInputPosition.x <= rect.x + rect.width;
		const insideY = viewInputPosition.y >= rect.y && viewInputPosition.y <= rect.y + rect.height;
		return insideX && insideY;
	}

	//==============================================================================
	// 버프 layout 배열 안에서 hit. 없으면 null.
	//==============================================================================
	/**
	 * @param { import("../libs/vanilla.js/src/base/vector2.js").Vector2 } viewInputPosition
	 * @param { Array<{ buff: { id: string, value: number }, x: number, y: number, width: number, height: number }> } buffLayouts
	 * @returns { { buff: { id: string, value: number }, x: number, y: number, width: number, height: number } | null }
	 */
	findBuffEntryAtPosition(viewInputPosition, buffLayouts) {
		for (const entry of buffLayouts) {
			if (this.isInsideRect(viewInputPosition, entry)) {
				return entry;
			}
		}
		return null;
	}

	//==============================================================================
	// 버프 툴팁 출력. 플레이어 버프면 정보창 우측, 적 버프면 정보창 좌측.
	//==============================================================================
	/**
	 * @param { CanvasRenderingContext2D } canvasRenderingContext
	 * @param { { id: string, value: number } } buff
	 * @param { { x: number, y: number, width: number, height: number } } portraitRect
	 * @param { string } side
	 */
	drawBuffTooltip(canvasRenderingContext, buff, portraitRect, side) {
		const definition = this.findBuffDefinition(buff.id) || { displayName: buff.id, color: "#888888", description: "" };
		const tooltipWidth = 220;
		const tooltipPaddingX = 12;
		const titleFontSize = 16;
		const bodyFontSize = 13;

		// {N} 자리에 buff.value 치환.
		const filledDescription = definition.description.replace(/\{N\}/g, String(buff.value));

		canvasRenderingContext.font = `${bodyFontSize}px GyeonggiBatang`;
		const bodyLines = this.wrapTextByWidth(canvasRenderingContext, filledDescription, tooltipWidth - tooltipPaddingX * 2);
		const tooltipHeight = 14 + titleFontSize + 10 + bodyLines.length * (bodyFontSize + 4) + 12;

		const tooltipX = side === PlayerSide.player
			? portraitRect.x + portraitRect.width + 8
			: portraitRect.x - tooltipWidth - 8;
		const tooltipY = portraitRect.y;

		canvasRenderingContext.fillStyle = "rgba(20, 20, 30, 0.95)";
		canvasRenderingContext.fillRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);
		const tooltipStrokeColor = definition.isDebuff ? "#993344" : "#33885a";
		canvasRenderingContext.strokeStyle = tooltipStrokeColor;
		canvasRenderingContext.lineWidth = 2;
		canvasRenderingContext.strokeRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);

		// 헤더: displayName 만 (수치 없음).
		canvasRenderingContext.fillStyle = "#ffffff";
		canvasRenderingContext.font = `bold ${titleFontSize}px GyeonggiBatangBold`;
		canvasRenderingContext.textAlign = "left";
		canvasRenderingContext.textBaseline = "top";
		canvasRenderingContext.fillText(definition.displayName, tooltipX + tooltipPaddingX, tooltipY + 12);

		// 본문: 자연어 문장. 숫자는 형광녹색.
		canvasRenderingContext.font = `${bodyFontSize}px GyeonggiBatang`;
		canvasRenderingContext.textBaseline = "top";
		const bodyStartY = tooltipY + 12 + titleFontSize + 10;
		for (let i = 0; i < bodyLines.length; ++i) {
			this.drawColoredTextLine(canvasRenderingContext, bodyLines[i], tooltipX + tooltipPaddingX, bodyStartY + i * (bodyFontSize + 4));
		}
	}

	//==============================================================================
	// 선택된 카드의 효과 미리보기 툴팁. 카드 좌/우 중 더 여유로운 쪽에 표시.
	//==============================================================================
	/**
	 * @param { CanvasRenderingContext2D } canvasRenderingContext
	 * @param { { card: Card, centerX: number, centerY: number, rotation: number, scale: number } } cardLayoutEntry
	 * @param { { x: number, y: number, width: number, height: number } } popupRect
	 */
	drawSelectedCardTooltip(canvasRenderingContext, cardLayoutEntry, popupRect) {
		const card = cardLayoutEntry.card;
		const definition = this.findCardDefinition(card.cardId);
		if (definition === null) {
			return;
		}

		const tooltipWidth = 220;
		const tooltipPaddingX = 12;
		const titleFontSize = 16;
		const bodyFontSize = 13;

		canvasRenderingContext.font = `${bodyFontSize}px GyeonggiBatang`;
		const headerLine = `행동력 ${definition.cost} · ${definition.grade}등급`;
		const adjustedEffectValues = this.computeAdjustedEffectValues(definition, this.#player, this.#opponent);
		const effectLines = this.formatCardEffectLines(definition, adjustedEffectValues);
		const allBodyLines = [];
		allBodyLines.push(headerLine);
		for (const line of effectLines) {
			const wrapped = this.wrapTextByWidth(canvasRenderingContext, line, tooltipWidth - tooltipPaddingX * 2);
			for (const w of wrapped) {
				allBodyLines.push(w);
			}
		}
		const tooltipHeight = 12 + titleFontSize + 10 + allBodyLines.length * (bodyFontSize + 4) + 12;

		const cardHalfWidth = PLAYER_CARD_WIDTH * cardLayoutEntry.scale * 0.5;
		const cardLeftX = cardLayoutEntry.centerX - cardHalfWidth;
		const cardRightX = cardLayoutEntry.centerX + cardHalfWidth;
		const leftSpace = cardLeftX - popupRect.x;
		const rightSpace = popupRect.x + popupRect.width - cardRightX;
		const placeOnRight = rightSpace >= leftSpace;
		let tooltipX;
		if (placeOnRight) {
			tooltipX = cardRightX + 12;
		}
		else {
			tooltipX = cardLeftX - tooltipWidth - 12;
		}
		// 팝업 영역 안으로 클램프.
		const minX = popupRect.x + 8;
		const maxX = popupRect.x + popupRect.width - tooltipWidth - 8;
		if (tooltipX < minX) {
			tooltipX = minX;
		}
		if (tooltipX > maxX) {
			tooltipX = maxX;
		}
		// 툴팁의 top 을 카드 top 에 맞추고 아래로 늘어나게 (효과 줄 수에 따라 height 가 변동).
		const cardHalfHeight = PLAYER_CARD_HEIGHT * cardLayoutEntry.scale * 0.5;
		let tooltipY = cardLayoutEntry.centerY - cardHalfHeight;
		const minY = popupRect.y + 8;
		const maxY = popupRect.y + popupRect.height - tooltipHeight - 8;
		if (tooltipY < minY) {
			tooltipY = minY;
		}
		if (tooltipY > maxY) {
			tooltipY = maxY;
		}

		canvasRenderingContext.fillStyle = "rgba(20, 20, 30, 0.95)";
		canvasRenderingContext.fillRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);
		canvasRenderingContext.strokeStyle = definition.color;
		canvasRenderingContext.lineWidth = 2;
		canvasRenderingContext.strokeRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);

		canvasRenderingContext.fillStyle = "#ffffff";
		canvasRenderingContext.font = `bold ${titleFontSize}px GyeonggiBatangBold`;
		canvasRenderingContext.textAlign = "left";
		canvasRenderingContext.textBaseline = "top";
		canvasRenderingContext.fillText(definition.displayName, tooltipX + tooltipPaddingX, tooltipY + 10);

		canvasRenderingContext.fillStyle = "#cccccc";
		canvasRenderingContext.font = `${bodyFontSize}px GyeonggiBatang`;
		const bodyStartY = tooltipY + 10 + titleFontSize + 10;
		for (let i = 0; i < allBodyLines.length; ++i) {
			canvasRenderingContext.fillText(allBodyLines[i], tooltipX + tooltipPaddingX, bodyStartY + i * (bodyFontSize + 4));
		}
	}

	//==============================================================================
	// 카드 effects 를 자연어 줄들로 변환.
	//==============================================================================
	/**
	 * @param { Object } definition
	 * @returns { string[] }
	 */
	formatCardEffectLines(definition, adjustedValues) {
		const lines = [];
		let valueIndex = 0;
		for (const effect of definition.effects) {
			const hasAdjustedValue = System.Array.isArray(adjustedValues) && valueIndex < adjustedValues.length;
			const displayValue = hasAdjustedValue ? adjustedValues[valueIndex] : effect.value;
			switch (effect.type) {
				case "damage": {
					lines.push(`${displayValue}의 피해를 입힌다`);
					break;
				}
				case "block": {
					lines.push(`${displayValue}의 피해를 방어한다`);
					break;
				}
				case "heal": {
					lines.push(`${displayValue}만큼 체력을 회복한다`);
					break;
				}
				case "actionPoint": {
					lines.push(`행동력을 ${displayValue} 회복한다`);
					break;
				}
				default: {
					const buffDefinition = this.findBuffDefinition(effect.type);
					if (buffDefinition) {
						lines.push(`${buffDefinition.displayName} ${displayValue} 부여`);
					}
					break;
				}
			}
			valueIndex += 1;
		}
		return lines;
	}

	//==============================================================================
	// 선형 보간.
	//==============================================================================
	/**
	 * @param { number } a
	 * @param { number } b
	 * @param { number } t
	 * @returns { number }
	 */
	lerp(a, b, t) {
		return a + (b - a) * t;
	}

	//==============================================================================
	// 이징 (out cubic). 시작은 빠르고 끝은 부드럽게.
	//==============================================================================
	/**
	 * @param { number } t
	 * @returns { number }
	 */
	easeOutCubic(t) {
		const inverted = 1 - t;
		return 1 - inverted * inverted * inverted;
	}

	//==============================================================================
	// 플로팅 텍스트 그리기. 시간이 지날수록 위로 이동 + 페이드.
	//==============================================================================
	/**
	 * @param { CanvasRenderingContext2D } canvasRenderingContext
	 */
	drawFloatingTexts(canvasRenderingContext) {
		for (const entry of this.#floatingTexts) {
			const progress = 1 - entry.time / FLOATING_TEXT_DURATION;
			const alpha = 1 - progress;
			const yOffset = -progress * FLOATING_TEXT_RISE;
			canvasRenderingContext.save();
			canvasRenderingContext.globalAlpha = alpha;
			canvasRenderingContext.fillStyle = entry.color;
			canvasRenderingContext.font = "bold 22px GyeonggiBatangBold, sans-serif";
			canvasRenderingContext.textAlign = "center";
			canvasRenderingContext.textBaseline = "middle";
			canvasRenderingContext.strokeStyle = "rgba(0, 0, 0, 0.85)";
			canvasRenderingContext.lineWidth = 4;
			canvasRenderingContext.strokeText(entry.text, entry.x, entry.y + yOffset);
			canvasRenderingContext.fillText(entry.text, entry.x, entry.y + yOffset);
			canvasRenderingContext.restore();
		}
	}

	//==============================================================================
	// 한국어 자동 줄바꿈 (글자 단위). 공백을 가능한 줄바꿈 지점으로 우선시한다.
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
		let lastSpaceIndex = -1;
		for (let i = 0; i < text.length; ++i) {
			const ch = text[i];
			const tentative = currentLine + ch;
			if (canvasRenderingContext.measureText(tentative).width > maxWidth && currentLine.length > 0) {
				if (lastSpaceIndex >= 0) {
					lines.push(currentLine.slice(0, lastSpaceIndex));
					currentLine = currentLine.slice(lastSpaceIndex + 1) + ch;
				}
				else {
					lines.push(currentLine);
					currentLine = ch;
				}
				lastSpaceIndex = -1;
			}
			else {
				currentLine = tentative;
				if (ch === " ") {
					lastSpaceIndex = currentLine.length - 1;
				}
			}
		}
		if (currentLine.length > 0) {
			lines.push(currentLine);
		}
		return lines;
	}

	//==============================================================================
	// 중앙 무대.
	// 적 슬롯 줄 아래와 내 슬롯 줄 위 사이의 빈 영역에 두 캐릭터(좌=내 캐릭터, 우=적)를
	// 이미지 없이 도형(머리 + 도복 사다리꼴 + 그림자 + 이름)으로 표현한다.
	//==============================================================================
	/**
	 * @param { CanvasRenderingContext2D } canvasRenderingContext
	 * @param { { x: number, y: number, width: number, height: number } } popupRect
	 */
	drawBattleStage(canvasRenderingContext, popupRect) {
		const opponentHandTopY = popupRect.y + HAND_BOTTOM_MARGIN + (SLOT_HEIGHT - OPPONENT_CARD_HEIGHT) * 0.5;
		const opponentSlotY = opponentHandTopY + (OPPONENT_CARD_HEIGHT - SLOT_HEIGHT) * 0.5;
		const playerHandLineY = popupRect.y + popupRect.height - HAND_BOTTOM_MARGIN - PLAYER_CARD_HEIGHT * 0.5;
		const playerSlotY = playerHandLineY - SLOT_HEIGHT * 0.5;
		const stageAreaTop = opponentSlotY + SLOT_HEIGHT;
		const stageAreaBottom = playerSlotY;
		const stageAreaCenterX = popupRect.x + popupRect.width * 0.5;
		const stageAreaCenterY = (stageAreaTop + stageAreaBottom) * 0.5;

		const playerFigureCenterX = stageAreaCenterX - (STAGE_FIGURE_WIDTH * 0.5 + STAGE_FIGURE_GAP * 0.5);
		const opponentFigureCenterX = stageAreaCenterX + (STAGE_FIGURE_WIDTH * 0.5 + STAGE_FIGURE_GAP * 0.5);

		// 피격 / 회복 등 즉시 피드백 플로팅 텍스트 위치로 사용하기 위해 캐싱.
		this.#playerStageCenter = { x: playerFigureCenterX, y: stageAreaCenterY };
		this.#opponentStageCenter = { x: opponentFigureCenterX, y: stageAreaCenterY };

		const activeCast = this.findActiveCast();
		const playerInteraction = this.computeStageInteraction(PlayerSide.player, activeCast);
		const opponentInteraction = this.computeStageInteraction(PlayerSide.opponent, activeCast);

		this.drawStageFigure(canvasRenderingContext, this.#player, playerFigureCenterX, stageAreaCenterY, true, playerInteraction);
		this.drawStageFigure(canvasRenderingContext, this.#opponent, opponentFigureCenterX, stageAreaCenterY, false, opponentInteraction);
	}

	//==============================================================================
	// 중앙 무대의 단일 캐릭터 자리표시 출력.
	// - 자리표시 박스 + 이름 (이미지 대체용 최소 표현).
	// - interaction 으로 시전자 펄스 / 피격자 흔들림·플래시 반영.
	//==============================================================================
	/**
	 * @param { CanvasRenderingContext2D } canvasRenderingContext
	 * @param { PlayerState } playerState
	 * @param { number } centerX
	 * @param { number } centerY
	 * @param { boolean } isMe
	 * @param { { scale: number, offsetX: number, offsetY: number, flashIntensity: number } } interaction
	 */
	drawStageFigure(canvasRenderingContext, playerState, centerX, centerY, isMe, interaction) {
		const safeInteraction = interaction || { scale: 1.0, offsetX: 0, offsetY: 0, flashIntensity: 0 };
		const drawCenterX = centerX + safeInteraction.offsetX;
		const drawCenterY = centerY + safeInteraction.offsetY;
		const drawWidth = STAGE_FIGURE_WIDTH * safeInteraction.scale;
		const drawHeight = STAGE_FIGURE_HEIGHT * safeInteraction.scale;
		const figureLeft = drawCenterX - drawWidth * 0.5;
		const figureTop = drawCenterY - drawHeight * 0.5;

		// 자리표시 박스.
		canvasRenderingContext.fillStyle = "rgba(255, 255, 255, 0.04)";
		canvasRenderingContext.fillRect(figureLeft, figureTop, drawWidth, drawHeight);
		canvasRenderingContext.strokeStyle = "#888899";
		canvasRenderingContext.lineWidth = 1;
		canvasRenderingContext.strokeRect(figureLeft, figureTop, drawWidth, drawHeight);

		// 피격 플래시 (붉은 오버레이).
		if (safeInteraction.flashIntensity > 0) {
			canvasRenderingContext.fillStyle = `rgba(255, 80, 80, ${safeInteraction.flashIntensity})`;
			canvasRenderingContext.fillRect(figureLeft, figureTop, drawWidth, drawHeight);
		}

		// 이름.
		const label = playerState.nickname || (isMe ? "당신" : "적");
		canvasRenderingContext.fillStyle = "#cccccc";
		canvasRenderingContext.font = "14px GyeonggiBatang";
		canvasRenderingContext.textAlign = "center";
		canvasRenderingContext.textBaseline = "middle";
		canvasRenderingContext.fillText(label, drawCenterX, drawCenterY);
	}

	//==============================================================================
	// 오디오 비프 플레이어 설정. 주입되지 않으면 비프음 없이 동작.
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

//==============================================================================
// 포함 모듈 목록.
//==============================================================================
const System = globalThis;


//==============================================================================
// 상수 목록.
//==============================================================================
const DECK_SIZE = 20;
const STARTING_HAND_SIZE = 4;
const MAX_HAND_SIZE = 10;
const STARTING_HEALTH = 30;
const MAX_ENERGY = 5;
const OPPONENT_TURN_DELAY = 1.0;
const OPPONENT_BETWEEN_CARDS_DELAY = 0.6;
const ENTER_DURATION = 0.35;
const EXIT_DURATION = 0.55;
const LOG_MAX_ENTRIES = 8;

const SIDE_MARGIN = 16;
const PLAYER_CARD_WIDTH = 84;
const PLAYER_CARD_HEIGHT = 124;
const OPPONENT_CARD_WIDTH = 70;
const OPPONENT_CARD_HEIGHT = 96;
const OPPONENT_CARD_GAP = 8;
const SLOT_WIDTH = PLAYER_CARD_WIDTH;
const SLOT_HEIGHT = PLAYER_CARD_HEIGHT;
const PORTRAIT_WIDTH = 240;
const PORTRAIT_HEIGHT = 168;
const END_TURN_BUTTON_WIDTH = SLOT_WIDTH;
const END_TURN_BUTTON_HEIGHT = 40;
const HAND_BOTTOM_MARGIN = 20;
const PICKED_CARD_SCALE = 1.3;
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
// 카드 인스턴스. cardId 는 외부 데이터 (cardtable.json) 의 카드 식별자.
//==============================================================================
class Card {
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
		this.id = id;
		this.cardId = cardId;
		this.enterTime = 0;
		this.selectionProgress = 0;
	}
}


//==============================================================================
// 한 플레이어의 상태 (체력 / 영력 / 덱 / 핸드 / 무덤 / 버프 목록).
//==============================================================================
class PlayerState {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @type { string } */ side;
	/** @type { string } */ stageName;
	/** @type { number } */ health;
	/** @type { number } */ maxEnergy;
	/** @type { number } */ currentEnergy;
	/** @type { Card[] } */ deck;
	/** @type { Card[] } */ hand;
	/** @type { Card[] } */ discard;
	/** @type { Array<{ id: string, value: number }> } */ buffs;

	//==============================================================================
	// 생성.
	//==============================================================================
	constructor(side) {
		this.side = side;
		this.stageName = "";
		this.health = STARTING_HEALTH;
		this.maxEnergy = 0;
		this.currentEnergy = 0;
		this.deck = [];
		this.hand = [];
		this.discard = [];
		this.buffs = [];
	}
}


//==============================================================================
// 카드 배틀 게임.
//==============================================================================
export class CardBattleGame {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @private @type { Array | null } */ #cardDefinitions;
	/** @private @type { Array | null } */ #gradeDefinitions;
	/** @private @type { Array | null } */ #sectDefinitions;
	/** @private @type { Array | null } */ #buffDefinitions;
	/** @private @type { PlayerState } */ #player;
	/** @private @type { PlayerState } */ #opponent;
	/** @private @type { string } */ #currentSide;
	/** @private @type { Array<{ card: Card, centerX: number, centerY: number, rotation: number, scale: number }> } */ #playerHandLayouts;
	/** @private @type { Array<{ x: number, y: number, width: number, height: number }> } */ #opponentCardLayouts;
	/** @private @type { Array<{ card: Card, layout: { x: number, y: number, width: number, height: number }, exitTime: number, isReveal: boolean }> } */ #playerExitingCards;
	/** @private @type { Array<{ card: Card, layout: { x: number, y: number, width: number, height: number }, exitTime: number, isReveal: boolean }> } */ #opponentExitingCards;
	/** @private @type { { x: number, y: number, width: number, height: number } | null } */ #endTurnButtonRect;
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
	/** @private @type { Array<{ text: string, color: string, x: number, y: number, time: number }> } */ #floatingTexts;

	//==============================================================================
	// 생성.
	//==============================================================================
	constructor() {
		this.#cardDefinitions = null;
		this.#gradeDefinitions = null;
		this.#sectDefinitions = null;
		this.#buffDefinitions = null;
		this.#player = new PlayerState(PlayerSide.player);
		this.#opponent = new PlayerState(PlayerSide.opponent);
		this.#currentSide = PlayerSide.player;
		this.#playerHandLayouts = [];
		this.#opponentCardLayouts = [];
		this.#playerExitingCards = [];
		this.#opponentExitingCards = [];
		this.#endTurnButtonRect = null;
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
	// 버프 정의 (id 문자열) 검색.
	//==============================================================================
	/**
	 * @param { string } buffId
	 * @returns { Object | null }
	 */
	findBuffDefinition(buffId) {
		if (this.#buffDefinitions === null) {
			return null;
		}
		const found = this.#buffDefinitions.find((b) => b.id === buffId);
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
		this.#player.deck = this.createRandomDeck();
		this.#opponent.deck = this.createRandomDeck();
		for (let i = 0; i < STARTING_HAND_SIZE; ++i) {
			this.drawCardFromDeck(this.#player);
			this.drawCardFromDeck(this.#opponent);
		}
		this.#player.maxEnergy = 1;
		this.#player.currentEnergy = 1;

		// 가라 경지 (실제 경지 시스템이 붙기 전까지 임시 표시값).
		this.#player.stageName = "연기기";
		this.#opponent.stageName = "결단기";

		// 시연용 버프/디버프.
		this.addBuff(this.#player, "block", 3);
		this.addBuff(this.#player, "strength", 2);
		this.addBuff(this.#player, "dexterity", 1);
		this.addBuff(this.#player, "weaken", 2);
		this.addBuff(this.#player, "vulnerable", 1);
		this.addBuff(this.#opponent, "block", 4);
		this.addBuff(this.#opponent, "strength", 1);
		this.addBuff(this.#opponent, "vulnerable", 2);
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
	// 랜덤 덱 생성.
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
		this.appendLog(`${sideName}: 무덤→덱 재활용`);
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
			playerState.buffs.push({ id: buffId, value: value });
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
		if (actor.currentEnergy < cost) {
			if (actor.side === PlayerSide.player) {
				this.appendLog(`영력 부족 (${definition.displayName})`);
			}
			return false;
		}

		actor.currentEnergy -= cost;

		const strengthBuff = actor.buffs.find((b) => b.id === "strength");
		const dexterityBuff = actor.buffs.find((b) => b.id === "dexterity");
		const weakenBuff = actor.buffs.find((b) => b.id === "weaken");
		const strengthBonus = strengthBuff ? strengthBuff.value : 0;
		const dexterityBonus = dexterityBuff ? dexterityBuff.value : 0;
		const weakenAmount = weakenBuff ? weakenBuff.value : 0;

		for (const effect of definition.effects) {
			switch (effect.type) {
				case "damage": {
					let damageValue = effect.value + strengthBonus;
					if (weakenAmount > 0) {
						damageValue = System.Math.floor(damageValue * 0.75);
					}
					if (damageValue < 0) {
						damageValue = 0;
					}
					this.applyDamage(target, damageValue);
					break;
				}
				case "block": {
					const blockValue = effect.value + dexterityBonus;
					this.addBuff(actor, "block", blockValue);
					break;
				}
				case "heal": {
					const healed = System.Math.min(STARTING_HEALTH, actor.health + effect.value);
					actor.health = healed;
					break;
				}
				case "strength":
				case "dexterity":
				case "weaken":
				case "vulnerable": {
					this.addBuff(actor, effect.type, effect.value);
					break;
				}
			}
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
				const exitingEntry = {
					card: card,
					layout: { x: sourceLayout.x, y: sourceLayout.y, width: sourceLayout.width, height: sourceLayout.height },
					exitTime: EXIT_DURATION,
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
		let actualDamage = amount;
		const vulnerableBuff = target.buffs.find((b) => b.id === "vulnerable");
		if (vulnerableBuff && vulnerableBuff.value > 0) {
			actualDamage = System.Math.floor(actualDamage * 1.5);
		}
		let remaining = actualDamage;
		const blockBuff = target.buffs.find((b) => b.id === "block");
		if (blockBuff && blockBuff.value > 0) {
			const absorbed = System.Math.min(blockBuff.value, remaining);
			blockBuff.value -= absorbed;
			remaining -= absorbed;
			if (blockBuff.value <= 0) {
				target.buffs = target.buffs.filter((b) => b !== blockBuff);
			}
		}
		target.health -= remaining;
		if (target.health < 0) {
			target.health = 0;
		}
	}

	//==============================================================================
	// 양쪽 체력 검사 후 종료 메시지 설정.
	//==============================================================================
	checkGameOver() {
		if (this.#player.health <= 0) {
			this.#endGameMessage = "패배!";
		}
		else if (this.#opponent.health <= 0) {
			this.#endGameMessage = "승리!";
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
		playerState.maxEnergy = System.Math.min(MAX_ENERGY, playerState.maxEnergy + 1);
		playerState.currentEnergy = playerState.maxEnergy;
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
			this.#playerExitingCards[i].exitTime -= timeDelta;
			if (this.#playerExitingCards[i].exitTime <= 0) {
				this.#playerExitingCards.splice(i, 1);
			}
		}
		for (let i = this.#opponentExitingCards.length - 1; i >= 0; --i) {
			this.#opponentExitingCards[i].exitTime -= timeDelta;
			if (this.#opponentExitingCards[i].exitTime <= 0) {
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
		this.#floatingTexts.push({ text: text, color: color, x: x, y: y, time: FLOATING_TEXT_DURATION });
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
	 * @param { import("../../libs/vanilla.js/src/core/inputmanager.js").InputManager } inputManager
	 * @param { { x: number, y: number, width: number, height: number } } popupRect
	 */
	tick(timeDelta, inputManager, popupRect) {
		this.tickAnimations(timeDelta);

		if (this.#endGameMessage !== "") {
			if (inputManager.isTouchPressed()) {
				this.reset();
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

		// 누름: 턴종료 버튼 / 카드 선택 / 버프 누름 (이 순서).
		if (inputManager.isTouchPressed() && this.#selectedCardId === null && this.#pressedBuffInfo === null) {
			if (this.#endTurnButtonRect && this.isInsideRect(viewInputPosition, this.#endTurnButtonRect)) {
				if (this.isEndTurnButtonEnabled()) {
					this.endTurn();
				}
				return;
			}
			const pickedHandIndex = this.findHandCardIndexAtPosition(viewInputPosition);
			if (pickedHandIndex >= 0) {
				// 영력 부족이라도 일단 선택해 확대된 모습은 보여준다.
				const pickedCard = this.#player.hand[pickedHandIndex];
				this.#selectedCardId = pickedCard.id;
			}
			else {
				const playerBuffEntry = this.findBuffEntryAtPosition(viewInputPosition, this.#playerBuffLayouts);
				if (playerBuffEntry) {
					this.#pressedBuffInfo = { side: PlayerSide.player, buff: playerBuffEntry.buff };
				}
				else {
					const opponentBuffEntry = this.findBuffEntryAtPosition(viewInputPosition, this.#opponentBuffLayouts);
					if (opponentBuffEntry) {
						this.#pressedBuffInfo = { side: PlayerSide.opponent, buff: opponentBuffEntry.buff };
					}
				}
			}
		}

		// 누른 상태 유지 중: 카드 영역 벗어나면 즉시 취소 + 플로팅 피드백.
		if (this.#selectedCardId !== null && !inputManager.isTouchReleased()) {
			const selectedLayout = this.#playerHandLayouts.find((entry) => entry.card.id === this.#selectedCardId);
			if (selectedLayout && !this.isInsideHandCard(viewInputPosition, selectedLayout)) {
				this.addFloatingText("취소", "#aaaaaa", viewInputPosition.x, viewInputPosition.y);
				this.#selectedCardId = null;
			}
		}

		// 뗌: 선택된 카드 영역 안이면 사용, 아니면 취소. 버프 누름도 함께 해제.
		if (inputManager.isTouchReleased()) {
			if (this.#selectedCardId !== null) {
				const selectedCard = this.#player.hand.find((c) => c.id === this.#selectedCardId);
				const selectedLayout = this.#playerHandLayouts.find((entry) => entry.card.id === this.#selectedCardId);
				if (selectedCard && selectedLayout && this.isInsideHandCard(viewInputPosition, selectedLayout)) {
					const success = this.playCard(this.#player, this.#opponent, selectedCard);
					if (success) {
						this.addFloatingText("사용!", "#5cff7c", selectedLayout.centerX, selectedLayout.centerY);
					}
					else {
						this.addFloatingText("영력 부족", "#ff6060", selectedLayout.centerX, selectedLayout.centerY);
					}
				}
				else {
					this.addFloatingText("취소", "#aaaaaa", viewInputPosition.x, viewInputPosition.y);
				}
				this.#selectedCardId = null;
			}
			this.#pressedBuffInfo = null;
		}
	}

	//==============================================================================
	// 상대 AI 턴: 영력 한도 내 시간차로 한 장씩 사용.
	//==============================================================================
	runOpponentTurn() {
		if (this.#opponent.hand.length === 0 || this.#opponent.currentEnergy <= 0) {
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
		if (!success || this.#opponent.currentEnergy <= 0 || this.#opponent.hand.length === 0) {
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
			if (cost > this.#opponent.currentEnergy) {
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
					const missingHealth = STARTING_HEALTH - this.#opponent.health;
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
	 * @param { import("../../libs/vanilla.js/src/core/graphic.js").Graphic } graphic
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
		this.drawPileSlot(canvasRenderingContext, opponentDiscardX, opponentSlotY, "무덤", this.#opponent.discard.length);
		this.drawPileSlot(canvasRenderingContext, opponentDeckX, opponentSlotY, "저물대", this.#opponent.deck.length);
		this.#opponentDiscardSlotCenter = { x: opponentDiscardX + SLOT_WIDTH * 0.5, y: opponentSlotY + SLOT_HEIGHT * 0.5 };
		this.#opponentDeckSlotCenter = { x: opponentDeckX + SLOT_WIDTH * 0.5, y: opponentSlotY + SLOT_HEIGHT * 0.5 };

		// 적 초상화 (우측 상단).
		const opponentPortraitX = popupRect.x + popupRect.width - PORTRAIT_WIDTH - SIDE_MARGIN;
		const opponentPortraitY = opponentSlotY + SLOT_HEIGHT + 16;
		this.drawPlayerPortrait(canvasRenderingContext, this.#opponent, opponentPortraitX, opponentPortraitY, PORTRAIT_WIDTH, PORTRAIT_HEIGHT, "적", false);

		// 플레이어 손패 라인 + 무덤/덱.
		const playerHandLineY = popupRect.y + popupRect.height - HAND_BOTTOM_MARGIN - PLAYER_CARD_HEIGHT * 0.5;
		const playerSlotY = playerHandLineY - SLOT_HEIGHT * 0.5;
		const playerDiscardX = popupRect.x + SIDE_MARGIN;
		this.drawPileSlot(canvasRenderingContext, playerDiscardX, playerSlotY, "무덤", this.#player.discard.length);
		const playerDeckX = popupRect.x + popupRect.width - SIDE_MARGIN - SLOT_WIDTH;
		this.drawPileSlot(canvasRenderingContext, playerDeckX, playerSlotY, "저물대", this.#player.deck.length);
		this.#playerDiscardSlotCenter = { x: playerDiscardX + SLOT_WIDTH * 0.5, y: playerSlotY + SLOT_HEIGHT * 0.5 };
		this.#playerDeckSlotCenter = { x: playerDeckX + SLOT_WIDTH * 0.5, y: playerSlotY + SLOT_HEIGHT * 0.5 };

		// 턴종료 버튼 (덱 위, 항상 표시. 비활성화 시 회색).
		const endTurnButtonX = playerDeckX + (SLOT_WIDTH - END_TURN_BUTTON_WIDTH) * 0.5;
		const endTurnButtonY = playerSlotY - END_TURN_BUTTON_HEIGHT - 8;
		this.drawEndTurnButton(canvasRenderingContext, endTurnButtonX, endTurnButtonY, this.isEndTurnButtonEnabled());

		// 플레이어 초상화 (좌측, 손패 라인 위).
		const playerPortraitX = popupRect.x + SIDE_MARGIN;
		const playerPortraitY = playerSlotY - PORTRAIT_HEIGHT - 8;
		this.drawPlayerPortrait(canvasRenderingContext, this.#player, playerPortraitX, playerPortraitY, PORTRAIT_WIDTH, PORTRAIT_HEIGHT, "당신", true);

		// 로그 (우측, 정보창 너비). 턴종료 버튼을 가리지 않도록 하단을 버튼 위에서 끊는다.
		const logX = popupRect.x + popupRect.width - PORTRAIT_WIDTH - SIDE_MARGIN;
		const logY = opponentPortraitY + PORTRAIT_HEIGHT + 12;
		const logHeight = (endTurnButtonY - 12) - logY;
		if (logHeight > 60) {
			this.drawLog(canvasRenderingContext, logX, logY, PORTRAIT_WIDTH, logHeight);
		}

		// 턴 표시는 화면에 띄우지 않고 로그에만 (endTurn 에서 appendLog 처리).

		// 플레이어 손패 (좌→우 일렬, 우측이 위).
		this.drawPlayerHand(canvasRenderingContext, popupRect, playerHandLineY);

		// 사용 애니메이션.
		this.drawExitingCards(canvasRenderingContext);

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
	drawPlayerPortrait(canvasRenderingContext, playerState, x, y, width, height, label, isMe) {
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
		const healthRatio = playerState.health / STARTING_HEALTH;
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
		canvasRenderingContext.fillText(`${playerState.health}`, textX + textWidth * 0.5, healthBarY + barHeight * 0.5);

		// 영력바 (체력바와 동일 모양, 파란색).
		const energyBarY = healthBarY + barHeight + 6;
		canvasRenderingContext.fillStyle = "#112233";
		canvasRenderingContext.fillRect(textX, energyBarY, textWidth, barHeight);
		// maxEnergy 기준 비율 (1/1 이면 100%). maxEnergy 0 이면 빈 게이지.
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
			const definition = this.findBuffDefinition(buff.id) || { displayName: buff.id, color: "#888888", icon: "?" };
			const row = System.Math.floor(i / BUFFS_PER_ROW);
			const column = i % BUFFS_PER_ROW;
			const buffX = x + column * (BUFF_ICON_SIZE + BUFF_ICON_GAP);
			const buffY = y + row * (BUFF_ICON_SIZE + BUFF_ICON_GAP);
			if (buffY + BUFF_ICON_SIZE > y + height) {
				break;
			}
			canvasRenderingContext.fillStyle = definition.color;
			canvasRenderingContext.fillRect(buffX, buffY, BUFF_ICON_SIZE, BUFF_ICON_SIZE);
			canvasRenderingContext.strokeStyle = "#ffffff";
			canvasRenderingContext.lineWidth = 1;
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
		// 영력 부족 여부 (현재 영력 < 카드 cost) → cost 원 빨간색으로 강조.
		const definition = this.findCardDefinition(card.cardId);
		const cost = definition && typeof definition.cost === "number" ? definition.cost : 0;
		const isAffordable = this.#player.currentEnergy >= cost;
		this.drawCard(canvasRenderingContext, card, localLayout, alpha, false, isAffordable);
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
	// 사용 중인 카드 출력 (페이드 + 슬라이드).
	//==============================================================================
	/**
	 * @param { CanvasRenderingContext2D } canvasRenderingContext
	 */
	drawExitingCards(canvasRenderingContext) {
		// 플레이어: 손에서 무덤(좌측) 으로 이동.
		for (const exitingEntry of this.#playerExitingCards) {
			const progress = 1 - exitingEntry.exitTime / EXIT_DURATION;
			const eased = this.easeOutCubic(progress);
			const sourceCenterX = exitingEntry.layout.x + exitingEntry.layout.width * 0.5;
			const sourceCenterY = exitingEntry.layout.y + exitingEntry.layout.height * 0.5;
			const targetCenterX = this.#playerDiscardSlotCenter ? this.#playerDiscardSlotCenter.x : sourceCenterX;
			const targetCenterY = this.#playerDiscardSlotCenter ? this.#playerDiscardSlotCenter.y : sourceCenterY;
			const drawCenterX = this.lerp(sourceCenterX, targetCenterX, eased);
			const drawCenterY = this.lerp(sourceCenterY, targetCenterY, eased);
			const alpha = 1 - progress * 0.85;
			const drawLayout = {
				x: drawCenterX - exitingEntry.layout.width * 0.5,
				y: drawCenterY - exitingEntry.layout.height * 0.5,
				width: exitingEntry.layout.width,
				height: exitingEntry.layout.height,
			};
			this.drawCard(canvasRenderingContext, exitingEntry.card, drawLayout, alpha, false);
		}
		// 적: 손에서 무덤(좌측) 으로.
		for (const exitingEntry of this.#opponentExitingCards) {
			const progress = 1 - exitingEntry.exitTime / EXIT_DURATION;
			const eased = this.easeOutCubic(progress);
			const sourceCenterX = exitingEntry.layout.x + exitingEntry.layout.width * 0.5;
			const sourceCenterY = exitingEntry.layout.y + exitingEntry.layout.height * 0.5;
			const targetCenterX = this.#opponentDiscardSlotCenter ? this.#opponentDiscardSlotCenter.x : sourceCenterX;
			const targetCenterY = this.#opponentDiscardSlotCenter ? this.#opponentDiscardSlotCenter.y : sourceCenterY;
			const drawCenterX = this.lerp(sourceCenterX, targetCenterX, eased);
			const drawCenterY = this.lerp(sourceCenterY, targetCenterY, eased);
			const alpha = 1 - progress * 0.85;
			const drawLayout = {
				x: drawCenterX - exitingEntry.layout.width * 0.5,
				y: drawCenterY - exitingEntry.layout.height * 0.5,
				width: exitingEntry.layout.width,
				height: exitingEntry.layout.height,
			};
			const isFaceDown = !exitingEntry.isReveal;
			this.drawCard(canvasRenderingContext, exitingEntry.card, drawLayout, alpha, isFaceDown);
		}
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
	drawCard(canvasRenderingContext, card, cardLayout, alpha, isFaceDown, isAffordable) {
		if (typeof isAffordable !== "boolean") {
			isAffordable = true;
		}
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
			canvasRenderingContext.strokeStyle = "#ffffff";
			canvasRenderingContext.lineWidth = 2;
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
			const description = definition ? definition.description : "";
			const cost = definition && typeof definition.cost === "number" ? definition.cost : 0;
			const grade = definition && typeof definition.grade === "number" ? definition.grade : 1;
			const gradeDefinition = this.findGradeDefinition(grade);
			const gradeColor = gradeDefinition && gradeDefinition.color ? gradeDefinition.color : DEFAULT_GRADE_COLOR;

			// 1) 배경 + 외곽선 (클리핑 없음).
			canvasRenderingContext.fillStyle = cardColor;
			canvasRenderingContext.fillRect(cardLayout.x, cardLayout.y, cardLayout.width, cardLayout.height);
			canvasRenderingContext.strokeStyle = "#ffffff";
			canvasRenderingContext.lineWidth = 2;
			canvasRenderingContext.strokeRect(cardLayout.x, cardLayout.y, cardLayout.width, cardLayout.height);

			const titleFontSize = System.Math.max(11, System.Math.floor(cardLayout.width * 0.16));
			const descriptionFontSize = System.Math.max(9, System.Math.floor(cardLayout.width * 0.12));
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

			// 이름.
			canvasRenderingContext.fillStyle = "#ffffff";
			canvasRenderingContext.font = `bold ${titleFontSize}px GyeonggiBatangBold`;
			canvasRenderingContext.textAlign = "center";
			canvasRenderingContext.textBaseline = "middle";
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
	// 손패 카드 hit test. 우측 카드가 위에 있으므로 인덱스 큰 쪽부터.
	//==============================================================================
	/**
	 * @param { import("../../libs/vanilla.js/src/base/vector2.js").Vector2 } viewInputPosition
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
	 * @param { import("../../libs/vanilla.js/src/base/vector2.js").Vector2 } viewInputPosition
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
	 * @param { import("../../libs/vanilla.js/src/base/vector2.js").Vector2 } viewInputPosition
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
	 * @param { import("../../libs/vanilla.js/src/base/vector2.js").Vector2 } viewInputPosition
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
		canvasRenderingContext.strokeStyle = definition.color;
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
		const headerLine = `영력 ${definition.cost} · ${definition.grade}등급`;
		const effectLines = this.formatCardEffectLines(definition);
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
		let tooltipY = cardLayoutEntry.centerY - tooltipHeight * 0.5;
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
	formatCardEffectLines(definition) {
		const lines = [];
		for (const effect of definition.effects) {
			switch (effect.type) {
				case "damage": {
					lines.push(`${effect.value}의 피해를 입힌다`);
					break;
				}
				case "block": {
					lines.push(`${effect.value}만큼 방어한다`);
					break;
				}
				case "heal": {
					lines.push(`${effect.value}만큼 체력을 회복한다`);
					break;
				}
				default: {
					const buffDefinition = this.findBuffDefinition(effect.type);
					if (buffDefinition) {
						lines.push(`${buffDefinition.displayName} ${effect.value} 부여`);
					}
					break;
				}
			}
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
}

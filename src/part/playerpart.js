//==============================================================================
// 포함 모듈 목록.
//==============================================================================
const System = globalThis;
import { Object } from "../../libs/vanilla.js/src/base/object.js";
import { AudioBeepPlayer } from "../base/audiobeepplayer.js";


//==============================================================================
// 상수.
//==============================================================================
const SIDE_MARGIN = 24;
const HEADER_HEIGHT = 56;
const TAB_BAR_HEIGHT = 44;
const TAB_GAP = 6;
const FOOTER_HEIGHT = 40;
const LIST_ROW_HEIGHT = 56;
const LIST_ROW_GAP = 4;


//==============================================================================
// 탭 식별자.
//==============================================================================
const PlayerPartTabKey = System.Object.freeze({
	profile: "profile",
	inventory: "inventory",
	deck: "deck",
	abilities: "abilities",
	relations: "relations",
	journal: "journal",
	settings: "settings",
});


//==============================================================================
// 인벤토리 항목 (장비 / 보유물품 / 소모품 공통 표기).
//==============================================================================
class InventoryEntry extends Object {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @type { number } */ id;
	/** @type { string } */ name;
	/** @type { string } */ category;
	/** @type { string } */ description;
	/** @type { number } */ count;

	//==============================================================================
	// 생성.
	//==============================================================================
	constructor(id, name, category, description, count) {
		super();
		this.id = id;
		this.name = name;
		this.category = category;
		this.description = description;
		this.count = count;
	}
}


//==============================================================================
// 보유 카드 항목 (산패 정비용).
//==============================================================================
class OwnedCardEntry extends Object {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @type { number } */ cardId;
	/** @type { string } */ displayName;
	/** @type { string } */ description;
	/** @type { number } */ cost;
	/** @type { number } */ grade;
	/** @type { number } */ requiredRealmRank;
	/** @type { boolean } */ isEquipped;
	/** @type { boolean } */ isLockedByRealm;

	//==============================================================================
	// 생성.
	//==============================================================================
	constructor(cardId, displayName, description, cost, grade, requiredRealmRank, isEquipped, isLockedByRealm) {
		super();
		this.cardId = cardId;
		this.displayName = displayName;
		this.description = description;
		this.cost = cost;
		this.grade = grade;
		this.requiredRealmRank = requiredRealmRank;
		this.isEquipped = isEquipped;
		this.isLockedByRealm = isLockedByRealm;
	}
}


//==============================================================================
// 능력 (패시브) 항목.
//==============================================================================
class AbilityEntry extends Object {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @type { number } */ id;
	/** @type { string } */ name;
	/** @type { string } */ description;
	/** @type { string } */ source;

	//==============================================================================
	// 생성.
	//==============================================================================
	constructor(id, name, description, source) {
		super();
		this.id = id;
		this.name = name;
		this.description = description;
		this.source = source;
	}
}


//==============================================================================
// 등장인물 관계 항목.
//==============================================================================
class RelationEntry extends Object {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @type { number } */ characterId;
	/** @type { string } */ name;
	/** @type { string } */ sectName;
	/** @type { number } */ affinity;
	/** @type { string } */ note;

	//==============================================================================
	// 생성.
	//==============================================================================
	constructor(characterId, name, sectName, affinity, note) {
		super();
		this.characterId = characterId;
		this.name = name;
		this.sectName = sectName;
		this.affinity = affinity;
		this.note = note;
	}
}


//==============================================================================
// 일지 (수행 기록) 항목.
//==============================================================================
class JournalEntry extends Object {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @type { number } */ id;
	/** @type { number } */ daysPassed;
	/** @type { string } */ title;
	/** @type { string } */ summary;

	//==============================================================================
	// 생성.
	//==============================================================================
	constructor(id, daysPassed, title, summary) {
		super();
		this.id = id;
		this.daysPassed = daysPassed;
		this.title = title;
		this.summary = summary;
	}
}


//==============================================================================
// 기본 스탯 한 줄 (힘 / 민 / 지 / 운 등 단일값 능력).
//==============================================================================
class BaseStatEntry extends Object {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @type { string } */ key;
	/** @type { string } */ name;
	/** @type { number } */ value;

	//==============================================================================
	// 생성.
	//==============================================================================
	constructor(key, name, value) {
		super();
		this.key = key;
		this.name = name;
		this.value = value;
	}
}


//==============================================================================
// 전투 능력 한 줄 (체력 / 기력 / 영력 / 공격력 / 수비력).
// max 가 0 이하면 "current" 단일값으로 표기, 아니면 "current/max" 표기.
//==============================================================================
class CombatStatEntry extends Object {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @type { string } */ key;
	/** @type { string } */ name;
	/** @type { number } */ current;
	/** @type { number } */ max;

	//==============================================================================
	// 생성.
	//==============================================================================
	constructor(key, name, current, max) {
		super();
		this.key = key;
		this.name = name;
		this.current = current;
		this.max = max;
	}
}


//==============================================================================
// 설정 항목 (토글 / 액션 공통). isToggle=true 면 isOn 으로 ON/OFF 표시.
//==============================================================================
class SettingEntry extends Object {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @type { string } */ key;
	/** @type { string } */ name;
	/** @type { string } */ description;
	/** @type { boolean } */ isToggle;
	/** @type { boolean } */ isOn;
	/** @type { string } */ valueLabel;

	//==============================================================================
	// 생성.
	//==============================================================================
	constructor(key, name, description, isToggle, isOn, valueLabel) {
		super();
		this.key = key;
		this.name = name;
		this.description = description;
		this.isToggle = isToggle;
		this.isOn = isOn;
		this.valueLabel = valueLabel;
	}
}


//==============================================================================
// 설정 항목 행 hit-test 영역.
//==============================================================================
class SettingRowLayout extends Object {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @type { SettingEntry } */ setting;
	/** @type { number } */ x;
	/** @type { number } */ y;
	/** @type { number } */ width;
	/** @type { number } */ height;

	//==============================================================================
	// 생성.
	//==============================================================================
	constructor(setting, x, y, width, height) {
		super();
		this.setting = setting;
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
	}
}


//==============================================================================
// 탭 버튼 hit-test 영역.
//==============================================================================
class TabButtonLayout extends Object {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @type { string } */ tabKey;
	/** @type { number } */ x;
	/** @type { number } */ y;
	/** @type { number } */ width;
	/** @type { number } */ height;

	//==============================================================================
	// 생성.
	//==============================================================================
	constructor(tabKey, x, y, width, height) {
		super();
		this.tabKey = tabKey;
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
	}
}


//==============================================================================
// 플레이어 정보 파트.
// - 상단 탭 (경지/스탯, 보유 물품, 산패, 능력, 관계, 일지) 으로 보유 정보를 분류 표시.
// - 외부에서 setProfile / setInventory / setOwnedCards / setAbilities / setRelations / setJournal 로 데이터 주입.
// - 직접 조작은 탭 전환만 (편성 / 사용 등은 추후 GrowthPart 등 별도 파트에서).
//==============================================================================
export class PlayerPart extends Object {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @private @type { string } */ #characterName;
	/** @private @type { string } */ #stageName;
	/** @private @type { string } */ #sectName;
	/** @private @type { number } */ #daysPassed;
	/** @private @type { number } */ #money;
	/** @private @type { BaseStatEntry[] } */ #baseStats;
	/** @private @type { CombatStatEntry[] } */ #combatStats;
	/** @private @type { InventoryEntry[] } */ #inventory;
	/** @private @type { OwnedCardEntry[] } */ #ownedCards;
	/** @private @type { AbilityEntry[] } */ #abilities;
	/** @private @type { RelationEntry[] } */ #relations;
	/** @private @type { JournalEntry[] } */ #journal;
	/** @private @type { SettingEntry[] } */ #settings;
	/** @private @type { string } */ #activeTabKey;
	/** @private @type { TabButtonLayout[] } */ #tabButtonLayouts;
	/** @private @type { SettingRowLayout[] } */ #settingRowLayouts;
	/** @private @type { boolean } */ #wasTouchPressed;
	/** @private @type { AudioBeepPlayer | null } */ #audioBeepPlayer;

	//==============================================================================
	// 생성.
	//==============================================================================
	constructor() {
		super();
		this.#characterName = "";
		this.#stageName = "";
		this.#sectName = "";
		this.#daysPassed = 0;
		this.#money = 0;
		this.#baseStats = [];
		this.#combatStats = [];
		this.#inventory = [];
		this.#ownedCards = [];
		this.#abilities = [];
		this.#relations = [];
		this.#journal = [];
		this.#settings = [];
		this.#activeTabKey = PlayerPartTabKey.profile;
		this.#tabButtonLayouts = [];
		this.#settingRowLayouts = [];
		this.#wasTouchPressed = false;
		this.#audioBeepPlayer = null;
		this.installSampleData();
	}

	//==============================================================================
	// 데이터 주입.
	//==============================================================================
	/**
	 * @param { string } characterName
	 * @param { string } stageName
	 * @param { string } sectName
	 * @param { number } daysPassed
	 */
	setProfile(characterName, stageName, sectName, daysPassed) {
		this.#characterName = characterName;
		this.#stageName = stageName;
		this.#sectName = sectName;
		this.#daysPassed = daysPassed;
	}

	/**
	 * @param { number } money
	 */
	setMoney(money) {
		this.#money = money;
	}

	/**
	 * @param { BaseStatEntry[] } baseStats
	 */
	setBaseStats(baseStats) {
		this.#baseStats = System.Array.isArray(baseStats) ? baseStats : [];
	}

	/**
	 * @param { CombatStatEntry[] } combatStats
	 */
	setCombatStats(combatStats) {
		this.#combatStats = System.Array.isArray(combatStats) ? combatStats : [];
	}

	/**
	 * @param { InventoryEntry[] } inventory
	 */
	setInventory(inventory) {
		this.#inventory = System.Array.isArray(inventory) ? inventory : [];
	}

	/**
	 * @param { OwnedCardEntry[] } ownedCards
	 */
	setOwnedCards(ownedCards) {
		this.#ownedCards = System.Array.isArray(ownedCards) ? ownedCards : [];
	}

	/**
	 * @param { AbilityEntry[] } abilities
	 */
	setAbilities(abilities) {
		this.#abilities = System.Array.isArray(abilities) ? abilities : [];
	}

	/**
	 * @param { RelationEntry[] } relations
	 */
	setRelations(relations) {
		this.#relations = System.Array.isArray(relations) ? relations : [];
	}

	/**
	 * @param { JournalEntry[] } journal
	 */
	setJournal(journal) {
		this.#journal = System.Array.isArray(journal) ? journal : [];
	}

	/**
	 * @param { SettingEntry[] } settings
	 */
	setSettings(settings) {
		this.#settings = System.Array.isArray(settings) ? settings : [];
	}

	//==============================================================================
	// 활성화 시 초기 입력 상태 리셋. (탭은 마지막 본 곳 유지)
	//==============================================================================
	reset() {
		this.#wasTouchPressed = false;
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
	// 클릭 처리. 탭 버튼 hit → 탭 전환.
	//==============================================================================
	/**
	 * @param { { x: number, y: number } } viewInputPosition
	 */
	handleClick(viewInputPosition) {
		for (const buttonLayout of this.#tabButtonLayouts) {
			if (this.isInsideRect(viewInputPosition, buttonLayout.x, buttonLayout.y, buttonLayout.width, buttonLayout.height)) {
				if (this.#activeTabKey !== buttonLayout.tabKey) {
					this.#activeTabKey = buttonLayout.tabKey;
					const tabAudioBeepPlayer = this.getAudioBeepPlayer();
					if (tabAudioBeepPlayer) {
						tabAudioBeepPlayer.playClick();
					}
				}
				return;
			}
		}
		// 설정 탭 활성화 시 행 클릭 → 토글.
		if (this.#activeTabKey === PlayerPartTabKey.settings) {
			for (const settingRowLayout of this.#settingRowLayouts) {
				if (this.isInsideRect(viewInputPosition, settingRowLayout.x, settingRowLayout.y, settingRowLayout.width, settingRowLayout.height)) {
					const setting = settingRowLayout.setting;
					if (setting.isToggle) {
						setting.isOn = !setting.isOn;
						setting.valueLabel = setting.isOn ? "켬" : "끔";
					}
					const settingAudioBeepPlayer = this.getAudioBeepPlayer();
					if (settingAudioBeepPlayer) {
						settingAudioBeepPlayer.playConfirm();
					}
					return;
				}
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

		// 탭 바.
		const tabBarY = popupRect.y + HEADER_HEIGHT;
		this.drawTabBar(canvasRenderingContext, popupRect.x + SIDE_MARGIN, tabBarY, popupRect.width - SIDE_MARGIN * 2);

		// 컨텐츠 영역.
		const contentX = popupRect.x + SIDE_MARGIN;
		const contentY = tabBarY + TAB_BAR_HEIGHT + 8;
		const contentWidth = popupRect.width - SIDE_MARGIN * 2;
		const contentHeight = popupRect.height - (contentY - popupRect.y) - FOOTER_HEIGHT;
		this.drawActiveTab(canvasRenderingContext, contentX, contentY, contentWidth, contentHeight);

		// 푸터.
		this.drawFooter(canvasRenderingContext, popupRect);
	}

	//==============================================================================
	// 헤더 (좌측 타이틀 + 우측 체력 / 일자).
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
		canvasRenderingContext.fillText("정보", popupRect.x + SIDE_MARGIN, popupRect.y + HEADER_HEIGHT * 0.5);

		const headerRightParts = [];
		headerRightParts.push(`자금 ${this.#money}`);
		if (this.#daysPassed > 0) {
			headerRightParts.push(`${this.#daysPassed}일차`);
		}
		const headerRightText = headerRightParts.join("  ");
		if (headerRightText.length > 0) {
			canvasRenderingContext.fillStyle = "#ffcc88";
			canvasRenderingContext.font = "16px GyeonggiBatang, sans-serif";
			canvasRenderingContext.textAlign = "right";
			canvasRenderingContext.textBaseline = "middle";
			canvasRenderingContext.fillText(headerRightText, popupRect.x + popupRect.width - SIDE_MARGIN, popupRect.y + HEADER_HEIGHT * 0.5);
		}
	}

	//==============================================================================
	// 탭 바 (수평 균등 분할).
	//==============================================================================
	/**
	 * @param { CanvasRenderingContext2D } canvasRenderingContext
	 * @param { number } x
	 * @param { number } y
	 * @param { number } width
	 */
	drawTabBar(canvasRenderingContext, x, y, width) {
		this.#tabButtonLayouts = [];
		const tabKeys = [
			PlayerPartTabKey.profile,
			PlayerPartTabKey.inventory,
			PlayerPartTabKey.deck,
			PlayerPartTabKey.abilities,
			PlayerPartTabKey.relations,
			PlayerPartTabKey.journal,
			PlayerPartTabKey.settings,
		];
		const tabCount = tabKeys.length;
		const totalGapWidth = TAB_GAP * (tabCount - 1);
		const tabWidth = (width - totalGapWidth) / tabCount;
		for (let tabIndex = 0; tabIndex < tabCount; ++tabIndex) {
			const tabKey = tabKeys[tabIndex];
			const tabX = x + tabIndex * (tabWidth + TAB_GAP);
			const isActive = tabKey === this.#activeTabKey;
			canvasRenderingContext.fillStyle = isActive ? "#2c3a66" : "#16203a";
			canvasRenderingContext.fillRect(tabX, y, tabWidth, TAB_BAR_HEIGHT);
			canvasRenderingContext.strokeStyle = isActive ? "#d4b46a" : "#3a4a6a";
			canvasRenderingContext.lineWidth = isActive ? 2 : 1;
			canvasRenderingContext.strokeRect(tabX, y, tabWidth, TAB_BAR_HEIGHT);
			canvasRenderingContext.fillStyle = isActive ? "#ffffff" : "#aaaabb";
			canvasRenderingContext.font = `${isActive ? "bold " : ""}15px GyeonggiBatangBold, sans-serif`;
			canvasRenderingContext.textAlign = "center";
			canvasRenderingContext.textBaseline = "middle";
			canvasRenderingContext.fillText(this.tabLabel(tabKey), tabX + tabWidth * 0.5, y + TAB_BAR_HEIGHT * 0.5);
			this.#tabButtonLayouts.push(new TabButtonLayout(tabKey, tabX, y, tabWidth, TAB_BAR_HEIGHT));
		}
	}

	//==============================================================================
	// 탭 라벨 (한국어).
	//==============================================================================
	/**
	 * @param { string } tabKey
	 * @returns { string }
	 */
	tabLabel(tabKey) {
		switch (tabKey) {
			case PlayerPartTabKey.profile: {
				return "경지 / 스탯";
			}
			case PlayerPartTabKey.inventory: {
				return "보유 물품";
			}
			case PlayerPartTabKey.deck: {
				return "산패";
			}
			case PlayerPartTabKey.abilities: {
				return "능력";
			}
			case PlayerPartTabKey.relations: {
				return "관계";
			}
			case PlayerPartTabKey.journal: {
				return "일지";
			}
			case PlayerPartTabKey.settings: {
				return "설정";
			}
			default: {
				return "";
			}
		}
	}

	//==============================================================================
	// 활성 탭 컨텐츠.
	//==============================================================================
	/**
	 * @param { CanvasRenderingContext2D } canvasRenderingContext
	 * @param { number } x
	 * @param { number } y
	 * @param { number } width
	 * @param { number } height
	 */
	drawActiveTab(canvasRenderingContext, x, y, width, height) {
		canvasRenderingContext.fillStyle = "#16203a";
		canvasRenderingContext.fillRect(x, y, width, height);
		canvasRenderingContext.strokeStyle = "#3a4a6a";
		canvasRenderingContext.lineWidth = 1;
		canvasRenderingContext.strokeRect(x, y, width, height);
		switch (this.#activeTabKey) {
			case PlayerPartTabKey.profile: {
				this.drawProfileTab(canvasRenderingContext, x, y, width, height);
				break;
			}
			case PlayerPartTabKey.inventory: {
				this.drawInventoryTab(canvasRenderingContext, x, y, width, height);
				break;
			}
			case PlayerPartTabKey.deck: {
				this.drawDeckTab(canvasRenderingContext, x, y, width, height);
				break;
			}
			case PlayerPartTabKey.abilities: {
				this.drawAbilitiesTab(canvasRenderingContext, x, y, width, height);
				break;
			}
			case PlayerPartTabKey.relations: {
				this.drawRelationsTab(canvasRenderingContext, x, y, width, height);
				break;
			}
			case PlayerPartTabKey.journal: {
				this.drawJournalTab(canvasRenderingContext, x, y, width, height);
				break;
			}
			case PlayerPartTabKey.settings: {
				this.drawSettingsTab(canvasRenderingContext, x, y, width, height);
				break;
			}
		}
	}

	//==============================================================================
	// 경지 / 스탯 탭.
	// 상단: 이름 + 경지 + 종파 + 자금.
	// 좌측 컬럼: 기본 스탯 (힘 / 민 / 지 / 운).
	// 우측 컬럼: 전투 능력 (체력 / 기력 / 영력 / 공격력 / 수비력).
	//==============================================================================
	/**
	 * @param { CanvasRenderingContext2D } canvasRenderingContext
	 * @param { number } x
	 * @param { number } y
	 * @param { number } width
	 * @param { number } height
	 */
	drawProfileTab(canvasRenderingContext, x, y, width, height) {
		const innerX = x + 16;
		const innerY = y + 16;

		// 이름 + 경지 + 종파.
		canvasRenderingContext.fillStyle = "#ffffff";
		canvasRenderingContext.font = "bold 22px GyeonggiBatangBold, sans-serif";
		canvasRenderingContext.textAlign = "left";
		canvasRenderingContext.textBaseline = "top";
		canvasRenderingContext.fillText(this.#characterName.length > 0 ? this.#characterName : "이름 없음", innerX, innerY);

		canvasRenderingContext.fillStyle = "#ffcc88";
		canvasRenderingContext.font = "14px GyeonggiBatang, sans-serif";
		const subtitleParts = [];
		if (this.#stageName.length > 0) {
			subtitleParts.push(this.#stageName);
		}
		if (this.#sectName.length > 0) {
			subtitleParts.push(this.#sectName);
		}
		canvasRenderingContext.fillText(subtitleParts.join("  ·  "), innerX, innerY + 30);

		// 자금 (별도 표기, 상단 우측).
		canvasRenderingContext.fillStyle = "#d4b46a";
		canvasRenderingContext.font = "bold 16px GyeonggiBatangBold, sans-serif";
		canvasRenderingContext.textAlign = "right";
		canvasRenderingContext.textBaseline = "top";
		canvasRenderingContext.fillText(`자금 ${this.#money}`, x + width - 16, innerY + 4);

		// 두 컬럼 분할 (기본 스탯 / 전투 능력).
		const sectionTopY = innerY + 64;
		const columnGap = 16;
		const columnWidth = System.Math.floor((width - 32 - columnGap) * 0.5);
		const baseColumnX = innerX;
		const combatColumnX = innerX + columnWidth + columnGap;

		// 좌: 기본 스탯.
		this.drawStatSection(canvasRenderingContext, "기본 스탯", baseColumnX, sectionTopY, columnWidth);
		const baseRowTopY = sectionTopY + 28;
		for (let baseStatIndex = 0; baseStatIndex < this.#baseStats.length; ++baseStatIndex) {
			const baseStat = this.#baseStats[baseStatIndex];
			const rowY = baseRowTopY + baseStatIndex * 28;
			if (rowY + 28 > y + height - 8) {
				break;
			}
			this.drawStatRow(canvasRenderingContext, baseStat.name, baseStat.value.toString(), baseColumnX, rowY, columnWidth);
		}

		// 우: 전투 능력.
		this.drawStatSection(canvasRenderingContext, "전투 능력", combatColumnX, sectionTopY, columnWidth);
		const combatRowTopY = sectionTopY + 28;
		for (let combatStatIndex = 0; combatStatIndex < this.#combatStats.length; ++combatStatIndex) {
			const combatStat = this.#combatStats[combatStatIndex];
			const rowY = combatRowTopY + combatStatIndex * 28;
			if (rowY + 28 > y + height - 8) {
				break;
			}
			const valueText = combatStat.max > 0
				? `${combatStat.current}/${combatStat.max}`
				: combatStat.current.toString();
			this.drawStatRow(canvasRenderingContext, combatStat.name, valueText, combatColumnX, rowY, columnWidth);
		}
	}

	//==============================================================================
	// 스탯 섹션 헤더 라벨.
	//==============================================================================
	/**
	 * @param { CanvasRenderingContext2D } canvasRenderingContext
	 * @param { string } sectionLabel
	 * @param { number } x
	 * @param { number } y
	 * @param { number } width
	 */
	drawStatSection(canvasRenderingContext, sectionLabel, x, y, width) {
		canvasRenderingContext.fillStyle = "#cccccc";
		canvasRenderingContext.font = "13px GyeonggiBatang, sans-serif";
		canvasRenderingContext.textAlign = "left";
		canvasRenderingContext.textBaseline = "top";
		canvasRenderingContext.fillText(sectionLabel, x, y);
		canvasRenderingContext.strokeStyle = "#3a4a6a";
		canvasRenderingContext.lineWidth = 1;
		canvasRenderingContext.beginPath();
		canvasRenderingContext.moveTo(x, y + 18);
		canvasRenderingContext.lineTo(x + width, y + 18);
		canvasRenderingContext.stroke();
	}

	//==============================================================================
	// 스탯 한 줄 (좌측 이름 + 우측 값).
	//==============================================================================
	/**
	 * @param { CanvasRenderingContext2D } canvasRenderingContext
	 * @param { string } statName
	 * @param { string } valueText
	 * @param { number } x
	 * @param { number } y
	 * @param { number } width
	 */
	drawStatRow(canvasRenderingContext, statName, valueText, x, y, width) {
		canvasRenderingContext.fillStyle = "#dddddd";
		canvasRenderingContext.font = "15px GyeonggiBatang, sans-serif";
		canvasRenderingContext.textAlign = "left";
		canvasRenderingContext.textBaseline = "top";
		canvasRenderingContext.fillText(statName, x, y);
		canvasRenderingContext.fillStyle = "#ffffff";
		canvasRenderingContext.font = "bold 15px GyeonggiBatangBold, sans-serif";
		canvasRenderingContext.textAlign = "right";
		canvasRenderingContext.fillText(valueText, x + width, y);
	}

	//==============================================================================
	// 인벤토리 탭.
	//==============================================================================
	/**
	 * @param { CanvasRenderingContext2D } canvasRenderingContext
	 * @param { number } x
	 * @param { number } y
	 * @param { number } width
	 * @param { number } height
	 */
	drawInventoryTab(canvasRenderingContext, x, y, width, height) {
		this.drawListHeader(canvasRenderingContext, x, y, width, "보유 물품 (장비 / 보유물품 / 소모품)");
		const listTopY = y + 36;
		const listInnerWidth = width - 16;
		const innerX = x + 8;
		for (let entryIndex = 0; entryIndex < this.#inventory.length; ++entryIndex) {
			const entry = this.#inventory[entryIndex];
			const rowY = listTopY + entryIndex * (LIST_ROW_HEIGHT + LIST_ROW_GAP);
			if (rowY + LIST_ROW_HEIGHT > y + height - 4) {
				break;
			}
			this.drawInventoryRow(canvasRenderingContext, entry, innerX, rowY, listInnerWidth, LIST_ROW_HEIGHT);
		}
		if (this.#inventory.length === 0) {
			this.drawEmptyMessage(canvasRenderingContext, x, y, width, height, "아직 가진 것이 없다.");
		}
	}

	/**
	 * @param { CanvasRenderingContext2D } canvasRenderingContext
	 * @param { InventoryEntry } entry
	 * @param { number } x
	 * @param { number } y
	 * @param { number } width
	 * @param { number } height
	 */
	drawInventoryRow(canvasRenderingContext, entry, x, y, width, height) {
		canvasRenderingContext.fillStyle = "#1f2a48";
		canvasRenderingContext.fillRect(x, y, width, height);
		canvasRenderingContext.strokeStyle = "#3a4a6a";
		canvasRenderingContext.lineWidth = 1;
		canvasRenderingContext.strokeRect(x, y, width, height);

		canvasRenderingContext.fillStyle = "#ffffff";
		canvasRenderingContext.font = "bold 15px GyeonggiBatangBold, sans-serif";
		canvasRenderingContext.textAlign = "left";
		canvasRenderingContext.textBaseline = "top";
		canvasRenderingContext.fillText(entry.name, x + 12, y + 8);

		canvasRenderingContext.fillStyle = "#aaaabb";
		canvasRenderingContext.font = "12px GyeonggiBatang, sans-serif";
		canvasRenderingContext.fillText(`${entry.category}  ·  ${entry.description}`, x + 12, y + 30);

		if (entry.count > 1) {
			canvasRenderingContext.fillStyle = "#d4b46a";
			canvasRenderingContext.font = "bold 14px GyeonggiBatangBold, sans-serif";
			canvasRenderingContext.textAlign = "right";
			canvasRenderingContext.textBaseline = "middle";
			canvasRenderingContext.fillText(`x ${entry.count}`, x + width - 12, y + height * 0.5);
		}
	}

	//==============================================================================
	// 산패 (보유 카드) 탭.
	//==============================================================================
	/**
	 * @param { CanvasRenderingContext2D } canvasRenderingContext
	 * @param { number } x
	 * @param { number } y
	 * @param { number } width
	 * @param { number } height
	 */
	drawDeckTab(canvasRenderingContext, x, y, width, height) {
		this.drawListHeader(canvasRenderingContext, x, y, width, "보유 카드");
		const listTopY = y + 36;
		const listInnerWidth = width - 16;
		const innerX = x + 8;
		for (let entryIndex = 0; entryIndex < this.#ownedCards.length; ++entryIndex) {
			const entry = this.#ownedCards[entryIndex];
			const rowY = listTopY + entryIndex * (LIST_ROW_HEIGHT + LIST_ROW_GAP);
			if (rowY + LIST_ROW_HEIGHT > y + height - 4) {
				break;
			}
			this.drawOwnedCardRow(canvasRenderingContext, entry, innerX, rowY, listInnerWidth, LIST_ROW_HEIGHT);
		}
		if (this.#ownedCards.length === 0) {
			this.drawEmptyMessage(canvasRenderingContext, x, y, width, height, "보유 카드가 없다.");
		}
	}

	/**
	 * @param { CanvasRenderingContext2D } canvasRenderingContext
	 * @param { OwnedCardEntry } entry
	 * @param { number } x
	 * @param { number } y
	 * @param { number } width
	 * @param { number } height
	 */
	drawOwnedCardRow(canvasRenderingContext, entry, x, y, width, height) {
		const backgroundColor = entry.isLockedByRealm ? "#16182a" : (entry.isEquipped ? "#2c3a66" : "#1f2a48");
		canvasRenderingContext.fillStyle = backgroundColor;
		canvasRenderingContext.fillRect(x, y, width, height);
		canvasRenderingContext.strokeStyle = entry.isEquipped ? "#d4b46a" : "#3a4a6a";
		canvasRenderingContext.lineWidth = entry.isEquipped ? 2 : 1;
		canvasRenderingContext.strokeRect(x, y, width, height);

		// cost 원.
		const costRadius = 13;
		const costCenterX = x + costRadius + 4;
		const costCenterY = y + height * 0.5;
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
		canvasRenderingContext.fillText(entry.cost.toString(), costCenterX, costCenterY);

		const titleX = costCenterX + costRadius + 12;
		const titleColor = entry.isLockedByRealm ? "#666677" : "#ffffff";
		canvasRenderingContext.fillStyle = titleColor;
		canvasRenderingContext.font = "bold 15px GyeonggiBatangBold, sans-serif";
		canvasRenderingContext.textAlign = "left";
		canvasRenderingContext.textBaseline = "top";
		canvasRenderingContext.fillText(entry.displayName, titleX, y + 8);

		const subColor = entry.isLockedByRealm ? "#555566" : "#aaaabb";
		canvasRenderingContext.fillStyle = subColor;
		canvasRenderingContext.font = "12px GyeonggiBatang, sans-serif";
		const subText = entry.isLockedByRealm ? `🔒 경지 ${entry.requiredRealmRank} 필요` : entry.description;
		canvasRenderingContext.fillText(subText, titleX, y + 30);

		if (entry.isEquipped) {
			canvasRenderingContext.fillStyle = "#d4b46a";
			canvasRenderingContext.font = "bold 11px GyeonggiBatangBold, sans-serif";
			canvasRenderingContext.textAlign = "right";
			canvasRenderingContext.textBaseline = "top";
			canvasRenderingContext.fillText("덱 편성", x + width - 10, y + 8);
		}
	}

	//==============================================================================
	// 능력 탭.
	//==============================================================================
	/**
	 * @param { CanvasRenderingContext2D } canvasRenderingContext
	 * @param { number } x
	 * @param { number } y
	 * @param { number } width
	 * @param { number } height
	 */
	drawAbilitiesTab(canvasRenderingContext, x, y, width, height) {
		this.drawListHeader(canvasRenderingContext, x, y, width, "보유 능력 (패시브)");
		const listTopY = y + 36;
		const listInnerWidth = width - 16;
		const innerX = x + 8;
		for (let entryIndex = 0; entryIndex < this.#abilities.length; ++entryIndex) {
			const entry = this.#abilities[entryIndex];
			const rowY = listTopY + entryIndex * (LIST_ROW_HEIGHT + LIST_ROW_GAP);
			if (rowY + LIST_ROW_HEIGHT > y + height - 4) {
				break;
			}
			this.drawAbilityRow(canvasRenderingContext, entry, innerX, rowY, listInnerWidth, LIST_ROW_HEIGHT);
		}
		if (this.#abilities.length === 0) {
			this.drawEmptyMessage(canvasRenderingContext, x, y, width, height, "능력이 없다.");
		}
	}

	/**
	 * @param { CanvasRenderingContext2D } canvasRenderingContext
	 * @param { AbilityEntry } entry
	 * @param { number } x
	 * @param { number } y
	 * @param { number } width
	 * @param { number } height
	 */
	drawAbilityRow(canvasRenderingContext, entry, x, y, width, height) {
		canvasRenderingContext.fillStyle = "#1f2a48";
		canvasRenderingContext.fillRect(x, y, width, height);
		canvasRenderingContext.strokeStyle = "#3a4a6a";
		canvasRenderingContext.lineWidth = 1;
		canvasRenderingContext.strokeRect(x, y, width, height);

		canvasRenderingContext.fillStyle = "#ffffff";
		canvasRenderingContext.font = "bold 15px GyeonggiBatangBold, sans-serif";
		canvasRenderingContext.textAlign = "left";
		canvasRenderingContext.textBaseline = "top";
		canvasRenderingContext.fillText(entry.name, x + 12, y + 8);

		canvasRenderingContext.fillStyle = "#aaaabb";
		canvasRenderingContext.font = "12px GyeonggiBatang, sans-serif";
		canvasRenderingContext.fillText(entry.description, x + 12, y + 30);

		if (entry.source.length > 0) {
			canvasRenderingContext.fillStyle = "#ffcc88";
			canvasRenderingContext.font = "11px GyeonggiBatang, sans-serif";
			canvasRenderingContext.textAlign = "right";
			canvasRenderingContext.textBaseline = "top";
			canvasRenderingContext.fillText(entry.source, x + width - 10, y + 8);
		}
	}

	//==============================================================================
	// 관계 탭.
	//==============================================================================
	/**
	 * @param { CanvasRenderingContext2D } canvasRenderingContext
	 * @param { number } x
	 * @param { number } y
	 * @param { number } width
	 * @param { number } height
	 */
	drawRelationsTab(canvasRenderingContext, x, y, width, height) {
		this.drawListHeader(canvasRenderingContext, x, y, width, "등장인물 관계");
		const listTopY = y + 36;
		const listInnerWidth = width - 16;
		const innerX = x + 8;
		for (let entryIndex = 0; entryIndex < this.#relations.length; ++entryIndex) {
			const entry = this.#relations[entryIndex];
			const rowY = listTopY + entryIndex * (LIST_ROW_HEIGHT + LIST_ROW_GAP);
			if (rowY + LIST_ROW_HEIGHT > y + height - 4) {
				break;
			}
			this.drawRelationRow(canvasRenderingContext, entry, innerX, rowY, listInnerWidth, LIST_ROW_HEIGHT);
		}
		if (this.#relations.length === 0) {
			this.drawEmptyMessage(canvasRenderingContext, x, y, width, height, "관계가 형성된 인물이 없다.");
		}
	}

	/**
	 * @param { CanvasRenderingContext2D } canvasRenderingContext
	 * @param { RelationEntry } entry
	 * @param { number } x
	 * @param { number } y
	 * @param { number } width
	 * @param { number } height
	 */
	drawRelationRow(canvasRenderingContext, entry, x, y, width, height) {
		canvasRenderingContext.fillStyle = "#1f2a48";
		canvasRenderingContext.fillRect(x, y, width, height);
		canvasRenderingContext.strokeStyle = "#3a4a6a";
		canvasRenderingContext.lineWidth = 1;
		canvasRenderingContext.strokeRect(x, y, width, height);

		canvasRenderingContext.fillStyle = "#ffffff";
		canvasRenderingContext.font = "bold 15px GyeonggiBatangBold, sans-serif";
		canvasRenderingContext.textAlign = "left";
		canvasRenderingContext.textBaseline = "top";
		canvasRenderingContext.fillText(entry.name, x + 12, y + 8);

		canvasRenderingContext.fillStyle = "#aaaabb";
		canvasRenderingContext.font = "12px GyeonggiBatang, sans-serif";
		const subParts = [];
		if (entry.sectName.length > 0) {
			subParts.push(entry.sectName);
		}
		if (entry.note.length > 0) {
			subParts.push(entry.note);
		}
		canvasRenderingContext.fillText(subParts.join("  ·  "), x + 12, y + 30);

		const affinityColor = entry.affinity >= 0 ? "#88dd88" : "#dd6666";
		canvasRenderingContext.fillStyle = affinityColor;
		canvasRenderingContext.font = "bold 14px GyeonggiBatangBold, sans-serif";
		canvasRenderingContext.textAlign = "right";
		canvasRenderingContext.textBaseline = "middle";
		const affinitySign = entry.affinity > 0 ? "+" : "";
		canvasRenderingContext.fillText(`호감 ${affinitySign}${entry.affinity}`, x + width - 12, y + height * 0.5);
	}

	//==============================================================================
	// 일지 탭.
	//==============================================================================
	/**
	 * @param { CanvasRenderingContext2D } canvasRenderingContext
	 * @param { number } x
	 * @param { number } y
	 * @param { number } width
	 * @param { number } height
	 */
	drawJournalTab(canvasRenderingContext, x, y, width, height) {
		this.drawListHeader(canvasRenderingContext, x, y, width, "일지 (수행 기록)");
		const listTopY = y + 36;
		const listInnerWidth = width - 16;
		const innerX = x + 8;
		for (let entryIndex = 0; entryIndex < this.#journal.length; ++entryIndex) {
			const entry = this.#journal[entryIndex];
			const rowY = listTopY + entryIndex * (LIST_ROW_HEIGHT + LIST_ROW_GAP);
			if (rowY + LIST_ROW_HEIGHT > y + height - 4) {
				break;
			}
			this.drawJournalRow(canvasRenderingContext, entry, innerX, rowY, listInnerWidth, LIST_ROW_HEIGHT);
		}
		if (this.#journal.length === 0) {
			this.drawEmptyMessage(canvasRenderingContext, x, y, width, height, "기록된 사건이 없다.");
		}
	}

	/**
	 * @param { CanvasRenderingContext2D } canvasRenderingContext
	 * @param { JournalEntry } entry
	 * @param { number } x
	 * @param { number } y
	 * @param { number } width
	 * @param { number } height
	 */
	drawJournalRow(canvasRenderingContext, entry, x, y, width, height) {
		canvasRenderingContext.fillStyle = "#1f2a48";
		canvasRenderingContext.fillRect(x, y, width, height);
		canvasRenderingContext.strokeStyle = "#3a4a6a";
		canvasRenderingContext.lineWidth = 1;
		canvasRenderingContext.strokeRect(x, y, width, height);

		canvasRenderingContext.fillStyle = "#ffcc88";
		canvasRenderingContext.font = "12px GyeonggiBatang, sans-serif";
		canvasRenderingContext.textAlign = "left";
		canvasRenderingContext.textBaseline = "top";
		canvasRenderingContext.fillText(`${entry.daysPassed}일차`, x + 12, y + 8);

		canvasRenderingContext.fillStyle = "#ffffff";
		canvasRenderingContext.font = "bold 15px GyeonggiBatangBold, sans-serif";
		canvasRenderingContext.fillText(entry.title, x + 60, y + 8);

		canvasRenderingContext.fillStyle = "#aaaabb";
		canvasRenderingContext.font = "12px GyeonggiBatang, sans-serif";
		canvasRenderingContext.fillText(entry.summary, x + 12, y + 30);
	}

	//==============================================================================
	// 설정 탭. 행 클릭 → 토글 (isToggle=true 항목만).
	//==============================================================================
	/**
	 * @param { CanvasRenderingContext2D } canvasRenderingContext
	 * @param { number } x
	 * @param { number } y
	 * @param { number } width
	 * @param { number } height
	 */
	drawSettingsTab(canvasRenderingContext, x, y, width, height) {
		this.#settingRowLayouts = [];
		this.drawListHeader(canvasRenderingContext, x, y, width, "설정");
		const listTopY = y + 36;
		const listInnerWidth = width - 16;
		const innerX = x + 8;
		for (let entryIndex = 0; entryIndex < this.#settings.length; ++entryIndex) {
			const entry = this.#settings[entryIndex];
			const rowY = listTopY + entryIndex * (LIST_ROW_HEIGHT + LIST_ROW_GAP);
			if (rowY + LIST_ROW_HEIGHT > y + height - 4) {
				break;
			}
			this.drawSettingRow(canvasRenderingContext, entry, innerX, rowY, listInnerWidth, LIST_ROW_HEIGHT);
			this.#settingRowLayouts.push(new SettingRowLayout(entry, innerX, rowY, listInnerWidth, LIST_ROW_HEIGHT));
		}
		if (this.#settings.length === 0) {
			this.drawEmptyMessage(canvasRenderingContext, x, y, width, height, "설정 항목이 없다.");
		}
	}

	/**
	 * @param { CanvasRenderingContext2D } canvasRenderingContext
	 * @param { SettingEntry } entry
	 * @param { number } x
	 * @param { number } y
	 * @param { number } width
	 * @param { number } height
	 */
	drawSettingRow(canvasRenderingContext, entry, x, y, width, height) {
		canvasRenderingContext.fillStyle = "#1f2a48";
		canvasRenderingContext.fillRect(x, y, width, height);
		canvasRenderingContext.strokeStyle = "#3a4a6a";
		canvasRenderingContext.lineWidth = 1;
		canvasRenderingContext.strokeRect(x, y, width, height);

		canvasRenderingContext.fillStyle = "#ffffff";
		canvasRenderingContext.font = "bold 15px GyeonggiBatangBold, sans-serif";
		canvasRenderingContext.textAlign = "left";
		canvasRenderingContext.textBaseline = "top";
		canvasRenderingContext.fillText(entry.name, x + 12, y + 8);

		canvasRenderingContext.fillStyle = "#aaaabb";
		canvasRenderingContext.font = "12px GyeonggiBatang, sans-serif";
		canvasRenderingContext.fillText(entry.description, x + 12, y + 30);

		// 우측 값 표기 (토글이면 ON/OFF 박스, 액션이면 단순 라벨).
		const rightValueText = entry.valueLabel && entry.valueLabel.length > 0 ? entry.valueLabel : (entry.isToggle ? (entry.isOn ? "켬" : "끔") : "실행");
		const valueColor = entry.isToggle ? (entry.isOn ? "#88dd88" : "#dd6666") : "#d4b46a";
		canvasRenderingContext.fillStyle = valueColor;
		canvasRenderingContext.font = "bold 14px GyeonggiBatangBold, sans-serif";
		canvasRenderingContext.textAlign = "right";
		canvasRenderingContext.textBaseline = "middle";
		canvasRenderingContext.fillText(rightValueText, x + width - 14, y + height * 0.5);
	}

	//==============================================================================
	// 리스트 헤더 (탭 컨텐츠 좌상단 라벨).
	//==============================================================================
	/**
	 * @param { CanvasRenderingContext2D } canvasRenderingContext
	 * @param { number } x
	 * @param { number } y
	 * @param { number } width
	 * @param { string } label
	 */
	drawListHeader(canvasRenderingContext, x, y, width, label) {
		canvasRenderingContext.fillStyle = "#cccccc";
		canvasRenderingContext.font = "13px GyeonggiBatang, sans-serif";
		canvasRenderingContext.textAlign = "left";
		canvasRenderingContext.textBaseline = "top";
		canvasRenderingContext.fillText(label, x + 12, y + 10);
	}

	//==============================================================================
	// 빈 상태 안내 (가운데 정렬).
	//==============================================================================
	/**
	 * @param { CanvasRenderingContext2D } canvasRenderingContext
	 * @param { number } x
	 * @param { number } y
	 * @param { number } width
	 * @param { number } height
	 * @param { string } message
	 */
	drawEmptyMessage(canvasRenderingContext, x, y, width, height, message) {
		canvasRenderingContext.fillStyle = "#888899";
		canvasRenderingContext.font = "14px GyeonggiBatang, sans-serif";
		canvasRenderingContext.textAlign = "center";
		canvasRenderingContext.textBaseline = "middle";
		canvasRenderingContext.fillText(message, x + width * 0.5, y + height * 0.5);
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
		canvasRenderingContext.fillText("상단 탭을 눌러 정보를 전환한다.", popupRect.x + popupRect.width * 0.5, footerY + FOOTER_HEIGHT * 0.5);
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
	// 외부 데이터 주입 전 임시 샘플 데이터 (개발 중 미리보기용).
	//==============================================================================
	installSampleData() {
		this.setProfile("한두백", "축기 1단", "검종", 1);
		this.setMoney(30);

		const sampleBaseStats = [];
		sampleBaseStats.push(new BaseStatEntry("strength", "힘", 5));
		sampleBaseStats.push(new BaseStatEntry("agility", "민", 4));
		sampleBaseStats.push(new BaseStatEntry("intellect", "지", 6));
		sampleBaseStats.push(new BaseStatEntry("luck", "운", 3));
		this.setBaseStats(sampleBaseStats);

		const sampleCombatStats = [];
		sampleCombatStats.push(new CombatStatEntry("health", "체력", 28, 30));
		sampleCombatStats.push(new CombatStatEntry("stamina", "기력", 12, 15));
		sampleCombatStats.push(new CombatStatEntry("energy", "영력", 5, 5));
		sampleCombatStats.push(new CombatStatEntry("attack", "공격력", 12, 0));
		sampleCombatStats.push(new CombatStatEntry("defense", "수비력", 8, 0));
		this.setCombatStats(sampleCombatStats);

		const sampleInventory = [];
		sampleInventory.push(new InventoryEntry(1, "철검", "장비 / 무기", "공격 카드의 피해 +1", 1));
		sampleInventory.push(new InventoryEntry(2, "수련복", "장비 / 방어구", "최대 체력 +5", 1));
		sampleInventory.push(new InventoryEntry(3, "영단", "소모품", "체력 10 회복", 2));
		this.setInventory(sampleInventory);

		const sampleOwnedCards = [];
		sampleOwnedCards.push(new OwnedCardEntry(11000001, "휘두르기", "검을 가로로 휘둘러 6의 피해", 1, 1, 1, true, false));
		sampleOwnedCards.push(new OwnedCardEntry(11000007, "베기", "검을 옆으로 휘둘러 5의 피해", 1, 1, 1, true, false));
		sampleOwnedCards.push(new OwnedCardEntry(11000008, "내리치기", "검을 내리쳐 7의 피해", 1, 1, 1, true, false));
		sampleOwnedCards.push(new OwnedCardEntry(12000011, "공격", "검을 휘둘러 6의 피해", 1, 2, 2, false, true));
		this.setOwnedCards(sampleOwnedCards);

		const sampleAbilities = [];
		sampleAbilities.push(new AbilityEntry(1, "검종 입문생", "전투 시작 시 행동력 +0", "검종 입문 시험 통과"));
		this.setAbilities(sampleAbilities);

		const sampleRelations = [];
		sampleRelations.push(new RelationEntry(10000002, "검종 장로", "검종", 5, "입문 시험을 주관"));
		sampleRelations.push(new RelationEntry(10000003, "소멸도노", "방랑", 0, "거리에서 한 번 마주침"));
		this.setRelations(sampleRelations);

		const sampleJournal = [];
		sampleJournal.push(new JournalEntry(1, 1, "검종 입문 시험", "검종 산문 앞에서 장로의 검을 받아냈다."));
		this.setJournal(sampleJournal);

		const sampleSettings = [];
		sampleSettings.push(new SettingEntry("beep", "비프 효과음", "버튼·타이핑 소리 재생", true, true, "켬"));
		sampleSettings.push(new SettingEntry("floatingText", "플로팅 텍스트", "수치 / 대사 말풍선 표시", true, true, "켬"));
		sampleSettings.push(new SettingEntry("autoEndTurn", "자동 턴 종료", "행동력 0 일 때 자동 종료", true, false, "끔"));
		sampleSettings.push(new SettingEntry("save", "저장", "현재 진행 상태를 저장", false, false, "실행"));
		sampleSettings.push(new SettingEntry("load", "불러오기", "저장된 진행 상태 불러오기", false, false, "실행"));
		sampleSettings.push(new SettingEntry("restart", "처음으로", "처음 화면으로 돌아가기", false, false, "실행"));
		this.setSettings(sampleSettings);
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
export { PlayerPartTabKey, InventoryEntry, OwnedCardEntry, AbilityEntry, RelationEntry, JournalEntry, BaseStatEntry, CombatStatEntry, SettingEntry };

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
// 어빌리티 (패시브) 항목.
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
// 저널 (수행 기록) 항목.
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
// 능력치 (스탯) 한 줄.
//==============================================================================
class StatEntry extends Object {
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
// - 상단 탭 (경지/스탯, 인벤토리, 산패, 어빌리티, 관계, 저널) 으로 보유 정보를 분류 표시.
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
	/** @private @type { number } */ #health;
	/** @private @type { number } */ #maxHealth;
	/** @private @type { number } */ #daysPassed;
	/** @private @type { StatEntry[] } */ #stats;
	/** @private @type { InventoryEntry[] } */ #inventory;
	/** @private @type { OwnedCardEntry[] } */ #ownedCards;
	/** @private @type { AbilityEntry[] } */ #abilities;
	/** @private @type { RelationEntry[] } */ #relations;
	/** @private @type { JournalEntry[] } */ #journal;
	/** @private @type { string } */ #activeTabKey;
	/** @private @type { TabButtonLayout[] } */ #tabButtonLayouts;
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
		this.#health = 0;
		this.#maxHealth = 0;
		this.#daysPassed = 0;
		this.#stats = [];
		this.#inventory = [];
		this.#ownedCards = [];
		this.#abilities = [];
		this.#relations = [];
		this.#journal = [];
		this.#activeTabKey = PlayerPartTabKey.profile;
		this.#tabButtonLayouts = [];
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
	 * @param { number } health
	 * @param { number } maxHealth
	 * @param { number } daysPassed
	 */
	setProfile(characterName, stageName, sectName, health, maxHealth, daysPassed) {
		this.#characterName = characterName;
		this.#stageName = stageName;
		this.#sectName = sectName;
		this.#health = health;
		this.#maxHealth = maxHealth;
		this.#daysPassed = daysPassed;
	}

	/**
	 * @param { StatEntry[] } stats
	 */
	setStats(stats) {
		this.#stats = System.Array.isArray(stats) ? stats : [];
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
					const clickAudioBeepPlayer = this.getAudioBeepPlayer();
					if (clickAudioBeepPlayer) {
						clickAudioBeepPlayer.playClick();
					}
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
		if (this.#maxHealth > 0) {
			headerRightParts.push(`체력 ${this.#health}/${this.#maxHealth}`);
		}
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
				return "경지 / 능력";
			}
			case PlayerPartTabKey.inventory: {
				return "인벤토리";
			}
			case PlayerPartTabKey.deck: {
				return "산패";
			}
			case PlayerPartTabKey.abilities: {
				return "어빌리티";
			}
			case PlayerPartTabKey.relations: {
				return "관계";
			}
			case PlayerPartTabKey.journal: {
				return "저널";
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
		}
	}

	//==============================================================================
	// 경지 / 능력 탭.
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

		// 능력치 표.
		const statsTopY = innerY + 64;
		canvasRenderingContext.fillStyle = "#cccccc";
		canvasRenderingContext.font = "13px GyeonggiBatang, sans-serif";
		canvasRenderingContext.fillText("능력치", innerX, statsTopY);

		const statsRowHeight = 28;
		for (let statIndex = 0; statIndex < this.#stats.length; ++statIndex) {
			const stat = this.#stats[statIndex];
			const rowY = statsTopY + 24 + statIndex * statsRowHeight;
			if (rowY + statsRowHeight > y + height - 8) {
				break;
			}
			canvasRenderingContext.fillStyle = "#dddddd";
			canvasRenderingContext.font = "15px GyeonggiBatang, sans-serif";
			canvasRenderingContext.textAlign = "left";
			canvasRenderingContext.fillText(stat.name, innerX, rowY);
			canvasRenderingContext.fillStyle = "#ffffff";
			canvasRenderingContext.font = "bold 15px GyeonggiBatangBold, sans-serif";
			canvasRenderingContext.textAlign = "right";
			canvasRenderingContext.fillText(stat.value.toString(), x + width - 16, rowY);
		}
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
		this.drawListHeader(canvasRenderingContext, x, y, width, "보유 장비 / 보유물품 / 소모품");
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
	// 어빌리티 탭.
	//==============================================================================
	/**
	 * @param { CanvasRenderingContext2D } canvasRenderingContext
	 * @param { number } x
	 * @param { number } y
	 * @param { number } width
	 * @param { number } height
	 */
	drawAbilitiesTab(canvasRenderingContext, x, y, width, height) {
		this.drawListHeader(canvasRenderingContext, x, y, width, "보유 어빌리티 (패시브)");
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
			this.drawEmptyMessage(canvasRenderingContext, x, y, width, height, "어빌리티가 없다.");
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
	// 저널 탭.
	//==============================================================================
	/**
	 * @param { CanvasRenderingContext2D } canvasRenderingContext
	 * @param { number } x
	 * @param { number } y
	 * @param { number } width
	 * @param { number } height
	 */
	drawJournalTab(canvasRenderingContext, x, y, width, height) {
		this.drawListHeader(canvasRenderingContext, x, y, width, "수행 기록");
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
		this.setProfile("한두백", "축기 1단", "검종", 28, 30, 1);
		const sampleStats = [];
		sampleStats.push(new StatEntry("strength", "근골", 5));
		sampleStats.push(new StatEntry("spirit", "영근", 6));
		sampleStats.push(new StatEntry("perception", "인지", 4));
		sampleStats.push(new StatEntry("fame", "명성", 0));
		this.setStats(sampleStats);

		const sampleInventory = [];
		sampleInventory.push(new InventoryEntry(1, "철검", "장비 / 무기", "공격 카드의 피해 +1", 1));
		sampleInventory.push(new InventoryEntry(2, "수련복", "장비 / 방어구", "최대 체력 +5", 1));
		sampleInventory.push(new InventoryEntry(3, "영석", "재화", "시장 거래에 사용", 30));
		sampleInventory.push(new InventoryEntry(4, "영단", "소모품", "체력 10 회복", 2));
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
export { PlayerPartTabKey, InventoryEntry, OwnedCardEntry, AbilityEntry, RelationEntry, JournalEntry, StatEntry };

//==============================================================================
// 포함 모듈 목록.
//==============================================================================
const System = globalThis;
import { Object } from "../../libs/vanilla.js/src/base/object.js";


//==============================================================================
// 단계 식별자 (높음 / 보통 / 낮음 / 없음). 부채꼴 각도 / 겹치기 정도 등에 공용 사용.
//==============================================================================
const SettingLevel = System.Object.freeze({
	high: "high",
	normal: "normal",
	low: "low",
	none: "none",
});


//==============================================================================
// 설정 단계의 한국어 라벨.
//==============================================================================
/**
 * @param { string } level
 * @returns { string }
 */
function levelLabel(level) {
	switch (level) {
		case SettingLevel.high: {
			return "높음";
		}
		case SettingLevel.normal: {
			return "보통";
		}
		case SettingLevel.low: {
			return "낮음";
		}
		case SettingLevel.none: {
			return "없음";
		}
		default: {
			return "";
		}
	}
}


//==============================================================================
// 사용자 설정 본체. 모듈 단일 인스턴스(`activeUserSettings`) 로 운영.
// load / save 는 localStorage 사용. 게임 시작 시 main.js 가 load 호출.
//==============================================================================
class UserSettings extends Object {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @type { boolean } */ isBeepEnabled;
	/** @type { boolean } */ isFloatingTextEnabled;
	/** @type { boolean } */ isAutoEndTurnEnabled;
	/** @type { string } */ handFanAngleLevel;
	/** @type { string } */ handOverlapLevel;

	//==============================================================================
	// 생성. 기본값으로 초기화.
	//==============================================================================
	constructor() {
		super();
		this.isBeepEnabled = true;
		this.isFloatingTextEnabled = true;
		this.isAutoEndTurnEnabled = false;
		this.handFanAngleLevel = SettingLevel.normal;
		this.handOverlapLevel = SettingLevel.normal;
	}
}


//==============================================================================
// 모듈 단일 인스턴스 + localStorage 키.
//==============================================================================
const STORAGE_KEY = "talesofcultivation.usersettings.v1";
const activeUserSettings = new UserSettings();


//==============================================================================
// localStorage 에서 불러오기. 실패 시 기본값 유지.
//==============================================================================
export function loadUserSettings() {
	if (typeof localStorage === "undefined") {
		return;
	}
	try {
		const rawText = localStorage.getItem(STORAGE_KEY);
		if (!rawText) {
			return;
		}
		const parsed = System.JSON.parse(rawText);
		if (typeof parsed.isBeepEnabled === "boolean") {
			activeUserSettings.isBeepEnabled = parsed.isBeepEnabled;
		}
		if (typeof parsed.isFloatingTextEnabled === "boolean") {
			activeUserSettings.isFloatingTextEnabled = parsed.isFloatingTextEnabled;
		}
		if (typeof parsed.isAutoEndTurnEnabled === "boolean") {
			activeUserSettings.isAutoEndTurnEnabled = parsed.isAutoEndTurnEnabled;
		}
		if (typeof parsed.handFanAngleLevel === "string") {
			activeUserSettings.handFanAngleLevel = parsed.handFanAngleLevel;
		}
		if (typeof parsed.handOverlapLevel === "string") {
			activeUserSettings.handOverlapLevel = parsed.handOverlapLevel;
		}
	}
	catch (loadError) {
		// 파싱 실패 시 기본값 유지.
	}
}


//==============================================================================
// localStorage 에 저장.
//==============================================================================
export function saveUserSettings() {
	if (typeof localStorage === "undefined") {
		return;
	}
	try {
		const serializedText = System.JSON.stringify({
			isBeepEnabled: activeUserSettings.isBeepEnabled,
			isFloatingTextEnabled: activeUserSettings.isFloatingTextEnabled,
			isAutoEndTurnEnabled: activeUserSettings.isAutoEndTurnEnabled,
			handFanAngleLevel: activeUserSettings.handFanAngleLevel,
			handOverlapLevel: activeUserSettings.handOverlapLevel,
		});
		localStorage.setItem(STORAGE_KEY, serializedText);
	}
	catch (saveError) {
		// 저장 실패 시 무시.
	}
}


//==============================================================================
// 외부 접근자 / setter.
//==============================================================================
/**
 * @returns { UserSettings }
 */
export function getUserSettings() {
	return activeUserSettings;
}

/**
 * @param { string } level
 */
export function setHandFanAngleLevel(level) {
	activeUserSettings.handFanAngleLevel = level;
	saveUserSettings();
}

/**
 * @param { string } level
 */
export function setHandOverlapLevel(level) {
	activeUserSettings.handOverlapLevel = level;
	saveUserSettings();
}

/**
 * @param { boolean } isOn
 */
export function setBeepEnabled(isOn) {
	activeUserSettings.isBeepEnabled = isOn;
	saveUserSettings();
}

/**
 * @param { boolean } isOn
 */
export function setFloatingTextEnabled(isOn) {
	activeUserSettings.isFloatingTextEnabled = isOn;
	saveUserSettings();
}

/**
 * @param { boolean } isOn
 */
export function setAutoEndTurnEnabled(isOn) {
	activeUserSettings.isAutoEndTurnEnabled = isOn;
	saveUserSettings();
}


//==============================================================================
// 손패 부채꼴 각도 (도). handFanAngleLevel 단계별 카드당 각도.
//==============================================================================
/**
 * @returns { number }
 */
export function getHandFanAnglePerCardDegrees() {
	switch (activeUserSettings.handFanAngleLevel) {
		case SettingLevel.high: {
			return 8;
		}
		case SettingLevel.normal: {
			return 5;
		}
		case SettingLevel.low: {
			return 3;
		}
		case SettingLevel.none: {
			return 0;
		}
		default: {
			return 5;
		}
	}
}


//==============================================================================
// 손패 카드 가로 간격 배율. handOverlapLevel 단계별:
// 높음 = 많이 겹침(좁은 간격), 보통 = 원래 부채꼴 간격, 낮음 = 더 넓게, 없음 = 카드 폭만큼 띄움.
//==============================================================================
/**
 * @returns { number }
 */
export function getHandSpacingMultiplier() {
	switch (activeUserSettings.handOverlapLevel) {
		case SettingLevel.high: {
			return 0.6;
		}
		case SettingLevel.normal: {
			return 1.0;
		}
		case SettingLevel.low: {
			return 1.6;
		}
		case SettingLevel.none: {
			return 2.6;
		}
		default: {
			return 1.0;
		}
	}
}


//==============================================================================
// 외부 사용을 위한 식별자 / 헬퍼 재공개.
//==============================================================================
export { SettingLevel, levelLabel, UserSettings };

//==============================================================================
// 포함 모듈 목록.
//==============================================================================
import { Object } from "../../libs/vanilla.js/src/base/object.js";


//==============================================================================
// BuffTableData (bufftable.json 의 한 객체에 대응). xlsx-to-classes 가 자동 생성.
// 수동 편집 금지 — xlsx 의 컬럼/타입을 바꾼 뒤 "data classes" 를 다시 실행할 것.
//==============================================================================
export class BuffTableData extends Object {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @type { string } */ id;
	/** @type { string } */ displayName;
	/** @type { string } */ color;
	/** @type { string } */ icon;
	/** @type { string } */ description;
	/** @type { boolean } */ isTurnTemporary;
	/** @type { boolean } */ decayPerTurn;

	//==============================================================================
	// 생성. data = bufftable.json 의 한 객체.
	//==============================================================================
	/**
	 * @param { Object } data
	 */
	constructor(data) {
		super();
		this.id = data.id || "";
		this.displayName = data.displayName || "";
		this.color = data.color || "";
		this.icon = data.icon || "";
		this.description = data.description || "";
		this.isTurnTemporary = data.isTurnTemporary === true;
		this.decayPerTurn = data.decayPerTurn === true;
	}
}

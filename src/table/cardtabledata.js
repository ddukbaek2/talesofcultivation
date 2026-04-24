//==============================================================================
// 포함 모듈 목록.
//==============================================================================
const System = globalThis;
import { Object } from "../../libs/vanilla.js/src/base/object.js";


//==============================================================================
// CardTableData (cardtable.json 의 한 객체에 대응). vanilla.js excel 도구가 자동 생성.
// 수동 편집 금지 — xlsx 의 컬럼/타입을 바꾼 뒤 클래스 생성을 다시 실행할 것.
//==============================================================================
export class CardTableData extends Object {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @type { number } */ id;
	/** @type { string } */ displayName;
	/** @type { string } */ description;
	/** @type { string } */ color;
	/** @type { boolean } */ isSpecial;
	/** @type { number } */ grade;
	/** @type { number } */ cost;
	/** @type { number } */ sect;
	/** @type { string } */ element;
	/** @type { string } */ cardType;
	/** @type { Array } */ effects;

	//==============================================================================
	// 생성. data = cardtable.json 의 한 객체.
	//==============================================================================
	/**
	 * @param { Object } data
	 */
	constructor(data) {
		super();
		this.id = typeof data.id === "number" ? data.id : 0;
		this.displayName = data.displayName || "";
		this.description = data.description || "";
		this.color = data.color || "";
		this.isSpecial = data.isSpecial === true;
		this.grade = typeof data.grade === "number" ? data.grade : 0;
		this.cost = typeof data.cost === "number" ? data.cost : 0;
		this.sect = typeof data.sect === "number" ? data.sect : 0;
		this.element = data.element || "";
		this.cardType = data.cardType || "";
		this.effects = System.Array.isArray(data.effects) ? data.effects : [];
	}
}

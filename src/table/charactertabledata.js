//==============================================================================
// 포함 모듈 목록.
//==============================================================================
import { Object } from "../../libs/vanilla.js/src/base/object.js";


//==============================================================================
// CharacterTableData (charactertable.json 의 한 객체에 대응). vanilla.js excel 도구가 자동 생성.
// 수동 편집 금지 — xlsx 의 컬럼/타입을 바꾼 뒤 클래스 생성을 다시 실행할 것.
//==============================================================================
export class CharacterTableData extends Object {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @type { number } */ id;
	/** @type { string } */ name;
	/** @type { number } */ realmId;
	/** @type { number } */ sectId;
	/** @type { string } */ description;

	//==============================================================================
	// 생성. data = charactertable.json 의 한 객체.
	//==============================================================================
	/**
	 * @param { Object } data
	 */
	constructor(data) {
		super();
		this.id = typeof data.id === "number" ? data.id : 0;
		this.name = data.name || "";
		this.realmId = typeof data.realmId === "number" ? data.realmId : 0;
		this.sectId = typeof data.sectId === "number" ? data.sectId : 0;
		this.description = data.description || "";
	}
}

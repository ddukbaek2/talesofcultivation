//==============================================================================
// 포함 모듈 목록.
//==============================================================================
import { Object } from "../../libs/vanilla.js/src/base/object.js";


//==============================================================================
// 캐릭터 테이블 한 행의 데이터 구조체 (charactertable.json 의 각 객체에 대응).
// realmId 는 realmtable 의 id, sectId 는 secttable 의 id 를 참조.
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
		this.id = data.id;
		this.name = data.name || "";
		this.realmId = typeof data.realmId === "number" ? data.realmId : 0;
		this.sectId = typeof data.sectId === "number" ? data.sectId : 0;
		this.description = data.description || "";
	}
}

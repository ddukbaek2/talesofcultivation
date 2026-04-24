//==============================================================================
// 포함 모듈 목록.
//==============================================================================
import { Object } from "../../libs/vanilla.js/src/base/object.js";


//==============================================================================
// DialogueTableData (dialoguetable.json 의 한 객체에 대응). vanilla.js excel 도구가 자동 생성.
// 수동 편집 금지 — xlsx 의 컬럼/타입을 바꾼 뒤 클래스 생성을 다시 실행할 것.
//==============================================================================
export class DialogueTableData extends Object {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @type { number } */ id;
	/** @type { string } */ scene;
	/** @type { number } */ sequence;
	/** @type { string } */ speaker;
	/** @type { string } */ text;

	//==============================================================================
	// 생성. data = dialoguetable.json 의 한 객체.
	//==============================================================================
	/**
	 * @param { Object } data
	 */
	constructor(data) {
		super();
		this.id = typeof data.id === "number" ? data.id : 0;
		this.scene = data.scene || "";
		this.sequence = typeof data.sequence === "number" ? data.sequence : 0;
		this.speaker = data.speaker || "";
		this.text = data.text || "";
	}
}

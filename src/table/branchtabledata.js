//==============================================================================
// 포함 모듈 목록.
//==============================================================================
const System = globalThis;
import { Object } from "../../libs/vanilla.js/src/base/object.js";


//==============================================================================
// BranchTableData. 브랜치 씬 한 항목에 대응.
//==============================================================================
export class BranchTableData extends Object {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @type { number } */ id;
	/** @type { string } */ name;
	/** @type { string } */ description;
	/** @type { string } */ portraitLabel;
	/** @type { string } */ portraitColor;
	/** @type { number } */ row;
	/** @type { number } */ column;
	/** @type { string } */ status;
	/** @type { number[] } */ nextSceneIds;

	//==============================================================================
	// 생성. data = branchTable 배열의 한 항목.
	//==============================================================================
	/**
	 * @param { Object } data
	 */
	constructor(data) {
		super();
		this.id = typeof data.id === "number" ? data.id : 0;
		this.name = typeof data.name === "string" ? data.name : "";
		this.description = typeof data.description === "string" ? data.description : "";
		this.portraitLabel = typeof data.portraitLabel === "string" ? data.portraitLabel : "";
		this.portraitColor = typeof data.portraitColor === "string" ? data.portraitColor : "#888888";
		this.row = typeof data.row === "number" ? data.row : 0;
		this.column = typeof data.column === "number" ? data.column : 0;
		this.status = typeof data.status === "string" ? data.status : "unvisited";
		this.nextSceneIds = System.Array.isArray(data.nextSceneIds) ? data.nextSceneIds : [];
	}
}


//==============================================================================
// 브랜치 테이블 데이터.
// 히스토리 경로: 1 → 2 → 4 → 7 → 10 → 14 (현재).
// row × column 격자 배치. status: "visited" | "unvisited" | "current".
//==============================================================================
export const branchTable = [
	// Col 0
	{ id: 1, name: "검종 산문 앞", description: "검종 입문 시험을 치르는 곳.", portraitLabel: "산", portraitColor: "#5577aa", row: 1, column: 0, status: "visited", nextSceneIds: [2] },
	// Col 1
	{ id: 2, name: "검종 본전", description: "종파의 중심. 상점·대장간·도장이 모여 있다.", portraitLabel: "본", portraitColor: "#88aa88", row: 1, column: 1, status: "visited", nextSceneIds: [3, 4, 5] },
	// Col 2
	{ id: 3, name: "검종 후산 동굴", description: "사람 발길이 끊긴 곳.", portraitLabel: "후", portraitColor: "#664488", row: 0, column: 2, status: "unvisited", nextSceneIds: [6] },
	{ id: 4, name: "강호 시장", description: "여러 종파의 수사들이 오가는 떠들썩한 시장.", portraitLabel: "시", portraitColor: "#cc8844", row: 1, column: 2, status: "visited", nextSceneIds: [7] },
	{ id: 5, name: "검종 연무장", description: "제자들이 검술을 연마하는 수련장.", portraitLabel: "련", portraitColor: "#557799", row: 2, column: 2, status: "unvisited", nextSceneIds: [8] },
	// Col 3
	{ id: 6, name: "영약초 탐사지", description: "신비한 약초가 자라는 깊은 산속.", portraitLabel: "약", portraitColor: "#338866", row: 0, column: 3, status: "unvisited", nextSceneIds: [9] },
	{ id: 7, name: "비검문 외곽", description: "또 다른 강호의 종파. 경계가 삼엄하다.", portraitLabel: "비", portraitColor: "#aa3344", row: 1, column: 3, status: "visited", nextSceneIds: [10, 11] },
	{ id: 8, name: "흑시장 뒷골목", description: "신원 불명의 상인들이 오가는 곳.", portraitLabel: "흑", portraitColor: "#444466", row: 2, column: 3, status: "unvisited", nextSceneIds: [12] },
	// Col 4
	{ id: 9, name: "심산 유곡", description: "세상과 단절된 수련의 땅.", portraitLabel: "유", portraitColor: "#336677", row: 0, column: 4, status: "unvisited", nextSceneIds: [13] },
	{ id: 10, name: "악인당 소굴", description: "강호의 악인들이 모여드는 장소.", portraitLabel: "악", portraitColor: "#774433", row: 1, column: 4, status: "visited", nextSceneIds: [14, 15] },
	{ id: 11, name: "고대 수련터", description: "오래전 선인들이 수련하던 유적.", portraitLabel: "고", portraitColor: "#556644", row: 2, column: 4, status: "unvisited", nextSceneIds: [16] },
	{ id: 12, name: "독룡 소굴", description: "독을 다루는 적들의 은거지.", portraitLabel: "독", portraitColor: "#774400", row: 3, column: 4, status: "unvisited", nextSceneIds: [16, 35] },
	// Col 5
	{ id: 13, name: "비검 내전", description: "비검문의 핵심 수련 구역.", portraitLabel: "내", portraitColor: "#993366", row: 0, column: 5, status: "unvisited", nextSceneIds: [17] },
	{ id: 14, name: "비검 밀실", description: "비검문의 감춰진 비밀이 잠든 곳.", portraitLabel: "밀", portraitColor: "#664488", row: 1, column: 5, status: "current", nextSceneIds: [18] },
	{ id: 15, name: "황폐한 유적", description: "오래전 전투로 황폐해진 땅.", portraitLabel: "황", portraitColor: "#886644", row: 2, column: 5, status: "unvisited", nextSceneIds: [26] },
	{ id: 16, name: "금단의 영역", description: "수사들이 꺼리는 위험한 장소.", portraitLabel: "금", portraitColor: "#884433", row: 3, column: 5, status: "unvisited", nextSceneIds: [31] },
	// Col 6
	{ id: 17, name: "용봉 협곡", description: "전설 속 용과 봉황이 교전했다는 협곡.", portraitLabel: "용", portraitColor: "#aa6622", row: 0, column: 6, status: "unvisited", nextSceneIds: [19] },
	{ id: 18, name: "봉인된 공간", description: "고대의 힘이 봉인된 미지의 영역.", portraitLabel: "봉", portraitColor: "#334466", row: 1, column: 6, status: "unvisited", nextSceneIds: [22, 26] },
	{ id: 26, name: "폐허 구역", description: "오래된 전장의 잔해가 가득한 구역.", portraitLabel: "폐", portraitColor: "#776644", row: 2, column: 6, status: "unvisited", nextSceneIds: [27, 31] },
	{ id: 31, name: "지하 통로", description: "복잡하게 뒤얽힌 지하 미로.", portraitLabel: "로", portraitColor: "#445544", row: 3, column: 6, status: "unvisited", nextSceneIds: [32, 37] },
	{ id: 36, name: "마황 소굴", description: "마황이 은신한 깊은 동굴.", portraitLabel: "굴", portraitColor: "#662233", row: 4, column: 6, status: "unvisited", nextSceneIds: [37, 42] },
	{ id: 42, name: "봉인 동굴", description: "강력한 봉인이 가득한 동굴.", portraitLabel: "인", portraitColor: "#334411", row: 5, column: 6, status: "unvisited", nextSceneIds: [43] },
	// Col 7
	{ id: 19, name: "천도 협곡", description: "하늘과 맞닿은 절벽의 협곡.", portraitLabel: "천", portraitColor: "#aa7733", row: 0, column: 7, status: "unvisited", nextSceneIds: [20, 22] },
	{ id: 22, name: "비검 외원", description: "비검문의 외부 구역. 순찰대가 경비한다.", portraitLabel: "외", portraitColor: "#993355", row: 1, column: 7, status: "unvisited", nextSceneIds: [23, 27] },
	{ id: 27, name: "고대 지하실", description: "고대 문명의 흔적이 남은 지하실.", portraitLabel: "실", portraitColor: "#446655", row: 2, column: 7, status: "unvisited", nextSceneIds: [28, 32] },
	{ id: 32, name: "봉마 동굴", description: "봉인된 마족의 거처.", portraitLabel: "마", portraitColor: "#553344", row: 3, column: 7, status: "unvisited", nextSceneIds: [33, 38] },
	{ id: 37, name: "폐허 심층", description: "폐허 아래의 더 깊은 층.", portraitLabel: "층", portraitColor: "#443322", row: 4, column: 7, status: "unvisited", nextSceneIds: [38, 43] },
	{ id: 43, name: "세계의 끝", description: "세계의 경계에 닿은 극한의 장소.", portraitLabel: "끝", portraitColor: "#111122", row: 5, column: 7, status: "unvisited", nextSceneIds: [] },
	// Col 8
	{ id: 20, name: "고산 결계", description: "선인들이 쳐둔 강력한 결계 지역.", portraitLabel: "결", portraitColor: "#5566aa", row: 0, column: 8, status: "unvisited", nextSceneIds: [21] },
	{ id: 23, name: "비검 내원", description: "비검문의 내부 수련 구역.", portraitLabel: "원", portraitColor: "#773377", row: 1, column: 8, status: "unvisited", nextSceneIds: [24, 28] },
	{ id: 28, name: "지하 제단", description: "어둠의 신에게 제를 올리던 지하 공간.", portraitLabel: "단", portraitColor: "#554466", row: 2, column: 8, status: "unvisited", nextSceneIds: [29, 33] },
	{ id: 33, name: "지하 용혈", description: "용의 피가 스며든 신성한 동굴.", portraitLabel: "혈", portraitColor: "#663322", row: 3, column: 8, status: "unvisited", nextSceneIds: [34, 39] },
	{ id: 38, name: "망각의 땅", description: "기억을 잃게 한다는 저주받은 땅.", portraitLabel: "망", portraitColor: "#222244", row: 4, column: 8, status: "unvisited", nextSceneIds: [39] },
	// Col 9
	{ id: 21, name: "봉황의 둥지", description: "전설의 봉황이 산다는 최고봉.", portraitLabel: "상", portraitColor: "#cc6633", row: 0, column: 9, status: "unvisited", nextSceneIds: [] },
	{ id: 24, name: "비검 극의", description: "비검문의 최고 비전이 잠든 방.", portraitLabel: "극", portraitColor: "#553399", row: 1, column: 9, status: "unvisited", nextSceneIds: [25] },
	{ id: 29, name: "원소의 방", description: "다섯 원소의 기운이 충돌하는 장소.", portraitLabel: "소", portraitColor: "#334455", row: 2, column: 9, status: "unvisited", nextSceneIds: [30, 34] },
	{ id: 34, name: "심연의 입구", description: "끝없이 깊은 어둠으로 이어지는 입구.", portraitLabel: "연", portraitColor: "#222233", row: 3, column: 9, status: "unvisited", nextSceneIds: [] },
	{ id: 39, name: "공허의 경계", description: "존재와 무존재의 경계가 희미해지는 곳.", portraitLabel: "공", portraitColor: "#112233", row: 4, column: 9, status: "unvisited", nextSceneIds: [] },
	// Col 10
	{ id: 25, name: "허공 제단", description: "공중에 떠 있는 신비한 제단.", portraitLabel: "허", portraitColor: "#334488", row: 1, column: 10, status: "unvisited", nextSceneIds: [] },
	{ id: 30, name: "차원 균열", description: "공간이 뒤틀려 다른 세계와 연결된 곳.", portraitLabel: "열", portraitColor: "#223344", row: 2, column: 10, status: "unvisited", nextSceneIds: [] },
	// Row 4 — 하층 (col 4-5)
	{ id: 35, name: "독지 심층", description: "독기가 충만한 지하 깊은 곳.", portraitLabel: "심", portraitColor: "#556622", row: 4, column: 4, status: "unvisited", nextSceneIds: [36, 40] },
	// Row 5 — 최하층 (col 4-5)
	{ id: 40, name: "심연 입구", description: "심연으로 내려가는 마지막 관문.", portraitLabel: "관", portraitColor: "#222244", row: 5, column: 4, status: "unvisited", nextSceneIds: [41] },
	{ id: 41, name: "지하 용암", description: "끓어오르는 용암이 흐르는 지하 세계.", portraitLabel: "암", portraitColor: "#882211", row: 5, column: 5, status: "unvisited", nextSceneIds: [42] },
];

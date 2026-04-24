"use strict";
//==============================================================================
// xlsx → 데이터 클래스 (.js) 변환 (vanilla.js excel 도구 위임).
//
// 정책 (이 프로젝트 한정):
//  - 입력 디렉토리: <projectRoot>/xlsx
//  - 출력 디렉토리: <projectRoot>/src/table
//  - 클래스 이름: <Sheet>TableData (시트가 "...table" 로 끝나면 접미사 처리)
//  - import 경로: ../../libs/vanilla.js/src/base/object.js (상대)
//==============================================================================
const path = require("path");

const CLASS_OUTPUT_RELATIVE_DIR = path.join("src", "table");
const BASE_IMPORT_PATH = "../../libs/vanilla.js/src/base/object.js";


function generateAllClasses(projectRoot) {
	const excel = require(path.join(projectRoot, "libs", "vanilla.js", "tools", "excel.cjs"));
	excel.generateClassesFromDirectory(
		path.join(projectRoot, "xlsx"),
		path.join(projectRoot, CLASS_OUTPUT_RELATIVE_DIR),
		{
			skipFileBaseNames: ["tabletemplate"],
			skipSheetPrefixes: ["_", "$"],
			baseImportPath: BASE_IMPORT_PATH,
		}
	);
}


module.exports = { generateAllClasses };

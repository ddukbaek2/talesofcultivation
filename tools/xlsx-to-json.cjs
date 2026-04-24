"use strict";
//==============================================================================
// xlsx → json 변환 (vanilla.js excel 도구 위임).
//
// 정책 (이 프로젝트 한정):
//  - 입력 디렉토리: <projectRoot>/xlsx
//  - 출력 디렉토리: <projectRoot>/assets/data/table
//  - 시트명 = 출력 json 파일명. 최상위 배열.
//  - tabletemplate.xlsx 는 스타일 참조용이라 변환 대상 아님.
//  - 시트명이 _ 또는 $ 로 시작하면 메타 시트로 간주하여 건너뜀.
//==============================================================================
const path = require("path");

const TABLE_OUTPUT_RELATIVE_DIR = path.join("assets", "data", "table");


function convertAllTables(projectRoot) {
	const excel = require(path.join(projectRoot, "libs", "vanilla.js", "tools", "excel.cjs"));
	excel.convertDirectoryToJson(
		path.join(projectRoot, "xlsx"),
		path.join(projectRoot, TABLE_OUTPUT_RELATIVE_DIR),
		{
			skipFileBaseNames: ["tabletemplate"],
			skipSheetPrefixes: ["_", "$"],
		}
	);
}


module.exports = { convertAllTables };

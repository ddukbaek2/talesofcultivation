#!/usr/bin/env node
"use strict";
//==============================================================================
// json → xlsx 일회성 export (자동 스캔).
//
// assets/data/table/*.json 을 순회하며 각 파일을 xlsx 로 export.
// 출력 파일명: xlsx/<basename>.xlsx, 시트명: <basename> (즉 json 파일명 = 시트명).
// 이미 같은 이름의 xlsx 가 있으면 덮어쓰지 않음 (사용자가 편집한 스타일 보호).
//
// 사용법:
//   node tools/json-to-xlsx.cjs           : 없는 xlsx 만 생성
//   node tools/json-to-xlsx.cjs --force   : 무조건 덮어씀
//==============================================================================
const fileSystem = require("fs");
const path = require("path");
const xlsx = require("xlsx");

const projectRoot = path.resolve(__dirname, "..");
const JSON_INPUT_DIR = path.join(projectRoot, "assets", "data", "table");
const XLSX_OUTPUT_DIR = path.join(projectRoot, "xlsx");

const isForce = process.argv.includes("--force");


//==============================================================================
// 배열/객체 값은 JSON 문자열로 직렬화하여 셀에 담는다.
//==============================================================================
function flattenRow(rawRow) {
	const result = {};
	for (const key of Object.keys(rawRow)) {
		const value = rawRow[key];
		if (Array.isArray(value) || (typeof value === "object" && value !== null)) {
			result[key] = JSON.stringify(value);
		}
		else {
			result[key] = value;
		}
	}
	return result;
}


//==============================================================================
// 단일 json 파일 → 단일 xlsx 파일.
//==============================================================================
function exportOneJsonFile(jsonFullPath) {
	const baseName = path.basename(jsonFullPath, ".json");
	const xlsxFullPath = path.join(XLSX_OUTPUT_DIR, `${baseName}.xlsx`);

	if (!isForce && fileSystem.existsSync(xlsxFullPath)) {
		console.log(`[export] 건너뜀 (이미 존재): ${path.relative(projectRoot, xlsxFullPath)}`);
		return;
	}

	const data = JSON.parse(fileSystem.readFileSync(jsonFullPath, "utf8"));
	const rows = Array.isArray(data) ? data : [];
	const flatRows = rows.map(flattenRow);
	const sheet = xlsx.utils.json_to_sheet(flatRows);
	const workbook = xlsx.utils.book_new();
	xlsx.utils.book_append_sheet(workbook, sheet, baseName);

	fileSystem.mkdirSync(XLSX_OUTPUT_DIR, { recursive: true });
	xlsx.writeFile(workbook, xlsxFullPath);
	console.log(`[export] ${path.relative(projectRoot, jsonFullPath)} → ${path.relative(projectRoot, xlsxFullPath)} (시트=${baseName}, ${rows.length}행)`);
}


if (!fileSystem.existsSync(JSON_INPUT_DIR)) {
	console.error(`[export] json 입력 디렉토리가 없습니다: ${JSON_INPUT_DIR}`);
	process.exit(1);
}

const entries = fileSystem.readdirSync(JSON_INPUT_DIR);
for (const entry of entries) {
	if (!entry.endsWith(".json")) {
		continue;
	}
	const jsonFullPath = path.join(JSON_INPUT_DIR, entry);
	exportOneJsonFile(jsonFullPath);
}

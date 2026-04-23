"use strict";
//==============================================================================
// xlsx → json 변환기 (자동 스캔 방식).
//
// - xlsx/ 디렉토리의 모든 .xlsx 파일을 스캔.
// - 각 파일의 모든 시트를 순회하며 시트 하나가 곧 테이블 하나.
// - 시트 이름이 그대로 출력 json 파일명이 된다 (예: 시트 "cards" → cards.json).
// - 최상위는 객체 배열 (rootKey 감싸지 않음).
//
// 셀 값 정규화:
//  - "[" 또는 "{" 로 시작하는 문자열: JSON.parse 시도.
//  - "true" / "false": boolean.
//  - 빈 셀: 결과 객체에 포함하지 않음.
//
// 건너뛰는 대상:
//  - 임시 파일 (~$로 시작).
//  - 파일명이 "tabletemplate" 인 xlsx (스타일 참조용 템플릿).
//  - 시트 이름이 "_" / "$" 로 시작하는 메타 시트.
//==============================================================================
const fileSystem = require("fs");
const path = require("path");
const xlsx = require("xlsx");

const XLSX_DIR_NAME = "xlsx";
const JSON_OUTPUT_DIR = path.join("assets", "data", "table");
const TEMPLATE_BASE_NAME = "tabletemplate";


//==============================================================================
// 셀 값 정규화.
//==============================================================================
function normalizeCellValue(value) {
	if (typeof value !== "string") {
		return value;
	}
	const trimmed = value.trim();
	if (trimmed === "") {
		return "";
	}
	if (trimmed === "true") {
		return true;
	}
	if (trimmed === "false") {
		return false;
	}
	if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
		try {
			return JSON.parse(trimmed);
		}
		catch (error) {
			return value;
		}
	}
	return value;
}


//==============================================================================
// 한 행의 모든 키/값을 정규화. 빈 셀은 결과 객체에 포함시키지 않는다.
//==============================================================================
function normalizeRow(rawRow) {
	const result = {};
	for (const key of Object.keys(rawRow)) {
		const value = rawRow[key];
		if (value === undefined || value === null || value === "") {
			continue;
		}
		result[key] = normalizeCellValue(value);
	}
	return result;
}


//==============================================================================
// 단일 xlsx 파일의 모든 시트를 json 으로 변환.
//==============================================================================
function convertOneXlsxFile(projectRoot, xlsxFullPath) {
	const workbook = xlsx.readFile(xlsxFullPath);
	const xlsxBaseName = path.basename(xlsxFullPath);
	let sheetCount = 0;
	for (const sheetName of workbook.SheetNames) {
		if (sheetName.startsWith("_") || sheetName.startsWith("$")) {
			continue;
		}
		const sheet = workbook.Sheets[sheetName];
		const rawRows = xlsx.utils.sheet_to_json(sheet, { defval: "" });
		const normalizedRows = rawRows.map(normalizeRow);
		const jsonPath = path.join(projectRoot, JSON_OUTPUT_DIR, `${sheetName}.json`);
		fileSystem.mkdirSync(path.dirname(jsonPath), { recursive: true });
		fileSystem.writeFileSync(jsonPath, JSON.stringify(normalizedRows, null, "\t") + "\n", "utf8");
		console.log(`[tables] ${xlsxBaseName}::${sheetName} → ${path.relative(projectRoot, jsonPath)} (${normalizedRows.length}행)`);
		++sheetCount;
	}
	return sheetCount;
}


//==============================================================================
// xlsx 디렉토리 전체 순회.
//==============================================================================
function convertAllTables(projectRoot) {
	const xlsxDir = path.join(projectRoot, XLSX_DIR_NAME);
	if (!fileSystem.existsSync(xlsxDir)) {
		console.error(`[tables] xlsx 디렉토리가 없습니다: ${xlsxDir}`);
		return;
	}

	const entries = fileSystem.readdirSync(xlsxDir);
	let totalSheetCount = 0;
	let failCount = 0;
	for (const entry of entries) {
		if (!entry.endsWith(".xlsx")) {
			continue;
		}
		if (entry.startsWith("~$")) {
			continue;
		}
		const baseName = path.basename(entry, ".xlsx");
		if (baseName === TEMPLATE_BASE_NAME) {
			console.log(`[tables] 건너뜀 (템플릿): ${entry}`);
			continue;
		}
		const xlsxFullPath = path.join(xlsxDir, entry);
		try {
			const count = convertOneXlsxFile(projectRoot, xlsxFullPath);
			totalSheetCount += count;
		}
		catch (error) {
			console.error(`[tables] 실패: ${entry} - ${error.message}`);
			++failCount;
		}
	}
	console.log(`[tables] 완료. 변환된 시트=${totalSheetCount}, 실패 xlsx=${failCount}`);
}


module.exports = { convertAllTables, convertOneXlsxFile };

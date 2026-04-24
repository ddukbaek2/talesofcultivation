"use strict";
//==============================================================================
// xlsx → 데이터 클래스 (.js) 자동 생성기.
//
// xlsx/ 의 각 .xlsx 안 시트마다 src/table/<sheetName>data.js 파일을 생성한다.
// 클래스 이름은 시트 이름을 PascalCase 로 바꾸고 "Data" 접미사를 붙인다.
//   예) cardtable → CardTableData
//
// 컬럼 타입은 시트의 모든 행을 검사하여 추론.
//  - 모든 값이 number → number  (default 0)
//  - 모든 값이 boolean → boolean (default false)
//  - 모든 값이 array  → array   (default [])
//  - 모든 값이 object → object  (default {})
//  - 그 외 / 혼합     → string  (default "")
//
// 자동 생성 파일은 무조건 덮어씀. 수동 메서드를 추가하지 말 것.
// (필요한 메서드는 별도 파일이나 상위 클래스에서 정의)
//==============================================================================
const fileSystem = require("fs");
const path = require("path");
const xlsx = require("xlsx");

const XLSX_DIR_NAME = "xlsx";
const CLASS_OUTPUT_DIR = path.join("src", "table");
const TEMPLATE_BASE_NAME = "tabletemplate";


//==============================================================================
// 시트명 → 클래스명 (PascalCase + "Data").
// 예) "cardtable" → "CardTableData", "secttable" → "SectTableData"
//==============================================================================
function toClassName(sheetName) {
	const base = sheetName.endsWith("table") ? sheetName.slice(0, -5) : sheetName;
	const head = base.length > 0 ? base[0].toUpperCase() + base.slice(1) : "";
	return `${head}TableData`;
}


//==============================================================================
// 단일 값의 타입 분류.
//==============================================================================
function classifyValue(value) {
	if (value === undefined || value === null || value === "") {
		return null;
	}
	if (typeof value === "number") {
		return "number";
	}
	if (typeof value === "boolean") {
		return "boolean";
	}
	if (Array.isArray(value)) {
		return "array";
	}
	if (typeof value === "object") {
		return "object";
	}
	return "string";
}


//==============================================================================
// 셀 값 정규화 (xlsx-to-json 과 동일 규칙).
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
// 시트 → 컬럼 정의 추론.
// columnOrder: xlsx 의 컬럼 순서 그대로 (첫 행 기준).
//==============================================================================
function inferColumns(sheet) {
	const rawRows = xlsx.utils.sheet_to_json(sheet, { defval: "" });
	if (rawRows.length === 0) {
		return [];
	}
	const columnOrder = Object.keys(rawRows[0]);
	const columnInfos = columnOrder.map((name) => ({ name: name, types: new Set() }));
	for (const rawRow of rawRows) {
		for (const columnInfo of columnInfos) {
			const value = normalizeCellValue(rawRow[columnInfo.name]);
			const type = classifyValue(value);
			if (type !== null) {
				columnInfo.types.add(type);
			}
		}
	}
	return columnInfos.map((info) => {
		let resolvedType;
		if (info.types.size === 0) {
			resolvedType = "string";
		}
		else if (info.types.size === 1) {
			resolvedType = info.types.values().next().value;
		}
		else {
			resolvedType = "string";
		}
		return { name: info.name, type: resolvedType };
	});
}


//==============================================================================
// 컬럼 타입별 JSDoc 표기.
//==============================================================================
function jsdocType(type) {
	switch (type) {
		case "number": {
			return "number";
		}
		case "boolean": {
			return "boolean";
		}
		case "array": {
			return "Array";
		}
		case "object": {
			return "Object";
		}
		default: {
			return "string";
		}
	}
}


//==============================================================================
// 컬럼 타입별 constructor 본문 라인.
//==============================================================================
function constructorLine(column) {
	const key = column.name;
	switch (column.type) {
		case "number": {
			return `\t\tthis.${key} = typeof data.${key} === "number" ? data.${key} : 0;`;
		}
		case "boolean": {
			return `\t\tthis.${key} = data.${key} === true;`;
		}
		case "array": {
			return `\t\tthis.${key} = System.Array.isArray(data.${key}) ? data.${key} : [];`;
		}
		case "object": {
			return `\t\tthis.${key} = (typeof data.${key} === "object" && data.${key} !== null) ? data.${key} : {};`;
		}
		default: {
			return `\t\tthis.${key} = data.${key} || "";`;
		}
	}
}


//==============================================================================
// 한 시트로부터 클래스 소스 코드 문자열 생성.
//==============================================================================
function generateClassSource(sheetName, columns) {
	const className = toClassName(sheetName);
	const usesSystemArray = columns.some((c) => c.type === "array");
	const fieldDeclarations = columns.map((c) => `\t/** @type { ${jsdocType(c.type)} } */ ${c.name};`).join("\n");
	const constructorBody = columns.map(constructorLine).join("\n");
	const systemImport = usesSystemArray ? "const System = globalThis;\n" : "";
	const header = `//==============================================================================\n// 포함 모듈 목록.\n//==============================================================================\n${systemImport}import { Object } from "../../libs/vanilla.js/src/base/object.js";\n\n\n//==============================================================================\n// ${className} (${sheetName}.json 의 한 객체에 대응). xlsx-to-classes 가 자동 생성.\n// 수동 편집 금지 — xlsx 의 컬럼/타입을 바꾼 뒤 "data classes" 를 다시 실행할 것.\n//==============================================================================\n`;
	return `${header}export class ${className} extends Object {\n\t//==============================================================================\n\t// 멤버 변수 목록.\n\t//==============================================================================\n${fieldDeclarations}\n\n\t//==============================================================================\n\t// 생성. data = ${sheetName}.json 의 한 객체.\n\t//==============================================================================\n\t/**\n\t * @param { Object } data\n\t */\n\tconstructor(data) {\n\t\tsuper();\n${constructorBody}\n\t}\n}\n`;
}


//==============================================================================
// 단일 xlsx 파일 처리.
//==============================================================================
function generateClassesForXlsxFile(projectRoot, xlsxFullPath) {
	const workbook = xlsx.readFile(xlsxFullPath);
	const xlsxBaseName = path.basename(xlsxFullPath);
	let writtenCount = 0;
	for (const sheetName of workbook.SheetNames) {
		if (sheetName.startsWith("_") || sheetName.startsWith("$")) {
			continue;
		}
		const sheet = workbook.Sheets[sheetName];
		const columns = inferColumns(sheet);
		if (columns.length === 0) {
			continue;
		}
		const source = generateClassSource(sheetName, columns);
		const outputPath = path.join(projectRoot, CLASS_OUTPUT_DIR, `${sheetName}data.js`);
		fileSystem.mkdirSync(path.dirname(outputPath), { recursive: true });
		fileSystem.writeFileSync(outputPath, source, "utf8");
		console.log(`[classes] ${xlsxBaseName}::${sheetName} → ${path.relative(projectRoot, outputPath)} (컬럼 ${columns.length})`);
		++writtenCount;
	}
	return writtenCount;
}


//==============================================================================
// xlsx 디렉토리 전체 순회.
//==============================================================================
function generateAllClasses(projectRoot) {
	const xlsxDir = path.join(projectRoot, XLSX_DIR_NAME);
	if (!fileSystem.existsSync(xlsxDir)) {
		console.error(`[classes] xlsx 디렉토리가 없습니다: ${xlsxDir}`);
		return;
	}
	const entries = fileSystem.readdirSync(xlsxDir);
	let totalWritten = 0;
	let failCount = 0;
	for (const entry of entries) {
		if (!entry.endsWith(".xlsx") || entry.startsWith("~$")) {
			continue;
		}
		const baseName = path.basename(entry, ".xlsx");
		if (baseName === TEMPLATE_BASE_NAME) {
			console.log(`[classes] 건너뜀 (템플릿): ${entry}`);
			continue;
		}
		try {
			totalWritten += generateClassesForXlsxFile(projectRoot, path.join(xlsxDir, entry));
		}
		catch (error) {
			console.error(`[classes] 실패: ${entry} - ${error.message}`);
			++failCount;
		}
	}
	console.log(`[classes] 완료. 생성된 클래스=${totalWritten}, 실패 xlsx=${failCount}`);
}


module.exports = { generateAllClasses, generateClassesForXlsxFile };

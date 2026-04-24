#!/usr/bin/env node
"use strict";
//==============================================================================
// json → xlsx 일회성 export (vanilla.js excel 도구 위임).
//
// assets/data/table/*.json 을 순회해 xlsx/<basename>.xlsx 로 export.
// 이미 같은 xlsx 가 있으면 보호 (덮어쓰지 않음). --force 로 강제.
//
// 사용:
//   node tools/json-to-xlsx.cjs           : 없는 xlsx 만 생성
//   node tools/json-to-xlsx.cjs --force   : 무조건 덮어씀
//==============================================================================
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const excel = require(path.join(projectRoot, "libs", "vanilla.js", "tools", "excel.cjs"));
const isForce = process.argv.includes("--force");

excel.exportJsonDirectoryToXlsx(
	path.join(projectRoot, "assets", "data", "table"),
	path.join(projectRoot, "xlsx"),
	{ force: isForce }
);

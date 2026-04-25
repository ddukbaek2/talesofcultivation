#!/usr/bin/env node
//==============================================================================
// 통합 빌드 드라이버.
// tools/buildmanifest.json 을 읽고 모든 플랫폼/엔트리의 빌드 로직을 하나의 진입점으로 실행.
//
// 사용법:
//   node tools/build.cjs <platform> <entry> [target] [extra]
//   node tools/build.cjs list
//
// 지원 엔트리:
//   web bundle <target>                     : 특정 타깃 웹 번들 생성.
//   web bundle-all                          : 모든 타깃 일괄 번들링.
//   web deploy <target>                     : 특정 타깃 번들을 NAS 로 복사.
//   web deploy-all                          : build/web/ 전체를 NAS 로 복사.
//   web check                               : 자산 현황 리포트 (vanilla check 위임).
//   utility check-syntax                    : src / libs/vanilla.js/src 전체 구문 검사.
//   utility convert-quotes                  : 안전 범위 내에서 홑따옴표 → 쌍따옴표 변환.
//
//==============================================================================
"use strict";
const fileSystem = require("fs");
const path = require("path");
const childProcess = require("child_process");

const projectRoot = path.resolve(__dirname, "..");
const manifestFilePath = path.resolve(__dirname, "buildmanifest.json");
const vanillaProjectModule = require(path.join(projectRoot, "libs", "vanilla.js", "tools", "project.cjs"));


//==============================================================================
// 매니페스트 로더.
//==============================================================================
function loadManifest() {
	if (!fileSystem.existsSync(manifestFilePath)) {
		throw new Error(`[manifest] buildmanifest.json 을 찾을 수 없습니다: ${manifestFilePath}`);
	}
	const manifestText = fileSystem.readFileSync(manifestFilePath, "utf8");
	return JSON.parse(manifestText);
}

function getTargetDefinition(targetName) {
	const manifest = loadManifest();
	const targetDefinition = manifest.targets.find((entry) => entry.name === targetName);
	if (!targetDefinition) {
		throw new Error(`[manifest] 타깃 정의를 찾을 수 없습니다: ${targetName}`);
	}
	return targetDefinition;
}

function getWebDeployRoot() {
	const manifest = loadManifest();
	const webPlatform = manifest.platforms && manifest.platforms.web;
	if (!webPlatform || !webPlatform.deployRoot) {
		throw new Error("[manifest] platforms.web.deployRoot 정의가 없습니다.");
	}
	return webPlatform.deployRoot;
}


//==============================================================================
// 공용 파일 유틸.
//==============================================================================
function copyDirectoryRecursive(sourcePath, destinationPath, skipTopLevelNames) {
	fileSystem.mkdirSync(destinationPath, { recursive: true });
	const entries = fileSystem.readdirSync(sourcePath, { withFileTypes: true });
	for (const entry of entries) {
		if (skipTopLevelNames && skipTopLevelNames.has(entry.name)) {
			continue;
		}
		const childSourcePath = path.join(sourcePath, entry.name);
		const childDestinationPath = path.join(destinationPath, entry.name);
		if (entry.isDirectory()) {
			copyDirectoryRecursive(childSourcePath, childDestinationPath, null);
		}
		else {
			fileSystem.copyFileSync(childSourcePath, childDestinationPath);
		}
	}
}

function removeDirectory(targetPath) {
	if (fileSystem.existsSync(targetPath)) {
		fileSystem.rmSync(targetPath, { recursive: true, force: true, maxRetries: 10, retryDelay: 500 });
	}
}


//==============================================================================
// WEB 플랫폼.
//==============================================================================
async function webBundle(target) {
	if (!target) {
		console.error("[web:bundle] 타깃 이름이 필요합니다.");
		process.exit(1);
	}
	const targetDefinition = getTargetDefinition(target);
	const entryRelativePath = targetDefinition.entry;
	if (!entryRelativePath) {
		console.error(`[web:bundle] 타깃 정의에 entry 필드가 없습니다: ${target}`);
		process.exit(1);
	}

	const outputDirectory = path.join(projectRoot, "build", "web");
	console.log(`[web:bundle] 시작: ${target} -> ${outputDirectory}`);

	// vanilla.js project.cjs 의 build 에 위임.
	// (buildtemplate 복사 + assets 전체 복사 + esbuild 번들 → ./js/bundle.min.js)
	await vanillaProjectModule.build(entryRelativePath, projectRoot, outputDirectory);

	console.log(`[web:bundle] 완료: ${outputDirectory}`);
}

async function webBundleAll() {
	const manifest = loadManifest();
	let failCount = 0;
	for (const targetEntry of manifest.targets) {
		console.log(`\n========== ${targetEntry.name} ==========`);
		try {
			await webBundle(targetEntry.name);
		}
		catch (error) {
			console.error(`[web:bundle-all] 실패: ${targetEntry.name}`, error.message);
			++failCount;
		}
	}
	console.log(`\n[web:bundle-all] 성공=${manifest.targets.length - failCount}, 실패=${failCount}`);
	if (failCount > 0) {
		process.exit(1);
	}
}

function webDeploy() {
	const buildDirectory = path.join(projectRoot, "build", "web");
	let deployRoot;
	try {
		deployRoot = getWebDeployRoot();
	}
	catch (error) {
		console.warn(`[web:deploy] 디플로이만 실패: ${error.message}`);
		return;
	}

	if (!fileSystem.existsSync(buildDirectory)) {
		console.warn(`[web:deploy] 디플로이만 실패: build 디렉토리가 없습니다 (${buildDirectory}). 빌드는 정상.`);
		return;
	}
	if (!fileSystem.existsSync(deployRoot)) {
		console.warn(`[web:deploy] 디플로이만 실패: 배포 대상 디렉토리에 접근할 수 없습니다 (${deployRoot}). NAS 연결 상태를 확인하세요. 빌드는 정상.`);
		return;
	}

	console.log(`[web:deploy] ${buildDirectory} -> ${deployRoot}`);

	try {
		// deployRoot 자체는 보존하고 그 안의 항목만 모두 제거 (NAS 마운트 폴더 보호).
		const existingEntries = fileSystem.readdirSync(deployRoot, { withFileTypes: true });
		for (const existingEntry of existingEntries) {
			const existingEntryPath = path.join(deployRoot, existingEntry.name);
			if (existingEntry.isDirectory()) {
				removeDirectory(existingEntryPath);
			}
			else {
				fileSystem.rmSync(existingEntryPath, { force: true });
			}
		}

		// build/web 의 모든 항목을 deployRoot 로 복사.
		copyDirectoryRecursive(buildDirectory, deployRoot, null);
		console.log(`[web:deploy] 완료.`);
	}
	catch (error) {
		console.warn(`[web:deploy] 디플로이만 실패: ${error.message}. 빌드는 정상.`);
	}
}

function webCheck() {
	vanillaProjectModule.check(projectRoot).catch((error) => {
		console.error("[web:check] 오류:", error);
		process.exit(1);
	});
}


//==============================================================================
// 유틸리티 엔트리.
//==============================================================================
function walkJavaScriptFiles(rootDirectory, visitFile, skipFileNames) {
	if (!fileSystem.existsSync(rootDirectory)) {
		return;
	}
	const entries = fileSystem.readdirSync(rootDirectory, { withFileTypes: true });
	for (const entry of entries) {
		const entryPath = path.join(rootDirectory, entry.name);
		if (entry.isDirectory()) {
			walkJavaScriptFiles(entryPath, visitFile, skipFileNames);
			continue;
		}
		if (!entry.name.endsWith(".js")) {
			continue;
		}
		if (skipFileNames && skipFileNames.has(entry.name)) {
			continue;
		}
		visitFile(entryPath);
	}
}

function utilityCheckSyntax() {
	const sourceDirectories = [
		path.join(projectRoot, "libs", "vanilla.js", "src"),
		path.join(projectRoot, "src"),
	];
	const errorList = [];
	for (const sourceDirectory of sourceDirectories) {
		walkJavaScriptFiles(sourceDirectory, (filePath) => {
			const sourceText = fileSystem.readFileSync(filePath, "utf8");
			try {
				childProcess.execSync("node --input-type=module --check", {
					input: sourceText,
					stdio: ["pipe", "pipe", "pipe"],
				});
			}
			catch (error) {
				const stderrText = error.stderr ? error.stderr.toString() : String(error);
				errorList.push({ filePath, message: stderrText });
			}
		}, null);
	}
	if (errorList.length === 0) {
		console.log("[check-syntax] OK: no syntax error.");
		return;
	}
	for (const errorEntry of errorList) {
		console.log("== " + errorEntry.filePath);
		console.log(errorEntry.message);
	}
	process.exit(1);
}

function utilityConvertQuotes() {
	const sourceDirectories = [
		path.join(projectRoot, "libs", "vanilla.js", "src"),
		path.join(projectRoot, "src"),
	];
	const safeStringPattern = /'([^'"\\\n]*)'/g;
	const updatedFiles = [];
	const residualFiles = [];
	for (const sourceDirectory of sourceDirectories) {
		walkJavaScriptFiles(sourceDirectory, (filePath) => {
			const originalContent = fileSystem.readFileSync(filePath, "utf8");
			const transformedContent = originalContent.replace(safeStringPattern, "\"$1\"");
			if (originalContent !== transformedContent) {
				fileSystem.writeFileSync(filePath, transformedContent, "utf8");
				updatedFiles.push(filePath);
			}
			if (transformedContent.indexOf("'") >= 0) {
				residualFiles.push(filePath);
			}
		}, null);
	}
	console.log("== updated ==");
	for (const filePath of updatedFiles) {
		console.log(filePath);
	}
	console.log("\n== residual single-quote files ==");
	for (const filePath of residualFiles) {
		console.log(filePath);
	}
}


//==============================================================================
// CLI.
//==============================================================================
function printUsage() {
	console.log("사용법:");
	console.log("  node tools/build.cjs <platform> <entry> [target] [extra]");
	console.log("  node tools/build.cjs list");
	console.log("");
	console.log("예시:");
	console.log("  node tools/build.cjs web bundle talesofcultivation");
	console.log("  node tools/build.cjs web bundle-all");
	console.log("  node tools/build.cjs web deploy");
	console.log("  node tools/build.cjs web check");
	console.log("  node tools/build.cjs data tables   (xlsx → json 변환)");
	console.log("  node tools/build.cjs data classes  (xlsx → src/table 데이터 클래스 생성)");
	console.log("  node tools/build.cjs data all      (json + classes 동시 생성)");
	console.log("  node tools/build.cjs utility check-syntax");
}

const BUILD_ENTRY_LIST = [
	{ platform: "web", entry: "bundle", requiresTarget: true },
	{ platform: "web", entry: "bundle-all", requiresTarget: false },
	{ platform: "web", entry: "deploy", requiresTarget: false },
	{ platform: "web", entry: "check", requiresTarget: false },
	{ platform: "data", entry: "tables", requiresTarget: false },
	{ platform: "data", entry: "classes", requiresTarget: false },
	{ platform: "data", entry: "all", requiresTarget: false },
	{ platform: "utility", entry: "check-syntax", requiresTarget: false },
	{ platform: "utility", entry: "convert-quotes", requiresTarget: false },
];

function printEntries() {
	const manifest = loadManifest();
	console.log("타깃:");
	for (const targetEntry of manifest.targets) {
		console.log(`  - ${targetEntry.name} (${targetEntry.displayName})`);
	}
	console.log("");
	console.log("플랫폼 / 엔트리:");
	for (const buildEntry of BUILD_ENTRY_LIST) {
		const flagText = buildEntry.requiresTarget ? "" : " [target-independent]";
		console.log(`  ${buildEntry.platform} ${buildEntry.entry}${flagText}`);
	}
}

async function dispatch(platform, entry, rest) {
	const key = `${platform}:${entry}`;
	switch (key) {
		case "web:bundle": {
			await webBundle(rest[0]);
			break;
		}
		case "web:bundle-all": {
			await webBundleAll();
			break;
		}
		case "web:deploy": {
			webDeploy();
			break;
		}
		case "web:check": {
			webCheck();
			break;
		}
		case "data:tables": {
			const xlsxToJsonModule = require(path.join(projectRoot, "tools", "xlsx-to-json.cjs"));
			xlsxToJsonModule.convertAllTables(projectRoot);
			break;
		}
		case "data:classes": {
			const xlsxToClassesModule = require(path.join(projectRoot, "tools", "xlsx-to-classes.cjs"));
			xlsxToClassesModule.generateAllClasses(projectRoot);
			break;
		}
		case "data:all": {
			const xlsxToJsonModule = require(path.join(projectRoot, "tools", "xlsx-to-json.cjs"));
			const xlsxToClassesModule = require(path.join(projectRoot, "tools", "xlsx-to-classes.cjs"));
			xlsxToJsonModule.convertAllTables(projectRoot);
			xlsxToClassesModule.generateAllClasses(projectRoot);
			break;
		}
		case "utility:check-syntax": {
			utilityCheckSyntax();
			break;
		}
		case "utility:convert-quotes": {
			utilityConvertQuotes();
			break;
		}
		default: {
			console.error(`[build] 지원하지 않는 엔트리: ${key}`);
			printUsage();
			process.exit(1);
		}
	}
}

async function main() {
	const args = process.argv.slice(2);
	if (args.length === 0) {
		printUsage();
		process.exit(1);
	}
	if (args[0] === "list") {
		printEntries();
		return;
	}
	if (args.length < 2) {
		printUsage();
		process.exit(1);
	}
	const [platform, entry, ...rest] = args;
	await dispatch(platform, entry, rest);
}


main().catch((error) => {
	console.error(error);
	process.exit(1);
});

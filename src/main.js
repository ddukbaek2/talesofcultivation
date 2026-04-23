//==============================================================================
// 포함 모듈 목록.
//==============================================================================
const System = globalThis;
import { Vector2 } from "../libs/vanilla.js/src/base/vector2.js";
import { Color } from "../libs/vanilla.js/src/base/color.js";
import { Rect } from "../libs/vanilla.js/src/base/rect.js";
import { EngineConfiguration, Engine } from "../libs/vanilla.js/src/core/engine.js";
import { Scene } from "../libs/vanilla.js/src/core/scene.js";
import { Graphic } from "../libs/vanilla.js/src/core/graphic.js";
import { ImageAsset } from "../libs/vanilla.js/src/resource/imageasset.js";
import { AudioAsset } from "../libs/vanilla.js/src/resource/audioasset.js";
import { FontAsset } from "../libs/vanilla.js/src/resource/fontasset.js";
import { DEVTools } from "../libs/vanilla.js/src/misc/devtools.js";
import { ViewScaleMode } from "../libs/vanilla.js/src/core/viewmanager.js";
import { Colors } from "../libs/vanilla.js/src/base/colors.js";


//==============================================================================
// 수선전.
//==============================================================================
export class TalesOfCultivation extends Scene {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @private @type { DEVTools } */ #devtools;
	/** @private @type { Map<number, ImageAsset> } */ #loadedImageAssets;
	/** @private @type { Map<number, AudioAsset> } */ #loadedAudioAssets;
	/** @private @type { Map<number, FontAsset> } */ #loadedFontAssets;
	/** @private @type { Array<{ id: number, path: string }> } */ #pendingImageLoads;
	/** @private @type { Array<{ id: number, path: string }> } */ #pendingAudioLoads;
	/** @private @type { Array<{ id: number, name: string, path: string }> } */ #pendingFontLoads;
	/** @private @type { number } */ #loadedAssetCount;
	/** @private @type { number } */ #totalAssetCount;
	/** @private @type { string } */ #loadingAssetPath;

	//==============================================================================
	// 생성.
	//==============================================================================
	constructor() {
		super();
	}

	//==============================================================================
	// 생성.
	//==============================================================================
	/**
	 * @override
	 */
	create() {
		super.create();
		this.#devtools = null;
		this.#loadedImageAssets = new System.Map();
		this.#loadedAudioAssets = new System.Map();
		this.#loadedFontAssets = new System.Map();
		this.#pendingImageLoads = [];
		this.#pendingAudioLoads = [];
		this.#pendingFontLoads = [];
		// 로딩 화면.
		this.#loadedAssetCount = 0;
		this.#totalAssetCount = 0;
		this.#loadingAssetPath = "";
	}

	//==============================================================================
	// 비동기 로딩.
	//==============================================================================
	/**
	 * @override
	 * @param { Engine } engine
	 */
	async load(engine) {
		await super.load(engine);

		const viewManager = engine.getViewManager();
		viewManager.setViewScaleMode(ViewScaleMode.stretchHeightExpandWidth);

		// 개발자 도구 초기화.
		this.#devtools = new DEVTools();
		this.#devtools.setEngine(engine);

		// 예약된 모든 리소스 로드.
		await this.loadAllAssets();
	}

	//==============================================================================
	// 초기화.
	//==============================================================================
	/**
	 * @override
	 * @param { Engine } engine
	 */
	initialize(engine) {
		super.initialize(engine);

		// 하이어라키 루트 노드 등록.
		const root = this.getRoot();
		this.#devtools.setRootNodes([root]);
	}

	//==============================================================================
	// 갱신.
	//==============================================================================
	/**
	 * @override
	 * @param { number } timeDelta
	 */
	tick(timeDelta) {
		super.tick(timeDelta);

		// timeScale 영향 없는 경과 시간.
		const engine = this.getEngine();
		const timeManager = engine.getTimeManager();
		const unscaledTimeDelta = timeManager.getUnscaleDeltaTime();

		// 개발자 도구 갱신 (항상 최우선).
		this.#devtools.tick(unscaledTimeDelta);
	}

	//==============================================================================
	// 이전 출력.
	//==============================================================================
	/**
	 * @override
	 * @param { Graphic } graphic
	 */
	preDraw(graphic) {
		super.preDraw(graphic);

		const canvasRenderingContext = graphic.getCanvasRenderingContext();
		const viewManager = engine.getViewManager();
		const canvasNativeSize = viewManager.getCanvasNativeSize();

		// 전체 화면 칠하기.
		viewManager.applyCanvasNativeRect(canvasRenderingContext);
		graphic.setFillColor(Colors.darkVanilla);
		graphic.drawRect(Rect.create(0, 0, canvasNativeSize.x, canvasNativeSize.y));

		// 게임 영역 칠하기.
		viewManager.applyViewRect(canvasRenderingContext);
		graphic.setFillColor(Colors.lightVanilla);
		graphic.drawRect(Rect.create(0, 0, viewSize.x, viewSize.y));
	}

	//==============================================================================
	// 출력.
	//==============================================================================
	/**
	 * @override
	 * @param { Graphic } graphic
	 */
	draw(graphic) {
		super.draw(graphic);

	}

	//==============================================================================
	// 이후 출력.
	//==============================================================================
	/**
	 * @override
	 * @param { Graphic } graphic
	 */
	postDraw(graphic) {
		super.postDraw(graphic);

		// 개발자 도구 패널 출력 (항상 최상단).
		this.#devtools.draw(graphic);

		// FPS 표시 (좌측 상단).
		this.drawFramePerSecond(graphic);
	}

	//==============================================================================
	// 로딩 중 출력. (엔진이 isLoaded() === false 인 동안 이 메서드만 호출함)
	//==============================================================================
	/**
	 * @override
	 * @param { Graphic } graphic
	 */
	drawOnLoad(graphic) {
		super.drawOnLoad(graphic);

		const engine = this.getEngine();
		const canvasRenderingContext = graphic.getCanvasRenderingContext();
		const viewManager = engine.getViewManager();
		const canvasNativeSize = viewManager.getCanvasNativeSize();
		const viewSize = viewManager.getViewSize();

		// 전체 화면 칠하기.
		viewManager.applyCanvasNativeRect(canvasRenderingContext);
		graphic.setFillColor(Color.black());
		graphic.drawRect(Rect.create(0, 0, canvasNativeSize.x, canvasNativeSize.y));

		// 게임 영역 칠하기.
		viewManager.applyViewRect(canvasRenderingContext);
		graphic.setFillColor(Color.black());
		graphic.drawRect(Rect.create(0, 0, viewSize.x, viewSize.y));

		this.drawLoadingScreen(graphic);
	}

	//==============================================================================
	// 로딩 화면 출력.
	//==============================================================================
	/**
	 * @param { Graphic } graphic
	 */
	drawLoadingScreen(graphic) {
		const canvasRenderingContext = graphic.getCanvasRenderingContext();
		const engine = this.getEngine();
		const viewManager = engine.getViewManager();
		const viewSize = viewManager.getViewSize();

		// 검은 배경.
		canvasRenderingContext.fillStyle = "#000000";
		canvasRenderingContext.fillRect(0, 0, viewSize.x, viewSize.y);

		const progress = this.#totalAssetCount > 0 ? this.#loadedAssetCount / this.#totalAssetCount : 0;

		const barWidth = 500;
		const barHeight = 20;
		const barX = (viewSize.x - barWidth) / 2;
		const barY = viewSize.y / 2 + 40;

		// 초기 0/N 과도기에는 로딩바/텍스트를 모두 숨김.
		if (this.#loadedAssetCount > 0) {
			// 로딩바 배경.
			canvasRenderingContext.fillStyle = "#333333";
			canvasRenderingContext.fillRect(barX, barY, barWidth, barHeight);

			// 로딩바 채우기.
			canvasRenderingContext.fillStyle = "#ffffff";
			const filledWidth = barWidth * progress;
			canvasRenderingContext.fillRect(barX, barY, filledWidth, barHeight);

			// 진행률 텍스트.
			canvasRenderingContext.fillStyle = "#aaaaaa";
			canvasRenderingContext.font = "16px sans-serif";
			canvasRenderingContext.textAlign = "center";
			canvasRenderingContext.textBaseline = "middle";
			const progressText = `${this.#loadedAssetCount} / ${this.#totalAssetCount}`;
			canvasRenderingContext.fillText(progressText, viewSize.x / 2, barY - 20);

			// 현재 로딩 중인 리소스 경로.
			canvasRenderingContext.fillStyle = "#666666";
			canvasRenderingContext.font = "12px sans-serif";
			canvasRenderingContext.fillText(this.#loadingAssetPath, viewSize.x / 2, barY + barHeight + 20);
		}
	}

	//==============================================================================
	// FPS 표시 (좌측 상단 오버레이). 30미만 빨강, 30~50 노랑, 50이상 초록.
	//==============================================================================
	/**
	 * @param { Graphic } graphic
	 */
	drawFramePerSecond(graphic) {
		if (!this.#devtools || !this.#devtools.isFramePerSecondVisible()) {
			return;
		}
		const engine = this.getEngine();
		if (!engine) {
			return;
		}
		const timeManager = engine.getTimeManager();
		if (!timeManager) {
			return;
		}
		const canvasRenderingContext = graphic.getCanvasRenderingContext();
		if (!canvasRenderingContext) {
			return;
		}

		const framePerSecond = timeManager.getFramePerSecond();
		const displayText = `FPS ${framePerSecond}`;

		const boxPaddingX = 10;
		const boxPaddingY = 4;
		const boxMarginX = 12;
		const boxMarginY = 12;
		const boxCornerRadius = 6;
		const fontSize = 18;

		canvasRenderingContext.save();
		canvasRenderingContext.font = `bold ${fontSize}px monospace`;
		canvasRenderingContext.textAlign = "left";
		canvasRenderingContext.textBaseline = "top";
		const textMetrics = canvasRenderingContext.measureText(displayText);
		const boxWidth = textMetrics.width + boxPaddingX * 2;
		const boxHeight = fontSize + boxPaddingY * 2;
		const boxX = boxMarginX;
		const boxY = boxMarginY;

		// 배경 라운드 박스.
		canvasRenderingContext.fillStyle = "rgba(0, 0, 0, 0.6)";
		canvasRenderingContext.beginPath();
		canvasRenderingContext.moveTo(boxX + boxCornerRadius, boxY);
		canvasRenderingContext.lineTo(boxX + boxWidth - boxCornerRadius, boxY);
		canvasRenderingContext.quadraticCurveTo(boxX + boxWidth, boxY, boxX + boxWidth, boxY + boxCornerRadius);
		canvasRenderingContext.lineTo(boxX + boxWidth, boxY + boxHeight - boxCornerRadius);
		canvasRenderingContext.quadraticCurveTo(boxX + boxWidth, boxY + boxHeight, boxX + boxWidth - boxCornerRadius, boxY + boxHeight);
		canvasRenderingContext.lineTo(boxX + boxCornerRadius, boxY + boxHeight);
		canvasRenderingContext.quadraticCurveTo(boxX, boxY + boxHeight, boxX, boxY + boxHeight - boxCornerRadius);
		canvasRenderingContext.lineTo(boxX, boxY + boxCornerRadius);
		canvasRenderingContext.quadraticCurveTo(boxX, boxY, boxX + boxCornerRadius, boxY);
		canvasRenderingContext.closePath();
		canvasRenderingContext.fill();

		// 성능별 텍스트 색상 (60 이상 초록, 30~59 노랑, 30 미만 빨강).
		let textColor = "#7fff7f";
		if (framePerSecond < 30) {
			textColor = "#ff6060";
		}
		else if (framePerSecond < 50) {
			textColor = "#ffcc55";
		}
		canvasRenderingContext.fillStyle = textColor;
		canvasRenderingContext.fillText(displayText, boxX + boxPaddingX, boxY + boxPaddingY);

		canvasRenderingContext.restore();
	}

	//==============================================================================
	// 이미지 불러오기 예약.
	//==============================================================================
	/**
	 * @param { number } imageId
	 * @param { string } assetPath
	 */
	loadImageAsset(imageId, assetPath) {
		if (typeof imageId === "string") {
			imageId = Number.parseInt(imageId);
		}
		this.#pendingImageLoads.push({ id: imageId, path: assetPath });
		++this.#totalAssetCount;
	}

	//==============================================================================
	// 불러온 이미지 반환.
	//==============================================================================
	/**
	 * @param { number } imageId
	 * @returns { ImageAsset }
	 */
	getLoadedImageAsset(imageId) {
		// 루프를 돌면 문자열로 넘어올 수 있으므로 문자열일 경우 정수로 변환.
		if (typeof imageId === "string") {
			imageId = Number.parseInt(imageId);
		}
		const loadedImageAsset = this.#loadedImageAssets.get(imageId);
		return loadedImageAsset;
	}

	//==============================================================================
	// 오디오 불러오기 예약.
	//==============================================================================
	/**
	 * @param { number } audioId
	 * @param { string } assetPath
	 */
	loadAudioAsset(audioId, assetPath) {
		if (typeof audioId === "string") {
			audioId = Number.parseInt(audioId);
		}
		this.#pendingAudioLoads.push({ id: audioId, path: assetPath });
		++this.#totalAssetCount;
	}

	//==============================================================================
	// 불러온 오디오 반환.
	//==============================================================================
	/**
	 * @param { number } audioId
	 * @returns { AudioAsset }
	 */
	getLoadedAudioAsset(audioId) {
		// 루프를 돌면 문자열로 넘어올 수 있으므로 문자열일 경우 정수로 변환.
		if (typeof audioId === "string") {
			audioId = Number.parseInt(audioId);
		}
		const loadedAudioAsset = this.#loadedAudioAssets.get(audioId);
		return loadedAudioAsset;
	}

	//==============================================================================
	// 폰트 불러오기 예약.
	//==============================================================================
	/**
	 * @param { number } fontId
	 * @param { string } fontName
	 * @param { string } assetPath
	 */
	loadFontAsset(fontId, fontName, assetPath) {
		if (typeof fontId === "string") {
			fontId = Number.parseInt(fontId);
		}
		this.#pendingFontLoads.push({ id: fontId, name: fontName, path: assetPath });
		++this.#totalAssetCount;
	}

	//==============================================================================
	// 불러온 폰트 반환.
	//==============================================================================
	/**
	 * @param { number } fontId
	 * @returns { FontAsset }
	 */
	getLoadedFontAsset(fontId) {
		// 루프를 돌면 문자열로 넘어올 수 있으므로 문자열일 경우 정수로 변환.
		if (typeof fontId === "string") {
			fontId = Number.parseInt(fontId);
		}
		const loadedFontAsset = this.#loadedFontAssets.get(fontId);
		return loadedFontAsset;
	}

	//==============================================================================
	// 예약된 모든 리소스를 순차적으로 로드.
	//==============================================================================
	async loadAllAssets() {
		for (const pendingImage of this.#pendingImageLoads) {
			this.#loadingAssetPath = pendingImage.path;
			const imageAsset = new ImageAsset();
			await imageAsset.load(pendingImage.path);
			this.#loadedImageAssets.set(pendingImage.id, imageAsset);
			++this.#loadedAssetCount;
		}
		for (const pendingAudio of this.#pendingAudioLoads) {
			this.#loadingAssetPath = pendingAudio.path;
			const audioAsset = new AudioAsset();
			await audioAsset.load(pendingAudio.path);
			this.#loadedAudioAssets.set(pendingAudio.id, audioAsset);
			++this.#loadedAssetCount;
		}
		for (const pendingFont of this.#pendingFontLoads) {
			this.#loadingAssetPath = pendingFont.path;
			const fontAsset = new FontAsset();
			await fontAsset.loadFont(pendingFont.name, pendingFont.path);
			this.#loadedFontAssets.set(pendingFont.id, fontAsset);
			++this.#loadedAssetCount;
		}
		this.#pendingImageLoads = [];
		this.#pendingAudioLoads = [];
		this.#pendingFontLoads = [];
	}

	//==============================================================================
	// 하이어라키가 입력을 소비 중인지 반환.
	//==============================================================================
	/**
	 * @returns { boolean }
	 */
	isHierarchyCapturingInput() {
		return this.#devtools.isVisible() && this.#devtools.isPointerInsidePanel();
	}
}



// 엔진 설정.
const engineConfiguration = new EngineConfiguration();
engineConfiguration.canvasId = "mainCanvas";
engineConfiguration.useStatistics = false;
engineConfiguration.referenceResolutionSize = Vector2.create(1280, 800);
engineConfiguration.autoResizeOnWindowResize = true;
engineConfiguration.title = "Tales Of Cultivation";
const talesOfCultivation = new TalesOfCultivation();
const engine = new Engine(engineConfiguration);
engine.run(talesOfCultivation);

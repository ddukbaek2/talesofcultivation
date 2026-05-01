//==============================================================================
// 포함 모듈 목록.
//==============================================================================
const System = globalThis;
import { WorldNode } from "../../libs/vanilla.js/src/core/node/worldnode.js";
import { Object } from "../../libs/vanilla.js/src/base/object.js";


//==============================================================================
// 단일 산봉우리 정의.
// - xRatio: rect 폭 기준 0.0(왼쪽) ~ 1.0(오른쪽) 위치.
// - heightRatio: baseY 로부터 위로 솟는 높이의 rect.height 비율.
//==============================================================================
class MountainPeak extends Object {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @type { number } */ xRatio;
	/** @type { number } */ heightRatio;

	//==============================================================================
	// 생성.
	//==============================================================================
	/**
	 * @param { number } xRatio
	 * @param { number } heightRatio
	 */
	constructor(xRatio, heightRatio) {
		super();
		this.xRatio = xRatio;
		this.heightRatio = heightRatio;
	}
}


//==============================================================================
// 산 풍경 노드.
// - 주어진 사각형 영역(rect) 안에 밤하늘 그라데이션 + 달 + 3겹 산 실루엣을 그린다.
// - 비주얼노벨 / 타이틀 / 그 외 다양한 화면에서 배경으로 재사용 가능.
// - 사용 예:
//   const mountainSceneryNode = new MountainSceneryNode();
//   mountainSceneryNode.setRect({ x: 0, y: 0, width: viewWidth, height: viewHeight });
//   mountainSceneryNode.draw(graphic);
//==============================================================================
export class MountainSceneryNode extends WorldNode {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @private @type { { x: number, y: number, width: number, height: number } | null } */ #rect;
	/** @private @type { string } */ #skyTopColor;
	/** @private @type { string } */ #skyMiddleColor;
	/** @private @type { string } */ #skyBottomColor;
	/** @private @type { boolean } */ #isMoonVisible;
	/** @private @type { number } */ #moonXRatio;
	/** @private @type { number } */ #moonYRatio;
	/** @private @type { number } */ #moonRadius;
	/** @private @type { string } */ #moonColor;
	/** @private @type { string } */ #moonHaloInnerColor;
	/** @private @type { string } */ #moonHaloOuterColor;
	/** @private @type { string } */ #farMountainColor;
	/** @private @type { string } */ #midMountainColor;
	/** @private @type { string } */ #nearMountainColor;
	/** @private @type { number } */ #farMountainBaseRatio;
	/** @private @type { number } */ #midMountainBaseRatio;
	/** @private @type { number } */ #nearMountainBaseRatio;
	/** @private @type { MountainPeak[] } */ #farMountainPeaks;
	/** @private @type { MountainPeak[] } */ #midMountainPeaks;
	/** @private @type { MountainPeak[] } */ #nearMountainPeaks;

	//==============================================================================
	// 생성.
	//==============================================================================
	constructor() {
		super();
		this.#rect = null;
		this.#skyTopColor = "#08080f";
		this.#skyMiddleColor = "#1a1f33";
		this.#skyBottomColor = "#2a2f48";
		this.#isMoonVisible = true;
		this.#moonXRatio = 0.18;
		this.#moonYRatio = 0.22;
		this.#moonRadius = 26;
		this.#moonColor = "#f0e8c8";
		this.#moonHaloInnerColor = "rgba(240, 232, 200, 0.28)";
		this.#moonHaloOuterColor = "rgba(240, 232, 200, 0.0)";
		this.#farMountainColor = "#3a4058";
		this.#midMountainColor = "#1f2438";
		this.#nearMountainColor = "#0a0d18";
		this.#farMountainBaseRatio = 0.50;
		this.#midMountainBaseRatio = 0.62;
		this.#nearMountainBaseRatio = 0.78;
		this.#farMountainPeaks = [
			new MountainPeak(0.08, 0.25),
			new MountainPeak(0.22, 0.15),
			new MountainPeak(0.40, 0.35),
			new MountainPeak(0.55, 0.20),
			new MountainPeak(0.70, 0.30),
			new MountainPeak(0.86, 0.18),
			new MountainPeak(0.96, 0.25),
		];
		this.#midMountainPeaks = [
			new MountainPeak(0.05, 0.28),
			new MountainPeak(0.18, 0.40),
			new MountainPeak(0.32, 0.22),
			new MountainPeak(0.46, 0.42),
			new MountainPeak(0.60, 0.28),
			new MountainPeak(0.74, 0.36),
			new MountainPeak(0.88, 0.24),
		];
		this.#nearMountainPeaks = [
			new MountainPeak(0.06, 0.36),
			new MountainPeak(0.20, 0.48),
			new MountainPeak(0.38, 0.30),
			new MountainPeak(0.52, 0.50),
			new MountainPeak(0.68, 0.34),
			new MountainPeak(0.84, 0.42),
			new MountainPeak(0.95, 0.28),
		];
	}

	//==============================================================================
	// 그리기 영역 설정. rect 가 null 이면 draw 시 아무것도 그리지 않는다.
	//==============================================================================
	/**
	 * @param { { x: number, y: number, width: number, height: number } | null } rect
	 */
	setRect(rect) {
		this.#rect = rect;
	}

	//==============================================================================
	// 그리기 영역 반환.
	//==============================================================================
	/**
	 * @returns { { x: number, y: number, width: number, height: number } | null }
	 */
	getRect() {
		return this.#rect;
	}

	//==============================================================================
	// 밤하늘 색상 설정 (위/중간/아래 3단 그라데이션).
	//==============================================================================
	/**
	 * @param { string } topColor
	 * @param { string } middleColor
	 * @param { string } bottomColor
	 */
	setSkyColors(topColor, middleColor, bottomColor) {
		this.#skyTopColor = topColor;
		this.#skyMiddleColor = middleColor;
		this.#skyBottomColor = bottomColor;
	}

	//==============================================================================
	// 달 표시 여부 설정.
	//==============================================================================
	/**
	 * @param { boolean } isMoonVisible
	 */
	setMoonVisible(isMoonVisible) {
		this.#isMoonVisible = isMoonVisible;
	}

	//==============================================================================
	// 달 위치 / 크기 / 색상 설정.
	//==============================================================================
	/**
	 * @param { number } xRatio
	 * @param { number } yRatio
	 * @param { number } radius
	 * @param { string } color
	 */
	setMoon(xRatio, yRatio, radius, color) {
		this.#moonXRatio = xRatio;
		this.#moonYRatio = yRatio;
		this.#moonRadius = radius;
		this.#moonColor = color;
	}

	//==============================================================================
	// 달 헤일로 색상 설정 (내측 → 외측 라디얼 그라데이션).
	// - 밤하늘에는 옅은 노란빛, 낮 태양에는 따뜻한 진한 노랑 등으로 교체.
	//==============================================================================
	/**
	 * @param { string } innerColor
	 * @param { string } outerColor
	 */
	setMoonHaloColors(innerColor, outerColor) {
		this.#moonHaloInnerColor = innerColor;
		this.#moonHaloOuterColor = outerColor;
	}

	//==============================================================================
	// 산 색상 설정 (먼/중간/가까운 3겹).
	//==============================================================================
	/**
	 * @param { string } farColor
	 * @param { string } midColor
	 * @param { string } nearColor
	 */
	setMountainColors(farColor, midColor, nearColor) {
		this.#farMountainColor = farColor;
		this.#midMountainColor = midColor;
		this.#nearMountainColor = nearColor;
	}

	//==============================================================================
	// 산 봉우리 데이터 설정 (각 층의 baseY 비율 + 봉우리 배열).
	// - 봉우리를 직접 디자인하고 싶을 때 호출.
	//==============================================================================
	/**
	 * @param { number } farBaseRatio
	 * @param { MountainPeak[] } farPeaks
	 * @param { number } midBaseRatio
	 * @param { MountainPeak[] } midPeaks
	 * @param { number } nearBaseRatio
	 * @param { MountainPeak[] } nearPeaks
	 */
	setMountainPeaks(farBaseRatio, farPeaks, midBaseRatio, midPeaks, nearBaseRatio, nearPeaks) {
		this.#farMountainBaseRatio = farBaseRatio;
		this.#farMountainPeaks = farPeaks;
		this.#midMountainBaseRatio = midBaseRatio;
		this.#midMountainPeaks = midPeaks;
		this.#nearMountainBaseRatio = nearBaseRatio;
		this.#nearMountainPeaks = nearPeaks;
	}

	//==============================================================================
	// 출력. rect 가 설정되어 있을 때만 그린다.
	//==============================================================================
	/**
	 * @override
	 * @param { Graphic } graphic
	 */
	draw(graphic) {
		if (!this.isActive()) {
			return;
		}
		const rect = this.#rect;
		if (!rect) {
			return;
		}
		if (rect.width <= 0 || rect.height <= 0) {
			return;
		}
		const canvasRenderingContext = graphic.getCanvasRenderingContext();

		// 밤하늘 그라데이션.
		const skyGradient = canvasRenderingContext.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.height);
		skyGradient.addColorStop(0.0, this.#skyTopColor);
		skyGradient.addColorStop(0.55, this.#skyMiddleColor);
		skyGradient.addColorStop(1.0, this.#skyBottomColor);
		canvasRenderingContext.fillStyle = skyGradient;
		canvasRenderingContext.fillRect(rect.x, rect.y, rect.width, rect.height);

		// 달.
		if (this.#isMoonVisible) {
			this.drawMoon(canvasRenderingContext, rect);
		}

		// 먼 산.
		const farMountainBaseY = rect.y + rect.height * this.#farMountainBaseRatio;
		canvasRenderingContext.fillStyle = this.#farMountainColor;
		this.fillMountainSilhouette(canvasRenderingContext, rect, this.#farMountainPeaks, farMountainBaseY);

		// 중간 산.
		const midMountainBaseY = rect.y + rect.height * this.#midMountainBaseRatio;
		canvasRenderingContext.fillStyle = this.#midMountainColor;
		this.fillMountainSilhouette(canvasRenderingContext, rect, this.#midMountainPeaks, midMountainBaseY);

		// 가까운 산.
		const nearMountainBaseY = rect.y + rect.height * this.#nearMountainBaseRatio;
		canvasRenderingContext.fillStyle = this.#nearMountainColor;
		this.fillMountainSilhouette(canvasRenderingContext, rect, this.#nearMountainPeaks, nearMountainBaseY);
	}

	//==============================================================================
	// 달 그리기 (헤일로 + 본체).
	//==============================================================================
	/**
	 * @param { CanvasRenderingContext2D } canvasRenderingContext
	 * @param { { x: number, y: number, width: number, height: number } } rect
	 */
	drawMoon(canvasRenderingContext, rect) {
		const moonCenterX = rect.x + rect.width * this.#moonXRatio;
		const moonCenterY = rect.y + rect.height * this.#moonYRatio;
		const moonRadius = this.#moonRadius;
		const moonHaloRadius = moonRadius * 3.0;
		const moonHaloGradient = canvasRenderingContext.createRadialGradient(moonCenterX, moonCenterY, moonRadius, moonCenterX, moonCenterY, moonHaloRadius);
		moonHaloGradient.addColorStop(0.0, this.#moonHaloInnerColor);
		moonHaloGradient.addColorStop(1.0, this.#moonHaloOuterColor);
		canvasRenderingContext.fillStyle = moonHaloGradient;
		canvasRenderingContext.beginPath();
		canvasRenderingContext.arc(moonCenterX, moonCenterY, moonHaloRadius, 0, System.Math.PI * 2);
		canvasRenderingContext.fill();
		canvasRenderingContext.fillStyle = this.#moonColor;
		canvasRenderingContext.beginPath();
		canvasRenderingContext.arc(moonCenterX, moonCenterY, moonRadius, 0, System.Math.PI * 2);
		canvasRenderingContext.fill();
	}

	//==============================================================================
	// 산 실루엣 폴리곤 채우기.
	// - peaks 의 각 점은 baseY 를 기준으로 heightRatio * rect.height 만큼 위로 솟은 봉우리.
	// - 좌/우 가장자리는 baseY 위치에서 rect 하단까지 사각형으로 채움.
	//==============================================================================
	/**
	 * @param { CanvasRenderingContext2D } canvasRenderingContext
	 * @param { { x: number, y: number, width: number, height: number } } rect
	 * @param { MountainPeak[] } peaks
	 * @param { number } baseY
	 */
	fillMountainSilhouette(canvasRenderingContext, rect, peaks, baseY) {
		const rectBottomY = rect.y + rect.height;
		const rectRightX = rect.x + rect.width;
		canvasRenderingContext.beginPath();
		canvasRenderingContext.moveTo(rect.x, rectBottomY);
		canvasRenderingContext.lineTo(rect.x, baseY);
		for (const peak of peaks) {
			const peakX = rect.x + rect.width * peak.xRatio;
			const peakY = baseY - rect.height * peak.heightRatio;
			canvasRenderingContext.lineTo(peakX, peakY);
		}
		canvasRenderingContext.lineTo(rectRightX, baseY);
		canvasRenderingContext.lineTo(rectRightX, rectBottomY);
		canvasRenderingContext.closePath();
		canvasRenderingContext.fill();
	}

	//==============================================================================
	// 밤 프리셋 적용 — 어두운 밤하늘 + 좌상단 옅은 달 + 어두운 3겹 산.
	// (생성자 기본값과 동일. 다른 프리셋에서 다시 밤으로 되돌릴 때 호출.)
	//==============================================================================
	applyNightPreset() {
		this.setSkyColors("#08080f", "#1a1f33", "#2a2f48");
		this.setMoonVisible(true);
		this.setMoon(0.18, 0.22, 26, "#f0e8c8");
		this.setMoonHaloColors("rgba(240, 232, 200, 0.28)", "rgba(240, 232, 200, 0.0)");
		this.setMountainColors("#3a4058", "#1f2438", "#0a0d18");
	}

	//==============================================================================
	// 낮 프리셋 적용 — 푸른 하늘 + 우상단 따뜻한 태양 + 대기원근감 적용된 푸르스름한 산.
	//==============================================================================
	applyDayPreset() {
		this.setSkyColors("#5a8ec4", "#9dc0db", "#d6e4ee");
		this.setMoonVisible(true);
		this.setMoon(0.78, 0.18, 32, "#fff5d0");
		this.setMoonHaloColors("rgba(255, 232, 160, 0.55)", "rgba(255, 232, 160, 0.0)");
		this.setMountainColors("#a8bccf", "#6e8298", "#48586a");
	}
}


//==============================================================================
// 외부 사용을 위한 클래스 재공개.
//==============================================================================
export { MountainPeak };

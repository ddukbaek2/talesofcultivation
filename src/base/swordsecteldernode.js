//==============================================================================
// 포함 모듈 목록.
//==============================================================================
const System = globalThis;
import { WorldNode } from "../../libs/vanilla.js/src/core/node/worldnode.js";


//==============================================================================
// 검종 장로 다층 실루엣 노드.
// - 달뜬 야산 배경처럼 여러 레이어로 깊이를 만든 평면 캐릭터. 카드 프레임 / 배경 박스 없음.
// - 4 레이어 (뒤 → 앞):
//   1) backLayer  — 외곽 도포 atmospheric 라인. 산의 먼산 색조와 톤이 어울리는 가장 밝은 어두움.
//   2) bodyLayer  — 본체 도포 / 머리 / 목. 중간 어두움. 살짝 안쪽으로 인셋되어 backLayer 가
//                   양옆으로 살짝 비어져 보이게 함 → 두 단계 톤 차이로 깊이감.
//   3) frontLayer — 검(손잡이/가드/머리), 도포 중앙 그림자선 등 가장 어두운 전면 디테일.
//   4) hairLayer  — 백발(긴 수염, 상투, 머리 윗단, 굵은 노인 눈썹). 옅은 회백색.
//                   장로(노인) 식별의 핵심. 어두운 본체 위로 강하게 떠 보임.
// - 모든 좌표/크기는 rect 비율 기반이라 어떤 크기에서도 같은 비율로 그려진다.
//==============================================================================
export class SwordSectElderNode extends WorldNode {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @private @type { { x: number, y: number, width: number, height: number } | null } */ #rect;
	/** @private @type { string } */ #backLayerColor;
	/** @private @type { string } */ #bodyLayerColor;
	/** @private @type { string } */ #frontLayerColor;
	/** @private @type { string } */ #hairLayerColor;

	//==============================================================================
	// 생성.
	//==============================================================================
	constructor() {
		super();
		this.#rect = null;
		this.#backLayerColor = "#2a3045";
		this.#bodyLayerColor = "#0e1326";
		this.#frontLayerColor = "#04060f";
		this.#hairLayerColor = "#cec8af";
	}

	//==============================================================================
	// 그리기 영역 설정.
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
	// 4 레이어 색상 설정 (뒤 → 앞 순).
	//==============================================================================
	/**
	 * @param { string } backLayerColor
	 * @param { string } bodyLayerColor
	 * @param { string } frontLayerColor
	 * @param { string } hairLayerColor
	 */
	setLayerColors(backLayerColor, bodyLayerColor, frontLayerColor, hairLayerColor) {
		this.#backLayerColor = backLayerColor;
		this.#bodyLayerColor = bodyLayerColor;
		this.#frontLayerColor = frontLayerColor;
		this.#hairLayerColor = hairLayerColor;
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
		this.drawBackLayer(canvasRenderingContext, rect);
		this.drawBodyLayer(canvasRenderingContext, rect);
		this.drawFrontLayer(canvasRenderingContext, rect);
		this.drawHairLayer(canvasRenderingContext, rect);
	}

	//==============================================================================
	// Back layer: 외곽 도포 atmospheric. 본체보다 살짝 크게 그려 가장자리에 톤 한 단계 비치게 함.
	//==============================================================================
	/**
	 * @param { CanvasRenderingContext2D } canvasRenderingContext
	 * @param { { x: number, y: number, width: number, height: number } } rect
	 */
	drawBackLayer(canvasRenderingContext, rect) {
		canvasRenderingContext.fillStyle = this.#backLayerColor;
		canvasRenderingContext.beginPath();
		canvasRenderingContext.moveTo(rect.x + rect.width * 0.14, rect.y + rect.height * 0.50);
		canvasRenderingContext.lineTo(rect.x + rect.width * 0.30, rect.y + rect.height * 0.40);
		canvasRenderingContext.lineTo(rect.x + rect.width * 0.42, rect.y + rect.height * 0.39);
		canvasRenderingContext.lineTo(rect.x + rect.width * 0.50, rect.y + rect.height * 0.40);
		canvasRenderingContext.lineTo(rect.x + rect.width * 0.58, rect.y + rect.height * 0.39);
		canvasRenderingContext.lineTo(rect.x + rect.width * 0.70, rect.y + rect.height * 0.40);
		canvasRenderingContext.lineTo(rect.x + rect.width * 0.86, rect.y + rect.height * 0.50);
		canvasRenderingContext.lineTo(rect.x + rect.width * 0.96, rect.y + rect.height * 0.62);
		canvasRenderingContext.lineTo(rect.x + rect.width * 1.04, rect.y + rect.height * 0.92);
		canvasRenderingContext.lineTo(rect.x + rect.width * 1.08, rect.y + rect.height * 1.10);
		canvasRenderingContext.lineTo(rect.x + rect.width * -0.08, rect.y + rect.height * 1.10);
		canvasRenderingContext.lineTo(rect.x + rect.width * -0.04, rect.y + rect.height * 0.92);
		canvasRenderingContext.lineTo(rect.x + rect.width * 0.04, rect.y + rect.height * 0.62);
		canvasRenderingContext.closePath();
		canvasRenderingContext.fill();
	}

	//==============================================================================
	// Body layer: 본체 도포 + 머리 + 목.
	//==============================================================================
	/**
	 * @param { CanvasRenderingContext2D } canvasRenderingContext
	 * @param { { x: number, y: number, width: number, height: number } } rect
	 */
	drawBodyLayer(canvasRenderingContext, rect) {
		canvasRenderingContext.fillStyle = this.#bodyLayerColor;

		// 도포 (본체 안쪽, 어깨가 살짝 처진 노인 자세).
		canvasRenderingContext.beginPath();
		canvasRenderingContext.moveTo(rect.x + rect.width * 0.20, rect.y + rect.height * 0.54);
		canvasRenderingContext.lineTo(rect.x + rect.width * 0.34, rect.y + rect.height * 0.45);
		canvasRenderingContext.lineTo(rect.x + rect.width * 0.42, rect.y + rect.height * 0.43);
		canvasRenderingContext.lineTo(rect.x + rect.width * 0.50, rect.y + rect.height * 0.44);
		canvasRenderingContext.lineTo(rect.x + rect.width * 0.58, rect.y + rect.height * 0.43);
		canvasRenderingContext.lineTo(rect.x + rect.width * 0.66, rect.y + rect.height * 0.45);
		canvasRenderingContext.lineTo(rect.x + rect.width * 0.80, rect.y + rect.height * 0.54);
		canvasRenderingContext.lineTo(rect.x + rect.width * 0.90, rect.y + rect.height * 0.66);
		canvasRenderingContext.lineTo(rect.x + rect.width * 0.98, rect.y + rect.height * 0.92);
		canvasRenderingContext.lineTo(rect.x + rect.width * 1.02, rect.y + rect.height * 1.08);
		canvasRenderingContext.lineTo(rect.x + rect.width * -0.02, rect.y + rect.height * 1.08);
		canvasRenderingContext.lineTo(rect.x + rect.width * 0.02, rect.y + rect.height * 0.92);
		canvasRenderingContext.lineTo(rect.x + rect.width * 0.10, rect.y + rect.height * 0.66);
		canvasRenderingContext.closePath();
		canvasRenderingContext.fill();

		// 머리 (살짝 길쭉한 타원).
		canvasRenderingContext.beginPath();
		canvasRenderingContext.ellipse(
			rect.x + rect.width * 0.50,
			rect.y + rect.height * 0.28,
			rect.width * 0.135,
			rect.height * 0.165,
			0,
			0,
			System.Math.PI * 2
		);
		canvasRenderingContext.fill();

		// 목 (머리와 본체 잇는 짧은 사각).
		canvasRenderingContext.fillRect(
			rect.x + rect.width * 0.45,
			rect.y + rect.height * 0.40,
			rect.width * 0.10,
			rect.height * 0.10
		);
	}

	//==============================================================================
	// Front layer: 가장 어두운 전면 액센트 (검 + 도포 중앙 그림자선).
	//==============================================================================
	/**
	 * @param { CanvasRenderingContext2D } canvasRenderingContext
	 * @param { { x: number, y: number, width: number, height: number } } rect
	 */
	drawFrontLayer(canvasRenderingContext, rect) {
		canvasRenderingContext.fillStyle = this.#frontLayerColor;

		// 도포 중앙 그림자 (수직 어두운 띠 — 옷자락 가운데 접힘 표현).
		canvasRenderingContext.beginPath();
		canvasRenderingContext.moveTo(rect.x + rect.width * 0.475, rect.y + rect.height * 0.62);
		canvasRenderingContext.lineTo(rect.x + rect.width * 0.500, rect.y + rect.height * 0.60);
		canvasRenderingContext.lineTo(rect.x + rect.width * 0.525, rect.y + rect.height * 0.62);
		canvasRenderingContext.lineTo(rect.x + rect.width * 0.555, rect.y + rect.height * 1.06);
		canvasRenderingContext.lineTo(rect.x + rect.width * 0.445, rect.y + rect.height * 1.06);
		canvasRenderingContext.closePath();
		canvasRenderingContext.fill();

		// 검 손잡이 (수직, 가슴 앞 정중앙).
		canvasRenderingContext.fillRect(
			rect.x + rect.width * 0.488,
			rect.y + rect.height * 0.49,
			rect.width * 0.024,
			rect.height * 0.18
		);
		// 검 가드 (가로).
		canvasRenderingContext.fillRect(
			rect.x + rect.width * 0.450,
			rect.y + rect.height * 0.555,
			rect.width * 0.100,
			rect.height * 0.022
		);
		// 검 손잡이 머리 (둥근 끝).
		canvasRenderingContext.beginPath();
		canvasRenderingContext.arc(
			rect.x + rect.width * 0.500,
			rect.y + rect.height * 0.49,
			rect.width * 0.022,
			0,
			System.Math.PI * 2
		);
		canvasRenderingContext.fill();
	}

	//==============================================================================
	// Hair layer: 백발 (긴 수염 + 상투 + 머리 윗단 + 굵은 눈썹). 노인 식별 핵심.
	//==============================================================================
	/**
	 * @param { CanvasRenderingContext2D } canvasRenderingContext
	 * @param { { x: number, y: number, width: number, height: number } } rect
	 */
	drawHairLayer(canvasRenderingContext, rect) {
		canvasRenderingContext.fillStyle = this.#hairLayerColor;

		// 머리 윗단 (정수리에서 이마까지 가로로 덮인 백발 띠).
		canvasRenderingContext.beginPath();
		canvasRenderingContext.ellipse(
			rect.x + rect.width * 0.50,
			rect.y + rect.height * 0.175,
			rect.width * 0.115,
			rect.height * 0.050,
			0,
			0,
			System.Math.PI * 2
		);
		canvasRenderingContext.fill();

		// 상투 (정수리 위 둥근 묶은 머리).
		canvasRenderingContext.beginPath();
		canvasRenderingContext.ellipse(
			rect.x + rect.width * 0.50,
			rect.y + rect.height * 0.10,
			rect.width * 0.062,
			rect.height * 0.065,
			0,
			0,
			System.Math.PI * 2
		);
		canvasRenderingContext.fill();

		// 굵은 노인 눈썹 좌.
		canvasRenderingContext.beginPath();
		canvasRenderingContext.ellipse(
			rect.x + rect.width * 0.430,
			rect.y + rect.height * 0.255,
			rect.width * 0.045,
			rect.height * 0.020,
			0,
			0,
			System.Math.PI * 2
		);
		canvasRenderingContext.fill();
		// 굵은 노인 눈썹 우.
		canvasRenderingContext.beginPath();
		canvasRenderingContext.ellipse(
			rect.x + rect.width * 0.570,
			rect.y + rect.height * 0.255,
			rect.width * 0.045,
			rect.height * 0.020,
			0,
			0,
			System.Math.PI * 2
		);
		canvasRenderingContext.fill();

		// 긴 수염 (콧수염 + 흘러내리는 턱수염, 끝에 물결 디테일).
		canvasRenderingContext.beginPath();
		// 좌측 윗선 (콧수염 끝, 광대 옆).
		canvasRenderingContext.moveTo(rect.x + rect.width * 0.34, rect.y + rect.height * 0.36);
		// 콧수염 윗곡선 — 인중 부근에서 살짝 솟음.
		canvasRenderingContext.lineTo(rect.x + rect.width * 0.40, rect.y + rect.height * 0.32);
		canvasRenderingContext.lineTo(rect.x + rect.width * 0.46, rect.y + rect.height * 0.34);
		canvasRenderingContext.lineTo(rect.x + rect.width * 0.50, rect.y + rect.height * 0.36);
		canvasRenderingContext.lineTo(rect.x + rect.width * 0.54, rect.y + rect.height * 0.34);
		canvasRenderingContext.lineTo(rect.x + rect.width * 0.60, rect.y + rect.height * 0.32);
		canvasRenderingContext.lineTo(rect.x + rect.width * 0.66, rect.y + rect.height * 0.36);
		// 우측 — 옆으로 벌어짐.
		canvasRenderingContext.lineTo(rect.x + rect.width * 0.72, rect.y + rect.height * 0.46);
		canvasRenderingContext.lineTo(rect.x + rect.width * 0.74, rect.y + rect.height * 0.55);
		canvasRenderingContext.lineTo(rect.x + rect.width * 0.71, rect.y + rect.height * 0.62);
		// 흐르는 끝자락 — 다중 물결.
		canvasRenderingContext.lineTo(rect.x + rect.width * 0.65, rect.y + rect.height * 0.68);
		canvasRenderingContext.lineTo(rect.x + rect.width * 0.61, rect.y + rect.height * 0.74);
		canvasRenderingContext.lineTo(rect.x + rect.width * 0.55, rect.y + rect.height * 0.80);
		canvasRenderingContext.lineTo(rect.x + rect.width * 0.50, rect.y + rect.height * 0.85);
		canvasRenderingContext.lineTo(rect.x + rect.width * 0.45, rect.y + rect.height * 0.80);
		canvasRenderingContext.lineTo(rect.x + rect.width * 0.39, rect.y + rect.height * 0.74);
		canvasRenderingContext.lineTo(rect.x + rect.width * 0.35, rect.y + rect.height * 0.68);
		// 좌측 — 위로 다시 올라옴.
		canvasRenderingContext.lineTo(rect.x + rect.width * 0.29, rect.y + rect.height * 0.62);
		canvasRenderingContext.lineTo(rect.x + rect.width * 0.26, rect.y + rect.height * 0.55);
		canvasRenderingContext.lineTo(rect.x + rect.width * 0.28, rect.y + rect.height * 0.46);
		canvasRenderingContext.closePath();
		canvasRenderingContext.fill();
	}

	//==============================================================================
	// 밤 프리셋 — 어두운 밤산 배경 위에 잘 분리되어 보이는 차가운 어두운 톤 + 옅은 백발.
	// (생성자 기본값과 동일.)
	//==============================================================================
	applyNightPreset() {
		this.setLayerColors("#2a3045", "#0e1326", "#04060f", "#cec8af");
	}

	//==============================================================================
	// 낮 프리셋 — 푸른 하늘 + 푸르스름한 낮산 위에서도 실루엣이 잡히도록
	// 톤은 한 단계 들어 올리되, 노인 식별을 위한 백발은 거의 순백에 가까운 밝은 흰색으로.
	//==============================================================================
	applyDayPreset() {
		this.setLayerColors("#5e6e84", "#2a3445", "#0e1424", "#fafaee");
	}
}

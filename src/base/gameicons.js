//==============================================================================
// 포함 모듈 목록.
//==============================================================================
const System = globalThis;


//==============================================================================
// 캔버스 아이콘 드로어. 모든 메서드는 정적(static).
// 호출 후 canvasRenderingContext 의 fillStyle / strokeStyle / lineWidth 상태를
// 복원하지 않으므로 필요하면 호출 전후에 save/restore 를 사용할 것.
//==============================================================================
class GameIcons {
	//==============================================================================
	// 분기점 아이콘.
	// 하단 뿌리 점 → 상단 좌/우 두 가지로 갈라지는 Y 형 트리.
	//==============================================================================
	/**
	 * @param { CanvasRenderingContext2D } canvasRenderingContext
	 * @param { number } x
	 * @param { number } y
	 * @param { number } size
	 * @param { string } color
	 */
	static drawBranchIcon(canvasRenderingContext, x, y, size, color) {
		const cx = x + size * 0.5;
		const cy = y + size * 0.5;
		const lineWidth = System.Math.max(1.5, size * 0.07);
		const dotRadius = System.Math.max(2, size * 0.08);
		const rootY = cy + size * 0.28;
		const forkY = cy + size * 0.04;
		const branchEndY = cy - size * 0.28;
		const branchEndSpanX = size * 0.24;

		canvasRenderingContext.strokeStyle = color;
		canvasRenderingContext.fillStyle = color;
		canvasRenderingContext.lineWidth = lineWidth;
		canvasRenderingContext.lineCap = "round";

		// 뿌리 수직선.
		canvasRenderingContext.beginPath();
		canvasRenderingContext.moveTo(cx, rootY);
		canvasRenderingContext.lineTo(cx, forkY);
		canvasRenderingContext.stroke();

		// 좌측 가지.
		canvasRenderingContext.beginPath();
		canvasRenderingContext.moveTo(cx, forkY);
		canvasRenderingContext.lineTo(cx - branchEndSpanX, branchEndY);
		canvasRenderingContext.stroke();

		// 우측 가지.
		canvasRenderingContext.beginPath();
		canvasRenderingContext.moveTo(cx, forkY);
		canvasRenderingContext.lineTo(cx + branchEndSpanX, branchEndY);
		canvasRenderingContext.stroke();

		// 뿌리 점.
		canvasRenderingContext.beginPath();
		canvasRenderingContext.arc(cx, rootY, dotRadius, 0, System.Math.PI * 2);
		canvasRenderingContext.fill();

		// 좌측 끝 점.
		canvasRenderingContext.beginPath();
		canvasRenderingContext.arc(cx - branchEndSpanX, branchEndY, dotRadius, 0, System.Math.PI * 2);
		canvasRenderingContext.fill();

		// 우측 끝 점.
		canvasRenderingContext.beginPath();
		canvasRenderingContext.arc(cx + branchEndSpanX, branchEndY, dotRadius, 0, System.Math.PI * 2);
		canvasRenderingContext.fill();
	}
}


//==============================================================================
// 외부 사용을 위한 클래스 재공개.
//==============================================================================
export { GameIcons };

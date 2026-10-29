/** One angle drives the drawing and the numbers. SVG's y axis points down. */
export function complexPoint(
	degrees: number,
	cx: number,
	cy: number,
	radius: number,
) {
	const radians = (degrees * Math.PI) / 180;
	const real = Math.cos(radians);
	const imaginary = Math.sin(radians);
	return { real, imaginary, x: cx + radius * real, y: cy - radius * imaginary };
}

export function pointerAngle(x: number, y: number, cx: number, cy: number) {
	return ((Math.atan2(cy - y, x - cx) * 180) / Math.PI + 360) % 360;
}

export function shortestAngle(from: number, to: number) {
	return ((to - from + 540) % 360) - 180;
}

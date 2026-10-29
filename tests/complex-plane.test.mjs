import assert from "node:assert/strict";
import test from "node:test";
import {
	complexPoint,
	pointerAngle,
	shortestAngle,
} from "../src/utils/complex-plane.ts";

test("the plotted point, projections and complex values agree through every quadrant", () => {
	for (const degrees of [0, 30, 45, 90, 135, 180, 225, 270, 315, 359]) {
		const point = complexPoint(degrees, 112, 90, 62);
		assert.ok(Math.abs(point.real ** 2 + point.imaginary ** 2 - 1) < 1e-12);
		assert.ok(Math.abs((point.x - 112) / 62 - point.real) < 1e-12);
		assert.ok(Math.abs((90 - point.y) / 62 - point.imaginary) < 1e-12);
		assert.ok(
			Math.abs(pointerAngle(point.x, point.y, 112, 90) - degrees) < 1e-10,
		);
	}
});

test("discrete steps cross zero along the short arc and can reverse midway", () => {
	assert.equal(shortestAngle(350, 10), 20);
	assert.equal(shortestAngle(10, 350), -20);
	assert.equal(shortestAngle(365, 45), 40);
	assert.equal(shortestAngle(45, 0), -45);
});

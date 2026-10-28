import assert from "node:assert/strict";
import test from "node:test";
import { compareHomeEntries, homePostCopy } from "../src/utils/home-post.ts";

test("homepage editorial fields preserve the original title and use existing category normalization", () => {
	const source = {
		title: "原文",
		description: "Original description",
		displayTitle: " English title ",
		displayDescription: " English summary ",
		category: ["Development", "Maths"],
		password: "SECRET",
	};
	assert.deepEqual(homePostCopy(source), {
		title: "English title",
		description: "English summary",
		category: "Development / Maths",
	});
	assert.equal(source.title, "原文");
	assert.ok(!JSON.stringify(homePostCopy(source)).includes("SECRET"));
	assert.deepEqual(homePostCopy({ title: "A future entry" }), {
		title: "A future entry",
		description: "",
		category: "Uncategorized",
	});
});

test("protected posts do not turn missing public descriptions into body excerpts", () => {
	assert.equal(
		homePostCopy({ title: "Protected", encrypted: true }).description,
		"This content is password protected.",
	);
	assert.equal(
		homePostCopy({
			title: "Protected",
			encrypted: true,
			displayDescription: "Public teaser",
		}).description,
		"Public teaser",
	);
});

test("homepage ordering keeps pinned entries first and sorts every remaining entry both ways", () => {
	const entries = [
		{ date: "2026-10-16", pinned: false },
		{ date: "2024-12-15", pinned: true },
		{ date: "2025-01-01", pinned: false },
		{ date: "2026-02-16", pinned: false },
	];
	assert.deepEqual(
		[...entries].sort(compareHomeEntries).map((x) => x.date),
		["2024-12-15", "2026-10-16", "2026-02-16", "2025-01-01"],
	);
	assert.deepEqual(
		[...entries]
			.sort((a, b) => compareHomeEntries(a, b, true))
			.map((x) => x.date),
		["2024-12-15", "2025-01-01", "2026-02-16", "2026-10-16"],
	);
});

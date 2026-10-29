import assert from "node:assert/strict";
import test from "node:test";
import { toPublicPostListItem } from "../src/utils/public-post.ts";

test("island data excludes secrets and future frontmatter fields", () => {
	const source = {
		id: "private-post",
		body: "private body",
		data: {
			title: "Protected",
			published: new Date("2026-01-01"),
			tags: ["example"],
			category: ["Development"],
			routeName: "stable-link",
			password: "must-not-be-public",
			encrypted: true,
			futureSecret: "must-not-be-public-either",
		},
	};
	const result = toPublicPostListItem(source);
	assert.deepEqual(Object.keys(result.data).sort(), [
		"category",
		"published",
		"routeName",
		"title",
	]);
	assert.equal(result.id, source.id);
	assert.equal(result.data.routeName, "stable-link");
	assert.ok(!JSON.stringify(result).includes("must-not-be-public"));
	assert.ok(!("tags" in result.data));
});

test("editorial titles stay consistent in public navigation without widening the data allowlist", () => {
	const result = toPublicPostListItem({
		id: "entry",
		data: {
			title: "原始标题",
			displayTitle: "Editorial title",
			published: new Date("2026-01-01"),
			category: ["Life"],
			displayDescription: "Not needed by the navigation island",
			password: "private",
		},
	});
	assert.equal(result.data.title, "Editorial title");
	assert.deepEqual(Object.keys(result.data).sort(), [
		"category",
		"published",
		"routeName",
		"title",
	]);
	assert.ok(!JSON.stringify(result).includes("private"));
});

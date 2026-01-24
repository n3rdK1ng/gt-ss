/**
 * Integration tests for stack detection
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { branchExistsLocally, getCurrentBranch } from "#/git/branch";
import { getCommitCount, isAncestor } from "#/git/commits";
import { findStackBranches } from "#/stack/detect";
import { createTestRepo, type TestRepo } from "../fixtures/git-repo-helper";

describe("Stack detection integration", () => {
	let repo: TestRepo | undefined;
	const originalCwd = process.cwd();

	/** Helper to access repo with type narrowing - throws if repo not initialized */
	const getRepo = (): TestRepo => {
		if (!repo) throw new Error("Test repo not initialized");
		return repo;
	};

	beforeEach(async () => {
		repo = await createTestRepo();
		process.chdir(repo.path);
	});

	afterEach(async () => {
		process.chdir(originalCwd);
		if (repo) {
			try {
				await repo.cleanup();
			} catch {
				// Ignore cleanup errors to avoid masking the original test error
			}
		}
	});

	describe("git operations", () => {
		test("getCurrentBranch returns current branch name", async () => {
			const result = await getCurrentBranch();
			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value).toBe("main");
			}
		});

		test("branchExistsLocally detects existing branches", async () => {
			expect(await branchExistsLocally({ branch: "main" })).toBe(true);
			expect(await branchExistsLocally({ branch: "nonexistent" })).toBe(false);
		});

		test("getCommitCount counts commits between branches", async () => {
			await getRepo().createBranch("feature");
			await getRepo().createCommit("First feature commit");
			await getRepo().createCommit("Second feature commit");

			const countResult = await getCommitCount({
				base: "main",
				branch: "feature",
			});
			expect(countResult.ok).toBe(true);
			if (countResult.ok) {
				expect(countResult.value).toBe(2);
			}
		});

		test("isAncestor detects ancestor relationships", async () => {
			await getRepo().createBranch("feature");
			await getRepo().createCommit("Feature commit");

			expect(
				await isAncestor({ ancestor: "main", descendant: "feature" }),
			).toBe(true);
			expect(
				await isAncestor({ ancestor: "feature", descendant: "main" }),
			).toBe(false);
		});
	});

	describe("findStackBranches", () => {
		test("finds single branch stack", async () => {
			await getRepo().createBranch("feature");
			await getRepo().createCommit("Feature commit");

			const branches = await findStackBranches({
				currentBranch: "feature",
				baseBranch: "main",
			});
			expect(branches.length).toBe(1);
			expect(branches[0]?.name).toBe("feature");
		});

		test("finds multi-branch stack in correct order", async () => {
			// Create a stack: main <- feature-1 <- feature-2 <- feature-3
			await getRepo().createBranch("feature-1");
			await getRepo().createCommit("Feature 1 commit");

			await getRepo().createBranch("feature-2");
			await getRepo().createCommit("Feature 2 commit");

			await getRepo().createBranch("feature-3");
			await getRepo().createCommit("Feature 3 commit");

			const branches = await findStackBranches({
				currentBranch: "feature-3",
				baseBranch: "main",
			});

			expect(branches.length).toBe(3);
			expect(branches.map((b) => b.name)).toEqual([
				"feature-1",
				"feature-2",
				"feature-3",
			]);
		});

		test("excludes branches not in the stack", async () => {
			// Create feature-1 on main
			await getRepo().createBranch("feature-1");
			await getRepo().createCommit("Feature 1 commit");

			// Go back to main and create unrelated branch
			await getRepo().checkoutBranch("main");
			await getRepo().createBranch("unrelated");
			await getRepo().createCommit("Unrelated commit");

			// Continue from feature-1
			await getRepo().checkoutBranch("feature-1");
			await getRepo().createBranch("feature-2");
			await getRepo().createCommit("Feature 2 commit");

			const branches = await findStackBranches({
				currentBranch: "feature-2",
				baseBranch: "main",
			});

			const branchNames = branches.map((b) => b.name);
			expect(branchNames).toContain("feature-1");
			expect(branchNames).toContain("feature-2");
			expect(branchNames).not.toContain("unrelated");
		});

		test("sorts branches by commit count", async () => {
			// Create branches with different commit counts
			await getRepo().createBranch("feature-1");
			await getRepo().createCommit("F1 - commit 1");

			await getRepo().createBranch("feature-2");
			await getRepo().createCommit("F2 - commit 1");
			await getRepo().createCommit("F2 - commit 2");

			await getRepo().createBranch("feature-3");
			await getRepo().createCommit("F3 - commit 1");

			const branches = await findStackBranches({
				currentBranch: "feature-3",
				baseBranch: "main",
			});

			// Should be ordered by total commits from main
			// feature-1: 1 commit
			// feature-2: 3 commits (1 from feature-1 + 2 own)
			// feature-3: 4 commits (1 from feature-1 + 2 from feature-2 + 1 own)
			expect(branches[0]?.name).toBe("feature-1");
			expect(branches[1]?.name).toBe("feature-2");
			expect(branches[2]?.name).toBe("feature-3");
		});
	});
});

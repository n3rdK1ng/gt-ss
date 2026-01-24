/**
 * GitHub PR creation
 */

import { branchExistsRemotely } from "#/git/branch";
import { getCommitCount, getCommitMessages } from "#/git/commits";
import { getRepoName } from "#/git/remote";
import type { PrCreationResult } from "#/github/types";
import { log } from "#/logging/logger";
import { gh } from "#/shell/exec";
import type { BranchParams } from "#/utils/params";

type CreatePrForBranchParams = BranchParams & {
	prBase: string;
	repo: string;
};

/**
 * Create a PR for a single branch
 *
 * Return codes:
 * - 0: Success (PR created or already exists)
 * - 1: Error (failed to create PR)
 * - 2: Skipped (branch not pushed or same as base - should not update prev_branch)
 * - 3: Skipped (no commits compared to base - should still update prev_branch)
 */
export const createPrForBranch = async ({
	branch,
	prBase,
	repo,
}: CreatePrForBranchParams) => {
	// Skip if branch doesn't exist remotely
	const existsRemotelyResult = await branchExistsRemotely({ branch });
	if (!existsRemotelyResult.ok) {
		log.warning(
			`Failed to check if ${branch} exists remotely: ${existsRemotelyResult.error.message}`,
		);
		return {
			code: 1 as const,
			branch,
			message: existsRemotelyResult.error.message ?? "Error checking remote status",
		};
	}
	if (!existsRemotelyResult.value) {
		log.skip(`Skipping ${branch} (not pushed yet)`);
		return { code: 2 as const, branch, message: "Branch not pushed yet" };
	}

	// Skip if branch equals base
	if (branch === prBase) {
		log.skip(`Skipping ${branch} (same as base branch)`);
		return { code: 2 as const, branch, message: "Same as base branch" };
	}

	// Check if PR already exists
	const prViewResult = await gh({
		args: ["pr", "view", branch, "--repo", repo, "--json", "number,url"],
	});

	if (prViewResult.exitCode === 0 && prViewResult.stdout) {
		try {
			const prData = JSON.parse(prViewResult.stdout);
			if (prData.number) {
				log.info(
					`\u2705 PR #${prData.number} already exists for ${branch} -> ${prBase}`,
				);
				if (prData.url) {
					log.info(`   ${prData.url}`);
				}
				return {
					code: 0 as const,
					branch,
					prNumber: prData.number,
					prUrl: prData.url || undefined,
					message: "PR already exists",
				};
			}
		} catch {
			// JSON parse failed, continue to create PR
		}
	}

	// Get commits unique to this branch
	const commitCountResult = await getCommitCount({ base: prBase, branch });
	if (!commitCountResult.ok) {
		log.warning(
			`Failed to get commit count for ${branch}: ${commitCountResult.error.message}`,
		);
		return {
			code: 1 as const,
			branch,
			message: commitCountResult.error.message ?? "Error getting commit count",
		};
	}
	const commitCount = commitCountResult.value;

	if (commitCount === 0) {
		log.skip(`Skipping ${branch} (no commits compared to ${prBase})`);
		// Return 3 to indicate "no commits" skip - prev_branch should still be updated
		// to maintain the PR chain structure for subsequent branches
		return {
			code: 3 as const,
			branch,
			message: `No commits compared to ${prBase}`,
		};
	}

	// Generate PR title from first commit message
	const commitMessages = await getCommitMessages({
		base: prBase,
		branch,
		format: "%s",
	});
	const prTitle = commitMessages[0] || branch;

	// Generate PR body from commit messages
	const formattedMessages = await getCommitMessages({
		base: prBase,
		branch,
		format: "- %s",
	});
	let prBody = "";
	if (formattedMessages.length > 0) {
		prBody = `## Commits\n\n${formattedMessages.join("\n")}`;
	}

	// Create the PR
	log.info(
		`\uD83D\uDCDD Creating PR for ${branch} -> ${prBase} (${commitCount} commit(s))`,
	);

	const createResult = await gh({
		args: [
			"pr",
			"create",
			"--base",
			prBase,
			"--head",
			branch,
			"--title",
			prTitle,
			"--body",
			prBody,
			"--repo",
			repo,
		],
	});

	if (createResult.exitCode === 0) {
		log.success(`Created PR for ${branch}`);
		log.info(`   ${createResult.stdout}`);
		return {
			code: 0 as const,
			branch,
			prUrl: createResult.stdout || undefined,
			message: "PR created successfully",
		};
	}

	log.warning(`Failed to create PR for ${branch}`);
	log.info(`   Error: ${createResult.stderr || createResult.stdout}`);
	return {
		code: 1 as const,
		branch,
		message: createResult.stderr || createResult.stdout || "Unknown error",
	};
};

type CreateAllPrsParams = {
	baseBranch: string;
	branches: string[];
};

/**
 * Create PRs for all branches in the stack
 * Creates chained PRs where each branch targets the previous one in the stack
 */
export const createAllPrs = async ({
	baseBranch,
	branches,
}: CreateAllPrsParams) => {
	const repo = await getRepoName();
	if (!repo) {
		log.warning("Could not determine repository name");
		return { allSucceeded: false, results: [] };
	}

	log.blank();
	log.info("\uD83D\uDE80 Creating PRs for each branch in the stack...");

	const results: PrCreationResult[] = [];
	let allSucceeded = true;
	let prevBranch = "";

	for (const branch of branches) {
		const prBase = prevBranch || baseBranch;

		const result = await createPrForBranch({ branch, prBase, repo });
		results.push(result);

		// Track PR creation failures (return code 1)
		if (result.code === 1) {
			allSucceeded = false;
		}

		// Update prev_branch to maintain PR chain structure
		// Return code 2 means the branch was skipped (not pushed or same as base) - don't update chain
		// Return code 3 means no commits but branch exists - still update chain to preserve structure
		if (result.code !== 2) {
			prevBranch = branch;
		}
	}

	if (!allSucceeded) {
		log.blank();
		log.info("\u26A0\uFE0F  Some PRs failed to create.");
	}

	return { allSucceeded, results };
};

/**
 * Git push operations with fallback strategies
 */

import { branchExistsLocally, branchExistsRemotely } from "#/git/branch";
import type { PushResult, PushStrategy } from "#/git/types";
import { log } from "#/logging/logger";
import { git } from "#/shell/exec";
import type { BranchParams } from "#/utils/params";

type PushWithStrategyParams = BranchParams & {
	strategy: PushStrategy;
};

/**
 * Push a branch with a specific strategy
 */
const pushWithStrategy = async ({
	branch,
	strategy,
}: PushWithStrategyParams) => {
	const args: string[] = ["push"];

	switch (strategy) {
		case "regular":
			args.push("origin", branch);
			break;
		case "set-upstream":
			args.push("-u", "origin", branch);
			break;
		case "force-with-lease":
			args.push("--force-with-lease", "origin", branch);
			break;
		case "force":
			args.push("--force", "origin", branch);
			break;
	}

	const result = await git({ args });
	return result.exitCode === 0;
};

type PushBranchParams = BranchParams & {
	allowForcePush?: boolean;
};

/**
 * Push a single branch to remote with fallback strategies
 * Tries: regular push -> set upstream -> force-with-lease -> force (if enabled)
 */
export const pushBranch = async ({
	branch,
	allowForcePush = false,
}: PushBranchParams) => {
	// Check if branch exists locally
	const existsLocally = await branchExistsLocally({ branch });
	if (!existsLocally) {
		log.skip(`Skipping ${branch} (branch doesn't exist locally)`);
		return {
			success: false,
			strategy: "regular" as PushStrategy,
			message: "Branch doesn't exist locally",
		};
	}

	log.info(`\uD83D\uDCE4 Pushing ${branch}...`);

	const existsRemotelyResult = await branchExistsRemotely({ branch });
	if (!existsRemotelyResult.ok) {
		log.warning(
			`Failed to check if ${branch} exists remotely: ${existsRemotelyResult.error.message}`,
		);
		// Continue with push attempt anyway
	}
	const existsRemotely = existsRemotelyResult.ok
		? existsRemotelyResult.value
		: false;

	// Try regular push first
	if (await pushWithStrategy({ branch, strategy: "regular" })) {
		log.success(`Pushed ${branch}`);
		return {
			success: true,
			strategy: "regular" as PushStrategy,
			message: "Pushed successfully",
		};
	}

	// If branch doesn't exist remotely, try setting upstream
	if (!existsRemotely) {
		if (await pushWithStrategy({ branch, strategy: "set-upstream" })) {
			log.success(`Pushed ${branch} (set upstream)`);
			return {
				success: true,
				strategy: "set-upstream" as PushStrategy,
				message: "Pushed with upstream set",
			};
		}
		// Continue to force-with-lease and force strategies even if set-upstream failed
	}

	// Try force-with-lease (safer force push)
	if (await pushWithStrategy({ branch, strategy: "force-with-lease" })) {
		log.success(`Force-pushed ${branch} (with lease)`);
		return {
			success: true,
			strategy: "force-with-lease" as PushStrategy,
			message: "Force-pushed with lease",
		};
	}

	// Last resort: regular force push (requires explicit opt-in)
	if (allowForcePush) {
		if (await pushWithStrategy({ branch, strategy: "force" })) {
			log.success(`Force-pushed ${branch}`);
			return {
				success: true,
				strategy: "force" as PushStrategy,
				message: "Force-pushed",
			};
		}
		log.warning(`Failed to push ${branch} (even with force)`);
		return {
			success: false,
			strategy: "force" as PushStrategy,
			message: "Failed to force push",
		};
	}

	log.warning(
		`Failed to push ${branch} (force-with-lease failed; set ALLOW_FORCE_PUSH=1 to allow regular force push)`,
	);
	return {
		success: false,
		strategy: "force-with-lease" as PushStrategy,
		message:
			"Force-with-lease failed; set ALLOW_FORCE_PUSH=1 to allow force push",
	};
};

type PushAllBranchesParams = {
	branches: string[];
	allowForcePush?: boolean;
};

/**
 * Push all branches in the stack to remote
 */
export const pushAllBranches = async ({
	branches,
	allowForcePush = false,
}: PushAllBranchesParams) => {
	log.blank();
	log.info("\uD83D\uDCE4 Pushing branches to remote...");

	const results: PushResult[] = [];
	let allSucceeded = true;

	for (const branch of branches) {
		const result = await pushBranch({ branch, allowForcePush });
		results.push(result);
		if (!result.success) {
			allSucceeded = false;
		}
	}

	if (!allSucceeded) {
		log.blank();
		log.info(
			"\u26A0\uFE0F  Some branches failed to push. Continuing with PR creation...",
		);
	}

	return { allSucceeded, results };
};

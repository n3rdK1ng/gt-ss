/**
 * Main stack submission orchestration
 */

import { getConfig } from "#/config/index";
import { getCurrentBranch } from "#/git/branch";
import { pushAllBranches } from "#/git/push";
import { detectBaseBranch } from "#/git/remote";
import { createAllPrs } from "#/github/pr";
import { checkGhPrerequisites } from "#/github/prerequisites";
import { log } from "#/logging/logger";
import { findStackBranches } from "#/stack/detect";
import type { StackInfo } from "#/stack/types";

const SCRIPT_NAME = "stack-submit";
const VERSION = "1.0.0";

type DisplayStackSummaryParams = {
	info: StackInfo;
};

/**
 * Display the stack summary showing all branches and their commit counts
 */
const displayStackSummary = ({ info }: DisplayStackSummaryParams) => {
	log.info(`\uD83D\uDCCB Found ${info.branches.length} branch(es) in stack:`);
	for (const branch of info.branches) {
		log.info(
			`  - ${branch.name} (${branch.commitCount} commits from ${info.baseBranch})`,
		);
	}
};

/**
 * Main entry point - orchestrates the stack submission workflow
 * 1. Detects branches in the stack
 * 2. Pushes all branches to remote
 * 3. Creates chained PRs for each branch
 */
export const submitStack = async () => {
	log.info(`${SCRIPT_NAME} v${VERSION}`);

	const config = getConfig();

	// Get current branch
	const currentBranchResult = await getCurrentBranch();
	if (!currentBranchResult.ok) {
		throw currentBranchResult.error;
	}
	const currentBranch = currentBranchResult.value;

	// Detect base branch
	const baseBranch = await detectBaseBranch();

	// Guard against running on base branch
	if (currentBranch === baseBranch) {
		log.error(
			`Cannot run on base branch '${baseBranch}'. Please switch to a feature branch.`,
		);
		process.exit(1);
	}

	// Find all branches in the stack
	log.info("\uD83D\uDD0D Getting branches in stack...");
	const branches = await findStackBranches({ currentBranch, baseBranch });

	const stackInfo: StackInfo = {
		baseBranch,
		currentBranch,
		branches,
	};

	// Display stack summary
	displayStackSummary({ info: stackInfo });

	// Track overall status
	let pushSucceeded = true;
	let prSucceeded = true;

	// Push all branches
	const branchNames = branches.map((b) => b.name);
	const pushResult = await pushAllBranches({
		branches: branchNames,
		allowForcePush: config.allowForcePush,
	});
	pushSucceeded = pushResult.allSucceeded;

	// Check prerequisites and create PRs
	const prereqResult = await checkGhPrerequisites();
	if (prereqResult.ok) {
		const prResult = await createAllPrs({ baseBranch, branches: branchNames });
		prSucceeded = prResult.allSucceeded;
	} else {
		prSucceeded = false;
	}

	// Display appropriate final message based on results
	log.blank();
	if (pushSucceeded && prSucceeded) {
		log.info("\u2705 Done! Stack pushed and PRs created successfully.");
	} else if (!pushSucceeded && !prSucceeded) {
		log.info(
			"\u26A0\uFE0F  Done with issues: Some branches failed to push and some PRs failed to create.",
		);
	} else if (!pushSucceeded) {
		log.info("\u26A0\uFE0F  Done with issues: Some branches failed to push.");
	} else {
		log.info("\u26A0\uFE0F  Done with issues: Some PRs failed to create.");
	}
};

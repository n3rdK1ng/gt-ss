/**
 * Stack detection logic
 */

import { getAllLocalBranches } from "#/git/branch";
import { getCommitCount, isAncestor } from "#/git/commits";
import type { BranchInfo } from "#/git/types";

type FindStackBranchesParams = {
	currentBranch: string;
	baseBranch: string;
};

/**
 * Find all branches in the current stack
 * Returns branches sorted by commit count (earliest in stack first)
 */
export const findStackBranches = async ({
	currentBranch,
	baseBranch,
}: FindStackBranchesParams) => {
	const candidateBranches: string[] = [currentBranch];

	// Get all branches except base branch
	const allBranches = await getAllLocalBranches();
	const filteredBranches = allBranches.filter(
		(branch) => branch !== baseBranch,
	);

	// Find branches that are ancestors of current branch with unique commits
	for (const otherBranch of filteredBranches) {
		// Skip current branch (already added)
		if (otherBranch === currentBranch) {
			continue;
		}

		// Check if other_branch is an ancestor of current_branch
		const isAncestorBranch = await isAncestor({
			ancestor: otherBranch,
			descendant: currentBranch,
		});
		if (isAncestorBranch) {
			const commitsNotInBaseResult = await getCommitCount({
				base: baseBranch,
				branch: otherBranch,
			});
			if (commitsNotInBaseResult.ok && commitsNotInBaseResult.value > 0) {
				candidateBranches.push(otherBranch);
			}
		}
	}

	// Get commit counts for all candidates
	const branchInfosResults = await Promise.all(
		candidateBranches.map(async (branch) => {
			const commitCountResult = await getCommitCount({
				base: baseBranch,
				branch,
			});
			return { branch, commitCountResult };
		}),
	);

	// Filter out branches with errors and map to BranchInfo
	const branchInfos: BranchInfo[] = branchInfosResults
		.filter(({ commitCountResult }) => commitCountResult.ok)
		.map(({ branch, commitCountResult }) => ({
			name: branch,
			commitCount: commitCountResult.ok ? commitCountResult.value : 0,
		}));

	// Sort by commit count (fewest first = earliest in stack)
	branchInfos.sort((a, b) => a.commitCount - b.commitCount);

	return branchInfos;
};

/**
 * Stack types
 */

import type { BranchInfo } from "#/git/types";

export type StackInfo = {
	baseBranch: string;
	currentBranch: string;
	branches: BranchInfo[];
};

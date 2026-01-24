/**
 * Git types
 */

export type PushStrategy =
	| "regular"
	| "set-upstream"
	| "force-with-lease"
	| "force";

export type PushResult = {
	success: boolean;
	strategy: PushStrategy;
	message: string;
};

export type BranchInfo = {
	name: string;
	commitCount: number;
};

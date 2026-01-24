/**
 * Application error types
 */

import type { BranchParams, CauseParams, CommandParams } from "#/utils/params";

export type ErrorCode =
	| "GIT_NOT_FOUND"
	| "NOT_GIT_REPO"
	| "GH_NOT_FOUND"
	| "GH_NOT_AUTHENTICATED"
	| "BRANCH_NOT_FOUND"
	| "PUSH_FAILED"
	| "PR_CREATION_FAILED"
	| "COMMAND_FAILED"
	| "UNKNOWN";

export type AppError = {
	code: ErrorCode;
	message: string;
	cause?: unknown;
};

type CreateErrorParams = {
	code: ErrorCode;
	message: string;
} & CauseParams;

export const createError = ({ code, message, cause }: CreateErrorParams) => ({
	code,
	message,
	cause,
});

export const gitNotFound = () =>
	createError({
		code: "GIT_NOT_FOUND",
		message: "Git is not installed or not in PATH",
	});

export const notGitRepo = () =>
	createError({ code: "NOT_GIT_REPO", message: "Not in a git repository" });

export const ghNotFound = () =>
	createError({
		code: "GH_NOT_FOUND",
		message: "GitHub CLI (gh) is not installed",
	});

export const ghNotAuthenticated = () =>
	createError({
		code: "GH_NOT_AUTHENTICATED",
		message: "Not authenticated with GitHub CLI",
	});

export const branchNotFound = ({ branch }: BranchParams) =>
	createError({
		code: "BRANCH_NOT_FOUND",
		message: `Branch '${branch}' not found`,
	});

type PushFailedParams = BranchParams & CauseParams;

export const pushFailed = ({ branch, cause }: PushFailedParams) =>
	createError({
		code: "PUSH_FAILED",
		message: `Failed to push branch '${branch}'`,
		cause,
	});

type PrCreationFailedParams = BranchParams & CauseParams;

export const prCreationFailed = ({ branch, cause }: PrCreationFailedParams) =>
	createError({
		code: "PR_CREATION_FAILED",
		message: `Failed to create PR for '${branch}'`,
		cause,
	});

type CommandFailedParams = CommandParams & CauseParams;

export const commandFailed = ({ command, cause }: CommandFailedParams) =>
	createError({
		code: "COMMAND_FAILED",
		message: `Command failed: ${command}`,
		cause,
	});

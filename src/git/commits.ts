/**
 * Git commit operations
 */

import { git } from "#/shell/exec";
import type { AppError } from "#/utils/errors";
import { commandFailed } from "#/utils/errors";
import { err, ok, type Result } from "#/utils/result";

type GetCommitCountParams = {
	base: string;
	branch: string;
};

/**
 * Get the number of commits between base and branch
 */
export const getCommitCount = async ({
	base,
	branch,
}: GetCommitCountParams): Promise<Result<number, AppError>> => {
	const result = await git({
		args: ["rev-list", "--count", `${base}..${branch}`],
	});

	if (result.exitCode !== 0) {
		return err(
			commandFailed({
				command: "git rev-list",
				cause: result.stderr || "Unknown error",
			}),
		);
	}

	const count = parseInt(result.stdout, 10);
	if (Number.isNaN(count)) {
		return err(
			commandFailed({
				command: "git rev-list",
				cause: `Invalid count output: ${result.stdout}`,
			}),
		);
	}

	return ok(count);
};

type IsAncestorParams = {
	ancestor: string;
	descendant: string;
};

/**
 * Check if ancestor is an ancestor of descendant
 */
export const isAncestor = async ({
	ancestor,
	descendant,
}: IsAncestorParams) => {
	const result = await git({
		args: ["merge-base", "--is-ancestor", ancestor, descendant],
	});
	return result.exitCode === 0;
};

type GetCommitMessagesParams = {
	base: string;
	branch: string;
	format?: string;
};

/**
 * Get commit messages between base and branch
 */
export const getCommitMessages = async ({
	base,
	branch,
	format = "%s",
}: GetCommitMessagesParams) => {
	const result = await git({
		args: ["log", `${base}..${branch}`, "--oneline", `--format=${format}`],
	});

	if (result.exitCode !== 0 || !result.stdout) {
		return [];
	}

	return result.stdout.split("\n").filter(Boolean);
};

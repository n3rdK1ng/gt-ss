/**
 * Git branch operations
 */

import { git } from "#/shell/exec";
import type { AppError } from "#/utils/errors";
import { commandFailed, notGitRepo } from "#/utils/errors";
import type { BranchParams } from "#/utils/params";
import { err, ok, type Result } from "#/utils/result";

/**
 * Get the current branch name
 */
export const getCurrentBranch = async () => {
	const result = await git({ args: ["rev-parse", "--abbrev-ref", "HEAD"] });

	if (result.exitCode !== 0) {
		return err(notGitRepo());
	}

	const branchName = result.stdout.trim();

	// Check for detached HEAD state
	if (branchName === "HEAD") {
		return err(notGitRepo());
	}

	return ok(branchName);
};

/**
 * Check if a branch exists locally
 */
export const branchExistsLocally = async ({ branch }: BranchParams) => {
	const result = await git({
		args: ["show-ref", "--verify", "--quiet", `refs/heads/${branch}`],
	});
	return result.exitCode === 0;
};

/**
 * Check if a branch exists on the remote (origin)
 */
export const branchExistsRemotely = async ({
	branch,
}: BranchParams): Promise<Result<boolean, AppError>> => {
	const result = await git({
		args: ["ls-remote", "--exit-code", "--heads", "origin", branch],
	});

	if (result.exitCode === 0) {
		return ok(true);
	}

	// Exit code 2 means branch not found (expected)
	if (result.exitCode === 2) {
		return ok(false);
	}

	// Other exit codes indicate errors (network, auth, etc.)
	return err(
		commandFailed({
			command: "git ls-remote",
			cause: result.stderr || "Unknown error",
		}),
	);
};

/**
 * Get all local branch names
 */
export const getAllLocalBranches = async () => {
	const result = await git({ args: ["branch", "--format=%(refname:short)"] });

	if (result.exitCode !== 0 || !result.stdout) {
		return [];
	}

	return result.stdout.split("\n").filter(Boolean);
};

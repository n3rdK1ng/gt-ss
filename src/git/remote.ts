/**
 * Git remote operations
 */

import { branchExistsLocally, branchExistsRemotely } from "#/git/branch";
import { git } from "#/shell/exec";

/**
 * Detect the base/trunk branch (usually main or master)
 * Tries in order: remote HEAD, common trunk names (main, master), fallback to master
 */
export const detectBaseBranch = async () => {
	// First, try to get the remote default branch using symbolic-ref
	const symRefResult = await git({
		args: ["symbolic-ref", "refs/remotes/origin/HEAD"],
	});

	if (symRefResult.exitCode === 0 && symRefResult.stdout) {
		const branch = symRefResult.stdout.replace("refs/remotes/origin/", "");
		if (branch) {
			return branch;
		}
	}

	// Try common trunk branch names
	const trunkBranches = ["main", "master"];

	for (const trunk of trunkBranches) {
		const existsLocally = await branchExistsLocally({ branch: trunk });
		const existsRemotelyResult = await branchExistsRemotely({ branch: trunk });
		const existsRemotely = existsRemotelyResult.ok
			? existsRemotelyResult.value
			: false;

		if (existsLocally || existsRemotely) {
			return trunk;
		}
	}

	// Default fallback
	return "master";
};

/**
 * Get the repository name from remote URL (owner/repo format)
 */
export const getRepoName = async () => {
	const result = await git({ args: ["config", "--get", "remote.origin.url"] });

	if (result.exitCode !== 0 || !result.stdout) {
		return process.env.GITHUB_REPOSITORY ?? "";
	}

	const url = result.stdout;

	// Extract owner/repo from various URL formats:
	// - https://github.com/owner/repo.git
	// - git@github.com:owner/repo.git
	// - https://github.com/owner/repo
	const match = url.match(/github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?$/);

	if (match) {
		return match[1];
	}

	return process.env.GITHUB_REPOSITORY ?? "";
};

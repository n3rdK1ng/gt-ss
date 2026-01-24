/**
 * GitHub CLI prerequisites checking
 */

import { getRepoName } from "#/git/remote";
import { log } from "#/logging/logger";
import { commandExists, gh } from "#/shell/exec";
import { ghNotAuthenticated, ghNotFound } from "#/utils/errors";
import { err, ok } from "#/utils/result";

/**
 * Check GitHub CLI prerequisites (installed and authenticated)
 */
export const checkGhPrerequisites = async () => {
	// Check if GitHub CLI is available
	const ghExists = await commandExists({ command: "gh" });
	if (!ghExists) {
		log.info("\u26A0\uFE0F  GitHub CLI (gh) is not installed.");
		log.info("   Install it with: brew install gh");

		const repoName = await getRepoName();
		if (repoName) {
			log.info(`   Or create PRs manually at: https://github.com/${repoName}`);
		}

		return err(ghNotFound());
	}

	// Check if authenticated with GitHub
	const authResult = await gh({ args: ["auth", "status"] });
	if (authResult.exitCode !== 0) {
		log.info("\u26A0\uFE0F  Not authenticated with GitHub CLI.");
		log.info("   Run: gh auth login");
		return err(ghNotAuthenticated());
	}

	return ok(undefined);
};

/**
 * Test fixtures for creating mock git repositories
 */

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export type TestRepo = {
	path: string;
	cleanup: () => Promise<void>;
	git: (...args: string[]) => Promise<{ stdout: string; exitCode: number }>;
	createCommit: (message: string, fileName?: string) => Promise<void>;
	createBranch: (name: string) => Promise<void>;
	checkoutBranch: (name: string) => Promise<void>;
};

/**
 * Create a temporary git repository for testing
 */
export const createTestRepo = async (): Promise<TestRepo> => {
	const path = await mkdtemp(join(tmpdir(), "gt-ss-test-"));

	const git = async (...args: string[]) => {
		const proc = Bun.spawn(["git", ...args], {
			cwd: path,
			stdout: "pipe",
			stderr: "pipe",
		});

		const stdout = await new Response(proc.stdout).text();
		const exitCode = await proc.exited;

		return { stdout: stdout.trim(), exitCode };
	};

	// Initialize repository
	await git("init");
	await git("config", "user.email", "test@test.com");
	await git("config", "user.name", "Test User");

	// Create initial commit on main
	await Bun.write(join(path, "README.md"), "# Test Repo\n");
	await git("add", "README.md");
	await git("commit", "-m", "Initial commit");
	await git("branch", "-M", "main");

	const createCommit = async (message: string, fileName?: string) => {
		const file = fileName || `file-${Date.now()}.txt`;
		await Bun.write(join(path, file), `Content for ${message}\n`);
		await git("add", file);
		await git("commit", "-m", message);
	};

	const createBranch = async (name: string) => {
		await git("checkout", "-b", name);
	};

	const checkoutBranch = async (name: string) => {
		await git("checkout", name);
	};

	const cleanup = async () => {
		await rm(path, { recursive: true, force: true });
	};

	return {
		path,
		cleanup,
		git,
		createCommit,
		createBranch,
		checkoutBranch,
	};
};

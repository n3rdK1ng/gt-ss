/**
 * Shell command execution wrapper using Bun.spawn
 *
 * Note: Bun.spawn is safe from shell injection as it uses execve directly,
 * similar to Node's execFile. Arguments are passed as an array, not a string.
 */

import type { ExecOptions } from "#/shell/types";
import { commandFailed } from "#/utils/errors";
import type { CommandParams } from "#/utils/params";
import { err, ok } from "#/utils/result";

type ExecParams = {
	command: string;
	args: string[];
	options?: ExecOptions;
};

/**
 * Execute a command and return the result
 */
export const exec = async ({ command, args, options = {} }: ExecParams) => {
	const spawnOptions: Parameters<typeof Bun.spawn>[1] = {
		cwd: options.cwd,
		env: { ...process.env, ...options.env },
		stdout: "pipe",
		stderr: "pipe",
	};

	// Add timeout if specified
	if (options.timeout !== undefined) {
		spawnOptions.signal = AbortSignal.timeout(options.timeout);
	}

	const proc = Bun.spawn([command, ...args], spawnOptions);

	const [stdout, stderr] = await Promise.all([
		new Response(proc.stdout as ReadableStream).text(),
		new Response(proc.stderr as ReadableStream).text(),
	]);

	const exitCode = await proc.exited;

	return {
		exitCode,
		stdout: stdout.trim(),
		stderr: stderr.trim(),
	};
};

type ExecResultParams = {
	command: string;
	args: string[];
	options?: ExecOptions;
};

/**
 * Execute a command and return a Result type
 * Errors are allowed to propagate and will be caught by the global error handler
 */
export const execResult = async ({
	command,
	args,
	options,
}: ExecResultParams) => {
	const result = await exec({ command, args, options });

	if (result.exitCode !== 0) {
		return err(
			commandFailed({
				command: `${command} ${args.join(" ")}`,
				cause: result.stderr || result.stdout || "Command failed",
			}),
		);
	}

	return ok(result);
};

type GitParams = {
	args: string[];
	options?: ExecOptions;
};

/**
 * Execute a git command
 */
export const git = async ({ args, options = {} }: GitParams) => {
	return exec({ command: "git", args, options });
};

type GhParams = {
	args: string[];
	options?: ExecOptions;
};

/**
 * Execute a gh (GitHub CLI) command
 */
export const gh = async ({ args, options = {} }: GhParams) => {
	return exec({ command: "gh", args, options });
};

/**
 * Check if a command exists in PATH
 */
export const commandExists = async ({ command }: CommandParams) => {
	const result = await exec({ command: "which", args: [command] });
	return result.exitCode === 0;
};

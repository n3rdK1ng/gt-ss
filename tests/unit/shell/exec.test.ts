/**
 * Tests for shell execution utilities
 *
 * Note: The exec function in src/shell/exec.ts uses Bun.spawn which is safe
 * from shell injection (similar to execFile, not exec).
 */

import { describe, expect, test } from "bun:test";
import { commandExists, exec } from "#/shell/exec";

describe("Shell execution", () => {
	describe("exec", () => {
		test("executes command and returns output", async () => {
			const result = await exec({ command: "echo", args: ["hello"] });
			expect(result.exitCode).toBe(0);
			expect(result.stdout).toBe("hello");
		});

		test("returns exit code for failed commands", async () => {
			const result = await exec({ command: "false", args: [] });
			expect(result.exitCode).not.toBe(0);
		});

		test("captures stderr", async () => {
			const result = await exec({
				command: "sh",
				args: ["-c", "echo error >&2"],
			});
			expect(result.stderr).toBe("error");
		});

		test("handles multiple arguments", async () => {
			const result = await exec({ command: "echo", args: ["hello", "world"] });
			expect(result.stdout).toBe("hello world");
		});
	});

	describe("commandExists", () => {
		test("returns true for existing commands", async () => {
			const exists = await commandExists({ command: "echo" });
			expect(exists).toBe(true);
		});

		test("returns false for non-existing commands", async () => {
			const exists = await commandExists({
				command: "nonexistent-command-12345",
			});
			expect(exists).toBe(false);
		});
	});
});

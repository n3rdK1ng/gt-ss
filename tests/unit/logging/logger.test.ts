/**
 * Tests for logging utilities
 */

import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { log } from "#/logging/logger";

describe("Logger", () => {
	let consoleSpy: ReturnType<typeof spyOn>;
	let consoleErrorSpy: ReturnType<typeof spyOn>;

	beforeEach(() => {
		consoleSpy = spyOn(console, "log").mockImplementation(() => {});
		consoleErrorSpy = spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		consoleSpy.mockRestore();
		consoleErrorSpy.mockRestore();
	});

	test("log.info outputs message", () => {
		log.info("test message");
		expect(consoleSpy).toHaveBeenCalledWith("test message");
	});

	test("log.success outputs message with checkmark", () => {
		log.success("success message");
		expect(consoleSpy).toHaveBeenCalledWith("   \u2705 success message");
	});

	test("log.warning outputs message with warning sign", () => {
		log.warning("warning message");
		expect(consoleSpy).toHaveBeenCalledWith("   \u26A0\uFE0F  warning message");
	});

	test("log.skip outputs message with skip sign", () => {
		log.skip("skip message");
		expect(consoleSpy).toHaveBeenCalledWith("   \u23ED\uFE0F  skip message");
	});

	test("log.error outputs to stderr", () => {
		log.error("error message");
		expect(consoleErrorSpy).toHaveBeenCalledWith("\u274C error message");
	});

	test("log.blank outputs empty line", () => {
		log.blank();
		expect(consoleSpy).toHaveBeenCalledWith("");
	});
});

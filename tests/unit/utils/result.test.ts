/**
 * Tests for Result pattern utilities
 */

import { describe, expect, test } from "bun:test";
import {
	andThen,
	err,
	isErr,
	isOk,
	map,
	mapErr,
	ok,
	unwrap,
	unwrapOr,
} from "#/utils/result";

describe("Result pattern", () => {
	describe("ok", () => {
		test("creates a successful result", () => {
			const result = ok(42);
			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value).toBe(42);
			}
		});

		test("works with any type", () => {
			const result = ok({ name: "test" });
			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value).toEqual({ name: "test" });
			}
		});
	});

	describe("err", () => {
		test("creates an error result", () => {
			const error = new Error("test error");
			const result = err(error);
			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error).toBe(error);
			}
		});

		test("works with custom error types", () => {
			const result = err({ code: "TEST", message: "test" });
			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error).toEqual({ code: "TEST", message: "test" });
			}
		});
	});

	describe("isOk and isErr", () => {
		test("isOk returns true for ok result", () => {
			expect(isOk(ok(42))).toBe(true);
			expect(isOk(err("error"))).toBe(false);
		});

		test("isErr returns true for err result", () => {
			expect(isErr(err("error"))).toBe(true);
			expect(isErr(ok(42))).toBe(false);
		});
	});

	describe("unwrap", () => {
		test("returns value for ok result", () => {
			expect(unwrap({ result: ok(42) })).toBe(42);
		});

		test("throws for err result", () => {
			const error = new Error("test error");
			expect(() => unwrap({ result: err(error) })).toThrow(error);
		});
	});

	describe("unwrapOr", () => {
		test("returns value for ok result", () => {
			expect(unwrapOr({ result: ok(42), defaultValue: 0 })).toBe(42);
		});

		test("returns default for err result", () => {
			expect(unwrapOr({ result: err("error"), defaultValue: 0 })).toBe(0);
		});
	});

	describe("map", () => {
		test("transforms value for ok result", () => {
			const result = map({ result: ok(2), fn: (x) => x * 2 });
			expect(result).toEqual(ok(4));
		});

		test("passes through err result", () => {
			const error = err("error");
			const result = map({ result: error, fn: (x: number) => x * 2 });
			expect(result).toEqual(error);
		});
	});

	describe("mapErr", () => {
		test("passes through ok result", () => {
			const result = mapErr({
				result: ok(42),
				fn: (e: string) => e.toUpperCase(),
			});
			expect(result).toEqual(ok(42));
		});

		test("transforms error for err result", () => {
			const result = mapErr({
				result: err("error"),
				fn: (e) => e.toUpperCase(),
			});
			expect(result).toEqual(err("ERROR"));
		});
	});

	describe("andThen", () => {
		test("chains ok results", () => {
			const result = andThen({ result: ok(2), fn: (x) => ok(x * 2) });
			expect(result).toEqual(ok(4));
		});

		test("short-circuits on err", () => {
			const result = andThen({
				result: err("error"),
				fn: (x: number) => ok(x * 2),
			});
			expect(result).toEqual(err("error"));
		});

		test("propagates new error from chain", () => {
			const result = andThen({ result: ok(2), fn: () => err("new error") });
			expect(result).toEqual(err("new error"));
		});
	});
});

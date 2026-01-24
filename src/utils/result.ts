/**
 * Result type for explicit error handling
 */

export type Result<T, E = Error> =
	| { ok: true; value: T }
	| { ok: false; error: E };

export const ok = <T>(value: T): Result<T, never> => ({
	ok: true,
	value,
});

export const err = <E>(error: E): Result<never, E> => ({
	ok: false,
	error,
});

export const isOk = <T, E>(
	result: Result<T, E>,
): result is { ok: true; value: T } => result.ok;

export const isErr = <T, E>(
	result: Result<T, E>,
): result is { ok: false; error: E } => !result.ok;

type UnwrapParams<T, E> = {
	result: Result<T, E>;
};

export const unwrap = <T, E>({ result }: UnwrapParams<T, E>) => {
	if (result.ok) {
		return result.value;
	}
	throw result.error;
};

type UnwrapOrParams<T, E> = {
	result: Result<T, E>;
	defaultValue: T;
};

export const unwrapOr = <T, E>({
	result,
	defaultValue,
}: UnwrapOrParams<T, E>) => {
	if (result.ok) {
		return result.value;
	}
	return defaultValue;
};

type MapParams<T, U, E> = {
	result: Result<T, E>;
	fn: (value: T) => U;
};

export const map = <T, U, E>({ result, fn }: MapParams<T, U, E>) => {
	if (result.ok) {
		return ok(fn(result.value));
	}
	return result;
};

type MapErrParams<T, E, F> = {
	result: Result<T, E>;
	fn: (error: E) => F;
};

export const mapErr = <T, E, F>({ result, fn }: MapErrParams<T, E, F>) => {
	if (!result.ok) {
		return err(fn(result.error));
	}
	return result;
};

type AndThenParams<T, U, E> = {
	result: Result<T, E>;
	fn: (value: T) => Result<U, E>;
};

export const andThen = <T, U, E>({ result, fn }: AndThenParams<T, U, E>) => {
	if (result.ok) {
		return fn(result.value);
	}
	return result;
};

/**
 * Global error handler for the CLI application
 * Handles unhandled promise rejections and uncaught exceptions
 */

import { log } from "#/logging/logger";
import type { AppError } from "#/utils/errors";
import type { ErrorParams } from "#/utils/params";

/**
 * Internal type guard (cannot use type predicate with destructured params)
 * This is an exception to the rule - type predicates require positional parameters
 */
const isAppErrorType = (error: unknown): error is AppError => {
	return (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		"message" in error &&
		typeof (error as AppError).code === "string" &&
		typeof (error as AppError).message === "string"
	);
};

/**
 * Format error message for display
 */
const formatError = ({ error }: ErrorParams) => {
	if (isAppErrorType(error)) {
		return error.message;
	}

	if (error instanceof Error) {
		return error.message;
	}

	if (typeof error === "string") {
		return error;
	}

	return "An unexpected error occurred";
};

/**
 * Get error details for logging (cause, stack, etc.)
 */
const getErrorDetails = ({ error }: ErrorParams) => {
	const details: string[] = [];

	if (error instanceof Error && error.stack) {
		// Only show stack trace in development/debug mode
		if (process.env.DEBUG || process.env.NODE_ENV === "development") {
			details.push(`Stack trace:\n${error.stack}`);
		}
	}

	if (isAppErrorType(error)) {
		if (error.cause instanceof Error) {
			details.push(`Cause: ${error.cause.message}`);
		} else if (typeof error.cause === "string") {
			details.push(`Cause: ${error.cause}`);
		}
	}

	return details;
};

type HandleErrorParams = ErrorParams & {
	source: "unhandledRejection" | "uncaughtException";
};

/**
 * Handle an error and exit the process
 */
const handleError = ({ error, source: _source }: HandleErrorParams) => {
	const message = formatError({ error });
	const details = getErrorDetails({ error });

	log.blank();
	log.error(message);

	if (details.length > 0) {
		details.forEach((detail) => {
			log.info(`   ${detail}`);
		});
	}

	// Exit with error code (currently always 1)
	// Future: Map specific error codes to different exit codes here
	// Example: if (isAppErrorType(error) && error.code === "GIT_NOT_FOUND") exitCode = 2;
	const exitCode = 1;
	process.exit(exitCode);
};

/**
 * Setup global error handlers
 */
export const setupGlobalErrorHandlers = () => {
	// Handle unhandled promise rejections
	process.on("unhandledRejection", (reason) => {
		handleError({ error: reason, source: "unhandledRejection" });
	});

	// Handle uncaught exceptions
	process.on("uncaughtException", (error) => {
		handleError({ error, source: "uncaughtException" });
	});
};

type WithErrorHandlingParams<T> = {
	fn: () => Promise<T>;
};

/**
 * Wrap an async function with error handling
 * This allows errors to be thrown and caught by the global handler
 */
export const withErrorHandling = async <T>({
	fn,
}: WithErrorHandlingParams<T>) => {
	try {
		return await fn();
	} catch (error) {
		handleError({ error, source: "unhandledRejection" });
		// This line should never be reached, but TypeScript needs it
		throw error;
	}
};

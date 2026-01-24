#!/usr/bin/env bun
/**
 * CLI entry point for stack-submit
 */

import { submitStack } from "#/stack/submit";
import {
	setupGlobalErrorHandlers,
	withErrorHandling,
} from "#/utils/error-handler";

// Setup global error handlers for unhandled rejections and exceptions
setupGlobalErrorHandlers();

// Run the main function with error handling
await withErrorHandling({
	fn: submitStack,
});

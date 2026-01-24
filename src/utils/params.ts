/**
 * Shared parameter types for function parameters
 * These base types can be extended when additional fields are needed
 */

/**
 * Base type for error parameters
 */
export type ErrorParams = {
	error: unknown;
};

/**
 * Base type for branch parameters
 */
export type BranchParams = {
	branch: string;
};

/**
 * Base type for error cause parameters
 */
export type CauseParams = {
	cause?: unknown;
};

/**
 * Base type for command parameters
 */
export type CommandParams = {
	command: string;
};

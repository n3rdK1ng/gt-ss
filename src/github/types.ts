/**
 * GitHub types
 */

/**
 * PR creation result codes
 * - 0: Success (PR created or already exists)
 * - 1: Error (failed to create)
 * - 2: Skip without chain update (branch not pushed or same as base)
 * - 3: Skip with chain update (no commits, but maintain chain structure)
 */
export type PrResultCode = 0 | 1 | 2 | 3;

export type PrCreationResult = {
	code: PrResultCode;
	branch: string;
	prNumber?: number;
	prUrl?: string;
	message: string;
};

/**
 * Shell execution types
 */

export type ExecResult = {
	exitCode: number;
	stdout: string;
	stderr: string;
};

export type ExecOptions = {
	cwd?: string;
	env?: Record<string, string>;
	timeout?: number;
};

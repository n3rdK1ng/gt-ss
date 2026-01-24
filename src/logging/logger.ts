/**
 * Logging utilities with emoji indicators
 */

export const log = {
	info: (message: string) => {
		console.log(message);
	},

	success: (message: string) => {
		console.log(`   \u2705 ${message}`);
	},

	warning: (message: string) => {
		console.log(`   \u26A0\uFE0F  ${message}`);
	},

	skip: (message: string) => {
		console.log(`   \u23ED\uFE0F  ${message}`);
	},

	error: (message: string) => {
		console.error(`\u274C ${message}`);
	},

	blank: () => {
		console.log("");
	},
};

export type Logger = typeof log;

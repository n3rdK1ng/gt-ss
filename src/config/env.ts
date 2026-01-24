/**
 * Environment variable parsing
 */

type ParseBoolEnvParams = {
	value: string | undefined;
};

/**
 * Parse boolean environment variable
 */
const parseBoolEnv = ({ value }: ParseBoolEnvParams) => {
	return value === "1" || value?.toLowerCase() === "true";
};

/**
 * Parse configuration from environment variables
 */
export const parseEnv = () => {
	return {
		allowForcePush: parseBoolEnv({ value: process.env.ALLOW_FORCE_PUSH }),
	};
};

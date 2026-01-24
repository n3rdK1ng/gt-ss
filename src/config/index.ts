/**
 * Configuration module
 */

import { parseEnv } from "#/config/env";
import { type Config, configSchema } from "#/config/schema";

export type { Config };

let cachedConfig: Config | null = null;

/**
 * Get the application configuration
 * Configuration is parsed once and cached
 */
export const getConfig = (): Config => {
	if (cachedConfig === null) {
		const envConfig = parseEnv();
		const result = configSchema.safeParse(envConfig);

		if (result.success) {
			cachedConfig = result.data;
		} else {
			// Fall back to defaults on parse error
			cachedConfig = {
				allowForcePush: false,
			};
		}
	}

	return cachedConfig;
};

/**
 * Reset the cached configuration (useful for testing)
 */
export const resetConfig = () => {
	cachedConfig = null;
};

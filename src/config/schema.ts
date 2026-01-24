/**
 * Configuration schema using Zod
 */

import { z } from "zod/v4";

export const configSchema = z.object({
	allowForcePush: z.boolean().default(false),
});

export type Config = z.infer<typeof configSchema>;

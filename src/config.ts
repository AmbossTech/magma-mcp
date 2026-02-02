import { z } from 'zod';
import dotenv from 'dotenv';

/**
 * Configuration schema for Magma MCP server
 * Validates all required environment variables and provides defaults
 */
const configSchema = z.object({
  magmaApiKey: z.string().optional(),
  magmaEndpoint: z.string().url().default("https://magma.amboss.tech/graphql"),
  logLevel: z.enum(["debug", "info", "warn", "error"]).default("info")
});

export type Config = z.infer<typeof configSchema>;

/**
 * Loads and validates configuration from environment variables
 * Exits process if validation fails (fail-fast approach)
 *
 * @returns Validated configuration object
 */
export function loadConfig(): Config {
  // Load environment variables from .env file
  dotenv.config();

  const rawConfig = {
    magmaApiKey: process.env.MAGMA_API_KEY,
    magmaEndpoint: process.env.MAGMA_GRAPHQL_ENDPOINT,
    logLevel: process.env.LOG_LEVEL
  };

  try {
    const config = configSchema.parse(rawConfig);

    // Log successful configuration loading (to stderr)
    console.error(`[${config.logLevel.toUpperCase()}] Configuration loaded successfully`);

    return config;
  } catch (error) {
    console.error("Configuration validation failed:");
    if (error instanceof z.ZodError) {
      error.issues.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
    } else {
      console.error(error);
    }
    process.exit(1);
  }
}

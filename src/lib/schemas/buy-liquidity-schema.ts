import { z } from 'zod';
import {
  connectionUriSchema,
  usdCentsSchema,
  redirectUrlSchema,
  privateChannelSchema,
  railsClusterOnlySchema
} from './common-schemas.js';

/**
 * Complete input schema for buy_lightning_liquidity tool
 * Validates all parameters for buying Lightning Network liquidity via Magma
 */
export const buyLiquiditySchema = z.object({
  connection_uri: connectionUriSchema,
  usd_cents: usdCentsSchema,
  redirect_url: redirectUrlSchema,
  private_channel: privateChannelSchema,
  rails_cluster_only: railsClusterOnlySchema
});

/**
 * Type inference from schema
 */
export type BuyLiquidityInput = z.infer<typeof buyLiquiditySchema>;

/**
 * Helper to validate and parse buy liquidity input
 * Throws ZodError if validation fails
 *
 * @param input - Raw input to validate
 * @returns Parsed and validated input
 */
export function validateBuyLiquidityInput(input: unknown): BuyLiquidityInput {
  return buyLiquiditySchema.parse(input);
}

/**
 * Helper to safely validate input and return result or errors
 *
 * @param input - Raw input to validate
 * @returns Success with data or failure with errors
 */
export function safeParseBuyLiquidityInput(input: unknown) {
  return buyLiquiditySchema.safeParse(input);
}

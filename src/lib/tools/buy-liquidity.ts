import { z } from 'zod';
import { MagmaGraphQLClient, ErrorCategory, type MagmaClientError } from '../graphql-client.js';
import { validateBuyLiquidityInput } from '../schemas/buy-liquidity-schema.js';
import type { LiquidityOrderInput, BuyLiquidityResult, MagmaError } from '../../types/magma.js';

/**
 * Handle buy_lightning_liquidity tool execution
 *
 * @param client - Initialized Magma GraphQL client
 * @param args - Raw arguments from MCP tool call
 * @returns MCP tool result with content and isError flag
 */
export async function handleBuyLiquidity(
  client: MagmaGraphQLClient,
  args: unknown
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  try {
    // Phase 1: Validate input
    const validatedInput = validateBuyLiquidityInput(args);

    // Phase 2: Transform to GraphQL input format
    const orderInput: LiquidityOrderInput = {
      connection_uri: validatedInput.connection_uri,
      usd_cents: validatedInput.usd_cents.toString(),
      redirect_url: validatedInput.redirect_url,
      options: {
        private: validatedInput.private_channel,
        rails_cluster_only: validatedInput.rails_cluster_only
      }
    };

    // Phase 3: Execute GraphQL mutation
    const response = await client.buyLiquidity(orderInput);

    const {buy} = response.liquidity

    // Phase 4: Transform response to MCP format
    const result: BuyLiquidityResult = {
      success: true,
      lightning_invoice: buy.payment.lightning_invoice
    };

    // Return formatted success response
    return {
      content: [{
        type: "text",
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    // Handle validation errors (Zod)
    if (error instanceof z.ZodError) {
      const validationError: MagmaError = {
        code: 'VALIDATION_ERROR',
        message: 'Input validation failed',
        details: {
          errors: error.issues.map(err => ({
            path: err.path.join('.'),
            message: err.message
          }))
        }
      };

      return {
        content: [{
          type: "text",
          text: JSON.stringify(validationError, null, 2)
        }],
        isError: true
      };
    }

    // Handle GraphQL client errors
    if (isClientError(error)) {
      const magmaError: MagmaError = {
        code: error.category,
        message: error.message,
        details: error.statusCode ? { statusCode: error.statusCode } : undefined
      };

      return {
        content: [{
          type: "text",
          text: JSON.stringify(magmaError, null, 2)
        }],
        isError: true
      };
    }

    // Handle unknown errors
    const unknownError: MagmaError = {
      code: 'UNKNOWN_ERROR',
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    };

    return {
      content: [{
        type: "text",
        text: JSON.stringify(unknownError, null, 2)
      }],
      isError: true
    };
  }
}

/**
 * Type guard to check if error is a MagmaClientError
 */
function isClientError(error: unknown): error is MagmaClientError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'category' in error &&
    'message' in error &&
    Object.values(ErrorCategory).includes((error as MagmaClientError).category)
  );
}

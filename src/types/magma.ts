/**
 * TypeScript types for Magma GraphQL API
 * Based on https://docs.amboss.tech/magma/buy-liquidity
 */

/**
 * Input for buying liquidity via Magma
 */
export interface LiquidityOrderInput {
  /** Node connection string: either just pubkey or pubkey@host:port */
  connection_uri: string;
  /** Dollar amount in cents as string (minimum 500 = $5.00) */
  usd_cents: string;
  /** Optional post-payment redirect URL */
  redirect_url?: string;
  /** Additional options for the liquidity order */
  options?: {
    /** Create private channel (default: false) */
    private?: boolean;
    /** Source liquidity only from Rails cluster nodes (default: false) */
    rails_cluster_only?: boolean;
  };
}

/**
 * Account information returned from Magma API
 */
export interface MagmaAccount {
  /** Session key for future API requests */
  session_key: string;
  /** Account ID */
  id: string;
}

/**
 * Order details returned from Magma API
 */
export interface MagmaOrder {
  /** Unique transaction identifier */
  transaction_id: string;
  /** Order amount in USD cents */
  usd_cents: number;
}

/**
 * Payment information for completing the liquidity purchase
 *
 * Both fields are nullable in the GraphQL schema (defensive for future
 * payment providers without a hosted checkout page), though the current
 * resolver always populates them.
 */
export interface MagmaPayment {
  /** A `lightning:<invoice>` URI for the current payment method, or a hosted checkout URL for legacy/fallback orders. Optional per the GraphQL schema. */
  redirect_url: string;
  /** Lightning invoice for payment. Optional per the GraphQL schema. */
  lightning_invoice: string;
}

/**
 * Complete response from Magma buy liquidity mutation
 * Note: graphql-request library unwraps the response and returns data directly
 */
export interface BuyLiquidityResponse {
  liquidity: {
    buy: {
      payment: {
        lightning_invoice: string;
      };
    };
  }
}

/**
 * Formatted response for MCP tool output
 */
export interface BuyLiquidityResult {
  success: boolean;
  lightning_invoice: string;
}

/**
 * Error response structure
 */
export interface MagmaError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * High-level Node.js client for Amboss Magma API
 * Provides a JavaScript-friendly interface for buying Lightning Network liquidity
 */

import { MagmaGraphQLClient } from './lib/graphql-client.js';
import type { Config } from './config.js';

/**
 * Configuration options for MagmaClient
 */
export interface MagmaClientConfig {
  /** Amboss Magma API key (optional for anonymous access) */
  apiKey?: string;
  /** GraphQL endpoint URL (defaults to production) */
  endpoint?: string;
  /** Logging level for client operations */
  logLevel?: 'debug' | 'info' | 'error';
}

/**
 * Options for buying Lightning Network liquidity
 */
export interface BuyLiquidityOptions {
  /** Node connection string: either just pubkey or pubkey@host:port */
  connectionUri: string;
  /** Dollar amount in cents (minimum 500 = $5.00) */
  usdCents: number;
  /** Optional post-payment redirect URL */
  redirectUrl?: string;
  /** Create private channel (default: false) */
  privateChannel?: boolean;
  /** Source liquidity only from Rails cluster nodes (default: false) */
  railsClusterOnly?: boolean;
}

/**
 * High-level client for the Amboss Magma API
 *
 * @example
 * ```typescript
 * import { MagmaClient } from '@ambosstech/magma-mcp';
 *
 * const client = new MagmaClient({
 *   apiKey: 'your-api-key'
 * });
 *
 * const invoice = await client.buyLiquidity({
 *   connectionUri: '03abc...@192.168.1.1:9735',
 *   usdCents: 1000
 * });
 *
 * console.log('Pay this invoice:', invoice);
 * ```
 */
export class MagmaClient {
  private graphqlClient: MagmaGraphQLClient;

  /**
   * Create a new Magma API client
   *
   * @param config - Optional configuration for the client
   */
  constructor(config?: MagmaClientConfig) {
    // Build Config object with defaults
    const fullConfig: Config = {
      magmaApiKey: config?.apiKey,
      magmaEndpoint: config?.endpoint || 'https://magma.amboss.tech/graphql',
      logLevel: config?.logLevel || 'error'
    };

    this.graphqlClient = new MagmaGraphQLClient(fullConfig);
  }

  /**
   * Purchase inbound Lightning Network liquidity for a node
   *
   * Opens a channel TO your node, giving you receiving capacity.
   * The liquidity purchase requires a minimum of $5.00 (500 cents).
   *
   * @param options - Liquidity purchase options
   * @returns Lightning invoice string to complete the payment
   * @throws {MagmaClientError} On API or network errors
   *
   * @example
   * ```typescript
   * const invoice = await client.buyLiquidity({
   *   connectionUri: '024ae5a5f0b01850983009489ca89c85...@12.34.56.78:9735',
   *   usdCents: 500  // $5.00 minimum
   * });
   * ```
   */
  async buyLiquidity(options: BuyLiquidityOptions): Promise<string> {
    // Validate minimum amount
    if (options.usdCents < 500) {
      throw new Error('Minimum purchase amount is 500 cents ($5.00)');
    }

    // Transform to GraphQL format
    const input = {
      connection_uri: options.connectionUri,
      usd_cents: options.usdCents.toString(),
      redirect_url: options.redirectUrl,
      options: {
        private: options.privateChannel,
        rails_cluster_only: options.railsClusterOnly
      }
    };

    // Call GraphQL client
    const response = await this.graphqlClient.buyLiquidity(input);

    // Return just the invoice string
    return response.liquidity.buy.payment.lightning_invoice;
  }
}

import { GraphQLClient, ClientError } from 'graphql-request';
import type { Config } from '../config.js';
import type { LiquidityOrderInput, BuyLiquidityResponse } from '../types/magma.js';
import packageJson from '../../package.json' with { type: 'json' };

/**
 * Error categories for better error handling
 */
export enum ErrorCategory {
  CLIENT_ERROR = 'CLIENT_ERROR', // 4xx errors (bad request, auth failure, etc.)
  SERVER_ERROR = 'SERVER_ERROR', // 5xx errors (server issues)
  NETWORK_ERROR = 'NETWORK_ERROR', // Network connectivity issues
  UNKNOWN_ERROR = 'UNKNOWN_ERROR' // Other errors
}

/**
 * Structured error response
 */
export interface MagmaClientError {
  category: ErrorCategory;
  message: string;
  statusCode?: number;
  originalError?: unknown;
}

/**
 * GraphQL client for Magma API
 * Handles authentication, requests, and error transformation
 */
export class MagmaGraphQLClient {
  private client: GraphQLClient;
  private config: Config;

  /**
   * GraphQL mutation for buying liquidity
   */
  private readonly BUY_LIQUIDITY_MUTATION = `
    mutation BuyLiquidity($input: LiquidityOrderInput!) {
      liquidity {
        buy(input: $input) {
          payment {
            lightning_invoice
          }
        }
      }
    }
  `;

  constructor(config: Config) {
    this.config = config;

    // Build headers - only add Authorization if API key is provided
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'apollographql-client-name': 'magma-mcp',
      'apollographql-client-version': packageJson.version
    };

    if (config.magmaApiKey) {
      headers['Authorization'] = `Bearer ${config.magmaApiKey}`;
      console.error(`[${config.logLevel.toUpperCase()}] GraphQL client initialized with API key`);
    } else {
      console.error(`[${config.logLevel.toUpperCase()}] GraphQL client initialized with anonymous access`);
    }

    this.client = new GraphQLClient(config.magmaEndpoint, { headers });
  }

  /**
   * Buy Lightning Network liquidity via Magma
   *
   * @param input - Liquidity order parameters
   * @returns Promise resolving to buy liquidity response
   * @throws {MagmaClientError} On API or network errors
   */
  async buyLiquidity(input: LiquidityOrderInput): Promise<BuyLiquidityResponse> {
    try {
      // Extract pubkey for logging (handle both formats: pubkey or pubkey@host:port)
      const pubkey = input.connection_uri.includes('@')
        ? input.connection_uri.split('@')[0]
        : input.connection_uri;

      if (this.config.logLevel === 'debug') {
        console.error(`[DEBUG] Requesting liquidity purchase: ${input.usd_cents} cents for ${pubkey?.substring(0, 16)}...`);
      }

      const response = await this.executeWithRetry<BuyLiquidityResponse>(
        this.BUY_LIQUIDITY_MUTATION,
        { input }
      );

      if (this.config.logLevel === 'debug') {
        console.error(`[DEBUG] Response: ${JSON.stringify(response, null, 2)}`);
      }

      const { buy } = response.liquidity;

      if (this.config.logLevel === 'debug' || this.config.logLevel === 'info') {
        console.error(`[INFO] Liquidity purchase successful. Lightning invoice: ${buy.payment.lightning_invoice.substring(0, 50)}...`);
      }

      return response;
    } catch (error) {
      const structuredError = this.transformError(error);
      console.error(`[ERROR] Liquidity purchase failed: ${structuredError.message}`);
      throw structuredError;
    }
  }

  /**
   * Execute GraphQL request with retry logic for transient failures
   *
   * @param query - GraphQL query or mutation
   * @param variables - Query variables
   * @param retries - Number of retries remaining (default: 2)
   * @returns Promise resolving to GraphQL response
   */
  private async executeWithRetry<T>(
    query: string,
    variables: Record<string, unknown>,
    retries: number = 2
  ): Promise<T> {
    try {
      return await this.client.request<T>(query, variables);
    } catch (error) {
      // Retry on network errors or 5xx server errors
      if (retries > 0 && this.isRetriableError(error)) {
        const delay = (3 - retries) * 1000; // Exponential backoff: 1s, 2s
        console.error(`[WARN] Retrying request in ${delay}ms... (${retries} retries remaining)`);
        await this.sleep(delay);
        return this.executeWithRetry<T>(query, variables, retries - 1);
      }
      throw error;
    }
  }

  /**
   * Check if an error is retriable (network or server errors)
   */
  private isRetriableError(error: unknown): boolean {
    if (error instanceof ClientError) {
      const statusCode = error.response.status;
      // Retry on 5xx errors and 429 (rate limit)
      return statusCode >= 500 || statusCode === 429;
    }
    // Retry on network errors
    if (error instanceof Error) {
      return error.message.includes('ECONNREFUSED') ||
             error.message.includes('ETIMEDOUT') ||
             error.message.includes('ENOTFOUND');
    }
    return false;
  }

  /**
   * Transform raw errors into structured MagmaClientError
   */
  private transformError(error: unknown): MagmaClientError {
    // GraphQL client errors (4xx, 5xx responses)
    if (error instanceof ClientError) {
      const statusCode = error.response.status;

      if (statusCode >= 400 && statusCode < 500) {
        return {
          category: ErrorCategory.CLIENT_ERROR,
          message: this.getClientErrorMessage(statusCode, error),
          statusCode,
          originalError: error
        };
      }

      if (statusCode >= 500) {
        return {
          category: ErrorCategory.SERVER_ERROR,
          message: 'Magma API server error. Please try again later.',
          statusCode,
          originalError: error
        };
      }
    }

    // Network errors
    if (error instanceof Error) {
      if (error.message.includes('ECONNREFUSED') ||
          error.message.includes('ETIMEDOUT') ||
          error.message.includes('ENOTFOUND')) {
        return {
          category: ErrorCategory.NETWORK_ERROR,
          message: 'Network error: Unable to reach Magma API. Please check your internet connection.',
          originalError: error
        };
      }
    }

    // Unknown errors
    return {
      category: ErrorCategory.UNKNOWN_ERROR,
      message: error instanceof Error ? error.message : 'An unknown error occurred',
      originalError: error
    };
  }

  /**
   * Get user-friendly error message for client errors (4xx)
   */
  private getClientErrorMessage(statusCode: number, error: ClientError): string {
    switch (statusCode) {
      case 401:
        return 'Authentication failed. If using an API key, please check your MAGMA_API_KEY. Otherwise, anonymous access should work automatically.';
      case 403:
        return 'Access forbidden. Your API key may not have the required permissions.';
      case 404:
        return 'API endpoint not found. Please check your MAGMA_GRAPHQL_ENDPOINT configuration.';
      case 429:
        return 'Rate limit exceeded. Please try again later.';
      default:
        // Try to extract error message from GraphQL response
        const graphqlErrors = error.response.errors;
        if (graphqlErrors && graphqlErrors.length > 0) {
          return `Request failed: ${graphqlErrors[0]?.message || 'Invalid request'}`;
        }
        return 'Invalid request. Please check your input parameters.';
    }
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

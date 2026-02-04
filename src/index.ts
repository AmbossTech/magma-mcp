/**
 * @ambosstech/magma-mcp
 *
 * Node.js client library for the Amboss Magma API
 * Also available as an MCP server for Claude Desktop
 */

// Export high-level client (recommended for most users)
export { MagmaClient } from './client.js';
export type { MagmaClientConfig, BuyLiquidityOptions } from './client.js';

// Export types for advanced users
export type {
  LiquidityOrderInput,
  BuyLiquidityResponse,
  MagmaError,
  MagmaAccount,
  MagmaOrder,
  MagmaPayment,
  BuyLiquidityResult
} from './types/magma.js';

// Export low-level GraphQL client for advanced use cases
export { MagmaGraphQLClient, ErrorCategory } from './lib/graphql-client.js';
export type { MagmaClientError } from './lib/graphql-client.js';

// Export config types
export type { Config } from './config.js';

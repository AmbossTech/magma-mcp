import { z } from 'zod';

/**
 * Regex pattern for Lightning Network connection URI
 * Format 1: Just pubkey (66-character hex)
 * Format 2: pubkey @ host : port
 * Examples:
 *   - 024ae5a5f0b01850983009489ca89c85fdf...
 *   - 024ae5a5f0b01850983009489ca89c85fdf...@12.34.56.78:9735
 */
const CONNECTION_URI_PATTERN = /^[0-9a-f]{66}(@[\w\.\-]+:\d{1,5})?$/i;

/**
 * Validates Lightning Network connection URI format
 * Accepts two formats:
 * 1. Just pubkey: 66-character hex string
 * 2. Pubkey with socket: pubkey@host:port
 */
export const connectionUriSchema = z
  .string()
  .regex(
    CONNECTION_URI_PATTERN,
    "Connection URI must be either a 66-character pubkey or pubkey@host:port format"
  )
  .refine(
    (uri) => {
      // If it contains @, validate port range
      if (uri.includes('@')) {
        const parts = uri.split('@');
        if (parts.length !== 2) return false;

        const hostPort = parts[1];
        if (!hostPort) return false;

        const portMatch = hostPort.match(/:(\d+)$/);
        if (!portMatch || !portMatch[1]) return false;

        const port = parseInt(portMatch[1], 10);
        return port > 0 && port <= 65535;
      }
      // If it's just a pubkey, the regex already validated the length
      return true;
    },
    "Port must be between 1 and 65535"
  )
  .describe("Node connection string: either pubkey or pubkey@host:port");

/**
 * Validates USD amount in cents
 * Minimum $5.00 (500 cents) as per Magma requirements
 */
export const usdCentsSchema = z
  .number()
  .int("Amount must be a whole number (cents)")
  .min(500, "Minimum purchase amount is $5.00 (500 cents)")
  .describe("Dollar amount in cents (minimum 500 = $5.00)");

/**
 * Validates optional redirect URL
 * Must be a valid HTTP or HTTPS URL
 */
export const redirectUrlSchema = z
  .string()
  .url("Redirect URL must be a valid URL (http:// or https://)")
  .optional()
  .describe("Optional post-payment redirect URL");

/**
 * Validates boolean option for private channels
 */
export const privateChannelSchema = z
  .boolean()
  .optional()
  .describe("Create private channel (default: false)");

/**
 * Validates boolean option for Rails cluster only
 */
export const railsClusterOnlySchema = z
  .boolean()
  .optional()
  .describe("Source liquidity only from Rails cluster nodes (default: false)");

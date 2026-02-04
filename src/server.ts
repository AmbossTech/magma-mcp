#!/usr/bin/env node

/**
 * Magma MCP Server
 * Model Context Protocol server for buying Lightning Network liquidity via Amboss Magma
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { loadConfig } from './config.js';
import { MagmaGraphQLClient } from './lib/graphql-client.js';
import { handleBuyLiquidity } from './lib/tools/buy-liquidity.js';

/**
 * Initialize and start the MCP server
 */
async function main() {
  // Load and validate configuration
  const config = loadConfig();

  // Initialize GraphQL client
  const graphqlClient = new MagmaGraphQLClient(config);

  // Create MCP server instance
  const server = new McpServer(
    {
      name: '@amboss/magma-mcp',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register tool: buy_lightning_liquidity
  server.registerTool(
    'buy_lightning_liquidity',
    {
      description: `Purchase inbound Lightning Network liquidity for a node via Amboss Magma.

This tool opens a channel TO your node, giving you receiving capacity. The liquidity purchase requires a minimum of $5.00 (500 cents).

Use this when you need to:
- Increase your node's inbound liquidity
- Accept Lightning payments
- Open channels to your node

Parameters:
- connection_uri: Your node's connection string (either just pubkey or pubkey@host:port)
  Examples:
    - 024ae5a5f0b01850983009489ca89c85... (just pubkey)
    - 024ae5a5f0b01850983009489ca89c85...@12.34.56.78:9735 (with socket)
- usd_cents: Dollar amount in cents (minimum 500 = $5.00)
- redirect_url: Optional URL to redirect after payment
- private_channel: Optional boolean to create a private channel (default: false)
- rails_cluster_only: Optional boolean to source only from Rails cluster (default: false)

Returns:
- lightning_invoice: Lightning invoice to complete payment`,
      inputSchema: {
        connection_uri: z.string().describe('Node connection string: either just pubkey or pubkey@host:port'),
        usd_cents: z.number().min(500).describe('Dollar amount in cents (minimum 500 = $5.00)'),
        redirect_url: z.string().optional().describe('Optional post-payment redirect URL'),
        private_channel: z.boolean().optional().describe('Create private channel (default: false)'),
        rails_cluster_only: z.boolean().optional().describe('Source liquidity only from Rails cluster nodes (default: false)')
      },
    },
    async (args): Promise<CallToolResult> => {
      console.error(`[INFO] Tool called: buy_lightning_liquidity`);

      try {
        return await handleBuyLiquidity(graphqlClient, args);
      } catch (error) {
        console.error(`[ERROR] Tool execution failed:`, error);
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              error: {
                code: 'TOOL_EXECUTION_ERROR',
                message: error instanceof Error ? error.message : 'Tool execution failed'
              }
            }, null, 2)
          }],
          isError: true
        };
      }
    }
  );

  // Setup STDIO transport
  const transport = new StdioServerTransport();

  // Connect server to transport
  await server.connect(transport);

  console.error('[INFO] Magma MCP server started successfully');

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.error('[INFO] Received SIGINT, shutting down gracefully...');
    await server.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.error('[INFO] Received SIGTERM, shutting down gracefully...');
    await server.close();
    process.exit(0);
  });
}

// Start the server
main().catch((error) => {
  console.error('[FATAL] Server failed to start:', error);
  process.exit(1);
});

# Magma MCP Server

Model Context Protocol (MCP) server for buying Lightning Network liquidity via [Amboss Magma](https://magma.amboss.tech/).

## Overview

This MCP server enables AI assistants like Claude to purchase inbound Lightning Network liquidity for your node through the Amboss Magma API. It provides a seamless way to increase your node's receiving capacity directly from conversations with Claude.

## Features

- **Buy Lightning Liquidity**: Purchase inbound liquidity for your Lightning node
- **Anonymous Access**: Works without an API key - the Magma API creates temporary accounts automatically
- **Optional Authentication**: Use your Amboss account API key for personalized access
- **Input Validation**: Comprehensive validation of all parameters
- **Error Handling**: Clear, user-friendly error messages
- **Retry Logic**: Automatic retry for transient network failures

## Prerequisites

- Node.js >= 18.0.0
- pnpm (or npm/yarn)
- A Lightning Network node with accessible connection URI
- (Optional) Amboss Magma API key ([Get one here](https://account.amboss.tech/settings/api-keys))

## Installation

### From npm (Recommended)

```bash
npm install -g @ambosstech/magma-mcp
```

Or with pnpm:

```bash
pnpm add -g @ambosstech/magma-mcp
```

### From source

```bash
git clone https://github.com/AmbossTech/magma-mcp.git
cd magma-mcp
pnpm install
pnpm build
```

### Configure environment variables (Optional)

The Magma API supports **anonymous access** - you can use the server without an API key! The API will automatically create temporary accounts with session keys.

If you want to use your existing Amboss account, create a `.env` file:

```bash
cp .env.example .env
```

Edit `.env` and add your Magma API key:

```env
MAGMA_API_KEY=your_api_key_here
```

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MAGMA_API_KEY` | No | - | Your Amboss Magma API key (optional - supports anonymous access) |
| `MAGMA_GRAPHQL_ENDPOINT` | No | `https://magma.amboss.tech/graphql` | Magma GraphQL endpoint |
| `LOG_LEVEL` | No | `info` | Logging level (debug, info, warn, error) |

### Claude Desktop Integration

Add the following configuration to your Claude Desktop config file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

**Option 1: Using npm package (anonymous access)**
```json
{
  "mcpServers": {
    "magma": {
      "command": "npx",
      "args": ["-y", "@ambosstech/magma-mcp"]
    }
  }
}
```

**Option 2: Using npm package (with API key)**
```json
{
  "mcpServers": {
    "magma": {
      "command": "npx",
      "args": ["-y", "@ambosstech/magma-mcp"],
      "env": {
        "MAGMA_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

**Option 3: From source (development)**
```json
{
  "mcpServers": {
    "magma": {
      "command": "node",
      "args": ["/absolute/path/to/magma-mcp/dist/index.js"],
      "env": {
        "MAGMA_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

After adding the configuration:
1. Save the file
2. Restart Claude Desktop
3. The Magma MCP server will be available

## Usage

Once configured, you can use natural language with Claude to buy Lightning liquidity:

### Example Prompts

**Basic purchase:**
```
Buy $10 of Lightning liquidity for my node at 024ae5a5f0b0185...@12.34.56.78:9735
```

**With options:**
```
Buy $50 of Lightning liquidity for 024ae5a5f0b0185...@12.34.56.78:9735
using only Rails cluster nodes
```

**Private channel:**
```
Buy $25 of private channel liquidity for my node 024ae5a5f0b0185...@12.34.56.78:9735
```

### Tool: `buy_lightning_liquidity`

**Parameters:**

- `connection_uri` (required): Your node's connection string (either just pubkey or pubkey@host:port)
  - Just pubkey: `024ae5a5f0b01850983009489ca89c85...`
  - With socket: `024ae5a5f0b01850983009489ca89c85...@12.34.56.78:9735`
- `usd_cents` (required): Dollar amount in cents (minimum 500 = $5.00)
- `redirect_url` (optional): URL to redirect after payment
- `private_channel` (optional): Create private channel (default: false)
- `rails_cluster_only` (optional): Source only from Rails cluster (default: false)

**Returns:**

```json
{
  "success": true,
  "lightning_invoice": "lnbc10m1p3j8z9xpp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypq..."
}
```

The Lightning invoice can be paid using any Lightning wallet to complete the liquidity purchase.

## Development

### Run in development mode

```bash
pnpm dev
```

### Build

```bash
pnpm build
```

### Type checking

```bash
pnpm typecheck
```

### Test with MCP Inspector

The [MCP Inspector](https://github.com/modelcontextprotocol/inspector) is a great tool for testing your server:

```bash
pnpm inspector
```

This will open a web interface where you can:
- View available tools
- Test tool execution
- Inspect requests and responses
- Debug errors

## Testing

### Manual Testing with Claude Desktop

1. Configure Claude Desktop with the MCP server
2. Restart Claude Desktop
3. Ask Claude to buy Lightning liquidity
4. Verify the response includes a Lightning invoice

### Example Test Conversation

```
You: Can you buy $5 of Lightning liquidity for my node?
Claude: I'll help you buy Lightning liquidity. I need your node's connection URI in the format pubkey@host:port.
You: 024ae5a5f0b01850983009489ca89c85...@12.34.56.78:9735
Claude: [Executes buy_lightning_liquidity tool]
Claude: Successfully created liquidity order! Transaction ID: abc123...
      Here's your Lightning invoice: lnbc...
      Payment URL: https://checkout.btcpay.amboss.tech/...
```

## Troubleshooting

### Server won't start

**Check environment variables:**
```bash
node -e "require('dotenv').config(); console.log(process.env.MAGMA_API_KEY)"
```

**Check build output:**
```bash
ls -la dist/
```

### Authentication errors

**Error:** `Authentication failed. Please check your MAGMA_API_KEY.`

**Solution:**
1. If using an API key, verify it at https://account.amboss.tech/settings/api-keys
2. Ensure the key is correctly set in your `.env` file or Claude config
3. Check for extra spaces or quotes around the API key
4. Alternatively, remove the API key to use anonymous access (the API will create a temporary account automatically)

### Connection URI validation errors

**Error:** `Connection URI must be either a 66-character pubkey or pubkey@host:port format`

**Solution:**
- Ensure pubkey is exactly 66 hexadecimal characters
- Accepted formats:
  - Just pubkey: `024ae5a5f0b01850983009489ca89c85...` (no spaces)
  - With socket: `pubkey@host:port` (e.g., `024ae5...@12.34.56.78:9735`)
- If using socket format, port must be between 1-65535

### Minimum purchase amount error

**Error:** `Minimum purchase amount is $5.00 (500 cents)`

**Solution:** Use at least 500 cents ($5.00) for the `usd_cents` parameter.

## Project Structure

```
magma-mcp/
├── src/
│   ├── index.ts                 # Main MCP server entry point
│   ├── config.ts                # Configuration with validation
│   ├── lib/
│   │   ├── graphql-client.ts    # Magma API client
│   │   ├── tools/
│   │   │   └── buy-liquidity.ts # Buy liquidity tool handler
│   │   └── schemas/
│   │       ├── common-schemas.ts        # Shared validation schemas
│   │       └── buy-liquidity-schema.ts  # Buy tool schema
│   └── types/
│       └── magma.ts             # TypeScript types
├── dist/                        # Compiled JavaScript (generated)
├── package.json
├── tsconfig.json
└── README.md
```

## Security

- **API keys are never logged** - All logging goes to stderr and keys are sanitized
- **Environment-based configuration** - API keys stored in `.env` or MCP config
- **Input validation** - All inputs are validated before processing
- **Error sanitization** - Errors never expose sensitive information

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Links

- [Amboss Technologies](https://amboss.tech/)
- [Magma Documentation](https://docs.amboss.tech/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Get API Key](https://account.amboss.tech/settings/api-keys)

## Support

- **Issues:** [GitHub Issues](https://github.com/amboss-tech/magma-mcp/issues)
- **Amboss Discord:** [Join Discord](https://discord.gg/amboss)
- **Documentation:** [Amboss Docs](https://docs.amboss.tech/)

---

Made with ⚡ by [Amboss Technologies](https://amboss.tech/)

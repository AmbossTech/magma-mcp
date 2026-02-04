import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MagmaClient } from './client.js';
import { MagmaGraphQLClient } from './lib/graphql-client.js';

// Mock the GraphQL client
vi.mock('./lib/graphql-client.js', () => {
  const MockMagmaGraphQLClient = vi.fn().mockImplementation(function(config) {
    return {
      buyLiquidity: vi.fn()
    };
  });

  return {
    MagmaGraphQLClient: MockMagmaGraphQLClient,
    ErrorCategory: {
      CLIENT_ERROR: 'CLIENT_ERROR',
      SERVER_ERROR: 'SERVER_ERROR',
      NETWORK_ERROR: 'NETWORK_ERROR',
      UNKNOWN_ERROR: 'UNKNOWN_ERROR'
    }
  };
});

describe('MagmaClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create client with default config', () => {
      const client = new MagmaClient();
      expect(client).toBeInstanceOf(MagmaClient);
      expect(MagmaGraphQLClient).toHaveBeenCalledWith({
        magmaApiKey: undefined,
        magmaEndpoint: 'https://magma.amboss.tech/graphql',
        logLevel: 'error'
      });
    });

    it('should create client with custom config', () => {
      const client = new MagmaClient({
        apiKey: 'test-key',
        endpoint: 'https://custom.endpoint.com/graphql',
        logLevel: 'debug'
      });

      expect(client).toBeInstanceOf(MagmaClient);
      expect(MagmaGraphQLClient).toHaveBeenCalledWith({
        magmaApiKey: 'test-key',
        magmaEndpoint: 'https://custom.endpoint.com/graphql',
        logLevel: 'debug'
      });
    });

    it('should create client with partial config', () => {
      const client = new MagmaClient({
        apiKey: 'test-key'
      });

      expect(client).toBeInstanceOf(MagmaClient);
      expect(MagmaGraphQLClient).toHaveBeenCalledWith({
        magmaApiKey: 'test-key',
        magmaEndpoint: 'https://magma.amboss.tech/graphql',
        logLevel: 'error'
      });
    });
  });

  describe('buyLiquidity', () => {
    it('should buy liquidity successfully', async () => {
      const mockInvoice = 'lnbc1000u1p3...';
      const mockResponse = {
        liquidity: {
          buy: {
            payment: {
              lightning_invoice: mockInvoice
            }
          }
        }
      };

      const client = new MagmaClient();
      const mockBuyLiquidity = vi.fn().mockResolvedValue(mockResponse);
      (client as any).graphqlClient.buyLiquidity = mockBuyLiquidity;

      const invoice = await client.buyLiquidity({
        connectionUri: '024ae5a5f0b01850983009489ca89c85...@12.34.56.78:9735',
        usdCents: 1000
      });

      expect(invoice).toBe(mockInvoice);
      expect(mockBuyLiquidity).toHaveBeenCalledWith({
        connection_uri: '024ae5a5f0b01850983009489ca89c85...@12.34.56.78:9735',
        usd_cents: '1000',
        redirect_url: undefined,
        options: {
          private: undefined,
          rails_cluster_only: undefined
        }
      });
    });

    it('should buy liquidity with all options', async () => {
      const mockInvoice = 'lnbc500u1p3...';
      const mockResponse = {
        liquidity: {
          buy: {
            payment: {
              lightning_invoice: mockInvoice
            }
          }
        }
      };

      const client = new MagmaClient();
      const mockBuyLiquidity = vi.fn().mockResolvedValue(mockResponse);
      (client as any).graphqlClient.buyLiquidity = mockBuyLiquidity;

      const invoice = await client.buyLiquidity({
        connectionUri: '03abc...',
        usdCents: 500,
        redirectUrl: 'https://example.com/callback',
        privateChannel: true,
        railsClusterOnly: true
      });

      expect(invoice).toBe(mockInvoice);
      expect(mockBuyLiquidity).toHaveBeenCalledWith({
        connection_uri: '03abc...',
        usd_cents: '500',
        redirect_url: 'https://example.com/callback',
        options: {
          private: true,
          rails_cluster_only: true
        }
      });
    });

    it('should reject amounts below minimum', async () => {
      const client = new MagmaClient();

      await expect(client.buyLiquidity({
        connectionUri: '03abc...',
        usdCents: 499
      })).rejects.toThrow('Minimum purchase amount is 500 cents ($5.00)');
    });

    it('should convert number to string for usd_cents', async () => {
      const mockResponse = {
        liquidity: {
          buy: {
            payment: {
              lightning_invoice: 'lnbc...'
            }
          }
        }
      };

      const client = new MagmaClient();
      const mockBuyLiquidity = vi.fn().mockResolvedValue(mockResponse);
      (client as any).graphqlClient.buyLiquidity = mockBuyLiquidity;

      await client.buyLiquidity({
        connectionUri: '03abc...',
        usdCents: 1000
      });

      expect(mockBuyLiquidity).toHaveBeenCalledTimes(1);
      const callArgs = mockBuyLiquidity.mock.calls[0]?.[0];
      expect(callArgs).toBeDefined();
      expect(typeof callArgs.usd_cents).toBe('string');
      expect(callArgs.usd_cents).toBe('1000');
    });

    it('should propagate GraphQL client errors', async () => {
      const client = new MagmaClient();
      const mockError = new Error('Network error');
      const mockBuyLiquidity = vi.fn().mockRejectedValue(mockError);
      (client as any).graphqlClient.buyLiquidity = mockBuyLiquidity;

      await expect(client.buyLiquidity({
        connectionUri: '03abc...',
        usdCents: 500
      })).rejects.toThrow('Network error');
    });
  });
});

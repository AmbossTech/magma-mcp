import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GraphQLClient, ClientError } from 'graphql-request';
import { MagmaGraphQLClient, ErrorCategory } from './graphql-client.js';
import type { Config } from '../config.js';
import type { LiquidityOrderInput, BuyLiquidityResponse } from '../types/magma.js';

// Create a shared mock request function
let mockRequest: ReturnType<typeof vi.fn>;

// Mock the graphql-request module
vi.mock('graphql-request', async () => {
  const actualModule = await vi.importActual('graphql-request');
  return {
    ...actualModule,
    GraphQLClient: vi.fn().mockImplementation(function() {
      return {
        request: mockRequest
      };
    })
  };
});

describe('MagmaGraphQLClient', () => {
  let client: MagmaGraphQLClient;
  const mockConfig: Config = {
    magmaApiKey: 'test-api-key',
    magmaEndpoint: 'https://test.amboss.tech/graphql',
    logLevel: 'info'
  };

  const mockInput: LiquidityOrderInput = {
    connection_uri: '03abc123def456@192.168.1.1:9735',
    usd_cents: '1000',
    redirect_url: 'https://example.com/success'
  };

  const mockSuccessResponse: BuyLiquidityResponse = {
    liquidity: {
      buy: {
        payment: {
          lightning_invoice: 'lnbc10m1p3j8z9xpp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypq...'
        }
      }
    }
  };

  beforeEach(() => {
    // Mock console.error to suppress logs during tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});

    // Create a fresh mock request function for each test
    mockRequest = vi.fn();

    // Clear all mocks
    vi.clearAllMocks();

    client = new MagmaGraphQLClient(mockConfig);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with API key when provided', () => {
      expect(GraphQLClient).toHaveBeenCalledWith(
        mockConfig.magmaEndpoint,
        {
          headers: {
            'Content-Type': 'application/json',
            'apollographql-client-name': 'magma-mcp',
            'apollographql-client-version': expect.any(String),
            'Authorization': 'Bearer test-api-key'
          }
        }
      );
    });

    it('should initialize without Authorization header when API key is not provided', () => {
      vi.clearAllMocks();
      const configWithoutKey: Config = {
        ...mockConfig,
        magmaApiKey: undefined
      };

      new MagmaGraphQLClient(configWithoutKey);

      expect(GraphQLClient).toHaveBeenCalledWith(
        mockConfig.magmaEndpoint,
        {
          headers: {
            'Content-Type': 'application/json',
            'apollographql-client-name': 'magma-mcp',
            'apollographql-client-version': expect.any(String)
          }
        }
      );
    });
  });

  describe('buyLiquidity', () => {
    it('should successfully buy liquidity', async () => {
      mockRequest.mockResolvedValueOnce(mockSuccessResponse);

      const result = await client.buyLiquidity(mockInput);

      expect(mockRequest).toHaveBeenCalledTimes(1);
      expect(mockRequest).toHaveBeenCalledWith(
        expect.stringContaining('mutation BuyLiquidity'),
        { input: mockInput }
      );
      expect(result).toEqual(mockSuccessResponse);
    });

    it('should log the request details in debug mode', async () => {
      // Create client with debug log level
      const debugConfig: Config = {
        ...mockConfig,
        logLevel: 'debug'
      };
      const debugClient = new MagmaGraphQLClient(debugConfig);

      mockRequest.mockResolvedValueOnce(mockSuccessResponse);

      await debugClient.buyLiquidity(mockInput);

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Requesting liquidity purchase')
      );
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Liquidity purchase successful')
      );
    });

    it('should handle connection_uri with just pubkey', async () => {
      mockRequest.mockResolvedValueOnce(mockSuccessResponse);

      const inputWithPubkeyOnly: LiquidityOrderInput = {
        connection_uri: '03abc123def456',
        usd_cents: '1000'
      };

      await client.buyLiquidity(inputWithPubkeyOnly);

      expect(mockRequest).toHaveBeenCalledWith(
        expect.stringContaining('mutation BuyLiquidity'),
        { input: inputWithPubkeyOnly }
      );
    });

    it('should include optional parameters when provided', async () => {
      mockRequest.mockResolvedValueOnce(mockSuccessResponse);

      const inputWithOptions: LiquidityOrderInput = {
        connection_uri: '03abc123def456@192.168.1.1:9735',
        usd_cents: '1000',
        redirect_url: 'https://example.com/success',
        options: {
          private: true,
          rails_cluster_only: false
        }
      };

      await client.buyLiquidity(inputWithOptions);

      expect(mockRequest).toHaveBeenCalledWith(
        expect.stringContaining('mutation BuyLiquidity'),
        { input: inputWithOptions }
      );
    });
  });

  describe('error handling', () => {
    it('should handle 401 authentication errors', async () => {
      const error = new ClientError(
        {
          status: 401,
          errors: [{ message: 'Unauthorized' }]
        } as any,
        { query: '' }
      );

      mockRequest.mockRejectedValueOnce(error);

      await expect(client.buyLiquidity(mockInput)).rejects.toMatchObject({
        category: ErrorCategory.CLIENT_ERROR,
        message: expect.stringContaining('Authentication failed'),
        statusCode: 401
      });
    });

    it('should handle 403 forbidden errors', async () => {
      const error = new ClientError(
        {
          status: 403,
          errors: [{ message: 'Forbidden' }]
        } as any,
        { query: '' }
      );

      mockRequest.mockRejectedValueOnce(error);

      await expect(client.buyLiquidity(mockInput)).rejects.toMatchObject({
        category: ErrorCategory.CLIENT_ERROR,
        message: expect.stringContaining('Access forbidden'),
        statusCode: 403
      });
    });

    it('should handle 404 not found errors', async () => {
      const error = new ClientError(
        {
          status: 404,
          errors: [{ message: 'Not found' }]
        } as any,
        { query: '' }
      );

      mockRequest.mockRejectedValueOnce(error);

      await expect(client.buyLiquidity(mockInput)).rejects.toMatchObject({
        category: ErrorCategory.CLIENT_ERROR,
        message: expect.stringContaining('API endpoint not found'),
        statusCode: 404
      });
    });

    it('should handle 429 rate limit errors', async () => {
      const error = new ClientError(
        {
          status: 429,
          errors: [{ message: 'Too many requests' }]
        } as any,
        { query: '' }
      );

      // Mock to keep failing even on retries
      mockRequest.mockRejectedValue(error);

      await expect(client.buyLiquidity(mockInput)).rejects.toMatchObject({
        category: ErrorCategory.CLIENT_ERROR,
        message: expect.stringContaining('Rate limit exceeded'),
        statusCode: 429
      });
    });

    it('should handle GraphQL errors in response', async () => {
      const error = new ClientError(
        {
          status: 400,
          errors: [{ message: 'Invalid connection_uri format' }]
        } as any,
        { query: '' }
      );

      mockRequest.mockRejectedValueOnce(error);

      await expect(client.buyLiquidity(mockInput)).rejects.toMatchObject({
        category: ErrorCategory.CLIENT_ERROR,
        message: expect.stringContaining('Invalid connection_uri format'),
        statusCode: 400
      });
    });

    it('should handle 5xx server errors', async () => {
      const error = new ClientError(
        {
          status: 500,
          errors: [{ message: 'Internal server error' }]
        } as any,
        { query: '' }
      );

      // Mock to keep failing even on retries
      mockRequest.mockRejectedValue(error);

      await expect(client.buyLiquidity(mockInput)).rejects.toMatchObject({
        category: ErrorCategory.SERVER_ERROR,
        message: expect.stringContaining('Magma API server error'),
        statusCode: 500
      });
    });

    it('should handle network connection errors', async () => {
      const error = new Error('ECONNREFUSED: Connection refused');
      // Mock to keep failing even on retries
      mockRequest.mockRejectedValue(error);

      await expect(client.buyLiquidity(mockInput)).rejects.toMatchObject({
        category: ErrorCategory.NETWORK_ERROR,
        message: expect.stringContaining('Network error')
      });
    });

    it('should handle network timeout errors', async () => {
      const error = new Error('ETIMEDOUT: Connection timeout');
      // Mock to keep failing even on retries
      mockRequest.mockRejectedValue(error);

      await expect(client.buyLiquidity(mockInput)).rejects.toMatchObject({
        category: ErrorCategory.NETWORK_ERROR,
        message: expect.stringContaining('Network error')
      });
    });

    it('should handle DNS resolution errors', async () => {
      const error = new Error('ENOTFOUND: DNS lookup failed');
      // Mock to keep failing even on retries
      mockRequest.mockRejectedValue(error);

      await expect(client.buyLiquidity(mockInput)).rejects.toMatchObject({
        category: ErrorCategory.NETWORK_ERROR,
        message: expect.stringContaining('Network error')
      });
    });

    it('should handle unknown errors', async () => {
      const error = new Error('Something unexpected happened');
      mockRequest.mockRejectedValueOnce(error);

      await expect(client.buyLiquidity(mockInput)).rejects.toMatchObject({
        category: ErrorCategory.UNKNOWN_ERROR,
        message: 'Something unexpected happened'
      });
    });
  });

  describe('retry logic', () => {
    beforeEach(() => {
      // Mock timers for faster tests
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should retry on 5xx server errors', async () => {
      const error = new ClientError(
        {
          status: 500,
          errors: [{ message: 'Server error' }]
        } as any,
        { query: '' }
      );

      // Fail twice, then succeed
      mockRequest
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce(mockSuccessResponse);

      const resultPromise = client.buyLiquidity(mockInput);

      // Fast-forward through retry delays
      await vi.advanceTimersByTimeAsync(1000); // First retry after 1s
      await vi.advanceTimersByTimeAsync(2000); // Second retry after 2s

      const result = await resultPromise;

      expect(mockRequest).toHaveBeenCalledTimes(3);
      expect(result).toEqual(mockSuccessResponse);
    });

    it('should retry on 429 rate limit errors', async () => {
      const error = new ClientError(
        {
          status: 429,
          errors: [{ message: 'Rate limited' }]
        } as any,
        { query: '' }
      );

      mockRequest
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce(mockSuccessResponse);

      const resultPromise = client.buyLiquidity(mockInput);

      await vi.advanceTimersByTimeAsync(1000);

      const result = await resultPromise;

      expect(mockRequest).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockSuccessResponse);
    });

    it('should retry on network errors', async () => {
      const error = new Error('ECONNREFUSED');

      mockRequest
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce(mockSuccessResponse);

      const resultPromise = client.buyLiquidity(mockInput);

      await vi.advanceTimersByTimeAsync(1000);

      const result = await resultPromise;

      expect(mockRequest).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockSuccessResponse);
    });

    it('should not retry on 4xx client errors (except 429)', async () => {
      const error = new ClientError(
        {
          status: 400,
          errors: [{ message: 'Bad request' }]
        } as any,
        { query: '' }
      );

      mockRequest.mockRejectedValueOnce(error);

      await expect(client.buyLiquidity(mockInput)).rejects.toMatchObject({
        category: ErrorCategory.CLIENT_ERROR
      });

      expect(mockRequest).toHaveBeenCalledTimes(1);
    });

    it('should throw after exhausting all retries', async () => {
      const error = new ClientError(
        {
          status: 500,
          errors: [{ message: 'Server error' }]
        } as any,
        { query: '' }
      );

      // Use mockRejectedValueOnce for each retry to avoid unhandled rejections
      mockRequest
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error);

      const resultPromise = client.buyLiquidity(mockInput);
      // Suppress unhandled rejection warning - we'll check the error below
      resultPromise.catch(() => {});

      // Run all timers to completion
      await vi.runAllTimersAsync();

      await expect(resultPromise).rejects.toMatchObject({
        category: ErrorCategory.SERVER_ERROR
      });

      expect(mockRequest).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should use exponential backoff for retries', async () => {
      const error = new Error('ECONNREFUSED');

      mockRequest
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce(mockSuccessResponse);

      const resultPromise = client.buyLiquidity(mockInput);

      // Verify delays are 1s and 2s
      await vi.advanceTimersByTimeAsync(1000);
      expect(mockRequest).toHaveBeenCalledTimes(2);

      await vi.advanceTimersByTimeAsync(2000);
      expect(mockRequest).toHaveBeenCalledTimes(3);

      await resultPromise;
    });
  });

  describe('GraphQL mutation', () => {
    it('should send correct mutation structure', async () => {
      mockRequest.mockResolvedValueOnce(mockSuccessResponse);

      await client.buyLiquidity(mockInput);

      const calls = mockRequest.mock.calls;
      expect(calls.length).toBeGreaterThan(0);

      const mutation = calls[0]?.[0] as string;
      expect(mutation).toBeDefined();
      expect(mutation).toContain('mutation BuyLiquidity');
      expect(mutation).toContain('$input: LiquidityOrderInput!');
      expect(mutation).toContain('liquidity');
      expect(mutation).toContain('buy(input: $input)');
      expect(mutation).toContain('payment');
      expect(mutation).toContain('lightning_invoice');
    });
  });
});

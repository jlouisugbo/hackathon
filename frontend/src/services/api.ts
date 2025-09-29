import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ApiResponse,
  Player,
  Portfolio,
  Trade,
  TradeRequest,
  LeaderboardEntry,
  LiveGame,
  PaginatedResponse
} from '@player-stock-market/shared';

const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:3001';
const API_TIMEOUT = 10000; // 10 seconds

class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    // Get auth token if available
    const token = await AsyncStorage.getItem('auth_token');
    const userId = await AsyncStorage.getItem('user_id');
    console.log('🔍 API Request - Token:', token, 'UserID:', userId);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'user-id': userId || 'demo-user', // Use actual user ID or demo fallback
    };

    // Add any additional headers from options
    if (options.headers && typeof options.headers === 'object' && !Array.isArray(options.headers)) {
      Object.assign(headers, options.headers);
    }

    // Add authorization header if token exists
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    console.log('🔍 API Request Headers:', headers);
    console.log('🔍 API Request Body:', options.body);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout');
        }
        throw error;
      }

      throw new Error('Unknown error occurred');
    }
  }

  // Health check
  async healthCheck(): Promise<ApiResponse> {
    return this.makeRequest('/health');
  }

  // Player endpoints
  async getPlayers(params?: {
    sortBy?: string;
    order?: 'asc' | 'desc';
    position?: string;
    team?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<Player[]>> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, value.toString());
        }
      });
    }

    const query = searchParams.toString();
    return this.makeRequest(`/api/players${query ? `?${query}` : ''}`);
  }

  async getPlayer(playerId: string): Promise<ApiResponse<Player>> {
    return this.makeRequest(`/api/players/${playerId}`);
  }

  async getPlayerHistory(playerId: string, limit?: number): Promise<ApiResponse> {
    const query = limit ? `?limit=${limit}` : '';
    return this.makeRequest(`/api/players/${playerId}/history${query}`);
  }

  async searchPlayers(query: string): Promise<ApiResponse<Player[]>> {
    return this.makeRequest(`/api/players/search/${encodeURIComponent(query)}`);
  }

  async getTopGainers(limit?: number): Promise<ApiResponse<Player[]>> {
    const query = limit ? `?limit=${limit}` : '';
    return this.makeRequest(`/api/players/trending/gainers${query}`);
  }

  async getTopLosers(limit?: number): Promise<ApiResponse<Player[]>> {
    const query = limit ? `?limit=${limit}` : '';
    return this.makeRequest(`/api/players/trending/losers${query}`);
  }

  // Portfolio endpoints
  async getPortfolio(userId: string): Promise<ApiResponse<Portfolio>> {
    return this.makeRequest(`/api/portfolio/${userId}`);
  }

  async getPortfolioPerformance(userId: string): Promise<ApiResponse> {
    return this.makeRequest(`/api/portfolio/${userId}/performance`);
  }

  async getHoldings(
    userId: string,
    accountType: 'season' | 'live',
    params?: { sortBy?: string; order?: 'asc' | 'desc' }
  ): Promise<ApiResponse> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) searchParams.append(key, value);
      });
    }

    const query = searchParams.toString();
    return this.makeRequest(`/api/portfolio/${userId}/holdings/${accountType}${query ? `?${query}` : ''}`);
  }

  async updateBalance(userId: string, amount: number): Promise<ApiResponse<Portfolio>> {
    return this.makeRequest(`/api/portfolio/${userId}/balance`, {
      method: 'PUT',
      body: JSON.stringify({ amount }),
    });
  }

  // Trade endpoints
  async executeMarketOrder(tradeRequest: TradeRequest): Promise<ApiResponse<Trade>> {
    return this.makeRequest('/api/trades', {
      method: 'POST',
      body: JSON.stringify(tradeRequest),
    });
  }

  async getTradeHistory(
    userId: string,
    params?: {
      page?: number;
      limit?: number;
      accountType?: 'season' | 'live';
      type?: 'buy' | 'sell';
    }
  ): Promise<ApiResponse<Trade[]>> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, value.toString());
      });
    }

    const query = searchParams.toString();
    return this.makeRequest(`/api/trades/${userId}/history${query ? `?${query}` : ''}`);
  }

  async getRecentTrades(limit?: number): Promise<ApiResponse<Trade[]>> {
    const query = limit ? `?limit=${limit}` : '';
    return this.makeRequest(`/api/trades/recent${query}`);
  }

  async getTradingVolume(
    playerId: string,
    timeframe?: '1h' | '24h' | '7d' | '30d'
  ): Promise<ApiResponse> {
    const query = timeframe ? `?timeframe=${timeframe}` : '';
    return this.makeRequest(`/api/trades/volume/${playerId}${query}`);
  }

  // Authentication endpoints
  async login(email: string, password: string): Promise<ApiResponse<{ user: any; token: string }>> {
    return this.makeRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(email: string, password: string, username: string): Promise<ApiResponse<{ user: any; token: string }>> {
    return this.makeRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, username }),
    });
  }

  async verifyAuthToken(token: string): Promise<ApiResponse> {
    return this.makeRequest('/api/auth/me', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  }

  async demoLogin(email: string, username?: string): Promise<ApiResponse<{ user: any; token: string }>> {
    return this.makeRequest('/api/auth/demo-login', {
      method: 'POST',
      body: JSON.stringify({ email, username }),
    });
  }

  // Leaderboard endpoints
  async getSeasonLeaderboard(params?: {
    limit?: number;
    page?: number;
  }): Promise<ApiResponse<LeaderboardEntry[]>> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, value.toString());
      });
    }

    const query = searchParams.toString();
    return this.makeRequest(`/api/leaderboard/season${query ? `?${query}` : ''}`);
  }

  async getLiveLeaderboard(limit?: number): Promise<ApiResponse<LeaderboardEntry[]>> {
    const query = limit ? `?limit=${limit}` : '';
    return this.makeRequest(`/api/leaderboard/live${query}`);
  }

  async getDailyLeaderboard(limit?: number): Promise<ApiResponse<LeaderboardEntry[]>> {
    const query = limit ? `?limit=${limit}` : '';
    return this.makeRequest(`/api/leaderboard/daily${query}`);
  }

  async getUserLeaderboardPosition(
    userId: string,
    context?: number
  ): Promise<ApiResponse> {
    const query = context ? `?context=${context}` : '';
    return this.makeRequest(`/api/leaderboard/user/${userId}${query}`);
  }

  async getLeaderboardStats(): Promise<ApiResponse> {
    return this.makeRequest('/api/leaderboard/stats');
  }

  // Game endpoints
  async getCurrentGame(): Promise<ApiResponse<LiveGame>> {
    return this.makeRequest('/api/game/current');
  }

  async getGameStatus(): Promise<ApiResponse> {
    return this.makeRequest('/api/game/status');
  }

  async getGameSchedule(): Promise<ApiResponse> {
    return this.makeRequest('/api/game/schedule');
  }
}

export const apiService = new ApiService(API_BASE_URL);

// Utility functions for common API patterns
export const withRetry = async <T>(
  apiCall: () => Promise<T>,
  retries: number = 3,
  delay: number = 1000
): Promise<T> => {
  for (let i = 0; i < retries; i++) {
    try {
      return await apiCall();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
  throw new Error('Max retries exceeded');
};

export const isApiError = (error: any): error is { message: string; status?: number } => {
  return error && typeof error.message === 'string';
};
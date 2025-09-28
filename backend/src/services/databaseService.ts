import { supabase, TABLES, isSupabaseConfigured } from '../config/supabase';
import { Portfolio, Holding, Trade, TradeRequest } from '../types';

export class DatabaseService {
  // Portfolio operations
  async getPortfolioByUserId(userId: string): Promise<Portfolio | null> {
    try {
      if (!isSupabaseConfigured) {
        return null; // Fallback to mock data
      }

      const { data, error } = await supabase
        .from(TABLES.PORTFOLIOS)
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        console.error('Portfolio not found for user:', userId);
        return null;
      }

      // Get holdings
      const { data: holdingsData, error: holdingsError } = await supabase
        .from(TABLES.HOLDINGS)
        .select('*')
        .eq('user_id', userId);

      const seasonHoldings: Holding[] = holdingsData
        ? holdingsData
            .filter((h: any) => h.account_type === 'season')
            .map(this.mapHoldingFromDatabase)
        : [];

      const liveHoldings: Holding[] = holdingsData
        ? holdingsData
            .filter((h: any) => h.account_type === 'live')
            .map(this.mapHoldingFromDatabase)
        : [];

      return {
        userId: data.user_id,
        seasonHoldings,
        liveHoldings,
        totalValue: parseFloat(data.total_value),
        availableBalance: parseFloat(data.available_balance),
        todaysPL: parseFloat(data.todays_pl),
        seasonPL: parseFloat(data.season_pl),
        livePL: parseFloat(data.live_pl),
        tradesRemaining: data.trades_remaining,
        lastUpdated: new Date(data.last_updated).getTime()
      };
    } catch (error) {
      console.error('Error getting portfolio:', error);
      return null;
    }
  }

  async createPortfolio(userId: string, portfolio: Portfolio): Promise<boolean> {
    try {
      if (!isSupabaseConfigured) {
        return false; // Fallback to mock data
      }

      const { error } = await supabase
        .from(TABLES.PORTFOLIOS)
        .insert({
          user_id: userId,
          available_balance: portfolio.availableBalance,
          total_value: portfolio.totalValue,
          todays_pl: portfolio.todaysPL,
          season_pl: portfolio.seasonPL,
          live_pl: portfolio.livePL,
          trades_remaining: portfolio.tradesRemaining,
          last_updated: new Date().toISOString()
        });

      return !error;
    } catch (error) {
      console.error('Error creating portfolio:', error);
      return false;
    }
  }

  async updatePortfolio(userId: string, updates: Partial<Portfolio>): Promise<boolean> {
    try {
      if (!isSupabaseConfigured) {
        return false; // Fallback to mock data
      }

      const { error } = await supabase
        .from(TABLES.PORTFOLIOS)
        .update({
          available_balance: updates.availableBalance,
          total_value: updates.totalValue,
          todays_pl: updates.todaysPL,
          season_pl: updates.seasonPL,
          live_pl: updates.livePL,
          trades_remaining: updates.tradesRemaining,
          last_updated: new Date().toISOString()
        })
        .eq('user_id', userId);

      return !error;
    } catch (error) {
      console.error('Error updating portfolio:', error);
      return false;
    }
  }

  // Holding operations
  async createOrUpdateHolding(userId: string, holding: Partial<Holding> & { playerId: string; accountType?: string }): Promise<boolean> {
    try {
      if (!isSupabaseConfigured) {
        return false;
      }

      // Check if holding exists
      const accountType = holding.accountType || 'season';
      const { data: existingHolding, error: findError } = await supabase
        .from(TABLES.HOLDINGS)
        .select('*')
        .eq('user_id', userId)
        .eq('player_id', holding.playerId)
        .eq('account_type', accountType)
        .single();

      if (existingHolding) {
        // Update existing holding
        const newShares = existingHolding.shares + (holding.shares || 0);
        const newTotalCost = (existingHolding.shares * existingHolding.average_price) + 
                            ((holding.shares || 0) * (holding.averagePrice || 0));
        const newAveragePrice = newShares > 0 ? newTotalCost / newShares : 0;

        if (newShares <= 0) {
          // Remove holding if shares = 0
          const { error } = await supabase
            .from(TABLES.HOLDINGS)
            .delete()
            .eq('id', existingHolding.id);
          return !error;
        } else {
          // Update holding
          const { error } = await supabase
            .from(TABLES.HOLDINGS)
            .update({
              shares: newShares,
              average_price: newAveragePrice,
              current_price: holding.currentPrice,
              total_value: newShares * (holding.currentPrice || 0),
              unrealized_pl: (newShares * (holding.currentPrice || 0)) - (newShares * newAveragePrice),
              unrealized_pl_percent: newAveragePrice > 0 ? 
                (((holding.currentPrice || 0) - newAveragePrice) / newAveragePrice) * 100 : 0,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingHolding.id);
          return !error;
        }
      } else {
        // Create new holding
        const { error } = await supabase
          .from(TABLES.HOLDINGS)
          .insert({
            user_id: userId,
            player_id: holding.playerId,
            player_name: holding.playerName,
            shares: holding.shares,
            average_price: holding.averagePrice,
            current_price: holding.currentPrice,
            total_value: (holding.shares || 0) * (holding.currentPrice || 0),
            unrealized_pl: ((holding.shares || 0) * (holding.currentPrice || 0)) - 
                          ((holding.shares || 0) * (holding.averagePrice || 0)),
            unrealized_pl_percent: (holding.averagePrice || 0) > 0 ? 
              (((holding.currentPrice || 0) - (holding.averagePrice || 0)) / (holding.averagePrice || 0)) * 100 : 0,
            account_type: accountType,
            purchase_date: new Date().toISOString()
          });
        return !error;
      }
    } catch (error) {
      console.error('Error creating/updating holding:', error);
      return false;
    }
  }

  // Trade operations
  async createTrade(userId: string, trade: Omit<Trade, 'id' | 'timestamp'>): Promise<string | null> {
    try {
      if (!isSupabaseConfigured) {
        return null;
      }

      const { data, error } = await supabase
        .from(TABLES.TRADES)
        .insert({
          user_id: userId,
          player_id: trade.playerId,
          player_name: trade.playerName,
          type: trade.type,
          order_type: trade.orderType,
          shares: trade.shares,
          price: trade.price,
          limit_price: trade.orderType === 'limit' ? trade.price : null,
          total_amount: trade.totalAmount,
          multiplier: trade.multiplier || 1.0,
          account_type: trade.accountType,
          status: trade.status,
          executed_at: trade.status === 'executed' ? new Date().toISOString() : null,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating trade:', error);
        return null;
      }

      return data.id;
    } catch (error) {
      console.error('Error creating trade:', error);
      return null;
    }
  }

  async updateTradeStatus(tradeId: string, status: 'executed' | 'cancelled' | 'failed'): Promise<boolean> {
    try {
      if (!isSupabaseConfigured) {
        return false;
      }

      const { error } = await supabase
        .from(TABLES.TRADES)
        .update({
          status,
          executed_at: status === 'executed' ? new Date().toISOString() : null
        })
        .eq('id', tradeId);

      return !error;
    } catch (error) {
      console.error('Error updating trade status:', error);
      return false;
    }
  }

  async getTradesByUserId(userId: string, limit: number = 50): Promise<Trade[]> {
    try {
      if (!isSupabaseConfigured) {
        return [];
      }

      const { data, error } = await supabase
        .from(TABLES.TRADES)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error || !data) {
        return [];
      }

      return data.map(this.mapTradeFromDatabase);
    } catch (error) {
      console.error('Error getting trades:', error);
      return [];
    }
  }

  // Helper methods
  private mapHoldingFromDatabase(dbHolding: any): Holding {
    return {
      playerId: dbHolding.player_id,
      playerName: dbHolding.player_name,
      shares: dbHolding.shares,
      averagePrice: parseFloat(dbHolding.average_price),
      currentPrice: parseFloat(dbHolding.current_price),
      totalValue: parseFloat(dbHolding.total_value),
      unrealizedPL: parseFloat(dbHolding.unrealized_pl),
      unrealizedPLPercent: parseFloat(dbHolding.unrealized_pl_percent),
      purchaseDate: new Date(dbHolding.purchase_date).getTime()
    };
  }

  private mapTradeFromDatabase(dbTrade: any): Trade {
    return {
      id: dbTrade.id,
      userId: dbTrade.user_id,
      playerId: dbTrade.player_id,
      playerName: dbTrade.player_name,
      type: dbTrade.type,
      orderType: dbTrade.order_type,
      shares: dbTrade.shares,
      price: parseFloat(dbTrade.price),
      timestamp: new Date(dbTrade.created_at).getTime(),
      accountType: dbTrade.account_type,
      status: dbTrade.status,
      multiplier: parseFloat(dbTrade.multiplier || 1.0),
      totalAmount: parseFloat(dbTrade.total_amount)
    };
  }
}

export const databaseService = new DatabaseService();
export default databaseService;
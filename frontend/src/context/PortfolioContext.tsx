import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Portfolio, Holding, Player } from '../../../shared/src/types';
import { apiService } from '../services/api';
import { useAuth } from './AuthContext';

interface PortfolioContextType {
  portfolio: Portfolio | null;
  loading: boolean;
  error: string | null;
  refreshPortfolio: () => Promise<void>;
  updateHoldingPrice: (playerId: string, newPrice: number) => void;
  addUserTrade: (holding: Holding, accountType: 'season' | 'live') => void;
  updatePortfolioValues: (players: Player[]) => void;
  updateCashBalance: (amount: number, type: 'buy' | 'sell') => void;
}

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined);

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const updateTimeoutRef = useRef<NodeJS.Timeout>();
  const [userTrades, setUserTrades] = useState<{season: Holding[], live: Holding[]}>({season: [], live: []});

  useEffect(() => {
    if (user) {
      fetchPortfolio();
    } else if (!authLoading) {
      // If auth loading is complete but no user, set loading to false
      setLoading(false);
      setPortfolio(null);
    }
  }, [user, authLoading]);

  const fetchPortfolio = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      console.log('📊 Fetching portfolio for user:', user.id);

      const response = await apiService.getPortfolio(user.id);
      console.log('📊 Portfolio API response:', response);

      if (response.success && response.data) {
        console.log('✅ Portfolio data received:', response.data);
        
        // Completely clean portfolio: use only user trades, ignore all backend data
        const cleanedPortfolio = {
          userId: response.data.userId,
          seasonHoldings: userTrades.season, // Only user's actual trades
          liveHoldings: userTrades.live, // Only user's actual trades
          totalValue: 1000, // Start with $1000 base
          availableBalance: 1000, // Start with $1000 cash
          todaysPL: 0,
          seasonPL: 0,
          livePL: 0,
          tradesRemaining: 5,
          lastUpdated: Date.now()
        };
        
        console.log('🧹 Cleaned portfolio:', cleanedPortfolio);
        setPortfolio(cleanedPortfolio);
      } else {
        console.log('❌ Portfolio fetch failed:', response.error);
        setError(response.error || 'Failed to fetch portfolio');
      }
    } catch (err) {
      console.error('❌ Error fetching portfolio:', err);
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const refreshPortfolio = async () => {
    console.log('🔄 Refreshing portfolio...');
    await fetchPortfolio();
    console.log('✅ Portfolio refresh completed');
  };

  const updateHoldingPrice = (playerId: string, newPrice: number) => {
    if (!portfolio) return;

    console.log('🔄 Price update received:', playerId, newPrice);

    // Temporarily disable debounce to test
    // if (updateTimeoutRef.current) {
    //   clearTimeout(updateTimeoutRef.current);
    // }

    // updateTimeoutRef.current = setTimeout(() => {
      console.log('📊 Updating portfolio for player:', playerId);
      const updateHoldings = (holdings: Holding[]): Holding[] => {
        return holdings.map(holding => {
          if (holding.playerId === playerId) {
            const totalValue = holding.shares * newPrice;
            const unrealizedPL = totalValue - (holding.shares * holding.averagePrice);
            const unrealizedPLPercent = ((totalValue - (holding.shares * holding.averagePrice)) / (holding.shares * holding.averagePrice)) * 100;

            return {
              ...holding,
              currentPrice: newPrice,
              totalValue: Math.round(totalValue * 100) / 100,
              unrealizedPL: Math.round(unrealizedPL * 100) / 100,
              unrealizedPLPercent: Math.round(unrealizedPLPercent * 100) / 100
            };
          }
          return holding;
        });
      };

      const updatedSeasonHoldings = updateHoldings(portfolio.seasonHoldings);
      const updatedLiveHoldings = updateHoldings(portfolio.liveHoldings);

      // Recalculate total values
      const seasonValue = updatedSeasonHoldings.reduce((sum, h) => sum + h.totalValue, 0);
      const liveValue = updatedLiveHoldings.reduce((sum, h) => sum + h.totalValue, 0);
      const totalValue = seasonValue + liveValue + portfolio.availableBalance;

      // Update P&L
      const seasonPL = updatedSeasonHoldings.reduce((sum, h) => sum + h.unrealizedPL, 0);
      const livePL = updatedLiveHoldings.reduce((sum, h) => sum + h.unrealizedPL, 0);

      setPortfolio({
        ...portfolio,
        seasonHoldings: updatedSeasonHoldings,
        liveHoldings: updatedLiveHoldings,
        totalValue: Math.round(totalValue * 100) / 100,
        seasonPL: Math.round(seasonPL * 100) / 100,
        livePL: Math.round(livePL * 100) / 100,
        lastUpdated: Date.now()
      });
    // }, 500); // Debounce for 500ms to prevent rapid updates
  };

  const addUserTrade = (holding: Holding, accountType: 'season' | 'live') => {
    console.log('➕ Adding user trade:', holding, accountType);
    setUserTrades(prev => {
      const existingHoldings = prev[accountType];
      const existingHoldingIndex = existingHoldings.findIndex(h => h.playerId === holding.playerId);
      
      if (existingHoldingIndex >= 0) {
        // Stack with existing holding (like real stock trading)
        const existingHolding = existingHoldings[existingHoldingIndex];
        const totalShares = existingHolding.shares + holding.shares;
        const totalCost = (existingHolding.averagePrice * existingHolding.shares) + (holding.averagePrice * holding.shares);
        const newAveragePrice = totalCost / totalShares;
        
        const updatedHolding = {
          ...holding,
          shares: totalShares,
          averagePrice: newAveragePrice,
          totalValue: totalShares * holding.currentPrice, // Use current price for total value
          purchaseDate: Math.min(existingHolding.purchaseDate, holding.purchaseDate), // Keep earliest purchase date
          daysSinceHeld: Math.floor((Date.now() - Math.min(existingHolding.purchaseDate, holding.purchaseDate)) / (1000 * 60 * 60 * 24))
        };
        
        const newHoldings = [...existingHoldings];
        newHoldings[existingHoldingIndex] = updatedHolding;
        
        console.log('📈 Stacked holdings:', { existing: existingHolding, new: holding, result: updatedHolding });
        
        return {
          ...prev,
          [accountType]: newHoldings
        };
      } else {
        // New holding
        return {
          ...prev,
          [accountType]: [...prev[accountType], holding]
        };
      }
    });
  };

  const updatePortfolioValues = (players: Player[]) => {
    if (!portfolio) return;
    
    console.log('🔄 Updating portfolio values with current player prices...');
    
    // Update holdings with current player prices
    const updateHoldings = (holdings: Holding[]): Holding[] => {
      return holdings.map(holding => {
        const player = players.find(p => p.id === holding.playerId);
        if (player) {
          const currentPrice = player.currentPrice;
          const totalValue = holding.shares * currentPrice;
          const unrealizedPL = totalValue - (holding.shares * holding.averagePrice);
          const unrealizedPLPercent = ((totalValue - (holding.shares * holding.averagePrice)) / (holding.shares * holding.averagePrice)) * 100;
          
          return {
            ...holding,
            currentPrice,
            totalValue: Math.round(totalValue * 100) / 100,
            unrealizedPL: Math.round(unrealizedPL * 100) / 100,
            unrealizedPLPercent: Math.round(unrealizedPLPercent * 100) / 100
          };
        }
        return holding;
      });
    };

    const updatedSeasonHoldings = updateHoldings(portfolio.seasonHoldings);
    const updatedLiveHoldings = updateHoldings(portfolio.liveHoldings);
    
    // Recalculate total values
    const seasonValue = updatedSeasonHoldings.reduce((sum, h) => sum + h.totalValue, 0);
    const liveValue = updatedLiveHoldings.reduce((sum, h) => sum + h.totalValue, 0);
    const totalValue = seasonValue + liveValue + portfolio.availableBalance;
    
    // Update P&L
    const seasonPL = updatedSeasonHoldings.reduce((sum, h) => sum + h.unrealizedPL, 0);
    const livePL = updatedLiveHoldings.reduce((sum, h) => sum + h.unrealizedPL, 0);

    setPortfolio({
      ...portfolio,
      seasonHoldings: updatedSeasonHoldings,
      liveHoldings: updatedLiveHoldings,
      totalValue: Math.round(totalValue * 100) / 100,
      seasonPL: Math.round(seasonPL * 100) / 100,
      livePL: Math.round(livePL * 100) / 100,
      lastUpdated: Date.now()
    });
    
    console.log('✅ Portfolio values updated:', { totalValue, seasonPL, livePL });
  };

  const updateCashBalance = (amount: number, type: 'buy' | 'sell') => {
    if (!portfolio) return;
    
    console.log(`💰 Updating cash balance: ${type} $${amount}`);
    
    const newBalance = type === 'buy' 
      ? portfolio.availableBalance - amount  // Decrease cash when buying
      : portfolio.availableBalance + amount; // Increase cash when selling
    
    // Calculate new total value (cash + holdings)
    const holdingsValue = [...portfolio.seasonHoldings, ...portfolio.liveHoldings]
      .reduce((sum, holding) => sum + holding.totalValue, 0);
    const newTotalValue = newBalance + holdingsValue;
    
    setPortfolio(prev => prev ? {
      ...prev,
      availableBalance: Math.round(newBalance * 100) / 100,
      totalValue: Math.round(newTotalValue * 100) / 100,
      lastUpdated: Date.now()
    } : null);
    
    console.log(`✅ Cash balance updated: $${newBalance.toFixed(2)}, Total: $${newTotalValue.toFixed(2)}`);
  };

  const value: PortfolioContextType = {
    portfolio,
    loading,
    error,
    refreshPortfolio,
    updateHoldingPrice,
    addUserTrade,
    updatePortfolioValues,
    updateCashBalance,
  };

  return (
    <PortfolioContext.Provider value={value}>
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolio() {
  const context = useContext(PortfolioContext);
  if (context === undefined) {
    throw new Error('usePortfolio must be used within a PortfolioProvider');
  }
  return context;
}
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Portfolio, Holding, Player } from '@player-stock-market/shared';
import { apiService } from '../services/api';
import { useAuth } from './AuthContext';

interface PortfolioContextType {
  portfolio: Portfolio | null;
  loading: boolean;
  error: string | null;
  refreshPortfolio: () => Promise<void>;
  updateHoldingPrice: (playerId: string, newPrice: number) => void;
  addUserTrade: (holding: Holding, accountType: 'season' | 'live') => Promise<void>;
  updatePortfolioValues: (players: Player[]) => Promise<void>;
  updateCashBalance: (amount: number, type: 'buy' | 'sell') => Promise<void>;
}

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined);

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const updateTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const [userTrades, setUserTrades] = useState<{season: Holding[], live: Holding[]}>({season: [], live: []});
  const [sessionPortfolio, setSessionPortfolio] = useState<Portfolio | null>(null);

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

      // Fetch portfolio from backend API
      const response = await apiService.getPortfolio(user.id);
      
      if (response.success && response.data) {
        console.log('📊 Portfolio fetched from backend:', response.data);
        setPortfolio(response.data);
        setSessionPortfolio(response.data);
        
        // Also save to session for offline access
        await AsyncStorage.setItem(`portfolio_${user.id}`, JSON.stringify(response.data));
      } else {
        console.log('📊 No portfolio found, creating fresh portfolio');
        // Create a fresh portfolio if none exists
        const freshPortfolio = {
          userId: user.id,
          seasonHoldings: [],
          liveHoldings: [],
          totalValue: 10000,
          availableBalance: 10000,
          todaysPL: 0,
          seasonPL: 0,
          livePL: 0,
          tradesRemaining: 5,
          lastUpdated: Date.now()
        };
        
        console.log('🆕 Creating fresh portfolio:', freshPortfolio);
        setPortfolio(freshPortfolio);
        setSessionPortfolio(freshPortfolio);
        
        // Save to session
        await AsyncStorage.setItem(`portfolio_${user.id}`, JSON.stringify(freshPortfolio));
      }
      
    } catch (err) {
      console.error('❌ Error fetching portfolio:', err);
      setError('Network error occurred');
      
      // Fallback to session data if API fails
      try {
        const sessionData = await AsyncStorage.getItem(`portfolio_${user.id}`);
        if (sessionData) {
          const parsedSession = JSON.parse(sessionData);
          console.log('📊 Using fallback session data:', parsedSession);
          setPortfolio(parsedSession);
          setSessionPortfolio(parsedSession);
        }
      } catch (sessionError) {
        console.error('❌ No fallback data available:', sessionError);
      }
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

  const addUserTrade = async (holding: Holding, accountType: 'season' | 'live') => {
    console.log('➕ Adding user trade:', holding, accountType);
    
    let updatedPortfolio: Portfolio | null = null;
    
    setPortfolio(prev => {
      if (!prev) return null;
      
      const currentHoldings = accountType === 'season' ? prev.seasonHoldings : prev.liveHoldings;
      const existingHoldingIndex = currentHoldings.findIndex(h => h.playerId === holding.playerId);
      
      let updatedHoldings;
      
      if (existingHoldingIndex >= 0) {
        // Update existing holding
        const existingHolding = currentHoldings[existingHoldingIndex];
        const totalShares = existingHolding.shares + holding.shares;
        const totalCost = (existingHolding.averagePrice * existingHolding.shares) + (holding.averagePrice * holding.shares);
        const newAveragePrice = totalCost / totalShares;
        
        const updatedHolding = {
          ...holding,
          shares: totalShares,
          averagePrice: newAveragePrice,
          totalValue: totalShares * holding.currentPrice,
          purchaseDate: Math.min(existingHolding.purchaseDate, holding.purchaseDate),
          daysSinceHeld: Math.floor((Date.now() - Math.min(existingHolding.purchaseDate, holding.purchaseDate)) / (1000 * 60 * 60 * 24))
        };
        
        updatedHoldings = [...currentHoldings];
        updatedHoldings[existingHoldingIndex] = updatedHolding;
        
        console.log('📈 Updated existing holding:', updatedHolding);
      } else {
        // Add new holding
        updatedHoldings = [...currentHoldings, holding];
        console.log('🆕 Added new holding:', holding);
      }
      
      // Recalculate total values
      const seasonValue = accountType === 'season' 
        ? updatedHoldings.reduce((sum, h) => sum + h.totalValue, 0)
        : prev.seasonHoldings.reduce((sum, h) => sum + h.totalValue, 0);
      const liveValue = accountType === 'live'
        ? updatedHoldings.reduce((sum, h) => sum + h.totalValue, 0)
        : prev.liveHoldings.reduce((sum, h) => sum + h.totalValue, 0);
      
      const newTotalValue = seasonValue + liveValue + prev.availableBalance;
      
      updatedPortfolio = {
        ...prev,
        [accountType === 'season' ? 'seasonHoldings' : 'liveHoldings']: updatedHoldings,
        totalValue: Math.round(newTotalValue * 100) / 100,
        lastUpdated: Date.now()
      };
      
      return updatedPortfolio;
    });
    
    // Save to session storage after state update
    if (user && updatedPortfolio) {
      try {
        await AsyncStorage.setItem(`portfolio_${user.id}`, JSON.stringify(updatedPortfolio));
        console.log('💾 Saved portfolio to session storage');
        
        // Also save to backend (the backend should already have the updated portfolio from the trade execution)
        // But we'll refresh from backend to ensure consistency
        console.log('🔄 Refreshing portfolio from backend to ensure consistency...');
        await fetchPortfolio();
      } catch (error) {
        console.error('❌ Failed to save portfolio to session storage:', error);
      }
    }
  };

  const updatePortfolioValues = async (players: Player[]) => {
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

    const updatedPortfolio = {
      ...portfolio,
      seasonHoldings: updatedSeasonHoldings,
      liveHoldings: updatedLiveHoldings,
      totalValue: Math.round(totalValue * 100) / 100,
      seasonPL: Math.round(seasonPL * 100) / 100,
      livePL: Math.round(livePL * 100) / 100,
      lastUpdated: Date.now()
    };
    
    setPortfolio(updatedPortfolio);
    
    // Save to session storage
    if (user) {
      try {
        await AsyncStorage.setItem(`portfolio_${user.id}`, JSON.stringify(updatedPortfolio));
        console.log('💾 Saved updated portfolio values to session storage');
      } catch (error) {
        console.error('❌ Failed to save portfolio values to session storage:', error);
      }
    }
    
    console.log('✅ Portfolio values updated:', { totalValue, seasonPL, livePL });
  };

  const updateCashBalance = async (amount: number, type: 'buy' | 'sell') => {
    if (!portfolio) return;
    
    console.log(`💰 Updating cash balance: ${type} $${amount}`);
    
    const newBalance = type === 'buy' 
      ? portfolio.availableBalance - amount  // Decrease cash when buying
      : portfolio.availableBalance + amount; // Increase cash when selling
    
    // Calculate new total value (cash + holdings)
    const holdingsValue = [...portfolio.seasonHoldings, ...portfolio.liveHoldings]
      .reduce((sum, holding) => sum + holding.totalValue, 0);
    const newTotalValue = newBalance + holdingsValue;
    
    const updatedPortfolio = {
      ...portfolio,
      availableBalance: Math.round(newBalance * 100) / 100,
      totalValue: Math.round(newTotalValue * 100) / 100,
      lastUpdated: Date.now()
    };
    
    setPortfolio(updatedPortfolio);
    
    // Save to session storage
    if (user) {
      try {
        await AsyncStorage.setItem(`portfolio_${user.id}`, JSON.stringify(updatedPortfolio));
        console.log('💾 Saved updated portfolio to session storage');
      } catch (error) {
        console.error('❌ Failed to save portfolio to session storage:', error);
      }
    }
    
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
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LiveGame, Player, TradeRequest, Trade } from '@player-stock-market/shared';
import { apiService } from '../services/api';
import { usePortfolio } from './PortfolioContext';

interface GameContextType {
  currentGame: LiveGame | null;
  players: Player[];
  loading: boolean;
  error: string | null;
  refreshGame: () => Promise<void>;
  refreshPlayers: () => Promise<void>;
  forceRefreshAll: () => Promise<void>;
  clearAllData: () => Promise<void>;
  forceRestart: () => Promise<void>;
  clearAllStorage: () => Promise<void>;
  clearCachedPlayers: () => Promise<void>;
  updatePlayerPrice: (playerId: string, newPrice: number, change: number, changePercent: number) => void;
  executeTrade: (tradeRequest: TradeRequest) => Promise<Trade>;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const { addUserTrade, refreshPortfolio, updateCashBalance } = usePortfolio();
  const [currentGame, setCurrentGame] = useState<LiveGame | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeGameData();
  }, []);

  const initializeGameData = async () => {
    console.log('🔄 Initializing game data...');
    console.log('🔄 Current timestamp:', Date.now());
    // Force refresh players first to ensure we get fresh data
    await fetchPlayers();
    await fetchCurrentGame();
    setLoading(false);
  };

  const fetchCurrentGame = async () => {
    try {
      const response = await apiService.getCurrentGame();

      if (response.success && response.data) {
        setCurrentGame(response.data);
      } else {
        // No active game is not an error
        setCurrentGame(null);
      }
    } catch (err) {
      console.error('Error fetching current game:', err);
      setError('Failed to fetch game data');
    }
  };

  const fetchPlayers = async () => {
    try {
      console.log('🔄 Fetching players from API...');
      console.log('🔄 Current timestamp:', Date.now());
      
      // Check if we have cached players in session storage first
      try {
        const cachedPlayers = await AsyncStorage.getItem('cached_players');
        if (cachedPlayers) {
          const parsedPlayers = JSON.parse(cachedPlayers);
          console.log('📦 Using cached players from session storage:', parsedPlayers.length, 'players');
          console.log('📋 Cached player IDs:', parsedPlayers.map(p => p.id));
          setPlayers(parsedPlayers);
          return;
        }
      } catch (error) {
        console.log('📦 No cached players found, fetching fresh data');
      }
      
      // Add cache-busting parameter to ensure fresh data
      const timestamp = Date.now();
      const response = await apiService.getPlayers();

      if (response.success && response.data) {
        console.log('✅ Players fetched successfully:', response.data.length, 'players');
        console.log('📋 First few player IDs:', response.data.slice(0, 3).map(p => ({ id: p.id, name: p.name })));
        console.log('📋 All player IDs:', response.data.map(p => p.id));
        
        // Store players in session storage for persistence
        try {
          await AsyncStorage.setItem('cached_players', JSON.stringify(response.data));
          console.log('💾 Players cached in session storage');
        } catch (error) {
          console.error('❌ Failed to cache players:', error);
        }
        
        // Force clear existing players first
        setPlayers([]);
        
        // Wait a moment for state to clear
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Set fresh players
        setPlayers(response.data);
        console.log('✅ Fresh players set in state');
      } else {
        console.error('❌ Failed to fetch players:', response.error);
        setError(response.error || 'Failed to fetch players');
      }
    } catch (err) {
      console.error('❌ Error fetching players:', err);
      setError('Failed to fetch players');
    }
  };

  const refreshGame = async () => {
    await fetchCurrentGame();
  };

  const refreshPlayers = async () => {
    console.log('🔄 Force refreshing players...');
    setPlayers([]); // Clear existing players first
    setError(null); // Clear any errors
    await fetchPlayers();
  };

  const forceRefreshAll = async () => {
    console.log('🔄 Force refreshing all game data...');
    console.log('🔄 Clearing all cached data...');
    setPlayers([]);
    setCurrentGame(null);
    setError(null);
    setLoading(true);
    
    // Add a small delay to ensure state is cleared
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.log('🔄 Starting fresh data fetch...');
    await initializeGameData();
  };

  const clearAllData = async () => {
    console.log('🧹 Clearing game data and forcing refresh (preserving session data)...');
    console.log('🧹 Current players before clear:', players.length);
    console.log('🧹 Current player IDs before clear:', players.map(p => p.id));
    
    setPlayers([]);
    setCurrentGame(null);
    setError(null);
    setLoading(true);
    
    // Wait a bit for state to clear
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Force fetch with cache busting
    try {
      console.log('🔄 Fetching fresh players with cache busting...');
      const timestamp = Date.now();
      const response = await apiService.getPlayers();
      
      if (response.success && response.data) {
        console.log('✅ Fresh players fetched:', response.data.length, 'players');
        console.log('📋 Fresh player IDs:', response.data.map(p => ({ id: p.id, name: p.name })));
        
        setPlayers(response.data);
        setError(null);
      } else {
        console.error('❌ Failed to fetch fresh players:', response.error);
        setError(response.error || 'Failed to fetch fresh players');
      }
    } catch (err) {
      console.error('❌ Error fetching fresh players:', err);
      setError('Failed to fetch fresh players');
    } finally {
      setLoading(false);
    }
  };

  const forceRestart = async () => {
    console.log('🔄 FORCE RESTART: Completely restarting game context...');
    console.log('🔄 This will clear ALL data and force fresh fetch...');
    
    // Clear everything
    setPlayers([]);
    setCurrentGame(null);
    setError(null);
    setLoading(true);
    
    // Wait longer for complete state clear
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Force fresh initialization
    await initializeGameData();
  };

  const clearAllStorage = async () => {
    console.log('🧹 CLEARING ALL STORAGE: Removing all cached data...');
    
    try {
      // Clear all AsyncStorage data
      await AsyncStorage.clear();
      console.log('✅ All AsyncStorage data cleared');
      
      // Clear all state
      setPlayers([]);
      setCurrentGame(null);
      setError(null);
      setLoading(true);
      
      // Wait for complete clearing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Force fresh initialization
      await initializeGameData();
      
      console.log('✅ Complete storage and state reset completed');
    } catch (error) {
      console.error('❌ Error clearing storage:', error);
    }
  };

  const clearCachedPlayers = async () => {
    console.log('🧹 Clearing cached players...');
    try {
      await AsyncStorage.removeItem('cached_players');
      console.log('✅ Cached players cleared');
    } catch (error) {
      console.error('❌ Error clearing cached players:', error);
    }
  };

  const updatePlayerPrice = (playerId: string, newPrice: number, change: number, changePercent: number) => {
    setPlayers(prevPlayers =>
      prevPlayers.map(player => {
        if (player.id === playerId) {
          // Add to price history
          const newPricePoint = {
            timestamp: Date.now(),
            price: newPrice,
            volume: Math.floor(Math.random() * 1000) + 100
          };

          const updatedHistory = [...player.priceHistory, newPricePoint];

          // Keep only last 100 points for performance
          if (updatedHistory.length > 100) {
            updatedHistory.shift();
          }

          return {
            ...player,
            currentPrice: newPrice,
            priceChange24h: change,
            priceChangePercent24h: changePercent,
            priceHistory: updatedHistory
          };
        }
        return player;
      })
    );
  };

  const executeTrade = async (tradeRequest: TradeRequest): Promise<Trade> => {
    try {
      setError(null);
      console.log('🔄 Executing trade:', tradeRequest);
      console.log('🎯 Trade details:', {
        playerId: tradeRequest.playerId,
        type: tradeRequest.type,
        shares: tradeRequest.shares,
        accountType: tradeRequest.accountType
      });

      // Validate that the player exists in our current player list
      const playerExists = players.find(p => p.id === tradeRequest.playerId);
      if (!playerExists) {
        console.error('❌ Player not found in current player list:', tradeRequest.playerId);
        console.log('📋 Available player IDs:', players.map(p => p.id));
        console.log('🔄 Attempting to refresh player data...');
        
        // Try to refresh player data and check again
        await fetchPlayers();
        const refreshedPlayerExists = players.find(p => p.id === tradeRequest.playerId);
        if (!refreshedPlayerExists) {
          throw new Error(`Player with ID ${tradeRequest.playerId} not found. Please refresh the app.`);
        }
      }
      
      // Add timeout to prevent hanging requests
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      );
      
      const tradePromise = apiService.executeMarketOrder(tradeRequest);
      const response = await Promise.race([tradePromise, timeoutPromise]) as any;

      if (response.success && response.data) {
        console.log('✅ Trade executed successfully:', response.data);
        console.log(`💰 ${tradeRequest.type.toUpperCase()} ${tradeRequest.shares} shares of ${response.data.playerName} for $${response.data.totalAmount.toFixed(2)}`);
        
        // The backend has already updated the portfolio in the database
        // We just need to refresh the portfolio from the backend
        console.log('✅ Trade executed successfully by backend');
        console.log('🔄 Refreshing portfolio from backend to get updated data...');
        
        // Refresh portfolio from backend to get the updated holdings
        try {
          await refreshPortfolio();
          console.log('✅ Portfolio refreshed from backend');
        } catch (refreshError) {
          console.error('❌ Failed to refresh portfolio from backend:', refreshError);
          // Don't fail the trade if portfolio refresh fails
        }
        
        return response.data;
      } else {
        console.log('❌ Trade failed:', response.error);
        throw new Error(response.error || 'Trade execution failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Trade execution failed';
      console.log('❌ Trade error:', errorMessage);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const value: GameContextType = {
    currentGame,
    players,
    loading,
    error,
    refreshGame,
    refreshPlayers,
    forceRefreshAll,
    clearAllData,
    forceRestart,
    clearAllStorage,
    clearCachedPlayers,
    updatePlayerPrice,
    executeTrade,
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
import React, { createContext, useContext, useState, useEffect } from 'react';
import { LiveGame, Player, TradeRequest, Trade } from '../../../shared/src/types';
import { apiService } from '../services/api';
import { usePortfolio } from './PortfolioContext';

interface GameContextType {
  currentGame: LiveGame | null;
  players: Player[];
  loading: boolean;
  error: string | null;
  refreshGame: () => Promise<void>;
  refreshPlayers: () => Promise<void>;
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
    await Promise.all([
      fetchCurrentGame(),
      fetchPlayers()
    ]);
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
      const response = await apiService.getPlayers();

      if (response.success && response.data) {
        setPlayers(response.data);
      } else {
        setError(response.error || 'Failed to fetch players');
      }
    } catch (err) {
      console.error('Error fetching players:', err);
      setError('Failed to fetch players');
    }
  };

  const refreshGame = async () => {
    await fetchCurrentGame();
  };

  const refreshPlayers = async () => {
    await fetchPlayers();
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
      const response = await apiService.executeMarketOrder(tradeRequest);

      if (response.success && response.data) {
        console.log('✅ Trade executed successfully:', response.data);
        console.log(`💰 ${tradeRequest.type.toUpperCase()} ${tradeRequest.shares} shares of ${response.data.playerName} for $${response.data.totalAmount.toFixed(2)}`);
        
        // Add the trade to user's portfolio
        if (tradeRequest.type === 'buy') {
          const holding = {
            playerId: tradeRequest.playerId,
            playerName: response.data.playerName,
            shares: tradeRequest.shares,
            averagePrice: response.data.price,
            currentPrice: response.data.price,
            totalValue: response.data.totalAmount,
            unrealizedPL: 0,
            unrealizedPLPercent: 0,
            purchaseDate: Date.now(),
            daysSinceHeld: 0,
            holdingBonus: 0,
            holdingMultiplier: 1,
            // Add unique identifier to prevent React key conflicts
            id: `${tradeRequest.playerId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          };
          addUserTrade(holding, tradeRequest.accountType);
          // Update cash balance (decrease for buy)
          updateCashBalance(response.data.totalAmount, 'buy');
        } else if (tradeRequest.type === 'sell') {
          // For sells, we need to remove shares from existing holdings
          // This will be handled by the portfolio refresh from the backend
          console.log('📉 Sell trade executed, portfolio will be updated via refresh');
          // Update cash balance (increase for sell)
          updateCashBalance(response.data.totalAmount, 'sell');
        }
        
        // Portfolio will update when user navigates to portfolio tab
        console.log('✅ Trade completed - portfolio will update on next view');
        
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
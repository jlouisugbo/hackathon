import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getPlayers, getPortfolios, getTrades, addTrade, portfolios, players, executeTradeOrder, createDemoPortfolio } from '../data/mockData';
import { databaseService } from '../services/databaseService';
import { authService } from '../services/authService';
import { ApiResponse, Trade, TradeRequest, Portfolio } from '../types';

const router = express.Router();

// POST /api/trades - Execute trade (simplified endpoint for demo)
router.post('/', async (req, res) => {
  try {
    const tradeRequest = req.body;
    const { playerId, playerName, type, shares, orderType = 'market', accountType = 'season' } = tradeRequest;
    
    // Extract user ID from Authorization header
    let userId: string;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        // Handle demo token
        if (token === 'demo-token') {
          userId = req.headers['user-id'] as string || 'demo-user';
        } else {
          const decoded = authService.verifyToken(token);
          userId = decoded.id;
        }
      } catch (error) {
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired token',
          message: 'Authentication required'
        });
      }
    } else {
      // Fallback for demo
      userId = req.headers['user-id'] as string || 'demo-user';
    }

    // Validation
    if (!playerId || !type || !shares) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'playerId, type, and shares are required'
      });
    }

    if (!['buy', 'sell'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid trade type',
        message: 'Trade type must be "buy" or "sell"'
      });
    }

    if (shares <= 0 || !Number.isInteger(shares)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid shares',
        message: 'Shares must be a positive integer'
      });
    }

    // Find player
    const playersList = getPlayers();
    const player = playersList.find(p => p.id === playerId);
    if (!player) {
      return res.status(404).json({
        success: false,
        error: 'Player not found',
        message: `Player with ID ${playerId} not found`
      });
    }

    const currentPrice = player.currentPrice;
    const totalAmount = shares * currentPrice;

    // Try to execute trade using database service first
    let tradeResult;
    let portfolio = await databaseService.getPortfolioByUserId(userId);
    
    if (portfolio) {
      // Execute with Supabase
      tradeResult = await executeTradeWithDatabase(userId, playerId, playerName || player.name, type, shares, currentPrice, accountType, totalAmount);
    } else {
      // Ensure user has a portfolio in mock data (create one if they don't)
      let userPortfolio = portfolios.find(p => p.userId === userId);
      if (!userPortfolio) {
        console.log(`📊 Creating portfolio for user: ${userId}`);
        userPortfolio = createDemoPortfolio(userId);
      }
      
      // Fallback to mock data
      tradeResult = executeTradeOrder(userId, playerId, shares, type, accountType);
    }

    if (tradeResult.success) {
      const trade: Trade = {
        id: uuidv4(),
        userId,
        playerId,
        playerName: playerName || player.name,
        type,
        orderType,
        shares,
        price: currentPrice,
        timestamp: Date.now(),
        accountType,
        status: 'executed',
        totalAmount,
        multiplier: 1.0
      };

      const response: ApiResponse<Trade> = {
        success: true,
        data: trade,
        message: `${type.toUpperCase()} order executed successfully`
      };

      res.json(response);
    } else {
      res.status(400).json({
        success: false,
        error: tradeResult.error,
        message: `Trade failed: ${tradeResult.error}`
      });
    }

  } catch (error) {
    console.error('Trade execution error:', error);
    res.status(500).json({
      success: false,
      error: 'Trade execution failed',
      message: 'An error occurred while executing the trade'
    });
  }
});

// Helper function to execute trade with database
async function executeTradeWithDatabase(
  userId: string, 
  playerId: string, 
  playerName: string, 
  type: 'buy' | 'sell', 
  shares: number, 
  price: number, 
  accountType: 'season' | 'live',
  totalAmount: number
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get current portfolio
    const portfolio = await databaseService.getPortfolioByUserId(userId);
    if (!portfolio) {
      return { success: false, error: 'Portfolio not found' };
    }

    if (type === 'buy') {
      // Check if user has enough balance
      if (portfolio.availableBalance < totalAmount) {
        return { success: false, error: 'Insufficient balance' };
      }

      // Update portfolio balance
      await databaseService.updatePortfolio(userId, {
        ...portfolio,
        availableBalance: portfolio.availableBalance - totalAmount,
        totalValue: portfolio.totalValue // Will be updated by holding creation
      });

      // Create or update holding
      await databaseService.createOrUpdateHolding(userId, {
        playerId,
        playerName,
        shares,
        averagePrice: price,
        currentPrice: price,
        totalValue: totalAmount,
        unrealizedPL: 0,
        unrealizedPLPercent: 0,
        accountType,
        purchaseDate: Date.now()
      });

    } else { // sell
      // Check if user has enough shares
      const existingPortfolio = await databaseService.getPortfolioByUserId(userId);
      const holdings = accountType === 'season' ? existingPortfolio?.seasonHoldings : existingPortfolio?.liveHoldings;
      const holding = holdings?.find(h => h.playerId === playerId);
      
      if (!holding || holding.shares < shares) {
        return { success: false, error: 'Insufficient shares' };
      }

      // Update portfolio balance
      await databaseService.updatePortfolio(userId, {
        ...portfolio,
        availableBalance: portfolio.availableBalance + totalAmount
      });

      // Update holding (reduce shares)
      await databaseService.createOrUpdateHolding(userId, {
        playerId,
        playerName,
        shares: -shares, // Negative to reduce shares
        averagePrice: holding.averagePrice,
        currentPrice: price,
        accountType,
        purchaseDate: holding.purchaseDate
      });
    }

    // Record the trade
    await databaseService.createTrade(userId, {
      userId,
      playerId,
      playerName,
      type,
      orderType: 'market',
      shares,
      price,
      accountType,
      status: 'executed',
      totalAmount,
      multiplier: 1.0
    });

    return { success: true };
  } catch (error) {
    console.error('Database trade execution error:', error);
    return { success: false, error: 'Database operation failed' };
  }
}

// GET /api/trades/:userId - Get user's trade history
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Try to get trades from database first
    const dbTrades = await databaseService.getTradesByUserId(userId);
    if (dbTrades && dbTrades.length > 0) {
      const response: ApiResponse<Trade[]> = {
        success: true,
        data: dbTrades,
        message: `Retrieved ${dbTrades.length} trades from database`
      };
      return res.json(response);
    }
    
    // Fallback to mock data
    const userTrades = getTrades().filter(trade => trade.userId === userId);
    const response: ApiResponse<Trade[]> = {
      success: true,
      data: userTrades,
      message: `Retrieved ${userTrades.length} trades from mock data`
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error getting trades:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve trades',
      message: 'An error occurred while retrieving trade history'
    });
  }
});

// GET /api/trades - Get all trades (admin)
router.get('/', (req, res) => {
  const allTrades = getTrades();
  const response: ApiResponse<Trade[]> = {
    success: true,
    data: allTrades,
    message: `Retrieved ${allTrades.length} total trades`
  };
  res.json(response);
});

export default router;
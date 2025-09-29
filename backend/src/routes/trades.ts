import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getPlayers, getPortfolios, getTrades, addTrade, portfolios, players, createLimitOrder, getUserLimitOrders, executeTradeOrder, updatePlayerPrice, createDemoPortfolio } from '../data/mockData';
import { databaseService } from '../services/databaseService';
import { authService } from '../services/authService';
import { ApiResponse, Trade, TradeRequest, Portfolio } from '../types';
import { MarketImpactCalculator } from '../utils/marketImpact';
import { broadcastTradeExecution, broadcastPriceUpdate } from '../socket/socketHandler';

const router = express.Router();

// POST /api/trades - Execute trade (simplified endpoint for demo)
router.post('/', async (req, res) => {
  try {
    console.log('🔍 Trade request received:', {
      body: req.body,
      headers: {
        authorization: req.headers.authorization,
        'user-id': req.headers['user-id']
      }
    });
    
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
    console.log('🔍 Validating trade request:', { playerId, type, shares, accountType });
    if (!playerId || !type || !shares) {
      console.log('❌ Missing required fields:', { playerId, type, shares });
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

    // Calculate market impact before executing trade
    const marketImpact = MarketImpactCalculator.calculateTradeImpact(
      playerId,
      type,
      shares,
      currentPrice
    );

    const totalAmount = shares * currentPrice;

    // Ensure user has a portfolio (create one if they don't)
    let userPortfolio = portfolios.find(p => p.userId === userId);
    if (!userPortfolio) {
      console.log(`📊 Creating portfolio for user: ${userId}`);
      userPortfolio = createDemoPortfolio(userId);
    }

    // Use mock data for session persistence (no database)
    let tradeResult;
    tradeResult = executeTradeOrder(userId, playerId, shares, type, accountType);

    if (tradeResult.success) {
      // Apply market impact to player price if significant
      if (marketImpact.broadcastRequired && Math.abs(marketImpact.priceImpact) > 0.01) {
        updatePlayerPrice(playerId, marketImpact.newPrice);

        // Broadcast price update to all connected users
        const io = req.app.get('io');
        if (io) {
          broadcastPriceUpdate(
            io,
            playerId,
            marketImpact.newPrice,
            marketImpact.priceImpact,
            marketImpact.priceImpactPercent
          );
        }
      }

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
        multiplier: MarketImpactCalculator.calculateFlashMultiplier(marketImpact)
      };

      // Broadcast trade execution to all users if significant
      if (marketImpact.broadcastRequired) {
        const io = req.app.get('io');
        if (io) {
          broadcastTradeExecution(io, {
            ...trade,
            marketImpact: {
              priceImpact: marketImpact.priceImpact,
              priceImpactPercent: marketImpact.priceImpactPercent,
              impactLevel: marketImpact.impactLevel,
              description: MarketImpactCalculator.getImpactDescription(marketImpact.impactLevel, shares, player.name)
            }
          });
        }
      }

      const response: ApiResponse<Trade> = {
        success: true,
        data: {
          ...trade,
          marketImpact: {
            priceImpact: marketImpact.priceImpact,
            priceImpactPercent: marketImpact.priceImpactPercent,
            newPrice: marketImpact.newPrice,
            impactLevel: marketImpact.impactLevel
          }
        },
        message: `${type.toUpperCase()} order executed successfully${marketImpact.broadcastRequired ? ` with ${marketImpact.impactLevel} market impact` : ''}`
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

// POST /api/trades/market - Execute market order
router.post('/market', async (req, res) => {
  try {
    const tradeRequest: TradeRequest = req.body;
    const { playerId, type, shares, accountType } = tradeRequest;
    const userId = req.headers['user-id'] as string || 'user-1'; // Demo user ID

    // Validation
    if (!playerId || !type || !shares || !accountType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'playerId, type, shares, and accountType are required'
      });
    }

    if (!['buy', 'sell'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid trade type',
        message: 'Trade type must be "buy" or "sell"'
      });
    }

    if (!['season', 'live'].includes(accountType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid account type',
        message: 'Account type must be "season" or "live"'
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

    // Find portfolio
    const portfoliosList = getPortfolios();
    const portfolioIndex = portfolios.findIndex(p => p.userId === userId);
    if (portfolioIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Portfolio not found',
        message: `Portfolio for user ${userId} not found`
      });
    }

    const portfolio = portfolios[portfolioIndex];
    const currentPrice = player.currentPrice;
    const totalAmount = shares * currentPrice;

    // Check live trading limits
    if (accountType === 'live' && portfolio.tradesRemaining <= 0) {
      return res.status(400).json({
        success: false,
        error: 'No trades remaining',
        message: 'You have no live trades remaining for today'
      });
    }

    let trade: Trade;

    if (type === 'buy') {
      // Check if user has enough balance
      if (portfolio.availableBalance < totalAmount) {
        return res.status(400).json({
          success: false,
          error: 'Insufficient funds',
          message: `You need $${totalAmount.toFixed(2)} but only have $${portfolio.availableBalance.toFixed(2)}`
        });
      }

      // Execute buy order
      portfolio.availableBalance -= totalAmount;

      // Add to holdings or update existing
      const holdings = accountType === 'season' ? portfolio.seasonHoldings : portfolio.liveHoldings;
      const existingHoldingIndex = holdings.findIndex(h => h.playerId === playerId);

      if (existingHoldingIndex >= 0) {
        // Update existing holding
        const holding = holdings[existingHoldingIndex];
        const totalShares = holding.shares + shares;
        const totalCost = (holding.shares * holding.averagePrice) + totalAmount;
        holding.averagePrice = totalCost / totalShares;
        holding.shares = totalShares;
        holding.currentPrice = currentPrice;
        holding.totalValue = totalShares * currentPrice;
        holding.unrealizedPL = holding.totalValue - totalCost;
        holding.unrealizedPLPercent = (holding.unrealizedPL / totalCost) * 100;
      } else {
        // Create new holding
        holdings.push({
          playerId,
          playerName: player.name,
          shares,
          averagePrice: currentPrice,
          currentPrice,
          totalValue: totalAmount,
          unrealizedPL: 0,
          unrealizedPLPercent: 0,
          purchaseDate: Date.now()
        });
      }

      trade = {
        id: uuidv4(),
        userId,
        playerId,
        playerName: player.name,
        type: 'buy',
        orderType: 'market',
        shares,
        price: currentPrice,
        timestamp: Date.now(),
        accountType,
        status: 'executed',
        totalAmount
      };

    } else {
      // Sell order
      const holdings = accountType === 'season' ? portfolio.seasonHoldings : portfolio.liveHoldings;
      const holdingIndex = holdings.findIndex(h => h.playerId === playerId);

      if (holdingIndex === -1) {
        return res.status(400).json({
          success: false,
          error: 'No holdings found',
          message: `You don't own any shares of ${player.name}`
        });
      }

      const holding = holdings[holdingIndex];

      if (holding.shares < shares) {
        return res.status(400).json({
          success: false,
          error: 'Insufficient shares',
          message: `You only own ${holding.shares} shares but tried to sell ${shares}`
        });
      }

      // Execute sell order
      portfolio.availableBalance += totalAmount;

      if (holding.shares === shares) {
        // Remove holding completely
        holdings.splice(holdingIndex, 1);
      } else {
        // Reduce shares
        holding.shares -= shares;
        holding.totalValue = holding.shares * currentPrice;
        holding.unrealizedPL = holding.totalValue - (holding.shares * holding.averagePrice);
        holding.unrealizedPLPercent = ((holding.totalValue - (holding.shares * holding.averagePrice)) / (holding.shares * holding.averagePrice)) * 100;
      }

      trade = {
        id: uuidv4(),
        userId,
        playerId,
        playerName: player.name,
        type: 'sell',
        orderType: 'market',
        shares,
        price: currentPrice,
        timestamp: Date.now(),
        accountType,
        status: 'executed',
        totalAmount
      };
    }

    // Update portfolio totals
    const seasonValue = portfolio.seasonHoldings.reduce((sum, h) => sum + h.totalValue, 0);
    const liveValue = portfolio.liveHoldings.reduce((sum, h) => sum + h.totalValue, 0);
    portfolio.totalValue = seasonValue + liveValue + portfolio.availableBalance;
    portfolio.lastUpdated = Date.now();

    // Reduce live trades remaining
    if (accountType === 'live') {
      portfolio.tradesRemaining = Math.max(0, portfolio.tradesRemaining - 1);
    }

    // Save portfolio to database
    try {
      const dbResult = await databaseService.updatePortfolio(userId, portfolio);
      if (!dbResult) {
        console.error('❌ Database update returned false');
        return res.status(500).json({
          success: false,
          error: 'Database update failed',
          message: 'Trade executed but failed to save to database'
        });
      }
      console.log('✅ Portfolio saved to database successfully');
    } catch (error) {
      console.error('❌ Failed to save portfolio to database:', error);
      return res.status(500).json({
        success: false,
        error: 'Database update failed',
        message: 'Trade executed but failed to save to database'
      });
    }

    // Add trade to history
    addTrade(trade);

    const response: ApiResponse<Trade> = {
      success: true,
      data: trade,
      message: `${type.charAt(0).toUpperCase() + type.slice(1)} order executed successfully`
    };

    res.json(response);

  } catch (error) {
    console.error('Error executing trade:', error);
    res.status(500).json({
      success: false,
      error: 'Trade execution failed',
      message: 'An error occurred while executing the trade'
    });
  }
});

// POST /api/trades/limit - Place limit order
router.post('/limit', async (req, res) => {
  try {
    const { playerId, type, shares, limitPrice, accountType } = req.body;
    const userId = req.headers['user-id'] as string || 'user-1'; // Demo user ID

    // Validation
    if (!playerId || !type || !shares || !limitPrice || !accountType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'playerId, type, shares, limitPrice, and accountType are required'
      });
    }

    if (!['buy', 'sell'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid trade type',
        message: 'Trade type must be "buy" or "sell"'
      });
    }

    if (!['season', 'live'].includes(accountType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid account type',
        message: 'Account type must be "season" or "live"'
      });
    }

    if (shares <= 0 || !Number.isInteger(shares)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid shares',
        message: 'Shares must be a positive integer'
      });
    }

    if (limitPrice <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid limit price',
        message: 'Limit price must be greater than 0'
      });
    }

    // Check if user already has too many pending limit orders
    const userOrders = getUserLimitOrders(userId);
    if (userOrders.length >= 10) {
      return res.status(400).json({
        success: false,
        error: 'Too many pending orders',
        message: 'Maximum 10 pending limit orders allowed'
      });
    }

    const result = createLimitOrder(userId, playerId, shares, type, limitPrice, accountType);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
        message: result.error
      });
    }

    res.json({
      success: true,
      data: result.order,
      message: 'Limit order created successfully'
    });
  } catch (error) {
    console.error('Error creating limit order:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create limit order',
      message: 'An error occurred while creating the limit order'
    });
  }
});

// GET /api/trades/:userId/history - Get trade history for user
router.get('/:userId/history', (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const accountType = req.query.accountType as string;
    const type = req.query.type as string;

    const allTrades = getTrades();
    let userTrades = allTrades.filter(t => t.userId === userId);

    // Filter by account type if specified
    if (accountType && ['season', 'live'].includes(accountType)) {
      userTrades = userTrades.filter(t => t.accountType === accountType);
    }

    // Filter by trade type if specified
    if (type && ['buy', 'sell'].includes(type)) {
      userTrades = userTrades.filter(t => t.type === type);
    }

    // Sort by timestamp (newest first)
    userTrades.sort((a, b) => b.timestamp - a.timestamp);

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedTrades = userTrades.slice(startIndex, endIndex);

    const response = {
      success: true,
      data: paginatedTrades,
      pagination: {
        page,
        limit,
        total: userTrades.length,
        totalPages: Math.ceil(userTrades.length / limit)
      },
      message: `Retrieved ${paginatedTrades.length} trades for user ${userId}`
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching trade history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trade history',
      message: 'An error occurred while retrieving trade history'
    });
  }
});

// GET /api/trades/recent - Get recent trades across all users
router.get('/recent', (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const allTrades = getTrades();

    const recentTrades = allTrades
      .filter(t => t.status === 'executed')
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);

    const response: ApiResponse<Trade[]> = {
      success: true,
      data: recentTrades,
      message: `Retrieved ${recentTrades.length} recent trades`
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching recent trades:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent trades',
      message: 'An error occurred while retrieving recent trades'
    });
  }
});

// GET /api/trades/volume/:playerId - Get trading volume for a player
router.get('/volume/:playerId', (req, res) => {
  try {
    const { playerId } = req.params;
    const timeframe = req.query.timeframe as string || '24h'; // 1h, 24h, 7d, 30d

    let timeMs: number;
    switch (timeframe) {
      case '1h':
        timeMs = 60 * 60 * 1000;
        break;
      case '24h':
        timeMs = 24 * 60 * 60 * 1000;
        break;
      case '7d':
        timeMs = 7 * 24 * 60 * 60 * 1000;
        break;
      case '30d':
        timeMs = 30 * 24 * 60 * 60 * 1000;
        break;
      default:
        timeMs = 24 * 60 * 60 * 1000;
    }

    const cutoffTime = Date.now() - timeMs;
    const allTrades = getTrades();
    const playerTrades = allTrades.filter(t =>
      t.playerId === playerId &&
      t.status === 'executed' &&
      t.timestamp >= cutoffTime
    );

    const totalVolume = playerTrades.reduce((sum, t) => sum + t.totalAmount, 0);
    const totalShares = playerTrades.reduce((sum, t) => sum + t.shares, 0);
    const buyVolume = playerTrades.filter(t => t.type === 'buy').reduce((sum, t) => sum + t.totalAmount, 0);
    const sellVolume = playerTrades.filter(t => t.type === 'sell').reduce((sum, t) => sum + t.totalAmount, 0);

    const response: ApiResponse = {
      success: true,
      data: {
        playerId,
        timeframe,
        totalVolume: Math.round(totalVolume * 100) / 100,
        totalShares,
        buyVolume: Math.round(buyVolume * 100) / 100,
        sellVolume: Math.round(sellVolume * 100) / 100,
        tradeCount: playerTrades.length,
        avgTradeSize: playerTrades.length > 0 ? Math.round((totalVolume / playerTrades.length) * 100) / 100 : 0
      },
      message: `Retrieved trading volume for player ${playerId} over ${timeframe}`
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching trading volume:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trading volume',
      message: 'An error occurred while retrieving trading volume'
    });
  }
});

export default router;
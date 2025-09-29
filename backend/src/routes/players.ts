import express from 'express';
import { getPlayers } from '../data/nbaData';
import { ApiResponse, Player } from '../types';
import PriceEngine from '../utils/priceEngine';

const router = express.Router();

// GET /api/players - Get all players with current prices (with pagination)
router.get('/', (req, res) => {
  try {
    const players = getPlayers();
    const sortBy = req.query.sortBy as string || 'name';
    const order = req.query.order as string || 'asc';
    const position = req.query.position as string;
    const team = req.query.team as string;
    const search = req.query.search as string;
    
    // Pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    let filteredPlayers = [...players];

    // Filter by search query if specified
    if (search) {
      const searchLower = search.toLowerCase();
      filteredPlayers = filteredPlayers.filter(p => 
        p.name.toLowerCase().includes(searchLower) ||
        p.team.toLowerCase().includes(searchLower) ||
        p.position.toLowerCase().includes(searchLower)
      );
    }

    // Filter by position if specified
    if (position) {
      filteredPlayers = filteredPlayers.filter(p => p.position === position.toUpperCase());
    }

    // Filter by team if specified
    if (team) {
      filteredPlayers = filteredPlayers.filter(p => p.team === team.toUpperCase());
    }

    // Sort players
    filteredPlayers.sort((a, b) => {
      let aValue: any = a[sortBy as keyof Player];
      let bValue: any = b[sortBy as keyof Player];

      if (sortBy === 'currentPrice' || sortBy === 'priceChange24h' || sortBy === 'priceChangePercent24h') {
        aValue = Number(aValue);
        bValue = Number(bValue);
      } else if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (order === 'desc') {
        return aValue < bValue ? 1 : -1;
      } else {
        return aValue > bValue ? 1 : -1;
      }
    });

    // Calculate pagination info
    const totalPlayers = filteredPlayers.length;
    const totalPages = Math.ceil(totalPlayers / limit);
    const paginatedPlayers = filteredPlayers.slice(offset, offset + limit);

    const response: any = {
      success: true,
      data: paginatedPlayers,
      message: `Retrieved ${paginatedPlayers.length} players (page ${page} of ${totalPages})`,
      pagination: {
        page,
        limit,
        totalPlayers,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching players:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch players',
      message: 'An error occurred while retrieving players'
    });
  }
});

// GET /api/players/:id - Get specific player details
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const players = getPlayers();
    const player = players.find(p => p.id === id);

    if (!player) {
      return res.status(404).json({
        success: false,
        error: 'Player not found',
        message: `Player with ID ${id} not found`
      });
    }

    const response: ApiResponse<Player> = {
      success: true,
      data: player,
      message: `Retrieved player ${player.name}`
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching player:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch player',
      message: 'An error occurred while retrieving player details'
    });
  }
});

// GET /api/players/:id/history - Get player price history
router.get('/:id/history', (req, res) => {
  try {
    const { id } = req.params;
    const players = getPlayers();
    const player = players.find(p => p.id === id);

    if (!player) {
      return res.status(404).json({
        success: false,
        error: 'Player not found',
        message: `Player with ID ${id} not found`
      });
    }

    const limit = parseInt(req.query.limit as string) || 30;
    const priceHistory = player.priceHistory.slice(-limit);

    const response: ApiResponse = {
      success: true,
      data: {
        playerId: player.id,
        playerName: player.name,
        currentPrice: player.currentPrice,
        history: priceHistory
      },
      message: `Retrieved ${priceHistory.length} price points for ${player.name}`
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching price history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch price history',
      message: 'An error occurred while retrieving price history'
    });
  }
});

// GET /api/players/search/:query - Search players by name
router.get('/search/:query', (req, res) => {
  try {
    const { query } = req.params;
    const players = getPlayers();

    const searchResults = players.filter(player =>
      player.name.toLowerCase().includes(query.toLowerCase()) ||
      player.team.toLowerCase().includes(query.toLowerCase())
    );

    const response: ApiResponse<Player[]> = {
      success: true,
      data: searchResults,
      message: `Found ${searchResults.length} players matching "${query}"`
    };

    res.json(response);
  } catch (error) {
    console.error('Error searching players:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search players',
      message: 'An error occurred while searching players'
    });
  }
});

// GET /api/players/trending/gainers - Get top price gainers
router.get('/trending/gainers', (req, res) => {
  try {
    const players = getPlayers();
    const limit = parseInt(req.query.limit as string) || 5;

    const gainers = players
      .filter(p => p.priceChangePercent24h > 0)
      .sort((a, b) => b.priceChangePercent24h - a.priceChangePercent24h)
      .slice(0, limit);

    const response: ApiResponse<Player[]> = {
      success: true,
      data: gainers,
      message: `Retrieved top ${gainers.length} gainers`
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching gainers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch gainers',
      message: 'An error occurred while retrieving top gainers'
    });
  }
});

// GET /api/players/trending/losers - Get top price losers
router.get('/trending/losers', (req, res) => {
  try {
    const players = getPlayers();
    const limit = parseInt(req.query.limit as string) || 5;

    const losers = players
      .filter(p => p.priceChangePercent24h < 0)
      .sort((a, b) => a.priceChangePercent24h - b.priceChangePercent24h)
      .slice(0, limit);

    const response: ApiResponse<Player[]> = {
      success: true,
      data: losers,
      message: `Retrieved top ${losers.length} losers`
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching losers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch losers',
      message: 'An error occurred while retrieving top losers'
    });
  }
});

// REST endpoints for Joel's Socket system

// GET /api/players/prices - Get current prices for all players (for socket broadcasts)
router.get('/prices', (req, res) => {
  try {
    const players = getPlayers();
    const prices = players.map(player => ({
      id: player.id,
      name: player.name,
      currentPrice: player.currentPrice,
      priceChange24h: player.priceChange24h,
      priceChangePercent24h: player.priceChangePercent24h,
      lastUpdated: Date.now()
    }));

    res.json({
      success: true,
      data: prices,
      message: `Retrieved prices for ${prices.length} players`
    });
  } catch (error) {
    console.error('Error fetching prices:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch prices',
      message: 'An error occurred while retrieving player prices'
    });
  }
});

// POST /api/players/:id/flash-multiplier - Trigger flash multiplier (for Joel's game events)
router.post('/:id/flash-multiplier', (req, res) => {
  try {
    const { id } = req.params;
    const { multiplier, reason } = req.body;

    if (!multiplier || typeof multiplier !== 'number' || multiplier < 1 || multiplier > 5) {
      return res.status(400).json({
        success: false,
        error: 'Invalid multiplier',
        message: 'Multiplier must be a number between 1 and 5'
      });
    }

    if (!reason || typeof reason !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid reason',
        message: 'Reason must be provided as a string'
      });
    }

    const priceEngine = PriceEngine.getInstance();
    const success = priceEngine.triggerFlashMultiplier(id, multiplier, reason);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Player not found',
        message: `Player with ID ${id} not found`
      });
    }

    res.json({
      success: true,
      data: { playerId: id, multiplier, reason },
      message: `Flash multiplier applied to player ${id}`
    });
  } catch (error) {
    console.error('Error applying flash multiplier:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to apply flash multiplier',
      message: 'An error occurred while applying flash multiplier'
    });
  }
});

// GET /api/players/market/data - Get market summary data (for Joel's socket broadcasts)
router.get('/market/data', (req, res) => {
  try {
    const players = getPlayers();
    const priceEngine = PriceEngine.getInstance();
    const marketData = priceEngine.getMarketData(players);

    res.json({
      success: true,
      data: marketData,
      message: 'Retrieved market data'
    });
  } catch (error) {
    console.error('Error fetching market data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch market data',
      message: 'An error occurred while retrieving market data'
    });
  }
});

export default router;
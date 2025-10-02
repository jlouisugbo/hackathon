import express from 'express';
import { liveDataService } from '../services/liveDataService';
import { realPriceEngine } from '../utils/realPriceEngine';
import { liveGameManager } from '../services/liveGameManager';
import { ApiResponse } from '../types';

const router = express.Router();

// GET /api/live/active-games - Get currently active games
router.get('/active-games', async (req, res) => {
  try {
    const activeGames = await liveDataService.getActiveGames();
    
    const response: ApiResponse = {
      success: true,
      data: activeGames,
      message: `Found ${activeGames.length} active games`
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching active games:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch active games',
      message: 'An error occurred while retrieving active games'
    });
  }
});

// GET /api/live/game/:gameId/stats - Get live player stats for a game
router.get('/game/:gameId/stats', async (req, res) => {
  try {
    const { gameId } = req.params;
    const stats = await liveDataService.getLivePlayerStats(gameId);
    
    const response: ApiResponse = {
      success: true,
      data: stats,
      message: `Retrieved stats for game ${gameId}`
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching game stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch game stats',
      message: 'An error occurred while retrieving game stats'
    });
  }
});


// GET /api/live/player/:playerId - Get player details
router.get('/player/:playerId', async (req, res) => {
  try {
    const { playerId } = req.params;
    const player = await liveDataService.getPlayerDetails(playerId);
    
    if (!player) {
      return res.status(404).json({
        success: false,
        error: 'Player not found',
        message: `Player with ID ${playerId} not found`
      });
    }
    
    const response: ApiResponse = {
      success: true,
      data: player,
      message: `Retrieved player details for ${playerId}`
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching player details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch player details',
      message: 'An error occurred while retrieving player details'
    });
  }
});

// GET /api/live/prices - Get current real-time prices
router.get('/prices', async (req, res) => {
  try {
    const currentPrices = realPriceEngine.getAllCurrentPrices();
    const pricesArray = Array.from(currentPrices.entries()).map(([playerId, price]) => ({
      playerId,
      price
    }));
    
    const response: ApiResponse = {
      success: true,
      data: pricesArray,
      message: `Retrieved ${pricesArray.length} current prices`
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching current prices:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch current prices',
      message: 'An error occurred while retrieving current prices'
    });
  }
});

// POST /api/live/update-prices/:gameId - Force update prices for a game
router.post('/update-prices/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;
    const priceUpdates = await liveGameManager.forceUpdateGame(gameId);
    
    const response: ApiResponse = {
      success: true,
      data: priceUpdates,
      message: `Updated prices for ${priceUpdates.length} players in game ${gameId}`
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error updating prices:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update prices',
      message: 'An error occurred while updating prices'
    });
  }
});

// GET /api/live/game/:gameId/playbyplay - Get play-by-play for a specific game
router.get('/game/:gameId/playbyplay', async (req, res) => {
  try {
    const { gameId } = req.params;
    
    // Get the active games to get the filtered plays
    const activeGames = await liveDataService.getActiveGames();
    const game = activeGames.find(g => g.GameID.toString() === gameId);
    
    if (game && game.Plays) {
      const response: ApiResponse = {
        success: true,
        data: game.Plays,
        message: `Retrieved ${game.Plays.length} plays for game ${gameId}`
      };
      res.json(response);
    } else {
      // Fallback to full play-by-play if no cached game
      const playByPlay = await liveDataService.getReplayPlayByPlay(gameId);
      
      const response: ApiResponse = {
        success: true,
        data: playByPlay,
        message: `Retrieved ${playByPlay.length} plays for game ${gameId}`
      };
      res.json(response);
    }
  } catch (error) {
    console.error('Error fetching play-by-play:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch play-by-play',
      message: 'An error occurred while retrieving play-by-play data'
    });
  }
});

// GET /api/live/active-players - Get active players from current game
router.get('/active-players', async (req, res) => {
  try {
    console.log('🏀 Fetching active players...');
    const activePlayers = await liveDataService.getActivePlayers();
    
    const response: ApiResponse = {
      success: true,
      data: activePlayers,
      message: `Retrieved ${activePlayers.length} active players`
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching active players:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch active players',
      message: 'An error occurred while retrieving active players data'
    });
  }
});

// GET /api/live/status - Get live monitoring status
router.get('/status', (req, res) => {
  try {
    const status = {
      isMonitoring: liveGameManager.isMonitoring(),
      activeGames: liveGameManager.getActiveGames(),
      timestamp: new Date().toISOString()
    };
    
    const response: ApiResponse = {
      success: true,
      data: status,
      message: 'Live monitoring status retrieved'
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching monitoring status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch monitoring status',
      message: 'An error occurred while retrieving monitoring status'
    });
  }
});

export default router;

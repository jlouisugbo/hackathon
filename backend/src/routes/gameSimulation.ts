import express from 'express';
import GameSimulationService from '../services/gameSimulationService';
import { ApiResponse } from '../types';

const router = express.Router();
const gameSimulationService = new GameSimulationService();

// GET /api/simulation/games/recent - Get recent games
router.get('/games/recent', async (req, res) => {
  try {
    const games = await gameSimulationService.getRecentGames();
    
    const response: ApiResponse<typeof games> = {
      success: true,
      data: games,
      message: `Retrieved ${games.length} recent games`
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching recent games:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent games',
      message: 'An error occurred while retrieving recent games'
    });
  }
});

// GET /api/simulation/games/date/:date - Get games by date (YYYY-MM-DD)
router.get('/games/date/:date', async (req, res) => {
  try {
    const { date } = req.params;
    
    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format',
        message: 'Date must be in YYYY-MM-DD format'
      });
    }

    const games = await gameSimulationService.getGamesByDate(date);
    
    const response: ApiResponse<typeof games> = {
      success: true,
      data: games,
      message: `Retrieved ${games.length} games for ${date}`
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching games by date:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch games by date',
      message: 'An error occurred while retrieving games'
    });
  }
});

// GET /api/simulation/games/season/:season - Get games by season
router.get('/games/season/:season', async (req, res) => {
  try {
    const { season } = req.params;
    const seasonNumber = parseInt(season);
    
    if (isNaN(seasonNumber) || seasonNumber < 2020 || seasonNumber > 2025) {
      return res.status(400).json({
        success: false,
        error: 'Invalid season',
        message: 'Season must be a valid year between 2020 and 2025'
      });
    }

    const games = await gameSimulationService.getGamesBySeason(seasonNumber);
    
    const response: ApiResponse<typeof games> = {
      success: true,
      data: games,
      message: `Retrieved ${games.length} games for ${seasonNumber} season`
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching games by season:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch games by season',
      message: 'An error occurred while retrieving games'
    });
  }
});

// GET /api/simulation/play-by-play/:gameId - Get play-by-play for a game
router.get('/play-by-play/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;
    const gameIdNumber = parseInt(gameId);
    
    if (isNaN(gameIdNumber)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid game ID',
        message: 'Game ID must be a valid number'
      });
    }

    const plays = await gameSimulationService.getPlayByPlay(gameIdNumber);
    
    const response: ApiResponse<typeof plays> = {
      success: true,
      data: plays,
      message: `Retrieved ${plays.length} plays for game ${gameId}`
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching play-by-play:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch play-by-play',
      message: 'An error occurred while retrieving play-by-play data'
    });
  }
});

// GET /api/simulation/player-stats/:gameId - Get player stats for a game
router.get('/player-stats/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;
    const gameIdNumber = parseInt(gameId);
    
    if (isNaN(gameIdNumber)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid game ID',
        message: 'Game ID must be a valid number'
      });
    }

    const playerStats = await gameSimulationService.getPlayerGameStats(gameIdNumber);
    
    const response: ApiResponse<typeof playerStats> = {
      success: true,
      data: playerStats,
      message: `Retrieved ${playerStats.length} player stats for game ${gameId}`
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching player stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch player stats',
      message: 'An error occurred while retrieving player stats'
    });
  }
});

// GET /api/simulation/simulate/:gameId - Simulate a complete game
router.get('/simulate/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;
    const gameIdNumber = parseInt(gameId);
    
    if (isNaN(gameIdNumber)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid game ID',
        message: 'Game ID must be a valid number'
      });
    }

    const simulation = await gameSimulationService.simulateGame(gameIdNumber);
    
    const response: ApiResponse<typeof simulation> = {
      success: true,
      data: simulation,
      message: `Game simulation completed for game ${gameId}`
    };

    res.json(response);
  } catch (error) {
    console.error('Error simulating game:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to simulate game',
      message: 'An error occurred while simulating the game'
    });
  }
});

// GET /api/simulation/replay/:gameId - Simulate using replay API (2025 NBA Finals)
router.get('/replay/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;
    const gameIdNumber = parseInt(gameId) || 22398; // Default to 2025 NBA Finals
    
    console.log(`🎮 Starting replay simulation for game: ${gameIdNumber}`);
    
    // Get play-by-play from replay API
    const replayData = await gameSimulationService.getReplayPlayByPlay(gameIdNumber);
    const plays = replayData.Plays || [];
    
    // Create simulation data
    const simulation = {
      gameId: gameIdNumber,
      gameTitle: "2025 NBA Finals - Boston Celtics vs Oklahoma City Thunder",
      totalPlays: plays.length,
      events: plays
        .filter(play => play.Description && play.Description.trim() !== '')
        .map(play => ({
          time: play.TimeRemaining,
          description: play.Description,
          awayScore: play.AwayScore,
          homeScore: play.HomeScore,
          impact: calculatePlayImpact(play.Description)
        }))
        .sort((a, b) => {
          // Sort by time remaining (latest first)
          const timeA = parseTimeRemaining(a.time);
          const timeB = parseTimeRemaining(b.time);
          return timeB - timeA;
        }),
      finalScore: plays.length > 0 ? {
        away: plays[plays.length - 1].AwayScore,
        home: plays[plays.length - 1].HomeScore
      } : { away: 0, home: 0 },
      topPerformers: [] // Would need player stats to calculate
    };
    
    const response: ApiResponse<typeof simulation> = {
      success: true,
      data: simulation,
      message: `Replay simulation completed for game ${gameIdNumber}`
    };

    res.json(response);
  } catch (error) {
    console.error('Error simulating replay game:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to simulate replay game',
      message: 'An error occurred while simulating the replay game'
    });
  }
});

// Helper functions for replay simulation
function calculatePlayImpact(description: string): 'high' | 'medium' | 'low' {
  const highImpactKeywords = [
    '3-pointer', 'three-pointer', 'dunk', 'block', 'steal', 'foul', 'free throw',
    'rebound', 'assist', 'turnover', 'timeout', 'substitution'
  ];
  
  const mediumImpactKeywords = [
    '2-pointer', 'two-pointer', 'jump shot', 'layup', 'foul'
  ];

  const lowerDescription = description.toLowerCase();
  
  if (highImpactKeywords.some(keyword => lowerDescription.includes(keyword))) {
    return 'high';
  }
  
  if (mediumImpactKeywords.some(keyword => lowerDescription.includes(keyword))) {
    return 'medium';
  }
  
  return 'low';
}

function parseTimeRemaining(timeString: string): number {
  if (!timeString || timeString === '') return 0;
  
  const parts = timeString.split(':');
  if (parts.length === 2) {
    const minutes = parseInt(parts[0]) || 0;
    const seconds = parseInt(parts[1]) || 0;
    return minutes + (seconds / 60);
  }
  
  return 0;
}

export default router;

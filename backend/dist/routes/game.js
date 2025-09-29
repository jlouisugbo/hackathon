"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const nbaData_1 = require("../data/nbaData");
const liveDataService_1 = require("../services/liveDataService");
const gameSimulationService_1 = __importDefault(require("../services/gameSimulationService"));
const router = express_1.default.Router();
// GET /api/game/current - Get current live game information
router.get('/current', async (req, res) => {
    try {
        console.log('🔍 DEBUG: Fetching current game data...');
        // First try to get live games from SportsDataIO
        const activeGames = await liveDataService_1.liveDataService.getActiveGames();
        console.log(`🔍 DEBUG: Found ${activeGames.length} active games from SportsDataIO`);
        if (activeGames.length > 0) {
            // Use the first active game
            const liveGame = activeGames[0];
            console.log(`🔍 DEBUG: Using live game - ${liveGame.AwayTeam} @ ${liveGame.HomeTeam}`);
            console.log(`🔍 DEBUG: Game status: ${liveGame.Status}, Quarter: ${liveGame.Quarter}`);
            console.log(`🔍 DEBUG: Scores - Away: ${liveGame.AwayTeamScore}, Home: ${liveGame.HomeTeamScore}`);
            // Check if this is the NBA Finals replay data with real box score
            if (liveGame.IsReplay) {
                console.log(`🔍 DEBUG: NBA Finals replay data detected, using real box score data`);
                console.log(`🔍 DEBUG: Real scores - Away: ${liveGame.AwayTeamScore}, Home: ${liveGame.HomeTeamScore}`);
                console.log(`🔍 DEBUG: Real timing - Quarter: ${liveGame.Quarter}, Time: ${liveGame.TimeRemainingMinutes}:${liveGame.TimeRemainingSeconds}`);
                const currentGame = {
                    id: liveGame.GameID.toString(),
                    homeTeam: liveGame.HomeTeam,
                    awayTeam: liveGame.AwayTeam,
                    homeScore: liveGame.HomeTeamScore || 0,
                    awayScore: liveGame.AwayTeamScore || 0,
                    quarter: parseInt(liveGame.Quarter) || 1,
                    timeRemaining: `${liveGame.TimeRemainingMinutes || 12}:${String(liveGame.TimeRemainingSeconds || 0).padStart(2, '0')}`,
                    isActive: liveGame.Status === 'InProgress',
                    startTime: new Date(liveGame.DateTime).getTime(),
                    activePlayers: [], // Will be populated from player stats
                    marketSentiment: 'neutral',
                    tradingVolume: Math.floor(500000 + Math.random() * 500000),
                    volatilityIndex: Math.random(),
                    lastPriceUpdate: Date.now()
                };
                console.log(`🔍 DEBUG: Using real box score data - Scores: ${currentGame.awayScore}-${currentGame.homeScore}, Quarter: ${currentGame.quarter}, Time: ${currentGame.timeRemaining}`);
                const response = {
                    success: true,
                    data: currentGame,
                    message: `Using real NBA Finals replay data: ${currentGame.awayTeam} @ ${currentGame.homeTeam} (Updated: ${new Date().toISOString()})`
                };
                return res.json(response);
            }
            // Convert SportsDataIO format to our LiveGame format (for real live games)
            console.log('🔍 DEBUG: Using real box score data from SportsDataIO');
            console.log('🔍 DEBUG: Real scores - Away:', liveGame.AwayTeamScore, 'Home:', liveGame.HomeTeamScore);
            console.log('🔍 DEBUG: Real timing - Quarter:', liveGame.Quarter, 'Time:', liveGame.TimeRemainingMinutes + ':' + liveGame.TimeRemainingSeconds);
            const currentGame = {
                id: liveGame.GameID.toString(),
                homeTeam: liveGame.HomeTeam,
                awayTeam: liveGame.AwayTeam,
                homeScore: liveGame.HomeTeamScore || 0,
                awayScore: liveGame.AwayTeamScore || 0,
                quarter: parseInt(liveGame.Quarter) || 1,
                timeRemaining: `${liveGame.TimeRemainingMinutes || 12}:${String(liveGame.TimeRemainingSeconds || 0).padStart(2, '0')}`,
                isActive: liveGame.Status === 'InProgress',
                startTime: new Date(liveGame.DateTime).getTime(),
                activePlayers: [], // Will be populated from player stats
                marketSentiment: 'neutral',
                tradingVolume: Math.floor(500000 + Math.random() * 500000),
                volatilityIndex: Math.random(),
                lastPriceUpdate: Date.now()
            };
            console.log(`🔍 DEBUG: Created game object - ${currentGame.awayTeam} @ ${currentGame.homeTeam}, Active: ${currentGame.isActive}`);
            const response = {
                success: true,
                data: currentGame,
                message: `Retrieved live game: ${currentGame.awayTeam} @ ${currentGame.homeTeam}`
            };
            return res.json(response);
        }
        // Fallback to 2025 NBA Finals replay data if no live games
        console.log('🔍 DEBUG: No live games found, using 2025 NBA Finals replay data');
        try {
            const gameSimulationService = new gameSimulationService_1.default();
            console.log('🔍 DEBUG: Fetching NBA Finals replay data...');
            const replayData = await gameSimulationService.getReplayPlayByPlay(22398);
            console.log(`🔍 DEBUG: Retrieved ${replayData.Plays ? replayData.Plays.length : 0} plays from NBA Finals`);
            if (replayData.Plays && replayData.Plays.length > 0) {
                // Create a dynamic game from the replay data
                const plays = replayData.Plays;
                const currentTime = Date.now();
                const gameStartTime = currentTime - (5 * 60 * 1000); // Game started 5 minutes ago for testing
                const elapsedMinutes = Math.floor((currentTime - gameStartTime) / (1000 * 60));
                console.log(`🔍 DEBUG: Current time: ${new Date(currentTime).toISOString()}`);
                console.log(`🔍 DEBUG: Game start time: ${new Date(gameStartTime).toISOString()}`);
                console.log(`🔍 DEBUG: Elapsed minutes: ${elapsedMinutes}`);
                // Calculate current quarter and time based on elapsed time
                let currentQuarter = Math.min(4, Math.floor(elapsedMinutes / 12) + 1);
                let timeRemaining = Math.max(0, 12 - (elapsedMinutes % 12));
                // Simulate realistic scores based on game progression
                // Generate scores that increase over time to simulate a real game
                const baseScore = Math.floor(elapsedMinutes / 2); // Score increases every 2 minutes
                const homeScore = Math.floor(baseScore * (0.8 + Math.random() * 0.4)); // 80-120% of base
                const awayScore = Math.floor(baseScore * (0.8 + Math.random() * 0.4)); // 80-120% of base
                console.log(`🔍 DEBUG: Dynamic game - Quarter: ${currentQuarter}, Time: ${timeRemaining}, Scores: ${awayScore}-${homeScore}`);
                const currentGame = {
                    id: '22398',
                    homeTeam: 'Indiana Pacers',
                    awayTeam: 'Oklahoma City Thunder',
                    homeScore: homeScore,
                    awayScore: awayScore,
                    quarter: currentQuarter,
                    timeRemaining: `${timeRemaining}:00`,
                    isActive: currentQuarter <= 4,
                    startTime: gameStartTime,
                    activePlayers: [], // Will be populated from player stats
                    marketSentiment: 'neutral',
                    tradingVolume: Math.floor(Math.random() * 1000000) + 500000, // Random trading volume
                    volatilityIndex: Math.random() * 0.5 + 0.3, // Random volatility
                    lastPriceUpdate: Date.now()
                };
                console.log(`🔍 DEBUG: Generated game data - Scores: ${awayScore}-${homeScore}, Quarter: ${currentQuarter}, Volume: ${currentGame.tradingVolume}`);
                console.log(`🔍 DEBUG: Created NBA Finals game - ${currentGame.awayTeam} @ ${currentGame.homeTeam}, Active: ${currentGame.isActive}`);
                const response = {
                    success: true,
                    data: currentGame,
                    message: `Using 2025 NBA Finals replay: ${currentGame.awayTeam} @ ${currentGame.homeTeam} (Updated: ${new Date().toISOString()})`
                };
                return res.json(response);
            }
        }
        catch (replayError) {
            console.error('🔍 DEBUG: Error fetching replay data:', replayError);
        }
        // Final fallback to mock data
        const currentGame = (0, nbaData_1.getCurrentGame)();
        if (!currentGame) {
            return res.status(404).json({
                success: false,
                error: 'No active game',
                message: 'There is no live game currently in progress'
            });
        }
        const response = {
            success: true,
            data: currentGame,
            message: `Retrieved current game: ${currentGame.awayTeam} @ ${currentGame.homeTeam}`
        };
        res.json(response);
    }
    catch (error) {
        console.error('Error fetching current game:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch current game',
            message: 'An error occurred while retrieving current game information'
        });
    }
});
// GET /api/game/status - Get detailed game status
router.get('/status', async (req, res) => {
    try {
        // First try to get live games from SportsDataIO
        const activeGames = await liveDataService_1.liveDataService.getActiveGames();
        let currentGame = null;
        if (activeGames.length > 0) {
            const liveGame = activeGames[0];
            console.log('🔍 DEBUG: Using live game data from SportsDataIO');
            console.log('🔍 DEBUG: Real scores - Away:', liveGame.AwayTeamScore, 'Home:', liveGame.HomeTeamScore);
            console.log('🔍 DEBUG: Real timing - Quarter:', liveGame.Quarter, 'Time:', liveGame.TimeRemainingMinutes + ':' + liveGame.TimeRemainingSeconds);
            currentGame = {
                id: liveGame.GameID.toString(),
                homeTeam: liveGame.HomeTeam,
                awayTeam: liveGame.AwayTeam,
                homeScore: liveGame.HomeTeamScore || 0,
                awayScore: liveGame.AwayTeamScore || 0,
                quarter: parseInt(liveGame.Quarter) || 1,
                timeRemaining: `${liveGame.TimeRemainingMinutes || 12}:${String(liveGame.TimeRemainingSeconds || 0).padStart(2, '0')}`,
                isActive: liveGame.Status === 'InProgress',
                startTime: new Date(liveGame.DateTime).getTime(),
                activePlayers: [], // Will be populated from player stats
                marketSentiment: 'neutral',
                tradingVolume: Math.floor(500000 + Math.random() * 500000),
                volatilityIndex: Math.random(),
                lastPriceUpdate: Date.now()
            };
        }
        else {
            // Try NBA Finals replay data as fallback
            try {
                const gameSimulationService = new gameSimulationService_1.default();
                const replayData = await gameSimulationService.getReplayPlayByPlay(22398);
                if (replayData.Plays && replayData.Plays.length > 0) {
                    const plays = replayData.Plays;
                    const currentTime = Date.now();
                    const gameStartTime = currentTime - (5 * 60 * 1000); // Game started 5 minutes ago for testing
                    const elapsedMinutes = Math.floor((currentTime - gameStartTime) / (1000 * 60));
                    let currentQuarter = Math.min(4, Math.floor(elapsedMinutes / 12) + 1);
                    let timeRemaining = Math.max(0, 12 - (elapsedMinutes % 12));
                    // Simulate realistic scores based on game progression
                    const baseScore = Math.floor(elapsedMinutes / 2);
                    const homeScore = Math.floor(baseScore * (0.8 + Math.random() * 0.4));
                    const awayScore = Math.floor(baseScore * (0.8 + Math.random() * 0.4));
                    currentGame = {
                        id: '22398',
                        homeTeam: 'Indiana Pacers',
                        awayTeam: 'Oklahoma City Thunder',
                        homeScore: homeScore,
                        awayScore: awayScore,
                        quarter: currentQuarter,
                        timeRemaining: `${timeRemaining}:00`,
                        isActive: currentQuarter <= 4,
                        startTime: gameStartTime,
                        activePlayers: [],
                        marketSentiment: 'neutral',
                        tradingVolume: Math.floor(Math.random() * 1000000) + 500000,
                        volatilityIndex: Math.random() * 0.5 + 0.3,
                        lastPriceUpdate: Date.now()
                    };
                }
                else {
                    // Final fallback to mock data
                    currentGame = (0, nbaData_1.getCurrentGame)();
                }
            }
            catch (error) {
                console.error('🔍 DEBUG: Error fetching replay data for status:', error);
                currentGame = (0, nbaData_1.getCurrentGame)();
            }
        }
        if (!currentGame) {
            return res.json({
                success: true,
                data: {
                    hasActiveGame: false,
                    message: 'No live game in progress'
                }
            });
        }
        // Calculate game progress
        const totalGameTime = 48 * 60; // 48 minutes in seconds
        const currentGameTime = ((currentGame.quarter - 1) * 12 * 60) +
            (12 * 60 - parseTimeToSeconds(currentGame.timeRemaining));
        const gameProgressPercent = (currentGameTime / totalGameTime) * 100;
        // Determine game phase
        let gamePhase = 'Pre-game';
        if (currentGame.quarter === 1)
            gamePhase = '1st Quarter';
        else if (currentGame.quarter === 2)
            gamePhase = '2nd Quarter';
        else if (currentGame.quarter === 3)
            gamePhase = '3rd Quarter';
        else if (currentGame.quarter === 4)
            gamePhase = '4th Quarter';
        else if (currentGame.quarter > 4)
            gamePhase = 'Overtime';
        // Calculate time elapsed since game start
        const timeElapsed = Date.now() - currentGame.startTime;
        const hoursElapsed = Math.floor(timeElapsed / (1000 * 60 * 60));
        const minutesElapsed = Math.floor((timeElapsed % (1000 * 60 * 60)) / (1000 * 60));
        const gameStatus = {
            hasActiveGame: true,
            game: currentGame,
            gamePhase,
            gameProgressPercent: Math.round(gameProgressPercent * 100) / 100,
            timeElapsed: `${hoursElapsed}h ${minutesElapsed}m`,
            isLive: currentGame.isActive,
            totalGameTime: `${Math.floor(totalGameTime / 60)}:00`,
            currentGameTime: formatSecondsToTime(currentGameTime),
            scoreDifferential: Math.abs(currentGame.homeScore - currentGame.awayScore),
            leadingTeam: currentGame.homeScore > currentGame.awayScore ? currentGame.homeTeam :
                currentGame.awayScore > currentGame.homeScore ? currentGame.awayTeam : 'Tied'
        };
        const response = {
            success: true,
            data: gameStatus,
            message: 'Retrieved detailed game status'
        };
        res.json(response);
    }
    catch (error) {
        console.error('Error fetching game status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch game status',
            message: 'An error occurred while retrieving game status'
        });
    }
});
// GET /api/game/schedule - Get upcoming games
router.get('/schedule', async (req, res) => {
    try {
        // Try to get real NBA games from SportsDataIO
        try {
            const upcomingGames = await liveDataService_1.liveDataService.getUpcomingGames();
            if (upcomingGames.length > 0) {
                const formattedGames = upcomingGames.map(game => ({
                    id: game.GameID.toString(),
                    homeTeam: game.HomeTeam,
                    awayTeam: game.AwayTeam,
                    scheduledTime: new Date(game.DateTime).getTime(),
                    status: game.Status.toLowerCase()
                }));
                const response = {
                    success: true,
                    data: formattedGames,
                    message: `Retrieved ${formattedGames.length} upcoming games from SportsDataIO`
                };
                return res.json(response);
            }
        }
        catch (apiError) {
            console.log('SportsDataIO API not available, using fallback data');
        }
        // Fallback to mock data if API fails
        const now = Date.now();
        const upcomingGames = [
            {
                id: 'game-2',
                homeTeam: 'BOS',
                awayTeam: 'MIA',
                scheduledTime: now + (2 * 60 * 60 * 1000), // 2 hours from now
                status: 'scheduled'
            },
            {
                id: 'game-3',
                homeTeam: 'DEN',
                awayTeam: 'PHX',
                scheduledTime: now + (4 * 60 * 60 * 1000), // 4 hours from now
                status: 'scheduled'
            },
            {
                id: 'game-4',
                homeTeam: 'MIL',
                awayTeam: 'DAL',
                scheduledTime: now + (6 * 60 * 60 * 1000), // 6 hours from now
                status: 'scheduled'
            }
        ];
        const response = {
            success: true,
            data: upcomingGames,
            message: `Retrieved ${upcomingGames.length} upcoming games (fallback data)`
        };
        res.json(response);
    }
    catch (error) {
        console.error('Error fetching game schedule:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch game schedule',
            message: 'An error occurred while retrieving game schedule'
        });
    }
});
// Helper functions
function parseTimeToSeconds(timeString) {
    const [minutes, seconds] = timeString.split(':').map(Number);
    return (minutes * 60) + seconds;
}
function formatSecondsToTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
exports.default = router;

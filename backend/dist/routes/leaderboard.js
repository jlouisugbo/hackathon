"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const nbaData_1 = require("../data/nbaData");
const router = express_1.default.Router();
// GET /api/leaderboard/season - Season rankings
router.get('/season', (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const page = parseInt(req.query.page) || 1;
        const users = (0, nbaData_1.getUsers)();
        const portfolios = (0, nbaData_1.getPortfolios)();
        // Create leaderboard entries
        const leaderboardEntries = users.map(user => {
            const portfolio = portfolios.find(p => p.userId === user.id);
            const portfolioValue = portfolio ? portfolio.totalValue : 10000; // Default starting value
            return {
                userId: user.id,
                username: user.username,
                avatarUrl: user.avatarUrl,
                portfolioValue,
                todaysPL: portfolio ? portfolio.todaysPL : 0,
                todaysPLPercent: portfolio ? (portfolio.todaysPL / portfolioValue) * 100 : 0,
                rank: 0, // Will be set after sorting
                previousRank: user.seasonRank,
                badges: user.badges
            };
        });
        // Sort by portfolio value (descending)
        leaderboardEntries.sort((a, b) => b.portfolioValue - a.portfolioValue);
        // Assign ranks
        leaderboardEntries.forEach((entry, index) => {
            entry.rank = index + 1;
        });
        // Pagination
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedEntries = leaderboardEntries.slice(startIndex, endIndex);
        const response = {
            success: true,
            data: paginatedEntries,
            pagination: {
                page,
                limit,
                total: leaderboardEntries.length,
                totalPages: Math.ceil(leaderboardEntries.length / limit)
            },
            message: `Retrieved season leaderboard (page ${page})`
        };
        res.json(response);
    }
    catch (error) {
        console.error('Error fetching season leaderboard:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch season leaderboard',
            message: 'An error occurred while retrieving season leaderboard'
        });
    }
});
// GET /api/leaderboard/live - Live game rankings
router.get('/live', (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const users = (0, nbaData_1.getUsers)();
        const portfolios = (0, nbaData_1.getPortfolios)();
        // Create live leaderboard based on live holdings performance
        const liveEntries = users
            .map(user => {
            const portfolio = portfolios.find(p => p.userId === user.id);
            if (!portfolio || portfolio.liveHoldings.length === 0) {
                return null;
            }
            const liveValue = portfolio.liveHoldings.reduce((sum, h) => sum + h.totalValue, 0);
            const livePL = portfolio.liveHoldings.reduce((sum, h) => sum + h.unrealizedPL, 0);
            const livePLPercent = liveValue > 0 ? (livePL / (liveValue - livePL)) * 100 : 0;
            return {
                userId: user.id,
                username: user.username,
                avatarUrl: user.avatarUrl,
                portfolioValue: liveValue,
                todaysPL: livePL,
                todaysPLPercent: livePLPercent,
                rank: 0,
                previousRank: user.liveRank,
                badges: user.badges
            };
        })
            .filter(entry => entry !== null);
        // Sort by live P&L percentage (descending)
        liveEntries.sort((a, b) => b.todaysPLPercent - a.todaysPLPercent);
        // Assign ranks and limit results
        const limitedEntries = liveEntries.slice(0, limit);
        limitedEntries.forEach((entry, index) => {
            entry.rank = index + 1;
        });
        const response = {
            success: true,
            data: limitedEntries,
            message: `Retrieved live game leaderboard (${limitedEntries.length} active traders)`
        };
        res.json(response);
    }
    catch (error) {
        console.error('Error fetching live leaderboard:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch live leaderboard',
            message: 'An error occurred while retrieving live leaderboard'
        });
    }
});
// GET /api/leaderboard/daily - Daily top performers
router.get('/daily', (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const users = (0, nbaData_1.getUsers)();
        const portfolios = (0, nbaData_1.getPortfolios)();
        // Create daily leaderboard based on today's P&L
        const dailyEntries = users.map(user => {
            const portfolio = portfolios.find(p => p.userId === user.id);
            const portfolioValue = portfolio ? portfolio.totalValue : 10000;
            const todaysPL = portfolio ? portfolio.todaysPL : 0;
            const todaysPLPercent = portfolioValue > 0 ? (todaysPL / portfolioValue) * 100 : 0;
            return {
                userId: user.id,
                username: user.username,
                avatarUrl: user.avatarUrl,
                portfolioValue,
                todaysPL,
                todaysPLPercent,
                rank: 0,
                previousRank: 0, // Not tracked for daily
                badges: user.badges
            };
        });
        // Sort by today's P&L (descending)
        dailyEntries.sort((a, b) => b.todaysPL - a.todaysPL);
        // Assign ranks and limit results
        const limitedEntries = dailyEntries.slice(0, limit);
        limitedEntries.forEach((entry, index) => {
            entry.rank = index + 1;
        });
        const response = {
            success: true,
            data: limitedEntries,
            message: `Retrieved daily top performers`
        };
        res.json(response);
    }
    catch (error) {
        console.error('Error fetching daily leaderboard:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch daily leaderboard',
            message: 'An error occurred while retrieving daily leaderboard'
        });
    }
});
// GET /api/leaderboard/user/:userId - Get user's rank and nearby users
router.get('/user/:userId', (req, res) => {
    try {
        const { userId } = req.params;
        const context = parseInt(req.query.context) || 5; // Users above and below
        const users = (0, nbaData_1.getUsers)();
        const portfolios = (0, nbaData_1.getPortfolios)();
        // Create full leaderboard
        const leaderboardEntries = users.map(user => {
            const portfolio = portfolios.find(p => p.userId === user.id);
            const portfolioValue = portfolio ? portfolio.totalValue : 10000;
            return {
                userId: user.id,
                username: user.username,
                avatarUrl: user.avatarUrl,
                portfolioValue,
                todaysPL: portfolio ? portfolio.todaysPL : 0,
                todaysPLPercent: portfolio ? (portfolio.todaysPL / portfolioValue) * 100 : 0,
                rank: 0,
                previousRank: user.seasonRank,
                badges: user.badges
            };
        });
        // Sort by portfolio value (descending)
        leaderboardEntries.sort((a, b) => b.portfolioValue - a.portfolioValue);
        // Assign ranks
        leaderboardEntries.forEach((entry, index) => {
            entry.rank = index + 1;
        });
        // Find user
        const userIndex = leaderboardEntries.findIndex(entry => entry.userId === userId);
        if (userIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
                message: `User with ID ${userId} not found in leaderboard`
            });
        }
        // Get context around user
        const startIndex = Math.max(0, userIndex - context);
        const endIndex = Math.min(leaderboardEntries.length, userIndex + context + 1);
        const contextEntries = leaderboardEntries.slice(startIndex, endIndex);
        const userEntry = leaderboardEntries[userIndex];
        const response = {
            success: true,
            data: {
                userRank: userEntry.rank,
                user: userEntry,
                context: contextEntries,
                totalUsers: leaderboardEntries.length
            },
            message: `Retrieved leaderboard context for user ${userId}`
        };
        res.json(response);
    }
    catch (error) {
        console.error('Error fetching user leaderboard:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user leaderboard',
            message: 'An error occurred while retrieving user leaderboard position'
        });
    }
});
// GET /api/leaderboard/stats - Get leaderboard statistics
router.get('/stats', (req, res) => {
    try {
        const users = (0, nbaData_1.getUsers)();
        const portfolios = (0, nbaData_1.getPortfolios)();
        const portfolioValues = portfolios.map(p => p.totalValue);
        const todaysPLs = portfolios.map(p => p.todaysPL);
        // Calculate statistics
        const totalUsers = users.length;
        const avgPortfolioValue = portfolioValues.reduce((sum, val) => sum + val, 0) / totalUsers;
        const maxPortfolioValue = Math.max(...portfolioValues);
        const minPortfolioValue = Math.min(...portfolioValues);
        const avgDailyPL = todaysPLs.reduce((sum, pl) => sum + pl, 0) / totalUsers;
        const maxDailyPL = Math.max(...todaysPLs);
        const minDailyPL = Math.min(...todaysPLs);
        // Count active traders (users with holdings)
        const activeTraders = portfolios.filter(p => p.seasonHoldings.length > 0 || p.liveHoldings.length > 0).length;
        // Count live game participants
        const liveParticipants = portfolios.filter(p => p.liveHoldings.length > 0).length;
        const stats = {
            totalUsers,
            activeTraders,
            liveParticipants,
            portfolioStats: {
                average: Math.round(avgPortfolioValue * 100) / 100,
                highest: Math.round(maxPortfolioValue * 100) / 100,
                lowest: Math.round(minPortfolioValue * 100) / 100
            },
            dailyPLStats: {
                average: Math.round(avgDailyPL * 100) / 100,
                highest: Math.round(maxDailyPL * 100) / 100,
                lowest: Math.round(minDailyPL * 100) / 100
            }
        };
        const response = {
            success: true,
            data: stats,
            message: 'Retrieved leaderboard statistics'
        };
        res.json(response);
    }
    catch (error) {
        console.error('Error fetching leaderboard stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch leaderboard stats',
            message: 'An error occurred while calculating leaderboard statistics'
        });
    }
});
exports.default = router;

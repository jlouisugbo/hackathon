"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeSocketHandlers = initializeSocketHandlers;
exports.broadcastPriceUpdate = broadcastPriceUpdate;
exports.broadcastFlashMultiplier = broadcastFlashMultiplier;
exports.broadcastGameEvent = broadcastGameEvent;
exports.broadcastTradeExecution = broadcastTradeExecution;
exports.broadcastLeaderboardUpdate = broadcastLeaderboardUpdate;
exports.broadcastPortfolioUpdate = broadcastPortfolioUpdate;
exports.broadcastMarketData = broadcastMarketData;
exports.broadcastNotification = broadcastNotification;
exports.getConnectedUsersCount = getConnectedUsersCount;
exports.getConnectedUsers = getConnectedUsers;
exports.broadcastChatMessage = broadcastChatMessage;
exports.broadcastVolumeAlert = broadcastVolumeAlert;
exports.broadcastMarketSentiment = broadcastMarketSentiment;
exports.broadcastTradingActivity = broadcastTradingActivity;
const uuid_1 = require("uuid");
const authService_1 = require("../services/authService");
// Store connected users
const connectedUsers = new Map();
const userRooms = new Map(); // userId -> Set of room names
const socketToUser = new Map(); // socketId -> userId
function initializeSocketHandlers(io) {
    console.log('🔌 Initializing Socket.IO handlers...');
    io.on('connection', (socket) => {
        console.log(`👤 User connected: ${socket.id}`);
        // Handle user joining with authentication
        socket.on('join_room', async (data) => {
            let user;
            // Try to authenticate with token first
            if (data.token) {
                try {
                    const decoded = authService_1.authService.verifyToken(data.token);
                    const authUser = await authService_1.authService.getUserById(decoded.id);
                    if (authUser) {
                        user = {
                            userId: authUser.id,
                            username: authUser.username,
                            email: authUser.email,
                            socketId: socket.id,
                            joinedAt: Date.now(),
                            isAuthenticated: true
                        };
                        // Update user session in database
                        await authService_1.authService.updateUserSession(authUser.id, socket.id, true);
                    }
                    else {
                        throw new Error('User not found');
                    }
                }
                catch (error) {
                    console.error('Authentication failed for socket:', error);
                    // Fall back to guest user
                    user = {
                        userId: data.userId || `guest_${socket.id}`,
                        username: data.username || `Guest_${socket.id.substring(0, 6)}`,
                        email: '',
                        socketId: socket.id,
                        joinedAt: Date.now(),
                        isAuthenticated: false
                    };
                }
            }
            else {
                // Guest user (for demo)
                user = {
                    userId: data.userId || `guest_${socket.id}`,
                    username: data.username || `Guest_${socket.id.substring(0, 6)}`,
                    email: '',
                    socketId: socket.id,
                    joinedAt: Date.now(),
                    isAuthenticated: false
                };
            }
            // Store user info
            connectedUsers.set(socket.id, user);
            socketToUser.set(socket.id, user.userId);
            // Join general rooms
            socket.join('general'); // All users
            socket.join(`user:${user.userId}`); // User-specific room
            // Initialize user rooms set
            if (!userRooms.has(user.userId)) {
                userRooms.set(user.userId, new Set());
            }
            userRooms.get(user.userId).add('general');
            userRooms.get(user.userId).add(`user:${user.userId}`);
            console.log(`✅ User ${user.username} (${user.userId}) joined room: general`);
            // Send welcome message
            const welcomeNotification = {
                id: (0, uuid_1.v4)(),
                userId: user.userId,
                type: 'system',
                title: user.isAuthenticated ? 'Welcome back!' : 'Welcome, Guest!',
                message: user.isAuthenticated
                    ? `Authenticated as ${user.username}`
                    : 'Connected as guest user',
                timestamp: Date.now(),
                isRead: false
            };
            socket.emit('notification', welcomeNotification);
            // Broadcast user count update
            io.to('general').emit('user_count', connectedUsers.size);
        });
        // Handle chat messages
        socket.on('send_chat_message', (message) => {
            const user = connectedUsers.get(socket.id);
            if (!user)
                return;
            const chatMessage = {
                id: (0, uuid_1.v4)(),
                userId: user.userId,
                username: user.username,
                message: message.trim(),
                timestamp: Date.now(),
                type: 'user'
            };
            // Broadcast to all users in general room
            io.to('general').emit('chat_message', chatMessage);
            console.log(`💬 Chat message from ${user.username}: ${message}`);
        });
        // Handle player subscription
        socket.on('subscribe_player', (playerId) => {
            const user = connectedUsers.get(socket.id);
            if (!user)
                return;
            const roomName = `player:${playerId}`;
            socket.join(roomName);
            if (!userRooms.has(user.userId)) {
                userRooms.set(user.userId, new Set());
            }
            userRooms.get(user.userId).add(roomName);
            console.log(`📊 User ${user.username} subscribed to player ${playerId}`);
            // Send current player data
            socket.emit('player_subscribed', { playerId, status: 'subscribed' });
        });
        // Handle player unsubscription
        socket.on('unsubscribe_player', (playerId) => {
            const user = connectedUsers.get(socket.id);
            if (!user)
                return;
            const roomName = `player:${playerId}`;
            socket.leave(roomName);
            if (userRooms.has(user.userId)) {
                userRooms.get(user.userId).delete(roomName);
            }
            console.log(`📊 User ${user.username} unsubscribed from player ${playerId}`);
            socket.emit('player_unsubscribed', { playerId, status: 'unsubscribed' });
        });
        // Handle live trading room
        socket.on('join_live_trading', async () => {
            const user = connectedUsers.get(socket.id);
            if (!user)
                return;
            socket.join('live_trading');
            if (!userRooms.has(user.userId)) {
                userRooms.set(user.userId, new Set());
            }
            userRooms.get(user.userId).add('live_trading');
            // Reset trades for new live session
            try {
                const { databaseService } = await Promise.resolve().then(() => __importStar(require('../services/databaseService')));
                let portfolio = await databaseService.getPortfolioByUserId(user.userId);
                if (!portfolio) {
                    // Create portfolio if it doesn't exist
                    console.log(`📊 Creating portfolio for ${user.username}`);
                    const defaultPortfolio = {
                        userId: user.userId,
                        seasonHoldings: [],
                        liveHoldings: [],
                        totalValue: 1000,
                        availableBalance: 1000,
                        todaysPL: 0,
                        seasonPL: 0,
                        livePL: 0,
                        tradesRemaining: 5,
                        lastUpdated: Date.now()
                    };
                    await databaseService.createPortfolio(user.userId, defaultPortfolio);
                    portfolio = await databaseService.getPortfolioByUserId(user.userId);
                }
                if (portfolio) {
                    portfolio.tradesRemaining = 5; // Reset to 5 trades per live session
                    await databaseService.updatePortfolio(user.userId, portfolio);
                    console.log(`🔄 Reset trades for ${user.username} - 5 trades available`);
                }
            }
            catch (error) {
                console.error('❌ Failed to reset trades for user:', error);
            }
            console.log(`🔥 User ${user.username} joined live trading room`);
        });
        socket.on('leave_live_trading', () => {
            const user = connectedUsers.get(socket.id);
            if (!user)
                return;
            socket.leave('live_trading');
            if (userRooms.has(user.userId)) {
                userRooms.get(user.userId).delete('live_trading');
            }
            console.log(`🔥 User ${user.username} left live trading room`);
        });
        // Handle leaderboard subscription
        socket.on('subscribe_leaderboard', (type) => {
            const user = connectedUsers.get(socket.id);
            if (!user)
                return;
            const roomName = `leaderboard:${type}`;
            socket.join(roomName);
            if (!userRooms.has(user.userId)) {
                userRooms.set(user.userId, new Set());
            }
            userRooms.get(user.userId).add(roomName);
            console.log(`🏆 User ${user.username} subscribed to ${type} leaderboard`);
        });
        // Handle portfolio updates subscription
        socket.on('subscribe_portfolio', () => {
            const user = connectedUsers.get(socket.id);
            if (!user)
                return;
            const roomName = `portfolio:${user.userId}`;
            socket.join(roomName);
            if (!userRooms.has(user.userId)) {
                userRooms.set(user.userId, new Set());
            }
            userRooms.get(user.userId).add(roomName);
            console.log(`💼 User ${user.username} subscribed to portfolio updates`);
        });
        // Handle ping for connection keep-alive
        socket.on('ping', () => {
            socket.emit('pong', { timestamp: Date.now() });
        });
        // Handle disconnection
        socket.on('disconnect', async (reason) => {
            const user = connectedUsers.get(socket.id);
            if (user) {
                console.log(`👋 User ${user.username} disconnected: ${reason}`);
                // Update user session in database if authenticated
                if (user.isAuthenticated) {
                    await authService_1.authService.updateUserSession(user.userId, socket.id, false);
                }
                // Clean up user rooms
                userRooms.delete(user.userId);
                connectedUsers.delete(socket.id);
                socketToUser.delete(socket.id);
                // Broadcast updated user count
                io.to('general').emit('user_count', connectedUsers.size);
            }
            else {
                console.log(`👋 Unknown user disconnected: ${socket.id}`);
            }
        });
        // Handle errors
        socket.on('error', (error) => {
            const user = connectedUsers.get(socket.id);
            console.error(`❌ Socket error for user ${user?.username || 'unknown'}:`, error);
        });
    });
    console.log('✅ Socket.IO handlers initialized');
}
// Utility functions for broadcasting
function broadcastPriceUpdate(io, playerId, price, change, changePercent) {
    const priceData = {
        playerId,
        price: Math.round(price * 100) / 100,
        change: Math.round(change * 100) / 100,
        changePercent: Math.round(changePercent * 100) / 100,
        timestamp: Date.now()
    };
    // Broadcast to all users and player-specific subscribers
    io.to('general').emit('price_update', priceData);
    io.to(`player:${playerId}`).emit('price_update', priceData);
}
function broadcastFlashMultiplier(io, flashData) {
    // Broadcast to live trading room and general room
    io.to('live_trading').emit('flash_multiplier', flashData);
    io.to('general').emit('flash_multiplier', flashData);
    console.log(`⚡ Flash multiplier broadcast: ${flashData.playerName} ${flashData.multiplier}x`);
}
function broadcastGameEvent(io, gameEvent) {
    // Broadcast to all rooms
    io.to('general').emit('game_event', gameEvent);
    io.to('live_trading').emit('game_event', gameEvent);
    console.log(`🏀 Game event broadcast: ${gameEvent.description}`);
}
function broadcastTradeExecution(io, trade) {
    // Broadcast to user's room and general trading feed
    io.to(`user:${trade.userId}`).emit('trade_executed', trade);
    // Enhanced trade feed with market impact information
    const tradeFeedData = {
        id: trade.id,
        username: trade.username || 'Anonymous',
        playerName: trade.playerName,
        type: trade.type,
        shares: trade.shares,
        price: trade.price,
        timestamp: trade.timestamp,
        marketImpact: trade.marketImpact
    };
    io.to('general').emit('trade_feed', tradeFeedData);
    // Broadcast market impact if significant
    if (trade.marketImpact && trade.marketImpact.description) {
        io.to('general').emit('market_impact', {
            playerId: trade.playerId,
            playerName: trade.playerName,
            tradeType: trade.type,
            shares: trade.shares,
            priceImpact: trade.marketImpact.priceImpact,
            priceImpactPercent: trade.marketImpact.priceImpactPercent,
            newPrice: trade.marketImpact.newPrice,
            impactLevel: trade.marketImpact.impactLevel,
            description: trade.marketImpact.description,
            timestamp: trade.timestamp
        });
    }
    console.log(`💰 Trade executed: ${trade.type} ${trade.shares} shares of ${trade.playerName}${trade.marketImpact?.impactLevel !== 'minimal' ? ` with ${trade.marketImpact.impactLevel} market impact` : ''}`);
}
function broadcastLeaderboardUpdate(io, type, leaderboard) {
    io.to(`leaderboard:${type}`).emit('leaderboard_update', {
        type,
        leaderboard,
        timestamp: Date.now()
    });
    console.log(`🏆 ${type} leaderboard updated`);
}
function broadcastPortfolioUpdate(io, userId, portfolio) {
    io.to(`portfolio:${userId}`).emit('portfolio_update', portfolio);
    io.to(`user:${userId}`).emit('portfolio_update', portfolio);
}
function broadcastMarketData(io, marketData) {
    io.to('general').emit('market_data', marketData);
}
function broadcastNotification(io, userId, notification) {
    io.to(`user:${userId}`).emit('notification', notification);
}
function getConnectedUsersCount() {
    return connectedUsers.size;
}
function getConnectedUsers() {
    return Array.from(connectedUsers.values());
}
function broadcastChatMessage(io, chatMessage) {
    io.to('general').emit('chat_message', chatMessage);
}
function broadcastVolumeAlert(io, volumeData) {
    // Broadcast to all users when unusual trading volume is detected
    io.to('general').emit('volume_alert', {
        playerId: volumeData.playerId,
        playerName: volumeData.playerName,
        volume: volumeData.volume,
        timeframe: volumeData.timeframe,
        threshold: volumeData.threshold,
        description: volumeData.description,
        timestamp: Date.now()
    });
    console.log(`📈 Volume alert: ${volumeData.playerName} - ${volumeData.description}`);
}
function broadcastMarketSentiment(io, sentimentData) {
    // Broadcast overall market sentiment based on trading patterns
    io.to('general').emit('market_sentiment', {
        sentiment: sentimentData.sentiment, // 'bullish', 'bearish', 'neutral'
        score: sentimentData.score, // -1 to 1
        topMovers: sentimentData.topMovers,
        activeTraders: sentimentData.activeTraders,
        totalVolume: sentimentData.totalVolume,
        timestamp: Date.now()
    });
    console.log(`📊 Market sentiment: ${sentimentData.sentiment} (${sentimentData.score})`);
}
function broadcastTradingActivity(io, activityData) {
    // Broadcast live trading activity for specific players
    io.to('general').emit('trading_activity', {
        playerId: activityData.playerId,
        playerName: activityData.playerName,
        recentTrades: activityData.recentTrades,
        totalVolume: activityData.totalVolume,
        priceMovement: activityData.priceMovement,
        activeBuyers: activityData.activeBuyers,
        activeSellers: activityData.activeSellers,
        timestamp: Date.now()
    });
    console.log(`📊 Trading activity update: ${activityData.playerName}`);
}

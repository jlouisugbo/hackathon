"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDemoPortfolio = exports.getAllDemoUsers = exports.getDemoOnlineUsersCount = exports.updateDemoUserSession = exports.getDemoUserByEmail = exports.getDemoUser = exports.addDemoUser = exports.getUserLimitOrders = exports.getLimitOrders = exports.checkLimitOrders = exports.createLimitOrder = exports.limitOrders = exports.syncPortfoliosWithPrices = exports.executeTradeOrder = exports.updateGameScore = exports.addTrade = exports.updatePlayerPrice = exports.getCurrentGame = exports.getTrades = exports.getPortfolios = exports.getUsers = exports.getPlayers = exports.currentGame = exports.trades = exports.portfolios = exports.users = exports.players = void 0;
exports.initializeMockData = initializeMockData;
const uuid_1 = require("uuid");
// Global data stores
exports.players = [];
exports.users = [];
exports.portfolios = [];
exports.trades = [];
exports.currentGame = null;
// Generate realistic price history for the last 30 days
function generatePriceHistory(basePrice, volatility) {
    const history = [];
    const now = Date.now();
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
    let currentPrice = basePrice * (0.8 + Math.random() * 0.4); // Start 20% below to above base
    for (let i = 0; i < 30; i++) {
        const timestamp = thirtyDaysAgo + (i * 24 * 60 * 60 * 1000);
        // Daily price change based on volatility
        const change = (Math.random() - 0.5) * 2 * volatility * currentPrice;
        currentPrice = Math.max(10, currentPrice + change); // Minimum price of $10
        history.push({
            timestamp,
            price: Math.round(currentPrice * 100) / 100,
            volume: Math.floor(Math.random() * 10000) + 1000
        });
    }
    return history;
}
function initializeMockData() {
    console.log('🏀 Initializing mock NBA player data...');
    // Mock NBA Players with realistic data
    const mockPlayersData = [
        {
            name: 'LeBron James',
            team: 'LAL',
            position: 'SF',
            basePrice: 189.50,
            volatility: 0.15,
            jersey: 23,
            stats: { ppg: 25.3, rpg: 7.3, apg: 7.4, fg: 0.504, threePt: 0.325, gamesPlayed: 71, minutesPerGame: 35.5 }
        },
        {
            name: 'Stephen Curry',
            team: 'GSW',
            position: 'PG',
            basePrice: 176.25,
            volatility: 0.22,
            jersey: 30,
            stats: { ppg: 26.4, rpg: 4.5, apg: 5.1, fg: 0.427, threePt: 0.408, gamesPlayed: 74, minutesPerGame: 32.7 }
        },
        {
            name: 'Giannis Antetokounmpo',
            team: 'MIL',
            position: 'PF',
            basePrice: 195.75,
            volatility: 0.18,
            jersey: 34,
            stats: { ppg: 31.1, rpg: 11.8, apg: 5.7, fg: 0.553, threePt: 0.274, gamesPlayed: 63, minutesPerGame: 32.1 }
        },
        {
            name: 'Luka Dončić',
            team: 'DAL',
            position: 'PG',
            basePrice: 182.40,
            volatility: 0.25,
            jersey: 77,
            stats: { ppg: 32.4, rpg: 8.6, apg: 8.0, fg: 0.454, threePt: 0.343, gamesPlayed: 70, minutesPerGame: 36.2 }
        },
        {
            name: 'Jayson Tatum',
            team: 'BOS',
            position: 'SF',
            basePrice: 168.90,
            volatility: 0.20,
            jersey: 0,
            stats: { ppg: 26.9, rpg: 8.1, apg: 4.9, fg: 0.466, threePt: 0.348, gamesPlayed: 74, minutesPerGame: 35.7 }
        },
        {
            name: 'Joel Embiid',
            team: 'PHI',
            position: 'C',
            basePrice: 173.60,
            volatility: 0.23,
            jersey: 21,
            stats: { ppg: 33.1, rpg: 10.2, apg: 4.2, fg: 0.548, threePt: 0.330, gamesPlayed: 66, minutesPerGame: 34.6 }
        },
        {
            name: 'Nikola Jokić',
            team: 'DEN',
            position: 'C',
            basePrice: 187.30,
            volatility: 0.16,
            jersey: 15,
            stats: { ppg: 24.5, rpg: 11.8, apg: 9.8, fg: 0.632, threePt: 0.382, gamesPlayed: 69, minutesPerGame: 33.7 }
        },
        {
            name: 'Kevin Durant',
            team: 'PHX',
            position: 'SF',
            basePrice: 165.80,
            volatility: 0.19,
            jersey: 35,
            stats: { ppg: 27.1, rpg: 6.7, apg: 5.0, fg: 0.538, threePt: 0.404, gamesPlayed: 75, minutesPerGame: 36.9 }
        },
        {
            name: 'Damian Lillard',
            team: 'MIL',
            position: 'PG',
            basePrice: 159.45,
            volatility: 0.24,
            jersey: 0,
            stats: { ppg: 24.3, rpg: 4.4, apg: 7.0, fg: 0.427, threePt: 0.350, gamesPlayed: 73, minutesPerGame: 35.3 }
        },
        {
            name: 'Anthony Davis',
            team: 'LAL',
            position: 'PF',
            basePrice: 171.20,
            volatility: 0.21,
            jersey: 3,
            stats: { ppg: 25.9, rpg: 12.5, apg: 2.6, fg: 0.564, threePt: 0.270, gamesPlayed: 76, minutesPerGame: 35.1 }
        }
    ];
    // Create player objects
    exports.players = mockPlayersData.map(playerData => {
        const priceHistory = generatePriceHistory(playerData.basePrice, playerData.volatility);
        const currentPrice = priceHistory[priceHistory.length - 1].price;
        const yesterdayPrice = priceHistory[priceHistory.length - 2].price;
        const priceChange24h = currentPrice - yesterdayPrice;
        const priceChangePercent24h = (priceChange24h / yesterdayPrice) * 100;
        return {
            id: (0, uuid_1.v4)(),
            name: playerData.name,
            team: playerData.team,
            position: playerData.position,
            currentPrice,
            priceChange24h: Math.round(priceChange24h * 100) / 100,
            priceChangePercent24h: Math.round(priceChangePercent24h * 100) / 100,
            priceHistory,
            stats: playerData.stats,
            isPlaying: Math.random() > 0.3, // 70% chance of playing
            volatility: playerData.volatility,
            imageUrl: `https://cdn.nba.com/headshots/nba/latest/1040x760/${playerData.name.replace(' ', '_').toLowerCase()}.png`,
            jersey: playerData.jersey
        };
    });
    // Create mock users
    const mockUsernames = [
        'CourtVision23', 'DunkMaster', 'ThreePointKing', 'ReboundGod', 'AssistLegend',
        'BlockParty', 'SlamDunkFan', 'BasketBaller', 'HoopsDreamer', 'NBAOracle'
    ];
    exports.users = mockUsernames.map((username, index) => ({
        id: (0, uuid_1.v4)(),
        username,
        email: `${username.toLowerCase()}@example.com`,
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
        joinDate: Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000, // Random join date within last year
        totalPortfolioValue: 8000 + Math.random() * 4000, // $8k - $12k
        seasonRank: index + 1,
        liveRank: Math.floor(Math.random() * 10) + 1,
        badges: [],
        stats: {
            totalTrades: Math.floor(Math.random() * 200) + 50,
            winRate: 0.45 + Math.random() * 0.25, // 45-70% win rate
            bestDay: Math.random() * 1000 + 200,
            worstDay: -(Math.random() * 800 + 100),
            longestStreak: Math.floor(Math.random() * 15) + 3,
            totalProfit: (Math.random() - 0.5) * 2000, // -$1000 to +$1000
            avgHoldTime: Math.random() * 7 + 1 // 1-8 days
        }
    }));
    // Add demo users for testing
    exports.users.push({
        id: 'demo-user',
        username: 'DemoTrader',
        email: 'demo@example.com',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=DemoTrader',
        joinDate: Date.now(),
        totalPortfolioValue: 10000,
        seasonRank: 11,
        liveRank: 11,
        badges: [],
        stats: {
            totalTrades: 0,
            winRate: 0,
            bestDay: 0,
            worstDay: 0,
            longestStreak: 0,
            totalProfit: 0,
            avgHoldTime: 0
        }
    });
    // Add user-1 for frontend compatibility
    exports.users.push({
        id: 'user-1',
        username: 'PrizePicker',
        email: 'user1@example.com',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=PrizePicker',
        joinDate: Date.now(),
        totalPortfolioValue: 10000,
        seasonRank: 12,
        liveRank: 12,
        badges: [],
        stats: {
            totalTrades: 5,
            winRate: 0.6,
            bestDay: 150,
            worstDay: -75,
            longestStreak: 3,
            totalProfit: 200,
            avgHoldTime: 2.5
        }
    });
    // Create clean portfolios with no random holdings
    exports.portfolios = exports.users.map(user => {
        const seasonHoldings = [];
        const liveHoldings = [];
        // Clean portfolio with just $1000 cash
        return {
            userId: user.id,
            seasonHoldings,
            liveHoldings,
            totalValue: 1000,
            availableBalance: 1000,
            todaysPL: 0,
            seasonPL: 0,
            livePL: 0,
            tradesRemaining: 5,
            lastUpdated: Date.now()
        };
    });
    // Generate mock trade history
    const tradeTypes = ['buy', 'sell'];
    const accountTypes = ['season', 'live'];
    for (let i = 0; i < 100; i++) {
        const user = exports.users[Math.floor(Math.random() * exports.users.length)];
        const player = exports.players[Math.floor(Math.random() * exports.players.length)];
        const type = tradeTypes[Math.floor(Math.random() * tradeTypes.length)];
        const shares = Math.floor(Math.random() * 15) + 1;
        const price = player.currentPrice * (0.95 + Math.random() * 0.1); // ±5% from current
        exports.trades.push({
            id: (0, uuid_1.v4)(),
            userId: user.id,
            playerId: player.id,
            playerName: player.name,
            type,
            orderType: 'market',
            shares,
            price: Math.round(price * 100) / 100,
            timestamp: Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000, // Last 7 days
            accountType: accountTypes[Math.floor(Math.random() * accountTypes.length)],
            status: 'executed',
            multiplier: Math.random() > 0.9 ? (1.5 + Math.random() * 2) : undefined, // 10% chance of multiplier
            totalAmount: Math.round(shares * price * 100) / 100
        });
    }
    // Create enhanced live game for day trading
    exports.currentGame = {
        id: (0, uuid_1.v4)(),
        homeTeam: 'LAL',
        awayTeam: 'GSW',
        homeScore: 89,
        awayScore: 92,
        quarter: 3,
        timeRemaining: '7:32',
        isActive: true,
        startTime: Date.now() - (2.5 * 60 * 60 * 1000), // Started 2.5 hours ago
        activePlayers: exports.players.filter(p => p.isPlaying).map(p => p.id),
        // Enhanced day trading data
        marketSentiment: 'bullish', // bullish, bearish, neutral
        tradingVolume: 1250000, // High volume for day trading
        volatilityIndex: 0.85, // High volatility for day trading
        hotPlayers: ['Stephen Curry', 'LeBron James', 'Giannis Antetokounmpo'], // Trending players
        marketOpen: true,
        lastPriceUpdate: Date.now()
    };
    console.log(`✅ Initialized ${exports.players.length} players`);
    console.log(`✅ Initialized ${exports.users.length} users`);
    console.log(`✅ Initialized ${exports.portfolios.length} portfolios`);
    console.log(`✅ Initialized ${exports.trades.length} trades`);
    console.log(`✅ Initialized live game: ${exports.currentGame.awayTeam} @ ${exports.currentGame.homeTeam}`);
}
// Getter functions for accessing mock data
const getPlayers = () => exports.players;
exports.getPlayers = getPlayers;
const getUsers = () => exports.users;
exports.getUsers = getUsers;
const getPortfolios = () => exports.portfolios;
exports.getPortfolios = getPortfolios;
const getTrades = () => exports.trades;
exports.getTrades = getTrades;
const getCurrentGame = () => exports.currentGame;
exports.getCurrentGame = getCurrentGame;
// Setter functions for updating mock data
const updatePlayerPrice = (playerId, newPrice) => {
    const player = exports.players.find(p => p.id === playerId);
    if (player) {
        const oldPrice = player.currentPrice;
        player.currentPrice = newPrice;
        player.priceChange24h = newPrice - oldPrice;
        player.priceChangePercent24h = ((newPrice - oldPrice) / oldPrice) * 100;
        // Add to price history
        player.priceHistory.push({
            timestamp: Date.now(),
            price: newPrice,
            volume: Math.floor(Math.random() * 5000) + 500
        });
        // Keep only last 100 points
        if (player.priceHistory.length > 100) {
            player.priceHistory = player.priceHistory.slice(-100);
        }
    }
};
exports.updatePlayerPrice = updatePlayerPrice;
const addTrade = (trade) => {
    exports.trades.unshift(trade); // Add to beginning
    // Keep only last 1000 trades
    if (exports.trades.length > 1000) {
        exports.trades = exports.trades.slice(0, 1000);
    }
};
exports.addTrade = addTrade;
const updateGameScore = (homeScore, awayScore, quarter, timeRemaining) => {
    if (exports.currentGame) {
        exports.currentGame.homeScore = homeScore;
        exports.currentGame.awayScore = awayScore;
        exports.currentGame.quarter = quarter;
        exports.currentGame.timeRemaining = timeRemaining;
    }
};
exports.updateGameScore = updateGameScore;
// Portfolio management functions for trading engine
const executeTradeOrder = (userId, playerId, shares, type, accountType) => {
    const portfolio = exports.portfolios.find(p => p.userId === userId);
    const player = exports.players.find(p => p.id === playerId);
    
    if (!portfolio || !player) {
        return { success: false, error: 'Portfolio or player not found' };
    }
    const tradeAmount = shares * player.currentPrice;
    // Check if live trading and trades remaining
    if (accountType === 'live' && portfolio.tradesRemaining <= 0) {
        return { success: false, error: 'No trades remaining for live account' };
    }
    // Check balance for buy orders
    if (type === 'buy' && portfolio.availableBalance < tradeAmount) {
        return { success: false, error: 'Insufficient balance' };
    }
    // Execute the trade
    const trade = {
        id: (0, uuid_1.v4)(),
        userId,
        playerId,
        playerName: player.name,
        type,
        orderType: 'market',
        shares,
        price: player.currentPrice,
        timestamp: Date.now(),
        accountType,
        status: 'executed',
        totalAmount: Math.round(tradeAmount * 100) / 100
    };
    // Update holdings
    const holdings = accountType === 'season' ? portfolio.seasonHoldings : portfolio.liveHoldings;
    const existingHolding = holdings.find(h => h.playerId === playerId);
    if (type === 'buy') {
        if (existingHolding) {
            // Update existing position
            const newShares = existingHolding.shares + shares;
            const newAveragePrice = ((existingHolding.shares * existingHolding.averagePrice) + tradeAmount) / newShares;
            existingHolding.shares = newShares;
            existingHolding.averagePrice = Math.round(newAveragePrice * 100) / 100;
            existingHolding.totalValue = Math.round(newShares * player.currentPrice * 100) / 100;
            existingHolding.unrealizedPL = Math.round((existingHolding.totalValue - (newShares * existingHolding.averagePrice)) * 100) / 100;
            existingHolding.unrealizedPLPercent = Math.round((existingHolding.unrealizedPL / (newShares * existingHolding.averagePrice)) * 100 * 100) / 100;
        }
        else {
            // Create new position
            holdings.push({
                playerId,
                playerName: player.name,
                shares,
                averagePrice: player.currentPrice,
                currentPrice: player.currentPrice,
                totalValue: tradeAmount,
                unrealizedPL: 0,
                unrealizedPLPercent: 0,
                purchaseDate: Date.now()
            });
        }
        portfolio.availableBalance -= tradeAmount;
    }
    else { // sell
        if (!existingHolding || existingHolding.shares < shares) {
            return { success: false, error: 'Insufficient shares to sell' };
        }
        existingHolding.shares -= shares;
        existingHolding.totalValue = Math.round(existingHolding.shares * player.currentPrice * 100) / 100;
        if (existingHolding.shares === 0) {
            const index = holdings.indexOf(existingHolding);
            holdings.splice(index, 1);
        }
        else {
            existingHolding.unrealizedPL = Math.round((existingHolding.totalValue - (existingHolding.shares * existingHolding.averagePrice)) * 100) / 100;
            existingHolding.unrealizedPLPercent = Math.round((existingHolding.unrealizedPL / (existingHolding.shares * existingHolding.averagePrice)) * 100 * 100) / 100;
        }
        portfolio.availableBalance += tradeAmount;
    }
    // Update portfolio totals
    const newSeasonValue = portfolio.seasonHoldings.reduce((sum, h) => sum + h.totalValue, 0);
    const newLiveValue = portfolio.liveHoldings.reduce((sum, h) => sum + h.totalValue, 0);
    portfolio.totalValue = Math.round((newSeasonValue + newLiveValue + portfolio.availableBalance) * 100) / 100;
    // Reduce trades remaining for live trades
    if (accountType === 'live') {
        portfolio.tradesRemaining = Math.max(0, portfolio.tradesRemaining - 1);
    }
    portfolio.lastUpdated = Date.now();
    // Add trade to history
    (0, exports.addTrade)(trade);
    return { success: true, trade };
};
exports.executeTradeOrder = executeTradeOrder;
// Sync portfolio values with current prices (called when prices update)
const syncPortfoliosWithPrices = () => {
    exports.portfolios.forEach(portfolio => {
        let totalValue = portfolio.availableBalance;
        // Update season holdings
        portfolio.seasonHoldings.forEach(holding => {
            const player = exports.players.find(p => p.id === holding.playerId);
            if (player) {
                holding.currentPrice = player.currentPrice;
                holding.totalValue = Math.round(holding.shares * player.currentPrice * 100) / 100;
                holding.unrealizedPL = Math.round((holding.totalValue - (holding.shares * holding.averagePrice)) * 100) / 100;
                holding.unrealizedPLPercent = Math.round((holding.unrealizedPL / (holding.shares * holding.averagePrice)) * 100 * 100) / 100;
                totalValue += holding.totalValue;
            }
        });
        // Update live holdings
        portfolio.liveHoldings.forEach(holding => {
            const player = exports.players.find(p => p.id === holding.playerId);
            if (player) {
                holding.currentPrice = player.currentPrice;
                holding.totalValue = Math.round(holding.shares * player.currentPrice * 100) / 100;
                holding.unrealizedPL = Math.round((holding.totalValue - (holding.shares * holding.averagePrice)) * 100) / 100;
                holding.unrealizedPLPercent = Math.round((holding.unrealizedPL / (holding.shares * holding.averagePrice)) * 100 * 100) / 100;
                totalValue += holding.totalValue;
            }
        });
        portfolio.totalValue = Math.round(totalValue * 100) / 100;
        portfolio.lastUpdated = Date.now();
    });
};
exports.syncPortfoliosWithPrices = syncPortfoliosWithPrices;
exports.limitOrders = [];
const createLimitOrder = (userId, playerId, shares, type, limitPrice, accountType) => {
    const player = exports.players.find(p => p.id === playerId);
    const portfolio = exports.portfolios.find(p => p.userId === userId);
    if (!player || !portfolio) {
        return { success: false, error: 'Player or portfolio not found' };
    }
    const order = {
        id: (0, uuid_1.v4)(),
        userId,
        playerId,
        playerName: player.name,
        type,
        shares,
        limitPrice,
        accountType,
        status: 'pending',
        createdAt: Date.now(),
        expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    };
    exports.limitOrders.push(order);
    return { success: true, order };
};
exports.createLimitOrder = createLimitOrder;
const checkLimitOrders = () => {
    const now = Date.now();
    exports.limitOrders.forEach(order => {
        if (order.status !== 'pending')
            return;
        // Check if expired
        if (now > order.expiresAt) {
            order.status = 'cancelled';
            return;
        }
        const player = exports.players.find(p => p.id === order.playerId);
        if (!player)
            return;
        // Check if limit price conditions are met
        let shouldExecute = false;
        if (order.type === 'buy' && player.currentPrice <= order.limitPrice) {
            shouldExecute = true;
        }
        else if (order.type === 'sell' && player.currentPrice >= order.limitPrice) {
            shouldExecute = true;
        }
        if (shouldExecute) {
            const result = (0, exports.executeTradeOrder)(order.userId, order.playerId, order.shares, order.type, order.accountType);
            if (result.success) {
                order.status = 'executed';
            }
        }
    });
    // Remove old cancelled/executed orders (keep last 100)
    exports.limitOrders = exports.limitOrders.filter(order => {
        if (order.status === 'pending') {
            return true;
        }
        // Keep recent cancelled/executed orders for 7 days
        return now - order.createdAt < 7 * 24 * 60 * 60 * 1000;
    }).slice(-100);
};
exports.checkLimitOrders = checkLimitOrders;
const getLimitOrders = () => exports.limitOrders;
exports.getLimitOrders = getLimitOrders;
const getUserLimitOrders = (userId) => exports.limitOrders.filter(order => order.userId === userId && order.status === 'pending');
exports.getUserLimitOrders = getUserLimitOrders;
// User Management Functions (for demo mode without database)
const demoUsers = new Map();
const demoSessions = new Map();
const addDemoUser = (user) => {
    demoUsers.set(user.id, user);
    console.log(`📝 Demo user added: ${user.username} (${user.id})`);
};
exports.addDemoUser = addDemoUser;
const getDemoUser = (userId) => {
    return demoUsers.get(userId);
};
exports.getDemoUser = getDemoUser;
const getDemoUserByEmail = (email) => {
    for (const user of demoUsers.values()) {
        if (user.email === email) {
            return user;
        }
    }
    return null;
};
exports.getDemoUserByEmail = getDemoUserByEmail;
const updateDemoUserSession = (userId, socketId, isOnline = true) => {
    if (isOnline) {
        demoSessions.set(userId, { userId, socketId, lastSeen: new Date() });
    }
    else {
        demoSessions.delete(userId);
    }
};
exports.updateDemoUserSession = updateDemoUserSession;
const getDemoOnlineUsersCount = () => {
    return demoSessions.size;
};
exports.getDemoOnlineUsersCount = getDemoOnlineUsersCount;
const getAllDemoUsers = () => {
    return Array.from(demoUsers.values());
};
exports.getAllDemoUsers = getAllDemoUsers;
const createDemoPortfolio = (userId) => {
    const portfolio = {
        userId,
        seasonHoldings: [],
        liveHoldings: [],
        totalValue: 10000,
        availableBalance: 10000,
        todaysPL: 0,
        seasonPL: 0,
        livePL: 0,
        tradesRemaining: 5,
        lastUpdated: Date.now()
    };
    exports.portfolios.push(portfolio);
    console.log(`📊 Demo portfolio created for user: ${userId}`);
    return portfolio;
};
exports.createDemoPortfolio = createDemoPortfolio;

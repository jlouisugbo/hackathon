"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshNBAData = exports.createDemoPortfolio = exports.getAllDemoUsers = exports.getDemoOnlineUsersCount = exports.updateDemoUserSession = exports.getDemoUserByEmail = exports.getDemoUser = exports.addDemoUser = exports.getUserLimitOrders = exports.getLimitOrders = exports.checkLimitOrders = exports.createLimitOrder = exports.limitOrders = exports.syncPortfoliosWithPrices = exports.executeTradeOrder = exports.updateGameScore = exports.addTrade = exports.updatePlayerPrice = exports.getCurrentGame = exports.getTrades = exports.getPortfolios = exports.getUsers = exports.getPlayers = exports.currentGame = exports.trades = exports.portfolios = exports.users = exports.players = void 0;
exports.initializeNBAData = initializeNBAData;
const uuid_1 = require("uuid");
const nbaPlayersService_1 = __importDefault(require("../services/nbaPlayersService"));
// Global data stores
exports.players = [];
exports.users = [];
exports.portfolios = [];
exports.trades = [];
exports.currentGame = null;
const nbaService = new nbaPlayersService_1.default();
async function initializeNBAData() {
    console.log('🏀 Initializing NBA player data from SportsData API...');
    try {
        // Fetch real NBA players
        const nbaPlayers = await nbaService.getAllPlayers();
        if (nbaPlayers.length === 0) {
            console.warn('⚠️ No NBA players fetched, falling back to mock data');
            // Fallback to mock data when API fails
            await initializeMockDataFallback();
        }
        else {
            exports.players = nbaPlayers;
            console.log(`✅ Loaded ${exports.players.length} NBA players from SportsData API`);
        }
        // Initialize users (keep existing mock users for now)
        initializeUsers();
        // Initialize portfolios
        initializePortfolios();
        // Initialize trades (only if we have players)
        if (exports.players.length > 0) {
            initializeTrades();
        }
        // Initialize live game
        initializeLiveGame();
    }
    catch (error) {
        console.error('❌ Error initializing NBA data:', error);
        // Fallback to mock data
        await initializeMockDataFallback();
        initializeUsers();
        initializePortfolios();
        initializeTrades();
        initializeLiveGame();
    }
}
async function initializeMockDataFallback() {
    console.log('🔄 Initializing mock data fallback...');
    // Create some mock players as fallback
    const mockPlayers = [
        {
            id: 'mock-1',
            name: 'LeBron James',
            team: 'LAL',
            position: 'SF',
            currentPrice: 189.50,
            priceChange24h: 2.50,
            priceChangePercent24h: 1.33,
            priceHistory: generateMockPriceHistory(189.50),
            stats: { ppg: 25.3, rpg: 7.3, apg: 7.4, fg: 0.504, threePt: 0.325, gamesPlayed: 71, minutesPerGame: 35.5 },
            isPlaying: true,
            volatility: 0.15,
            imageUrl: 'https://cdn.nba.com/headshots/nba/latest/1040x760/lebron_james.png',
            jersey: 23
        },
        {
            id: 'mock-2',
            name: 'Stephen Curry',
            team: 'GSW',
            position: 'PG',
            currentPrice: 176.25,
            priceChange24h: -1.25,
            priceChangePercent24h: -0.70,
            priceHistory: generateMockPriceHistory(176.25),
            stats: { ppg: 26.4, rpg: 4.5, apg: 5.1, fg: 0.427, threePt: 0.408, gamesPlayed: 74, minutesPerGame: 32.7 },
            isPlaying: true,
            volatility: 0.22,
            imageUrl: 'https://cdn.nba.com/headshots/nba/latest/1040x760/stephen_curry.png',
            jersey: 30
        },
        {
            id: 'mock-3',
            name: 'Giannis Antetokounmpo',
            team: 'MIL',
            position: 'PF',
            currentPrice: 195.75,
            priceChange24h: 3.25,
            priceChangePercent24h: 1.69,
            priceHistory: generateMockPriceHistory(195.75),
            stats: { ppg: 31.1, rpg: 11.8, apg: 5.7, fg: 0.553, threePt: 0.274, gamesPlayed: 63, minutesPerGame: 32.1 },
            isPlaying: true,
            volatility: 0.18,
            imageUrl: 'https://cdn.nba.com/headshots/nba/latest/1040x760/giannis_antetokounmpo.png',
            jersey: 34
        },
        {
            id: 'mock-4',
            name: 'Luka Dončić',
            team: 'DAL',
            position: 'PG',
            currentPrice: 182.40,
            priceChange24h: 1.40,
            priceChangePercent24h: 0.77,
            priceHistory: generateMockPriceHistory(182.40),
            stats: { ppg: 32.4, rpg: 8.6, apg: 8.0, fg: 0.454, threePt: 0.343, gamesPlayed: 70, minutesPerGame: 36.2 },
            isPlaying: true,
            volatility: 0.25,
            imageUrl: 'https://cdn.nba.com/headshots/nba/latest/1040x760/luka_doncic.png',
            jersey: 77
        },
        {
            id: 'mock-5',
            name: 'Jayson Tatum',
            team: 'BOS',
            position: 'SF',
            currentPrice: 168.90,
            priceChange24h: -0.90,
            priceChangePercent24h: -0.53,
            priceHistory: generateMockPriceHistory(168.90),
            stats: { ppg: 26.9, rpg: 8.1, apg: 4.9, fg: 0.466, threePt: 0.348, gamesPlayed: 74, minutesPerGame: 35.7 },
            isPlaying: true,
            volatility: 0.20,
            imageUrl: 'https://cdn.nba.com/headshots/nba/latest/1040x760/jayson_tatum.png',
            jersey: 0
        }
    ];
    exports.players = mockPlayers;
    console.log(`✅ Loaded ${exports.players.length} mock players as fallback`);
}
function generateMockPriceHistory(basePrice) {
    const history = [];
    const now = Date.now();
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
    let currentPrice = basePrice * (0.8 + Math.random() * 0.4);
    for (let i = 0; i < 30; i++) {
        const timestamp = thirtyDaysAgo + (i * 24 * 60 * 60 * 1000);
        const change = (Math.random() - 0.5) * 2 * 0.2 * currentPrice;
        currentPrice = Math.max(10, currentPrice + change);
        history.push({
            timestamp,
            price: Math.round(currentPrice * 100) / 100,
            volume: Math.floor(Math.random() * 10000) + 1000
        });
    }
    return history;
}
function initializeUsers() {
    // Create mock users (keeping existing structure)
    const mockUsernames = [
        'CourtVision23', 'DunkMaster', 'ThreePointKing', 'ReboundGod', 'AssistLegend',
        'BlockParty', 'SlamDunkFan', 'BasketBaller', 'HoopsDreamer', 'NBAOracle'
    ];
    exports.users = mockUsernames.map((username, index) => ({
        id: (0, uuid_1.v4)(),
        username,
        email: `${username.toLowerCase()}@example.com`,
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
        joinDate: Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000,
        totalPortfolioValue: 8000 + Math.random() * 4000,
        seasonRank: index + 1,
        liveRank: Math.floor(Math.random() * 10) + 1,
        badges: [],
        stats: {
            totalTrades: Math.floor(Math.random() * 200) + 50,
            winRate: 0.45 + Math.random() * 0.25,
            bestDay: Math.random() * 1000 + 200,
            worstDay: -(Math.random() * 800 + 100),
            longestStreak: Math.floor(Math.random() * 15) + 3,
            totalProfit: (Math.random() - 0.5) * 2000,
            avgHoldTime: Math.random() * 7 + 1
        }
    }));
    // Add demo users
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
}
function initializePortfolios() {
    exports.portfolios = exports.users.map(user => ({
        userId: user.id,
        seasonHoldings: [],
        liveHoldings: [],
        totalValue: 1000,
        availableBalance: 1000,
        todaysPL: 0,
        seasonPL: 0,
        livePL: 0,
        tradesRemaining: 5,
        lastUpdated: Date.now()
    }));
}
function initializeTrades() {
    // Generate some initial trade history
    const tradeTypes = ['buy', 'sell'];
    const accountTypes = ['season', 'live'];
    for (let i = 0; i < 50; i++) {
        const user = exports.users[Math.floor(Math.random() * exports.users.length)];
        const player = exports.players[Math.floor(Math.random() * exports.players.length)];
        const type = tradeTypes[Math.floor(Math.random() * tradeTypes.length)];
        const shares = Math.floor(Math.random() * 15) + 1;
        const price = player.currentPrice * (0.95 + Math.random() * 0.1);
        exports.trades.push({
            id: (0, uuid_1.v4)(),
            userId: user.id,
            playerId: player.id,
            playerName: player.name,
            type,
            orderType: 'market',
            shares,
            price: Math.round(price * 100) / 100,
            timestamp: Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000,
            accountType: accountTypes[Math.floor(Math.random() * accountTypes.length)],
            status: 'executed',
            multiplier: Math.random() > 0.9 ? (1.5 + Math.random() * 2) : undefined,
            totalAmount: Math.round(shares * price * 100) / 100
        });
    }
}
function initializeLiveGame() {
    // Create a live game with some active players
    const activePlayers = exports.players.filter(p => p.isPlaying).slice(0, 10).map(p => p.id);
    exports.currentGame = {
        id: (0, uuid_1.v4)(),
        homeTeam: 'LAL',
        awayTeam: 'GSW',
        homeScore: 89,
        awayScore: 92,
        quarter: 3,
        timeRemaining: '7:32',
        isActive: true,
        startTime: Date.now() - (2.5 * 60 * 60 * 1000),
        activePlayers,
        marketSentiment: 'bullish',
        tradingVolume: 1250000,
        volatilityIndex: 0.85,
        hotPlayers: exports.players.slice(0, 3).map(p => p.name),
        marketOpen: true,
        lastPriceUpdate: Date.now()
    };
}
// Getter functions for accessing data
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
// Setter functions for updating data
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
    exports.trades.unshift(trade);
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
// Portfolio management functions
const executeTradeOrder = (userId, playerId, shares, type, accountType) => {
    const portfolio = exports.portfolios.find(p => p.userId === userId);
    const player = exports.players.find(p => p.id === playerId);
    if (!portfolio || !player) {
        return { success: false, error: 'Portfolio or player not found' };
    }
    const tradeAmount = shares * player.currentPrice;
    if (accountType === 'live' && portfolio.tradesRemaining <= 0) {
        return { success: false, error: 'No trades remaining for live account' };
    }
    if (type === 'buy' && portfolio.availableBalance < tradeAmount) {
        return { success: false, error: 'Insufficient balance' };
    }
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
    const holdings = accountType === 'season' ? portfolio.seasonHoldings : portfolio.liveHoldings;
    const existingHolding = holdings.find(h => h.playerId === playerId);
    if (type === 'buy') {
        if (existingHolding) {
            const newShares = existingHolding.shares + shares;
            const newAveragePrice = ((existingHolding.shares * existingHolding.averagePrice) + tradeAmount) / newShares;
            existingHolding.shares = newShares;
            existingHolding.averagePrice = Math.round(newAveragePrice * 100) / 100;
            existingHolding.totalValue = Math.round(newShares * player.currentPrice * 100) / 100;
            existingHolding.unrealizedPL = Math.round((existingHolding.totalValue - (newShares * existingHolding.averagePrice)) * 100) / 100;
            existingHolding.unrealizedPLPercent = Math.round((existingHolding.unrealizedPL / (newShares * existingHolding.averagePrice)) * 100 * 100) / 100;
        }
        else {
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
    else {
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
    const newSeasonValue = portfolio.seasonHoldings.reduce((sum, h) => sum + h.totalValue, 0);
    const newLiveValue = portfolio.liveHoldings.reduce((sum, h) => sum + h.totalValue, 0);
    portfolio.totalValue = Math.round((newSeasonValue + newLiveValue + portfolio.availableBalance) * 100) / 100;
    if (accountType === 'live') {
        portfolio.tradesRemaining = Math.max(0, portfolio.tradesRemaining - 1);
    }
    portfolio.lastUpdated = Date.now();
    (0, exports.addTrade)(trade);
    return { success: true, trade };
};
exports.executeTradeOrder = executeTradeOrder;
const syncPortfoliosWithPrices = () => {
    exports.portfolios.forEach(portfolio => {
        let totalValue = portfolio.availableBalance;
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
        expiresAt: Date.now() + (24 * 60 * 60 * 1000)
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
        if (now > order.expiresAt) {
            order.status = 'cancelled';
            return;
        }
        const player = exports.players.find(p => p.id === order.playerId);
        if (!player)
            return;
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
    exports.limitOrders = exports.limitOrders.filter(order => {
        if (order.status === 'pending') {
            return true;
        }
        return now - order.createdAt < 7 * 24 * 60 * 60 * 1000;
    }).slice(-100);
};
exports.checkLimitOrders = checkLimitOrders;
const getLimitOrders = () => exports.limitOrders;
exports.getLimitOrders = getLimitOrders;
const getUserLimitOrders = (userId) => exports.limitOrders.filter(order => order.userId === userId && order.status === 'pending');
exports.getUserLimitOrders = getUserLimitOrders;
// User Management Functions
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
// Function to refresh NBA data
const refreshNBAData = async () => {
    console.log('🔄 Refreshing NBA data...');
    try {
        const nbaPlayers = await nbaService.getAllPlayers();
        if (nbaPlayers.length > 0) {
            exports.players = nbaPlayers;
            console.log(`✅ Refreshed ${exports.players.length} NBA players`);
        }
    }
    catch (error) {
        console.error('❌ Error refreshing NBA data:', error);
    }
};
exports.refreshNBAData = refreshNBAData;

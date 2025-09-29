"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = void 0;
// Load environment variables first, before any other imports
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const envPath = path_1.default.resolve(__dirname, '../.env');
dotenv_1.default.config({ path: envPath });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const socketHandler_1 = require("./socket/socketHandler");
const nbaData_1 = require("./data/nbaData");
const priceEngine_1 = __importDefault(require("./utils/priceEngine"));
const supabase_1 = require("./config/supabase");
const liveGameManager_1 = require("./services/liveGameManager");
const realPriceEngine_1 = require("./utils/realPriceEngine");
// Import routes
const players_1 = __importDefault(require("./routes/players"));
const portfolio_1 = __importDefault(require("./routes/portfolio"));
const trades_1 = __importDefault(require("./routes/trades"));
const leaderboard_1 = __importDefault(require("./routes/leaderboard"));
const game_1 = __importDefault(require("./routes/game"));
const auth_1 = __importDefault(require("./routes/auth"));
const liveData_1 = __importDefault(require("./routes/liveData"));
const gameSimulation_1 = __importDefault(require("./routes/gameSimulation"));
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: ["http://localhost:19006", "http://localhost:8081", "http://localhost:8082", "http://localhost:8083", "http://localhost:8084", "http://localhost:3000", "http://localhost:3001", "http://localhost:19000", "http://localhost:19001", "http://localhost:19002", "http://143.215.100.53:19006", "http://143.215.100.53:8081", "http://143.215.100.53:8082"],
        methods: ["GET", "POST", "PUT", "DELETE"],
        credentials: true
    }
});
exports.io = io;
const PORT = parseInt(process.env.PORT || '3002', 10);
// Middleware
app.use((0, cors_1.default)({
    origin: ["http://localhost:19006", "http://localhost:8081", "http://localhost:8082", "http://localhost:8083", "http://localhost:8084", "http://localhost:3000", "http://localhost:3001", "http://localhost:19000", "http://localhost:19001", "http://localhost:19002", "http://143.215.100.53:19006", "http://143.215.100.53:8081", "http://143.215.100.53:8082"],
    credentials: true
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Serve static files for demo
app.use(express_1.default.static('public'));
// Health check endpoint - optimized for Railway
let initializationComplete = false;
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        initialized: initializationComplete,
        port: PORT
    });
});
// API Routes
app.use('/api/auth', auth_1.default);
app.use('/api/players', players_1.default);
app.use('/api/portfolio', portfolio_1.default);
app.use('/api/trades', trades_1.default);
app.use('/api/leaderboard', leaderboard_1.default);
app.use('/api/game', game_1.default);
app.use('/api/live', liveData_1.default);
app.use('/api/simulation', gameSimulation_1.default);
// Global error handler
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});
// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Not Found',
        message: `Route ${req.originalUrl} not found`
    });
});
// Start server FIRST for Railway health checks
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 CORS origin: ${process.env.CORS_ORIGIN || 'http://localhost:19006'}`);
    console.log(`⚡ Socket.IO server ready`);
    // Initialize everything AFTER server starts (async)
    setTimeout(async () => {
        try {
            console.log('🔄 Starting background initialization...');
            // Initialize NBA data and socket handlers
            await (0, nbaData_1.initializeNBAData)();
            (0, socketHandler_1.initializeSocketHandlers)(io);
            // Initialize Supabase (optional for demo)
            (0, supabase_1.initializeSupabaseTables)();
            // Initialize price engine
            const priceEngine = priceEngine_1.default.getInstance();
            const players = (0, nbaData_1.getPlayers)();
            // Set base prices for real price engine
            players.forEach(player => {
                realPriceEngine_1.realPriceEngine.setBasePrice(player.id, player.currentPrice);
            });
            // Set Socket.IO instance for live game manager
            liveGameManager_1.liveGameManager.setSocketIO(io);
            // Start live game monitoring
            await liveGameManager_1.liveGameManager.startLiveMonitoring();
            initializationComplete = true;
            console.log('✅ Background initialization complete');
        }
        catch (error) {
            console.error('❌ Initialization error:', error);
        }
    }, 100); // Small delay to ensure server is fully ready
});
// Graceful shutdown handling for Railway
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully...');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});
process.on('SIGINT', () => {
    console.log('🛑 SIGINT received, shutting down gracefully...');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});
exports.default = app;

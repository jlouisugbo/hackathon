"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const supabase_1 = require("../config/supabase");
const mockData_1 = require("../data/mockData");
const JWT_SECRET = process.env.JWT_SECRET || 'hackathon-demo-secret-key';
const JWT_EXPIRES_IN = '24h'; // Long expiry for demo
class AuthService {
    // Generate JWT token
    generateToken(user) {
        return jsonwebtoken_1.default.sign({
            id: user.id,
            email: user.email,
            username: user.username
        }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    }
    // Verify JWT token
    verifyToken(token) {
        try {
            return jsonwebtoken_1.default.verify(token, JWT_SECRET);
        }
        catch (error) {
            throw new Error('Invalid or expired token');
        }
    }
    // Hash password
    async hashPassword(password) {
        const saltRounds = 10;
        return await bcryptjs_1.default.hash(password, saltRounds);
    }
    // Compare password
    async comparePassword(password, hash) {
        return await bcryptjs_1.default.compare(password, hash);
    }
    // Register new user (with Supabase fallback to in-memory)
    async register(credentials) {
        const { data, error } = await supabase_1.supabase.auth.signUp({
            email: credentials.email,
            password: credentials.password
        });
        try {
            // For demo: simple validation
            if (!credentials.email || !credentials.password || !credentials.username) {
                throw new Error('Email, password, and username are required');
            }
            if (credentials.password.length < 3) {
                throw new Error('Password must be at least 3 characters (demo mode)');
            }
            const hashedPassword = await this.hashPassword(credentials.password);
            // Try Supabase first
            if (supabase_1.isSupabaseConfigured) {
                const { data, error } = await supabase_1.supabase
                    .from(supabase_1.TABLES.USERS)
                    .insert({
                    email: credentials.email,
                    username: credentials.username,
                    password_hash: hashedPassword,
                    avatar_url: credentials.avatarUrl,
                    created_at: new Date().toISOString(),
                    total_portfolio_value: 10000,
                    season_rank: 0,
                    live_rank: 0
                })
                    .select()
                    .single();
                if (error) {
                    if (error.code === '23505') { // Unique constraint violation
                        throw new Error('User with this email already exists');
                    }
                    throw error;
                }
                const user = {
                    id: data.id,
                    email: data.email,
                    username: data.username,
                    avatarUrl: data.avatar_url,
                    createdAt: data.created_at
                };
                // Create initial portfolio for new user
                await this.createInitialPortfolio(user.id);
                const token = this.generateToken(user);
                return { user, token };
            }
            // Fallback to in-memory storage for demo
            const existingUser = (0, mockData_1.getDemoUserByEmail)(credentials.email);
            if (existingUser) {
                throw new Error('User with this email already exists');
            }
            const user = {
                id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                email: credentials.email,
                username: credentials.username,
                avatarUrl: credentials.avatarUrl,
                createdAt: new Date().toISOString()
            };
            // Store in demo user storage
            (0, mockData_1.addDemoUser)({
                ...user,
                password_hash: hashedPassword,
                total_portfolio_value: 10000,
                season_rank: 0,
                live_rank: 0
            });
            // Create initial portfolio for demo user
            (0, mockData_1.createDemoPortfolio)(user.id);
            const token = this.generateToken(user);
            return { user, token };
        }
        catch (error) {
            console.error('Registration error:', error);
            throw error;
        }
    }
    // Login user
    async login(credentials) {
        const { data, error } = await supabase_1.supabase.auth.signInWithPassword({
            email: credentials.email,
            password: credentials.password,
        });
        try {
            if (!credentials.email || !credentials.password) {
                throw new Error('Email and password are required');
            }
            // Try Supabase first
            if (supabase_1.isSupabaseConfigured) {
                const { data, error } = await supabase_1.supabase
                    .from(supabase_1.TABLES.USERS)
                    .select('*')
                    .eq('email', credentials.email)
                    .single();
                if (error || !data) {
                    throw new Error('Invalid email or password');
                }
                const isValidPassword = await this.comparePassword(credentials.password, data.password_hash);
                if (!isValidPassword) {
                    throw new Error('Invalid email or password');
                }
                const user = {
                    id: data.id,
                    email: data.email,
                    username: data.username,
                    avatarUrl: data.avatar_url,
                    createdAt: data.created_at
                };
                const token = this.generateToken(user);
                return { user, token };
            }
            // Fallback for demo - check demo users
            const demoUser = (0, mockData_1.getDemoUserByEmail)(credentials.email);
            if (demoUser) {
                const isValidPassword = await this.comparePassword(credentials.password, demoUser.password_hash);
                if (!isValidPassword) {
                    throw new Error('Invalid email or password');
                }
                const user = {
                    id: demoUser.id,
                    email: demoUser.email,
                    username: demoUser.username,
                    avatarUrl: demoUser.avatar_url,
                    createdAt: demoUser.created_at || new Date().toISOString()
                };
                const token = this.generateToken(user);
                return { user, token };
            }
            // If no user found, create demo user for hackathon
            const user = {
                id: `demo_user_${Date.now()}`,
                email: credentials.email,
                username: credentials.email.split('@')[0],
                createdAt: new Date().toISOString()
            };
            const token = this.generateToken(user);
            return { user, token };
        }
        catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }
    // Get user by ID
    async getUserById(userId) {
        try {
            if (supabase_1.isSupabaseConfigured) {
                const { data, error } = await supabase_1.supabase
                    .from(supabase_1.TABLES.USERS)
                    .select('id, email, username, avatar_url, created_at')
                    .eq('id', userId)
                    .single();
                if (error || !data) {
                    return null;
                }
                return {
                    id: data.id,
                    email: data.email,
                    username: data.username,
                    avatarUrl: data.avatar_url,
                    createdAt: data.created_at
                };
            }
            // Fallback to demo data
            const demoUser = (0, mockData_1.getDemoUser)(userId);
            if (demoUser) {
                return {
                    id: demoUser.id,
                    email: demoUser.email,
                    username: demoUser.username,
                    avatarUrl: demoUser.avatar_url,
                    createdAt: demoUser.created_at || new Date().toISOString()
                };
            }
            return null;
        }
        catch (error) {
            console.error('Get user error:', error);
            return null;
        }
    }
    // Update user session (for socket connections)
    async updateUserSession(userId, socketId, isOnline = true) {
        try {
            if (supabase_1.isSupabaseConfigured) {
                await supabase_1.supabase
                    .from(supabase_1.TABLES.USER_SESSIONS)
                    .upsert({
                    user_id: userId,
                    socket_id: socketId,
                    is_online: isOnline,
                    last_seen: new Date().toISOString()
                });
            }
            else {
                // Fallback to demo session management
                (0, mockData_1.updateDemoUserSession)(userId, socketId, isOnline);
            }
        }
        catch (error) {
            console.error('Update session error:', error);
        }
    }
    // Get online users count
    async getOnlineUsersCount() {
        try {
            if (supabase_1.isSupabaseConfigured) {
                const { count } = await supabase_1.supabase
                    .from(supabase_1.TABLES.USER_SESSIONS)
                    .select('*', { count: 'exact', head: true })
                    .eq('is_online', true);
                return count || 0;
            }
            else {
                // Fallback to demo users count
                return (0, mockData_1.getDemoOnlineUsersCount)();
            }
        }
        catch (error) {
            console.error('Get online users error:', error);
            return 0;
        }
    }
    // Create initial portfolio for new user
    async createInitialPortfolio(userId) {
        try {
            if (supabase_1.isSupabaseConfigured) {
                await supabase_1.supabase
                    .from(supabase_1.TABLES.PORTFOLIOS)
                    .insert({
                    user_id: userId,
                    available_balance: 10000.00,
                    total_value: 10000.00,
                    todays_pl: 0.00,
                    season_pl: 0.00,
                    live_pl: 0.00,
                    trades_remaining: 5,
                    created_at: new Date().toISOString(),
                    last_updated: new Date().toISOString()
                });
                console.log(`✅ Created initial portfolio for user ${userId}`);
            }
        }
        catch (error) {
            console.error('Create portfolio error:', error);
        }
    }
}
exports.authService = new AuthService();
exports.default = exports.authService;

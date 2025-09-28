"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authService_1 = require("../services/authService");
const supabase_1 = require("../config/supabase");
const router = (0, express_1.Router)();
// Register endpoint
router.post('/register', async (req, res) => {
    try {
        const credentials = req.body;
        const result = await authService_1.authService.register(credentials);
        const response = {
            success: true,
            data: result,
            message: 'User registered successfully'
        };
        res.status(201).json(response);
    }
    catch (error) {
        console.error('Registration error:', error);
        const response = {
            success: false,
            error: error.message || 'Registration failed',
            message: 'Failed to register user'
        };
        res.status(400).json(response);
    }
});
// Login endpoint
router.post('/login', async (req, res) => {
    try {
        const credentials = req.body;
        const result = await authService_1.authService.login(credentials);
        const response = {
            success: true,
            data: result,
            message: 'Login successful'
        };
        res.status(200).json(response);
    }
    catch (error) {
        console.error('Login error:', error);
        const response = {
            success: false,
            error: error.message || 'Login failed',
            message: 'Invalid credentials'
        };
        res.status(401).json(response);
    }
});
// Get current user (if authenticated)
router.get('/me', async (req, res) => {
    const { data: { user } } = await supabase_1.supabase.auth.getUser();
    if (!user) {
        return res.status(404).json({
            success: false,
            error: 'User not found',
            message: 'User associated with token not found'
        });
    }
    return res.status(200).json({
        success: true,
        user,
        message: 'User retrieved successfully'
    });
    /*
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          error: 'No token provided',
          message: 'Authorization header required'
        });
      }
  
      const token = authHeader.substring(7);
      const decoded = authService.verifyToken(token);
      const user = await authService.getUserById(decoded.id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
          message: 'User associated with token not found'
        });
      }
  
      const response: ApiResponse = {
        success: true,
        data: user,
        message: 'User retrieved successfully'
      };
      
      res.status(200).json(response);
    } catch (error: any) {
      console.error('Get user error:', error);
      
      const response: ApiResponse = {
        success: false,
        error: error.message || 'Authentication failed',
        message: 'Invalid or expired token'
      };
      
      res.status(401).json(response);
    }
      */
});
// Quick login for demo (bypasses password)
router.post('/demo-login', async (req, res) => {
    try {
        const { email, username } = req.body;
        if (!email) {
            return res.status(400).json({
                success: false,
                error: 'Email required',
                message: 'Please provide an email for demo login'
            });
        }
        // Create demo user
        const userId = `demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const user = {
            id: userId,
            email: email,
            username: username || email.split('@')[0],
            createdAt: new Date().toISOString()
        };
        // Import and create portfolio for demo user
        const { createDemoPortfolio, addDemoUser } = require('../data/mockData');
        addDemoUser({
            ...user,
            password_hash: '',
            total_portfolio_value: 10000,
            season_rank: 0,
            live_rank: 0
        });
        // Create portfolio in mock data
        const portfolio = createDemoPortfolio(userId);
        // Also create portfolio in database
        const { databaseService } = require('../services/databaseService');
        await databaseService.createPortfolio(userId, portfolio);
        const token = authService_1.authService.generateToken(user);
        const response = {
            success: true,
            data: { user, token },
            message: 'Demo login successful'
        };
        res.status(200).json(response);
    }
    catch (error) {
        console.error('Demo login error:', error);
        const response = {
            success: false,
            error: error.message || 'Demo login failed',
            message: 'Failed to create demo user'
        };
        res.status(500).json(response);
    }
});
// Get online users count
router.get('/online-count', async (req, res) => {
    try {
        const count = await authService_1.authService.getOnlineUsersCount();
        const response = {
            success: true,
            data: { onlineUsers: count },
            message: 'Online users count retrieved'
        };
        res.status(200).json(response);
    }
    catch (error) {
        console.error('Get online count error:', error);
        const response = {
            success: false,
            error: error.message || 'Failed to get online count',
            message: 'Could not retrieve online users'
        };
        res.status(500).json(response);
    }
});
exports.default = router;

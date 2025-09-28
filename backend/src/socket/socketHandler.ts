import { Server, Socket } from 'socket.io';
import { SocketEvents, ChatMessage, NotificationData } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { authService } from '../services/authService';

interface ConnectedUser {
  userId: string;
  username: string;
  email: string;
  socketId: string;
  joinedAt: number;
  isAuthenticated: boolean;
}

// Store connected users
const connectedUsers = new Map<string, ConnectedUser>();
const userRooms = new Map<string, Set<string>>(); // userId -> Set of room names
const socketToUser = new Map<string, string>(); // socketId -> userId

export function initializeSocketHandlers(io: Server) {
  console.log('🔌 Initializing Socket.IO handlers...');

  io.on('connection', (socket: Socket) => {
    console.log(`👤 User connected: ${socket.id}`);

    // Handle user joining with authentication
    socket.on('join_room', async (data: { userId?: string; username?: string; token?: string }) => {
      let user: ConnectedUser;

      // Try to authenticate with token first
      if (data.token) {
        try {
          const decoded = authService.verifyToken(data.token);
          const authUser = await authService.getUserById(decoded.id);
          
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
            await authService.updateUserSession(authUser.id, socket.id, true);
          } else {
            throw new Error('User not found');
          }
        } catch (error) {
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
      } else {
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
      userRooms.get(user.userId)!.add('general');
      userRooms.get(user.userId)!.add(`user:${user.userId}`);

      console.log(`✅ User ${user.username} (${user.userId}) joined room: general`);

      // Send welcome message
      const welcomeNotification = {
        id: uuidv4(),
        userId: user.userId,
        type: 'system' as const,
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
    socket.on('send_chat_message', (message: string) => {
      const user = connectedUsers.get(socket.id);
      if (!user) return;

      const chatMessage: ChatMessage = {
        id: uuidv4(),
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
    socket.on('subscribe_player', (playerId: string) => {
      const user = connectedUsers.get(socket.id);
      if (!user) return;

      const roomName = `player:${playerId}`;
      socket.join(roomName);

      if (!userRooms.has(user.userId)) {
        userRooms.set(user.userId, new Set());
      }
      userRooms.get(user.userId)!.add(roomName);

      console.log(`📊 User ${user.username} subscribed to player ${playerId}`);

      // Send current player data
      socket.emit('player_subscribed', { playerId, status: 'subscribed' });
    });

    // Handle player unsubscription
    socket.on('unsubscribe_player', (playerId: string) => {
      const user = connectedUsers.get(socket.id);
      if (!user) return;

      const roomName = `player:${playerId}`;
      socket.leave(roomName);

      if (userRooms.has(user.userId)) {
        userRooms.get(user.userId)!.delete(roomName);
      }

      console.log(`📊 User ${user.username} unsubscribed from player ${playerId}`);

      socket.emit('player_unsubscribed', { playerId, status: 'unsubscribed' });
    });

    // Handle live trading room
    socket.on('join_live_trading', async () => {
      const user = connectedUsers.get(socket.id);
      if (!user) return;

      socket.join('live_trading');

      if (!userRooms.has(user.userId)) {
        userRooms.set(user.userId, new Set());
      }
      userRooms.get(user.userId)!.add('live_trading');

      // Reset trades for new live session
      try {
        const { databaseService } = await import('../services/databaseService');
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
      } catch (error) {
        console.error('❌ Failed to reset trades for user:', error);
      }

      console.log(`🔥 User ${user.username} joined live trading room`);
    });

    socket.on('leave_live_trading', () => {
      const user = connectedUsers.get(socket.id);
      if (!user) return;

      socket.leave('live_trading');

      if (userRooms.has(user.userId)) {
        userRooms.get(user.userId)!.delete('live_trading');
      }

      console.log(`🔥 User ${user.username} left live trading room`);
    });

    // Handle leaderboard subscription
    socket.on('subscribe_leaderboard', (type: 'season' | 'live' | 'daily') => {
      const user = connectedUsers.get(socket.id);
      if (!user) return;

      const roomName = `leaderboard:${type}`;
      socket.join(roomName);

      if (!userRooms.has(user.userId)) {
        userRooms.set(user.userId, new Set());
      }
      userRooms.get(user.userId)!.add(roomName);

      console.log(`🏆 User ${user.username} subscribed to ${type} leaderboard`);
    });

    // Handle portfolio updates subscription
    socket.on('subscribe_portfolio', () => {
      const user = connectedUsers.get(socket.id);
      if (!user) return;

      const roomName = `portfolio:${user.userId}`;
      socket.join(roomName);

      if (!userRooms.has(user.userId)) {
        userRooms.set(user.userId, new Set());
      }
      userRooms.get(user.userId)!.add(roomName);

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
          await authService.updateUserSession(user.userId, socket.id, false);
        }

        // Clean up user rooms
        userRooms.delete(user.userId);
        connectedUsers.delete(socket.id);
        socketToUser.delete(socket.id);

        // Broadcast updated user count
        io.to('general').emit('user_count', connectedUsers.size);
      } else {
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
export function broadcastPriceUpdate(io: Server, playerId: string, price: number, change: number, changePercent: number) {
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

export function broadcastFlashMultiplier(io: Server, flashData: any) {
  // Broadcast to live trading room and general room
  io.to('live_trading').emit('flash_multiplier', flashData);
  io.to('general').emit('flash_multiplier', flashData);

  console.log(`⚡ Flash multiplier broadcast: ${flashData.playerName} ${flashData.multiplier}x`);
}

export function broadcastGameEvent(io: Server, gameEvent: any) {
  // Broadcast to all rooms
  io.to('general').emit('game_event', gameEvent);
  io.to('live_trading').emit('game_event', gameEvent);

  console.log(`🏀 Game event broadcast: ${gameEvent.description}`);
}

export function broadcastTradeExecution(io: Server, trade: any) {
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

export function broadcastLeaderboardUpdate(io: Server, type: string, leaderboard: any[]) {
  io.to(`leaderboard:${type}`).emit('leaderboard_update', {
    type,
    leaderboard,
    timestamp: Date.now()
  });

  console.log(`🏆 ${type} leaderboard updated`);
}

export function broadcastPortfolioUpdate(io: Server, userId: string, portfolio: any) {
  io.to(`portfolio:${userId}`).emit('portfolio_update', portfolio);
  io.to(`user:${userId}`).emit('portfolio_update', portfolio);
}

export function broadcastMarketData(io: Server, marketData: any) {
  io.to('general').emit('market_data', marketData);
}

export function broadcastNotification(io: Server, userId: string, notification: NotificationData) {
  io.to(`user:${userId}`).emit('notification', notification);
}

export function getConnectedUsersCount(): number {
  return connectedUsers.size;
}

export function getConnectedUsers(): ConnectedUser[] {
  return Array.from(connectedUsers.values());
}

export function broadcastChatMessage(io: Server, chatMessage: ChatMessage) {
  io.to('general').emit('chat_message', chatMessage);
}

export function broadcastVolumeAlert(io: Server, volumeData: any) {
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

export function broadcastMarketSentiment(io: Server, sentimentData: any) {
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

export function broadcastTradingActivity(io: Server, activityData: any) {
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
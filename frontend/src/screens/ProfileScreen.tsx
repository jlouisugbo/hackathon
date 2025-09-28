import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import {
  Card,
  Title,
  Text,
  Button,
  Avatar,
  Chip,
  Surface,
  List,
  Divider,
  ActivityIndicator,
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';

import { usePortfolio } from '../context/PortfolioContext';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import { theme } from '../theme/theme';
import { formatCurrency, formatPercent, formatDate, formatRank } from '../utils/formatters';

// Get user data from auth context instead of hardcoded demo data

export default function ProfileScreen() {
  const { portfolio } = usePortfolio();
  const { notifications, userCount, isConnected } = useSocket();
  const { user, logout } = useAuth();
  const [userStats, setUserStats] = useState<any>(null);
  const [userRank, setUserRank] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserData();
  }, [user?.id]);

  const fetchUserData = async () => {
    try {
      if (!user?.id) {
        console.log('👤 User not loaded yet, skipping API calls');
        setLoading(false);
        return;
      }

      // Fetch user rank and stats
      const [rankResponse, statsResponse] = await Promise.all([
        apiService.getUserLeaderboardPosition(user.id).catch(err => {
          console.log('📊 Error fetching user rank:', err);
          return { success: false, error: err.message };
        }),
        apiService.getLeaderboardStats().catch(err => {
          console.log('📊 Error fetching leaderboard stats:', err);
          return { success: false, error: err.message };
        }),
      ]);

      if (rankResponse.success && 'data' in rankResponse && rankResponse.data) {
        setUserRank(rankResponse.data);
      } else {
        // User not in leaderboard yet - create default rank data
        console.log('📊 User not in leaderboard yet, using default rank');
        setUserRank({
          rank: 999,
          totalUsers: 12,
          portfolioValue: portfolio?.totalValue || 1000,
          todaysPL: portfolio?.todaysPL || 0,
          todaysPLPercent: portfolio?.todaysPL ? (portfolio.todaysPL / (portfolio.totalValue || 1000)) * 100 : 0,
          previousRank: 999,
          badges: []
        });
      }

      // Mock user stats for demo
      setUserStats({
        totalTrades: 47,
        winRate: 64.2,
        bestDay: 284.50,
        worstDay: -156.30,
        longestStreak: 8,
        totalProfit: portfolio ? portfolio.seasonPL + portfolio.livePL : 0,
        avgHoldTime: 3.2,
      });
    } catch (error) {
      console.error('Error fetching user data:', error);
      // Set default values on error
      setUserRank({
        rank: 999,
        totalUsers: 12,
        portfolioValue: portfolio?.totalValue || 1000,
        todaysPL: portfolio?.todaysPL || 0,
        todaysPLPercent: portfolio?.todaysPL ? (portfolio.todaysPL / (portfolio.totalValue || 1000)) * 100 : 0,
        previousRank: 999,
        badges: []
      });
    } finally {
      setLoading(false);
    }
  };

  const renderUserHeader = () => (
    <Card style={styles.headerCard} mode="elevated">
      <Card.Content style={styles.headerContent}>
        <View style={styles.userInfo}>
          <Avatar.Text
            size={64}
            label={user?.username?.substring(0, 2).toUpperCase() || 'U'}
            style={styles.avatar}
          />
          <View style={styles.userDetails}>
            <Title style={styles.username}>{user?.username || 'User'}</Title>
            <Text style={styles.email}>{user?.email || 'No email'}</Text>
            <Text style={styles.joinDate}>
              Member since {formatDate(new Date(user?.createdAt || Date.now()))}
            </Text>
          </View>
        </View>

        {userRank && (
          <View style={styles.rankInfo}>
            <Text style={styles.rankLabel}>Season Rank</Text>
            <Text style={styles.rankValue}>
              {userRank.rank === 999 ? 'New User' : formatRank(userRank.rank)}
            </Text>
            <Text style={styles.rankTotal}>
              {userRank.rank === 999 ? 'Start trading to rank!' : `of ${userRank.totalUsers}`}
            </Text>
          </View>
        )}
      </Card.Content>
    </Card>
  );

  const renderPortfolioSummary = () => {
    if (!portfolio) return null;

    const totalInvested = portfolio.seasonHoldings.reduce(
      (sum, holding) => sum + (holding.shares * holding.averagePrice),
      0
    ) + portfolio.liveHoldings.reduce(
      (sum, holding) => sum + (holding.shares * holding.averagePrice),
      0
    );

    const totalPL = portfolio.seasonPL + portfolio.livePL;
    const totalPLPercent = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0;

    return (
      <Card style={styles.summaryCard} mode="outlined">
        <Card.Content>
          <Title style={styles.cardTitle}>Portfolio Summary</Title>

          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Value</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(portfolio.totalValue)}
              </Text>
            </View>

            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Available Cash</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(portfolio.availableBalance)}
              </Text>
            </View>

            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total P&L</Text>
              <Text style={[
                styles.summaryValue,
                { color: totalPL >= 0 ? theme.colors.bullish : theme.colors.bearish }
              ]}>
                {totalPL >= 0 ? '+' : ''}{formatCurrency(totalPL)}
              </Text>
            </View>

            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Return %</Text>
              <Text style={[
                styles.summaryValue,
                { color: totalPLPercent >= 0 ? theme.colors.bullish : theme.colors.bearish }
              ]}>
                {totalPLPercent >= 0 ? '+' : ''}{formatPercent(totalPLPercent)}
              </Text>
            </View>
          </View>

          <Divider style={styles.divider} />

          <View style={styles.accountBreakdown}>
            <View style={styles.accountItem}>
              <Text style={styles.accountLabel}>Season Holdings</Text>
              <Text style={styles.accountValue}>
                {portfolio.seasonHoldings.length} positions
              </Text>
            </View>

            <View style={styles.accountItem}>
              <Text style={styles.accountLabel}>Live Holdings</Text>
              <Text style={styles.accountValue}>
                {portfolio.liveHoldings.length} positions
              </Text>
            </View>

            <View style={styles.accountItem}>
              <Text style={styles.accountLabel}>Live Trades Left</Text>
              <Chip
                style={styles.tradesChip}
                textStyle={{ fontWeight: 'bold' }}
              >
                <Text>{portfolio.tradesRemaining}</Text>
              </Chip>
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderTradingStats = () => {
    if (!userStats) return null;

    return (
      <Card style={styles.statsCard} mode="outlined">
        <Card.Content>
          <Title style={styles.cardTitle}>Trading Statistics</Title>

          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Ionicons name="swap-horizontal" size={20} color={theme.colors.primary} />
              <Text style={styles.statValue}>{userStats.totalTrades}</Text>
              <Text style={styles.statLabel}>Total Trades</Text>
            </View>

            <View style={styles.statItem}>
              <Ionicons name="trending-up" size={20} color={theme.colors.bullish} />
              <Text style={styles.statValue}>{formatPercent(userStats.winRate)}</Text>
              <Text style={styles.statLabel}>Win Rate</Text>
            </View>

            <View style={styles.statItem}>
              <Ionicons name="chevron-up" size={20} color={theme.colors.bullish} />
              <Text style={styles.statValue}>{formatCurrency(userStats.bestDay)}</Text>
              <Text style={styles.statLabel}>Best Day</Text>
            </View>

            <View style={styles.statItem}>
              <Ionicons name="chevron-down" size={20} color={theme.colors.bearish} />
              <Text style={styles.statValue}>{formatCurrency(userStats.worstDay)}</Text>
              <Text style={styles.statLabel}>Worst Day</Text>
            </View>

            <View style={styles.statItem}>
              <Ionicons name="flame" size={20} color={theme.colors.warning} />
              <Text style={styles.statValue}>{userStats.longestStreak}</Text>
              <Text style={styles.statLabel}>Best Streak</Text>
            </View>

            <View style={styles.statItem}>
              <Ionicons name="time" size={20} color={theme.colors.neutral} />
              <Text style={styles.statValue}>{userStats.avgHoldTime.toFixed(1)}d</Text>
              <Text style={styles.statLabel}>Avg Hold Time</Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderRecentNotifications = () => {
    const recentNotifications = notifications.slice(0, 5);

    if (recentNotifications.length === 0) {
      return null;
    }

    return (
      <Card style={styles.notificationsCard} mode="outlined">
        <Card.Content>
          <Title style={styles.cardTitle}>Recent Notifications</Title>

          {recentNotifications.map((notification, index) => (
            <View key={notification.id}>
              <List.Item
                title={notification.title}
                description={notification.message}
                left={(props) => (
                  <List.Icon
                    {...props}
                    icon={getNotificationIcon(notification.type)}
                    color={theme.colors.primary}
                  />
                )}
                right={(props) => (
                  <Text style={styles.notificationTime}>
                    {formatDate(notification.timestamp)}
                  </Text>
                )}
                style={styles.notificationItem}
              />
              {index < recentNotifications.length - 1 && <Divider />}
            </View>
          ))}

          <Button
            mode="outlined"
            style={styles.viewAllButton}
            onPress={() => Alert.alert('Coming Soon', 'Full notifications view coming soon!')}
          >
            View All Notifications
          </Button>
        </Card.Content>
      </Card>
    );
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'trade_executed':
        return 'swap-horizontal';
      case 'flash_multiplier':
        return 'flash';
      case 'rank_change':
        return 'trophy';
      case 'badge_earned':
        return 'medal';
      default:
        return 'bell';
    }
  };

  const renderAppInfo = () => (
    <Card style={styles.infoCard} mode="outlined">
      <Card.Content>
        <Title style={styles.cardTitle}>App Status</Title>

        <List.Item
          title="Connection Status"
          description={isConnected ? 'Connected to live feed' : 'Offline'}
          left={(props) => (
            <List.Icon
              {...props}
              icon={isConnected ? 'wifi' : 'wifi-off'}
              color={isConnected ? theme.colors.bullish : theme.colors.error}
            />
          )}
        />

        <List.Item
          title="Active Users"
          description={`${userCount} traders online`}
          left={(props) => (
            <List.Icon
              {...props}
              icon="account-group"
              color={theme.colors.primary}
            />
          )}
        />

        <Divider style={styles.divider} />

        <Button
          mode="outlined"
          onPress={() => Alert.alert('Settings', 'Settings screen coming soon!')}
          style={styles.settingsButton}
          icon="cog"
        >
          Settings
        </Button>

        <Button
          mode="text"
          onPress={() => Alert.alert('About', 'Player Stock Market v1.0\nBuilt for NBA trading simulation')}
          style={styles.aboutButton}
        >
          About App
        </Button>

        <Button
          mode="outlined"
          onPress={() => {
            Alert.alert(
              'Logout',
              'Are you sure you want to logout?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Logout', style: 'destructive', onPress: logout }
              ]
            );
          }}
          style={styles.logoutButton}
          labelStyle={styles.logoutButtonText}
        >
          Logout
        </Button>
      </Card.Content>
    </Card>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {renderUserHeader()}
      {renderPortfolioSummary()}
      {renderTradingStats()}
      {renderRecentNotifications()}
      {renderAppInfo()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: 16,
    color: theme.colors.onBackground,
  },
  headerCard: {
    margin: 16,
    marginBottom: 8,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  userInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  avatar: {
    marginRight: 16,
  },
  userDetails: {
    flex: 1,
  },
  username: {
    fontSize: 20,
    marginBottom: 4,
  },
  email: {
    color: theme.colors.onSurface + '80',
    marginBottom: 4,
  },
  joinDate: {
    fontSize: 12,
    color: theme.colors.onSurface + '60',
  },
  rankInfo: {
    alignItems: 'center',
  },
  rankLabel: {
    fontSize: 12,
    color: theme.colors.onSurface + '60',
    marginBottom: 4,
  },
  rankValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  rankTotal: {
    fontSize: 12,
    color: theme.colors.onSurface + '60',
  },
  summaryCard: {
    margin: 16,
    marginTop: 8,
  },
  cardTitle: {
    fontSize: 18,
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  summaryItem: {
    width: '48%',
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: 12,
    color: theme.colors.onSurface + '60',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    marginVertical: 16,
  },
  accountBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  accountItem: {
    alignItems: 'center',
  },
  accountLabel: {
    fontSize: 12,
    color: theme.colors.onSurface + '60',
    marginBottom: 4,
  },
  accountValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  tradesChip: {
    marginTop: 4,
  },
  statsCard: {
    margin: 16,
    marginTop: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '31%',
    alignItems: 'center',
    marginBottom: 20,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  statLabel: {
    fontSize: 11,
    color: theme.colors.onSurface + '60',
    textAlign: 'center',
  },
  notificationsCard: {
    margin: 16,
    marginTop: 8,
  },
  notificationItem: {
    paddingVertical: 8,
  },
  notificationTime: {
    fontSize: 12,
    color: theme.colors.onSurface + '60',
    alignSelf: 'center',
  },
  viewAllButton: {
    marginTop: 12,
  },
  infoCard: {
    margin: 16,
    marginTop: 8,
    marginBottom: 32,
  },
  settingsButton: {
    marginBottom: 8,
  },
  aboutButton: {
    marginTop: 4,
  },
  logoutButton: {
    marginTop: 16,
    borderColor: theme.colors.error,
  },
  logoutButtonText: {
    color: theme.colors.error,
  },
});
import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Dimensions,
} from 'react-native';
import {
  Card,
  Title,
  Text,
  Button,
  Chip,
  Surface,
  ActivityIndicator,
  Divider,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

// Components
import PriceChart from '../components/PriceChart';
import PortfolioChart from '../components/PortfolioChart';

// Contexts and utilities
import { usePortfolio } from '../context/PortfolioContext';
import { useSocket } from '../context/SocketContext';
import { useGame } from '../context/GameContext';
import { theme } from '../theme/theme';
import { formatCurrency, formatPercent, formatDate } from '../utils/formatters';
import { Holding, Trade } from '@player-stock-market/shared';

const { width } = Dimensions.get('window');

export default function PortfolioScreen() {
  const { portfolio, loading, error, refreshPortfolio, updatePortfolioValues } = usePortfolio();
  const { priceUpdates, isConnected, joinRoom } = useSocket();
  const { players, executeTrade } = useGame();

  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'season' | 'live'>('season');
  const [recentTrades, setRecentTrades] = useState<Trade[]>([]);

  useEffect(() => {
    if (isConnected) {
      joinRoom('user-1', 'DemoUser');
    }
  }, [isConnected]);

  // Update portfolio values with current player prices when component mounts or players change
  useEffect(() => {
    if (portfolio && players.length > 0) {
      console.log('🔄 Updating portfolio values with current player prices...');
      console.log('📊 Current portfolio holdings:', portfolio.seasonHoldings?.length || 0, 'season', portfolio.liveHoldings?.length || 0, 'live');
      updatePortfolioValues(players);
    }
  }, [portfolio, players, updatePortfolioValues]);

  // Force refresh when component mounts to ensure we have latest data
  // Portfolio loads automatically via PortfolioContext, no manual refresh needed

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshPortfolio();
    setRefreshing(false);
  };

  const handleSell = async (holding: Holding) => {
    try {
      console.log('📉 Selling holding:', holding);
      
      const tradeRequest = {
        playerId: holding.playerId,
        type: 'sell' as const,
        shares: holding.shares,
        orderType: 'market' as const,
        accountType: selectedTab as 'season' | 'live'
      };

      console.log('📉 Executing sell trade:', tradeRequest);
      const trade = await executeTrade(tradeRequest);
      
      console.log('✅ Sell trade executed successfully:', trade);
      
      // The portfolio will be automatically refreshed by the executeTrade function
      // which calls refreshPortfolio() after the trade
      
    } catch (error) {
      console.error('❌ Error selling holding:', error);
      // You could add a toast notification here
    }
  };

  const currentHoldings = selectedTab === 'season'
    ? portfolio?.seasonHoldings || []
    : portfolio?.liveHoldings || [];

  // Debug logging
  console.log('📊 PortfolioScreen render - selectedTab:', selectedTab, 'holdings:', currentHoldings.length);
  console.log('📊 Season holdings:', portfolio?.seasonHoldings?.length || 0);
  console.log('📊 Live holdings:', portfolio?.liveHoldings?.length || 0);
  console.log('📊 Current holdings data:', currentHoldings);
  console.log('📊 Portfolio data:', portfolio);

  const currentPL = selectedTab === 'season'
    ? portfolio?.seasonPL || 0
    : portfolio?.livePL || 0;

  const totalHoldingsValue = currentHoldings.reduce((sum, holding) => sum + holding.totalValue, 0);

  const generatePortfolioHistory = () => {
    const currentValue = portfolio?.totalValue || 10000;
    const days = 30;
    const labels = [];
    const values = [];

    for (let i = days - 1; i >= 0; i--) {
      if (i % 5 === 0 || i === 0) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        labels.push(i === 0 ? 'Now' : date.getDate().toString());

        const variance = (Math.random() - 0.5) * 0.12;
        const dayValue = currentValue * (1 - (i * 0.005) + variance);
        values.push(Math.round(dayValue / 1000));
      }
    }

    return { labels, values };
  };

  const portfolioHistory = generatePortfolioHistory();

  if (loading && !portfolio) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading portfolio...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle" size={48} color={theme.colors.error} />
        <Text style={styles.errorText}>Failed to load portfolio</Text>
        <Button mode="contained" onPress={refreshPortfolio} style={styles.retryButton}>
          Retry
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Portfolio Summary */}
        <View style={styles.summaryHeader}>
            <View style={styles.summaryContent}>
              <Text style={styles.summaryTitle}>Portfolio Performance</Text>
              <Text style={styles.totalValue}>
                {formatCurrency(portfolio?.totalValue || 0)}
              </Text>

              <View style={styles.metricsRow}>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>Today's P&L</Text>
                  <Text style={[
                    styles.metricValue,
                    { color: (portfolio?.todaysPL ?? 0) >= 0 ? theme.colors.bullish : theme.colors.bearish }
                  ]}>
                    {(portfolio?.todaysPL ?? 0) >= 0 ? '+' : ''}{formatCurrency(portfolio?.todaysPL || 0)}
                  </Text>
                </View>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>Available</Text>
                  <Text style={styles.metricValue}>
                    {formatCurrency(portfolio?.availableBalance || 0)}
                  </Text>
                </View>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>Total Equity</Text>
                  <Text style={styles.metricValue}>
                    {formatCurrency((portfolio?.totalValue || 0) + (portfolio?.availableBalance || 0))}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Portfolio Chart */}
          <Surface style={styles.chartCard}>
            <PortfolioChart
              data={portfolioHistory}
              title="30-Day Portfolio Value"
            />
          </Surface>

          {/* Account Type Toggle */}
          <View style={styles.tabSection}>
            <Surface style={styles.tabContainer}>
              <Button
                mode={selectedTab === 'season' ? 'contained' : 'text'}
                onPress={() => setSelectedTab('season')}
                style={[styles.tabButton, selectedTab === 'season' && styles.activeTab]}
                labelStyle={selectedTab === 'season' ? styles.activeTabText : styles.tabText}
              >
                Season Portfolio
              </Button>
              <Button
                mode={selectedTab === 'live' ? 'contained' : 'text'}
                onPress={() => setSelectedTab('live')}
                style={[styles.tabButton, selectedTab === 'live' && styles.activeTab]}
                labelStyle={selectedTab === 'live' ? styles.activeTabText : styles.tabText}
              >
                Live Trading
              </Button>
            </Surface>
          </View>

          {/* Portfolio Overview */}
          <View style={styles.overviewSection}>
            <Text style={styles.sectionTitle}>
              {selectedTab === 'season' ? '📊 Season Overview' : '⚡ Live Overview'}
            </Text>

            <View style={styles.overviewCards}>
              <Surface style={styles.overviewCard}>
                <Text style={styles.overviewCardLabel}>Holdings Value</Text>
                <Text style={styles.overviewCardValue}>
                  {formatCurrency(totalHoldingsValue)}
                </Text>
              </Surface>

              <Surface style={styles.overviewCard}>
                <Text style={styles.overviewCardLabel}>Unrealized P&L</Text>
                <Text style={[
                  styles.overviewCardValue,
                  { color: currentPL >= 0 ? theme.colors.bullish : theme.colors.bearish }
                ]}>
                  {currentPL >= 0 ? '+' : ''}{formatCurrency(currentPL)}
                </Text>
              </Surface>

              <Surface style={styles.overviewCard}>
                <Text style={styles.overviewCardLabel}>Holdings</Text>
                <Text style={styles.overviewCardValue}>
                  {currentHoldings.length}
                </Text>
              </Surface>
            </View>
          </View>

          {/* Holdings List */}
          <View style={styles.holdingsSection}>
            <Text style={styles.sectionTitle}>
              {selectedTab === 'season' ? '🏀 Season Holdings' : '⚡ Live Holdings'}
            </Text>

            {currentHoldings.length === 0 ? (
              <Surface style={styles.emptyCard}>
                <View style={styles.emptyContent}>
                  <Ionicons
                    name={selectedTab === 'season' ? 'wallet-outline' : 'flash-outline'}
                    size={48}
                    color={theme.colors.outline}
                  />
                  <Text style={styles.emptyTitle}>
                    No {selectedTab === 'season' ? 'Season' : 'Live'} Holdings
                  </Text>
                  <Text style={styles.emptySubtitle}>
                    {selectedTab === 'season'
                      ? 'Start building your season portfolio by trading NBA players'
                      : 'Make live trades during games to see holdings here'
                    }
                  </Text>
                  <Text style={styles.debugText}>
                    Debug: Portfolio loaded: {portfolio ? 'Yes' : 'No'}, 
                    Holdings: {currentHoldings.length}, 
                    Tab: {selectedTab}
                  </Text>
                </View>
              </Surface>
            ) : (
              currentHoldings.map((holding, index) => {
                const player = players.find(p => p.id === holding.playerId);
                const isPositive = holding.unrealizedPL >= 0;

                return (
                  <Surface key={`${selectedTab}-${holding.playerId}-${holding.shares}-${holding.purchaseDate}-${index}`} style={styles.holdingCard}>
                    <View style={styles.holdingContent}>
                      <View style={styles.holdingHeader}>
                        <View style={styles.holdingLeft}>
                          <Text style={styles.holdingPlayerName}>{holding.playerName}</Text>
                          <Text style={styles.holdingTeam}>{player?.team || 'N/A'}</Text>
                        </View>
                        <View style={styles.holdingRight}>
                          <Text style={styles.holdingCurrentPrice}>
                            {formatCurrency(holding.currentPrice)}
                          </Text>
                          <Chip
                            style={[
                              styles.plChip,
                              { backgroundColor: isPositive ? theme.colors.bullish + '20' : theme.colors.bearish + '20' }
                            ]}
                            textStyle={{
                              color: isPositive ? theme.colors.bullish : theme.colors.bearish,
                              fontWeight: '700'
                            }}
                            compact
                          >
                            {isPositive ? '+' : ''}{formatPercent(holding.unrealizedPLPercent)}
                          </Chip>
                        </View>
                      </View>

                      <Divider style={styles.holdingDivider} />

                      <View style={styles.holdingDetails}>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Shares:</Text>
                          <Text style={styles.detailValue}>{holding.shares}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Avg Price:</Text>
                          <Text style={styles.detailValue}>{formatCurrency(holding.averagePrice)}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Market Value:</Text>
                          <Text style={styles.detailValue}>{formatCurrency(holding.totalValue)}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>P&L:</Text>
                          <Text style={[
                            styles.detailValue,
                            { color: isPositive ? theme.colors.bullish : theme.colors.bearish }
                          ]}>
                            {isPositive ? '+' : ''}{formatCurrency(holding.unrealizedPL)}
                          </Text>
                        </View>
                      </View>

                      {/* Sell Button */}
                      <View style={styles.sellButtonContainer}>
                        <Button
                          mode="outlined"
                          onPress={() => handleSell(holding)}
                          style={[
                            styles.sellButton,
                            { borderColor: theme.colors.bearish }
                          ]}
                          labelStyle={{ color: theme.colors.bearish }}
                          icon="trending-down"
                        >
                          Sell All ({holding.shares} shares)
                        </Button>
                      </View>

                      {/* Mini Chart */}
                      {player?.priceHistory && (
                        <View style={styles.chartContainer}>
                          <PriceChart
                            data={player.priceHistory.slice(-7)} // Last 7 days
                            width={width - 64}
                            height={60}
                            isPositive={isPositive}
                            sparkline={true}
                          />
                        </View>
                      )}
                    </View>
                  </Surface>
                );
              })
            )}
          </View>

          {/* Performance Metrics */}
          {selectedTab === 'season' && (
            <View style={styles.performanceSection}>
              <Text style={styles.sectionTitle}>📈 Performance Metrics</Text>

              <View style={styles.performanceGrid}>
                <Surface style={styles.performanceCard}>
                  <Ionicons name="trending-up" size={24} color={theme.colors.bullish} />
                  <Text style={styles.performanceLabel}>Best Performer</Text>
                  <Text style={styles.performanceValue}>
                    {currentHoldings.length > 0
                      ? currentHoldings.reduce((best, holding) =>
                          holding.unrealizedPLPercent > best.unrealizedPLPercent ? holding : best
                        ).playerName
                      : 'N/A'
                    }
                  </Text>
                </Surface>

                <Surface style={styles.performanceCard}>
                  <Ionicons name="calendar" size={24} color={theme.colors.primary} />
                  <Text style={styles.performanceLabel}>Avg Hold Time</Text>
                  <Text style={styles.performanceValue}>
                    {currentHoldings.length > 0
                      ? Math.round(
                          currentHoldings.reduce((sum, holding) =>
                            sum + ((Date.now() - holding.purchaseDate) / (1000 * 60 * 60 * 24)), 0
                          ) / currentHoldings.length
                        ) + ' days'
                      : 'N/A'
                    }
                  </Text>
                </Surface>

                <Surface style={styles.performanceCard}>
                  <Ionicons name="bar-chart" size={24} color={theme.colors.secondary} />
                  <Text style={styles.performanceLabel}>Diversification</Text>
                  <Text style={styles.performanceValue}>
                    {currentHoldings.length} players
                  </Text>
                </Surface>
              </View>
            </View>
          )}

          {/* Live Trading Stats */}
          {selectedTab === 'live' && (
            <View style={styles.liveStatsSection}>
              <Text style={styles.sectionTitle}>⚡ Live Trading Stats</Text>

              <Surface style={styles.liveStatsCard}>
                <View style={styles.liveStatsContent}>
                  <View style={styles.liveStatItem}>
                    <Text style={styles.liveStatValue}>{portfolio?.tradesRemaining || 5}</Text>
                    <Text style={styles.liveStatLabel}>Trades Remaining</Text>
                  </View>
                  <View style={styles.liveStatItem}>
                    <Text style={[
                      styles.liveStatValue,
                      { color: (portfolio?.livePL ?? 0) >= 0 ? theme.colors.bullish : theme.colors.bearish }
                    ]}>
                      {formatCurrency(portfolio?.livePL || 0)}
                    </Text>
                    <Text style={styles.liveStatLabel}>Session P&L</Text>
                  </View>
                  <View style={styles.liveStatItem}>
                    <Text style={styles.liveStatValue}>
                      {currentHoldings.reduce((sum, holding) => sum + holding.shares, 0)}
                    </Text>
                    <Text style={styles.liveStatLabel}>Total Shares</Text>
                  </View>
                </View>
              </Surface>
            </View>
          )}
        </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingBottom: 100,
    alignItems: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    color: theme.colors.onBackground,
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    marginTop: 16,
    color: theme.colors.error,
    textAlign: 'center',
    fontSize: 16,
  },
  retryButton: {
    marginTop: 16,
  },
  chartCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 400,
  },
  summaryHeader: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 400,
  },
  summaryContent: {
    padding: 24,
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: 16,
    color: theme.colors.neutral,
    fontWeight: '600',
    marginBottom: 8,
  },
  totalValue: {
    fontSize: 36,
    fontWeight: '900',
    color: theme.colors.onSurface,
    marginBottom: 24,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  metric: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: theme.colors.neutral,
    marginBottom: 4,
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  tabSection: {
    marginHorizontal: 16,
    marginTop: 20,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 400,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.cardBg,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  tabButton: {
    flex: 1,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: theme.colors.primary,
  },
  tabText: {
    color: theme.colors.neutral,
    fontSize: 14,
    fontWeight: '600',
  },
  activeTabText: {
    color: theme.colors.onPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  overviewSection: {
    marginTop: 24,
    paddingHorizontal: 16,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 400,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: theme.colors.onSurface,
    marginBottom: 16,
  },
  overviewCards: {
    flexDirection: 'row',
    gap: 12,
  },
  overviewCard: {
    flex: 1,
    backgroundColor: theme.colors.cardBg,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  overviewCardLabel: {
    fontSize: 12,
    color: theme.colors.neutral,
    marginBottom: 8,
    fontWeight: '600',
  },
  overviewCardValue: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  holdingsSection: {
    marginTop: 24,
    paddingHorizontal: 16,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 400,
  },
  emptyCard: {
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  emptyContent: {
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.onSurface,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.colors.neutral,
    textAlign: 'center',
    lineHeight: 20,
  },
  holdingCard: {
    backgroundColor: theme.colors.cardBg,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  holdingContent: {
    padding: 20,
  },
  holdingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  holdingLeft: {
    flex: 1,
  },
  holdingPlayerName: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.onSurface,
    marginBottom: 4,
  },
  holdingTeam: {
    fontSize: 14,
    color: theme.colors.neutral,
    fontWeight: '600',
  },
  holdingRight: {
    alignItems: 'flex-end',
  },
  holdingCurrentPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.onSurface,
    marginBottom: 8,
  },
  plChip: {
    height: 24,
  },
  holdingDivider: {
    backgroundColor: theme.colors.outline,
    marginBottom: 16,
  },
  holdingDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: theme.colors.neutral,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  chartContainer: {
    marginTop: 8,
    alignItems: 'center',
  },
  performanceSection: {
    marginTop: 24,
    paddingHorizontal: 16,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 400,
  },
  performanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  performanceCard: {
    flex: 1,
    backgroundColor: theme.colors.cardBg,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    minWidth: '30%',
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  performanceLabel: {
    fontSize: 12,
    color: theme.colors.neutral,
    marginTop: 8,
    marginBottom: 4,
    fontWeight: '600',
  },
  performanceValue: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.onSurface,
    textAlign: 'center',
  },
  liveStatsSection: {
    marginTop: 24,
    paddingHorizontal: 16,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 400,
  },
  liveStatsCard: {
    backgroundColor: theme.colors.liveActive + '10',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.liveActive + '30',
  },
  liveStatsContent: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  liveStatItem: {
    alignItems: 'center',
  },
  liveStatValue: {
    fontSize: 24,
    fontWeight: '900',
    color: theme.colors.onSurface,
    marginBottom: 4,
  },
  liveStatLabel: {
    fontSize: 12,
    color: theme.colors.neutral,
    fontWeight: '600',
  },
  sellButtonContainer: {
    marginTop: 12,
    alignItems: 'center',
  },
  sellButton: {
    borderRadius: 8,
    borderWidth: 1.5,
  },
  debugText: {
    fontSize: 12,
    color: theme.colors.neutral,
    marginTop: 8,
    textAlign: 'center',
  },
});
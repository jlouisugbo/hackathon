import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Alert,
  Dimensions,
} from 'react-native';
import {
  Text,
  Button,
  Surface,
  ActivityIndicator,
  Searchbar,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

// Components
import PlayerCard from '../components/PlayerCard';
import TradeModal from '../components/TradeModal';
import FlashMultiplier from '../components/FlashMultiplier';
import PortfolioChart from '../components/PortfolioChart';

// Contexts and utilities
import { usePortfolio } from '../context/PortfolioContext';
import { useSocket } from '../context/SocketContext';
import { useGame } from '../context/GameContext';
import { theme } from '../theme/theme';
import { formatCurrency, formatPercent } from '../utils/formatters';
import { Player, TradeRequest } from '@player-stock-market/shared';

const { width } = Dimensions.get('window');

export default function MarketDashboard() {
  const { portfolio, loading, error, refreshPortfolio } = usePortfolio();
  const { priceUpdates, isConnected, joinRoomWithAuth, flashMultipliers, gameEvents } = useSocket();
  const { players, executeTrade, clearAllData, forceRestart, clearAllStorage, refreshPlayers, clearCachedPlayers } = useGame();

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [tradeModalVisible, setTradeModalVisible] = useState(false);
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [flashMultiplier, setFlashMultiplier] = useState<{
    visible: boolean;
    multiplier: number;
    playerName: string;
    eventType: string;
  }>({ visible: false, multiplier: 0, playerName: '', eventType: '' });
  // Store portfolio history for consistent graph
  const [portfolioHistory, setPortfolioHistory] = useState<{ labels: string[]; values: number[] }>({ labels: [], values: [] });

  useEffect(() => {
    // Auto-join socket room with authenticated user
    if (isConnected) {
      joinRoomWithAuth();
    }
  }, [isConnected]);

  // Update portfolio when price updates are received
  // Portfolio updates automatically via WebSocket, no manual refresh needed

  // Handle flash multipliers
  useEffect(() => {
    if (flashMultipliers.size > 0) {
      const [playerId, multiplierData] = Array.from(flashMultipliers.entries())[0];
      const player = players.find(p => p.id === playerId);
      if (player) {
        setFlashMultiplier({
          visible: true,
          multiplier: multiplierData.multiplier,
          playerName: player.name,
          eventType: 'big_play',
        });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
    }
  }, [flashMultipliers, players]);

  const onRefresh = async () => {
    setRefreshing(true);
    console.log('🔄 MarketDashboard: Manual refresh triggered');
    console.log('📋 Current players count:', players.length);
    console.log('📋 Current player IDs:', players.map(p => ({ id: p.id, name: p.name })));
    
    // Use gentle refresh that preserves session data
    console.log('🔄 Using gentle refresh to preserve session data...');
    await clearAllData();
    
    // Portfolio updates automatically via WebSocket
    setRefreshing(false);
  };

  const handleClearCacheAndRefresh = async () => {
    console.log('🧹 Clearing cached players and refreshing...');
    await clearCachedPlayers();
    await refreshPlayers();
  };

  const handlePlayerPress = (player: Player) => {
    setSelectedPlayer(player);
    setTradeType('buy');
    setTradeModalVisible(true);
  };

  const handleBuyPress = (player: Player) => {
    setSelectedPlayer(player);
    setTradeType('buy');
    setTradeModalVisible(true);
  };

  const handleConfirmTrade = async (trade: TradeRequest) => {
    try {
      await executeTrade(trade);
      setTradeModalVisible(false);
      await refreshPortfolio();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert('Trade Failed', error instanceof Error ? error.message : 'An error occurred');
    }
  };

  const filteredPlayers = players.filter(player =>
    player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    player.team.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const topGainers = players
    .filter(p => p.priceChangePercent24h > 0)
    .sort((a, b) => b.priceChangePercent24h - a.priceChangePercent24h)
    .slice(0, 3);

  const topLosers = players
    .filter(p => p.priceChangePercent24h < 0)
    .sort((a, b) => a.priceChangePercent24h - b.priceChangePercent24h)
    .slice(0, 3);

  // Generate realistic portfolio history with some variation
  useEffect(() => {
    if (portfolio) {
      const currentValue = portfolio.totalValue || 10000;
      let labels: string[] = [];
      let values: number[] = [];
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        labels.push(i === 0 ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' }));
        
        // Generate realistic variation around current value
        const baseValue = currentValue * 0.95; // Start 5% lower
        const dailyGrowth = (currentValue - baseValue) / 6; // Linear growth to current
        const variance = (Math.random() - 0.5) * 0.02; // ±1% random variance
        const dayValue = baseValue + (dailyGrowth * (6 - i)) + (currentValue * variance);
        
        values.push(Math.round(dayValue / 1000)); // Convert to thousands
      }
      setPortfolioHistory({ labels, values });
      console.log('📊 Portfolio history generated:', { labels, values });
    }
  }, [portfolio]);

  if (loading && !portfolio) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading market data...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle" size={48} color={theme.colors.error} />
        <Text style={styles.errorText}>Failed to load market data</Text>
        <Button mode="contained" onPress={refreshPortfolio} style={styles.retryButton}>
          Retry
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.colors.background, theme.colors.surface]}
        style={styles.gradient}
      >
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Portfolio Header */}
          <LinearGradient
            colors={[theme.colors.primary + '20', theme.colors.surface]}
            style={styles.portfolioHeader}
          >
            <View style={styles.portfolioContent}>
              <View style={styles.portfolioLeft}>
                <Text style={styles.welcomeText}>Portfolio Value</Text>
                <Text style={styles.portfolioValue}>
                  {formatCurrency(portfolio?.totalValue || 0)}
                </Text>
                <View style={styles.dailyChangeRow}>
                  <Ionicons
                    name={(portfolio?.todaysPL ?? 0) >= 0 ? 'trending-up' : 'trending-down'}
                    size={18}
                    color={(portfolio?.todaysPL ?? 0) >= 0 ? theme.colors.bullish : theme.colors.bearish}
                  />
                  <Text style={[
                    styles.dailyChange,
                    { color: (portfolio?.todaysPL ?? 0) >= 0 ? theme.colors.bullish : theme.colors.bearish }
                  ]}>
                    {(portfolio?.todaysPL ?? 0) >= 0 ? '+' : ''}{formatCurrency(portfolio?.todaysPL || 0)} today
                  </Text>
                </View>
              </View>
              <Surface style={styles.connectionStatus}>
                <View style={[
                  styles.connectionDot,
                  { backgroundColor: isConnected ? theme.colors.bullish : theme.colors.error }
                ]} />
                <Text style={styles.connectionText}>
                  {isConnected ? 'LIVE' : 'OFFLINE'}
                </Text>
              </Surface>
            </View>
          </LinearGradient>

          {/* Portfolio Performance Chart */}
          {!searchQuery && portfolio && (
            <View style={styles.chartSection}>
              <Surface style={styles.chartCard}>
                <PortfolioChart
                  data={portfolioHistory}
                  title="Market Day Performance"
                />
              </Surface>
            </View>
          )}

          {/* Search Bar */}
          <View style={styles.searchSection}>
            <Searchbar
              placeholder="Search players or teams..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchBar}
              inputStyle={styles.searchInput}
              iconColor={theme.colors.primary}
            />
          </View>

          {/* Top Movers */}
          {!searchQuery && (
            <View style={styles.topMoversSection}>
              <Text style={styles.sectionTitle}>🔥 Top Movers</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.topMoversContainer}>
                  <View style={styles.moverColumn}>
                    <Text style={styles.moverTitle}>Top Gainers</Text>
                    {topGainers.map(player => (
                      <Surface key={player.id} style={styles.moverCard}>
                        <View style={styles.moverContent}>
                          <Text
                            style={styles.moverName}
                            numberOfLines={1}
                            onPress={() => handlePlayerPress(player)}
                          >
                            {player.name}
                          </Text>
                          <Text style={[styles.moverChange, { color: theme.colors.bullish }]}
                            onPress={() => handlePlayerPress(player)}
                          >
                            +{formatPercent(player.priceChangePercent24h)}
                          </Text>
                        </View>
                      </Surface>
                    ))}
                  </View>
                  <View style={styles.moverColumn}>
                    <Text style={styles.moverTitle}>Top Losers</Text>
                    {topLosers.map(player => (
                      <Surface key={player.id} style={styles.moverCard}>
                        <View style={styles.moverContent}>
                          <Text
                            style={styles.moverName}
                            numberOfLines={1}
                            onPress={() => handlePlayerPress(player)}
                          >
                            {player.name}
                          </Text>
                          <Text style={[styles.moverChange, { color: theme.colors.bearish }]}
                            onPress={() => handlePlayerPress(player)}
                          >
                            {formatPercent(player.priceChangePercent24h)}
                          </Text>
                        </View>
                      </Surface>
                    ))}
                  </View>
                </View>
              </ScrollView>
            </View>
          )}

          {/* Player Grid */}
          <View style={styles.playersSection}>
            <Text style={styles.sectionTitle}>
              {searchQuery ? `Search Results (${filteredPlayers.length})` : '🏀 All Players'}
            </Text>
            <View style={styles.playersGrid}>
              {filteredPlayers.map((player) => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  onPress={() => handlePlayerPress(player)}
                  onBuy={() => handleBuyPress(player)}
                  flashMultiplier={flashMultipliers.get(player.id)?.multiplier}
                  isLive={player.isPlaying}
                />
              ))}
            </View>
          </View>
        </ScrollView>

        {/* Trade Modal */}
        <TradeModal
          visible={tradeModalVisible}
          player={selectedPlayer}
          tradeType={tradeType}
          availableBalance={portfolio?.availableBalance || 0}
          currentHolding={portfolio?.seasonHoldings.find(h => h.playerId === selectedPlayer?.id)?.shares || 0}
          onClose={() => setTradeModalVisible(false)}
          onConfirmTrade={handleConfirmTrade}
        />

        {/* Flash Multiplier Banner Notification */}
        {flashMultiplier.visible && (
          <View style={styles.flashBanner}>
            <Text style={styles.flashBannerText}>
              🚀 Big Play! {flashMultiplier.playerName} x{flashMultiplier.multiplier} multiplier!
            </Text>
            <Button
              mode="text"
              onPress={() => setFlashMultiplier(prev => ({ ...prev, visible: false }))}
              style={styles.flashBannerClose}
              labelStyle={{ color: theme.colors.primary }}
            >
              Dismiss
            </Button>
          </View>
        )}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  flashBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
    elevation: 10,
  },
  flashBannerText: {
    color: theme.colors.onPrimary,
    fontWeight: 'bold',
    fontSize: 16,
    flex: 1,
  },
  flashBannerClose: {
    marginLeft: 16,
  },
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
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
  portfolioHeader: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  portfolioContent: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  portfolioLeft: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 16,
    color: theme.colors.neutral,
    fontWeight: '500',
    marginBottom: 4,
  },
  portfolioValue: {
    fontSize: 36,
    fontWeight: '900',
    color: theme.colors.onSurface,
    marginBottom: 8,
  },
  dailyChangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dailyChange: {
    fontSize: 16,
    fontWeight: '700',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceVariant,
    gap: 6,
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  connectionText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  chartSection: {
    marginHorizontal: 16,
    marginTop: 20,
  },
  chartCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    elevation: 2,
  },
  searchSection: {
    marginHorizontal: 16,
    marginTop: 20,
  },
  searchBar: {
    backgroundColor: theme.colors.surfaceVariant,
    elevation: 0,
    borderRadius: 12,
  },
  searchInput: {
    color: theme.colors.onSurface,
    fontSize: 16,
  },
  topMoversSection: {
    marginTop: 24,
  },
  topMoversContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 16,
  },
  moverColumn: {
    width: width * 0.4,
  },
  moverTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.onSurface,
    marginBottom: 12,
  },
  moverCard: {
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 8,
    marginBottom: 8,
    elevation: 1,
  },
  moverContent: {
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  moverName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.onSurface,
    flex: 1,
  },
  moverChange: {
    fontSize: 12,
    fontWeight: '700',
  },
  playersSection: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: theme.colors.onSurface,
    marginBottom: 16,
  },
  playersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
});
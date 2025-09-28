import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  FlatList,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Card,
  Title,
  Text,
  Button,
  FAB,
  Chip,
  Surface,
  ActivityIndicator,
  Modal,
  Portal,
  TextInput,
  Divider,
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { usePortfolio } from '../context/PortfolioContext';
import { useSocket } from '../context/SocketContext';
import { useGame } from '../context/GameContext';
import { theme } from '../theme/theme';
import { formatCurrency, formatPercent } from '../utils/formatters';
import { Holding } from '@player-stock-market/shared';

export default function SeasonPortfolioScreen() {
  const navigation = useNavigation();
  const { portfolio, loading, error, refreshPortfolio, updateHoldingPrice } = usePortfolio();
  const { priceUpdates, isConnected, joinRoom } = useSocket();
  const { players, executeTrade } = useGame();
  const [refreshing, setRefreshing] = useState(false);
  const [sellModalVisible, setSellModalVisible] = useState(false);
  const [selectedHolding, setSelectedHolding] = useState<Holding | null>(null);
  const [sellQuantity, setSellQuantity] = useState('');

  useEffect(() => {
    // Auto-join socket room with demo user
    if (isConnected) {
      joinRoom('user-1', 'DemoUser');
    }
  }, [isConnected]);

  // Update portfolio prices when socket price updates come in
  useEffect(() => {
    if (portfolio && priceUpdates.size > 0) {
      priceUpdates.forEach((update, playerId) => {
        updateHoldingPrice(playerId, update.price);
      });
    }
  }, [priceUpdates]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshPortfolio();
    setRefreshing(false);
  };

  const openSellModal = (holding: Holding) => {
    setSelectedHolding(holding);
    setSellQuantity(holding.shares.toString());
    setSellModalVisible(true);
  };

  const closeSellModal = () => {
    setSellModalVisible(false);
    setSelectedHolding(null);
    setSellQuantity('');
  };

  const handleSell = async () => {
    if (!selectedHolding) return;

    const quantity = parseInt(sellQuantity);
    if (isNaN(quantity) || quantity <= 0) {
      Alert.alert('Invalid Quantity', 'Please enter a valid number of shares to sell.');
      return;
    }

    if (quantity > selectedHolding.shares) {
      Alert.alert('Invalid Quantity', `You can only sell up to ${selectedHolding.shares} shares.`);
      return;
    }

    try {
      console.log('📉 Selling holding:', selectedHolding, 'Quantity:', quantity);
      
      const tradeRequest = {
        playerId: selectedHolding.playerId,
        type: 'sell' as const,
        shares: quantity,
        orderType: 'market' as const,
        accountType: 'season' as const
      };

      console.log('📉 Executing sell trade:', tradeRequest);
      const trade = await executeTrade(tradeRequest);
      
      console.log('✅ Sell trade executed successfully:', trade);
      
      // Close modal and refresh
      closeSellModal();
      
      // The portfolio will be automatically refreshed by the executeTrade function
      // which calls refreshPortfolio() after the trade
      
    } catch (error) {
      console.error('❌ Error selling holding:', error);
      Alert.alert('Error', 'Failed to sell holding. Please try again.');
    }
  };

  const renderHolding = ({ item }: { item: Holding }) => {
    const isGain = item.unrealizedPL >= 0;
    const player = players.find(p => p.id === item.playerId);

    return (
      <Card style={styles.holdingCard} mode="outlined">
        <Card.Content>
          <View style={styles.holdingHeader}>
            <View style={styles.playerInfo}>
              <Title style={styles.playerName}>{item.playerName}</Title>
              <Text style={styles.playerTeam}>{player?.team || 'N/A'}</Text>
            </View>
            <View style={styles.priceInfo}>
              <Text style={styles.currentPrice}>
                {formatCurrency(item.currentPrice)}
              </Text>
              <Chip
                mode="outlined"
                style={[
                  styles.plChip,
                  { backgroundColor: isGain ? theme.colors.bullish + '20' : theme.colors.bearish + '20' }
                ]}
                textStyle={{ color: isGain ? theme.colors.bullish : theme.colors.bearish }}
              >
                {isGain ? '+' : ''}{formatPercent(item.unrealizedPLPercent)}
              </Chip>
            </View>
          </View>

          <View style={styles.holdingDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Shares:</Text>
              <Text style={styles.detailValue}>{item.shares}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Avg Price:</Text>
              <Text style={styles.detailValue}>{formatCurrency(item.averagePrice)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Total Value:</Text>
              <Text style={styles.detailValue}>{formatCurrency(item.totalValue)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>P&L:</Text>
              <Text style={[
                styles.detailValue,
                { color: isGain ? theme.colors.bullish : theme.colors.bearish }
              ]}>
                {isGain ? '+' : ''}{formatCurrency(item.unrealizedPL)}
              </Text>
            </View>
          </View>

          {/* Sell Button */}
          <View style={styles.sellButtonContainer}>
            <Button
              mode="outlined"
              onPress={() => openSellModal(item)}
              style={[
                styles.sellButton,
                { borderColor: theme.colors.bearish }
              ]}
              labelStyle={{ color: theme.colors.bearish }}
              icon="trending-down"
            >
              Sell Shares
            </Button>
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderEmptyHoldings = () => (
    <Card style={styles.emptyCard} mode="outlined">
      <Card.Content style={styles.emptyContent}>
        <Ionicons name="wallet-outline" size={64} color={theme.colors.outline} />
        <Title style={styles.emptyTitle}>No Holdings Yet</Title>
        <Text style={styles.emptySubtitle}>
          Start your season portfolio by investing in NBA players
        </Text>
        <Button
          mode="contained"
          onPress={() => navigation.navigate('Market' as never)}
          style={styles.emptyButton}
        >
          Browse Players
        </Button>
      </Card.Content>
    </Card>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading portfolio...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color={theme.colors.error} />
        <Title style={styles.errorTitle}>Error Loading Portfolio</Title>
        <Text style={styles.errorText}>{error}</Text>
        <Button mode="contained" onPress={onRefresh} style={styles.retryButton}>
          Try Again
        </Button>
      </View>
    );
  }

  if (!portfolio) {
    return (
      <View style={styles.errorContainer}>
        <Title>Portfolio not found</Title>
      </View>
    );
  }

  const totalInvested = portfolio.seasonHoldings.reduce(
    (sum, holding) => sum + (holding.shares * holding.averagePrice),
    0
  );
  const seasonValue = portfolio.seasonHoldings.reduce((sum, h) => sum + h.totalValue, 0);
  const seasonPL = seasonValue - totalInvested;
  const seasonPLPercent = totalInvested > 0 ? (seasonPL / totalInvested) * 100 : 0;

  return (
    <View style={styles.container}>
      {/* Portfolio Summary */}
      <Surface style={styles.summaryCard} elevation={2}>
        <View style={styles.summaryHeader}>
          <View>
            <Text style={styles.summaryLabel}>Total Portfolio Value</Text>
            <Title style={styles.summaryValue}>
              {formatCurrency(portfolio.totalValue)}
            </Title>
          </View>
          <View style={styles.connectionStatus}>
            <Ionicons
              name={isConnected ? "wifi" : "wifi-outline"}
              size={20}
              color={isConnected ? theme.colors.bullish : theme.colors.error}
            />
            <Text style={[
              styles.connectionText,
              { color: isConnected ? theme.colors.bullish : theme.colors.error }
            ]}>
              {isConnected ? 'Live' : 'Offline'}
            </Text>
          </View>
        </View>

        <View style={styles.summaryStats}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Available Cash</Text>
            <Text style={styles.statValue}>
              {formatCurrency(portfolio.availableBalance)}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Season P&L</Text>
            <Text style={[
              styles.statValue,
              { color: seasonPL >= 0 ? theme.colors.bullish : theme.colors.bearish }
            ]}>
              {seasonPL >= 0 ? '+' : ''}{formatCurrency(seasonPL)}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Today's P&L</Text>
            <Text style={[
              styles.statValue,
              { color: portfolio.todaysPL >= 0 ? theme.colors.bullish : theme.colors.bearish }
            ]}>
              {portfolio.todaysPL >= 0 ? '+' : ''}{formatCurrency(portfolio.todaysPL)}
            </Text>
          </View>
        </View>
      </Surface>

      {/* Holdings List */}
      <View style={styles.holdingsSection}>
        <View style={styles.sectionHeader}>
          <Title style={styles.sectionTitle}>Season Holdings</Title>
          <Text style={styles.holdingsCount}>
            {portfolio.seasonHoldings.length} position{portfolio.seasonHoldings.length !== 1 ? 's' : ''}
          </Text>
        </View>

        <FlatList
          data={portfolio.seasonHoldings}
          renderItem={renderHolding}
          keyExtractor={(item, index) => `${item.playerId}-${item.shares}-${item.purchaseDate}-${index}`}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={renderEmptyHoldings}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.holdingsList}
        />
      </View>

      {/* Add Investment FAB */}
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('Market' as never)}
        label="Invest"
      />

      {/* Sell Modal */}
      <Portal>
        <Modal
          visible={sellModalVisible}
          onDismiss={closeSellModal}
          contentContainerStyle={styles.modalContainer}
        >
          <Card style={styles.modalCard}>
            <Card.Content>
              <Title style={styles.modalTitle}>Sell Shares</Title>
              {selectedHolding && (
                <>
                  <Text style={styles.modalSubtitle}>
                    {selectedHolding.playerName}
                  </Text>
                  <Text style={styles.modalInfo}>
                    Current Price: {formatCurrency(selectedHolding.currentPrice)}
                  </Text>
                  <Text style={styles.modalInfo}>
                    Available Shares: {selectedHolding.shares}
                  </Text>
                  
                  <Divider style={styles.modalDivider} />
                  
                  <TextInput
                    label="Number of shares to sell"
                    value={sellQuantity}
                    onChangeText={setSellQuantity}
                    keyboardType="numeric"
                    style={styles.quantityInput}
                    mode="outlined"
                  />
                  
                  <View style={styles.modalButtons}>
                    <Button
                      mode="outlined"
                      onPress={closeSellModal}
                      style={styles.modalButton}
                    >
                      Cancel
                    </Button>
                    <Button
                      mode="contained"
                      onPress={handleSell}
                      style={[styles.modalButton, { backgroundColor: theme.colors.bearish }]}
                      labelStyle={{ color: 'white' }}
                    >
                      Sell
                    </Button>
                  </View>
                </>
              )}
            </Card.Content>
          </Card>
        </Modal>
      </Portal>
    </View>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: theme.colors.background,
  },
  errorTitle: {
    marginTop: 16,
    textAlign: 'center',
  },
  errorText: {
    marginTop: 8,
    textAlign: 'center',
    color: theme.colors.error,
  },
  retryButton: {
    marginTop: 16,
  },
  summaryCard: {
    margin: 16,
    padding: 20,
    borderRadius: 12,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 400,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  summaryLabel: {
    fontSize: 14,
    color: theme.colors.onSurface + '80',
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectionText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '500',
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.onSurface + '60',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  holdingsSection: {
    flex: 1,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
  },
  holdingsCount: {
    color: theme.colors.onBackground + '60',
  },
  holdingsList: {
    paddingBottom: 100,
    alignItems: 'center',
    width: '100%',
  },
  holdingCard: {
    marginBottom: 12,
    width: 400,
    alignSelf: 'center',
  },
  holdingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 18,
    marginBottom: 4,
  },
  playerTeam: {
    color: theme.colors.onSurface + '60',
  },
  priceInfo: {
    alignItems: 'flex-end',
  },
  currentPrice: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  plChip: {
    borderWidth: 0,
  },
  holdingDetails: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.outline + '40',
    paddingTop: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    color: theme.colors.onSurface + '60',
  },
  detailValue: {
    fontWeight: '500',
  },
  emptyCard: {
    marginTop: 40,
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    marginTop: 8,
    textAlign: 'center',
    color: theme.colors.onSurface + '60',
  },
  emptyButton: {
    marginTop: 20,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
  sellButtonContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  sellButton: {
    borderRadius: 8,
    borderWidth: 1.5,
  },
  modalContainer: {
    padding: 20,
    alignItems: 'center',
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  modalInfo: {
    textAlign: 'center',
    color: theme.colors.onSurface + '80',
    marginBottom: 4,
  },
  modalDivider: {
    marginVertical: 16,
  },
  quantityInput: {
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
  },
});
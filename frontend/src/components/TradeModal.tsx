import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  ScrollView,
} from 'react-native';
import {
  Modal,
  Portal,
  Text,
  Button,
  Surface,
  TextInput,
  Chip,
  Divider,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Player, TradeRequest } from '@player-stock-market/shared';
import { theme } from '../theme/theme';
import { formatCurrency, formatPercent } from '../utils/formatters';

interface TradeModalProps {
  visible: boolean;
  player: Player | null;
  tradeType: 'buy' | 'sell';
  availableBalance: number;
  currentHolding?: number;
  onClose: () => void;
  onConfirmTrade: (trade: TradeRequest) => void;
  isLive?: boolean;
  tradesRemaining?: number;
}

const { width, height } = Dimensions.get('window');

export default function TradeModal({
  visible,
  player,
  tradeType,
  availableBalance,
  currentHolding = 0,
  onClose,
  onConfirmTrade,
  isLive = false,
  tradesRemaining = 5,
}: TradeModalProps) {
  const [shares, setShares] = useState('1');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');

  if (!player) return null;

  const sharesNum = parseInt(shares) || 0;
  const totalValue = sharesNum * player.currentPrice;
  const canAfford = tradeType === 'buy' ? totalValue <= availableBalance : sharesNum <= currentHolding;
  const isValidTrade = sharesNum > 0 && canAfford;

  const handleConfirm = () => {
    if (!isValidTrade) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    const trade: TradeRequest = {
      playerId: player.id,
      type: tradeType,
      orderType,
      shares: sharesNum,
      accountType: isLive ? 'live' : 'season',
    };

    onConfirmTrade(trade);
    onClose();
    setShares('1');
  };

  const quickAmounts = tradeType === 'buy'
    ? [1, 5, 10, Math.floor(availableBalance / player.currentPrice)]
    : [1, Math.floor(currentHolding / 4), Math.floor(currentHolding / 2), currentHolding];

  const getValidQuickAmounts = () => {
    return quickAmounts.filter(amount => amount > 0 && amount <= (tradeType === 'buy' ? Math.floor(availableBalance / player.currentPrice) : currentHolding));
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onClose}
        contentContainerStyle={styles.modalContainer}
      >
        <View style={styles.modalContent}>
          <LinearGradient
            colors={[theme.colors.surface, theme.colors.surfaceVariant]}
            style={styles.gradient}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Text variant="headlineSmall" style={styles.title}>
                  {tradeType.toUpperCase()} {player.name}
                </Text>
                <Text variant="bodyMedium" style={styles.subtitle}>
                  {player.team} • {player.position}
                </Text>
              </View>
              <Button
                mode="text"
                onPress={onClose}
                contentStyle={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={theme.colors.onSurface} />
              </Button>
            </View>

            {/* Live Trading Header */}
            {isLive && (
              <Surface style={styles.liveHeader}>
                <View style={styles.liveIndicator}>
                  <View style={styles.liveDot} />
                  <Text variant="labelMedium" style={styles.liveText}>
                    LIVE TRADING
                  </Text>
                </View>
                <Text variant="bodySmall" style={styles.tradesRemaining}>
                  {tradesRemaining} trades remaining
                </Text>
              </Surface>
            )}

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Player Info & Price */}
              <Surface style={styles.priceSection}>
                <View style={styles.priceRow}>
                  <Text variant="titleLarge" style={styles.price}>
                    {formatCurrency(player.currentPrice)}
                  </Text>
                  <View style={[
                    styles.changeChip,
                    { backgroundColor: player.priceChangePercent24h >= 0 ? theme.colors.bullish + '20' : theme.colors.bearish + '20' }
                  ]}>
                    <Ionicons
                      name={player.priceChangePercent24h >= 0 ? 'trending-up' : 'trending-down'}
                      size={16}
                      color={player.priceChangePercent24h >= 0 ? theme.colors.bullish : theme.colors.bearish}
                    />
                    <Text style={[
                      styles.changeText,
                      { color: player.priceChangePercent24h >= 0 ? theme.colors.bullish : theme.colors.bearish }
                    ]}>
                      {formatPercent(player.priceChangePercent24h)}
                    </Text>
                  </View>
                </View>
              </Surface>

              {/* Order Type Selection */}
              <View style={styles.section}>
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  Order Type
                </Text>
                <View style={styles.orderTypeRow}>
                  <Chip
                    selected={orderType === 'market'}
                    onPress={() => setOrderType('market')}
                    style={[styles.orderTypeChip, orderType === 'market' && styles.selectedChip]}
                    textStyle={orderType === 'market' ? styles.selectedChipText : styles.chipText}
                  >
                    Market
                  </Chip>
                  <Chip
                    selected={orderType === 'limit'}
                    onPress={() => setOrderType('limit')}
                    style={[styles.orderTypeChip, orderType === 'limit' && styles.selectedChip]}
                    textStyle={orderType === 'limit' ? styles.selectedChipText : styles.chipText}
                    disabled={isLive} // Disable limit orders in live trading
                  >
                    Limit
                  </Chip>
                </View>
              </View>

              {/* Shares Input */}
              <View style={styles.section}>
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  Shares
                </Text>
                <TextInput
                  value={shares}
                  onChangeText={setShares}
                  keyboardType="numeric"
                  mode="outlined"
                  style={styles.sharesInput}
                  contentStyle={styles.sharesInputContent}
                  outlineStyle={styles.sharesInputOutline}
                />

                {/* Quick Amount Buttons */}
                <View style={styles.quickAmountsRow}>
                  {getValidQuickAmounts().map((amount) => (
                    <Chip
                      key={amount}
                      onPress={() => setShares(amount.toString())}
                      style={styles.quickAmountChip}
                      textStyle={styles.quickAmountText}
                      compact
                    >
                      {amount === Math.floor(availableBalance / player.currentPrice) && tradeType === 'buy' ? 'MAX' : amount}
                    </Chip>
                  ))}
                </View>
              </View>

              <Divider style={styles.divider} />

              {/* Order Summary */}
              <View style={styles.summarySection}>
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  Order Summary
                </Text>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Shares:</Text>
                  <Text style={styles.summaryValue}>{sharesNum}</Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Price per share:</Text>
                  <Text style={styles.summaryValue}>{formatCurrency(player.currentPrice)}</Text>
                </View>

                <View style={[styles.summaryRow, styles.totalRow]}>
                  <Text style={styles.totalLabel}>Total {tradeType === 'buy' ? 'Cost' : 'Value'}:</Text>
                  <Text style={[styles.totalValue, { color: tradeType === 'buy' ? theme.colors.bearish : theme.colors.bullish }]}>
                    {formatCurrency(totalValue)}
                  </Text>
                </View>

                {/* Available Balance */}
                <View style={styles.balanceRow}>
                  <Text style={styles.balanceLabel}>
                    {tradeType === 'buy' ? 'Available Balance' : 'Current Holding'}:
                  </Text>
                  <Text style={styles.balanceValue}>
                    {tradeType === 'buy' ? formatCurrency(availableBalance) : `${currentHolding} shares`}
                  </Text>
                </View>

                {/* Error Messages */}
                {!canAfford && sharesNum > 0 && (
                  <Text style={styles.errorText}>
                    {tradeType === 'buy'
                      ? 'Insufficient balance for this trade'
                      : 'You don\'t own enough shares'
                    }
                  </Text>
                )}
              </View>
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.actionRow}>
              <Button
                mode="outlined"
                onPress={onClose}
                style={styles.cancelButton}
                labelStyle={styles.cancelButtonText}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleConfirm}
                disabled={!isValidTrade}
                style={[
                  styles.confirmButton,
                  { backgroundColor: tradeType === 'buy' ? theme.colors.bullish : theme.colors.bearish }
                ]}
                labelStyle={styles.confirmButtonText}
              >
                {tradeType === 'buy' ? 'BUY' : 'SELL'} {sharesNum} shares
              </Button>
            </View>
          </LinearGradient>
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    maxHeight: height * 0.9,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  gradient: {
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    color: theme.colors.onSurface,
    fontWeight: '700',
  },
  subtitle: {
    color: theme.colors.neutral,
    marginTop: 4,
  },
  closeButton: {
    margin: 0,
    padding: 0,
  },
  liveHeader: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: theme.colors.liveActive + '10',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.liveActive,
  },
  liveText: {
    color: theme.colors.liveActive,
    fontWeight: '700',
  },
  tradesRemaining: {
    color: theme.colors.neutral,
  },
  priceSection: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceVariant,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    color: theme.colors.onSurface,
    fontWeight: '700',
  },
  changeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  changeText: {
    fontWeight: '600',
    fontSize: 14,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    color: theme.colors.onSurface,
    fontWeight: '600',
    marginBottom: 12,
  },
  orderTypeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  orderTypeChip: {
    backgroundColor: theme.colors.surfaceVariant,
  },
  selectedChip: {
    backgroundColor: theme.colors.primary,
  },
  chipText: {
    color: theme.colors.neutral,
  },
  selectedChipText: {
    color: theme.colors.onPrimary,
    fontWeight: '600',
  },
  sharesInput: {
    backgroundColor: theme.colors.surfaceVariant,
  },
  sharesInputContent: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  sharesInputOutline: {
    borderColor: theme.colors.outline,
  },
  quickAmountsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  quickAmountChip: {
    backgroundColor: theme.colors.primary + '20',
  },
  quickAmountText: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  divider: {
    marginHorizontal: 20,
    marginVertical: 8,
    backgroundColor: theme.colors.outline,
  },
  summarySection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    color: theme.colors.neutral,
    fontSize: 14,
  },
  summaryValue: {
    color: theme.colors.onSurface,
    fontSize: 14,
    fontWeight: '500',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.outline,
    marginTop: 8,
    paddingTop: 16,
  },
  totalLabel: {
    color: theme.colors.onSurface,
    fontSize: 16,
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.outline,
  },
  balanceLabel: {
    color: theme.colors.neutral,
    fontSize: 12,
  },
  balanceValue: {
    color: theme.colors.neutral,
    fontSize: 12,
    fontWeight: '500',
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    borderColor: theme.colors.outline,
  },
  cancelButtonText: {
    color: theme.colors.onSurface,
  },
  confirmButton: {
    flex: 2,
  },
  confirmButtonText: {
    color: theme.colors.onPrimary,
    fontWeight: '700',
  },
});
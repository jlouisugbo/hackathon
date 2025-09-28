import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Image,
} from 'react-native';
import {
  Text,
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Player } from '@player-stock-market/shared';
import { theme } from '../theme/theme';
import { formatCurrency, formatPercent } from '../utils/formatters';

interface PlayerCardProps {
  player: Player;
  onBuy?: () => void;
  onPress?: () => void;
  flashMultiplier?: number;
  isLive?: boolean;
  compact?: boolean;
}

const { width } = Dimensions.get('window');
const cardWidth = (width - 64) / 2; // Account for FlatList padding and spacing

export default function PlayerCard({
  player,
  onBuy,
  onPress,
  flashMultiplier,
  isLive = false,
  compact = false,
}: PlayerCardProps) {
  const isPositive = player.priceChangePercent24h >= 0;
  const changeColor = isPositive ? theme.colors.priceUp : theme.colors.priceDown;
  const changeIcon = isPositive ? 'trending-up' : 'trending-down';

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  const handleBuy = (e: any) => {
    e.stopPropagation();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onBuy?.();
  };

  const getMultiplierColor = (multiplier: number) => {
    if (multiplier >= 5) return theme.colors.multiplier5x;
    if (multiplier >= 3) return theme.colors.multiplier3x;
    return theme.colors.multiplier2x;
  };

  // Generate initials for player avatar
  const getPlayerInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <TouchableOpacity
      style={[styles.container, { width: cardWidth }]}
      onPress={handlePress}
      activeOpacity={0.9}
    >
      <View style={[
        styles.card,
        compact && styles.compactCard,
        flashMultiplier && { borderColor: getMultiplierColor(flashMultiplier), borderWidth: 2 }
      ]}>

        {/* Header with Live indicator */}
        {isLive && (
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        )}

        {/* Flash multiplier badge */}
        {flashMultiplier && (
          <View style={[styles.multiplierBadge, { backgroundColor: getMultiplierColor(flashMultiplier) }]}>
            <Text style={styles.multiplierText}>{flashMultiplier}x</Text>
          </View>
        )}

        {/* Player Avatar */}
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getPlayerInitials(player.name)}</Text>
          </View>
        </View>

        {/* Player Info */}
        <View style={styles.playerInfo}>
          <Text style={styles.playerName} numberOfLines={1}>
            {player.name.split(' ').slice(-1)[0]} {/* Last name only for space */}
          </Text>
          <Text style={styles.team}>{player.team}</Text>
          <Text style={styles.position}>{player.position}</Text>
        </View>

        {/* Price Section */}
        <View style={styles.priceSection}>
          <Text style={styles.price}>
            {formatCurrency(player.currentPrice)}
          </Text>

          <View style={styles.changeContainer}>
            <Ionicons name={changeIcon} size={12} color={changeColor} />
            <Text style={[styles.changeText, { color: changeColor }]}>
              {formatPercent(Math.abs(player.priceChangePercent24h))}
            </Text>
          </View>
        </View>

        {/* Action Buttons - PrizePicks style */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.buyButton]}
            onPress={handleBuy}
          >
            <Text style={styles.buyButtonText}>BUY</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Row (compact) */}
        {!compact && (
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{player.stats.ppg}</Text>
              <Text style={styles.statLabel}>PPG</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatPercent(player.stats.fg)}</Text>
              <Text style={styles.statLabel}>FG%</Text>
            </View>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  card: {
    backgroundColor: theme.colors.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    padding: 12,
    minHeight: 180,
    position: 'relative',
  },
  compactCard: {
    minHeight: 160,
  },

  // Live indicator
  liveIndicator: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.liveActive,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    zIndex: 1,
  },
  liveDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
    marginRight: 4,
  },
  liveText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },

  // Flash multiplier
  multiplierBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    zIndex: 1,
  },
  multiplierText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },

  // Player avatar
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  // Player info
  playerInfo: {
    alignItems: 'center',
    marginBottom: 12,
  },
  playerName: {
    color: theme.colors.onSurface,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 2,
  },
  team: {
    color: theme.colors.neutral,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 1,
  },
  position: {
    color: theme.colors.primary,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },

  // Price section
  priceSection: {
    alignItems: 'center',
    marginBottom: 12,
  },
  price: {
    color: theme.colors.onSurface,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 4,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  changeText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Action buttons - PrizePicks style
  actionRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  buyButton: {
    backgroundColor: theme.colors.buyButton,
  },
  buyButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.cardBorder,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    color: theme.colors.onSurface,
    fontSize: 12,
    fontWeight: '700',
  },
  statLabel: {
    color: theme.colors.neutral,
    fontSize: 10,
    fontWeight: '500',
    marginTop: 1,
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: theme.colors.cardBorder,
    marginHorizontal: 8,
  },
});
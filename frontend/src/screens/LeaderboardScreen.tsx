import React, { useEffect, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import {
  Card,
  Title,
  Text,
  Chip,
  Surface,
  ActivityIndicator,
  SegmentedButtons,
  Avatar,
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';

import { useSocket } from '../context/SocketContext';
import { apiService } from '../services/api';
import { theme } from '../theme/theme';
import { formatCurrency, formatPercent, formatRank } from '../utils/formatters';
import { LeaderboardEntry } from '../../../../shared/src/types';

type LeaderboardType = 'season' | 'live' | 'daily';

export default function LeaderboardScreen() {
  const { subscribeToLeaderboard, isConnected } = useSocket();
  const [leaderboardType, setLeaderboardType] = useState<LeaderboardType>('season');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaderboard();
    if (isConnected) {
      subscribeToLeaderboard(leaderboardType);
    }
  }, [leaderboardType, isConnected]);

  const fetchLeaderboard = async () => {
    try {
      setError(null);
      let response;

      switch (leaderboardType) {
        case 'season':
          response = await apiService.getSeasonLeaderboard({ limit: 50 });
          break;
        case 'live':
          response = await apiService.getLiveLeaderboard(20);
          break;
        case 'daily':
          response = await apiService.getDailyLeaderboard(20);
          break;
      }

      if (response.success && response.data) {
        setLeaderboard(Array.isArray(response.data) ? response.data : response.data);
      } else {
        setError(response.error || 'Failed to fetch leaderboard');
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLeaderboard();
    setRefreshing(false);
  };

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return { backgroundColor: '#FFD700', color: '#000' }; // Gold
      case 2:
        return { backgroundColor: '#C0C0C0', color: '#000' }; // Silver
      case 3:
        return { backgroundColor: '#CD7F32', color: '#fff' }; // Bronze
      default:
        return { backgroundColor: theme.colors.surface, color: theme.colors.onSurface };
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return 'trophy';
      case 2:
        return 'medal';
      case 3:
        return 'medal-outline';
      default:
        return null;
    }
  };

  const renderLeaderboardEntry = ({ item, index }: { item: LeaderboardEntry; index: number }) => {
    const isGain = item.todaysPL >= 0;
    const rankStyle = getRankStyle(item.rank);
    const rankIcon = getRankIcon(item.rank);

    return (
      <Card style={styles.entryCard} mode="outlined">
        <Card.Content style={styles.entryContent}>
          <View style={styles.rankSection}>
            <Surface
              style={[styles.rankBadge, { backgroundColor: rankStyle.backgroundColor }]}
              elevation={2}
            >
              {rankIcon ? (
                <Ionicons name={rankIcon} size={16} color={rankStyle.color} />
              ) : (
                <Text style={[styles.rankText, { color: rankStyle.color }]}>
                  {item.rank}
                </Text>
              )}
            </Surface>

            {item.previousRank && item.previousRank !== item.rank && (
              <View style={styles.rankChange}>
                <Ionicons
                  name={item.rank < item.previousRank ? "arrow-up" : "arrow-down"}
                  size={12}
                  color={item.rank < item.previousRank ? theme.colors.bullish : theme.colors.bearish}
                />
                <Text style={[
                  styles.rankChangeText,
                  { color: item.rank < item.previousRank ? theme.colors.bullish : theme.colors.bearish }
                ]}>
                  {Math.abs(item.rank - item.previousRank)}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.userSection}>
            <Avatar.Text
              size={40}
              label={item.username.substring(0, 2).toUpperCase()}
              style={styles.avatar}
            />
            <View style={styles.userInfo}>
              <Text style={styles.username}>{item.username}</Text>
              {item.badges && item.badges.length > 0 && (
                <View style={styles.badges}>
                  {item.badges.slice(0, 2).map((badge, badgeIndex) => (
                    <Chip
                      key={`${item.userId}-badge-${badgeIndex}`}
                      style={styles.badge}
                      textStyle={styles.badgeText}
                    >
                      <Text>{badge.name}</Text>
                    </Chip>
                  ))}
                </View>
              )}
            </View>
          </View>

          <View style={styles.statsSection}>
            <View style={styles.statColumn}>
              <Text style={styles.statLabel}>Portfolio</Text>
              <Text style={styles.statValue}>
                {formatCurrency(item.portfolioValue)}
              </Text>
            </View>

            <View style={styles.statColumn}>
              <Text style={styles.statLabel}>
                {leaderboardType === 'daily' ? "Today's P&L" : "P&L"}
              </Text>
              <Text style={[
                styles.statValue,
                { color: isGain ? theme.colors.bullish : theme.colors.bearish }
              ]}>
                {isGain ? '+' : ''}{formatCurrency(item.todaysPL)}
              </Text>
              <Text style={[
                styles.statPercent,
                { color: isGain ? theme.colors.bullish : theme.colors.bearish }
              ]}>
                {isGain ? '+' : ''}{formatPercent(item.todaysPLPercent)}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Title style={styles.headerTitle}>Leaderboard</Title>

      <SegmentedButtons
        value={leaderboardType}
        onValueChange={(value) => setLeaderboardType(value as LeaderboardType)}
        buttons={[
          {
            value: 'season',
            label: 'Season',
          },
          {
            value: 'live',
            label: 'Live',
          },
          {
            value: 'daily',
            label: 'Daily',
          },
        ]}
        style={styles.segmentedButtons}
      />

      <View style={styles.connectionStatus}>
        <Ionicons
          name={isConnected ? "wifi" : "wifi-outline"}
          size={16}
          color={isConnected ? theme.colors.bullish : theme.colors.error}
        />
        <Text style={[
          styles.connectionText,
          { color: isConnected ? theme.colors.bullish : theme.colors.error }
        ]}>
          {isConnected ? 'Live Updates' : 'Offline'}
        </Text>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <Card style={styles.emptyCard} mode="outlined">
      <Card.Content style={styles.emptyContent}>
        <Ionicons name="trophy-outline" size={64} color={theme.colors.outline} />
        <Title style={styles.emptyTitle}>No Rankings Available</Title>
        <Text style={styles.emptyText}>
          {leaderboardType === 'live'
            ? 'No active live traders at the moment'
            : 'Rankings will appear here'
          }
        </Text>
      </Card.Content>
    </Card>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading leaderboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}

      <FlatList
        data={leaderboard}
        renderItem={renderLeaderboardEntry}
        keyExtractor={(item, index) => `${leaderboardType}-${item.userId}-${index}`}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
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
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    marginBottom: 16,
  },
  segmentedButtons: {
    marginBottom: 12,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectionText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    alignItems: 'center',
  },
  entryCard: {
    marginBottom: 12,
    backgroundColor: theme.colors.cardBg,
    borderColor: theme.colors.cardBorder,
    width: 400,
    alignSelf: 'center',
  },
  entryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
    justifyContent: 'space-between',
  },
  rankSection: {
    alignItems: 'center',
    marginRight: 12,
    width: 50,
    flexShrink: 0,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  rankChange: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  rankChangeText: {
    fontSize: 10,
    marginLeft: 2,
  },
  userSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  avatar: {
    marginRight: 10,
    backgroundColor: theme.colors.primary,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
    color: theme.colors.onSurface,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  badge: {
    marginRight: 4,
    marginBottom: 2,
    height: 20,
  },
  badgeText: {
    fontSize: 10,
  },
  statsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    minWidth: 120,
    flexShrink: 0,
  },
  statColumn: {
    alignItems: 'flex-end',
    marginLeft: 8,
    minWidth: 70,
  },
  statLabel: {
    fontSize: 11,
    color: theme.colors.neutral,
    marginBottom: 2,
    textAlign: 'right',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  statPercent: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyCard: {
    marginTop: 40,
    backgroundColor: theme.colors.cardBg,
    borderColor: theme.colors.cardBorder,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    marginTop: 16,
    textAlign: 'center',
  },
  emptyText: {
    marginTop: 8,
    textAlign: 'center',
    color: theme.colors.onSurface + '60',
  },
});
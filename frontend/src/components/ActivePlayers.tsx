import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { getActivePlayers } from '../services/api';

interface ActivePlayer {
  id: string;
  playerId: number;
  name: string;
  team: string;
  position: string;
  jersey: number;
  started: boolean;
  played: boolean;
  minutes: number;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fantasyPoints: number;
  plusMinus: number;
  fieldGoalsMade: number;
  fieldGoalsAttempted: number;
  threePointersMade: number;
  threePointersAttempted: number;
  freeThrowsMade: number;
  freeThrowsAttempted: number;
  personalFouls: number;
}

interface ActivePlayersProps {
  gameId: string;
}

export const ActivePlayers: React.FC<ActivePlayersProps> = ({ gameId }) => {
  const [players, setPlayers] = useState<ActivePlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'minutes' | 'points' | 'fantasy'>('minutes');

  // Fetch active players
  const fetchPlayers = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const activePlayers = await getActivePlayers();
      setPlayers(activePlayers);
      setError(null);
    } catch (err) {
      console.error('Error fetching active players:', err);
      setError('Failed to load active players data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchPlayers();
  }, [gameId]);

  // Auto-refresh every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => fetchPlayers(true), 5000);
    return () => clearInterval(interval);
  }, [gameId]);

  // Sort players based on selected criteria
  const sortedPlayers = [...players].sort((a, b) => {
    switch (sortBy) {
      case 'points':
        return b.points - a.points;
      case 'fantasy':
        return b.fantasyPoints - a.fantasyPoints;
      case 'minutes':
      default:
        return b.minutes - a.minutes;
    }
  });

  // Group players by team
  const teamGroups = sortedPlayers.reduce((acc, player) => {
    if (!acc[player.team]) {
      acc[player.team] = [];
    }
    acc[player.team].push(player);
    return acc;
  }, {} as Record<string, ActivePlayer[]>);

  const renderPlayer = (player: ActivePlayer) => (
    <View key={player.id} style={styles.playerCard}>
      <View style={styles.playerHeader}>
        <View style={styles.playerInfo}>
          <Text style={styles.playerName}>
            #{player.jersey} {player.name}
          </Text>
          <Text style={styles.playerPosition}>{player.position}</Text>
        </View>
        <View style={styles.playerStats}>
          <Text style={styles.statValue}>{player.points}</Text>
          <Text style={styles.statLabel}>PTS</Text>
        </View>
      </View>
      
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{player.rebounds}</Text>
          <Text style={styles.statLabel}>REB</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{player.assists}</Text>
          <Text style={styles.statLabel}>AST</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{player.steals}</Text>
          <Text style={styles.statLabel}>STL</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{player.blocks}</Text>
          <Text style={styles.statLabel}>BLK</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{player.turnovers}</Text>
          <Text style={styles.statLabel}>TO</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, player.plusMinus >= 0 ? styles.positive : styles.negative]}>
            {player.plusMinus >= 0 ? '+' : ''}{player.plusMinus}
          </Text>
          <Text style={styles.statLabel}>+/-</Text>
        </View>
      </View>
      
      <View style={styles.playerFooter}>
        <Text style={styles.minutesText}>{player.minutes} min</Text>
        <Text style={styles.fantasyText}>{player.fantasyPoints.toFixed(1)} FP</Text>
        {player.started && <Text style={styles.starterBadge}>STARTER</Text>}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Active Players</Text>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading players...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Active Players</Text>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Active Players</Text>
        {refreshing && (
          <Text style={styles.refreshingText}>🔄 Updating...</Text>
        )}
      </View>
      
      <View style={styles.sortContainer}>
        <Text style={styles.sortLabel}>Sort by:</Text>
        <View style={styles.sortButtons}>
          <TouchableOpacity
            style={[styles.sortButton, sortBy === 'minutes' && styles.sortButtonActive]}
            onPress={() => setSortBy('minutes')}
          >
            <Text style={[styles.sortButtonText, sortBy === 'minutes' && styles.sortButtonTextActive]}>
              Minutes
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortButton, sortBy === 'points' && styles.sortButtonActive]}
            onPress={() => setSortBy('points')}
          >
            <Text style={[styles.sortButtonText, sortBy === 'points' && styles.sortButtonTextActive]}>
              Points
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortButton, sortBy === 'fantasy' && styles.sortButtonActive]}
            onPress={() => setSortBy('fantasy')}
          >
            <Text style={[styles.sortButtonText, sortBy === 'fantasy' && styles.sortButtonTextActive]}>
              Fantasy
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {Object.entries(teamGroups).map(([team, teamPlayers]) => (
          <View key={team} style={styles.teamSection}>
            <Text style={styles.teamTitle}>{team}</Text>
            {teamPlayers.map(renderPlayer)}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  refreshingText: {
    fontSize: 12,
    color: '#8B5CF6',
    fontStyle: 'italic',
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sortLabel: {
    fontSize: 16,
    color: '#ffffff',
    marginRight: 12,
  },
  sortButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  sortButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#333333',
  },
  sortButtonActive: {
    backgroundColor: '#8B5CF6',
  },
  sortButtonText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '500',
  },
  sortButtonTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  teamSection: {
    marginBottom: 24,
  },
  teamTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B5CF6',
    marginBottom: 12,
    textAlign: 'center',
  },
  playerCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  playerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  playerPosition: {
    fontSize: 14,
    color: '#888888',
  },
  playerStats: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8B5CF6',
  },
  statLabel: {
    fontSize: 12,
    color: '#888888',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
    width: '16%',
    marginBottom: 8,
  },
  positive: {
    color: '#4ade80',
  },
  negative: {
    color: '#f87171',
  },
  playerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  minutesText: {
    fontSize: 14,
    color: '#888888',
  },
  fantasyText: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: 'bold',
  },
  starterBadge: {
    fontSize: 10,
    color: '#8B5CF6',
    fontWeight: 'bold',
    backgroundColor: '#8B5CF620',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#888888',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#f87171',
    textAlign: 'center',
  },
});

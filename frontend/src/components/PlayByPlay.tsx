import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { getPlayByPlay } from '../services/api';
import { useGame } from '../context/GameContext';

interface Play {
  PlayID: number;
  QuarterName?: string;
  Quarter?: number;
  TimeRemainingMinutes?: number;
  TimeRemainingSeconds?: number;
  TimeRemaining?: string;
  AwayTeamScore?: number;
  HomeTeamScore?: number;
  Description?: string;
  Category?: string;
  Type?: string;
  Team?: string;
  PlayerID?: number;
  ShotMade?: boolean;
}

interface PlayByPlayProps {
  gameId: string;
}

export const PlayByPlay: React.FC<PlayByPlayProps> = ({ gameId }) => {
  const { currentGame } = useGame();
  const [plays, setPlays] = useState<Play[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  // Fetch plays when component mounts
  useEffect(() => {
    const fetchPlays = async () => {
      try {
        setLoading(true);
        const playData = await getPlayByPlay(gameId);
        setPlays(playData);
        setError(null);
      } catch (err) {
        console.error('Error fetching play-by-play:', err);
        setError('Failed to load play-by-play data');
      } finally {
        setLoading(false);
      }
    };

    if (gameId) {
      fetchPlays();
    }
  }, [gameId]);

  // Refresh plays when game data changes (synced with game updates)
  useEffect(() => {
    const refreshPlays = async () => {
      if (!gameId || !currentGame) return;
      
      try {
        setRefreshing(true);
        const playData = await getPlayByPlay(gameId);
        setPlays(playData);
        setError(null);
      } catch (err) {
        console.error('Error refreshing play-by-play:', err);
        setError('Failed to refresh play-by-play data');
      } finally {
        setRefreshing(false);
      }
    };

    // Refresh plays whenever the game data changes
    if (currentGame && currentGame.id === gameId) {
      refreshPlays();
    }
  }, [currentGame, gameId]);

  const filteredPlays = plays.filter(play => {
    if (filter === 'all') return true;
    if (filter === 'scores') return play.Category === 'Shot' && play.ShotMade;
    if (filter === 'assists') return play.Type === 'Assist';
    if (filter === 'turnovers') return play.Category === 'Turnover';
    return true;
  });

  const formatTime = (minutes: number | undefined, seconds: number | undefined) => {
    const mins = minutes || 0;
    const secs = seconds || 0;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getPlayIcon = (category: string, type: string) => {
    if (category === 'Shot') {
      return type.includes('Made') ? '🏀' : '❌';
    }
    if (category === 'Turnover') return '🔄';
    if (category === 'Rebound') return '📦';
    if (category === 'Foul') return '⚠️';
    if (type === 'Assist') return '🎯';
    return '📝';
  };

  const getPlayColor = (category: string, type: string) => {
    if (category === 'Shot' && type.includes('Made')) return '#4CAF50';
    if (category === 'Shot' && !type.includes('Made')) return '#F44336';
    if (category === 'Turnover') return '#FF9800';
    if (category === 'Foul') return '#9C27B0';
    return '#2196F3';
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Play-by-Play</Text>
        <Text style={styles.loading}>Loading plays...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Play-by-Play</Text>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.titleContainer}>
        <Text style={styles.title}>Play-by-Play</Text>
        {refreshing && (
          <Text style={styles.refreshingText}>🔄 Updating...</Text>
        )}
      </View>
      
      {/* Filter buttons */}
      <View style={styles.filterContainer}>
        {['all', 'scores', 'assists', 'turnovers'].map((filterType) => (
          <TouchableOpacity
            key={filterType}
            style={[
              styles.filterButton,
              filter === filterType && styles.activeFilter
            ]}
            onPress={() => setFilter(filterType)}
          >
            <Text style={[
              styles.filterText,
              filter === filterType && styles.activeFilterText
            ]}>
              {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {filteredPlays.map((play, index) => (
          <View key={`${play.PlayID}-${index}`} style={styles.playItem}>
            <View style={styles.playHeader}>
              <Text style={styles.timeText}>
                {play.TimeRemaining || formatTime(play.TimeRemainingMinutes, play.TimeRemainingSeconds)}
              </Text>
              <Text style={styles.quarterText}>Q{play.QuarterName || play.Quarter || '1'}</Text>
              <Text style={styles.scoreText}>
                {play.AwayTeamScore || 0} - {play.HomeTeamScore || 0}
              </Text>
            </View>
            
            <View style={styles.playContent}>
              <Text style={styles.playIcon}>
                {getPlayIcon(play.Category || '', play.Type || '')}
              </Text>
              <View style={styles.playDetails}>
                <Text style={[
                  styles.playDescription,
                  { color: getPlayColor(play.Category || '', play.Type || '') }
                ]}>
                  {play.Description || 'No description available'}
                </Text>
                <Text style={styles.playMeta}>
                  {play.Team || 'Unknown'} • {play.Category || 'Play'} • {play.Type || 'Action'}
                </Text>
              </View>
            </View>
          </View>
        ))}
        
        {filteredPlays.length === 0 && (
          <Text style={styles.noPlays}>No plays found for the selected filter.</Text>
        )}
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
  titleContainer: {
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
  loading: {
    color: '#888',
    textAlign: 'center',
    fontSize: 16,
  },
  error: {
    color: '#ff4444',
    textAlign: 'center',
    fontSize: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    justifyContent: 'space-around',
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#333',
  },
  activeFilter: {
    backgroundColor: '#8B5CF6',
  },
  filterText: {
    color: '#888',
    fontSize: 12,
    fontWeight: '500',
  },
  activeFilterText: {
    color: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  playItem: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#8B5CF6',
  },
  playHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeText: {
    color: '#8B5CF6',
    fontSize: 14,
    fontWeight: 'bold',
  },
  quarterText: {
    color: '#888',
    fontSize: 12,
  },
  scoreText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  playContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  playIcon: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 2,
  },
  playDetails: {
    flex: 1,
  },
  playDescription: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
    lineHeight: 20,
  },
  playMeta: {
    fontSize: 12,
    color: '#888',
  },
  noPlays: {
    color: '#888',
    textAlign: 'center',
    fontSize: 16,
    marginTop: 32,
  },
});

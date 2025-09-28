import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
} from 'react-native';
import {
  Text,
  Surface,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { theme } from '../theme/theme';

interface FlashMultiplierProps {
  visible: boolean;
  multiplier: number;
  playerName: string;
  eventType: string;
  onComplete?: () => void;
}

const { width } = Dimensions.get('window');

export default function FlashMultiplier({
  visible,
  multiplier,
  playerName,
  eventType,
  onComplete,
}: FlashMultiplierProps) {
  const getMultiplierColor = (mult: number) => {
    if (mult >= 5) return theme.colors.multiplier5x;
    if (mult >= 3) return theme.colors.multiplier3x;
    return theme.colors.multiplier2x;
  };

  const getEventIcon = (event: string) => {
    switch (event.toLowerCase()) {
      case 'three_pointer':
        return 'basketball';
      case 'dunk':
        return 'flame';
      case 'assist':
        return 'hand-left';
      case 'steal':
        return 'flash';
      case 'block':
        return 'shield';
      default:
        return 'star';
    }
  };

  const getEventText = (event: string) => {
    switch (event.toLowerCase()) {
      case 'three_pointer':
        return 'THREE POINTER!';
      case 'dunk':
        return 'THUNDEROUS DUNK!';
      case 'assist':
        return 'AMAZING ASSIST!';
      case 'steal':
        return 'CLUTCH STEAL!';
      case 'block':
        return 'MASSIVE BLOCK!';
      default:
        return 'BIG PLAY!';
    }
  };

  useEffect(() => {
    if (visible) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

      const timer = setTimeout(() => {
        onComplete?.();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!visible) return null;

  const multiplierColor = getMultiplierColor(multiplier);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[multiplierColor + 'CC', multiplierColor + '88']}
        style={styles.gradient}
      >
        <Surface style={[styles.surface, { borderColor: multiplierColor }]}>
          {/* Player Name */}
          <Text variant="titleLarge" style={styles.playerName}>
            {playerName}
          </Text>

          {/* Event Icon */}
          <View style={[styles.iconContainer, { backgroundColor: multiplierColor }]}>
            <Ionicons
              name={getEventIcon(eventType)}
              size={48}
              color={theme.colors.onPrimary}
            />
          </View>

          {/* Event Text */}
          <Text variant="headlineSmall" style={styles.eventText}>
            {getEventText(eventType)}
          </Text>

          {/* Multiplier */}
          <View style={[styles.multiplierContainer, { backgroundColor: multiplierColor }]}>
            <Text variant="displaySmall" style={styles.multiplierText}>
              {multiplier}x
            </Text>
            <Text variant="bodyMedium" style={styles.multiplierLabel}>
              MULTIPLIER
            </Text>
          </View>

          {/* Sparkle Effects */}
          <View style={styles.sparkleContainer}>
            {[...Array(8)].map((_, index) => (
              <View
                key={`sparkle-${index}`}
                style={[
                  styles.sparkle,
                  {
                    top: Math.random() * 200,
                    left: Math.random() * 200,
                    backgroundColor: multiplierColor,
                  },
                ]}
              />
            ))}
          </View>
        </Surface>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  gradient: {
    borderRadius: 24,
    padding: 4,
  },
  surface: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 3,
    minWidth: width * 0.8,
    maxWidth: width * 0.9,
  },
  playerName: {
    color: theme.colors.onSurface,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  eventText: {
    color: theme.colors.onSurface,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: 1,
  },
  multiplierContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  multiplierText: {
    color: theme.colors.onPrimary,
    fontWeight: '900',
    lineHeight: 48,
  },
  multiplierLabel: {
    color: theme.colors.onPrimary,
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: -8,
  },
  sparkleContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  sparkle: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    opacity: 0.8,
  },
});
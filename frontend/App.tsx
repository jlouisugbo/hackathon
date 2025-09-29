import React from 'react';
import { LogBox } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Provider as PaperProvider } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
LogBox.ignoreAllLogs(true);
// Context Providers
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { SocketProvider } from './src/context/SocketContext';
import { PortfolioProvider } from './src/context/PortfolioContext';
import { GameProvider } from './src/context/GameContext';

// Screens
import AuthScreen from './src/screens/AuthScreen';
import SeasonPortfolioScreen from './src/screens/SeasonPortfolioScreen';
import LiveTradingScreen from './src/screens/LiveTradingScreen';
import LeaderboardScreen from './src/screens/LeaderboardScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import MarketDashboard from './src/screens/MarketDashboard';

// Components

// Theme
import { theme } from './src/theme/theme';

const Tab = createBottomTabNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'Portfolio':
              iconName = focused ? 'wallet' : 'wallet-outline';
              break;
            case 'Market':
              iconName = focused ? 'trending-up' : 'trending-up-outline';
              break;
            case 'Live Trading':
              iconName = focused ? 'flash' : 'flash-outline';
              break;
            case 'Leaderboard':
              iconName = focused ? 'trophy' : 'trophy-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'ellipse-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.tabActive,
        tabBarInactiveTintColor: theme.colors.tabInactive,
        headerStyle: {
          backgroundColor: theme.colors.headerBg,
        },
        headerTintColor: theme.colors.onSurface,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.cardBorder,
          borderTopWidth: 1,
        },
      })}
    >
      <Tab.Screen
        name="Portfolio"
        component={SeasonPortfolioScreen}
        options={{
          title: 'Portfolio',
          headerTitle: 'Season Portfolio'
        }}
      />
      <Tab.Screen
        name="Market"
        component={MarketDashboard}
        options={{
          title: 'Market',
          headerTitle: 'Player Market'
        }}
      />
      <Tab.Screen
        name="Live Trading"
        component={LiveTradingScreen}
        options={{
          title: 'Live',
          headerTitle: 'Live Trading'
        }}
      />
      <Tab.Screen
        name="Leaderboard"
        component={LeaderboardScreen}
        options={{
          title: 'Rankings',
          headerTitle: 'Leaderboard'
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          headerTitle: 'Profile'
        }}
      />
    </Tab.Navigator>
  );
}

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // Show auth screen if no user is authenticated
  if (!user) {
    return <AuthScreen />;
  }

  return (
    <SafeAreaProvider>
      <SocketProvider>
        <PortfolioProvider>
          <GameProvider>
            <NavigationContainer>
              <StatusBar style="light" />
              <TabNavigator />
            </NavigationContainer>
          </GameProvider>
        </PortfolioProvider>
      </SocketProvider>
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <PaperProvider theme={theme}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
});
import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Card,
  ActivityIndicator,
} from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import { theme } from '../theme/theme';

export default function AuthScreen() {
  const { login, register, loading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!isLogin) {
      if (!username) {
        Alert.alert('Error', 'Username is required for registration');
        return;
      }
      if (password !== confirmPassword) {
        Alert.alert('Error', 'Passwords do not match');
        return;
      }
      if (password.length < 3) {
        Alert.alert('Error', 'Password must be at least 3 characters');
        return;
      }
    }

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, password, username);
      }
    } catch (error) {
      Alert.alert(
        isLogin ? 'Login Failed' : 'Registration Failed',
        error instanceof Error ? error.message : 'An unexpected error occurred'
      );
    }
  };


  const toggleMode = () => {
    setIsLogin(!isLogin);
    setEmail('');
    setPassword('');
    setUsername('');
    setConfirmPassword('');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.appTitle}>🏀 Player Stock Market</Text>
          <Text style={styles.subtitle}>
            Trade NBA players like stocks and compete for the top of the leaderboard!
          </Text>
        </View>

        <Card style={styles.authCard}>
          <Card.Content>
            <Text style={styles.authTitle}>
              {isLogin ? 'Welcome Back!' : 'Join the Trading Floor'}
            </Text>

            <Text style={styles.authSubtitle}>
              {isLogin
                ? 'Sign in to continue trading'
                : 'Create your account and get $10,000 to start trading'
              }
            </Text>

            <View style={styles.form}>
              <TextInput
                label="Email"
                mode="outlined"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
                theme={{
                  colors: {
                    primary: theme.colors.primary,
                  },
                }}
              />

              {!isLogin && (
                <TextInput
                  label="Username"
                  mode="outlined"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  style={styles.input}
                  theme={{
                    colors: {
                      primary: theme.colors.primary,
                    },
                  }}
                />
              )}

              <TextInput
                label="Password"
                mode="outlined"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                style={styles.input}
                theme={{
                  colors: {
                    primary: theme.colors.primary,
                  },
                }}
              />

              {!isLogin && (
                <TextInput
                  label="Confirm Password"
                  mode="outlined"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  style={styles.input}
                  theme={{
                    colors: {
                      primary: theme.colors.primary,
                    },
                  }}
                />
              )}

              <Button
                mode="contained"
                onPress={handleSubmit}
                loading={loading}
                disabled={loading}
                style={styles.submitButton}
                buttonColor={theme.colors.primary}
              >
                {isLogin ? 'Sign In' : 'Create Account'}
              </Button>

              <Button
                mode="outlined"
                onPress={toggleMode}
                disabled={loading}
                style={styles.toggleButton}
                textColor={theme.colors.primary}
              >
                {isLogin
                  ? "Don't have an account? Sign Up"
                  : "Already have an account? Sign In"
                }
              </Button>
            </View>
          </Card.Content>
        </Card>

        <View style={styles.features}>
          <Text style={styles.featuresTitle}>What's Inside:</Text>
          <Text style={styles.feature}>• Live NBA player trading simulation</Text>
          <Text style={styles.feature}>• Real-time price updates during games</Text>
          <Text style={styles.feature}>• Season & live trading portfolios</Text>
          <Text style={styles.feature}>• Compete on global leaderboards</Text>
          <Text style={styles.feature}>• Chat with other traders</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: theme.colors.primary,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.neutral,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  authCard: {
    backgroundColor: theme.colors.surface,
    marginBottom: 24,
    elevation: 4,
  },
  authTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.onSurface,
    textAlign: 'center',
    marginBottom: 8,
  },
  authSubtitle: {
    fontSize: 14,
    color: theme.colors.neutral,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  form: {
    gap: 16,
  },
  input: {
    backgroundColor: theme.colors.background,
  },
  submitButton: {
    marginTop: 8,
    paddingVertical: 4,
  },
  toggleButton: {
    marginTop: 8,
    borderColor: theme.colors.primary,
  },
  features: {
    alignItems: 'center',
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.onBackground,
    marginBottom: 12,
  },
  feature: {
    fontSize: 14,
    color: theme.colors.neutral,
    marginBottom: 6,
    textAlign: 'center',
  },
});
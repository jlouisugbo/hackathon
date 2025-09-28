import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Surface,
  Card,
  Title,
  Paragraph,
  ActivityIndicator,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useAuth } from '../context/AuthContext';
import { theme } from '../theme/theme';

interface LoginScreenProps {
  onNavigateToRegister: () => void;
  onLoginSuccess: () => void;
}

export default function LoginScreen({ onNavigateToRegister, onLoginSuccess }: LoginScreenProps) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      await login(email.trim(), password);
      onLoginSuccess();
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Login error:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Login Failed', error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };


  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.background]}
        style={styles.gradient}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Ionicons name="basketball" size={48} color={theme.colors.onPrimary} />
            </View>
            <Title style={styles.title}>Player Stock Market</Title>
            <Paragraph style={styles.subtitle}>
              Trade NBA players like stocks
            </Paragraph>
          </View>

          {/* Login Form */}
          <Card style={styles.formCard} mode="outlined">
            <Card.Content style={styles.formContent}>
              <Title style={styles.formTitle}>Welcome Back</Title>
              <Paragraph style={styles.formSubtitle}>
                Sign in to your account
              </Paragraph>

              <TextInput
                label="Email"
                value={email}
                onChangeText={setEmail}
                mode="outlined"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
                contentStyle={styles.inputContent}
                outlineStyle={styles.inputOutline}
                left={<TextInput.Icon icon="email" />}
              />

              <TextInput
                label="Password"
                value={password}
                onChangeText={setPassword}
                mode="outlined"
                secureTextEntry
                style={styles.input}
                contentStyle={styles.inputContent}
                outlineStyle={styles.inputOutline}
                left={<TextInput.Icon icon="lock" />}
              />

              <Button
                mode="contained"
                onPress={handleLogin}
                loading={loading}
                disabled={loading}
                style={styles.loginButton}
                labelStyle={styles.loginButtonText}
                contentStyle={styles.loginButtonContent}
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>

            </Card.Content>
          </Card>

          {/* Register Link */}
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>
              Don't have an account?{' '}
            </Text>
            <Button
              mode="text"
              onPress={onNavigateToRegister}
              labelStyle={styles.registerLink}
              contentStyle={styles.registerButtonContent}
            >
              Sign Up
            </Button>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.onPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.onPrimary + 'CC',
    textAlign: 'center',
  },
  formCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    elevation: 4,
  },
  formContent: {
    padding: 24,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
    textAlign: 'center',
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 16,
    color: theme.colors.neutral,
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    marginBottom: 16,
    backgroundColor: theme.colors.surfaceVariant,
  },
  inputContent: {
    fontSize: 16,
  },
  inputOutline: {
    borderColor: theme.colors.outline,
  },
  loginButton: {
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 12,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  loginButtonContent: {
    paddingVertical: 8,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  registerText: {
    color: theme.colors.onPrimary + 'CC',
    fontSize: 16,
  },
  registerLink: {
    color: theme.colors.onPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  registerButtonContent: {
    paddingVertical: 4,
  },
});

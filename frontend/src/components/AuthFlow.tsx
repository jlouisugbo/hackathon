import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';

interface AuthFlowProps {
  onAuthSuccess: () => void;
}

export default function AuthFlow({ onAuthSuccess }: AuthFlowProps) {
  const [currentScreen, setCurrentScreen] = useState<'login' | 'register'>('login');

  const handleNavigateToRegister = () => {
    setCurrentScreen('register');
  };

  const handleNavigateToLogin = () => {
    setCurrentScreen('login');
  };

  const handleAuthSuccess = () => {
    onAuthSuccess();
  };

  return (
    <View style={styles.container}>
      {currentScreen === 'login' ? (
        <LoginScreen
          onNavigateToRegister={handleNavigateToRegister}
          onLoginSuccess={handleAuthSuccess}
        />
      ) : (
        <RegisterScreen
          onNavigateToLogin={handleNavigateToLogin}
          onRegisterSuccess={handleAuthSuccess}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

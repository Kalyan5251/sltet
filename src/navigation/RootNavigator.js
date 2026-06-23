import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';

import { LoginScreen } from '../screens/Auth/LoginScreen';
import { AdminStack } from './AdminStack';
import { StaffStack } from './StaffStack';
import { COLORS } from '../theme/Theme';

const Stack = createNativeStackNavigator();

export const RootNavigator = () => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          // Unauthenticated Stack
          <Stack.Screen name="Auth" component={LoginScreen} />
        ) : role === 'admin' ? (
          // Admin Stack
          <Stack.Screen name="AdminRoot" component={AdminStack} />
        ) : (
          // Staff Stack
          <Stack.Screen name="StaffRoot" component={StaffStack} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  }
});

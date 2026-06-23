import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TourListScreen } from '../screens/Staff/TourListScreen';
import { TourDetailScreen } from '../screens/Staff/TourDetailScreen';
import { CustomerListScreen } from '../screens/Shared/CustomerListScreen';
import { CustomerDetailScreen } from '../screens/Shared/CustomerDetailScreen';
import { COLORS } from '../theme/Theme';

const Stack = createNativeStackNavigator();

export const StaffStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.background },
        headerShadowVisible: false,
        headerTintColor: COLORS.text,
      }}
    >
      <Stack.Screen name="StaffTourList" component={TourListScreen} options={{ headerShown: false }} />
      <Stack.Screen name="StaffTourDetail" component={TourDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CustomerList" component={CustomerListScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CustomerDetail" component={CustomerDetailScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
};

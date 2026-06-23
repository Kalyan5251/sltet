import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TourListScreen } from '../screens/Admin/TourListScreen';
import { TourDetailScreen } from '../screens/Admin/TourDetailScreen';
import { CreateTourScreen } from '../screens/Admin/CreateTourScreen';
import { CustomerListScreen } from '../screens/Shared/CustomerListScreen';
import { AddCustomerScreen } from '../screens/Admin/AddCustomerScreen';
import { CustomerDetailScreen } from '../screens/Shared/CustomerDetailScreen';
import { COLORS } from '../theme/Theme';

const Stack = createNativeStackNavigator();

export const AdminStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.background },
        headerShadowVisible: false,
        headerTintColor: COLORS.text,
      }}
    >
      <Stack.Screen name="TourList" component={TourListScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CreateTour" component={CreateTourScreen} options={{ presentation: 'modal', title: 'New Tour' }} />
      <Stack.Screen name="TourDetail" component={TourDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CustomerList" component={CustomerListScreen} options={{ headerShown: false }} />
      <Stack.Screen name="AddCustomer" component={AddCustomerScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CustomerDetail" component={CustomerDetailScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
};

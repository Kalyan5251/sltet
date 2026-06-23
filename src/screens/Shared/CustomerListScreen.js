import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Plus, ChevronRight, IndianRupee } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { subscribeToCustomersByTour } from '../../api/customerService';
import { COLORS, SPACE, ROUNDING, SHADOWS } from '../../theme/Theme';

export const CustomerListScreen = ({ route, navigation }) => {
  const { tourId, tourName, pricePerHead } = route.params;
  const { role } = useAuth();
  
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToCustomersByTour(tourId, (data, error) => {
      if (!error && data) {
        setCustomers(data);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [tourId]);

  const renderCustomerCard = ({ item }) => {
    return (
      <TouchableOpacity 
        style={styles.cardContainer}
        onPress={() => navigation.navigate('CustomerDetail', { 
          customer: item, 
          tourName 
        })}
      >
        <LinearGradient
          colors={[COLORS.card, 'rgba(255, 255, 255, 0.4)']}
          style={styles.card}
        >
          <View style={styles.cardTop}>
            <View>
              <Text style={styles.headName}>{item.headMemberName || 'Unknown Group'}</Text>
              <Text style={styles.groupTypeBadge}>{item.groupType?.toUpperCase()} • {item.membersCount} {item.membersCount === 1 ? 'Member' : 'Members'}</Text>
            </View>
            <ChevronRight color={COLORS.primary} size={24} />
          </View>
          <View style={styles.cardBottom}>
            <View style={styles.financialCol}>
              <Text style={styles.finLabel}>Total</Text>
              <Text style={styles.finValue}>₹{item.totalAmount}</Text>
            </View>
            <View style={styles.financialCol}>
              <Text style={styles.finLabel}>Paid</Text>
              <Text style={[styles.finValue, { color: COLORS.secondary }]}>₹{item.paidAmount}</Text>
            </View>
            <View style={styles.financialCol}>
              <Text style={styles.finLabel}>Due</Text>
              <Text style={[styles.finValue, { color: item.dueAmount > 0 ? COLORS.danger : COLORS.success }]}>₹{item.dueAmount}</Text>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={[COLORS.background, '#f1f5f9']} style={StyleSheet.absoluteFill} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft color={COLORS.text} size={28} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.greeting} numberOfLines={1}>{tourName}</Text>
          <Text style={styles.subtitle}>Customers & Bookings</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={customers}
          keyExtractor={item => item.id}
          renderItem={renderCustomerCard}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No customers booked for this tour.</Text>
            </View>
          }
        />
      )}

      {role === 'admin' && (
        <TouchableOpacity 
          style={styles.fab} 
          onPress={() => navigation.navigate('AddCustomer', { tourId, tourName, pricePerHead })}
        >
          <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.fabGradient}>
            <Plus color={COLORS.white} size={24} />
          </LinearGradient>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACE.md, paddingTop: SPACE.md, marginBottom: SPACE.md },
  backBtn: { padding: SPACE.xs, marginRight: SPACE.sm },
  headerTitleContainer: { flex: 1 },
  greeting: { fontSize: 24, fontWeight: 'bold', color: COLORS.text },
  subtitle: { fontSize: 14, color: COLORS.textLight },
  listContainer: { paddingBottom: SPACE.xl * 4 },
  cardContainer: { marginHorizontal: SPACE.md, marginBottom: SPACE.sm, borderRadius: ROUNDING.lg, ...SHADOWS.glass },
  card: { borderRadius: ROUNDING.lg, padding: SPACE.md, borderWidth: 1, borderColor: COLORS.border },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingBottom: SPACE.sm, marginBottom: SPACE.sm },
  headName: { fontSize: 18, fontWeight: '600', color: COLORS.text },
  groupTypeBadge: { fontSize: 12, color: COLORS.textLight, marginTop: 4, fontWeight: '500' },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between' },
  financialCol: { alignItems: 'center' },
  finLabel: { fontSize: 12, color: COLORS.textLight, marginBottom: 2 },
  finValue: { fontSize: 14, fontWeight: 'bold', color: COLORS.text },
  emptyContainer: { alignItems: 'center', marginTop: SPACE.xl * 2 },
  emptyText: { color: COLORS.textLight, fontSize: 16 },
  fab: { position: 'absolute', bottom: SPACE.xl, right: SPACE.md, width: 60, height: 60, borderRadius: 30, ...SHADOWS.glass, elevation: 8 },
  fabGradient: { width: '100%', height: '100%', borderRadius: 30, justifyContent: 'center', alignItems: 'center' }
});

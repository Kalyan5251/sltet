import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { LogOut, ChevronRight } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { subscribeToTours } from '../../api/tourService';
import { COLORS, SPACE, ROUNDING, SHADOWS } from '../../theme/Theme';
import { format } from 'date-fns';

export const TourListScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Staff can see all tours
    const unsubscribe = subscribeToTours((data, error) => {
      if (!error) {
        setTours(data);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const renderTourCard = ({ item }) => {
    const formattedDate = item.createdAt?.seconds
      ? format(new Date(item.createdAt.seconds * 1000), 'MMM dd, yyyy')
      : 'Just now';

    return (
      <TouchableOpacity 
        style={styles.cardContainer}
        onPress={() => navigation.navigate('StaffTourDetail', { tourId: item.id, tourName: item.name, pricePerHead: item.pricePerHead })}
      >
        <LinearGradient
          colors={[COLORS.card, 'rgba(255, 255, 255, 0.4)']}
          style={styles.card}
        >
          <View style={styles.cardContent}>
            <View>
              <Text style={styles.tourName}>{item.name}</Text>
              <Text style={styles.tourDate}>Created: {formattedDate}</Text>
            </View>
            <ChevronRight color={COLORS.primary} size={24} />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={[COLORS.background, '#f1f5f9']} style={StyleSheet.absoluteFill} />
      
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Available Tours</Text>
          <Text style={styles.subtitle}>{user?.email}</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <LogOut color={COLORS.danger} size={24} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={tours}
        keyExtractor={item => item.id}
        renderItem={renderTourCard}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No tours available.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACE.md, paddingTop: SPACE.md, paddingBottom: SPACE.md
  },
  greeting: { fontSize: 24, fontWeight: 'bold', color: COLORS.text },
  subtitle: { fontSize: 14, color: COLORS.textLight },
  logoutBtn: { padding: SPACE.xs },
  listContainer: { paddingBottom: SPACE.xl * 2 },
  cardContainer: { marginHorizontal: SPACE.md, marginBottom: SPACE.sm, borderRadius: ROUNDING.lg, ...SHADOWS.glass },
  card: { borderRadius: ROUNDING.lg, padding: SPACE.md, borderWidth: 1, borderColor: COLORS.border },
  cardContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tourName: { fontSize: 18, fontWeight: '600', color: COLORS.text },
  tourDate: { fontSize: 12, color: COLORS.textLight, marginTop: 4 },
  emptyContainer: { alignItems: 'center', marginTop: SPACE.xl * 2 },
  emptyText: { color: COLORS.textLight, fontSize: 16 }
});

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { LogOut, Plus, ChevronRight, Edit2, Trash2, Users, Search, SlidersHorizontal, RotateCcw } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { subscribeToTours, deleteTour } from '../../api/tourService';
import { COLORS, SPACE, ROUNDING, SHADOWS } from '../../theme/Theme';
import { DatePicker } from '../../components/DatePicker';
import { format, startOfDay } from 'date-fns';

export const TourListScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStartDate, setFilterStartDate] = useState(null);
  const [filterEndDate, setFilterEndDate] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all'); // all, upcoming, ongoing, completed
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToTours((data, error) => {
      if (!error) {
        setTours(data);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleDelete = (id, name) => {
    Alert.alert(
      "Delete Tour",
      `Are you sure you want to delete "${name}"? This will delete all customers, members, and payments associated with this tour!`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            const result = await deleteTour(id);
            if (!result.success) Alert.alert("Error", "Failed to delete tour.");
          }
        }
      ]
    );
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setFilterStartDate(null);
    setFilterEndDate(null);
    setFilterStatus('all');
  };

  const formatDate = (dateVal) => {
    if (!dateVal) return 'N/A';
    const date = dateVal.toDate ? dateVal.toDate() : new Date(dateVal);
    return isNaN(date.getTime()) ? 'N/A' : format(date, 'dd-MMM-yyyy');
  };

  // Perform client-side real-time filtering
  const filteredTours = tours.filter(tour => {
    const matchesSearch = tour.name.toLowerCase().includes(searchQuery.toLowerCase());

    const start = tour.startDate ? (tour.startDate.toDate ? tour.startDate.toDate() : new Date(tour.startDate)) : null;
    const end = tour.endDate ? (tour.endDate.toDate ? tour.endDate.toDate() : new Date(tour.endDate)) : null;

    let matchesStartDate = true;
    if (filterStartDate && start) {
      const fStart = startOfDay(new Date(filterStartDate)).getTime();
      const tStart = startOfDay(start).getTime();
      matchesStartDate = tStart >= fStart;
    }

    let matchesEndDate = true;
    if (filterEndDate && end) {
      const fEnd = startOfDay(new Date(filterEndDate)).getTime();
      const tEnd = startOfDay(end).getTime();
      matchesEndDate = tEnd <= fEnd;
    }

    let matchesStatus = true;
    if (filterStatus !== 'all' && start && end) {
      const today = startOfDay(new Date()).getTime();
      const tStart = startOfDay(start).getTime();
      const tEnd = startOfDay(end).getTime();

      if (filterStatus === 'upcoming') {
        matchesStatus = tStart > today;
      } else if (filterStatus === 'ongoing') {
        matchesStatus = today >= tStart && today <= tEnd;
      } else if (filterStatus === 'completed') {
        matchesStatus = tEnd < today;
      }
    }

    return matchesSearch && matchesStartDate && matchesEndDate && matchesStatus;
  });

  const renderTourCard = ({ item }) => {
    return (
      <View style={styles.cardContainer}>
        <TouchableOpacity 
          style={{ flex: 1 }}
          onPress={() => navigation.navigate('TourDetail', { 
            tourId: item.id, 
            tourName: item.name, 
            pricePerHead: item.pricePerHead,
            startDate: item.startDate,
            endDate: item.endDate
          })}
        >
          <LinearGradient colors={[COLORS.card, 'rgba(255, 255, 255, 0.4)']} style={styles.card}>
            <View style={styles.cardContent}>
              <View style={{ flex: 1 }}>
                <Text style={styles.tourName}>{item.name}</Text>
                
                {/* Enhanced Date Display */}
                <Text style={styles.tourDate}>
                  {formatDate(item.startDate)} → {formatDate(item.endDate)}
                </Text>

                <View style={styles.passengerCountContainer}>
                  <Users size={16} color={COLORS.primary} style={{ marginRight: SPACE.xs }} />
                  <Text style={styles.passengerCount}>{item.passengerCount || 0} Passengers</Text>
                </View>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity 
                  style={styles.actionBtn}
                  onPress={() => navigation.navigate('EditTour', { 
                    tourId: item.id, 
                    currentName: item.name, 
                    currentPrice: item.pricePerHead,
                    currentStartDate: item.startDate,
                    currentEndDate: item.endDate
                  })}
                >
                  <Edit2 color={COLORS.primary} size={20} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item.id, item.name)} style={styles.actionBtn}>
                  <Trash2 color={COLORS.danger} size={20} />
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>
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
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Admin Tours</Text>
          <Text style={styles.subtitle}>Manage all tours & expenses</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <LogOut color={COLORS.danger} size={24} />
        </TouchableOpacity>
      </View>

      {/* Real-time Search & Filters Bar */}
      <View style={styles.searchFilterContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color={COLORS.textLight} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by Tour Name..."
            placeholderTextColor={COLORS.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity 
          style={[styles.filterToggleBtn, showFilters && styles.filterToggleBtnActive]} 
          onPress={() => setShowFilters(!showFilters)}
        >
          <SlidersHorizontal size={20} color={showFilters ? COLORS.white : COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Collapsible Filter Panel */}
      {showFilters && (
        <View style={styles.filterPanel}>
          <View style={styles.filterPanelHeader}>
            <Text style={styles.filterPanelTitle}>Filters</Text>
            <TouchableOpacity style={styles.resetBtn} onPress={handleResetFilters}>
              <RotateCcw size={14} color={COLORS.danger} style={{ marginRight: 4 }} />
              <Text style={styles.resetText}>Reset All</Text>
            </TouchableOpacity>
          </View>

          {/* Date Pickers */}
          <View style={styles.datePickerRow}>
            <View style={{ flex: 1, marginRight: SPACE.xs }}>
              <DatePicker
                placeholder="Start Date"
                value={filterStartDate}
                onChange={setFilterStartDate}
                allowClear={true}
              />
            </View>
            <View style={{ flex: 1, marginLeft: SPACE.xs }}>
              <DatePicker
                placeholder="End Date"
                value={filterEndDate}
                onChange={setFilterEndDate}
                allowClear={true}
                minimumDate={filterStartDate}
              />
            </View>
          </View>

          {/* Tour Status Pills */}
          <Text style={styles.filterLabel}>Tour Status</Text>
          <View style={styles.statusPills}>
            {['all', 'upcoming', 'ongoing', 'completed'].map((status) => (
              <TouchableOpacity
                key={status}
                style={[styles.statusPill, filterStatus === status && styles.statusPillActive]}
                onPress={() => setFilterStatus(status)}
              >
                <Text style={[styles.statusPillText, filterStatus === status && styles.statusPillTextActive]}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* List */}
      <FlatList
        data={filteredTours}
        keyExtractor={item => item.id}
        renderItem={renderTourCard}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No matching tours found.</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('CreateTour')}>
        <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.fabGradient}>
          <Plus color={COLORS.white} size={24} />
        </LinearGradient>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACE.md, paddingTop: SPACE.md, paddingBottom: SPACE.sm
  },
  greeting: { fontSize: 24, fontWeight: 'bold', color: COLORS.text },
  subtitle: { fontSize: 14, color: COLORS.textLight },
  logoutBtn: { padding: SPACE.xs },
  
  // Search & Filter Styles
  searchFilterContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACE.md,
    paddingVertical: SPACE.xs,
    gap: SPACE.sm,
    alignItems: 'center',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: ROUNDING.md,
    paddingHorizontal: SPACE.sm,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    height: 48,
    ...SHADOWS.glass,
  },
  searchIcon: {
    marginRight: SPACE.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
  },
  filterToggleBtn: {
    width: 48,
    height: 48,
    borderRadius: ROUNDING.md,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.glass,
  },
  filterToggleBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterPanel: {
    marginHorizontal: SPACE.md,
    marginTop: SPACE.xs,
    marginBottom: SPACE.sm,
    backgroundColor: COLORS.white,
    borderRadius: ROUNDING.lg,
    padding: SPACE.md,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...SHADOWS.glass,
  },
  filterPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACE.sm,
  },
  filterPanelTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resetText: {
    fontSize: 12,
    color: COLORS.danger,
    fontWeight: '600',
  },
  datePickerRow: {
    flexDirection: 'row',
    marginBottom: -SPACE.xs, // offset DatePicker margin
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACE.xs,
    marginTop: SPACE.xs,
  },
  statusPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACE.xs,
    marginTop: SPACE.xs,
  },
  statusPill: {
    paddingVertical: SPACE.xs + 2,
    paddingHorizontal: SPACE.sm + 2,
    borderRadius: ROUNDING.full,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  statusPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  statusPillTextActive: {
    color: COLORS.white,
  },

  listContainer: { paddingBottom: SPACE.xl * 4, paddingTop: SPACE.xs },
  cardContainer: { marginHorizontal: SPACE.md, marginBottom: SPACE.sm, borderRadius: ROUNDING.lg, ...SHADOWS.glass },
  card: { borderRadius: ROUNDING.lg, padding: SPACE.md, borderWidth: 1, borderColor: COLORS.border },
  cardContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tourName: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  tourDate: { fontSize: 13, color: COLORS.textLight, fontWeight: '500', marginBottom: SPACE.xs },
  passengerCountContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  passengerCount: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  actions: { flexDirection: 'row', alignItems: 'center' },
  actionBtn: { padding: SPACE.sm, marginLeft: SPACE.xs },
  emptyContainer: { alignItems: 'center', marginTop: SPACE.xl * 2 },
  emptyText: { color: COLORS.textLight, fontSize: 16 },
  fab: {
    position: 'absolute', bottom: SPACE.xl, right: SPACE.md,
    width: 60, height: 60, borderRadius: 30, ...SHADOWS.glass, elevation: 8
  },
  fabGradient: { width: '100%', height: '100%', borderRadius: 30, justifyContent: 'center', alignItems: 'center' }
});

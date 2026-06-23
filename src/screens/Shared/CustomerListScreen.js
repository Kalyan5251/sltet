import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Plus, ChevronRight, Search, SlidersHorizontal, RotateCcw, Calendar, Phone, Hash, Bookmark, Edit2, Trash2 } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { subscribeToCustomersByTour, deleteCustomer } from '../../api/customerService';
import { COLORS, SPACE, ROUNDING, SHADOWS } from '../../theme/Theme';
import { DatePicker } from '../../components/DatePicker';
import { format, startOfDay } from 'date-fns';

export const CustomerListScreen = ({ route, navigation }) => {
  const { tourId, tourName, pricePerHead, startDate, endDate } = route.params;
  const { role } = useAuth();
  
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Tab State: 'customers' or 'bookings'
  const [activeTab, setActiveTab] = useState('customers');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Customers Filters
  const [filterGroupType, setFilterGroupType] = useState('all'); // all, single, couple, family
  const [filterPaymentStatus, setFilterPaymentStatus] = useState('all'); // all, fully_paid, partially_paid, unpaid

  // Bookings Filters
  const [filterBookingType, setFilterBookingType] = useState('all'); // all, tour, flight, train, bus
  const [filterJourneyDate, setFilterJourneyDate] = useState(null);

  useEffect(() => {
    const unsubscribe = subscribeToCustomersByTour(tourId, (data, error) => {
      if (!error && data) {
        setCustomers(data);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [tourId]);

  const handleDelete = (customerId, name, membersCount) => {
    Alert.alert(
      "Delete Booking",
      `Are you sure you want to delete "${name}" group? This removes all their payments and members.`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            const result = await deleteCustomer(customerId, tourId, membersCount);
            if (!result.success) Alert.alert("Error", "Failed to delete customer.");
          }
        }
      ]
    );
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setFilterGroupType('all');
    setFilterPaymentStatus('all');
    setFilterBookingType('all');
    setFilterJourneyDate(null);
  };

  const formatDate = (dateVal) => {
    if (!dateVal) return 'N/A';
    const date = dateVal.toDate ? dateVal.toDate() : new Date(dateVal);
    return isNaN(date.getTime()) ? 'N/A' : format(date, 'dd-MMM-yyyy');
  };

  // Perform client-side real-time filtering
  const filteredData = customers.filter(item => {
    const q = searchQuery.toLowerCase().trim();
    
    // 1. Search Query logic based on Tab
    let matchesSearch = false;
    if (activeTab === 'customers') {
      const nameMatch = (item.headMemberName || '').toLowerCase().includes(q);
      const phoneMatch = (item.phoneNumber || '').toLowerCase().includes(q);
      matchesSearch = nameMatch || phoneMatch || q === '';
    } else {
      const nameMatch = (item.headMemberName || '').toLowerCase().includes(q);
      const pnrMatch = (item.pnr || '').toLowerCase().includes(q);
      const idMatch = (item.id || '').toLowerCase().includes(q);
      matchesSearch = nameMatch || pnrMatch || idMatch || q === '';
    }

    // 2. Filters Logic based on Tab
    if (activeTab === 'customers') {
      // Group Type Filter
      let matchesGroup = true;
      if (filterGroupType !== 'all') {
        matchesGroup = item.groupType === filterGroupType;
      }

      // Payment Status Filter
      let matchesPayment = true;
      if (filterPaymentStatus !== 'all') {
        const isPaid = item.dueAmount <= 0;
        const isPartially = item.paidAmount > 0 && item.dueAmount > 0;
        const isUnpaid = item.paidAmount === 0;

        if (filterPaymentStatus === 'fully_paid') matchesPayment = isPaid;
        else if (filterPaymentStatus === 'partially_paid') matchesPayment = isPartially;
        else if (filterPaymentStatus === 'unpaid') matchesPayment = isUnpaid;
      }

      return matchesSearch && matchesGroup && matchesPayment;
    } else {
      // Booking Type Filter
      let matchesBookingType = true;
      if (filterBookingType !== 'all') {
        matchesBookingType = item.bookingType === filterBookingType;
      }

      // Journey Date Filter
      let matchesJourneyDate = true;
      if (filterJourneyDate && item.journeyDate) {
        const fDate = startOfDay(new Date(filterJourneyDate)).getTime();
        const jDate = startOfDay(item.journeyDate.toDate ? item.journeyDate.toDate() : new Date(item.journeyDate)).getTime();
        matchesJourneyDate = fDate === jDate;
      }

      return matchesSearch && matchesBookingType && matchesJourneyDate;
    }
  });

  const renderCustomerCard = (item) => {
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
            <View style={{ flex: 1 }}>
              <Text style={styles.headName}>{item.headMemberName || 'Unknown Group'}</Text>
              <Text style={styles.groupTypeBadge}>
                {item.groupType?.toUpperCase()} • {item.membersCount} {item.membersCount === 1 ? 'Member' : 'Members'}
              </Text>
              {item.phoneNumber ? (
                <View style={styles.cardContactRow}>
                  <Phone size={12} color={COLORS.textLight} style={{ marginRight: 4 }} />
                  <Text style={styles.cardContactText}>{item.phoneNumber}</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.actions}>
              {(role === 'admin' || role === 'manager') && (
                <>
                  <TouchableOpacity 
                    style={styles.actionBtn}
                    onPress={() => navigation.navigate('EditCustomer', { customer: item, tourName, pricePerHead })}
                  >
                    <Edit2 color={COLORS.primary} size={20} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(item.id, item.headMemberName, item.membersCount)} style={styles.actionBtn}>
                    <Trash2 color={COLORS.danger} size={20} />
                  </TouchableOpacity>
                </>
              )}
              <ChevronRight color={COLORS.textLight} size={24} style={{ marginLeft: SPACE.xs }} />
            </View>
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

  const renderBookingCard = (item) => {
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
          <View style={styles.bookingCardHeader}>
            <View style={{ flex: 1 }}>
              <View style={styles.bookingIdRow}>
                <Bookmark size={14} color={COLORS.primary} style={{ marginRight: 4 }} />
                <Text style={styles.bookingIdText} numberOfLines={1}>
                  ID: {item.id ? item.id.substring(0, 10).toUpperCase() : 'N/A'}
                </Text>
              </View>
              <Text style={styles.headName}>{item.headMemberName || 'Unknown Group'}</Text>
            </View>
            <View style={styles.bookingBadgeContainer}>
              <Text style={styles.bookingTypeBadgeStyle}>{item.bookingType ? item.bookingType.toUpperCase() : 'TOUR'}</Text>
            </View>
          </View>

          <View style={styles.bookingCardBody}>
            <View style={styles.bookingFieldRow}>
              <Hash size={14} color={COLORS.textLight} style={{ marginRight: 4 }} />
              <Text style={styles.bookingFieldLabel}>PNR:</Text>
              <Text style={styles.bookingFieldValue}>{item.pnr ? item.pnr.toUpperCase() : 'N/A'}</Text>
            </View>

            <View style={styles.bookingFieldRow}>
              <Calendar size={14} color={COLORS.textLight} style={{ marginRight: 4 }} />
              <Text style={styles.bookingFieldLabel}>Journey Date:</Text>
              <Text style={styles.bookingFieldValue}>{formatDate(item.journeyDate)}</Text>
            </View>
          </View>

          <View style={[styles.cardBottom, { borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: SPACE.sm, marginTop: SPACE.sm }]}>
            <View style={styles.financialCol}>
              <Text style={styles.finLabel}>Total</Text>
              <Text style={[styles.finValue, { fontSize: 13 }]}>₹{item.totalAmount}</Text>
            </View>
            <View style={styles.financialCol}>
              <Text style={styles.finLabel}>Paid</Text>
              <Text style={[styles.finValue, { color: COLORS.secondary, fontSize: 13 }]}>₹{item.paidAmount}</Text>
            </View>
            <View style={styles.financialCol}>
              <Text style={styles.finLabel}>Due</Text>
              <Text style={[styles.finValue, { color: item.dueAmount > 0 ? COLORS.danger : COLORS.success, fontSize: 13 }]}>₹{item.dueAmount}</Text>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={[COLORS.background, '#f1f5f9']} style={StyleSheet.absoluteFill} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft color={COLORS.text} size={28} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.greeting} numberOfLines={1}>{tourName}</Text>
          <Text style={styles.subtitle}>Customers & Bookings</Text>
        </View>
      </View>

      {/* Tabs / Toggle Control */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === 'customers' && styles.tabBtnActive]} 
          onPress={() => {
            setActiveTab('customers');
            handleResetFilters();
          }}
        >
          <Text style={[styles.tabBtnText, activeTab === 'customers' && styles.tabBtnTextActive]}>
            Customers
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === 'bookings' && styles.tabBtnActive]} 
          onPress={() => {
            setActiveTab('bookings');
            handleResetFilters();
          }}
        >
          <Text style={[styles.tabBtnText, activeTab === 'bookings' && styles.tabBtnTextActive]}>
            Bookings
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search & Filter Bar */}
      <View style={styles.searchFilterContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color={COLORS.textLight} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={
              activeTab === 'customers' 
                ? "Search by Name, Phone..." 
                : "Search by Name, PNR, Booking ID..."
            }
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

          {activeTab === 'customers' ? (
            /* Customers Filters */
            <>
              <Text style={styles.filterLabel}>Group Type</Text>
              <View style={styles.statusPills}>
                {['all', 'single', 'couple', 'family'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.statusPill, filterGroupType === type && styles.statusPillActive]}
                    onPress={() => setFilterGroupType(type)}
                  >
                    <Text style={[styles.statusPillText, filterGroupType === type && styles.statusPillTextActive]}>
                      {type.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.filterLabel}>Payment Status</Text>
              <View style={styles.statusPills}>
                {[
                  { id: 'all', name: 'ALL' },
                  { id: 'fully_paid', name: 'FULLY PAID' },
                  { id: 'partially_paid', name: 'PARTIALLY PAID' },
                  { id: 'unpaid', name: 'UNPAID' }
                ].map((status) => (
                  <TouchableOpacity
                    key={status.id}
                    style={[styles.statusPill, filterPaymentStatus === status.id && styles.statusPillActive]}
                    onPress={() => setFilterPaymentStatus(status.id)}
                  >
                    <Text style={[styles.statusPillText, filterPaymentStatus === status.id && styles.statusPillTextActive]}>
                      {status.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          ) : (
            /* Bookings Filters */
            <>
              <Text style={styles.filterLabel}>Booking Type</Text>
              <View style={styles.statusPills}>
                {['all', 'tour', 'flight', 'train', 'bus'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.statusPill, filterBookingType === type && styles.statusPillActive]}
                    onPress={() => setFilterBookingType(type)}
                  >
                    <Text style={[styles.statusPillText, filterBookingType === type && styles.statusPillTextActive]}>
                      {type.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <DatePicker
                label="Journey Date"
                value={filterJourneyDate}
                onChange={setFilterJourneyDate}
                placeholder="Filter by Journey Date"
                allowClear={true}
              />
            </>
          )}
        </View>
      )}

      {/* Content List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={item => item.id}
          renderItem={({ item }) => 
            activeTab === 'customers' 
              ? renderCustomerCard(item) 
              : renderBookingCard(item)
          }
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                No matching records found.
              </Text>
            </View>
          }
        />
      )}

      {role === 'admin' && activeTab === 'customers' && (
        <TouchableOpacity 
          style={styles.fab} 
          onPress={() => navigation.navigate('AddCustomer', { tourId, tourName, pricePerHead, startDate, endDate })}
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
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACE.md, paddingTop: SPACE.md, marginBottom: SPACE.xs },
  backBtn: { padding: SPACE.xs, marginRight: SPACE.sm },
  headerTitleContainer: { flex: 1 },
  greeting: { fontSize: 24, fontWeight: 'bold', color: COLORS.text },
  subtitle: { fontSize: 14, color: COLORS.textLight },
  
  // Tab Toggle Styles
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: SPACE.md,
    marginVertical: SPACE.sm,
    backgroundColor: '#e2e8f0',
    padding: 3,
    borderRadius: ROUNDING.md,
    ...SHADOWS.glass,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: SPACE.sm + 2,
    alignItems: 'center',
    borderRadius: ROUNDING.md - 2,
  },
  tabBtnActive: {
    backgroundColor: COLORS.white,
    ...SHADOWS.glass,
  },
  tabBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  tabBtnTextActive: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },

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
    marginBottom: SPACE.md,
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
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textLight,
  },
  statusPillTextActive: {
    color: COLORS.white,
  },

  // Cards List Styles
  listContainer: { paddingBottom: SPACE.xl * 4, paddingTop: SPACE.xs },
  cardContainer: { marginHorizontal: SPACE.md, marginBottom: SPACE.sm, borderRadius: ROUNDING.lg, ...SHADOWS.glass },
  card: { borderRadius: ROUNDING.lg, padding: SPACE.md, borderWidth: 1, borderColor: COLORS.border },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingBottom: SPACE.sm, marginBottom: SPACE.sm },
  headName: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  groupTypeBadge: { fontSize: 12, color: COLORS.primary, marginTop: 2, fontWeight: '700' },
  cardContactRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  cardContactText: { fontSize: 12, color: COLORS.textLight },
  actions: { flexDirection: 'row', alignItems: 'center' },
  actionBtn: { padding: SPACE.sm, marginLeft: SPACE.xs },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between' },
  financialCol: { alignItems: 'center' },
  finLabel: { fontSize: 11, color: COLORS.textLight, marginBottom: 2, fontWeight: '500' },
  finValue: { fontSize: 14, fontWeight: 'bold', color: COLORS.text },
  
  // Booking Card Specific Styles
  bookingCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: SPACE.xs,
    marginBottom: SPACE.sm,
  },
  bookingIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  bookingIdText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.textLight,
  },
  bookingBadgeContainer: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: SPACE.sm,
    paddingVertical: 4,
    borderRadius: ROUNDING.sm,
  },
  bookingTypeBadgeStyle: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primary,
  },
  bookingCardBody: {
    gap: SPACE.xs,
  },
  bookingFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookingFieldLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '600',
    marginRight: 4,
  },
  bookingFieldValue: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '700',
  },

  emptyContainer: { alignItems: 'center', marginTop: SPACE.xl * 2 },
  emptyText: { color: COLORS.textLight, fontSize: 16 },
  fab: { position: 'absolute', bottom: SPACE.xl, right: SPACE.md, width: 60, height: 60, borderRadius: 30, ...SHADOWS.glass, elevation: 8 },
  fabGradient: { width: '100%', height: '100%', borderRadius: 30, justifyContent: 'center', alignItems: 'center' }
});

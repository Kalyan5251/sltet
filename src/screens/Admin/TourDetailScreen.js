import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert, TouchableOpacity, KeyboardAvoidingView, Platform, TextInput, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus, ChevronLeft, Users, Search, SlidersHorizontal, RotateCcw, X, User } from 'lucide-react-native';
import { z } from 'zod';
import { useAuth } from '../../context/AuthContext';
import { subscribeToExpensesByTour, deleteExpense, addExpense, updateExpense } from '../../api/expenseService';
import { subscribeToCustomersByTour } from '../../api/customerService';
import { ExpenseCard } from '../../components/ExpenseCard';
import { DatePicker } from '../../components/DatePicker';
import { COLORS, SPACE, ROUNDING, SHADOWS } from '../../theme/Theme';
import { format, startOfDay } from 'date-fns';
import { collection, getDocs, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../api/firebaseConfig';

const expenseSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  description: z.string().min(3, "Description must be at least 3 characters"),
  category: z.string().min(1, "Category is required")
});

const CATEGORIES = ['food', 'water', 'transport', 'accommodation', 'fuel', 'others'];

export const TourDetailScreen = ({ route, navigation }) => {
  const { tourId, tourName, pricePerHead, startDate: paramStartDate, endDate: paramEndDate } = route.params;
  const { user, role } = useAuth();
  
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [tour, setTour] = useState(null);
  
  // Users profiling map (userId -> Name/Email)
  const [usersMap, setUsersMap] = useState({});

  // Form State
  const [modalVisible, setModalVisible] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('others');
  const [addingExpense, setAddingExpense] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStaff, setFilterStaff] = useState('all'); // all, or staff key (uid/email)
  const [filterDate, setFilterDate] = useState(null);
  const [filterMinAmount, setFilterMinAmount] = useState('');
  const [filterMaxAmount, setFilterMaxAmount] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  // Staff summary selection filter
  const [selectedStaffKey, setSelectedStaffKey] = useState(null);

  // Safely parse Firestore/JSON date
  const formatDate = (dateVal) => {
    if (!dateVal) return 'N/A';
    const date = dateVal.toDate ? dateVal.toDate() : new Date(dateVal);
    return isNaN(date.getTime()) ? 'N/A' : format(date, 'dd-MMM-yyyy');
  };

  useEffect(() => {
    if (!user || !tourId) return;

    // Load users collection to get staff names
    const fetchUsers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'users'));
        const uMap = {};
        querySnapshot.forEach(docSnap => {
          uMap[docSnap.id] = docSnap.data().name || docSnap.data().displayName || docSnap.data().email;
        });
        setUsersMap(uMap);
      } catch (err) {
        console.log("Error loading users mappings:", err);
      }
    };
    fetchUsers();

    // Subscribe to Tour document
    const unsubTour = onSnapshot(doc(db, 'tours', tourId), (docSnap) => {
      if (docSnap.exists()) {
        setTour({ id: docSnap.id, ...docSnap.data() });
      }
    });

    // Subscribe to Customers of this Tour
    const unsubCustomers = subscribeToCustomersByTour(tourId, (data, error) => {
      if (!error && data) {
        setCustomers(data);
      }
    });

    // Subscribe to Expenses for this Tour
    const unsubExpenses = subscribeToExpensesByTour(tourId, user.uid, role, (data, error) => {
      if (error) {
        Alert.alert("Database Error", "Check Firebase Rules:\n\n" + error.message);
        setLoading(false);
        return;
      }
      setExpenses(data);
      setLoading(false);
    });

    return () => {
      unsubTour();
      unsubCustomers();
      unsubExpenses();
    };
  }, [user, role, tourId]);

  const handleDelete = (id) => {
    Alert.alert(
      "Delete Expense",
      "Are you sure you want to delete this expense?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            const result = await deleteExpense(id);
            if (!result.success) {
              Alert.alert("Error", "Failed to delete expense");
            }
          }
        }
      ]
    );
  };

  const handleEdit = (expense) => {
    setEditingExpenseId(expense.id);
    setAmount(expense.amount.toString());
    setDescription(expense.description);
    setCategory(expense.category || 'others');
    setModalVisible(true);
  };

  const handleAddNew = () => {
    setEditingExpenseId(null);
    setAmount('');
    setDescription('');
    setCategory('others');
    setModalVisible(true);
  };

  const handleSubmitExpense = async () => {
    try {
      const validatedData = expenseSchema.parse({
        amount: Number(amount),
        description: description.trim(),
        category: category
      });

      setAddingExpense(true);
      
      let result;
      if (editingExpenseId) {
        result = await updateExpense(editingExpenseId, validatedData.amount, validatedData.description, validatedData.category);
      } else {
        result = await addExpense(tourId, user.uid, user.email, validatedData.amount, validatedData.description, validatedData.category);
      }
      
      if (result.success) {
        setModalVisible(false);
        setAmount('');
        setDescription('');
        setCategory('others');
      } else {
        Alert.alert("Error", "Failed to save expense");
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        Alert.alert("Validation Error", error.errors[0].message);
      } else {
        Alert.alert("Error", "An unexpected error occurred");
      }
    } finally {
      setAddingExpense(false);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setFilterStaff('all');
    setFilterDate(null);
    setFilterMinAmount('');
    setFilterMaxAmount('');
    setFilterCategory('all');
    setSelectedStaffKey(null);
  };

  const getStaffName = (userId, email) => {
    if (usersMap[userId]) return usersMap[userId];
    const match = Object.entries(usersMap).find(([_, name]) => name === email);
    if (match) return match[1];

    if (email) {
      const prefix = email.split('@')[0];
      return prefix.charAt(0).toUpperCase() + prefix.slice(1);
    }
    return 'Unknown Staff';
  };

  // 1. Calculate Live Financial Summary Stats
  const livePassengerCount = tour?.passengerCount || 0;
  const liveStartDate = tour?.startDate || paramStartDate;
  const liveEndDate = tour?.endDate || paramEndDate;

  const totalRevenue = customers.reduce((sum, c) => sum + (c.totalAmount || 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const pendingCollection = customers.reduce((sum, c) => sum + (c.dueAmount || 0), 0);

  // 2. Group Expenses by Staff to Generate Summaries
  const staffSummariesMap = expenses.reduce((acc, exp) => {
    const key = exp.userId || exp.userEmail || 'unknown';
    if (!acc[key]) {
      acc[key] = {
        key,
        userId: exp.userId,
        userEmail: exp.userEmail,
        staffName: getStaffName(exp.userId, exp.userEmail),
        totalAmount: 0,
        entriesCount: 0
      };
    }
    acc[key].totalAmount += exp.amount || 0;
    acc[key].entriesCount += 1;
    return acc;
  }, {});
  const staffSummaries = Object.values(staffSummariesMap);

  // 3. Client Side Search & Filter
  const filteredExpenses = expenses.filter(exp => {
    const staffName = getStaffName(exp.userId, exp.userEmail).toLowerCase();
    const description = (exp.description || '').toLowerCase();
    const amountStr = String(exp.amount || '');
    const q = searchQuery.toLowerCase().trim();

    // Search Box
    const matchesSearch = 
      staffName.includes(q) || 
      description.includes(q) || 
      amountStr.includes(q) || 
      q === '';

    // Clicked Staff Summary Filter
    let matchesSelectedStaff = true;
    if (selectedStaffKey) {
      const key = exp.userId || exp.userEmail || 'unknown';
      matchesSelectedStaff = key === selectedStaffKey;
    }

    // Filter staff dropdown/toggle
    let matchesFilterStaff = true;
    if (filterStaff !== 'all') {
      const key = exp.userId || exp.userEmail || 'unknown';
      matchesFilterStaff = key === filterStaff;
    }

    // Filter date
    let matchesDate = true;
    if (filterDate && exp.createdAt) {
      const fDate = startOfDay(new Date(filterDate)).getTime();
      const expDate = startOfDay(exp.createdAt.toDate ? exp.createdAt.toDate() : new Date(exp.createdAt.seconds * 1000)).getTime();
      matchesDate = fDate === expDate;
    }

    // Filter Min/Max Amount
    let matchesMin = true;
    if (filterMinAmount) {
      const min = Number(filterMinAmount);
      if (!isNaN(min)) matchesMin = (exp.amount || 0) >= min;
    }
    let matchesMax = true;
    if (filterMaxAmount) {
      const max = Number(filterMaxAmount);
      if (!isNaN(max)) matchesMax = (exp.amount || 0) <= max;
    }

    // Filter Category
    let matchesCategory = true;
    if (filterCategory !== 'all') {
      matchesCategory = (exp.category || '').toLowerCase() === filterCategory.toLowerCase();
    }

    return matchesSearch && matchesSelectedStaff && matchesFilterStaff && matchesDate && matchesMin && matchesMax && matchesCategory;
  });

  const filteredExpensesTotal = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const isFiltered = selectedStaffKey !== null || searchQuery !== '' || filterStaff !== 'all' || filterDate !== null || filterMinAmount !== '' || filterMaxAmount !== '' || filterCategory !== 'all';

  const renderHeader = () => {
    return (
      <View>
        {/* Section 6: Tour Details Header Card */}
        <View style={styles.tourDetailsHeaderCard}>
          <LinearGradient colors={['#ffffff', '#f8fafc']} style={styles.headerDetailsGradient}>
            <Text style={styles.headerTourName}>{tour?.name || tourName}</Text>
            <Text style={styles.headerTourDates}>
              {formatDate(liveStartDate)} → {formatDate(liveEndDate)}
            </Text>
            
            <View style={styles.headerGrid}>
              <View style={styles.gridCol}>
                <Text style={styles.gridLabel}>Passengers</Text>
                <Text style={styles.gridValue}>{livePassengerCount}</Text>
              </View>
              <View style={styles.gridCol}>
                <Text style={styles.gridLabel}>Revenue</Text>
                <Text style={[styles.gridValue, { color: COLORS.success }]}>₹{totalRevenue.toLocaleString('en-IN')}</Text>
              </View>
              <View style={styles.gridCol}>
                <Text style={styles.gridLabel}>Expenses</Text>
                <Text style={[styles.gridValue, { color: COLORS.danger }]}>₹{totalExpenses.toLocaleString('en-IN')}</Text>
              </View>
              <View style={styles.gridCol}>
                <Text style={styles.gridLabel}>Pending Amount</Text>
                <Text style={[styles.gridValue, { color: '#eab308' }]}>₹{pendingCollection.toLocaleString('en-IN')}</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Total Expenses Card */}
        <View style={styles.summaryCard}>
          <LinearGradient colors={[COLORS.primary, COLORS.secondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.summaryGradient}>
            <Text style={styles.summaryTitle}>{isFiltered ? 'Filtered Expenses' : 'Total Expenses'}</Text>
            <Text style={styles.summaryAmount}>₹ {filteredExpensesTotal.toFixed(2)}</Text>
          </LinearGradient>
        </View>

        {/* Section 2 & Staff Click Action: Staff Summaries List */}
        {!selectedStaffKey && (
          <View style={styles.staffSummarySection}>
            <Text style={styles.sectionTitle}>Staff Summary</Text>
            {staffSummaries.length === 0 ? (
              <Text style={styles.emptyTextCompact}>No staff expenses logged.</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.staffScroll}>
                {staffSummaries.map((summary) => (
                  <TouchableOpacity
                    key={summary.key}
                    style={styles.staffCard}
                    onPress={() => setSelectedStaffKey(summary.key)}
                  >
                    <View style={styles.staffCardHeader}>
                      <User size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
                      <Text style={styles.staffCardName}>{summary.staffName}</Text>
                    </View>
                    <Text style={styles.staffCardDetail}>Total: <Text style={styles.staffCardTotal}>₹{summary.totalAmount.toLocaleString('en-IN')}</Text></Text>
                    <Text style={styles.staffCardDetail}>Entries: <Text style={styles.staffCardEntries}>{summary.entriesCount}</Text></Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        )}

        {/* Staff Selection Title with Clear Action */}
        {selectedStaffKey && (
          <View style={styles.selectedStaffHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <User size={20} color={COLORS.primary} style={{ marginRight: 6 }} />
              <Text style={styles.selectedStaffTitle}>
                {staffSummariesMap[selectedStaffKey]?.staffName || 'Staff'} Expenses
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.selectedStaffClearBtn} 
              onPress={() => setSelectedStaffKey(null)}
            >
              <X size={16} color={COLORS.danger} style={{ marginRight: 4 }} />
              <Text style={styles.selectedStaffClearText}>Clear Filter</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Real-time Search & Filters Panel Trigger */}
        <View style={styles.searchFilterContainer}>
          <View style={styles.searchBar}>
            <Search size={18} color={COLORS.textLight} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search staff, description, amount..."
              placeholderTextColor={COLORS.textLight}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity 
            style={[styles.filterToggleBtn, showFilters && styles.filterToggleBtnActive]} 
            onPress={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal size={18} color={showFilters ? COLORS.white : COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Filters Panel */}
        {showFilters && (
          <View style={styles.filterPanel}>
            <View style={styles.filterPanelHeader}>
              <Text style={styles.filterPanelTitle}>Filters</Text>
              <TouchableOpacity style={styles.resetBtn} onPress={handleResetFilters}>
                <RotateCcw size={14} color={COLORS.danger} style={{ marginRight: 4 }} />
                <Text style={styles.resetText}>Reset All</Text>
              </TouchableOpacity>
            </View>

            {/* Staff Dropdown Filter */}
            <Text style={styles.filterLabel}>Filter by Staff</Text>
            <View style={styles.statusPills}>
              <TouchableOpacity
                style={[styles.statusPill, filterStaff === 'all' && styles.statusPillActive]}
                onPress={() => setFilterStaff('all')}
              >
                <Text style={[styles.statusPillText, filterStaff === 'all' && styles.statusPillTextActive]}>ALL STAFF</Text>
              </TouchableOpacity>
              {staffSummaries.map((s) => (
                <TouchableOpacity
                  key={s.key}
                  style={[styles.statusPill, filterStaff === s.key && styles.statusPillActive]}
                  onPress={() => setFilterStaff(s.key)}
                >
                  <Text style={[styles.statusPillText, filterStaff === s.key && styles.statusPillTextActive]}>
                    {s.staffName.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Date Picker */}
            <DatePicker
              label="Expense Date"
              value={filterDate}
              onChange={setFilterDate}
              placeholder="Filter by Date"
              allowClear={true}
            />

            {/* Amount Range */}
            <Text style={styles.filterLabel}>Amount Range (₹)</Text>
            <View style={styles.amountRangeRow}>
              <TextInput
                style={styles.amountRangeInput}
                placeholder="Min Amount"
                placeholderTextColor={COLORS.textLight}
                value={filterMinAmount}
                onChangeText={setFilterMinAmount}
                keyboardType="numeric"
              />
              <Text style={styles.amountRangeSeparator}>to</Text>
              <TextInput
                style={styles.amountRangeInput}
                placeholder="Max Amount"
                placeholderTextColor={COLORS.textLight}
                value={filterMaxAmount}
                onChangeText={setFilterMaxAmount}
                keyboardType="numeric"
              />
            </View>

            {/* Category Filter */}
            <Text style={styles.filterLabel}>Expense Category</Text>
            <View style={styles.statusPills}>
              <TouchableOpacity
                style={[styles.statusPill, filterCategory === 'all' && styles.statusPillActive]}
                onPress={() => setFilterCategory('all')}
              >
                <Text style={[styles.statusPillText, filterCategory === 'all' && styles.statusPillTextActive]}>ALL</Text>
              </TouchableOpacity>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.statusPill, filterCategory === cat && styles.statusPillActive]}
                  onPress={() => setFilterCategory(cat)}
                >
                  <Text style={[styles.statusPillText, filterCategory === cat && styles.statusPillTextActive]}>
                    {cat.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <Text style={[styles.sectionTitle, { marginHorizontal: SPACE.md, marginTop: SPACE.md, marginBottom: SPACE.xs }]}>
          Expenses List
        </Text>
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
      <LinearGradient colors={[COLORS.background, '#f1f5f9']} style={StyleSheet.absoluteFillObject} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft color={COLORS.text} size={28} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.greeting} numberOfLines={1}>{tour?.name || tourName}</Text>
          <Text style={styles.subtitle}>All Tour Expenses</Text>
        </View>
        <TouchableOpacity 
          onPress={() => navigation.navigate('CustomerList', { tourId, tourName, pricePerHead, startDate: liveStartDate, endDate: liveEndDate })} 
          style={styles.customerBtn}
        >
          <Users color={COLORS.primary} size={28} />
        </TouchableOpacity>
      </View>

      {/* Main List */}
      <FlatList
        data={filteredExpenses}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={renderHeader}
        renderItem={({ item }) => (
          <ExpenseCard expense={item} isAdmin={true} onDelete={handleDelete} onEdit={handleEdit} />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No expenses logged matching search.</Text>
          </View>
        }
      />

      {/* Modal for Add / Edit */}
      <Modal visible={modalVisible} transparent={true} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalContainer}>
             <View style={styles.formCard}>
               <View style={styles.modalHeader}>
                 <Text style={styles.formTitle}>{editingExpenseId ? 'Edit Expense' : 'Add New Expense'}</Text>
                 <TouchableOpacity onPress={() => setModalVisible(false)}>
                   <Text style={styles.closeText}>Cancel</Text>
                 </TouchableOpacity>
               </View>
               
               <Text style={styles.formLabel}>Amount (₹)</Text>
               <View style={styles.inputRow}>
                 <TextInput
                   style={[styles.input, { flex: 1 }]} placeholder="Amount (₹)" placeholderTextColor={COLORS.textLight}
                   keyboardType="numeric" value={amount} onChangeText={setAmount}
                 />
               </View>

               <Text style={styles.formLabel}>Description</Text>
               <TextInput
                 style={styles.input} placeholder="Description (e.g. Flight, Food, etc.)" placeholderTextColor={COLORS.textLight}
                 value={description} onChangeText={setDescription}
               />

               {/* New Category Selector */}
               <Text style={styles.formLabel}>Category</Text>
               <View style={styles.categoryPickerRow}>
                 {CATEGORIES.map((cat) => (
                   <TouchableOpacity
                     key={cat}
                     style={[styles.catBtn, category === cat && styles.catBtnActive]}
                     onPress={() => setCategory(cat)}
                   >
                     <Text style={[styles.catBtnText, category === cat && styles.catBtnTextActive]}>
                       {cat.toUpperCase()}
                     </Text>
                   </TouchableOpacity>
                 ))}
               </View>
               
               <TouchableOpacity style={styles.submitButton} onPress={handleSubmitExpense} disabled={addingExpense}>
                 <LinearGradient colors={[COLORS.primary, COLORS.secondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.submitGradient}>
                   {addingExpense ? (
                     <ActivityIndicator color={COLORS.white} size="small" />
                   ) : (
                     <><Plus color={COLORS.white} size={20} /><Text style={styles.submitText}>{editingExpenseId ? 'Update Expense' : 'Submit Expense'}</Text></>
                   )}
                 </LinearGradient>
               </TouchableOpacity>
             </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {(role === 'admin' || role === 'manager') && (
        <TouchableOpacity style={styles.fab} onPress={handleAddNew}>
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
  customerBtn: { padding: SPACE.xs, marginLeft: SPACE.sm },
  greeting: { fontSize: 24, fontWeight: 'bold', color: COLORS.text },
  subtitle: { fontSize: 14, color: COLORS.textLight },
  
  // Section 6: Tour Details Header Layout
  tourDetailsHeaderCard: {
    marginHorizontal: SPACE.md,
    marginTop: SPACE.xs,
    marginBottom: SPACE.sm,
    borderRadius: ROUNDING.lg,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    ...SHADOWS.glass,
  },
  headerDetailsGradient: {
    padding: SPACE.md,
  },
  headerTourName: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 2,
  },
  headerTourDates: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: SPACE.md,
  },
  headerGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: SPACE.sm,
  },
  gridCol: {
    flex: 1,
    alignItems: 'center',
  },
  gridLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textLight,
    marginBottom: 2,
    textAlign: 'center',
  },
  gridValue: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
  },

  summaryCard: { marginHorizontal: SPACE.md, marginBottom: SPACE.md, borderRadius: ROUNDING.lg, ...SHADOWS.glass, overflow: 'hidden' },
  summaryGradient: { padding: SPACE.lg, alignItems: 'center' },
  summaryTitle: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '500', marginBottom: SPACE.xs },
  summaryAmount: { color: COLORS.white, fontSize: 28, fontWeight: 'bold' },
  
  // Section 2: Staff Summary Layout
  staffSummarySection: {
    marginHorizontal: SPACE.md,
    marginBottom: SPACE.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACE.sm,
  },
  staffScroll: {
    paddingBottom: SPACE.xs,
    gap: SPACE.sm,
  },
  staffCard: {
    width: 150,
    backgroundColor: COLORS.white,
    padding: SPACE.md,
    borderRadius: ROUNDING.md,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...SHADOWS.glass,
  },
  staffCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACE.xs,
  },
  staffCardName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  staffCardDetail: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  staffCardTotal: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  staffCardEntries: {
    color: COLORS.text,
    fontWeight: '700',
  },
  emptyTextCompact: {
    fontSize: 13,
    color: COLORS.textLight,
    fontStyle: 'italic',
    marginBottom: SPACE.sm,
  },

  // Click Action Selected Staff Header
  selectedStaffHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: SPACE.md,
    marginBottom: SPACE.md,
    backgroundColor: '#e0e7ff',
    padding: SPACE.md,
    borderRadius: ROUNDING.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  selectedStaffTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  selectedStaffClearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACE.sm,
    paddingVertical: 4,
    borderRadius: ROUNDING.sm,
    borderWidth: 0.5,
    borderColor: COLORS.danger,
  },
  selectedStaffClearText: {
    fontSize: 12,
    color: COLORS.danger,
    fontWeight: '700',
  },

  // Filters Panel and Search Styles
  searchFilterContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACE.md,
    gap: SPACE.sm,
    alignItems: 'center',
    marginBottom: SPACE.xs,
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
    height: 44,
    ...SHADOWS.glass,
  },
  searchIcon: { marginRight: SPACE.xs },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text },
  filterToggleBtn: {
    width: 44,
    height: 44,
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
  filterPanelTitle: { fontSize: 15, fontWeight: 'bold', color: COLORS.text },
  resetBtn: { flexDirection: 'row', alignItems: 'center' },
  resetText: { fontSize: 12, color: COLORS.danger, fontWeight: '600' },
  filterLabel: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 6, marginTop: SPACE.xs },
  
  statusPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: SPACE.sm, marginTop: 2 },
  statusPill: {
    paddingVertical: 6, paddingHorizontal: 10,
    borderRadius: ROUNDING.full, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc',
  },
  statusPillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  statusPillText: { fontSize: 10, fontWeight: '700', color: COLORS.textLight },
  statusPillTextActive: { color: COLORS.white },

  amountRangeRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, marginBottom: SPACE.sm },
  amountRangeInput: {
    flex: 1, backgroundColor: '#f8fafc', padding: 8, borderRadius: ROUNDING.sm,
    borderWidth: 1, borderColor: '#e2e8f0', fontSize: 14, color: COLORS.text
  },
  amountRangeSeparator: { fontSize: 14, color: COLORS.textLight, fontWeight: '600' },

  // Modal / Form Styles
  formCard: { backgroundColor: COLORS.white, padding: SPACE.md, borderTopLeftRadius: ROUNDING.xl, borderTopRightRadius: ROUNDING.xl },
  formTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: SPACE.sm },
  formLabel: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  inputRow: { flexDirection: 'row', marginBottom: SPACE.sm },
  input: { backgroundColor: '#f8fafc', padding: SPACE.md, borderRadius: ROUNDING.md, fontSize: 16, color: COLORS.text, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: SPACE.sm },
  
  categoryPickerRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: SPACE.md, marginTop: 4,
    backgroundColor: '#f8fafc', padding: 6, borderRadius: ROUNDING.md, borderWidth: 1, borderColor: '#e2e8f0'
  },
  catBtn: {
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: ROUNDING.sm,
    backgroundColor: COLORS.white, borderWidth: 1, borderColor: '#e2e8f0',
  },
  catBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  catBtnText: { fontSize: 10, fontWeight: '700', color: COLORS.textLight },
  catBtnTextActive: { color: COLORS.white },

  submitButton: { borderRadius: ROUNDING.md, overflow: 'hidden', marginTop: SPACE.xs },
  submitGradient: { padding: SPACE.md, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: SPACE.sm },
  submitText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
  
  listContainer: { paddingBottom: SPACE.xl * 4 },
  emptyContainer: { alignItems: 'center', marginTop: SPACE.xl * 2 },
  emptyText: { color: COLORS.textLight, fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: { width: '100%', paddingBottom: Platform.OS === 'ios' ? SPACE.xl : SPACE.md, backgroundColor: COLORS.white, borderTopLeftRadius: ROUNDING.xl, borderTopRightRadius: ROUNDING.xl },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACE.md },
  closeText: { color: COLORS.danger, fontSize: 16, fontWeight: '500' },
  fab: { position: 'absolute', bottom: SPACE.xl, right: SPACE.md, width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', ...SHADOWS.glass, elevation: 8, shadowColor: COLORS.primary, shadowOpacity: 0.3 },
  fabGradient: { width: '100%', height: '100%', borderRadius: 30, justifyContent: 'center', alignItems: 'center' }
});

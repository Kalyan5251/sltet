import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert, TouchableOpacity, KeyboardAvoidingView, Platform, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus, ChevronLeft, Users } from 'lucide-react-native';
import { z } from 'zod';
import { useAuth } from '../../context/AuthContext';
import { subscribeToExpensesByTour, deleteExpense, addExpense, updateExpense } from '../../api/expenseService';
import { ExpenseCard } from '../../components/ExpenseCard';
import { COLORS, SPACE, ROUNDING, SHADOWS } from '../../theme/Theme';

const expenseSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  description: z.string().min(3, "Description must be at least 3 characters")
});

export const TourDetailScreen = ({ route, navigation }) => {
  const { tourId, tourName, pricePerHead } = route.params;
  const { user, role } = useAuth();
  
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [modalVisible, setModalVisible] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [addingExpense, setAddingExpense] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState(null);

  useEffect(() => {
    if (!user || !tourId) return;
    
    // Admin subscribing to expenses FOR THIS TOUR
    const unsubscribe = subscribeToExpensesByTour(tourId, user.uid, role, (data, error) => {
      if (error) {
        Alert.alert("Database Error", "Check Firebase Rules:\n\n" + error.message);
        setLoading(false);
        return;
      }
      setExpenses(data);
      setLoading(false);
    });

    return () => unsubscribe();
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
    setModalVisible(true);
  };

  const handleAddNew = () => {
    setEditingExpenseId(null);
    setAmount('');
    setDescription('');
    setModalVisible(true);
  };

  const handleSubmitExpense = async () => {
    try {
      const validatedData = expenseSchema.parse({
        amount: Number(amount),
        description: description.trim()
      });

      setAddingExpense(true);
      
      let result;
      if (editingExpenseId) {
        result = await updateExpense(editingExpenseId, validatedData.amount, validatedData.description);
      } else {
        result = await addExpense(tourId, user.uid, user.email, validatedData.amount, validatedData.description);
      }
      
      if (result.success) {
        setModalVisible(false);
        setAmount('');
        setDescription('');
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

  const totalAmount = expenses.reduce((sum, item) => sum + (item.amount || 0), 0);

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
          <Text style={styles.greeting} numberOfLines={1}>{tourName}</Text>
          <Text style={styles.subtitle}>All Tour Expenses</Text>
        </View>
        <TouchableOpacity 
          onPress={() => navigation.navigate('CustomerList', { tourId, tourName, pricePerHead })} 
          style={styles.customerBtn}
        >
          <Users color={COLORS.primary} size={28} />
        </TouchableOpacity>
      </View>

      <View style={styles.summaryCard}>
        <LinearGradient colors={[COLORS.primary, COLORS.secondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.summaryGradient}>
          <Text style={styles.summaryTitle}>Total Expenses</Text>
          <Text style={styles.summaryAmount}>₹ {totalAmount.toFixed(2)}</Text>
        </LinearGradient>
      </View>

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
               
               <View style={styles.inputRow}>
                 <TextInput
                   style={[styles.input, { flex: 1 }]} placeholder="Amount (₹)" placeholderTextColor={COLORS.textLight}
                   keyboardType="numeric" value={amount} onChangeText={setAmount}
                 />
               </View>
               <TextInput
                 style={styles.input} placeholder="Description (e.g. Flight, Food, etc.)" placeholderTextColor={COLORS.textLight}
                 value={description} onChangeText={setDescription}
               />
               
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

      <FlatList
        data={expenses} keyExtractor={item => item.id} contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <ExpenseCard expense={item} isAdmin={true} onDelete={handleDelete} onEdit={handleEdit} />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No expenses logged in this tour.</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={handleAddNew}>
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
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACE.md, paddingTop: SPACE.md, marginBottom: SPACE.md },
  backBtn: { padding: SPACE.xs, marginRight: SPACE.sm },
  headerTitleContainer: { flex: 1 },
  customerBtn: { padding: SPACE.xs, marginLeft: SPACE.sm },
  greeting: { fontSize: 24, fontWeight: 'bold', color: COLORS.text },
  subtitle: { fontSize: 14, color: COLORS.textLight },
  summaryCard: { marginHorizontal: SPACE.md, marginBottom: SPACE.lg, borderRadius: ROUNDING.lg, ...SHADOWS.glass, overflow: 'hidden' },
  summaryGradient: { padding: SPACE.xl, alignItems: 'center' },
  summaryTitle: { color: 'rgba(255,255,255,0.8)', fontSize: 16, fontWeight: '500', marginBottom: SPACE.xs },
  summaryAmount: { color: COLORS.white, fontSize: 32, fontWeight: 'bold' },
  formCard: { backgroundColor: COLORS.white, padding: SPACE.md, borderTopLeftRadius: ROUNDING.xl, borderTopRightRadius: ROUNDING.xl },
  formTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: SPACE.sm },
  inputRow: { flexDirection: 'row', marginBottom: SPACE.sm },
  input: { backgroundColor: '#f8fafc', padding: SPACE.md, borderRadius: ROUNDING.md, fontSize: 16, color: COLORS.text, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: SPACE.sm },
  submitButton: { borderRadius: ROUNDING.md, overflow: 'hidden', marginTop: SPACE.xs },
  submitGradient: { padding: SPACE.md, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: SPACE.sm },
  submitText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
  listContainer: { paddingBottom: SPACE.xl * 4 },
  emptyContainer: { alignItems: 'center', marginTop: SPACE.xl * 2 },
  emptyText: { color: COLORS.textLight, fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: { width: '100%', paddingBottom: Platform.OS === 'ios' ? SPACE.xl : SPACE.md, backgroundColor: COLORS.white, borderTopLeftRadius: ROUNDING.xl, borderTopRightRadius: ROUNDING.xl },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACE.md },
  closeText: { color: COLORS.danger, fontSize: 16, fontWeight: '500' },
  fab: { position: 'absolute', bottom: SPACE.xl, right: SPACE.md, width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', ...SHADOWS.glass, elevation: 8, shadowColor: COLORS.primary, shadowOpacity: 0.3 },
  fabGradient: { width: '100%', height: '100%', borderRadius: 30, justifyContent: 'center', alignItems: 'center' }
});

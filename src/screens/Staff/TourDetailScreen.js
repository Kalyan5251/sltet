import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus, ChevronLeft, Users } from 'lucide-react-native';
import { z } from 'zod';
import { useAuth } from '../../context/AuthContext';
import { subscribeToExpensesByTour, addExpense } from '../../api/expenseService';
import { ExpenseCard } from '../../components/ExpenseCard';
import { COLORS, SPACE, ROUNDING, SHADOWS } from '../../theme/Theme';

const expenseSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  description: z.string().min(3, "Description must be at least 3 characters"),
  category: z.string().min(1, "Category is required")
});

const CATEGORIES = ['food', 'water', 'transport', 'accommodation', 'fuel', 'others'];

export const TourDetailScreen = ({ route, navigation }) => {
  const { tourId, tourName, pricePerHead } = route.params;
  const { user, role } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('others');
  const [addingExpense, setAddingExpense] = useState(false);

  useEffect(() => {
    if (!user || !tourId) return;
    
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

  const handleAddExpense = async () => {
    try {
      const validatedData = expenseSchema.parse({
        amount: Number(amount),
        description: description.trim(),
        category: category
      });

      setAddingExpense(true);
      const result = await addExpense(tourId, user.uid, user.email, validatedData.amount, validatedData.description, validatedData.category);
      
      if (result.success) {
        setAmount('');
        setDescription('');
        setCategory('others');
      } else {
        Alert.alert("Error", "Failed to add expense");
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
          <Text style={styles.subtitle}>My Expenses</Text>
        </View>
        <TouchableOpacity 
          onPress={() => navigation.navigate('CustomerList', { tourId, tourName, pricePerHead })} 
          style={styles.customerBtn}
        >
          <Users color={COLORS.primary} size={28} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.formContainer}>
         <View style={styles.formCard}>
           <Text style={styles.formTitle}>Add Expense for {tourName}</Text>
           
           <View style={styles.inputRow}>
             <TextInput
               style={[styles.input, { flex: 1 }]} placeholder="Amount (₹)" placeholderTextColor={COLORS.textLight}
               keyboardType="numeric" value={amount} onChangeText={setAmount}
             />
           </View>
           
           <TextInput
             style={styles.input} placeholder="Description (e.g. Lunch)" placeholderTextColor={COLORS.textLight}
             value={description} onChangeText={setDescription}
           />

           {/* Category Selection */}
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
           
           <TouchableOpacity style={styles.submitButton} onPress={handleAddExpense} disabled={addingExpense}>
             <LinearGradient colors={[COLORS.primary, COLORS.secondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.submitGradient}>
               {addingExpense ? (
                 <ActivityIndicator color={COLORS.white} size="small" />
               ) : (
                 <><Plus color={COLORS.white} size={20} /><Text style={styles.submitText}>Submit</Text></>
               )}
             </LinearGradient>
           </TouchableOpacity>
         </View>
      </KeyboardAvoidingView>

      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>My Recent Expenses</Text>
      </View>

      <FlatList
        data={expenses}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
           <ExpenseCard expense={item} isAdmin={false} />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>You haven't logged any expenses yet.</Text>
          </View>
        }
      />
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
  formContainer: { marginHorizontal: SPACE.md, marginBottom: SPACE.md },
  formCard: { backgroundColor: COLORS.white, padding: SPACE.md, borderRadius: ROUNDING.lg, ...SHADOWS.glass, borderWidth: 1, borderColor: '#e2e8f0' },
  formTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: SPACE.sm },
  formLabel: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  inputRow: { flexDirection: 'row', marginBottom: SPACE.sm },
  input: { backgroundColor: '#f8fafc', padding: SPACE.sm + 2, borderRadius: ROUNDING.sm, fontSize: 15, color: COLORS.text, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: SPACE.sm },
  
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
  listHeader: { paddingHorizontal: SPACE.md, paddingVertical: SPACE.sm },
  listTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  listContainer: { paddingBottom: SPACE.xl },
  emptyContainer: { alignItems: 'center', marginTop: SPACE.xl },
  emptyText: { color: COLORS.textLight, fontSize: 16 }
});

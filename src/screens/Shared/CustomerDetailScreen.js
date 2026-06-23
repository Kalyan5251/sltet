import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Plus, IndianRupee, User, Star } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { subscribeToMembersByCustomer } from '../../api/memberService';
import { subscribeToPaymentsByCustomer, addPayment } from '../../api/paymentService';
import { COLORS, SPACE, ROUNDING, SHADOWS } from '../../theme/Theme';
import { format } from 'date-fns';

export const CustomerDetailScreen = ({ route, navigation }) => {
  const { customer, tourName } = route.params;
  const { user } = useAuth();
  
  const [members, setMembers] = useState([]);
  const [payments, setPayments] = useState([]);
  
  // Notice we must use the LIVE values of due/paid from the customer updates via another listener or just trust the DB since it triggers a re-render if we were capturing the customer LIVE.
  // To keep it clean without excessive reads, we will update the local state optimistically or listen.
  const [currentPaid, setCurrentPaid] = useState(customer.paidAmount || 0);
  const [currentDue, setCurrentDue] = useState(customer.dueAmount || 0);

  const [paymentAmount, setPaymentAmount] = useState('');
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    const unsubMembers = subscribeToMembersByCustomer(customer.id, (data) => {
      if (data) setMembers(data);
    });
    
    const unsubPayments = subscribeToPaymentsByCustomer(customer.id, (data) => {
      if (data) {
        setPayments(data);
        // Recalculate cleanly based on verified payments
        const totPaid = data.reduce((sum, p) => sum + (p.amount || 0), 0);
        setCurrentPaid(totPaid);
        setCurrentDue(customer.totalAmount - totPaid);
      }
    });

    return () => {
      unsubMembers();
      unsubPayments();
    };
  }, [customer.id, customer.totalAmount]);

  const handleAddPayment = async () => {
    const amt = Number(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      return Alert.alert("Invalid Input", "Please enter a valid amount.");
    }
    if (amt > currentDue) {
      return Alert.alert("Invalid Amount", "Payment cannot exceed due amount.");
    }

    setPaying(true);
    const result = await addPayment(customer.id, amt, currentDue, currentPaid, user.email || user.uid);
    if (result.success) {
      setPaymentAmount('');
    } else {
      Alert.alert("Error", result.error?.message || "Failed to add payment.");
    }
    setPaying(false);
  };

  const renderPayment = ({ item }) => {
    const d = item.createdAt?.seconds ? format(new Date(item.createdAt.seconds * 1000), 'MMM dd, yyyy hh:mm a') : 'Just now';
    return (
      <View style={styles.paymentCard}>
        <View>
          <Text style={styles.payAmount}>₹{item.amount}</Text>
          <Text style={styles.payDate}>{d}</Text>
        </View>
        <Text style={styles.payUser}>{item.addedBy?.substring(0, 12)}...</Text>
      </View>
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
          <Text style={styles.greeting} numberOfLines={1}>{customer.headMemberName}'s Group</Text>
          <Text style={styles.subtitle}>{tourName}</Text>
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          
          {/* Financial Summary */}
          <LinearGradient colors={[COLORS.primary, COLORS.secondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.summaryCard}>
            <View style={styles.sumRow}>
              <Text style={styles.sumLabel}>Total Package</Text>
              <Text style={styles.sumValue}>₹{customer.totalAmount}</Text>
            </View>
            <View style={styles.sumRow}>
              <Text style={styles.sumLabel}>Paid Amount</Text>
              <Text style={styles.sumValue}>₹{currentPaid}</Text>
            </View>
            <View style={[styles.sumRow, { borderBottomWidth: 0, marginTop: SPACE.sm, paddingTop: SPACE.sm, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)' }]}>
              <Text style={styles.sumLabelDue}>Due Amount</Text>
              <Text style={styles.sumValueDue}>₹{currentDue}</Text>
            </View>
          </LinearGradient>

          {/* Add Payment Form */}
          {currentDue > 0 ? (
            <View style={styles.paymentForm}>
              <Text style={styles.sectionTitle}>Add Payment</Text>
              <View style={styles.payInputRow}>
                <TextInput
                  style={styles.payInput}
                  placeholder={`Amount (Max: ₹${currentDue})`}
                  keyboardType="numeric"
                  value={paymentAmount}
                  onChangeText={setPaymentAmount}
                />
                <TouchableOpacity onPress={handleAddPayment} disabled={paying} style={styles.payBtn}>
                  {paying ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.payBtnText}>Pay</Text>}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.fullyPaid}>
              <CheckCircle color={COLORS.success} size={24} style={{ marginRight: SPACE.sm }} />
              <Text style={styles.fullyPaidText}>Fully Paid</Text>
            </View>
          )}

          {/* Members List */}
          <Text style={styles.sectionTitle}>Members ({members.length})</Text>
          <View style={styles.membersContainer}>
            {members.length === 0 ? <ActivityIndicator color={COLORS.primary} /> : members.map((m) => (
              <View key={m.id} style={styles.memberRow}>
                <View style={styles.memberAvatar}>
                  <User color={COLORS.white} size={20} />
                </View>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{m.name}</Text>
                  <Text style={styles.memberMeta}>{m.age} yrs • {m.gender.toUpperCase()}</Text>
                </View>
                {m.id === customer.headMemberId && (
                  <View style={styles.headBadge}>
                    <Star color={COLORS.white} size={12} style={{ marginRight: 2 }} />
                    <Text style={styles.headBadgeText}>Head</Text>
                  </View>
                )}
              </View>
            ))}
          </View>

          {/* Payment History */}
          <Text style={styles.sectionTitle}>Payment History</Text>
          {payments.length === 0 ? (
            <Text style={styles.emptyText}>No payments made yet.</Text>
          ) : (
            payments.map(p => <View key={p.id}>{renderPayment({item: p})}</View>)
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACE.md, paddingTop: SPACE.md, marginBottom: SPACE.md },
  backBtn: { padding: SPACE.xs, marginRight: SPACE.sm },
  headerTitleContainer: { flex: 1 },
  greeting: { fontSize: 24, fontWeight: 'bold', color: COLORS.text },
  subtitle: { fontSize: 14, color: COLORS.textLight },
  scrollContainer: { padding: SPACE.md, paddingBottom: SPACE.xl * 3 },
  
  summaryCard: { padding: SPACE.lg, borderRadius: ROUNDING.lg, marginBottom: SPACE.xl, ...SHADOWS.glass },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACE.sm },
  sumLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '500' },
  sumValue: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
  sumLabelDue: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
  sumValueDue: { color: COLORS.white, fontSize: 24, fontWeight: 'bold' },

  paymentForm: { backgroundColor: COLORS.white, padding: SPACE.md, borderRadius: ROUNDING.md, marginBottom: SPACE.xl, ...SHADOWS.glass },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginBottom: SPACE.md },
  payInputRow: { flexDirection: 'row', gap: SPACE.sm },
  payInput: { flex: 1, backgroundColor: '#f8fafc', padding: SPACE.md, borderRadius: ROUNDING.sm, borderWidth: 1, borderColor: '#e2e8f0', fontSize: 16 },
  payBtn: { backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', paddingHorizontal: SPACE.xl, borderRadius: ROUNDING.sm },
  payBtnText: { color: COLORS.white, fontWeight: 'bold', fontSize: 16 },
  
  fullyPaid: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ecfdf5', padding: SPACE.lg, borderRadius: ROUNDING.md, marginBottom: SPACE.xl, borderWidth: 1, borderColor: '#a7f3d0' },
  fullyPaidText: { color: COLORS.success, fontSize: 18, fontWeight: 'bold' },

  membersContainer: { backgroundColor: COLORS.white, borderRadius: ROUNDING.md, padding: SPACE.sm, marginBottom: SPACE.xl, ...SHADOWS.glass },
  memberRow: { flexDirection: 'row', alignItems: 'center', padding: SPACE.sm, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  memberAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.secondary, justifyContent: 'center', alignItems: 'center', marginRight: SPACE.md },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  memberMeta: { fontSize: 12, color: COLORS.textLight },
  headBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, paddingHorizontal: SPACE.sm, paddingVertical: 4, borderRadius: ROUNDING.full },
  headBadgeText: { color: COLORS.white, fontSize: 10, fontWeight: 'bold' },

  paymentCard: { backgroundColor: COLORS.white, borderRadius: ROUNDING.sm, padding: SPACE.md, marginBottom: SPACE.sm, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  payAmount: { fontSize: 16, fontWeight: 'bold', color: COLORS.text, marginBottom: 2 },
  payDate: { fontSize: 12, color: COLORS.textLight },
  payUser: { fontSize: 12, color: COLORS.secondary, fontWeight: '500' },
  emptyText: { color: COLORS.textLight, fontStyle: 'italic' }
});

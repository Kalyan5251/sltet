import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Plus, IndianRupee, User, Star, CheckCircle, Trash2 } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { subscribeToMembersByCustomer } from '../../api/memberService';
import { subscribeToPaymentsByCustomer, addPayment, deletePayment } from '../../api/paymentService';
import { COLORS, SPACE, ROUNDING, SHADOWS } from '../../theme/Theme';
import { format } from 'date-fns';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../../api/firebaseConfig';

export const CustomerDetailScreen = ({ route, navigation }) => {
  const { customer, tourName } = route.params;
  const { user, role } = useAuth();
  
  const [liveCustomer, setLiveCustomer] = useState(customer);
  const [members, setMembers] = useState([]);
  const [payments, setPayments] = useState([]);

  // Add Payment Form State
  const [paymentAmount, setPaymentAmount] = useState('');
  const [mode, setMode] = useState('cash');
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [paying, setPaying] = useState(false);

  // Add Extra Charge Form State
  const [extraChargeInput, setExtraChargeInput] = useState('');
  const [extraChargeDescInput, setExtraChargeDescInput] = useState('');
  const [savingExtra, setSavingExtra] = useState(false);

  useEffect(() => {
    // 1. Live subscribe to this customer document to catch extraCharge and paid/due updates
    const unsubCustomer = onSnapshot(doc(db, 'customers', customer.id), (docSnap) => {
      if (docSnap.exists()) {
        setLiveCustomer({ id: docSnap.id, ...docSnap.data() });
      }
    });

    // 2. Subscribe to members list
    const unsubMembers = subscribeToMembersByCustomer(customer.id, (data) => {
      if (data) setMembers(data);
    });
    
    // 3. Subscribe to payments list
    const unsubPayments = subscribeToPaymentsByCustomer(customer.id, (data) => {
      if (data) {
        setPayments(data);
      }
    });

    return () => {
      unsubCustomer();
      unsubMembers();
      unsubPayments();
    };
  }, [customer.id]);

  // Derived financial computations
  const packageAmount = liveCustomer.totalAmount || 0;
  const extraChargeVal = liveCustomer.extraCharge || 0;
  const extraChargeDesc = liveCustomer.extraChargeDescription || '';
  const totalCost = packageAmount + extraChargeVal;
  
  const paidAmt = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const dueAmt = totalCost - paidAmt;

  const handleAddPayment = async () => {
    const amt = Number(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      return Alert.alert("Invalid Input", "Please enter a valid amount.");
    }
    if (amt > dueAmt) {
      return Alert.alert("Invalid Amount", "Payment cannot exceed due amount.");
    }

    if (!receiverName.trim()) {
      return Alert.alert("Invalid Input", "Name of person receiving the money is required.");
    }

    if (mode === 'online') {
      if (!receiverPhone.trim()) {
        return Alert.alert("Invalid Input", "Receiver Phone is required for online payments.");
      }
    }

    setPaying(true);
    const result = await addPayment(customer.id, amt, mode, receiverName, receiverPhone, dueAmt, paidAmt, user.email || user.uid);
    if (result.success) {
      setPaymentAmount('');
      setMode('cash');
      setReceiverName('');
      setReceiverPhone('');
    } else {
      Alert.alert("Error", result.error?.message || "Failed to add payment.");
    }
    setPaying(false);
  };

  const handleAddExtraCharge = async () => {
    const amt = Number(extraChargeInput);
    if (isNaN(amt) || amt <= 0) {
      return Alert.alert("Invalid Input", "Please enter a valid extra charge amount.");
    }
    if (!extraChargeDescInput.trim()) {
      return Alert.alert("Invalid Input", "Please enter a description for the extra charge.");
    }

    setSavingExtra(true);
    try {
      const customerRef = doc(db, 'customers', customer.id);
      const newExtraCharge = extraChargeVal + amt;
      const newDue = dueAmt + amt;

      await updateDoc(customerRef, {
        extraCharge: newExtraCharge,
        extraChargeDescription: extraChargeDescInput.trim(),
        dueAmount: newDue > 0 ? newDue : 0
      });

      setExtraChargeInput('');
      setExtraChargeDescInput('');
      Alert.alert("Success", "Extra charge added successfully.");
    } catch (error) {
      Alert.alert("Error", "Failed to add extra charge: " + error.message);
    }
    setSavingExtra(false);
  };

  const handleDeletePayment = (paymentId, amount) => {
    Alert.alert(
      "Delete Payment",
      `Are you sure you want to delete this payment of ₹${amount}?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            const result = await deletePayment(paymentId, customer.id, amount);
            if (!result.success) Alert.alert("Error", "Failed to delete payment.");
          }
        }
      ]
    );
  };

  const renderPayment = ({ item }) => {
    const d = item.createdAt?.seconds ? format(new Date(item.createdAt.seconds * 1000), 'MMM dd, yyyy hh:mm a') : 'Just now';
    return (
      <View style={styles.paymentCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.payAmount}>₹{item.amount}</Text>
          <Text style={styles.payDate}>{d}</Text>
          <Text style={styles.payDate}>{item.mode === 'online' ? 'Online' : 'Cash'} ({item.receiverName})</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.payUser, { marginBottom: SPACE.sm }]}>{item.addedBy?.substring(0, 12)}...</Text>
          {(role === 'admin' || role === 'manager') && (
            <TouchableOpacity onPress={() => handleDeletePayment(item.id, item.amount)}>
              <Trash2 color={COLORS.danger} size={20} />
            </TouchableOpacity>
          )}
        </View>
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
          <Text style={styles.greeting} numberOfLines={1}>{liveCustomer.headMemberName}'s Group</Text>
          <Text style={styles.subtitle}>{tourName}</Text>
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          
          {/* Financial Summary */}
          <LinearGradient colors={[COLORS.primary, COLORS.secondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.summaryCard}>
            <View style={styles.sumRow}>
              <Text style={styles.sumLabel}>Total Package</Text>
              <Text style={styles.sumValue}>₹{packageAmount}</Text>
            </View>
            {extraChargeVal > 0 && (
              <View style={styles.sumRow}>
                <Text style={styles.sumLabel}>Extra Charges</Text>
                <Text style={styles.sumValue}>₹{extraChargeVal} {extraChargeDesc ? `(${extraChargeDesc})` : ''}</Text>
              </View>
            )}
            <View style={styles.sumRow}>
              <Text style={styles.sumLabel}>Paid Amount</Text>
              <Text style={styles.sumValue}>₹{paidAmt}</Text>
            </View>
            <View style={[styles.sumRow, { borderBottomWidth: 0, marginTop: SPACE.sm, paddingTop: SPACE.sm, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)' }]}>
              <Text style={styles.sumLabelDue}>Due Amount</Text>
              <Text style={styles.sumValueDue}>₹{dueAmt}</Text>
            </View>
          </LinearGradient>

          {/* Add Payment Form */}
          {dueAmt > 0 ? (
            <View style={styles.paymentForm}>
              <Text style={styles.sectionTitle}>Add Payment</Text>
              <View style={styles.payInputRow}>
                <TextInput
                  style={styles.payInput}
                  placeholder={`Amount (Max: ₹${dueAmt})`}
                  keyboardType="numeric"
                  value={paymentAmount}
                  onChangeText={setPaymentAmount}
                />
              </View>
              
              <View style={styles.modeTabs}>
                <TouchableOpacity 
                  style={[styles.modeTab, mode === 'cash' && styles.modeTabActive]} 
                  onPress={() => setMode('cash')}>
                  <Text style={[styles.modeTabText, mode === 'cash' && styles.modeTabTextActive]}>Cash</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modeTab, mode === 'online' && styles.modeTabActive]} 
                  onPress={() => setMode('online')}>
                  <Text style={[styles.modeTabText, mode === 'online' && styles.modeTabTextActive]}>Online</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.onlineInputs}>
                <TextInput
                  style={styles.payInput}
                  placeholder={mode === 'cash' ? "Receiver Name (Collector)" : "Receiver Name"}
                  value={receiverName}
                  onChangeText={setReceiverName}
                />
                {mode === 'online' && (
                  <TextInput
                    style={[styles.payInput, { marginTop: SPACE.sm }]}
                    placeholder="Receiver Phone"
                    keyboardType="phone-pad"
                    value={receiverPhone}
                    onChangeText={setReceiverPhone}
                  />
                )}
              </View>

              <TouchableOpacity onPress={handleAddPayment} disabled={paying} style={[styles.payBtn, { marginTop: SPACE.md }]}>
                {paying ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.payBtnText}>Pay</Text>}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.fullyPaid}>
              <CheckCircle color={COLORS.success} size={24} style={{ marginRight: SPACE.sm }} />
              <Text style={styles.fullyPaidText}>Fully Paid</Text>
            </View>
          )}

          {/* Add Extra Charge Form */}
          <View style={styles.paymentForm}>
            <Text style={styles.sectionTitle}>Add Extra Charge</Text>
            <View style={styles.payInputRow}>
              <TextInput
                style={styles.payInput}
                placeholder="Extra Charge Amount (₹)"
                keyboardType="numeric"
                value={extraChargeInput}
                onChangeText={setExtraChargeInput}
              />
            </View>
            <View style={{ marginTop: SPACE.sm }}>
              <TextInput
                style={styles.payInput}
                placeholder="Description (e.g. Extra baggage, food)"
                value={extraChargeDescInput}
                onChangeText={setExtraChargeDescInput}
              />
            </View>
            <TouchableOpacity 
              onPress={handleAddExtraCharge} 
              disabled={savingExtra} 
              style={[styles.payBtn, { marginTop: SPACE.md, backgroundColor: COLORS.secondary }]}
            >
              {savingExtra ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.payBtnText}>Add Extra Charge</Text>}
            </TouchableOpacity>
          </View>

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
                {m.id === liveCustomer.headMemberId && (
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

  paymentForm: { backgroundColor: COLORS.white, padding: SPACE.md, borderRadius: ROUNDING.md, marginBottom: SPACE.xl, ...SHADOWS.glass, borderWidth: 1, borderColor: '#e2e8f0' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginBottom: SPACE.md },
  payInputRow: { flexDirection: 'row', gap: SPACE.sm },
  payInput: { flex: 1, backgroundColor: '#f8fafc', padding: SPACE.md, borderRadius: ROUNDING.sm, borderWidth: 1, borderColor: '#e2e8f0', fontSize: 16 },
  payBtn: { backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', paddingVertical: SPACE.md, borderRadius: ROUNDING.sm },
  payBtnText: { color: COLORS.white, fontWeight: 'bold', fontSize: 16 },
  modeTabs: { flexDirection: 'row', marginTop: SPACE.md, gap: SPACE.sm },
  modeTab: { flex: 1, padding: SPACE.sm, borderRadius: ROUNDING.sm, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  modeTabActive: { backgroundColor: '#e0e7ff', borderColor: COLORS.primary },
  modeTabText: { color: COLORS.textLight, fontWeight: '600' },
  modeTabTextActive: { color: COLORS.primary, fontWeight: 'bold' },
  onlineInputs: { marginTop: SPACE.md },
  
  fullyPaid: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ecfdf5', padding: SPACE.lg, borderRadius: ROUNDING.md, marginBottom: SPACE.xl, borderWidth: 1, borderColor: '#a7f3d0' },
  fullyPaidText: { color: COLORS.success, fontSize: 18, fontWeight: 'bold' },

  membersContainer: { backgroundColor: COLORS.white, borderRadius: ROUNDING.md, padding: SPACE.sm, marginBottom: SPACE.xl, ...SHADOWS.glass, borderWidth: 1, borderColor: '#e2e8f0' },
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

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Plus, Trash2 } from 'lucide-react-native';
import { updateCustomerAndMembers } from '../../api/customerService';
import { subscribeToMembersByCustomer } from '../../api/memberService';
import { COLORS, SPACE, ROUNDING, SHADOWS } from '../../theme/Theme';
import { DatePicker } from '../../components/DatePicker';
import { z } from 'zod';

const memberSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 chars"),
  age: z.coerce.number().positive("Age must be > 0"),
  gender: z.enum(['male', 'female', 'other'])
});

const membersArraySchema = z.array(memberSchema).min(1, "At least one member is required");

export const EditCustomerScreen = ({ route, navigation }) => {
  const { customer, tourName, pricePerHead } = route.params;
  
  const [groupType, setGroupType] = useState(customer.groupType || 'single');
  const [members, setMembers] = useState([]);
  const [headIndex, setHeadIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Booking Fields from Customer Document
  const [phoneNumber, setPhoneNumber] = useState(customer.phoneNumber || '');
  const [pnr, setPnr] = useState(customer.pnr || '');
  const [bookingType, setBookingType] = useState(customer.bookingType || 'tour'); // tour, flight, train, bus
  
  // Helper to safely parse dates
  const parseDate = (d) => {
    if (!d) return null;
    if (d.toDate) return d.toDate();
    if (d.seconds) return new Date(d.seconds * 1000);
    return new Date(d);
  };
  
  const [journeyDate, setJourneyDate] = useState(parseDate(customer.journeyDate));
  
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const unsub = subscribeToMembersByCustomer(customer.id, (data) => {
      if (data && data.length > 0) {
        // Pre-fill members data when loaded
        const membersData = data.map(m => ({
          id: m.id,
          name: m.name,
          age: String(m.age),
          gender: m.gender
        }));
        setMembers(membersData);
        
        // Find head index
        const hIdx = membersData.findIndex(m => m.id === customer.headMemberId);
        setHeadIndex(hIdx >= 0 ? hIdx : 0);
      }
      setLoading(false);
    });
    
    return () => unsub();
  }, [customer.id, customer.headMemberId]);

  const handleAddMember = () => {
    const nextMembers = [...members, { id: Date.now().toString(), name: '', age: '', gender: 'male' }];
    setMembers(nextMembers);
    if (groupType === 'single') setGroupType('couple');
    if (nextMembers.length >= 3) setGroupType('family');
  };

  const handleUpdateMember = (index, field, value) => {
    const newMembers = [...members];
    newMembers[index][field] = value;
    setMembers(newMembers);
  };

  const handleRemoveMember = (index) => {
    if (members.length === 1) return;
    const newMembers = members.filter((_, i) => i !== index);
    if (headIndex === index) setHeadIndex(0);
    else if (headIndex > index) setHeadIndex(headIndex - 1);
    
    setMembers(newMembers);
    if (newMembers.length === 1) setGroupType('single');
    else if (newMembers.length === 2) setGroupType('couple');
    else setGroupType('family');
  };

  const handleSave = async () => {
    setErrors({});
    const fieldErrors = {};

    // Validate inputs
    if (!phoneNumber.trim()) {
      fieldErrors.phoneNumber = "Phone Number is required";
    } else if (phoneNumber.trim().length < 10) {
      fieldErrors.phoneNumber = "Phone Number must be at least 10 digits";
    }

    if (!pnr.trim()) {
      fieldErrors.pnr = "PNR is required";
    } else if (pnr.trim().length < 3) {
      fieldErrors.pnr = "PNR must be at least 3 characters";
    }

    if (!journeyDate) {
      fieldErrors.journeyDate = "Journey Date is required";
    }

    const validationResult = membersArraySchema.safeParse(members);

    if (!validationResult.success || Object.keys(fieldErrors).length > 0) {
      const formattedErrors = { ...fieldErrors };
      if (!validationResult.success) {
        validationResult.error.errors.forEach(err => {
          if (err.path.length >= 2) {
            formattedErrors[`${err.path[0]}.${err.path[1]}`] = err.message;
          } else {
            Alert.alert("Validation Error", err.message);
          }
        });
      }
      setErrors(formattedErrors);
      return;
    }

    setSaving(true);
    const result = await updateCustomerAndMembers(
      customer.id, 
      customer.tourId, 
      pricePerHead, 
      groupType, 
      members, 
      headIndex, 
      customer.membersCount,
      customer.paidAmount,
      phoneNumber,
      pnr,
      bookingType,
      journeyDate.toISOString()
    );
    
    if (result.success) {
      Alert.alert("Success", "Customer updated successfully", [
        { text: "OK", onPress: () => navigation.goBack() }
      ]);
    } else {
      Alert.alert("Error", "Failed to update customer booking.");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft color={COLORS.text} size={28} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Customer Booking</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Tour: <Text style={styles.summaryValue}>{tourName}</Text></Text>
            <Text style={styles.summaryLabel}>Price Per Head: <Text style={styles.summaryValue}>₹{pricePerHead}</Text></Text>
            <Text style={styles.summaryLabel}>Total Amount: <Text style={styles.summaryValueAmount}>₹{members.length * pricePerHead}</Text></Text>
          </View>

          {/* Booking Info Fields */}
          <Text style={styles.sectionTitle}>Booking & Contact Information</Text>
          <View style={styles.bookingCard}>
            <Text style={styles.inputLabel}>Phone Number</Text>
            <TextInput
              style={[styles.input, errors.phoneNumber && styles.inputError]}
              placeholder="e.g. 9876543210"
              placeholderTextColor={COLORS.textLight}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
            />
            {errors.phoneNumber && <Text style={styles.errorText}>{errors.phoneNumber}</Text>}

            <Text style={styles.inputLabel}>PNR</Text>
            <TextInput
              style={[styles.input, errors.pnr && styles.inputError]}
              placeholder="e.g. PNR123456"
              placeholderTextColor={COLORS.textLight}
              value={pnr}
              onChangeText={setPnr}
              autoCapitalize="characters"
            />
            {errors.pnr && <Text style={styles.errorText}>{errors.pnr}</Text>}

            <Text style={styles.inputLabel}>Booking Type</Text>
            <View style={styles.bookingTypeContainer}>
              {['tour', 'flight', 'train', 'bus'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.bookingTypeBtn, bookingType === type && styles.bookingTypeBtnActive]}
                  onPress={() => setBookingType(type)}
                >
                  <Text style={[styles.bookingTypeBtnText, bookingType === type && styles.bookingTypeBtnTextActive]}>
                    {type.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <DatePicker
              label="Journey Date"
              value={journeyDate}
              onChange={setJourneyDate}
              placeholder="Select Journey Date"
            />
            {errors.journeyDate && <Text style={[styles.errorText, { marginTop: -SPACE.sm }]}>{errors.journeyDate}</Text>}
          </View>

          {/* Members List */}
          <Text style={styles.sectionTitle}>Members ({members.length})</Text>
          
          {members.map((member, index) => (
            <View key={member.id} style={[styles.memberCard, headIndex === index && styles.headCard]}>
              <View style={styles.memberCardHeader}>
                <View style={styles.headToggleRow}>
                  <TouchableOpacity 
                    style={styles.radioBtn} 
                    onPress={() => setHeadIndex(index)}
                  >
                    <View style={[styles.radioOuter, headIndex === index && styles.radioOuterSelected]}>
                       {headIndex === index && <View style={styles.radioInner} />}
                    </View>
                    <Text style={styles.headToggleText}>{headIndex === index ? 'Head of Family' : 'Make Head'}</Text>
                  </TouchableOpacity>
                </View>
                {members.length > 1 && (
                  <TouchableOpacity onPress={() => handleRemoveMember(index)}>
                    <Trash2 color={COLORS.danger} size={20} />
                  </TouchableOpacity>
                )}
              </View>

              <Text style={styles.inputLabel}>Member Name</Text>
              <TextInput
                style={[styles.input, errors[`${index}.name`] && styles.inputError, { marginBottom: errors[`${index}.name`] ? 2 : SPACE.sm }]}
                placeholder="Name"
                value={member.name}
                onChangeText={(val) => handleUpdateMember(index, 'name', val)}
              />
              {errors[`${index}.name`] && <Text style={styles.errorText}>{errors[`${index}.name`]}</Text>}
              
              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: SPACE.sm }}>
                  <Text style={styles.inputLabel}>Age</Text>
                  <TextInput
                    style={[styles.input, { marginBottom: errors[`${index}.age`] ? 2 : 0 }, errors[`${index}.age`] && styles.inputError]}
                    placeholder="Age"
                    keyboardType="numeric"
                    value={member.age}
                    onChangeText={(val) => handleUpdateMember(index, 'age', val)}
                  />
                  {errors[`${index}.age`] && <Text style={styles.errorText}>{errors[`${index}.age`]}</Text>}
                </View>
                
                <View style={{ flex: 2 }}>
                  <Text style={styles.inputLabel}>Gender</Text>
                  <View style={styles.genderToggle}>
                    {['male', 'female', 'other'].map(g => (
                      <TouchableOpacity 
                        key={g} 
                        style={[styles.gBtn, member.gender === g && styles.gBtnActive]}
                        onPress={() => handleUpdateMember(index, 'gender', g)}
                      >
                        <Text style={[styles.gBtnText, member.gender === g && styles.gBtnTextActive]}>
                          {g.charAt(0).toUpperCase() + g.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            </View>
          ))}

          <TouchableOpacity style={styles.addMemberBtn} onPress={handleAddMember}>
            <Plus color={COLORS.primary} size={20} />
            <Text style={styles.addMemberText}>Add Member</Text>
          </TouchableOpacity>

        </ScrollView>
        
        <View style={styles.footer}>
          <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveBtn}>
            <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.saveGradient}>
              {saving ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.saveText}>Update Booking</Text>}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  header: { flexDirection: 'row', alignItems: 'center', padding: SPACE.md, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  backBtn: { marginRight: SPACE.sm },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  scrollContent: { padding: SPACE.md, paddingBottom: SPACE.xl * 3 },
  summaryCard: { backgroundColor: COLORS.white, padding: SPACE.md, borderRadius: ROUNDING.md, ...SHADOWS.glass, marginBottom: SPACE.lg },
  summaryLabel: { fontSize: 14, color: COLORS.textLight, marginBottom: SPACE.xs },
  summaryValue: { fontWeight: '600', color: COLORS.text },
  summaryValueAmount: { fontWeight: 'bold', color: COLORS.secondary, fontSize: 18 },
  
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: SPACE.sm, color: COLORS.text, marginTop: SPACE.sm },
  bookingCard: { backgroundColor: COLORS.white, padding: SPACE.md, borderRadius: ROUNDING.md, marginBottom: SPACE.lg, borderWidth: 1, borderColor: '#e2e8f0' },
  inputLabel: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 6 },

  bookingTypeContainer: { flexDirection: 'row', gap: SPACE.xs, marginBottom: SPACE.md, backgroundColor: '#f8fafc', padding: 3, borderRadius: ROUNDING.sm, borderWidth: 1, borderColor: '#e2e8f0' },
  bookingTypeBtn: { flex: 1, paddingVertical: SPACE.sm, borderRadius: ROUNDING.sm - 2, alignItems: 'center', justifyContent: 'center' },
  bookingTypeBtnActive: { backgroundColor: COLORS.primary },
  bookingTypeBtnText: { fontSize: 11, fontWeight: '700', color: COLORS.textLight },
  bookingTypeBtnTextActive: { color: COLORS.white },

  memberCard: { backgroundColor: COLORS.white, padding: SPACE.md, borderRadius: ROUNDING.md, marginBottom: SPACE.md, borderWidth: 1, borderColor: '#e2e8f0' },
  headCard: { borderColor: COLORS.primary, borderWidth: 2 },
  memberCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACE.sm },
  headToggleRow: { flexDirection: 'row', alignItems: 'center' },
  radioBtn: { flexDirection: 'row', alignItems: 'center' },
  radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: COLORS.textLight, justifyContent: 'center', alignItems: 'center', marginRight: SPACE.xs },
  radioOuterSelected: { borderColor: COLORS.primary },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary },
  headToggleText: { fontSize: 14, fontWeight: '500', color: COLORS.text },
  input: { backgroundColor: '#f8fafc', padding: SPACE.sm + 2, borderRadius: ROUNDING.sm, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: SPACE.sm, color: COLORS.text, fontSize: 15 },
  inputError: { borderColor: COLORS.danger },
  errorText: { color: COLORS.danger, fontSize: 12, marginBottom: SPACE.sm },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  genderToggle: { flexDirection: 'row', backgroundColor: '#f8fafc', borderRadius: ROUNDING.sm, borderWidth: 1, borderColor: '#e2e8f0', padding: 2 },
  gBtn: { flex: 1, paddingVertical: SPACE.sm, justifyContent: 'center', alignItems: 'center', borderRadius: ROUNDING.sm - 2 },
  gBtnActive: { backgroundColor: COLORS.primary },
  gBtnText: { fontSize: 12, fontWeight: '600', color: COLORS.textLight },
  gBtnTextActive: { color: COLORS.white },
  addMemberBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: SPACE.md, borderStyle: 'dashed', borderWidth: 1, borderColor: COLORS.primary, borderRadius: ROUNDING.md, marginBottom: SPACE.xl, backgroundColor: 'rgba(79, 70, 229, 0.02)' },
  addMemberText: { color: COLORS.primary, fontWeight: '600', marginLeft: SPACE.xs },
  footer: { padding: SPACE.md, backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  saveBtn: { borderRadius: ROUNDING.md, overflow: 'hidden' },
  saveGradient: { padding: SPACE.md, alignItems: 'center' },
  saveText: { color: COLORS.white, fontWeight: 'bold', fontSize: 16 }
});

import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { updateTour } from '../../api/tourService';
import { COLORS, SPACE, ROUNDING } from '../../theme/Theme';
import { DatePicker } from '../../components/DatePicker';
import { z } from 'zod';

const tourSchema = z.object({
  name: z.string().min(1, "Tour Name is required"),
  pricePerHead: z.preprocess(
    (val) => (val === '' ? undefined : Number(val)),
    z.number({ required_error: "Price Per Head is required" }).positive("Price must be greater than 0")
  ),
  startDate: z.date({ required_error: "Start Date is required" }),
  endDate: z.date({ required_error: "End Date is required" })
}).refine(data => data.endDate >= data.startDate, {
  message: "End Date must be greater than or equal to Start Date",
  path: ["endDate"]
});

export const EditTourScreen = ({ route, navigation }) => {
  const { tourId, currentName, currentPrice, currentStartDate, currentEndDate } = route.params;
  const [name, setName] = useState(currentName || '');
  const [pricePerHead, setPricePerHead] = useState(currentPrice ? String(currentPrice) : '');
  
  // Helper to safely parse dates from Firestore Timestamp / Date string / null
  const parseDate = (d) => {
    if (!d) return null;
    if (d.toDate) return d.toDate(); // Firestore timestamp
    if (d.seconds) return new Date(d.seconds * 1000); // Standard timestamp representation
    return new Date(d);
  };

  const [startDate, setStartDate] = useState(parseDate(currentStartDate));
  const [endDate, setEndDate] = useState(parseDate(currentEndDate));
  
  const [updating, setUpdating] = useState(false);
  const [errors, setErrors] = useState({});

  const handleUpdate = async () => {
    setErrors({});
    
    const validationResult = tourSchema.safeParse({
      name: name.trim(),
      pricePerHead: pricePerHead,
      startDate: startDate,
      endDate: endDate
    });

    if (!validationResult.success) {
      const formattedErrors = {};
      validationResult.error.errors.forEach(err => {
        const fieldName = err.path[0];
        formattedErrors[fieldName] = err.message;
      });
      setErrors(formattedErrors);
      return;
    }

    setUpdating(true);
    const result = await updateTour(
      tourId, 
      validationResult.data.name, 
      validationResult.data.pricePerHead,
      validationResult.data.startDate.toISOString(),
      validationResult.data.endDate.toISOString()
    );
    
    if (result.success) {
      Alert.alert("Success", "Tour updated successfully", [
        { text: "OK", onPress: () => navigation.goBack() }
      ]);
    } else {
      Alert.alert("Error", "Failed to update tour.");
    }
    setUpdating(false);
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <Text style={styles.label}>Tour Name</Text>
        <TextInput
          style={[styles.input, errors.name && styles.inputError, { marginBottom: errors.name ? SPACE.xs : SPACE.lg }]}
          placeholder="e.g. Summer Vacation 2026"
          placeholderTextColor={COLORS.textLight}
          value={name}
          onChangeText={setName}
        />
        {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
        
        <Text style={styles.label}>Price Per Head (₹)</Text>
        <TextInput
          style={[styles.input, errors.pricePerHead && styles.inputError, { marginBottom: errors.pricePerHead ? SPACE.xs : SPACE.lg }]}
          placeholder="e.g. 500"
          placeholderTextColor={COLORS.textLight}
          value={pricePerHead}
          onChangeText={setPricePerHead}
          keyboardType="numeric"
        />
        {errors.pricePerHead && <Text style={styles.errorText}>{errors.pricePerHead}</Text>}

        <DatePicker
          label="Start Date"
          value={startDate}
          onChange={setStartDate}
          placeholder="Select Start Date"
        />
        {errors.startDate && <Text style={[styles.errorText, { marginTop: -SPACE.sm, marginBottom: SPACE.md }]}>{errors.startDate}</Text>}

        <DatePicker
          label="End Date"
          value={endDate}
          onChange={setEndDate}
          placeholder="Select End Date"
          minimumDate={startDate}
        />
        {errors.endDate && <Text style={[styles.errorText, { marginTop: -SPACE.sm, marginBottom: SPACE.md }]}>{errors.endDate}</Text>}

        <TouchableOpacity onPress={handleUpdate} disabled={updating} style={styles.btn}>
          <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.btnGradient}>
            {updating ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.btnText}>Update Tour</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  scrollContainer: { padding: SPACE.xl, paddingBottom: SPACE.xl * 2 },
  label: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: SPACE.sm },
  input: {
    backgroundColor: '#f8fafc', padding: SPACE.md, borderRadius: ROUNDING.md,
    fontSize: 16, color: COLORS.text, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: SPACE.lg
  },
  inputError: { borderColor: COLORS.danger, marginBottom: SPACE.xs },
  errorText: { color: COLORS.danger, fontSize: 12, marginBottom: SPACE.md },
  btn: { borderRadius: ROUNDING.md, overflow: 'hidden', marginTop: SPACE.md },
  btnGradient: { padding: SPACE.md, alignItems: 'center' },
  btnText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' }
});

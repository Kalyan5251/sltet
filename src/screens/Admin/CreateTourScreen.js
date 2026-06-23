import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { createTour } from '../../api/tourService';
import { COLORS, SPACE, ROUNDING } from '../../theme/Theme';

export const CreateTourScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [pricePerHead, setPricePerHead] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim() || name.trim().length < 3) {
      Alert.alert("Invalid input", "Tour name must be at least 3 characters long.");
      return;
    }
    const parsedPrice = Number(pricePerHead);
    if (!pricePerHead || isNaN(parsedPrice) || parsedPrice <= 0) {
      Alert.alert("Invalid input", "Please enter a valid Price Per Head.");
      return;
    }

    setCreating(true);
    const result = await createTour(name, parsedPrice, user.uid);
    if (result.success) {
      navigation.goBack();
    } else {
      Alert.alert("Error", "Failed to create tour.");
    }
    setCreating(false);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <Text style={styles.label}>Tour Name</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Summer Vacation 2026"
        placeholderTextColor={COLORS.textLight}
        value={name}
        onChangeText={setName}
        autoFocus
      />
      
      <Text style={styles.label}>Price Per Head (₹)</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. 500"
        placeholderTextColor={COLORS.textLight}
        value={pricePerHead}
        onChangeText={setPricePerHead}
        keyboardType="numeric"
      />

      <TouchableOpacity onPress={handleCreate} disabled={creating} style={styles.btn}>
        <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.btnGradient}>
          {creating ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.btnText}>Create Tour</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: SPACE.xl, backgroundColor: COLORS.white },
  label: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: SPACE.sm },
  input: {
    backgroundColor: '#f8fafc', padding: SPACE.md, borderRadius: ROUNDING.md,
    fontSize: 16, color: COLORS.text, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: SPACE.lg
  },
  btn: { borderRadius: ROUNDING.md, overflow: 'hidden' },
  btnGradient: { padding: SPACE.md, alignItems: 'center' },
  btnText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' }
});

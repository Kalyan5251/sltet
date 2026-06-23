import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react-native';
import { format, startOfDay } from 'date-fns';
import { COLORS, SPACE, ROUNDING, SHADOWS } from '../theme/Theme';

export const DatePicker = ({ value, onChange, placeholder = 'Select Date', label, allowClear = false, minimumDate }) => {
  const [modalVisible, setModalVisible] = useState(false);
  
  // Use today or value as base for calendar navigation
  const initialDate = value ? new Date(value) : new Date();
  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth()); // 0-indexed

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysOfWeek = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  // Helper: Number of days in month
  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Helper: Day of week for 1st of month (0 = Sun, 6 = Sat)
  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay();
  };

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleSelectDay = (day) => {
    const selectedDate = new Date(currentYear, currentMonth, day);
    onChange(selectedDate);
    setModalVisible(false);
  };

  const handleClear = () => {
    onChange(null);
    setModalVisible(false);
  };

  // Format the value for display
  const displayValue = value 
    ? format(new Date(value), 'dd-MMM-yyyy') 
    : '';

  // Generate calendar days
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayIndex = getFirstDayOfMonth(currentYear, currentMonth);

  const daysGrid = [];
  // Empty spaces for previous month's overhang
  for (let i = 0; i < firstDayIndex; i++) {
    daysGrid.push({ day: null, key: `empty-${i}` });
  }
  // Days of the month
  for (let d = 1; d <= daysInMonth; d++) {
    daysGrid.push({ day: d, key: `day-${d}` });
  }

  const today = startOfDay(new Date());
  const selectedDateNormalized = value ? startOfDay(new Date(value)) : null;
  const minDateNormalized = minimumDate ? startOfDay(new Date(minimumDate)) : null;

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.pickerRow}>
        <TouchableOpacity 
          style={[styles.inputButton, displayValue ? styles.inputActive : null]} 
          onPress={() => {
            // Update calendar navigation base when opening
            const d = value ? new Date(value) : new Date();
            setCurrentYear(d.getFullYear());
            setCurrentMonth(d.getMonth());
            setModalVisible(true);
          }}
        >
          <Calendar size={18} color={displayValue ? COLORS.primary : COLORS.textLight} style={styles.icon} />
          <Text style={[styles.inputText, displayValue ? styles.inputTextActive : null]}>
            {displayValue || placeholder}
          </Text>
        </TouchableOpacity>
        {allowClear && displayValue ? (
          <TouchableOpacity style={styles.clearBtn} onPress={() => onChange(null)}>
            <X size={18} color={COLORS.danger} />
          </TouchableOpacity>
        ) : null}
      </View>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.calendarCard}>
            {/* Header */}
            <View style={styles.calendarHeader}>
              <TouchableOpacity onPress={handlePrevMonth} style={styles.navBtn}>
                <ChevronLeft size={24} color={COLORS.text} />
              </TouchableOpacity>
              <Text style={styles.monthYearText}>
                {months[currentMonth]} {currentYear}
              </Text>
              <TouchableOpacity onPress={handleNextMonth} style={styles.navBtn}>
                <ChevronRight size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {/* Days of Week Header */}
            <View style={styles.weekRow}>
              {daysOfWeek.map((day, idx) => (
                <Text key={idx} style={styles.weekDayText}>
                  {day}
                </Text>
              ))}
            </View>

            {/* Days Grid */}
            <View style={styles.daysGrid}>
              {daysGrid.map((item) => {
                if (item.day === null) {
                  return <View key={item.key} style={styles.dayCellEmpty} />;
                }

                const cellDate = new Date(currentYear, currentMonth, item.day);
                const isSelected = selectedDateNormalized && cellDate.getTime() === selectedDateNormalized.getTime();
                const isToday = cellDate.getTime() === today.getTime();
                const isDisabled = minDateNormalized && cellDate.getTime() < minDateNormalized.getTime();

                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[
                      styles.dayCell,
                      isSelected && styles.dayCellSelected,
                      isToday && !isSelected && styles.dayCellToday,
                      isDisabled && styles.dayCellDisabled
                    ]}
                    onPress={() => !isDisabled && handleSelectDay(item.day)}
                    disabled={isDisabled}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        isSelected && styles.dayTextSelected,
                        isToday && !isSelected && styles.dayTextToday,
                        isDisabled && styles.dayTextDisabled
                      ]}
                    >
                      {item.day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Footer Buttons */}
            <View style={styles.footerRow}>
              {allowClear && (
                <TouchableOpacity style={styles.footerBtnClear} onPress={handleClear}>
                  <Text style={styles.footerBtnTextClear}>Clear</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.footerBtnClose} onPress={() => setModalVisible(false)}>
                <Text style={styles.footerBtnTextClose}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACE.md,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACE.sm,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: SPACE.md,
    borderRadius: ROUNDING.md,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  inputActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.white,
  },
  icon: {
    marginRight: SPACE.sm,
  },
  inputText: {
    fontSize: 16,
    color: COLORS.textLight,
  },
  inputTextActive: {
    color: COLORS.text,
    fontWeight: '500',
  },
  clearBtn: {
    padding: SPACE.md,
    marginLeft: SPACE.sm,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fee2e2',
    borderRadius: ROUNDING.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACE.lg,
  },
  calendarCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: COLORS.white,
    borderRadius: ROUNDING.xl,
    padding: SPACE.md,
    ...SHADOWS.glass,
    elevation: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACE.md,
    paddingHorizontal: SPACE.xs,
  },
  navBtn: {
    padding: SPACE.xs,
  },
  monthYearText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: SPACE.xs,
  },
  weekDayText: {
    width: 36,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  dayCell: {
    width: '14.28%', // 7 columns
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: ROUNDING.md,
    marginVertical: 2,
  },
  dayCellEmpty: {
    width: '14.28%',
    aspectRatio: 1,
  },
  dayCellSelected: {
    backgroundColor: COLORS.primary,
  },
  dayCellToday: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: '#e0e7ff',
  },
  dayCellDisabled: {
    opacity: 0.25,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  dayTextSelected: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  dayTextToday: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  dayTextDisabled: {
    color: COLORS.textLight,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: SPACE.md,
    gap: SPACE.sm,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: SPACE.sm,
  },
  footerBtnClear: {
    paddingVertical: SPACE.sm,
    paddingHorizontal: SPACE.md,
    borderRadius: ROUNDING.sm,
    backgroundColor: '#fef2f2',
  },
  footerBtnTextClear: {
    color: COLORS.danger,
    fontWeight: '600',
    fontSize: 14,
  },
  footerBtnClose: {
    paddingVertical: SPACE.sm,
    paddingHorizontal: SPACE.md,
    borderRadius: ROUNDING.sm,
  },
  footerBtnTextClose: {
    color: COLORS.textLight,
    fontWeight: '600',
    fontSize: 14,
  },
});

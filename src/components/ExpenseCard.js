import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { format } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { IndianRupee, Trash2, Edit2 } from 'lucide-react-native';
import { COLORS, SPACE, ROUNDING, SHADOWS } from '../theme/Theme';

// Using IndianRupee because user has local time set to India (often used in these projects), but it's just an icon.
export const ExpenseCard = ({ expense, isAdmin, onDelete, onEdit }) => {
  // Format date safely
  const formattedDate = expense.createdAt?.seconds 
    ? format(new Date(expense.createdAt.seconds * 1000), 'MMM dd, yyyy • hh:mm a')
    : 'Pending sync...';

  return (
    <View style={styles.cardContainer}>
      <LinearGradient
        colors={[COLORS.card, 'rgba(255, 255, 255, 0.4)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.content}>
          <View style={styles.leftContent}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: SPACE.xs }}>
              <Text style={styles.description} numberOfLines={2}>
                {expense.description}
              </Text>
              {expense.category && (
                <View style={styles.catBadge}>
                  <Text style={styles.catBadgeText}>{expense.category.toUpperCase()}</Text>
                </View>
              )}
            </View>
            <Text style={styles.date}>{formattedDate}</Text>
            {isAdmin && (expense.userEmail || expense.userId) && (
              <Text style={styles.userBadge}>{expense.userEmail || `User ID: ${expense.userId.substring(0, 8)}...`}</Text>
            )}
          </View>
          
          <View style={styles.rightContent}>
            <View style={styles.amountContainer}>
              <IndianRupee size={16} color={COLORS.primary} />
              <Text style={styles.amount}>{expense.amount?.toFixed(2)}</Text>
            </View>
            
            {isAdmin && (
              <View style={styles.actions}>
                <TouchableOpacity onPress={() => onEdit && onEdit(expense)} style={styles.iconButton}>
                  <Edit2 size={18} color={COLORS.textLight} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onDelete && onDelete(expense.id)} style={styles.iconButton}>
                  <Trash2 size={18} color={COLORS.danger} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    marginBottom: SPACE.md,
    marginHorizontal: SPACE.md,
    borderRadius: ROUNDING.lg,
    ...SHADOWS.glass,
  },
  card: {
    borderRadius: ROUNDING.lg,
    padding: SPACE.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftContent: {
    flex: 1,
    marginRight: SPACE.md,
  },
  description: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  catBadge: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: COLORS.primary,
  },
  catBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.primary,
  },
  date: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  userBadge: {
    marginTop: SPACE.xs,
    fontSize: 10,
    color: COLORS.secondary,
    fontWeight: 'bold',
  },
  rightContent: {
    alignItems: 'flex-end',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginLeft: 2,
  },
  actions: {
    flexDirection: 'row',
    marginTop: SPACE.md,
    gap: SPACE.sm,
  },
  iconButton: {
    padding: SPACE.xs,
  }
});

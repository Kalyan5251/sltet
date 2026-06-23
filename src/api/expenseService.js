import { collection, addDoc, onSnapshot, deleteDoc, doc, query, where, serverTimestamp, getDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';

const EXPENSES_COLLECTION = 'expenses';
const USERS_COLLECTION = 'users';

// Subscribe to expenses for a SPECIFIC TOUR
export const subscribeToExpensesByTour = (tourId, userId, role, callback) => {
  let q;
  const expensesRef = collection(db, EXPENSES_COLLECTION);
  
  if (role === 'admin') {
    // Admin gets all expenses for this tour
    q = query(expensesRef, where('tourId', '==', tourId));
  } else {
    // Staff gets only their expenses for this tour
    q = query(expensesRef, where('tourId', '==', tourId), where('userId', '==', userId));
  }

  return onSnapshot(q, (snapshot) => {
    const expenses = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Sort locally to ensure latest first without requiring a specific composite index
    expenses.sort((a, b) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return timeB - timeA;
    });

    callback(expenses, null);
  }, (error) => {
    console.error("Snapshot error:", error);
    callback(null, error);
  });
};

export const addExpense = async (tourId, userId, userEmail, amount, description, category = 'others') => {
  try {
    const docRef = await addDoc(collection(db, EXPENSES_COLLECTION), {
      tourId,
      userId,
      userEmail,
      amount: Number(amount),
      description: description.trim(),
      category: category.toLowerCase().trim(),
      createdAt: serverTimestamp()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error adding expense:", error);
    return { success: false, error };
  }
};

export const deleteExpense = async (expenseId) => {
  try {
    await deleteDoc(doc(db, EXPENSES_COLLECTION, expenseId));
    return { success: true };
  } catch (error) {
    console.error("Error deleting expense:", error);
    return { success: false, error };
  }
};

export const updateExpense = async (expenseId, amount, description, category = 'others') => {
  try {
    const expenseRef = doc(db, EXPENSES_COLLECTION, expenseId);
    await updateDoc(expenseRef, {
      amount: Number(amount),
      description: description.trim(),
      category: category.toLowerCase().trim()
    });
    return { success: true };
  } catch (error) {
    console.error("Error updating expense:", error);
    return { success: false, error };
  }
};

export const getUserRole = async (userId) => {
  try {
    const userDoc = await getDoc(doc(db, USERS_COLLECTION, userId));
    if (userDoc.exists()) {
      return userDoc.data().role;
    }
    return null;
  } catch (error) {
    console.error("Error fetching user role:", error);
    return null;
  }
};

import { collection, addDoc, onSnapshot, query, where, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from './firebaseConfig';

const PAYMENTS_COLLECTION = 'payments';
const CUSTOMERS_COLLECTION = 'customers';

export const subscribeToPaymentsByCustomer = (customerId, callback) => {
  const q = query(collection(db, PAYMENTS_COLLECTION), where('customerId', '==', customerId));
  return onSnapshot(q, (snapshot) => {
    const payments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    payments.sort((a,b) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return timeB - timeA;
    });
    callback(payments, null);
  }, error => callback(null, error));
};

export const addPayment = async (customerId, amount, currentDue, currentPaid, addedByEmail) => {
  try {
    const payAmt = Number(amount);
    if (payAmt <= 0) return { success: false, error: "Payment must be positive" };
    
    // Batch to ensure consistency
    const batch = writeBatch(db);
    
    // 1. Payment doc
    const paymentRef = doc(collection(db, PAYMENTS_COLLECTION));
    batch.set(paymentRef, {
      customerId,
      amount: payAmt,
      addedBy: addedByEmail,
      createdAt: serverTimestamp()
    });

    // 2. Update customer doc
    const customerRef = doc(db, CUSTOMERS_COLLECTION, customerId);
    batch.update(customerRef, {
      paidAmount: currentPaid + payAmt,
      dueAmount: currentDue - payAmt
    });

    await batch.commit();

    return { success: true };
  } catch (error) {
    console.error("Error adding payment", error);
    return { success: false, error };
  }
};

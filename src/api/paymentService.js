import { collection, addDoc, onSnapshot, query, where, doc, writeBatch, serverTimestamp, increment } from 'firebase/firestore';
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

export const addPayment = async (customerId, amount, mode, receiverName, receiverPhone, currentDue, currentPaid, addedByEmail) => {
  try {
    const payAmt = Number(amount);
    if (payAmt <= 0) return { success: false, error: "Payment must be positive" };
    
    // Batch to ensure consistency
    const batch = writeBatch(db);
    
    // 1. Payment doc
    const paymentRef = doc(collection(db, PAYMENTS_COLLECTION));
    
    const paymentData = {
      customerId,
      amount: payAmt,
      mode: mode || 'cash',
      receiverName: receiverName || '',
      addedBy: addedByEmail,
      createdAt: serverTimestamp()
    };
    
    if (mode === 'online') {
      paymentData.receiverPhone = receiverPhone || '';
    }

    batch.set(paymentRef, paymentData);

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

export const deletePayment = async (paymentId, customerId, amount) => {
  try {
    const payAmt = Number(amount);
    const batch = writeBatch(db);
    
    const paymentRef = doc(db, PAYMENTS_COLLECTION, paymentId);
    batch.delete(paymentRef);
    
    const customerRef = doc(db, CUSTOMERS_COLLECTION, customerId);
    batch.update(customerRef, {
      paidAmount: increment(-payAmt),
      dueAmount: increment(payAmt)
    });

    await batch.commit();
    return { success: true };
  } catch (error) {
    console.error("Error deleting payment", error);
    return { success: false, error };
  }
};

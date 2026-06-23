import { collection, addDoc, onSnapshot, query, serverTimestamp, doc, updateDoc, deleteDoc, writeBatch, getDocs, where } from 'firebase/firestore';
import { db } from './firebaseConfig';

const TOURS_COLLECTION = 'tours';

// Subscribe to all tours
export const subscribeToTours = (callback) => {
  const q = query(collection(db, TOURS_COLLECTION));
  
  return onSnapshot(q, (snapshot) => {
    const tours = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Sort locally to ensure latest first without requiring a specific index
    tours.sort((a, b) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return timeB - timeA;
    });

    callback(tours, null);
  }, (error) => {
    console.error("Snapshot error subscribing to tours:", error);
    callback(null, error);
  });
};

export const createTour = async (name, pricePerHead, adminId, startDate, endDate) => {
  try {
    const docRef = await addDoc(collection(db, TOURS_COLLECTION), {
      name: name.trim(),
      pricePerHead: Number(pricePerHead),
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      passengerCount: 0,
      createdBy: adminId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error creating tour:", error);
    return { success: false, error };
  }
};

export const updateTour = async (id, name, pricePerHead, startDate, endDate) => {
  try {
    const tourRef = doc(db, TOURS_COLLECTION, id);
    await updateDoc(tourRef, {
      name: name.trim(),
      pricePerHead: Number(pricePerHead),
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error("Error updating tour:", error);
    return { success: false, error };
  }
};

export const deleteTour = async (id) => {
  try {
    const batch = writeBatch(db);
    
    // Fetch all customers for this tour
    const customerQuery = query(collection(db, 'customers'), where('tourId', '==', id));
    const customerSnapshot = await getDocs(customerQuery);
    
    const customerIds = [];
    customerSnapshot.forEach(docSnap => {
      customerIds.push(docSnap.id);
      batch.delete(docSnap.ref);
    });

    // We realistically need to query all members/payments for each customer. 
    // Since Firebase `where in` has a max of 10, batching might be complex if >10 customers.
    // Given the constraints of the test/app, doing iterative queries before commit is safer.
    
    for (const cId of customerIds) {
      // Members
      const membersQuery = query(collection(db, 'members'), where('customerId', '==', cId));
      const membersSnap = await getDocs(membersQuery);
      membersSnap.forEach(mDoc => batch.delete(mDoc.ref));
      
      // Payments
      const paymentsQuery = query(collection(db, 'payments'), where('customerId', '==', cId));
      const paymentsSnap = await getDocs(paymentsQuery);
      paymentsSnap.forEach(pDoc => batch.delete(pDoc.ref));
    }
    
    // Expenses
    const expensesQuery = query(collection(db, 'expenses'), where('tourId', '==', id));
    const expensesSnap = await getDocs(expensesQuery);
    expensesSnap.forEach(eDoc => batch.delete(eDoc.ref));

    // Finally delete tour
    const tourRef = doc(db, TOURS_COLLECTION, id);
    batch.delete(tourRef);

    await batch.commit();
    return { success: true };
  } catch (error) {
    console.error("Error deleting tour:", error);
    return { success: false, error };
  }
};

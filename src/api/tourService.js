import { collection, addDoc, onSnapshot, query, serverTimestamp } from 'firebase/firestore';
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

export const createTour = async (name, pricePerHead, adminId) => {
  try {
    const docRef = await addDoc(collection(db, TOURS_COLLECTION), {
      name: name.trim(),
      pricePerHead: Number(pricePerHead),
      createdBy: adminId,
      createdAt: serverTimestamp()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error creating tour:", error);
    return { success: false, error };
  }
};

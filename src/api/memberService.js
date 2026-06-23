import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from './firebaseConfig';

const MEMBERS_COLLECTION = 'members';

export const subscribeToMembersByCustomer = (customerId, callback) => {
  const q = query(collection(db, MEMBERS_COLLECTION), where('customerId', '==', customerId));
  return onSnapshot(q, (snapshot) => {
    const members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(members, null);
  }, error => callback(null, error));
};

import { collection, onSnapshot, query, where, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from './firebaseConfig';

const CUSTOMERS_COLLECTION = 'customers';
const MEMBERS_COLLECTION = 'members';

export const subscribeToCustomersByTour = (tourId, callback) => {
  const q = query(collection(db, CUSTOMERS_COLLECTION), where('tourId', '==', tourId));
  return onSnapshot(q, (snapshot) => {
    const customers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    customers.sort((a,b) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return timeB - timeA;
    });

    callback(customers, null);
  }, error => callback(null, error));
};

export const createCustomerAndMembers = async (tourId, pricePerHead, groupType, membersArray, headMemberIndex) => {
  try {
    const batch = writeBatch(db);
    const customerRef = doc(collection(db, CUSTOMERS_COLLECTION));
    
    let headMemberDocId = null;
    
    membersArray.forEach((member, index) => {
      const memberRef = doc(collection(db, MEMBERS_COLLECTION));
      if (index === headMemberIndex) {
        headMemberDocId = memberRef.id;
        // Also save the name directly on the customer for easy UI rendering
        batch.set(customerRef, { headMemberName: member.name }, { merge: true });
      }
      batch.set(memberRef, {
        customerId: customerRef.id,
        name: member.name.trim(),
        age: Number(member.age),
        gender: member.gender,
        createdAt: serverTimestamp()
      });
    });

    const membersCount = membersArray.length;
    const totalAmount = membersCount * Number(pricePerHead);

    batch.set(customerRef, {
      tourId,
      groupType,
      membersCount,
      headMemberId: headMemberDocId,
      pricePerHead: Number(pricePerHead),
      totalAmount,
      paidAmount: 0,
      dueAmount: totalAmount,
      createdAt: serverTimestamp()
    }, { merge: true });

    await batch.commit();
    return { success: true };
  } catch (error) {
    console.error("Error creating customer", error);
    return { success: false, error };
  }
};

import { collection, onSnapshot, query, where, doc, writeBatch, serverTimestamp, increment, getDocs } from 'firebase/firestore';
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

export const createCustomerAndMembers = async (tourId, pricePerHead, groupType, membersArray, headMemberIndex, phoneNumber = '', pnr = '', bookingType = 'tour', journeyDate = null) => {
  try {
    const batch = writeBatch(db);
    const customerRef = doc(collection(db, CUSTOMERS_COLLECTION));
    
    let headMemberDocId = null;
    
    membersArray.forEach((member, index) => {
      const memberRef = doc(collection(db, MEMBERS_COLLECTION));
      if (index === headMemberIndex) {
        headMemberDocId = memberRef.id;
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
      phoneNumber: phoneNumber.trim(),
      pnr: pnr.trim(),
      bookingType: bookingType,
      journeyDate: journeyDate ? new Date(journeyDate) : null,
      createdAt: serverTimestamp()
    }, { merge: true });

    // Increment passenger count on the Tour
    const tourRef = doc(db, 'tours', tourId);
    batch.update(tourRef, { passengerCount: increment(membersCount) });

    await batch.commit();
    return { success: true };
  } catch (error) {
    console.error("Error creating customer", error);
    return { success: false, error };
  }
};

export const deleteCustomer = async (customerId, tourId, membersCount) => {
  try {
    const batch = writeBatch(db);
    
    // Delete Members
    const membersQuery = query(collection(db, MEMBERS_COLLECTION), where('customerId', '==', customerId));
    const membersSnap = await getDocs(membersQuery);
    membersSnap.forEach(mDoc => batch.delete(mDoc.ref));
    
    // Delete Payments
    const paymentsQuery = query(collection(db, 'payments'), where('customerId', '==', customerId));
    const paymentsSnap = await getDocs(paymentsQuery);
    paymentsSnap.forEach(pDoc => batch.delete(pDoc.ref));
    
    // Delete Customer
    const customerRef = doc(db, CUSTOMERS_COLLECTION, customerId);
    batch.delete(customerRef);
    
    // Decrement passenger count on Tour
    if (tourId && membersCount) {
      const tourRef = doc(db, 'tours', tourId);
      batch.update(tourRef, { passengerCount: increment(-membersCount) });
    }

    await batch.commit();
    return { success: true };
  } catch (error) {
    console.error("Error deleting customer", error);
    return { success: false, error };
  }
};

export const updateCustomerAndMembers = async (customerId, tourId, pricePerHead, groupType, newMembersArray, headMemberIndex, oldMembersCount, currentPaid, phoneNumber = '', pnr = '', bookingType = 'tour', journeyDate = null) => {
  try {
    const batch = writeBatch(db);
    
    // Simplest approach: Delete old members and create new ones.
    const membersQuery = query(collection(db, MEMBERS_COLLECTION), where('customerId', '==', customerId));
    const oldMembersSnap = await getDocs(membersQuery);
    oldMembersSnap.forEach(mDoc => batch.delete(mDoc.ref));
    
    let headMemberDocId = null;
    const customerRef = doc(db, CUSTOMERS_COLLECTION, customerId);
    
    let headName = '';
    newMembersArray.forEach((member, index) => {
      const memberRef = doc(collection(db, MEMBERS_COLLECTION));
      if (index === headMemberIndex) {
        headMemberDocId = memberRef.id;
        headName = member.name;
      }
      batch.set(memberRef, {
        customerId: customerId,
        name: member.name.trim(),
        age: Number(member.age),
        gender: member.gender,
        createdAt: serverTimestamp() // Or keep old timestamp, but recreating is easier
      });
    });

    const newMembersCount = newMembersArray.length;
    const totalAmount = newMembersCount * Number(pricePerHead);
    const dueAmount = totalAmount - currentPaid;

    batch.update(customerRef, {
      groupType,
      membersCount: newMembersCount,
      headMemberId: headMemberDocId,
      headMemberName: headName,
      pricePerHead: Number(pricePerHead),
      totalAmount,
      dueAmount: dueAmount > 0 ? dueAmount : 0, // don't allow negative due easily, but in real case it could be a refund
      phoneNumber: phoneNumber.trim(),
      pnr: pnr.trim(),
      bookingType: bookingType,
      journeyDate: journeyDate ? new Date(journeyDate) : null
    });

    // Update tour passenger count if members count changed
    if (newMembersCount !== oldMembersCount) {
      const diff = newMembersCount - oldMembersCount;
      const tourRef = doc(db, 'tours', tourId);
      batch.update(tourRef, { passengerCount: increment(diff) });
    }

    await batch.commit();
    return { success: true };
  } catch (error) {
    console.error("Error updating customer", error);
    return { success: false, error };
  }
};

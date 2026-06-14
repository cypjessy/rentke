import {
  collection,
  doc,
  addDoc,
  updateDoc,
  serverTimestamp,
  onSnapshot,
  query,
  where,
  orderBy,
  type Unsubscribe,
  type Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";

// ───── Types ─────

export type PaymentMethod = "M-Pesa" | "Cash" | "Bank Transfer" | "Cheque";
export type PaymentStatus = "completed" | "pending" | "failed" | "refunded";

export interface PaymentData {
  id: string;
  unitId: string;
  unitName: string;
  propertyId: string;
  propertyName: string;
  landlordId: string;
  tenantName: string;
  tenantId: string | null;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  notes: string;
  recordedBy: string; // landlord's uid
  paymentDate: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface PaymentFormData {
  unitId: string;
  unitName: string;
  propertyId: string;
  propertyName: string;
  tenantName: string;
  tenantId: string | null;
  amount: number;
  method: PaymentMethod;
  notes: string;
  paymentDate: string;
}

// ───── Refs ─────

const paymentsRef = collection(db, "payments");

// ───── Listeners ─────

/** Listen to all payments for a landlord in real-time, newest first. */
export function listenToPayments(
  landlordId: string,
  onData: (payments: PaymentData[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const q = query(
    paymentsRef,
    where("landlordId", "==", landlordId),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: PaymentData[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          unitId: data.unitId || "",
          unitName: data.unitName || "",
          propertyId: data.propertyId || "",
          propertyName: data.propertyName || "",
          landlordId: data.landlordId || "",
          tenantName: data.tenantName || "",
          tenantId: data.tenantId || null,
          amount: data.amount || 0,
          method: (data.method as PaymentMethod) || "M-Pesa",
          status: (data.status as PaymentStatus) || "completed",
          notes: data.notes || "",
          recordedBy: data.recordedBy || "",
          paymentDate: data.paymentDate || "",
          createdAt: data.createdAt || null,
          updatedAt: data.updatedAt || null,
        };
      });
      onData(list);
    },
    (err) => onError(err)
  );
}

/** Listen to payments for a specific unit. */
export function listenToUnitPayments(
  unitId: string,
  onData: (payments: PaymentData[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const q = query(
    paymentsRef,
    where("unitId", "==", unitId),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(q, (snapshot) => {
    const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as PaymentData));
    onData(list);
  }, (err) => onError(err));
}

// ───── Mutations ─────

/**
 * Record a rent payment: creates a payment record in the payments collection
 * AND updates the unit's payment status to "Paid".
 */
export async function recordRentPayment(
  landlordId: string,
  data: PaymentFormData,
  unitId: string
): Promise<string> {
  // Create payment record
  const docRef = await addDoc(paymentsRef, {
    ...data,
    landlordId,
    recordedBy: landlordId,
    status: "completed",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Update unit's payment status
  try {
    await updateDoc(doc(db, "units", unitId), {
      payment: "Paid",
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn("Failed to update unit payment status:", err);
  }

  return docRef.id;
}

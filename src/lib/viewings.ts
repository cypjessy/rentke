import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot,
  query,
  where,
  orderBy,
  type Unsubscribe,
  type Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";

export interface ViewingData {
  id: string;
  propertyId: string;
  propertyName: string;
  unitId: string;
  unitName: string;
  landlordId: string;
  tenantId: string | null;
  tenantName: string;
  tenantPhone: string;
  tenantInitials: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  date: string;
  startTime: string;
  endTime: string;
  duration: string;
  notes: string;
  outcome: string;
  statusColor: string;
  statusBg: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface ViewingFormData {
  propertyId: string;
  propertyName: string;
  unitId: string;
  unitName: string;
  tenantName: string;
  tenantPhone: string;
  tenantId?: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: string;
  notes: string;
}

const viewingsRef = collection(db, "viewings");

function getStatusStyle(status: string): { color: string; bg: string } {
  switch (status) {
    case "pending": return { color: "#eab308", bg: "rgba(234,179,8,0.12)" };
    case "confirmed": return { color: "#047857", bg: "rgba(4,120,87,0.12)" };
    case "completed": return { color: "#3b82f6", bg: "rgba(59,130,246,0.12)" };
    case "cancelled": return { color: "#ef4444", bg: "rgba(239,68,68,0.12)" };
    default: return { color: "#a3a3a3", bg: "rgba(255,255,255,0.05)" };
  }
}

/** Listen to a landlord's viewings in real-time. */
export function listenToViewings(
  landlordId: string,
  onData: (viewings: ViewingData[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const q = query(
    viewingsRef,
    where("landlordId", "==", landlordId),
    orderBy("date", "desc")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: ViewingData[] = snapshot.docs.map((d) => {
        const data = d.data();
        const status = data.status || "pending";
        const style = getStatusStyle(status);
        return {
          id: d.id,
          propertyId: data.propertyId || "",
          propertyName: data.propertyName || "",
          unitId: data.unitId || "",
          unitName: data.unitName || "",
          landlordId: data.landlordId || "",
          tenantId: data.tenantId || null,
          tenantName: data.tenantName || "",
          tenantPhone: data.tenantPhone || "",
          tenantInitials: data.tenantInitials || "",
          status,
          date: data.date || "",
          startTime: data.startTime || "",
          endTime: data.endTime || "",
          duration: data.duration || "30 min",
          notes: data.notes || "",
          outcome: data.outcome || "",
          statusColor: style.color,
          statusBg: style.bg,
          createdAt: data.createdAt || null,
          updatedAt: data.updatedAt || null,
        };
      });
      onData(list);
    },
    (err) => onError(err)
  );
}

/** Schedule a new viewing. */
export async function scheduleViewing(
  landlordId: string,
  data: ViewingFormData
): Promise<string> {
  const initials = data.tenantName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const docRef = await addDoc(viewingsRef, {
    ...data,
    landlordId,
    tenantId: data.tenantId || null,
    tenantInitials: initials,
    status: "pending",
    outcome: "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

/** Confirm a viewing. */
export async function confirmViewing(viewingId: string): Promise<void> {
  await updateDoc(doc(viewingsRef, viewingId), {
    status: "confirmed",
    updatedAt: serverTimestamp(),
  });
}

/** Cancel a viewing. */
export async function cancelViewing(
  viewingId: string,
  reason?: string
): Promise<void> {
  await updateDoc(doc(viewingsRef, viewingId), {
    status: "cancelled",
    notes: reason ? `Cancelled: ${reason}` : "Cancelled",
    updatedAt: serverTimestamp(),
  });
}

/** Complete a viewing. */
export async function completeViewing(
  viewingId: string,
  outcome: string,
  notes?: string
): Promise<void> {
  await updateDoc(doc(viewingsRef, viewingId), {
    status: "completed",
    outcome,
    notes: notes ? `${notes}` : outcome,
    updatedAt: serverTimestamp(),
  });
}

/** Reschedule a viewing. */
export async function rescheduleViewing(
  viewingId: string,
  date: string,
  startTime: string,
  endTime: string,
  reason?: string
): Promise<void> {
  await updateDoc(doc(viewingsRef, viewingId), {
    date,
    startTime,
    endTime,
    status: "pending",
    notes: reason ? `Rescheduled: ${reason}` : "Rescheduled",
    updatedAt: serverTimestamp(),
  });
}

/** Delete a viewing. */
export async function deleteViewing(viewingId: string): Promise<void> {
  await deleteDoc(doc(viewingsRef, viewingId));
}

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

export type ComplaintUrgency = "low" | "medium" | "high";
export type ComplaintCategory = "plumbing" | "electrical" | "noise" | "security" | "cleanliness" | "other";
export type ComplaintStatus = "open" | "in-progress" | "resolved";

export interface ComplaintData {
  id: string;
  unitId: string;
  propertyId: string;
  propertyName: string;
  unitName: string;
  tenantId: string;
  landlordId: string;
  tenantName: string;
  category: ComplaintCategory;
  description: string;
  urgency: ComplaintUrgency;
  status: ComplaintStatus;
  imageUrl: string | null;
  replies: number;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface ComplaintFormData {
  unitId: string;
  propertyId: string;
  propertyName: string;
  unitName: string;
  landlordId: string;
  tenantName: string;
  category: ComplaintCategory;
  description: string;
  urgency: ComplaintUrgency;
}

export type VacateStatus = "pending" | "approved" | "rejected";

export interface VacatingNoticeData {
  id: string;
  unitId: string;
  propertyId: string;
  tenantId: string;
  landlordId: string;
  tenantName: string;
  unitName: string;
  propertyName: string;
  moveOutDate: string;
  reason: string;
  details: string;
  status: VacateStatus;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface VacatingNoticeFormData {
  unitId: string;
  propertyId: string;
  landlordId: string;
  tenantName: string;
  unitName: string;
  propertyName: string;
  moveOutDate: string;
  reason: string;
  details: string;
}

// ───── Refs ─────

const complaintsRef = collection(db, "complaints");
const vacatingRef = collection(db, "vacatingNotices");

// ───── Listeners ─────

/** Listen to a tenant's complaints in real-time. */
export function listenToTenantComplaints(
  tenantId: string,
  onData: (complaints: ComplaintData[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const q = query(
    complaintsRef,
    where("tenantId", "==", tenantId),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: ComplaintData[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          unitId: data.unitId || "",
          propertyId: data.propertyId || "",
          propertyName: data.propertyName || "",
          unitName: data.unitName || "",
          tenantId: data.tenantId || "",
          landlordId: data.landlordId || "",
          tenantName: data.tenantName || "",
          category: (data.category as ComplaintCategory) || "other",
          description: data.description || "",
          urgency: (data.urgency as ComplaintUrgency) || "medium",
          status: (data.status as ComplaintStatus) || "open",
          imageUrl: data.imageUrl || null,
          replies: data.replies || 0,
          createdAt: data.createdAt || null,
          updatedAt: data.updatedAt || null,
        };
      });
      onData(list);
    },
    (err) => onError(err)
  );
}

/** Listen to a tenant's vacating notices in real-time. */
export function listenToTenantVacatingNotices(
  tenantId: string,
  onData: (notices: VacatingNoticeData[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const q = query(
    vacatingRef,
    where("tenantId", "==", tenantId),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: VacatingNoticeData[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          unitId: data.unitId || "",
          propertyId: data.propertyId || "",
          tenantId: data.tenantId || "",
          landlordId: data.landlordId || "",
          tenantName: data.tenantName || "",
          unitName: data.unitName || "",
          propertyName: data.propertyName || "",
          moveOutDate: data.moveOutDate || "",
          reason: data.reason || "",
          details: data.details || "",
          status: (data.status as VacateStatus) || "pending",
          createdAt: data.createdAt || null,
          updatedAt: data.updatedAt || null,
        };
      });
      onData(list);
    },
    (err) => onError(err)
  );
}

/** Listen to a landlord's complaints (for the dashboard). */
export function listenToLandlordComplaints(
  landlordId: string,
  onData: (complaints: ComplaintData[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const q = query(
    complaintsRef,
    where("landlordId", "==", landlordId),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: ComplaintData[] = snapshot.docs.map((d) => {
        const data = d.data();
        return { id: d.id, ...data } as ComplaintData;
      });
      onData(list);
    },
    (err) => onError(err)
  );
}

/** Listen to a landlord's vacating notices. */
export function listenToLandlordVacatingNotices(
  landlordId: string,
  onData: (notices: VacatingNoticeData[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const q = query(
    vacatingRef,
    where("landlordId", "==", landlordId),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: VacatingNoticeData[] = snapshot.docs.map((d) => {
        const data = d.data();
        return { id: d.id, ...data } as VacatingNoticeData;
      });
      onData(list);
    },
    (err) => onError(err)
  );
}

// ───── Mutations ─────

/** Submit a new complaint. Writes to Firestore and creates a notification for the landlord. */
export async function submitComplaint(
  tenantId: string,
  data: ComplaintFormData
): Promise<string> {
  const docRef = await addDoc(complaintsRef, {
    ...data,
    tenantId,
    status: "open",
    replies: 0,
    imageUrl: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Create notification for landlord
  try {
    const { createNotification } = await import("./notifications");
    await createNotification(
      data.landlordId,
      "maintenance_update",
      "New Maintenance Complaint",
      `${data.tenantName} reported: ${data.description.slice(0, 80)}...`,
      "/issues"
    );
  } catch {
    // Silently skip — notification is non-critical
  }

  return docRef.id;
}

/** Submit a vacating notice. */
export async function submitVacatingNotice(
  tenantId: string,
  data: VacatingNoticeFormData
): Promise<string> {
  const docRef = await addDoc(vacatingRef, {
    ...data,
    tenantId,
    status: "pending",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Create notification for landlord
  try {
    const { createNotification } = await import("./notifications");
    await createNotification(
      data.landlordId,
      "vacate_notice",
      "Vacating Notice Received",
      `${data.tenantName} plans to vacate ${data.unitName} on ${data.moveOutDate}. Reason: ${data.reason}`,
      "/issues"
    );
  } catch {
    // Silently skip
  }

  return docRef.id;
}

/** Update a complaint's status (used by landlord). */
export async function updateComplaintStatus(
  complaintId: string,
  status: ComplaintStatus
): Promise<void> {
  await updateDoc(doc(complaintsRef, complaintId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

/** Update a vacating notice's status (used by landlord). */
export async function updateVacatingNoticeStatus(
  noticeId: string,
  status: VacateStatus
): Promise<void> {
  await updateDoc(doc(vacatingRef, noticeId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

// ───── Category helpers ─────

export const COMPLAINT_CATEGORIES: {
  key: ComplaintCategory;
  label: string;
  emoji: string;
}[] = [
  { key: "plumbing", label: "Plumbing", emoji: "💧" },
  { key: "electrical", label: "Electrical", emoji: "⚡" },
  { key: "noise", label: "Noise", emoji: "🔊" },
  { key: "security", label: "Security", emoji: "🛡️" },
  { key: "cleanliness", label: "Cleanliness", emoji: "🧹" },
  { key: "other", label: "Other", emoji: "📝" },
];

export const VACATE_REASONS: {
  key: string;
  emoji: string;
  label: string;
}[] = [
  { key: "relocating", emoji: "🏠", label: "Relocating" },
  { key: "affordability", emoji: "💰", label: "Affordability" },
  { key: "maintenance", emoji: "🔧", label: "Maintenance" },
  { key: "other", emoji: "📝", label: "Other" },
];

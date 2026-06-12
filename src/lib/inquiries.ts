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

export interface InquiryData {
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
  tenantAvatarBg: string;
  tenantAvatarColor: string;
  message: string;
  status: "new" | "progress" | "responded" | "archived";
  unread: boolean;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface InquiryReplyData {
  text: string;
  senderId: string;
  senderName: string;
}

const inquiriesRef = collection(db, "inquiries");
const repliesRef = collection(db, "inquiryReplies");

/** Colors for avatar badges based on index */
const AVATAR_COLORS = [
  { bg: "rgba(4,120,87,0.12)", color: "#047857" },
  { bg: "rgba(234,179,8,0.12)", color: "#eab308" },
  { bg: "rgba(168,85,247,0.12)", color: "#a855f7" },
  { bg: "rgba(59,130,246,0.12)", color: "#3b82f6" },
  { bg: "rgba(236,72,153,0.12)", color: "#ec4899" },
  { bg: "rgba(249,115,22,0.12)", color: "#f97316" },
];

function getAvatarStyle(seed: string) {
  const idx = seed.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

/** Listen to a landlord's inquiries in real-time. */
export function listenToInquiries(
  landlordId: string,
  onData: (inquiries: InquiryData[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const q = query(
    inquiriesRef,
    where("landlordId", "==", landlordId),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: InquiryData[] = snapshot.docs.map((d) => {
        const data = d.data();
        const avatar = getAvatarStyle(data.tenantName || "User");
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
          tenantAvatarBg: avatar.bg,
          tenantAvatarColor: avatar.color,
          message: data.message || "",
          status: data.status || "new",
          unread: data.unread !== false,
          createdAt: data.createdAt || null,
          updatedAt: data.updatedAt || null,
        };
      });
      onData(list);
    },
    (err) => onError(err)
  );
}

/** Create a new inquiry (from tenant side). */
export async function createInquiry(
  landlordId: string,
  data: {
    propertyId: string;
    propertyName: string;
    unitId: string;
    unitName: string;
    tenantId?: string;
    tenantName: string;
    tenantPhone: string;
    message: string;
  }
): Promise<string> {
  const initials = data.tenantName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const docRef = await addDoc(inquiriesRef, {
    ...data,
    landlordId,
    tenantInitials: initials,
    status: "new",
    unread: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

/** Mark inquiry as read. */
export async function markInquiryRead(inquiryId: string): Promise<void> {
  await updateDoc(doc(inquiriesRef, inquiryId), { unread: false });
}

/** Mark inquiry as progress. */
export async function markInquiryProgress(inquiryId: string): Promise<void> {
  await updateDoc(doc(inquiriesRef, inquiryId), {
    status: "progress",
    unread: false,
    updatedAt: serverTimestamp(),
  });
}

/** Mark inquiry as responded. */
export async function markInquiryResponded(inquiryId: string): Promise<void> {
  await updateDoc(doc(inquiriesRef, inquiryId), {
    status: "responded",
    updatedAt: serverTimestamp(),
  });
}

/** Archive an inquiry. */
export async function archiveInquiry(inquiryId: string): Promise<void> {
  await updateDoc(doc(inquiriesRef, inquiryId), {
    status: "archived",
    updatedAt: serverTimestamp(),
  });
}

/** Reply to an inquiry. */
export async function replyToInquiry(
  inquiryId: string,
  reply: InquiryReplyData
): Promise<void> {
  // Add reply subdocument
  await addDoc(repliesRef, {
    inquiryId,
    ...reply,
    createdAt: serverTimestamp(),
  });

  // Mark as responded
  await updateDoc(doc(inquiriesRef, inquiryId), {
    status: "responded",
    updatedAt: serverTimestamp(),
  });
}

/** Delete an inquiry. */
export async function deleteInquiry(inquiryId: string): Promise<void> {
  await deleteDoc(doc(inquiriesRef, inquiryId));
}

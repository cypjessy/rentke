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
  getDocs,
  writeBatch,
  type Unsubscribe,
  type Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";

// ---- Types ----

export type NotificationType =
  | "new_listing"
  | "landlord_reply"
  | "viewing_reminder"
  | "price_drop"
  | "inquiry_update"
  | "message"
  | "maintenance_update"
  | "vacate_notice";

export interface NotificationData {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  description: string;
  link?: string;
  read: boolean;
  createdAt: Timestamp | null;
}

// ---- Helpers ----

function getNotificationMeta(type: NotificationType): {
  icon: string;
  iconBg: string;
  iconColor: string;
} {
  switch (type) {
    case "new_listing":
      return { icon: "🏠", iconBg: "rgba(4,120,87,0.15)", iconColor: "#047857" };
    case "landlord_reply":
      return { icon: "💬", iconBg: "rgba(59,130,246,0.15)", iconColor: "#3b82f6" };
    case "viewing_reminder":
      return { icon: "📅", iconBg: "rgba(255,255,255,0.05)", iconColor: "#a3a3a3" };
    case "price_drop":
      return { icon: "💰", iconBg: "rgba(234,179,8,0.15)", iconColor: "#eab308" };
    case "inquiry_update":
      return { icon: "📩", iconBg: "rgba(168,85,247,0.15)", iconColor: "#a855f7" };
    case "message":
      return { icon: "✉️", iconBg: "rgba(4,120,87,0.15)", iconColor: "#047857" };
    case "maintenance_update":
      return { icon: "🔧", iconBg: "rgba(168,85,247,0.15)", iconColor: "#a855f7" };
    case "vacate_notice":
      return { icon: "🚪", iconBg: "rgba(234,179,8,0.15)", iconColor: "#eab308" };
  }
}

function getNotificationLink(type: NotificationType): string {
  switch (type) {
    case "new_listing": return "/browse/explore";
    case "landlord_reply": return "/browse/messages";
    case "viewing_reminder": return "/browse/viewings";
    case "price_drop": return "/browse/saved";
    case "inquiry_update": return "/browse/messages";
    case "message": return "/browse/messages";
    case "maintenance_update": return "/browse/my-unit";
    case "vacate_notice": return "/browse/my-unit";
  }
}

export { getNotificationMeta, getNotificationLink };

// ---- Refs ----

const notificationsRef = collection(db, "notifications");

// ---- Listeners ----

/**
 * Listen to a user's notifications in real-time, ordered by newest first.
 */
export function listenToNotifications(
  userId: string,
  onData: (notifications: NotificationData[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const q = query(
    notificationsRef,
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: NotificationData[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          userId: data.userId || "",
          type: (data.type as NotificationType) || "new_listing",
          title: data.title || "",
          description: data.description || "",
          link: data.link || undefined,
          read: data.read || false,
          createdAt: data.createdAt || null,
        };
      });
      onData(list);
    },
    (err) => onError(err)
  );
}

// ---- Read / Unread ----

/** Send a notification to a user. */
export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  description: string,
  link?: string
): Promise<string> {
  const docRef = await addDoc(notificationsRef, {
    userId,
    type,
    title,
    description,
    link: link || getNotificationLink(type),
    read: false,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

/** Mark a single notification as read. */
export async function markNotificationRead(notifId: string): Promise<void> {
  await updateDoc(doc(notificationsRef, notifId), { read: true });
}

/** Mark all of a user's unread notifications as read. */
export async function markAllNotificationsRead(userId: string): Promise<void> {
  const q = query(
    notificationsRef,
    where("userId", "==", userId),
    where("read", "==", false)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return;

  const batch = writeBatch(db);
  snapshot.forEach((d) => {
    batch.update(d.ref, { read: true });
  });
  await batch.commit();
}

// ---- Delete ----

/** Delete a single notification. */
export async function deleteNotification(notifId: string): Promise<void> {
  await deleteDoc(doc(notificationsRef, notifId));
}

/** Delete all of a user's notifications. */
export async function clearAllNotifications(userId: string): Promise<void> {
  const q = query(notificationsRef, where("userId", "==", userId));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return;

  const batch = writeBatch(db);
  snapshot.forEach((d) => {
    batch.delete(d.ref);
  });
  await batch.commit();
}

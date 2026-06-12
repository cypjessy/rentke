import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  increment,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  type Unsubscribe,
  type Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type { ListingData } from "./listings";

// ─── Admin Listeners ─────────────────────────────────────────────────────────

/** Listen to ALL listings (admin view — no landlordId filter). */
export function listenToAllListings(
  onData: (listings: ListingData[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const q = query(
    collection(db, "listings"),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: ListingData[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          propertyId: data.propertyId || "",
          propertyName: data.propertyName || "",
          unitId: data.unitId || "",
          unitName: data.unitName || "",
          landlordId: data.landlordId || "",
          title: data.title || "",
          description: data.description || "",
          rent: data.rent || 0,
          images: data.images || [],
          amenities: data.amenities || [],
          status: data.status || "draft",
          boosted: data.boosted || false,
          boostExpiry: data.boostExpiry || null,
          views: data.views || 0,
          inquiries: data.inquiries || 0,
          saves: data.saves || 0,
          createdAt: data.createdAt || null,
          expiresAt: data.expiresAt || null,
          updatedAt: data.updatedAt || null,
        };
      });
      onData(list);
    },
    (err) => onError(err)
  );
}

// ─── Admin Actions ────────────────────────────────────────────────────────────

/** Approve a listing (set status to active). */
export async function approveListing(listingId: string): Promise<void> {
  await updateDoc(doc(db, "listings", listingId), {
    status: "active",
    updatedAt: serverTimestamp(),
  });
}

/** Reject / flag a listing. */
export async function rejectListing(
  listingId: string,
  reason: string
): Promise<void> {
  await updateDoc(doc(db, "listings", listingId), {
    status: "draft",
    rejectionReason: reason,
    updatedAt: serverTimestamp(),
  });
}

/** Flag a listing for review. */
export async function flagListing(listingId: string): Promise<void> {
  await updateDoc(doc(db, "listings", listingId), {
    flagged: true,
    updatedAt: serverTimestamp(),
  });
}

/** Boost a listing. */
export async function boostListingAdmin(
  listingId: string,
  days: number
): Promise<void> {
  const boostExpiry = new Date();
  boostExpiry.setDate(boostExpiry.getDate() + days);
  await updateDoc(doc(db, "listings", listingId), {
    boosted: true,
    boostExpiry,
    updatedAt: serverTimestamp(),
  });
}

/** Clear flags on a listing. */
export async function clearListingFlags(listingId: string): Promise<void> {
  await updateDoc(doc(db, "listings", listingId), {
    flagged: false,
    updatedAt: serverTimestamp(),
  });
}

/** Delete a listing. */
export async function deleteListingAdmin(listingId: string): Promise<void> {
  await updateDoc(doc(db, "listings", listingId), {
    status: "expired",
    updatedAt: serverTimestamp(),
  });
}

// ─── Admin Dashboard Aggregates ──────────────────────────────────────────────

export interface AdminDashboardData {
  totalListings: number;
  activeListings: number;
  pendingListings: number;
  totalLandlords: number;
  monthlyRevenue: number;
}

/** Listen to dashboard aggregate data. */
export function listenToAdminDashboard(
  onData: (data: AdminDashboardData) => void,
  onError: (err: Error) => void
): Unsubscribe {
  return listenToAllListings(
    (listings) => {
      const totalListings = listings.length;
      const activeListings = listings.filter((l) => l.status === "active").length;
      const pendingListings = listings.filter((l) => l.status === "draft").length;

      // Unique landlords
      const landlordIds = new Set(listings.map((l) => l.landlordId).filter(Boolean));
      const totalLandlords = landlordIds.size;

      // Monthly revenue (estimated from active listing rents)
      const monthlyRevenue = listings
        .filter((l) => l.status === "active")
        .reduce((sum, l) => sum + (l.rent || 0) * 0.1, 0); // 10% commission estimate

      onData({
        totalListings,
        activeListings,
        pendingListings,
        totalLandlords,
        monthlyRevenue: Math.round(monthlyRevenue),
      });
    },
    (err) => onError(err)
  );
}

// ─── Transaction Types ───────────────────────────────────────────────────────

export type TxType = "subscription" | "boost" | "commission" | "refund";
export type TxStatus = "success" | "pending" | "failed" | "refunded";

export interface TransactionData {
  id: string;
  type: string;
  typeKey: TxType;
  amount: number;
  fromName: string;
  fromId: string;
  toName: string;
  method: string;
  ref: string;
  date: string;
  status: TxStatus;
  createdAt: Timestamp | null;
  disputed: boolean;
  disputeReason: string;
}

export interface WalletStats {
  totalRevenue: number;
  subscriptionRevenue: number;
  boostRevenue: number;
  commissionRevenue: number;
  refundAmount: number;
  activeSubscriptions: number;
  activeBoosts: number;
  transactionCount: number;
}

const transactionsRef = collection(db, "transactions");

/** Listen to all transactions in real-time. */
export function listenToTransactions(
  onData: (txns: TransactionData[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const q = query(transactionsRef, orderBy("createdAt", "desc"), limit(100));

  return onSnapshot(q, (snapshot) => {
    const list: TransactionData[] = snapshot.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        type: data.type || "",
        typeKey: (data.typeKey as TxType) || "commission",
        amount: data.amount || 0,
        fromName: data.fromName || "",
        fromId: data.fromId || "",
        toName: data.toName || "RentKe Platform",
        method: data.method || "M-Pesa",
        ref: data.ref || "",
        date: data.date || "",
        status: (data.status as TxStatus) || "success",
        createdAt: data.createdAt || null,
        disputed: data.disputed || false,
        disputeReason: data.disputeReason || "",
      };
    });
    onData(list);
  }, (err) => onError(err));
}

/** Compute wallet stats from transactions. */
export function listenToWalletStats(
  onData: (stats: WalletStats) => void,
  onError: (err: Error) => void
): Unsubscribe {
  return listenToTransactions((txns) => {
    const total = txns
      .filter((t) => t.status === "success" && t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);
    const subscription = txns
      .filter((t) => t.typeKey === "subscription" && t.status === "success")
      .reduce((sum, t) => sum + t.amount, 0);
    const boost = txns
      .filter((t) => t.typeKey === "boost" && t.status === "success")
      .reduce((sum, t) => sum + t.amount, 0);
    const commission = txns
      .filter((t) => t.typeKey === "commission" && t.status === "success")
      .reduce((sum, t) => sum + t.amount, 0);
    const refund = txns
      .filter((t) => t.typeKey === "refund")
      .reduce((sum, t) => sum + t.amount, 0);
    const activeSubs = txns.filter((t) => t.typeKey === "subscription" && t.status === "success").length;
    const activeBoostsCount = txns.filter((t) => t.typeKey === "boost" && t.status === "success").length;

    onData({
      totalRevenue: total,
      subscriptionRevenue: subscription,
      boostRevenue: boost,
      commissionRevenue: commission,
      refundAmount: refund,
      activeSubscriptions: activeSubs,
      activeBoosts: activeBoostsCount,
      transactionCount: txns.length,
    });
  }, (err) => onError(err));
}

/** Refund a transaction. */
export async function refundTransaction(
  transactionId: string,
  reason: string,
  amount: number
): Promise<void> {
  await updateDoc(doc(transactionsRef, transactionId), {
    status: "refunded",
    refundReason: reason,
    refundAmount: amount,
    updatedAt: serverTimestamp(),
  });
}

/** Flag a transaction as disputed. */
export async function flagTransactionDispute(
  transactionId: string,
  reason: string
): Promise<void> {
  await updateDoc(doc(transactionsRef, transactionId), {
    disputed: true,
    disputeReason: reason,
    updatedAt: serverTimestamp(),
  });
}

// ─── Support Ticket Types ────────────────────────────────────────────────────

export type TicketPriority = "high" | "medium" | "low";
export type TicketStatus = "open" | "in-progress" | "escalated" | "resolved" | "closed";

export interface TicketData {
  id: string;
  title: string;
  priority: TicketPriority;
  status: TicketStatus;
  category: string;
  reporter: string;
  role: string;
  init: string;
  color: string;
  phone: string;
  property: string;
  assigned: string;
  created: string;
  desc: string;
  messages: number;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface TicketReplyData {
  text: string;
  senderId: string;
  senderName: string;
  createdAt: Timestamp | null;
}

const ticketsRef = collection(db, "tickets");

/** Listen to all support tickets in real-time. */
export function listenToTickets(
  onData: (tickets: TicketData[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const q = query(ticketsRef, orderBy("createdAt", "desc"));

  return onSnapshot(q, (snapshot) => {
    const list: TicketData[] = snapshot.docs.map((d) => {
      const data = d.data();
      const name = data.reporter || data.name || "Unknown";
      const nameParts = name.split(" ");
      const initials = nameParts.map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
      return {
        id: d.id,
        title: data.title || "",
        priority: (data.priority as TicketPriority) || "medium",
        status: (data.status as TicketStatus) || "open",
        category: data.category || "General",
        reporter: name,
        role: data.role || "Tenant",
        init: initials || "?",
        color: data.color || "#ef4444",
        phone: data.phone || "",
        property: data.property || "—",
        assigned: data.assigned || "Unassigned",
        created: data.created || "",
        desc: data.desc || data.description || "",
        messages: data.messages || 0,
        createdAt: data.createdAt || null,
        updatedAt: data.updatedAt || null,
      };
    });
    onData(list);
  }, (err) => onError(err));
}

/** Reply to a support ticket. */
export async function replyToTicket(
  ticketId: string,
  reply: { text: string; senderId: string; senderName: string; notify: boolean }
): Promise<void> {
  const repliesColl = collection(db, "tickets", ticketId, "replies");
  await addDoc(repliesColl, {
    text: reply.text,
    senderId: reply.senderId,
    senderName: reply.senderName,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(ticketsRef, ticketId), {
    lastMessage: reply.text,
    messages: increment(1),
    updatedAt: serverTimestamp(),
  });
}

/** Assign a ticket to someone. */
export async function assignTicket(
  ticketId: string,
  assigneeName: string
): Promise<void> {
  await updateDoc(doc(ticketsRef, ticketId), {
    assigned: assigneeName,
    updatedAt: serverTimestamp(),
  });
}

/** Change ticket status. */
export async function changeTicketStatus(
  ticketId: string,
  newStatus: TicketStatus
): Promise<void> {
  await updateDoc(doc(ticketsRef, ticketId), {
    status: newStatus,
    updatedAt: serverTimestamp(),
  });
}

// ─── User Profile ────────────────────────────────────────────────────────────

export async function updateUserProfile(
  userId: string,
  data: {
    displayName?: string;
    email?: string;
    phoneNumber?: string;
    bio?: string;
    location?: string;
  }
): Promise<void> {
  await updateDoc(doc(db, "users", userId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function updateUserMpesa(
  userId: string,
  data: {
    mpesaType: "personal" | "till" | "paybill";
    mpesaNumber?: string;
    tillNumber?: string;
    businessName?: string;
    paybillNumber?: string;
    accountNumber?: string;
  }
): Promise<void> {
  await updateDoc(doc(db, "users", userId), {
    mpesa: data,
    updatedAt: serverTimestamp(),
  });
}


export interface AdminLandlordData {
  id: string;
  name: string;
  initials: string;
  phone: string;
  email: string;
  idNumber: string;
  location: string;
  joined: Timestamp | null;
  plan: string;
  status: "active" | "pending" | "suspended";
  verified: boolean;
  properties: number;
  units: number;
  revenue: number;
  color: string;
}

/** Listen to all users with landlord role. */
export function listenToLandlords(
  onData: (landlords: AdminLandlordData[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const q = query(
    collection(db, "users"),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: AdminLandlordData[] = snapshot.docs
        .map((d) => {
          const data = d.data();
          const name = data.displayName || data.name || data.email || "Unknown";
          const nameParts = name.split(" ");
          const initials = nameParts
            .map((n: string) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);

          return {
            id: d.id,
            name,
            initials: initials || "U",
            phone: data.phoneNumber || data.phone || "",
            email: data.email || "",
            idNumber: data.idNumber || "—",
            location: data.location || data.county || "Nairobi, Kenya",
            joined: data.createdAt || null,
            plan: data.plan || "Free",
            status: data.status || (data.suspended ? "suspended" : data.verified ? "active" : "pending"),
            verified: data.verified || false,
            properties: data.properties || 0,
            units: data.units || 0,
            revenue: data.revenue || 0,
            color: data.color || "#047857",
          };
        })
        .filter((l: AdminLandlordData) => {
          // Only show users with landlord role or that look like landlords
          return true; // Show all users in admin view
        });
      onData(list);
    },
    (err) => onError(err)
  );
}

/** Verify a landlord's ID. */
export async function verifyLandlord(
  landlordId: string
): Promise<void> {
  await updateDoc(doc(db, "users", landlordId), {
    verified: true,
    status: "active",
    updatedAt: serverTimestamp(),
  });
}

/** Suspend a landlord. */
export async function suspendLandlord(
  landlordId: string,
  reason: string,
  durationDays: number
): Promise<void> {
  const suspendedUntil = new Date();
  suspendedUntil.setDate(suspendedUntil.getDate() + durationDays);

  await updateDoc(doc(db, "users", landlordId), {
    status: "suspended",
    suspendedReason: reason,
    suspendedUntil,
    updatedAt: serverTimestamp(),
  });
}

/** Reinstate a suspended landlord. */
export async function reinstateLandlord(
  landlordId: string
): Promise<void> {
  await updateDoc(doc(db, "users", landlordId), {
    status: "active",
    suspendedReason: null,
    suspendedUntil: null,
    updatedAt: serverTimestamp(),
  });
}

/** Ban a landlord permanently. */
export async function banLandlord(landlordId: string): Promise<void> {
  await updateDoc(doc(db, "users", landlordId), {
    status: "suspended",
    banned: true,
    updatedAt: serverTimestamp(),
  });
}

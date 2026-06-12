import {
  doc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot,
  collection,
  query,
  where,
  getDoc,
  getDocs,
  type Unsubscribe,
  type Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type { ListingData } from "./listings";

// ---- Favorites ----

export interface FavoriteData {
  listingId: string;
  propertyName: string;
  title: string;
  location: string;
  price: number;
  image: string;
  landlordId: string;
  savedAt: Timestamp | null;
}

const favoritesRef = collection(db, "favorites");

/** Listen to a tenant's favorites in real-time. */
export function listenToFavorites(
  tenantId: string,
  onData: (favorites: FavoriteData[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const q = query(
    favoritesRef,
    where("tenantId", "==", tenantId),
    // orderBy("savedAt", "desc")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: FavoriteData[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          listingId: data.listingId || "",
          propertyName: data.propertyName || "",
          title: data.title || "",
          location: data.location || "",
          price: data.price || 0,
          image: data.image || "",
          landlordId: data.landlordId || "",
          savedAt: data.savedAt || null,
        };
      });
      onData(list);
    },
    (err) => onError(err)
  );
}

/** Toggle a favorite (add/remove). */
export async function toggleFavorite(
  tenantId: string,
  listing: {
    listingId: string;
    propertyName: string;
    title: string;
    location: string;
    price: number;
    image: string;
    landlordId: string;
  },
  isCurrentlyFavorited: boolean
): Promise<void> {
  const docId = `${tenantId}_${listing.listingId}`;
  const ref = doc(favoritesRef, docId);

  if (isCurrentlyFavorited) {
    await deleteDoc(ref);
  } else {
    await setDoc(ref, {
      tenantId,
      ...listing,
      savedAt: serverTimestamp(),
    });
  }
}

// ---- Saved Searches ----

export interface SavedSearchData {
  id: string;
  tenantId: string;
  title: string;
  emoji: string;
  filters: Record<string, unknown>;
  active: boolean;
  createdAt: Timestamp | null;
}

const savedSearchesRef = collection(db, "savedSearches");

/** Listen to a tenant's saved searches in real-time. */
export function listenToSavedSearches(
  tenantId: string,
  onData: (searches: SavedSearchData[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const q = query(
    savedSearchesRef,
    where("tenantId", "==", tenantId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: SavedSearchData[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          tenantId: data.tenantId || "",
          title: data.title || "",
          emoji: data.emoji || "🔍",
          filters: data.filters || {},
          active: data.active !== false,
          createdAt: data.createdAt || null,
        };
      });
      onData(list);
    },
    (err) => onError(err)
  );
}

/** Create a new saved search. */
export async function createSavedSearch(
  tenantId: string,
  data: {
    title: string;
    emoji: string;
    filters: Record<string, unknown>;
  }
): Promise<string> {
  const docRef = await addDoc(savedSearchesRef, {
    tenantId,
    ...data,
    active: true,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

/** Toggle saved search active state. */
export async function toggleSavedSearch(
  searchId: string,
  active: boolean
): Promise<void> {
  await updateDoc(doc(savedSearchesRef, searchId), { active });
}

/** Delete a saved search. */
export async function deleteSavedSearch(searchId: string): Promise<void> {
  await deleteDoc(doc(savedSearchesRef, searchId));
}

// ---- Browse Listings (tenant-visible) ----

/** Listen to all active listings (for the browse/explore pages). */
export function listenToBrowseListings(
  onData: (listings: ListingData[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const q = query(
    collection(db, "listings"),
    where("status", "==", "active")
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
          status: data.status || "active",
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

// ---- Tenant Viewings (browse portal) ----

import type { ViewingData } from "./viewings";

export { scheduleViewing, confirmViewing, cancelViewing } from "./viewings";

// ---- Tenant Inquiries ----

import type { InquiryData } from "./inquiries";

/** Listen to a tenant's own inquiries in real-time. */
export function listenToTenantInquiries(
  tenantId: string,
  onData: (inquiries: InquiryData[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const inqRef = collection(db, "inquiries");
  const q = query(inqRef, where("tenantId", "==", tenantId));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: InquiryData[] = snapshot.docs.map((d) => {
        const data = d.data();
        const status = (data.status as string) || "new";
        return {
          id: d.id,
          propertyId: (data.propertyId as string) || "",
          propertyName: (data.propertyName as string) || "",
          unitId: (data.unitId as string) || "",
          unitName: (data.unitName as string) || "",
          landlordId: (data.landlordId as string) || "",
          tenantId: (data.tenantId as string) || null,
          tenantName: (data.tenantName as string) || "",
          tenantPhone: (data.tenantPhone as string) || "",
          tenantInitials: (data.tenantInitials as string) || "",
          tenantAvatarBg: (data.tenantAvatarBg as string) || "rgba(255,255,255,0.05)",
          tenantAvatarColor: (data.tenantAvatarColor as string) || "#a3a3a3",
          message: (data.message as string) || "",
          status: status as InquiryData["status"],
          unread: (data.unread as boolean) !== false,
          createdAt: (data.createdAt as Timestamp) || null,
          updatedAt: (data.updatedAt as Timestamp) || null,
        };
      });
      onData(list);
    },
    (err) => onError(err)
  );
}

function getStatusColor(status: string): { color: string; bg: string } {
  switch (status) {
    case "confirmed": return { color: "#047857", bg: "rgba(4,120,87,0.12)" };
    case "pending": return { color: "#eab308", bg: "rgba(234,179,8,0.12)" };
    case "completed": return { color: "#525252", bg: "rgba(255,255,255,0.05)" };
    case "cancelled": return { color: "#ef4444", bg: "rgba(239,68,68,0.1)" };
    default: return { color: "#a3a3a3", bg: "rgba(255,255,255,0.05)" };
  }
}

/** Listen to viewings by tenant phone (for browse portal). */
export function listenToTenantViewings(
  tenantPhone: string,
  onData: (viewings: ViewingData[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const viewingsRef = collection(db, "viewings");
  const q = query(viewingsRef, where("tenantPhone", "==", tenantPhone));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: ViewingData[] = snapshot.docs.map((d) => {
        const data = d.data();
        const status = (data.status as string) || "pending";
        const style = getStatusColor(status);
        return {
          id: d.id,
          propertyId: (data.propertyId as string) || "",
          propertyName: (data.propertyName as string) || "",
          unitId: (data.unitId as string) || "",
          unitName: (data.unitName as string) || "",
          landlordId: (data.landlordId as string) || "",
          tenantId: (data.tenantId as string) || null,
          tenantName: (data.tenantName as string) || "",
          tenantPhone: (data.tenantPhone as string) || "",
          tenantInitials: (data.tenantInitials as string) || "",
          status: status as ViewingData["status"],
          date: (data.date as string) || "",
          startTime: (data.startTime as string) || "",
          endTime: (data.endTime as string) || "",
          duration: (data.duration as string) || "30 min",
          notes: (data.notes as string) || "",
          outcome: (data.outcome as string) || "",
          statusColor: style.color,
          statusBg: style.bg,
          createdAt: (data.createdAt as Timestamp) || null,
          updatedAt: (data.updatedAt as Timestamp) || null,
        };
      });
      onData(list);
    },
    (err) => onError(err)
  );
}

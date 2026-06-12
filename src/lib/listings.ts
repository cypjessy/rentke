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
  increment,
  type Unsubscribe,
  type Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";

export interface ListingData {
  id: string;
  propertyId: string;
  propertyName: string;
  unitId: string;
  unitName: string;
  landlordId: string;
  title: string;
  description: string;
  rent: number;
  images: string[];
  amenities: string[];
  status: "active" | "paused" | "expired" | "draft";
  boosted: boolean;
  boostExpiry: Timestamp | null;
  views: number;
  inquiries: number;
  saves: number;
  createdAt: Timestamp | null;
  expiresAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface ListingFormData {
  propertyId: string;
  propertyName: string;
  unitId: string;
  unitName: string;
  title: string;
  description: string;
  rent: number;
  amenities: string[];
  images: string[];
  status: "active" | "draft";
}

const listingsRef = collection(db, "listings");

/** Listen to a landlord's listings in real-time. */
export function listenToListings(
  landlordId: string,
  onData: (listings: ListingData[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const q = query(
    listingsRef,
    where("landlordId", "==", landlordId),
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

/** Create a new listing. */
export async function createListing(
  landlordId: string,
  data: ListingFormData
): Promise<string> {
  // Expires in 30 days
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  const docRef = await addDoc(listingsRef, {
    ...data,
    landlordId,
    boosted: false,
    boostExpiry: null,
    views: 0,
    inquiries: 0,
    saves: 0,
    expiresAt,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

/** Update a listing. */
export async function updateListing(
  listingId: string,
  data: Partial<ListingFormData>
): Promise<void> {
  await updateDoc(doc(listingsRef, listingId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/** Toggle listing status (pause / resume). */
export async function toggleListingStatus(
  listingId: string,
  status: "active" | "paused"
): Promise<void> {
  await updateDoc(doc(listingsRef, listingId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

/** Boost a listing. */
export async function boostListing(
  listingId: string,
  days: number
): Promise<void> {
  const boostExpiry = new Date();
  boostExpiry.setDate(boostExpiry.getDate() + days);

  await updateDoc(doc(listingsRef, listingId), {
    boosted: true,
    boostExpiry,
    updatedAt: serverTimestamp(),
  });
}

/** Increment listing views. */
export async function incrementListingViews(listingId: string): Promise<void> {
  await updateDoc(doc(listingsRef, listingId), {
    views: increment(1),
  });
}

/** Delete a listing. */
export async function deleteListing(listingId: string): Promise<void> {
  await deleteDoc(doc(listingsRef, listingId));
}

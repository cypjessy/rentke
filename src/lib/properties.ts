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

export interface PropertyData {
  id: string;
  name: string;
  location: string;
  county: string;
  type: string;
  description: string;
  totalUnits: number;
  occupiedUnits: number;
  revenue: number;
  status: "active" | "partial" | "vacant";
  rentMin: number;
  rentMax: number;
  amenities: string[];
  images: string[];
  landlordId: string;
  paused: boolean;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface PropertyFormData {
  name: string;
  location: string;
  county: string;
  type: string;
  description: string;
  totalUnits: number;
  rentMin: number;
  rentMax: number;
  amenities: string[];
  images?: string[];
}

const propertiesRef = collection(db, "properties");

/** Listen to a landlord's properties in real-time. */
export function listenToProperties(
  landlordId: string,
  onData: (props: PropertyData[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const q = query(
    propertiesRef,
    where("landlordId", "==", landlordId),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: PropertyData[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name || "",
          location: data.location || "",
          county: data.county || "",
          type: data.type || "",
          description: data.description || "",
          totalUnits: data.totalUnits || 0,
          occupiedUnits: data.occupiedUnits || 0,
          revenue: data.revenue || 0,
          status: data.status || "vacant",
          rentMin: data.rentMin || 0,
          rentMax: data.rentMax || 0,
          amenities: data.amenities || [],
          images: data.images || [],
          landlordId: data.landlordId || "",
          paused: data.paused || false,
          createdAt: data.createdAt || null,
          updatedAt: data.updatedAt || null,
        };
      });
      onData(list);
    },
    (err) => {
      onError(err);
    }
  );
}

/** Add a new property for the given landlord. Returns the new doc ID. */
export async function addProperty(
  landlordId: string,
  data: PropertyFormData
): Promise<string> {
  const docRef = await addDoc(propertiesRef, {
    ...data,
    occupiedUnits: 0,
    revenue: 0,
    images: data.images || [],
    status: "vacant",
    landlordId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

/** Update an existing property. */
export async function updateProperty(
  propertyId: string,
  data: Partial<PropertyFormData> & { images?: string[]; status?: string; paused?: boolean }
): Promise<void> {
  await updateDoc(doc(propertiesRef, propertyId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete a property and cascade through all related data:
 * - Listings that reference this property
 * - Units that belong to this property
 * - Favorites that reference this property
 * - Inquiries and viewings referencing this property are cancelled/archived
 */
export async function deleteProperty(propertyId: string): Promise<void> {
  // Query all related documents in parallel
  const [listingsSnap, unitsSnap, favsSnap] = await Promise.all([
    getDocs(query(collection(db, "listings"), where("propertyId", "==", propertyId))),
    getDocs(query(collection(db, "units"), where("propertyId", "==", propertyId))),
    getDocs(query(collection(db, "favorites"), where("propertyId", "==", propertyId))),
  ]);

  const batch = writeBatch(db);

  // Delete all related documents
  listingsSnap.forEach((d) => batch.delete(d.ref));
  unitsSnap.forEach((d) => batch.delete(d.ref));
  favsSnap.forEach((d) => batch.delete(d.ref));

  // Delete the property itself
  batch.delete(doc(propertiesRef, propertyId));

  // Commit all deletes atomically
  await batch.commit();
}

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
  type Unsubscribe,
  type Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";

// ---- Two-Tier Code System ----

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I, O, 0, 1 to avoid confusion

/** Generate a random alphanumeric code with a given prefix and total length. */
function generateCode(prefix: string, totalLength: number): string {
  const randomLen = totalLength - prefix.length - 1; // -1 for the dash
  let random = "";
  for (let i = 0; i < randomLen; i++) {
    random += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return `${prefix}-${random}`;
}

/** Generate a unique Client Code (e.g. RK-A3F9K2) for a new user. */
export function generateClientCode(): string {
  return generateCode("RK", 8);
}

/** Generate a Unit Access Code (e.g. UT-4B7D) for a lease without an account. */
export function generateUnitAccessCode(): string {
  return generateCode("UT", 7);
}

/** Look up an app user by their client code. */
export async function lookupUserByClientCode(
  code: string
): Promise<{ uid: string; name: string; phone: string } | null> {
  if (!code) return null;
  const clean = code.trim().toUpperCase();
  if (clean.length < 4) return null;

  const usersRef = collection(db, "users");
  const q = query(usersRef, where("clientCode", "==", clean));
  const snap = await getDocs(q);

  if (snap.empty) return null;
  const d = snap.docs[0];
  const data = d.data();
  return { uid: d.id, name: data.name || "", phone: data.phone || "" };
}

/** Claim a unit by its unit access code. Sets the tenantId on the unit. */
export async function claimUnitByCode(
  code: string,
  userId: string
): Promise<{ unitId: string; unitName: string; propertyName: string } | null> {
  if (!code) return null;
  const clean = code.trim().toUpperCase();
  if (clean.length < 4) return null;

  const q = query(unitsRef, where("unitAccessCode", "==", clean));
  const snap = await getDocs(q);

  if (snap.empty) return null;
  const d = snap.docs[0];
  const data = d.data();

  // Don't overwrite an existing tenantId
  if (data.tenantId) return null;

  await updateDoc(doc(unitsRef, d.id), {
    tenantId: userId,
    updatedAt: serverTimestamp(),
  });

  return {
    unitId: d.id,
    unitName: data.name || "",
    propertyName: data.propertyName || "",
  };
}

/** Look up an app user by phone number across common Kenyan formats. */
export async function lookupUserByPhone(
  phone: string
): Promise<{ uid: string; name: string; phone: string } | null> {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 9) return null;

  // Derive common Kenyan phone formats from the input
  const last9 = digits.slice(-9);
  const formats = [
    digits,                        // 0712345678 (as typed)
    `+254${last9}`,                // +254712345678
    `254${last9}`,                 // 254712345678
    `0${last9}`,                   // 0712345678
  ];

  const uniqueFormats = [...new Set(formats)];
  const usersRef = collection(db, "users");

  for (const fmt of uniqueFormats) {
    const q = query(usersRef, where("phone", "==", fmt));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const d = snap.docs[0];
      const data = d.data();
      return { uid: d.id, name: data.name || "", phone: data.phone || "" };
    }
  }
  return null;
}

export interface UnitData {
  id: string;
  propertyId: string;
  propertyName: string;
  landlordId: string;
  name: string;
  type: string;
  status: "Vacant" | "Occupied" | "Maintenance";
  rent: number;
  deposit: number;
  serviceCharge: number;
  bathrooms: number;
  floor: string;
  area: number;
  description: string;
  amenities: string[];
  images: string[];
  tenantId: string | null;
  tenantName: string | null;
  tenantPhone: string | null;
  tenantInitials: string;
  payment: string;
  leaseStart: Timestamp | null;
  leaseEnd: Timestamp | null;
  leaseTerm: string;
  unitAccessCode: string | null;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface UnitFormData {
  propertyId: string;
  propertyName: string;
  name: string;
  type: string;
  status: "Vacant" | "Occupied" | "Maintenance";
  rent: number;
  deposit: number;
  serviceCharge: number;
  bathrooms: number;
  floor: string;
  area: number;
  description: string;
  amenities: string[];
  images?: string[];
}

export interface LeaseFormData {
  tenantName: string;
  tenantPhone: string;
  tenantId?: string;
  leaseStart: string;
  leaseTerm: string;
  rent: number;
  deposit: number;
  status: "Occupied";
}

const unitsRef = collection(db, "units");

/** Listen to a landlord's units in real-time. */
export function listenToUnits(
  landlordId: string,
  onData: (units: UnitData[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const q = query(
    unitsRef,
    where("landlordId", "==", landlordId),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: UnitData[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          propertyId: data.propertyId || "",
          propertyName: data.propertyName || "",
          landlordId: data.landlordId || "",
          name: data.name || "",
          type: data.type || "Bedsitter",
          status: data.status || "Vacant",
          rent: data.rent || 0,
          deposit: data.deposit || 0,
          serviceCharge: data.serviceCharge || 0,
          bathrooms: data.bathrooms || 1,
          floor: data.floor || "Ground",
          area: data.area || 0,
          description: data.description || "",
          amenities: data.amenities || [],
          images: data.images || [],
          tenantId: data.tenantId || null,
          tenantName: data.tenantName || null,
          tenantPhone: data.tenantPhone || null,
          tenantInitials: data.tenantInitials || "—",
          payment: data.payment || "",
          leaseStart: data.leaseStart || null,
          leaseEnd: data.leaseEnd || null,
          leaseTerm: data.leaseTerm || "",
          unitAccessCode: data.unitAccessCode || null,
          createdAt: data.createdAt || null,
          updatedAt: data.updatedAt || null,
        };
      });
      onData(list);
    },
    (err) => onError(err)
  );
}

/** Listen to units for a specific property. */
export function listenToPropertyUnits(
  propertyId: string,
  onData: (units: UnitData[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const q = query(
    unitsRef,
    where("propertyId", "==", propertyId),
    orderBy("name", "asc")
  );
  return onSnapshot(q, (snapshot) => {
    const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as UnitData));
    onData(list);
  }, (err) => onError(err));
}

/** Add a new unit. */
export async function addUnit(
  landlordId: string,
  data: UnitFormData
): Promise<string> {
  const docRef = await addDoc(unitsRef, {
    ...data,
    landlordId,
    images: data.images || [],
    tenantId: null,
    tenantName: null,
    tenantPhone: null,
    tenantInitials: "—",
    payment: data.status === "Occupied" ? "Pending" : "",
    leaseStart: null,
    leaseEnd: null,
    leaseTerm: "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

/** Record a lease (assign tenant to unit).
 *
 * If `data.tenantId` is not provided, this function attempts to auto-resolve
 * the app user by phone number and sets `tenantId` so the tenant's My Unit
 * page works without manual lookup. */
export async function recordLease(
  unitId: string,
  data: LeaseFormData
): Promise<void> {
  const initials = data.tenantName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const now = new Date();
  const monthsMap: Record<string, number> = {
    "6 months": 6,
    "12 months": 12,
    "24 months": 24,
  };
  const termMonths = monthsMap[data.leaseTerm] || 12;
  const leaseStartDate = data.leaseStart || now.toISOString().split("T")[0];
  const start = new Date(leaseStartDate);
  const end = new Date(start);
  end.setMonth(end.getMonth() + termMonths);

  // Auto-resolve tenantId by phone if not provided
  let resolvedTenantId = data.tenantId || null;
  let unitAccessCode: string | null = null;
  if (!resolvedTenantId && data.tenantPhone) {
    try {
      const user = await lookupUserByPhone(data.tenantPhone);
      if (user) resolvedTenantId = user.uid;
    } catch {
      // Silently skip — tenantId stays null
    }
  }

  // If still no tenantId, generate a unit access code so the tenant can
  // claim the unit later when they register.
  if (!resolvedTenantId) {
    unitAccessCode = generateUnitAccessCode();
  }

  await updateDoc(doc(unitsRef, unitId), {
    tenantName: data.tenantName,
    tenantPhone: data.tenantPhone,
    tenantId: resolvedTenantId,
    tenantInitials: initials,
    status: "Occupied",
    payment: "Paid",
    rent: data.rent,
    deposit: data.deposit,
    leaseStart: start,
    leaseEnd: end,
    leaseTerm: data.leaseTerm,
    unitAccessCode,
    updatedAt: serverTimestamp(),
  });

  // Mark any active listings for this unit as "taken" so they
  // stop appearing in browse and show as "Taken" in saved/favorites.
  await markListingsAsTaken(unitId);
}

/** Mark all active (or paused) listings for a unit as "taken".
 *  This removes them from browse results while preserving
 *  their data for existing favorites/inquiries. */
export async function markListingsAsTaken(unitId: string): Promise<void> {
  try {
    const listingsRef = collection(db, "listings");
    const q = query(
      listingsRef,
      where("unitId", "==", unitId),
      where("status", "in", ["active", "paused"])
    );
    const snapshot = await getDocs(q);
    for (const docSnap of snapshot.docs) {
      await updateDoc(doc(listingsRef, docSnap.id), {
        status: "taken",
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    console.warn("Failed to mark listings as taken:", err);
  }
}

/** Update an existing unit. */
export async function updateUnit(
  unitId: string,
  data: Partial<UnitFormData>
): Promise<void> {
  await updateDoc(doc(unitsRef, unitId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/** Mark unit for maintenance and pause any associated listing. */
export async function setUnitMaintenance(
  unitId: string,
  reason: string,
  notes: string,
  expectedDays: string
): Promise<void> {
  await updateDoc(doc(unitsRef, unitId), {
    status: "Maintenance",
    description: `[Maintenance] ${reason}: ${notes} (Expected: ${expectedDays} days)`,
    updatedAt: serverTimestamp(),
  });
  // Pause any active listing for this unit
  await pauseListingForUnit(unitId);
}

/** Resume a unit from maintenance — sets back to Vacant and re-activates any paused listing. */
export async function resumeUnit(unitId: string): Promise<void> {
  await updateDoc(doc(unitsRef, unitId), {
    status: "Vacant",
    updatedAt: serverTimestamp(),
  });
  // Re-activate any paused listing for this unit
  await activateListingForUnit(unitId);
}

/** Find and pause any active listing linked to this unit. */
async function pauseListingForUnit(unitId: string): Promise<void> {
  try {
    const listingsRef = collection(db, "listings");
    const q = query(listingsRef, where("unitId", "==", unitId), where("status", "==", "active"));
    const snapshot = await getDocs(q);
    for (const docSnap of snapshot.docs) {
      await updateDoc(doc(listingsRef, docSnap.id), {
        status: "paused",
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    console.warn("Failed to pause listing:", err);
  }
}

/** Find and re-activate any paused listing linked to this unit. */
async function activateListingForUnit(unitId: string): Promise<void> {
  try {
    const listingsRef = collection(db, "listings");
    const q = query(listingsRef, where("unitId", "==", unitId), where("status", "==", "paused"));
    const snapshot = await getDocs(q);
    for (const docSnap of snapshot.docs) {
      await updateDoc(doc(listingsRef, docSnap.id), {
        status: "active",
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    console.warn("Failed to activate listing:", err);
  }
}

/** Vacate a unit (remove tenant) and re-activate any "taken" listings. */
export async function vacateUnit(unitId: string): Promise<void> {
  await updateDoc(doc(unitsRef, unitId), {
    tenantId: null,
    tenantName: null,
    tenantPhone: null,
    tenantInitials: "—",
    payment: "",
    status: "Vacant",
    leaseStart: null,
    leaseEnd: null,
    leaseTerm: "",
    updatedAt: serverTimestamp(),
  });

  // Re-activate any "taken" listings for this unit back to the marketplace
  await reactivateListingsForUnit(unitId);
}

/** Find and re-activate any "taken" listing linked to this unit. */
export async function reactivateListingsForUnit(unitId: string): Promise<void> {
  try {
    const listingsRef = collection(db, "listings");
    const q = query(listingsRef, where("unitId", "==", unitId), where("status", "==", "taken"));
    const snapshot = await getDocs(q);
    for (const docSnap of snapshot.docs) {
      await updateDoc(doc(listingsRef, docSnap.id), {
        status: "active",
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    console.warn("Failed to reactivate listings:", err);
  }
}

/** When a user registers, find any units assigned to them by phone (without a tenantId) and link them.
 *  This handles the case where a landlord assigned a tenant before they had an account. */
export async function linkUnitsToUser(
  phone: string,
  userId: string
): Promise<number> {
  if (!phone) return 0;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 9) return 0;

  const last9 = digits.slice(-9);
  const formats = [...new Set([
    digits,
    `+254${last9}`,
    `254${last9}`,
    `0${last9}`,
  ])];

  let linkedCount = 0;

  for (const fmt of formats) {
    const q = query(
      unitsRef,
      where("tenantPhone", "==", fmt),
      where("tenantId", "==", null)
    );
    const snap = await getDocs(q);
    for (const docSnap of snap.docs) {
      await updateDoc(doc(unitsRef, docSnap.id), {
        tenantId: userId,
        updatedAt: serverTimestamp(),
      });
      linkedCount++;
    }
  }

  return linkedCount;
}

/** Listen to units assigned to a specific tenant (by tenantId). */
export function listenToTenantUnits(
  tenantId: string,
  onData: (units: UnitData[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const q = query(
    unitsRef,
    where("tenantId", "==", tenantId),
    orderBy("updatedAt", "desc")
  );
  return onSnapshot(q, (snapshot) => {
    const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as UnitData));
    onData(list);
  }, (err) => onError(err));
}

/** Delete a unit and any associated listings. */
export async function deleteUnit(unitId: string): Promise<void> {
  // Delete any associated listings
  try {
    const listingsRef = collection(db, "listings");
    const q = query(listingsRef, where("unitId", "==", unitId));
    const snapshot = await getDocs(q);
    for (const docSnap of snapshot.docs) {
      await deleteDoc(doc(listingsRef, docSnap.id));
    }
  } catch (err) {
    console.warn("Failed to delete associated listings:", err);
  }
  await deleteDoc(doc(unitsRef, unitId));
}

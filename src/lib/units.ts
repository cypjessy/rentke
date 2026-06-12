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
    images: [],
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

/** Record a lease (assign tenant to unit). */
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

  await updateDoc(doc(unitsRef, unitId), {
    tenantName: data.tenantName,
    tenantPhone: data.tenantPhone,
    tenantId: data.tenantId || null,
    tenantInitials: initials,
    status: "Occupied",
    payment: "Paid",
    rent: data.rent,
    deposit: data.deposit,
    leaseStart: start,
    leaseEnd: end,
    leaseTerm: data.leaseTerm,
    updatedAt: serverTimestamp(),
  });
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

/** Mark unit for maintenance. */
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
}

/** Vacate a unit (remove tenant). */
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
}

/** Delete a unit. */
export async function deleteUnit(unitId: string): Promise<void> {
  await deleteDoc(doc(unitsRef, unitId));
}

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

export type MaintenanceUrgency = "Urgent" | "Medium" | "Low";
export type MaintenanceStatus = "open" | "in-progress" | "resolved" | "closed";

export interface MaintenanceData {
  id: string;
  propertyId: string;
  propertyName: string;
  unitId: string;
  unitName: string;
  landlordId: string;
  tenantId: string | null;
  tenantName: string;
  title: string;
  description: string;
  urgency: MaintenanceUrgency;
  status: MaintenanceStatus;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface MaintenanceFormData {
  propertyId: string;
  propertyName: string;
  unitId: string;
  unitName: string;
  tenantName: string;
  title: string;
  description: string;
  urgency: MaintenanceUrgency;
}

const maintenanceRef = collection(db, "maintenance");

/** Listen to a landlord's maintenance requests in real-time. */
export function listenToMaintenanceRequests(
  landlordId: string,
  onData: (requests: MaintenanceData[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const q = query(
    maintenanceRef,
    where("landlordId", "==", landlordId),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: MaintenanceData[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          propertyId: data.propertyId || "",
          propertyName: data.propertyName || "",
          unitId: data.unitId || "",
          unitName: data.unitName || "",
          landlordId: data.landlordId || "",
          tenantId: data.tenantId || null,
          tenantName: data.tenantName || "",
          title: data.title || "",
          description: data.description || "",
          urgency: (data.urgency as MaintenanceUrgency) || "Medium",
          status: (data.status as MaintenanceStatus) || "open",
          createdAt: data.createdAt || null,
          updatedAt: data.updatedAt || null,
        };
      });
      onData(list);
    },
    (err) => onError(err)
  );
}

/** Create a new maintenance request. */
export async function createMaintenanceRequest(
  landlordId: string,
  data: MaintenanceFormData
): Promise<string> {
  const docRef = await addDoc(maintenanceRef, {
    ...data,
    landlordId,
    status: "open",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

/** Update a maintenance request's status. */
export async function updateMaintenanceStatus(
  maintenanceId: string,
  status: MaintenanceStatus
): Promise<void> {
  await updateDoc(doc(maintenanceRef, maintenanceId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

/** Delete a maintenance request. */
export async function deleteMaintenanceRequest(
  maintenanceId: string
): Promise<void> {
  await deleteDoc(doc(maintenanceRef, maintenanceId));
}

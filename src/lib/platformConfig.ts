import {
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PlatformLocation {
  county: string;
  estates: string[];
}

export interface PlatformPlan {
  name: string;
  price: string;
  color: string;
  popular: boolean;
  features: string[];
  users?: string;
}

export interface PlatformAdmin {
  init: string;
  name: string;
  email: string;
  role: string;
  badge: string | null;
  color: string;
}

export interface PlatformTemplate {
  name: string;
  channels: string;
  preview: string;
  channelSms: boolean;
  channelEmail: boolean;
  channelPush: boolean;
}

export interface PlatformToggles {
  autoNotifyListing: boolean;
  autoNotifyInquiry: boolean;
  mpesaConfirm: boolean;
  expiryReminder: boolean;
  requireIdVerification: boolean;
  autoApprove: boolean;
  maintenanceMode: boolean;
}

export interface MpesaConfig {
  env: "sandbox" | "production";
  consumerKey: string;
  consumerSecret: string;
  paybill: string;
  passkey: string;
  callbackStk: string;
  callbackB2c: string;
}

export interface PlatformConfig {
  locations: PlatformLocation[];
  propertyTypes: string[];
  amenities: string[];
  plans: PlatformPlan[];
  mpesa: MpesaConfig;
  admins: PlatformAdmin[];
  templates: PlatformTemplate[];
  toggles: PlatformToggles;
  maxPhotos: number;
}

const CONFIG_ID = "platform";
const configRef = doc(db, "config", CONFIG_ID);

const DEFAULT_CONFIG: PlatformConfig = {
  locations: [
    { county: "NAIROBI COUNTY", estates: ["Kilimani", "Westlands", "Karen", "Runda", "Roysambu", "Kasarani", "Langata", "South B", "South C"] },
    { county: "MOMBASA COUNTY", estates: ["Nyali", "Bamburi", "Likoni"] },
    { county: "KAJIADO COUNTY", estates: ["Ongata Rongai", "Kitengela"] },
  ],
  propertyTypes: ["Single Room", "Bedsitter", "1 Bedroom", "2 Bedroom", "3 Bedroom", "Studio", "Mansion", "Plot"],
  amenities: ["Parking", "WiFi", "24hr Security", "Swimming Pool", "Garden", "Generator", "Balcony", "Lift", "CCTV", "DSQ", "Water Tank", "Solar", "Furnished", "Alarm System", "Gym"],
  plans: [
    { name: "Free", price: "0", color: "#9ca3af", popular: false, features: ["1 Property", "5 Photos", "Basic Support"] },
    { name: "Basic", price: "999", color: "#3b82f6", popular: false, features: ["5 Properties", "10 Photos", "Priority Support"] },
    { name: "Premium", price: "2,999", color: "#059669", popular: true, features: ["Unlimited Properties", "20 Photos", "Featured Badge", "Boost Discount"] },
  ],
  mpesa: {
    env: "sandbox",
    consumerKey: "Gzj5PnHkQwRtYm8v",
    consumerSecret: "aBcDeFgHiJkLmNoP",
    paybill: "174379",
    passkey: "bfb279f9aa9bdbcf158e97dd71a467cd",
    callbackStk: "https://api.rentke.co.ke/mpesa/callback",
    callbackB2c: "https://api.rentke.co.ke/mpesa/b2c/callback",
  },
  admins: [
    { init: "AK", name: "Admin Ke", email: "admin@rentke.co.ke", role: "Super Admin", badge: "Owner", color: "#047857" },
    { init: "BM", name: "Brian Mwangi", email: "brian@rentke.co.ke", role: "Moderator", badge: null, color: "#3b82f6" },
    { init: "WK", name: "Wanjiru Kamau", email: "wanjiru@rentke.co.ke", role: "Support", badge: null, color: "#a855f7" },
  ],
  templates: [
    { name: "Welcome Message", channels: "SMS + Email", preview: "\"Welcome to RentKe! Start listing your properties...\"", channelSms: true, channelEmail: true, channelPush: false },
    { name: "New Inquiry Alert", channels: "Push + SMS", preview: "\"You have a new inquiry for [property_name]...\"", channelSms: true, channelEmail: false, channelPush: true },
    { name: "Payment Confirmation", channels: "SMS", preview: "\"Payment of KSh [amount] received for [property]...\"", channelSms: true, channelEmail: false, channelPush: false },
    { name: "Viewing Reminder", channels: "Push + Email", preview: "\"Reminder: Viewing at [property] tomorrow at [time]...\"", channelSms: false, channelEmail: true, channelPush: true },
    { name: "Listing Approved", channels: "Push + Email", preview: "\"Your listing [property_name] is now live on RentKe!\"", channelSms: false, channelEmail: true, channelPush: true },
    { name: "Subscription Renewal", channels: "Email", preview: "\"Your Premium plan expires in 3 days...\"", channelSms: false, channelEmail: true, channelPush: false },
  ],
  toggles: {
    autoNotifyListing: true,
    autoNotifyInquiry: true,
    mpesaConfirm: true,
    expiryReminder: false,
    requireIdVerification: true,
    autoApprove: false,
    maintenanceMode: false,
  },
  maxPhotos: 10,
};

// ─── Listener ─────────────────────────────────────────────────────────────────

/** Listen to the platform config document in real-time. Falls back to defaults on first load. */
export function listenToPlatformConfig(
  onData: (config: PlatformConfig) => void,
  onError: (err: Error) => void
): Unsubscribe {
  return onSnapshot(
    configRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as Partial<PlatformConfig>;
        onData({
          locations: data.locations || DEFAULT_CONFIG.locations,
          propertyTypes: data.propertyTypes || DEFAULT_CONFIG.propertyTypes,
          amenities: data.amenities || DEFAULT_CONFIG.amenities,
          plans: data.plans || DEFAULT_CONFIG.plans,
          mpesa: { ...DEFAULT_CONFIG.mpesa, ...(data.mpesa || {}) } as MpesaConfig,
          admins: data.admins || DEFAULT_CONFIG.admins,
          templates: data.templates || DEFAULT_CONFIG.templates,
          toggles: { ...DEFAULT_CONFIG.toggles, ...(data.toggles || {}) } as PlatformToggles,
          maxPhotos: data.maxPhotos ?? DEFAULT_CONFIG.maxPhotos,
        });
      } else {
        // First visit — seed defaults
        setDoc(configRef, { ...DEFAULT_CONFIG, createdAt: serverTimestamp() }).catch(() => {});
        onData(DEFAULT_CONFIG);
      }
    },
    (err) => onError(err)
  );
}

// ─── Mutations ───────────────────────────────────────────────────────────────

/** Locations */
export async function savePlatformLocations(
  locations: PlatformLocation[]
): Promise<void> {
  await updateDoc(configRef, {
    locations,
    updatedAt: serverTimestamp(),
  });
}

/** Property Types */
export async function savePlatformPropertyTypes(
  propertyTypes: string[]
): Promise<void> {
  await updateDoc(configRef, {
    propertyTypes,
    updatedAt: serverTimestamp(),
  });
}

/** Amenities */
export async function savePlatformAmenities(
  amenities: string[]
): Promise<void> {
  await updateDoc(configRef, {
    amenities,
    updatedAt: serverTimestamp(),
  });
}

/** Plans */
export async function savePlatformPlans(
  plans: PlatformPlan[]
): Promise<void> {
  await updateDoc(configRef, {
    plans,
    updatedAt: serverTimestamp(),
  });
}

/** M-Pesa */
export async function savePlatformMpesa(
  mpesa: MpesaConfig
): Promise<void> {
  await updateDoc(configRef, {
    mpesa,
    updatedAt: serverTimestamp(),
  });
}

/** Admins */
export async function savePlatformAdmins(
  admins: PlatformAdmin[]
): Promise<void> {
  await updateDoc(configRef, {
    admins,
    updatedAt: serverTimestamp(),
  });
}

/** Templates */
export async function savePlatformTemplates(
  templates: PlatformTemplate[]
): Promise<void> {
  await updateDoc(configRef, {
    templates,
    updatedAt: serverTimestamp(),
  });
}

/** Toggles */
export async function savePlatformToggles(
  toggles: PlatformToggles
): Promise<void> {
  await updateDoc(configRef, {
    toggles,
    updatedAt: serverTimestamp(),
  });
}

/** Max Photos */
export async function saveMaxPhotos(
  maxPhotos: number
): Promise<void> {
  await updateDoc(configRef, {
    maxPhotos,
    updatedAt: serverTimestamp(),
  });
}

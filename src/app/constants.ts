// ==============================
// SHARED CONSTANTS — Rentke
// Used across Landlord Portal (dashboard, properties, units, listings)
// and Client Portal (browse, explore, detail sheets)
// ==============================

export const PLACEHOLDER_IMAGE = "https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=1073&auto=format&fit=crop";

// ---- Amenities ----

/** Amenities available for Property-level forms (Add/Edit Property) */
export const PROPERTY_AMENITIES = [
  "🚿 Shower",
  "🅿️ Parking",
  "💡 Prepaid Token",
  "📶 WiFi",
  "🌊 Hot Water",
  "🛡️ 24hr Security",
  "🧺 Laundry",
  "❄️ A/C",
  "💧 Borehole/Water",
  "🚧 Gated Estate",
] as const;

/** Amenities available for Unit-level forms (Add/Edit Unit) */
export const UNIT_AMENITIES = [
  "🚿 Shower",
  "🌊 Hot Water",
  "🅿️ Parking",
  "📶 WiFi",
  "💡 Prepaid Token",
  "🔒 CCTV",
  "🏙️ Balcony",
  "❄️ A/C",
  "💧 Borehole/Water",
  "🚧 Gated Estate",
] as const;

/** Amenities displayed in the Property detail overview (landlord side) */
export const PROPERTY_DETAIL_AMENITIES = [
  "🚿 Shower",
  "🅿️ Parking",
  "💡 Prepaid Token",
  "📶 WiFi",
  "🌊 Hot Water",
  "🛡️ 24hr Security",
] as const;

/** Amenities displayed in the Listing detail overview */
export const LISTING_DETAIL_AMENITIES = [
  "🚿 Shower",
  "🅿️ Parking",
  "💡 Prepaid Token",
  "🌊 Hot Water",
  "🛡️ 24hr Security",
] as const;

// ---- Property & Unit Types ----

/** Property-level type options */
export const PROPERTY_TYPE_OPTIONS = [
  "Apartment",
  "Bedsitter",
  "Maisonette",
  "Commercial",
  "Single Room",
  "Plot",
] as const;

/** Unit-level type options */
export const UNIT_TYPE_OPTIONS = [
  "Bedsitter",
  "Single Room",
  "1 Bedroom",
  "2 Bedroom",
  "3 Bedroom",
  "Studio",
] as const;

/** Display metadata for browse portal type filters (emoji, description, count) */
export const BROWSE_TYPE_META: Record<string, { emoji: string; desc: string; count: number }> = {
  Bedsitter: { emoji: "🛏️", desc: "Single room with kitchen area", count: 45 },
  "1 Bedroom": { emoji: "🏠", desc: "One bedroom + living room", count: 32 },
  "2 Bedroom": { emoji: "👨‍👩‍👧", desc: "Two bedrooms + living room", count: 28 },
  "3 Bedroom": { emoji: "🛌", desc: "Three bedrooms", count: 15 },
  "Single Room": { emoji: "🛏️", desc: "Single room only", count: 20 },
  Studio: { emoji: "🏗️", desc: "Open plan living", count: 10 },
};

/** Unit status options */
export const UNIT_STATUS_OPTIONS = [
  "Vacant",
  "Occupied",
  "Maintenance",
] as const;

// ---- Locations ----

/** County options */
export const COUNTY_OPTIONS = [
  "Nairobi",
  "Mombasa",
  "Kiambu",
  "Kajiado",
  "Nakuru",
  "Kisumu",
] as const;

/** Lease term options */
export const LEASE_TERM_OPTIONS = [
  "6 months",
  "12 months",
  "24 months",
] as const;

/** Bathroom options for unit forms */
export const BATHROOM_OPTIONS = ["1", "2", "3"] as const;

/** Floor options for unit forms */
export const FLOOR_OPTIONS = [
  "Ground",
  "1st",
  "2nd",
  "3rd",
  "4th",
  "5th+",
] as const;

"use client";

import { useState, useEffect, Suspense } from "react";
import {
  Search,
  MapPin,
  Heart,
  ShieldCheck,
  ChevronDown,
  X,
  ArrowLeft,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useBrowse } from "../../BrowseContext";
import type { PropertyData } from "../../PropertyDetailSheet";
import { UNIT_TYPE_OPTIONS, UNIT_AMENITIES, BROWSE_TYPE_META, PLACEHOLDER_IMAGE } from "../../../constants";
import { listenToBrowseListings, listenToBrowseProperties } from "@/lib/browse";
import { getListingImage, getListingImages } from "@/lib/resolveImages";
import type { ListingData } from "@/lib/listings";
import type { PropertyData as PropData } from "@/lib/properties";

// ---- Static filter options ----
const typeMeta = BROWSE_TYPE_META;
const propertyTypes = [
  ...UNIT_TYPE_OPTIONS.filter((t) => t in typeMeta).map((label) => ({ label, ...typeMeta[label] })),
  { emoji: "🏡", label: "Mansion", desc: "Multi-level standalone", count: 8 },
  { emoji: "📐", label: "Plot", desc: "For sale or development", count: 12 },
  { emoji: "🏢", label: "Commercial", desc: "Commercial spaces", count: 3 },
];

const bedroomOptions = [
  { value: "Any", label: "Any" },
  ...UNIT_TYPE_OPTIONS.filter((t) => ["Bedsitter", "1 Bedroom", "2 Bedroom"].includes(t)).map((label) => ({
    value: label === "Bedsitter" ? "Bedsitter" : label.replace(" Bedroom", ""),
    label,
  })),
  { value: "3+", label: "3+ Bedrooms" },
];

const amenityOptions = UNIT_AMENITIES.map((a) => ({
  emoji: "✅",
  label: a,
  val: a,
}));

const sortOptions = [
  { label: "Relevance" },
  { label: "Price: Low to High" },
  { label: "Price: High to Low" },
  { label: "Newest First" },
];

const pricePresets = [
  { label: "Under 5k", desc: "Budget", value: "Under 5k" },
  { label: "5k - 10k", desc: "Affordable", value: "5k - 10k" },
  { label: "10k - 30k", desc: "Mid-range", value: "10k - 30k" },
  { label: "30k - 60k", desc: "Premium", value: "30k - 60k" },
  { label: "60k+", desc: "Luxury", value: "60k+" },
];

// ---- Helpers ----
function matchesFilters(listing: ListingData, filters: {
  searchQuery: string;
  selectedPreset: string | null;
  selectedTypes: string[];
  selectedBedrooms: string;
  selectedAmenities: string[];
}): boolean {
  const q = filters.searchQuery.toLowerCase();

  if (q) {
    const matchName = (listing.title || listing.propertyName || "").toLowerCase().includes(q);
    const matchProperty = (listing.propertyName || "").toLowerCase().includes(q);
    if (!matchName && !matchProperty) return false;
  }

  if (filters.selectedPreset) {
    const range = filters.selectedPreset;
    const rent = listing.rent;
    if (range === "Under 5k" && rent >= 5000) return false;
    if (range === "5k - 10k" && (rent < 5000 || rent > 10000)) return false;
    if (range === "10k - 30k" && (rent < 10000 || rent > 30000)) return false;
    if (range === "30k - 60k" && (rent < 30000 || rent > 60000)) return false;
    if (range === "60k+" && rent < 60000) return false;
  }

  if (filters.selectedTypes.length > 0) {
    const title = (listing.title || listing.propertyName || "").toLowerCase();
    const matchesType = filters.selectedTypes.some((t) =>
      title.includes(t.toLowerCase().replace(" bedroom", ""))
    );
    if (!matchesType) return false;
  }

  if (filters.selectedBedrooms && filters.selectedBedrooms !== "Any") {
    const title = (listing.title || listing.propertyName || "").toLowerCase();
    if (filters.selectedBedrooms === "Bedsitter") {
      if (!title.includes("bedsitter") && !title.includes("studio")) return false;
    } else if (filters.selectedBedrooms === "3+") {
      if (!title.includes("3br") && !title.includes("3 bed")) return false;
    } else {
      const br = filters.selectedBedrooms;
      if (!title.includes(`${br}br`) && !title.includes(`${br} bed`)) return false;
    }
  }

  if (filters.selectedAmenities.length > 0) {
    const listingAmenities = (listing.amenities || []).map((a) => a.toLowerCase());
    const hasAll = filters.selectedAmenities.every((a) =>
      listingAmenities.some((la) => la.includes(a.toLowerCase()))
    );
    if (!hasAll) return false;
  }

  return true;
}

function applySort(listings: ListingData[], sortKey: string): ListingData[] {
  const copy = [...listings];
  switch (sortKey) {
    case "Price: Low to High":
      return copy.sort((a, b) => a.rent - b.rent);
    case "Price: High to Low":
      return copy.sort((a, b) => b.rent - a.rent);
    case "Newest First":
      return copy.sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime();
      });
    default:
      return copy.sort((a, b) => (b.boosted ? 1 : 0) - (a.boosted ? 1 : 0));
  }
}

function listingToResultItem(listing: ListingData, properties: PropData[], idx: number) {
  return {
    id: idx + 1,
    title: listing.title || listing.propertyName || "Untitled",
    location: listing.propertyName || "Nairobi, Kenya",
    price: listing.rent.toLocaleString(),
    img: getListingImage(listing, properties) || PLACEHOLDER_IMAGE,
    tags: (listing.amenities || []).slice(0, 3).map((a) => `✅ ${a}`),
    verified: true,
    badge: listing.boosted ? "FEATURED" : "",
    badgeColor: "#047857",
    listingId: listing.id,
  };
}

export default function AreaPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner" />
      </div>
    }>
      <AreaPageInner />
    </Suspense>
  );
}

function AreaPageInner() {
  const params = useParams();
  const router = useRouter();
  const areaName = decodeURIComponent((params?.name as string) || "");
  const { showSnackbar, openPropertyDetail, favorites, toggleFavorite, addToRecentlyViewed } = useBrowse();

  // ---- Firestore data ----
  const [allListings, setAllListings] = useState<ListingData[]>([]);
  const [allProperties, setAllProperties] = useState<PropData[]>([]);
  const [listingsLoading, setListingsLoading] = useState(true);

  useEffect(() => {
    const unsub = listenToBrowseListings(
      (listings) => {
        setAllListings(listings);
        setListingsLoading(false);
      },
      () => setListingsLoading(false)
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = listenToBrowseProperties(
      (props) => setAllProperties(props),
      () => setListingsLoading(false)
    );
    return () => unsub();
  }, []);

  // ---- Area-filtered listings (pre-filter by area name) ----
  const areaListings = allListings.filter((l) => {
    if (l.status !== "active") return false;
    const name = (l.propertyName || "").toLowerCase();
    const title = (l.title || "").toLowerCase();
    const area = areaName.toLowerCase();
    return name.includes(area) || title.includes(area);
  });

  // ---- Search & Filter state ----
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedBedrooms, setSelectedBedrooms] = useState<string>("Any");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [selectedSort, setSelectedSort] = useState("Relevance");
  const [sheetOpen, setSheetOpen] = useState<"price" | "type" | "beds" | "amenities" | "sort" | null>(null);


  // Derived filtered results
  const filteredResults = areaListings
    .filter((l) => matchesFilters(l, { searchQuery, selectedPreset, selectedTypes, selectedBedrooms, selectedAmenities }));
  const sortedResults = applySort(filteredResults, selectedSort);
  const searchResults = sortedResults.map((l, i) => listingToResultItem(l, allProperties, i));

  // ---- Sheet helpers ----
  const openSheet = (id: typeof sheetOpen) => {
    setSheetOpen(id);
    document.body.style.overflow = "hidden";
  };
  const closeSheet = () => {
    setSheetOpen(null);
    document.body.style.overflow = "";
  };

  const handleFavorite = (e: React.MouseEvent, id: number, metadata?: Record<string, string | number | undefined>) => {
    e.stopPropagation();
    toggleFavorite(id, metadata);
    showSnackbar(favorites.includes(id) ? "Removed from saved" : "Added to saved ❤️", favorites.includes(id) ? "info" : "success");
  };

  const trackRecentView = (item: { id: number; title: string; location: string; price: string; img: string }) => {
    addToRecentlyViewed({ id: item.id, title: item.title, location: item.location, price: item.price, img: item.img, time: "Just now", timeColor: "#047857" });
  };

  const toggleType = (val: string) => setSelectedTypes((prev) => prev.includes(val) ? prev.filter((t) => t !== val) : [...prev, val]);
  const toggleAmenity = (val: string) => setSelectedAmenities((prev) => prev.includes(val) ? prev.filter((a) => a !== val) : [...prev, val]);

  return (
    <>
      <div className="status-bar" />

      {/* Glow Background */}
      <div style={{ position: "absolute", top: "-100px", right: "-100px", width: "300px", height: "300px", borderRadius: "50%", background: "rgba(4,120,87,0.06)", filter: "blur(120px)", pointerEvents: "none" }} />

      {/* ====== HEADER ====== */}
      <header className="px-4 pt-3 pb-2 flex items-center gap-3" style={{ animation: "slideInUp 0.4s ease" }}>
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ripple-container"
          style={{ background: "rgba(255,255,255,0.05)" }}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-white">{areaName}</h1>
          <p className="text-xs" style={{ color: "#a3a3a3" }}>{areaListings.length} listings in this area</p>
        </div>
      </header>

      {/* ====== SEARCH BAR ====== */}
      <div className="px-4 mt-2" style={{ animation: "slideInUp 0.5s ease" }}>
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl" style={{ background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(4,120,87,0.3)" }}>
          <Search className="w-5 h-5" style={{ color: "#047857" }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}

            className="bg-transparent outline-none text-sm flex-1 font-medium"
            style={{ color: "#e5e5e5", caretColor: "#047857" }}
            placeholder={`Search in ${areaName}...`}
          />
          {searchQuery && (
            <button onClick={() => { setSearchQuery(""); showSnackbar("Search cleared", "info"); }} className="p-1">
              <X className="w-4 h-4" style={{ color: "#525252" }} />
            </button>
          )}
        </div>
      </div>

      {/* ====== FILTER CHIPS ====== */}
      <div className="mt-3 flex gap-2 px-4 overflow-x-auto browse-scroll-hidden pb-2" style={{ animation: "slideInUp 0.55s ease" }}>
        <button className={`filter-chip ${selectedPreset ? "active" : ""}`} onClick={() => openSheet("price")}>
          <span>{selectedPreset ? `KSh ${selectedPreset}` : "Price"}</span>
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
        <button className={`filter-chip ${selectedTypes.length > 0 ? "active" : ""}`} onClick={() => openSheet("type")}>
          <span>Type</span>
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
        <button className={`filter-chip ${selectedBedrooms !== "Any" ? "active" : ""}`} onClick={() => openSheet("beds")}>
          <span>{selectedBedrooms !== "Any" ? selectedBedrooms : "Bedrooms"}</span>
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
        <button className={`filter-chip ${selectedAmenities.length > 0 ? "active" : ""}`} onClick={() => openSheet("amenities")}>
          <span>Amenities</span>
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
        <button className="filter-chip" onClick={() => openSheet("sort")}>
          <span>Sort</span>
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ====== RESULTS ====== */}
      <div className="px-4 mt-4 mb-3 flex items-center justify-between" style={{ animation: "slideInUp 0.6s ease" }}>
        <p className="text-sm font-semibold text-white">
          {listingsLoading ? "Loading..." : `${searchResults.length} properties in ${areaName}`}
        </p>
      </div>

      {/* ====== PROPERTY LIST ====== */}
      <div className="px-4 space-y-4 pb-24">
        {listingsLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl" style={{ height: "128px", background: "rgba(255,255,255,0.03)" }} />
            ))}
          </div>
        ) : searchResults.length === 0 ? (
          /* ====== EMPTY STATE ====== */
          <div className="text-center py-16 px-4" style={{ animation: "slideInUp 0.6s ease" }}>
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: "rgba(255,255,255,0.03)" }}>
              <Search className="w-9 h-9" style={{ color: "#525252" }} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">No properties found in {areaName}</h3>
            <p className="text-sm mb-6" style={{ color: "#a3a3a3" }}>
              Try adjusting your filters or search term.
            </p>
            <button
              onClick={() => { setSelectedPreset(null); setSelectedTypes([]); setSelectedBedrooms("Any"); setSelectedAmenities([]); setSearchQuery(""); showSnackbar("Filters cleared", "success"); }}
              className="px-6 py-3 rounded-xl text-sm font-semibold ripple-container"
              style={{ background: "rgba(4,120,87,0.1)", color: "#34d399", border: "1px solid rgba(4,120,87,0.2)" }}
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          searchResults.map((item) => {
            const fullL = allListings.find((l) => l.id === item.listingId);
            return (
              <div
                key={item.id}
                className="browse-property-card ripple-container"
                onClick={() => {
                  const propData: PropertyData = {
                    id: item.id,
                    title: item.title,
                    location: item.location,
                    price: item.price,
                    image: item.img,
                    gallery: fullL?.images?.length ? fullL.images : [item.img || PLACEHOLDER_IMAGE],
                    badge: item.badge || undefined,
                    verified: item.verified,
                    featured: !!item.badge,
                    type: "Bedsitter",
                    bathrooms: 1,
                    size: "20 sqm",
                    floor: "3rd",
                    description: `Modern ${item.title.toLowerCase()} located in ${item.location}. Features include a well-finished interior with ample natural light, secure compound with CCTV, and 24-hour guard.`,
                    amenities: [
                      { emoji: "💧", label: "Borehole / 24hr Water" },
                      { emoji: "⚡", label: "Token Meter" },
                      { emoji: "🚿", label: "Hot Shower" },
                      { emoji: "🔒", label: "CCTV & Guard" },
                      { emoji: "🅿️", label: "Free Parking" },
                      { emoji: "📶", label: "WiFi Ready" },
                    ],
                    costBreakdown: [
                      { label: "Monthly Rent", amount: `KSh ${item.price}` },
                      { label: "Deposit (1 month)", amount: `KSh ${item.price}` },
                      { label: "Service Charge", amount: "KSh 2,000" },
                    ],
                    totalMoveIn: `KSh ${(parseInt(item.price.replace(/,/g, "")) * 2 + 2000).toLocaleString()}`,
                    landlord: { name: "John Mwangi", initial: "J", verified: item.verified, response: "~1 hour", rating: 5, reviews: 42 },
                    landlordId: fullL?.landlordId || "",
                    photos: 5,
                    isFavorited: favorites.includes(item.id),
                  };
                  openPropertyDetail(propData);
                  trackRecentView(item);
                }}
              >
                <div className="flex">
                  <div className="relative">
                    <img
                      src={item.img || PLACEHOLDER_IMAGE}
                      alt={item.title}
                      className="w-32 h-32 object-cover"
                      style={{ borderRadius: "20px 0 0 20px" }}
                      onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE; }}
                    />
                    {item.badge && (
                      <span className="absolute top-2 left-2 text-xs font-bold px-1.5 py-0.5 rounded" style={{ background: item.badgeColor, color: "white" }}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 p-3.5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-white text-sm pr-2">{item.title}</h3>
                        <button
                          onClick={(e) => handleFavorite(e, item.id, { title: item.title, location: item.location, price: parseInt(item.price.replace(/,/g, '')), image: item.img, landlordId: fullL?.landlordId || "", propertyId: fullL?.propertyId || "" })}
                          className="p-1 flex-shrink-0"
                        >
                          <Heart className="w-4 h-4" style={{ color: favorites.includes(item.id) ? "#ef4444" : "#525252", fill: favorites.includes(item.id) ? "#ef4444" : "transparent" }} />
                        </button>
                      </div>
                      <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: "#a3a3a3" }}>
                        <MapPin className="w-3 h-3" />
                        {item.location}
                      </p>
                      {item.tags.length > 0 && (
                        <div className="flex gap-1.5 mt-2">
                          {item.tags.map((tag) => (
                            <span key={tag} className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.05)", color: "#a3a3a3" }}>{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-sm font-bold" style={{ color: "#047857" }}>
                        KSh {item.price}
                        <span className="text-xs font-normal" style={{ color: "#525252" }}>/mo</span>
                      </p>
                      {item.verified && (
                        <div className="flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" style={{ color: "#047857" }} />
                          <span className="text-xs" style={{ color: "#047857" }}>Verified</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ============================================ */}
      {/* BOTTOM SHEET: PRICE */}
      {/* ============================================ */}
      <div className={`bottom-sheet-overlay ${sheetOpen === "price" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${sheetOpen === "price" ? "active" : ""}`}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Price Range</h3>
          <button onClick={() => setSelectedPreset(null)} className="text-xs font-semibold" style={{ color: "#047857" }}>Reset</button>
        </div>
        <div className="px-3 pb-3">
          <p className="text-xs" style={{ color: "#a3a3a3" }}>Monthly rent in Kenyan Shillings</p>
        </div>
        <div className="px-3 pb-8">
          <div className="grid grid-cols-2 gap-2">
            {pricePresets.slice(0, 4).map((p) => (
              <button key={p.value} className={`price-preset ${selectedPreset === p.value ? "selected" : ""}`} onClick={() => { setSelectedPreset(p.value); showSnackbar(`Price: ${p.value}`, "success"); }}>
                <p className="font-semibold text-sm" style={{ color: selectedPreset === p.value ? "#34d399" : "white" }}>{p.label}</p>
                <p className="text-xs" style={{ color: "#525252" }}>{p.desc}</p>
              </button>
            ))}
            <button className={`price-preset col-span-2 ${selectedPreset === "60k+" ? "selected" : ""}`} onClick={() => { setSelectedPreset("60k+"); showSnackbar("Price: 60k+", "success"); }}>
              <p className="font-semibold text-sm" style={{ color: selectedPreset === "60k+" ? "#34d399" : "white" }}>
                60k+ <span className="font-normal text-xs" style={{ color: "#525252" }}>— Luxury & Executive</span>
              </p>
            </button>
          </div>
        </div>
        <div className="p-5 pt-0 pb-8">
          <button onClick={() => { closeSheet(); showSnackbar("Price filter applied", "success"); }} className="w-full py-3.5 rounded-xl font-semibold text-sm text-white ripple-container" style={{ background: "#047857", boxShadow: "0 4px 16px rgba(4,120,87,0.3)" }}>Apply</button>
        </div>
      </div>

      {/* ============================================ */}
      {/* BOTTOM SHEET: PROPERTY TYPE */}
      {/* ============================================ */}
      <div className={`bottom-sheet-overlay ${sheetOpen === "type" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${sheetOpen === "type" ? "active" : ""}`}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Property Type</h3>
          <button onClick={() => setSelectedTypes([])} className="text-xs font-semibold" style={{ color: "#047857" }}>Reset</button>
        </div>
        <div className="px-3 pb-8 space-y-1">
          {propertyTypes.map((pt) => {
            const isChecked = selectedTypes.includes(pt.label);
            return (
              <div key={pt.label} className="flex items-center gap-3 p-3 rounded-xl ripple-container" onClick={() => toggleType(pt.label)} style={{ cursor: "pointer" }}>
                <div className={`custom-check ${isChecked ? "checked" : ""}`}>
                  {isChecked && <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                </div>
                <span className="text-2xl">{pt.emoji}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{pt.label}</p>
                  <p className="text-xs" style={{ color: "#525252" }}>{pt.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="p-5 pt-0 pb-8">
          <button onClick={() => { closeSheet(); showSnackbar("Type filter applied", "success"); }} className="w-full py-3.5 rounded-xl font-semibold text-sm text-white ripple-container" style={{ background: "#047857" }}>Apply</button>
        </div>
      </div>

      {/* ============================================ */}
      {/* BOTTOM SHEET: BEDROOMS */}
      {/* ============================================ */}
      <div className={`bottom-sheet-overlay ${sheetOpen === "beds" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${sheetOpen === "beds" ? "active" : ""}`}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Bedrooms</h3>
          <button onClick={() => setSelectedBedrooms("Any")} className="text-xs font-semibold" style={{ color: "#047857" }}>Reset</button>
        </div>
        <div className="px-3 pb-8 space-y-1">
          {bedroomOptions.map((opt) => (
            <div key={opt.value} className="flex items-center gap-3 p-3 rounded-xl ripple-container" onClick={() => setSelectedBedrooms(opt.value)} style={{ cursor: "pointer" }}>
              <div className={`custom-radio ${selectedBedrooms === opt.value ? "checked" : ""}`} />
              <p className="text-sm font-medium text-white flex-1">{opt.label}</p>
            </div>
          ))}
        </div>
        <div className="p-5 pt-0 pb-8">
          <button onClick={() => { closeSheet(); showSnackbar("Bedrooms filter applied", "success"); }} className="w-full py-3.5 rounded-xl font-semibold text-sm text-white ripple-container" style={{ background: "#047857" }}>Apply</button>
        </div>
      </div>

      {/* ============================================ */}
      {/* BOTTOM SHEET: AMENITIES */}
      {/* ============================================ */}
      <div className={`bottom-sheet-overlay ${sheetOpen === "amenities" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${sheetOpen === "amenities" ? "active" : ""}`}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Amenities</h3>
          <button onClick={() => setSelectedAmenities([])} className="text-xs font-semibold" style={{ color: "#047857" }}>Reset</button>
        </div>
        <div className="px-3 pb-8">
          <div className="grid grid-cols-2 gap-2">
            {amenityOptions.map((a) => {
              const isChecked = selectedAmenities.includes(a.val);
              return (
                <div key={a.val} className="flex items-center gap-2 p-2.5 rounded-xl ripple-container" onClick={() => toggleAmenity(a.val)} style={{ cursor: "pointer" }}>
                  <div className={`custom-check ${isChecked ? "checked" : ""}`}>
                    {isChecked && <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                  </div>
                  <span className="text-sm text-white">{a.emoji} {a.label}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="p-5 pt-0 pb-8">
          <button onClick={() => { closeSheet(); showSnackbar("Amenities filter applied", "success"); }} className="w-full py-3.5 rounded-xl font-semibold text-sm text-white ripple-container" style={{ background: "#047857" }}>Apply</button>
        </div>
      </div>

      {/* ============================================ */}
      {/* BOTTOM SHEET: SORT */}
      {/* ============================================ */}
      <div className={`bottom-sheet-overlay ${sheetOpen === "sort" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${sheetOpen === "sort" ? "active" : ""}`}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-3">
          <h3 className="text-lg font-bold text-white">Sort By</h3>
        </div>
        <div className="px-3 pb-8 space-y-1">
          {sortOptions.map((opt) => (
            <div key={opt.label} className="flex items-center gap-3 p-3 rounded-xl ripple-container" onClick={() => { setSelectedSort(opt.label); closeSheet(); showSnackbar(`Sorted by: ${opt.label}`, "success"); }} style={{ cursor: "pointer" }}>
              <div className={`custom-radio ${selectedSort === opt.label ? "checked" : ""}`} />
              <p className="text-sm font-medium text-white flex-1">{opt.label}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

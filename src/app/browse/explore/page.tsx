"use client";

import { useState, useEffect, Suspense } from "react";
import {
  Search,
  MapPin,
  Heart,
  ShieldCheck,
  ChevronDown,
  Map,
  List,
  X,
  Locate,
  ArrowLeft,
  Clock,
  Bell,
  Navigation,
  ChevronRight,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useBrowse } from "../BrowseContext";
import type { PropertyData } from "../PropertyDetailSheet";
import { UNIT_TYPE_OPTIONS, UNIT_AMENITIES, BROWSE_TYPE_META } from "../../constants";
import { listenToBrowseListings } from "@/lib/browse";
import type { ListingData } from "@/lib/listings";

// ---- Search Suggestions (static) ----
const searchSuggestions = [
  { label: "Bedsitter Kilimani", type: "recent" as const, icon: "📍" },
  { label: "2BR Westlands under 50k", type: "recent" as const, icon: "🏠" },
  { label: "Single Room Roysambu", type: "recent" as const, icon: "🛏️" },
  { label: "Studio with balcony", type: "trending" as const, icon: "🔥" },
  { label: "Pet friendly Nairobi", type: "trending" as const, icon: "🔥" },
  { label: "Furnished apartments Mombasa", type: "trending" as const, icon: "🔥" },
];

// ---- Static filter options ----
const typeMeta = BROWSE_TYPE_META;

const propertyTypes = [
  ...UNIT_TYPE_OPTIONS.filter((t) => t in typeMeta).map((label) => ({ label, ...typeMeta[label] })),
  { emoji: "🏡", label: "Mansion", desc: "Multi-level standalone", count: 8 },
  { emoji: "📐", label: "Plot", desc: "For sale or development", count: 12 },
  { emoji: "🏢", label: "Commercial", desc: "Commercial spaces", count: 3 },
];

const bedroomOptions = [
  { value: "Any", label: "Any", count: 128 },
  ...UNIT_TYPE_OPTIONS.filter((t) => ["Bedsitter", "1 Bedroom", "2 Bedroom"].includes(t)).map((label) => ({
    value: label === "Bedsitter" ? "Bedsitter" : label.replace(" Bedroom", ""),
    label,
    count: typeMeta[label]?.count ?? 0,
  })),
  { value: "3+", label: "3+ Bedrooms", count: 23 },
];

const amenityMeta: Record<string, { emoji: string; label: string; val: string; count: number; group: "utility" | "security" }> = {
  "🚿 Shower": { emoji: "🚿", label: "Hot Shower", val: "Hot Shower", count: 74, group: "utility" },
  "🌊 Hot Water": { emoji: "🌊", label: "Hot Water", val: "Hot Water", count: 62, group: "utility" },
  "🅿️ Parking": { emoji: "🅿️", label: "Parking", val: "Parking", count: 55, group: "security" },
  "📶 WiFi": { emoji: "📶", label: "WiFi", val: "WiFi", count: 67, group: "utility" },
  "💡 Prepaid Token": { emoji: "💡", label: "Token", val: "Token Meter", count: 112, group: "utility" },
  "🔒 CCTV": { emoji: "🔒", label: "CCTV", val: "CCTV", count: 89, group: "security" },
  "🏙️ Balcony": { emoji: "🏙️", label: "Balcony", val: "Balcony", count: 41, group: "security" },
  "❄️ A/C": { emoji: "❄️", label: "A/C", val: "A/C", count: 35, group: "utility" },
  "💧 Borehole/Water": { emoji: "💧", label: "Borehole", val: "Borehole", count: 98, group: "utility" },
  "🚧 Gated Estate": { emoji: "🚧", label: "Gate", val: "Estate Gate", count: 103, group: "security" },
};

const amenitiesUtilities = UNIT_AMENITIES
  .filter((a) => amenityMeta[a]?.group === "utility")
  .map((a) => ({ emoji: amenityMeta[a].emoji, label: amenityMeta[a].label, val: amenityMeta[a].val, count: amenityMeta[a].count }));

const amenitiesSecurity = UNIT_AMENITIES
  .filter((a) => amenityMeta[a]?.group === "security")
  .map((a) => ({ emoji: amenityMeta[a].emoji, label: amenityMeta[a].label, val: amenityMeta[a].val, count: amenityMeta[a].count }));

const sortOptions = [
  { label: "Relevance", default: true },
  { label: "Price: Low to High" },
  { label: "Price: High to Low" },
  { label: "Newest First" },
  { label: "Verified First" },
];

const pricePresets = [
  { label: "Under 5k", desc: "Budget", value: "Under 5k" },
  { label: "5k - 10k", desc: "Affordable", value: "5k - 10k" },
  { label: "10k - 30k", desc: "Mid-range", value: "10k - 30k" },
  { label: "30k - 60k", desc: "Premium", value: "30k - 60k" },
  { label: "60k+", desc: "Luxury & Executive", value: "60k+", wide: true },
];

// ---- Map pins (static) ----
const mapPins = [
  { top: "30%", left: "25%", label: "KSh 15k" },
  { top: "45%", left: "55%", label: "KSh 28k" },
  { top: "60%", left: "35%", label: "KSh 18k" },
  { top: "25%", left: "70%", label: "KSh 12k" },
];

type ActiveTag = { id: string; label: string };

// ---- Helpers to map ListingData to UI ----
function getListingPriceRange(rent: number): string {
  if (rent < 5000) return "Under 5k";
  if (rent <= 10000) return "5k - 10k";
  if (rent <= 30000) return "10k - 30k";
  if (rent <= 60000) return "30k - 60k";
  return "60k+";
}

function matchesFilters(listing: ListingData, filters: {
  searchQuery: string;
  selectedPreset: string | null;
  selectedTypes: string[];
  selectedBedrooms: string;
  selectedAmenities: string[];
}): boolean {
  const q = filters.searchQuery.toLowerCase();

  // Search query
  if (q) {
    const matchName = (listing.title || listing.propertyName || "").toLowerCase().includes(q);
    const matchProperty = (listing.propertyName || "").toLowerCase().includes(q);
    if (!matchName && !matchProperty) return false;
  }

  // Price preset
  if (filters.selectedPreset) {
    const range = filters.selectedPreset;
    const rent = listing.rent;
    if (range === "Under 5k" && rent >= 5000) return false;
    if (range === "5k - 10k" && (rent < 5000 || rent > 10000)) return false;
    if (range === "10k - 30k" && (rent < 10000 || rent > 30000)) return false;
    if (range === "30k - 60k" && (rent < 30000 || rent > 60000)) return false;
    if (range === "60k+" && rent < 60000) return false;
  }

  // Property type filter (based on title/propertyName)
  if (filters.selectedTypes.length > 0) {
    const title = (listing.title || listing.propertyName || "").toLowerCase();
    const matchesType = filters.selectedTypes.some((t) =>
      title.includes(t.toLowerCase().replace(" bedroom", ""))
    );
    if (!matchesType) return false;
  }

  // Bedroom filter
  if (filters.selectedBedrooms && filters.selectedBedrooms !== "Any") {
    const title = (listing.title || listing.propertyName || "").toLowerCase();
    if (filters.selectedBedrooms === "Bedsitter") {
      if (!title.includes("bedsitter") && !title.includes("studio")) return false;
    } else if (filters.selectedBedrooms === "3+") {
      // 3+ bedrooms — show everything that mentions 3br or more
      if (!title.includes("3br") && !title.includes("3 bed")) return false;
    } else {
      const br = filters.selectedBedrooms;
      if (!title.includes(`${br}br`) && !title.includes(`${br} bed`)) return false;
    }
  }

  // Amenities
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
    case "Verified First":
      return copy.sort((a, b) => (b.boosted ? 1 : 0) - (a.boosted ? 1 : 0));
    default:
      return copy.sort((a, b) => (b.boosted ? 1 : 0) - (a.boosted ? 1 : 0));
  }
}

function listingToResultItem(listing: ListingData, idx: number) {
  return {
    id: idx + 1,
    title: listing.title || listing.propertyName || "Untitled",
    location: listing.propertyName || "Nairobi, Kenya",
    price: listing.rent.toLocaleString(),
    img: listing.images?.[0] || "https://picsum.photos/seed/search-res1/300/300.jpg",
    tags: (listing.amenities || []).slice(0, 3).map((a) => `✅ ${a}`),
    verified: true,
    badge: listing.boosted ? "FEATURED" : idx === 0 ? "NEW" : "",
    badgeColor: listing.boosted ? "#047857" : "#ea580c",
    listingId: listing.id,
  };
}

export default function ExplorePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner" />
      </div>
    }>
      <ExplorePageInner />
    </Suspense>
  );
}

function ExplorePageInner() {
  const { showSnackbar, openPropertyDetail, favorites, toggleFavorite, addToRecentlyViewed } = useBrowse();

  // ---- Firestore listings ----
  const [allListings, setAllListings] = useState<ListingData[]>([]);
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

  // ---- View State ----
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const urlSearchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(urlSearchParams?.get("q") || "Kilimani, Nairobi");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([
    "Bedsitter Kilimani",
    "2BR Westlands under 50k",
    "Single Room Roysambu",
  ]);

  // ---- Pagination ----
  const PAGE_SIZE = 10;
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);

  // ---- Filter State ----
  const [selectedPreset, setSelectedPreset] = useState<string | null>("10k - 30k");
  const [selectedTypes, setSelectedTypes] = useState<string[]>(["1 Bedroom"]);
  const [selectedBedrooms, setSelectedBedrooms] = useState<string>("Bedsitter");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [selectedSort, setSelectedSort] = useState("Relevance");
  const [activeTags, setActiveTags] = useState<ActiveTag[]>([
    { id: "loc", label: "📍 Kilimani" },
    { id: "price", label: "💰 KSh 10k-30k" },
    { id: "type", label: "🛏️ Bedsitter" },
  ]);

  // Reset pagination when filters change
  useEffect(() => {
    setDisplayCount(PAGE_SIZE);
  }, [searchQuery, selectedPreset, selectedTypes, selectedBedrooms, selectedAmenities, selectedSort]);

  // ---- Bottom Sheet State ----
  const [sheetOpen, setSheetOpen] = useState<
    "price" | "type" | "beds" | "amenities" | "sort" | "save-search" | "near-me" | null
  >(null);

  // ---- Filtered & sorted results ----
  const filteredResults = allListings
    .filter((l) => l.status === "active")
    .filter((l) => matchesFilters(l, { searchQuery, selectedPreset, selectedTypes, selectedBedrooms, selectedAmenities }));
  const sortedResults = applySort(filteredResults, selectedSort);
  const searchResults = sortedResults.map((l, i) => listingToResultItem(l, i));

  // ---- Map cards from first 3 results (with full listing data) ----
  const mapListings = sortedResults.slice(0, 3);

  // ---- Helpers ----
  const openSheet = (id: typeof sheetOpen) => {
    setSheetOpen(id);
    document.body.style.overflow = "hidden";
  };

  const closeSheet = () => {
    setSheetOpen(null);
    document.body.style.overflow = "";
  };

  const handleFavorite = (e: React.MouseEvent, id: number, metadata?: { title?: string; location?: string; price?: number; image?: string; landlordId?: string; propertyId?: string }) => {
    e.stopPropagation();
    toggleFavorite(id, metadata);
    showSnackbar(
      favorites.includes(id) ? "Removed from saved" : "Added to saved ❤️",
      favorites.includes(id) ? "info" : "success"
    );
  };

  const trackRecentView = (item: { id: number; title: string; location: string; price: string; img: string }) => {
    addToRecentlyViewed({
      id: item.id,
      title: item.title,
      location: item.location,
      price: item.price,
      img: item.img,
      time: "Just now",
      timeColor: "#047857",
    });
  };

  const removeTag = (id: string) => {
    setActiveTags((prev) => prev.filter((t) => t.id !== id));
    showSnackbar("Filter removed", "info");
  };

  const applyFilter = (msg: string) => {
    closeSheet();
    showSnackbar(msg, "success");
  };

  const toggleType = (val: string) => {
    setSelectedTypes((prev) =>
      prev.includes(val) ? prev.filter((t) => t !== val) : [...prev, val]
    );
  };

  const toggleAmenity = (val: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(val) ? prev.filter((a) => a !== val) : [...prev, val]
    );
  };

  return (
    <>
      {viewMode === "map" && <div className="status-bar" />}

      {/* ============================================ */}
      {/* LIST VIEW */}
      {/* ============================================ */}
      <div style={{ display: viewMode === "list" ? "block" : "none" }}>
        <div className="status-bar" />

        {/* Glow Background */}
        <div
          style={{
            position: "absolute",
            top: "-100px",
            right: "-100px",
            width: "300px",
            height: "300px",
            borderRadius: "50%",
            background: "rgba(4,120,87,0.06)",
            filter: "blur(120px)",
            pointerEvents: "none",
          }}
        />

        {/* ====== SEARCH HEADER ====== */}
        <header
          className="px-4 pt-3 pb-2 flex items-center gap-3"
          style={{ animation: "slideInUp 0.4s ease" }}
        >
          <a
            href="/browse"
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ripple-container"
            style={{ background: "rgba(255,255,255,0.05)" }}
          >
            <ArrowLeft className="w-5 h-5" />
          </a>
          <div
            className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1.5px solid rgba(4,120,87,0.3)",
            }}
          >
            <Search className="w-5 h-5" style={{ color: "#047857" }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent outline-none text-sm flex-1 font-medium"
              style={{ color: "#e5e5e5", caretColor: "#047857" }}
              placeholder="Search properties..."
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(""); showSnackbar("Search cleared", "info"); }} className="p-1">
                <X className="w-4 h-4" style={{ color: "#525252" }} />
              </button>
            )}
          </div>
        </header>

        {/* ====== SEARCH SUGGESTIONS DROPDOWN ====== */}
        {showSuggestions && !searchQuery && (
          <div
            className="mx-4 mt-2 rounded-2xl overflow-hidden"
            style={{
              background: "#1A1D21",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
              animation: "slideInUp 0.25s ease",
              zIndex: 40,
              position: "relative",
            }}
          >
            {recentSearches.length > 0 && (
              <>
                <div className="flex items-center justify-between px-4 pt-3 pb-1">
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#525252" }}>Recent</p>
                  <button onClick={() => { setRecentSearches([]); showSnackbar("Recent searches cleared", "info"); }} className="text-xs font-semibold" style={{ color: "#047857" }}>Clear all</button>
                </div>
                {recentSearches.map((term, i) => (
                  <button key={`recent-${i}`} className="w-full flex items-center gap-3 px-4 py-2.5 ripple-container" onClick={() => { setSearchQuery(term); setShowSuggestions(false); showSnackbar(`Searching: "${term}"`, "info"); }}>
                    <Clock className="w-4 h-4" style={{ color: "#525252" }} />
                    <span className="text-sm text-white">{term}</span>
                  </button>
                ))}
              </>
            )}
            <div className="px-4 pt-3 pb-1">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#525252" }}>Trending</p>
            </div>
            {searchSuggestions.filter((s) => s.type === "trending").map((sugg, i) => (
              <button key={`sugg-${i}`} className="w-full flex items-center gap-3 px-4 py-2.5 ripple-container" onClick={() => { setSearchQuery(sugg.label); setShowSuggestions(false); showSnackbar(`Searching: "${sugg.label}"`, "info"); }}>
                <span className="text-sm">{sugg.icon}</span>
                <span className="text-sm text-white">{sugg.label}</span>
              </button>
            ))}
            <div className="px-4 py-3 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <button onClick={() => openSheet("save-search")} className="w-full py-2.5 rounded-xl text-xs font-semibold ripple-container flex items-center justify-center gap-2" style={{ background: "rgba(4,120,87,0.1)", color: "#34d399", border: "1px solid rgba(4,120,87,0.2)" }}>
                <Bell className="w-3.5 h-3.5" />
                Save this search & get alerts
              </button>
            </div>
          </div>
        )}

        {/* ====== FILTER CHIPS ====== */}
        <div className="mt-3 flex gap-2 px-4 overflow-x-auto browse-scroll-hidden pb-2" style={{ animation: "slideInUp 0.5s ease" }}>
          <button className={`filter-chip ${selectedPreset ? "active" : ""}`} onClick={() => openSheet("price")}>
            <span>{selectedPreset ? `KSh ${selectedPreset}` : "Price"}</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button className={`filter-chip ${selectedTypes.length > 0 ? "active" : ""}`} onClick={() => openSheet("type")}>
            <span>Property Type</span>
            <span className="count">{selectedTypes.length > 0 ? selectedTypes.length : propertyTypes.length}</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button className="filter-chip" onClick={() => openSheet("beds")}>
            <span>Bedrooms</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button className={`filter-chip`} onClick={() => openSheet("near-me")}>
            <Navigation className="w-3.5 h-3.5" />
            <span>Near Me</span>
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

        {/* ====== ACTIVE FILTERS ====== */}
        {activeTags.length > 0 && (
          <div className="flex gap-2 px-4 mt-2 overflow-x-auto browse-scroll-hidden pb-1" style={{ animation: "slideInUp 0.55s ease" }}>
            {activeTags.map((tag) => (
              <div key={tag.id} className="active-tag">
                <span>{tag.label}</span>
                <button onClick={() => removeTag(tag.id)} className="flex items-center">
                  <X className="w-3 h-3" style={{ color: "#34d399" }} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ====== RESULTS HEADER ====== */}
        <div className="flex items-center justify-between px-4 mt-4 mb-3" style={{ animation: "slideInUp 0.6s ease" }}>
          <div>
            <p className="text-sm font-semibold text-white">
              {listingsLoading ? "Loading..." : `${searchResults.length} properties found`}
            </p>
            <p className="text-xs" style={{ color: "#525252" }}>Updating in real-time</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setViewMode("map")} className="w-9 h-9 rounded-lg flex items-center justify-center ripple-container" style={{ background: "rgba(255,255,255,0.05)" }}>
              <Map className="w-4 h-4" style={{ color: "#a3a3a3" }} />
            </button>
            <button className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "#047857" }}>
              <List className="w-4 h-4 text-white" />
            </button>
          </div>
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
              <h3 className="text-lg font-bold text-white mb-2">No properties found</h3>
              <p className="text-sm mb-6" style={{ color: "#a3a3a3" }}>
                Try adjusting your filters or search term to find more listings.
              </p>
              <div className="space-y-2 max-w-xs mx-auto">
                <p className="text-xs font-semibold" style={{ color: "#525252" }}>Suggestions:</p>
                {[
                  { emoji: "📍", label: "Broader location", desc: "Try Nairobi or Mombasa" },
                  { emoji: "💰", label: "Higher budget", desc: "Increase your price range" },
                  { emoji: "🛏️", label: "More options", desc: "Try Bedsitter or Single Room" },
                ].map((sugg, i) => (
                  <button key={i} className="flex items-center gap-3 p-3 rounded-xl w-full text-left ripple-container" style={{ background: "rgba(255,255,255,0.03)" }} onClick={() => showSnackbar(`Showing: ${sugg.label}`, "info")}>
                    <span className="text-lg">{sugg.emoji}</span>
                    <div>
                      <p className="text-sm font-medium text-white">{sugg.label}</p>
                      <p className="text-xs" style={{ color: "#525252" }}>{sugg.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
              <button onClick={() => { setSelectedPreset(null); setSelectedTypes([]); setSelectedBedrooms("Any"); setSelectedAmenities([]); setSearchQuery(""); showSnackbar("Filters cleared", "success"); }} className="mt-6 px-6 py-3 rounded-xl text-sm font-semibold ripple-container" style={{ background: "rgba(4,120,87,0.1)", color: "#34d399", border: "1px solid rgba(4,120,87,0.2)" }}>
                Clear All Filters
              </button>
            </div>
          ) : (
            searchResults.slice(0, displayCount).map((item) => (
              <div
                key={item.id}
                className="browse-property-card ripple-container"
                onClick={() => {
                  const fullL = allListings.find((l) => l.id === item.listingId);
                  const propData: PropertyData = {
                    id: item.id,
                    title: item.title,
                    location: item.location,
                    price: item.price,
                    image: item.img,
                    gallery: fullL?.images?.length
                      ? fullL.images
                      : [item.img || "https://picsum.photos/seed/prop-detail1/800/640.jpg"],
                    badge: item.badge || undefined,
                    verified: item.verified,
                    featured: !!item.badge,
                    type: "Bedsitter",
                    bathrooms: 1,
                    size: "20 sqm",
                    floor: "3rd",
                    description: `Modern ${item.title.toLowerCase()} located in ${item.location}. Features include a well-finished interior with ample natural light, secure compound with CCTV, and 24-hour guard. Walking distance to shopping centers and public transport.`,
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
                    landlord: {
                      name: "John Mwangi",
                      initial: "J",
                      verified: item.verified,
                      response: "~1 hour",
                      rating: 5,
                      reviews: 42,
                    },
                    landlordId: allListings.find((l) => l.id === item.listingId)?.landlordId || "",
                    photos: 5,
                    isFavorited: favorites.includes(item.id),
                  };
                  openPropertyDetail(propData);
                  trackRecentView(item);
                }}
              >
                <div className="flex">
                  <div className="relative">
                    <img src={item.img} alt={item.title} className="w-32 h-32 object-cover" style={{ borderRadius: "20px 0 0 20px" }} />
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
                        <button                    onClick={(e) => handleFavorite(e, item.id, { title: item.title, location: item.location, price: parseInt(item.price.replace(/,/g, '')), image: item.img, landlordId: allListings.find((l) => l.id === item.listingId)?.landlordId || "", propertyId: allListings.find((l) => l.id === item.listingId)?.propertyId || "" })}
                        className="p-1 flex-shrink-0">
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
            ))
          )}

          {/* ====== LOAD MORE / PAGINATION ====== */}
          {searchResults.length > 0 && (
            <div className="py-6 text-center" style={{ animation: "slideInUp 0.8s ease" }}>
              <button onClick={() => setDisplayCount((prev) => Math.min(prev + PAGE_SIZE, searchResults.length))} className="w-full py-3.5 rounded-xl font-semibold text-sm ripple-container flex items-center justify-center gap-2" style={{ background: "rgba(255,255,255,0.05)", color: "#e5e5e5", border: "1px solid rgba(255,255,255,0.08)" }}>
                <ChevronDown className="w-4 h-4" />
                Load More ({Math.max(0, searchResults.length - displayCount)} more)
              </button>
              <p className="text-xs mt-3" style={{ color: "#525252" }}>
                Showing {Math.min(displayCount, searchResults.length)} of {allListings.filter((l) => l.status === "active").length} properties
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ============================================ */}
      {/* MAP VIEW */}
      {/* ============================================ */}
      <div className={`map-view ${viewMode === "map" ? "active" : ""}`}>
        <div className="status-bar" />
        <div className="absolute top-0 left-0 right-0 z-30 p-4 flex items-center gap-3" style={{ paddingTop: "max(24px, env(safe-area-inset-top))" }}>
          <button onClick={() => setViewMode("list")} className="w-10 h-10 rounded-full flex items-center justify-center ripple-container" style={{ background: "#1A1D21", boxShadow: "0 4px 12px rgba(0,0,0,0.4)" }}>
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium" style={{ background: "#1A1D21", color: "#e5e5e5", boxShadow: "0 4px 12px rgba(0,0,0,0.4)" }}>
            📍 Kilimani, Nairobi
          </div>
        </div>
        <div className="map-placeholder">
          <img src="https://picsum.photos/seed/nairobi-map-dark/800/1400.jpg" className="w-full h-full object-cover opacity-30" alt="Map" />
          {mapPins.map((pin, i) => (
            <div key={i} className="absolute" style={{ top: pin.top, left: pin.left }}>
              <div className="px-2 py-1 rounded-lg text-xs font-bold text-white" style={{ background: "#047857", boxShadow: "0 2px 8px rgba(4,120,87,0.5)" }}>{pin.label}</div>
              <div className="w-2 h-2 rounded-full mx-auto" style={{ background: "#047857" }} />
            </div>
          ))}
          <button onClick={() => {
            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(
                (pos) => showSnackbar(`📍 Centered on your location (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`, "success"),
                () => showSnackbar("Unable to get location. Check permissions.", "error"),
                { enableHighAccuracy: true, timeout: 10000 }
              );
            } else {
              showSnackbar("Geolocation not supported on this device", "error");
            }
          }} className="absolute bottom-32 right-4 w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "#1A1D21", boxShadow: "0 4px 16px rgba(0,0,0,0.4)" }}>
            <Locate className="w-5 h-5 text-white" />
          </button>
        </div>
        <div className="absolute bottom-0 left-0 right-0 map-card-drawer">
          <div className="w-10 h-1 rounded-full mx-auto mb-3" style={{ background: "rgba(255,255,255,0.2)" }} />
          <p className="text-xs font-semibold mb-3 px-2" style={{ color: "#525252" }}>{mapListings.length} PROPERTIES NEARBY</p>
          <div className="flex gap-3 overflow-x-auto browse-scroll-hidden pb-4">
            {mapListings.map((listing, i) => (
              <div key={i} className="browse-property-card flex-shrink-0" style={{ width: "240px" }} onClick={() => {
                const propData: PropertyData = {
                  id: i + 1,
                  title: listing.title || listing.propertyName || "Untitled",
                  location: listing.propertyName || "Nairobi, Kenya",
                  price: listing.rent.toLocaleString(),
                  image: listing.images?.[0] || "https://picsum.photos/seed/search-res1/300/300.jpg",
                  gallery: listing.images?.length
                  ? listing.images
                  : [listing.images?.[0] || "https://picsum.photos/seed/prop-detail1/800/640.jpg"],
                  badge: listing.boosted ? "FEATURED" : "",
                  verified: true,
                  featured: !!listing.boosted,
                  type: "Bedsitter",
                  bathrooms: 1,
                  size: "20 sqm",
                  floor: "3rd",
                  description: `Modern property located in ${listing.propertyName || "Nairobi, Kenya"}. Features include a well-finished interior with ample natural light, secure compound with CCTV, and 24-hour guard.`,
                  amenities: [
                    { emoji: "💧", label: "Borehole / 24hr Water" },
                    { emoji: "⚡", label: "Token Meter" },
                    { emoji: "🚿", label: "Hot Shower" },
                    { emoji: "🔒", label: "CCTV & Guard" },
                    { emoji: "🅿️", label: "Free Parking" },
                    { emoji: "📶", label: "WiFi Ready" },
                  ],
                  costBreakdown: [
                    { label: "Monthly Rent", amount: `KSh ${listing.rent.toLocaleString()}` },
                    { label: "Deposit (1 month)", amount: `KSh ${listing.rent.toLocaleString()}` },
                    { label: "Service Charge", amount: "KSh 2,000" },
                  ],
                  totalMoveIn: `KSh ${(listing.rent * 2 + 2000).toLocaleString()}`,
                  landlord: {
                    name: "John Mwangi",
                    initial: "J",
                    verified: true,
                    response: "~1 hour",
                    rating: 5,
                    reviews: 42,
                  },
                  landlordId: listing.landlordId || "",
                  photos: 5,
                  isFavorited: favorites.includes(i + 1),
                };
                openPropertyDetail(propData);
              }}>
                <img src={listing.images?.[0] || "https://picsum.photos/seed/search-res1/300/300.jpg"} alt={listing.title || "Property"} className="w-full h-24 object-cover" />
                <div className="p-3">
                  <h3 className="font-bold text-white text-xs">{listing.title || listing.propertyName || "Untitled"}</h3>
                  <p className="text-sm font-bold mt-1" style={{ color: "#047857" }}>KSh {listing.rent.toLocaleString()}/mo</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* BOTTOM SHEET: PRICE RANGE */}
      {/* ============================================ */}
      <div className={`bottom-sheet-overlay ${sheetOpen === "price" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${sheetOpen === "price" ? "active" : ""}`}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Price Range</h3>
          <button onClick={() => setSelectedPreset(null)} className="text-xs font-semibold" style={{ color: "#047857" }}>Reset</button>
        </div>
        <div className="px-5 pb-3">
          <p className="text-xs" style={{ color: "#a3a3a3" }}>Monthly rent in Kenyan Shillings</p>
        </div>
        <div className="px-5 mt-4">
          <div className="range-bar">
            <div className="range-fill" style={{ left: "10%", width: "30%" }} />
            <div className="range-thumb" style={{ left: "10%" }} />
            <div className="range-thumb" style={{ left: "40%" }} />
          </div>
          <div className="flex justify-between mt-3">
            <div className="px-3 py-2 rounded-lg text-sm font-semibold" style={{ background: "rgba(255,255,255,0.05)" }}>KSh 10,000</div>
            <div className="px-3 py-2 rounded-lg text-sm font-semibold" style={{ background: "rgba(255,255,255,0.05)" }}>KSh 30,000</div>
          </div>
        </div>
        <div className="px-5 mt-6">
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#525252" }}>Quick Select</p>
          <div className="grid grid-cols-2 gap-2">
            {pricePresets.slice(0, 4).map((p) => (
              <button key={p.value} className={`price-preset ${selectedPreset === p.value ? "selected" : ""}`} onClick={() => { setSelectedPreset(p.value); showSnackbar(`Selected: ${p.value}`, "success"); }}>
                <p className="font-semibold text-sm" style={{ color: selectedPreset === p.value ? "#34d399" : "white" }}>{p.label}</p>
                <p className="text-xs" style={{ color: "#525252" }}>{p.desc}</p>
              </button>
            ))}
            <button className={`price-preset col-span-2 ${selectedPreset === "60k+" ? "selected" : ""}`} onClick={() => { setSelectedPreset("60k+"); showSnackbar("Selected: 60k+", "success"); }}>
              <p className="font-semibold text-sm" style={{ color: selectedPreset === "60k+" ? "#34d399" : "white" }}>
                60k+ <span className="font-normal text-xs" style={{ color: "#525252" }}>— Luxury & Executive</span>
              </p>
            </button>
          </div>
        </div>
        <div className="p-5 pb-8">
          <button onClick={() => applyFilter("Price updated")} className="w-full py-3.5 rounded-xl font-semibold text-sm text-white ripple-container" style={{ background: "#047857", boxShadow: "0 4px 16px rgba(4,120,87,0.3)" }}>Apply Filter</button>
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
                  {isChecked && (
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  )}
                </div>
                <span className="text-2xl">{pt.emoji}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{pt.label}</p>
                  <p className="text-xs" style={{ color: "#525252" }}>{pt.desc}</p>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md" style={{ background: "rgba(255,255,255,0.05)", color: "#525252" }}>{pt.count}</span>
              </div>
            );
          })}
        </div>
        <div className="p-5 pt-0 pb-8">
          <button onClick={() => applyFilter("Types updated")} className="w-full py-3.5 rounded-xl font-semibold text-sm text-white ripple-container" style={{ background: "#047857" }}>Apply</button>
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
              <span className="text-xs font-semibold" style={{ color: opt.value === "Any" ? "#047857" : "#525252" }}>{opt.count}</span>
            </div>
          ))}
        </div>
        <div className="p-5 pt-0 pb-8">
          <button onClick={() => applyFilter("Bedrooms updated")} className="w-full py-3.5 rounded-xl font-semibold text-sm text-white ripple-container" style={{ background: "#047857" }}>Apply</button>
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
          <p className="text-xs font-semibold uppercase tracking-wider px-2 mb-2" style={{ color: "#525252" }}>Utilities</p>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {amenitiesUtilities.map((a) => {
              const isChecked = selectedAmenities.includes(a.val);
              return (
                <div key={a.val} className="flex items-center gap-2 p-2.5 rounded-xl ripple-container" onClick={() => toggleAmenity(a.val)} style={{ cursor: "pointer" }}>
                  <div className={`custom-check ${isChecked ? "checked" : ""}`}>
                    {isChecked && (
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    )}
                  </div>
                  <span className="text-sm text-white">{a.emoji} {a.label}</span>
                  <span className="text-xs font-semibold ml-auto" style={{ color: "#525252" }}>{a.count}</span>
                </div>
              );
            })}
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider px-2 mb-2" style={{ color: "#525252" }}>Security & Parking</p>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {amenitiesSecurity.map((a) => {
              const isChecked = selectedAmenities.includes(a.val);
              return (
                <div key={a.val} className="flex items-center gap-2 p-2.5 rounded-xl ripple-container" onClick={() => toggleAmenity(a.val)} style={{ cursor: "pointer" }}>
                  <div className={`custom-check ${isChecked ? "checked" : ""}`}>
                    {isChecked && (
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    )}
                  </div>
                  <span className="text-sm text-white">{a.emoji} {a.label}</span>
                  <span className="text-xs font-semibold ml-auto" style={{ color: "#525252" }}>{a.count}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="p-5 pt-0 pb-8">
          <button onClick={() => applyFilter("Amenities updated")} className="w-full py-3.5 rounded-xl font-semibold text-sm text-white ripple-container" style={{ background: "#047857" }}>Apply</button>
        </div>
      </div>

      {/* ============================================ */}
      {/* BOTTOM SHEET: SAVE SEARCH ALERT */}
      {/* ============================================ */}
      <div className={`bottom-sheet-overlay ${sheetOpen === "save-search" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${sheetOpen === "save-search" ? "active" : ""}`}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-3">
          <h3 className="text-lg font-bold text-white mb-1">Save Search Alert</h3>
          <p className="text-xs" style={{ color: "#a3a3a3" }}>Get notified when new properties match your search</p>
        </div>
        <div className="px-5 pb-8 space-y-5">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider block mb-2" style={{ color: "#525252" }}>Search Name</label>
            <input type="text" className="android-input" defaultValue="Bedsitter Kilimani" placeholder="e.g., My ideal apartment" />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider block mb-3" style={{ color: "#525252" }}>Notification Frequency</label>
            <div className="space-y-2">
              {[
                { value: "instant", label: "Instant", desc: "Get notified immediately" },
                { value: "daily", label: "Daily Digest", desc: "Once a day summary" },
                { value: "weekly", label: "Weekly Digest", desc: "Weekly roundup" },
              ].map((opt) => (
                <div key={opt.value} className="flex items-center gap-3 p-3 rounded-xl ripple-container" onClick={() => showSnackbar(`Set to ${opt.label}`, "success")} style={{ cursor: "pointer" }}>
                  <div className={`custom-radio ${opt.value === "instant" ? "checked" : ""}`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{opt.label}</p>
                    <p className="text-xs" style={{ color: "#525252" }}>{opt.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
            <div>
              <p className="text-sm font-medium text-white">Push Notifications</p>
              <p className="text-xs" style={{ color: "#525252" }}>Receive alerts on your device</p>
            </div>
            <div className="toggle-track active"><div className="toggle-thumb" /></div>
          </div>
          <button onClick={() => { closeSheet(); showSnackbar("Search alert saved! 🔔", "success"); }} className="w-full py-3.5 rounded-xl font-semibold text-sm text-white ripple-container" style={{ background: "#047857", boxShadow: "0 4px 16px rgba(4,120,87,0.3)" }}>Save Alert</button>
        </div>
      </div>

      {/* ============================================ */}
      {/* BOTTOM SHEET: NEAR ME */}
      {/* ============================================ */}
      <div className={`bottom-sheet-overlay ${sheetOpen === "near-me" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${sheetOpen === "near-me" ? "active" : ""}`}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-3">
          <h3 className="text-lg font-bold text-white mb-1">Near Me</h3>
          <p className="text-xs" style={{ color: "#a3a3a3" }}>Find properties around your current location</p>
        </div>
        <div className="px-5 pb-8 space-y-5">
          <div className="p-4 rounded-2xl flex items-center gap-3" style={{ background: "rgba(4,120,87,0.08)", border: "1px solid rgba(4,120,87,0.2)" }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "rgba(4,120,87,0.15)" }}>
              <Navigation className="w-5 h-5" style={{ color: "#34d399" }} />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Location Active</p>
              <p className="text-xs" style={{ color: "#a3a3a3" }}>Kilimani, Nairobi • Updated just now</p>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider block mb-3" style={{ color: "#525252" }}>Search Radius</label>
            <div className="flex gap-2 flex-wrap">
              {[{ label: "1 km", desc: "Walking distance" }, { label: "3 km", desc: "Short drive", active: true }, { label: "5 km", desc: "Within estate" }, { label: "10 km", desc: "Wider area" }, { label: "25 km", desc: "Entire city" }].map((r) => (
                <button key={r.label} className={`flex-1 min-w-[60px] p-3 rounded-xl text-center transition-all ${r.active ? "active" : ""}`} style={{ background: r.active ? "rgba(4,120,87,0.15)" : "rgba(255,255,255,0.05)", border: r.active ? "1px solid rgba(4,120,87,0.3)" : "1px solid rgba(255,255,255,0.06)" }} onClick={() => showSnackbar(`Radius set to ${r.label}`, "success")}>
                  <p className="text-sm font-bold" style={{ color: r.active ? "#34d399" : "white" }}>{r.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: "#525252" }}>{r.desc}</p>
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#525252" }}>Quick locations</p>
            <div className="space-y-1">
              {[{ emoji: "📍", label: "Kilimani", desc: "2.4 km • 45 properties" }, { emoji: "📍", label: "Westlands", desc: "4.1 km • 32 properties" }, { emoji: "📍", label: "Kileleshwa", desc: "3.2 km • 28 properties" }].map((loc, i) => (
                <button key={i} className="w-full flex items-center gap-3 p-3 rounded-xl ripple-container" style={{ background: "rgba(255,255,255,0.03)" }} onClick={() => { setSearchQuery(loc.label); setViewMode("list"); closeSheet(); showSnackbar(`📍 Showing properties near ${loc.label}`, "success"); }}>
                  <span className="text-lg">{loc.emoji}</span>
                  <div className="text-left flex-1">
                    <p className="text-sm font-medium text-white">{loc.label}</p>
                    <p className="text-xs" style={{ color: "#525252" }}>{loc.desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4" style={{ color: "#525252" }} />
                </button>
              ))}
            </div>
          </div>
          <button onClick={() => { setSearchQuery("Nairobi"); setViewMode("list"); closeSheet(); showSnackbar("📍 Showing properties near your location", "success"); }} className="w-full py-3.5 rounded-xl font-semibold text-sm text-white ripple-container" style={{ background: "#047857", boxShadow: "0 4px 16px rgba(4,120,87,0.3)" }}>Search Nearby</button>
        </div>
      </div>

      {/* ============================================ */}
      {/* BOTTOM SHEET: SORT BY */}
      {/* ============================================ */}
      <div className={`bottom-sheet-overlay ${sheetOpen === "sort" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${sheetOpen === "sort" ? "active" : ""}`}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-3">
          <h3 className="text-lg font-bold text-white">Sort By</h3>
        </div>
        <div className="px-3 pb-8 space-y-1">
          {sortOptions.map((opt) => (
            <div key={opt.label} className="flex items-center gap-3 p-3 rounded-xl ripple-container" onClick={() => { setSelectedSort(opt.label); setTimeout(() => { closeSheet(); showSnackbar(`Sorted by: ${opt.label}`, "success"); }, 300); }} style={{ cursor: "pointer" }}>
              <div className={`custom-radio ${selectedSort === opt.label ? "checked" : ""}`} />
              <p className="text-sm font-medium text-white flex-1">{opt.label}</p>
              {opt.default && <span className="text-xs" style={{ color: "#047857" }}>Default</span>}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  MapPin,
  ChevronDown,
  Bell,
  Search,
  SlidersHorizontal,
  Heart,
  ShieldCheck,
  X,
  MessageCircle,
  Calendar,
  Home,
  Tag,
  Check,
} from "lucide-react";
import { useBrowse } from "./BrowseContext";
import type { PropertyData } from "./PropertyDetailSheet";
import { UNIT_TYPE_OPTIONS, BROWSE_TYPE_META } from "../constants";
import { listenToBrowseListings } from "@/lib/browse";
import type { ListingData } from "@/lib/listings";

// ---- UI Constants (static) ----
const categories = [
  "All",
  ...UNIT_TYPE_OPTIONS.filter((t) => ["Bedsitter", "1 Bedroom", "2 Bedroom"].includes(t)).map((label) => `${BROWSE_TYPE_META[label].emoji} ${label}`),
  "🏡 Mansion",
  "🏢 Office",
  "📐 Plot",
  "🏪 Shop",
];

const popularAreas = [
  { name: "Kilimani", listings: 240, img: "https://picsum.photos/seed/kilimani-area/400/200.jpg" },
  { name: "Westlands", listings: 185, img: "https://picsum.photos/seed/westlands-area/400/200.jpg" },
  { name: "Rongai", listings: 320, img: "https://picsum.photos/seed/rongai-area/400/200.jpg" },
  { name: "Kileleshwa", listings: 150, img: "https://picsum.photos/seed/kileleshwa-area/400/200.jpg" },
];

const cities = [
  { name: "Nairobi", emoji: "🏙️", listings: 1240 },
  { name: "Mombasa", emoji: "🏖️", listings: 420 },
  { name: "Kisumu", emoji: "🌅", listings: 180 },
  { name: "Nakuru", emoji: "🌋", listings: 210 },
  { name: "Eldoret", emoji: "🏃", listings: 95 },
];

const trendingSearches = [
  "🔥 Bedsitter Kilimani",
  "2BR Westlands",
  "Single Room Roysambu",
  "Affordable Rongai",
  "Office CBD",
];


// ---- Helpers to map ListingData to UI display objects ----
function listingToFeaturedCard(listing: ListingData, idx: number) {
  return {
    id: idx + 1,
    title: listing.title || listing.propertyName || "Untitled",
    location: listing.propertyName || "Nairobi, Kenya",
    price: listing.rent.toLocaleString(),
    badge: listing.boosted ? "Featured" : idx === 0 ? "New" : "",
    img: listing.images?.[0] || "https://picsum.photos/seed/listing-placeholder/560/360.jpg",
    tags: (listing.amenities || []).slice(0, 3).map((a) => `✅ ${a}`),
    verified: true,
    photos: listing.images?.length || 0,
    listingId: listing.id,
  };
}

function listingToRecentCard(listing: ListingData, idx: number) {
  return {
    id: idx + 100,
    title: listing.title || listing.propertyName || "Untitled",
    location: listing.propertyName || "Nairobi, Kenya",
    price: listing.rent.toLocaleString(),
    img: listing.images?.[0] || "https://picsum.photos/seed/recent-placeholder/300/300.jpg",
    time: listing.createdAt
      ? `${Math.floor((Date.now() - listing.createdAt.toDate().getTime()) / 3600000)}h ago`
      : "Recently",
    timeColor: idx < 3 ? "#047857" : "#525252",
    listingId: listing.id,
  };
}

function listingToPropertyData(listing: ListingData, idx: number): PropertyData {
  return {
    id: idx + 1,
    title: listing.title || listing.propertyName || "Untitled",
    location: listing.propertyName || "Nairobi, Kenya",
    price: listing.rent.toLocaleString(),
    image: listing.images?.[0] || "https://picsum.photos/seed/prop-detail1/800/640.jpg",
    gallery: [
      listing.images?.[0] || "https://picsum.photos/seed/prop-detail1/800/640.jpg",
      listing.images?.[1] || "https://picsum.photos/seed/prop-detail2/800/640.jpg",
      listing.images?.[2] || "https://picsum.photos/seed/prop-detail3/800/640.jpg",
      "https://picsum.photos/seed/prop-detail4/800/640.jpg",
      "https://picsum.photos/seed/prop-detail5/800/640.jpg",
    ],
    badge: listing.boosted ? "FEATURED" : idx === 0 ? "New" : undefined,
    featured: listing.boosted || idx === 0,
    verified: true,
    type: "Bedsitter",
    bathrooms: 1,
    size: "20 sqm",
    floor: "3rd",
    description: listing.description || `Beautifully finished ${listing.title?.toLowerCase() || "unit"} located in ${listing.propertyName || "Nairobi"}. Secure compound with modern fittings and ample natural light. Viewing available on weekdays and weekends upon request.`,
    amenities: (listing.amenities || []).slice(0, 6).map((a) => ({ emoji: "✅", label: a })),
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
    photos: listing.images?.length || 5,
    isFavorited: false,
  };
}

export default function BrowseHome() {
  const router = useRouter();
  const {
    showSnackbar,
    openPropertyDetail,
    favorites,
    toggleFavorite,
    addToRecentlyViewed,
    recentlyViewed,
    viewingsCount,
    inquiriesCount,
    unreadNotificationCount,
  } = useBrowse();

  // ---- Firestore listings state ----
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

  // Derive featured (boosted) and recent listings from Firestore data
  const featuredListings = allListings
    .filter((l) => l.status === "active" && l.boosted)
    .slice(0, 6)
    .map((l, i) => listingToFeaturedCard(l, i));

  // If no boosted listings, use first 3 active as featured
  const displayFeatured = featuredListings.length > 0
    ? featuredListings
    : allListings.filter((l) => l.status === "active").slice(0, 3).map((l, i) => listingToFeaturedCard(l, i));

  const recentListings = allListings
    .filter((l) => l.status === "active")
    .sort((a, b) => {
      if (!a.createdAt || !b.createdAt) return 0;
      return b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime();
    })
    .slice(0, 6)
    .map((l, i) => listingToRecentCard(l, i));

  // Default recently viewed fallback
  const defaultRecentlyViewed = recentListings.slice(0, 4).length > 0
    ? recentListings.slice(0, 4)
    : [
        { id: 7, title: "Modern Bedsitter - Kilimani", location: "Kilimani, Nairobi", price: "15,000", img: "https://picsum.photos/seed/recent-view1/300/300.jpg", time: "30m ago", timeColor: "#047857" as const, listingId: "" },
        { id: 8, title: "2BR Apartment - Westlands", location: "Westlands, Nairobi", price: "45,000", img: "https://picsum.photos/seed/recent-view2/300/300.jpg", time: "1h ago", timeColor: "#047857" as const, listingId: "" },
        { id: 9, title: "1BR - Nyali", location: "Nyali, Mombasa", price: "35,000", img: "https://picsum.photos/seed/recent-view3/300/300.jpg", time: "2h ago", timeColor: "#047857" as const, listingId: "" },
        { id: 10, title: "Single Room - Roysambu", location: "Roysambu, Nairobi", price: "6,500", img: "https://picsum.photos/seed/recent-view4/300/300.jpg", time: "3h ago", timeColor: "#525252" as const, listingId: "" },
      ];

  const displayRecentViews = recentlyViewed.length > 0 ? recentlyViewed : defaultRecentlyViewed;

  // ---- State ----
  const [selectedLocation, setSelectedLocation] = useState("Nairobi, Kenya");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [locationSheetOpen, setLocationSheetOpen] = useState(false);
  const [searchSheetOpen, setSearchSheetOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // ---- Bottom Sheet Helpers ----
  const openSheet = (setter: (v: boolean) => void, focusSearch?: boolean) => {
    setter(true);
    document.body.style.overflow = "hidden";
    if (focusSearch) {
      setTimeout(() => {
        const input = document.getElementById("browse-search-input") as HTMLInputElement | null;
        if (input) input.focus();
      }, 350);
    }
  };

  const closeSheet = (setter: (v: boolean) => void) => {
    setter(false);
    document.body.style.overflow = "";
  };

  // ---- Category Selection ----
  const handleCategorySelect = (cat: string) => {
    setSelectedCategory(cat);
    if (cat === "All") {
      router.push("/browse/explore");
    } else {
      // Extract the name from emoji-prefixed categories like "🏠 Bedsitter"
      const clean = cat.replace(/^[^\s]*\s*/, "");
      router.push(`/browse/explore?q=${encodeURIComponent(clean)}`);
    }
  };

  // ---- Favorite Toggle ----
  const handleFavorite = (e: React.MouseEvent, id: number, metadata?: { title?: string; location?: string; price?: number; image?: string; landlordId?: string }) => {
    e.stopPropagation();
    toggleFavorite(id, metadata);
    showSnackbar(
      favorites.includes(id) ? "Removed from saved" : "Added to saved ❤️",
      favorites.includes(id) ? "info" : "success"
    );
  };

  // ---- Location Select ----
  const handleLocationSelect = (loc: string) => {
    setSelectedLocation(loc);
    closeSheet(() => setLocationSheetOpen(false));
    setLocationSheetOpen(false);
    document.body.style.overflow = "";
    showSnackbar(`Location set to ${loc}`, "success");
  };

  // ---- Search ----
  const handleSearch = (term: string) => {
    closeSheet(() => setSearchSheetOpen(false));
    setSearchSheetOpen(false);
    document.body.style.overflow = "";
    router.push(`/browse/explore?q=${encodeURIComponent(term)}`);
    showSnackbar(`Searching: "${term}"`, "info");
  };

  // ---- Track recently viewed ----
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

  // ---- Map listing to PropertyData ----
  const openPropertyFromListing = (
    listing: { id: number; title: string; location: string; price: string; img: string; listingId?: string }
  ) => {
    // Try to find the full Firestore listing for better data
    const fullListing = listing.listingId
      ? allListings.find((l) => l.id === listing.listingId)
      : undefined;

    const propData: PropertyData = fullListing
      ? listingToPropertyData(fullListing, listing.id - 1)
      : {
          id: listing.id,
          title: listing.title,
          location: listing.location,
          price: listing.price,
          image: listing.img,
          gallery: [
            "https://picsum.photos/seed/prop-detail1/800/640.jpg",
            "https://picsum.photos/seed/prop-detail2/800/640.jpg",
            "https://picsum.photos/seed/prop-detail3/800/640.jpg",
            "https://picsum.photos/seed/prop-detail4/800/640.jpg",
            "https://picsum.photos/seed/prop-detail5/800/640.jpg",
          ],
          badge: "FEATURED",
          featured: true,
          verified: true,
          type: "Bedsitter",
          bathrooms: 1,
          size: "20 sqm",
          floor: "3rd",
          description: `This is a beautifully finished ${listing.title.toLowerCase()} located in ${listing.location}. The unit comes with modern fittings and ample natural light. The compound is secure with CCTV and a 24-hour guard. Viewing is available on weekdays and weekends upon request.`,
          amenities: [
            { emoji: "💧", label: "Borehole / 24hr Water" },
            { emoji: "⚡", label: "Token Meter" },
            { emoji: "🚿", label: "Hot Shower" },
            { emoji: "🔒", label: "CCTV & Guard" },
            { emoji: "🅿️", label: "Free Parking" },
            { emoji: "📶", label: "WiFi Ready" },
          ],
          costBreakdown: [
            { label: "Monthly Rent", amount: `KSh ${listing.price.replace(/,/g, "")}` },
            { label: "Deposit (1 month)", amount: `KSh ${listing.price.replace(/,/g, "")}` },
            { label: "Service Charge", amount: "KSh 2,000" },
          ],
          totalMoveIn: `KSh ${(parseInt(listing.price.replace(/,/g, "")) * 2 + 2000).toLocaleString()}`,
          landlord: {
            name: "John Mwangi",
            initial: "J",
            verified: true,
            response: "~1 hour",
            rating: 5,
            reviews: 42,
          },
          landlordId: "",
          photos: 5,
          isFavorited: favorites.includes(listing.id),
        };
    openPropertyDetail(propData);
    trackRecentView(listing);
  };

  return (
    <>
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

      {/* ====== HEADER ====== */}
      <header
        className="px-5 pt-4 pb-2 flex items-center justify-between"
        style={{ animation: "slideInUp 0.5s ease" }}
      >
        <div>
          <p className="text-xs font-medium" style={{ color: "#a3a3a3" }}>
            📍 Current Location
          </p>
          <button
            onClick={() => openSheet(() => setLocationSheetOpen(true))}
            className="flex items-center gap-1 mt-0.5 ripple-container rounded-lg px-1 py-0.5 -ml-1"
          >
            <span className="text-base font-bold text-white">{selectedLocation}</span>
            <ChevronDown className="w-4 h-4" style={{ color: "#047857" }} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push("/browse/notifications")}
            className="w-10 h-10 rounded-full flex items-center justify-center relative ripple-container"
            style={{ background: "rgba(255,255,255,0.05)" }}
          >
            <Bell className="w-5 h-5" style={{ color: "#e5e5e5" }} />
            {unreadNotificationCount > 0 && (
              <div
                className="absolute flex items-center justify-center"
                style={{
                  top: "4px",
                  right: "4px",
                  minWidth: "16px",
                  height: "16px",
                  borderRadius: "8px",
                  background: "#ef4444",
                  fontSize: "9px",
                  fontWeight: 700,
                  color: "white",
                  padding: "0 4px",
                }}
              >
                {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
              </div>
            )}
          </button>
        </div>
      </header>

      {/* ====== SEARCH BAR ====== */}
      <div className="px-5 mt-3" style={{ animation: "slideInUp 0.6s ease" }}>
        <div
          className="browse-search-bar"
          onClick={() => openSheet(() => setSearchSheetOpen(true), true)}
        >
          <Search className="w-5 h-5" style={{ color: "#525252" }} />
          <span className="text-sm" style={{ color: "#525252" }}>
            Search apartments, bedsitters, plots...
          </span>
          <div
            className="ml-auto w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "#047857" }}
          >
            <SlidersHorizontal className="w-4 h-4 text-white" />
          </div>
        </div>
      </div>

      {/* ====== MY ACTIVITY QUICK ACCESS ====== */}
      <div className="px-5 mt-5" style={{ animation: "slideInUp 0.65s ease" }}>
        <div className="flex gap-3">
          <button
            onClick={() => router.push("/browse/viewings")}
            className="flex-1 flex items-center gap-3 p-3.5 rounded-2xl ripple-container"
            style={{ background: "rgba(4,120,87,0.08)", border: "1px solid rgba(4,120,87,0.15)" }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(4,120,87,0.15)" }}
            >
              <Calendar className="w-5 h-5" style={{ color: "#34d399" }} />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-white">My Viewings</p>
              <p className="text-xs" style={{ color: "#a3a3a3" }}>{viewingsCount} upcoming</p>
            </div>
          </button>
          <button
            onClick={() => router.push("/browse/inquiries")}
            className="flex-1 flex items-center gap-3 p-3.5 rounded-2xl ripple-container"
            style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)" }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(59,130,246,0.15)" }}
            >
              <MessageCircle className="w-5 h-5" style={{ color: "#60a5fa" }} />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-white">My Inquiries</p>
              <p className="text-xs" style={{ color: "#a3a3a3" }}>{inquiriesCount} awaiting reply</p>
            </div>
          </button>
        </div>
      </div>

      {/* ====== CATEGORIES ====== */}
      <div className="mt-5" style={{ animation: "slideInUp 0.7s ease" }}>
        <div className="flex gap-2 px-5 overflow-x-auto browse-scroll-hidden pb-2">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`browse-category-chip ${selectedCategory === cat ? "active" : ""}`}
              onClick={() => handleCategorySelect(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ====== FEATURED LISTINGS ====== */}
      <div className="mt-7" style={{ animation: "slideInUp 0.8s ease" }}>
        <div className="flex items-center justify-between px-5 mb-4">
          <h2 className="text-lg font-bold text-white">Featured Listings</h2>
          <button
            onClick={() => router.push("/browse/explore")}
            className="text-xs font-semibold"
            style={{ color: "#047857" }}
          >
            See All
          </button>
        </div>
        {listingsLoading ? (
          <div className="flex gap-4 px-5 overflow-x-auto browse-scroll-hidden pb-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex-shrink-0 rounded-2xl"
                style={{ width: "280px", height: "240px", background: "rgba(255,255,255,0.03)" }}
              />
            ))}
          </div>
        ) : displayFeatured.length === 0 ? (
          <div className="px-5">
            <p className="text-sm" style={{ color: "#525252" }}>
              No featured listings yet. Check back soon!
            </p>
          </div>
        ) : (
          <div className="flex gap-4 px-5 overflow-x-auto browse-scroll-hidden pb-2">
            {displayFeatured.map((listing) => (
              <div
                key={listing.id}
                className="browse-property-card flex-shrink-0"
                style={{ width: "280px" }}
                onClick={() => openPropertyFromListing(listing)}
              >
                <div className="relative">
                  <img
                    src={listing.img}
                    alt={listing.title}
                    className="w-full h-40 object-cover"
                  />
                  {listing.badge && (
                    <div className="absolute top-3 left-3">
                      <span className="browse-featured-badge">{listing.badge}</span>
                    </div>
                  )}
                  <button
                    onClick={(e) => handleFavorite(e, listing.id, { title: listing.title, location: listing.location, price: parseInt(listing.price.replace(/,/g, '')), image: listing.img, landlordId: allListings.find((l) => l.id === listing.listingId)?.landlordId || "" })}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
                  >
                    <Heart
                      className="w-4 h-4"
                      style={{
                        color: favorites.includes(listing.id) ? "#ef4444" : "white",
                        fill: favorites.includes(listing.id) ? "#ef4444" : "transparent",
                      }}
                    />
                  </button>
                  {listing.photos > 0 && (
                    <div className="absolute bottom-3 left-3 flex gap-1.5">
                      <span
                        className="text-xs font-medium px-2 py-1 rounded-lg"
                        style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", color: "white" }}
                      >
                        {listing.photos} Photos
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-white text-sm">{listing.title}</h3>
                  </div>
                  <p className="text-xs mt-1 flex items-center gap-1" style={{ color: "#a3a3a3" }}>
                    <MapPin className="w-3 h-3" />
                    {listing.location}
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    {listing.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs px-2 py-1 rounded-md"
                        style={{ background: "rgba(255,255,255,0.05)", color: "#a3a3a3" }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-base font-bold" style={{ color: "#047857" }}>
                      KSh {listing.price}
                      <span className="text-xs font-normal" style={{ color: "#525252" }}>/mo</span>
                    </p>
                    {listing.verified && (
                      <div className="flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" style={{ color: "#047857" }} />
                        <span className="text-xs font-medium" style={{ color: "#047857" }}>Verified</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ====== POPULAR AREAS ====== */}
      <div className="mt-8" style={{ animation: "slideInUp 0.9s ease" }}>
        <div className="flex items-center justify-between px-5 mb-4">
          <h2 className="text-lg font-bold text-white">Popular Areas</h2>
          <button
            onClick={() => router.push("/browse/explore")}
            className="text-xs font-semibold"
            style={{ color: "#047857" }}
          >
            See All
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 px-5">
          {popularAreas.map((area) => (
            <div
              key={area.name}
              className="browse-area-card ripple-container"
              onClick={() => router.push(`/browse/explore?q=${encodeURIComponent(area.name)}`)}
            >
              <img src={area.img} alt={area.name} />
              <div className="absolute bottom-0 left-0 right-0 p-3" style={{ zIndex: 10 }}>
                <p className="text-sm font-bold text-white">{area.name}</p>
                <p className="text-xs" style={{ color: "#a3a3a3" }}>{area.listings} listings</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ====== RECENTLY VIEWED ====== */}
      <div className="mt-8" style={{ animation: "slideInUp 0.95s ease" }}>
        <div className="flex items-center justify-between px-5 mb-4">
          <h2 className="text-lg font-bold text-white">Recently Viewed</h2>
          <button
            onClick={() => router.push("/browse/explore")}
            className="text-xs font-semibold"
            style={{ color: "#047857" }}
          >
            See All
          </button>
        </div>
        <div className="flex gap-4 px-5 overflow-x-auto browse-scroll-hidden pb-2">
          {displayRecentViews.map((item) => (
            <div
              key={item.id}
              className="browse-property-card flex-shrink-0"
              style={{ width: "220px" }}
              onClick={() => openPropertyFromListing(item)}
            >
              <div className="relative">
                <img src={item.img} alt={item.title} className="w-full h-28 object-cover" />
              </div>
              <div className="p-3">
                <h3 className="font-bold text-white text-xs">{item.title}</h3>
                <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: "#a3a3a3" }}>
                  <MapPin className="w-3 h-3" />
                  {item.location}
                </p>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-sm font-bold" style={{ color: "#047857" }}>
                    KSh {item.price}
                    <span className="text-xs font-normal" style={{ color: "#525252" }}>/mo</span>
                  </p>
                  <span className="text-xs" style={{ color: "#525252" }}>{item.time}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ====== RECENT LISTINGS ====== */}
      <div className="mt-8 px-5 pb-4" style={{ animation: "slideInUp 1.0s ease" }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Recent Listings</h2>
          <button
            onClick={() => router.push("/browse/explore")}
            className="text-xs font-semibold"
            style={{ color: "#047857" }}
          >
            See All
          </button>
        </div>
        {listingsLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-2xl"
                style={{ height: "112px", background: "rgba(255,255,255,0.03)" }}
              />
            ))}
          </div>
        ) : recentListings.length === 0 ? (
          <p className="text-sm" style={{ color: "#525252" }}>
            No recent listings yet. Check back soon!
          </p>
        ) : (
          recentListings.map((listing) => (
            <div
              key={listing.id}
              className="browse-recent-card mb-4 ripple-container"
              onClick={() => openPropertyFromListing(listing)}
            >
              <div className="flex">
                <img
                  src={listing.img}
                  alt={listing.title}
                  className="w-28 h-28 object-cover"
                  style={{ borderRadius: "20px 0 0 20px" }}
                />
                <div className="flex-1 p-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-white text-sm">{listing.title}</h3>
                      <button onClick={(e) => handleFavorite(e, listing.id, { title: listing.title, location: listing.location, price: parseInt(listing.price.replace(/,/g, '')), image: listing.img, landlordId: allListings.find((l) => l.id === listing.listingId)?.landlordId || "" })} className="p-1">
                        <Heart
                          className="w-4 h-4"
                          style={{
                            color: favorites.includes(listing.id) ? "#ef4444" : "#525252",
                            fill: favorites.includes(listing.id) ? "#ef4444" : "transparent",
                          }}
                        />
                      </button>
                    </div>
                    <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: "#a3a3a3" }}>
                      <MapPin className="w-3 h-3" />
                      {listing.location}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold" style={{ color: "#047857" }}>
                      KSh {listing.price}
                      <span className="text-xs font-normal" style={{ color: "#525252" }}>/mo</span>
                    </p>
                    <span
                      className="text-xs px-2 py-0.5 rounded-md"
                      style={{ background: `rgba(4,120,87,0.15)`, color: listing.timeColor }}
                    >
                      {listing.time}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ============================================ */}
      {/* BOTTOM SHEET: LOCATION SELECTOR */}
      {/* ============================================ */}
      <div
        className={`bottom-sheet-overlay ${locationSheetOpen ? "active" : ""}`}
        onClick={() => { closeSheet(() => setLocationSheetOpen(false)); setLocationSheetOpen(false); document.body.style.overflow = ""; }}
      />
      <div className={`bottom-sheet ${locationSheetOpen ? "active" : ""}`}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-2">
          <h3 className="text-lg font-bold text-white mb-1">Select Location</h3>
          <p className="text-xs" style={{ color: "#a3a3a3" }}>Choose your preferred area in Kenya</p>
        </div>
        <div className="px-5 pb-2">
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl" style={{ background: "rgba(255,255,255,0.05)" }}>
            <Search className="w-4 h-4" style={{ color: "#525252" }} />
            <input type="text" placeholder="Search city or estate..." className="bg-transparent outline-none text-sm flex-1" style={{ color: "#e5e5e5" }} />
          </div>
        </div>
        <div className="px-5 pb-2">
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#525252" }}>Popular Cities</p>
        </div>
        <div className="px-3 pb-8">
          {cities.map((city) => (
            <button
              key={city.name}
              onClick={() => handleLocationSelect(`${city.name}, Kenya`)}
              className="w-full flex items-center gap-3 p-3 rounded-xl ripple-container transition-all"
              style={{ background: selectedLocation.startsWith(city.name) ? "rgba(4,120,87,0.1)" : "transparent" }}
            >
              <span className="text-lg">{city.emoji}</span>
              <div className="text-left flex-1">
                <p className="text-sm font-semibold text-white">{city.name}</p>
                <p className="text-xs" style={{ color: "#a3a3a3" }}>{city.listings} listings</p>
              </div>
              {selectedLocation.startsWith(city.name) && <Check className="w-5 h-5" style={{ color: "#047857" }} />}
            </button>
          ))}
        </div>
      </div>

      {/* ============================================ */}
      {/* BOTTOM SHEET: QUICK SEARCH */}
      {/* ============================================ */}
      <div
        className={`bottom-sheet-overlay ${searchSheetOpen ? "active" : ""}`}
        onClick={() => { closeSheet(() => setSearchSheetOpen(false)); setSearchSheetOpen(false); document.body.style.overflow = ""; }}
      />
      <div className={`bottom-sheet ${searchSheetOpen ? "active" : ""}`}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-4">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(4,120,87,0.3)" }}>
            <Search className="w-5 h-5" style={{ color: "#047857" }} />
            <input
              id="browse-search-input"
              type="text"
              placeholder="Search area, property type..."
              className="bg-transparent outline-none text-sm flex-1"
              style={{ color: "#e5e5e5", caretColor: "#047857" }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && searchQuery.trim()) handleSearch(searchQuery.trim()); }}
            />
            {searchQuery && <button onClick={() => setSearchQuery("")} className="p-1"><X className="w-4 h-4" style={{ color: "#525252" }} /></button>}
          </div>
        </div>
        <div className="px-5 pb-3">
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#525252" }}>Trending Searches</p>
          <div className="flex flex-wrap gap-2">
            {trendingSearches.map((term) => (
              <button key={term} onClick={() => handleSearch(term)} className="px-3 py-2 rounded-xl text-xs font-medium ripple-container" style={{ background: "rgba(255,255,255,0.05)", color: "#a3a3a3" }}>{term}</button>
            ))}
          </div>
        </div>
        <div className="px-5 pb-3">
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#525252" }}>Quick Filters</p>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => handleSearch("Under KSh 10,000")} className="p-3 rounded-xl text-left ripple-container" style={{ background: "rgba(255,255,255,0.05)" }}>
              <p className="text-xs font-semibold text-white">Budget</p><p className="text-xs" style={{ color: "#a3a3a3" }}>Under KSh 10k</p>
            </button>
            <button onClick={() => handleSearch("Pet Friendly")} className="p-3 rounded-xl text-left ripple-container" style={{ background: "rgba(255,255,255,0.05)" }}>
              <p className="text-xs font-semibold text-white">Pet Friendly</p><p className="text-xs" style={{ color: "#a3a3a3" }}>Dogs & Cats</p>
            </button>
            <button onClick={() => handleSearch("With Parking")} className="p-3 rounded-xl text-left ripple-container" style={{ background: "rgba(255,255,255,0.05)" }}>
              <p className="text-xs font-semibold text-white">Parking</p><p className="text-xs" style={{ color: "#a3a3a3" }}>Included</p>
            </button>
            <button onClick={() => handleSearch("Furnished")} className="p-3 rounded-xl text-left ripple-container" style={{ background: "rgba(255,255,255,0.05)" }}>
              <p className="text-xs font-semibold text-white">Furnished</p><p className="text-xs" style={{ color: "#a3a3a3" }}>Move-in ready</p>
            </button>
          </div>
        </div>
        <div className="p-5 pb-8">
          <button
            onClick={() => { closeSheet(() => setSearchSheetOpen(false)); setSearchSheetOpen(false); document.body.style.overflow = ""; router.push("/browse/explore"); }}
            className="w-full py-3.5 rounded-xl font-semibold text-sm ripple-container"
            style={{ background: "#047857", color: "white", boxShadow: "0 4px 16px rgba(4,120,87,0.3)" }}
          >
            Advanced Search
          </button>
        </div>
      </div>

      {/* ============================================ */}
      </>
  );
}

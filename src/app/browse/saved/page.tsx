"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Heart,
  MapPin,
  MoreVertical,
  ChevronDown,
  Trash2,
  Eye,
  Share2,
  Edit3,
  GitCompare,
  BellOff,
  Pause,
  Search,
  X,
  TrendingUp,
  Bell,
  Clock,
} from "lucide-react";
import { useBrowse } from "../BrowseContext";
import { useAuth } from "../../AuthContext";
import type { PropertyData } from "../PropertyDetailSheet";
import {
  listenToFavorites,
  listenToSavedSearches,
  toggleFavorite as toggleFavoriteFS,
  type FavoriteData,
  type SavedSearchData,
} from "@/lib/browse";

const sortOptions = [
  { label: "Recently Saved", icon: null },
  { label: "Price: Low to High", icon: "📈" },
  { label: "Price: High to Low", icon: "📉" },
  { label: "Price Drop First", icon: "📊" },
];

const itemMenuItems = [
  { label: "View Details", icon: Eye, color: "#a3a3a3", danger: false },
  { label: "Share Listing", icon: Share2, color: "#a3a3a3", danger: false },
  { label: "Add Note", icon: Edit3, color: "#a3a3a3", danger: false },
  { label: "Compare", icon: GitCompare, color: "#a3a3a3", danger: false },
  { label: "Mute Price Alerts", icon: BellOff, color: "#a3a3a3", danger: false },
];

export default function SavedPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { showSnackbar, openPropertyDetail } = useBrowse();

  // ---- Firestore favorites ----
  const [favoriteListings, setFavoriteListings] = useState<FavoriteData[]>([]);
  const [favoriteSearches, setFavoriteSearches] = useState<SavedSearchData[]>([]);
  const [favLoading, setFavLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setFavLoading(false);
      return;
    }

    const unsub1 = listenToFavorites(
      user.uid,
      (favs) => {
        setFavoriteListings(favs);
        setFavLoading(false);
      },
      () => setFavLoading(false)
    );

    const unsub2 = listenToSavedSearches(
      user.uid,
      (searches) => setFavoriteSearches(searches),
      () => {}
    );

    return () => {
      unsub1();
      unsub2();
    };
  }, [user]);

  // ---- State ----
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState("All (4)");
  const [sheetOpen, setSheetOpen] = useState<"sort" | "item-menu" | "search-alert" | "add-note" | null>(null);
  const [selectedSort, setSelectedSort] = useState("Recently Saved");
  const [searchQuery, setSearchQuery] = useState("");

  // ---- Filtered favorites ----
  const filteredProperties = favoriteListings.filter((p) =>
    (p.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.location || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const hasProperties = favoriteListings.length > 0;
  const totalValue = favoriteListings.reduce((sum, p) => sum + (p.price || 0), 0);

  // ---- Bottom Sheet Helpers ----
  const openSheet = (id: typeof sheetOpen) => {
    setSheetOpen(id);
    document.body.style.overflow = "hidden";
  };
  const closeSheet = () => {
    setSheetOpen(null);
    document.body.style.overflow = "";
  };

  // ---- Select Mode ----
  const toggleSelectMode = () => {
    if (selectMode) {
      setSelectMode(false);
      setSelectedIds(new Set());
    } else {
      setSelectMode(true);
    }
  };

  const toggleCardSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const selectAll = () => {
    const allIds = new Set(favoriteListings.map((p) => p.listingId));
    setSelectedIds(allIds);
  };

  const deleteSelected = async () => {
    if (selectedIds.size === 0) {
      showSnackbar("Select items to delete", "error");
      return;
    }
    if (!user) return;
    // Remove each selected from Firestore
    for (const lid of selectedIds) {
      await toggleFavoriteFS(user.uid, {
        listingId: lid,
        propertyId: "",
        propertyName: "",
        title: "",
        location: "",
        price: 0,
        image: "",
        landlordId: "",
      }, true);
    }
    showSnackbar(`Removed ${selectedIds.size} properties`, "success");
    setSelectedIds(new Set());
    setSelectMode(false);
  };

  // ---- Tracked listing for item menu ----
  const [activeMenuListing, setActiveMenuListing] = useState<FavoriteData | null>(null);

  const openItemMenu = (prop: FavoriteData) => {
    setActiveMenuListing(prop);
    setSheetOpen("item-menu");
  };

  const removeItem = async (listingId: string) => {
    if (!user) return;
    await toggleFavoriteFS(user.uid, {
      listingId,
      propertyId: "",
      propertyName: "",
      title: "",
      location: "",
      price: 0,
      image: "",
      landlordId: "",
    }, true);
    showSnackbar("Removed from saved", "info");
  };

  // ---- Sort ----
  const handleSort = (label: string) => {
    setSelectedSort(label);
    setTimeout(() => {
      closeSheet();
      showSnackbar(`Sorted by: ${label}`, "success");
    }, 200);
  };

  // ---- Item Menu ----
  const handleItemMenu = (label: string) => {
    closeSheet();
    const listing = activeMenuListing;
    switch (label) {
      case "Share Listing":
        if (listing) {
          const shareData = { title: listing.title || "RentKe Listing", text: `Check out ${listing.title || "this property"} on RentKe! KSh ${(listing.price || 0).toLocaleString()}/mo`, url: `https://rentke.com/property/${listing.listingId}` };
          if (navigator.share) {
            navigator.share(shareData).catch(() => {});
          } else {
            navigator.clipboard.writeText(shareData.url).catch(() => {});
            showSnackbar("Link copied to clipboard!", "success");
          }
        }
        break;
      case "Add Note":
        setSheetOpen("add-note");
        break;
      case "Remove from Saved":
        if (listing) removeItem(listing.listingId);
        setActiveMenuListing(null);
        break;
      case "Mute Price Alerts":
        if (listing) {
          const isMuted = mutedAlerts.has(listing.listingId);
          setMutedAlerts(prev => {
            const next = new Set(prev);
            if (isMuted) {
              next.delete(listing.listingId);
            } else {
              next.add(listing.listingId);
            }
            return next;
          });
          showSnackbar(
            isMuted ? `Price alerts for ${listing.title || "this property"} unmuted 🔔` : `Price alerts for ${listing.title || "this property"} muted 🔕`,
            "success"
          );
        }
        break;
      case "Compare":
        showSnackbar("Compare feature will be available soon", "info");
        break;
      default:
        showSnackbar(`Action: ${label}`, "info");
    }
  };

  // ---- Muted Price Alert Listings ----
  const [mutedAlerts, setMutedAlerts] = useState<Set<string>>(new Set());

  // ---- Add Note State ----
  const [noteText, setNoteText] = useState("");

  const handleSaveNote = () => {
    if (noteText.trim()) {
      showSnackbar("Note saved! ✍️", "success");
      setNoteText("");
      closeSheet();
    } else {
      showSnackbar("Please enter a note", "error");
    }
  };

  // ---- Search Alert ----
  const handleSearchAlert = (action: string) => {
    closeSheet();
    if (action === "delete") {
      showSnackbar("Search deleted", "success");
    } else {
      showSnackbar(action === "pause" ? "Search paused" : "Editing search...", "info");
    }
  };

  // ---- Filter chips ----
  const filterChips = [
    `All (${favoriteListings.length})`,
    `Price Drop (${favoriteListings.filter((p) => p.price < 0).length})`,
  ];

  return (
    <div style={{ overflowX: "hidden", width: "100%", maxWidth: "100vw", minHeight: "100dvh", position: "relative" }}>
      <div className="status-bar" />

      {/* Glow */}
      <div style={{ position: "absolute", top: "-100px", right: "-100px", width: "300px", height: "300px", borderRadius: "50%", background: "rgba(4,120,87,0.06)", filter: "blur(120px)", pointerEvents: "none" }} />

      {/* ====== HEADER ====== */}
      <header className="px-5 pt-4 pb-2 flex items-center justify-between" style={{ animation: "slideInUp 0.5s ease" }}>
        <h1 className="text-2xl font-bold text-white">Saved</h1>
        <div className="flex gap-2">
          {favoriteListings.length > 0 && (
            <button
              onClick={toggleSelectMode}
              className="px-4 py-2 rounded-xl text-sm font-semibold ripple-container"
              style={{ background: selectMode ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.05)", color: selectMode ? "#ef4444" : "#a3a3a3" }}
            >
              {selectMode ? "Cancel" : "Select"}
            </button>
          )}
        </div>
      </header>

      {/* ====== SEARCH WITHIN SAVED ====== */}
      {favoriteListings.length > 0 && (
        <div className="px-5 mt-2" style={{ animation: "slideInUp 0.55s ease" }}>
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.05)" }}>
            <Search className="w-4 h-4" style={{ color: "#525252" }} />
            <input
              type="text"
              placeholder="Search saved properties..."
              className="bg-transparent outline-none text-sm flex-1"
              style={{ color: "#e5e5e5", caretColor: "#047857" }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && <button onClick={() => setSearchQuery("")} className="p-1"><X className="w-4 h-4" style={{ color: "#525252" }} /></button>}
          </div>
        </div>
      )}

      {/* ====== SAVED SEARCHES ====== */}
      {!selectMode && favoriteSearches.length > 0 && (
        <div className="mt-4" style={{ animation: "slideInUp 0.6s ease" }}>
          <div className="flex items-center justify-between px-5 mb-3">
            <h2 className="text-base font-bold text-white">Saved Searches</h2>
          </div>
          <div className="flex gap-3 px-5 overflow-x-auto browse-scroll-hidden pb-2">
            {favoriteSearches.map((s) => (
              <div key={s.id} className="saved-search-card ripple-container" onClick={() => openSheet("search-alert")}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg">{s.emoji}</span>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: s.active ? "rgba(4,120,87,0.15)" : "rgba(234,179,8,0.15)" }}>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: s.active ? "#047857" : "#eab308" }} />
                    <span className="text-xs font-semibold" style={{ color: s.active ? "#34d399" : "#eab308" }}>
                      {s.active ? "Active" : "Paused"}
                    </span>
                  </div>
                </div>
                <h3 className="text-sm font-bold text-white">{s.title}</h3>
                <p className="text-xs mt-2 font-semibold" style={{ color: "#525252" }}>
                  No new matches yet
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ====== STATS SUMMARY ====== */}
      {!selectMode && hasProperties && (
        <div className="mx-5 mt-5 p-4 rounded-2xl flex items-center justify-between" style={{ background: "rgba(4,120,87,0.06)", border: "1px solid rgba(4,120,87,0.15)", animation: "slideInUp 0.65s ease" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(4,120,87,0.15)" }}>
              <TrendingUp className="w-5 h-5" style={{ color: "#34d399" }} />
            </div>
            <div>
              <p className="text-xs" style={{ color: "#a3a3a3" }}>Total Value</p>
              <p className="text-sm font-bold text-white">KSh {totalValue.toLocaleString()}/mo</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs" style={{ color: "#a3a3a3" }}>Saved</p>
            <p className="text-sm font-bold" style={{ color: "#047857" }}>{favoriteListings.length} properties</p>
          </div>
        </div>
      )}

      {/* ====== FILTERS ====== */}
      {hasProperties && (
        <div className="flex gap-2 px-5 mt-4 overflow-x-auto browse-scroll-hidden pb-2" style={{ animation: "slideInUp 0.7s ease" }}>
          {filterChips.map((chip) => (
            <button
              key={chip}
              className={`filter-chip ${activeFilter === chip ? "active" : ""}`}
              onClick={() => { setActiveFilter(chip); showSnackbar(`Filter: ${chip}`, "info"); }}
            >
              {chip}
            </button>
          ))}
          <button className="filter-chip" onClick={() => openSheet("sort")}>
            <span>Sort</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ====== SAVED PROPERTIES LIST ====== */}
      {favLoading ? (
        <div className="px-5 mt-4 space-y-4 pb-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl" style={{ height: "112px", background: "rgba(255,255,255,0.03)" }} />
          ))}
        </div>
      ) : favoriteListings.length === 0 ? (
        /* ====== EMPTY STATE ====== */
        <div className="flex flex-col items-center justify-center text-center px-6 pt-20 pb-20">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ background: "rgba(255,255,255,0.05)" }}>
            <Heart className="w-10 h-10" style={{ color: "#525252" }} fill="transparent" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">No Saved Properties</h2>
          <p className="text-sm leading-relaxed" style={{ color: "#525252" }}>
            Tap the heart icon on any listing to save it here for easy access later.
          </p>
          <button onClick={() => router.push("/browse/explore")} className="mt-6 px-6 py-3 rounded-xl font-semibold text-sm text-white ripple-container" style={{ background: "#047857" }}>
            Explore Listings
          </button>
        </div>
      ) : filteredProperties.length === 0 ? (
        /* ====== SEARCH EMPTY STATE ====== */
        <div className="flex flex-col items-center justify-center text-center px-6 pt-10 pb-10">
          <Search className="w-10 h-10 mb-4" style={{ color: "#525252" }} />
          <h3 className="text-base font-bold text-white mb-1">No results found</h3>
          <p className="text-sm" style={{ color: "#525252" }}>Try a different search term</p>
        </div>
      ) : (
        <div id="property-list" className="px-5 mt-4 space-y-4 pb-4" style={{ animation: "slideInUp 0.8s ease" }}>
          {filteredProperties.map((prop) => {
            const isSelected = selectedIds.has(prop.listingId);
            return (
              <div
                key={prop.listingId}
                className={`browse-property-card saved-card ${isSelected ? "selected-card" : ""}`}
                data-id={prop.listingId}
                onClick={() => {
                  if (selectMode) {
                    toggleCardSelect(prop.listingId);
                  } else {
                    const propData: PropertyData = {
                      id: parseInt(prop.listingId, 10) || 0,
                      title: prop.title || prop.propertyName || "Untitled",
                      location: prop.location || "Nairobi, Kenya",
                      price: (prop.price || 0).toLocaleString(),
                      image: prop.image || "https://picsum.photos/seed/prop-detail1/800/640.jpg",
                      gallery: [
                        prop.image || "https://picsum.photos/seed/prop-detail1/800/640.jpg",
                        "https://picsum.photos/seed/prop-detail2/800/640.jpg",
                        "https://picsum.photos/seed/prop-detail3/800/640.jpg",
                        "https://picsum.photos/seed/prop-detail4/800/640.jpg",
                        "https://picsum.photos/seed/prop-detail5/800/640.jpg",
                      ],
                      verified: true,
                      featured: true,
                      type: "Bedsitter",
                      bathrooms: 1,
                      size: "20 sqm",
                      floor: "3rd",
                      description: `Modern ${prop.title?.toLowerCase() || "unit"} located in ${prop.location || "Nairobi"}. Features include a well-finished interior with ample natural light, secure compound with CCTV, and 24-hour guard.`,
                      amenities: [
                        { emoji: "💧", label: "Borehole / 24hr Water" },
                        { emoji: "⚡", label: "Token Meter" },
                        { emoji: "🚿", label: "Hot Shower" },
                        { emoji: "🔒", label: "CCTV & Guard" },
                        { emoji: "🅿️", label: "Free Parking" },
                        { emoji: "📶", label: "WiFi Ready" },
                      ],
                      costBreakdown: [
                        { label: "Monthly Rent", amount: `KSh ${(prop.price || 0).toLocaleString()}` },
                        { label: "Deposit (1 month)", amount: `KSh ${(prop.price || 0).toLocaleString()}` },
                        { label: "Service Charge", amount: "KSh 2,000" },
                      ],
                      totalMoveIn: `KSh ${((prop.price || 0) * 2 + 2000).toLocaleString()}`,
                      landlord: {
                        name: "John Mwangi",
                        initial: "J",
                        verified: true,
                        response: "~1 hour",
                        rating: 5,
                        reviews: 42,
                      },
                      landlordId: prop.landlordId || "",
                      photos: 5,
                      isFavorited: true,
                    };
                    openPropertyDetail(propData);
                  }
                }}
                style={{ cursor: "pointer" }}
              >
                <div className="flex">
                  <div className="relative w-28 h-28 flex-shrink-0">
                    <img
                      src={prop.image || "https://picsum.photos/seed/saved-placeholder/300/300.jpg"}
                      alt={prop.title}
                      className="w-full h-full object-cover"
                      style={{ borderRadius: "20px 0 0 20px" }}
                    />
                    {selectMode && (
                      <div className="absolute top-2 right-2" onClick={(e) => { e.stopPropagation(); toggleCardSelect(prop.listingId); }}>
                        <div className={`custom-check ${isSelected ? "checked" : ""}`}>
                          {isSelected && (
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 p-3.5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-white text-sm pr-2">{prop.title || prop.propertyName}</h3>
                        <button onClick={(e) => { e.stopPropagation(); removeItem(prop.listingId); }} className="p-1 flex-shrink-0">
                          <Heart className="w-4 h-4" style={{ color: "#ef4444", fill: "#ef4444" }} />
                        </button>
                      </div>
                      <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: "#a3a3a3" }}>
                        <MapPin className="w-3 h-3" />
                        {prop.location}
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold" style={{ color: "#047857" }}>
                        KSh {(prop.price || 0).toLocaleString()}
                        <span className="text-xs font-normal" style={{ color: "#525252" }}>/mo</span>
                      </p>
                      {!selectMode && (
                        <button onClick={(e) => { e.stopPropagation(); openItemMenu(prop); }} className="p-1">
                          <MoreVertical className="w-4 h-4" style={{ color: "#525252" }} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ====== SELECTION ACTION BAR ====== */}
      <div className={`select-bar ${selectMode ? "active" : ""}`} style={{ zIndex: 51 }}>
        <button onClick={selectAll} className="text-sm font-semibold" style={{ color: "#047857" }}>Select All</button>
        <div className="flex gap-3">
          <button onClick={() => { setSelectedIds(new Set()); setSelectMode(false); showSnackbar("Selection cleared", "info"); }} className="flex items-center gap-2 px-4 py-2.5 rounded-xl ripple-container" style={{ background: "rgba(255,255,255,0.05)" }}>
            <X className="w-4 h-4" style={{ color: "#a3a3a3" }} />
            <span className="text-sm font-semibold" style={{ color: "#a3a3a3" }}>Clear All</span>
          </button>
          <button onClick={deleteSelected} className="flex items-center gap-2 px-4 py-2.5 rounded-xl ripple-container" style={{ background: "rgba(239,68,68,0.1)" }}>
            <Trash2 className="w-4 h-4" style={{ color: "#ef4444" }} />
            <span className="text-sm font-semibold" style={{ color: "#ef4444" }}>Delete ({selectedIds.size})</span>
          </button>
        </div>
      </div>

      {/* ============================================ */}
      {/* BOTTOM SHEETS (unchanged from original) */}
      {/* ============================================ */}

      {/* Sort */}
      <div className={`bottom-sheet-overlay ${sheetOpen === "sort" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${sheetOpen === "sort" ? "active" : ""}`}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-3"><h3 className="text-lg font-bold text-white">Sort By</h3></div>
        <div className="px-3 pb-8 space-y-1">
          {sortOptions.map((opt) => (
            <div key={opt.label} className="flex items-center gap-3 p-3 rounded-xl ripple-container" onClick={() => handleSort(opt.label)} style={{ cursor: "pointer" }}>
              <div className={`custom-check ${selectedSort === opt.label ? "checked" : ""}`}>
                {selectedSort === opt.label && (
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                )}
              </div>
              <p className="text-sm font-medium text-white flex-1">{opt.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Item Menu */}
      <div className={`bottom-sheet-overlay ${sheetOpen === "item-menu" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${sheetOpen === "item-menu" ? "active" : ""}`}>
        <div className="bottom-sheet-handle" />
        <div className="p-3 pb-8">
          {itemMenuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.label} onClick={() => handleItemMenu(item.label)} className="w-full flex items-center gap-4 p-3 rounded-xl ripple-container">
                <Icon className="w-5 h-5" style={{ color: item.color }} />
                <span className="text-sm font-medium text-white">{item.label}</span>
              </button>
            );
          })}
          <div style={{ height: "1px", background: "rgba(255,255,255,0.08)", margin: "8px 12px" }} />
          <button onClick={() => handleItemMenu("Remove from Saved")} className="w-full flex items-center gap-4 p-3 rounded-xl ripple-container">
            <Trash2 className="w-5 h-5" style={{ color: "#ef4444" }} />
            <span className="text-sm font-medium" style={{ color: "#ef4444" }}>Remove from Saved</span>
          </button>
        </div>
      </div>

      {/* Search Alert Settings */}
      <div className={`bottom-sheet-overlay ${sheetOpen === "search-alert" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${sheetOpen === "search-alert" ? "active" : ""}`}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-3">
          <h3 className="text-lg font-bold text-white mb-1">Saved Search</h3>
          <p className="text-xs" style={{ color: "#525252" }}>Manage your saved search preferences</p>
        </div>
        <div className="px-3 pb-8 space-y-1">
          <button onClick={() => handleSearchAlert("pause")} className="w-full flex items-center gap-4 p-3 rounded-xl ripple-container">
            <Pause className="w-5 h-5" style={{ color: "#eab308" }} />
            <span className="text-sm font-medium text-white">Pause Alerts</span>
          </button>
          <button onClick={() => handleSearchAlert("delete")} className="w-full flex items-center gap-4 p-3 rounded-xl ripple-container">
            <Trash2 className="w-5 h-5" style={{ color: "#ef4444" }} />
            <span className="text-sm font-medium" style={{ color: "#ef4444" }}>Delete Saved Search</span>
          </button>
        </div>
      </div>

      {/* Add Note Sheet */}
      <div className={`bottom-sheet-overlay ${sheetOpen === "add-note" ? "active" : ""}`} onClick={() => { closeSheet(); setNoteText(""); }} />
      <div className={`bottom-sheet ${sheetOpen === "add-note" ? "active" : ""}`}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-3">
          <h3 className="text-lg font-bold text-white mb-1">Add Note</h3>
          <p className="text-xs" style={{ color: "#525252" }}>Save a private note about this property</p>
        </div>
        <div className="px-5 pb-8">
          <textarea
            className="android-input"
            style={{ minHeight: "100px", borderRadius: "14px" }}
            placeholder="e.g., Close to my office, need to schedule viewing..."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
          />
          <div className="flex gap-3 mt-4">
            <button onClick={() => { closeSheet(); setNoteText(""); }} className="flex-1 py-3 rounded-xl text-sm font-semibold" style={{ background: "rgba(255,255,255,0.05)", color: "#a3a3a3" }}>Cancel</button>
            <button onClick={handleSaveNote} className="flex-1 py-3 rounded-xl text-sm font-semibold text-white ripple-container" style={{ background: "#047857" }}>Save Note</button>
          </div>
        </div>
      </div>
    </div>
  );
}

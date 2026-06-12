"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import AppBar from "@/app/components/AppBar";
import {
  Search,
  SlidersHorizontal,
  X,
  MapPin,
  Star,
  Flag,
  AlertTriangle,
  CheckCircle,
  Image as ImageIcon,
  Trash2,
  EyeOff,
  Eye,
  Check,
  Info,
  XCircle,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Users,
  Building2,
  Wallet,
  LayoutDashboard,
  Settings,
} from "lucide-react";
import { listenToAllListings, approveListing, rejectListing, flagListing as flagListingFS, boostListingAdmin, clearListingFlags, deleteListingAdmin } from "@/lib/admin";
import type { ListingData as FirestoreListing } from "@/lib/listings";

// ─── Types ───────────────────────────────────────────────────────────────────
type SnackbarType = "success" | "error" | "info";
type PageKey = "dashboard" | "landlords" | "listings" | "wallet" | "settings";
type SheetKey =
  | "filter"
  | "detail"
  | "reject"
  | "feature"
  | "flag"
  | "gallery"
  | "action"
  | "remove"
  | "landlord-info";
type ListingStatus = "active" | "pending" | "rejected" | "expired" | "flagged";

interface ListingData {
  title: string;
  price: string;
  location: string;
  status: ListingStatus;
  featured: boolean;
  beds: string;
  baths: string;
  sqft: string;
  type: string;
  landlord: string;
  llInit: string;
  llColor: string;
  llPhone: string;
  images: string[];
  amenities: string[];
  desc: string;
  views: number;
  inquiries: number;
  viewings: number;
}

interface SnackbarState {
  message: string;
  type: SnackbarType;
  visible: boolean;
}

// ─── Data ────────────────────────────────────────────────────────────────────


const FILTER_OPTIONS = ["all", "pending", "active", "flagged", "expired", "rejected", "featured"] as const;

const REJECT_REASONS = ["Incomplete information", "Misleading photos", "Suspicious pricing", "Duplicate listing", "Violates terms", "Wrong category"];

const REMOVE_REASONS = ["Spam", "Scam", "Duplicate", "Terms violation"];

const BOOST_OPTIONS = [
  { days: "7", label: "7 Days Boost", desc: "Top of search results for 7 days", price: "KSh 1,500" },
  { days: "14", label: "14 Days Boost", desc: "Featured banner + top placement", price: "KSh 2,500" },
  { days: "30", label: "30 Days Boost", desc: "Maximum visibility + homepage feature", price: "KSh 4,000" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  active: "#059669", pending: "#eab308", flagged: "#a855f7", expired: "#9ca3af", rejected: "#ef4444",
};

function statusLabel(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function AdminListings() {
  const router = useRouter();
  // ── State ──
  const [activePage] = useState<PageKey>("listings");
  const [activeSheet, setActiveSheet] = useState<SheetKey | null>(null);
  const [snackbar, setSnackbar] = useState<SnackbarState>({ message: "", type: "info", visible: false });
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentFilter, setCurrentFilter] = useState<string>("all");
  const [filterActive, setFilterActive] = useState(false);

  // Detail
  const [currentIdx, setCurrentIdx] = useState(0);

  // Reject
  const [selectedRejectReason, setSelectedRejectReason] = useState("");
  const [rejectNotify, setRejectNotify] = useState(true);
  const [rejectNote, setRejectNote] = useState("");

  // Feature/Boost
  const [selectedBoostDuration, setSelectedBoostDuration] = useState("7");
  const [boostPaymentSource, setBoostPaymentSource] = useState<"landlord" | "platform">("landlord");
  const [boostSending, setBoostSending] = useState(false);

  // Remove
  const [selectedRemoveReason, setSelectedRemoveReason] = useState("");

  // Gallery
  const [galleryIndex, setGalleryIndex] = useState(0);

  const snackbarTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  // ── Firestore data ──
  const [firestoreListings, setFirestoreListings] = useState<FirestoreListing[]>([]);
  const [listingsLoading, setListingsLoading] = useState(true);

  useEffect(() => {
    const unsub = listenToAllListings(
      (fetched) => {
        setFirestoreListings(fetched);
        setListingsLoading(false);
      },
      () => { setListingsLoading(false); }
    );
    return () => unsub();
  }, []);

  // Map Firestore listings to admin display format
  const listings: ListingData[] = firestoreListings.map((l, i) => ({
    title: l.title || l.propertyName || "Untitled",
    price: `KSh ${(l.rent || 0).toLocaleString()}`,
    location: l.propertyName || "Unknown",
    status: (l.status === "active" ? "active" : l.boosted ? "active" : l.status === "draft" ? "pending" : "expired") as ListingStatus,
    featured: l.boosted || false,
    beds: "—",
    baths: "1",
    sqft: "—",
    type: "Unit",
    landlord: l.landlordId || "Unknown",
    llInit: (l.landlordId?.[0]?.toUpperCase() || "U") + (l.landlordId?.[1]?.toUpperCase() || ""),
    llColor: "#047857",
    llPhone: "",
    images: l.images?.length > 0 ? l.images : ["https://picsum.photos/seed/admin-placeholder/400/200.jpg"],
    amenities: l.amenities || [],
    desc: l.description || "No description",
    views: l.views || 0,
    inquiries: l.inquiries || 0,
    viewings: 0,
  }));

  // Use combined data
  const hasData = firestoreListings.length > 0;

  const currentListing = listings[currentIdx];

  // ── Snackbar ──
  const showSnackbar = useCallback((message: string, type: SnackbarType = "info") => {
    clearTimeout(snackbarTimeout.current);
    setSnackbar({ message, type, visible: true });
    snackbarTimeout.current = setTimeout(() => {
      setSnackbar((s) => ({ ...s, visible: false }));
    }, 3500);
  }, []);

  const openSheet = useCallback((key: SheetKey) => setActiveSheet(key), []);
  const closeSheet = useCallback(() => setActiveSheet(null), []);

  // ── Ripple effect ──
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const container = (e.target as HTMLElement).closest('.ripple-container') as HTMLElement | null;
      if (!container) return;
      const ripple = document.createElement("span");
      ripple.className = "ripple";
      const rect = container.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      ripple.style.width = ripple.style.height = size + "px";
      ripple.style.left = e.clientX - rect.left - size / 2 + "px";
      ripple.style.top = e.clientY - rect.top - size / 2 + "px";
      container.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  // ── Filtering ──
  const filteredListings = listings.filter((l) => {
    const q = searchQuery.toLowerCase();
    if (q && !l.title.toLowerCase().includes(q) && !l.landlord.toLowerCase().includes(q) && !l.location.toLowerCase().includes(q)) {
      return false;
    }
    if (currentFilter === "pending" && l.status !== "pending") return false;
    if (currentFilter === "active" && l.status !== "active") return false;
    if (currentFilter === "flagged" && l.status !== "flagged") return false;
    if (currentFilter === "expired" && l.status !== "expired") return false;
    if (currentFilter === "rejected" && l.status !== "rejected") return false;
    if (currentFilter === "featured" && !l.featured) return false;
    return true;
  });

  // ── Handlers ──

  const handleSetFilter = useCallback((f: string) => {
    setCurrentFilter(f);
    if (f === "all") setFilterActive(false);
    else setFilterActive(true);
  }, []);

  const toggleSearch = useCallback(() => {
    setSearchOpen((s) => !s);
    if (searchOpen) setSearchQuery("");
  }, [searchOpen]);

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setSearchOpen(false);
  }, []);

  // Detail
  const openListingDetail = useCallback((idx: number) => {
    setCurrentIdx(idx);
    openSheet("detail");
  }, [openSheet]);

  // Approve
  const handleApprove = useCallback((idx: number) => {
    const name = listings[idx].title;
    const fsId = firestoreListings[idx]?.id;
    if (fsId) {
      approveListing(fsId).catch(() => {});
    }
    showSnackbar(`✅ "${name}" approved & now live`, "success");
  }, [listings, firestoreListings, showSnackbar]);

  // Reject
  const handleOpenReject = useCallback((idx: number) => {
    setCurrentIdx(idx);
    setSelectedRejectReason("");
    openSheet("reject");
  }, [openSheet]);

  const handleConfirmReject = useCallback(() => {
    const name = listings[currentIdx].title;
    const fsId = firestoreListings[currentIdx]?.id;
    if (fsId && selectedRejectReason) {
      rejectListing(fsId, selectedRejectReason).catch(() => {});
    }
    closeSheet();
    setTimeout(() => showSnackbar(`❌ "${name}" rejected: ${selectedRejectReason}`, "error"), 300);
  }, [currentIdx, listings, firestoreListings, selectedRejectReason, closeSheet, showSnackbar]);

  // Feature/Boost
  const handleOpenFeature = useCallback((idx: number) => {
    setCurrentIdx(idx);
    setSelectedBoostDuration("7");
    setBoostPaymentSource("landlord");
    openSheet("feature");
  }, [openSheet]);

  const handleConfirmFeature = useCallback(() => {
    const name = listings[currentIdx].title;
    const fsId = firestoreListings[currentIdx]?.id;
    setBoostSending(true);
    setTimeout(() => {
      if (fsId) {
        boostListingAdmin(fsId, parseInt(selectedBoostDuration)).catch(() => {});
      }
      setBoostSending(false);
      closeSheet();
      setTimeout(() => showSnackbar(`⭐ "${name}" now featured for ${selectedBoostDuration} days`, "success"), 300);
    }, 1500);
  }, [currentIdx, listings, firestoreListings, selectedBoostDuration, closeSheet, showSnackbar]);

  // Flag Action
  const handleOpenFlagAction = useCallback((idx: number) => {
    setCurrentIdx(idx);
    openSheet("flag");
  }, [openSheet]);

  const handleClearFlag = useCallback(() => {
    const fsId = firestoreListings[currentIdx]?.id;
    if (fsId) {
      clearListingFlags(fsId).catch(() => {});
    }
    closeSheet();
    showSnackbar("✅ Flags cleared — listing is now active", "success");
  }, [currentIdx, firestoreListings, closeSheet, showSnackbar]);

  // Remove
  const handleOpenRemove = useCallback(() => {
    setSelectedRemoveReason("");
    openSheet("remove");
  }, [openSheet]);

  const handleConfirmRemove = useCallback(() => {
    const name = listings[currentIdx].title;
    const fsId = firestoreListings[currentIdx]?.id;
    if (fsId) {
      deleteListingAdmin(fsId).catch(() => {});
    }
    closeSheet();
    setTimeout(() => showSnackbar(`🗑️ "${name}" removed: ${selectedRemoveReason}`, "error"), 300);
  }, [currentIdx, listings, firestoreListings, selectedRemoveReason, closeSheet, showSnackbar]);

  // Renew
  const handleRenew = useCallback((idx: number) => {
    const name = listings[idx].title;
    const fsId = firestoreListings[idx]?.id;
    if (fsId) {
      approveListing(fsId).catch(() => {});
    }
    showSnackbar(`🔄 "${name}" renewed & now active`, "success");
  }, [listings, firestoreListings, showSnackbar]);

  // Flag listing (from action sheet)
  const handleFlagListing = useCallback(() => {
    const name = listings[currentIdx].title;
    const fsId = firestoreListings[currentIdx]?.id;
    if (fsId) {
      flagListingFS(fsId).catch(() => {});
    }
    closeSheet();
    showSnackbar(`🚩 "${name}" flagged for review`, "info");
  }, [currentIdx, listings, firestoreListings, closeSheet, showSnackbar]);

  // Gallery
  const handleOpenGallery = useCallback((idx: number) => {
    setCurrentIdx(idx);
    setGalleryIndex(0);
    openSheet("gallery");
  }, [openSheet]);

  const nextImage = useCallback(() => {
    const imgs = listings[currentIdx].images;
    setGalleryIndex((g) => (g + 1) % imgs.length);
  }, [currentIdx, listings]);

  const prevImage = useCallback(() => {
    const imgs = listings[currentIdx].images;
    setGalleryIndex((g) => (g - 1 + imgs.length) % imgs.length);
  }, [currentIdx, listings]);

  // Action sheet
  const handleOpenAction = useCallback((idx: number) => {
    setCurrentIdx(idx);
    openSheet("action");
  }, [openSheet]);

  // Nav
  const navItems: { key: PageKey; icon: React.ElementType; label: string; snackbar?: string }[] = [
    { key: "dashboard", icon: LayoutDashboard, label: "Home", snackbar: "Dashboard" },
    { key: "landlords", icon: Users, label: "Landlords", snackbar: "Landlords page" },
    { key: "listings", icon: Building2, label: "Listings" },
    { key: "wallet", icon: Wallet, label: "Wallet" },
    { key: "settings", icon: Settings, label: "Settings" },
  ];

  // Stats
  const activeCount = listings.filter((l) => l.status === "active").length;
  const pendingCount = listings.filter((l) => l.status === "pending").length;
  const flaggedCount = listings.filter((l) => l.status === "flagged").length;
  const expiredCount = listings.filter((l) => l.status === "expired").length;

  return (
    <div className="admin-portal" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
      {/* Status Bar */}
      <div
        className="fixed top-0 left-0 right-0 z-60"
        style={{ height: "env(safe-area-inset-top, 24px)", minHeight: "24px", background: "rgba(5,5,5,0.9)", backdropFilter: "blur(20px)" }}
      />

      <div style={{ paddingBottom: "80px" }}>
        {/* TOP APP BAR */}
        <AppBar
          title="Listings"
          subtitle={`${listings.length} total · ${pendingCount} pending`}
          backHref="/admin"
          actions={[
            { icon: Search, onClick: toggleSearch },
            { icon: SlidersHorizontal, onClick: () => openSheet("filter"), active: filterActive, dot: filterActive, dotColor: "#059669" },
          ]}
        />

        {/* SEARCH BAR */}
        {searchOpen && (
          <div className="px-5" style={{ animation: "slideInUp 0.3s ease" }}>
            <div className="search-bar mb-3">
              <Search className="w-5 h-5 flex-shrink-0" style={{ color: "#525252" }} />
              <input type="text" placeholder="Search listings, landlords, locations..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} autoFocus />
              {searchQuery && <button onClick={clearSearch}><X className="w-5 h-5" style={{ color: "#525252" }} /></button>}
            </div>
          </div>
        )}

        {/* STATS BAR */}
        <div className="px-5 mb-4">
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {[
              { key: "active", count: activeCount, label: "Active", color: "#059669", bg: "rgba(4,120,87", border: "rgba(4,120,87" },
              { key: "pending", count: pendingCount, label: "Pending", color: "#eab308", bg: "rgba(234,179,8", border: "rgba(234,179,8" },
              { key: "flagged", count: flaggedCount, label: "Flagged", color: "#a855f7", bg: "rgba(168,85,247", border: "rgba(168,85,247" },
              { key: "expired", count: expiredCount, label: "Expired", color: "#9ca3af", bg: "rgba(107,114,128", border: "rgba(107,114,128" },
            ].map((s) => (
              <div key={s.label} onClick={() => handleSetFilter(s.key)}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl flex-shrink-0"
                style={{ background: currentFilter === s.key ? `${s.bg},0.15)` : `${s.bg},0.1)`, border: `1.5px solid ${currentFilter === s.key ? `${s.border},0.3)` : `${s.border},0.15)`}`, cursor: "pointer", transition: "all 0.2s ease" }}>
                <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                <span className="text-xs font-semibold" style={{ color: s.color }}>{s.count} {s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* FILTER CHIPS */}
        <div className="px-5 mb-4">
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {FILTER_OPTIONS.map((f) => (
              <button key={f} onClick={() => handleSetFilter(f)} className={`filter-chip ${currentFilter === f ? "active" : ""}`}>
                {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* LISTING CARDS */}
        <div className="px-5 space-y-4">
          {filteredListings.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: "rgba(255,255,255,0.05)" }}>
                <Search className="w-8 h-8" style={{ color: "#525252" }} />
              </div>
              <h3 className="text-base font-semibold text-white">No listings found</h3>
              <p className="text-sm mt-1" style={{ color: "#525252" }}>Try adjusting your search or filters</p>
            </div>
          )}
          {filteredListings.map((l, i) => {
            const origIdx = listings.findIndex((o) => o.title === l.title);
            const statusColor = STATUS_COLORS[l.status] || "#9ca3af";
            return (
              <div key={l.title} className="listing-card" onClick={() => openListingDetail(origIdx)}>
                {/* Image */}
                <div className="relative">
                  <img src={l.images[0]} className="w-full h-40 object-cover" alt="" style={l.status === "flagged" ? { filter: "brightness(0.7)" } : l.status === "expired" || l.status === "rejected" ? { filter: "grayscale(0.5) brightness(0.6)" } : undefined} />
                  <div className="absolute top-3 left-3 flex gap-1.5">
                    <span className={`status-badge status-${l.status}`}>
                      {l.status === "flagged" && <Flag className="w-3 h-3" />}
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor }} />
                      {statusLabel(l.status)}
                    </span>
                    {l.featured && <span className="status-badge status-featured"><Star className="w-3 h-3" /> Featured</span>}
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); handleOpenGallery(origIdx); }} className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
                    <ImageIcon className="w-4 h-4 text-white" />
                  </button>
                  <div className="absolute bottom-2 right-3 text-xs font-medium px-2 py-0.5 rounded-md" style={{ background: "rgba(0,0,0,0.6)", color: "white" }}>{l.images.length} photos</div>
                </div>
                {/* Details */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-1">
                    <h4 className="text-sm font-semibold text-white flex-1 pr-2">{l.title}</h4>
                    <span className="text-sm font-bold" style={{ color: l.status === "flagged" ? "#ef4444" : "#059669" }}>{l.price}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <MapPin className="w-3 h-3" style={{ color: "#525252" }} />
                    <span className="text-xs" style={{ color: "#525252" }}>{l.location}</span>
                  </div>
                  {l.beds !== "—" ? (
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-xs" style={{ color: "#525252" }}><span className="font-semibold text-white">{l.beds}</span> Bed</span>
                      <span className="text-xs" style={{ color: "#525252" }}><span className="font-semibold text-white">{l.baths}</span> Bath</span>
                      <span className="text-xs" style={{ color: "#525252" }}><span className="font-semibold text-white">{l.sqft}</span> sqft</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-xs" style={{ color: "#525252" }}>{l.type === "Bed" ? "Bedsitter" : l.type}</span>
                      <span className="text-xs" style={{ color: "#525252" }}><span className="font-semibold text-white">{l.baths}</span> Bath</span>
                      <span className="text-xs" style={{ color: "#525252" }}><span className="font-semibold text-white">{l.sqft}</span> sqft</span>
                    </div>
                  )}
                  {/* Flagged warning */}
                  {l.status === "flagged" && (
                    <div className="flex items-center gap-2 mb-2 p-2 rounded-lg" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.12)" }}>
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#ef4444" }} />
                      <span className="text-xs" style={{ color: "#ef4444" }}>3 scam reports · Suspicious pricing</span>
                    </div>
                  )}
                  {/* Rejected reason */}
                  {l.status === "rejected" && (
                    <div className="flex items-center gap-2 mb-2 p-2 rounded-lg" style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.08)" }}>
                      <Info className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#ef4444" }} />
                      <span className="text-xs" style={{ color: "#a3a3a3" }}>Reason: Incomplete information</span>
                    </div>
                  )}
                  {/* Landlord */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: `linear-gradient(135deg, ${l.llColor}, ${l.llColor}dd)`, color: "white" }}>{l.llInit}</div>
                      <span className="text-xs" style={{ color: "#a3a3a3" }}>{l.landlord}</span>
                    </div>
                    <span className="text-xs" style={{ color: "#525252" }}>
                      {l.status === "expired" ? "Expired 3 days ago" : l.status === "rejected" ? "Rejected 2 days ago" : l.status === "active" ? "3 days ago" : l.status === "flagged" ? "1 day ago" : "5h ago"}
                    </span>
                  </div>
                  {/* Actions */}
                  <div className="flex gap-2 mt-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                    {(l.status === "pending" || l.status === "rejected") && (
                      <>
                        {l.status === "rejected" ? (
                          <button onClick={(e) => { e.stopPropagation(); handleApprove(origIdx); }} className="flex-1 text-center text-xs font-semibold py-2.5 rounded-xl ripple-container" style={{ background: "rgba(4,120,87,0.15)", color: "#059669" }}>Re-approve</button>
                        ) : (
                          <button onClick={(e) => { e.stopPropagation(); handleApprove(origIdx); }} className="flex-1 text-center text-xs font-semibold py-2.5 rounded-xl ripple-container" style={{ background: "rgba(4,120,87,0.15)", color: "#059669" }}>Approve</button>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); handleOpenReject(origIdx); }} className="flex-1 text-center text-xs font-semibold py-2.5 rounded-xl" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>Reject</button>
                      </>
                    )}
                    {l.status === "active" && (
                      <button onClick={(e) => { e.stopPropagation(); handleOpenFeature(origIdx); }} className="flex-1 text-center text-xs font-semibold py-2.5 rounded-xl" style={{ background: "rgba(234,179,8,0.1)", color: "#eab308" }}>Manage Boost</button>
                    )}
                    {l.status === "flagged" && (
                      <button onClick={(e) => { e.stopPropagation(); handleOpenFlagAction(origIdx); }} className="flex-1 text-center text-xs font-semibold py-2.5 rounded-xl" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>Take Action</button>
                    )}
                    {l.status === "expired" && (
                      <button onClick={(e) => { e.stopPropagation(); handleRenew(origIdx); }} className="flex-1 text-center text-xs font-semibold py-2.5 rounded-xl" style={{ background: "rgba(4,120,87,0.15)", color: "#059669" }}>Renew</button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); handleOpenAction(origIdx); }} className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)" }}>
                      <MoreVertical className="w-4 h-4" style={{ color: "#a3a3a3" }} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ──────────── BOTTOM NAV ──────────── */}
      <div className="bottom-nav">
        <div className="flex items-center justify-around">
          {navItems.map((item) => (
            <div key={item.key} className={`nav-item ${activePage === item.key ? "active" : ""}`} onClick={() => {
              if (item.key === "dashboard") router.push("/admin");
              else if (item.key === "landlords") router.push("/admin/landlords");
              else if (item.key === "listings") router.push("/admin/listings");
              else if (item.key === "wallet") router.push("/admin/wallet");
              else if (item.key === "settings") router.push("/admin/settings");
              else if (item.snackbar) showSnackbar(item.snackbar, "info");
            }}>
              <item.icon className="w-5 h-5" style={{ color: activePage === item.key ? "#059669" : "#525252" }} />
              <span className="text-xs font-medium" style={{ color: activePage === item.key ? "#059669" : "#525252" }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ──────────── SHEETS ──────────── */}
      <div className={`bottom-sheet-overlay ${activeSheet ? "active" : ""}`} onClick={closeSheet} />

      {/* -- FILTER SHEET -- */}
      <div className={`bottom-sheet ${activeSheet === "filter" ? "active" : ""}`}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-8">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-white">Filters</h3>
            <button onClick={() => { setCurrentFilter("all"); setFilterActive(false); showSnackbar("Filters reset", "info"); closeSheet(); }} className="text-xs font-medium" style={{ color: "#059669" }}>Reset all</button>
          </div>
          <div className="mb-5">
            <label className="text-xs font-semibold mb-3 block" style={{ color: "#a3a3a3" }}>STATUS</label>
            <div className="flex flex-wrap gap-2">
              {["all", "pending", "active", "flagged", "expired", "rejected"].map((v) => (
                <button key={v} onClick={() => setCurrentFilter(v)}
                  className="filter-chip" style={{ background: currentFilter === v ? "rgba(4,120,87,0.15)" : "rgba(255,255,255,0.03)", borderColor: currentFilter === v ? "rgba(4,120,87,0.3)" : "rgba(255,255,255,0.08)", color: currentFilter === v ? "#059669" : "#a3a3a3" }}>
                  {v === "all" ? "All" : v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="mb-5">
            <label className="text-xs font-semibold mb-3 block" style={{ color: "#a3a3a3" }}>PROPERTY TYPE</label>
            <div className="flex flex-wrap gap-2">
              {["All", "Apartment", "House", "Bedsitter", "Studio", "Single Room", "Plot", "Mansion"].map((t) => (
                <button key={t} className="filter-chip" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)", color: "#a3a3a3" }}>{t}</button>
              ))}
            </div>
          </div>
          <div className="mb-5">
            <label className="text-xs font-semibold mb-3 block" style={{ color: "#a3a3a3" }}>LOCATION</label>
            <select className="android-input" style={{ appearance: "none" }}>
              <option value="all">All Locations</option>
              {["Nairobi", "Mombasa", "Kisumu", "Nakuru", "Kiambu", "Kajiado"].map((loc) => <option key={loc} value={loc.toLowerCase()}>{loc}</option>)}
            </select>
          </div>
          <button onClick={() => { setFilterActive(true); closeSheet(); showSnackbar("Filters applied", "success"); }} className="btn-primary w-full text-center ripple-container">Apply Filters</button>
        </div>
      </div>

      {/* -- LISTING DETAIL SHEET -- */}
      <div className={`bottom-sheet ${activeSheet === "detail" ? "active" : ""}`} style={{ maxHeight: "95dvh" }}>
        <div className="bottom-sheet-handle" />
        <div className="pb-8">
          {currentListing && (
            <>
              <div className="relative">
                <img src={currentListing.images[0]} className="w-full h-52 object-cover" alt="" />
                <div className="absolute bottom-3 left-0 right-0">
                  <div className="img-dots">
                    {currentListing.images.map((_, i) => <div key={i} className={`img-dot ${i === 0 ? "active" : ""}`} />)}
                  </div>
                </div>
                <button onClick={() => { closeSheet(); setTimeout(() => handleOpenGallery(currentIdx), 300); }} className="absolute top-3 right-3 text-xs font-medium px-3 py-1.5 rounded-lg" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", color: "white" }}>
                  <span className="flex items-center gap-1"><ImageIcon className="w-3.5 h-3.5" /> {currentListing.images.length} photos</span>
                </button>
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-xl font-bold text-white flex-1 pr-3">{currentListing.title}</h3>
                  <span className="text-lg font-bold" style={{ color: "#059669" }}>{currentListing.price}</span>
                </div>
                <div className="flex items-center gap-1.5 mb-3">
                  <MapPin className="w-4 h-4" style={{ color: "#525252" }} />
                  <span className="text-sm" style={{ color: "#a3a3a3" }}>{currentListing.location}</span>
                </div>
                <div className="flex items-center gap-2 mb-4">
                  <span className={`status-badge status-${currentListing.status}`}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_COLORS[currentListing.status] }} />
                    {statusLabel(currentListing.status)}
                  </span>
                  {currentListing.featured && <span className="status-badge status-featured"><Star className="w-3 h-3" /> Featured</span>}
                </div>
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {[
                    { val: currentListing.beds, label: "Beds" },
                    { val: currentListing.baths, label: "Baths" },
                    { val: currentListing.sqft, label: "sqft" },
                    { val: currentListing.type, label: "Type" },
                  ].map((s) => (
                    <div key={s.label} className="text-center p-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
                      <p className="text-base font-bold text-white">{s.val}</p>
                      <p className="text-xs" style={{ color: "#525252" }}>{s.label}</p>
                    </div>
                  ))}
                </div>
                <div className="mb-4">
                  <p className="text-xs font-semibold mb-2" style={{ color: "#a3a3a3" }}>AMENITIES</p>
                  <div className="flex flex-wrap gap-1.5">
                    {currentListing.amenities.length > 0 ? currentListing.amenities.map((a) => (
                      <span key={a} className="amenity-tag">{a}</span>
                    )) : <span className="text-xs" style={{ color: "#525252" }}>No amenities listed</span>}
                  </div>
                </div>
                <div className="mb-4">
                  <p className="text-xs font-semibold mb-2" style={{ color: "#a3a3a3" }}>DESCRIPTION</p>
                  <p className="text-sm leading-relaxed" style={{ color: "#a3a3a3" }}>{currentListing.desc}</p>
                </div>
                {/* Landlord Info */}
                <div className="p-3 rounded-xl mb-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: `linear-gradient(135deg, ${currentListing.llColor}, ${currentListing.llColor}dd)`, color: "white" }}>{currentListing.llInit}</div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white">{currentListing.landlord}</p>
                      <p className="text-xs" style={{ color: "#525252" }}>{currentListing.llPhone}</p>
                    </div>
                    <button onClick={() => { closeSheet(); setTimeout(() => openSheet("landlord-info"), 300); }} className="text-xs font-medium px-3 py-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.05)", color: "#a3a3a3" }}>View</button>
                  </div>
                </div>
                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mb-5">
                  {[
                    { val: currentListing.views, label: "Views" },
                    { val: currentListing.inquiries, label: "Inquiries" },
                    { val: currentListing.viewings, label: "Viewings" },
                  ].map((s) => (
                    <div key={s.label} className="text-center p-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
                      <p className="text-sm font-bold text-white">{s.val}</p>
                      <p className="text-xs" style={{ color: "#525252" }}>{s.label}</p>
                    </div>
                  ))}
                </div>
                {/* Actions */}
                <div className="space-y-2">
                  <button onClick={() => { closeSheet(); handleApprove(currentIdx); }} className="btn-primary w-full text-center ripple-container">Approve Listing</button>
                  <div className="flex gap-2">
                    <button onClick={() => { closeSheet(); setTimeout(() => handleOpenReject(currentIdx), 300); }} className="btn-danger flex-1 text-center">Reject</button>
                    <button onClick={() => { closeSheet(); setTimeout(() => handleOpenFeature(currentIdx), 300); }} className="btn-purple flex-1 text-center">Feature</button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* -- REJECT SHEET -- */}
      <div className={`bottom-sheet ${activeSheet === "reject" ? "active" : ""}`}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(239,68,68,0.15)" }}>
              <XCircle className="w-5 h-5" style={{ color: "#ef4444" }} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Reject Listing</h3>
              <p className="text-xs" style={{ color: "#a3a3a3" }}>{currentListing?.title || ""}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {REJECT_REASONS.map((reason) => (
              <button key={reason} onClick={() => setSelectedRejectReason(reason)}
                className="text-xs font-medium px-3.5 py-2 rounded-full transition-all"
                style={{ background: selectedRejectReason === reason ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.05)", border: selectedRejectReason === reason ? "1px solid rgba(239,68,68,0.3)" : "1px solid rgba(255,255,255,0.1)", color: selectedRejectReason === reason ? "#ef4444" : "#a3a3a3" }}>
                {reason}
              </button>
            ))}
          </div>
          <textarea className="android-input" rows={2} placeholder="Additional notes for landlord (optional)" value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} />
          <div className="flex items-center gap-3 mt-3 mb-4">
            <div className={`toggle-track ${rejectNotify ? "active" : ""}`} onClick={() => setRejectNotify((s) => !s)}>
              <div className="toggle-thumb" />
            </div>
            <span className="text-sm" style={{ color: "#a3a3a3" }}>Notify landlord via SMS & email</span>
          </div>
          <div className="flex gap-3">
            <button onClick={closeSheet} className="btn-ghost flex-1 text-center">Cancel</button>
            <button onClick={handleConfirmReject} disabled={!selectedRejectReason} className="btn-danger flex-1 text-center" style={{ opacity: selectedRejectReason ? 1 : 0.4, cursor: selectedRejectReason ? "pointer" : "not-allowed" }}>Reject Listing</button>
          </div>
        </div>
      </div>

      {/* -- FEATURE/BOOST SHEET -- */}
      <div className={`bottom-sheet ${activeSheet === "feature" ? "active" : ""}`}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(168,85,247,0.15)" }}>
              <Star className="w-5 h-5" style={{ color: "#a855f7" }} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Feature Listing</h3>
              <p className="text-xs" style={{ color: "#a3a3a3" }}>{currentListing?.title || ""}</p>
            </div>
          </div>
          <div className="space-y-2 mb-4">
            {BOOST_OPTIONS.map((opt) => (
              <label key={opt.days} className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer`}
                style={{ background: selectedBoostDuration === opt.days ? "rgba(4,120,87,0.08)" : "rgba(255,255,255,0.03)", border: selectedBoostDuration === opt.days ? "1.5px solid rgba(4,120,87,0.2)" : "1.5px solid transparent" }}
                onClick={() => setSelectedBoostDuration(opt.days)}>
                <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center" style={{ borderColor: selectedBoostDuration === opt.days ? "#059669" : "#525252" }}>
                  {selectedBoostDuration === opt.days && <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#059669" }} />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">{opt.label}</p>
                  <p className="text-xs" style={{ color: "#a3a3a3" }}>{opt.desc}</p>
                </div>
                <span className="text-sm font-bold" style={{ color: selectedBoostDuration === opt.days ? "#059669" : "#a3a3a3" }}>{opt.price}</span>
              </label>
            ))}
          </div>
          <div className="mb-4">
            <label className="text-xs font-semibold mb-2 block" style={{ color: "#a3a3a3" }}>CHARGE TO</label>
            <div className="flex gap-2">
              {(["landlord", "platform"] as const).map((src) => (
                <button key={src} onClick={() => setBoostPaymentSource(src)}
                  className="text-xs font-medium px-4 py-2.5 rounded-xl transition-all"
                  style={{ background: boostPaymentSource === src ? "rgba(4,120,87,0.15)" : "rgba(255,255,255,0.03)", border: boostPaymentSource === src ? "1.5px solid rgba(4,120,87,0.3)" : "1.5px solid rgba(255,255,255,0.08)", color: boostPaymentSource === src ? "#059669" : "#a3a3a3" }}>
                  {src === "landlord" ? "Landlord" : "Platform (Free)"}
                </button>
              ))}
            </div>
          </div>
          <div className="p-3 rounded-xl mb-4" style={{ background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.15)" }}>
            <p className="text-xs" style={{ color: "#a855f7" }}>⭐ Featured listings get <span className="font-semibold">3x more views</span> and appear at the top of search results</p>
          </div>
          <div className="flex gap-3">
            <button onClick={closeSheet} className="btn-ghost flex-1 text-center">Cancel</button>
            <button onClick={handleConfirmFeature} disabled={boostSending} className="btn-purple flex-1 text-center ripple-container flex items-center justify-center gap-2">
              {boostSending ? <><div className="spinner" /><span>Featuring...</span></> : <span>Feature Now</span>}
            </button>
          </div>
        </div>
      </div>

      {/* -- FLAG ACTION SHEET -- */}
      <div className={`bottom-sheet ${activeSheet === "flag" ? "active" : ""}`}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(168,85,247,0.15)" }}>
              <Flag className="w-5 h-5" style={{ color: "#a855f7" }} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Flagged Listing</h3>
              <p className="text-xs" style={{ color: "#a3a3a3" }}>{currentListing?.title || ""}</p>
            </div>
          </div>
          <div className="space-y-2 mb-5">
            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.08)" }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(239,68,68,0.15)" }}><AlertTriangle className="w-4 h-4" style={{ color: "#ef4444" }} /></div>
              <div><p className="text-sm font-medium text-white">3 scam reports</p><p className="text-xs" style={{ color: "#525252" }}>Tenants report this is fake</p></div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(234,179,8,0.05)", border: "1px solid rgba(234,179,8,0.08)" }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(234,179,8,0.15)" }}><TrendingDown className="w-4 h-4" style={{ color: "#eab308" }} /></div>
              <div><p className="text-sm font-medium text-white">Suspicious pricing</p><p className="text-xs" style={{ color: "#525252" }}>KSh 5,000 is below market rate</p></div>
            </div>
          </div>
          <div className="space-y-2">
            {[
              { icon: Trash2, color: "#ef4444", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.15)", title: "Remove Immediately", desc: "Delete listing, suspend landlord", onClick: () => { closeSheet(); setTimeout(() => handleOpenRemove(), 300); } },
              { icon: EyeOff, color: "#eab308", bg: "rgba(234,179,8,0.08)", border: "rgba(234,179,8,0.15)", title: "Unlist & Warn", desc: "Hide listing, send warning to landlord", onClick: () => { closeSheet(); showSnackbar("Listing unlisted & landlord warned", "success"); } },
              { icon: Search, color: "#3b82f6", bg: "rgba(59,130,246,0.08)", border: "rgba(59,130,246,0.15)", title: "Investigate", desc: "Keep live, assign for review", onClick: () => { closeSheet(); showSnackbar("Investigation started", "info"); } },
              { icon: CheckCircle, color: "#059669", bg: "rgba(4,120,87,0.08)", border: "rgba(4,120,87,0.15)", title: "Clear Flag", desc: "Legitimate listing, remove flags", onClick: () => { handleClearFlag(); } },
            ].map((action) => {
              const Icon = action.icon;
              return (
                <button key={action.title} onClick={action.onClick} className="w-full flex items-center gap-4 p-4 rounded-2xl" style={{ background: action.bg, border: `1px solid ${action.border}` }}>
                  <Icon className="w-5 h-5" style={{ color: action.color }} />
                  <div className="text-left"><p className="text-sm font-semibold text-white">{action.title}</p><p className="text-xs" style={{ color: "#a3a3a3" }}>{action.desc}</p></div>
                </button>
              );
            })}
          </div>
          <button onClick={closeSheet} className="btn-ghost w-full text-center mt-4">Cancel</button>
        </div>
      </div>

      {/* -- IMAGE GALLERY SHEET -- */}
      <div className={`bottom-sheet ${activeSheet === "gallery" ? "active" : ""}`} style={{ background: "#000", borderRadius: 0, maxHeight: "100dvh" }}>
        <div className="relative" style={{ minHeight: "100dvh" }}>
          <div className="flex items-center justify-between p-4">
            <button onClick={closeSheet} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.1)" }}>
              <X className="w-5 h-5 text-white" />
            </button>
            <span className="text-sm font-medium text-white">{galleryIndex + 1} / {currentListing?.images.length || 0}</span>
            <button onClick={() => { closeSheet(); setTimeout(() => openListingDetail(currentIdx), 300); }} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.1)" }}>
              <Info className="w-5 h-5 text-white" />
            </button>
          </div>
          <div className="flex items-center justify-center px-4" style={{ minHeight: "60dvh" }}>
            <img src={currentListing?.images[galleryIndex] || "https://picsum.photos/seed/placeholder/600/400.jpg"} className="w-full rounded-2xl object-cover" style={{ maxHeight: "50dvh" }} alt="" />
          </div>
          <div className="flex items-center justify-center gap-4 mt-6 pb-8">
            <button onClick={prevImage} className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.1)" }}>
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
            <div className="img-dots gap-2">
              {(currentListing?.images || []).map((_, i) => (
                <div key={i} className="img-dot" style={{ width: "8px", height: "8px", background: i === galleryIndex ? "white" : "rgba(255,255,255,0.3)" }} />
              ))}
            </div>
            <button onClick={nextImage} className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.1)" }}>
              <ChevronRight className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* -- ACTION SHEET -- */}
      <div className={`bottom-sheet ${activeSheet === "action" ? "active" : ""}`}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-4">
          <h3 className="text-sm font-semibold mb-3" style={{ color: "#a3a3a3" }}>Actions</h3>
          <div className="space-y-1">
            {[
              { icon: Eye, color: "#a3a3a3", label: "View Details", onClick: () => { closeSheet(); setTimeout(() => openListingDetail(currentIdx), 200); } },
              { icon: CheckCircle, color: "#059669", label: "Approve", onClick: () => { closeSheet(); setTimeout(() => handleApprove(currentIdx), 200); } },
              { icon: XCircle, color: "#ef4444", label: "Reject", onClick: () => { closeSheet(); setTimeout(() => handleOpenReject(currentIdx), 200); } },
              { icon: Star, color: "#a855f7", label: "Feature / Boost", onClick: () => { closeSheet(); setTimeout(() => handleOpenFeature(currentIdx), 200); } },
              { icon: Flag, color: "#eab308", label: "Flag Listing", onClick: () => { handleFlagListing(); } },
              { icon: Trash2, color: "#ef4444", label: "Remove", onClick: () => { closeSheet(); setTimeout(() => handleOpenRemove(), 200); } },
            ].map((action) => {
              const Icon = action.icon;
              return (
                <button key={action.label} onClick={action.onClick} className="w-full flex items-center gap-4 p-3.5 rounded-xl" style={{ background: "transparent" }}>
                  <Icon className="w-5 h-5" style={{ color: action.color }} />
                  <span className="text-sm font-medium text-white">{action.label}</span>
                </button>
              );
            })}
          </div>
          <button onClick={closeSheet} className="btn-ghost w-full text-center mt-3">Cancel</button>
        </div>
      </div>

      {/* -- REMOVE SHEET -- */}
      <div className={`bottom-sheet ${activeSheet === "remove" ? "active" : ""}`}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(239,68,68,0.15)" }}>
              <Trash2 className="w-5 h-5" style={{ color: "#ef4444" }} />
            </div>
            <h3 className="text-lg font-bold text-white">Remove Listing</h3>
          </div>
          <div className="p-4 rounded-xl mb-4" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}>
            <p className="text-sm" style={{ color: "#a3a3a3" }}>This will permanently remove the listing from the platform. The landlord will be notified.</p>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {REMOVE_REASONS.map((reason) => (
              <button key={reason} onClick={() => setSelectedRemoveReason(reason)}
                className="text-xs font-medium px-3.5 py-2 rounded-full transition-all"
                style={{ background: selectedRemoveReason === reason ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.05)", border: selectedRemoveReason === reason ? "1px solid rgba(239,68,68,0.3)" : "1px solid rgba(255,255,255,0.1)", color: selectedRemoveReason === reason ? "#ef4444" : "#a3a3a3" }}>
                {reason}
              </button>
            ))}
          </div>
          <textarea className="android-input" rows={2} placeholder="Reason for removal..." />
          <div className="flex gap-3 mt-4">
            <button onClick={closeSheet} className="btn-ghost flex-1 text-center">Cancel</button>
            <button onClick={handleConfirmRemove} disabled={!selectedRemoveReason} className="btn-danger flex-1 text-center" style={{ opacity: selectedRemoveReason ? 1 : 0.4, cursor: selectedRemoveReason ? "pointer" : "not-allowed" }}>Remove</button>
          </div>
        </div>
      </div>

      {/* -- LANDLORD INFO SHEET -- */}
      <div className={`bottom-sheet ${activeSheet === "landlord-info" ? "active" : ""}`} style={{ maxHeight: "95dvh" }}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-8">
          {currentListing && (
            <>
              <div className="flex items-center gap-4 mb-5">
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold" style={{ background: `linear-gradient(135deg, ${currentListing.llColor}, ${currentListing.llColor}dd)`, color: "white" }}>
                  {currentListing.llInit}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white">{currentListing.landlord}</h3>
                  <p className="text-sm" style={{ color: "#a3a3a3" }}>{currentListing.llPhone}</p>
                  <span className="inline-flex items-center gap-1 text-xs font-medium mt-1.5 px-2.5 py-0.5 rounded-full" style={{ background: "rgba(4,120,87,0.15)", color: "#059669" }}>
                    Verified Landlord
                  </span>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 mb-5">
                {(() => {
                  const llListings = listings.filter((l) => l.landlord === currentListing.landlord);
                  const totalProps = llListings.length;
                  const totalActive = llListings.filter((l) => l.status === "active").length;
                  const totalViews = llListings.reduce((s, l) => s + l.views, 0);
                  return [
                    { val: totalProps, label: "Listings" },
                    { val: totalActive, label: "Active" },
                    { val: totalViews, label: "Total Views" },
                  ];
                })().map((s) => (
                  <div key={s.label} className="text-center p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
                    <p className="text-lg font-bold text-white">{s.val}</p>
                    <p className="text-xs" style={{ color: "#525252" }}>{s.label}</p>
                  </div>
                ))}
              </div>

              {/* All their listings */}
              <h4 className="text-xs font-semibold mb-3" style={{ color: "#a3a3a3" }}>ALL LISTINGS BY {currentListing.landlord.toUpperCase()}</h4>
              <div className="space-y-2 mb-5">
                {listings
                  .filter((l) => l.landlord === currentListing.landlord)
                  .map((l, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <img src={l.images[0]} className="w-11 h-11 rounded-lg object-cover" alt="" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{l.title}</p>
                        <p className="text-xs" style={{ color: "#525252" }}>{l.price} · {l.location}</p>
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full`} style={{ background: `${STATUS_COLORS[l.status]}15`, color: STATUS_COLORS[l.status] }}>
                        {statusLabel(l.status)}
                      </span>
                    </div>
                  ))}
              </div>

              {/* Quick actions */}
              <div className="flex gap-2">
                <button onClick={() => {
                  closeSheet();
                  setTimeout(() => showSnackbar(`Messaging ${currentListing.landlord}...`, "info"), 300);
                }} className="btn-ghost flex-1 text-center" style={{ padding: "12px", fontSize: "13px" }}>
                  Message
                </button>
                <button onClick={() => {
                  closeSheet();
                  setTimeout(() => router.push("/admin/landlords"), 300);
                }} className="btn-primary flex-1 text-center ripple-container" style={{ padding: "12px", fontSize: "13px" }}>
                  View in Landlords
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ──────────── SNACKBAR ──────────── */}
      <div className={`snackbar ${snackbar.visible ? "show" : "hide"}`}>
        <div className="flex items-center gap-3">
          <div>
            {snackbar.type === "success" && (
              <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(4,120,87,0.2)" }}>
                <Check className="w-3.5 h-3.5" style={{ color: "#059669" }} />
              </div>
            )}
            {snackbar.type === "error" && (
              <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(239,68,68,0.2)" }}>
                <XCircle className="w-3.5 h-3.5" style={{ color: "#ef4444" }} />
              </div>
            )}
            {snackbar.type === "info" && (
              <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(59,130,246,0.2)" }}>
                <Info className="w-3.5 h-3.5" style={{ color: "#3b82f6" }} />
              </div>
            )}
          </div>
          <div className="flex-1">
            <span className="text-sm font-medium text-white">{snackbar.message}</span>
          </div>
          <button onClick={() => setSnackbar((s) => ({ ...s, visible: false }))} className="p-1">
            <X className="w-4 h-4" style={{ color: "#525252" }} />
          </button>
        </div>
      </div>
    </div>
  );
}

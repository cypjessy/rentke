"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LISTING_DETAIL_AMENITIES } from "../constants";
import {
  Search,
  Building2,
  Plus,
  LayoutDashboard,
  CalendarDays,
  MessageSquare,
  Pencil,
  Layers,
  Trash2,
  Clock,
  BadgeCheck,
  Megaphone,
  MessageSquareWarning,
  DoorOpen,
  Check,
  X,
  Info,
  SlidersHorizontal,
  ArrowUpDown,
  MessageCircle,
  Eye,
  Heart,
  MoreVertical,
  Zap,
  PauseCircle,
  AlertCircle,
  FileEdit,
  Share2,
  TrendingDown,
  TrendingUp,
  Smartphone,
  Crown,
  Menu,
  ChevronRight,
  Settings,
  X as XIcon,
  Camera,
  List,
} from "lucide-react";

import AuthGuard from "../components/AuthGuard";
import { useAuth } from "../AuthContext";
import {
  listenToListings,
  createListing,
  updateListing,
  toggleListingStatus,
  boostListing,
  deleteListing,
  type ListingData,
} from "../../lib/listings";
import { listenToUnits, type UnitData } from "../../lib/units";
import { listenToProperties, type PropertyData } from "../../lib/properties";
import CreateListingSheet from "./CreateListingSheet";
import ViewListingSheet from "./ViewListingSheet";

type SnackbarType = "success" | "error" | "info";

function ListingsPage() {
  const router = useRouter();
  const { user } = useAuth();

  // ---- Tab State ----
  const [activeTab, setActiveTab] = useState("listings");

  // ---- Sheet State ----
  const [activeSheet, setActiveSheet] = useState<string | null>(null);

  // ---- Active Filter ----
  const [activeFilter, setActiveFilter] = useState("all");

  // ---- Sort Label ----
  const [sortLabel, setSortLabel] = useState("Newest First");

  // ---- Search Text ----
  const [searchText, setSearchText] = useState("");

  // ---- Filter State ----
  const [filterListTypes, setFilterListTypes] = useState<string[]>([]);
  const [filterListRentMin, setFilterListRentMin] = useState("");
  const [filterListRentMax, setFilterListRentMax] = useState("");

  // ---- Boost ----
  const [boostDays, setBoostDays] = useState(7);

  // ---- Snackbar ----
  const [snackbar, setSnackbar] = useState<{ show: boolean; message: string; type: SnackbarType }>({ show: false, message: "", type: "info" });
  const snackbarTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarAnimClass, setSnackbarAnimClass] = useState("");

  // ---- Loading states ----
  const [formLoading, setFormLoading] = useState<string | null>(null);
  const [listingsLoading, setListingsLoading] = useState(true);

  // ---- Firestore data ----
  const [listings, setListings] = useState<ListingData[]>([]);
  const [selectedListing, setSelectedListing] = useState<ListingData | null>(null);
  const [vacantUnits, setVacantUnits] = useState<UnitData[]>([]);
  const [properties, setProperties] = useState<PropertyData[]>([]);
  const [createListingInitial, setCreateListingInitial] = useState<Record<string, string> | undefined>(undefined);

  // ---- Edit Listing Form State ----
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editRent, setEditRent] = useState("");

  // ---- Pre-fill Edit Form ----
  useEffect(() => {
    if (selectedListing && activeSheet === "editListing") {
      setEditTitle(selectedListing.title);
      setEditDescription(selectedListing.description);
      setEditRent(selectedListing.rent.toString());
    }
  }, [selectedListing, activeSheet]);

  // ---- Handle query params (createFromUnit / createFromProperty) ----
  const searchParams = useSearchParams();
  const createFromUnitId = searchParams.get("createFromUnit");
  const createFromPropertyId = searchParams.get("createFromProperty");
  const createFromPropertyName = searchParams.get("propertyName");

  // Track if we've already processed the initial params
  const initialCreateRef = useRef(false);

  useEffect(() => {
    if (initialCreateRef.current) return;
    if (vacantUnits.length === 0 && !createFromPropertyId) return;

    initialCreateRef.current = true;

    // Handle createFromProperty (coming from properties page)
    if (createFromPropertyId) {
      setCreateListingInitial({
        propertyId: createFromPropertyId,
        propertyName: createFromPropertyName || "",
        unitId: "",
        unitName: "",
        title: "",
        rent: "",
      });
      setTimeout(() => openSheet("createListing"), 300);
      return;
    }

    // Handle createFromUnit (coming from units page)
    if (createFromUnitId) {
      const unit = vacantUnits.find(u => u.id === createFromUnitId);
      if (!unit) return;
      setCreateListingInitial({
        propertyId: unit.propertyId || "",
        propertyName: unit.propertyName || "",
        unitId: unit.id,
        unitName: unit.name,
        title: `${unit.type} — ${unit.name}`,
        rent: unit.rent.toString(),
        description: unit.description || "",
      });
      setTimeout(() => openSheet("createListing"), 300);
    }
  }, [createFromUnitId, createFromPropertyId, createFromPropertyName, vacantUnits]);

  // ---- Firestore Listeners ----
  useEffect(() => {
    if (!user) {
      setListingsLoading(false);
      return;
    }
    const unsub = listenToListings(
      user.uid,
      (data) => {
        setListings(data);
        setListingsLoading(false);
      },
      (err) => {
        console.error("Error loading listings:", err);
        setListingsLoading(false);
      }
    );
    return () => unsub();
  }, [user]);

  // Listen for vacant units to populate the Create Listing form
  useEffect(() => {
    if (!user) return;
    const unsub = listenToUnits(
      user.uid,
      (data) => {
        setVacantUnits(data.filter(u => u.status === "Vacant"));
      },
      (err) => console.error("Error loading units for listings:", err)
    );
    return () => unsub();
  }, [user]);

  // Listen for properties to populate the property selector
  useEffect(() => {
    if (!user) return;
    const unsub = listenToProperties(
      user.uid,
      (data) => {
        setProperties(data);
      },
      (err) => console.error("Error loading properties for listings:", err)
    );
    return () => unsub();
  }, [user]);

  const filteredListings = listings
    .filter((l) => {
      if (activeFilter === "all") return true;
      return l.status === activeFilter;
    })
    .filter((l) => {
      if (!searchText.trim()) return true;
      const q = searchText.toLowerCase();
      return (
        l.title.toLowerCase().includes(q) ||
        l.propertyName.toLowerCase().includes(q) ||
        l.description.toLowerCase().includes(q)
      );
    })
    .filter((l) => {
      if (filterListTypes.length > 0 && !filterListTypes.includes(l.status)) return false;
      if (filterListRentMin && l.rent < parseInt(filterListRentMin.replace(/,/g, ""))) return false;
      if (filterListRentMax && l.rent > parseInt(filterListRentMax.replace(/,/g, ""))) return false;
      return true;
    })
    .sort((a, b) => {
      const aTime = a.createdAt?.toDate?.()?.getTime() || 0;
      const bTime = b.createdAt?.toDate?.()?.getTime() || 0;
      switch (sortLabel) {
        case "Most Views": return b.views - a.views;
        case "Most Inquiries": return b.inquiries - a.inquiries;
        case "Highest Performance": return (b.views + b.inquiries * 10) - (a.views + a.inquiries * 10);
        case "Expiring Soon": {
          const aExp = a.expiresAt?.toDate?.()?.getTime() || 0;
          const bExp = b.expiresAt?.toDate?.()?.getTime() || 0;
          return aExp - bExp;
        }
        default: return bTime - aTime; // "Newest First" — newest at top
      }
    });

  // ---- Snackbar ----
  useEffect(() => {
    if (snackbar.show) {
      setSnackbarVisible(true);
      setSnackbarAnimClass("show");
    } else {
      setSnackbarAnimClass("hide");
      const timeout = setTimeout(() => {
        setSnackbarVisible(false);
        setSnackbarAnimClass("");
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [snackbar.show]);

  const showSnackbar = (message: string, type: SnackbarType = "info") => {
    setSnackbar({ show: true, message, type });
    if (snackbarTimeoutRef.current) clearTimeout(snackbarTimeoutRef.current);
    snackbarTimeoutRef.current = setTimeout(() => {
      setSnackbar({ show: false, message: "", type: "info" });
    }, 3000);
  };

  const hideSnackbar = () => setSnackbar({ show: false, message: "", type: "info" });

  // ---- Sheet Management ----
  const openSheet = (name: string) => setActiveSheet(name);
  const closeSheet = () => setActiveSheet(null);

  // ---- Form Handler (accepts optional listing param to avoid stale state) ----
  const handleForm = async (id: string, listing?: ListingData) => {
    const target = listing || selectedListing;
    setFormLoading(id);
    try {
      if (id === "edit-listing" && target) {
        await updateListing(target.id, {
          title: editTitle,
          description: editDescription,
          rent: parseInt(editRent.replace(/,/g, "")) || 0,
        });
        setFormLoading(null); closeSheet();
        setTimeout(() => showSnackbar("Listing updated! ✅", "success"), 300);
      } else if (id === "delete-listing" && target) {
        await deleteListing(target.id);
        setFormLoading(null); closeSheet();
        setTimeout(() => showSnackbar("Listing deleted permanently", "error"), 300);
      } else if (id === "pause" && target) {
        await toggleListingStatus(target.id, "paused");
        setFormLoading(null); closeSheet();
        setTimeout(() => showSnackbar("Listing paused", "info"), 300);
      } else if (id === "resume" && target) {
        await toggleListingStatus(target.id, "active");
        setFormLoading(null); closeSheet();
        setTimeout(() => showSnackbar("Listing resumed!", "success"), 300);
      } else if (id === "boost" && target) {
        await boostListing(target.id, boostDays);
        setFormLoading(null); closeSheet();
        setTimeout(() => showSnackbar("Listing boosted! 🚀", "success"), 300);
      } else if (id === "renew" && target) {
        await updateListing(target.id, {
          title: target.title,
          description: target.description,
          rent: target.rent,
          status: "active",
        } as any);
        setFormLoading(null); closeSheet();
        setTimeout(() => showSnackbar("Listing renewed for 30 days!", "success"), 300);
      }
    } catch (err: any) {
      console.error("Form error:", err);
      setFormLoading(null);
      showSnackbar(err?.message || "Something went wrong", "error");
    }
  };

  // ---- Ripple ----
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const container = (e.target as HTMLElement).closest(".ripple-container") as HTMLElement | null;
      if (!container) return;
      const ripple = document.createElement("span");
      ripple.classList.add("ripple");
      const rect = container.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      ripple.style.width = ripple.style.height = size + "px";
      ripple.style.left = e.clientX - rect.left - size / 2 + "px";
      ripple.style.top = e.clientY - rect.top - size / 2 + "px";
      container.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  // ---- Snackbar Icon ----
  const snackbarIcon = () => {
    switch (snackbar.type) {
      case "success":
        return (
          <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(4,120,87,0.2)" }}>
            <Check className="w-3.5 h-3.5" style={{ color: "#047857" }} />
          </div>
        );
      case "error":
        return (
          <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(239,68,68,0.2)" }}>
            <X className="w-3.5 h-3.5" style={{ color: "#ef4444" }} />
          </div>
        );
      case "info":
        return (
          <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(59,130,246,0.2)" }}>
            <Info className="w-3.5 h-3.5" style={{ color: "#3b82f6" }} />
          </div>
        );
    }
  };

  // ---- Boost prices ----
  const boostPrices: Record<number, string> = {
    7: "KSh 500",
    14: "KSh 800",
    30: "KSh 1,200",
  };

  // ---- Get status style ----
  const getStatusChip = (status: string) => {
    switch (status) {
      case "active": return { bg: "rgba(4,120,87,0.9)", color: "white", label: "Active" };
      case "paused": return { bg: "rgba(234,179,8,0.9)", color: "white", label: "Paused" };
      case "expired": return { bg: "rgba(239,68,68,0.9)", color: "white", label: "Expired" };
      case "draft": return { bg: "rgba(168,85,247,0.9)", color: "white", label: "Draft" };
      default: return { bg: "rgba(4,120,87,0.9)", color: "white", label: status };
    }
  };

  return (
    <AuthGuard>

    <div style={{ background: "#050505", color: "#e5e5e5", fontFamily: "'Inter', sans-serif" }}>
      <div className="app-shell">
        <div className="status-bar" />

        {/* ====== HEADER ====== */}
        <div className="app-header">
          <div className="flex items-center justify-between px-5 pt-2 pb-1">
            <div>
              <h1 className="text-xl font-bold text-white">Listings</h1>
              <p className="text-xs mt-0.5" style={{ color: "#a3a3a3" }}>
                Manage your property listings
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => openSheet("sort")}
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <ArrowUpDown className="w-4 h-4" style={{ color: "#a3a3a3" }} />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="px-5 py-2">
            <div className="relative" onClick={() => openSheet("search")}>
              <Search className="w-4.5 h-4.5 absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "#525252" }} />
              <div
                className="w-full py-3 pl-11 pr-12 rounded-xl text-sm"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", color: "#525252" }}
              >
                Search listings...
              </div>
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <button
                  onClick={(e) => { e.stopPropagation(); openSheet("filter"); }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(255,255,255,0.06)" }}
                >
                  <SlidersHorizontal className="w-4 h-4" style={{ color: "#a3a3a3" }} />
                </button>
              </div>
            </div>
          </div>

          {/* Summary Stats — computed from data */}
          <div className="grid grid-cols-4 gap-2 px-5 py-2">
            {[
              { key: "active", label: "Active", color: "#047857", bg: "rgba(4,120,87,0.06)", border: "rgba(4,120,87,0.15)" },
              { key: "paused", label: "Paused", color: "#eab308", bg: "rgba(234,179,8,0.06)", border: "rgba(234,179,8,0.15)" },
              { key: "expired", label: "Expired", color: "#ef4444", bg: "rgba(239,68,68,0.06)", border: "rgba(239,68,68,0.15)" },
              { key: "draft", label: "Draft", color: "#a855f7", bg: "rgba(168,85,247,0.06)", border: "rgba(168,85,247,0.15)" },
            ].map((s) => (
              <div key={s.key} className="p-2.5 rounded-xl text-center" style={{ background: s.bg, border: `1px solid ${s.border}` }}>
                <p className="text-base font-bold" style={{ color: s.color }}>{listings.filter(l => l.status === s.key).length}</p>
                <p className="text-xs" style={{ color: s.color }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Filter Chips */}
          <div className="filter-scroll py-1 pb-3">
            {[
              { key: "all", label: "All", count: listings.length.toString() },
              { key: "active", label: "Active", count: listings.filter(l => l.status === "active").length.toString(), dot: "#047857" },
              { key: "paused", label: "Paused", count: listings.filter(l => l.status === "paused").length.toString(), dot: "#eab308" },
              { key: "expired", label: "Expired", count: listings.filter(l => l.status === "expired").length.toString(), dot: "#ef4444" },
              { key: "draft", label: "Draft", count: listings.filter(l => l.status === "draft").length.toString(), dot: "#a855f7" },
            ].map((f) => (
              <button
                key={f.key}
                className={`filter-chip ${activeFilter === f.key ? "active" : ""}`}
                onClick={() => {
                  setActiveFilter(f.key);
                  const count = listings.filter((l) => f.key === "all" || l.status === f.key).length;
                  showSnackbar(`Showing ${count} listings`, "info");
                }}
              >
                {f.dot && <span className="w-2 h-2 rounded-full" style={{ background: f.dot }} />}
                {f.label}
                <span className="count">{f.count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ====== MAIN CONTENT ====== */}
        <div className="app-content" id="main-content">
          <div className="px-5 pb-28 space-y-3" id="listing-list">
            {filteredListings.map((listing, i) => {
              const statusStyle = getStatusChip(listing.status);
              const isPaused = listing.status === "paused";
              const isExpired = listing.status === "expired";
              const isDraft = listing.status === "draft";
              const opacity = isExpired ? 0.6 : isDraft ? 0.5 : isPaused ? 0.7 : 1;
              const imgFilter = isExpired ? "grayscale(60%)" : isPaused ? "grayscale(40%)" : "none";
              const perfPct = Math.min(Math.round(((listing.views + listing.inquiries * 10) / 100) * 100), 100);
              const perfColor = perfPct >= 80 ? "#047857" : perfPct >= 50 ? "#eab308" : "#ef4444";
              const perfLabel = perfPct >= 80 ? "High" : perfPct >= 50 ? "Medium" : perfPct >= 20 ? "Low" : "—";
              const listedDate = listing.createdAt?.toDate?.()?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) || '';
              const expiryStr = listing.expiresAt?.toDate?.()?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) || '';

              return (
                <div
                  key={listing.id}
                  className="listing-card animate-in"
                  style={{ animationDelay: `${0.05 + i * 0.05}s`, opacity }}
                  data-status={listing.status}
                  onClick={() => { setSelectedListing(listing); openSheet("detail"); }}
                >
                  <div className="flex">
                    <div className="relative flex-shrink-0" style={{ width: "110px" }}>
                      {isDraft ? (
                        <div
                          className="w-full h-full flex flex-col items-center justify-center"
                          style={{ minHeight: "150px", background: "rgba(255,255,255,0.02)", borderRight: "1px dashed rgba(255,255,255,0.08)" }}
                        >
                          <FileEdit className="w-8 h-8" style={{ color: "#525252" }} />
                          <span className="text-xs mt-2" style={{ color: "#525252" }}>Draft</span>
                        </div>
                      ) : (
                        <img
                          src={`https://picsum.photos/seed/${listing.id}/220/220.jpg`}
                          alt=""
                          className="w-full h-full object-cover"
                          style={{ minHeight: "150px", filter: imgFilter }}
                        />
                      )}
                      <div className="absolute top-2 left-2">
                        <span className="chip text-white" style={{ background: statusStyle.bg, fontSize: "10px", padding: "3px 8px", backdropFilter: "blur(8px)" }}>
                          {statusStyle.label}
                        </span>
                      </div>
                      {listing.boosted && (
                        <div className="absolute bottom-2 left-2 right-2">
                          <span className="chip text-white w-full justify-center" style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)", fontSize: "9px", padding: "2px 6px" }}>
                            <Zap className="w-3 h-3" /> Boosted
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 p-3.5 flex flex-col justify-between min-w-0">
                      <div>
                        <div className="flex items-start justify-between">
                          <h3 className="text-sm font-bold text-white truncate pr-2">{listing.title}</h3>
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedListing(listing); openSheet("actions"); }}
                            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ background: "rgba(255,255,255,0.04)" }}
                          >
                            <MoreVertical className="w-4 h-4" style={{ color: "#525252" }} />
                          </button>
                        </div>
                        <p className="text-xs mt-0.5 truncate" style={{ color: "#a3a3a3" }}>
                          {listing.propertyName} • KSh {listing.rent.toLocaleString()}/mo
                        </p>
                      </div>

                      {/* Performance bar */}
                      {listing.status !== "paused" && listing.status !== "draft" && (
                        <div className="mt-2" onClick={(e) => { e.stopPropagation(); openSheet("performance"); }}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs" style={{ color: "#525252" }}>Performance</span>
                            <span className="text-xs font-semibold" style={{ color: perfColor }}>{perfLabel}</span>
                          </div>
                          <div className="perf-bar">
                            <div className="perf-bar-fill" style={{ width: perfPct + "%", background: `linear-gradient(to right,${perfColor},${perfPct >= 80 ? "#10b981" : perfPct >= 50 ? "#f59e0b" : "#ef4444"})` }} />
                          </div>
                        </div>
                      )}

                      {/* Stats row */}
                      {(listing.status === "active") && (
                        <div className="flex items-center gap-4 mt-2.5" onClick={(e) => { e.stopPropagation(); openSheet("inquiryStats"); }}>
                          <div className="stat-mini"><Eye className="w-3.5 h-3.5" /><span>{listing.views}</span></div>
                          <div className="stat-mini"><MessageCircle className="w-3.5 h-3.5" /><span>{listing.inquiries}</span></div>
                          <div className="stat-mini"><Heart className="w-3.5 h-3.5" /><span>{listing.saves}</span></div>
                        </div>
                      )}

                      {/* Paused / Draft / Expired banners */}
                      {isPaused && (
                        <div className="flex items-center gap-2 mt-2 p-2 rounded-lg" style={{ background: "rgba(234,179,8,0.06)", border: "1px solid rgba(234,179,8,0.12)" }}>
                          <PauseCircle className="w-3.5 h-3.5" style={{ color: "#eab308" }} />
                          <p className="text-xs" style={{ color: "#eab308" }}>Hidden from tenants</p>
                          <button onClick={(e) => { e.stopPropagation(); setSelectedListing(listing); handleForm("resume", listing); }} className="text-xs font-semibold ml-auto" style={{ color: "#eab308" }}>Resume</button>
                        </div>
                      )}
                      {isExpired && (
                        <div className="flex items-center gap-2 mt-2 p-2 rounded-lg" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.12)" }}>
                          <AlertCircle className="w-3.5 h-3.5" style={{ color: "#ef4444" }} />
                          <p className="text-xs" style={{ color: "#ef4444" }}>Listing expired</p>
                          <button onClick={(e) => { e.stopPropagation(); setSelectedListing(listing); handleForm("renew", listing); }} className="text-xs font-semibold ml-auto" style={{ color: "#047857" }}>Renew</button>
                        </div>
                      )}
                      {isDraft && (
                        <div className="flex items-center gap-2 mt-2 p-2 rounded-lg" style={{ background: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.12)" }}>
                          <AlertCircle className="w-3.5 h-3.5" style={{ color: "#a855f7" }} />
                          <p className="text-xs" style={{ color: "#a855f7" }}>Complete setup to publish</p>
                          <button onClick={(e) => { e.stopPropagation(); openSheet("editListing"); }} className="text-xs font-semibold ml-auto" style={{ color: "#a855f7" }}>Edit</button>
                        </div>
                      )}

                      {/* Footer text */}
                      {expiryStr && (
                        <p className="text-xs mt-1.5" style={{ color: "#525252" }}>Listed {listedDate} • Expires {expiryStr}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="h-4" />
          </div>
        </div>

        {/* FAB */}
        <button
          onClick={() => openSheet("createListing")}
          className="fixed z-50 flex items-center gap-2 px-5 py-3.5 rounded-2xl"
          style={{
            bottom: "80px",
            right: "20px",
            background: "linear-gradient(135deg,#047857,#059669)",
            boxShadow: "0 8px 32px rgba(4,120,87,0.4)",
            border: "none",
            cursor: "pointer",
          }}
        >
          <Plus className="w-5 h-5 text-white" />
          <span className="text-sm font-semibold text-white">New Listing</span>
        </button>

        {/* BOTTOM NAV */}
        <div className="app-bottom-nav">
          <div className="bottom-nav">
            <div className="flex">
              {[
                { key: "home", icon: LayoutDashboard, label: "Home", path: "/dashboard" },
                { key: "properties", icon: Building2, label: "Properties", path: "/properties" },
                { key: "listings", icon: List, label: "Listings" },
                { key: "more", icon: Menu, label: "More" },
              ].map((item) => (
                <div
                  key={item.key}
                  className={`nav-item ${activeTab === item.key ? "active" : ""}`}
                  onClick={() => {
                    if (item.key === "more") { openSheet("moreMenu"); return; }
                    setActiveTab(item.key);
                    if (item.path) router.push(item.path);
                  }}
                >
                  {activeTab === item.key && <div className="nav-indicator" />}
                  <item.icon className="w-5 h-5 nav-icon" />
                  <span className="nav-label">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ========== SHEETS ========== */}

      {/* SORT */}
      <div className={`sheet-overlay ${activeSheet === "sort" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "sort" ? "active" : ""}`}>
        <div className="sheet-handle" />
        <div className="p-5">
          <h3 className="text-base font-bold text-white mb-4">Sort Listings</h3>
          <div className="space-y-1">
            {["Newest First", "Most Views", "Most Inquiries", "Highest Performance", "Expiring Soon"].map((s) => (
              <div
                key={s}
                className="sort-option"
                onClick={() => {
                  setSortLabel(s);
                  setTimeout(() => closeSheet(), 200);
                }}
              >
                <div className={`sort-radio ${sortLabel === s ? "selected" : ""}`} />
                <span className={`text-sm font-medium ${sortLabel === s ? "text-white" : ""}`} style={sortLabel !== s ? { color: "#a3a3a3" } : {}}>
                  {s}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SEARCH */}
      <div className={`sheet-overlay ${activeSheet === "search" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "search" ? "active" : ""}`} style={{ maxHeight: "95dvh" }}>
        <div className="sheet-handle" />
        <div className="p-5">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "#525252" }} />
              <input type="text" className="android-input" style={{ paddingLeft: "44px", borderRadius: "14px" }} placeholder="Search listings..." autoFocus value={searchText} onChange={(e) => setSearchText(e.target.value)} />
            </div>
            <button onClick={closeSheet} className="text-sm font-semibold" style={{ color: "#047857" }}>Cancel</button>
          </div>
          <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#525252" }}>Quick Filters</h4>
          <div className="space-y-1">
            {[
              { icon: TrendingDown, color: "#eab308", bg: "rgba(234,179,8,0.1)", title: "Low Performers", desc: "Listings under 50 views" },
              { icon: Clock, color: "#ef4444", bg: "rgba(239,68,68,0.1)", title: "Expiring Soon", desc: "Listings expiring within 7 days" },
              { icon: Zap, color: "#f97316", bg: "rgba(249,115,22,0.1)", title: "Boosted", desc: "Currently promoted listings" },
            ].map((item, i) => (
              <button
                key={i}
                onClick={() => { closeSheet(); showSnackbar(`Showing ${item.title.toLowerCase()}`, "info"); }}
                className="w-full flex items-center gap-3 p-3 rounded-xl"
                style={{ background: "rgba(255,255,255,0.03)" }}
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: item.bg }}>
                  <item.icon className="w-4 h-4" style={{ color: item.color }} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-white">{item.title}</p>
                  <p className="text-xs" style={{ color: "#a3a3a3" }}>{item.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* FILTER */}
      <div className={`sheet-overlay ${activeSheet === "filter" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "filter" ? "active" : ""}`}>
        <div className="sheet-handle" />
        <div className="p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-white">Filters</h3>
            <button onClick={() => showSnackbar("Filters reset", "info")} className="text-sm font-semibold" style={{ color: "#047857" }}>Reset All</button>
          </div>            <div className="space-y-5">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#525252" }}>Status</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {["active", "paused", "expired", "draft"].map((s) => {
                  const selected = filterListTypes.includes(s);
                  return (
                  <button
                    key={s}
                    className={`filter-chip ${selected ? "active" : ""}`}
                    style={selected ? { background: "rgba(4,120,87,0.12)", color: "#047857" } : {}}
                    onClick={() => {
                      setFilterListTypes(prev =>
                        prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
                      );
                    }}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                )})}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#525252" }}>Rent Range</label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div className="input-group">
                  <input type="text" className="android-input" placeholder=" " style={{ paddingLeft: "44px" }} value={filterListRentMin} onChange={(e) => setFilterListRentMin(e.target.value)} />
                  <label style={{ left: "44px" }}>Min</label>
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs" style={{ color: "#525252" }}>KSh</span>
                </div>
                <div className="input-group">
                  <input type="text" className="android-input" placeholder=" " style={{ paddingLeft: "44px" }} value={filterListRentMax} onChange={(e) => setFilterListRentMax(e.target.value)} />
                  <label style={{ left: "44px" }}>Max</label>
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs" style={{ color: "#525252" }}>KSh</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={() => { setFilterListTypes([]); setFilterListRentMin(""); setFilterListRentMax(""); showSnackbar("Filters reset", "info"); }} className="btn-secondary flex-1" style={{ padding: "14px" }}>Reset</button>
            <button onClick={() => { closeSheet(); showSnackbar(`Filters applied (${filterListTypes.length || 'any'} status${filterListTypes.length !== 1 ? 'es' : ''})`, "success"); }} className="btn-primary flex-1 ripple-container" style={{ padding: "14px" }}>Apply</button>
          </div>
        </div>
      </div>

      {/* ACTIONS */}
      <div className={`sheet-overlay ${activeSheet === "actions" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "actions" ? "active" : ""}`}>
        <div className="sheet-handle" />
        <div className="p-5 pb-2"><h3 className="text-base font-bold text-white">Listing Actions</h3></div>
        <div className="px-3 pb-8">
          {[
            { icon: Pencil, color: "#3b82f6", bg: "rgba(59,130,246,0.12)", title: "Edit Listing", desc: "Update details & photos", sheet: "editListing" },
            { icon: Zap, color: "#f97316", bg: "rgba(249,115,22,0.12)", title: "Boost Listing", desc: "Get more visibility", sheet: "boost" },
            { icon: PauseCircle, color: "#eab308", bg: "rgba(234,179,8,0.12)", title: "Pause Listing", desc: "Temporarily hide", sheet: "pauseConfirm" },
            { icon: Share2, color: "#a855f7", bg: "rgba(168,85,247,0.12)", title: "Share Listing", desc: "Copy link or share", snack: "Link copied!" },
            { icon: Trash2, color: "#ef4444", bg: "rgba(239,68,68,0.12)", title: "Delete Listing", desc: "Permanently remove", sheet: "deleteListing", isDanger: true },
          ].map((action, i) => (
            <button
              key={i}
              onClick={() => {
                closeSheet();
                if (action.snack) {
                  setTimeout(() => showSnackbar(action.snack, "success"), 300);
                } else if (action.sheet) {
                  setTimeout(() => openSheet(action.sheet), 300);
                }
              }}
              className="w-full flex items-center gap-4 p-4 rounded-2xl mt-1"
              style={{ background: "rgba(255,255,255,0.03)" }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: action.bg }}>
                <action.icon className="w-5 h-5" style={{ color: action.color }} />
              </div>
              <div className="text-left">
                <p className={`text-sm font-semibold ${action.isDanger ? "" : "text-white"}`}
                   style={action.isDanger ? { color: "#ef4444" } : {}}>
                  {action.title}
                </p>
                <p className="text-xs" style={{ color: "#a3a3a3" }}>{action.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* LISTING DETAIL SHEET */}
      <ViewListingSheet
        isOpen={activeSheet === "detail"}
        onClose={closeSheet}
        listing={selectedListing}
        onEdit={() => openSheet("editListing")}
        onBoost={() => openSheet("boost")}
        onPause={() => openSheet("pauseConfirm")}
        onResume={() => selectedListing && handleForm("resume", selectedListing)}
        onDelete={() => openSheet("deleteListing")}
        onRenew={() => selectedListing && handleForm("renew", selectedListing)}
      />

      {/* EDIT LISTING */}
      <div className={`sheet-overlay ${activeSheet === "editListing" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "editListing" ? "active" : ""}`} style={{ maxHeight: "95dvh" }}>
        <div className="sheet-handle" />
        <div className="p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-white">Edit Listing</h3>
            <button onClick={closeSheet} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)" }}>
              <XIcon className="w-4 h-4" style={{ color: "#a3a3a3" }} />
            </button>
          </div>
          <div className="space-y-4">
            <div className="input-group">
              <input type="text" className="android-input" placeholder=" " value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
              <label style={{ top: editTitle ? "10px" : "50%", fontSize: editTitle ? "11px" : "16px", color: editTitle ? "#047857" : "#525252", fontWeight: editTitle ? 500 : 400 }}>Listing Title</label>
            </div>
            <div>
              <label className="text-xs font-medium block mb-2" style={{ color: "#a3a3a3" }}>Description</label>
              <textarea className="android-input" style={{ minHeight: "80px", borderRadius: "14px" }} value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
            </div>
            <div className="input-group">
              <input type="text" className="android-input" placeholder=" " value={editRent} onChange={(e) => setEditRent(e.target.value)} style={{ paddingLeft: "60px" }} />
              <label style={{ left: "60px", top: editRent ? "10px" : "50%", fontSize: editRent ? "11px" : "16px", color: editRent ? "#047857" : "#525252", fontWeight: editRent ? 500 : 400 }}>Monthly Rent</label>
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: "#a3a3a3" }}>KSh</span>
            </div>
            <button onClick={() => handleForm("edit-listing")} className="btn-primary ripple-container mt-2" disabled={formLoading === "edit-listing"}>
              {formLoading === "edit-listing" ? <div className="spinner mx-auto" /> : <span>Save Changes</span>}
            </button>
          </div>
        </div>
      </div>

      {/* BOOST */}
      <div className={`sheet-overlay ${activeSheet === "boost" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "boost" ? "active" : ""}`}>
        <div className="sheet-handle" />
        <div className="p-5">
          <div className="text-center mb-5">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3" style={{ background: "linear-gradient(135deg,rgba(217,119,6,0.15),rgba(245,158,11,0.15))", border: "1px solid rgba(245,158,11,0.2)" }}>
              <Zap className="w-7 h-7" style={{ color: "#f59e0b" }} />
            </div>
            <h3 className="text-lg font-bold text-white">Boost Your Listing</h3>
            <p className="text-xs mt-1" style={{ color: "#a3a3a3" }}>Get more views and inquiries</p>
          </div>

          <div className="space-y-2 mb-5">
            {[
              { days: 7, label: "7 Days", desc: "3x more visibility", price: "KSh 500", popular: false, best: false },
              { days: 14, label: "14 Days", desc: "5x more visibility", price: "KSh 800", popular: true, best: false },
              { days: 30, label: "30 Days", desc: "10x more visibility", price: "KSh 1,200", popular: false, best: true, icon: Crown },
            ].map((plan) => {
              const selected = boostDays === plan.days;
              return (
                <div
                  key={plan.days}
                  className={`boost-card ${selected ? "selected" : ""}`}
                  onClick={() => setBoostDays(plan.days)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(245,158,11,0.1)" }}>
                        {plan.icon ? <Crown className="w-5 h-5" style={{ color: "#f59e0b" }} /> : <Zap className="w-5 h-5" style={{ color: "#f59e0b" }} />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {plan.label}
                          {plan.popular && <span className="chip" style={{ background: "rgba(4,120,87,0.1)", color: "#047857", fontSize: "9px", marginLeft: "6px" }}>Popular</span>}
                          {plan.best && <span className="chip" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", fontSize: "9px", marginLeft: "6px" }}>Best Value</span>}
                        </p>
                        <p className="text-xs" style={{ color: "#a3a3a3" }}>{plan.desc}</p>
                      </div>
                    </div>
                    <p className="text-sm font-bold" style={{ color: "#f59e0b" }}>{plan.price}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl mb-5" style={{ background: "rgba(4,120,87,0.04)", border: "1px solid rgba(4,120,87,0.12)" }}>
            <Smartphone className="w-4 h-4" style={{ color: "#047857" }} />
            <p className="text-xs" style={{ color: "#a3a3a3" }}>Payment via <strong className="text-white">M-Pesa</strong></p>
          </div>

          <button onClick={() => handleForm("boost")} className="btn-primary ripple-container" style={{ background: "linear-gradient(to right,#d97706,#f59e0b)", boxShadow: "0 4px 20px rgba(245,158,11,0.3)" }} disabled={formLoading === "boost"}>
            {formLoading === "boost" ? <div className="spinner mx-auto" /> : <span>Boost for {boostPrices[boostDays]}</span>}
          </button>
          <button onClick={closeSheet} className="btn-secondary mt-2" style={{ padding: "12px" }}>Cancel</button>
        </div>
      </div>

      {/* PAUSE CONFIRM */}
      <div className={`sheet-overlay ${activeSheet === "pauseConfirm" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "pauseConfirm" ? "active" : ""}`}>
        <div className="sheet-handle" />
        <div className="p-5 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ background: "rgba(234,179,8,0.1)", border: "1px solid rgba(234,179,8,0.2)" }}>
            <PauseCircle className="w-8 h-8" style={{ color: "#eab308" }} />
          </div>
          <h3 className="text-lg font-bold text-white">Pause Listing?</h3>
          <p className="text-sm mt-2 leading-relaxed" style={{ color: "#a3a3a3" }}>
            This will hide your listing from tenants. You can resume it anytime.
          </p>
          <div className="flex gap-3 mt-6">
            <button onClick={closeSheet} className="btn-secondary flex-1" style={{ padding: "14px" }}>Cancel</button>
            <button onClick={() => handleForm("pause")} className="btn-danger flex-1" style={{ padding: "14px", background: "rgba(234,179,8,0.1)", borderColor: "rgba(234,179,8,0.2)", color: "#eab308" }} disabled={formLoading === "pause"}>
              {formLoading === "pause" ? <div className="spinner mx-auto" /> : <span>Pause</span>}
            </button>
          </div>
        </div>
      </div>

      {/* DELETE LISTING */}
      <div className={`sheet-overlay ${activeSheet === "deleteListing" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "deleteListing" ? "active" : ""}`}>
        <div className="sheet-handle" />
        <div className="p-5 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <Trash2 className="w-8 h-8" style={{ color: "#ef4444" }} />
          </div>
          <h3 className="text-lg font-bold text-white">Delete Listing?</h3>
          <p className="text-sm mt-2 leading-relaxed" style={{ color: "#a3a3a3" }}>
            This permanently removes the listing. All views and inquiry data will be lost.
          </p>
          <div className="flex gap-3 mt-6">
            <button onClick={closeSheet} className="btn-secondary flex-1" style={{ padding: "14px" }}>Cancel</button>
            <button onClick={() => handleForm("delete-listing")} className="btn-danger flex-1" style={{ padding: "14px" }} disabled={formLoading === "delete-listing"}>
              {formLoading === "delete-listing" ? <div className="spinner mx-auto" /> : <span>Delete</span>}
            </button>
          </div>
        </div>
      </div>

      {/* CREATE LISTING SHEET */}
      {user && (
        <CreateListingSheet
          isOpen={activeSheet === "createListing"}
          onClose={closeSheet}
          onSubmit={async (data) => {
            setFormLoading("create-listing");
            try {
              await createListing(user.uid, {
                propertyId: data.propertyId,
                propertyName: data.propertyName,
                unitId: data.unitId,
                unitName: data.unitName,
                title: data.title,
                description: data.description,
                rent: data.rent,
                amenities: data.amenities,
                images: [],
                status: data.status,
              });
              setFormLoading(null);
              closeSheet();
              setTimeout(() => {
                if (data.status === "draft") {
                  showSnackbar("Draft saved! 💾", "info");
                } else {
                  showSnackbar("Listing published! 🎉", "success");
                }
              }, 300);
            } catch (err: any) {
              setFormLoading(null);
              showSnackbar(err.message || "Something went wrong", "error");
            }
          }}
          loading={formLoading === "create-listing"}
          showSnackbar={showSnackbar}
          vacantUnits={vacantUnits}
          properties={properties.map(p => ({ id: p.id, name: p.name }))}
          initialData={createListingInitial}
        />
      )}

      {/* MORE MENU SHEET */}
      <div className={`sheet-overlay ${activeSheet === "moreMenu" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "moreMenu" ? "active" : ""}`}>
        <div className="sheet-handle" />
        <div className="p-5 pb-2">
          <h3 className="text-lg font-bold text-white">More</h3>
          <p className="text-xs mt-1" style={{ color: "#a3a3a3" }}>All modules &amp; settings</p>
        </div>
        <div className="px-3 pb-8">
          {[
            { icon: MessageCircle, label: "Inquiries", desc: "3 new inquiries", color: "#047857", path: "/inquiries" },
            { icon: Layers, label: "Units", desc: "8 units across 4 properties", color: "#3b82f6", path: "/units" },
            { icon: CalendarDays, label: "Viewings", desc: "8 viewing requests", color: "#eab308", path: "/viewings" },
            { icon: CalendarDays, label: "Calendar", desc: "Viewings & schedule", color: "#eab308", path: "/calendar" },
            { icon: MessageSquare, label: "Messages", desc: "18 conversations", color: "#a855f7", path: "/messages" },
            { icon: DoorOpen, label: "Vacating", desc: "Move-out management", color: "#f97316", path: "/vacating" },
            { icon: BadgeCheck, label: "Rent Verification", desc: "Review & confirm payments", color: "#6366f1", path: "/rent-verification" },
            { icon: Megaphone, label: "Notices", desc: "Broadcast to tenants", color: "#f97316", path: "/notices" },
            { icon: MessageSquareWarning, label: "Complaints", desc: "Tenant issues & maintenance", color: "#ef4444", path: "/complaints" },
            { icon: Settings, label: "Settings", desc: "Account & preferences", color: "#525252", path: "/settings" },
          ].map((item, i) => (
            <button
              key={i}                onClick={() => {
                  closeSheet();
                  if (item.path) {
                    router.push(item.path);
                  }
                }}
              className="w-full flex items-center gap-4 p-4 rounded-2xl mt-1"
              style={{ background: "rgba(255,255,255,0.03)" }}
            >
              <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "rgba(4,120,87,0.08)", border: "1px solid rgba(255,255,255,0.04)" }}>
                <item.icon className="w-5 h-5" style={{ color: item.color }} />
              </div>
              <div className="text-left flex-1">
                <p className="text-sm font-semibold text-white">{item.label}</p>
                <p className="text-xs" style={{ color: "#a3a3a3" }}>{item.desc}</p>
              </div>
              {item.path && <ChevronRight className="w-4 h-4" style={{ color: "#525252" }} />}
            </button>
          ))}
        </div>
      </div>

      {/* PERFORMANCE SHEET */}
      <div className={`sheet-overlay ${activeSheet === "performance" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "performance" ? "active" : ""}`}>
        <div className="sheet-handle" />
        <div className="p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-white">Listing Performance</h3>
            <button onClick={closeSheet} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)" }}>
              <XIcon className="w-4 h-4" style={{ color: "#a3a3a3" }} />
            </button>
          </div>
          <div className="space-y-4">
            {(() => {
              if (!selectedListing) return null;
              const sl = selectedListing;
              const score = Math.min(Math.round(((sl.views + sl.inquiries * 10 + sl.saves * 2) / 100) * 100), 100);
              const convRate = sl.views > 0 ? ((sl.inquiries / sl.views) * 100).toFixed(1) : '0';
              const scoreColor = score >= 80 ? '#047857' : score >= 50 ? '#eab308' : '#ef4444';
              const boostDaysLeft = sl.boosted && sl.expiresAt ? Math.ceil((sl.expiresAt.toDate().getTime() - Date.now()) / 86400000) : 0;
              const thisWeekViews = Math.round(sl.views * 0.15);
              return <>
            <div className="p-4 rounded-2xl" style={{ background: `${scoreColor}0a`, border: `1px solid ${scoreColor}22` }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs" style={{ color: "#a3a3a3" }}>Overall Score</span>
                <span className="text-lg font-bold" style={{ color: scoreColor }}>{score}%</span>
              </div>
              <div className="w-full h-2 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div className="h-full rounded-full" style={{ width: `${score}%`, background: `linear-gradient(to right,${scoreColor},#10b981)` }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
                <p className="text-xs" style={{ color: "#525252" }}>Views This Week</p>
                <p className="text-base font-bold text-white">+{thisWeekViews}</p>
              </div>
              <div className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
                <p className="text-xs" style={{ color: "#525252" }}>Conversion</p>
                <p className="text-base font-bold text-white">{convRate}%</p>
              </div>
            </div>
            <h4 className="text-xs font-semibold uppercase tracking-wider mb-2 mt-4" style={{ color: "#525252" }}>Insights</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)" }}>
                <TrendingUp className="w-4 h-4" style={{ color: score >= 50 ? '#047857' : '#ef4444' }} />
                <p className="text-sm" style={{ color: "#a3a3a3" }}>{sl.views} total views · {sl.inquiries} inquiries · {sl.saves} saves</p>
              </div>
              {sl.boosted && (
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)" }}>
                <Zap className="w-4 h-4" style={{ color: '#f59e0b' }} />
                <p className="text-sm" style={{ color: "#a3a3a3" }}>Boost active — {boostDaysLeft} days remaining</p>
              </div>
              )}
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)" }}>
                <Smartphone className="w-4 h-4" style={{ color: '#3b82f6' }} />
                <p className="text-sm" style={{ color: "#a3a3a3" }}>Most views from Mobile</p>
              </div>
            </div>
            </>;
            })()}
            <button onClick={() => { closeSheet(); setTimeout(() => openSheet("boost"), 300); }} className="btn-primary mt-4 py-4 ripple-container">
              <span>Improve Performance</span>
            </button>
          </div>
        </div>
      </div>

      {/* INQUIRY STATS SHEET */}
      <div className={`sheet-overlay ${activeSheet === "inquiryStats" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "inquiryStats" ? "active" : ""}`}>
        <div className="sheet-handle" />
        <div className="p-5">
          {(() => {
            const sl = selectedListing;
            const views = sl?.views || 0;
            const inqs = sl?.inquiries || 0;
            const saves = sl?.saves || 0;
            return <>
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-white">Inquiry Stats</h3>
            <button onClick={closeSheet} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)" }}>
              <XIcon className="w-4 h-4" style={{ color: "#a3a3a3" }} />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="text-center">
              <p className="text-xl font-bold text-white">{views}</p>
              <p className="text-xs" style={{ color: "#a3a3a3" }}>Views</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-white">{inqs}</p>
              <p className="text-xs" style={{ color: "#a3a3a3" }}>Inquiries</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-white">{saves}</p>
              <p className="text-xs" style={{ color: "#a3a3a3" }}>Saves</p>
            </div>
          </div>
          <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#525252" }}>Recent Inquiries</h4>
          <div className="space-y-2">
            <div className="text-center py-6">
              <p className="text-sm" style={{ color: "#a3a3a3" }}>View inquiries for this listing on the inquiries page</p>
            </div>
          </div>
          <button onClick={() => router.push("/inquiries")} className="w-full text-center text-sm font-semibold mt-6" style={{ color: "#047857" }}>
            See All Inquiries →
          </button>
          </>;
          })()}
        </div>
      </div>

      {/* SNACKBAR */}
      {snackbarVisible && (
        <div className={`snackbar ${snackbarAnimClass}`}>
          <div className="flex items-center gap-3">
            <div>{snackbarIcon()}</div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">{snackbar.message}</p>
            </div>
            <button onClick={hideSnackbar} className="p-1">
              <X className="w-4 h-4" style={{ color: "#525252" }} />
            </button>
          </div>
        </div>
      )}
    </div>
      </AuthGuard>
  );
}

// Wrap in Suspense for useSearchParams compatibility with static export
export default function ListingsPageWrapper() {
  return (
    <Suspense fallback={<div style={{ background: "#050505", minHeight: "100dvh" }} />}>
      <ListingsPage />
    </Suspense>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import BottomNavAndMenu from "@/app/components/BottomNavAndMenu";
import {
  Search,
  Building2,
  MapPin,
  MoreVertical,
  Plus,
  LayoutDashboard,
  CalendarDays,
  MessageSquare,
  Menu,
  ChevronRight,
  Pencil,
  Layers,
  EyeOff,
  Play,
  Share2,
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
  Grid2x2,
  List,
  Link,
  MessageCircle,
  Image,
  AlertCircle,
  Phone,
  Wrench,
  Settings,
  FileText,
  ShieldCheck,
  ScrollText,
  X as XIcon,
  Zap,
  Loader2,
} from "lucide-react";

import { useRouter } from "next/navigation";
import {
  PROPERTY_TYPE_OPTIONS,
  PROPERTY_AMENITIES,
  COUNTY_OPTIONS,
} from "../constants";
import AuthGuard from "../components/AuthGuard";
import { PROPERTY_DETAIL_AMENITIES } from "../constants";
import { useAuth } from "../AuthContext";
import {
  listenToProperties,
  addProperty,
  updateProperty,
  deleteProperty,
  type PropertyData,
} from "../../lib/properties";
import {
  listenToPropertyUnits,
  addUnit,
  type UnitData,
} from "../../lib/units";
import ViewPropertySheet from "./ViewPropertySheet";
import AddPropertySheet from "./AddPropertySheet";
import EditPropertySheet from "./EditPropertySheet";
import AddUnitSheet from "./AddUnitSheet";

type ViewMode = "list" | "grid";
type SnackbarType = "success" | "error" | "info";

export default function PropertiesPage() {
  const router = useRouter();

  // ---- Tab State ----
  const [activeTab, setActiveTab] = useState("properties");

  // ---- Sheet State ----
  const [activeSheet, setActiveSheet] = useState<string | null>(null);

  // ---- View Mode ----
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  // ---- Active Filter ----
  const [activeFilter, setActiveFilter] = useState("all");

  // ---- Sort Label ----
  const [sortLabel, setSortLabel] = useState("Recently Added");

  // ---- Search Text ----
  const [searchText, setSearchText] = useState("");

  // ---- Filter State ----
  const [filterTypes, setFilterTypes] = useState<string[]>([]);
  const [filterCounty, setFilterCounty] = useState("");

  // ---- Detail Tab ----
  const [activeDetailTab, setActiveDetailTab] = useState("overview");

  // ---- Unit Filter ----
  const [activeUnitFilter, setActiveUnitFilter] = useState("all");

  // ---- Snackbar ----
  const [snackbar, setSnackbar] = useState<{ show: boolean; message: string; type: SnackbarType }>({ show: false, message: "", type: "info" });
  const snackbarTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarAnimClass, setSnackbarAnimClass] = useState("");

  // ---- Loading states ----
  const [formLoading, setFormLoading] = useState<string | null>(null);

  // ---- Auth ----
  const { user } = useAuth();

  // ---- Firestore Properties State ----
  const [properties, setProperties] = useState<PropertyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<PropertyData | null>(null);

  // ---- Units state for detail tab ----
  const [propertyUnits, setPropertyUnits] = useState<UnitData[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<UnitData | null>(null);

  // ---- Computed Stats (derivable from property data) ----
  const propertyStats = {
    total: properties.length,
    totalUnits: properties.reduce((sum, p) => sum + p.totalUnits, 0),
    occupiedUnits: properties.reduce((sum, p) => sum + p.occupiedUnits, 0),
    vacantUnits: properties.reduce((sum, p) => sum + (p.totalUnits - p.occupiedUnits), 0),
  };

  const filteredProperties = properties
    .filter((p) => {
      if (activeFilter === "all") return true;
      return p.status === activeFilter;
    })
    .filter((p) => {
      if (!searchText.trim()) return true;
      const q = searchText.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q) ||
        p.county.toLowerCase().includes(q) ||
        p.type.toLowerCase().includes(q)
      );
    })
    .filter((p) => {
      if (filterTypes.length > 0 && !filterTypes.includes(p.type)) return false;
      if (filterCounty && p.county !== filterCounty) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortLabel) {
        case "Name (A-Z)": return a.name.localeCompare(b.name);
        case "Highest Revenue": return b.revenue - a.revenue;
        case "Most Units": return b.totalUnits - a.totalUnits;
        case "Highest Occupancy": return (b.occupiedUnits / Math.max(b.totalUnits, 1)) - (a.occupiedUnits / Math.max(a.totalUnits, 1));
        default: return 0; // "Recently Added" — rely on Firestore order
      }
    });

  // ---- Helper to derive display values from a PropertyData ----
  function deriveProp(p: PropertyData) {
    const occupied = p.occupiedUnits;
    const total = p.totalUnits;
    const occupancyPct = total > 0 ? Math.round((occupied / total) * 100) : 0;
    let statusLabel: string;
    let statusColor: string;
    if (p.paused) {
      statusLabel = "Paused";
      statusColor = "rgba(234,179,8,0.9)";
    } else if (occupancyPct >= 80) {
      statusLabel = "Active";
      statusColor = "rgba(4,120,87,0.9)";
    } else if (occupancyPct >= 30) {
      statusLabel = "Partial";
      statusColor = "rgba(234,179,8,0.9)";
    } else {
      statusLabel = "Vacant";
      statusColor = "rgba(239,68,68,0.9)";
    }
    return {
      img: `prop-${p.id}`,
      statusLabel,
      statusColor,
      occupancyPct,
      isPaused: p.paused,
      revenueLabel: p.revenue >= 1000000
        ? (p.revenue / 1000000).toFixed(1) + "M"
        : p.revenue >= 1000
          ? Math.round(p.revenue / 1000) + "K"
          : String(p.revenue),
    };
  }

  // ---- Firestore Listener ----
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    const unsub = listenToProperties(
      user.uid,
      (props) => {
        setProperties(props);
        setLoading(false);
      },
      (err) => {
        console.error("Error loading properties:", err);
        setLoading(false);
        showSnackbar("Failed to load properties", "error");
      }
    );
    return () => unsub();
  }, [user]);

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
  const closeSheet = () => {
    if (activeSheet === "unitDetail" || activeSheet === "detail") {
      setSelectedUnit(null);
    }
    setActiveSheet(null);
  };

  // ---- Form Handler ----
  const handleForm = async (id: string) => {
    setFormLoading(id);

    try {
      if (id === "delete" && selectedProperty) {
        await deleteProperty(selectedProperty.id);
        setSelectedProperty(null);
        setFormLoading(null);
        closeSheet();
        setTimeout(() => showSnackbar("Property deleted permanently", "error"), 300);
        return;
      }

      if (id === "pause" && selectedProperty) {
        await updateProperty(selectedProperty.id, { paused: true });
        setFormLoading(null);
        closeSheet();
        setTimeout(() => showSnackbar("Property listing paused", "success"), 300);
        return;
      }

      if (id === "resume" && selectedProperty) {
        await updateProperty(selectedProperty.id, { paused: false });
        setFormLoading(null);
        closeSheet();
        setTimeout(() => showSnackbar("Property listing resumed!", "success"), 300);
        return;
      }
    } catch (err: any) {
      setFormLoading(null);
      showSnackbar(err.message || "Something went wrong", "error");
    }
  };



  // ---- Listen to units for selected property ----
  useEffect(() => {
    if (!selectedProperty) {
      setPropertyUnits([]);
      return;
    }
    setUnitsLoading(true);
    const unsub = listenToPropertyUnits(
      selectedProperty.id,
      (units) => {
        setPropertyUnits(units);
        setUnitsLoading(false);
      },
      (err) => {
        console.error("Error loading units:", err);
        setUnitsLoading(false);
      }
    );
    return () => unsub();
  }, [selectedProperty]);



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

  // ---- Detail Tab ----
  const switchDetailTab = (tab: string) => setActiveDetailTab(tab);

  return (
    <AuthGuard>

    <div style={{ background: "#050505", color: "#e5e5e5", fontFamily: "'Inter', sans-serif" }}>
      <div className="app-shell">
        <div className="status-bar" />

        {/* HEADER */}
        <div className="app-header">
          <div className="flex items-center justify-between px-5 pt-2 pb-1">
            <div>
              <h1 className="text-xl font-bold text-white">Properties</h1>
              <p className="text-xs mt-0.5" style={{ color: "#a3a3a3" }}>
                {properties.length} properties • {propertyStats.totalUnits} units
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <div
                  className={`view-toggle-btn ${viewMode === "list" ? "active" : ""}`}
                  onClick={() => setViewMode("list")}
                >
                  <List className="w-4 h-4" style={{ color: viewMode === "list" ? "#047857" : "#a3a3a3" }} />
                </div>
                <div
                  className={`view-toggle-btn ${viewMode === "grid" ? "active" : ""}`}
                  onClick={() => setViewMode("grid")}
                >
                  <Grid2x2 className="w-4 h-4" style={{ color: viewMode === "grid" ? "#047857" : "#a3a3a3" }} />
                </div>
              </div>
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
                Search properties, locations...
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

          {/* Quick Stats Row */}
          <div className="grid grid-cols-4 gap-2 px-5 py-2">
            <div className="p-2.5 rounded-xl text-center" style={{ background: "rgba(4,120,87,0.06)", border: "1px solid rgba(4,120,87,0.15)" }}>
              <p className="text-base font-bold" style={{ color: "#047857" }}>{propertyStats.totalUnits}</p>
              <p className="text-xs" style={{ color: "#047857" }}>Total Units</p>
            </div>
            <div className="p-2.5 rounded-xl text-center" style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.15)" }}>
              <p className="text-base font-bold" style={{ color: "#3b82f6" }}>{propertyStats.occupiedUnits}</p>
              <p className="text-xs" style={{ color: "#3b82f6" }}>Occupied</p>
            </div>
            <div className="p-2.5 rounded-xl text-center" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
              <p className="text-base font-bold" style={{ color: "#ef4444" }}>{propertyStats.vacantUnits}</p>
              <p className="text-xs" style={{ color: "#ef4444" }}>Vacant</p>
            </div>
            <div className="p-2.5 rounded-xl text-center" style={{ background: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.15)" }}>
              <p className="text-base font-bold" style={{ color: "#a855f7" }}>{propertyStats.total}</p>
              <p className="text-xs" style={{ color: "#a855f7" }}>Properties</p>
            </div>
          </div>

          {/* Filter Chips */}
          <div className="filter-scroll py-1 pb-2">
            {(() => {
              const counts = {
                all: properties.length,
                active: properties.filter((p) => p.status === "active").length,
                partial: properties.filter((p) => p.status === "partial").length,
                vacant: properties.filter((p) => p.status === "vacant").length,
              };
              return [
                { key: "all", label: "All", count: counts.all },
                { key: "active", label: "Active", count: counts.active, dot: "#047857" },
                { key: "partial", label: "Partial", count: counts.partial, dot: "#eab308" },
                { key: "vacant", label: "Vacant", count: counts.vacant, dot: "#ef4444" },
              ].map((f) => (
                <button
                  key={f.key}
                  className={`filter-chip ${activeFilter === f.key ? "active" : ""}`}
                  onClick={() => {
                    setActiveFilter(f.key);
                    showSnackbar(`Showing ${f.label.toLowerCase()} properties`, "info");
                  }}
                >
                  {f.dot && <span className="w-2 h-2 rounded-full" style={{ background: f.dot }} />}
                  {f.label}
                  <span className="count">{f.count}</span>
                </button>
              ));
            })()}
          </div>

          {/* Sort Bar */}
          <div
            className="flex items-center justify-between px-5 py-2"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
          >
            <button
              onClick={() => openSheet("sort")}
              className="flex items-center gap-1.5 text-xs font-medium"
              style={{ color: "#a3a3a3" }}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>{sortLabel}</span>
              <ChevronRight className="w-3 h-3" />
            </button>
            <p className="text-xs" style={{ color: "#525252" }}>
              Showing {filteredProperties.length} properties
            </p>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="app-content">
          <div className={`px-5 pb-28 pt-3 ${viewMode === "grid" ? "grid-view" : ""}`}>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#047857" }} />
                <p className="text-sm mt-3" style={{ color: "#a3a3a3" }}>Loading properties...</p>
              </div>
            ) : filteredProperties.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Building2 className="w-12 h-12 mb-3" style={{ color: "#525252" }} />
                <p className="text-base font-semibold text-white">No properties yet</p>
                <p className="text-sm mt-1" style={{ color: "#a3a3a3" }}>Add your first property to get started</p>
              </div>
            ) : filteredProperties.map((prop, i) => {
              const d = deriveProp(prop);
              return (
              <div
                key={prop.id}
                className="property-list-card mb-3 animate-in"
                style={{ animationDelay: `${0.05 + i * 0.05}s` }}
                onClick={() => { setSelectedProperty(prop); openSheet("detail"); }}
              >
                {viewMode === "list" ? (
                  <div className="flex" style={{ opacity: d.isPaused ? 0.75 : 1 }}>
                    <div className="relative flex-shrink-0" style={{ width: "120px" }}>
                      <img
                        src={prop.images?.[0] || `https://picsum.photos/seed/prop-${prop.id}/240/240.jpg`}
                        alt=""
                        className="w-full h-full object-cover"
                        style={{ minHeight: "140px", filter: d.isPaused ? "grayscale(40%)" : "none" }}
                      />
                      <div className="absolute top-2 left-2">
                        <span
                          className="chip text-white"
                          style={{ background: d.statusColor, fontSize: "10px", padding: "4px 8px" }}
                        >
                          {d.statusLabel}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 p-3.5 flex flex-col justify-between min-w-0">
                      <div>
                        <div className="flex items-start justify-between">
                          <h3 className="text-sm font-bold text-white truncate pr-2">
                            {prop.name}
                          </h3>
                          <button
                            onClick={(e) => { e.stopPropagation(); openSheet("actions"); setSelectedProperty(prop); }}
                            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ background: "rgba(255,255,255,0.04)" }}
                          >
                            <MoreVertical className="w-4 h-4" style={{ color: "#525252" }} />
                          </button>
                        </div>
                        <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: "#a3a3a3" }}>
                          <MapPin className="w-3 h-3" /> {prop.location}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="chip" style={{ background: "rgba(255,255,255,0.04)", color: "#a3a3a3", fontSize: "10px", padding: "3px 8px" }}>
                            {prop.type}
                          </span>
                          <span className="chip" style={{ background: "rgba(255,255,255,0.04)", color: "#a3a3a3", fontSize: "10px", padding: "3px 8px" }}>
                            {prop.totalUnits} Units
                          </span>
                          <span className="chip" style={{
                            background: d.occupancyPct >= 80 ? "rgba(4,120,87,0.08)" : d.occupancyPct >= 30 ? "rgba(234,179,8,0.08)" : "rgba(239,68,68,0.08)",
                            color: d.occupancyPct >= 80 ? "#047857" : d.occupancyPct >= 30 ? "#eab308" : "#ef4444",
                            fontSize: "10px", padding: "3px 8px"
                          }}>
                            {prop.occupiedUnits}/{prop.totalUnits} Full
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div>
                          <p className="text-xs" style={{ color: "#525252" }}>Revenue</p>
                          <p className="text-sm font-bold" style={{ color: "#047857" }}>
                            KSh {d.revenueLabel}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs" style={{ color: "#525252" }}>Occupancy</p>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: d.occupancyPct + "%",
                                  background: d.occupancyPct >= 80 ? "#047857" : d.occupancyPct >= 30 ? "#eab308" : "#ef4444",
                                }}
                              />
                            </div>
                            <span
                              className="text-xs font-semibold"
                              style={{
                                color: d.occupancyPct >= 80 ? "#047857" : d.occupancyPct >= 30 ? "#eab308" : "#ef4444",
                              }}
                            >
                              {d.occupancyPct}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Grid view card */
                  <div style={{ opacity: d.isPaused ? 0.75 : 1 }}>
                    <div className="relative">
                      <img
                        src={prop.images?.[0] || `https://picsum.photos/seed/prop-${prop.id}/240/240.jpg`}
                        alt=""
                        className="w-full property-img object-cover"
                        style={{ height: "110px", filter: d.isPaused ? "grayscale(40%)" : "none" }}
                      />
                      <div className="absolute top-2 left-2">
                        <span className="chip text-white" style={{ background: d.statusColor, fontSize: "10px", padding: "3px 7px" }}>
                          {d.statusLabel}
                        </span>
                      </div>
                    </div>
                    <div className="p-3">
                      <h3 className="text-sm font-bold text-white truncate">{prop.name}</h3>
                      <p className="text-xs mt-0.5 truncate" style={{ color: "#a3a3a3" }}>
                        <MapPin className="w-3 h-3 inline" /> {prop.location}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs" style={{ color: "#047857" }}>KSh {d.revenueLabel}</p>
                        <p className="text-xs" style={{ color: "#a3a3a3" }}>{d.occupancyPct}%</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );})}
            <div className="h-4" />
          </div>
        </div>

        {/* FAB */}
        <button
          onClick={() => openSheet("addProperty")}
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
          <span className="text-sm font-semibold text-white">Add Property</span>
        </button>

        <BottomNavAndMenu />
      </div>

      {/* ====== BOTTOM SHEETS ====== */}

      {/* SORT SHEET */}
      <div className={`sheet-overlay ${activeSheet === "sort" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "sort" ? "active" : ""}`}>
        <div className="sheet-handle" />
        <div className="p-5">
          <h3 className="text-base font-bold text-white mb-4">Sort By</h3>
          <div className="space-y-1">
            {["Recently Added", "Name (A-Z)", "Highest Revenue", "Most Units", "Highest Occupancy"].map((s) => (
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

      {/* SEARCH SHEET */}
      <div className={`sheet-overlay ${activeSheet === "search" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "search" ? "active" : ""}`} style={{ maxHeight: "95dvh" }}>
        <div className="sheet-handle" />
        <div className="p-5">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "#525252" }} />
              <input type="text" className="android-input" style={{ paddingLeft: "44px", borderRadius: "14px" }} placeholder="Search properties..." value={searchText} onChange={(e) => setSearchText(e.target.value)} />
            </div>
            <button onClick={closeSheet} className="text-sm font-semibold" style={{ color: "#047857" }}>Cancel</button>
          </div>
          <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#525252" }}>Recent</h4>
          <div className="flex flex-wrap gap-2">
            {["Kilimani", "Bedsitter"].map((s) => (
              <button key={s} className="chip" style={{ background: "rgba(255,255,255,0.05)", color: "#a3a3a3" }}>
                <Clock className="w-3 h-3" /> {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* FILTER SHEET */}
      <div className={`sheet-overlay ${activeSheet === "filter" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "filter" ? "active" : ""}`}>
        <div className="sheet-handle" />
        <div className="p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-white">Filters</h3>
            <button
              onClick={() => { setFilterTypes([]); setFilterCounty(""); }}
              className="text-sm font-semibold"
              style={{ color: "#047857" }}
            >
              Reset All
            </button>
          </div>
          <div className="space-y-5">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#525252" }}>
                Property Type
              </label>
              <div className="flex flex-wrap gap-2 mt-2">
                {PROPERTY_TYPE_OPTIONS.map((t) => {
                  const selected = filterTypes.includes(t);
                  return (
                  <button
                    key={t}
                    className={`filter-chip ${selected ? "active" : ""}`}
                    style={selected ? { background: "rgba(4,120,87,0.12)", color: "#047857" } : {}}
                    onClick={() => {
                      setFilterTypes(prev =>
                        prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
                      );
                    }}
                  >
                    {t}
                  </button>
                )})}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#525252" }}>
                County
              </label>
              <select className="android-select mt-2" value={filterCounty} onChange={(e) => setFilterCounty(e.target.value)}>
                <option value="">All Counties</option>
                {COUNTY_OPTIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={() => { setFilterTypes([]); setFilterCounty(""); showSnackbar("Filters reset", "info"); }} className="btn-secondary flex-1" style={{ padding: "14px" }}>Reset</button>
            <button onClick={() => { closeSheet(); showSnackbar(`Filters applied (${filterTypes.length || 'all'} types)`, "success"); }} className="btn-primary flex-1 ripple-container" style={{ padding: "14px" }}>Apply</button>
          </div>
        </div>
      </div>

      {/* ACTIONS SHEET */}
      <div className={`sheet-overlay ${activeSheet === "actions" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "actions" ? "active" : ""}`}>
        <div className="sheet-handle" />
        <div className="p-5 pb-2"><h3 className="text-base font-bold text-white">Property Actions</h3></div>
        <div className="px-3 pb-8">
          {(() => {
            const isPaused = selectedProperty?.paused;
            return [
              { icon: Pencil, color: "#3b82f6", bg: "rgba(59,130,246,0.12)", title: "Edit Property", desc: "Update details & photos", action: "editProperty" },
              { icon: Layers, color: "#047857", bg: "rgba(4,120,87,0.12)", title: "Manage Units", desc: "Add, edit or remove units", action: "navigate:/units" },
              { icon: Zap, color: "#f59e0b", bg: "rgba(245,158,11,0.12)", title: "List on Marketplace", desc: "Create a listing from this property", action: "navigateToListings" },
              isPaused
                ? { icon: Play, color: "#047857", bg: "rgba(4,120,87,0.12)", title: "Resume Listing", desc: "Show on tenant browse again", action: "resumeConfirm" }
                : { icon: EyeOff, color: "#eab308", bg: "rgba(234,179,8,0.12)", title: "Pause Listing", desc: "Temporarily hide from tenants", action: "pauseProperty" },
              { icon: Share2, color: "#a855f7", bg: "rgba(168,85,247,0.12)", title: "Share Listing", desc: "Copy link or share", action: "share" },
              { icon: Trash2, color: "#ef4444", bg: "rgba(239,68,68,0.12)", title: "Delete Property", desc: "Permanently remove", action: "deleteConfirm" },
            ];
          })().map((action, i) => (
            <button
              key={i}
              onClick={() => {      closeSheet();
      if (action.action.startsWith("snack:")) {
        setTimeout(() => showSnackbar(action.action.replace("snack:", ""), action.action.includes("paused") ? "success" : "info"), 300);
      } else if (action.action === "navigateToListings" && selectedProperty) {
        router.push(`/listings?createFromProperty=${selectedProperty.id}&propertyName=${encodeURIComponent(selectedProperty.name)}`);
      } else if (action.action.startsWith("navigate:")) {
        router.push(action.action.replace("navigate:", ""));
      } else if (action.action === "resumeConfirm") {
        setTimeout(() => openSheet("resumeProperty"), 300);
      } else {
        setTimeout(() => openSheet(action.action), 300);
      }
    }}
    className="w-full flex items-center gap-4 p-4 rounded-2xl mt-1"
    style={{ background: "rgba(255,255,255,0.03)" }}
  >
    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: action.bg }}>
      <action.icon className="w-5 h-5" style={{ color: action.color }} />
    </div>
    <div className="text-left">
      <p className={`text-sm font-semibold ${action.title === "Delete Property" ? "" : "text-white"}`}
         style={action.title === "Delete Property" ? { color: "#ef4444" } : {}}>
        {action.title}
      </p>
      <p className="text-xs" style={{ color: "#a3a3a3" }}>{action.desc}</p>
    </div>
  </button>
          ))}
        </div>
      </div>

      {/* ADD PROPERTY SHEET */}
      {user && (
        <AddPropertySheet
          isOpen={activeSheet === "addProperty"}
          onClose={closeSheet}
          onSubmit={async (data) => {
            setFormLoading("add-prop");
            try {
              await addProperty(user.uid, {
                name: data.name,
                location: data.location,
                county: data.county,
                type: data.type,
                description: data.description,
                totalUnits: parseInt(data.units) || 0,
                rentMin: parseInt(data.rentMin.replace(/,/g, "")) || 0,
                rentMax: parseInt(data.rentMax.replace(/,/g, "")) || 0,
                amenities: data.amenities,
                images: data.images,
              });
              setFormLoading(null);
              closeSheet();
              setTimeout(() => showSnackbar("Property added successfully! 🎉", "success"), 300);
            } catch (err: any) {
              setFormLoading(null);
              showSnackbar(err.message || "Something went wrong", "error");
            }
          }}
          loading={formLoading === "add-prop"}
          showSnackbar={showSnackbar}
          userId={user.uid}
        />
      )}

      {/* EDIT PROPERTY SHEET */}
      {user && selectedProperty && (
        <EditPropertySheet
          isOpen={activeSheet === "editProperty"}
          onClose={closeSheet}
          onSubmit={async (data) => {
            setFormLoading("edit-prop");
            try {
              await updateProperty(selectedProperty.id, {
                name: data.name,
                location: data.location,
                county: data.county,
                type: data.type,
                description: data.description,
                totalUnits: parseInt(data.units) || 0,
                rentMin: parseInt(data.rentMin.replace(/,/g, "")) || 0,
                rentMax: parseInt(data.rentMax.replace(/,/g, "")) || 0,
                amenities: data.amenities,
                images: data.images,
              });
              setFormLoading(null);
              closeSheet();
              setTimeout(() => showSnackbar("Property updated! ✅", "success"), 300);
            } catch (err: any) {
              setFormLoading(null);
              showSnackbar(err.message || "Something went wrong", "error");
            }
          }}
          property={selectedProperty}
          loading={formLoading === "edit-prop"}
          showSnackbar={showSnackbar}
          userId={user.uid}
        />
      )}

      {/* SHARE SHEET */}
      <div className={`sheet-overlay ${activeSheet === "share" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "share" ? "active" : ""}`}>
        <div className="sheet-handle" />
        <div className="p-5">
          <h3 className="text-lg font-bold text-white mb-1">Share Listing</h3>
          <p className="text-xs mb-5" style={{ color: "#a3a3a3" }}>Share with potential tenants</p>
          <div className="space-y-2">
            {(() => {
              const shareUrl = selectedProperty ? `https://rentke.co.ke/property/${selectedProperty.id}` : 'https://rentke.co.ke';
              const shareText = selectedProperty ? `Check out "${selectedProperty.name}" in ${selectedProperty.location} — KSh ${selectedProperty.rentMin.toLocaleString()}/mo on RentKe!` : 'Check out this property on RentKe!';
              const shareItems = [
                { icon: Link, color: "#047857", bg: "rgba(4,120,87,0.12)", label: "Copy Link", 
                  onClick: () => { navigator.clipboard?.writeText(shareUrl); showSnackbar("Link copied!", "success"); } },
                { icon: MessageCircle, color: "#25D366", bg: "rgba(37,211,102,0.12)", label: "WhatsApp",
                  onClick: () => { window.open(`https://wa.me/?text=${encodeURIComponent(shareText + " " + shareUrl)}`, "_blank"); } },
                { icon: Image, color: "#f97316", bg: "rgba(249,115,22,0.12)", label: "Download Flyer",
                  onClick: () => { showSnackbar("Downloading flyer...", "success"); } },
              ];
              return shareItems.map((item, i) => (
              <button
                key={i}
                onClick={() => { closeSheet(); item.onClick(); }}
                className="w-full flex items-center gap-4 p-4 rounded-2xl"
                style={{ background: "rgba(255,255,255,0.03)" }}
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: item.bg }}>
                  <item.icon className="w-5 h-5" style={{ color: item.color }} />
                </div>
                <div className="text-left"><p className="text-sm font-semibold text-white">{item.label}</p></div>
              </button>
              ));
            })()}
          </div>
        </div>
      </div>

      {/* PAUSE PROPERTY SHEET */}
      <div className={`sheet-overlay ${activeSheet === "pauseProperty" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "pauseProperty" ? "active" : ""}`}>
        <div className="sheet-handle" />
        <div className="p-5 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ background: "rgba(234,179,8,0.1)", border: "1px solid rgba(234,179,8,0.2)" }}>
            <EyeOff className="w-8 h-8" style={{ color: "#eab308" }} />
          </div>
          <h3 className="text-lg font-bold text-white">Pause Listing?</h3>
          <p className="text-sm mt-2 leading-relaxed" style={{ color: "#a3a3a3" }}>
            This will temporarily hide <strong className="text-white">{selectedProperty?.name || "this property"}</strong> from the public browse page. You can resume it at any time.
          </p>
          <div className="flex gap-3 mt-6">
            <button onClick={closeSheet} className="btn-secondary flex-1" style={{ padding: "14px" }}>Cancel</button>
            <button
              onClick={async () => {
                if (!selectedProperty) return;
                setFormLoading("pause");
                try {
                  await updateProperty(selectedProperty.id, { paused: true });
                  closeSheet();
                  setTimeout(() => showSnackbar("Property listing paused", "success"), 300);
                } catch (err: any) {
                  showSnackbar(err.message || "Failed to pause listing", "error");
                } finally {
                  setFormLoading(null);
                }
              }}
              className="btn-danger flex-1"
              style={{ padding: "14px", background: "rgba(234,179,8,0.1)", borderColor: "rgba(234,179,8,0.2)", color: "#eab308" }}
              disabled={formLoading === "pause"}
            >
              {formLoading === "pause" ? <div className="spinner mx-auto" /> : <span>Pause</span>}
            </button>
          </div>
        </div>
      </div>

      {/* RESUME PROPERTY SHEET */}
      <div className={`sheet-overlay ${activeSheet === "resumeProperty" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "resumeProperty" ? "active" : ""}`}>
        <div className="sheet-handle" />
        <div className="p-5 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ background: "rgba(4,120,87,0.1)", border: "1px solid rgba(4,120,87,0.2)" }}>
            <Play className="w-8 h-8" style={{ color: "#047857" }} />
          </div>
          <h3 className="text-lg font-bold text-white">Resume Listing?</h3>
          <p className="text-sm mt-2 leading-relaxed" style={{ color: "#a3a3a3" }}>
            This will make <strong className="text-white">{selectedProperty?.name || "this property"}</strong> visible on the public browse page again.
          </p>
          <div className="flex gap-3 mt-6">
            <button onClick={closeSheet} className="btn-secondary flex-1" style={{ padding: "14px" }}>Cancel</button>
            <button
              onClick={async () => {
                if (!selectedProperty) return;
                setFormLoading("resume");
                try {
                  await updateProperty(selectedProperty.id, { paused: false });
                  closeSheet();
                  setTimeout(() => showSnackbar("Property listing resumed!", "success"), 300);
                } catch (err: any) {
                  showSnackbar(err.message || "Failed to resume listing", "error");
                } finally {
                  setFormLoading(null);
                }
              }}
              className="btn-primary flex-1"
              style={{ padding: "14px" }}
              disabled={formLoading === "resume"}
            >
              {formLoading === "resume" ? <div className="spinner mx-auto" /> : <span>Resume</span>}
            </button>
          </div>
        </div>
      </div>

      {/* DELETE CONFIRM SHEET */}
      <div className={`sheet-overlay ${activeSheet === "deleteConfirm" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "deleteConfirm" ? "active" : ""}`}>
        <div className="sheet-handle" />
        <div className="p-5 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <Trash2 className="w-8 h-8" style={{ color: "#ef4444" }} />
          </div>
          <h3 className="text-lg font-bold text-white">Delete Property?</h3>
          <p className="text-sm mt-2 leading-relaxed" style={{ color: "#a3a3a3" }}>
            This will permanently remove <strong className="text-white">{selectedProperty?.name || "this property"}</strong>, all its units, associated listings from the marketplace, and any saved favorites. This cannot be undone.
          </p>
          <div className="flex gap-3 mt-6">
            <button onClick={closeSheet} className="btn-secondary flex-1" style={{ padding: "14px" }}>Cancel</button>
            <button onClick={() => handleForm("delete")} className="btn-danger flex-1" style={{ padding: "14px" }} disabled={formLoading === "delete"}>
              {formLoading === "delete" ? <div className="spinner mx-auto" /> : <span>Delete</span>}
            </button>
          </div>
        </div>
      </div>

      {/* ADD UNIT SHEET */}
      {user && selectedProperty && (
        <AddUnitSheet
          isOpen={activeSheet === "addUnit"}
          onClose={closeSheet}
          onSubmit={async (data) => {
            setFormLoading("add-unit");
            try {
              await addUnit(user.uid, {
                propertyId: selectedProperty.id,
                propertyName: selectedProperty.name,
                name: data.name,
                type: data.type,
                status: data.status,
                rent: data.rent,
                deposit: data.deposit,
                serviceCharge: data.serviceCharge,
                bathrooms: data.bathrooms,
                floor: data.floor,
                area: data.area,
                description: data.description,
                amenities: data.amenities,
                images: data.images,
              });
              setFormLoading(null);
              closeSheet();
              setTimeout(() => showSnackbar("Unit added successfully! 🎉", "success"), 300);
            } catch (err: any) {
              setFormLoading(null);
              showSnackbar(err.message || "Something went wrong", "error");
            }
          }}
          loading={formLoading === "add-unit"}
          showSnackbar={showSnackbar}
          userId={user.uid}
        />
      )}

      {/* UNIT DETAIL SHEET */}
      <div className={`sheet-overlay ${activeSheet === "unitDetail" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "unitDetail" ? "active" : ""}`}>
        <div className="sheet-handle" />
        <div className="p-5">
          {selectedUnit && (
            <>
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-white">{selectedUnit.name}</h3>
            <button onClick={closeSheet} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)" }}>
              <XIcon className="w-4 h-4" style={{ color: "#a3a3a3" }} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
              <p className="text-xs" style={{ color: "#525252" }}>Type</p>
              <p className="text-sm font-bold text-white">{selectedUnit.type}</p>
            </div>
            <div className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
              <p className="text-xs" style={{ color: "#525252" }}>Rent</p>
              <p className="text-sm font-bold" style={{ color: "#047857" }}>KSh {selectedUnit.rent.toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
              <p className="text-xs" style={{ color: "#525252" }}>Status</p>
              <span className="chip" style={{
                background: selectedUnit.status === "Occupied" ? "rgba(4,120,87,0.1)" : selectedUnit.status === "Maintenance" ? "rgba(234,179,8,0.1)" : "rgba(239,68,68,0.1)",
                color: selectedUnit.status === "Occupied" ? "#047857" : selectedUnit.status === "Maintenance" ? "#eab308" : "#ef4444",
                fontSize: "11px"
              }}>{selectedUnit.status}</span>
            </div>
            <div className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
              <p className="text-xs" style={{ color: "#525252" }}>Deposit</p>
              <p className="text-sm font-bold text-white">KSh {selectedUnit.deposit.toLocaleString()}</p>
            </div>
          </div>
          {selectedUnit.tenantName && (
            <>
              <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#525252" }}>Current Tenant</h4>
              <div className="flex items-center gap-3 p-3 rounded-xl mb-5" style={{ background: "rgba(255,255,255,0.03)" }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(4,120,87,0.15)" }}>
                  <span className="text-xs font-bold" style={{ color: "#047857" }}>{selectedUnit.tenantInitials || "—"}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">{selectedUnit.tenantName}</p>
                  {selectedUnit.tenantPhone && (
                    <p className="text-xs" style={{ color: "#a3a3a3" }}>{selectedUnit.tenantPhone}</p>
                  )}
                  {selectedUnit.leaseTerm && (
                    <p className="text-xs" style={{ color: "#a3a3a3" }}>{selectedUnit.leaseTerm} lease</p>
                  )}
                </div>
                {selectedUnit.tenantPhone && (
                  <a href={`tel:${selectedUnit.tenantPhone}`} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(4,120,87,0.1)" }}>
                    <Phone className="w-4 h-4" style={{ color: "#047857" }} />
                  </a>
                )}
              </div>
            </>
          )}
          {selectedUnit.amenities.length > 0 && (
            <>
              <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#525252" }}>Amenities</h4>
              <div className="flex flex-wrap gap-2 mb-5">
                {selectedUnit.amenities.map((a) => (
                  <span key={a} className="chip" style={{ background: "rgba(4,120,87,0.08)", color: "#047857", fontSize: "11px" }}>{a}</span>
                ))}
              </div>
            </>
          )}
          <div className="grid grid-cols-2 gap-3 mt-5">
            <button onClick={() => { closeSheet(); setTimeout(() => router.push(`/units`), 300); }} className="btn-secondary flex items-center justify-center gap-2" style={{ padding: "12px" }}>
              <Pencil className="w-4 h-4" /><span className="text-sm">Edit in Units</span>
            </button>
            <button onClick={() => { closeSheet(); setTimeout(() => router.push('/maintenance'), 300); }} className="btn-secondary flex items-center justify-center gap-2" style={{ padding: "12px" }}>
              <Wrench className="w-4 h-4" /><span className="text-sm">Maintenance</span>
            </button>
          </div>
            </>
          )}
        </div>
      </div>

      {/* DETAIL SHEET */}
      {selectedProperty && (
        <ViewPropertySheet
          isOpen={activeSheet === "detail"}
          onClose={closeSheet}
          onEdit={() => openSheet("editProperty")}
          onShare={() => openSheet("share")}
          onAddUnit={() => openSheet("addUnit")}
          onUnitClick={(unit) => { setSelectedUnit(unit); openSheet("unitDetail"); }}
          property={selectedProperty}
        />
      )}



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

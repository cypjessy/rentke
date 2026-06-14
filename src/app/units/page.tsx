"use client";

import { useState, useEffect, useRef } from "react";
import BottomNavAndMenu from "@/app/components/BottomNavAndMenu";
import {
  Search,
  Building2,
  Plus,
  LayoutDashboard,
  CalendarDays,
  MessageSquare,
  List,
  Pencil,
  Layers,
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
  Menu,
  ChevronRight,
  Settings,
  X as XIcon,
} from "lucide-react";

import { useRouter } from "next/navigation";
import {
  UNIT_TYPE_OPTIONS,
  UNIT_STATUS_OPTIONS,
  BATHROOM_OPTIONS,
  FLOOR_OPTIONS,
  LEASE_TERM_OPTIONS,
  UNIT_AMENITIES,
  PLACEHOLDER_IMAGE,
} from "../constants";

import AuthGuard from "../components/AuthGuard";
import { useAuth } from "../AuthContext";
import {
  listenToUnits,
  addUnit,
  updateUnit,
  type UnitData,
} from "../../lib/units";
import { listenToNotifications } from "../../lib/notifications";
import type { NotificationData } from "../../lib/notifications";

import ViewUnitSheet from "./ViewUnitSheet";

type SnackbarType = "success" | "error" | "info";

export default function UnitsPage() {
  const router = useRouter();
  const { user } = useAuth();

  // ---- Tab State ----
  const [activeTab, setActiveTab] = useState("more");

  // ---- Sheet State ----
  const [activeSheet, setActiveSheet] = useState<string | null>(null);

  // ---- Active Filter ----
  const [activeFilter, setActiveFilter] = useState("all");

  // ---- Sort Label ----
  const [sortLabel, setSortLabel] = useState("By Property");

  // ---- Search Text ----
  const [searchText, setSearchText] = useState("");

  // ---- Filter State ----
  const [filterUnitTypes, setFilterUnitTypes] = useState<string[]>([]);
  const [filterRentMin, setFilterRentMin] = useState("");
  const [filterRentMax, setFilterRentMax] = useState("");

  // ---- Snackbar ----
  const [snackbar, setSnackbar] = useState<{ show: boolean; message: string; type: SnackbarType }>({ show: false, message: "", type: "info" });
  const snackbarTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarAnimClass, setSnackbarAnimClass] = useState("");

  // ---- Loading states ----
  const [formLoading, setFormLoading] = useState<string | null>(null);
  const [unitsLoading, setUnitsLoading] = useState(true);

  // ---- Units data from Firestore ----
  const [units, setUnits] = useState<UnitData[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<UnitData | null>(null);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);

  // ---- Add Unit Form State ----
  const [addFormPropertyId, setAddFormPropertyId] = useState("");
  const [addFormPropertyName, setAddFormPropertyName] = useState("");
  const [addFormName, setAddFormName] = useState("");
  const [addFormType, setAddFormType] = useState("Bedsitter");
  const [addFormStatus, setAddFormStatus] = useState<"Vacant" | "Occupied" | "Maintenance">("Vacant");
  const [addFormRent, setAddFormRent] = useState("");
  const [addFormDeposit, setAddFormDeposit] = useState("");
  const [addFormServiceCharge, setAddFormServiceCharge] = useState("");
  const [addFormBathrooms, setAddFormBathrooms] = useState("1");
  const [addFormFloor, setAddFormFloor] = useState("Ground");
  const [addFormArea, setAddFormArea] = useState("");
  const [addFormDescription, setAddFormDescription] = useState("");
  const [addFormAmenities, setAddFormAmenities] = useState<string[]>([]);

  // ---- Edit Unit Form State ----
  const [editFormName, setEditFormName] = useState("");
  const [editFormType, setEditFormType] = useState("");
  const [editFormStatus, setEditFormStatus] = useState<string>("Vacant");
  const [editFormRent, setEditFormRent] = useState("");
  const [editFormDeposit, setEditFormDeposit] = useState("");
  const [editFormArea, setEditFormArea] = useState("");
  const [editFormLeaseTerm, setEditFormLeaseTerm] = useState("12 months");
  const [editFormLeaseStart, setEditFormLeaseStart] = useState("");

  // ---- Pre-fill Edit Form when selectedUnit changes ----
  useEffect(() => {
    if (selectedUnit && activeSheet === "editUnit") {
      setEditFormName(selectedUnit.name);
      setEditFormType(selectedUnit.type);
      setEditFormStatus(selectedUnit.status);
      setEditFormRent(selectedUnit.rent.toString());
      setEditFormDeposit(selectedUnit.deposit.toString());
      setEditFormArea(selectedUnit.area.toString());
      setEditFormLeaseTerm(selectedUnit.leaseTerm || "12 months");
    }
  }, [selectedUnit, activeSheet]);

  // ---- Firestore Listeners ----
  useEffect(() => {
    if (!user) {
      setUnitsLoading(false);
      return;
    }
    const unsubs: (() => void)[] = [];

    unsubs.push(listenToUnits(
      user.uid,
      (data) => {
        setUnits(data);
        setUnitsLoading(false);
      },
      (err) => {
        console.error("Error loading units:", err);
        setUnitsLoading(false);
        showSnackbar("Failed to load units", "error");
      }
    ));

    unsubs.push(listenToNotifications(user.uid, (data) => {
      setNotifications(data);
    }, () => {}));

    return () => unsubs.forEach((u) => u());
  }, [user]);

  const filteredUnits = units
    .filter((u) => {
      if (activeFilter === "all") return true;
      if (activeFilter === "overdue") return u.status === "Occupied" && u.payment === "Overdue";
      return u.status.toLowerCase() === activeFilter;
    })
    .filter((u) => {
      if (!searchText.trim()) return true;
      const q = searchText.toLowerCase();
      return (
        u.name.toLowerCase().includes(q) ||
        (u.tenantName || "").toLowerCase().includes(q) ||
        u.propertyName.toLowerCase().includes(q) ||
        u.type.toLowerCase().includes(q)
      );
    })
    .filter((u) => {
      if (filterUnitTypes.length > 0 && !filterUnitTypes.includes(u.type)) return false;
      if (filterRentMin && u.rent < parseInt(filterRentMin.replace(/,/g, ""))) return false;
      if (filterRentMax && u.rent > parseInt(filterRentMax.replace(/,/g, ""))) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortLabel) {
        case "By Unit Name": return a.name.localeCompare(b.name);
        case "Rent (Low to High)": return a.rent - b.rent;
        case "Rent (High to Low)": return b.rent - a.rent;
        case "By Status": return a.status.localeCompare(b.status);
        default: return 0; // "By Property" — rely on Firestore order / property grouping
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

  // ---- Form Handler ----
  const handleForm = async (id: string) => {
    setFormLoading(id);
    try {
      if (id === "add-unit") {
        if (!addFormPropertyId) {
          showSnackbar("Please select a property", "error");
          setFormLoading(null);
          return;
        }
        await addUnit(user!.uid, {
          propertyId: addFormPropertyId,
          propertyName: addFormPropertyName,
          name: addFormName,
          type: addFormType,
          status: addFormStatus,
          rent: parseInt(addFormRent.replace(/,/g, "")) || 0,
          deposit: parseInt(addFormDeposit.replace(/,/g, "")) || 0,
          serviceCharge: parseInt(addFormServiceCharge.replace(/,/g, "")) || 0,
          bathrooms: parseInt(addFormBathrooms) || 1,
          floor: addFormFloor,
          area: parseInt(addFormArea) || 0,
          description: addFormDescription,
          amenities: addFormAmenities,
        });
        setFormLoading(null);
        closeSheet();
        setTimeout(() => showSnackbar("Unit added successfully! 🎉", "success"), 300);
      } else if (id === "edit-unit" && selectedUnit) {
        await updateUnit(selectedUnit.id, {
          name: editFormName,
          type: editFormType as any,
          status: editFormStatus as any,
          rent: parseInt(editFormRent.replace(/,/g, "")) || 0,
          deposit: parseInt(editFormDeposit.replace(/,/g, "")) || 0,
          area: parseInt(editFormArea) || 0,
        });
        setFormLoading(null);
        closeSheet();
        setTimeout(() => showSnackbar("Unit updated! ✅", "success"), 300);
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

  // ---- Computed Stats ----
  const unitStats = {
    total: units.length,
    occupied: units.filter((u) => u.status === "Occupied").length,
    vacant: units.filter((u) => u.status === "Vacant").length,
    overdue: units.filter((u) => u.status === "Occupied" && u.payment === "Overdue").length,
    maintenance: units.filter((u) => u.status === "Maintenance").length,
    totalRent: units.reduce((sum, u) => sum + u.rent, 0),
  };

  // ---- Get unit status style ----
  const getStatusStyle = (status: string) => {
    switch (status) {
      case "Occupied":
        return { dotColor: "#047857", chipBg: "rgba(4,120,87,0.1)", chipColor: "#047857", avatarBg: "rgba(4,120,87,0.1)", avatarColor: "#047857" };
      case "Vacant":
        return { dotColor: "#ef4444", chipBg: "rgba(239,68,68,0.1)", chipColor: "#ef4444", avatarBg: "rgba(239,68,68,0.08)", avatarColor: "#ef4444" };
      case "Overdue":
        return { dotColor: "#eab308", chipBg: "rgba(234,179,8,0.1)", chipColor: "#eab308", avatarBg: "rgba(234,179,8,0.08)", avatarColor: "#eab308" };
      default:
        return { dotColor: "#a855f7", chipBg: "rgba(168,85,247,0.1)", chipColor: "#a855f7", avatarBg: "rgba(168,85,247,0.08)", avatarColor: "#a855f7" };
    }
  };

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

  return (
    <AuthGuard>

    <div style={{ background: "#050505", color: "#e5e5e5", fontFamily: "'Inter', sans-serif" }}>
      <div className="app-shell">
        <div className="status-bar" />

        {/* ====== HEADER ====== */}
        <div className="app-header">
          <div className="flex items-center justify-between px-3 pt-2 pb-1">
            <div>
              <h1 className="text-xl font-bold text-white">Units</h1>
              <p className="text-xs mt-0.5" style={{ color: "#a3a3a3" }}>
                {units.length} units • {[...new Set(units.map(u => u.propertyName).filter(Boolean))].length} properties
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
          <div className="px-3 py-2">
            <div className="relative" onClick={() => openSheet("search")}>
              <Search className="w-4.5 h-4.5 absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "#525252" }} />
              <div
                className="w-full py-3 pl-11 pr-12 rounded-xl text-sm"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", color: "#525252" }}
              >
                Search units, tenants...
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
          <div className="grid grid-cols-3 gap-2 px-3 py-2">
            <div className="p-2.5 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-base font-bold text-white">{unitStats.total}</p>
              <p className="text-xs" style={{ color: "#a3a3a3" }}>Total Units</p>
            </div>
            <div className="p-2.5 rounded-xl text-center" style={{ background: "rgba(4,120,87,0.06)", border: "1px solid rgba(4,120,87,0.15)" }}>
              <p className="text-base font-bold" style={{ color: "#047857" }}>{unitStats.occupied}</p>
              <p className="text-xs" style={{ color: "#047857" }}>Occupied</p>
            </div>
            <div className="p-2.5 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-sm font-bold text-white">KSh {(unitStats.totalRent / 1000).toFixed(0)}K</p>
              <p className="text-xs" style={{ color: "#a3a3a3" }}>Total Rent</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 px-3 pb-2 -mt-2">
            <div className="p-2 rounded-xl text-center" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
              <p className="text-base font-bold" style={{ color: "#ef4444" }}>{unitStats.vacant}</p>
              <p className="text-xs" style={{ color: "#ef4444" }}>Vacant</p>
            </div>
            <div className="p-2 rounded-xl text-center" style={{ background: "rgba(234,179,8,0.06)", border: "1px solid rgba(234,179,8,0.15)" }}>
              <p className="text-base font-bold" style={{ color: "#eab308" }}>{unitStats.overdue}</p>
              <p className="text-xs" style={{ color: "#eab308" }}>Overdue</p>
            </div>
            <div className="p-2 rounded-xl text-center" style={{ background: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.15)" }}>
              <p className="text-base font-bold" style={{ color: "#a855f7" }}>{unitStats.maintenance}</p>
              <p className="text-xs" style={{ color: "#a855f7" }}>Maintenance</p>
            </div>
          </div>

          {/* Filter Chips */}
          <div className="filter-scroll py-1 pb-3">
            {[
            { key: "all", label: "All", count: units.length.toString() },
            { key: "occupied", label: "Occupied", count: units.filter(u => u.status === "Occupied").length.toString(), dot: "#047857" },
            { key: "vacant", label: "Vacant", count: units.filter(u => u.status === "Vacant").length.toString(), dot: "#ef4444" },
            { key: "overdue", label: "Overdue", count: units.filter(u => u.status === "Occupied" && u.payment === "Overdue").length.toString(), dot: "#eab308" },
            { key: "maintenance", label: "Maintenance", count: units.filter(u => u.status === "Maintenance").length.toString(), dot: "#a855f7" },
            ].map((f) => (
              <button
                key={f.key}
                className={`filter-chip ${activeFilter === f.key ? "active" : ""}`}
                onClick={(e) => {
                  setActiveFilter(f.key);
                  e.currentTarget.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
                  const count = units.filter((u) => {
                    if (f.key === "all") return true;
                    if (f.key === "overdue") return u.status === "Occupied" && u.payment === "Overdue";
                    return u.status === f.key.charAt(0).toUpperCase() + f.key.slice(1);
                  }).length;
                  showSnackbar(`Showing ${count} units`, "info");
                }}
              >
                {f.dot && <span className="unit-status-dot" style={{ background: f.dot }} />}
                {f.label}
                <span className="count">{f.count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ====== MAIN CONTENT ====== */}
        <div className="app-content" id="main-content">
          <div className="px-3 pb-28 space-y-2.5" id="unit-list">
            {filteredUnits.map((unit, i) => {
              const s = getStatusStyle(unit.status);
              const isVacant = unit.status === "Vacant";
              const isOverdue = unit.status === "Occupied" && unit.payment === "Overdue";
              const leaseEndStr = unit.leaseEnd?.toDate?.()?.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
              return (
                <div
                  key={unit.id}
                  className="unit-item animate-in"
                  style={{ animationDelay: `${0.05 + i * 0.05}s` }}
                  data-status={unit.status}
                  onClick={() => { setSelectedUnit(unit); openSheet("unitDetail"); }}
                >
                  <div className="unit-avatar overflow-hidden" style={{ background: s.avatarBg, color: s.avatarColor }}>
                    {unit.images?.[0] ? (
                      <img
                        src={unit.images[0]}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img
                        src={PLACEHOLDER_IMAGE}
                        className="w-full h-full object-cover opacity-20"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-white">
                        {unit.name} — {unit.type}
                      </p>
                      <span className="chip" style={{ background: s.chipBg, color: s.chipColor, fontSize: "10px", padding: "3px 8px" }}>
                        {unit.status}
                      </span>
                    </div>
                    <p className="text-xs mt-0.5 truncate" style={{ color: "#a3a3a3" }}>
                      {unit.propertyName}{" • "}{unit.tenantName || "No tenant"}
                    </p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-xs font-semibold" style={{ color: "#e5e5e5" }}>
                        KSh {unit.rent.toLocaleString()}/mo
                      </span>
                      {isVacant ? (
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); router.push(`/listings?createFromUnit=${unit.id}&propertyId=${unit.propertyId}&propertyName=${encodeURIComponent(unit.propertyName)}&unitName=${encodeURIComponent(unit.name)}&rent=${unit.rent}&unitType=${encodeURIComponent(unit.type)}`); }}
                            className="text-xs font-semibold"
                            style={{ color: "#047857" }}
                          >
                            List on Marketplace →
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedUnit(unit); openSheet("recordLease"); }}
                            className="text-xs font-semibold"
                            style={{ color: "#3b82f6" }}
                          >
                            Record Lease →
                          </button>
                        </div>
                      ) : isOverdue ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); showSnackbar(`Reminder sent to ${unit.tenantName}`, "success"); }}
                          className="text-xs font-semibold"
                          style={{ color: "#eab308" }}
                        >
                          Remind →
                        </button>
                      ) : (
                        <span className="text-xs" style={{ color: "#525252" }}>
                          {leaseEndStr ? `Lease ends ${leaseEndStr}` : ""}
                        </span>
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
          onClick={() => openSheet("addUnit")}
          className="fixed z-50 flex items-center gap-2 px-3 py-3.5 rounded-2xl"
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
          <span className="text-sm font-semibold text-white">Add Unit</span>
        </button>

                <BottomNavAndMenu />
      </div>

      {/* ========== SHEETS ========== */}

      {/* SORT */}
      <div className={`sheet-overlay ${activeSheet === "sort" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "sort" ? "active" : ""}`}>
        <div className="sheet-handle" />
        <div className="p-3">
          <h3 className="text-base font-bold text-white mb-4">Sort Units</h3>
          <div className="space-y-1">
            {["By Property", "By Unit Name", "Rent (Low to High)", "Rent (High to Low)", "By Status"].map((s) => (
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
        <div className="p-3">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "#525252" }} />
              <input type="text" className="android-input" style={{ paddingLeft: "44px", borderRadius: "14px" }} placeholder="Search units, tenants..." autoFocus value={searchText} onChange={(e) => setSearchText(e.target.value)} />
            </div>
            <button onClick={closeSheet} className="text-sm font-semibold" style={{ color: "#047857" }}>Cancel</button>
          </div>
          <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#525252" }}>Quick Filters</h4>
          <div className="flex flex-wrap gap-2">
            {(() => {
              const recentFilters = [
                ...units.slice(0, 3).map(u => u.name),
                ...(units.filter(u => u.tenantName).slice(0, 2).map(u => u.tenantName!)),
              ];
              return [...new Set(recentFilters)].slice(0, 3).map((s) => (
                <button key={s} className="chip" style={{ background: "rgba(255,255,255,0.05)", color: "#a3a3a3" }} onClick={() => { setSearchText(s); closeSheet(); }}>
                  <Clock className="w-3 h-3" /> {s}
                </button>
              ));
            })()}
          </div>
        </div>
      </div>

      {/* FILTER */}
      <div className={`sheet-overlay ${activeSheet === "filter" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "filter" ? "active" : ""}`}>
        <div className="sheet-handle" />
        <div className="p-3">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-white">Filters</h3>
            <button onClick={() => { setFilterUnitTypes([]); setFilterRentMin(""); setFilterRentMax(""); showSnackbar("Filters reset", "info"); }} className="text-sm font-semibold" style={{ color: "#047857" }}>Reset All</button>
          </div>
          <div className="space-y-5">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#525252" }}>Property</label>
              <select className="android-select mt-2">
                <option value="">All Properties</option>
                {[...new Set(units.map(u => u.propertyName).filter(Boolean))].map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#525252" }}>Unit Type</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {UNIT_TYPE_OPTIONS.map((t) => {
                  const selected = filterUnitTypes.includes(t);
                  return (
                  <button
                    key={t}
                    className={`filter-chip ${selected ? "active" : ""}`}
                    style={selected ? { background: "rgba(4,120,87,0.12)", color: "#047857" } : {}}
                    onClick={() => {
                      setFilterUnitTypes(prev =>
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
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#525252" }}>Rent Range</label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div className="input-group">
                  <input type="text" className="android-input" placeholder=" " style={{ paddingLeft: "44px" }} value={filterRentMin} onChange={(e) => setFilterRentMin(e.target.value)} />
                  <label style={{ left: "44px" }}>Min</label>
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs" style={{ color: "#525252" }}>KSh</span>
                </div>
                <div className="input-group">
                  <input type="text" className="android-input" placeholder=" " style={{ paddingLeft: "44px" }} value={filterRentMax} onChange={(e) => setFilterRentMax(e.target.value)} />
                  <label style={{ left: "44px" }}>Max</label>
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs" style={{ color: "#525252" }}>KSh</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={() => { setFilterUnitTypes([]); setFilterRentMin(""); setFilterRentMax(""); showSnackbar("Filters reset", "info"); }} className="btn-secondary flex-1" style={{ padding: "14px" }}>Reset</button>
            <button onClick={() => { closeSheet(); showSnackbar(`Filters applied (${filterUnitTypes.length || 'any'} type${filterUnitTypes.length !== 1 ? 's' : ''})`, "success"); }} className="btn-primary flex-1 ripple-container" style={{ padding: "14px" }}>Apply</button>
          </div>
        </div>
      </div>

      {/* ADD UNIT */}
      <div className={`sheet-overlay ${activeSheet === "addUnit" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "addUnit" ? "active" : ""}`} style={{ maxHeight: "95dvh" }}>
        <div className="sheet-handle" />
        <div className="p-3">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-white">Add Unit</h3>
            <button onClick={closeSheet} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)" }}>
              <XIcon className="w-4 h-4" style={{ color: "#a3a3a3" }} />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium block mb-2" style={{ color: "#a3a3a3" }}>Property</label>
              <select className="android-select" value={addFormPropertyName} onChange={(e) => { setAddFormPropertyName(e.target.value); setAddFormPropertyId(e.target.value); }}>
                <option value="">Select Property</option>
                {[...new Set(units.map(u => u.propertyName).filter(Boolean))].map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="input-group">
              <input type="text" className="android-input" placeholder=" " value={addFormName} onChange={(e) => setAddFormName(e.target.value)} />
              <label>Unit Number / Name</label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium block mb-2" style={{ color: "#a3a3a3" }}>Unit Type</label>
                <select className="android-select" value={addFormType} onChange={(e) => setAddFormType(e.target.value)}>
                  {UNIT_TYPE_OPTIONS.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium block mb-2" style={{ color: "#a3a3a3" }}>Status</label>
                <select className="android-select" value={addFormStatus} onChange={(e) => setAddFormStatus(e.target.value as any)}>
                  {UNIT_STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium block mb-2" style={{ color: "#a3a3a3" }}>Bathrooms</label>
                <select className="android-select" value={addFormBathrooms} onChange={(e) => setAddFormBathrooms(e.target.value)}>
                  {BATHROOM_OPTIONS.map((b) => <option key={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium block mb-2" style={{ color: "#a3a3a3" }}>Floor</label>
                <select className="android-select" value={addFormFloor} onChange={(e) => setAddFormFloor(e.target.value)}>
                  {FLOOR_OPTIONS.map((f) => <option key={f}>{f}</option>)}
                </select>
              </div>
            </div>
            <div className="input-group">
              <input type="text" className="android-input" placeholder=" " value={addFormArea} onChange={(e) => setAddFormArea(e.target.value)} />
              <label>Area (sqm)</label>
            </div>
            <div className="input-group">
              <input type="text" className="android-input" placeholder=" " style={{ paddingLeft: "60px" }} value={addFormRent} onChange={(e) => setAddFormRent(e.target.value)} />
              <label style={{ left: "60px" }}>Monthly Rent</label>
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: "#a3a3a3" }}>KSh</span>
            </div>
            <div className="input-group">
              <input type="text" className="android-input" placeholder=" " style={{ paddingLeft: "60px" }} value={addFormDeposit} onChange={(e) => setAddFormDeposit(e.target.value)} />
              <label style={{ left: "60px" }}>Deposit Amount</label>
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: "#a3a3a3" }}>KSh</span>
            </div>
            <div className="input-group">
              <input type="text" className="android-input ksh-prefix" placeholder=" " value={addFormServiceCharge} onChange={(e) => setAddFormServiceCharge(e.target.value)} />
              <label style={{ left: "60px" }}>Service Charge (Monthly)</label>
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: "#a3a3a3" }}>KSh</span>
            </div>
            <div>
              <label className="text-xs font-medium block mb-2" style={{ color: "#a3a3a3" }}>Description</label>
              <textarea className="android-input" style={{ minHeight: "80px", borderRadius: "14px" }} placeholder="Describe the unit..." value={addFormDescription} onChange={(e) => setAddFormDescription(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium block mb-2" style={{ color: "#a3a3a3" }}>Unit Amenities</label>
              <div className="flex flex-wrap gap-2">
                {UNIT_AMENITIES.map((a) => {
                  const selected = addFormAmenities.includes(a);
                  return (
                    <span
                      key={a}
                      className="chip cursor-pointer"
                      style={{
                        background: selected ? "rgba(4,120,87,0.15)" : "rgba(255,255,255,0.05)",
                        color: selected ? "#047857" : "#a3a3a3",
                        border: selected ? "1px solid rgba(4,120,87,0.3)" : "1px solid transparent",
                      }}
                      onClick={() => {
                        setAddFormAmenities(prev =>
                          prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]
                        );
                      }}
                    >
                      {a}
                    </span>
                  );
                })}
              </div>
            </div>
            <button onClick={() => handleForm("add-unit")} className="btn-primary ripple-container mt-2" disabled={formLoading === "add-unit"}>
              {formLoading === "add-unit" ? <div className="spinner mx-auto" /> : <span>Add Unit</span>}
            </button>
          </div>
        </div>
      </div>

      {/* VIEW UNIT DETAIL — via ViewUnitSheet component */}
      <ViewUnitSheet
        isOpen={activeSheet === "unitDetail"}
        onClose={closeSheet}
        unit={selectedUnit}
        onEdit={() => {
          // Close detail, then open edit sheet
          setActiveSheet(null);
          setTimeout(() => openSheet("editUnit"), 300);
        }}
        router={router}
      />

      {/* EDIT UNIT */}
      <div className={`sheet-overlay ${activeSheet === "editUnit" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "editUnit" ? "active" : ""}`} style={{ maxHeight: "95dvh" }}>
        <div className="sheet-handle" />
        <div className="p-3">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-white">Edit {selectedUnit?.name || 'Unit'}</h3>
            <button onClick={closeSheet} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)" }}>
              <XIcon className="w-4 h-4" style={{ color: "#a3a3a3" }} />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium block mb-2" style={{ color: "#a3a3a3" }}>Property</label>
              <select className="android-select" disabled style={{ opacity: 0.5 }} value={selectedUnit?.propertyName || ''}>
                <option>{selectedUnit?.propertyName || 'Property'}</option>
              </select>
              <p className="text-xs mt-1" style={{ color: "#525252" }}>Property cannot be changed</p>
            </div>
            <div className="input-group">
              <input type="text" className="android-input" placeholder=" " value={editFormName} onChange={(e) => setEditFormName(e.target.value)} />
              <label style={{ top: editFormName ? "10px" : "50%", fontSize: editFormName ? "11px" : "16px", color: editFormName ? "#047857" : "#525252", fontWeight: editFormName ? 500 : 400 }}>Unit Number</label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium block mb-2" style={{ color: "#a3a3a3" }}>Type</label>
                <select className="android-select" value={editFormType} onChange={(e) => setEditFormType(e.target.value)}>
                  {UNIT_TYPE_OPTIONS.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium block mb-2" style={{ color: "#a3a3a3" }}>Status</label>
                <select className="android-select" value={editFormStatus} onChange={(e) => setEditFormStatus(e.target.value)}>
                  {UNIT_STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="input-group">
              <input type="text" className="android-input" placeholder=" " value={editFormRent} onChange={(e) => setEditFormRent(e.target.value)} style={{ paddingLeft: "60px" }} />
              <label style={{ left: "60px", top: editFormRent ? "10px" : "50%", fontSize: editFormRent ? "11px" : "16px", color: editFormRent ? "#047857" : "#525252", fontWeight: editFormRent ? 500 : 400 }}>Monthly Rent</label>
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: "#a3a3a3" }}>KSh</span>
            </div>
            <div className="input-group">
              <input type="text" className="android-input" placeholder=" " value={editFormDeposit} onChange={(e) => setEditFormDeposit(e.target.value)} style={{ paddingLeft: "60px" }} />
              <label style={{ left: "60px", top: editFormDeposit ? "10px" : "50%", fontSize: editFormDeposit ? "11px" : "16px", color: editFormDeposit ? "#047857" : "#525252", fontWeight: editFormDeposit ? 500 : 400 }}>Deposit Amount</label>
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: "#a3a3a3" }}>KSh</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium block mb-2" style={{ color: "#a3a3a3" }}>Lease Term</label>
                <select className="android-select" value={editFormLeaseTerm} onChange={(e) => setEditFormLeaseTerm(e.target.value)}>
                  {LEASE_TERM_OPTIONS.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="input-group">
                <input type="text" className="android-input" placeholder=" " value={editFormArea} onChange={(e) => setEditFormArea(e.target.value)} />
                <label style={{ top: editFormArea ? "10px" : "50%", fontSize: editFormArea ? "11px" : "16px", color: editFormArea ? "#047857" : "#525252", fontWeight: editFormArea ? 500 : 400 }}>Area (sqm)</label>
              </div>
            </div>
            <button onClick={() => handleForm("edit-unit")} className="btn-primary ripple-container mt-2" disabled={formLoading === "edit-unit"}>
              {formLoading === "edit-unit" ? <div className="spinner mx-auto" /> : <span>Save Changes</span>}
            </button>
          </div>
        </div>
      </div>

      {/* RECORD LEASE (quick action from list — auto-opens lease form) */}
      <ViewUnitSheet
        isOpen={activeSheet === "recordLease"}
        onClose={closeSheet}
        unit={selectedUnit}
        onEdit={() => {}}
        router={router}
        initialSubSheet="recordLease"
      />



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

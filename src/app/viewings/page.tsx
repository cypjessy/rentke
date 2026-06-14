"use client";

import { useState, useRef, useEffect } from "react";
import BottomNavAndMenu from "@/app/components/BottomNavAndMenu";
import { useRouter } from "next/navigation";
import {
  ArrowUpDown,
  Building2,
  LayoutDashboard,
  List,
  Menu,
  ChevronRight,
  Clock,
  Timer,
  Check,
  CheckCircle,
  X,
  MoreVertical,
  CalendarPlus,
  CalendarClock,
  Navigation,
  Phone,
  MessageCircle,
  Smartphone,
  MapPin,
  Car,
  Map,
  Share2,
  XCircle,
  CalendarX,
  Info,
  User,
  Layers,
  MessageSquare,
  Settings,
  CalendarDays,
  Home,
} from "lucide-react";

import AuthGuard from "../components/AuthGuard";
import { useAuth } from "../AuthContext";
import {
  listenToViewings,
  scheduleViewing,
  confirmViewing,
  cancelViewing,
  completeViewing,
  rescheduleViewing,
  type ViewingData,
} from "../../lib/viewings";

type SnackbarType = "success" | "error" | "info";

export default function ViewingRequests() {
  const router = useRouter();
  const { user } = useAuth();

  // ---- Tab State ----
  const [activeTab, setActiveTab] = useState("more");
  const [filterTab, setFilterTab] = useState("all");

  // ---- Sheet State ----
  const [activeSheet, setActiveSheet] = useState<string | null>(null);

  // ---- Sort ----
  const [sortLabel, setSortLabel] = useState("Date (Nearest First)");

  // ---- Search Text ----
  const [searchText, setSearchText] = useState("");

  // ---- Snackbar ----
  const [snackbar, setSnackbar] = useState<{
    show: boolean;
    message: string;
    type: SnackbarType;
  }>({ show: false, message: "", type: "info" });
  const snackbarTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarAnimClass, setSnackbarAnimClass] = useState("");

  // ---- Viewing Data from Firestore ----
  const [viewings, setViewings] = useState<ViewingData[]>([]);
  const [viewingsLoading, setViewingsLoading] = useState(true);
  const [selectedViewing, setSelectedViewing] = useState<ViewingData | null>(null);

  // ---- Firestore Listener ----
  useEffect(() => {
    if (!user) { setViewingsLoading(false); return; }
    const unsub = listenToViewings(user.uid, (data) => {
      setViewings(data);
      setViewingsLoading(false);
    }, (err) => {
      console.error("Error loading viewings:", err);
      setViewingsLoading(false);
    });
    return () => unsub();
  }, [user]);

  // ---- Computed Counts ----
  const viewingCounts = {
    pending: viewings.filter(v => v.status === "pending").length,
    confirmed: viewings.filter(v => v.status === "confirmed").length,
    completed: viewings.filter(v => v.status === "completed").length,
    cancelled: viewings.filter(v => v.status === "cancelled").length,
    total: viewings.length,
  };

  // ---- Dynamic section grouping ----
  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const getViewingSection = (v: ViewingData): string => {
    if (v.status === "completed" || v.status === "cancelled") return "completed";
    if (v.date === todayStr) return "today";
    if (v.date === tomorrowStr) return "tomorrow";
    return "week";
  };

  const sortedViewings = [...viewings].sort((a, b) => {
    const aTime = a.date ? new Date(a.date).getTime() : 0;
    const bTime = b.date ? new Date(b.date).getTime() : 0;
    switch (sortLabel) {
      case "Date (Furthest First)": return bTime - aTime;
      case "By Status": return a.status.localeCompare(b.status);
      case "By Property": return (a.propertyName || '').localeCompare(b.propertyName || '');
      case "By Tenant Name": return (a.tenantName || '').localeCompare(b.tenantName || '');
      default: return aTime - bTime; // "Date (Nearest First)"
    }
  });

  const filteredViewings = sortedViewings
    .filter((v) => {
      if (filterTab === "all") return true;
      return v.status === filterTab;
    })
    .filter((v) => {
      if (!searchText.trim()) return true;
      const q = searchText.toLowerCase();
      return (
        (v.tenantName || "").toLowerCase().includes(q) ||
        (v.propertyName || "").toLowerCase().includes(q) ||
        (v.unitName || "").toLowerCase().includes(q) ||
        (v.notes || "").toLowerCase().includes(q)
      );
    });

  const statusLabel = (status: string) => {
    switch (status) {
      case "pending": return { label: "Pending", color: "#eab308", bg: "rgba(234,179,8,0.1)" };
      case "confirmed": return { label: "Confirmed", color: "#047857", bg: "rgba(4,120,87,0.1)" };
      case "completed": return { label: "Completed", color: "#3b82f6", bg: "rgba(59,130,246,0.1)" };
      case "cancelled": return { label: "Cancelled", color: "#ef4444", bg: "rgba(239,68,68,0.1)" };
      default: return { label: status, color: "#a3a3a3", bg: "rgba(255,255,255,0.05)" };
    }
  };

  const dateColor = (status: string) => {
    switch (status) {
      case "pending": return "#eab308";
      case "confirmed": return "#047857";
      case "completed": return "#3b82f6";
      case "cancelled": return "#ef4444";
      default: return "#a3a3a3";
    }
  };

  const dateBg = (status: string) => {
    switch (status) {
      case "pending": return "rgba(234,179,8,0.08)";
      case "confirmed": return "rgba(4,120,87,0.08)";
      case "completed": return "rgba(59,130,246,0.06)";
      case "cancelled": return "rgba(239,68,68,0.06)";
      default: return "rgba(255,255,255,0.05)";
    }
  };

  const dateBorder = (status: string) => {
    switch (status) {
      case "pending": return "1px solid rgba(234,179,8,0.2)";
      case "confirmed": return "1px solid rgba(4,120,87,0.2)";
      case "completed": return "1px solid rgba(59,130,246,0.15)";
      case "cancelled": return "1px solid rgba(239,68,68,0.12)";
      default: return "1px solid rgba(255,255,255,0.1)";
    }
  };

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

  const hideSnackbar = () => {
    setSnackbar({ show: false, message: "", type: "info" });
  };

  // ---- Sheet Management ----
  const openSheet = (name: string) => setActiveSheet(name);
  const closeSheet = () => setActiveSheet(null);

  // ---- Add Viewing Form State ----
  const [addPropId, setAddPropId] = useState("");
  const [addPropName, setAddPropName] = useState("");
  const [addUnitId, setAddUnitId] = useState("");
  const [addUnitName, setAddUnitName] = useState("");
  const [addTenantName, setAddTenantName] = useState("");
  const [addTenantPhone, setAddTenantPhone] = useState("");
  const [addDate, setAddDate] = useState("");
  const [addTime, setAddTime] = useState("10:00");
  const [addDuration, setAddDuration] = useState("30 minutes");
  const [addNotes, setAddNotes] = useState("");
  const [addViewingLoading, setAddViewingLoading] = useState(false);

  // ---- Reschedule Form State ----
  const [resDate, setResDate] = useState("");
  const [resStartTime, setResStartTime] = useState("10:00");
  const [resEndTime, setResEndTime] = useState("10:30");
  const [resReason, setResReason] = useState("");
  const [rescheduleLoading, setRescheduleLoading] = useState(false);

  // ---- Cancel Form State ----
  const [cancelReason, setCancelReason] = useState("Property no longer available");

  // ---- Complete Form State ----
  const [completeOutcome, setCompleteOutcome] = useState("Tenant is interested");
  const [completeNotes, setCompleteNotes] = useState("");

  // ---- Reset Form Helpers ----
  const resetAddViewingForm = () => {
    setAddPropId(""); setAddPropName(""); setAddUnitId(""); setAddUnitName("");
    setAddTenantName(""); setAddTenantPhone(""); setAddDate("");
    setAddTime("10:00"); setAddDuration("30 minutes"); setAddNotes("");
  };
  const resetRescheduleForm = () => {
    setResDate(""); setResStartTime("10:00"); setResEndTime("10:30"); setResReason("");
  };
  const resetCancelForm = () => setCancelReason("Property no longer available");
  const resetCompleteForm = () => { setCompleteOutcome("Tenant is interested"); setCompleteNotes(""); };

  // ---- Form Handler ----
  const [formLoading, setFormLoading] = useState<string | null>(null);

  const handleForm = async (id: string) => {
    setFormLoading(id);
    try {
      if (id === "add" && user) {
        if (!addTenantName.trim()) { showSnackbar("Tenant name is required", "error"); setAddViewingLoading(false); return; }
        setAddViewingLoading(true);
        await scheduleViewing(user.uid, {
          propertyId: addPropId,
          propertyName: addPropName,
          unitId: addUnitId,
          unitName: addUnitName,
          tenantName: addTenantName,
          tenantPhone: addTenantPhone,
          date: addDate,
          startTime: addTime,
          endTime: "",
          duration: addDuration,
          notes: addNotes,
        });
        setAddViewingLoading(false);
        resetAddViewingForm();
        setFormLoading(null); closeSheet();
        setTimeout(() => showSnackbar("Viewing scheduled! 📅", "success"), 300);
      } else if (id === "confirm" && selectedViewing) {
        await confirmViewing(selectedViewing.id);
        setFormLoading(null); closeSheet();
        setTimeout(() => showSnackbar("Viewing confirmed! ✅", "success"), 300);
      } else if (id === "complete" && selectedViewing) {
        await completeViewing(selectedViewing.id, completeOutcome, completeNotes);
        resetCompleteForm();
        setFormLoading(null); closeSheet();
        setTimeout(() => showSnackbar("Viewing completed ✅", "success"), 300);
      } else if (id === "cancel" && selectedViewing) {
        await cancelViewing(selectedViewing.id, cancelReason);
        resetCancelForm();
        setFormLoading(null); closeSheet();
        setTimeout(() => showSnackbar("Viewing cancelled", "error"), 300);
      } else if (id === "reschedule" && selectedViewing) {
        await rescheduleViewing(selectedViewing.id, resDate, resStartTime, resEndTime, resReason);
        resetRescheduleForm();
        setFormLoading(null); closeSheet();
        setTimeout(() => showSnackbar("Reschedule proposed! 📅", "success"), 300);
      }
    } catch (err: any) {
      console.error("Form error:", err);
      setFormLoading(null);
      setAddViewingLoading(false);
      setRescheduleLoading(false);
      showSnackbar(err?.message || "Something went wrong", "error");
    }
  };

  // ---- Quick Action ----
  const handleQuickAction = (action: string, index?: number) => {
    if (action === "confirm") {
      openSheet("confirmViewing");
    } else if (action === "complete") {
      openSheet("completeConfirm");
    }
  };

  // ---- Ripple Effect ----
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const container = target.closest(".ripple-container") as HTMLElement | null;
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

  // ---- Filter ----
  const statusFilters = [
    { key: "all", label: "All", count: viewingCounts.total },
    { key: "pending", label: "Pending", count: viewingCounts.pending },
    { key: "confirmed", label: "Confirmed", count: viewingCounts.confirmed },
    { key: "completed", label: "Completed", count: viewingCounts.completed },
    { key: "cancelled", label: "Cancelled", count: viewingCounts.cancelled },
  ];

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
          <div className="flex items-center justify-between px-5 pt-2 pb-1">
            <div>
              <h1 className="text-xl font-bold text-white">Viewing Requests</h1>
              <p className="text-xs mt-0.5" style={{ color: "#a3a3a3" }}>Manage property viewings</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => openSheet("sort")} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <ArrowUpDown className="w-4 h-4" style={{ color: "#a3a3a3" }} />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="px-5 py-2">
            <div className="relative" onClick={() => openSheet("search")}>
              <CalendarDays className="w-4.5 h-4.5 absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "#525252" }} />
              <div
                className="w-full py-3 pl-11 pr-12 rounded-xl text-sm"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", color: "#525252" }}
              >
                Search viewings, tenants...
              </div>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-2 px-5 py-2">
            <div className="p-2.5 rounded-xl text-center" style={{ background: "rgba(234,179,8,0.06)", border: "1px solid rgba(234,179,8,0.15)" }}>
              <p className="text-base font-bold" style={{ color: "#eab308" }}>{viewingCounts.pending}</p>
              <p className="text-xs" style={{ color: "#eab308" }}>Pending</p>
            </div>
            <div className="p-2.5 rounded-xl text-center" style={{ background: "rgba(4,120,87,0.06)", border: "1px solid rgba(4,120,87,0.15)" }}>
              <p className="text-base font-bold" style={{ color: "#047857" }}>{viewingCounts.confirmed}</p>
              <p className="text-xs" style={{ color: "#047857" }}>Confirmed</p>
            </div>
            <div className="p-2.5 rounded-xl text-center" style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.15)" }}>
              <p className="text-base font-bold" style={{ color: "#3b82f6" }}>{viewingCounts.completed}</p>
              <p className="text-xs" style={{ color: "#3b82f6" }}>Completed</p>
            </div>
            <div className="p-2.5 rounded-xl text-center" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
              <p className="text-base font-bold" style={{ color: "#ef4444" }}>{viewingCounts.cancelled}</p>
              <p className="text-xs" style={{ color: "#ef4444" }}>Cancelled</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex overflow-x-auto px-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", scrollbarWidth: "none" }}>
            {statusFilters.map((f) => (
              <div
                key={f.key}
                className={`viewing-tab ${filterTab === f.key ? "active" : ""}`}
                onClick={() => { setFilterTab(f.key); showSnackbar(`Showing ${f.label.toLowerCase()} viewings`, "info"); }}
              >
                {f.label} <span className="tab-count">{f.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ====== MAIN CONTENT ====== */}
        <div className="app-content">
          <div className="px-5 pb-28 pt-3 space-y-3" id="viewing-list">
            {/* Today Section */}
            {filteredViewings.filter(v => getViewingSection(v) === "today").length > 0 && (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#047857" }}>Today</span>
                  <span className="chip" style={{ background: "rgba(4,120,87,0.1)", color: "#047857", fontSize: "10px", padding: "2px 8px" }}>
                    {filteredViewings.filter(v => getViewingSection(v) === "today").length} viewing{(filteredViewings.filter(v => getViewingSection(v) === "today").length) !== 1 ? "s" : ""}
                  </span>
                </div>
                {filteredViewings.filter(v => getViewingSection(v) === "today").map((v, i) => (
                  <div
                    key={`today-${i}`}
                    className="viewing-card animate-in"
                    style={{ animationDelay: `${0.05 * i}s` }}
                    data-status={v.status}
                    onClick={() => { setSelectedViewing(v); openSheet("detail"); }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="date-badge" style={{ background: dateBg(v.status), border: dateBorder(v.status) }}>
                        <span className="day" style={{ color: dateColor(v.status) }}>{(() => { try { return new Date(v.date).getDate(); } catch { return ''; } })()}</span>
                        <span className="month" style={{ color: dateColor(v.status) }}>{(() => { try { return new Date(v.date).toLocaleString('en', { month: 'short' }); } catch { return ''; } })()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-white">{v.tenantName}</p>
                          <span className="chip" style={{ background: statusLabel(v.status).bg, color: statusLabel(v.status).color, fontSize: "10px", padding: "3px 8px" }}>
                            {statusLabel(v.status).label}
                          </span>
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: "#a3a3a3" }}>{v.propertyName}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="flex items-center gap-1 text-xs" style={{ color: "#a3a3a3" }}><Clock className="w-3 h-3" /> {v.startTime || v.duration}</span>
                          <span className="flex items-center gap-1 text-xs" style={{ color: "#a3a3a3" }}><Timer className="w-3 h-3" /> {v.duration}</span>
                          {v.status === "confirmed" && (
                            <span className="flex items-center gap-1 text-xs" style={{ color: "#047857" }}><CheckCircle className="w-3 h-3" /> Confirmed</span>
                          )}
                        </div>
                        {v.status === "pending" && (
                          <div className="flex items-center gap-2 mt-3">
                            <button onClick={(e) => { e.stopPropagation(); handleQuickAction("confirm"); }} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold" style={{ background: "rgba(4,120,87,0.12)", color: "#047857" }}>
                              <Check className="w-3.5 h-3.5" /> Confirm
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); openSheet("reschedule"); }} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold" style={{ background: "rgba(59,130,246,0.08)", color: "#3b82f6" }}>
                              <CalendarClock className="w-3.5 h-3.5" /> Reschedule
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); openSheet("cancelConfirm"); }} className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(239,68,68,0.08)" }}>
                              <X className="w-4 h-4" style={{ color: "#ef4444" }} />
                            </button>
                          </div>
                        )}
                        {v.status === "confirmed" && (
                          <div className="flex items-center gap-2 mt-3">
                            <button onClick={(e) => { e.stopPropagation(); openSheet("directions"); }} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold" style={{ background: "rgba(4,120,87,0.08)", color: "#047857" }}>
                              <Navigation className="w-3.5 h-3.5" /> Directions
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); openSheet("contactTenant"); }} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold" style={{ background: "rgba(59,130,246,0.08)", color: "#3b82f6" }}>
                              <Phone className="w-3.5 h-3.5" /> Contact
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); openSheet("actions"); }} className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.04)" }}>
                              <MoreVertical className="w-4 h-4" style={{ color: "#525252" }} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Tomorrow Section */}
            {filteredViewings.filter(v => getViewingSection(v) === "tomorrow").length > 0 && (
              <>
                <div className="flex items-center gap-2 mb-1 mt-5">
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#3b82f6" }}>Tomorrow</span>
                  <span className="chip" style={{ background: "rgba(59,130,246,0.1)", color: "#3b82f6", fontSize: "10px", padding: "2px 8px" }}>
                    {filteredViewings.filter(v => getViewingSection(v) === "tomorrow").length} viewing{(filteredViewings.filter(v => getViewingSection(v) === "tomorrow").length) !== 1 ? "s" : ""}
                  </span>
                </div>
                {filteredViewings.filter(v => getViewingSection(v) === "tomorrow").map((v, i) => (
                  <div
                    key={`tomorrow-${i}`}
                    className="viewing-card animate-in"
                    style={{ animationDelay: `${0.05 * (i + 3)}s` }}
                    data-status={v.status}
                    onClick={() => { setSelectedViewing(v); openSheet("detail"); }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="date-badge" style={{ background: dateBg(v.status), border: dateBorder(v.status) }}>
                        <span className="day" style={{ color: dateColor(v.status) }}>{(() => { try { return new Date(v.date).getDate(); } catch { return ''; } })()}</span>
                        <span className="month" style={{ color: dateColor(v.status) }}>{(() => { try { return new Date(v.date).toLocaleString('en', { month: 'short' }); } catch { return ''; } })()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-white">{v.tenantName}</p>
                          <span className="chip" style={{ background: statusLabel(v.status).bg, color: statusLabel(v.status).color, fontSize: "10px", padding: "3px 8px" }}>
                            {statusLabel(v.status).label}
                          </span>
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: "#a3a3a3" }}>{v.propertyName}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="flex items-center gap-1 text-xs" style={{ color: "#a3a3a3" }}><Clock className="w-3 h-3" /> {v.startTime || v.duration}</span>
                          <span className="flex items-center gap-1 text-xs" style={{ color: "#a3a3a3" }}><Timer className="w-3 h-3" /> {v.duration}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-3">
                          <button onClick={(e) => { e.stopPropagation(); handleQuickAction("confirm"); }} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold" style={{ background: "rgba(4,120,87,0.12)", color: "#047857" }}>
                            <Check className="w-3.5 h-3.5" /> Confirm
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); openSheet("reschedule"); }} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold" style={{ background: "rgba(59,130,246,0.08)", color: "#3b82f6" }}>
                            <CalendarClock className="w-3.5 h-3.5" /> Reschedule
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); openSheet("cancelConfirm"); }} className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(239,68,68,0.08)" }}>
                            <X className="w-4 h-4" style={{ color: "#ef4444" }} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* This Week Section */}
            {filteredViewings.filter(v => getViewingSection(v) === "week").length > 0 && (
              <>
                <div className="flex items-center gap-2 mb-1 mt-5">
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#a3a3a3" }}>This Week</span>
                  <span className="chip" style={{ background: "rgba(255,255,255,0.04)", color: "#a3a3a3", fontSize: "10px", padding: "2px 8px" }}>
                    {filteredViewings.filter(v => getViewingSection(v) === "week").length} viewing{(filteredViewings.filter(v => getViewingSection(v) === "week").length) !== 1 ? "s" : ""}
                  </span>
                </div>
                {filteredViewings.filter(v => getViewingSection(v) === "week").map((v, i) => (
                  <div
                    key={`week-${i}`}
                    className="viewing-card animate-in"
                    style={{ animationDelay: `${0.05 * (i + 4)}s` }}
                    data-status={v.status}
                    onClick={() => { setSelectedViewing(v); openSheet("detail"); }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="date-badge" style={{ background: dateBg(v.status), border: dateBorder(v.status) }}>
                        <span className="day" style={{ color: dateColor(v.status) }}>{(() => { try { return new Date(v.date).getDate(); } catch { return ''; } })()}</span>
                        <span className="month" style={{ color: dateColor(v.status) }}>{(() => { try { return new Date(v.date).toLocaleString('en', { month: 'short' }); } catch { return ''; } })()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-white">{v.tenantName}</p>
                          <span className="chip" style={{ background: statusLabel(v.status).bg, color: statusLabel(v.status).color, fontSize: "10px", padding: "3px 8px" }}>
                            {statusLabel(v.status).label}
                          </span>
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: "#a3a3a3" }}>{v.propertyName}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="flex items-center gap-1 text-xs" style={{ color: "#a3a3a3" }}><Clock className="w-3 h-3" /> {v.startTime || v.duration}</span>
                          <span className="flex items-center gap-1 text-xs" style={{ color: "#a3a3a3" }}><Timer className="w-3 h-3" /> {v.duration}</span>
                          {v.status === "confirmed" && (
                            <span className="flex items-center gap-1 text-xs" style={{ color: "#047857" }}><CheckCircle className="w-3 h-3" /> Confirmed</span>
                          )}
                        </div>
                        {v.status === "pending" && (
                          <div className="flex items-center gap-2 mt-3">
                            <button onClick={(e) => { e.stopPropagation(); handleQuickAction("confirm"); }} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold" style={{ background: "rgba(4,120,87,0.12)", color: "#047857" }}>
                              <Check className="w-3.5 h-3.5" /> Confirm
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); openSheet("reschedule"); }} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold" style={{ background: "rgba(59,130,246,0.08)", color: "#3b82f6" }}>
                              <CalendarClock className="w-3.5 h-3.5" /> Reschedule
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); openSheet("cancelConfirm"); }} className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(239,68,68,0.08)" }}>
                              <X className="w-4 h-4" style={{ color: "#ef4444" }} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Completed Section */}
            {filteredViewings.filter(v => getViewingSection(v) === "completed").length > 0 && (
              <>
                <div className="flex items-center gap-2 mb-1 mt-5">
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#525252" }}>Completed</span>
                </div>
                {filteredViewings.filter(v => getViewingSection(v) === "completed").map((v, i) => (
                  <div
                    key={`completed-${i}`}
                    className="viewing-card animate-in"
                    style={{ animationDelay: `${0.05 * (i + 7)}s`, opacity: v.status === "cancelled" ? 0.5 : 0.65 }}
                    data-status={v.status}
                    onClick={() => { setSelectedViewing(v); openSheet("detail"); }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="date-badge" style={{ background: dateBg(v.status), border: dateBorder(v.status) }}>
                        <span className="day" style={{ color: dateColor(v.status) }}>{(() => { try { return new Date(v.date).getDate(); } catch { return ''; } })()}</span>
                        <span className="month" style={{ color: dateColor(v.status) }}>{(() => { try { return new Date(v.date).toLocaleString('en', { month: 'short' }); } catch { return ''; } })()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-white">{v.tenantName}</p>
                          <span className="chip" style={{ background: statusLabel(v.status).bg, color: statusLabel(v.status).color, fontSize: "10px", padding: "3px 8px" }}>
                            {statusLabel(v.status).label}
                          </span>
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: "#525252" }}>{v.propertyName}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="flex items-center gap-1 text-xs" style={{ color: "#525252" }}><Clock className="w-3 h-3" /> {v.startTime || v.duration}</span>
                          {v.status === "completed" && (
                            <span className="flex items-center gap-1 text-xs" style={{ color: "#047857" }}><CheckCircle className="w-3 h-3" /> Tenant applied</span>
                          )}
                          {v.status === "cancelled" && (
                            <span className="flex items-center gap-1 text-xs" style={{ color: "#ef4444" }}><XCircle className="w-3 h-3" /> Tenant cancelled</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}

            <div className="h-4"></div>
          </div>
        </div>

        {/* FAB */}
        <button onClick={() => openSheet("addViewing")} className="fixed z-50 flex items-center gap-2 px-5 py-3.5 rounded-2xl" style={{ bottom: "80px", right: "20px", background: "linear-gradient(135deg,#047857,#059669)", boxShadow: "0 8px 32px rgba(4,120,87,0.4)", border: "none", cursor: "pointer" }}>
          <CalendarPlus className="w-5 h-5 text-white" />
          <span className="text-sm font-semibold text-white">New Viewing</span>
        </button>

        <BottomNavAndMenu />
      </div>

      {/* =============================================== */}
      {/* ALL SHEETS */}
      {/* =============================================== */}

      {/* SORT */}
      <div className={`sheet-overlay ${activeSheet === "sort" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "sort" ? "active" : ""}`}>
        <div className="sheet-handle" />
        <div className="p-5">
          <h3 className="text-base font-bold text-white mb-4">Sort Viewings</h3>
          <div className="space-y-1">
            {["Date (Nearest First)", "Date (Furthest First)", "By Status", "By Property", "By Tenant Name"].map((opt) => (
              <div
                key={opt}
                className="sort-option"
                onClick={() => { setSortLabel(opt); setTimeout(() => closeSheet(), 200); }}
              >
                <div className={`sort-radio ${sortLabel === opt ? "selected" : ""}`} />
                <span className={`text-sm font-medium ${sortLabel === opt ? "text-white" : ""}`} style={{ color: sortLabel === opt ? undefined : "#a3a3a3" }}>
                  {opt}
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
              <CalendarDays className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "#525252" }} />
              <input type="text" className="android-input" style={{ paddingLeft: "44px", borderRadius: "14px" }} placeholder="Search viewings..." autoFocus value={searchText} onChange={(e) => setSearchText(e.target.value)} />
            </div>
            <button onClick={closeSheet} className="text-sm font-semibold" style={{ color: "#047857" }}>Cancel</button>
          </div>
          <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#525252" }}>Recent</h4>
          <div className="space-y-1">
            {[
              { icon: Clock, color: "#eab308", bg: "rgba(234,179,8,0.1)", title: "Pending Viewings", desc: "Viewings awaiting confirmation" },
              { icon: CheckCircle, color: "#047857", bg: "rgba(4,120,87,0.1)", title: "Today's Viewings", desc: "Scheduled for today" },
              { icon: User, color: "#3b82f6", bg: "rgba(59,130,246,0.1)", title: "By Tenant Name", desc: "Search specific tenant" },
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

      {/* VIEWING DETAIL */}
      <div className={`sheet-overlay ${activeSheet === "detail" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "detail" ? "active" : ""}`} style={{ maxHeight: "95dvh" }}>
        <div className="sheet-handle" />
        {selectedViewing && (() => {
          const v = selectedViewing;
          const st = statusLabel(v.status);
          const d = v.date ? new Date(v.date) : new Date();
          const dayOfWeek = d.toLocaleDateString('en', { weekday: 'long' });
          const dayNum = d.getDate();
          const monthName = d.toLocaleDateString('en', { month: 'short' });
          const fullDate = d.toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });

          return (
        <div className="p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-white">Viewing Details</h3>
            <button onClick={closeSheet} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)" }}>
              <X className="w-4 h-4" style={{ color: "#a3a3a3" }} />
            </button>
          </div>

          {/* Status Banner */}
          <div className="flex items-center gap-3 p-4 rounded-2xl mb-5" style={{ background: `${st.color}12`, border: `1px solid ${st.color}22` }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${st.color}1e` }}>
              {v.status === "pending" ? <Clock className="w-5 h-5" style={{ color: st.color }} /> :
               v.status === "confirmed" ? <CheckCircle className="w-5 h-5" style={{ color: st.color }} /> :
               v.status === "completed" ? <CheckCircle className="w-5 h-5" style={{ color: st.color }} /> :
               <XCircle className="w-5 h-5" style={{ color: st.color }} />}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: st.color }}>{st.label}</p>
              {v.status === "pending" && <p className="text-xs" style={{ color: "#a3a3a3" }}>Awaiting your response</p>}
              {v.status === "confirmed" && <p className="text-xs" style={{ color: "#a3a3a3" }}>Tenant has been notified</p>}
              {v.status === "completed" && <p className="text-xs" style={{ color: "#a3a3a3" }}>Viewing completed</p>}
              {v.status === "cancelled" && <p className="text-xs" style={{ color: "#a3a3a3" }}>Viewing cancelled</p>}
            </div>
          </div>

          {/* Date & Time */}
          <div className="flex items-center gap-4 p-4 rounded-2xl mb-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.04)" }}>
            <div className="date-badge" style={{ background: dateBg(v.status), border: dateBorder(v.status), width: "56px", height: "60px" }}>
              <span className="day" style={{ color: dateColor(v.status), fontSize: "22px" }}>{dayNum}</span>
              <span className="month" style={{ color: dateColor(v.status) }}>{monthName}</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">{fullDate}</p>
              <div className="flex items-center gap-4 mt-1">
                <span className="flex items-center gap-1.5 text-xs" style={{ color: "#a3a3a3" }}><Clock className="w-3.5 h-3.5" /> {v.startTime}{v.endTime ? ` — ${v.endTime}` : ''}</span>
                <span className="flex items-center gap-1.5 text-xs" style={{ color: "#a3a3a3" }}><Timer className="w-3.5 h-3.5" /> {v.duration}</span>
              </div>
            </div>
          </div>

          {/* Tenant Info */}
          <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#525252" }}>Tenant</h4>
          <div className="flex items-center gap-3 p-3 rounded-xl mb-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.04)" }}>
            <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: `rgba(4,120,87,0.12)` }}>
              <span className="text-sm font-bold" style={{ color: "#047857" }}>{v.tenantInitials || v.tenantName?.charAt(0) || '?'}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">{v.tenantName || 'Unknown'}</p>
              {v.tenantPhone && <p className="text-xs" style={{ color: "#a3a3a3" }}>{v.tenantPhone}</p>}
            </div>
            <div className="flex gap-2">
              <a href={`tel:${v.tenantPhone}`} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(4,120,87,0.1)" }}>
                <Phone className="w-4 h-4" style={{ color: "#047857" }} />
              </a>
              <a href={`https://wa.me/${v.tenantPhone?.replace(/^0/, '254')}`} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(37,211,102,0.1)" }}>
                <MessageCircle className="w-4 h-4" style={{ color: "#25D366" }} />
              </a>
            </div>
          </div>

          {/* Property Info */}
          <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#525252" }}>Property</h4>
          <div className="flex items-center gap-3 p-3 rounded-xl mb-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.04)" }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #047857, #059669)' }}><Home className="w-5 h-5 text-white" /></div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">{v.unitName || 'Unit'} — {v.propertyName}</p>
              <p className="text-xs" style={{ color: "#a3a3a3" }}>{v.propertyName}</p>
            </div>
          </div>

          {/* Notes */}
          {v.notes && (
            <>
              <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#525252" }}>Notes</h4>
              <div className="p-3 rounded-xl mb-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.04)" }}>
                <p className="text-sm" style={{ color: "#a3a3a3" }}>{v.notes}</p>
              </div>
            </>
          )}

          {/* Timeline */}
          <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#525252" }}>Activity</h4>
          <div className="space-y-0 mb-5">
            <div className="flex items-start gap-3">
              <div className="timeline-dot mt-1.5" style={{ background: "#047857" }} />
              <div className="flex-1 pb-4 relative">
                <div className="timeline-line absolute left-0 top-4 bottom-0" />
                <p className="text-xs font-medium text-white">Request received</p>
                <p className="text-xs" style={{ color: "#525252" }}>{v.createdAt?.toDate?.()?.toLocaleString?.() || v.date || ''}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="timeline-dot mt-1.5" style={{ background: v.status === 'confirmed' ? '#047857' : v.status === 'cancelled' ? '#ef4444' : '#eab308', animation: v.status === 'pending' ? 'pulse 2s infinite' : 'none' }} />
              <div className="flex-1">
                <p className="text-xs font-medium" style={{ color: v.status === 'confirmed' ? '#047857' : v.status === 'cancelled' ? '#ef4444' : '#eab308' }}>
                  {v.status === 'pending' ? 'Awaiting your confirmation' : v.status === 'confirmed' ? 'Confirmed' : v.status === 'completed' ? 'Completed' : 'Cancelled'}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            {v.status === "pending" && (
              <button onClick={() => { handleQuickAction("confirm"); closeSheet(); }} className="btn-primary ripple-container flex items-center justify-center gap-2">
                <Check className="w-4 h-4" /> Confirm Viewing
              </button>
            )}
            {v.status === "confirmed" && (
              <button onClick={() => { closeSheet(); setTimeout(() => openSheet("completeConfirm"), 300); }} className="btn-primary ripple-container flex items-center justify-center gap-2">
                <CheckCircle className="w-4 h-4" /> Mark Completed
              </button>
            )}
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => { closeSheet(); setTimeout(() => openSheet("reschedule"), 300); }} className="btn-secondary flex items-center justify-center gap-2" style={{ padding: "12px" }}>
                <CalendarClock className="w-4 h-4" /><span className="text-sm">Reschedule</span>
              </button>
              <button onClick={() => { closeSheet(); setTimeout(() => openSheet("cancelConfirm"), 300); }} className="btn-secondary flex items-center justify-center gap-2" style={{ padding: "12px", borderColor: "rgba(239,68,68,0.2)", color: "#ef4444" }}>
                <X className="w-4 h-4" /><span className="text-sm">Cancel</span>
              </button>
            </div>
          </div>
        </div>
        )})()}
      </div>

      {/* RESCHEDULE */}
      <div className={`sheet-overlay ${activeSheet === "reschedule" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "reschedule" ? "active" : ""}`} style={{ maxHeight: "95dvh" }}>
        <div className="sheet-handle" />
        <div className="p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-white">Reschedule</h3>
            <button onClick={closeSheet} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)" }}>
              <X className="w-4 h-4" style={{ color: "#a3a3a3" }} />
            </button>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl mb-5" style={{ background: "rgba(234,179,8,0.04)", border: "1px solid rgba(234,179,8,0.12)" }}>
            <Info className="w-4 h-4 flex-shrink-0" style={{ color: "#eab308" }} />
            <p className="text-xs" style={{ color: "#a3a3a3" }}>The tenant will be notified of the new time</p>
          </div>
          <div className="space-y-4">
            <div className="input-group">
              <input type="date" className="android-input" placeholder=" " value={resDate} onChange={(e) => setResDate(e.target.value)} />
              <label>Proposed Date</label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="input-group">
                <input type="time" className="android-input" placeholder=" " value={resStartTime} onChange={(e) => setResStartTime(e.target.value)} />
                <label style={{ top: "10px", fontSize: "11px", color: "#047857", fontWeight: "500" }}>Start Time</label>
              </div>
              <div className="input-group">
                <input type="time" className="android-input" placeholder=" " value={resEndTime} onChange={(e) => setResEndTime(e.target.value)} />
                <label style={{ top: "10px", fontSize: "11px", color: "#047857", fontWeight: "500" }}>End Time</label>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium block mb-2" style={{ color: "#a3a3a3" }}>Reason (optional)</label>
              <textarea className="android-input" style={{ minHeight: "60px", borderRadius: "14px" }} placeholder="Why are you rescheduling?" value={resReason} onChange={(e) => setResReason(e.target.value)} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
              <div>
                <p className="text-sm font-medium text-white">Notify tenant</p>
                <p className="text-xs" style={{ color: "#a3a3a3" }}>Send SMS & WhatsApp</p>
              </div>
              <div className="toggle-track active" onClick={(e) => e.currentTarget.classList.toggle("active")}>
                <div className="toggle-thumb" />
              </div>
            </div>
            <button onClick={() => handleForm("reschedule")} className="btn-primary ripple-container" disabled={formLoading === "reschedule" || rescheduleLoading}>
              {formLoading === "reschedule" || rescheduleLoading ? <div className="spinner mx-auto" /> : <span>Propose New Time</span>}
            </button>
          </div>
        </div>
      </div>

      {/* CANCEL CONFIRM */}
      <div className={`sheet-overlay ${activeSheet === "cancelConfirm" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "cancelConfirm" ? "active" : ""}`}>
        <div className="sheet-handle" />
        <div className="p-5 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <CalendarX className="w-8 h-8" style={{ color: "#ef4444" }} />
          </div>
          <h3 className="text-lg font-bold text-white">Cancel Viewing?</h3>
          <p className="text-sm mt-2 leading-relaxed" style={{ color: "#a3a3a3" }}>The tenant will be notified that this viewing has been cancelled.</p>
          <div className="mt-4 text-left">
            <label className="text-xs font-medium block mb-2" style={{ color: "#a3a3a3" }}>Reason</label>
            <select className="android-select" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)}>
              <option>Property no longer available</option>
              <option>Scheduling conflict</option>
              <option>Property under maintenance</option>
              <option>Other</option>
            </select>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl mt-4" style={{ background: "rgba(255,255,255,0.03)" }}>
            <div className="text-left">
              <p className="text-sm font-medium text-white">Notify tenant</p>
              <p className="text-xs" style={{ color: "#a3a3a3" }}>Send cancellation notice</p>
            </div>
            <div className="toggle-track active" onClick={(e) => e.currentTarget.classList.toggle("active")}>
              <div className="toggle-thumb" />
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={closeSheet} className="btn-secondary flex-1" style={{ padding: "14px" }}>Keep</button>
            <button onClick={() => handleForm("cancel")} className="btn-danger flex-1" style={{ padding: "14px" }} disabled={formLoading === "cancel"}>
              {formLoading === "cancel" ? <div className="spinner mx-auto" /> : <span>Cancel Viewing</span>}
            </button>
          </div>
        </div>
      </div>

      {/* DIRECTIONS */}
      <div className={`sheet-overlay ${activeSheet === "directions" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "directions" ? "active" : ""}`}>
        <div className="sheet-handle" />
        <div className="p-5">
          {(() => {
            const v = selectedViewing;
            const propName = v?.propertyName || 'Property';
            const mapUrl = '';
            const googleMapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(propName + ' Nairobi')}`;
            return <>
          <h3 className="text-base font-bold text-white mb-4">Directions to {propName}</h3>
          <div className="rounded-2xl overflow-hidden mb-4 relative" style={{ height: "140px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <img src={mapUrl} className="w-full h-full object-cover" style={{ opacity: 0.6 }} />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(4,120,87,0.8)", backdropFilter: "blur(8px)" }}>
                <Navigation className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
              <MapPin className="w-4 h-4" style={{ color: "#047857" }} />
              <div>
                <p className="text-sm font-medium text-white">{propName}</p>
                <p className="text-xs" style={{ color: "#a3a3a3" }}>{v?.unitName ? `${v.unitName}, ` : ''}Nairobi</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
              <Car className="w-4 h-4" style={{ color: "#a3a3a3" }} />
              <p className="text-xs" style={{ color: "#a3a3a3" }}>Located in {propName} — use Maps for directions</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { window.open(googleMapsUrl, '_blank'); closeSheet(); }} className="btn-primary flex-1 flex items-center justify-center gap-2" style={{ padding: "12px" }}>
              <Map className="w-4 h-4" /><span className="text-sm">Open Maps</span>
            </button>
            <button onClick={() => { navigator.clipboard?.writeText(googleMapsUrl); showSnackbar("Link copied!", "success"); closeSheet(); }} className="btn-secondary flex items-center justify-center gap-2" style={{ padding: "12px", width: "auto" }}>
              <Share2 className="w-4 h-4" />
            </button>
          </div>
          </>;
          })()}
        </div>
      </div>

      {/* CONTACT TENANT */}
      <div className={`sheet-overlay ${activeSheet === "contactTenant" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "contactTenant" ? "active" : ""}`}>
        <div className="sheet-handle" />
        <div className="p-5">
          {(() => {
            const v = selectedViewing;
            const initials = v?.tenantName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
            const phone = v?.tenantPhone ? `+254 ${v.tenantPhone}` : '+254 700 000 000';
            const name = v?.tenantName || 'Tenant';
            return <>
          <h3 className="text-base font-bold text-white mb-4">Contact Tenant</h3>
          <div className="flex items-center gap-3 p-3 rounded-xl mb-5" style={{ background: "rgba(255,255,255,0.03)" }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(4,120,87,0.12)" }}>
              <span className="text-xs font-bold" style={{ color: "#047857" }}>{initials}</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{name}</p>
              <p className="text-xs" style={{ color: "#a3a3a3" }}>{phone}</p>
            </div>
          </div>
          <div className="space-y-2">
            <a href={`tel:${phone.replace(/[^0-9]/g, '')}`} className="w-full flex items-center gap-4 p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)" }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "rgba(4,120,87,0.12)" }}>
                <Phone className="w-5 h-5" style={{ color: "#047857" }} />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-white">Call</p>
                <p className="text-xs" style={{ color: "#a3a3a3" }}>{phone}</p>
              </div>
            </a>
            <a href={`https://wa.me/${(v?.tenantPhone || '700000000').replace(/^0/, '254')}`} target="_blank" rel="noopener noreferrer" className="w-full flex items-center gap-4 p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)" }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "rgba(37,211,102,0.12)" }}>
                <MessageCircle className="w-5 h-5" style={{ color: "#25D366" }} />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-white">WhatsApp</p>
                <p className="text-xs" style={{ color: "#a3a3a3" }}>Send a message</p>
              </div>
            </a>
            <a href={`sms:${(v?.tenantPhone || '700000000').replace(/^0/, '+254')}`} className="w-full flex items-center gap-4 p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)" }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "rgba(59,130,246,0.12)" }}>
                <Smartphone className="w-5 h-5" style={{ color: "#3b82f6" }} />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-white">SMS</p>
                <p className="text-xs" style={{ color: "#a3a3a3" }}>Send text message</p>
              </div>
            </a>
          </div>
          </>;
          })()}
        </div>
      </div>

      {/* ACTIONS (for confirmed viewings) */}
      <div className={`sheet-overlay ${activeSheet === "actions" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "actions" ? "active" : ""}`}>
        <div className="sheet-handle" />
        <div className="p-5 pb-2">
          <h3 className="text-base font-bold text-white">Viewing Actions</h3>
        </div>
        <div className="px-3 pb-8">
          <button onClick={() => { closeSheet(); setTimeout(() => openSheet("directions"), 300); }} className="w-full flex items-center gap-4 p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(4,120,87,0.12)" }}>
              <Navigation className="w-5 h-5" style={{ color: "#047857" }} />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-white">Get Directions</p>
              <p className="text-xs" style={{ color: "#a3a3a3" }}>Open in Maps</p>
            </div>
          </button>
          <button onClick={() => { closeSheet(); setTimeout(() => openSheet("contactTenant"), 300); }} className="w-full flex items-center gap-4 p-4 rounded-2xl mt-1" style={{ background: "rgba(255,255,255,0.03)" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(59,130,246,0.12)" }}>
              <Phone className="w-5 h-5" style={{ color: "#3b82f6" }} />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-white">Contact Tenant</p>
              <p className="text-xs" style={{ color: "#a3a3a3" }}>Call or message</p>
            </div>
          </button>
          <button onClick={() => { closeSheet(); setTimeout(() => openSheet("reschedule"), 300); }} className="w-full flex items-center gap-4 p-4 rounded-2xl mt-1" style={{ background: "rgba(255,255,255,0.03)" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(234,179,8,0.12)" }}>
              <CalendarClock className="w-5 h-5" style={{ color: "#eab308" }} />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-white">Reschedule</p>
              <p className="text-xs" style={{ color: "#a3a3a3" }}>Propose a new time</p>
            </div>
          </button>
          <button onClick={() => { closeSheet(); handleQuickAction("complete"); }} className="w-full flex items-center gap-4 p-4 rounded-2xl mt-1" style={{ background: "rgba(255,255,255,0.03)" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(59,130,246,0.12)" }}>
              <CheckCircle className="w-5 h-5" style={{ color: "#3b82f6" }} />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-white">Mark Completed</p>
              <p className="text-xs" style={{ color: "#a3a3a3" }}>Viewing finished</p>
            </div>
          </button>
          <button onClick={() => { closeSheet(); setTimeout(() => openSheet("cancelConfirm"), 300); }} className="w-full flex items-center gap-4 p-4 rounded-2xl mt-1" style={{ background: "rgba(255,255,255,0.03)" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(239,68,68,0.12)" }}>
              <XCircle className="w-5 h-5" style={{ color: "#ef4444" }} />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold" style={{ color: "#ef4444" }}>Cancel Viewing</p>
              <p className="text-xs" style={{ color: "#a3a3a3" }}>Cancel this viewing</p>
            </div>
          </button>
        </div>
      </div>

      {/* ADD VIEWING */}
      <div className={`sheet-overlay ${activeSheet === "addViewing" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "addViewing" ? "active" : ""}`} style={{ maxHeight: "95dvh" }}>
        <div className="sheet-handle" />
        <div className="p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-white">New Viewing</h3>
            <button onClick={closeSheet} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)" }}>
              <X className="w-4 h-4" style={{ color: "#a3a3a3" }} />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium block mb-2" style={{ color: "#a3a3a3" }}>Property</label>
              <select className="android-select" value={addPropName} onChange={(e) => { setAddPropName(e.target.value); setAddPropId(e.target.value); }}>
                <option value="">Select property</option>
                {[...new Set(viewings.filter(v => v.propertyName).map(v => v.propertyName))].map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium block mb-2" style={{ color: "#a3a3a3" }}>Unit</label>
              <select className="android-select" value={addUnitName} onChange={(e) => setAddUnitName(e.target.value)}>
                <option value="">Select unit</option>
                {[...new Set(viewings.filter(v => v.unitName).map(v => v.unitName))].map((u) => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div className="input-group">
              <input type="text" className="android-input" placeholder=" " value={addTenantName} onChange={(e) => setAddTenantName(e.target.value)} />
              <label>Tenant Name</label>
            </div>
            <div className="input-group">
              <input type="tel" className="android-input" placeholder=" " style={{ paddingLeft: "60px" }} value={addTenantPhone} onChange={(e) => setAddTenantPhone(e.target.value)} />
              <label style={{ left: "60px" }}>Phone Number</label>
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: "#a3a3a3" }}>+254</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="input-group">
                <input type="date" className="android-input" placeholder=" " value={addDate} onChange={(e) => setAddDate(e.target.value)} />
                <label>Date</label>
              </div>
              <div className="input-group">
                <input type="time" className="android-input" placeholder=" " value={addTime} onChange={(e) => setAddTime(e.target.value)} />
                <label style={{ top: "10px", fontSize: "11px", color: "#047857", fontWeight: "500" }}>Time</label>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium block mb-2" style={{ color: "#a3a3a3" }}>Duration</label>
              <select className="android-select" value={addDuration} onChange={(e) => setAddDuration(e.target.value)}>
                <option>30 minutes</option>
                <option>45 minutes</option>
                <option>1 hour</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium block mb-2" style={{ color: "#a3a3a3" }}>Notes</label>
              <textarea className="android-input" style={{ minHeight: "60px", borderRadius: "14px" }} placeholder="Any special instructions..." value={addNotes} onChange={(e) => setAddNotes(e.target.value)} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
              <div>
                <p className="text-sm font-medium text-white">Send reminder</p>
                <p className="text-xs" style={{ color: "#a3a3a3" }}>1 hour before viewing</p>
              </div>
              <div className="toggle-track active" onClick={(e) => e.currentTarget.classList.toggle("active")}>
                <div className="toggle-thumb" />
              </div>
            </div>
            <button onClick={() => handleForm("add")} className="btn-primary ripple-container" disabled={formLoading === "add" || addViewingLoading}>
              {formLoading === "add" || addViewingLoading ? <div className="spinner mx-auto" /> : <span>Schedule Viewing</span>}
            </button>
          </div>
        </div>
      </div>

      {/* COMPLETE CONFIRM */}
      <div className={`sheet-overlay ${activeSheet === "completeConfirm" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "completeConfirm" ? "active" : ""}`}>
        <div className="sheet-handle" />
        <div className="p-5 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)" }}>
            <CheckCircle className="w-8 h-8" style={{ color: "#3b82f6" }} />
          </div>
          <h3 className="text-lg font-bold text-white">Mark as Completed?</h3>
          <p className="text-sm mt-2 leading-relaxed" style={{ color: "#a3a3a3" }}>This viewing has been completed. You can add notes about the outcome.</p>
          <div className="mt-4 text-left">
            <label className="text-xs font-medium block mb-2" style={{ color: "#a3a3a3" }}>Outcome</label>
            <select className="android-select" value={completeOutcome} onChange={(e) => setCompleteOutcome(e.target.value)}>
              <option>Tenant is interested</option>
              <option>Tenant will apply</option>
              <option>Tenant not interested</option>
              <option>Tenant did not show up</option>
            </select>
          </div>
          <div className="mt-3 text-left">
            <label className="text-xs font-medium block mb-2" style={{ color: "#a3a3a3" }}>Notes (optional)</label>
            <textarea className="android-input" style={{ minHeight: "50px", borderRadius: "14px" }} placeholder="How did it go?" value={completeNotes} onChange={(e) => setCompleteNotes(e.target.value)} />
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={closeSheet} className="btn-secondary flex-1" style={{ padding: "14px" }}>Cancel</button>
            <button onClick={() => handleForm("complete")} className="btn-primary flex-1" style={{ padding: "14px" }} disabled={formLoading === "complete"}>
              {formLoading === "complete" ? <div className="spinner mx-auto" /> : <span>Complete</span>}
            </button>
          </div>
        </div>
      </div>

      {/* CONFIRM VIEWING SHEET */}
      <div className={`sheet-overlay ${activeSheet === "confirmViewing" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "confirmViewing" ? "active" : ""}`}>
        <div className="sheet-handle" />
        <div className="p-5 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ background: "rgba(4,120,87,0.1)", border: "1px solid rgba(4,120,87,0.2)" }}>
            <Check className="w-8 h-8" style={{ color: "#047857" }} />
          </div>
          <h3 className="text-lg font-bold text-white">Confirm Viewing?</h3>
          <p className="text-sm mt-2 leading-relaxed" style={{ color: "#a3a3a3" }}>
            The tenant will receive a confirmation message and calendar invite.
          </p>
          <div className="flex gap-3 mt-6">
            <button onClick={closeSheet} className="btn-secondary flex-1" style={{ padding: "14px" }}>Cancel</button>
            <button
              onClick={() => handleForm("confirm")}
              className="btn-primary flex-1"
              style={{ padding: "14px" }}
              disabled={formLoading === "confirm"}
            >
              {formLoading === "confirm" ? <div className="spinner mx-auto" /> : <span>Confirm</span>}
            </button>
          </div>
        </div>
      </div>

      {/* MORE MENU */}
      <div className={`sheet-overlay ${activeSheet === "moreMenu" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "moreMenu" ? "active" : ""}`}>
        <div className="sheet-handle" />
        <div className="p-5 pb-2">
          <h3 className="text-lg font-bold text-white">More</h3>
          <p className="text-xs mt-1" style={{ color: "#a3a3a3" }}>All modules &amp; settings</p>
        </div>
        <div className="px-3 pb-8">
          {[
            { icon: Layers, label: "Units", desc: "8 units across 4 properties", color: "#3b82f6", path: "/units" },
            { icon: CalendarDays, label: "Viewings", desc: "8 viewing requests", color: "#eab308", path: "/viewings" },
            { icon: CalendarDays, label: "Calendar", desc: "Viewings & schedule", color: "#eab308", path: "/calendar" },
            { icon: MessageSquare, label: "Messages", desc: "18 conversations", color: "#a855f7", path: "/messages" },
            { icon: Settings, label: "Settings", desc: "Account & preferences", color: "#525252", path: "/settings" },
          ].map((item, i) => (
            <button
              key={i}
              onClick={() => {
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

      {/* ====== SNACKBAR ====== */}
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

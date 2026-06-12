"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Wrench,
  AlertTriangle,
  Check,
  X,
  Info,
  ArrowLeft,
  Search,
  LayoutDashboard,
  Building2,
  List,
  Menu,
  ChevronRight,
  Clock,
  BadgeCheck,
  Megaphone,
  MessageSquareWarning,
  DoorOpen,
  Loader2,
  Filter,
  MapPin,
  Phone,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Settings,
  MessageCircle,
  MessageSquare,
  CalendarDays,
  Layers,
} from "lucide-react";
import AuthGuard from "../components/AuthGuard";
import { useAuth } from "../AuthContext";
import {
  listenToMaintenanceRequests,
  updateMaintenanceStatus,
  deleteMaintenanceRequest,
  type MaintenanceData,
  type MaintenanceStatus,
} from "../../lib/maintenance";

type SnackbarType = "success" | "error" | "info";
type TabFilter = "all" | "open" | "in-progress" | "resolved" | "closed";

export default function MaintenancePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("home");

  // ---- Data ----
  const [requests, setRequests] = useState<MaintenanceData[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<TabFilter>("all");
  const [searchText, setSearchText] = useState("");

  // ---- Sheet State ----
  const [activeSheet, setActiveSheet] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceData | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  // ---- Snackbar ----
  const [snackbar, setSnackbar] = useState<{ show: boolean; message: string; type: SnackbarType }>({ show: false, message: "", type: "info" });
  const snackbarTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarAnimClass, setSnackbarAnimClass] = useState("");

  const showSnackbar = (message: string, type: SnackbarType = "info") => {
    setSnackbar({ show: true, message, type });
    if (snackbarTimeoutRef.current) clearTimeout(snackbarTimeoutRef.current);
    snackbarTimeoutRef.current = setTimeout(() => setSnackbar({ show: false, message: "", type: "info" }), 3000);
  };
  const hideSnackbar = () => setSnackbar({ show: false, message: "", type: "info" });

  useEffect(() => {
    if (snackbar.show) { setSnackbarVisible(true); setSnackbarAnimClass("show"); }
    else { setSnackbarAnimClass("hide"); const t = setTimeout(() => { setSnackbarVisible(false); setSnackbarAnimClass(""); }, 300); return () => clearTimeout(t); }
  }, [snackbar.show]);

  // ---- Listener ----
  useEffect(() => {
    if (!user) { setDataLoading(false); return; }
    const unsub = listenToMaintenanceRequests(user.uid, (data) => { setRequests(data); setDataLoading(false); }, () => setDataLoading(false));
    return () => unsub();
  }, [user]);

  // ---- Filters ----
  const filteredRequests = requests
    .filter((r) => {
      if (activeFilter === "all") return true;
      return r.status === activeFilter;
    })
    .filter((r) => {
      if (!searchText.trim()) return true;
      const q = searchText.toLowerCase();
      return r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q) || r.unitName.toLowerCase().includes(q) || r.propertyName.toLowerCase().includes(q) || r.tenantName.toLowerCase().includes(q);
    });

  const statusCounts = {
    all: requests.length,
    open: requests.filter((r) => r.status === "open").length,
    "in-progress": requests.filter((r) => r.status === "in-progress").length,
    resolved: requests.filter((r) => r.status === "resolved").length,
    closed: requests.filter((r) => r.status === "closed").length,
  };

  // ---- Status Colors ----
  const statusMeta: Record<string, { color: string; bg: string; label: string }> = {
    open: { color: "#ef4444", bg: "rgba(239,68,68,0.1)", label: "Open" },
    "in-progress": { color: "#3b82f6", bg: "rgba(59,130,246,0.1)", label: "In Progress" },
    resolved: { color: "#047857", bg: "rgba(4,120,87,0.1)", label: "Resolved" },
    closed: { color: "#525252", bg: "rgba(255,255,255,0.05)", label: "Closed" },
  };

  const urgencyMeta: Record<string, { color: string; bg: string }> = {
    Urgent: { color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
    Medium: { color: "#f97316", bg: "rgba(249,115,22,0.12)" },
    Low: { color: "#eab308", bg: "rgba(234,179,8,0.12)" },
  };

  // ---- Handlers ----
  const handleStatusUpdate = async (id: string, newStatus: MaintenanceStatus) => {
    setStatusLoading(true);
    try {
      await updateMaintenanceStatus(id, newStatus);
      showSnackbar(`Request ${newStatus === "in-progress" ? "marked in progress" : newStatus === "resolved" ? "resolved" : "closed"} ✅`, "success");
      closeSheet();
    } catch (err: any) {
      showSnackbar(err.message || "Failed to update status", "error");
    }
    setStatusLoading(false);
  };

  const handleDelete = async (id: string) => {
    setStatusLoading(true);
    try {
      await deleteMaintenanceRequest(id);
      showSnackbar("Request deleted", "info");
      closeSheet();
    } catch (err: any) {
      showSnackbar(err.message || "Failed to delete", "error");
    }
    setStatusLoading(false);
  };

  const openSheet = (name: string) => setActiveSheet(name);
  const closeSheet = () => { setActiveSheet(null); setSelectedRequest(null); };

  // ---- Time Ago ----
  function timeAgo(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return date.toLocaleDateString();
  }

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

  // ---- Urgency Icon ----
  const urgencyIcon = (urgency: string) => {
    switch (urgency) {
      case "Urgent": return <AlertTriangle className="w-4 h-4" />;
      case "Medium": return <AlertCircle className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  return (
    <AuthGuard>
      <div style={{ background: "#050505", color: "#e5e5e5", fontFamily: "'Inter', sans-serif", minHeight: "100dvh" }}>
        <div className="app-shell">
          <div className="status-bar" />

          {/* HEADER */}
          <div className="app-header">
            <div className="flex items-center justify-between px-5 pt-3 pb-1">
              <button onClick={() => router.back()} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)" }}>
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="text-center">
                <h1 className="text-lg font-bold text-white">Maintenance</h1>
                <p className="text-xs" style={{ color: "#a3a3a3" }}>{requests.length} requests</p>
              </div>
              <button onClick={() => openSheet("filter")} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)" }}>
                <Filter className="w-5 h-5" style={{ color: "#a3a3a3" }} />
              </button>
            </div>

            {/* Search */}
            <div className="px-5 py-2">
              <div className="relative">
                <Search className="w-4.5 h-4.5 absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "#525252" }} />
                <input
                  type="text"
                  className="android-input"
                  style={{ paddingLeft: "44px", borderRadius: "14px", paddingTop: "12px", paddingBottom: "12px", fontSize: "14px" }}
                  placeholder="Search requests..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
              </div>
            </div>

            {/* Filter Chips */}
            <div className="filter-scroll py-1 pb-2">
              {([
                { key: "all" as TabFilter, label: "All", count: statusCounts.all },
                { key: "open" as TabFilter, label: "Open", count: statusCounts.open, dot: "#ef4444" },
                { key: "in-progress" as TabFilter, label: "In Progress", count: statusCounts["in-progress"], dot: "#3b82f6" },
                { key: "resolved" as TabFilter, label: "Resolved", count: statusCounts.resolved, dot: "#047857" },
                { key: "closed" as TabFilter, label: "Closed", count: statusCounts.closed, dot: "#525252" },
              ]).map((f) => (
                <button
                  key={f.key}
                  className={`filter-chip ${activeFilter === f.key ? "active" : ""}`}
                  onClick={() => setActiveFilter(f.key)}
                >
                  {f.dot && <span className="w-2 h-2 rounded-full" style={{ background: f.dot }} />}
                  {f.label}
                  <span className="count">{f.count}</span>
                </button>
              ))}
            </div>
          </div>

          {/* MAIN CONTENT */}
          <div className="app-content">
            <div className="px-5 pb-28 pt-3">
              {/* Stats Cards */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                {[
                  { label: "Open", value: statusCounts.open, color: "#ef4444", bg: "rgba(239,68,68,0.06)" },
                  { label: "In Progress", value: statusCounts["in-progress"], color: "#3b82f6", bg: "rgba(59,130,246,0.06)" },
                  { label: "Resolved", value: statusCounts.resolved, color: "#047857", bg: "rgba(4,120,87,0.06)" },
                  { label: "Urgent", value: requests.filter(r => r.urgency === "Urgent" && r.status !== "resolved" && r.status !== "closed").length, color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
                ].map((s, i) => (
                  <div key={i} className="p-2.5 rounded-xl text-center" style={{ background: s.bg, border: `1px solid ${s.bg}` }}>
                    <p className="text-base font-bold" style={{ color: s.color }}>{s.value}</p>
                    <p className="text-xs" style={{ color: s.color }}>{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Loading */}
              {dataLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#047857" }} />
                  <p className="text-sm mt-3" style={{ color: "#a3a3a3" }}>Loading maintenance requests...</p>
                </div>
              ) : filteredRequests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Wrench className="w-12 h-12 mb-3" style={{ color: "#525252" }} />
                  <p className="text-base font-semibold text-white">No maintenance requests</p>
                  <p className="text-sm mt-1" style={{ color: "#a3a3a3" }}>All clear! No {activeFilter !== "all" ? activeFilter : ""} requests found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredRequests.map((req, i) => {
                    const status = statusMeta[req.status] || statusMeta.open;
                    const urgency = urgencyMeta[req.urgency] || urgencyMeta.Medium;
                    const timeStr = req.createdAt ? timeAgo(req.createdAt.toDate()) : "Recently";
                    return (
                      <div
                        key={req.id}
                        className="card animate-in"
                        style={{ animationDelay: `${i * 0.05}s`, padding: "16px", cursor: "pointer" }}
                        onClick={() => { setSelectedRequest(req); openSheet("detail"); }}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: urgency.bg }}>
                            {urgencyIcon(req.urgency)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-white truncate">{req.title}</p>
                              <span className="chip flex-shrink-0" style={{ background: status.bg, color: status.color, fontSize: "10px" }}>{status.label}</span>
                            </div>
                            <p className="text-xs mt-1" style={{ color: "#a3a3a3" }}>{req.unitName}{req.propertyName ? ` — ${req.propertyName}` : ""}</p>
                            <p className="text-xs mt-0.5 line-clamp-2" style={{ color: "#525252" }}>{req.description}</p>
                            <div className="flex items-center justify-between mt-2">
                              <div className="flex items-center gap-2">
                                <span className="chip" style={{ background: urgency.bg, color: urgency.color, fontSize: "9px", padding: "2px 6px" }}>{req.urgency}</span>
                                {req.tenantName && <span className="text-xs" style={{ color: "#525252" }}>{req.tenantName}</span>}
                              </div>
                              <span className="text-xs" style={{ color: "#525252" }}>{timeStr}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* BOTTOM NAV */}
          <div className="app-bottom-nav">
            <div className="bottom-nav">
              <div className="flex">
                {[
                  { key: "home", icon: LayoutDashboard, label: "Home", path: "/dashboard" },
                  { key: "properties", icon: Building2, label: "Properties", path: "/properties" },
                  { key: "listings", icon: List, label: "Listings", path: "/listings" },
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

        {/* DETAIL SHEET */}
        <div className={`sheet-overlay ${activeSheet === "detail" ? "active" : ""}`} onClick={closeSheet} />
        <div className={`bottom-sheet ${activeSheet === "detail" ? "active" : ""}`} style={{ maxHeight: "95dvh" }}>
          {selectedRequest && (() => {
            const status = statusMeta[selectedRequest.status] || statusMeta.open;
            const urgency = urgencyMeta[selectedRequest.urgency] || urgencyMeta.Medium;
            const timeStr = selectedRequest.createdAt ? timeAgo(selectedRequest.createdAt.toDate()) : "Recently";
            return (
              <>
                <div className="sheet-handle" />
                <div className="p-5">
                  <div className="flex items-start gap-4 mb-5">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: urgency.bg }}>
                      {urgencyIcon(selectedRequest.urgency)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-white">{selectedRequest.title}</h3>
                      <p className="text-sm mt-1" style={{ color: "#a3a3a3" }}>{selectedRequest.unitName}{selectedRequest.propertyName ? ` — ${selectedRequest.propertyName}` : ""}</p>
                    </div>
                    <button onClick={closeSheet} className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.05)" }}>
                      <X className="w-4 h-4" style={{ color: "#a3a3a3" }} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-5">
                    <div className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
                      <p className="text-xs" style={{ color: "#525252" }}>Status</p>
                      <span className="chip mt-1" style={{ background: status.bg, color: status.color, fontSize: "11px" }}>{status.label}</span>
                    </div>
                    <div className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
                      <p className="text-xs" style={{ color: "#525252" }}>Urgency</p>
                      <span className="chip mt-1" style={{ background: urgency.bg, color: urgency.color, fontSize: "11px" }}>{selectedRequest.urgency}</span>
                    </div>
                    <div className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
                      <p className="text-xs" style={{ color: "#525252" }}>Reported</p>
                      <p className="text-sm font-semibold text-white">{timeStr}</p>
                    </div>
                    <div className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
                      <p className="text-xs" style={{ color: "#525252" }}>Tenant</p>
                      <p className="text-sm font-semibold text-white">{selectedRequest.tenantName || "—"}</p>
                    </div>
                  </div>

                  <div className="mb-5">
                    <h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#525252" }}>Description</h4>
                    <p className="text-sm leading-relaxed" style={{ color: "#a3a3a3" }}>{selectedRequest.description || "No description"}</p>
                  </div>

                  {/* Status Actions */}
                  <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#525252" }}>Update Status</h4>
                  <div className="flex flex-wrap gap-2 mb-5">
                    {selectedRequest.status === "open" && (
                      <button
                        onClick={() => handleStatusUpdate(selectedRequest.id, "in-progress")}
                        className="btn-secondary flex-1 flex items-center justify-center gap-2 ripple-container"
                        style={{ padding: "12px", background: "rgba(59,130,246,0.1)", borderColor: "rgba(59,130,246,0.2)" }}
                        disabled={statusLoading}
                      >
                        {statusLoading ? <div className="spinner" style={{ width: "16px", height: "16px" }} /> : <><CheckCircle2 className="w-4 h-4" style={{ color: "#3b82f6" }} /><span style={{ color: "#3b82f6" }}>Start</span></>}
                      </button>
                    )}
                    {selectedRequest.status === "in-progress" && (
                      <button
                        onClick={() => handleStatusUpdate(selectedRequest.id, "resolved")}
                        className="btn-secondary flex-1 flex items-center justify-center gap-2 ripple-container"
                        style={{ padding: "12px", background: "rgba(4,120,87,0.1)", borderColor: "rgba(4,120,87,0.2)" }}
                        disabled={statusLoading}
                      >
                        {statusLoading ? <div className="spinner" style={{ width: "16px", height: "16px" }} /> : <><CheckCircle2 className="w-4 h-4" style={{ color: "#047857" }} /><span style={{ color: "#047857" }}>Resolve</span></>}
                      </button>
                    )}
                    {(selectedRequest.status === "resolved" || selectedRequest.status === "open") && (
                      <button
                        onClick={() => handleStatusUpdate(selectedRequest.id, "closed")}
                        className="btn-secondary flex-1 flex items-center justify-center gap-2 ripple-container"
                        style={{ padding: "12px" }}
                        disabled={statusLoading}
                      >
                        {statusLoading ? <div className="spinner" style={{ width: "16px", height: "16px" }} /> : <><X className="w-4 h-4" /><span>Close</span></>}
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => handleDelete(selectedRequest.id)}
                    className="btn-danger w-full flex items-center justify-center gap-2 ripple-container"
                    style={{ padding: "12px" }}
                    disabled={statusLoading}
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Request</span>
                  </button>
                </div>
              </>
            );
          })()}
        </div>

        {/* MORE MENU SHEET */}
        <div className={`sheet-overlay ${activeSheet === "moreMenu" ? "active" : ""}`} onClick={closeSheet} />
        <div className={`bottom-sheet ${activeSheet === "moreMenu" ? "active" : ""}`}>
          <div className="sheet-handle" />
          <div className="p-5 pb-2">
            <h3 className="text-lg font-bold text-white">More</h3>
          </div>
          <div className="px-3 pb-8">
            {[
              { icon: MessageCircle, label: "Inquiries", color: "#047857", path: "/inquiries" },
              { icon: Layers, label: "Units", color: "#3b82f6", path: "/units" },
              { icon: CalendarDays, label: "Calendar", color: "#eab308", path: "/calendar" },
              { icon: Clock, label: "Viewings", color: "#eab308", path: "/viewings" },
            { icon: MessageSquare, label: "Messages", color: "#a855f7", path: "/messages" },
            { icon: DoorOpen, label: "Vacating", color: "#f97316", path: "/vacating" },
            { icon: BadgeCheck, label: "Rent Verification", color: "#6366f1", path: "/rent-verification" },
            { icon: Megaphone, label: "Notices", color: "#f97316", path: "/notices" },
            { icon: MessageSquareWarning, label: "Complaints", color: "#ef4444", path: "/complaints" },
            { icon: Settings, label: "Settings", color: "#525252", path: "/settings" },
          ].map((item, i) => (
              <button
                key={i}
                onClick={() => { closeSheet(); router.push(item.path!); }}
                className="w-full flex items-center gap-4 p-4 rounded-2xl mt-1"
                style={{ background: "rgba(255,255,255,0.03)" }}
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "rgba(4,120,87,0.08)", border: "1px solid rgba(255,255,255,0.04)" }}>
                  <item.icon className="w-5 h-5" style={{ color: item.color }} />
                </div>
                <div className="text-left flex-1">
                  <p className="text-sm font-semibold text-white">{item.label}</p>
                </div>
                <ChevronRight className="w-4 h-4" style={{ color: "#525252" }} />
              </button>
            ))}
          </div>
        </div>

        {/* SNACKBAR */}
        {snackbarVisible && (
          <div className={`snackbar ${snackbarAnimClass}`}>
            <div className="flex items-center gap-3">
              <div>{snackbar.type === "success" ? <Check className="w-4 h-4" style={{ color: "#047857" }} /> : snackbar.type === "error" ? <X className="w-4 h-4" style={{ color: "#ef4444" }} /> : <Info className="w-4 h-4" style={{ color: "#3b82f6" }} />}</div>
              <div className="flex-1"><p className="text-sm font-medium text-white">{snackbar.message}</p></div>
              <button onClick={hideSnackbar} className="p-1"><X className="w-4 h-4" style={{ color: "#525252" }} /></button>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}

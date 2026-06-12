"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Clock,
  BadgeCheck,
  Megaphone,
  MessageSquareWarning,
  DoorOpen,
  Check,
  X,
  Info,
  ArrowLeft,
  LayoutDashboard,
  Building2,
  List,
  Menu,
  Loader2,
  Phone,
  MessageCircle,
  Settings,
  Wrench,
  MessageSquare,
  Layers,
} from "lucide-react";
import AuthGuard from "../components/AuthGuard";
import { useAuth } from "../AuthContext";
import { listenToViewings, confirmViewing, cancelViewing, type ViewingData } from "../../lib/viewings";
import { listenToUnits, type UnitData } from "../../lib/units";
import { listenToMaintenanceRequests, type MaintenanceData } from "../../lib/maintenance";

type SnackbarType = "success" | "error" | "info";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("home");

  // ---- Date State ----
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // ---- Firestore Data ----
  const [viewings, setViewings] = useState<ViewingData[]>([]);
  const [units, setUnits] = useState<UnitData[]>([]);
  const [maintenanceReqs, setMaintenanceReqs] = useState<MaintenanceData[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // ---- Sheet State ----
  const [activeSheet, setActiveSheet] = useState<string | null>(null);
  const [selectedViewing, setSelectedViewing] = useState<ViewingData | null>(null);

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

  // ---- Listeners ----
  useEffect(() => {
    if (!user) { setDataLoading(false); return; }
    const unsubs: (() => void)[] = [];
    unsubs.push(listenToViewings(user.uid, (data) => { setViewings(data); setDataLoading(false); }, () => setDataLoading(false)));
    unsubs.push(listenToUnits(user.uid, (data) => setUnits(data), () => {}));
    unsubs.push(listenToMaintenanceRequests(user.uid, (data) => setMaintenanceReqs(data), () => {}));
    return () => unsubs.forEach((u) => u());
  }, [user]);

  // ---- Calendar Logic ----
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const prevMonth = () => { if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); } else setCurrentMonth(currentMonth - 1); };
  const nextMonth = () => { if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); } else setCurrentMonth(currentMonth + 1); };

  // ---- Get events for a specific day ----
  const getDayEvents = (year: number, month: number, day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayViewings = viewings.filter((v) => v.date === dateStr && v.status !== "cancelled");
    const dayMaintenance = maintenanceReqs.filter((m) => {
      if (!m.createdAt) return false;
      const md = m.createdAt.toDate();
      return md.getFullYear() === year && md.getMonth() === month && md.getDate() === day;
    });
    const leaseEnds = units.filter((u) => {
      if (!u.leaseEnd || u.status !== "Occupied") return false;
      const ld = u.leaseEnd.toDate();
      return ld.getFullYear() === year && ld.getMonth() === month && ld.getDate() === day;
    });
    return { viewings: dayViewings, maintenance: dayMaintenance, leases: leaseEnds, dateStr };
  };

  const selectedDateEvents = selectedDate ? (() => {
    const parts = selectedDate.split("-");
    const y = parseInt(parts[0]), m = parseInt(parts[1]) - 1, d = parseInt(parts[2]);
    return getDayEvents(y, m, d);
  })() : null;

  // ---- Calendar Days ----
  const calendarDays: { day: number; isCurrentMonth: boolean; isToday: boolean }[] = [];
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    calendarDays.push({ day: prevMonthDays - i, isCurrentMonth: false, isToday: false });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    const ds = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
    calendarDays.push({ day: i, isCurrentMonth: true, isToday: ds === todayStr });
  }
  const remaining = 7 - (calendarDays.length % 7);
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) calendarDays.push({ day: i, isCurrentMonth: false, isToday: false });
  }

  const openSheet = (name: string) => setActiveSheet(name);
  const closeSheet = () => { setActiveSheet(null); setSelectedViewing(null); };

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
              <h1 className="text-lg font-bold text-white">Calendar</h1>
              <div className="w-10" />
            </div>
          </div>

          {/* MAIN CONTENT */}
          <div className="app-content">
            <div className="px-5 pb-28">
              {/* Month Navigation */}
              <div className="flex items-center justify-between mt-4 mb-5">
                <button onClick={prevMonth} className="w-10 h-10 rounded-full flex items-center justify-center ripple-container" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h2 className="text-lg font-bold text-white">{MONTHS[currentMonth]} {currentYear}</h2>
                <button onClick={nextMonth} className="w-10 h-10 rounded-full flex items-center justify-center ripple-container" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-0 mb-2">
                {DAYS.map((d) => (
                  <div key={d} className="text-center text-xs font-semibold py-2" style={{ color: "#525252" }}>
                    {d}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-0.5">
                {calendarDays.map((cell, i) => {
                  const ev = getDayEvents(currentYear, currentMonth, cell.day);
                  const eventCount = ev.viewings.length + ev.maintenance.length + ev.leases.length;
                  const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(cell.day).padStart(2, "0")}`;
                  const isSelected = selectedDate === dateStr;
                  const isToday = cell.isToday;

                  return (
                    <button
                      key={i}
                      onClick={() => {
                        if (cell.isCurrentMonth) {
                          setSelectedDate(isSelected ? null : dateStr);
                        }
                      }}
                      className="relative flex flex-col items-center justify-center rounded-xl transition-all"
                      style={{
                        height: "44px",
                        background: isSelected ? "rgba(4,120,87,0.2)" : isToday ? "rgba(4,120,87,0.1)" : "transparent",
                        border: isToday ? "1px solid rgba(4,120,87,0.3)" : "none",
                        opacity: cell.isCurrentMonth ? 1 : 0.2,
                        cursor: cell.isCurrentMonth ? "pointer" : "default",
                      }}
                    >
                      <span className={`text-sm font-medium ${isToday || isSelected ? "text-white" : ""}`} style={{ color: cell.isCurrentMonth ? (isToday || isSelected ? undefined : "#a3a3a3") : undefined }}>
                        {cell.day}
                      </span>
                      {eventCount > 0 && (
                        <div className="flex gap-0.5 mt-0.5">
                          {ev.viewings.length > 0 && <div className="w-1 h-1 rounded-full" style={{ background: "#3b82f6" }} />}
                          {ev.maintenance.length > 0 && <div className="w-1 h-1 rounded-full" style={{ background: "#f97316" }} />}
                          {ev.leases.length > 0 && <div className="w-1 h-1 rounded-full" style={{ background: "#ef4444" }} />}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 mt-4 mb-5">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: "#3b82f6" }} />
                  <span className="text-xs" style={{ color: "#525252" }}>Viewings</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: "#f97316" }} />
                  <span className="text-xs" style={{ color: "#525252" }}>Maintenance</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: "#ef4444" }} />
                  <span className="text-xs" style={{ color: "#525252" }}>Lease Ends</span>
                </div>
              </div>

              {/* Selected Day Events */}
              {selectedDate && selectedDateEvents && (
                <div className="mt-2">
                  <h3 className="text-sm font-bold text-white mb-3">
                    Events for {new Date(selectedDate).toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" })}
                  </h3>

                  {selectedDateEvents.viewings.length === 0 && selectedDateEvents.maintenance.length === 0 && selectedDateEvents.leases.length === 0 && (
                    <div className="flex flex-col items-center py-8">
                      <CalendarDays className="w-10 h-10 mb-2" style={{ color: "#525252" }} />
                      <p className="text-sm" style={{ color: "#a3a3a3" }}>No events for this day</p>
                    </div>
                  )}

                  {dataLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#047857" }} />
                    </div>
                  ) : (
                    <>
                      {/* Viewings */}
                      {selectedDateEvents.viewings.map((v) => (
                        <div
                          key={v.id}
                          className="flex items-start gap-3 p-3.5 rounded-2xl mb-2 cursor-pointer ripple-container"
                          style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.15)" }}
                          onClick={() => { setSelectedViewing(v); openSheet("viewingDetail"); }}
                        >
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(59,130,246,0.12)" }}>
                            <CalendarDays className="w-5 h-5" style={{ color: "#3b82f6" }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white">Viewing — {v.tenantName}</p>
                            <p className="text-xs mt-0.5" style={{ color: "#a3a3a3" }}>
                              {v.unitName} at {v.propertyName}
                            </p>
                            <div className="flex items-center gap-3 mt-1.5">
                              <span className="text-xs flex items-center gap-1" style={{ color: "#525252" }}>
                                <Clock className="w-3 h-3" /> {v.startTime} — {v.endTime}
                              </span>
                              <span className="chip" style={{ background: v.statusBg, color: v.statusColor, fontSize: "10px" }}>
                                {v.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Maintenance */}
                      {selectedDateEvents.maintenance.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-start gap-3 p-3.5 rounded-2xl mb-2"
                          style={{ background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.15)" }}
                        >
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(249,115,22,0.12)" }}>
                            <span className="text-base">🔧</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white">Maintenance — {m.title}</p>
                            <p className="text-xs mt-0.5" style={{ color: "#a3a3a3" }}>{m.unitName} — {m.description.slice(0, 80)}</p>
                            <span className="chip mt-1" style={{ background: m.urgency === "Urgent" ? "rgba(239,68,68,0.1)" : "rgba(249,115,22,0.1)", color: m.urgency === "Urgent" ? "#ef4444" : "#f97316", fontSize: "10px" }}>
                              {m.urgency}
                            </span>
                          </div>
                        </div>
                      ))}

                      {/* Lease Ends */}
                      {selectedDateEvents.leases.map((u) => (
                        <div
                          key={u.id}
                          className="flex items-start gap-3 p-3.5 rounded-2xl mb-2"
                          style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}
                        >
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(239,68,68,0.12)" }}>
                            <span className="text-base">📋</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white">Lease Ends — {u.tenantName}</p>
                            <p className="text-xs mt-0.5" style={{ color: "#a3a3a3" }}>{u.name} at {u.propertyName}</p>
                            <p className="text-xs mt-1" style={{ color: "#ef4444" }}>{u.leaseTerm} lease expiring</p>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}

              {/* Upcoming Viewings Summary */}
              {!selectedDate && (
                <div className="mt-6">
                  <div className="section-header">
                    <h3 className="section-title">Upcoming Viewings</h3>
                    <button className="section-action" onClick={() => router.push("/viewings")}>All →</button>
                  </div>
                  <div className="space-y-2">
                    {viewings.filter(v => v.status === "pending" || v.status === "confirmed").slice(0, 5).map((v) => {
                      const statusColor = v.status === "confirmed" ? "#047857" : "#eab308";
                      const statusBg = v.status === "confirmed" ? "rgba(4,120,87,0.1)" : "rgba(234,179,8,0.1)";
                      return (
                        <div key={v.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "#1A1D21", border: "1px solid rgba(255,255,255,0.06)" }}>
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: statusBg }}>
                            <CalendarDays className="w-5 h-5" style={{ color: statusColor }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white">{v.tenantName}</p>
                            <p className="text-xs" style={{ color: "#a3a3a3" }}>{v.propertyName} • {v.startTime} • {v.date}</p>
                          </div>
                          <span className="chip" style={{ background: statusBg, color: statusColor, fontSize: "10px" }}>{v.status}</span>
                        </div>
                      );
                    })}
                    {viewings.filter(v => v.status === "pending" || v.status === "confirmed").length === 0 && (
                      <p className="text-sm text-center py-6" style={{ color: "#525252" }}>No upcoming viewings</p>
                    )}
                  </div>
                </div>
              )}

              {/* Lease Expiry Summary */}
              {!selectedDate && (
                <div className="mt-6">
                  <div className="section-header">
                    <h3 className="section-title">Expiring Leases (Next 30 Days)</h3>
                  </div>
                  <div className="space-y-2">
                    {units.filter(u => {
                      if (!u.leaseEnd || u.status !== "Occupied") return false;
                      const diff = (u.leaseEnd.toDate().getTime() - Date.now()) / (1000 * 60 * 60 * 24);
                      return diff >= 0 && diff <= 30;
                    }).map((u) => (
                      <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(239,68,68,0.1)" }}>
                          <span className="text-base">📋</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white">{u.tenantName}</p>
                          <p className="text-xs" style={{ color: "#a3a3a3" }}>{u.name} at {u.propertyName}</p>
                          <p className="text-xs mt-0.5" style={{ color: "#ef4444" }}>Ends {u.leaseEnd?.toDate().toLocaleDateString() || "—"}</p>
                        </div>
                        <button onClick={() => router.push("/units")} className="text-xs font-semibold" style={{ color: "#047857" }}>Manage →</button>
                      </div>
                    ))}
                    {units.filter(u => {
                      if (!u.leaseEnd || u.status !== "Occupied") return false;
                      const diff = (u.leaseEnd.toDate().getTime() - Date.now()) / (1000 * 60 * 60 * 24);
                      return diff >= 0 && diff <= 30;
                    }).length === 0 && (
                      <p className="text-sm text-center py-6" style={{ color: "#525252" }}>No leases expiring soon</p>
                    )}
                  </div>
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

        {/* VIEWING DETAIL SHEET */}
        <div className={`sheet-overlay ${activeSheet === "viewingDetail" ? "active" : ""}`} onClick={closeSheet} />
        <div className={`bottom-sheet ${activeSheet === "viewingDetail" ? "active" : ""}`}>
          <div className="sheet-handle" />
          {selectedViewing && (
            <div className="p-5">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-white">Viewing Details</h3>
                <button onClick={closeSheet} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <X className="w-4 h-4" style={{ color: "#a3a3a3" }} />
                </button>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "rgba(59,130,246,0.12)" }}>
                    <span className="text-sm font-bold" style={{ color: "#3b82f6" }}>{selectedViewing.tenantInitials}</span>
                  </div>
                  <div>
                    <p className="text-base font-bold text-white">{selectedViewing.tenantName}</p>
                    <p className="text-xs" style={{ color: "#a3a3a3" }}>{selectedViewing.tenantPhone}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
                    <p className="text-xs" style={{ color: "#525252" }}>Date</p>
                    <p className="text-sm font-semibold text-white">{selectedViewing.date}</p>
                  </div>
                  <div className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
                    <p className="text-xs" style={{ color: "#525252" }}>Time</p>
                    <p className="text-sm font-semibold text-white">{selectedViewing.startTime} — {selectedViewing.endTime}</p>
                  </div>
                  <div className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
                    <p className="text-xs" style={{ color: "#525252" }}>Status</p>
                    <span className="chip" style={{ background: selectedViewing.statusBg, color: selectedViewing.statusColor, fontSize: "11px" }}>{selectedViewing.status}</span>
                  </div>
                  <div className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
                    <p className="text-xs" style={{ color: "#525252" }}>Property</p>
                    <p className="text-sm font-semibold text-white">{selectedViewing.propertyName}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <a
                    href={`tel:${selectedViewing.tenantPhone}`}
                    className="btn-secondary flex-1 flex items-center justify-center gap-2 ripple-container"
                    style={{ padding: "14px" }}
                  >
                    <Phone className="w-4 h-4" /><span className="text-sm">Call</span>
                  </a>
                  <a
                    href={`https://wa.me/${selectedViewing.tenantPhone.replace(/^0/, "254")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary flex-1 flex items-center justify-center gap-2 ripple-container"
                    style={{ padding: "14px", background: "rgba(37,211,102,0.1)", borderColor: "rgba(37,211,102,0.2)" }}
                  >
                    <MessageCircle className="w-4 h-4" style={{ color: "#25D366" }} /><span className="text-sm" style={{ color: "#25D366" }}>WhatsApp</span>
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MORE MENU SHEET */}
        <div className={`sheet-overlay ${activeSheet === "moreMenu" ? "active" : ""}`} onClick={closeSheet} />
        <div className={`bottom-sheet ${activeSheet === "moreMenu" ? "active" : ""}`}>
          <div className="sheet-handle" />
          <div className="p-5 pb-2">
            <h3 className="text-lg font-bold text-white">More</h3>
            <p className="text-xs mt-1" style={{ color: "#a3a3a3" }}>All modules & settings</p>
          </div>
          <div className="px-3 pb-8">
            {[
              { icon: MessageCircle, label: "Inquiries", desc: "", color: "#047857", path: "/inquiries" },
              { icon: Layers, label: "Units", desc: "", color: "#3b82f6", path: "/units" },
              { icon: CalendarDays, label: "Calendar", desc: "", color: "#eab308", path: "/calendar" },
              { icon: MessageSquare, label: "Messages", desc: "", color: "#a855f7", path: "/messages" },
            { icon: Wrench, label: "Maintenance", desc: "", color: "#f97316", path: "/maintenance" },
            { icon: DoorOpen, label: "Vacating", desc: "", color: "#f97316", path: "/vacating" },
            { icon: BadgeCheck, label: "Rent Verification", desc: "", color: "#6366f1", path: "/rent-verification" },
            { icon: Megaphone, label: "Notices", desc: "", color: "#f97316", path: "/notices" },
            { icon: MessageSquareWarning, label: "Complaints", desc: "", color: "#ef4444", path: "/complaints" },
            { icon: Settings, label: "Settings", desc: "", color: "#525252", path: "/settings" },
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

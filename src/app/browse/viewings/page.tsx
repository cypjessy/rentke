"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  Phone,
  MessageCircle,
  CalendarCheck,
  ArrowLeft,
} from "lucide-react";
import { useBrowse } from "../BrowseContext";
import { useAuth } from "../../AuthContext";
import {
  listenToTenantViewings,
  confirmViewing as confirmViewingFS,
  cancelViewing as cancelViewingFS,
} from "../../../lib/browse";
import { rescheduleViewing } from "../../../lib/viewings";
import { openPhoneUrl } from "../../../lib/phone";
import type { ViewingData } from "../../../lib/viewings";

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  confirmed: { label: "Confirmed", color: "#047857", bg: "rgba(4,120,87,0.12)" },
  pending: { label: "Pending", color: "#eab308", bg: "rgba(234,179,8,0.12)" },
  completed: { label: "Completed", color: "#525252", bg: "rgba(255,255,255,0.05)" },
  cancelled: { label: "Cancelled", color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
};

export default function ViewingsPage() {
  const { showSnackbar } = useBrowse();
  const { user } = useAuth();
  const router = useRouter();

  const [filterTab, setFilterTab] = useState<"upcoming" | "past">("upcoming");
  const [allViewings, setAllViewings] = useState<ViewingData[]>([]);
  const [loading, setLoading] = useState(true);



  // ---- Firestore Listener ----
  useEffect(() => {
    const uid = user?.uid || "";
    if (!uid) {
      setLoading(false);
      return;
    }

    const unsub = listenToTenantViewings(
      uid,
      user?.phoneNumber || "",
      (viewings) => {
        setAllViewings(viewings);
        setLoading(false);
      },
      (err) => {
        console.error("Viewings listener error:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user?.uid, user?.phoneNumber]);

  // ---- Derived Data ----
  const now = new Date();
  const upcoming = allViewings.filter((v) => {
    if (v.status === "completed" || v.status === "cancelled") return false;
    const dateStr = v.date;
    if (!dateStr) return true;
    try {
      return new Date(dateStr) >= now;
    } catch { return true; }
  });

  const past = allViewings.filter((v) => {
    if (v.status === "completed" || v.status === "cancelled") return true;
    const dateStr = v.date;
    if (!dateStr) return false;
    try {
      return new Date(dateStr) < now;
    } catch { return false; }
  });

  // ---- Reschedule State ----
  const [rescheduleViewingId, setRescheduleViewingId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [rescheduleReason, setRescheduleReason] = useState("");

  // ---- View Details State ----
  const [detailViewing, setDetailViewing] = useState<ViewingData | null>(null);

  // ---- Bottom Sheet body overflow ----
  useEffect(() => {
    document.body.style.overflow = rescheduleViewingId || detailViewing ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [rescheduleViewingId, detailViewing]);

  // ---- Actions ----
  const handleConfirm = async (viewing: ViewingData) => {
    try {
      await confirmViewingFS(viewing.id);
      showSnackbar("Viewing confirmed!", "success");
    } catch (err) {
      showSnackbar("Failed to confirm viewing", "error");
    }
  };

  const handleCancel = async (viewing: ViewingData) => {
    try {
      await cancelViewingFS(viewing.id);
      showSnackbar("Viewing cancelled", "info");
    } catch (err) {
      showSnackbar("Failed to cancel viewing", "error");
    }
  };

  // ---- Close Sheet Helper ----
  const closeDetail = () => setDetailViewing(null);
  const closeReschedule = () => {
    setRescheduleViewingId(null);
    setRescheduleDate("");
    setRescheduleTime("");
    setRescheduleReason("");
  };

  const handleReschedule = (viewing: ViewingData) => {
    setRescheduleDate(viewing.date || "");
    setRescheduleTime(viewing.startTime || "");
    setRescheduleReason("");
    setRescheduleViewingId(viewing.id);
  };

  const handleRescheduleSubmit = async () => {
    if (!rescheduleViewingId || !rescheduleDate || !rescheduleTime) {
      showSnackbar("Please select a date and time", "error");
      return;
    }
    try {
      await rescheduleViewing(rescheduleViewingId, rescheduleDate, rescheduleTime, rescheduleTime, rescheduleReason);
      closeReschedule();
      showSnackbar("Viewing rescheduled!", "success");
    } catch {
      showSnackbar("Failed to reschedule viewing", "error");
    }
  };

  // ---- Helpers ----
  const getMonth = (dateStr: string) => {
    try { return new Date(dateStr).toLocaleString("en", { month: "short" }); }
    catch { return ""; }
  };
  const getDay = (dateStr: string) => {
    try { return new Date(dateStr).getDate().toString(); }
    catch { return ""; }
  };

  const displayList = filterTab === "upcoming" ? upcoming : past;

  return (
    <div
      style={{
        overflowX: "hidden",
        width: "100%",
        maxWidth: "100vw",
        minHeight: "100dvh",
        position: "relative",
      }}
    >
      {/* Glow */}
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

      <div className="status-bar" />

      {/* ====== HEADER ====== */}
      <header
        className="px-3 pt-4 pb-3 flex items-center gap-3"
        style={{ animation: "slideInUp 0.4s ease" }}
      >
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full flex items-center justify-center ripple-container flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.05)" }}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">My Viewings</h1>
          <p className="text-xs mt-0.5" style={{ color: "#a3a3a3" }}>
            {loading ? "Loading..." : `${upcoming.length} upcoming • ${past.length} past`}
          </p>
        </div>
      </header>

      {/* ====== TABS ====== */}
      <div
        className="flex gap-0 px-3 border-b mb-4"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
      >
        {(["upcoming", "past"] as const).map((tab) => (
          <button
            key={tab}
            className={`viewing-tab ${filterTab === tab ? "active" : ""}`}
            onClick={() => setFilterTab(tab)}
          >
            {tab === "upcoming" ? "Upcoming" : "Past"}
            <span className="tab-count">
              {tab === "upcoming" ? upcoming.length : past.length}
            </span>
          </button>
        ))}
      </div>

      {/* ====== VIEWINGS LIST ====== */}
      <div className="px-3 pb-24 space-y-3">
        {loading ? (
          <div className="text-center py-16">
            <div className="spinner mx-auto mb-4" />
            <p className="text-sm" style={{ color: "#525252" }}>Loading viewings...</p>
          </div>
        ) : displayList.length === 0 ? (
          <div className="text-center py-16">
            <Calendar className="w-14 h-14 mx-auto mb-4" style={{ color: "#525252" }} />
            <h3 className="text-lg font-bold text-white mb-2">
              {filterTab === "upcoming" ? "No Upcoming Viewings" : "No Past Viewings"}
            </h3>
            <p className="text-sm" style={{ color: "#525252" }}>
              {filterTab === "upcoming"
                ? "Schedule a viewing from any property to see it here."
                : "Your viewing history will appear here."}
            </p>
          </div>
        ) : (
          displayList.map((viewing, i) => {
            const isUpcoming = filterTab === "upcoming";
            const month = getMonth(viewing.date);
            const day = getDay(viewing.date);
            const isCancelled = viewing.status === "cancelled";
            const isCompleted = viewing.status === "completed";

            return (
              <div
                key={viewing.id}
                className="viewing-card"
                style={{
                  animation: `slideInUp ${0.4 + i * 0.1}s ease`,
                  opacity: (isCancelled && !isUpcoming) ? 0.6 : 1,
                }}
              >
                <div className="flex gap-3">
                  {/* Date Badge */}
                  <div
                    className="date-badge"
                    style={{
                      background:
                        viewing.status === "confirmed"
                          ? "rgba(4,120,87,0.12)"
                          : viewing.status === "pending"
                            ? "rgba(234,179,8,0.12)"
                            : isCompleted
                              ? "rgba(255,255,255,0.05)"
                              : "rgba(239,68,68,0.1)",
                    }}
                  >
                    <span
                      className="day"
                      style={{
                        color:
                          viewing.status === "confirmed"
                            ? "#34d399"
                            : viewing.status === "pending"
                              ? "#eab308"
                              : isCompleted
                                ? "#a3a3a3"
                                : "#ef4444",
                      }}
                    >
                      {day}
                    </span>
                    <span className="month" style={{ color: "#a3a3a3" }}>
                      {month}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-white truncate">
                        {viewing.propertyName}
                      </h3>
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-full ml-2 flex-shrink-0"
                        style={{
                          background: statusConfig[viewing.status]?.bg || "rgba(255,255,255,0.05)",
                          color: statusConfig[viewing.status]?.color || "#a3a3a3",
                        }}
                      >
                        {statusConfig[viewing.status]?.label || viewing.status}
                      </span>
                    </div>
                    <p className="text-xs mt-1 flex items-center gap-1" style={{ color: "#a3a3a3" }}>
                      <MapPin className="w-3 h-3" />
                      {viewing.propertyName}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs flex items-center gap-1" style={{ color: "#525252" }}>
                        <Calendar className="w-3 h-3" />
                        {viewing.date || "TBD"}
                      </span>
                      <span className="text-xs flex items-center gap-1" style={{ color: "#525252" }}>
                        <Clock className="w-3 h-3" />
                        {viewing.startTime || "TBD"}
                      </span>
                    </div>

                    {/* Landlord Info */}
                    {viewing.tenantName && (
                      <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                            style={{
                              background: "linear-gradient(135deg, #047857, #059669)",
                              color: "white",
                            }}
                          >
                            {viewing.tenantInitials || "?"}
                          </div>
                          <span className="text-xs" style={{ color: "#a3a3a3" }}>
                            {viewing.tenantName}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              if (viewing.tenantPhone) {
                                openPhoneUrl(viewing.tenantPhone, "tel");
                              } else {
                                showSnackbar("No phone number available", "error");
                              }
                            }}
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ background: "rgba(255,255,255,0.05)" }}
                          >
                            <Phone className="w-3.5 h-3.5" style={{ color: "#a3a3a3" }} />
                          </button>
                          <button
                            onClick={() => {
                              if (viewing.tenantPhone) {
                                openPhoneUrl(viewing.tenantPhone, "wa");
                              } else {
                                showSnackbar("No phone number available", "error");
                              }
                            }}
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ background: "rgba(37,211,102,0.12)" }}
                          >
                            <MessageCircle className="w-3.5 h-3.5" style={{ color: "#25D366" }} />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    {isUpcoming && viewing.status === "pending" && (
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleConfirm(viewing)}
                          className="flex-1 py-2 rounded-xl text-xs font-semibold text-white ripple-container"
                          style={{ background: "#047857" }}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />
                          Confirm
                        </button>
                        <button
                          onClick={() => handleReschedule(viewing)}
                          className="flex-1 py-2 rounded-xl text-xs font-semibold ripple-container"
                          style={{
                            background: "rgba(255,255,255,0.05)",
                            color: "#e5e5e5",
                            border: "1px solid rgba(255,255,255,0.08)",
                          }}
                        >
                          <Calendar className="w-3.5 h-3.5 inline mr-1" />
                          Reschedule
                        </button>
                        <button
                          onClick={() => handleCancel(viewing)}
                          className="py-2 px-3 rounded-xl text-xs font-semibold ripple-container"
                          style={{
                            background: "rgba(239,68,68,0.1)",
                            color: "#ef4444",
                          }}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                    {isUpcoming && viewing.status === "confirmed" && (
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => setDetailViewing(viewing)}
                          className="flex-1 py-2 rounded-xl text-xs font-semibold ripple-container flex items-center justify-center gap-1"
                          style={{
                            background: "rgba(4,120,87,0.1)",
                            color: "#34d399",
                            border: "1px solid rgba(4,120,87,0.2)",
                          }}
                        >
                          <CalendarCheck className="w-3.5 h-3.5" />
                          View Details
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ================================================ */}
      {/* BOTTOM SHEET: RESCHEDULE */}
      {/* ================================================ */}
      <div
        className={`bs-overlay ${rescheduleViewingId ? "active" : ""}`}
        onClick={closeReschedule}
      />
      <div
        id="bs-reschedule"
        className={`bs ${rescheduleViewingId ? "active" : ""}`}
      >
        <div className="bs-handle" />
        <div className="p-5 pb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Reschedule Viewing</h3>
          <button onClick={closeReschedule} className="text-sm font-semibold" style={{ color: "#a3a3a3" }}>Cancel</button>
        </div>
        <div className="px-3 pb-8 space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider block mb-2" style={{ color: "#525252" }}>New Date</label>
            <input
              type="date"
              className="android-input"
              value={rescheduleDate}
              onChange={(e) => setRescheduleDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider block mb-2" style={{ color: "#525252" }}>New Time</label>
            <input
              type="time"
              className="android-input"
              value={rescheduleTime}
              onChange={(e) => setRescheduleTime(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider block mb-2" style={{ color: "#525252" }}>Reason (optional)</label>
            <textarea
              className="android-input resize-none"
              rows={3}
              value={rescheduleReason}
              onChange={(e) => setRescheduleReason(e.target.value)}
              placeholder="e.g., Conflict with work schedule"
            />
          </div>
          <button
            onClick={handleRescheduleSubmit}
            className="w-full py-3.5 rounded-xl font-semibold text-sm text-white ripple-container"
            style={{ background: "#047857", boxShadow: "0 4px 16px rgba(4,120,87,0.3)" }}
          >
            Confirm Reschedule
          </button>
        </div>
      </div>

      {/* ================================================ */}
      {/* BOTTOM SHEET: VIEWING DETAILS */}
      {/* ================================================ */}
      <div
        className={`bs-overlay ${detailViewing ? "active" : ""}`}
        onClick={closeDetail}
      />
      <div
        id="bs-detail"
        className={`bs ${detailViewing ? "active" : ""}`}
      >
        <div className="bs-handle" />
        <div className="p-5 pb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Viewing Details</h3>
          <button onClick={closeDetail} className="text-sm font-semibold" style={{ color: "#a3a3a3" }}>Close</button>
        </div>
        {detailViewing && (
          <div className="px-3 pb-8 space-y-4">
            {/* Property */}
            <div className="p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#525252" }}>Property</p>
              <h4 className="text-base font-bold text-white">{detailViewing.propertyName}</h4>
              {detailViewing.unitName && <p className="text-xs mt-1" style={{ color: "#a3a3a3" }}>Unit: {detailViewing.unitName}</p>}
            </div>

            {/* Date & Time */}
            <div className="p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#525252" }}>Schedule</p>
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4" style={{ color: "#a3a3a3" }} />
                <span className="text-sm text-white">{detailViewing.date || "TBD"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" style={{ color: "#a3a3a3" }} />
                <span className="text-sm text-white">{detailViewing.startTime || "TBD"} — {detailViewing.endTime || "TBD"}</span>
              </div>
              {detailViewing.duration && (
                <p className="text-xs mt-1" style={{ color: "#525252" }}>Duration: {detailViewing.duration}</p>
              )}
            </div>

            {/* Tenant */}
            <div className="p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#525252" }}>Tenant</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: "linear-gradient(135deg, #047857, #059669)", color: "white" }}>
                  {detailViewing.tenantInitials || "?"}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{detailViewing.tenantName || "N/A"}</p>
                  {detailViewing.tenantPhone && (
                    <p className="text-xs" style={{ color: "#a3a3a3" }}>+254 {detailViewing.tenantPhone}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Status & Notes */}
            <div className="p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#525252" }}>Status</p>
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    background: statusConfig[detailViewing.status]?.bg || "rgba(255,255,255,0.05)",
                    color: statusConfig[detailViewing.status]?.color || "#a3a3a3",
                  }}
                >
                  {statusConfig[detailViewing.status]?.label || detailViewing.status}
                </span>
              </div>
              {detailViewing.notes && (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wider mt-3 mb-1" style={{ color: "#525252" }}>Notes</p>
                  <p className="text-sm" style={{ color: "#a3a3a3" }}>{detailViewing.notes}</p>
                </>
              )}
            </div>

            {/* Contact Quick Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => detailViewing.tenantPhone && openPhoneUrl(detailViewing.tenantPhone, "tel")}
                className="flex-1 py-3 rounded-xl text-xs font-semibold text-white ripple-container flex items-center justify-center gap-2"
                style={{ background: "#047857" }}
                disabled={!detailViewing.tenantPhone}
              >
                <Phone className="w-4 h-4" />
                Call Tenant
              </button>
              <button
                onClick={() => detailViewing.tenantPhone && openPhoneUrl(detailViewing.tenantPhone, "wa")}
                className="flex-1 py-3 rounded-xl text-xs font-semibold ripple-container flex items-center justify-center gap-2"
                style={{ background: "rgba(37,211,102,0.12)", color: "#25D366" }}
                disabled={!detailViewing.tenantPhone}
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

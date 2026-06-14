"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Search,
  Wallet,
  MessageSquare,
  FileText,
  User,
  X,
  Check,
  ChevronRight,
  MessageSquarePlus,
  Droplets,
  Zap,
  Volume2,
  Shield,
  Sparkles,
  MoreHorizontal,
  Camera,
  CheckCircle,
  Send,
  LogOut,
  AlertTriangle,
  Clock,
  Loader2,
  Info,
} from "lucide-react";
import { useAuth } from "../AuthContext";
import { listenToTenantUnits, type UnitData } from "@/lib/units";
import {
  listenToTenantComplaints,
  listenToTenantVacatingNotices,
  submitComplaint,
  submitVacatingNotice,
  COMPLAINT_CATEGORIES,
  VACATE_REASONS,
  type ComplaintData,
  type VacatingNoticeData,
  type ComplaintCategory,
  type ComplaintUrgency,
} from "@/lib/issues";

// ---- Types ----
type TabType = "complaints" | "vacating";

const statusMeta: Record<string, { label: string; color: string; bg: string }> = {
  open: { label: "Open", color: "#ef4444", bg: "rgba(239,68,68,0.15)" },
  "in-progress": { label: "In Progress", color: "#3b82f6", bg: "rgba(59,130,246,0.15)" },
  resolved: { label: "Resolved", color: "#059669", bg: "rgba(4,120,87,0.15)" },
};

const urgencyMeta: Record<ComplaintUrgency, { color: string; bg: string; border: string }> = {
  low: { color: "#059669", bg: "rgba(4,120,87,0.15)", border: "rgba(4,120,87,0.3)" },
  medium: { color: "#eab308", bg: "rgba(234,179,8,0.15)", border: "rgba(234,179,8,0.3)" },
  high: { color: "#ef4444", bg: "rgba(239,68,68,0.15)", border: "rgba(239,68,68,0.3)" },
};

const categoryIcons: Record<string, React.ElementType> = {
  plumbing: Droplets,
  electrical: Zap,
  noise: Volume2,
  security: Shield,
  cleanliness: Sparkles,
  other: MoreHorizontal,
};

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

export default function IssuesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("complaints");

  // ---- Firestore Data ----
  const [units, setUnits] = useState<UnitData[]>([]);
  const [complaints, setComplaints] = useState<ComplaintData[]>([]);
  const [vacatingNotices, setVacatingNotices] = useState<VacatingNoticeData[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [complaintsLoading, setComplaintsLoading] = useState(true);
  const [vacatingLoading, setVacatingLoading] = useState(true);

  // The tenant's unit (first occupied one)
  const myUnit = units.find((u) => u.status === "Occupied");

  // ---- Sheet State ----
  const [sheetOpen, setSheetOpen] = useState<string | null>(null);
  const [currentComplaint, setCurrentComplaint] = useState<ComplaintData | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  // Complaint form state
  const [compCategory, setCompCategory] = useState<ComplaintCategory>("plumbing");
  const [compDesc, setCompDesc] = useState("");
  const [compUrgency, setCompUrgency] = useState<ComplaintUrgency>("medium");
  const [compHasFile, setCompHasFile] = useState(false);

  // Vacating form state
  const [moveOutDate, setMoveOutDate] = useState("");
  const [vacateReason, setVacateReason] = useState("relocating");
  const [vacateDetails, setVacateDetails] = useState("");

  // Chat reply
  const [replyText, setReplyText] = useState("");

  // Snackbar
  const [snackbar, setSnackbar] = useState<{
    show: boolean; message: string; type: "success" | "error" | "info"
  }>({ show: false, message: "", type: "info" });
  const snackbarTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarAnimClass, setSnackbarAnimClass] = useState("");

  const showSnackbar = (message: string, type: "success" | "error" | "info" = "info") => {
    setSnackbar({ show: true, message, type });
    if (snackbarTimeoutRef.current) clearTimeout(snackbarTimeoutRef.current);
    snackbarTimeoutRef.current = setTimeout(() => {
      setSnackbar({ show: false, message: "", type: "info" });
    }, 3500);
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

    unsubs.push(listenToTenantUnits(
      user.uid,
      (data) => { setUnits(data); setDataLoading(false); },
      () => setDataLoading(false)
    ));

    unsubs.push(listenToTenantComplaints(
      user.uid,
      (data) => { setComplaints(data); setComplaintsLoading(false); },
      () => setComplaintsLoading(false)
    ));

    unsubs.push(listenToTenantVacatingNotices(
      user.uid,
      (data) => { setVacatingNotices(data); setVacatingLoading(false); },
      () => setVacatingLoading(false)
    ));

    return () => unsubs.forEach((u) => u());
  }, [user]);

  const openSheet = (name: string) => { setSheetOpen(name); document.body.style.overflow = "hidden"; };
  const closeSheet = () => { setSheetOpen(null); document.body.style.overflow = ""; };

  const handleComplaintFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setCompHasFile(true);
  };

  const handleSubmitComplaint = async () => {
    if (compDesc.trim().length < 10 || !user || !myUnit) return;
    setLoading("comp");
    try {
      await submitComplaint(user.uid, {
        unitId: myUnit.id,
        propertyId: myUnit.propertyId,
        propertyName: myUnit.propertyName,
        unitName: myUnit.name,
        landlordId: myUnit.landlordId,
        tenantName: user.displayName || "Tenant",
        category: compCategory,
        description: compDesc,
        urgency: compUrgency,
      });
      setLoading(null);
      closeSheet();
      setCompCategory("plumbing");
      setCompDesc("");
      setCompUrgency("medium");
      setCompHasFile(false);
      setTimeout(() => openSheet("comp-ok"), 300);
    } catch (err: any) {
      setLoading(null);
      showSnackbar(err?.message || "Failed to submit complaint", "error");
    }
  };

  const handleVacateSubmit = async () => {
    if (!moveOutDate || !vacateReason || !user || !myUnit) return;
    setLoading("vacate");
    try {
      await submitVacatingNotice(user.uid, {
        unitId: myUnit.id,
        propertyId: myUnit.propertyId,
        landlordId: myUnit.landlordId,
        tenantName: user.displayName || "Tenant",
        unitName: myUnit.name,
        propertyName: myUnit.propertyName,
        moveOutDate,
        reason: vacateReason,
        details: vacateDetails,
      });
      setLoading(null);
      openSheet("vacate-ok");
    } catch (err: any) {
      setLoading(null);
      showSnackbar(err?.message || "Failed to submit notice", "error");
    }
  };

  const handleSendReply = () => {
    if (!replyText.trim()) return;
    setReplyText("");
    showSnackbar("Reply sent", "success");
  };

  const formattedDate = moveOutDate
    ? new Date(moveOutDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const categoryColor: Record<string, string> = {
    plumbing: "#3b82f6", electrical: "#eab308", noise: "#a855f7",
    security: "#ef4444", cleanliness: "#059669", other: "#6b7280",
  };

  return (
    <div style={{ background: "#050505", color: "#e5e5e5", fontFamily: "'Inter', sans-serif", minHeight: "100dvh" }}>
      <div className="status-bar" />

      {/* ====== HEADER ====== */}
      <div className="flex items-center justify-between px-3 py-4 sticky top-0 z-40" style={{ background: "rgba(5,5,5,0.9)", backdropFilter: "blur(20px)" }}>
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)" }}>
            <ArrowLeft className="w-5 h-5" style={{ color: "#a3a3a3" }} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white">Issues & Vacating</h1>
            <p className="text-xs" style={{ color: "#a3a3a3" }}>
              {dataLoading ? "Loading..." : myUnit ? `${myUnit.name} · ${myUnit.propertyName}` : "No unit assigned"}
            </p>
          </div>
        </div>
        <button
          onClick={() => { setCompCategory("plumbing"); setCompDesc(""); setCompUrgency("medium"); setCompHasFile(false); openSheet("submit"); }}
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: "rgba(4,120,87,0.15)" }}
        >
          <Plus className="w-5 h-5" style={{ color: "#059669" }} />
        </button>
      </div>

      <div style={{ animation: "slideInUp 0.5s ease", paddingBottom: 80 }}>
        {/* ====== TABS ====== */}
        <div className="flex gap-2 px-3 mb-4">
          <button onClick={() => setActiveTab("complaints")} className={`tab-btn ${activeTab === "complaints" ? "active" : ""}`}>
            Complaints {complaints.length > 0 && `(${complaints.length})`}
          </button>
          <button onClick={() => setActiveTab("vacating")} className={`tab-btn ${activeTab === "vacating" ? "active" : ""}`}>
            Vacating {vacatingNotices.length > 0 && `(${vacatingNotices.length})`}
          </button>
        </div>

        {/* ====== COMPLAINTS TAB ====== */}
        {activeTab === "complaints" && (
          <div className="px-3 space-y-3" style={{ animation: "slideInUp 0.3s ease" }}>
            {/* Submit CTA (only if assigned a unit) */}
            {myUnit && (
              <div
                onClick={() => { setCompCategory("plumbing"); setCompDesc(""); setCompUrgency("medium"); setCompHasFile(false); openSheet("submit"); }}
                className="rounded-2xl p-4 flex items-center gap-4 cursor-pointer"
                style={{ background: "rgba(4,120,87,0.08)", border: "1.5px dashed rgba(4,120,87,0.2)" }}
              >
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg,#047857,#059669)" }}>
                  <MessageSquarePlus className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-white">Submit a Complaint</p>
                  <p className="text-xs" style={{ color: "#a3a3a3" }}>Plumbing, electrical, noise, security…</p>
                </div>
                <ChevronRight className="w-5 h-5" style={{ color: "#525252" }} />
              </div>
            )}

            {/* Loading state */}
            {complaintsLoading && (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#047857" }} />
              </div>
            )}

            {/* No complaints */}
            {!complaintsLoading && complaints.length === 0 && (
              <div className="text-center py-12">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: "rgba(255,255,255,0.03)" }}>
                  <CheckCircle className="w-7 h-7" style={{ color: "#525252" }} />
                </div>
                <p className="text-sm font-medium text-white">No complaints yet</p>
                <p className="text-xs mt-1" style={{ color: "#525252" }}>Tap above to report an issue</p>
              </div>
            )}

            {/* Complaint cards */}
            {complaints.map((item) => {
              const sm = statusMeta[item.status] || statusMeta.open;
              const CatIcon = categoryIcons[item.category] || MoreHorizontal;
              const catColor = categoryColor[item.category] || "#6b7280";
              const timeStr = item.createdAt ? timeAgo(item.createdAt.toDate()) : "Recently";
              return (
                <div
                  key={item.id}
                  className="complaint-card"
                  onClick={() => { setCurrentComplaint(item); openSheet("detail"); }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="status-badge" style={{ background: sm.bg, color: sm.color, fontSize: 10 }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: sm.color, display: "inline-block", marginRight: 4 }} />
                      {sm.label}
                    </span>
                    <span className="text-xs" style={{ color: "#525252" }}>
                      <Clock className="w-3 h-3 inline" style={{ marginRight: 2 }} />
                      {timeStr}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${catColor}15` }}>
                      <CatIcon className="w-4 h-4" style={{ color: catColor }} />
                    </div>
                    <h4 className="text-sm font-semibold text-white">{item.description.slice(0, 50)}{item.description.length > 50 ? "…" : ""}</h4>
                  </div>
                  <p className="text-xs mb-2" style={{ color: "#a3a3a3" }}>{item.description.slice(0, 120)}{item.description.length > 120 ? "…" : ""}</p>
                  <div className="flex items-center justify-between pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                    <span className="text-xs" style={{ color: "#525252" }}>
                      <MessageSquare className="w-3 h-3 inline" style={{ marginRight: 2 }} /> {item.replies || 0} replies
                    </span>
                    <span className="text-xs font-medium" style={{ color: catColor }}>{COMPLAINT_CATEGORIES.find((c) => c.key === item.category)?.label || item.category}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ====== VACATING TAB ====== */}
        {activeTab === "vacating" && (
          <div className="px-3" style={{ animation: "slideInUp 0.3s ease" }}>
            {/* Current Status */}
            {myUnit && (
              <div className="rounded-2xl p-5 mb-4" style={{ background: "#1A1D21", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-white">Tenancy Status</h3>
                  <span className="status-badge" style={{ background: "rgba(4,120,87,0.15)", color: "#059669", fontSize: 10 }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#059669", display: "inline-block", marginRight: 4 }} /> Active
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between py-1.5">
                    <span className="text-sm" style={{ color: "#525252" }}>Lease Start</span>
                    <span className="text-sm font-medium text-white">{myUnit.leaseStart ? myUnit.leaseStart.toDate().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-sm" style={{ color: "#525252" }}>Lease End</span>
                    <span className="text-sm font-medium text-white">{myUnit.leaseEnd ? myUnit.leaseEnd.toDate().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-sm" style={{ color: "#525252" }}>Notice Required</span>
                    <span className="text-sm font-medium text-white">30 days</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-sm" style={{ color: "#525252" }}>Monthly Rent</span>
                    <span className="text-sm font-medium" style={{ color: "#047857" }}>KSh {myUnit.rent.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Existing vacating notices */}
            {!vacatingLoading && vacatingNotices.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold mb-2" style={{ color: "#525252" }}>PREVIOUS NOTICES</p>
                <div className="space-y-2">
                  {vacatingNotices.slice(0, 3).map((notice) => (
                    <div key={notice.id} className="p-3 rounded-xl" style={{ background: "rgba(4,120,87,0.06)", border: "1px solid rgba(4,120,87,0.12)" }}>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-white">{notice.moveOutDate ? new Date(notice.moveOutDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}</p>
                        <span className="chip text-xs" style={{
                          background: notice.status === "approved" ? "rgba(4,120,87,0.1)" : notice.status === "rejected" ? "rgba(239,68,68,0.1)" : "rgba(234,179,8,0.1)",
                          color: notice.status === "approved" ? "#059669" : notice.status === "rejected" ? "#ef4444" : "#eab308",
                        }}>{notice.status}</span>
                      </div>
                      <p className="text-xs mt-1" style={{ color: "#a3a3a3" }}>{VACATE_REASONS.find((r) => r.key === notice.reason)?.label || notice.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Submit Vacating Notice */}
            {myUnit && (
              <div className="rounded-2xl p-5" style={{ background: "#1A1D21", border: "1px solid rgba(255,255,255,0.05)" }}>
                <h3 className="text-base font-bold text-white mb-4">Submit Vacating Notice</h3>

                <div className="space-y-4">
                  {/* Move-out Date */}
                  <div>
                    <label className="text-xs font-semibold mb-2 block" style={{ color: "#a3a3a3" }}>MOVE-OUT DATE</label>
                    <input
                      type="date"
                      value={moveOutDate}
                      onChange={(e) => setMoveOutDate(e.target.value)}
                      className="android-input"
                      style={{ appearance: "none" }}
                    />
                  </div>

                  {/* Reason */}
                  <div>
                    <label className="text-xs font-semibold mb-2 block" style={{ color: "#a3a3a3" }}>REASON FOR VACATING</label>
                    <div className="grid grid-cols-2 gap-2">
                      {VACATE_REASONS.map((r) => (
                        <button
                          key={r.key}
                          onClick={() => setVacateReason(r.key)}
                          className="reason-chip"
                          style={vacateReason === r.key ? { background: "rgba(4,120,87,0.15)", border: "1.5px solid rgba(4,120,87,0.3)", color: "#059669" } : {}}
                        >
                          {r.emoji} {r.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Details */}
                  <div>
                    <label className="text-xs font-semibold mb-2 block" style={{ color: "#a3a3a3" }}>ADDITIONAL DETAILS (optional)</label>
                    <textarea
                      value={vacateDetails}
                      onChange={(e) => setVacateDetails(e.target.value)}
                      className="android-input"
                      rows={3}
                      placeholder="Any details the landlord should know…"
                    />
                  </div>

                  {/* Warning */}
                  <div className="p-3 rounded-xl" style={{ background: "rgba(234,179,8,0.06)", border: "1px solid rgba(234,179,8,0.1)" }}>
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#eab308" }} />
                      <p className="text-xs" style={{ color: "#eab308" }}>
                        Your security deposit (KSh {myUnit.deposit.toLocaleString()}) will be processed within 14 days of move-out after inspection.
                      </p>
                    </div>
                  </div>

                  {/* Submit */}
                  <button
                    onClick={handleVacateSubmit}
                    disabled={!moveOutDate || loading === "vacate"}
                    className="btn-warning w-full text-center flex items-center justify-center gap-2"
                    style={{ opacity: !moveOutDate ? 0.4 : 1 }}
                  >
                    {loading === "vacate" ? (
                      <div className="spinner mx-auto" />
                    ) : (
                      <><LogOut className="w-4 h-4" /> Submit Notice</>
                    )}
                  </button>
                </div>
              </div>
            )}

            {!myUnit && (
              <div className="text-center py-12">
                <p className="text-sm" style={{ color: "#525252" }}>No unit assigned</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ====== BOTTOM NAV ====== */}
      <div className="bottom-nav">
        <div className="flex items-center justify-around">
          {[
            { key: "explore", icon: Search, label: "Explore", href: "/browse/explore" },
            { key: "payments", icon: Wallet, label: "Payments", href: "/browse/my-unit" },
            { key: "issues", icon: MessageSquare, label: "Issues", active: true },
            { key: "saved", icon: FileText, label: "Saved", href: "/browse/saved" },
            { key: "profile", icon: User, label: "Profile", href: "/browse/profile" },
          ].map((item) => (
            <button
              key={item.key}
              className={`nav-item ${item.active ? "active" : ""}`}
              onClick={() => router.push(item.href || "#")}
            >
              <item.icon className="w-5 h-5" style={{ color: item.active ? "#059669" : "#525252" }} />
              <span className="text-[10px] font-medium" style={{ color: item.active ? "#059669" : "#525252" }}>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ============================================ */}
      {/* SHEET: SUBMIT COMPLAINT */}
      {/* ============================================ */}
      <div className={`sheet-overlay ${sheetOpen === "submit" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${sheetOpen === "submit" ? "active" : ""}`} style={{ maxHeight: "95dvh" }}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-8">
          <h3 className="text-lg font-bold text-white mb-4">Submit Complaint</h3>

          <div className="space-y-4">
            {/* Category */}
            <div>
              <label className="text-xs font-semibold mb-2 block" style={{ color: "#a3a3a3" }}>CATEGORY</label>
              <div className="flex flex-wrap gap-2">
                {COMPLAINT_CATEGORIES.map((cat) => (
                  <button
                    key={cat.key}
                    onClick={() => setCompCategory(cat.key)}
                    className="category-chip"
                    style={compCategory === cat.key
                      ? { background: "rgba(4,120,87,0.15)", border: "1.5px solid rgba(4,120,87,0.3)", color: "#059669" }
                      : {}}
                  >
                    {cat.emoji} {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-semibold mb-2 block" style={{ color: "#a3a3a3" }}>DESCRIBE THE ISSUE</label>
              <textarea
                value={compDesc}
                onChange={(e) => setCompDesc(e.target.value)}
                className="android-input"
                rows={4}
                placeholder="Please describe the problem in detail…"
              />
            </div>

            {/* Photo Upload */}
            <div>
              <label className="text-xs font-semibold mb-2 block" style={{ color: "#a3a3a3" }}>ADD PHOTO (optional)</label>
              <div
                onClick={() => document.getElementById("comp-file-input")?.click()}
                className="upload-zone"
                style={{
                  border: `2px dashed ${compHasFile ? "rgba(4,120,87,0.4)" : "rgba(255,255,255,0.1)"}`,
                  borderRadius: 16,
                  padding: 24,
                  textAlign: "center",
                  cursor: "pointer",
                  background: compHasFile ? "rgba(4,120,87,0.05)" : "rgba(255,255,255,0.02)",
                }}
              >
                {!compHasFile ? (
                  <div>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2" style={{ background: "rgba(4,120,87,0.15)" }}>
                      <Camera className="w-5 h-5" style={{ color: "#059669" }} />
                    </div>
                    <p className="text-sm font-medium text-white">Tap to add photo</p>
                    <p className="text-xs mt-0.5" style={{ color: "#525252" }}>Max 3 photos · JPG, PNG</p>
                  </div>
                ) : (
                  <div>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2" style={{ background: "rgba(4,120,87,0.2)" }}>
                      <CheckCircle className="w-5 h-5" style={{ color: "#059669" }} />
                    </div>
                    <p className="text-sm font-medium" style={{ color: "#059669" }}>Photo attached</p>
                    <p className="text-xs mt-0.5" style={{ color: "#525252" }}>complaint_photo.jpg</p>
                  </div>
                )}
              </div>
              <input id="comp-file-input" type="file" accept="image/*" className="hidden" onChange={handleComplaintFileUpload} />
            </div>

            {/* Urgency */}
            <div>
              <label className="text-xs font-semibold mb-2 block" style={{ color: "#a3a3a3" }}>URGENCY</label>
              <div className="flex gap-2">
                {(["low", "medium", "high"] as ComplaintUrgency[]).map((u) => {
                  const m = urgencyMeta[u];
                  const selected = compUrgency === u;
                  return (
                    <button
                      key={u}
                      onClick={() => setCompUrgency(u)}
                      className="text-xs font-semibold px-4 py-2.5 rounded-xl"
                      style={selected
                        ? { background: m.bg, border: `1.5px solid ${m.border}`, color: m.color }
                        : { background: "rgba(255,255,255,0.03)", border: "1.5px solid rgba(255,255,255,0.08)", color: "#a3a3a3" }}
                    >
                      {u === "low" ? "🟢 Low" : u === "medium" ? "🟡 Medium" : "🔴 High"}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={handleSubmitComplaint}
              disabled={compDesc.trim().length < 10 || loading === "comp"}
              className="btn-primary w-full text-center"
              style={{ opacity: compDesc.trim().length < 10 ? 0.4 : 1 }}
            >
              {loading === "comp" ? <div className="spinner mx-auto" /> : <span>Submit Complaint</span>}
            </button>
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* SHEET: COMPLAINT DETAIL */}
      {/* ============================================ */}
      <div className={`sheet-overlay ${sheetOpen === "detail" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${sheetOpen === "detail" ? "active" : ""}`} style={{ maxHeight: "95dvh" }}>
        <div className="bottom-sheet-handle" />
        {currentComplaint && (
          <div className="p-5 pb-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${categoryColor[currentComplaint.category] || "#6b7280"}15` }}>
                  {(() => {
                    const CI = categoryIcons[currentComplaint.category] || MoreHorizontal;
                    return <CI className="w-4 h-4" style={{ color: categoryColor[currentComplaint.category] || "#6b7280" }} />;
                  })()}
                </div>
                <h3 className="text-base font-bold text-white">{currentComplaint.description.slice(0, 60)}</h3>
              </div>
              <span className="status-badge" style={{ background: statusMeta[currentComplaint.status]?.bg || "rgba(239,68,68,0.15)", color: statusMeta[currentComplaint.status]?.color || "#ef4444", fontSize: 10 }}>
                {statusMeta[currentComplaint.status]?.label || "Open"}
              </span>
            </div>

            {/* Timeline */}
            <div className="mb-5">
              <div className="timeline-step pb-4">
                <div className="timeline-dot" style={{ borderColor: "#ef4444", background: "#ef4444" }} />
                <div>
                  <p className="text-sm font-medium text-white">Complaint submitted</p>
                  <p className="text-xs" style={{ color: "#525252" }}>
                    {currentComplaint.createdAt ? new Date(currentComplaint.createdAt.toDate()).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Recently"}
                  </p>
                </div>
              </div>
              {currentComplaint.status === "in-progress" && (
                <div className="timeline-step">
                  <div className="timeline-dot" style={{ borderColor: "#3b82f6", background: "#3b82f6" }} />
                  <div>
                    <p className="text-sm font-medium text-white">Landlord is working on it</p>
                    <p className="text-xs" style={{ color: "#525252" }}>In progress</p>
                  </div>
                </div>
              )}
              {currentComplaint.status === "resolved" && (
                <div className="timeline-step">
                  <div className="timeline-dot" style={{ borderColor: "#059669", background: "#059669" }} />
                  <div>
                    <p className="text-sm font-medium text-white">Issue resolved</p>
                    <p className="text-xs" style={{ color: "#525252" }}>
                      {currentComplaint.updatedAt ? new Date(currentComplaint.updatedAt.toDate()).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Recently"}
                    </p>
                  </div>
                </div>
              )}
              {currentComplaint.status === "open" && (
                <div className="timeline-step">
                  <div className="timeline-dot" style={{ borderColor: "rgba(255,255,255,0.1)" }} />
                  <div>
                    <p className="text-sm" style={{ color: "#525252" }}>Awaiting landlord response</p>
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="mb-5 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-sm leading-relaxed" style={{ color: "#a3a3a3" }}>{currentComplaint.description}</p>
            </div>

            {/* Urgency badge */}
            <div className="flex items-center gap-2 mb-5">
              <span className="text-xs font-semibold" style={{ color: "#525252" }}>Urgency:</span>
              <span className="chip text-xs" style={{
                background: urgencyMeta[currentComplaint.urgency]?.bg || "rgba(234,179,8,0.1)",
                color: urgencyMeta[currentComplaint.urgency]?.color || "#eab308",
              }}>
                {currentComplaint.urgency === "low" ? "🟢 Low" : currentComplaint.urgency === "medium" ? "🟡 Medium" : "🔴 High"}
              </span>
              <span className="text-xs font-semibold" style={{ color: "#525252" }}>Category:</span>
              <span className="chip text-xs" style={{ background: `${categoryColor[currentComplaint.category] || "#6b7280"}15`, color: categoryColor[currentComplaint.category] || "#6b7280" }}>
                {COMPLAINT_CATEGORIES.find((c) => c.key === currentComplaint.category)?.label || currentComplaint.category}
              </span>
            </div>

            {/* Chat/Reply placeholder — will be expanded later with real conversation */}
            <div className="mb-4">
              <p className="text-xs font-semibold mb-3" style={{ color: "#525252" }}>CONVERSATION ({currentComplaint.replies || 0} replies)</p>
              {currentComplaint.replies === 0 && (
                <p className="text-xs text-center py-4" style={{ color: "#525252" }}>No replies yet — awaiting landlord response</p>
              )}
              {currentComplaint.replies > 0 && (
                <div className="flex justify-end">
                  <div className="chat-bubble tenant">{currentComplaint.description.slice(0, 100)}</div>
                </div>
              )}
            </div>

            {/* Reply */}
            <div className="flex gap-2 items-end">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="android-input flex-1"
                rows={1}
                placeholder="Type a reply…"
                style={{ minHeight: 44, maxHeight: 100 }}
              />
              <button
                onClick={handleSendReply}
                disabled={!replyText.trim()}
                className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "linear-gradient(135deg,#047857,#059669)", opacity: !replyText.trim() ? 0.4 : 1 }}
              >
                <Send className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ============================================ */}
      {/* SHEET: VACATE SUCCESS */}
      {/* ============================================ */}
      <div className={`sheet-overlay ${sheetOpen === "vacate-ok" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${sheetOpen === "vacate-ok" ? "active" : ""}`} style={{ maxHeight: "70dvh" }}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-8 text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(217,119,6,0.15)", animation: "checkPop 0.4s ease" }}>
            <LogOut className="w-8 h-8" style={{ color: "#f59e0b" }} />
          </div>
          <h3 className="text-xl font-bold text-white mb-1">Notice Submitted</h3>
          <p className="text-sm mb-5" style={{ color: "#a3a3a3" }}>Your landlord has been notified. They will confirm your move-out date.</p>
          <div className="p-3 rounded-xl mb-5 text-left" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex justify-between py-1.5">
              <span className="text-xs" style={{ color: "#525252" }}>Move-out Date</span>
              <span className="text-xs font-semibold text-white">{formattedDate}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-xs" style={{ color: "#525252" }}>Deposit Refund</span>
              <span className="text-xs font-semibold" style={{ color: "#059669" }}>Within 14 days</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-xs" style={{ color: "#525252" }}>Inspection</span>
              <span className="text-xs font-semibold text-white">Before move-out</span>
            </div>
          </div>
          <button onClick={closeSheet} className="btn-primary w-full text-center">Done</button>
        </div>
      </div>

      {/* ============================================ */}
      {/* SHEET: COMPLAINT SUCCESS */}
      {/* ============================================ */}
      <div className={`sheet-overlay ${sheetOpen === "comp-ok" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${sheetOpen === "comp-ok" ? "active" : ""}`} style={{ maxHeight: "65dvh" }}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-8 text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(4,120,87,0.15)", animation: "checkPop 0.4s ease" }}>
            <Check className="w-8 h-8" style={{ color: "#059669" }} />
          </div>
          <h3 className="text-xl font-bold text-white mb-1">Complaint Submitted!</h3>
          <p className="text-sm mb-5" style={{ color: "#a3a3a3" }}>Your landlord has been notified and will respond shortly.</p>
          <button onClick={closeSheet} className="btn-primary w-full text-center">Done</button>
        </div>
      </div>

      {/* ====== SNACKBAR ====== */}
      {snackbarVisible && (
        <div className={`snackbar ${snackbarAnimClass}`}>
          <div className="flex items-center gap-3">
            <div>
              {snackbar.type === "success" ? (
                <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(4,120,87,0.2)" }}>
                  <Check className="w-3.5 h-3.5" style={{ color: "#047857" }} />
                </div>
              ) : snackbar.type === "error" ? (
                <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(239,68,68,0.2)" }}>
                  <X className="w-3.5 h-3.5" style={{ color: "#ef4444" }} />
                </div>
              ) : (
                <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(59,130,246,0.2)" }}>
                  <Info className="w-3.5 h-3.5" style={{ color: "#3b82f6" }} />
                </div>
              )}
            </div>
            <div className="flex-1"><p className="text-sm font-medium text-white">{snackbar.message}</p></div>
            <button onClick={hideSnackbar} className="p-1"><X className="w-4 h-4" style={{ color: "#525252" }} /></button>
          </div>
        </div>
      )}

      <style jsx>{`
        .complaint-card { background: #1A1D21; border-radius: 16px; padding: 14px; border: 1px solid rgba(255,255,255,0.05); border-left: 4px solid transparent; transition: all 0.15s ease; cursor: pointer; }
        .complaint-card:active { transform: scale(0.98); }
        .tab-btn { font-size: 14px; font-weight: 600; padding: 10px 20px; border-radius: 12px; border: none; cursor: pointer; transition: all 0.2s ease; background: transparent; color: #525252; }
        .tab-btn.active { background: rgba(4,120,87,0.15); color: #059669; }
        .tab-btn:active { transform: scale(0.95); }
        .category-chip { font-size: 13px; font-weight: 500; padding: 8px 16px; border-radius: 20px; border: 1.5px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.03); color: #a3a3a3; cursor: pointer; transition: all 0.2s ease; white-space: nowrap; display: inline-flex; align-items: center; gap: 6px; }
        .category-chip:active { transform: scale(0.95); }
        .reason-chip { font-size: 13px; font-weight: 500; padding: 10px 16px; border-radius: 14px; border: 1.5px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.03); color: #a3a3a3; cursor: pointer; transition: all 0.2s ease; text-align: center; }
        .reason-chip:active { transform: scale(0.95); }
        .timeline-step { display: flex; gap: 12px; position: relative; }
        .timeline-dot { width: 10px; height: 10px; border-radius: 50%; border: 2px solid; background: #1A1D21; flex-shrink: 0; z-index: 1; margin-top: 4px; }
        .timeline-line { position: absolute; left: 4.5px; top: 18px; bottom: 0; width: 1px; background: rgba(255,255,255,0.06); }
        .chat-bubble { max-width: 85%; padding: 12px 16px; border-radius: 16px; font-size: 14px; line-height: 1.5; }
        .chat-bubble.tenant { background: rgba(4,120,87,0.15); color: #e5e5e5; border-bottom-right-radius: 4px; margin-left: auto; }
        .chat-bubble.landlord { background: rgba(255,255,255,0.06); color: #e5e5e5; border-bottom-left-radius: 4px; }
        .btn-warning { background: linear-gradient(to right, #d97706, #f59e0b); color: white; font-weight: 600; font-size: 14px; padding: 12px 20px; border-radius: 12px; border: none; cursor: pointer; box-shadow: 0 4px 15px rgba(217,119,6,0.3); }
        .btn-warning:active { transform: scale(0.96); }
        .btn-warning:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
      `}</style>
    </div>
  );
}

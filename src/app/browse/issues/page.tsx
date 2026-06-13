"use client";

import { useState } from "react";
import {
  ArrowLeft,
  Plus,
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
  MessageSquare,
  Check,
} from "lucide-react";
import { useBrowse } from "../BrowseContext";
import { useRouter } from "next/navigation";

// ---- Types ----
type TabType = "complaints" | "vacating";
type ComplaintStatus = "open" | "in-progress" | "resolved";
type Urgency = "low" | "medium" | "high";

interface ComplaintData {
  title: string;
  icon: "droplets" | "zap" | "volume-2";
  color: string;
  status: ComplaintStatus;
  desc: string;
  replies: number;
  statusLabel: string;
  time: string;
}

const complaintsData: ComplaintData[] = [
  { title: "Water Leak in Bathroom", icon: "droplets", color: "#ef4444", status: "open", desc: "There's a persistent leak under the bathroom sink. Water is pooling on the floor.", replies: 3, statusLabel: "Awaiting response", time: "2h ago" },
  { title: "Power Outlet Not Working", icon: "zap", color: "#3b82f6", status: "in-progress", desc: "The power outlet near the bedroom window is completely dead.", replies: 5, statusLabel: "Electrician scheduled", time: "1d ago" },
  { title: "Noisy Neighbors Upstairs", icon: "volume-2", color: "#059669", status: "resolved", desc: "Loud music and stomping every night after 11 PM.", replies: 8, statusLabel: "Issue resolved", time: "5d ago" },
];

const statusMeta: Record<ComplaintStatus, { label: string; color: string; bg: string }> = {
  open: { label: "Open", color: "#ef4444", bg: "rgba(239,68,68,0.15)" },
  "in-progress": { label: "In Progress", color: "#3b82f6", bg: "rgba(59,130,246,0.15)" },
  resolved: { label: "Resolved", color: "#059669", bg: "rgba(4,120,87,0.15)" },
};

const categoryOptions = [
  { key: "plumbing", icon: Droplets, label: "Plumbing" },
  { key: "electrical", icon: Zap, label: "Electrical" },
  { key: "noise", icon: Volume2, label: "Noise" },
  { key: "security", icon: Shield, label: "Security" },
  { key: "cleanliness", icon: Sparkles, label: "Cleanliness" },
  { key: "other", icon: MoreHorizontal, label: "Other" },
];

const urgencyMeta: Record<Urgency, { color: string; bg: string; border: string }> = {
  low: { color: "#059669", bg: "rgba(4,120,87,0.15)", border: "rgba(4,120,87,0.3)" },
  medium: { color: "#eab308", bg: "rgba(234,179,8,0.15)", border: "rgba(234,179,8,0.3)" },
  high: { color: "#ef4444", bg: "rgba(239,68,68,0.15)", border: "rgba(239,68,68,0.3)" },
};

const vacateReasons = [
  { key: "relocating", emoji: "🏠", label: "Relocating" },
  { key: "affordability", emoji: "💰", label: "Affordability" },
  { key: "maintenance", emoji: "🔧", label: "Maintenance" },
  { key: "other", emoji: "📝", label: "Other" },
];

// ---- Icon map ----
const iconMap: Record<string, React.ElementType> = {
  droplets: Droplets,
  zap: Zap,
  "volume-2": Volume2,
};

export default function IssuesPage() {
  const router = useRouter();
  const { showSnackbar } = useBrowse();
  const [activeTab, setActiveTab] = useState<TabType>("complaints");
  const [sheetOpen, setSheetOpen] = useState<string | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState<string | null>(null);

  // Complaint form
  const [compCategory, setCompCategory] = useState("plumbing");
  const [compDesc, setCompDesc] = useState("");
  const [compUrgency, setCompUrgency] = useState<Urgency>("medium");
  const [compHasFile, setCompHasFile] = useState(false);

  // Vacating form
  const [moveOutDate, setMoveOutDate] = useState("");
  const [vacateReason, setVacateReason] = useState("relocating");
  const [vacateDetails, setVacateDetails] = useState("");

  // Chat reply
  const [replyText, setReplyText] = useState("");
  const [chatMessages, setChatMessages] = useState([
    { text: "Hi, there's a water leak under the bathroom sink. It's getting worse.", isTenant: true },
    { text: "Thanks for reporting. I'll send a plumber tomorrow morning.", isTenant: false },
    { text: "Thank you! Should I be home or can they access with caretaker keys?", isTenant: true },
  ]);

  const currentComplaint = complaintsData[currentIdx];

  const openSheet = (name: string) => {
    setSheetOpen(name);
    document.body.style.overflow = "hidden";
  };
  const closeSheet = () => {
    setSheetOpen(null);
    document.body.style.overflow = "";
  };

  const handleComplaintFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setCompHasFile(true);
  };

  const handleSubmitComplaint = () => {
    if (compDesc.trim().length < 10) return;
    setLoading("comp");
    setTimeout(() => {
      setLoading(null);
      closeSheet();
      setTimeout(() => openSheet("comp-ok"), 300);
    }, 1500);
  };

  const handleVacateSubmit = () => {
    if (!moveOutDate || !vacateReason) return;
    setLoading("vacate");
    setTimeout(() => {
      setLoading(null);
      openSheet("vacate-ok");
    }, 2000);
  };

  const handleSendReply = () => {
    if (!replyText.trim()) return;
    setChatMessages((prev) => [...prev, { text: replyText.trim(), isTenant: true }]);
    setReplyText("");
    showSnackbar("Reply sent", "success");
  };

  const formattedDate = moveOutDate
    ? new Date(moveOutDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "Feb 15, 2025";

  const CompIcon = currentComplaint ? (iconMap[currentComplaint.icon] || Droplets) : Droplets;

  return (
    <div style={{ minHeight: "100dvh", position: "relative", overflowX: "hidden" }}>
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
        className="flex items-center justify-between px-5 py-4 sticky top-0 z-40"
        style={{ background: "rgba(5,5,5,0.9)", backdropFilter: "blur(20px)" }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full flex items-center justify-center ripple-container"
            style={{ background: "rgba(255,255,255,0.05)" }}
          >
            <ArrowLeft className="w-5 h-5" style={{ color: "#a3a3a3" }} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white">Issues & Vacating</h1>
            <p className="text-xs" style={{ color: "#a3a3a3" }}>Unit A2 · Kilimani Apartment</p>
          </div>
        </div>
        <button
          onClick={() => { setCompCategory("plumbing"); setCompDesc(""); setCompUrgency("medium"); setCompHasFile(false); openSheet("submit"); }}
          className="w-10 h-10 rounded-full flex items-center justify-center ripple-container"
          style={{ background: "rgba(4,120,87,0.15)" }}
        >
          <Plus className="w-5 h-5" style={{ color: "#059669" }} />
        </button>
      </header>

      <div style={{ animation: "slideInUp 0.5s ease", paddingBottom: 24 }}>
        {/* ====== TABS ====== */}
        <div className="flex gap-2 px-5 mb-4">
          <button onClick={() => setActiveTab("complaints")} className={`tab-btn ${activeTab === "complaints" ? "active" : ""}`}>Complaints</button>
          <button onClick={() => setActiveTab("vacating")} className={`tab-btn ${activeTab === "vacating" ? "active" : ""}`}>Vacating</button>
        </div>

        {/* ====== COMPLAINTS TAB ====== */}
        {activeTab === "complaints" && (
          <div className="px-5 space-y-3" style={{ animation: "slideInUp 0.3s ease" }}>
            {/* Submit CTA */}
            <div
              onClick={() => { setCompCategory("plumbing"); setCompDesc(""); setCompUrgency("medium"); setCompHasFile(false); openSheet("submit"); }}
              className="rounded-2xl p-4 flex items-center gap-4 cursor-pointer ripple-container"
              style={{ background: "rgba(4,120,87,0.08)", border: "1.5px dashed rgba(4,120,87,0.2)", transition: "all 0.15s ease" }}
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

            {/* Complaint cards */}
            {complaintsData.map((item, idx) => {
              const sm = statusMeta[item.status];
              const Icon = iconMap[item.icon] || Droplets;
              return (
                <div
                  key={idx}
                  onClick={() => { setCurrentIdx(idx); setChatMessages([
                    { text: "Hi, there's a water leak under the bathroom sink. It's getting worse.", isTenant: true },
                    { text: "Thanks for reporting. I'll send a plumber tomorrow morning.", isTenant: false },
                    { text: "Thank you! Should I be home or can they access with caretaker keys?", isTenant: true },
                  ]); openSheet("detail"); }}
                  className="complaint-card ripple-container"
                  style={{ cursor: "pointer" }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="status-badge" style={{ background: sm.bg, color: sm.color, fontSize: 10 }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: sm.color, display: "inline-block", marginRight: 4 }} />
                      {sm.label}
                    </span>
                    <span className="text-xs" style={{ color: "#525252" }}>{item.time}</span>
                  </div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${item.color}16` }}>
                      <Icon className="w-4 h-4" style={{ color: item.color }} />
                    </div>
                    <h4 className="text-sm font-semibold text-white">{item.title}</h4>
                  </div>
                  <p className="text-xs mb-2" style={{ color: "#a3a3a3" }}>{item.desc}</p>
                  <div className="flex items-center justify-between pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                    <span className="text-xs" style={{ color: "#525252" }}>
                      <MessageSquare className="w-3 h-3 inline mr-1" />{item.replies} replies
                    </span>
                    <span className="text-xs font-medium" style={{ color: item.color }}>{item.statusLabel}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ====== VACATING TAB ====== */}
        {activeTab === "vacating" && (
          <div className="px-5" style={{ animation: "slideInUp 0.3s ease" }}>
            {/* Current Status */}
            <div className="rounded-2xl p-5 mb-4" style={{ background: "#1A1D21", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-white">Tenancy Status</h3>
                <span className="status-badge" style={{ background: "rgba(4,120,87,0.15)", color: "#059669", fontSize: 10 }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#059669", display: "inline-block", marginRight: 4 }} /> Active
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between py-1.5"><span className="text-sm" style={{ color: "#525252" }}>Lease Start</span><span className="text-sm font-medium text-white">Oct 1, 2024</span></div>
                <div className="flex justify-between py-1.5"><span className="text-sm" style={{ color: "#525252" }}>Lease End</span><span className="text-sm font-medium text-white">Sep 30, 2025</span></div>
                <div className="flex justify-between py-1.5"><span className="text-sm" style={{ color: "#525252" }}>Notice Required</span><span className="text-sm font-medium text-white">30 days</span></div>
              </div>
            </div>

            {/* Submit Vacating Notice */}
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
                    {vacateReasons.map((r) => (
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
                      Your security deposit (KSh 35,000) will be processed within 14 days of move-out after inspection.
                    </p>
                  </div>
                </div>

                {/* Submit */}
                <button
                  onClick={handleVacateSubmit}
                  disabled={!moveOutDate || loading === "vacate"}
                  className="btn-warning w-full text-center ripple-container flex items-center justify-center gap-2"
                  style={{ opacity: !moveOutDate ? 0.4 : 1 }}
                >
                  {loading === "vacate" ? (
                    <div className="spinner" />
                  ) : (
                    <>
                      <LogOut className="w-4 h-4" /> Submit Notice
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ============================================ */}
      {/* SHEET: SUBMIT COMPLAINT */}
      {/* ============================================ */}
      <div className={`bs-overlay ${sheetOpen === "submit" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bs ${sheetOpen === "submit" ? "active" : ""}`} style={{ maxHeight: "95dvh" }}>
        <div className="bs-handle" />
        <div className="p-5 pb-8">
          <h3 className="text-lg font-bold text-white mb-4">Submit Complaint</h3>

          <div className="space-y-4">
            {/* Category */}
            <div>
              <label className="text-xs font-semibold mb-2 block" style={{ color: "#a3a3a3" }}>CATEGORY</label>
              <div className="flex flex-wrap gap-2">
                {categoryOptions.map((cat) => {
                  const CatIcon = cat.icon;
                  return (
                    <button
                      key={cat.key}
                      onClick={() => setCompCategory(cat.key)}
                      className="category-chip"
                      style={compCategory === cat.key
                        ? { background: "rgba(4,120,87,0.15)", border: "1.5px solid rgba(4,120,87,0.3)", color: "#059669" }
                        : {}}
                    >
                      <CatIcon className="w-3.5 h-3.5" /> {cat.label}
                    </button>
                  );
                })}
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
                {(["low", "medium", "high"] as Urgency[]).map((u) => {
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
              className="btn-primary w-full text-center ripple-container"
              style={{ opacity: compDesc.trim().length < 10 ? 0.4 : 1 }}
            >
              {loading === "comp" ? <div className="spinner" /> : <span>Submit Complaint</span>}
            </button>
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* SHEET: COMPLAINT DETAIL */}
      {/* ============================================ */}
      <div className={`bs-overlay ${sheetOpen === "detail" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bs ${sheetOpen === "detail" ? "active" : ""}`} style={{ maxHeight: "95dvh" }}>
        <div className="bs-handle" />
        {currentComplaint && (
          <div className="p-5 pb-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${currentComplaint.color}16` }}>
                  <CompIcon className="w-4 h-4" style={{ color: currentComplaint.color }} />
                </div>
                <h3 className="text-base font-bold text-white">{currentComplaint.title}</h3>
              </div>
              <span className="status-badge" style={{ background: statusMeta[currentComplaint.status].bg, color: statusMeta[currentComplaint.status].color, fontSize: 10 }}>
                {statusMeta[currentComplaint.status].label}
              </span>
            </div>

            {/* Timeline */}
            <div className="mb-5">
              <div className="timeline-step pb-4">
                <div className="timeline-dot" style={{ borderColor: "#ef4444", background: "#ef4444" }} />
                <div>
                  <p className="text-sm font-medium text-white">Complaint submitted</p>
                  <p className="text-xs" style={{ color: "#525252" }}>Today · 10:30 AM</p>
                </div>
              </div>
              <div className="timeline-step pb-4 relative">
                <div className="timeline-line" />
                <div className="timeline-dot" style={{ borderColor: "#3b82f6", background: "#3b82f6" }} />
                <div>
                  <p className="text-sm font-medium text-white">
                    {currentComplaint.status === "resolved" ? "Landlord responded" : "Landlord viewing scheduled"}
                  </p>
                  <p className="text-xs" style={{ color: "#525252" }}>
                    {currentComplaint.status === "resolved" ? "3 days ago" : "Today · 2:00 PM"}
                  </p>
                </div>
              </div>
              {currentComplaint.status === "resolved" && (
                <div className="timeline-step">
                  <div className="timeline-dot" style={{ borderColor: "#059669", background: "#059669" }} />
                  <div>
                    <p className="text-sm font-medium text-white">Issue resolved</p>
                    <p className="text-xs" style={{ color: "#525252" }}>2 days ago</p>
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
              <p className="text-sm leading-relaxed" style={{ color: "#a3a3a3" }}>{currentComplaint.desc}</p>
            </div>

            {/* Chat Thread */}
            <div className="mb-4">
              <p className="text-xs font-semibold mb-3" style={{ color: "#525252" }}>CONVERSATION</p>
              <div className="space-y-3">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.isTenant ? "justify-end" : "justify-start"}`}>
                    <div className={`chat-bubble ${msg.isTenant ? "tenant" : "landlord"}`}>{msg.text}</div>
                  </div>
                ))}
              </div>
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
      <div className={`bs-overlay ${sheetOpen === "vacate-ok" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bs ${sheetOpen === "vacate-ok" ? "active" : ""}`} style={{ maxHeight: "70dvh" }}>
        <div className="bs-handle" />
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
          <button onClick={closeSheet} className="btn-primary w-full text-center ripple-container">Done</button>
        </div>
      </div>

      {/* ============================================ */}
      {/* SHEET: COMPLAINT SUCCESS */}
      {/* ============================================ */}
      <div className={`bs-overlay ${sheetOpen === "comp-ok" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bs ${sheetOpen === "comp-ok" ? "active" : ""}`} style={{ maxHeight: "65dvh" }}>
        <div className="bs-handle" />
        <div className="p-5 pb-8 text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(4,120,87,0.15)", animation: "checkPop 0.4s ease" }}>
            <Check className="w-8 h-8" style={{ color: "#059669" }} />
          </div>
          <h3 className="text-xl font-bold text-white mb-1">Complaint Submitted!</h3>
          <p className="text-sm mb-5" style={{ color: "#a3a3a3" }}>Your landlord has been notified and will respond shortly.</p>
          <button onClick={closeSheet} className="btn-primary w-full text-center ripple-container">Done</button>
        </div>
      </div>

      <style jsx>{`
        .tab-btn {
          font-size: 14px;
          font-weight: 600;
          padding: 10px 20px;
          border-radius: 12px;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
          background: transparent;
          color: #525252;
        }
        .tab-btn.active {
          background: rgba(4,120,87,0.15);
          color: #059669;
        }
        .tab-btn:active {
          transform: scale(0.95);
        }
        .complaint-card {
          background: #1A1D21;
          border-radius: 16px;
          padding: 14px;
          border: 1px solid rgba(255,255,255,0.05);
          border-left: 4px solid transparent;
          transition: all 0.15s ease;
          cursor: pointer;
        }
        .complaint-card:active {
          transform: scale(0.98);
        }
        .category-chip {
          font-size: 13px;
          font-weight: 500;
          padding: 8px 16px;
          border-radius: 20px;
          border: 1.5px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.03);
          color: #a3a3a3;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .category-chip:active {
          transform: scale(0.95);
        }
        .reason-chip {
          font-size: 13px;
          font-weight: 500;
          padding: 10px 16px;
          border-radius: 14px;
          border: 1.5px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.03);
          color: #a3a3a3;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: center;
        }
        .reason-chip:active {
          transform: scale(0.95);
        }
        .timeline-step {
          display: flex;
          gap: 12px;
          position: relative;
        }
        .timeline-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          border: 2px solid;
          background: #1A1D21;
          flex-shrink: 0;
          z-index: 1;
          margin-top: 4px;
        }
        .timeline-line {
          position: absolute;
          left: 4.5px;
          top: 18px;
          bottom: 0;
          width: 1px;
          background: rgba(255,255,255,0.06);
        }
        .chat-bubble {
          max-width: 85%;
          padding: 12px 16px;
          border-radius: 16px;
          font-size: 14px;
          line-height: 1.5;
        }
        .chat-bubble.tenant {
          background: rgba(4,120,87,0.15);
          color: #e5e5e5;
          border-bottom-right-radius: 4px;
          margin-left: auto;
        }
        .chat-bubble.landlord {
          background: rgba(255,255,255,0.06);
          color: #e5e5e5;
          border-bottom-left-radius: 4px;
        }
        .btn-warning {
          background: linear-gradient(to right, #d97706, #f59e0b);
          color: white;
          font-weight: 600;
          font-size: 14px;
          padding: 12px 20px;
          border-radius: 12px;
          border: none;
          cursor: pointer;
          box-shadow: 0 4px 15px rgba(217,119,6,0.3);
        }
        .btn-warning:active {
          transform: scale(0.96);
        }
        .btn-warning:disabled {
          opacity: 0.4;
          cursor: not-allowed;
          transform: none;
        }
      `}</style>
    </div>
  );
}

"use client";

import { useState } from "react";
import {
  ArrowLeft,
  Upload,
  FileCheck,
  FileText,
  Download,
  ScrollText,
  ClipboardCheck,
  Calendar,
  PlugZap,
  FileX,
  Search,
  Wallet,
  MessageSquare,
  User,
  Check,
  X,
  MessageCircle,
  Mail,
  Link,
  Droplets,
  TrendingUp,
  Clock,
  CheckCheck,
} from "lucide-react";

// ---- Types ----
type TabType = "documents" | "notices";

interface DocData {
  title: string;
  icon: string;
  color: string;
  bg: string;
  badge: string;
  badgeClass: string;
  subtitle: string;
  size: string;
  stamp: string;
  meta?: string;
}

interface NoticeData {
  title: string;
  body: string;
  time: string;
  isNew: boolean;
  action: string | null;
  author: string;
  authorTime: string;
}

const docsData: DocData[] = [
  { title: "Lease Agreement", icon: "file-check", color: "#059669", bg: "rgba(4,120,87,0.15)", badge: "Signed", badgeClass: "status-signed", subtitle: "Oct 1, 2024 — Sep 30, 2025", size: "2.4 MB", stamp: "SIGNED" },
  { title: "House Rules", icon: "scroll-text", color: "#3b82f6", bg: "rgba(59,130,246,0.15)", badge: "Active", badgeClass: "status-active", subtitle: "Updated Jan 5, 2025", size: "890 KB", stamp: "ACTIVE" },
  { title: "Move-in Checklist", icon: "clipboard-check", color: "#a855f7", bg: "rgba(168,85,247,0.15)", badge: "Signed", badgeClass: "status-signed", subtitle: "Completed Oct 1, 2024", size: "1.1 MB", stamp: "SIGNED" },
  { title: "Rent Payment Schedule", icon: "calendar", color: "#eab308", bg: "rgba(234,179,8,0.15)", badge: "Active", badgeClass: "status-active", subtitle: "KSh 35,000/month · 5th monthly", size: "320 KB", stamp: "ACTIVE" },
  { title: "Utility Transfer Form", icon: "plug-zap", color: "#ef4444", bg: "rgba(239,68,68,0.1)", badge: "Active", badgeClass: "status-active", subtitle: "Electricity & Water to tenant name", size: "560 KB", stamp: "ACTIVE" },
  { title: "Previous Lease", icon: "file-x", color: "#525252", bg: "rgba(255,255,255,0.05)", badge: "Expired", badgeClass: "status-expired", subtitle: "Oct 2023 — Sep 2024", size: "2.1 MB", stamp: "EXPIRED", meta: "expired" },
];

const noticesData: NoticeData[] = [
  {
    title: "Water Supply Interruption",
    body: "Dear tenants, there will be no water supply on Saturday Jan 18 from 8AM-4PM due to Nairobi City County maintenance. Please store enough water.",
    time: "Today",
    isNew: true,
    action: "water",
    author: "James Mwangi",
    authorTime: "3h ago",
  },
  {
    title: "Rent Increase Notice",
    body: "Effective March 1, 2025, monthly rent will increase from KSh 35,000 to KSh 38,000 as per the lease agreement clause 4.2. 30-day notice as required.",
    time: "Yesterday",
    isNew: true,
    action: "rent",
    author: "James Mwangi",
    authorTime: "1d ago",
  },
  {
    title: "Holiday Season Greetings",
    body: "Wishing all tenants a Merry Christmas and Happy New Year! The office will be closed from December 25 to January 1. For emergencies, contact the caretaker at 0712 345 678.",
    time: "Dec 28, 2024",
    isNew: false,
    action: null,
    author: "James Mwangi",
    authorTime: "Dec 28",
  },
  {
    title: "Parking Allocation Update",
    body: "Parking spot B2 has been reassigned to Unit A2. Please display your parking sticker at all times when using the lot. Visitors should park in Lot C.",
    time: "Nov 15, 2024",
    isNew: false,
    action: null,
    author: "Caretaker",
    authorTime: "Nov 15",
  },
];

const docDetailMeta: Record<string, { type: string; shared: string; date: string }> = {
  "Lease Agreement": { type: "PDF Document", shared: "James Mwangi", date: "Oct 1, 2024" },
  "House Rules": { type: "PDF Document", shared: "James Mwangi", date: "Jan 5, 2025" },
  "Move-in Checklist": { type: "PDF Document", shared: "James Mwangi", date: "Oct 1, 2024" },
  "Rent Payment Schedule": { type: "PDF Document", shared: "James Mwangi", date: "Oct 1, 2024" },
  "Utility Transfer Form": { type: "PDF Document", shared: "James Mwangi", date: "Oct 1, 2024" },
  "Previous Lease": { type: "PDF Document", shared: "James Mwangi", date: "Oct 1, 2023" },
};

// ---- Snackbar ----
let snackbarTimeout: ReturnType<typeof setTimeout> | null = null;
const showSnackbar = (msg: string, type: "success" | "error" | "info" = "info") => {
  const el = document.getElementById("app-snackbar");
  const text = document.getElementById("snackbar-text");
  const icon = document.getElementById("snackbar-icon");
  if (!el || !text || !icon) return;
  text.textContent = msg;
  const icons = {
    success: '<div class="w-6 h-6 rounded-full flex items-center justify-center" style="background:rgba(4,120,87,0.2)"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></div>',
    error: '<div class="w-6 h-6 rounded-full flex items-center justify-center" style="background:rgba(239,68,68,0.2)"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></div>',
    info: '<div class="w-6 h-6 rounded-full flex items-center justify-center" style="background:rgba(59,130,246,0.2)"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg></div>',
  };
  icon.innerHTML = icons[type] || icons.info;
  el.classList.remove("hide");
  el.classList.add("show");
  if (snackbarTimeout) clearTimeout(snackbarTimeout);
  snackbarTimeout = setTimeout(() => {
    el.classList.remove("show");
    el.classList.add("hide");
    setTimeout(() => el.classList.remove("hide"), 300);
  }, 3500);
};

const hideSnackbar = () => {
  const el = document.getElementById("app-snackbar");
  if (el) { el.classList.remove("show"); el.classList.add("hide"); setTimeout(() => el.classList.remove("hide"), 300); }
};

// ---- Icon resolver ----
const iconMap: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  "file-check": FileCheck,
  "scroll-text": ScrollText,
  "clipboard-check": ClipboardCheck,
  "calendar": Calendar,
  "plug-zap": PlugZap,
  "file-x": FileX,
};

export default function DocumentsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("documents");
  const [activeNav, setActiveNav] = useState("docs");
  const [sheetOpen, setSheetOpen] = useState<string | null>(null);
  const [currentDocIdx, setCurrentDocIdx] = useState(0);
  const [currentNoticeIdx, setCurrentNoticeIdx] = useState(0);

  const currentDoc = docsData[currentDocIdx];
  const currentNotice = noticesData[currentNoticeIdx];
  const currentMeta = docDetailMeta[currentDoc?.title || ""] || { type: "", shared: "", date: "" };
  const DocIcon = currentDoc ? iconMap[currentDoc.icon] || FileText : FileText;

  const openSheet = (name: string) => {
    setSheetOpen(name);
    document.body.style.overflow = "hidden";
  };
  const closeSheet = () => {
    setSheetOpen(null);
    document.body.style.overflow = "";
  };

  return (
    <div style={{ background: "#050505", color: "#e5e5e5", fontFamily: "'Inter', sans-serif", minHeight: "100dvh" }}>
      <div className="status-bar" />

      {/* ====== HEADER ====== */}
      <div className="flex items-center justify-between px-5 py-4 sticky top-0 z-40" style={{ background: "rgba(5,5,5,0.9)", backdropFilter: "blur(20px)" }}>
        <div className="flex items-center gap-3">
          <button onClick={() => showSnackbar("Back", "info")} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)" }}>
            <ArrowLeft className="w-5 h-5" style={{ color: "#a3a3a3" }} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white">Documents</h1>
            <p className="text-xs" style={{ color: "#a3a3a3" }}>Unit A2 · Kilimani Apartment</p>
          </div>
        </div>
        <button onClick={() => openSheet("request")} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(59,130,246,0.1)" }}>
          <Upload className="w-5 h-5" style={{ color: "#3b82f6" }} />
        </button>
      </div>

      <div style={{ animation: "slideInUp 0.5s ease", paddingBottom: 80 }}>

        {/* ====== TABS ====== */}
        <div className="flex gap-2 px-5 mb-5">
          <button onClick={() => setActiveTab("documents")} className={`tab-btn ${activeTab === "documents" ? "active" : ""}`}>My Documents</button>
          <button onClick={() => setActiveTab("notices")} className={`tab-btn ${activeTab === "notices" ? "active" : ""}`}>
            Notices <span className="ml-1 text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}>2</span>
          </button>
        </div>

        {/* ====== DOCUMENTS TAB ====== */}
        {activeTab === "documents" && (
          <div className="px-5 space-y-4" style={{ animation: "slideInUp 0.3s ease" }}>
            {docsData.map((doc, idx) => {
              const DIcon = iconMap[doc.icon] || FileText;
              return (
                <div
                  key={idx}
                  className="doc-card"
                  onClick={() => { setCurrentDocIdx(idx); openSheet("preview"); }}
                  style={doc.meta === "expired" ? { opacity: 0.6 } : {}}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: doc.bg }}>
                      <DIcon className="w-6 h-6" style={{ color: doc.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-white" style={doc.meta === "expired" ? { color: "#525252" } : {}}>{doc.title}</h4>
                        <span className="status-badge" style={{ fontSize: 10 }}>
                          {doc.badge === "Signed" && <Check className="w-3 h-3" style={{ marginRight: 2 }} />}
                          {doc.badge}
                        </span>
                      </div>
                      <p className="text-xs mt-1" style={{ color: "#525252" }}>{doc.subtitle}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs" style={{ color: "#525252" }}>
                          <FileText className="w-3 h-3 inline" style={{ marginRight: 2 }} /> PDF · {doc.size}
                        </span>
                        {doc.title === "Lease Agreement" && (
                          <span className="text-xs" style={{ color: "#525252" }}>
                            <Download className="w-3 h-3 inline" style={{ marginRight: 2 }} /> Downloaded
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ====== NOTICES TAB ====== */}
        {activeTab === "notices" && (
          <div className="px-5 space-y-3" style={{ animation: "slideInUp 0.3s ease" }}>
            {noticesData.map((notice, idx) => (
              <div
                key={idx}
                className={`notice-card ${notice.isNew ? "unread" : ""}`}
                onClick={() => { setCurrentNoticeIdx(idx); openSheet("notice"); }}
              >
                {notice.isNew && (
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: "#059669" }} />
                      <span className="text-xs font-semibold" style={{ color: "#059669" }}>New</span>
                    </div>
                    <span className="text-xs" style={{ color: "#525252" }}>{notice.time}</span>
                  </div>
                )}
                {!notice.isNew && (
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs" style={{ color: "#525252" }}>{notice.time}</span>
                  </div>
                )}
                <h4 className="text-sm font-bold text-white mb-1" style={!notice.isNew ? { color: "#a3a3a3" } : {}}>{notice.title}</h4>
                <p className="text-xs leading-relaxed" style={{ color: notice.isNew ? "#a3a3a3" : "#525252" }}>{notice.body}</p>
                <div className="flex items-center gap-3 mt-3 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                  <span className="text-xs" style={{ color: "#525252" }}>
                    <User className="w-3 h-3 inline" style={{ marginRight: 2 }} /> {notice.author}
                  </span>
                  <span className="text-xs" style={{ color: "#525252" }}>
                    {notice.isNew ? (
                      <Clock className="w-3 h-3 inline" style={{ marginRight: 2 }} />
                    ) : (
                      <CheckCheck className="w-3 h-3 inline" style={{ marginRight: 2 }} />
                    )}
                    {notice.isNew ? notice.authorTime : "Read"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ====== BOTTOM NAV ====== */}
      <div className="bottom-nav">
        <div className="flex items-center justify-around">
          {[
            { key: "explore", icon: Search, label: "Explore" },
            { key: "payments", icon: Wallet, label: "Payments" },
            { key: "issues", icon: MessageSquare, label: "Issues" },
            { key: "docs", icon: FileText, label: "Docs", active: true },
            { key: "profile", icon: User, label: "Profile" },
          ].map((item) => (
            <button
              key={item.key}
              className={`nav-item ${item.active || activeNav === item.key ? "active" : ""}`}
              onClick={() => { setActiveNav(item.key); showSnackbar(`${item.label} page`, "info"); }}
            >
              <item.icon className="w-5 h-5" style={{ color: (item.active || activeNav === item.key) ? "#059669" : "#525252" }} />
              <span className="text-[10px] font-medium" style={{ color: (item.active || activeNav === item.key) ? "#059669" : "#525252" }}>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ============================================ */}
      {/* SHEET: DOCUMENT PREVIEW */}
      {/* ============================================ */}
      <div className={`sheet-overlay ${sheetOpen === "preview" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${sheetOpen === "preview" ? "active" : ""}`} style={{ maxHeight: "95dvh" }}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">{currentDoc?.title || ""}</h3>
            <span className="status-badge" style={{ fontSize: 10, background: currentDoc?.badgeClass === "status-signed" ? "rgba(4,120,87,0.15)" : currentDoc?.badgeClass === "status-active" ? "rgba(59,130,246,0.15)" : "rgba(239,68,68,0.15)", color: currentDoc?.badgeClass === "status-signed" ? "#059669" : currentDoc?.badgeClass === "status-active" ? "#3b82f6" : "#ef4444" }}>
              {currentDoc?.badge === "Signed" && <Check className="w-3 h-3" style={{ marginRight: 2 }} />}
              {currentDoc?.badge || ""}
            </span>
          </div>

          {/* Preview */}
          <div className="doc-preview mb-5">
            <div className="doc-preview-header">
              <FileText className="w-4 h-4" style={{ color: "#a3a3a3" }} />
              <span className="text-xs font-medium" style={{ color: "#a3a3a3" }}>Document Preview</span>
            </div>
            <div className="doc-preview-body">
              <div className="doc-line heading" />
              <div className="doc-line medium" />
              <div className="doc-line" />
              <div className="doc-line" />
              <div className="doc-line short" />
              <div className="doc-line heading" style={{ marginTop: 16 }} />
              <div className="doc-line" />
              <div className="doc-line medium" />
              <div className="doc-line" />
              <div className="doc-line short" />
              <div className="doc-line heading" style={{ marginTop: 16 }} />
              <div className="doc-line" />
              <div className="doc-line" />
              <div className="doc-line medium" />
              <div className="doc-line last" />
              <div className="stamp">{currentDoc?.stamp || ""}</div>
            </div>
          </div>

          {/* Meta */}
          <div className="space-y-0 mb-5">
            <div className="flex justify-between py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <span className="text-sm" style={{ color: "#525252" }}>File Size</span>
              <span className="text-sm font-medium text-white">{currentDoc?.size || ""}</span>
            </div>
            <div className="flex justify-between py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <span className="text-sm" style={{ color: "#525252" }}>Uploaded</span>
              <span className="text-sm font-medium text-white">{currentMeta.date}</span>
            </div>
            <div className="flex justify-between py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <span className="text-sm" style={{ color: "#525252" }}>Type</span>
              <span className="text-sm font-medium text-white">{currentMeta.type}</span>
            </div>
            <div className="flex justify-between py-3">
              <span className="text-sm" style={{ color: "#525252" }}>Shared by</span>
              <span className="text-sm font-medium text-white">{currentMeta.shared}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <button onClick={() => showSnackbar("Document downloading…", "success")} className="btn-primary w-full text-center flex items-center justify-center gap-2">
              <Download className="w-4 h-4" /> Download PDF
            </button>
            <div className="flex gap-2">
              <button onClick={() => showSnackbar("Shared via WhatsApp", "success")} className="btn-ghost flex-1 text-center flex items-center justify-center gap-1.5">
                <MessageCircle className="w-4 h-4" /> WhatsApp
              </button>
              <button onClick={() => showSnackbar("Shared via Email", "success")} className="btn-ghost flex-1 text-center flex items-center justify-center gap-1.5">
                <Mail className="w-4 h-4" /> Email
              </button>
              <button onClick={() => showSnackbar("Link copied", "success")} className="btn-ghost flex-1 text-center flex items-center justify-center gap-1.5">
                <Link className="w-4 h-4" /> Copy
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* SHEET: NOTICE DETAIL */}
      {/* ============================================ */}
      <div className={`sheet-overlay ${sheetOpen === "notice" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${sheetOpen === "notice" ? "active" : ""}`} style={{ maxHeight: "90dvh" }}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-8">
          <div className="flex items-center justify-between mb-2">            <span className="text-xs" style={{ color: "#525252" }}>
                      {currentNotice?.time || ""}
                    </span>
            {currentNotice?.isNew && (
              <span className="status-badge" style={{ fontSize: 10, background: "rgba(4,120,87,0.15)", color: "#059669" }}>New</span>
            )}
          </div>
          <h3 className="text-xl font-bold text-white mb-3">{currentNotice?.title || ""}</h3>

          <div className="flex items-center gap-3 mb-5 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg,#047857,#059669)" }}>
              <span className="text-xs font-bold text-white">JM</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{currentNotice?.author || ""}</p>
              <p className="text-xs" style={{ color: "#525252" }}>Landlord · Kilimani Apartment</p>
            </div>
          </div>

          <div className="mb-5">
            <p className="text-sm leading-relaxed" style={{ color: "#a3a3a3" }}>{currentNotice?.body || ""}</p>
          </div>

          {/* Water action card */}
          {currentNotice?.action === "water" && (
            <div className="p-4 rounded-xl mb-5" style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.1)" }}>
              <div className="flex items-center gap-2 mb-2">
                <Droplets className="w-4 h-4" style={{ color: "#3b82f6" }} />
                <span className="text-sm font-semibold text-white">Affected Details</span>
              </div>
              <div className="space-y-1.5">
                <p className="text-xs" style={{ color: "#a3a3a3" }}>📅 Date: Saturday, Jan 18, 2025</p>
                <p className="text-xs" style={{ color: "#a3a3a3" }}>⏰ Time: 8:00 AM — 4:00 PM</p>
                <p className="text-xs" style={{ color: "#a3a3a3" }}>🏢 Reason: Nairobi City County maintenance</p>
                <p className="text-xs" style={{ color: "#a3a3a3" }}>💡 Advice: Store water in advance</p>
              </div>
            </div>
          )}

          {/* Rent action card */}
          {currentNotice?.action === "rent" && (
            <div className="p-4 rounded-xl mb-5" style={{ background: "rgba(234,179,8,0.06)", border: "1px solid rgba(234,179,8,0.1)" }}>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4" style={{ color: "#eab308" }} />
                <span className="text-sm font-semibold text-white">Rent Change Summary</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between py-1"><span className="text-xs" style={{ color: "#525252" }}>Current Rent</span><span className="text-sm font-semibold text-white">KSh 35,000/mo</span></div>
                <div className="flex justify-between py-1"><span className="text-xs" style={{ color: "#525252" }}>New Rent</span><span className="text-sm font-bold" style={{ color: "#eab308" }}>KSh 38,000/mo</span></div>
                <div className="flex justify-between py-1 pt-2" style={{ borderTop: "1px dashed rgba(255,255,255,0.1)" }}>
                  <span className="text-xs" style={{ color: "#525252" }}>Increase</span>
                  <span className="text-sm font-bold" style={{ color: "#ef4444" }}>+KSh 3,000 (+8.6%)</span>
                </div>
                <div className="flex justify-between py-1"><span className="text-xs" style={{ color: "#525252" }}>Effective Date</span><span className="text-sm font-medium text-white">March 1, 2025</span></div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2">
            <button onClick={() => showSnackbar("Notice acknowledged", "success")} className="btn-primary w-full text-center flex items-center justify-center gap-2">
              <Check className="w-4 h-4" /> Acknowledge
            </button>
            <button onClick={() => { closeSheet(); showSnackbar("Opening chat with landlord", "info"); }} className="btn-ghost w-full text-center flex items-center justify-center gap-2">
              <MessageSquare className="w-4 h-4" /> Reply to Landlord
            </button>
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* SHEET: REQUEST DOCUMENT */}
      {/* ============================================ */}
      <div className={`sheet-overlay ${sheetOpen === "request" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${sheetOpen === "request" ? "active" : ""}`} style={{ maxHeight: "80dvh" }}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-8">
          <h3 className="text-lg font-bold text-white mb-1">Request Document</h3>
          <p className="text-sm mb-5" style={{ color: "#a3a3a3" }}>Ask your landlord for a document</p>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold mb-2 block" style={{ color: "#a3a3a3" }}>DOCUMENT TYPE</label>
              <select className="android-input" style={{ appearance: "none" }}>
                <option>Lease Renewal</option>
                <option>Receipt</option>
                <option>ID Copy</option>
                <option>Consent Letter</option>
                <option>Reference Letter</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold mb-2 block" style={{ color: "#a3a3a3" }}>MESSAGE (optional)</label>
              <textarea className="android-input" rows={3} placeholder="Describe what you need…" />
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={closeSheet} className="btn-ghost flex-1 text-center">Cancel</button>
            <button onClick={() => { closeSheet(); showSnackbar("Request sent to landlord", "success"); }} className="btn-primary flex-1 text-center">Send Request</button>
          </div>
        </div>
      </div>

      {/* ====== SNACKBAR ====== */}
      <div id="app-snackbar" className="snackbar">
        <div className="flex items-center gap-3">
          <div id="snackbar-icon" />
          <div className="flex-1"><p id="snackbar-text" className="text-sm font-medium text-white" /></div>
          <button onClick={hideSnackbar} className="p-1"><X className="w-4 h-4" style={{ color: "#525252" }} /></button>
        </div>
      </div>

      <style jsx>{`
        .doc-card { background: #1A1D21; border-radius: 16px; padding: 16px; border: 1px solid rgba(255,255,255,0.05); transition: all 0.15s ease; cursor: pointer; }
        .doc-card:active { transform: scale(0.97); background: #1e2125; }
        .notice-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 16px; transition: all 0.15s ease; cursor: pointer; }
        .notice-card:active { transform: scale(0.97); }
        .notice-card.unread { border-left: 4px solid #059669; background: rgba(4,120,87,0.04); }
        .status-badge { font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 20px; display: inline-flex; align-items: center; gap: 4px; }
        .status-active { background: rgba(4,120,87,0.15); color: #059669; }
        .status-expired { background: rgba(239,68,68,0.15); color: #ef4444; }
        .status-signed { background: rgba(4,120,87,0.15); color: #059669; }
        .tab-btn { font-size: 14px; font-weight: 600; padding: 10px 20px; border-radius: 12px; border: none; cursor: pointer; transition: all 0.2s ease; background: transparent; color: #525252; }
        .tab-btn.active { background: rgba(4,120,87,0.15); color: #059669; }
        .tab-btn:active { transform: scale(0.95); }
        .doc-preview { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; overflow: hidden; }
        .doc-preview-header { background: rgba(255,255,255,0.03); border-bottom: 1px solid rgba(255,255,255,0.04); padding: 12px 16px; display: flex; align-items: center; gap: 8px; }
        .doc-preview-body { padding: 20px; min-height: 200px; position: relative; }
        .doc-line { height: 8px; border-radius: 4px; background: rgba(255,255,255,0.06); margin-bottom: 8px; }
        .doc-line.heading { height: 12px; width: 60%; background: rgba(255,255,255,0.1); }
        .doc-line.short { width: 40%; }
        .doc-line.medium { width: 70%; }
        .doc-line.last { width: 30%; margin-bottom: 0; }
        .stamp { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%) rotate(-15deg); border: 3px solid rgba(4,120,87,0.3); border-radius: 12px; padding: 8px 20px; color: rgba(4,120,87,0.4); font-size: 14px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; }
        .btn-ghost { background: rgba(255,255,255,0.05); color: #e5e5e5; font-weight: 500; font-size: 14px; padding: 12px 20px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); cursor: pointer; transition: all 0.15s ease; }
        .btn-ghost:active { background: rgba(255,255,255,0.08); transform: scale(0.96); }
      `}</style>
    </div>
  );
}

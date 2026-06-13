"use client";

import { useState } from "react";
import {
  ArrowLeft,
  FileCheck,
  ScrollText,
  ClipboardCheck,
  Calendar,
  PlugZap,
  FileX,
  Download,
  MessageCircle,
  Mail,
  Link2,
  Upload,
  Check,
  CheckCheck,
  User,
  Clock,
  TrendingUp,
  Droplets,
  FileText,
  MessageSquare,
} from "lucide-react";
import { useBrowse } from "../BrowseContext";
import { useRouter } from "next/navigation";

// ---- Data ----
interface DocData {
  title: string;
  badge: string;
  badgeClass: "status-signed" | "status-active" | "status-expired";
  icon: any;
  iconBg: string;
  iconColor: string;
  size: string;
  date: string;
  type: string;
  shared: string;
  stamp: string;
  meta?: string;
  meta2?: string;
  opacity?: number;
}

const docs: DocData[] = [
  {
    title: "Lease Agreement",
    badge: "Signed",
    badgeClass: "status-signed",
    icon: FileCheck,
    iconBg: "rgba(4,120,87,0.15)",
    iconColor: "#059669",
    size: "2.4 MB",
    date: "Oct 1, 2024",
    type: "PDF Document",
    shared: "James Mwangi",
    stamp: "SIGNED",
    meta: "Oct 1, 2024 — Sep 30, 2025",
    meta2: "Downloaded",
  },
  {
    title: "House Rules",
    badge: "Active",
    badgeClass: "status-active",
    icon: ScrollText,
    iconBg: "rgba(59,130,246,0.15)",
    iconColor: "#3b82f6",
    size: "890 KB",
    date: "Jan 5, 2025",
    type: "PDF Document",
    shared: "James Mwangi",
    stamp: "ACTIVE",
    meta: "Updated Jan 5, 2025",
  },
  {
    title: "Move-in Checklist",
    badge: "Signed",
    badgeClass: "status-signed",
    icon: ClipboardCheck,
    iconBg: "rgba(168,85,247,0.15)",
    iconColor: "#a855f7",
    size: "1.1 MB",
    date: "Oct 1, 2024",
    type: "PDF Document",
    shared: "James Mwangi",
    stamp: "SIGNED",
    meta: "Completed Oct 1, 2024",
  },
  {
    title: "Rent Payment Schedule",
    badge: "Active",
    badgeClass: "status-active",
    icon: Calendar,
    iconBg: "rgba(234,179,8,0.15)",
    iconColor: "#eab308",
    size: "320 KB",
    date: "Oct 1, 2024",
    type: "PDF Document",
    shared: "James Mwangi",
    stamp: "ACTIVE",
    meta: "KSh 35,000/month · 5th monthly",
  },
  {
    title: "Utility Transfer Form",
    badge: "Active",
    badgeClass: "status-active",
    icon: PlugZap,
    iconBg: "rgba(239,68,68,0.1)",
    iconColor: "#ef4444",
    size: "560 KB",
    date: "Oct 1, 2024",
    type: "PDF Document",
    shared: "James Mwangi",
    stamp: "ACTIVE",
    meta: "Electricity & Water to tenant name",
  },
  {
    title: "Previous Lease",
    badge: "Expired",
    badgeClass: "status-expired",
    icon: FileX,
    iconBg: "rgba(255,255,255,0.05)",
    iconColor: "#525252",
    size: "2.1 MB",
    date: "Oct 1, 2023",
    type: "PDF Document",
    shared: "James Mwangi",
    stamp: "EXPIRED",
    meta: "Oct 2023 — Sep 2024",
    opacity: 0.6,
  },
];

interface NoticeData {
  title: string;
  body: string;
  time: string;
  isNew: boolean;
  action: "water" | "rent" | null;
  author: string;
  authorInitials: string;
  authorRole: string;
}

const notices: NoticeData[] = [
  {
    title: "Water Supply Interruption",
    body: "Dear tenants, there will be no water supply on Saturday Jan 18 from 8AM-4PM due to Nairobi City County maintenance. Please store enough water for the day.",
    time: "Today · 9:00 AM",
    isNew: true,
    action: "water",
    author: "James Mwangi",
    authorInitials: "JM",
    authorRole: "Landlord · Kilimani Apartment",
  },
  {
    title: "Rent Increase Notice",
    body: "Effective March 1, 2025, monthly rent will increase from KSh 35,000 to KSh 38,000 as per the lease agreement clause 4.2. 30-day notice as required.",
    time: "Yesterday · 4:00 PM",
    isNew: true,
    action: "rent",
    author: "James Mwangi",
    authorInitials: "JM",
    authorRole: "Landlord · Kilimani Apartment",
  },
  {
    title: "Holiday Season Greetings",
    body: "Wishing all tenants a Merry Christmas and Happy New Year! Office will be closed Dec 25-Jan 1.",
    time: "Dec 28, 2024",
    isNew: false,
    action: null,
    author: "James Mwangi",
    authorInitials: "JM",
    authorRole: "Landlord · Kilimani Apartment",
  },
  {
    title: "Parking Allocation Update",
    body: "Parking spot B2 has been reassigned to Unit A2. Please display your parking sticker at all times.",
    time: "Nov 15, 2024",
    isNew: false,
    action: null,
    author: "Caretaker",
    authorInitials: "CT",
    authorRole: "Caretaker",
  },
];

const badgeStyles: Record<string, { bg: string; color: string }> = {
  "status-signed": { bg: "rgba(4,120,87,0.15)", color: "#059669" },
  "status-active": { bg: "rgba(4,120,87,0.15)", color: "#059669" },
  "status-expired": { bg: "rgba(239,68,68,0.15)", color: "#ef4444" },
};

export default function DocumentsPage() {
  const router = useRouter();
  const { showSnackbar } = useBrowse();
  const [activeTab, setActiveTab] = useState<"documents" | "notices">("documents");
  const [sheetOpen, setSheetOpen] = useState<string | null>(null);
  const [currentDocIdx, setCurrentDocIdx] = useState(0);
  const [currentNoticeIdx, setCurrentNoticeIdx] = useState(0);

  const openSheet = (name: string) => {
    setSheetOpen(name);
    document.body.style.overflow = "hidden";
  };
  const closeSheet = () => {
    setSheetOpen(null);
    document.body.style.overflow = "";
  };

  const currentDoc = docs[currentDocIdx];
  const currentNotice = notices[currentNoticeIdx];
  const DocIcon = currentDoc?.icon || FileText;

  const unreadCount = notices.filter((n) => n.isNew).length;

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
            <h1 className="text-lg font-bold text-white">Documents</h1>
            <p className="text-xs" style={{ color: "#a3a3a3" }}>
              Unit A2 · Kilimani Apartment
            </p>
          </div>
        </div>
        <button
          onClick={() => openSheet("request")}
          className="w-10 h-10 rounded-full flex items-center justify-center ripple-container"
          style={{ background: "rgba(59,130,246,0.1)" }}
        >
          <Upload className="w-5 h-5" style={{ color: "#3b82f6" }} />
        </button>
      </header>

      <div style={{ animation: "slideInUp 0.5s ease", paddingBottom: 24 }}>
        {/* ====== TABS ====== */}
        <div className="flex gap-2 px-5 mb-5">
          <button
            onClick={() => setActiveTab("documents")}
            className={`tab-btn ${activeTab === "documents" ? "active" : ""}`}
          >
            My Documents
          </button>
          <button
            onClick={() => setActiveTab("notices")}
            className={`tab-btn ${activeTab === "notices" ? "active" : ""}`}
          >
            Notices{" "}
            {unreadCount > 0 && (
              <span
                className="ml-1 text-xs font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}
              >
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* ====== DOCUMENTS TAB ====== */}
        {activeTab === "documents" && (
          <div className="px-5 space-y-4" style={{ animation: "slideInUp 0.3s ease" }}>
            {docs.map((doc, idx) => {
              const DocIcon = doc.icon;
              const badge = badgeStyles[doc.badgeClass] || badgeStyles["status-active"];
              return (
                <div
                  key={idx}
                  className="doc-card ripple-container"
                  onClick={() => {
                    setCurrentDocIdx(idx);
                    openSheet("preview");
                  }}
                  style={{ opacity: doc.opacity ?? 1, cursor: "pointer" }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{ background: doc.iconBg }}
                    >
                      <DocIcon className="w-6 h-6" style={{ color: doc.iconColor }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-white">{doc.title}</h4>
                        <span
                          className="text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"
                          style={{ background: badge.bg, color: badge.color, fontSize: 10 }}
                        >
                          {doc.badge === "Signed" && <Check className="w-3 h-3" />}
                          {doc.badge}
                        </span>
                      </div>
                      {doc.meta && (
                        <p className="text-xs mt-1" style={{ color: "#525252" }}>
                          {doc.meta}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs" style={{ color: "#525252" }}>
                          <FileText className="w-3 h-3 inline mr-1" />
                          PDF · {doc.size}
                        </span>
                        {doc.meta2 && (
                          <span className="text-xs" style={{ color: "#525252" }}>
                            <Download className="w-3 h-3 inline mr-1" />
                            {doc.meta2}
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
            {notices.map((notice, idx) => (
              <div
                key={idx}
                className="notice-card ripple-container"
                onClick={() => {
                  setCurrentNoticeIdx(idx);
                  openSheet("notice");
                }}
                style={{
                  cursor: "pointer",
                  borderLeft: notice.isNew ? "4px solid #059669" : undefined,
                  background: notice.isNew ? "rgba(4,120,87,0.04)" : "rgba(255,255,255,0.03)",
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {notice.isNew && (
                      <>
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ background: "#059669" }}
                        />
                        <span className="text-xs font-semibold" style={{ color: "#059669" }}>
                          New
                        </span>
                      </>
                    )}
                  </div>
                  <span className="text-xs" style={{ color: "#525252" }}>
                    {notice.time}
                  </span>
                </div>
                <h4
                  className="text-sm font-bold mb-1"
                  style={{ color: notice.isNew ? "white" : "#a3a3a3" }}
                >
                  {notice.title}
                </h4>
                <p className="text-xs leading-relaxed" style={{ color: "#a3a3a3" }}>
                  {notice.body}
                </p>
                <div
                  className="flex items-center gap-3 mt-3 pt-2"
                  style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
                >
                  <span className="text-xs" style={{ color: "#525252" }}>
                    <User className="w-3 h-3 inline mr-1" />
                    {notice.author}
                  </span>
                  <span className="text-xs" style={{ color: "#525252" }}>
                    {notice.isNew ? (
                      <Clock className="w-3 h-3 inline mr-1" />
                    ) : (
                      <CheckCheck className="w-3 h-3 inline mr-1" />
                    )}
                    {notice.isNew ? "New" : "Read"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ============================================ */}
      {/* SHEET: DOCUMENT PREVIEW */}
      {/* ============================================ */}
      <div
        className={`bs-overlay ${sheetOpen === "preview" ? "active" : ""}`}
        onClick={closeSheet}
      />
      <div
        id="sheet-preview"
        className={`bs ${sheetOpen === "preview" ? "active" : ""}`}
        style={{ maxHeight: "95dvh" }}
      >
        <div className="bs-handle" />
        <div className="p-5 pb-8">
          {currentDoc && (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">{currentDoc.title}</h3>
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"
                  style={{
                    background:
                      badgeStyles[currentDoc.badgeClass]?.bg || "rgba(4,120,87,0.15)",
                    color: badgeStyles[currentDoc.badgeClass]?.color || "#059669",
                    fontSize: 10,
                  }}
                >
                  {currentDoc.badge === "Signed" && <Check className="w-3 h-3" />}
                  {currentDoc.badge}
                </span>
              </div>

              {/* Preview */}
              <div
                className="mb-5 rounded-xl overflow-hidden"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div
                  className="flex items-center gap-2 px-4 py-3"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                  }}
                >
                  <FileText className="w-4 h-4" style={{ color: "#a3a3a3" }} />
                  <span className="text-xs font-medium" style={{ color: "#a3a3a3" }}>
                    Document Preview
                  </span>
                </div>
                <div className="p-5 relative" style={{ minHeight: 200 }}>
                  {[1, 2, 3].map((section) => (
                    <div key={section}>
                      <div
                        className="h-3 rounded-full mb-2"
                        style={{
                          width: section === 1 ? "60%" : section === 2 ? "70%" : "50%",
                          background: "rgba(255,255,255,0.1)",
                        }}
                      />
                      {[1, 2, 3].map((line) => (
                        <div
                          key={line}
                          className="h-2 rounded-full mb-2"
                          style={{
                            width:
                              line === 1 ? "100%" : line === 2 ? "70%" : line === 3 ? "40%" : "30%",
                            background: "rgba(255,255,255,0.06)",
                          }}
                        />
                      ))}
                    </div>
                  ))}
                  <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-15deg] border-3 px-5 py-2 rounded-xl text-sm font-extrabold tracking-wider uppercase"
                    style={{
                      border: "3px solid rgba(4,120,87,0.3)",
                      color: "rgba(4,120,87,0.4)",
                    }}
                  >
                    {currentDoc.stamp}
                  </div>
                </div>
              </div>

              {/* Meta */}
              <div className="space-y-0 mb-5">
                <div
                  className="flex justify-between py-3"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                >
                  <span className="text-sm" style={{ color: "#525252" }}>
                    File Size
                  </span>
                  <span className="text-sm font-medium text-white">{currentDoc.size}</span>
                </div>
                <div
                  className="flex justify-between py-3"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                >
                  <span className="text-sm" style={{ color: "#525252" }}>
                    Uploaded
                  </span>
                  <span className="text-sm font-medium text-white">{currentDoc.date}</span>
                </div>
                <div
                  className="flex justify-between py-3"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                >
                  <span className="text-sm" style={{ color: "#525252" }}>
                    Type
                  </span>
                  <span className="text-sm font-medium text-white">{currentDoc.type}</span>
                </div>
                <div className="flex justify-between py-3">
                  <span className="text-sm" style={{ color: "#525252" }}>
                    Shared by
                  </span>
                  <span className="text-sm font-medium text-white">{currentDoc.shared}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <button
                  onClick={() => showSnackbar("Document downloading...", "success")}
                  className="w-full py-3.5 rounded-xl font-semibold text-sm text-white ripple-container flex items-center justify-center gap-2"
                  style={{
                    background: "#047857",
                    boxShadow: "0 4px 16px rgba(4,120,87,0.3)",
                  }}
                >
                  <Download className="w-4 h-4" /> Download PDF
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => showSnackbar("Shared via WhatsApp", "success")}
                    className="flex-1 py-3 rounded-xl text-sm font-semibold ripple-container flex items-center justify-center gap-1.5"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      color: "#e5e5e5",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <MessageCircle className="w-4 h-4" /> WhatsApp
                  </button>
                  <button
                    onClick={() => showSnackbar("Shared via Email", "success")}
                    className="flex-1 py-3 rounded-xl text-sm font-semibold ripple-container flex items-center justify-center gap-1.5"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      color: "#e5e5e5",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <Mail className="w-4 h-4" /> Email
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText("Link to document");
                      showSnackbar("Link copied", "success");
                    }}
                    className="flex-1 py-3 rounded-xl text-sm font-semibold ripple-container flex items-center justify-center gap-1.5"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      color: "#e5e5e5",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <Link2 className="w-4 h-4" /> Copy
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ============================================ */}
      {/* SHEET: NOTICE DETAIL */}
      {/* ============================================ */}
      <div
        className={`bs-overlay ${sheetOpen === "notice" ? "active" : ""}`}
        onClick={closeSheet}
      />
      <div
        id="sheet-notice"
        className={`bs ${sheetOpen === "notice" ? "active" : ""}`}
        style={{ maxHeight: "90dvh" }}
      >
        <div className="bs-handle" />
        <div className="p-5 pb-8">
          {currentNotice && (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs" style={{ color: "#525252" }}>
                  {currentNotice.time}
                </span>
                {currentNotice.isNew && (
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(4,120,87,0.15)", color: "#059669", fontSize: 10 }}
                  >
                    New
                  </span>
                )}
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{currentNotice.title}</h3>

              {/* Author */}
              <div
                className="flex items-center gap-3 mb-5 p-3 rounded-xl"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg,#047857,#059669)" }}
                >
                  <span className="text-xs font-bold text-white">
                    {currentNotice.authorInitials}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{currentNotice.author}</p>
                  <p className="text-xs" style={{ color: "#525252" }}>
                    {currentNotice.authorRole}
                  </p>
                </div>
              </div>

              {/* Body */}
              <div className="mb-5">
                <p className="text-sm leading-relaxed" style={{ color: "#a3a3a3" }}>
                  {currentNotice.body}
                </p>
              </div>

              {/* Water action card */}
              {currentNotice.action === "water" && (
                <div
                  className="p-4 rounded-xl mb-5"
                  style={{
                    background: "rgba(59,130,246,0.06)",
                    border: "1px solid rgba(59,130,246,0.1)",
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Droplets className="w-4 h-4" style={{ color: "#3b82f6" }} />
                    <span className="text-sm font-semibold text-white">Affected Details</span>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs" style={{ color: "#a3a3a3" }}>
                      📅 Date: Saturday, Jan 18, 2025
                    </p>
                    <p className="text-xs" style={{ color: "#a3a3a3" }}>
                      ⏰ Time: 8:00 AM — 4:00 PM
                    </p>
                    <p className="text-xs" style={{ color: "#a3a3a3" }}>
                      🏢 Reason: Nairobi City County maintenance
                    </p>
                    <p className="text-xs" style={{ color: "#a3a3a3" }}>
                      💡 Advice: Store water in advance
                    </p>
                  </div>
                </div>
              )}

              {/* Rent action card */}
              {currentNotice.action === "rent" && (
                <div
                  className="p-4 rounded-xl mb-5"
                  style={{
                    background: "rgba(234,179,8,0.06)",
                    border: "1px solid rgba(234,179,8,0.1)",
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4" style={{ color: "#eab308" }} />
                    <span className="text-sm font-semibold text-white">Rent Change Summary</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between py-1">
                      <span className="text-xs" style={{ color: "#525252" }}>
                        Current Rent
                      </span>
                      <span className="text-sm font-semibold text-white">KSh 35,000/mo</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-xs" style={{ color: "#525252" }}>
                        New Rent
                      </span>
                      <span className="text-sm font-bold" style={{ color: "#eab308" }}>
                        KSh 38,000/mo
                      </span>
                    </div>
                    <div
                      className="flex justify-between py-1 pt-2"
                      style={{ borderTop: "1px dashed rgba(255,255,255,0.1)" }}
                    >
                      <span className="text-xs" style={{ color: "#525252" }}>
                        Increase
                      </span>
                      <span className="text-sm font-bold" style={{ color: "#ef4444" }}>
                        +KSh 3,000 (+8.6%)
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-xs" style={{ color: "#525252" }}>
                        Effective Date
                      </span>
                      <span className="text-sm font-medium text-white">March 1, 2025</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-2">
                <button
                  onClick={() => showSnackbar("Notice acknowledged", "success")}
                  className="w-full py-3.5 rounded-xl font-semibold text-sm text-white ripple-container flex items-center justify-center gap-2"
                  style={{
                    background: "#047857",
                    boxShadow: "0 4px 16px rgba(4,120,87,0.3)",
                  }}
                >
                  <Check className="w-4 h-4" /> Acknowledge
                </button>
                <button
                  onClick={() => {
                    closeSheet();
                    setTimeout(() => showSnackbar("Opening chat with landlord", "info"), 300);
                  }}
                  className="w-full py-3.5 rounded-xl text-sm font-semibold ripple-container flex items-center justify-center gap-2"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    color: "#e5e5e5",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <MessageSquare className="w-4 h-4" /> Reply to Landlord
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ============================================ */}
      {/* SHEET: REQUEST DOCUMENT */}
      {/* ============================================ */}
      <div
        className={`bs-overlay ${sheetOpen === "request" ? "active" : ""}`}
        onClick={closeSheet}
      />
      <div
        id="sheet-request"
        className={`bs ${sheetOpen === "request" ? "active" : ""}`}
        style={{ maxHeight: "80dvh" }}
      >
        <div className="bs-handle" />
        <div className="p-5 pb-8">
          <h3 className="text-lg font-bold text-white mb-1">Request Document</h3>
          <p className="text-sm mb-5" style={{ color: "#a3a3a3" }}>
            Ask your landlord for a document
          </p>
          <div className="space-y-4">
            <div>
              <label
                className="text-xs font-semibold mb-2 block"
                style={{ color: "#a3a3a3" }}
              >
                DOCUMENT TYPE
              </label>
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
              <label
                className="text-xs font-semibold mb-2 block"
                style={{ color: "#a3a3a3" }}
              >
                MESSAGE (optional)
              </label>
              <textarea
                className="android-input"
                rows={3}
                placeholder="Describe what you need..."
              />
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button
              onClick={closeSheet}
              className="flex-1 py-3.5 rounded-xl text-sm font-semibold ripple-container"
              style={{
                background: "rgba(255,255,255,0.05)",
                color: "#e5e5e5",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => {
                closeSheet();
                setTimeout(() => showSnackbar("Request sent to landlord", "success"), 300);
              }}
              className="flex-1 py-3.5 rounded-xl font-semibold text-sm text-white ripple-container"
              style={{
                background: "#047857",
                boxShadow: "0 4px 16px rgba(4,120,87,0.3)",
              }}
            >
              Send Request
            </button>
          </div>
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
        .doc-card {
          background: #1a1d21;
          border-radius: 16px;
          padding: 16px;
          border: 1px solid rgba(255,255,255,0.05);
          transition: all 0.15s ease;
          cursor: pointer;
        }
        .doc-card:active {
          transform: scale(0.97);
          background: #1e2125;
        }
        .notice-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px;
          padding: 16px;
          transition: all 0.15s ease;
          cursor: pointer;
        }
        .notice-card:active {
          transform: scale(0.97);
        }
      `}</style>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Send,
  MessageCircle,
  Clock,
  XCircle,
  ArrowLeft,
  MapPin,
  Phone,
  User,
} from "lucide-react";
import { useBrowse } from "../BrowseContext";
import { useAuth } from "../../AuthContext";
import { listenToTenantInquiries } from "../../../lib/browse";
import type { InquiryData } from "../../../lib/inquiries";
import { Timestamp } from "firebase/firestore";

const statusConfig: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  new: { label: "New", icon: Clock, color: "#eab308", bg: "rgba(234,179,8,0.12)" },
  progress: { label: "In Progress", icon: Clock, color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
  responded: { label: "Replied", icon: MessageCircle, color: "#047857", bg: "rgba(4,120,87,0.12)" },
  archived: { label: "Archived", icon: XCircle, color: "#525252", bg: "rgba(255,255,255,0.05)" },
};

type TabType = "all" | "new" | "responded" | "archived";

function formatDate(ts: Timestamp | null): string {
  if (!ts) return "";
  try { return ts.toDate().toLocaleDateString("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch { return ""; }
}

export default function InquiriesPage() {
  const { showSnackbar } = useBrowse();
  const { user } = useAuth();
  const router = useRouter();

  const [filterTab, setFilterTab] = useState<TabType>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [inquiries, setInquiries] = useState<InquiryData[]>([]);
  const [loading, setLoading] = useState(true);

  // ---- Firestore Listener ----
  useEffect(() => {
    const uid = user?.uid || "";
    if (!uid) { setLoading(false); return; }
    const unsub = listenToTenantInquiries(uid, (data) => {
      setInquiries(data);
      setLoading(false);
    }, (err) => {
      console.error("Inquiries listener error:", err);
      setLoading(false);
    });
    return () => unsub();
  }, [user?.uid]);

  // ---- Derived ----
  const filteredInquiries =
    filterTab === "all"
      ? inquiries
      : inquiries.filter((inq) => inq.status === filterTab);

  const counts = {
    all: inquiries.length,
    new: inquiries.filter((i) => i.status === "new").length,
    responded: inquiries.filter((i) => i.status === "responded" || i.status === "progress").length,
    archived: inquiries.filter((i) => i.status === "archived").length,
  };

  const tabs: { key: TabType; label: string; count: number }[] = [
    { key: "all", label: "All", count: counts.all },
    { key: "new", label: "New", count: counts.new },
    { key: "responded", label: "Replied", count: counts.responded },
    { key: "archived", label: "Archived", count: counts.archived },
  ];

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

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
        className="px-5 pt-4 pb-3 flex items-center gap-3"
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
          <h1 className="text-2xl font-bold text-white">My Inquiries</h1>
          <p className="text-xs mt-0.5" style={{ color: "#a3a3a3" }}>
            {loading ? "Loading..." : `${counts.new} awaiting reply`}
          </p>
        </div>
      </header>

      {/* ====== TABS ====== */}
      <div
        className="flex gap-0 px-5 border-b mb-4 overflow-x-auto browse-scroll-hidden"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`inquiry-tab ${filterTab === tab.key ? "active" : ""}`}
            onClick={() => setFilterTab(tab.key)}
          >
            {tab.label}
            <span className="tab-count">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* ====== INQUIRIES LIST ====== */}
      <div className="px-5 pb-24 space-y-3">
        {loading ? (
          <div className="text-center py-16">
            <div className="spinner mx-auto mb-4" />
            <p className="text-sm" style={{ color: "#525252" }}>Loading inquiries...</p>
          </div>
        ) : filteredInquiries.length === 0 ? (
          <div className="text-center py-16">
            <Send className="w-14 h-14 mx-auto mb-4" style={{ color: "#525252" }} />
            <h3 className="text-lg font-bold text-white mb-2">No Inquiries Yet</h3>
            <p className="text-sm" style={{ color: "#525252" }}>
              Send a message to a landlord to see it here.
            </p>
          </div>
        ) : (
          filteredInquiries.map((inq, i) => {
            const StatusIcon = statusConfig[inq.status]?.icon || MessageCircle;
            const isExpanded = expandedId === inq.id;
            const isNew = inq.status === "new";
            const isResponded = inq.status === "responded" || inq.status === "progress";

            return (
              <div
                key={inq.id}
                className={`inquiry-card ${isNew ? "unread" : ""}`}
                style={{
                  animation: `slideInUp ${0.4 + i * 0.1}s ease`,
                  cursor: "pointer",
                }}
                onClick={() => toggleExpand(inq.id)}
              >
                <div className="flex gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-white truncate">
                        {inq.propertyName || "Property"}
                      </h3>
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-full ml-2 flex-shrink-0 flex items-center gap-1"
                        style={{
                          background: statusConfig[inq.status]?.bg || "rgba(255,255,255,0.05)",
                          color: statusConfig[inq.status]?.color || "#a3a3a3",
                        }}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig[inq.status]?.label || inq.status}
                      </span>
                    </div>
                    <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: "#a3a3a3" }}>
                      <MapPin className="w-3 h-3" />
                      {inq.propertyName || "Property"}
                    </p>
                    <p className="text-xs mt-1" style={{ color: "#525252" }}>
                      {formatDate(inq.createdAt)}
                    </p>
                  </div>
                </div>

                {/* Message */}
                <div
                  className="mt-3 p-3 rounded-xl"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    borderLeft: "3px solid #047857",
                  }}
                >
                  <p className="text-xs font-semibold mb-1" style={{ color: "#047857" }}>
                    You
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: "#a3a3a3" }}>
                    {inq.message}
                  </p>
                </div>

                {/* Show message when responded */}
                {isResponded && (
                  <div
                    className="mt-2 p-3 rounded-xl"
                    style={{
                      background: "rgba(4,120,87,0.05)",
                      borderLeft: "3px solid #a3a3a3",
                    }}
                  >
                    <p className="text-xs font-semibold mb-1 flex items-center gap-1" style={{ color: "#a3a3a3" }}>
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold"
                        style={{
                          background: "linear-gradient(135deg, #047857, #059669)",
                          color: "white",
                        }}
                      >
                        LL
                      </div>
                      Landlord
                    </p>
                    <p className="text-xs leading-relaxed" style={{ color: "#e5e5e5" }}>
                      The landlord has responded to your inquiry. Check messages for their reply.
                    </p>
                  </div>
                )}

                {/* Actions */}
                {isResponded && (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push("/browse/messages");
                      }}
                      className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-white ripple-container flex items-center justify-center gap-1.5"
                      style={{ background: "#047857" }}
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      Open Chat
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import BottomNavAndMenu from "@/app/components/BottomNavAndMenu";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  ArrowLeft,
  LayoutDashboard,
  Building2,
  Menu,
  ChevronRight,
  X,
  Check,
  Info,
  CheckCircle,
  XCircle,
  SlidersHorizontal,
  MessageSquare,
  HomeIcon,
  Maximize2,
  Download,
  FileText,
  Smartphone,
  MessageCircle,
  Mail,
  CheckSquare,
  CalendarDays,
  Layers,
  Settings,
  DoorOpen,
} from "lucide-react";
import AuthGuard from "../components/AuthGuard";

type SnackbarType = "success" | "error" | "info";
type PaymentStatus = "pending" | "confirmed" | "rejected";

interface PaymentData {
  tenant: string;
  init: string;
  color: string;
  unit: string;
  amount: string;
  amountNum: number;
  expected: string;
  ref: string;
  phone: string;
  period: string;
  time: string;
  status: PaymentStatus;
  match: boolean;
  screenshot: string;
  receiptNo: string;
  receiptDate: string;
  rejectReason: string;
}

const initialPayments: PaymentData[] = [
  { tenant: "John Njoroge", init: "JN", color: "#3b82f6", unit: "Unit A2 · Kilimani Apt", amount: "KSh 35,000", amountNum: 35000, expected: "KSh 35,000", ref: "SHK4F7G2V", phone: "+254 712 345 678", period: "January 2025", time: "2 hours ago", status: "pending", match: true, screenshot: "mpesa-screenshot", receiptNo: "", receiptDate: "", rejectReason: "" },
  { tenant: "Sarah Wambui", init: "SW", color: "#a855f7", unit: "Unit B1 · Karen House", amount: "KSh 120,000", amountNum: 120000, expected: "KSh 120,000", ref: "QHK8M3P1R", phone: "+254 723 456 789", period: "January 2025", time: "5 hours ago", status: "pending", match: true, screenshot: "mpesa-receipt-2", receiptNo: "", receiptDate: "", rejectReason: "" },
  { tenant: "David Mutua", init: "DM", color: "#0891b2", unit: "Unit 3 · Rongai Bedsitter", amount: "KSh 8,500", amountNum: 8500, expected: "KSh 8,500", ref: "THK2N9W5X", phone: "+254 734 567 890", period: "January 2025", time: "1 day ago", status: "confirmed", match: true, screenshot: "mpesa-receipt-3", receiptNo: "RNT-2025-0040", receiptDate: "Jan 14, 2025", rejectReason: "" },
  { tenant: "Peter Ochieng", init: "PO", color: "#ef4444", unit: "Unit 1 · Ngong House", amount: "KSh 5,000", amountNum: 5000, expected: "KSh 5,000", ref: "UHK6J4D8Y", phone: "+254 745 678 901", period: "January 2025", time: "2 days ago", status: "rejected", match: false, screenshot: "mpesa-receipt-4", receiptNo: "", receiptDate: "", rejectReason: "Amount mismatch — expected KSh 5,000, received KSh 4,500" },
  { tenant: "Faith Kerubo", init: "FK", color: "#eab308", unit: "Unit 4 · Westlands Studio", amount: "KSh 22,000", amountNum: 22000, expected: "KSh 22,000", ref: "VHK9P2Q6W", phone: "+254 756 789 012", period: "January 2025", time: "3 hours ago", status: "pending", match: true, screenshot: "mpesa-receipt-5", receiptNo: "", receiptDate: "", rejectReason: "" },
];

const statusMeta: Record<PaymentStatus, { color: string; bg: string; borderBg: string }> = {
  pending: { color: "#eab308", bg: "rgba(234,179,8,0.08)", borderBg: "rgba(234,179,8,0.15)" },
  confirmed: { color: "#059669", bg: "rgba(4,120,87,0.08)", borderBg: "rgba(4,120,87,0.15)" },
  rejected: { color: "#ef4444", bg: "rgba(239,68,68,0.08)", borderBg: "rgba(239,68,68,0.15)" },
};

export default function RentVerificationPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("rent-verification");

  // ---- Filter ----
  const [activeFilter, setActiveFilter] = useState<string>("all");

  // ---- Sheet State ----
  const [activeSheet, setActiveSheet] = useState<string | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);

  // ---- Payments State ----
  const [payments, setPayments] = useState<PaymentData[]>(initialPayments);

  // ---- Bulk Mode ----
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedPayments, setSelectedPayments] = useState<Set<number>>(new Set());

  // ---- Inspect Date ----
  const [rejectReason, setRejectReason] = useState("");

  // ---- Loading ----
  const [loading, setLoading] = useState<string | null>(null);

  // ---- Snackbar ----
  const [snackbar, setSnackbar] = useState<{ show: boolean; message: string; type: SnackbarType }>({ show: false, message: "", type: "info" });
  const snackbarTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarAnimClass, setSnackbarAnimClass] = useState("");

  const statusCounts = {
    pending: payments.filter((p) => p.status === "pending").length,
    confirmed: payments.filter((p) => p.status === "confirmed").length,
    rejected: payments.filter((p) => p.status === "rejected").length,
  };

  const statusTotals = {
    pending: payments.filter((p) => p.status === "pending").reduce((s, p) => s + p.amountNum, 0),
    confirmed: payments.filter((p) => p.status === "confirmed").reduce((s, p) => s + p.amountNum, 0),
    rejected: payments.filter((p) => p.status === "rejected").reduce((s, p) => s + p.amountNum, 0),
  };

  const formatKSh = (n: number) => {
    if (n >= 1000000) return `KSh ${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `KSh ${Math.round(n / 1000)}K`;
    return `KSh ${n.toLocaleString()}`;
  };

  const filteredPayments = activeFilter === "all" ? payments : payments.filter((p) => p.status === activeFilter);

  const p = payments[currentIdx];

  // ---- Snackbar ----
  useEffect(() => {
    if (snackbar.show) {
      setSnackbarVisible(true);
      setSnackbarAnimClass("show");
    } else {
      setSnackbarAnimClass("hide");
      const t = setTimeout(() => { setSnackbarVisible(false); setSnackbarAnimClass(""); }, 300);
      return () => clearTimeout(t);
    }
  }, [snackbar.show]);

  const showSnackbar = (message: string, type: SnackbarType = "info") => {
    setSnackbar({ show: true, message, type });
    if (snackbarTimeoutRef.current) clearTimeout(snackbarTimeoutRef.current);
    snackbarTimeoutRef.current = setTimeout(() => setSnackbar({ show: false, message: "", type: "info" }), 4000);
  };

  const hideSnackbar = () => setSnackbar({ show: false, message: "", type: "info" });

  const openSheet = (name: string) => setActiveSheet(name);
  const closeSheet = () => setActiveSheet(null);

  const openPaymentDetail = (idx: number) => { setCurrentIdx(idx); openSheet("detail"); };
  const openApproveSheet = (idx: number) => { setCurrentIdx(idx); openSheet("approve"); };
  const openRejectSheet = (idx: number) => { setCurrentIdx(idx); setRejectReason(""); openSheet("reject"); };
  const openReceipt = (idx: number) => { setCurrentIdx(idx); openSheet("receipt"); };
  const openScreenshot = () => openSheet("screenshot");
  const closeScreenshot = () => closeSheet();
  const openFilterSheet = () => openSheet("filter");
  const closeFilterSheet = () => closeSheet();

  // ---- Bulk Mode ----
  const openBulkMode = () => {
    setBulkMode(true);
    setSelectedPayments(new Set());

  };
  const closeBulkMode = () => {
    setBulkMode(false);
    setSelectedPayments(new Set());
    closeSheet();
  };

  const togglePaymentSelect = (idx: number) => {
    setSelectedPayments((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const bulkApprove = () => {
    setPayments((prev) =>
      prev.map((p, i) =>
        selectedPayments.has(i)
          ? { ...p, status: "confirmed" as PaymentStatus, receiptNo: `RNT-2025-${String(42 + i).padStart(4, "0")}`, receiptDate: "Jan 15, 2025" }
          : p
      )
    );
    closeBulkMode();
    setTimeout(() => showSnackbar(`✅ ${selectedPayments.size} payments approved & receipts generated`, "success"), 300);
  };

  // ---- Confirm Approve ----
  const confirmApprove = () => {
    setLoading("approve");
    setTimeout(() => {
      setLoading(null);
      setPayments((prev) =>
        prev.map((p, i) =>
          i === currentIdx
            ? { ...p, status: "confirmed" as PaymentStatus, receiptNo: `RNT-2025-${String(42 + i).padStart(4, "0")}`, receiptDate: "Jan 15, 2025" }
            : p
        )
      );
      closeSheet();
      setTimeout(() => showSnackbar(`✅ Payment confirmed — Receipt ${payments[currentIdx]?.receiptNo || "RNT-2025-0042"} generated & sent`, "success"), 300);
    }, 2000);
  };

  // ---- Confirm Reject ----
  const confirmReject = () => {
    if (!rejectReason) { showSnackbar("Please select a reason", "error"); return; }
    setPayments((prev) =>
      prev.map((p, i) => (i === currentIdx ? { ...p, status: "rejected" as PaymentStatus, rejectReason } : p))
    );
    closeSheet();
    setTimeout(() => showSnackbar(`❌ Payment rejected: ${rejectReason}`, "error"), 300);
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

  const snackbarIcon = () => {
    switch (snackbar.type) {
      case "success": return <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(4,120,87,0.2)" }}><Check className="w-3.5 h-3.5" style={{ color: "#059669" }} /></div>;
      case "error": return <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(239,68,68,0.2)" }}><X className="w-3.5 h-3.5" style={{ color: "#ef4444" }} /></div>;
      case "info": return <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(59,130,246,0.2)" }}><Info className="w-3.5 h-3.5" style={{ color: "#3b82f6" }} /></div>;
    }
  };

  return (
    <AuthGuard>
      <div style={{ background: "#050505", color: "#e5e5e5", fontFamily: "'Inter', sans-serif", minHeight: "100dvh" }}>
        <div className="app-shell">
          <div className="status-bar" />

          {/* ====== HEADER ====== */}
          <div className="app-header">
            <div className="flex items-center justify-between px-5 pt-3 pb-1">
              <div className="flex items-center gap-3">
                <button onClick={() => router.back()} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <ArrowLeft className="w-5 h-5" style={{ color: "#a3a3a3" }} />
                </button>
                <div>
                  <h1 className="text-lg font-bold text-white">Rent Verification</h1>
                  <p className="text-xs" style={{ color: "#a3a3a3" }}>Review & confirm payments</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={openBulkMode} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <CheckSquare className="w-5 h-5" style={{ color: "#a3a3a3" }} />
                </button>
                <button onClick={openFilterSheet} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <SlidersHorizontal className="w-5 h-5" style={{ color: "#a3a3a3" }} />
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 px-5 py-1">
              {[
                { key: "pending", count: statusCounts.pending, total: statusTotals.pending, color: "#eab308" },
                { key: "confirmed", count: statusCounts.confirmed, total: statusTotals.confirmed, color: "#059669" },
                { key: "rejected", count: statusCounts.rejected, total: statusTotals.rejected, color: "#ef4444" },
              ].map((s) => (
                <div
                  key={s.key}
                  className="p-2.5 rounded-xl cursor-pointer"
                  style={{ background: `${s.color}0a`, border: `1px solid ${s.color}22` }}
                  onClick={() => setActiveFilter(s.key)}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                    <span className="text-xs font-semibold" style={{ color: s.color }}>{s.key.charAt(0).toUpperCase() + s.key.slice(1)}</span>
                  </div>
                  <p className="text-xl font-bold text-white">{s.count}</p>
                  <p className="text-xs" style={{ color: "#525252" }}>{formatKSh(s.total)}</p>
                </div>
              ))}
            </div>

            {/* Filter Chips */}
            <div className="flex gap-2 px-5 py-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
              {[
                { key: "all", label: "All" },
                { key: "pending", label: "Pending Review" },
                { key: "confirmed", label: "Confirmed" },
                { key: "rejected", label: "Rejected" },
              ].map((f) => (
                <button
                  key={f.key}
                  className={`filter-chip ${activeFilter === f.key ? "active" : ""}`}
                  onClick={() => setActiveFilter(f.key)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* ====== BULK MODE BAR ====== */}
          {bulkMode && (
            <div
              className="sticky z-30 flex items-center justify-between px-5 py-3"
              style={{ background: "rgba(4,120,87,0.1)", borderBottom: "1px solid rgba(4,120,87,0.2)", marginTop: "-1px" }}
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold" style={{ color: "#059669" }}>{selectedPayments.size} selected</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={bulkApprove}
                  disabled={selectedPayments.size === 0}
                  className="text-xs font-semibold px-4 py-2 rounded-lg"
                  style={{
                    background: selectedPayments.size > 0 ? "rgba(4,120,87,0.2)" : "rgba(255,255,255,0.03)",
                    color: selectedPayments.size > 0 ? "#059669" : "#525252",
                  }}
                >
                  Approve All
                </button>
                <button onClick={closeBulkMode} className="text-xs font-medium px-3 py-2 rounded-lg" style={{ color: "#a3a3a3" }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* ====== CONTENT ====== */}
          <div className="app-content">
            <div className="px-5 pb-28 space-y-3 pt-2">
              {filteredPayments.map((item, idx) => {
                const realIdx = payments.indexOf(item);
                const sm = statusMeta[item.status];
                const borderColor = sm.color;
                return (
                  <div
                    key={idx}
                    className="card animate-in"
                    style={{
                      padding: "14px",
                      borderLeft: `4px solid ${borderColor}`,
                      animationDelay: `${idx * 0.05}s`,
                      cursor: "pointer",
                    }}
                    onClick={() => openPaymentDetail(realIdx)}
                  >
                    <div className="flex items-start gap-3">
                      {bulkMode && (
                        <div
                          className={`w-5 h-5 rounded flex-shrink-0 mt-1 flex items-center justify-center cursor-pointer ${selectedPayments.has(realIdx) ? "" : ""}`}
                          style={{
                            border: `2px solid ${selectedPayments.has(realIdx) ? "#047857" : "rgba(255,255,255,0.2)"}`,
                            background: selectedPayments.has(realIdx) ? "#047857" : "transparent",
                          }}
                          onClick={(e) => { e.stopPropagation(); togglePaymentSelect(realIdx); }}
                        >
                          {selectedPayments.has(realIdx) && <Check className="w-3 h-3 text-white" />}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                              style={{ background: `linear-gradient(135deg,${item.color},${item.color}cc)` }}
                            >
                              {item.init}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-white">{item.tenant}</p>
                              <p className="text-xs" style={{ color: "#525252" }}>{item.unit}</p>
                            </div>
                          </div>
                          <p className="text-sm font-bold" style={{ color: sm.color }}>{item.amount}</p>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <div className="flex items-center gap-2">
                            <span className="chip text-[10px] font-bold" style={{ background: "rgba(79,180,79,0.15)", color: "#4fb34f", padding: "2px 6px" }}>
                              M-Pesa
                            </span>
                            <span className="text-xs font-mono" style={{ color: "#525252" }}>{item.ref}</span>
                          </div>
                          <span className="chip" style={{ background: sm.bg, color: sm.color, fontSize: "10px", padding: "3px 8px" }}>
                            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                          </span>
                        </div>
                        {item.status === "pending" && (
                          <div className="flex gap-2 mt-3 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                            <button
                              onClick={(e) => { e.stopPropagation(); openApproveSheet(realIdx); }}
                              className="flex-1 text-center text-xs font-semibold py-2 rounded-lg"
                              style={{ background: "rgba(4,120,87,0.15)", color: "#059669" }}
                            >
                              Approve
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); openRejectSheet(realIdx); }}
                              className="flex-1 text-center text-xs font-semibold py-2 rounded-lg"
                              style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}
                            >
                              Reject
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); openPaymentDetail(realIdx); }}
                              className="text-xs font-medium py-2 px-3 rounded-lg"
                              style={{ background: "rgba(255,255,255,0.05)", color: "#a3a3a3" }}
                            >
                              View
                            </button>
                          </div>
                        )}
                        {item.status === "confirmed" && (
                          <div className="flex gap-2 mt-3 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                            <button
                              onClick={(e) => { e.stopPropagation(); openReceipt(realIdx); }}
                              className="flex-1 text-center text-xs font-semibold py-2 rounded-lg"
                              style={{ background: "rgba(4,120,87,0.15)", color: "#059669" }}
                            >
                              View Receipt
                            </button>
                          </div>
                        )}
                        {item.status === "rejected" && item.rejectReason && (
                          <div className="mt-2 p-2 rounded-lg" style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.08)" }}>
                            <p className="text-xs" style={{ color: "#a3a3a3" }}>
                              Reason: <span style={{ color: "#ef4444" }}>{item.rejectReason}</span>
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        <BottomNavAndMenu />
      </div>

        {/* ============================================ */}
        {/* SHEET: PAYMENT DETAIL */}
        {/* ============================================ */}
        <div className={`sheet-overlay ${activeSheet === "detail" ? "active" : ""}`} onClick={closeSheet} />
        <div className={`bottom-sheet ${activeSheet === "detail" ? "active" : ""}`} style={{ maxHeight: "95dvh" }}>
          <div className="bottom-sheet-handle" />
          <div className="p-5 pb-8">
            {p && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white">Payment Details</h3>
                  <span className="chip" style={{ background: statusMeta[p.status].bg, color: statusMeta[p.status].color }}>
                    {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                  </span>
                </div>

                {/* Amount */}
                <div className="text-center mb-4 p-4 rounded-2xl" style={{ background: statusMeta[p.status].bg, border: `1px solid ${statusMeta[p.status].borderBg}` }}>
                  <p className="text-xs" style={{ color: statusMeta[p.status].color }}>Amount</p>
                  <p className="text-3xl font-bold text-white mt-1">{p.amount}</p>
                  <span className="chip mt-2 inline-flex text-[10px] font-bold" style={{ background: "rgba(79,180,79,0.15)", color: "#4fb34f" }}>M-Pesa</span>
                </div>

                {/* Payment Proof */}
                <div className="mb-4">
                  <p className="text-xs font-semibold mb-2" style={{ color: "#a3a3a3" }}>PAYMENT PROOF</p>
                  <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
                    <img
                      src={`https://picsum.photos/seed/${p.screenshot}/400/200.jpg`}
                      className="w-full h-44 object-cover cursor-pointer"
                      onClick={openScreenshot}
                      alt=""
                    />
                    <div className="flex items-center justify-between p-3" style={{ background: "rgba(255,255,255,0.02)" }}>
                      <span className="text-xs" style={{ color: "#525252" }}>M-Pesa confirmation screenshot</span>
                      <button onClick={openScreenshot} className="text-xs font-medium flex items-center gap-1" style={{ color: "#3b82f6" }}>
                        <Maximize2 className="w-3 h-3" /> Full
                      </button>
                    </div>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="space-y-0 mb-4">
                  {[
                    { label: "Tenant", value: p.tenant },
                    { label: "Unit", value: p.unit },
                    { label: "M-Pesa Ref", value: p.ref, mono: true },
                    { label: "Phone", value: p.phone },
                    { label: "Period", value: p.period },
                    { label: "Submitted", value: p.time },
                    { label: "Expected Rent", value: p.expected },
                  ].map((row, i) => (
                    <div
                      key={i}
                      className="flex justify-between py-2.5"
                      style={i < 6 ? { borderBottom: "1px solid rgba(255,255,255,0.04)" } : {}}
                    >
                      <span className="text-sm" style={{ color: "#525252" }}>{row.label}</span>
                      <span className={`text-sm font-medium text-white ${row.mono ? "font-mono" : ""}`}>{row.value}</span>
                    </div>
                  ))}
                </div>

                {/* Amount Match Check */}
                <div
                  className="flex items-center gap-3 p-3 rounded-xl mb-4"
                  style={{
                    background: p.match ? "rgba(4,120,87,0.08)" : "rgba(239,68,68,0.08)",
                    border: `1px solid ${p.match ? "rgba(4,120,87,0.15)" : "rgba(239,68,68,0.15)"}`,
                    display: p.status === "rejected" ? "none" : "flex",
                  }}
                >
                  {p.match ? (
                    <>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(4,120,87,0.2)" }}>
                        <Check className="w-4 h-4" style={{ color: "#059669" }} />
                      </div>
                      <p className="text-sm font-medium" style={{ color: "#059669" }}>Amount matches expected rent</p>
                    </>
                  ) : (
                    <>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(239,68,68,0.2)" }}>
                        <X className="w-4 h-4" style={{ color: "#ef4444" }} />
                      </div>
                      <p className="text-sm font-medium" style={{ color: "#ef4444" }}>Amount mismatch — verify carefully</p>
                    </>
                  )}
                </div>

                {/* Actions */}
                {p.status === "pending" && (
                  <div className="space-y-2">
                    <button
                      onClick={() => { closeSheet(); openApproveSheet(currentIdx); }}
                      className="w-full py-3 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2"
                      style={{ background: "linear-gradient(to right,#047857,#059669)", boxShadow: "0 4px 15px rgba(4,120,87,0.3)" }}
                    >
                      <CheckCircle className="w-4 h-4" /> Approve & Generate Receipt
                    </button>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { closeSheet(); openRejectSheet(currentIdx); }}
                        className="flex-1 py-3 rounded-xl font-semibold text-sm text-white"
                        style={{ background: "linear-gradient(to right,#dc2626,#ef4444)", boxShadow: "0 4px 15px rgba(220,38,38,0.3)" }}
                      >
                        Reject
                      </button>
                      <button onClick={() => showSnackbar("Tenant messaged", "info")} className="btn-ghost flex-1 text-center" style={{ padding: "12px" }}>
                        Message Tenant
                      </button>
                    </div>
                  </div>
                )}
                {p.status === "confirmed" && (
                  <button
                    onClick={() => { closeSheet(); openReceipt(currentIdx); }}
                    className="w-full py-3 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2"
                    style={{ background: "linear-gradient(to right,#047857,#059669)", boxShadow: "0 4px 15px rgba(4,120,87,0.3)" }}
                  >
                    <FileText className="w-4 h-4" /> View Receipt
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* ============================================ */}
        {/* SHEET: APPROVE PAYMENT */}
        {/* ============================================ */}
        <div className={`sheet-overlay ${activeSheet === "approve" ? "active" : ""}`} onClick={closeSheet} />
        <div className={`bottom-sheet ${activeSheet === "approve" ? "active" : ""}`}>
          <div className="bottom-sheet-handle" />
          <div className="p-5 pb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(4,120,87,0.15)" }}>
                <CheckCircle className="w-5 h-5" style={{ color: "#059669" }} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Approve Payment</h3>
                <p className="text-xs" style={{ color: "#a3a3a3" }}>{p?.tenant} — {p?.amount}</p>
              </div>
            </div>

            <div className="p-3 rounded-xl mb-4" style={{ background: "rgba(4,120,87,0.08)", border: "1px solid rgba(4,120,87,0.15)" }}>
              <p className="text-xs" style={{ color: "#059669" }}>✅ A receipt will be auto-generated and sent to the tenant</p>
            </div>

            <div className="space-y-4 mb-5">
              <div>
                <label className="text-xs font-semibold mb-2 block" style={{ color: "#a3a3a3" }}>PAYMENT FOR</label>
                <div className="flex gap-2">
                  {["January 2025", "February 2025"].map((period) => (
                    <button
                      key={period}
                      className="text-xs font-medium px-4 py-2.5 rounded-xl transition-all"
                      style={{
                        background: period === "January 2025" ? "rgba(4,120,87,0.15)" : "rgba(255,255,255,0.03)",
                        border: `1.5px solid ${period === "January 2025" ? "rgba(4,120,87,0.3)" : "rgba(255,255,255,0.08)"}`,
                        color: period === "January 2025" ? "#059669" : "#a3a3a3",
                      }}
                    >
                      {period}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold mb-2 block" style={{ color: "#a3a3a3" }}>INTERNAL NOTE (optional)</label>
                <textarea className="android-input" rows={2} placeholder="e.g. Late payment, waived late fee…" />
              </div>
            </div>

            <div className="space-y-3 mb-5">
              {[
                { label: "Send receipt via SMS", defaultOn: true },
                { label: "Send receipt via email", defaultOn: true },
                { label: "Mark unit as paid", defaultOn: true },
              ].map((tog, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm text-white">{tog.label}</span>
                  <div className={`toggle-track ${tog.defaultOn ? "active" : ""}`} onClick={(e) => e.currentTarget.classList.toggle("active")}>
                    <div className="toggle-thumb" />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={closeSheet} className="btn-ghost flex-1 text-center" style={{ padding: "12px" }}>Cancel</button>
              <button
                onClick={confirmApprove}
                className="flex-1 py-3 rounded-xl font-semibold text-sm text-white"
                style={{ background: "linear-gradient(to right,#047857,#059669)", boxShadow: "0 4px 15px rgba(4,120,87,0.3)" }}
                disabled={loading === "approve"}
              >
                {loading === "approve" ? <div className="spinner mx-auto" /> : <span>Approve</span>}
              </button>
            </div>
          </div>
        </div>

        {/* ============================================ */}
        {/* SHEET: REJECT PAYMENT */}
        {/* ============================================ */}
        <div className={`sheet-overlay ${activeSheet === "reject" ? "active" : ""}`} onClick={closeSheet} />
        <div className={`bottom-sheet ${activeSheet === "reject" ? "active" : ""}`}>
          <div className="bottom-sheet-handle" />
          <div className="p-5 pb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(239,68,68,0.15)" }}>
                <XCircle className="w-5 h-5" style={{ color: "#ef4444" }} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Reject Payment</h3>
                <p className="text-xs" style={{ color: "#a3a3a3" }}>{p?.tenant} — {p?.amount}</p>
              </div>
            </div>

            <div className="p-3 rounded-xl mb-4" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}>
              <p className="text-xs" style={{ color: "#ef4444" }}>⚠ The tenant will be notified and asked to resubmit.</p>
            </div>

            <div className="mb-4">
              <label className="text-xs font-semibold mb-2 block" style={{ color: "#a3a3a3" }}>REASON</label>
              <div className="flex flex-wrap gap-2">
                {["Amount mismatch", "Duplicate payment", "Unclear screenshot", "Payment not received", "Wrong period"].map((reason) => (
                  <button
                    key={reason}
                    onClick={() => setRejectReason(reason)}
                    className="text-xs font-medium px-3.5 py-2 rounded-full transition-all"
                    style={{
                      background: rejectReason === reason ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.05)",
                      border: `1px solid ${rejectReason === reason ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.1)"}`,
                      color: rejectReason === reason ? "#ef4444" : "#a3a3a3",
                    }}
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>

            <textarea className="android-input" rows={2} placeholder="Additional details for tenant…" />

            <div className="flex items-center gap-3 mt-3 mb-5">
              <div className="toggle-track active" onClick={(e) => e.currentTarget.classList.toggle("active")}>
                <div className="toggle-thumb" />
              </div>
              <span className="text-sm" style={{ color: "#a3a3a3" }}>Notify tenant via SMS & email</span>
            </div>

            <div className="flex gap-3">
              <button onClick={closeSheet} className="btn-ghost flex-1 text-center" style={{ padding: "12px" }}>Cancel</button>
              <button
                onClick={confirmReject}
                className="flex-1 py-3 rounded-xl font-semibold text-sm text-white"
                style={{ background: "linear-gradient(to right,#dc2626,#ef4444)", boxShadow: "0 4px 15px rgba(220,38,38,0.3)" }}
                disabled={!rejectReason}
              >
                Reject Payment
              </button>
            </div>
          </div>
        </div>

        {/* ============================================ */}
        {/* SHEET: RECEIPT */}
        {/* ============================================ */}
        <div className={`sheet-overlay ${activeSheet === "receipt" ? "active" : ""}`} onClick={closeSheet} />
        <div className={`bottom-sheet ${activeSheet === "receipt" ? "active" : ""}`} style={{ maxHeight: "95dvh" }}>
          <div className="bottom-sheet-handle" />
          <div className="p-5 pb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Receipt</h3>
              <span className="chip" style={{ background: "rgba(4,120,87,0.15)", color: "#059669" }}>Confirmed</span>
            </div>

            <div className="p-5 rounded-xl mb-5" style={{ border: "1px dashed rgba(255,255,255,0.1)" }}>
              <div className="text-center mb-4 pb-4" style={{ borderBottom: "1px dashed rgba(255,255,255,0.1)" }}>
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-2" style={{ background: "linear-gradient(135deg,#047857,#059669)" }}>
                  <HomeIcon className="w-6 h-6 text-white" />
                </div>
                <p className="text-base font-bold text-white">RentKe Receipt</p>
                <p className="text-xs" style={{ color: "#525252" }}>Official Payment Confirmation</p>
              </div>
              <div className="space-y-2.5">
                {[
                  { label: "Receipt No", value: p?.receiptNo || "RNT-2025-0042", mono: true },
                  { label: "Date", value: p?.receiptDate || "Jan 15, 2025" },
                  { label: "Tenant", value: p?.tenant || "" },
                  { label: "Property", value: p?.unit || "" },
                  { label: "Period", value: p?.period || "" },
                  { label: "M-Pesa Ref", value: p?.ref || "", mono: true },
                ].map((row, i) => (
                  <div key={i} className="flex justify-between">
                    <span className="text-xs" style={{ color: "#525252" }}>{row.label}</span>
                    <span className={`text-xs font-medium text-white ${row.mono ? "font-mono" : ""}`}>{row.value}</span>
                  </div>
                ))}
                <div className="pt-3 mt-2" style={{ borderTop: "1px dashed rgba(255,255,255,0.1)" }}>
                  <div className="flex justify-between">
                    <span className="text-sm font-semibold" style={{ color: "#a3a3a3" }}>Amount Paid</span>
                    <span className="text-lg font-bold" style={{ color: "#059669" }}>{p?.amount || ""}</span>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs" style={{ color: "#525252" }}>Landlord</span>
                  <span className="text-xs font-medium text-white">James Mwangi</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <button onClick={() => showSnackbar("Receipt downloaded as PDF", "success")} className="w-full py-3 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2" style={{ background: "linear-gradient(to right,#047857,#059669)", boxShadow: "0 4px 15px rgba(4,120,87,0.3)" }}>
                <Download className="w-4 h-4" /> Download PDF
              </button>
              <div className="flex gap-2">
                <button onClick={() => showSnackbar("Receipt sent via SMS", "success")} className="btn-ghost flex-1 text-center flex items-center justify-center gap-1.5" style={{ padding: "12px" }}>
                  <Smartphone className="w-4 h-4" /> SMS
                </button>
                <button onClick={() => showSnackbar("Receipt sent via WhatsApp", "success")} className="btn-ghost flex-1 text-center flex items-center justify-center gap-1.5" style={{ padding: "12px" }}>
                  <MessageCircle className="w-4 h-4" /> WhatsApp
                </button>
                <button onClick={() => showSnackbar("Receipt sent via Email", "success")} className="btn-ghost flex-1 text-center flex items-center justify-center gap-1.5" style={{ padding: "12px" }}>
                  <Mail className="w-4 h-4" /> Email
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================ */}
        {/* SHEET: SCREENSHOT VIEWER */}
        {/* ============================================ */}
        <div className={`sheet-overlay ${activeSheet === "screenshot" ? "active" : ""}`} onClick={closeScreenshot} style={activeSheet === "screenshot" ? { background: "rgba(0,0,0,0.9)" } : {}} />
        <div className={`bottom-sheet ${activeSheet === "screenshot" ? "active" : ""}`} style={{ background: "#000", borderRadius: "0", maxHeight: "100dvh" }}>
          <div className="flex items-center justify-between p-4">
            <button onClick={closeScreenshot} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.1)" }}>
              <X className="w-5 h-5 text-white" />
            </button>
            <span className="text-sm font-medium text-white">M-Pesa Proof</span>
            <button onClick={() => showSnackbar("Screenshot saved to gallery", "success")} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.1)" }}>
              <Download className="w-5 h-5 text-white" />
            </button>
          </div>
          <div className="flex items-center justify-center px-4" style={{ minHeight: "60dvh" }}>
            <img
              src={`https://picsum.photos/seed/${p?.screenshot || "mpesa-screenshot"}/600/800.jpg`}
              className="w-full max-w-sm rounded-2xl object-contain"
              style={{ maxHeight: "65dvh" }}
              alt=""
            />
          </div>
        </div>

        {/* ============================================ */}
        {/* SHEET: FILTER */}
        {/* ============================================ */}
        <div className={`sheet-overlay ${activeSheet === "filter" ? "active" : ""}`} onClick={closeFilterSheet} />
        <div className={`bottom-sheet ${activeSheet === "filter" ? "active" : ""}`}>
          <div className="bottom-sheet-handle" />
          <div className="p-5 pb-8">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-white">Filters</h3>
              <button onClick={() => { setActiveFilter("all"); closeSheet(); showSnackbar("Filters reset", "info"); }} className="text-xs font-medium" style={{ color: "#059669" }}>Reset</button>
            </div>
            <div className="mb-5">
              <label className="text-xs font-semibold mb-2 block" style={{ color: "#a3a3a3" }}>PROPERTY</label>
              <select className="android-input" style={{ appearance: "none" }}>
                <option>All Properties</option>
                <option>2BR Apartment — Kilimani</option>
                <option>4BR House — Karen</option>
                <option>Bedsitter — Rongai</option>
                <option>Studio — Westlands</option>
              </select>
            </div>
            <div className="mb-5">
              <label className="text-xs font-semibold mb-2 block" style={{ color: "#a3a3a3" }}>DATE RANGE</label>
              <div className="flex gap-2">
                <input type="date" className="android-input flex-1" defaultValue="2025-01-01" />
                <input type="date" className="android-input flex-1" defaultValue="2025-01-31" />
              </div>
            </div>
            <div className="mb-5">
              <label className="text-xs font-semibold mb-2 block" style={{ color: "#a3a3a3" }}>MIN AMOUNT</label>
              <input type="number" className="android-input" placeholder="e.g. 5000" />
            </div>
            <button onClick={() => { closeSheet(); showSnackbar("Filters applied", "success"); }} className="btn-primary w-full text-center" style={{ padding: "14px" }}>
              Apply
            </button>
          </div>
        </div>

        {/* ============================================ */}
        {/* MORE MENU SHEET */}
        {/* ============================================ */}


        {/* SNACKBAR */}
        {snackbarVisible && (
          <div className={`snackbar ${snackbarAnimClass}`}>
            <div className="flex items-center gap-3">
              <div>{snackbarIcon()}</div>
              <div className="flex-1"><p className="text-sm font-medium text-white">{snackbar.message}</p></div>
              <button onClick={hideSnackbar} className="p-1"><X className="w-4 h-4" style={{ color: "#525252" }} /></button>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}

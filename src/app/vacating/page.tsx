"use client";

import { useState, useEffect, useRef } from "react";
import BottomNavAndMenu from "@/app/components/BottomNavAndMenu";
import { useRouter } from "next/navigation";
import {
  DoorOpen,
  ArrowLeft,
  LayoutDashboard,
  Building2,
  Menu,
  ChevronRight,
  X,
  Check,
  Info,
  AlertTriangle,
  MessageSquare,
  CalendarPlus,
  ClipboardCheck,
  Wallet,
  Send,
  SlidersHorizontal,
  CalendarDays,
  MessageCircle,
  Layers,
  Settings,
  Smartphone,
} from "lucide-react";
import AuthGuard from "../components/AuthGuard";

type SnackbarType = "success" | "error" | "info";
type VacateStatus = "notice" | "inspection" | "refund" | "completed" | "cancelled";

interface Deduction {
  desc: string;
  detail: string;
  amount: number;
}

interface VacateData {
  tenant: string;
  init: string;
  color: string;
  unit: string;
  moveDate: string;
  deposit: number;
  rent: number;
  status: VacateStatus;
  reason: string;
  phone: string;
  noticePeriod: string;
  noticeDate: string;
  inspectionDate: string | null;
  refundAmount: number | null;
  deductions: Deduction[];
}

const initialVacates: VacateData[] = [
  { tenant: "John Njoroge", init: "JN", color: "#3b82f6", unit: "Unit A2 · Kilimani Apt", moveDate: "Jan 18, 2025", deposit: 35000, rent: 35000, status: "notice", reason: "Relocating to a different city for work. The new office is in Mombasa.", phone: "+254 712 345 678", noticePeriod: "30 days", noticeDate: "Dec 19, 2024", inspectionDate: null, refundAmount: null, deductions: [] },
  { tenant: "Faith Kerubo", init: "FK", color: "#eab308", unit: "Unit 4 · Westlands Studio", moveDate: "Feb 1, 2025", deposit: 22000, rent: 22000, status: "notice", reason: "Found a cheaper place closer to work.", phone: "+254 756 789 012", noticePeriod: "30 days", noticeDate: "Jan 2, 2025", inspectionDate: null, refundAmount: null, deductions: [] },
  { tenant: "Sarah Wambui", init: "SW", color: "#a855f7", unit: "Unit B1 · Karen House", moveDate: "Jan 25, 2025", deposit: 120000, rent: 120000, status: "inspection", reason: "Building own house — moving in.", phone: "+254 723 456 789", noticePeriod: "30 days", noticeDate: "Dec 26, 2024", inspectionDate: "Jan 20, 10:00 AM", refundAmount: null, deductions: [{ desc: "Paint touch-up", detail: "Walls marked & dirty", amount: 1500 }, { desc: "Unpaid water bill", detail: "December balance", amount: 500 }] },
  { tenant: "David Mutua", init: "DM", color: "#0891b2", unit: "Unit 3 · Rongai Bedsitter", moveDate: "Jan 10, 2025", deposit: 8500, rent: 8500, status: "refund", reason: "Couldn't afford rent increase.", phone: "+254 734 567 890", noticePeriod: "30 days", noticeDate: "Dec 11, 2024", inspectionDate: "Jan 8, 2:00 PM", refundAmount: 6500, deductions: [{ desc: "Paint touch-up", detail: "Walls marked", amount: 1500 }, { desc: "Unpaid water bill", detail: "December balance", amount: 500 }] },
  { tenant: "Alice Njeri", init: "AN", color: "#6b7280", unit: "Unit 2 · Kilimani Apt", moveDate: "Dec 31, 2024", deposit: 35000, rent: 35000, status: "completed", reason: "Got married and moving to husband's place.", phone: "+254 778 123 456", noticePeriod: "30 days", noticeDate: "Dec 1, 2024", inspectionDate: "Dec 28, 11:00 AM", refundAmount: 35000, deductions: [] },
];

const statusMeta: Record<VacateStatus, { color: string; bg: string; label: string; chipBg: string; chipColor: string }> = {
  notice: { color: "#eab308", bg: "rgba(234,179,8,0.08)", label: "Notice", chipBg: "rgba(234,179,8,0.15)", chipColor: "#eab308" },
  inspection: { color: "#a855f7", bg: "rgba(168,85,247,0.08)", label: "Inspection", chipBg: "rgba(168,85,247,0.15)", chipColor: "#a855f7" },
  refund: { color: "#3b82f6", bg: "rgba(59,130,246,0.08)", label: "Refund", chipBg: "rgba(59,130,246,0.15)", chipColor: "#3b82f6" },
  completed: { color: "#059669", bg: "rgba(4,120,87,0.08)", label: "Completed", chipBg: "rgba(4,120,87,0.15)", chipColor: "#059669" },
  cancelled: { color: "#9ca3af", bg: "rgba(107,114,128,0.08)", label: "Cancelled", chipBg: "rgba(107,114,128,0.15)", chipColor: "#9ca3af" },
};

export default function VacatingPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("vacating");

  // ---- Filter ----
  const [activeFilter, setActiveFilter] = useState<string>("all");

  // ---- Sheet State ----
  const [activeSheet, setActiveSheet] = useState<string | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);

  // ---- Inspection Form ----
  const [inspectDate, setInspectDate] = useState("2025-01-17");
  const [inspectTime, setInspectTime] = useState("10:00");
  const [inspector, setInspector] = useState("self");

  // ---- Deduction Form ----
  const [deductionCat, setDeductionCat] = useState("");
  const [deductionDesc, setDeductionDesc] = useState("");
  const [deductionAmount, setDeductionAmount] = useState("");

  // ---- Refund Method ----
  const [refundMethod, setRefundMethod] = useState("mpesa");

  // ---- Loading states ----
  const [loading, setLoading] = useState<string | null>(null);

  // ---- Vacates State ----
  const [vacates, setVacates] = useState<VacateData[]>(initialVacates);

  // ---- Snackbar ----
  const [snackbar, setSnackbar] = useState<{ show: boolean; message: string; type: SnackbarType }>({ show: false, message: "", type: "info" });
  const snackbarTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarAnimClass, setSnackbarAnimClass] = useState("");

  const statusCounts = {
    notice: vacates.filter((v) => v.status === "notice").length,
    inspection: vacates.filter((v) => v.status === "inspection").length,
    refund: vacates.filter((v) => v.status === "refund").length,
    completed: vacates.filter((v) => v.status === "completed").length,
  };

  const filteredVacates = activeFilter === "all" ? vacates : vacates.filter((v) => v.status === activeFilter);

  const v = vacates[currentIdx];

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

  const openVacateDetail = (idx: number) => { setCurrentIdx(idx); openSheet("detail"); };
  const openScheduleInspection = (idx: number) => { setCurrentIdx(idx); setInspector("self"); openSheet("inspect"); };
  const openProcessRefund = (idx: number) => { setCurrentIdx(idx); setRefundMethod("mpesa"); openSheet("refund"); };
  const openAddDeduction = () => { setDeductionCat(""); setDeductionDesc(""); setDeductionAmount(""); openSheet("deduction"); };
  const openConfirmRefund = (idx: number) => { setCurrentIdx(idx); openSheet("confirm"); };

  const confirmInspection = () => {
    setLoading("inspect");
    const newDate = new Date(inspectDate + "T" + inspectTime).toLocaleDateString("en-US", { month: "short", day: "numeric" }) + ", " + inspectTime;
    setTimeout(() => {
      setLoading(null);
      setVacates(prev => prev.map((item, i) =>
        i === currentIdx ? { ...item, status: "inspection" as VacateStatus, inspectionDate: newDate } : item
      ));
      closeSheet();
      setTimeout(() => showSnackbar(`✅ Inspection scheduled for ${newDate} — Tenant notified`, "success"), 300);
    }, 1500);
  };

  const addDeduction = () => {
    const amount = parseInt(deductionAmount) || 0;
    if (!amount) { showSnackbar("Enter deduction amount", "error"); return; }
    const desc = deductionCat || deductionDesc || "Custom";
    setVacates(prev => prev.map((item, i) =>
      i === currentIdx
        ? { ...item, deductions: [...item.deductions, { desc, detail: deductionDesc || deductionCat || "Custom", amount }] }
        : item
    ));
    closeSheet();
    setTimeout(() => openProcessRefund(currentIdx), 100);
    showSnackbar(`Deduction of KSh ${amount.toLocaleString()} added`, "info");
  };

  const confirmProcessRefund = () => {
    setVacates(prev => prev.map((item, i) => {
      if (i !== currentIdx) return item;
      const totalDed = item.deductions.reduce((s, d) => s + d.amount, 0);
      return { ...item, status: "refund" as VacateStatus, refundAmount: item.deposit - totalDed };
    }));
    closeSheet();
    setTimeout(() => showSnackbar(`💰 Refund of KSh ${((vacates[currentIdx]?.deposit ?? 0) - totalDeductions).toLocaleString()} ready for processing`, "success"), 300);
  };

  const executeRefund = () => {
    setLoading("refund");
    const tenantName = vacates[currentIdx]?.tenant || "tenant";
    const refund = vacates[currentIdx]?.refundAmount || 0;
    setTimeout(() => {
      setLoading(null);
      setVacates(prev => prev.map((item, i) =>
        i === currentIdx ? { ...item, status: "completed" as VacateStatus } : item
      ));
      closeSheet();
      setTimeout(() => showSnackbar(`✅ KSh ${refund.toLocaleString()} sent via M-Pesa B2C to ${tenantName}`, "success"), 300);
    }, 2000);
  };

  const markUnitVacant = () => openSheet("vacant");

  const handleMarkVacant = () => {
    closeSheet();
    showSnackbar("✅ Unit marked as vacant & now available for listing", "success");
  };

  const extendStay = () => {
    closeSheet();
    showSnackbar("Stay extended — new move-out date set", "success");
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

  const totalDeductions = v?.deductions?.reduce((s, d) => s + d.amount, 0) || 0;
  const refundAmt = v ? v.deposit - totalDeductions : 0;

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
                  <h1 className="text-lg font-bold text-white">Vacating</h1>
                  <p className="text-xs" style={{ color: "#a3a3a3" }}>Move-out management</p>
                </div>
              </div>
              <button onClick={() => openSheet("filter")} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)" }}>
                <SlidersHorizontal className="w-5 h-5" style={{ color: "#a3a3a3" }} />
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-2 px-5 py-2">
              {[
                { key: "notice", count: statusCounts.notice, color: "#eab308" },
                { key: "inspection", count: statusCounts.inspection, color: "#a855f7" },
                { key: "refund", count: statusCounts.refund, color: "#3b82f6" },
                { key: "completed", count: statusCounts.completed, color: "#059669" },
              ].map((s) => (
                <div
                  key={s.key}
                  className="p-2 rounded-xl text-center cursor-pointer"
                  style={{ background: `${s.color}0a`, border: `1px solid ${s.color}22` }}
                  onClick={() => setActiveFilter(s.key)}
                >
                  <p className="text-lg font-bold" style={{ color: s.color }}>{s.count}</p>
                  <p className="text-[10px] font-semibold" style={{ color: s.color }}>{s.key.charAt(0).toUpperCase() + s.key.slice(1)}</p>
                </div>
              ))}
            </div>

            {/* Upcoming deadline */}
            <div className="px-5 pb-1">
              <div className="p-3.5 rounded-2xl" style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.15)" }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(234,179,8,0.15)" }}>
                    <AlertTriangle className="w-5 h-5" style={{ color: "#eab308" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">Move-out in 3 days</p>
                    <p className="text-xs" style={{ color: "#a3a3a3" }}>John Njoroge — Unit A2 Kilimani · Jan 18</p>
                  </div>
                  <button
                    onClick={() => openVacateDetail(0)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg flex-shrink-0"
                    style={{ background: "rgba(234,179,8,0.15)", color: "#eab308" }}
                  >
                    View
                  </button>
                </div>
              </div>
            </div>

            {/* Filter Chips */}
            <div className="flex gap-2 px-5 py-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
              {[
                { key: "all", label: "All" },
                { key: "notice", label: "Notice" },
                { key: "inspection", label: "Inspection" },
                { key: "refund", label: "Refund" },
                { key: "completed", label: "Completed" },
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

          {/* ====== CONTENT ====== */}
          <div className="app-content">
            <div className="px-5 pb-28 space-y-3 pt-1">
              {filteredVacates.map((item, idx) => {
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
                    onClick={() => openVacateDetail(vacates.indexOf(item))}
                  >
                    <div className="flex items-center justify-between mb-2">
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
                      <span className="chip" style={{ background: sm.chipBg, color: sm.chipColor, fontSize: "10px" }}>
                        {sm.label}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs" style={{ color: "#525252" }}>Move-out date</span>
                      <span className="text-sm font-semibold" style={{ color: item.status === "notice" ? "#eab308" : item.status === "completed" ? "#059669" : "#e5e5e5" }}>
                        {item.moveDate}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: "#525252" }}>Deposit held</span>
                      <span className="text-sm font-semibold text-white">KSh {item.deposit.toLocaleString()}</span>
                    </div>
                    {(item.status === "notice" || item.status === "inspection") && (
                      <div className="flex gap-2 mt-3 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                        {item.status === "notice" && (
                          <button
                            onClick={(e) => { e.stopPropagation(); openScheduleInspection(vacates.indexOf(item)); }}
                            className="flex-1 text-center text-xs font-semibold py-2 rounded-lg"
                            style={{ background: "rgba(168,85,247,0.1)", color: "#a855f7" }}
                          >
                            Schedule Inspection
                          </button>
                        )}
                        {item.status === "inspection" && (
                          <button
                            onClick={(e) => { e.stopPropagation(); openProcessRefund(vacates.indexOf(item)); }}
                            className="flex-1 text-center text-xs font-semibold py-2 rounded-lg"
                            style={{ background: "rgba(59,130,246,0.1)", color: "#3b82f6" }}
                          >
                            Process Refund
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); openVacateDetail(vacates.indexOf(item)); }}
                          className="text-xs font-medium py-2 px-3 rounded-lg"
                          style={{ background: "rgba(255,255,255,0.05)", color: "#a3a3a3" }}
                        >
                          Details
                        </button>
                      </div>
                    )}
                    {item.status === "refund" && (
                      <div className="flex gap-2 mt-3 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); openConfirmRefund(vacates.indexOf(item)); }}
                          className="flex-1 text-center text-xs font-semibold py-2 rounded-lg"
                          style={{ background: "rgba(4,120,87,0.15)", color: "#059669" }}
                        >
                          Confirm & Pay via M-Pesa
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); openVacateDetail(vacates.indexOf(item)); }}
                          className="text-xs font-medium py-2 px-3 rounded-lg"
                          style={{ background: "rgba(255,255,255,0.05)", color: "#a3a3a3" }}
                        >
                          Details
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        <BottomNavAndMenu />
      </div>

        {/* ============================================ */}
        {/* SHEET: VACATE DETAIL */}
        {/* ============================================ */}
        <div className={`sheet-overlay ${activeSheet === "detail" ? "active" : ""}`} onClick={closeSheet} />
        <div className={`bottom-sheet ${activeSheet === "detail" ? "active" : ""}`} style={{ maxHeight: "95dvh" }}>
          <div className="bottom-sheet-handle" />
          <div className="p-5 pb-8">
            {v && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white">Vacating Details</h3>
                  <span className="chip" style={{ background: statusMeta[v.status].chipBg, color: statusMeta[v.status].chipColor }}>
                    {statusMeta[v.status].label}
                  </span>
                </div>

                {/* Tenant */}
                <div className="flex items-center gap-3 p-3 rounded-xl mb-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: `linear-gradient(135deg,${v.color},${v.color}cc)` }}>
                    {v.init}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{v.tenant}</p>
                    <p className="text-xs" style={{ color: "#525252" }}>{v.unit}</p>
                  </div>
                  <button onClick={() => showSnackbar("Messaging tenant", "info")} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(59,130,246,0.15)" }}>
                    <MessageSquare className="w-4 h-4" style={{ color: "#3b82f6" }} />
                  </button>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="p-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
                    <p className="text-xs" style={{ color: "#525252" }}>Move-out Date</p>
                    <p className="text-sm font-semibold" style={{ color: "#eab308" }}>{v.moveDate}</p>
                  </div>
                  <div className="p-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
                    <p className="text-xs" style={{ color: "#525252" }}>Notice Period</p>
                    <p className="text-sm font-semibold text-white">{v.noticePeriod}</p>
                  </div>
                  <div className="p-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
                    <p className="text-xs" style={{ color: "#525252" }}>Deposit Held</p>
                    <p className="text-sm font-semibold text-white">KSh {v.deposit.toLocaleString()}</p>
                  </div>
                  <div className="p-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
                    <p className="text-xs" style={{ color: "#525252" }}>Monthly Rent</p>
                    <p className="text-sm font-semibold text-white">KSh {v.rent.toLocaleString()}</p>
                  </div>
                </div>

                {/* Reason */}
                <div className="mb-4">
                  <p className="text-xs font-semibold mb-2" style={{ color: "#a3a3a3" }}>REASON FOR VACATING</p>
                  <p className="text-sm leading-relaxed" style={{ color: "#a3a3a3" }}>{v.reason}</p>
                </div>

                {/* Timeline */}
                <div className="mb-5">
                  <p className="text-xs font-semibold mb-3" style={{ color: "#a3a3a3" }}>PROGRESS</p>
                  <div className="space-y-0">
                    {/* Step 1: Notice */}
                    <div className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ border: "2px solid #059669", background: "#059669" }} />
                        {v.status !== "completed" && <div className="w-0.5 h-8" style={{ background: "rgba(255,255,255,0.06)" }} />}
                      </div>
                      <div className={v.status !== "completed" ? "pb-3" : ""}>
                        <p className="text-sm text-white font-medium">Notice received</p>
                        <p className="text-xs" style={{ color: "#525252" }}>{v.noticeDate}</p>
                      </div>
                    </div>
                    {/* Step 2: Inspection */}
                    <div className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{
                            border: v.inspectionDate ? "2px solid #a855f7" : "2px solid #525252",
                            background: v.inspectionDate ? "#a855f7" : "#1A1D21",
                          }}
                        />
                        {v.status !== "completed" && v.status !== "cancelled" && <div className="w-0.5 h-8" style={{ background: "rgba(255,255,255,0.06)" }} />}
                      </div>
                      <div className={v.status !== "completed" && v.status !== "cancelled" ? "pb-3" : ""}>
                        <p className="text-sm" style={{ color: v.inspectionDate ? "#e5e5e5" : "#525252" }}>
                          {v.inspectionDate ? "Inspection scheduled" : "Inspection scheduled"}
                        </p>
                        {v.inspectionDate ? (
                          <p className="text-xs" style={{ color: "#a3a3a3" }}>{v.inspectionDate}</p>
                        ) : (
                          <p className="text-xs" style={{ color: "#525252" }}>—</p>
                        )}
                      </div>
                    </div>
                    {/* Step 3: Deposit refunded */}
                    <div className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{
                            border: v.status === "completed" || v.status === "refund" ? "2px solid #3b82f6" : "2px solid #525252",
                            background: v.status === "completed" || v.status === "refund" ? "#3b82f6" : "#1A1D21",
                          }}
                        />
                        {v.status !== "completed" && <div className="w-0.5 h-8" style={{ background: "rgba(255,255,255,0.06)" }} />}
                      </div>
                      <div className={v.status !== "completed" ? "pb-3" : ""}>
                        <p className="text-sm" style={{ color: v.status === "completed" || v.status === "refund" ? "#e5e5e5" : "#525252" }}>
                          Deposit refunded
                        </p>
                        {v.status === "completed" ? (
                          <p className="text-xs" style={{ color: "#a3a3a3" }}>{v.moveDate}</p>
                        ) : v.status === "refund" ? (
                          <p className="text-xs" style={{ color: "#3b82f6" }}>Processing</p>
                        ) : (
                          <p className="text-xs" style={{ color: "#525252" }}>—</p>
                        )}
                      </div>
                    </div>
                    {/* Step 4: Unit vacant */}
                    <div className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{
                            border: v.status === "completed" ? "2px solid #059669" : "2px solid #525252",
                            background: v.status === "completed" ? "#059669" : "#1A1D21",
                          }}
                        />
                      </div>
                      <div>
                        <p className="text-sm" style={{ color: v.status === "completed" ? "#e5e5e5" : "#525252" }}>
                          Unit marked vacant
                        </p>
                        {v.status === "completed" ? (
                          <p className="text-xs" style={{ color: "#a3a3a3" }}>{v.moveDate}</p>
                        ) : (
                          <p className="text-xs" style={{ color: "#525252" }}>—</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  {v.status === "notice" && (
                    <button
                      onClick={() => { closeSheet(); openScheduleInspection(currentIdx); }}
                      className="w-full py-3 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2"
                      style={{ background: "linear-gradient(to right,#7c3aed,#a855f7)", boxShadow: "0 4px 15px rgba(124,58,237,0.3)" }}
                    >
                      <ClipboardCheck className="w-4 h-4" /> Schedule Inspection
                    </button>
                  )}
                  {v.status === "inspection" && (
                    <button
                      onClick={() => { closeSheet(); openProcessRefund(currentIdx); }}
                      className="w-full py-3 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2"
                      style={{ background: "linear-gradient(to right,#d97706,#f59e0b)", boxShadow: "0 4px 15px rgba(217,119,6,0.3)" }}
                    >
                      <Wallet className="w-4 h-4" /> Process Deposit Refund
                    </button>
                  )}
                  {(v.status === "refund" || v.status === "inspection") && (
                    <button
                      onClick={() => { closeSheet(); markUnitVacant(); }}
                      className="w-full py-3 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2"
                      style={{ background: "linear-gradient(to right,#047857,#059669)", boxShadow: "0 4px 15px rgba(4,120,87,0.3)" }}
                    >
                      <DoorOpen className="w-4 h-4" /> Mark Unit as Vacant
                    </button>
                  )}
                  <div className="flex gap-2">
                    <button onClick={() => showSnackbar("Tenant messaged", "info")} className="btn-ghost flex-1 text-center" style={{ padding: "12px" }}>Message</button>
                    <button onClick={() => { closeSheet(); openSheet("extend"); }} className="btn-ghost flex-1 text-center" style={{ padding: "12px" }}>Extend Stay</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ============================================ */}
        {/* SHEET: SCHEDULE INSPECTION */}
        {/* ============================================ */}
        <div className={`sheet-overlay ${activeSheet === "inspect" ? "active" : ""}`} onClick={closeSheet} />
        <div className={`bottom-sheet ${activeSheet === "inspect" ? "active" : ""}`}>
          <div className="bottom-sheet-handle" />
          <div className="p-5 pb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(168,85,247,0.15)" }}>
                <ClipboardCheck className="w-5 h-5" style={{ color: "#a855f7" }} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Schedule Inspection</h3>
                <p className="text-xs" style={{ color: "#a3a3a3" }}>{v?.tenant} · {v?.unit?.split("·")[0]?.trim()}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold mb-2 block" style={{ color: "#a3a3a3" }}>DATE</label>
                <input type="date" className="android-input" value={inspectDate} onChange={(e) => setInspectDate(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold mb-2 block" style={{ color: "#a3a3a3" }}>TIME</label>
                <input type="time" className="android-input" value={inspectTime} onChange={(e) => setInspectTime(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold mb-2 block" style={{ color: "#a3a3a3" }}>INSPECTOR</label>
                <div className="flex gap-2">
                  {["self", "agent"].map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setInspector(opt)}
                      className="text-xs font-medium px-4 py-2.5 rounded-xl transition-all"
                      style={{
                        background: inspector === opt ? "rgba(4,120,87,0.15)" : "rgba(255,255,255,0.03)",
                        border: `1.5px solid ${inspector === opt ? "rgba(4,120,87,0.3)" : "rgba(255,255,255,0.08)"}`,
                        color: inspector === opt ? "#059669" : "#a3a3a3",
                      }}
                    >
                      {opt === "self" ? "Myself" : "Agent"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold mb-2 block" style={{ color: "#a3a3a3" }}>CHECKLIST ITEMS</label>
                <div className="space-y-2">
                  {[
                    "Check walls & paint condition",
                    "Test plumbing & drainage",
                    "Check electrical fittings",
                    "Check locks & keys returned",
                    "Verify meter readings",
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
                      <div
                        className="w-5 h-5 rounded border-2 flex items-center justify-center"
                        style={{
                          borderColor: i < 3 ? "#047857" : "rgba(255,255,255,0.2)",
                          background: i < 3 ? "#047857" : "transparent",
                        }}
                      >
                        {i < 3 && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className="text-sm" style={{ color: i < 3 ? "white" : "#a3a3a3" }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="toggle-track active" onClick={(e) => e.currentTarget.classList.toggle("active")}>
                  <div className="toggle-thumb" />
                </div>
                <span className="text-sm" style={{ color: "#a3a3a3" }}>Notify tenant of inspection date</span>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={closeSheet} className="btn-ghost flex-1 text-center" style={{ padding: "12px" }}>Cancel</button>
              <button
                onClick={confirmInspection}
                className="flex-1 text-center py-3 rounded-xl font-semibold text-sm text-white"
                style={{ background: "linear-gradient(to right,#7c3aed,#a855f7)", boxShadow: "0 4px 15px rgba(124,58,237,0.3)" }}
                disabled={loading === "inspect"}
              >
                {loading === "inspect" ? <div className="spinner mx-auto" /> : <span>Schedule</span>}
              </button>
            </div>
          </div>
        </div>

        {/* ============================================ */}
        {/* SHEET: PROCESS REFUND */}
        {/* ============================================ */}
        <div className={`sheet-overlay ${activeSheet === "refund" ? "active" : ""}`} onClick={closeSheet} />
        <div className={`bottom-sheet ${activeSheet === "refund" ? "active" : ""}`} style={{ maxHeight: "90dvh" }}>
          <div className="bottom-sheet-handle" />
          <div className="p-5 pb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(59,130,246,0.15)" }}>
                <Wallet className="w-5 h-5" style={{ color: "#3b82f6" }} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Process Refund</h3>
                <p className="text-xs" style={{ color: "#a3a3a3" }}>{v?.tenant} · {v?.unit?.split("·")[0]?.trim()}</p>
              </div>
            </div>

            <div className="p-3 rounded-xl mb-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex justify-between py-1">
                <span className="text-sm" style={{ color: "#525252" }}>Deposit Held</span>
                <span className="text-sm font-semibold text-white">KSh {(v?.deposit || 0).toLocaleString()}</span>
              </div>
            </div>

            {/* Deductions */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold" style={{ color: "#a3a3a3" }}>DEDUCTIONS</label>
                <button onClick={() => { closeSheet(); setTimeout(openAddDeduction, 100); }} className="text-xs font-semibold" style={{ color: "#3b82f6" }}>+ Add Item</button>
              </div>
              {v && v.deductions.length > 0 ? (
                <div className="space-y-2 mb-3">
                  {v.deductions.map((d, i) => (
                    <div key={i} className="flex items-center gap-2.5 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(239,68,68,0.1)" }}>
                        <Info className="w-4 h-4" style={{ color: "#ef4444" }} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-white">{d.desc}</p>
                        <p className="text-xs" style={{ color: "#525252" }}>{d.detail}</p>
                      </div>
                      <span className="text-sm font-semibold flex-shrink-0" style={{ color: "#ef4444" }}>-KSh {d.amount.toLocaleString()}</span>
                      <button
                        onClick={() => {
                          setVacates(prev => prev.map((item, idx) =>
                            idx === currentIdx ? { ...item, deductions: item.deductions.filter((_, di) => di !== i) } : item
                          ));
                          closeSheet();
                          setTimeout(() => openProcessRefund(currentIdx), 100);
                        }}
                        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: "rgba(239,68,68,0.1)" }}
                      >
                        <X className="w-3.5 h-3.5" style={{ color: "#ef4444" }} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm" style={{ color: "#525252" }}>No deductions added</p>
                </div>
              )}
            </div>

            {/* Summary */}
            <div className="p-4 rounded-xl mb-4" style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)" }}>
              <div className="flex justify-between mb-1">
                <span className="text-sm" style={{ color: "#a3a3a3" }}>Deposit</span>
                <span className="text-sm font-semibold text-white">KSh {(v?.deposit || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-sm" style={{ color: "#ef4444" }}>Deductions</span>
                <span className="text-sm font-semibold" style={{ color: "#ef4444" }}>-KSh {totalDeductions.toLocaleString()}</span>
              </div>
              <div className="pt-2" style={{ borderTop: "1px dashed rgba(255,255,255,0.1)" }}>
                <div className="flex justify-between">
                  <span className="text-base font-semibold text-white">Refund Amount</span>
                  <span className="text-lg font-bold" style={{ color: "#3b82f6" }}>KSh {Math.max(0, refundAmt).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Refund Method */}
            <div className="mb-4">
              <label className="text-xs font-semibold mb-2 block" style={{ color: "#a3a3a3" }}>REFUND VIA</label>
              <div className="flex gap-2">
                {(["mpesa", "cash", "bank"] as const).map((method) => (
                  <button
                    key={method}
                    onClick={() => setRefundMethod(method)}
                    className="text-xs font-medium px-4 py-2.5 rounded-xl transition-all"
                    style={{
                      background: refundMethod === method ? "rgba(79,180,79,0.15)" : "rgba(255,255,255,0.03)",
                      border: `1.5px solid ${refundMethod === method ? "rgba(79,180,79,0.3)" : "rgba(255,255,255,0.08)"}`,
                      color: refundMethod === method ? "#4fb34f" : "#a3a3a3",
                    }}
                  >
                    {method === "mpesa" ? "M-Pesa B2C" : method === "cash" ? "Cash" : "Bank"}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <div className="toggle-track active" onClick={(e) => e.currentTarget.classList.toggle("active")}>
                <div className="toggle-thumb" />
              </div>
              <span className="text-sm" style={{ color: "#a3a3a3" }}>Send deduction breakdown to tenant</span>
            </div>

            <div className="flex gap-3">
              <button onClick={closeSheet} className="btn-ghost flex-1 text-center" style={{ padding: "12px" }}>Cancel</button>
              <button
                onClick={confirmProcessRefund}
                className="btn-primary flex-1 text-center"
                style={{ padding: "12px" }}
              >
                Process Refund
              </button>
            </div>
          </div>
        </div>

        {/* ============================================ */}
        {/* SHEET: ADD DEDUCTION */}
        {/* ============================================ */}
        <div className={`sheet-overlay ${activeSheet === "deduction" ? "active" : ""}`} onClick={closeSheet} />
        <div className={`bottom-sheet ${activeSheet === "deduction" ? "active" : ""}`}>
          <div className="bottom-sheet-handle" />
          <div className="p-5 pb-8">
            <h3 className="text-lg font-bold text-white mb-4">Add Deduction</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold mb-2 block" style={{ color: "#a3a3a3" }}>CATEGORY</label>
                <div className="flex flex-wrap gap-2">
                  {["Paint touch-up", "Unpaid utilities", "Damaged items", "Cleaning fee", "Late fee", "Other"].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setDeductionCat(cat)}
                      className="text-xs font-medium px-3 py-2 rounded-full transition-all"
                      style={{
                        background: deductionCat === cat ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.05)",
                        border: `1px solid ${deductionCat === cat ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.1)"}`,
                        color: deductionCat === cat ? "#ef4444" : "#a3a3a3",
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold mb-2 block" style={{ color: "#a3a3a3" }}>DESCRIPTION</label>
                <input type="text" className="android-input" placeholder="e.g. Broken window in bedroom" value={deductionDesc} onChange={(e) => setDeductionDesc(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold mb-2 block" style={{ color: "#a3a3a3" }}>AMOUNT (KSh)</label>
                <input type="number" className="android-input" placeholder="0" value={deductionAmount} onChange={(e) => setDeductionAmount(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={closeSheet} className="btn-ghost flex-1 text-center" style={{ padding: "12px" }}>Cancel</button>
              <button onClick={addDeduction} className="btn-primary flex-1 text-center" style={{ padding: "12px" }}>Add</button>
            </div>
          </div>
        </div>

        {/* ============================================ */}
        {/* SHEET: CONFIRM REFUND */}
        {/* ============================================ */}
        <div className={`sheet-overlay ${activeSheet === "confirm" ? "active" : ""}`} onClick={closeSheet} />
        <div className={`bottom-sheet ${activeSheet === "confirm" ? "active" : ""}`}>
          <div className="bottom-sheet-handle" />
          <div className="p-5 pb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(4,120,87,0.15)" }}>
                <Send className="w-5 h-5" style={{ color: "#059669" }} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Confirm Refund</h3>
                <p className="text-xs" style={{ color: "#a3a3a3" }}>{v?.tenant}</p>
              </div>
            </div>
            <div className="text-center mb-4 p-4 rounded-2xl" style={{ background: "rgba(4,120,87,0.08)", border: "1px solid rgba(4,120,87,0.15)" }}>
              <p className="text-xs" style={{ color: "#059669" }}>Amount to disburse</p>
              <p className="text-3xl font-bold text-white mt-1">KSh {(v?.refundAmount || 0).toLocaleString()}</p>
              <span className="inline-flex items-center gap-1 mt-2 text-xs font-semibold" style={{ color: "#4fb34f" }}>
                <Smartphone className="w-3.5 h-3.5" /> M-Pesa B2C
              </span>
            </div>
            <div className="space-y-0 mb-4">
              <div className="flex justify-between py-2">
                <span className="text-sm" style={{ color: "#525252" }}>Phone</span>
                <span className="text-sm font-medium text-white">{v?.phone || "—"}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-sm" style={{ color: "#525252" }}>Deposit</span>
                <span className="text-sm font-medium text-white">KSh {(v?.deposit || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-sm" style={{ color: "#525252" }}>Deductions</span>
                <span className="text-sm font-medium" style={{ color: "#ef4444" }}>-KSh {totalDeductions.toLocaleString()}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={closeSheet} className="btn-ghost flex-1 text-center" style={{ padding: "12px" }}>Cancel</button>
              <button
                onClick={executeRefund}
                className="btn-primary flex-1 text-center"
                style={{ padding: "12px" }}
                disabled={loading === "refund"}
              >
                {loading === "refund" ? <div className="spinner mx-auto" /> : <span>Send via M-Pesa</span>}
              </button>
            </div>
          </div>
        </div>

        {/* ============================================ */}
        {/* SHEET: EXTEND STAY */}
        {/* ============================================ */}
        <div className={`sheet-overlay ${activeSheet === "extend" ? "active" : ""}`} onClick={closeSheet} />
        <div className={`bottom-sheet ${activeSheet === "extend" ? "active" : ""}`}>
          <div className="bottom-sheet-handle" />
          <div className="p-5 pb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(234,179,8,0.15)" }}>
                <CalendarPlus className="w-5 h-5" style={{ color: "#eab308" }} />
              </div>
              <h3 className="text-lg font-bold text-white">Extend Stay</h3>
            </div>
            <div className="p-3 rounded-xl mb-4" style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.12)" }}>
              <p className="text-xs" style={{ color: "#eab308" }}>⚠ This will cancel the current vacating notice and create a new tenancy period.</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold mb-2 block" style={{ color: "#a3a3a3" }}>NEW MOVE-OUT DATE</label>
                <input type="date" className="android-input" defaultValue="2025-03-18" />
              </div>
              <div>
                <label className="text-xs font-semibold mb-2 block" style={{ color: "#a3a3a3" }}>REASON FOR EXTENSION</label>
                <textarea className="android-input" rows={2} placeholder="e.g. Tenant requested extension…" />
              </div>
              <div className="flex items-center gap-3">
                <div className="toggle-track active" onClick={(e) => e.currentTarget.classList.toggle("active")}>
                  <div className="toggle-thumb" />
                </div>
                <span className="text-sm" style={{ color: "#a3a3a3" }}>Notify tenant of extension</span>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={closeSheet} className="btn-ghost flex-1 text-center" style={{ padding: "12px" }}>Cancel</button>
              <button
                onClick={extendStay}
                className="flex-1 text-center py-3 rounded-xl font-semibold text-sm text-white"
                style={{ background: "linear-gradient(to right,#d97706,#f59e0b)", boxShadow: "0 4px 15px rgba(217,119,6,0.3)" }}
              >
                Extend Stay
              </button>
            </div>
          </div>
        </div>

        {/* ============================================ */}
        {/* SHEET: MARK UNIT VACANT */}
        {/* ============================================ */}
        <div className={`sheet-overlay ${activeSheet === "vacant" ? "active" : ""}`} onClick={closeSheet} />
        <div className={`bottom-sheet ${activeSheet === "vacant" ? "active" : ""}`}>
          <div className="bottom-sheet-handle" />
          <div className="p-5 pb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(4,120,87,0.15)" }}>
                <DoorOpen className="w-5 h-5" style={{ color: "#059669" }} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Mark Unit Vacant</h3>
                <p className="text-xs" style={{ color: "#a3a3a3" }}>{v?.unit || "Unit"}</p>
              </div>
            </div>
            <div className="p-4 rounded-xl mb-4" style={{ background: "rgba(4,120,87,0.08)", border: "1px solid rgba(4,120,87,0.15)" }}>
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#059669" }} />
                <div>
                  <p className="text-sm font-semibold" style={{ color: "#059669" }}>Unit will be available for new tenants</p>
                  <p className="text-xs mt-1" style={{ color: "#a3a3a3" }}>The unit will appear as &quot;Vacant&quot; and can be listed immediately.</p>
                </div>
              </div>
            </div>
            <div className="space-y-3 mb-4">
              {[
                { label: "Mark unit as vacant", defaultOn: true },
                { label: "Enable for listing", defaultOn: true },
                { label: "Notify waiting tenants", defaultOn: false },
              ].map((tog, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm text-white">{tog.label}</span>
                  <div
                    className={`toggle-track ${tog.defaultOn ? "active" : ""}`}
                    onClick={(e) => e.currentTarget.classList.toggle("active")}
                  >
                    <div className="toggle-thumb" />
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={handleMarkVacant}
              className="w-full py-3.5 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(to right,#047857,#059669)", boxShadow: "0 4px 15px rgba(4,120,87,0.3)" }}
            >
              <Check className="w-4 h-4" /> Mark as Vacant
            </button>
          </div>
        </div>

        {/* ============================================ */}
        {/* SHEET: FILTER */}
        {/* ============================================ */}
        <div className={`sheet-overlay ${activeSheet === "filter" ? "active" : ""}`} onClick={closeSheet} />
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
              <label className="text-xs font-semibold mb-2 block" style={{ color: "#a3a3a3" }}>MOVE-OUT AFTER</label>
              <input type="date" className="android-input" defaultValue="2025-01-01" />
            </div>
            <button onClick={() => { closeSheet(); showSnackbar("Filters applied", "success"); }} className="btn-primary w-full text-center" style={{ padding: "14px" }}>Apply</button>
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

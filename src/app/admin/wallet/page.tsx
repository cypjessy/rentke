"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import AppBar from "@/app/components/AppBar";
import {
  AlertTriangle,
  Download,
  SlidersHorizontal,
  Users,
  Crown,
  Star,
  RotateCcw,
  Check,
  X,
  Info,
  Wallet,
  LayoutDashboard,
  Building2,
  Headset,
  MoreVertical,
  FileSpreadsheet,
  FileText,
  XCircle,
  Settings,
  TrendingUp,
} from "lucide-react";
import { listenToTransactions, listenToWalletStats, refundTransaction, flagTransactionDispute, type WalletStats, type TxType, type TxStatus } from "@/lib/admin";

// ─── Types ───────────────────────────────────────────────────────────────────
type SnackbarType = "success" | "error" | "info";
type PageKey = "dashboard" | "landlords" | "listings" | "wallet" | "settings";
type SheetKey = "tx" | "refund" | "filter" | "export" | "menu" | "flag-dispute";

interface LocalTx {
  id: string;
  type: string;
  typeKey: TxType;
  amount: string;
  from: string;
  to: string;
  method: string;
  ref: string;
  date: string;
  status: TxStatus;
}

interface SnackbarState {
  message: string;
  type: SnackbarType;
  visible: boolean;
}

const CHART_DATA = [
  { label: "Mon", height: 40 },
  { label: "Tue", height: 60 },
  { label: "Wed", height: 45 },
  { label: "Thu", height: 75 },
  { label: "Fri", height: 65 },
  { label: "Sat", height: 90, highlight: true },
  { label: "Sun", height: 55 },
];

const TX_FILTERS = [
  { key: "all" as const, label: "All" },
  { key: "subscription" as const, label: "Subscriptions" },
  { key: "boost" as const, label: "Boosts" },
  { key: "commission" as const, label: "Commissions" },
  { key: "refund" as const, label: "Refunds" },
];

const MONTH_CHART_DATA = [
  { label: "Week 1", height: 55 },
  { label: "Week 2", height: 70 },
  { label: "Week 3", height: 48 },
  { label: "Week 4", height: 82, highlight: true },
];

const DISPUTE_REASONS = ["Duplicate charge", "Unauthorized transaction", "Incorrect amount", "Service not rendered", "Fraudulent activity"];

const REFUND_REASONS = ["Service not delivered", "Duplicate payment", "Landlord request", "System error"];

const EXPORT_FORMATS = [
  { key: "csv" as const, label: "CSV", desc: "Spreadsheet compatible", icon: FileSpreadsheet, color: "#059669" },
  { key: "pdf" as const, label: "PDF", desc: "Printable report", icon: FileText, color: "#a3a3a3" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const TX_ICONS: Record<TxType, { bg: string; color: string; icon: React.ElementType }> = {
  subscription: { bg: "rgba(168,85,247,0.15)", color: "#a855f7", icon: Crown },
  boost: { bg: "rgba(234,179,8,0.15)", color: "#eab308", icon: Star },
  commission: { bg: "rgba(4,120,87,0.15)", color: "#059669", icon: TrendingUp },
  refund: { bg: "rgba(59,130,246,0.15)", color: "#3b82f6", icon: RotateCcw },
};

const TX_STATUS_STYLES: Record<TxStatus, { className: string; label: string }> = {
  success: { className: "status-success", label: "Success" },
  pending: { className: "status-pending", label: "Pending" },
  failed: { className: "status-failed", label: "Failed" },
  refunded: { className: "status-refunded", label: "Refunded" },
};

// ─── Component ───────────────────────────────────────────────────────────────
export default function AdminWallet() {
  const router = useRouter();
  // ── State ──
  const [activePage, setActivePage] = useState<PageKey>("wallet");
  const [activeSheet, setActiveSheet] = useState<SheetKey | null>(null);
  const [snackbar, setSnackbar] = useState<SnackbarState>({ message: "", type: "info", visible: false });
  const [chartAnimated, setChartAnimated] = useState(false);
  const [txFilter, setTxFilter] = useState<string>("all");

  // Transaction detail
  const [currentTxIndex, setCurrentTxIndex] = useState(0);

  // Refund
  const [selectedRefundReason, setSelectedRefundReason] = useState("");
  const [refundAmount, setRefundAmount] = useState("2999");
  const [refundNote, setRefundNote] = useState("");

  // Chart view
  const [chartView, setChartView] = useState<"week" | "month">("week");

  // Flag dispute
  const [selectedDisputeReason, setSelectedDisputeReason] = useState("");
  const [disputeNote, setDisputeNote] = useState("");

  // Filter
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("2025-01-01");
  const [filterDateTo, setFilterDateTo] = useState("2025-01-15");

  // Export
  const [exportFormat, setExportFormat] = useState<"csv" | "pdf">("csv");

  const snackbarTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  // ── Firestore State ──
  const [transactions, setTransactions] = useState<LocalTx[]>([]);
  const [walletStats, setWalletStats] = useState<WalletStats>({
    totalRevenue: 0, subscriptionRevenue: 0, boostRevenue: 0,
    commissionRevenue: 0, refundAmount: 0, activeSubscriptions: 0,
    activeBoosts: 0, transactionCount: 0,
  });
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    const unsub1 = listenToTransactions((txns) => {
      const mapped: LocalTx[] = txns.map((t) => ({
        id: t.id,
        type: t.type,
        typeKey: t.typeKey,
        amount: t.amount > 0 ? `+KSh ${t.amount.toLocaleString()}` : `-KSh ${Math.abs(t.amount).toLocaleString()}`,
        from: t.fromName,
        to: t.toName,
        method: t.method,
        ref: t.ref || t.id.slice(-8).toUpperCase(),
        date: t.date || t.createdAt?.toDate().toLocaleDateString() || "",
        status: t.status,
      }));
      setTransactions(mapped);
      setDataLoading(false);
    }, () => { setDataLoading(false); });
    const unsub2 = listenToWalletStats((stats) => {
      setWalletStats(stats);
    }, () => {});
    return () => { unsub1(); unsub2(); };
  }, []);

  // ── Derived ──
  const safeTxIndex = Math.min(currentTxIndex, Math.max(0, transactions.length - 1));
  const currentTx = transactions[safeTxIndex];

  const filteredTransactions = transactions.filter((t) => {
    if (txFilter !== "all" && t.typeKey !== txFilter) return false;
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    return true;
  });

  // Stats from Firestore
  const totalRevenue = walletStats.totalRevenue;
  const activeSubscriptions = walletStats.activeSubscriptions;
  const activeBoosts = walletStats.activeBoosts;

  // ── Snackbar ──
  const showSnackbar = useCallback((message: string, type: SnackbarType = "info") => {
    clearTimeout(snackbarTimeout.current);
    setSnackbar({ message, type, visible: true });
    snackbarTimeout.current = setTimeout(() => {
      setSnackbar((s) => ({ ...s, visible: false }));
    }, 3500);
  }, []);

  // ── Sheets ──
  const openSheet = useCallback((key: SheetKey) => setActiveSheet(key), []);
  const closeSheet = useCallback(() => setActiveSheet(null), []);

  // ── Chart animation ──
  useEffect(() => {
    const t = setTimeout(() => setChartAnimated(true), 300);
    return () => clearTimeout(t);
  }, []);

  // ── Ripple effect ──
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const container = (e.target as HTMLElement).closest('.ripple-container') as HTMLElement | null;
      if (!container) return;
      const ripple = document.createElement("span");
      ripple.className = "ripple";
      const rect = container.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      ripple.style.width = ripple.style.height = size + "px";
      ripple.style.left = e.clientX - rect.left - size / 2 + "px";
      ripple.style.top = e.clientY - rect.top - size / 2 + "px";
      container.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  // ── Transaction Detail ──
  const openTxDetail = useCallback(
    (idx: number) => {
      setCurrentTxIndex(idx);
      openSheet("tx");
    },
    [openSheet],
  );

  // ── Refund ──
  const openRefundSheet = useCallback(() => {
    setSelectedRefundReason("");
    setRefundAmount("2999");
    setRefundNote("");
    openSheet("refund");
  }, [openSheet]);

  const confirmRefund = useCallback(() => {
    const txId = currentTx?.id;
    if (txId && selectedRefundReason) {
      const amount = parseInt(refundAmount, 10);
      if (!isNaN(amount)) {
        refundTransaction(txId, selectedRefundReason, amount).catch((e) => showSnackbar(e.message, "error"));
      }
    }
    closeSheet();
    setTimeout(() => showSnackbar("💸 Refund processed — amount returned to landlord", "success"), 300);
  }, [currentTx, selectedRefundReason, refundAmount, closeSheet, showSnackbar]);

  // ── Filter ──
  const applyFilters = useCallback(() => {
    closeSheet();
    setTimeout(() => showSnackbar("Filters applied", "success"), 200);
  }, [closeSheet, showSnackbar]);

  const resetFilters = useCallback(() => {
    setFilterStatus("all");
    setFilterDateFrom("2025-01-01");
    setFilterDateTo("2025-01-15");
    setTxFilter("all");
    showSnackbar("Filters reset", "info");
  }, [showSnackbar]);

  // ── Flag Dispute ──
  const confirmFlagDispute = useCallback(() => {
    const txId = currentTx?.id;
    if (txId && selectedDisputeReason) {
      flagTransactionDispute(txId, selectedDisputeReason).catch((e) => showSnackbar(e.message, "error"));
    }
    const txName = currentTx?.type || "Transaction";
    closeSheet();
    setTimeout(() => showSnackbar(`🚩 ${txName} flagged for review`, "info"), 300);
  }, [currentTx, selectedDisputeReason, closeSheet, showSnackbar]);

  // ── Export ──
  const confirmExport = useCallback(() => {
    const rows = transactions.map((t) => `${t.date},${t.type},${t.from},${t.amount},${t.status}`).join('\n');
    const header = 'Date,Type,From,Amount,Status\n';
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rentke-wallet-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    closeSheet();
    setTimeout(() => showSnackbar(`Exported ${transactions.length} transactions as CSV`, "success"), 200);
  }, [transactions, closeSheet, showSnackbar]);

  // ── Nav items ──
  const navItems: { key: PageKey; icon: React.ElementType; label: string }[] = [
    { key: "dashboard", icon: LayoutDashboard, label: "Home" },
    { key: "landlords", icon: Users, label: "Landlords" },
    { key: "listings", icon: Building2, label: "Listings" },
    { key: "wallet", icon: Wallet, label: "Wallet" },
    { key: "settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div className="admin-portal" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
      {/* Status Bar */}
      <div
        className="fixed top-0 left-0 right-0 z-60"
        style={{
          height: "env(safe-area-inset-top, 24px)",
          minHeight: "24px",
          background: "rgba(5,5,5,0.9)",
          backdropFilter: "blur(20px)",
        }}
      />

      {/* ──────────── MAIN CONTENT ──────────── */}
      <div style={{ paddingBottom: "80px" }}>
        {/* TOP APP BAR */}
        <AppBar
          title="Wallet"
          subtitle="Platform Revenue"
          backHref="/admin"
          actions={[
            { icon: Download, onClick: () => openSheet("export") },
            { icon: SlidersHorizontal, onClick: () => openSheet("filter") },
            { icon: MoreVertical, onClick: () => openSheet("menu") },
          ]}
        />

        {/* SCROLLABLE CONTENT */}
        <div className="px-5 space-y-5" style={{ animation: "slideInUp 0.5s ease" }}>
          {/* TOTAL REVENUE CARD */}
          <div
            className="rounded-3xl p-5 relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #047857, #059669)",
              boxShadow: "0 8px 32px rgba(4,120,87,0.3)",
            }}
          >
            <div
              className="absolute top-0 right-0 w-40 h-40 rounded-full"
              style={{ background: "rgba(255,255,255,0.08)", filter: "blur(50px)", transform: "translate(30%, -30%)" }}
            />
            <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.7)" }}>
              Platform Revenue (MTD)
            </p>
            <p className="text-3xl font-bold text-white mt-1">{dataLoading ? "..." : `KSh ${totalRevenue.toLocaleString()}`}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.2)", color: "white" }}>
                +24%
              </span>
              <span className="text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>
                vs last month
              </span>
            </div>
          <div
            className="grid grid-cols-3 gap-3 mt-5 pt-4"
            style={{ borderTop: "1px solid rgba(255,255,255,0.15)" }}
          >
            <div>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>
                Subscriptions
              </p>
              <p className="text-sm font-bold text-white">{dataLoading ? "..." : `KSh ${(walletStats.subscriptionRevenue / 1000).toFixed(0)}K`}</p>
            </div>
            <div>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>
                Boosts
              </p>
              <p className="text-sm font-bold text-white">{dataLoading ? "..." : `KSh ${(walletStats.boostRevenue / 1000).toFixed(0)}K`}</p>
            </div>
            <div>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>
                Commissions
              </p>
              <p className="text-sm font-bold text-white">{dataLoading ? "..." : `KSh ${(walletStats.commissionRevenue / 1000).toFixed(0)}K`}</p>
            </div>
          </div>
          </div>

          {/* QUICK STATS */}
          <div className="grid grid-cols-2 gap-3">
            <div className="stat-card" onClick={() => setTxFilter(txFilter === "subscription" ? "all" : "subscription")}>
              <div className="flex items-center justify-between mb-2">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(168,85,247,0.15)" }}
                >
                  <Crown className="w-[18px] h-[18px]" style={{ color: "#a855f7" }} />
                </div>
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded"
                  style={{ background: "rgba(168,85,247,0.15)", color: "#a855f7" }}
                >
                  {dataLoading ? "..." : activeSubscriptions}
                </span>
              </div>
              <p className="text-xl font-bold text-white">{dataLoading ? "..." : `KSh ${(walletStats.subscriptionRevenue / 1000).toFixed(0)}K`}</p>
              <p className="text-xs mt-0.5" style={{ color: "#a3a3a3" }}>
                Active Subscriptions
              </p>
            </div>
            <div className="stat-card" onClick={() => setTxFilter(txFilter === "boost" ? "all" : "boost")}>
              <div className="flex items-center justify-between mb-2">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(234,179,8,0.15)" }}
                >
                  <Star className="w-[18px] h-[18px]" style={{ color: "#eab308" }} />
                </div>
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded"
                  style={{ background: "rgba(234,179,8,0.15)", color: "#eab308" }}
                >
                  {dataLoading ? "..." : activeBoosts}
                </span>
              </div>
              <p className="text-xl font-bold text-white">{dataLoading ? "..." : `KSh ${(walletStats.boostRevenue / 1000).toFixed(0)}K`}</p>
              <p className="text-xs mt-0.5" style={{ color: "#a3a3a3" }}>
                Active Boosts
              </p>
            </div>
          </div>

          {/* REVENUE CHART */}
          <div className="stat-card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Revenue Trend</h3>
                <p className="text-xs mt-0.5" style={{ color: "#a3a3a3" }}>
                  Last 7 days
                </p>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setChartView("week")}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg transition-all"
                  style={{ background: chartView === "week" ? "rgba(4,120,87,0.15)" : "transparent", color: chartView === "week" ? "#059669" : "#525252" }}
                >
                  Week
                </button>
                <button
                  onClick={() => setChartView("month")}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg transition-all"
                  style={{ background: chartView === "month" ? "rgba(4,120,87,0.15)" : "transparent", color: chartView === "month" ? "#059669" : "#525252" }}
                >
                  Month
                </button>
              </div>
            </div>
            <div className="flex items-end gap-2 h-28">
              {(chartView === "week" ? CHART_DATA : MONTH_CHART_DATA).map((d) => (
                <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="chart-bar w-full"
                    style={{
                      height: chartAnimated ? `${d.height}%` : "0%",
                      transitionDelay: chartAnimated ? "0.1s" : "0s",
                    }}
                  />
                  <span className="text-xs" style={{ color: d.highlight ? "#059669" : "#525252" }}>
                    {d.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* REVENUE BREAKDOWN */}
          <div className="stat-card">
            <h3 className="text-sm font-semibold text-white mb-3">Revenue Breakdown</h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span style={{ color: "#a3a3a3" }}>Subscriptions</span>
                  <span className="font-semibold text-white">{dataLoading ? "..." : `KSh ${walletStats.subscriptionRevenue.toLocaleString()}`}</span>
                </div>
                <div className="w-full h-2 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <div className="h-full rounded-full" style={{ width: "62%", background: "#a855f7" }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span style={{ color: "#a3a3a3" }}>Boosts</span>
                  <span className="font-semibold text-white">{dataLoading ? "..." : `KSh ${walletStats.boostRevenue.toLocaleString()}`}</span>
                </div>
                <div className="w-full h-2 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <div className="h-full rounded-full" style={{ width: "25%", background: "#eab308" }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span style={{ color: "#a3a3a3" }}>Commissions</span>
                  <span className="font-semibold text-white">{dataLoading ? "..." : `KSh ${walletStats.commissionRevenue.toLocaleString()}`}</span>
                </div>
                <div className="w-full h-2 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <div className="h-full rounded-full" style={{ width: "13%", background: "#059669" }} />
                </div>
              </div>
              <div className="pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex justify-between text-sm">
                  <span style={{ color: "#a3a3a3" }}>Refunds (MTD)</span>
                  <span className="font-semibold" style={{ color: "#ef4444" }}>{dataLoading ? "..." : `-KSh ${walletStats.refundAmount.toLocaleString()}`}</span>
                </div>
              </div>
            </div>
          </div>

          {/* FILTER TABS */}
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {TX_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setTxFilter(f.key)}
                className="text-xs font-medium px-3.5 py-1.5 rounded-full whitespace-nowrap transition-all"
                style={{
                  background: txFilter === f.key ? "rgba(4,120,87,0.15)" : "rgba(255,255,255,0.03)",
                  border: `1.5px solid ${txFilter === f.key ? "rgba(4,120,87,0.3)" : "rgba(255,255,255,0.08)"}`,
                  color: txFilter === f.key ? "#059669" : "#a3a3a3",
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* TRANSACTIONS LIST */}
          <div className="space-y-2 pb-4">
            {filteredTransactions.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-sm" style={{ color: "#525252" }}>
                  No transactions found
                </p>
              </div>
            )}
            {filteredTransactions.map((tx, i) => {
              const origIdx = transactions.findIndex((t) => t.ref === tx.ref);
              const ic = TX_ICONS[tx.typeKey];
              const st = TX_STATUS_STYLES[tx.status];
              const Icon = ic.icon;
              return (
                <div
                  key={tx.ref}
                  className="p-3.5 rounded-2xl"
                  style={{
                    background: "#1A1D21",
                    border: "1px solid rgba(255,255,255,0.05)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                  onClick={() => openTxDetail(origIdx)}
                  onMouseDown={(e) => {
                    const target = e.currentTarget;
                    target.style.transform = "scale(0.98)";
                    setTimeout(() => { target.style.transform = ""; }, 150);
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: ic.bg }}
                    >
                      <Icon className="w-5 h-5" style={{ color: ic.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-white truncate">{tx.type}</p>
                        <p className="text-sm font-bold" style={{ color: tx.amount.startsWith("+") ? "#e5e5e5" : "#3b82f6" }}>
                          {tx.amount}
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-xs" style={{ color: "#525252" }}>{tx.from}</p>
                        <span
                          className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{
                            background:
                              tx.status === "success"
                                ? "rgba(4,120,87,0.15)"
                                : tx.status === "pending"
                                  ? "rgba(234,179,8,0.15)"
                                  : tx.status === "failed"
                                    ? "rgba(239,68,68,0.15)"
                                    : "rgba(59,130,246,0.15)",
                            color:
                              tx.status === "success"
                                ? "#059669"
                                : tx.status === "pending"
                                  ? "#eab308"
                                  : tx.status === "failed"
                                    ? "#ef4444"
                                    : "#3b82f6",
                          }}
                        >
                          {st.label}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ──────────── BOTTOM NAVIGATION ──────────── */}
      <div className="bottom-nav">
        <div className="flex items-center justify-around">
          {navItems.map((item) => (
            <div
              key={item.key}
              className={`nav-item ${activePage === item.key ? "active" : ""}`}
              onClick={() => {
                if (item.key === "dashboard") {
                  router.push("/admin");
                } else if (item.key === "landlords") {
                  router.push("/admin/landlords");
                } else if (item.key === "listings") {
                  router.push("/admin/listings");
                } else if (item.key === "wallet") {
                  router.push("/admin/wallet");
                } else if (item.key === "settings") {
                  router.push("/admin/settings");
                }
              }}
            >
              <item.icon
                className="w-5 h-5"
                style={{ color: activePage === item.key ? "#059669" : "#525252" }}
              />
              <span
                className="text-xs font-medium"
                style={{ color: activePage === item.key ? "#059669" : "#525252" }}
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ──────────── SHEETS ──────────── */}

      {/* OVERLAY */}
      <div className={`bottom-sheet-overlay ${activeSheet ? "active" : ""}`} onClick={closeSheet} />

      {/* -- TRANSACTION DETAIL SHEET -- */}
      <div className={`bottom-sheet ${activeSheet === "tx" ? "active" : ""}`}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-8">
          {currentTx && (
            <>
              <h3 className="text-lg font-bold text-white mb-4">Transaction Details</h3>

              <div className="text-center mb-5">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3"
                  style={{ background: TX_ICONS[currentTx.typeKey]?.bg || "rgba(4,120,87,0.15)" }}
                >
                  {(() => {
                    const IconC = TX_ICONS[currentTx.typeKey]?.icon || TrendingUp;
                    return <IconC className="w-7 h-7" style={{ color: TX_ICONS[currentTx.typeKey]?.color || "#059669" }} />;
                  })()}
                </div>
                <p className="text-2xl font-bold text-white">{currentTx.amount}</p>
                <span
                  className="text-xs font-semibold px-3 py-1 rounded-full mt-2 inline-flex"
                  style={{
                    background:
                      currentTx.status === "success"
                        ? "rgba(4,120,87,0.15)"
                        : currentTx.status === "pending"
                          ? "rgba(234,179,8,0.15)"
                          : currentTx.status === "failed"
                            ? "rgba(239,68,68,0.15)"
                            : "rgba(59,130,246,0.15)",
                    color:
                      currentTx.status === "success"
                        ? "#059669"
                        : currentTx.status === "pending"
                          ? "#eab308"
                          : currentTx.status === "failed"
                            ? "#ef4444"
                            : "#3b82f6",
                  }}
                >
                  {TX_STATUS_STYLES[currentTx.status]?.label || currentTx.status}
                </span>
              </div>

              <div className="space-y-0 mb-5">
                {[
                  { label: "Type", value: currentTx.type },
                  { label: "From", value: currentTx.from },
                  { label: "To", value: currentTx.to },
                  { label: "M-Pesa Ref", value: currentTx.ref, mono: true },
                  { label: "Date & Time", value: currentTx.date },
                ].map((row, i) => (
                  <div
                    key={i}
                    className="flex justify-between py-3"
                    style={{ borderBottom: i < 4 ? "1px solid rgba(255,255,255,0.04)" : undefined }}
                  >
                    <span className="text-sm" style={{ color: "#525252" }}>
                      {row.label}
                    </span>
                    <span
                      className={`text-sm font-medium ${row.mono ? "font-mono" : ""}`}
                      style={{ color: "white" }}
                    >
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => {
                    closeSheet();
                    setTimeout(() => showSnackbar("Receipt sent to landlord", "success"), 300);
                  }}
                  className="btn-primary w-full text-center ripple-container"
                >
                  Send Receipt
                </button>
                {currentTx.status === "success" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        closeSheet();
                        setTimeout(() => openRefundSheet(), 300);
                      }}
                      className="btn-danger flex-1 text-center"
                    >
                      Issue Refund
                    </button>                      <button
                        onClick={() => {
                          closeSheet();
                          setTimeout(() => openSheet("flag-dispute"), 300);
                        }}
                        className="btn-ghost flex-1 text-center"
                      >
                        Flag Dispute
                      </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* -- REFUND SHEET -- */}
      <div className={`bottom-sheet ${activeSheet === "refund" ? "active" : ""}`}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-8">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: "rgba(59,130,246,0.15)" }}
            >
              <RotateCcw className="w-5 h-5" style={{ color: "#3b82f6" }} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Issue Refund</h3>
              <p className="text-xs" style={{ color: "#a3a3a3" }}>
                Reverse platform fee or payment
              </p>
            </div>
          </div>

          <div
            className="p-3 rounded-xl mb-4"
            style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)" }}
          >
            <p className="text-xs" style={{ color: "#3b82f6" }}>
              ℹ Refund will be sent back to the landlord's M-Pesa number
            </p>
          </div>

          <div className="mb-4">
            <label className="text-xs font-semibold mb-2 block" style={{ color: "#a3a3a3" }}>
              REFUND AMOUNT (KSh)
            </label>
            <input
              type="number"
              className="android-input"
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              placeholder="Enter amount"
            />
          </div>

          <div className="mb-4">
            <label className="text-xs font-semibold mb-2 block" style={{ color: "#a3a3a3" }}>
              REASON
            </label>
            <div className="flex flex-wrap gap-2">
              {REFUND_REASONS.map((reason) => (
                <button
                  key={reason}
                  onClick={() => setSelectedRefundReason(reason)}
                  className="text-xs font-medium px-3.5 py-2 rounded-full transition-all"
                  style={{
                    background: selectedRefundReason === reason ? "rgba(59,130,246,0.1)" : "rgba(255,255,255,0.05)",
                    border:
                      selectedRefundReason === reason
                        ? "1px solid rgba(59,130,246,0.3)"
                        : "1px solid rgba(255,255,255,0.1)",
                    color: selectedRefundReason === reason ? "#3b82f6" : "#a3a3a3",
                  }}
                >
                  {reason}
                </button>
              ))}
            </div>
          </div>

          <textarea
            className="android-input"
            rows={2}
            placeholder="Additional notes..."
            value={refundNote}
            onChange={(e) => setRefundNote(e.target.value)}
          />

          <div className="flex gap-3 mt-4">
            <button onClick={closeSheet} className="btn-ghost flex-1 text-center">
              Cancel
            </button>
            <button
              onClick={confirmRefund}
              disabled={!selectedRefundReason}
              className="btn-danger flex-1 text-center"
              style={{ opacity: selectedRefundReason ? 1 : 0.4, cursor: selectedRefundReason ? "pointer" : "not-allowed" }}
            >
              Process Refund
            </button>
          </div>
        </div>
      </div>

      {/* -- FILTER SHEET -- */}
      <div className={`bottom-sheet ${activeSheet === "filter" ? "active" : ""}`}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-8">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-white">Filters</h3>
            <button onClick={resetFilters} className="text-xs font-medium" style={{ color: "#059669" }}>
              Reset
            </button>
          </div>

          <div className="mb-5">
            <label className="text-xs font-semibold mb-3 block" style={{ color: "#a3a3a3" }}>
              STATUS
            </label>
            <div className="flex flex-wrap gap-2">
              {["all", "success", "pending", "failed", "refunded"].map((v) => (
                <button
                  key={v}
                  onClick={() => setFilterStatus(v)}
                  className="text-xs font-medium px-3.5 py-2 rounded-full transition-all"
                  style={{
                    background: filterStatus === v ? "rgba(4,120,87,0.15)" : "rgba(255,255,255,0.03)",
                    border:
                      filterStatus === v
                        ? "1.5px solid rgba(4,120,87,0.3)"
                        : "1.5px solid rgba(255,255,255,0.08)",
                    color: filterStatus === v ? "#059669" : "#a3a3a3",
                  }}
                >
                  {v === "all" ? "All" : v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-5">
            <label className="text-xs font-semibold mb-3 block" style={{ color: "#a3a3a3" }}>
              DATE RANGE
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                className="android-input flex-1"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
              />
              <input
                type="date"
                className="android-input flex-1"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
              />
            </div>
          </div>

          <button onClick={applyFilters} className="btn-primary w-full text-center ripple-container">
            Apply Filters
          </button>
        </div>
      </div>

      {/* -- EXPORT SHEET -- */}
      <div className={`bottom-sheet ${activeSheet === "export" ? "active" : ""}`}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-8">
          <h3 className="text-lg font-bold text-white mb-4">Export Data</h3>
          <div className="space-y-2 mb-5">
            {EXPORT_FORMATS.map((fmt) => {
              const Icon = fmt.icon;
              const selected = exportFormat === fmt.key;
              return (
                <label
                  key={fmt.key}
                  className="flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all"
                  style={{
                    background: selected ? "rgba(4,120,87,0.08)" : "rgba(255,255,255,0.03)",
                    border: selected ? "1.5px solid rgba(4,120,87,0.2)" : "1.5px solid transparent",
                  }}
                  onClick={() => setExportFormat(fmt.key)}
                >
                  <div
                    className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                    style={{ borderColor: selected ? "#059669" : "#525252" }}
                  >
                    {selected && <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#059669" }} />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{fmt.label}</p>
                    <p className="text-xs" style={{ color: "#a3a3a3" }}>
                      {fmt.desc}
                    </p>
                  </div>
                  <Icon className="w-5 h-5" style={{ color: selected ? "#059669" : "#a3a3a3" }} />
                </label>
              );
            })}
          </div>
          <div className="flex gap-3">
            <button onClick={closeSheet} className="btn-ghost flex-1 text-center">
              Cancel
            </button>
            <button onClick={confirmExport} className="btn-primary flex-1 text-center ripple-container">
              Export
            </button>
          </div>
        </div>
      </div>

      {/* -- FLAG DISPUTE SHEET -- */}
      <div className={`bottom-sheet ${activeSheet === "flag-dispute" ? "active" : ""}`}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-8">
          {currentTx && (
            <>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(239,68,68,0.15)" }}>
                  <AlertTriangle className="w-5 h-5" style={{ color: "#ef4444" }} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Flag Dispute</h3>
                  <p className="text-xs" style={{ color: "#a3a3a3" }}>{currentTx.type} · {currentTx.ref}</p>
                </div>
              </div>

              <div className="p-4 rounded-xl mb-4" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.12)" }}>
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#ef4444" }} />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "#ef4444" }}>Flagging this transaction</p>
                    <p className="text-xs mt-1" style={{ color: "#a3a3a3" }}>This will notify the finance team and pause any related actions until the dispute is resolved.</p>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <label className="text-xs font-semibold mb-2 block" style={{ color: "#a3a3a3" }}>DISPUTE REASON</label>
                <div className="flex flex-wrap gap-2">
                  {DISPUTE_REASONS.map((reason) => (
                    <button key={reason} onClick={() => setSelectedDisputeReason(reason)}
                      className="text-xs font-medium px-3.5 py-2 rounded-full transition-all"
                      style={{ background: selectedDisputeReason === reason ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.05)", border: selectedDisputeReason === reason ? "1px solid rgba(239,68,68,0.3)" : "1px solid rgba(255,255,255,0.1)", color: selectedDisputeReason === reason ? "#ef4444" : "#a3a3a3" }}>
                      {reason}
                    </button>
                  ))}
                </div>
              </div>

              <textarea className="android-input" rows={2} placeholder="Additional details about the dispute..." value={disputeNote} onChange={(e) => setDisputeNote(e.target.value)} />

              <div className="flex gap-3 mt-4">
                <button onClick={closeSheet} className="btn-ghost flex-1 text-center">Cancel</button>
                <button onClick={confirmFlagDispute} disabled={!selectedDisputeReason} className="btn-danger flex-1 text-center" style={{ opacity: selectedDisputeReason ? 1 : 0.4, cursor: selectedDisputeReason ? "pointer" : "not-allowed" }}>
                  Flag Dispute
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* -- MORE/MENU SHEET -- */}
      <div className={`bottom-sheet ${activeSheet === "menu" ? "active" : ""}`}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-8">
          <div
            className="flex items-center gap-4 p-4 rounded-2xl mb-4"
            style={{ background: "rgba(255,255,255,0.03)" }}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #047857, #059669)" }}
            >
              <span className="text-base font-bold text-white">AK</span>
            </div>
            <div>
              <p className="text-base font-semibold text-white">Admin Ke</p>
              <p className="text-xs" style={{ color: "#a3a3a3" }}>
                admin@rentke.co.ke
              </p>
            </div>
          </div>

          <div className="space-y-1">
            {[
              { icon: LayoutDashboard, label: "Dashboard", onClick: () => { closeSheet(); router.push("/admin"); } },
              { icon: Users, label: "Landlords", onClick: () => { closeSheet(); router.push("/admin/landlords"); } },
              { icon: Building2, label: "Listings", onClick: () => { closeSheet(); router.push("/admin/listings"); } },
              { icon: Wallet, label: "Wallet", onClick: () => { closeSheet(); router.push("/admin/wallet"); } },
              { icon: Headset, label: "Support & Disputes", onClick: () => { closeSheet(); router.push("/admin/support"); } },
              { icon: Settings, label: "Settings", onClick: () => { closeSheet(); router.push("/admin/settings"); } },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <button
                  key={i}
                  onClick={item.onClick}
                  className="w-full flex items-center gap-4 p-3.5 rounded-xl"
                  style={{ background: "transparent" }}
                >
                  <Icon className="w-5 h-5" style={{ color: "#a3a3a3" }} />
                  <span className="text-sm font-medium text-white">{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <button
              onClick={() => { closeSheet(); setTimeout(() => showSnackbar("Logged out successfully", "info"), 300); }}
              className="w-full flex items-center gap-4 p-3.5 rounded-xl"
              style={{ background: "rgba(239,68,68,0.08)" }}
            >
              <XCircle className="w-5 h-5" style={{ color: "#ef4444" }} />
              <span className="text-sm font-medium" style={{ color: "#ef4444" }}>
                Log Out
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ──────────── SNACKBAR ──────────── */}
      <div className={`snackbar ${snackbar.visible ? "show" : "hide"}`}>
        <div className="flex items-center gap-3">
          <div>
            {snackbar.type === "success" && (
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center"
                style={{ background: "rgba(4,120,87,0.2)" }}
              >
                <Check className="w-3.5 h-3.5" style={{ color: "#059669" }} />
              </div>
            )}
            {snackbar.type === "error" && (
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center"
                style={{ background: "rgba(239,68,68,0.2)" }}
              >
                <X className="w-3.5 h-3.5" style={{ color: "#ef4444" }} />
              </div>
            )}
            {snackbar.type === "info" && (
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center"
                style={{ background: "rgba(59,130,246,0.2)" }}
              >
                <Info className="w-3.5 h-3.5" style={{ color: "#3b82f6" }} />
              </div>
            )}
          </div>
          <div className="flex-1">
            <span className="text-sm font-medium text-white">{snackbar.message}</span>
          </div>
          <button onClick={() => setSnackbar((s) => ({ ...s, visible: false }))} className="p-1">
            <X className="w-4 h-4" style={{ color: "#525252" }} />
          </button>
        </div>
      </div>
    </div>
  );
}

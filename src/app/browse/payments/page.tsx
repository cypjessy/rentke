"use client";

import { useState } from "react";
import {
  ArrowLeft,
  HelpCircle,
  Clock,
  CheckCircle,
  XCircle,
  Wallet,
  Check,
  X,
  Info,
  Download,
  FileText,
  RefreshCw,
  Upload,
  ArrowDownLeft,
  ArrowUpRight,
  Landmark,
  Home,
  Receipt,
} from "lucide-react";
import { useBrowse } from "../BrowseContext";

// ---- Types ----
type PaymentStatus = "pending" | "confirmed" | "rejected";
type TabType = "history" | "deposit";
type PayMethod = "mpesa" | "bank";

interface PaymentData {
  period: string;
  amount: string;
  ref: string;
  date: string;
  unit: string;
  status: PaymentStatus;
  verified: string;
  reason?: string;
}

const historyData: PaymentData[] = [
  { period: "January 2025", amount: "KSh 35,000", ref: "SHK4F7G2V", date: "Jan 3, 2025 · 2:34 PM", unit: "Unit A2 · Kilimani", status: "pending", verified: "—" },
  { period: "December 2024", amount: "KSh 35,000", ref: "RHK5M8N3P", date: "Dec 4, 2024 · 10:15 AM", unit: "Unit A2 · Kilimani", status: "confirmed", verified: "James Mwangi" },
  { period: "November 2024", amount: "KSh 35,000", ref: "THK9P4Q7W", date: "Nov 3, 2024 · 9:00 AM", unit: "Unit A2 · Kilimani", status: "confirmed", verified: "James Mwangi" },
  { period: "October 2024", amount: "KSh 35,000", ref: "UHK2J1R4Y", date: "Oct 6, 2024 · 4:20 PM", unit: "Unit A2 · Kilimani", status: "rejected", verified: "—", reason: "Screenshot was unclear. Please resubmit with a clearer image." },
];

const statusMeta: Record<PaymentStatus, { label: string; color: string; bg: string }> = {
  pending: { label: "Pending", color: "#eab308", bg: "rgba(234,179,8,0.15)" },
  confirmed: { label: "Confirmed", color: "#059669", bg: "rgba(4,120,87,0.15)" },
  rejected: { label: "Rejected", color: "#ef4444", bg: "rgba(239,68,68,0.15)" },
};

const statusIcons: Record<PaymentStatus, typeof Clock> = {
  pending: Clock,
  confirmed: CheckCircle,
  rejected: XCircle,
};

export default function PaymentsPage() {
  const { showSnackbar } = useBrowse();

  const [activeTab, setActiveTab] = useState<TabType>("history");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [sheetOpen, setSheetOpen] = useState<string | null>(null);
  const [fileUploaded, setFileUploaded] = useState(false);
  const [txCode, setTxCode] = useState("");
  const [payMethod, setPayMethod] = useState<PayMethod>("mpesa");
  const [loading, setLoading] = useState<string | null>(null);

  const current = historyData[currentIdx];

  const openSheet = (name: string) => {
    setSheetOpen(name);
    document.body.style.overflow = "hidden";
  };
  const closeSheet = () => {
    setSheetOpen(null);
    document.body.style.overflow = "";
  };

  const handleFileSelect = () => {
    const input = document.getElementById("pay-file-input") as HTMLInputElement | null;
    input?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFileUploaded(true);
      showSnackbar("Screenshot uploaded", "success");
    }
  };

  const openPaySheet = () => {
    setFileUploaded(false);
    setTxCode("");
    openSheet("pay");
  };

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
            onClick={() => window.history.back()}
            className="w-10 h-10 rounded-full flex items-center justify-center ripple-container"
            style={{ background: "rgba(255,255,255,0.05)" }}
          >
            <ArrowLeft className="w-5 h-5" style={{ color: "#a3a3a3" }} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white">Payments</h1>
            <p className="text-xs" style={{ color: "#a3a3a3" }}>Unit A2 · Kilimani Apartment</p>
          </div>
        </div>
        <button
          onClick={() => showSnackbar("Help & Support", "info")}
          className="w-10 h-10 rounded-full flex items-center justify-center ripple-container"
          style={{ background: "rgba(255,255,255,0.05)" }}
        >
          <HelpCircle className="w-5 h-5" style={{ color: "#a3a3a3" }} />
        </button>
      </header>

      <div style={{ animation: "slideInUp 0.5s ease", paddingBottom: 24 }}>
        {/* ====== BALANCE CARD ====== */}
        <div
          className="mx-5 mb-5 rounded-3xl p-5 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg,#047857,#059669)",
            boxShadow: "0 8px 32px rgba(4,120,87,0.3)",
          }}
        >
          <div
            className="absolute top-0 right-0 w-40 h-40 rounded-full"
            style={{
              background: "rgba(255,255,255,0.08)",
              filter: "blur(50px)",
              transform: "translate(30%,-30%)",
            }}
          />
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.8)" }}>
              Rent Due
            </p>
            <span
              className="text-xs font-medium px-2.5 py-1 rounded-full"
              style={{ background: "rgba(255,255,255,0.2)", color: "white" }}
            >
              Jan 2025
            </span>
          </div>
          <p className="text-3xl font-bold text-white">KSh 35,000</p>
          <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.6)" }}>
            Due: 5th January 2025
          </p>
          <button
            onClick={openPaySheet}
            className="w-full mt-4 py-3.5 rounded-2xl font-bold text-base ripple-container"
            style={{
              background: "rgba(0,0,0,0.2)",
              color: "white",
              backdropFilter: "blur(4px)",
              border: "1px solid rgba(255,255,255,0.15)",
            }}
          >
            Pay Rent Now
          </button>
        </div>

        {/* ====== TABS ====== */}
        <div className="flex gap-2 px-5 mb-4">
          <button
            onClick={() => setActiveTab("history")}
            className={`tab-btn ${activeTab === "history" ? "active" : ""}`}
          >
            Payment History
          </button>
          <button
            onClick={() => setActiveTab("deposit")}
            className={`tab-btn ${activeTab === "deposit" ? "active" : ""}`}
          >
            Deposit Status
          </button>
        </div>

        {/* ====== HISTORY TAB ====== */}
        {activeTab === "history" && (
          <div className="px-5" style={{ animation: "slideInUp 0.3s ease" }}>
            <div
              className="space-y-0"
              style={{
                background: "#1A1D21",
                borderRadius: 16,
                padding: "4px 16px",
                border: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              {historyData.map((item, idx) => {
                const SIcon = statusIcons[item.status];
                const sm = statusMeta[item.status];
                return (
                  <div
                    key={idx}
                    className="payment-row"
                    onClick={() => {
                      setCurrentIdx(idx);
                      openSheet("detail");
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: sm.bg }}
                    >
                      <SIcon className="w-5 h-5" style={{ color: sm.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-white">{item.period}</p>
                        <p className="text-sm font-bold" style={{ color: sm.color }}>
                          {item.amount}
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-xs" style={{ color: "#525252" }}>
                          {item.status === "confirmed"
                            ? `Confirmed · ${item.date.split("·")[0].trim()}`
                            : item.date.split("·")[0].trim()}
                        </span>
                        <span
                          className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: sm.bg, color: sm.color, fontSize: 10 }}
                        >
                          {sm.label}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ====== DEPOSIT TAB ====== */}
        {activeTab === "deposit" && (
          <div className="px-5" style={{ animation: "slideInUp 0.3s ease" }}>
            {/* Deposit Card */}
            <div
              className="rounded-2xl p-5 mb-4"
              style={{ background: "#1A1D21", border: "1px solid rgba(255,255,255,0.05)" }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white">Security Deposit</h3>
                <span
                  className="text-xs font-semibold flex items-center gap-1 px-2.5 py-1 rounded-full"
                  style={{ background: "rgba(234,179,8,0.15)", color: "#eab308" }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#eab308" }} />
                  Held
                </span>
              </div>
              <p className="text-3xl font-bold text-white">KSh 35,000</p>
              <p className="text-xs mt-1" style={{ color: "#525252" }}>
                Paid on move-in · Oct 1, 2024
              </p>
              <div className="mt-5 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex justify-between mb-2">
                  <span className="text-xs" style={{ color: "#525252" }}>
                    Deposit Status
                  </span>
                  <span className="text-xs font-semibold" style={{ color: "#eab308" }}>
                    Held until vacating
                  </span>
                </div>
                <div
                  className="w-full h-2 rounded-full"
                  style={{ background: "rgba(255,255,255,0.06)" }}
                >
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: "100%",
                      background: "linear-gradient(to right,#eab308,#f59e0b)",
                    }}
                  />
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-xs" style={{ color: "#525252" }}>
                    Paid
                  </span>
                  <span className="text-xs" style={{ color: "#525252" }}>
                    Refund on vacating
                  </span>
                </div>
              </div>
            </div>

            {/* Breakdown */}
            <div
              className="rounded-2xl p-5 mb-4"
              style={{ background: "#1A1D21", border: "1px solid rgba(255,255,255,0.05)" }}
            >
              <h3 className="text-sm font-bold text-white mb-3">Breakdown</h3>
              {[
                {
                  icon: ArrowDownLeft,
                  color: "#059669",
                  bg: "rgba(4,120,87,0.15)",
                  label: "Deposit Paid",
                  value: "+KSh 35,000",
                  valueColor: "#059669",
                },
                {
                  icon: ArrowUpRight,
                  color: "#ef4444",
                  bg: "rgba(239,68,68,0.1)",
                  label: "Damages (if any)",
                  value: "KSh 0",
                  valueColor: "#a3a3a3",
                },
                {
                  icon: ArrowUpRight,
                  color: "#ef4444",
                  bg: "rgba(239,68,68,0.1)",
                  label: "Unpaid utilities",
                  value: "KSh 0",
                  valueColor: "#a3a3a3",
                },
                {
                  icon: Wallet,
                  color: "#3b82f6",
                  bg: "rgba(59,130,246,0.1)",
                  label: "Net Refund",
                  value: "KSh 35,000",
                  valueColor: "#3b82f6",
                },
              ].map((row, i) => (
                <div key={i} className="deduction-row">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: row.bg }}
                    >
                      <row.icon className="w-4 h-4" style={{ color: row.color }} />
                    </div>
                    <span className="text-sm text-white">{row.label}</span>
                  </div>
                  <span className="text-sm font-semibold" style={{ color: row.valueColor }}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>

            {/* Info */}
            <div
              className="p-4 rounded-xl mb-6"
              style={{
                background: "rgba(59,130,246,0.06)",
                border: "1px solid rgba(59,130,246,0.1)",
              }}
            >
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#3b82f6" }} />
                <div>
                  <p className="text-sm" style={{ color: "#a3a3a3" }}>
                    Your deposit is held securely. Deductions (if any) will be itemized when you
                    vacate. Refund is processed within 14 days of move-out.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ============================================ */}
      {/* SHEET: PAY RENT */}
      {/* ============================================ */}
      <div
        className={`bs-overlay ${sheetOpen === "pay" ? "active" : ""}`}
        onClick={closeSheet}
      />
      <div
        id="sheet-pay"
        className={`bs ${sheetOpen === "pay" ? "active" : ""}`}
        style={{ maxHeight: "95dvh" }}
      >
        <div className="bs-handle" />
        <div className="p-5 pb-8">
          <h3 className="text-lg font-bold text-white mb-4">Pay Rent</h3>

          {/* Amount Due */}
          <div
            className="text-center mb-5 p-4 rounded-2xl"
            style={{
              background: "rgba(4,120,87,0.08)",
              border: "1px solid rgba(4,120,87,0.15)",
            }}
          >
            <p className="text-xs" style={{ color: "#059669" }}>
              Amount Due
            </p>
            <p className="text-2xl font-bold text-white mt-1">KSh 35,000</p>
            <p className="text-xs mt-1" style={{ color: "#525252" }}>
              January 2025 · Due Jan 5
            </p>
          </div>

          {/* Payment Method */}
          <div className="mb-4">
            <label className="text-xs font-semibold mb-2 block" style={{ color: "#a3a3a3" }}>
              PAYMENT METHOD
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setPayMethod("mpesa")}
                className="text-xs font-semibold px-4 py-3 rounded-xl flex items-center gap-2"
                style={
                  payMethod === "mpesa"
                    ? {
                        background: "rgba(79,180,79,0.15)",
                        border: "1.5px solid rgba(79,180,79,0.3)",
                        color: "#4fb34f",
                      }
                    : {
                        background: "rgba(255,255,255,0.03)",
                        border: "1.5px solid rgba(255,255,255,0.08)",
                        color: "#a3a3a3",
                      }
                }
              >
                <Wallet className="w-4 h-4" /> M-Pesa
              </button>
              <button
                onClick={() => setPayMethod("bank")}
                className="text-xs font-semibold px-4 py-3 rounded-xl flex items-center gap-2"
                style={
                  payMethod === "bank"
                    ? {
                        background: "rgba(59,130,246,0.15)",
                        border: "1.5px solid rgba(59,130,246,0.3)",
                        color: "#3b82f6",
                      }
                    : {
                        background: "rgba(255,255,255,0.03)",
                        border: "1.5px solid rgba(255,255,255,0.08)",
                        color: "#a3a3a3",
                      }
                }
              >
                <Landmark className="w-4 h-4" /> Bank
              </button>
            </div>
          </div>

          {/* Paybill Info */}
          {payMethod === "mpesa" && (
            <div
              className="mb-4 p-4 rounded-xl"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <p className="text-xs font-semibold mb-3" style={{ color: "#a3a3a3" }}>
                SEND PAYMENT TO:
              </p>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm" style={{ color: "#525252" }}>
                  Paybill
                </span>
                <span className="text-sm font-bold text-white font-mono">174379</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm" style={{ color: "#525252" }}>
                  Account
                </span>
                <span className="text-sm font-bold text-white font-mono">A2-KIL-001</span>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText("Paybill: 174379\nAccount: A2-KIL-001");
                  showSnackbar("Paybill details copied!", "success");
                }}
                className="w-full mt-2 py-2 rounded-lg text-xs font-medium"
                style={{ background: "rgba(79,180,79,0.1)", color: "#4fb34f" }}
              >
                Copy Paybill Details
              </button>
            </div>
          )}

          {/* Transaction Code */}
          <div className="mb-4">
            <label className="text-xs font-semibold mb-2 block" style={{ color: "#a3a3a3" }}>
              M-PESA TRANSACTION CODE
            </label>
            <input
              type="text"
              value={txCode}
              onChange={(e) => setTxCode(e.target.value.toUpperCase())}
              className="android-input font-mono uppercase"
              placeholder="e.g. SHK4F7G2V"
              maxLength={10}
            />
          </div>

          {/* Upload Screenshot */}
          <div className="mb-5">
            <label className="text-xs font-semibold mb-2 block" style={{ color: "#a3a3a3" }}>
              UPLOAD M-PESA SCREENSHOT
            </label>
            <div
              onClick={handleFileSelect}
              style={{
                border: `2px dashed ${
                  fileUploaded ? "rgba(4,120,87,0.4)" : "rgba(255,255,255,0.1)"
                }`,
                borderRadius: 16,
                padding: 24,
                textAlign: "center",
                cursor: "pointer",
                transition: "all 0.2s ease",
                background: fileUploaded ? "rgba(4,120,87,0.05)" : "rgba(255,255,255,0.02)",
              }}
            >
              {!fileUploaded ? (
                <div>
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                    style={{ background: "rgba(4,120,87,0.15)" }}
                  >
                    <Upload className="w-6 h-6" style={{ color: "#059669" }} />
                  </div>
                  <p className="text-sm font-medium text-white">Tap to upload</p>
                  <p className="text-xs mt-1" style={{ color: "#525252" }}>
                    JPG, PNG up to 5MB
                  </p>
                </div>
              ) : (
                <div>
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                    style={{ background: "rgba(4,120,87,0.2)" }}
                  >
                    <CheckCircle className="w-6 h-6" style={{ color: "#059669" }} />
                  </div>
                  <p className="text-sm font-medium" style={{ color: "#059669" }}>
                    Screenshot uploaded
                  </p>
                  <p className="text-xs mt-1" style={{ color: "#525252" }}>
                    mpesa_receipt.jpg
                  </p>
                </div>
              )}
            </div>
            <input
              id="pay-file-input"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Submit */}
          <button
            onClick={() => {
              if (!txCode.trim() || !fileUploaded) {
                showSnackbar("Please fill in all details", "error");
                return;
              }
              setLoading("pay");
              setTimeout(() => {
                setLoading(null);
                closeSheet();
                setTimeout(() => openSheet("success"), 300);
              }, 2000);
            }}
            className="w-full py-3.5 rounded-xl font-semibold text-sm text-white ripple-container flex items-center justify-center gap-2"
            style={{
              background: loading === "pay" ? "rgba(4,120,87,0.5)" : "#047857",
              boxShadow: "0 4px 16px rgba(4,120,87,0.3)",
            }}
            disabled={loading === "pay"}
          >
            {loading === "pay" ? (
              <div className="spinner" style={{ width: 18, height: 18 }} />
            ) : (
              "Submit Payment"
            )}
          </button>
          <p className="text-xs text-center mt-3" style={{ color: "#525252" }}>
            Your payment will be verified by the landlord
          </p>
        </div>
      </div>

      {/* ============================================ */}
      {/* SHEET: PAYMENT DETAIL */}
      {/* ============================================ */}
      <div
        className={`bs-overlay ${sheetOpen === "detail" ? "active" : ""}`}
        onClick={closeSheet}
      />
      <div
        id="sheet-detail"
        className={`bs ${sheetOpen === "detail" ? "active" : ""}`}
        style={{ maxHeight: "90dvh" }}
      >
        <div className="bs-handle" />
        <div className="p-5 pb-8">
          {current && (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Payment Detail</h3>
                <span
                  className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                  style={{
                    background: statusMeta[current.status].bg,
                    color: statusMeta[current.status].color,
                  }}
                >
                  {statusMeta[current.status].label}
                </span>
              </div>

              <div className="text-center mb-5">
                <p className="text-2xl font-bold text-white">{current.amount}</p>
                <p className="text-sm mt-1" style={{ color: "#a3a3a3" }}>
                  {current.period}
                </p>
              </div>

              <div className="space-y-0 mb-5">
                <div
                  className="flex justify-between py-3"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                >
                  <span className="text-sm" style={{ color: "#525252" }}>
                    M-Pesa Ref
                  </span>
                  <span className="text-sm font-medium text-white font-mono">{current.ref}</span>
                </div>
                <div
                  className="flex justify-between py-3"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                >
                  <span className="text-sm" style={{ color: "#525252" }}>
                    Submitted
                  </span>
                  <span className="text-sm font-medium text-white">{current.date}</span>
                </div>
                <div
                  className="flex justify-between py-3"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                >
                  <span className="text-sm" style={{ color: "#525252" }}>
                    Property
                  </span>
                  <span className="text-sm font-medium text-white">{current.unit}</span>
                </div>
                {current.status === "confirmed" && (
                  <div className="flex justify-between py-3">
                    <span className="text-sm" style={{ color: "#525252" }}>
                      Verified by
                    </span>
                    <span className="text-sm font-medium text-white">{current.verified}</span>
                  </div>
                )}
              </div>

              {/* Screenshot preview */}
              {current.status !== "rejected" && (
                <div className="mb-5">
                  <p className="text-xs font-semibold mb-2" style={{ color: "#a3a3a3" }}>
                    PAYMENT PROOF
                  </p>
                  <div
                    className="rounded-xl overflow-hidden"
                    style={{ border: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <div
                      className="w-full h-36 flex items-center justify-center"
                      style={{ background: "rgba(255,255,255,0.05)" }}
                    >
                      <Receipt className="w-10 h-10" style={{ color: "#525252" }} />
                    </div>
                  </div>
                </div>
              )}

              {/* Rejection Reason */}
              {current.status === "rejected" && current.reason && (
                <div
                  className="p-3 rounded-xl mb-5"
                  style={{
                    background: "rgba(239,68,68,0.08)",
                    border: "1px solid rgba(239,68,68,0.15)",
                  }}
                >
                  <p className="text-xs font-semibold mb-1" style={{ color: "#ef4444" }}>
                    Rejection Reason
                  </p>
                  <p className="text-sm" style={{ color: "#a3a3a3" }}>
                    {current.reason}
                  </p>
                </div>
              )}

              {/* Pending notice */}
              {current.status === "pending" && (
                <div
                  className="p-3 rounded-xl mb-4 flex items-center gap-2"
                  style={{
                    background: "rgba(234,179,8,0.06)",
                    border: "1px solid rgba(234,179,8,0.1)",
                  }}
                >
                  <Clock className="w-4 h-4" style={{ color: "#eab308" }} />
                  <span className="text-sm" style={{ color: "#eab308" }}>
                    Waiting for landlord verification
                  </span>
                </div>
              )}

              {/* Confirmed actions */}
              {current.status === "confirmed" && (
                <button
                  onClick={() => {
                    closeSheet();
                    setTimeout(() => openSheet("receipt"), 300);
                  }}
                  className="w-full py-3.5 rounded-xl font-semibold text-sm text-white ripple-container flex items-center justify-center gap-2"
                  style={{
                    background: "#047857",
                    boxShadow: "0 4px 16px rgba(4,120,87,0.3)",
                  }}
                >
                  <FileText className="w-4 h-4" /> Download Receipt
                </button>
              )}

              {/* Rejected actions */}
              {current.status === "rejected" && (
                <button
                  onClick={() => {
                    closeSheet();
                    setTimeout(() => {
                      setFileUploaded(false);
                      setTxCode("");
                      openSheet("pay");
                    }, 300);
                  }}
                  className="w-full py-3.5 rounded-xl font-semibold text-sm text-white ripple-container flex items-center justify-center gap-2"
                  style={{
                    background: "#047857",
                    boxShadow: "0 4px 16px rgba(4,120,87,0.3)",
                  }}
                >
                  <RefreshCw className="w-4 h-4" /> Resubmit Payment
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* ============================================ */}
      {/* SHEET: RECEIPT */}
      {/* ============================================ */}
      <div
        className={`bs-overlay ${sheetOpen === "receipt" ? "active" : ""}`}
        onClick={closeSheet}
      />
      <div
        id="sheet-receipt"
        className={`bs ${sheetOpen === "receipt" ? "active" : ""}`}
        style={{ maxHeight: "90dvh" }}
      >
        <div className="bs-handle" />
        <div className="p-5 pb-8">
          <h3 className="text-lg font-bold text-white mb-4">Receipt</h3>
          <div
            className="receipt-box mb-5"
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px dashed rgba(255,255,255,0.1)",
              borderRadius: 16,
              padding: 20,
            }}
          >
            <div
              className="text-center mb-4 pb-4"
              style={{ borderBottom: "1px dashed rgba(255,255,255,0.1)" }}
            >
              <div
                className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-2"
                style={{ background: "linear-gradient(135deg,#047857,#059669)" }}
              >
                <Home className="w-6 h-6 text-white" />
              </div>
              <p className="text-base font-bold text-white">RentKe Receipt</p>
              <p className="text-xs" style={{ color: "#525252" }}>
                Official Payment Confirmation
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-xs" style={{ color: "#525252" }}>
                  Receipt No
                </span>
                <span className="text-xs font-mono font-semibold text-white">RNT-2025-0041</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs" style={{ color: "#525252" }}>
                  Date
                </span>
                <span className="text-xs font-medium text-white">Dec 4, 2024</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs" style={{ color: "#525252" }}>
                  Tenant
                </span>
                <span className="text-xs font-medium text-white">John Njoroge</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs" style={{ color: "#525252" }}>
                  Property
                </span>
                <span className="text-xs font-medium text-white">Unit A2 · Kilimani Apt</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs" style={{ color: "#525252" }}>
                  Period
                </span>
                <span className="text-xs font-medium text-white">December 2024</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs" style={{ color: "#525252" }}>
                  M-Pesa Ref
                </span>
                <span className="text-xs font-mono font-medium text-white">RHK5M8N3P</span>
              </div>
              <div className="pt-3 mt-2" style={{ borderTop: "1px dashed rgba(255,255,255,0.1)" }}>
                <div className="flex justify-between">
                  <span className="text-sm font-semibold" style={{ color: "#a3a3a3" }}>
                    Amount Paid
                  </span>
                  <span className="text-lg font-bold" style={{ color: "#059669" }}>
                    KSh 35,000
                  </span>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-xs" style={{ color: "#525252" }}>
                  Landlord
                </span>
                <span className="text-xs font-medium text-white">James Mwangi</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => showSnackbar("Receipt PDF downloaded", "success")}
            className="w-full py-3.5 rounded-xl font-semibold text-sm text-white ripple-container flex items-center justify-center gap-2"
            style={{
              background: "#047857",
              boxShadow: "0 4px 16px rgba(4,120,87,0.3)",
            }}
          >
            <Download className="w-4 h-4" /> Download PDF
          </button>
        </div>
      </div>

      {/* ============================================ */}
      {/* SHEET: SUCCESS */}
      {/* ============================================ */}
      <div
        className={`bs-overlay ${sheetOpen === "success" ? "active" : ""}`}
        onClick={closeSheet}
      />
      <div
        id="sheet-success"
        className={`bs ${sheetOpen === "success" ? "active" : ""}`}
        style={{ maxHeight: "70dvh" }}
      >
        <div className="bs-handle" />
        <div className="p-5 pb-8 text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: "rgba(4,120,87,0.15)" }}
          >
            <Check className="w-8 h-8" style={{ color: "#059669" }} />
          </div>
          <h3 className="text-xl font-bold text-white mb-1">Payment Submitted!</h3>
          <p className="text-sm mb-6" style={{ color: "#a3a3a3" }}>
            Your landlord will verify your payment. You'll be notified once confirmed.
          </p>
          <div
            className="p-3 rounded-xl mb-5"
            style={{
              background: "rgba(234,179,8,0.06)",
              border: "1px solid rgba(234,179,8,0.1)",
            }}
          >
            <p className="text-xs" style={{ color: "#eab308" }}>
              ⏳ Verification usually takes 1-24 hours
            </p>
          </div>
          <button
            onClick={closeSheet}
            className="w-full py-3.5 rounded-xl font-semibold text-sm text-white ripple-container"
            style={{
              background: "#047857",
              boxShadow: "0 4px 16px rgba(4,120,87,0.3)",
            }}
          >
            Done
          </button>
        </div>
      </div>

      <style jsx>{`
        .payment-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 0;
          border-bottom: 1px solid rgba(255,255,255,0.04);
          cursor: pointer;
          transition: background 0.15s ease;
        }
        .payment-row:last-child {
          border-bottom: none;
        }
        .payment-row:active {
          background: rgba(255,255,255,0.02);
          margin: 0 -20px;
          padding: 14px 20px;
        }
        .deduction-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid rgba(255,255,255,0.04);
        }
        .deduction-row:last-child {
          border-bottom: none;
        }
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
        .receipt-box {
          background: rgba(255,255,255,0.02);
          border: 1px dashed rgba(255,255,255,0.1);
          border-radius: 16px;
          padding: 20px;
        }
      `}</style>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Bell,
  Home,
  Phone,
  MessageCircle,
  Flame,
  Shield,
  Zap,
  Smartphone,
  ChevronRight,
  CheckCircle,
  PlusCircle,
  FileText,
  ScrollText,
  ClipboardList,
  DoorOpen,
  Camera,
  Check,
  X,
  Info,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../AuthContext";
import { listenToTenantUnits, type UnitData } from "../../../lib/units";
import { db } from "../../../lib/firebase";
import {
  collection,
  doc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { listenToProperties } from "../../../lib/properties";

type SnackbarType = "success" | "error" | "info";

export default function MyUnitPage() {
  const router = useRouter();
  const { user } = useAuth();

  // ---- Unit Data ----
  const [unit, setUnit] = useState<UnitData | null>(null);
  const [unitLoading, setUnitLoading] = useState(true);
  const [propertyName, setPropertyName] = useState("");
  const [propertyLocation, setPropertyLocation] = useState("");

  // ---- Tab State ----
  const [activeTab, setActiveTab] = useState("overview");

  // ---- Sheet State ----
  const [activeSheet, setActiveSheet] = useState<string | null>(null);

  // ---- Form State ----
  const [payMethod, setPayMethod] = useState("mpesa");
  const [mpesaCode, setMpesaCode] = useState("");
  const [bankRef, setBankRef] = useState("");
  const [complaintCategory, setComplaintCategory] = useState("Plumbing");
  const [complaintDesc, setComplaintDesc] = useState("");
  const [vacatingReason, setVacatingReason] = useState("Relocating");
  const [vacatingNotes, setVacatingNotes] = useState("");

  // ---- Snackbar ----
  const [snackbar, setSnackbar] = useState<{ show: boolean; message: string; type: SnackbarType }>({ show: false, message: "", type: "info" });
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarAnimClass, setSnackbarAnimClass] = useState("");

  // ---- Listen to tenant's unit ----
  useEffect(() => {
    if (!user) {
      setUnitLoading(false);
      return;
    }
    setUnitLoading(true);
    const unsub = listenToTenantUnits(
      user.uid,
      (units) => {
        // Take the first matching unit (tenant should only have one)
        const myUnit = units[0] || null;
        setUnit(myUnit);
        setUnitLoading(false);
      },
      (err) => {
        console.error("Error loading tenant unit:", err);
        setUnitLoading(false);
      }
    );
    return () => unsub();
  }, [user]);

  // ---- Look up property details for landlord info ----
  useEffect(() => {
    if (!unit || !unit.landlordId) return;
    const unsub = listenToProperties(
      unit.landlordId,
      (props) => {
        const prop = props.find((p) => p.id === unit.propertyId);
        if (prop) {
          setPropertyName(prop.name);
          setPropertyLocation(prop.location);
        }
      },
      () => {}
    );
    return () => unsub();
  }, [unit?.propertyId, unit?.landlordId]);

  // ---- Snackbar ----
  useEffect(() => {
    if (snackbar.show) {
      setSnackbarVisible(true);
      setSnackbarAnimClass("show");
    } else {
      setSnackbarAnimClass("hide");
      const timeout = setTimeout(() => {
        setSnackbarVisible(false);
        setSnackbarAnimClass("");
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [snackbar.show]);

  const showSnackbar = (message: string, type: SnackbarType = "info") => {
    setSnackbar({ show: true, message, type });
    setTimeout(() => {
      setSnackbar({ show: false, message: "", type: "info" });
    }, 3000);
  };

  const hideSnackbar = () => setSnackbar({ show: false, message: "", type: "info" });

  const openSheet = (name: string) => setActiveSheet(name);
  const closeSheet = () => setActiveSheet(null);

  const [submitLoading, setSubmitLoading] = useState(false);

  const submitPayment = async () => {
    if (!unit || !user) return;
    setSubmitLoading(true);
    try {
      // Store payment proof in a subcollection or payments collection
      await addDoc(collection(db, "payments"), {
        unitId: unit.id,
        propertyId: unit.propertyId,
        landlordId: unit.landlordId,
        tenantId: user.uid,
        tenantName: unit.tenantName,
        amount: unit.rent,
        period: new Date().toISOString().slice(0, 7), // YYYY-MM
        method: payMethod,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      setSubmitLoading(false);
      closeSheet();
      setTimeout(() => showSnackbar("Payment proof submitted! Awaiting landlord verification.", "success"), 300);
    } catch (err: any) {
      setSubmitLoading(false);
      showSnackbar(err?.message || "Failed to submit payment", "error");
    }
  };

  const submitComplaint = async () => {
    if (!unit || !user) return;
    try {
      await addDoc(collection(db, "maintenance"), {
        propertyId: unit.propertyId,
        propertyName: unit.propertyName,
        unitId: unit.id,
        unitName: unit.name,
        landlordId: unit.landlordId,
        tenantId: user.uid,
        tenantName: unit.tenantName,
        title: complaintCategory,
        description: complaintDesc || "Complaint submitted via tenant portal",
        urgency: "Medium",
        status: "open",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setComplaintCategory("Plumbing");
      setComplaintDesc("");
      closeSheet();
      showSnackbar("Complaint submitted! ✅", "success");
    } catch (err: any) {
      showSnackbar(err?.message || "Failed to submit complaint", "error");
    }
  };

  const submitVacatingNotice = async () => {
    if (!unit || !user) return;
    try {
      await addDoc(collection(db, "vacatingNotices"), {
        propertyId: unit.propertyId,
        propertyName: unit.propertyName,
        unitId: unit.id,
        unitName: unit.name,
        landlordId: unit.landlordId,
        tenantId: user.uid,
        tenantName: unit.tenantName,
        reason: vacatingReason,
        notes: vacatingNotes,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      setVacatingReason("Relocating");
      setVacatingNotes("");
      closeSheet();
      showSnackbar("Vacating notice submitted! Landlord notified.", "success");
    } catch (err: any) {
      showSnackbar(err?.message || "Failed to submit vacating notice", "error");
    }
  };

  const snackbarIcon = () => {
    switch (snackbar.type) {
      case "success":
        return (
          <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(4,120,87,0.2)" }}>
            <Check className="w-3.5 h-3.5" style={{ color: "#047857" }} />
          </div>
        );
      case "error":
        return (
          <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(239,68,68,0.2)" }}>
            <X className="w-3.5 h-3.5" style={{ color: "#ef4444" }} />
          </div>
        );
      case "info":
        return (
          <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(59,130,246,0.2)" }}>
            <Info className="w-3.5 h-3.5" style={{ color: "#3b82f6" }} />
          </div>
        );
    }
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

  const tabs = ["overview", "payments", "complaints", "documents", "vacating"];

  const getDateStr = (ts: any) => {
    if (!ts?.toDate) return "";
    return ts.toDate().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  // ====== LOADING STATE ======
  if (unitLoading) {
    return (
      <div style={{ background: "#050505", color: "#e5e5e5", fontFamily: "'Inter', sans-serif", minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin mx-auto mb-3" style={{ color: "#3b82f6" }} />
          <p className="text-sm" style={{ color: "#a3a3a3" }}>Loading your unit...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "#050505", color: "#e5e5e5", fontFamily: "'Inter', sans-serif", minHeight: "100dvh" }}>
      <div className="status-bar" style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 60, background: "rgba(5,5,5,0.9)" }} />

      <div style={{ paddingTop: "env(safe-area-inset-top, 24px)", paddingBottom: "24px" }}>
        {/* TOP BAR */}
        <div className="top-bar flex items-center justify-between px-4 py-3" style={{ position: "sticky", top: 0, zIndex: 40, background: "rgba(5,5,5,0.9)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)" }}>
              <ArrowLeft className="w-5 h-5" style={{ color: "#a3a3a3" }} />
            </button>
            <div>
              <h1 className="text-lg font-bold text-white">My Unit</h1>
              <p className="text-xs" style={{ color: "#a3a3a3" }}>Tenant Portal</p>
            </div>
          </div>
          <button onClick={() => showSnackbar("Notifications", "info")} className="w-10 h-10 rounded-full flex items-center justify-center relative" style={{ background: "rgba(255,255,255,0.05)" }}>
            <Bell className="w-5 h-5" style={{ color: "#a3a3a3" }} />
            <div className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full" style={{ background: "#ef4444", border: "2px solid #0A0C10" }} />
          </button>
        </div>

        {!unit ? (
          /* ---- No Unit Assigned ---- */
          <div className="px-5 pt-10 text-center">
            <Home className="w-16 h-16 mx-auto mb-4" style={{ color: "#525252" }} />
            <h3 className="text-xl font-bold text-white">No Unit Assigned</h3>
            <p className="text-sm mt-2" style={{ color: "#a3a3a3" }}>
              You don't have a unit assigned yet. Contact your landlord to get set up.
            </p>
          </div>
        ) : (
          <>
            {/* UNIT CARD */}
            <div className="px-5 pt-4 pb-2" style={{ animation: "slideInUp 0.5s ease" }}>
              <div className="card p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #2563eb, #3b82f6)" }}>
                    <Home className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold text-white truncate">
                      {unit.name} — {unit.type}
                    </p>
                    <p className="text-xs" style={{ color: "#a3a3a3" }}>
                      {unit.propertyName}{unit.area ? ` · ${unit.area} sqft` : ""}
                    </p>
                  </div>
                  <span className="status-badge" style={{ fontSize: "11px", fontWeight: 600, padding: "4px 10px", borderRadius: "20px", background: "rgba(4,120,87,0.15)", color: "#059669" }}>
                    {unit.status}
                  </span>
                </div>
              </div>
            </div>

            {/* RENT STATUS BANNER */}
            <div className="px-5 pb-2">
              <div className="rounded-2xl p-4" style={{ background: unit.payment === "Paid" ? "rgba(4,120,87,0.08)" : "rgba(234,179,8,0.08)", border: `1px solid ${unit.payment === "Paid" ? "rgba(4,120,87,0.15)" : "rgba(234,179,8,0.15)"}` }}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-xs font-medium" style={{ color: unit.payment === "Paid" ? "#059669" : "#eab308" }}>
                      {new Date().toLocaleString("default", { month: "long" })} Rent
                    </p>
                    <p className="text-xl font-bold text-white">KSh {unit.rent.toLocaleString()}</p>
                  </div>
                  <span className="status-badge" style={{
                    fontSize: "11px", fontWeight: 600, padding: "4px 10px", borderRadius: "20px",
                    background: unit.payment === "Paid" ? "rgba(4,120,87,0.15)" : "rgba(234,179,8,0.15)",
                    color: unit.payment === "Paid" ? "#059669" : "#eab308",
                    display: "inline-flex", alignItems: "center", gap: "4px",
                  }}>
                    {unit.payment === "Paid" ? (
                      "Paid"
                    ) : (
                      <><span className="w-1.5 h-1.5 rounded-full" style={{ background: "#eab308" }}></span> Pending</>
                    )}
                  </span>
                </div>
                <p className="text-xs" style={{ color: "#a3a3a3" }}>
                  {unit.payment === "Paid" ? "All caught up! ✅" : `KSh ${unit.rent.toLocaleString()} due this month`}
                </p>
                <button onClick={() => openSheet("pay-rent")} className="w-full text-center mt-3 text-sm ripple-container flex items-center justify-center gap-2" style={{ background: "linear-gradient(to right, #2563eb, #3b82f6)", color: "white", fontWeight: 600, padding: "12px 20px", borderRadius: "12px", border: "none", cursor: "pointer", boxShadow: "0 4px 15px rgba(37,99,235,0.3)" }}>
                  <Smartphone className="w-4 h-4" /> Pay Rent Now
                </button>
              </div>
            </div>

            {/* TABS */}
            <div className="flex overflow-x-auto px-5 gap-1 border-b" style={{ borderColor: "rgba(255,255,255,0.04)", scrollbarWidth: "none" }}>
              {tabs.map((tab) => (
                <button
                  key={tab}
                  className="tab-btn"
                  style={{
                    padding: "12px 16px",
                    fontSize: "13px",
                    fontWeight: activeTab === tab ? 600 : 500,
                    color: activeTab === tab ? "#3b82f6" : "#a3a3a3",
                    borderBottom: activeTab === tab ? "2px solid #3b82f6" : "2px solid transparent",
                    whiteSpace: "nowrap",
                    transition: "all 0.2s ease",
                  }}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab === "overview" ? "Overview" : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* TAB CONTENT */}
            <div className="px-5 py-5 space-y-5">

              {/* ===== OVERVIEW ===== */}
              {activeTab === "overview" && (
                <div className="space-y-5">
                  {/* Landlord */}
                  <div className="card p-4">
                    <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#525252" }}>Landlord / Agent</p>
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: "linear-gradient(135deg, #047857, #059669)", color: "white" }}>
                        {unit.landlordId.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-white">{propertyName || unit.propertyName}</p>
                        <p className="text-xs" style={{ color: "#525252" }}>{propertyLocation || "Property contact"}</p>
                      </div>
                      <button onClick={() => showSnackbar("Calling landlord...", "info")} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(4,120,87,0.15)" }}>
                        <Phone className="w-4 h-4" style={{ color: "#059669" }} />
                      </button>
                      <button onClick={() => showSnackbar("Opening WhatsApp", "success")} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(37,211,102,0.15)" }}>
                        <MessageCircle className="w-4 h-4" style={{ color: "#25D366" }} />
                      </button>
                    </div>
                  </div>

                  {/* Lease Details */}
                  <div className="card">
                    {[
                      { label: "Lease Period", value: `${getDateStr(unit.leaseStart)} - ${getDateStr(unit.leaseEnd)}` || unit.leaseTerm || "Ongoing" },
                      { label: "Monthly Rent", value: `KSh ${unit.rent.toLocaleString()}`, color: "#3b82f6", bold: true },
                      { label: "Security Deposit", value: `KSh ${unit.deposit.toLocaleString()}` },
                      { label: "Unit Type", value: unit.type },
                      { label: "Status", value: unit.status, color: unit.status === "Occupied" ? "#059669" : "#ef4444" },
                    ].map((row, i) => (
                      <div
                        key={row.label}
                        className="card-row"
                        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderTop: i > 0 ? "1px solid rgba(255,255,255,0.04)" : undefined }}
                      >
                        <span className="text-sm" style={{ color: "#525252" }}>{row.label}</span>
                        <span className={`text-sm ${row.bold ? "font-bold" : "font-medium"} text-white`} style={row.color ? { color: row.color } : {}}>
                          {row.value}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Unit Info */}
                  <div className="card p-4">
                    <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#525252" }}>Unit Details</p>
                    <p className="text-sm" style={{ color: "#a3a3a3" }}>
                      {unit.description || `${unit.name} - ${unit.type} at ${unit.propertyName}`}
                    </p>
                    {unit.amenities && unit.amenities.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {unit.amenities.map((a, i) => (
                          <span key={i} className="chip" style={{ background: "rgba(59,130,246,0.1)", color: "#3b82f6" }}>{a}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Emergency Contacts */}
                  <div className="card p-4">
                    <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#525252" }}>Emergency Contacts</p>
                    <div className="space-y-3">
                      {[
                        { icon: Flame, label: "Fire Emergency", number: "991 / +254 720 000 000", color: "#ef4444", bg: "rgba(239,68,68,0.15)" },
                        { icon: Shield, label: "Police", number: "999 / 112", color: "#3b82f6", bg: "rgba(59,130,246,0.15)" },
                        { icon: Zap, label: "Kenya Power (KPLC)", number: "97771", color: "#059669", bg: "rgba(4,120,87,0.15)" },
                      ].map((contact) => (
                        <div key={contact.label} className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: contact.bg }}>
                            <contact.icon className="w-4 h-4" style={{ color: contact.color }} />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-white">{contact.label}</p>
                            <p className="text-xs" style={{ color: "#525252" }}>{contact.number}</p>
                          </div>
                          <button onClick={() => showSnackbar(`Dialling...`, "info")} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: contact.bg }}>
                            <Phone className="w-3.5 h-3.5" style={{ color: contact.color }} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ===== PAYMENTS ===== */}
              {activeTab === "payments" && (
                <div className="space-y-5">
                  <button onClick={() => openSheet("pay-rent")} className="card w-full p-4 text-left ripple-container" style={{ borderColor: "rgba(59,130,246,0.15)", background: "rgba(59,130,246,0.05)" }}>
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #2563eb, #3b82f6)" }}>
                        <Smartphone className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-white">
                          Pay Rent — {new Date().toLocaleString("default", { month: "long", year: "numeric" })}
                        </p>
                        <p className="text-xs" style={{ color: "#a3a3a3" }}>KSh {unit.rent.toLocaleString()}</p>
                      </div>
                      <ChevronRight className="w-5 h-5" style={{ color: "#525252" }} />
                    </div>
                  </button>

                  <div className="card p-4" style={{ background: unit.payment === "Paid" ? "rgba(4,120,87,0.03)" : "rgba(234,179,8,0.03)", borderColor: unit.payment === "Paid" ? "rgba(4,120,87,0.1)" : "rgba(234,179,8,0.1)" }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs" style={{ color: unit.payment === "Paid" ? "#059669" : "#eab308" }}>
                          {unit.payment === "Paid" ? "Current Balance" : "Outstanding Balance"}
                        </p>
                        <p className="text-xl font-bold text-white">KSh {unit.payment === "Paid" ? "0" : unit.rent.toLocaleString()}</p>
                      </div>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: unit.payment === "Paid" ? "rgba(4,120,87,0.15)" : "rgba(234,179,8,0.15)" }}>
                        {unit.payment === "Paid" ? (
                          <CheckCircle className="w-5 h-5" style={{ color: "#059669" }} />
                        ) : (
                          <AlertCircle className="w-5 h-5" style={{ color: "#eab308" }} />
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#525252" }}>Payment History</p>
                    <div className="card p-4 text-center">
                      <p className="text-sm" style={{ color: "#a3a3a3" }}>Payment history will appear here</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ===== COMPLAINTS ===== */}
              {activeTab === "complaints" && (
                <div className="space-y-5">
                  <button onClick={() => openSheet("submit-complaint")} className="w-full text-center flex items-center justify-center gap-2" style={{ background: "linear-gradient(to right, #2563eb, #3b82f6)", color: "white", fontWeight: 600, padding: "12px 20px", borderRadius: "12px", border: "none", cursor: "pointer", boxShadow: "0 4px 15px rgba(37,99,235,0.3)" }}>
                    <PlusCircle className="w-5 h-5" /> Submit Complaint
                  </button>
                  <div className="card p-6 text-center">
                    <AlertCircle className="w-10 h-10 mx-auto mb-3" style={{ color: "#525252" }} />
                    <p className="text-sm" style={{ color: "#a3a3a3" }}>Your complaints and maintenance requests will appear here</p>
                  </div>
                </div>
              )}

              {/* ===== DOCUMENTS ===== */}
              {activeTab === "documents" && (
                <div className="space-y-5">
                  <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#525252" }}>My Documents</p>
                  <div className="card">
                    {[
                      { icon: FileText, label: "Lease Agreement", meta: "View your lease", color: "#ef4444", bg: "rgba(239,68,68,0.15)" },
                      { icon: ScrollText, label: "Lease Term", meta: unit.leaseTerm || "Not set", color: "#eab308", bg: "rgba(234,179,8,0.15)" },
                      { icon: ClipboardList, label: "Unit Info", meta: `${unit.type} · ${unit.name}`, color: "#3b82f6", bg: "rgba(59,130,246,0.15)" },
                    ].map((doc, i) => (
                      <div
                        key={doc.label}
                        className="card-row"
                        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderTop: i > 0 ? "1px solid rgba(255,255,255,0.04)" : undefined }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: doc.bg }}>
                            <doc.icon className="w-4 h-4" style={{ color: doc.color }} />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{doc.label}</p>
                            <p className="text-xs" style={{ color: "#525252" }}>{doc.meta}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ===== VACATING ===== */}
              {activeTab === "vacating" && (
                <div className="space-y-5">
                  <div className="card overflow-hidden">
                    <div className="p-4" style={{ background: "rgba(59,130,246,0.05)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#3b82f6" }}>Security Deposit</p>
                        <span className="status-badge" style={{ fontSize: "11px", fontWeight: 600, padding: "4px 10px", borderRadius: "20px", background: "rgba(4,120,87,0.15)", color: "#059669" }}>Held</span>
                      </div>
                      <p className="text-2xl font-bold text-white mt-1">KSh {unit.deposit.toLocaleString()}</p>
                    </div>
                    <div className="card-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px" }}>
                      <span className="text-sm" style={{ color: "#525252" }}>Amount Paid</span>
                      <span className="text-sm font-medium text-white">KSh {unit.deposit.toLocaleString()}</span>
                    </div>
                    <div className="card-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                      <span className="text-sm" style={{ color: "#525252" }}>Deductions</span>
                      <span className="text-sm font-medium" style={{ color: "#059669" }}>KSh 0</span>
                    </div>
                    <div className="card-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderTop: "1px solid rgba(255,255,255,0.04)", background: "rgba(4,120,87,0.03)" }}>
                      <span className="text-sm font-bold text-white">Available for Refund</span>
                      <span className="text-sm font-bold" style={{ color: "#059669" }}>KSh {unit.deposit.toLocaleString()}</span>
                    </div>
                  </div>

                  <button onClick={() => openSheet("vacating-notice")} className="card w-full p-4 text-left" style={{ borderColor: "rgba(239,68,68,0.1)", cursor: "pointer" }}>
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "rgba(239,68,68,0.15)" }}>
                        <DoorOpen className="w-5 h-5" style={{ color: "#ef4444" }} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-white">Submit Vacating Notice</p>
                        <p className="text-xs" style={{ color: "#a3a3a3" }}>Give 30 days notice as per lease</p>
                      </div>
                      <ChevronRight className="w-5 h-5" style={{ color: "#525252" }} />
                    </div>
                  </button>

                  <div className="card">
                    <p className="text-xs font-bold uppercase tracking-widest px-4 pt-4 pb-2" style={{ color: "#525252" }}>Move-in Meter Readings</p>
                    <div className="card-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                      <span className="text-sm" style={{ color: "#525252" }}>KPLC Meter</span>
                      <span className="text-sm font-medium text-white">{unit.name} - {unit.type}</span>
                    </div>
                    <div className="card-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                      <span className="text-sm" style={{ color: "#525252" }}>Water Meter</span>
                      <span className="text-sm font-medium text-white">{unit.propertyName}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ========== SHEETS ========== */}

      {/* PAY RENT */}
      <div className={`sheet-overlay ${activeSheet === "pay-rent" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "pay-rent" ? "active" : ""}`} style={{ maxHeight: "90dvh" }}>
        <div className="sheet-handle" />
        <div className="p-5 pb-8">
          <h3 className="text-lg font-bold text-white mb-1">Pay Rent</h3>
          <p className="text-xs mb-4" style={{ color: "#a3a3a3" }}>Upload proof of M-Pesa payment</p>

          <div className="space-y-4">
            <div className="card">
              <div className="card-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px" }}>
                <span className="text-sm" style={{ color: "#525252" }}>Amount Due</span>
                <span className="text-sm font-bold text-white">KSh {unit?.rent.toLocaleString()}</span>
              </div>
              <div className="card-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                <span className="text-sm" style={{ color: "#525252" }}>Property</span>
                <span className="text-sm font-medium text-white">{unit?.propertyName}</span>
              </div>
              <div className="card-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                <span className="text-sm" style={{ color: "#525252" }}>Unit</span>
                <span className="text-sm font-medium text-white">{unit?.name}</span>
              </div>
            </div>

            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#525252" }}>Payment Method</p>
            <div className="flex gap-2">
              <button
                className="flex-1 text-xs font-semibold py-3 rounded-xl text-center"
                style={payMethod === "mpesa" ? { background: "rgba(79,180,79,0.15)", border: "1.5px solid rgba(79,180,79,0.3)", color: "#4fb34f" } : { background: "rgba(255,255,255,0.03)", border: "1.5px solid rgba(255,255,255,0.08)", color: "#a3a3a3" }}
                onClick={() => setPayMethod("mpesa")}
              >
                M-Pesa
              </button>
              <button
                className="flex-1 text-xs font-semibold py-3 rounded-xl text-center"
                style={payMethod === "bank" ? { background: "rgba(79,180,79,0.15)", border: "1.5px solid rgba(79,180,79,0.3)", color: "#4fb34f" } : { background: "rgba(255,255,255,0.03)", border: "1.5px solid rgba(255,255,255,0.08)", color: "#a3a3a3" }}
                onClick={() => setPayMethod("bank")}
              >
                Bank Transfer
              </button>
            </div>

            {payMethod === "mpesa" && (
              <>
                <div className="p-3 rounded-xl mb-3" style={{ background: "rgba(79,180,79,0.08)", border: "1px solid rgba(79,180,79,0.12)" }}>
                  <p className="text-xs" style={{ color: "#4fb34f" }}>Send payment to:</p>
                  <p className="text-sm font-bold text-white mt-1">Paybill: <span className="font-mono">174379</span></p>
                  <p className="text-sm font-bold text-white">Account: <span className="font-mono">{unit?.name.slice(0, 8).toUpperCase()}</span></p>
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1.5 block" style={{ color: "#a3a3a3" }}>M-PESA TRANSACTION CODE</label>
                  <input type="text" className="android-input font-mono uppercase" placeholder="e.g. SHK4F7G2V" maxLength={10} value={mpesaCode} onChange={(e) => setMpesaCode(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1.5 block" style={{ color: "#a3a3a3" }}>UPLOAD M-PESA SCREENSHOT</label>
                  <div className="w-full h-28 rounded-xl flex flex-col items-center justify-center cursor-pointer" style={{ border: "1.5px dashed rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.02)" }} onClick={() => showSnackbar("Camera/Gallery opened", "info")}>
                    <Camera className="w-8 h-8 mb-1" style={{ color: "#525252" }} />
                    <span className="text-sm font-medium" style={{ color: "#525252" }}>Tap to upload screenshot</span>
                  </div>
                </div>
              </>
            )}
            {payMethod === "bank" && (
              <>
                <div className="p-3 rounded-xl mb-3" style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.12)" }}>
                  <p className="text-xs" style={{ color: "#3b82f6" }}>Bank transfer details:</p>
                  <p className="text-sm font-bold text-white mt-1">KCB Bank · Account: 0123456789012</p>
                  <p className="text-sm font-bold text-white">Ref: {unit?.name.slice(0, 8).toUpperCase()}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1.5 block" style={{ color: "#a3a3a3" }}>BANK REFERENCE NUMBER</label>
                  <input type="text" className="android-input font-mono uppercase" placeholder="Enter bank ref" value={bankRef} onChange={(e) => setBankRef(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1.5 block" style={{ color: "#a3a3a3" }}>UPLOAD BANK SLIP</label>
                  <div className="w-full h-28 rounded-xl flex flex-col items-center justify-center cursor-pointer" style={{ border: "1.5px dashed rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.02)" }} onClick={() => showSnackbar("Camera/Gallery opened", "info")}>
                    <Camera className="w-8 h-8 mb-1" style={{ color: "#525252" }} />
                    <span className="text-sm font-medium" style={{ color: "#525252" }}>Tap to upload slip</span>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex gap-3 mt-5">
            <button onClick={closeSheet} className="btn-ghost flex-1 text-center" style={{ padding: "12px 20px", fontSize: "14px" }}>Cancel</button>
            <button
              onClick={submitPayment}
              disabled={submitLoading}
              className="flex-1 text-center"
              style={{ background: "linear-gradient(to right, #2563eb, #3b82f6)", color: "white", fontWeight: 600, padding: "12px 20px", borderRadius: "12px", border: "none", cursor: submitLoading ? "not-allowed" : "pointer", opacity: submitLoading ? 0.4 : 1, boxShadow: "0 4px 15px rgba(37,99,235,0.3)" }}
            >
              {submitLoading ? <div className="spinner mx-auto" /> : <span>Submit Proof</span>}
            </button>
          </div>
        </div>
      </div>

      {/* SUBMIT COMPLAINT */}
      <div className={`sheet-overlay ${activeSheet === "submit-complaint" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "submit-complaint" ? "active" : ""}`} style={{ maxHeight: "90dvh" }}>
        <div className="sheet-handle" />
        <div className="p-5 pb-8">
          <h3 className="text-lg font-bold text-white mb-4">Submit Complaint</h3>
          <p className="text-xs mb-3" style={{ color: "#a3a3a3" }}>
            For: {unit?.name} — {unit?.propertyName}
          </p>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: "#a3a3a3" }}>CATEGORY</label>
              <select className="android-input" style={{ appearance: "none" }} value={complaintCategory} onChange={(e) => setComplaintCategory(e.target.value)}>
                <option>Plumbing</option>
                <option>Electrical</option>
                <option>Noise</option>
                <option>Security</option>
                <option>Cleaning</option>
                <option>Structural</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: "#a3a3a3" }}>DESCRIPTION</label>
              <textarea className="android-input" rows={3} placeholder="Describe the issue in detail…" style={{ minHeight: "80px" }} value={complaintDesc} onChange={(e) => setComplaintDesc(e.target.value)}></textarea>
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={closeSheet} className="btn-ghost flex-1 text-center" style={{ padding: "12px 20px", fontSize: "14px" }}>Cancel</button>
            <button onClick={submitComplaint} className="flex-1 text-center" style={{ background: "linear-gradient(to right, #2563eb, #3b82f6)", color: "white", fontWeight: 600, padding: "12px 20px", borderRadius: "12px", border: "none", cursor: "pointer", boxShadow: "0 4px 15px rgba(37,99,235,0.3)" }}>
              Submit
            </button>
          </div>
        </div>
      </div>

      {/* VACATING NOTICE */}
      <div className={`sheet-overlay ${activeSheet === "vacating-notice" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "vacating-notice" ? "active" : ""}`}>
        <div className="sheet-handle" />
        <div className="p-5 pb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(239,68,68,0.15)" }}>
              <DoorOpen className="w-5 h-5" style={{ color: "#ef4444" }} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Vacating Notice</h3>
              <p className="text-xs" style={{ color: "#a3a3a3" }}>30 days notice required per lease</p>
            </div>
          </div>

          <div className="p-3 rounded-xl mb-4" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}>
            <p className="text-xs" style={{ color: "#ef4444" }}>
              ⚠ Submitting this notice will inform your landlord of your intention to vacate.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: "#a3a3a3" }}>REASON FOR VACATING</label>
              <select className="android-input" style={{ appearance: "none" }} value={vacatingReason} onChange={(e) => setVacatingReason(e.target.value)}>
                <option value="Relocating">Relocating</option>
                <option value="Buying home">Buying own home</option>
                <option value="Rent too high">Rent too high</option>
                <option value="Maintenance issues">Maintenance issues</option>
                <option value="Job transfer">Job transfer</option>
                <option value="Personal reasons">Personal reasons</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: "#a3a3a3" }}>NOTES (Optional)</label>
              <textarea className="android-input" rows={2} placeholder="Any message for your landlord…" style={{ minHeight: "60px" }} value={vacatingNotes} onChange={(e) => setVacatingNotes(e.target.value)}></textarea>
            </div>
          </div>

          <div className="flex gap-3 mt-5">
            <button onClick={closeSheet} className="btn-ghost flex-1 text-center" style={{ padding: "12px 20px", fontSize: "14px" }}>Cancel</button>
            <button onClick={submitVacatingNotice} className="flex-1 text-center" style={{ background: "linear-gradient(to right, #dc2626, #ef4444)", color: "white", fontWeight: 600, padding: "12px 20px", borderRadius: "12px", border: "none", cursor: "pointer", boxShadow: "0 4px 15px rgba(220,38,38,0.3)" }}>
              Submit Notice
            </button>
          </div>
        </div>
      </div>

      {/* SNACKBAR */}
      {snackbarVisible && (
        <div className={`snackbar ${snackbarAnimClass}`}>
          <div className="flex items-center gap-3">
            <div>{snackbarIcon()}</div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">{snackbar.message}</p>
            </div>
            <button onClick={hideSnackbar} className="p-1">
              <X className="w-4 h-4" style={{ color: "#525252" }} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  Layers,
  Home,
  ChevronDown,
  ChevronRight,
  MessageCircle,
  UserPlus,
  Megaphone,
  FileText,
  Plus,
  DoorOpen,
  AlertCircle,
  AlertTriangle,
  Check,
  X,
  Info,
  Building2,
  Loader2,
  Wrench,
  Upload,
  Download,
  Camera,
} from "lucide-react";
import { useRouter } from "next/navigation";
import AuthGuard from "../components/AuthGuard";
import BottomNavAndMenu from "../components/BottomNavAndMenu";
import { useAuth } from "../AuthContext";
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { listenToProperties, type PropertyData } from "../../lib/properties";
import {
  listenToPropertyUnits,
  recordLease,
  vacateUnit,
  setUnitMaintenance,
  updateUnit as updateUnitPartial,
  type UnitData,
  type LeaseFormData,
} from "../../lib/units";
import { LEASE_TERM_OPTIONS } from "../constants";
import { createNotification, listenToNotifications } from "../../lib/notifications";
import type { NotificationData } from "../../lib/notifications";
import { uploadPhoto, openFilePicker } from "../../lib/upload";
import { updateMaintenanceStatus } from "../../lib/maintenance";

type SnackbarType = "success" | "error" | "info";

export default function TenantsPage() {
  const router = useRouter();
  const { user } = useAuth();

  // ---- Data State ----
  const [properties, setProperties] = useState<PropertyData[]>([]);
  const [propertiesLoading, setPropertiesLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<PropertyData | null>(null);
  const [units, setUnits] = useState<UnitData[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<UnitData | null>(null);
  const [pageLoading, setPageLoading] = useState(true);

  // ---- Tab State ----
  const [activeTab, setActiveTab] = useState("overview");

  // ---- Sheet State ----
  const [activeSheet, setActiveSheet] = useState<string | null>(null);

  // ---- Snackbar ----
  const [snackbar, setSnackbar] = useState<{ show: boolean; message: string; type: SnackbarType }>({ show: false, message: "", type: "info" });
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarAnimClass, setSnackbarAnimClass] = useState("");

  // ---- Form State: Assign Tenant ----
  const [formFirstName, setFormFirstName] = useState("");
  const [formLastName, setFormLastName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formIdNumber, setIdNumber] = useState("");
  const [formLeaseStart, setFormLeaseStart] = useState("");
  const [formRent, setFormRent] = useState("");
  const [formDeposit, setFormDeposit] = useState("");
  const [formLeaseTerm, setFormLeaseTerm] = useState("12 months");
  const [formSaving, setFormSaving] = useState(false);

  // ---- Form State: Renew Lease ----
  const [renewStart, setRenewStart] = useState("");
  const [renewEnd, setRenewEnd] = useState("");
  const [renewRent, setRenewRent] = useState("");
  const [renewSaving, setRenewSaving] = useState(false);

  // ---- Tab Data: Payments ----
  const [payments, setPayments] = useState<any[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);

  // ---- Tab Data: Complaints (maintenance) ----
  const [complaints, setComplaints] = useState<any[]>([]);
  const [complaintsLoading, setComplaintsLoading] = useState(false);

  // ---- Tab Data: Documents ----
  interface DocData {
    id: string;
    name: string;
    url: string;
    type: string;
    fileType: string;
    uploadedAt: any;
  }
  const [documents, setDocuments] = useState<DocData[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // ---- Tab Data: Vacating Notices ----
  const [vacatingNotices, setVacatingNotices] = useState<any[]>([]);
  const [vacatingNoticesLoading, setVacatingNoticesLoading] = useState(false);

  // ---- Notifications ----
  const [notifications, setNotifications] = useState<NotificationData[]>([]);

  // ---- Form State: Maintenance ----
  const [maintReason, setMaintReason] = useState("Plumbing");
  const [maintNotes, setMaintNotes] = useState("");
  const [maintDuration, setMaintDuration] = useState("");
  const [maintSaving, setMaintSaving] = useState(false);

  // ---- Listen to properties ----
  useEffect(() => {
    if (!user) return;
    setPropertiesLoading(true);
    const unsub = listenToProperties(
      user.uid,
      (props) => {
        setProperties(props);
        setPropertiesLoading(false);
        setPageLoading(false);
      },
      (err) => {
        console.error("Error loading properties:", err);
        setPropertiesLoading(false);
        setPageLoading(false);
      }
    );
    return () => unsub();
  }, [user]);

  // ---- Listen to units when property is selected ----
  useEffect(() => {
    if (!selectedProperty) {
      setUnits([]);
      setSelectedUnit(null);
      return;
    }
    setUnitsLoading(true);
    setSelectedUnit(null);
    const unsub = listenToPropertyUnits(
      selectedProperty.id,
      (unitList) => {
        setUnits(unitList);
        setUnitsLoading(false);
      },
      (err) => {
        console.error("Error loading property units:", err);
        setUnitsLoading(false);
      }
    );
    return () => unsub();
  }, [selectedProperty]);

  // ---- Listen to payments for selected unit ----
  useEffect(() => {
    if (!selectedUnit || !user) {
      setPayments([]);
      return;
    }
    setPaymentsLoading(true);
    const q = query(
      collection(db, "payments"),
      where("unitId", "==", selectedUnit.id),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setPayments(list);
        setPaymentsLoading(false);
      },
      (err) => {
        console.error("Error loading payments:", err);
        setPaymentsLoading(false);
      }
    );
    return () => unsub();
  }, [selectedUnit?.id, user]);

  // ---- Listen to complaints (maintenance) for selected unit ----
  useEffect(() => {
    if (!selectedUnit) {
      setComplaints([]);
      return;
    }
    setComplaintsLoading(true);
    const q = query(
      collection(db, "maintenance"),
      where("unitId", "==", selectedUnit.id),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setComplaints(list);
        setComplaintsLoading(false);
      },
      (err) => {
        console.error("Error loading complaints:", err);
        setComplaintsLoading(false);
      }
    );
    return () => unsub();
  }, [selectedUnit?.id]);

  // ---- Listen to documents for selected unit ----
  useEffect(() => {
    if (!selectedUnit) {
      setDocuments([]);
      return;
    }
    setDocsLoading(true);
    const q = query(
      collection(db, "documents"),
      where("unitId", "==", selectedUnit.id),
      orderBy("uploadedAt", "desc")
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as DocData));
        setDocuments(list);
        setDocsLoading(false);
      },
      (err) => {
        console.error("Error loading documents:", err);
        setDocsLoading(false);
      }
    );
    return () => unsub();
  }, [selectedUnit?.id]);

  // ---- Listen to vacating notices for selected unit ----
  useEffect(() => {
    if (!selectedUnit) {
      setVacatingNotices([]);
      return;
    }
    setVacatingNoticesLoading(true);
    const q = query(
      collection(db, "vacatingNotices"),
      where("unitId", "==", selectedUnit.id),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setVacatingNotices(list);
        setVacatingNoticesLoading(false);
      },
      (err) => {
        console.error("Error loading vacating notices:", err);
        setVacatingNoticesLoading(false);
      }
    );
    return () => unsub();
  }, [selectedUnit?.id]);

  // ---- Listen to notifications ----
  useEffect(() => {
    if (!user) return;
    const unsub = listenToNotifications(
      user.uid,
      (data) => {
        setNotifications(data);
      },
      (err) => {
        console.error("Error loading notifications:", err);
      }
    );
    return () => unsub();
  }, [user]);

  // ---- Pre-fill assign form when selected unit changes ----
  useEffect(() => {
    if (selectedUnit && activeSheet === "assign-tenant" && selectedUnit.tenantName) {
      const nameParts = selectedUnit.tenantName.split(" ");
      setFormFirstName(nameParts[0] || "");
      setFormLastName(nameParts.slice(1).join(" ") || "");
      setFormPhone(selectedUnit.tenantPhone || "");
      setFormRent(selectedUnit.rent.toString());
      setFormDeposit(selectedUnit.deposit.toString());
      if (selectedUnit.leaseStart?.toDate) {
        setFormLeaseStart(selectedUnit.leaseStart.toDate().toISOString().split("T")[0]);
      } else {
        setFormLeaseStart("");
      }
      setFormLeaseTerm(selectedUnit.leaseTerm || "12 months");
    } else if (selectedUnit && activeSheet === "assign-tenant") {
      // Vacant unit - set defaults
      setFormFirstName("");
      setFormLastName("");
      setFormPhone("");
      setIdNumber("");
      setFormRent(selectedUnit.rent.toString());
      setFormDeposit(selectedUnit.deposit.toString());
      setFormLeaseStart(new Date().toISOString().split("T")[0]);
      setFormLeaseTerm("12 months");
    }
    // Pre-fill renewal form
    if (selectedUnit && activeSheet === "lease-renewal") {
      if (selectedUnit.leaseEnd?.toDate) {
        const endDate = selectedUnit.leaseEnd.toDate();
        setRenewStart(new Date(endDate.getTime() + 86400000).toISOString().split("T")[0]);
        const newEnd = new Date(endDate);
        newEnd.setFullYear(newEnd.getFullYear() + 1);
        setRenewEnd(newEnd.toISOString().split("T")[0]);
      }
      setRenewRent((selectedUnit.rent + 2000).toString());
    }
    // Pre-fill maintenance form
    if (activeSheet === "maintenance") {
      setMaintReason("Plumbing");
      setMaintNotes("");
      setMaintDuration("");
    }
  }, [selectedUnit, activeSheet]);

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

  const openSheet = (name: string) => {
    setActiveSheet(name);
  };
  const closeSheet = () => setActiveSheet(null);

  const isOccupied = selectedUnit?.status === "Occupied";

  // ---- Get lease end string ----
  const getLeaseEndStr = () => {
    if (!selectedUnit?.leaseEnd?.toDate) return "";
    return selectedUnit.leaseEnd.toDate().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getLeaseStartStr = () => {
    if (!selectedUnit?.leaseStart?.toDate) return "";
    return selectedUnit.leaseStart.toDate().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // ---- Handlers ----
  const handleAssignTenant = async () => {
    if (!selectedUnit || !user) return;
    if (!formFirstName || !formLastName) {
      showSnackbar("Please enter tenant name", "error");
      return;
    }
    setFormSaving(true);
    try {
      const tenantName = `${formFirstName} ${formLastName}`.trim();
      const leaseData: LeaseFormData = {
        tenantName,
        tenantPhone: formPhone,
        leaseStart: formLeaseStart || new Date().toISOString().split("T")[0],
        leaseTerm: formLeaseTerm,
        rent: parseInt(formRent.replace(/,/g, "")) || selectedUnit.rent,
        deposit: parseInt(formDeposit.replace(/,/g, "")) || selectedUnit.deposit,
        status: "Occupied",
      };
      await recordLease(selectedUnit.id, leaseData);
      setFormSaving(false);
      closeSheet();
      setTimeout(() => showSnackbar(`Tenant ${tenantName} assigned! 🎉`, "success"), 300);
    } catch (err: any) {
      setFormSaving(false);
      showSnackbar(err?.message || "Failed to assign tenant", "error");
    }
  };

  const handleRenewLease = async () => {
    if (!selectedUnit) return;
    if (!renewStart || !renewEnd) {
      showSnackbar("Please enter lease dates", "error");
      return;
    }
    setRenewSaving(true);
    try {
      const monthsMap: Record<string, number> = {
        "6 months": 6,
        "12 months": 12,
        "24 months": 24,
      };
      const start = new Date(renewStart);
      const end = new Date(renewEnd);
      const diffMonths = (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth();
      const term = Object.entries(monthsMap).find(([, m]) => m >= diffMonths)?.[0] || "12 months";

      await updateUnitPartial(selectedUnit.id, {
        name: selectedUnit.name,
        type: selectedUnit.type,
        status: selectedUnit.status as any,
        rent: parseInt(renewRent.replace(/,/g, "")) || selectedUnit.rent,
        deposit: selectedUnit.deposit,
        area: selectedUnit.area,
      });

      // Update lease dates and rent directly
      await updateDoc(doc(collection(db, "units"), selectedUnit.id), {
        leaseStart: start,
        leaseEnd: end,
        leaseTerm: term,
        rent: parseInt(renewRent.replace(/,/g, "")) || selectedUnit.rent,
        updatedAt: serverTimestamp(),
      });

      setRenewSaving(false);
      closeSheet();
      setTimeout(() => showSnackbar("Lease renewed successfully! ✅", "success"), 300);
    } catch (err: any) {
      setRenewSaving(false);
      showSnackbar(err?.message || "Failed to renew lease", "error");
    }
  };

  const handleMaintenance = async () => {
    if (!selectedUnit) return;
    setMaintSaving(true);
    try {
      await setUnitMaintenance(selectedUnit.id, maintReason, maintNotes, maintDuration);
      // Notify tenant
      if (selectedUnit.tenantId) {
        await createNotification(
          selectedUnit.tenantId,
          "maintenance_update",
          "🔧 Maintenance Scheduled",
          `${maintReason} work scheduled for ${selectedUnit.name} at ${selectedUnit.propertyName}. Expected duration: ${maintDuration || "TBD"} days.`
        );
      }
      setMaintSaving(false);
      closeSheet();
      showSnackbar("Unit marked for maintenance — tenant notified 🔧", "info");
    } catch (err: any) {
      setMaintSaving(false);
      showSnackbar(err?.message || "Failed to set maintenance", "error");
    }
  };

  const handleVacate = async () => {
    if (!selectedUnit) return;
    try {
      // Notify tenant before vacating
      if (selectedUnit.tenantId) {
        await createNotification(
          selectedUnit.tenantId,
          "vacate_notice",
          "🚪 Unit Vacated",
          `You have been vacated from ${selectedUnit.name} at ${selectedUnit.propertyName}. Please contact your landlord for deposit refund details.`
        );
      }
      await vacateUnit(selectedUnit.id);
      closeSheet();
      setTimeout(() => showSnackbar("Unit vacated — tenant notified", "info"), 300);
    } catch (err: any) {
      showSnackbar(err?.message || "Failed to vacate unit", "error");
    }
  };

  // ---- Compute stats ----
  const occupiedUnits = units.filter((u) => u.status === "Occupied").length;
  const vacantUnits = units.filter((u) => u.status === "Vacant").length;
  const maintenanceUnits = units.filter((u) => u.status === "Maintenance").length;

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

  // ====== LOADING STATE ======
  if (pageLoading) {
    return (
      <AuthGuard>
        <div style={{ background: "#050505", color: "#e5e5e5", minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="text-center">
            <Loader2 className="w-10 h-10 animate-spin mx-auto mb-3" style={{ color: "#047857" }} />
            <p className="text-sm" style={{ color: "#a3a3a3" }}>Loading your properties...</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div style={{ background: "#050505", color: "#e5e5e5", fontFamily: "'Inter', sans-serif", minHeight: "100dvh" }}>
        <div className="app-shell">
          <div className="status-bar" style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 60, background: "rgba(5,5,5,0.9)" }} />

          <div className="app-content" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
            {/* TOP BAR */}
            <div className="app-header" style={{ position: "sticky", top: 0, zIndex: 40, background: "rgba(5,5,5,0.9)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <div className="flex items-center justify-between px-3 py-3">
                <div className="flex items-center gap-3">
                  <button onClick={() => router.back()} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)" }}>
                    <ArrowLeft className="w-5 h-5" style={{ color: "#a3a3a3" }} />
                  </button>
                  <div>
                    <h1 className="text-lg font-bold text-white">Unit & Tenants</h1>
                    <p className="text-xs" style={{ color: "#a3a3a3" }}>Manage Occupancy</p>
                  </div>
                </div>
                <button onClick={() => openSheet("property-selector")} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(4,120,87,0.15)" }}>
                  <Layers className="w-5 h-5" style={{ color: "#059669" }} />
                </button>
              </div>
            </div>

            {/* PROPERTY SELECTOR CARD */}
            <div className="px-3 pt-4 pb-2" style={{ animation: "slideInUp 0.5s ease" }}>
              <div className="card p-4 ripple-container" onClick={() => openSheet("property-selector")}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: selectedProperty ? "linear-gradient(135deg, #047857, #059669)" : "rgba(107,114,128,0.2)" }}>
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold text-white truncate">
                      {selectedProperty ? selectedProperty.name : "Select Property"}
                    </p>
                    <p className="text-xs" style={{ color: "#a3a3a3" }}>
                      {selectedProperty
                        ? `${occupiedUnits} occupied · ${vacantUnits} vacant · ${maintenanceUnits} maintenance`
                        : "Choose a property to manage tenants"}
                    </p>
                  </div>
                  <ChevronDown className="w-5 h-5" style={{ color: "#525252" }} />
                </div>
              </div>
            </div>

            {/* UNIT SELECTOR CARD (only when property is selected) */}
            {selectedProperty && (
              <div className="px-3 pb-2" style={{ animation: "slideInUp 0.3s ease" }}>
                <div className="card p-3 ripple-container" onClick={() => openSheet("unit-selector")}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: selectedUnit ? (isOccupied ? "linear-gradient(135deg, #047857, #059669)" : "rgba(107,114,128,0.2)") : "rgba(107,114,128,0.15)" }}>
                      <Home className="w-5 h-5" style={{ color: selectedUnit && isOccupied ? "white" : "#9ca3af" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">
                        {selectedUnit ? `${selectedUnit.name} — ${selectedUnit.type}` : "Select a unit"}
                      </p>
                      <p className="text-xs" style={{ color: "#a3a3a3" }}>
                        {selectedUnit
                          ? `${selectedUnit.propertyName} · ${selectedUnit.status}${selectedUnit.tenantName ? ` · ${selectedUnit.tenantName}` : ""}`
                          : `${units.length} units available`}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4" style={{ color: "#525252" }} />
                  </div>
                </div>
              </div>
            )}

            {/* TABS (only when unit is selected) */}
            {selectedUnit && (
              <>
                <div className="flex overflow-x-auto px-3 gap-1 border-b" style={{ borderColor: "rgba(255,255,255,0.04)", scrollbarWidth: "none" }}>
                  {["overview", "financials", "complaints", "documents", "vacating"].map((tab) => (
                    <button
                      key={tab}
                      className="tab-btn"
                      style={{
                        padding: "12px 16px",
                        fontSize: "13px",
                        fontWeight: activeTab === tab ? 600 : 500,
                        color: activeTab === tab ? "#059669" : "#a3a3a3",
                        borderBottom: activeTab === tab ? "2px solid #059669" : "2px solid transparent",
                        whiteSpace: "nowrap",
                        transition: "all 0.2s ease",
                      }}
                      onClick={(e) => {
                        setActiveTab(tab);
                        e.currentTarget.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
                      }}
                    >
                      {tab === "overview" ? "Overview" : tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>

                {/* TAB CONTENT */}
                <div className="px-3 py-5 space-y-5">

                  {/* ===== OVERVIEW TAB ===== */}
                  {activeTab === "overview" && (
                    <div className="space-y-5">
                      {isOccupied ? (
                        <>
                          {/* Tenant Card */}
                          <div className="card overflow-hidden">
                            <div className="p-4" style={{ background: "rgba(4,120,87,0.05)" }}>
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: "linear-gradient(135deg, #047857, #059669)", color: "white" }}>
                                  {selectedUnit.tenantInitials}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-base font-bold text-white">{selectedUnit.tenantName}</p>
                                  <p className="text-xs" style={{ color: "#a3a3a3" }}>{selectedUnit.tenantPhone}</p>
                                </div>
                                <button onClick={() => showSnackbar("Opening WhatsApp", "success")} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(37,211,102,0.15)" }}>
                                  <MessageCircle className="w-5 h-5" style={{ color: "#25D366" }} />
                                </button>
                              </div>
                            </div>
                            <div className="card-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                              <span className="text-sm" style={{ color: "#525252" }}>Lease Period</span>
                              <span className="text-sm font-medium text-white">
                                {getLeaseStartStr()} - {getLeaseEndStr() || "Ongoing"}
                              </span>
                            </div>
                            <div className="card-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                              <span className="text-sm" style={{ color: "#525252" }}>Monthly Rent</span>
                              <span className="text-sm font-bold" style={{ color: "#059669" }}>KSh {selectedUnit.rent.toLocaleString()}</span>
                            </div>
                            <div className="card-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                              <span className="text-sm" style={{ color: "#525252" }}>Security Deposit</span>
                              <span className="text-sm font-medium text-white">KSh {selectedUnit.deposit.toLocaleString()}</span>
                            </div>
                            <div className="p-4 flex gap-2">
                              <button onClick={() => openSheet("assign-tenant")} className="btn-primary flex-1 text-center text-sm ripple-container" style={{ padding: "12px 20px", fontSize: "14px" }}>Edit Tenant</button>
                              <button onClick={() => openSheet("lease-renewal")} className="btn-ghost flex-1 text-center text-sm" style={{ padding: "12px 20px", fontSize: "14px" }}>Renew Lease</button>
                              <button onClick={() => openSheet("send-notice")} className="btn-ghost text-sm px-3" style={{ padding: "12px 20px" }}><Megaphone className="w-4 h-4" /></button>
                            </div>
                          </div>

                          {/* Unit Info Grid */}
                          <div className="grid grid-cols-3 gap-2">
                            <div className="card p-3 text-center">
                              <p className="text-lg font-bold text-white">{selectedUnit.name}</p>
                              <p className="text-xs" style={{ color: "#525252" }}>Unit</p>
                            </div>
                            <div className="card p-3 text-center">
                              <p className="text-lg font-bold text-white">{selectedUnit.type}</p>
                              <p className="text-xs" style={{ color: "#525252" }}>Type</p>
                            </div>
                            <div className="card p-3 text-center">
                              <p className="text-lg font-bold text-white">{selectedUnit.area || "—"}</p>
                              <p className="text-xs" style={{ color: "#525252" }}>Area (sqm)</p>
                            </div>
                          </div>

                          {/* Caretaker (from property) */}
                          {selectedProperty && (
                            <div className="card p-4">
                              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#525252" }}>Property</p>
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(4,120,87,0.15)" }}>
                                  <Building2 className="w-5 h-5" style={{ color: "#047857" }} />
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-semibold text-white">{selectedProperty.name}</p>
                                  <p className="text-xs" style={{ color: "#525252" }}>{selectedProperty.location}</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        /* Vacant State */
                        <div className="card p-8 text-center">
                          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(107,114,128,0.1)" }}>
                            <UserPlus className="w-8 h-8" style={{ color: "#9ca3af" }} />
                          </div>
                          <h3 className="text-xl font-bold text-white">
                            {selectedUnit.name} is Vacant
                          </h3>
                          <p className="text-sm mt-2" style={{ color: "#a3a3a3" }}>
                            {selectedUnit.type} · KSh {selectedUnit.rent.toLocaleString()}/mo
                          </p>
                          <button onClick={() => openSheet("assign-tenant")} className="btn-primary mt-6 inline-flex items-center gap-2 ripple-container" style={{ padding: "12px 20px", fontSize: "14px", width: "auto" }}>
                            <UserPlus className="w-4 h-4" /> Assign Tenant
                          </button>
                        </div>
                      )}

                      {/* Maintenance & Vacate actions */}
                      {isOccupied && (
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={() => openSheet("maintenance")}
                            className="card p-4 text-center"
                            style={{ background: "rgba(168,85,247,0.04)", borderColor: "rgba(168,85,247,0.12)", cursor: "pointer" }}
                          >
                            <Wrench className="w-6 h-6 mx-auto mb-2" style={{ color: "#a855f7" }} />
                            <p className="text-sm font-medium" style={{ color: "#a855f7" }}>Maintenance</p>
                          </button>
                          <button
                            onClick={() => openSheet("vacate-confirm")}
                            className="card p-4 text-center"
                            style={{ background: "rgba(239,68,68,0.04)", borderColor: "rgba(239,68,68,0.12)", cursor: "pointer" }}
                          >
                            <DoorOpen className="w-6 h-6 mx-auto mb-2" style={{ color: "#ef4444" }} />
                            <p className="text-sm font-medium" style={{ color: "#ef4444" }}>Vacate</p>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ===== FINANCIALS TAB ===== */}
                  {activeTab === "financials" && (
                    <div className="space-y-5">
                      {/* Status Card */}
                      <div className="card p-4 text-center" style={{ background: isOccupied ? "rgba(234,179,8,0.05)" : "rgba(107,114,128,0.05)", borderColor: isOccupied ? "rgba(234,179,8,0.15)" : "rgba(107,114,128,0.15)" }}>
                        <p className="text-xs" style={{ color: "#a3a3a3" }}>Current Status</p>
                        <p className="text-2xl font-bold mt-1" style={{ color: selectedUnit.payment === "Paid" ? "#059669" : isOccupied ? "#eab308" : "#9ca3af" }}>
                          {selectedUnit.payment === "Paid" ? "PAID" : isOccupied ? "PENDING" : "N/A"}
                        </p>
                        <p className="text-sm mt-1 text-white">
                          {isOccupied
                            ? `KSh ${selectedUnit.rent.toLocaleString()} for ${new Date().toLocaleString("default", { month: "long", year: "numeric" })}`
                            : "No tenant assigned"}
                        </p>
                        {isOccupied && (
                          <button onClick={() => openSheet("verify-payment")} className="btn-primary mt-4 text-sm ripple-container" style={{ padding: "12px 20px", fontSize: "14px", width: "auto", display: "inline-flex" }}>
                            Verify Payment
                          </button>
                        )}
                      </div>

                      {/* Payment Info */}
                      <div className="card">
                        <div className="card-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px" }}>
                          <span className="text-sm" style={{ color: "#525252" }}>Monthly Rent</span>
                          <span className="text-sm font-bold" style={{ color: "#059669" }}>KSh {selectedUnit.rent.toLocaleString()}</span>
                        </div>
                        <div className="card-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                          <span className="text-sm" style={{ color: "#525252" }}>Deposit</span>
                          <span className="text-sm font-medium text-white">KSh {selectedUnit.deposit.toLocaleString()}</span>
                        </div>
                        <div className="card-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                          <span className="text-sm" style={{ color: "#525252" }}>Payment Status</span>
                          <span className="chip" style={{ background: selectedUnit.payment === "Paid" ? "rgba(4,120,87,0.1)" : "rgba(234,179,8,0.1)", color: selectedUnit.payment === "Paid" ? "#047857" : "#eab308" }}>
                            {selectedUnit.payment || "Pending"}
                          </span>
                        </div>
                      </div>

                      {/* Payment History */}
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#525252" }}>Payment History</p>
                        {paymentsLoading ? (
                          <div className="flex justify-center py-4">
                            <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#525252" }} />
                          </div>
                        ) : payments.length === 0 ? (
                          <div className="card p-4 text-center">
                            <p className="text-sm" style={{ color: "#a3a3a3" }}>No payment records yet</p>
                          </div>
                        ) : (
                          <div className="card overflow-hidden">
                            {payments.map((p, i) => {
                              const dateStr = p.verifiedAt?.toDate ? p.verifiedAt.toDate().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : p.createdAt?.toDate ? p.createdAt.toDate().toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—";
                              return (
                                <div
                                  key={p.id}
                                  className="card-row"
                                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderTop: i > 0 ? "1px solid rgba(255,255,255,0.04)" : undefined }}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: p.status === "verified" ? "rgba(4,120,87,0.15)" : "rgba(234,179,8,0.15)" }}>
                                      {p.status === "verified" ? (
                                        <Check className="w-4 h-4" style={{ color: "#047857" }} />
                                      ) : (
                                        <AlertCircle className="w-4 h-4" style={{ color: "#eab308" }} />
                                      )}
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-white">KSh {(p.amount || selectedUnit.rent).toLocaleString()}</p>
                                      <p className="text-xs" style={{ color: "#525252" }}>{dateStr} · {p.period || "—"}</p>
                                    </div>
                                  </div>
                                  <span className="chip" style={{
                                    fontSize: "10px", padding: "3px 8px",
                                    background: p.status === "verified" ? "rgba(4,120,87,0.1)" : "rgba(234,179,8,0.1)",
                                    color: p.status === "verified" ? "#047857" : "#eab308",
                                  }}>
                                    {p.status === "verified" ? "Verified" : "Pending"}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ===== COMPLAINTS TAB ===== */}
                  {activeTab === "complaints" && (
                    <div className="space-y-5">
                      {complaintsLoading ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#525252" }} />
                        </div>
                      ) : complaints.length === 0 ? (
                        <div className="card p-6 text-center">
                          <AlertCircle className="w-10 h-10 mx-auto mb-3" style={{ color: "#525252" }} />
                          <p className="text-sm font-medium text-white">No complaints yet</p>
                          <p className="text-xs mt-1" style={{ color: "#a3a3a3" }}>
                            Tenant complaints and maintenance requests will appear here
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {complaints.map((c: any) => {
                            const statusMeta: Record<string, { label: string; color: string; bg: string }> = {
                              "open": { label: "Open", color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
                              "in-progress": { label: "In Progress", color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
                              "resolved": { label: "Resolved", color: "#059669", bg: "rgba(4,120,87,0.12)" },
                              "closed": { label: "Closed", color: "#6b7280", bg: "rgba(107,114,128,0.12)" },
                            };
                            const sm = statusMeta[c.status] || statusMeta["open"];
                            const dateStr = c.createdAt?.toDate ? c.createdAt.toDate().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
                            const urgencyColors: Record<string, string> = { "Urgent": "#ef4444", "Medium": "#eab308", "Low": "#6b7280" };
                            return (
                              <div key={c.id} className="card p-4">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-white truncate">{c.title || "Complaint"}</p>
                                    <p className="text-xs mt-0.5" style={{ color: "#525252" }}>{dateStr} · {c.tenantName || "Anonymous"}</p>
                                  </div>
                                  <span className="chip flex-shrink-0 ml-2" style={{ fontSize: "10px", padding: "3px 8px", background: sm.bg, color: sm.color }}>
                                    {sm.label}
                                  </span>
                                </div>
                                {c.description && (
                                  <p className="text-xs mt-2" style={{ color: "#a3a3a3", lineHeight: 1.5 }}>{c.description}</p>
                                )}
                                <div className="flex items-center justify-between gap-2 mt-3">
                                  <div className="flex items-center gap-2">
                                    {c.urgency && (
                                      <span className="text-xs font-medium" style={{ color: urgencyColors[c.urgency] || "#6b7280" }}>
                                        {c.urgency}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {c.status === "open" && (
                                      <button
                                        onClick={async () => {
                                          try {
                                            await updateMaintenanceStatus(c.id, "in-progress");
                                            showSnackbar("Complaint marked as in progress", "info");
                                          } catch (err: any) {
                                            showSnackbar(err?.message || "Failed to update status", "error");
                                          }
                                        }}
                                        className="text-xs font-semibold px-3 py-1.5 rounded-full"
                                        style={{ background: "rgba(59,130,246,0.12)", color: "#3b82f6", border: "none", cursor: "pointer" }}
                                      >
                                        Mark In Progress
                                      </button>
                                    )}
                                    {c.status === "in-progress" && (
                                      <button
                                        onClick={async () => {
                                          try {
                                            await updateMaintenanceStatus(c.id, "resolved");
                                            showSnackbar("Complaint marked as resolved ✅", "success");
                                          } catch (err: any) {
                                            showSnackbar(err?.message || "Failed to update status", "error");
                                          }
                                        }}
                                        className="text-xs font-semibold px-3 py-1.5 rounded-full"
                                        style={{ background: "rgba(4,120,87,0.12)", color: "#059669", border: "none", cursor: "pointer" }}
                                      >
                                        Mark Resolved
                                      </button>
                                    )}
                                    {(c.status === "resolved" || c.status === "closed") && (
                                      <span className="text-xs" style={{ color: "#525252" }}>
                                        {c.status === "resolved" ? "Resolved ✓" : "Closed"}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ===== DOCUMENTS TAB ===== */}
                  {activeTab === "documents" && (
                    <div className="space-y-5">
                      <button
                        onClick={async () => {
                          if (!selectedUnit || !user || uploadingDoc) return;
                          setUploadingDoc(true);
                          try {
                            // Only accept PDF and image files
                            const files = await openFilePicker("application/pdf,image/*", false);
                            if (!files || files.length === 0) {
                              setUploadingDoc(false);
                              return;
                            }
                            const file = files[0];
                            // Upload to Bunny.net
                            const result = await uploadPhoto(file, "documents", user.uid);
                            // Store document metadata in Firestore
                            await addDoc(collection(db, "documents"), {
                              unitId: selectedUnit.id,
                              propertyId: selectedUnit.propertyId,
                              landlordId: user.uid,
                              tenantId: selectedUnit.tenantId,
                              tenantName: selectedUnit.tenantName,
                              name: file.name,
                              url: result.url,
                              type: file.type,
                              fileType: file.type.startsWith("image") ? "image" : "pdf",
                              fileSize: file.size,
                              uploadedAt: serverTimestamp(),
                            });
                            showSnackbar("Document uploaded successfully! ✅", "success");
                          } catch (err: any) {
                            console.error("Upload error:", err);
                            showSnackbar(err?.message || "Failed to upload document", "error");
                          }
                          setUploadingDoc(false);
                        }}
                        className="w-full text-center flex items-center justify-center gap-2"
                        style={{
                          background: uploadingDoc ? "rgba(255,255,255,0.05)" : "linear-gradient(to right, #7c3aed, #a855f7)",
                          color: "white", fontWeight: 600, padding: "12px 20px", borderRadius: "12px",
                          border: "none", cursor: uploadingDoc ? "not-allowed" : "pointer",
                          opacity: uploadingDoc ? 0.5 : 1,
                          boxShadow: uploadingDoc ? "none" : "0 4px 15px rgba(168,85,247,0.3)",
                        }}
                      >
                        {uploadingDoc ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4" />
                        )}
                        {uploadingDoc ? "Uploading..." : "Upload Document"}
                      </button>

                      {docsLoading ? (
                        <div className="flex justify-center py-4">
                          <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#525252" }} />
                        </div>
                      ) : documents.length === 0 ? (
                        <div className="card p-6 text-center">
                          <FileText className="w-10 h-10 mx-auto mb-3" style={{ color: "#525252" }} />
                          <p className="text-sm" style={{ color: "#a3a3a3" }}>No documents uploaded yet</p>
                          <p className="text-xs mt-1" style={{ color: "#525252" }}>Upload lease agreements, ID copies, or other files</p>
                        </div>
                      ) : (
                        <div className="card overflow-hidden">
                          {documents.map((doc, i) => {
                            const dateStr = doc.uploadedAt?.toDate ? doc.uploadedAt.toDate().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
                            return (
                              <div
                                key={doc.id}
                                className="card-row"
                                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderTop: i > 0 ? "1px solid rgba(255,255,255,0.04)" : undefined }}
                              >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: doc.fileType === "pdf" ? "rgba(239,68,68,0.15)" : "rgba(59,130,246,0.15)" }}>
                                    {doc.fileType === "pdf" ? (
                                      <FileText className="w-4 h-4" style={{ color: "#ef4444" }} />
                                    ) : (
                                      <Camera className="w-4 h-4" style={{ color: "#3b82f6" }} />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-white truncate">{doc.name || "Document"}</p>
                                    <p className="text-xs" style={{ color: "#525252" }}>{dateStr}</p>
                                  </div>
                                </div>
                                <a
                                  href={doc.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ml-2"
                                  style={{ background: "rgba(255,255,255,0.05)" }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Download className="w-4 h-4" style={{ color: "#a3a3a3" }} />
                                </a>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ===== VACATING TAB ===== */}
                  {activeTab === "vacating" && (
                    <div className="space-y-5">
                      {isOccupied ? (
                        <>
                          {/* Vacating Notice Status */}
                          {vacatingNoticesLoading ? (
                            <div className="flex justify-center py-4">
                              <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#525252" }} />
                            </div>
                          ) : vacatingNotices.length > 0 ? (
                            <div className="card p-4">
                              <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(239,68,68,0.15)" }}>
                                  <DoorOpen className="w-5 h-5" style={{ color: "#ef4444" }} />
                                </div>
                                <div>
                                  <h4 className="text-sm font-bold text-white">Vacating Notice Submitted</h4>
                                  <p className="text-xs" style={{ color: "#a3a3a3" }}>
                                    {vacatingNotices[0].createdAt?.toDate
                                      ? `Submitted ${vacatingNotices[0].createdAt.toDate().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                                      : "Recently submitted"}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="chip" style={{
                                  fontSize: "11px", padding: "4px 10px",
                                  background: vacatingNotices[0].status === "approved" ? "rgba(4,120,87,0.12)" : vacatingNotices[0].status === "pending" ? "rgba(234,179,8,0.12)" : "rgba(59,130,246,0.12)",
                                  color: vacatingNotices[0].status === "approved" ? "#059669" : vacatingNotices[0].status === "pending" ? "#eab308" : "#3b82f6",
                                }}>
                                  {vacatingNotices[0].status === "approved" ? "Approved" : vacatingNotices[0].status === "pending" ? "Pending" : vacatingNotices[0].status || "Submitted"}
                                </span>
                                {vacatingNotices[0].reason && (
                                  <span className="text-xs" style={{ color: "#525252" }}>{vacatingNotices[0].reason}</span>
                                )}
                              </div>
                              {vacatingNotices[0].notes && (
                                <p className="text-xs mt-2" style={{ color: "#a3a3a3" }}>{vacatingNotices[0].notes}</p>
                              )}
                              {vacatingNotices[0].status === "approved" && (
                                <button onClick={() => openSheet("vacating-process")} className="btn-danger w-full text-center mt-4" style={{ padding: "12px 20px", fontSize: "14px" }}>
                                  Process Move-Out Now
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="card p-4 text-center">
                              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: "rgba(4,120,87,0.15)" }}>
                                <DoorOpen className="w-6 h-6" style={{ color: "#059669" }} />
                              </div>
                              <h4 className="text-base font-bold text-white">No Active Notice</h4>
                              <p className="text-xs mt-1" style={{ color: "#a3a3a3" }}>
                                {selectedUnit.tenantName} has not submitted a vacating notice.
                              </p>
                              <button onClick={() => openSheet("vacating-process")} className="mt-4 text-sm" style={{ padding: "12px 20px", fontSize: "14px", background: "linear-gradient(to right, #d97706, #f59e0b)", color: "white", fontWeight: 600, border: "none", borderRadius: "12px", cursor: "pointer", boxShadow: "0 4px 15px rgba(217,119,6,0.3)" }}>
                                Initiate Move-Out
                              </button>
                            </div>
                          )}

                          <div className="card overflow-hidden">
                            <div className="p-4" style={{ background: "rgba(59,130,246,0.05)" }}>
                              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#3b82f6" }}>Security Deposit</p>
                              <p className="text-2xl font-bold text-white mt-1">KSh {selectedUnit.deposit.toLocaleString()}</p>
                            </div>
                            <div className="card-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px" }}>
                              <span className="text-sm" style={{ color: "#525252" }}>Amount Paid</span>
                              <span className="text-sm font-medium text-white">KSh {selectedUnit.deposit.toLocaleString()}</span>
                            </div>
                            <div className="card-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                              <span className="text-sm" style={{ color: "#525252" }}>Deductions</span>
                              <span className="text-sm font-medium" style={{ color: "#059669" }}>KSh 0</span>
                            </div>
                            <div className="card-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderTop: "1px solid rgba(255,255,255,0.04)", background: "rgba(4,120,87,0.03)" }}>
                              <span className="text-sm font-bold text-white">Available for Refund</span>
                              <span className="text-sm font-bold" style={{ color: "#059669" }}>KSh {selectedUnit.deposit.toLocaleString()}</span>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="card p-8 text-center">
                          <DoorOpen className="w-10 h-10 mx-auto mb-3" style={{ color: "#525252" }} />
                          <p className="text-sm" style={{ color: "#a3a3a3" }}>No tenant to vacate</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* No property selected — empty state */}
            {!selectedProperty && (
              <div className="px-3 pt-10 text-center">
                <Building2 className="w-16 h-16 mx-auto mb-4" style={{ color: "#525252" }} />
                <h3 className="text-xl font-bold text-white">Select a Property</h3>
                <p className="text-sm mt-2" style={{ color: "#a3a3a3" }}>
                  Choose a property to manage its units and tenants
                </p>
                <button onClick={() => openSheet("property-selector")} className="btn-primary mt-6 inline-flex items-center gap-2 ripple-container" style={{ padding: "12px 20px", fontSize: "14px", width: "auto" }}>
                  <Building2 className="w-4 h-4" /> Browse Properties
                </button>
              </div>
            )}
          </div>

          <BottomNavAndMenu />
        </div>

        {/* ============================================ */}
        {/* SHEETS */}
        {/* ============================================ */}

        {/* PROPERTY SELECTOR */}
        <div className={`sheet-overlay ${activeSheet === "property-selector" ? "active" : ""}`} onClick={closeSheet} />
        <div className={`bottom-sheet ${activeSheet === "property-selector" ? "active" : ""}`}>
          <div className="sheet-handle" />
          <div className="p-3 pb-8">
            <h3 className="text-lg font-bold text-white mb-4">Select Property</h3>
            {propertiesLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#047857" }} />
              </div>
            ) : properties.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm" style={{ color: "#a3a3a3" }}>No properties found. Create one first.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {properties.map((prop) => {
                  const isActive = prop.id === selectedProperty?.id;
                  const propertyOccupied = units.filter((u) => u.propertyName === prop.name && u.status === "Occupied").length;
                  const propertyVacant = units.filter((u) => u.propertyName === prop.name && u.status === "Vacant").length;
                  return (
                    <div
                      key={prop.id}
                      className="p-3 rounded-xl flex items-center gap-3 cursor-pointer"
                      style={{
                        background: isActive ? "rgba(4,120,87,0.1)" : "rgba(255,255,255,0.03)",
                        border: isActive ? "1.5px solid rgba(4,120,87,0.3)" : "1.5px solid transparent",
                      }}
                      onClick={() => {
                        setSelectedProperty(prop);
                        closeSheet();
                      }}
                    >
                      <div className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0" style={{ background: "rgba(4,120,87,0.1)" }}>
                        {prop.images?.[0] ? (
                          <img src={prop.images[0]} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Building2 className="w-5 h-5" style={{ color: "#047857" }} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">{prop.name}</p>
                        <p className="text-xs" style={{ color: "#a3a3a3" }}>{prop.location}</p>
                        <p className="text-xs mt-0.5" style={{ color: "#525252" }}>
                          {prop.totalUnits} units · KSh {prop.rentMin.toLocaleString()} - {prop.rentMax.toLocaleString()}
                        </p>
                      </div>
                      {isActive && <Check className="w-5 h-5 flex-shrink-0" style={{ color: "#059669" }} />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* UNIT SELECTOR */}
        <div className={`sheet-overlay ${activeSheet === "unit-selector" ? "active" : ""}`} onClick={closeSheet} />
        <div className={`bottom-sheet ${activeSheet === "unit-selector" ? "active" : ""}`}>
          <div className="sheet-handle" />
          <div className="p-3 pb-8">
            <h3 className="text-lg font-bold text-white mb-4">
              Units — {selectedProperty?.name}
            </h3>
            {unitsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#047857" }} />
              </div>
            ) : units.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm" style={{ color: "#a3a3a3" }}>No units in this property yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {units.map((unit) => {
                  const isActive = unit.id === selectedUnit?.id;
                  const unitOccupied = unit.status === "Occupied";
                  return (
                    <div
                      key={unit.id}
                      className="p-3 rounded-xl flex items-center gap-3 cursor-pointer"
                      style={{
                        background: isActive ? "rgba(4,120,87,0.1)" : "rgba(255,255,255,0.03)",
                        border: isActive ? "1.5px solid rgba(4,120,87,0.3)" : "1.5px solid transparent",
                      }}
                      onClick={() => {
                        setSelectedUnit(unit);
                        closeSheet();
                      }}
                    >
                      <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0" style={{ background: unitOccupied ? "linear-gradient(135deg, #047857, #059669)" : "rgba(107,114,128,0.2)" }}>
                        {unit.images?.[0] ? (
                          <img src={unit.images[0]} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Home className="w-5 h-5 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">{unit.name}</p>
                        <p className="text-xs" style={{ color: "#a3a3a3" }}>
                          {unit.type} · KSh {unit.rent.toLocaleString()}/mo
                          {unit.tenantName ? ` · ${unit.tenantName}` : ""}
                        </p>
                      </div>
                      <span className="chip flex-shrink-0" style={{
                        fontSize: "10px",
                        padding: "3px 8px",
                        background: unitOccupied ? "rgba(4,120,87,0.15)" : unit.status === "Maintenance" ? "rgba(168,85,247,0.15)" : "rgba(239,68,68,0.15)",
                        color: unitOccupied ? "#047857" : unit.status === "Maintenance" ? "#a855f7" : "#ef4444",
                      }}>
                        {unit.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ASSIGN / EDIT TENANT */}
        <div className={`sheet-overlay ${activeSheet === "assign-tenant" ? "active" : ""}`} onClick={closeSheet} />
        <div className={`bottom-sheet ${activeSheet === "assign-tenant" ? "active" : ""}`} style={{ maxHeight: "90dvh" }}>
          <div className="sheet-handle" />
          <div className="p-3 pb-8">
            <h3 className="text-lg font-bold text-white mb-1">
              {selectedUnit?.tenantName ? "Edit Tenant" : "Assign Tenant"}
            </h3>
            <p className="text-xs mb-4" style={{ color: "#a3a3a3" }}>
              {selectedUnit?.name} — {selectedUnit?.propertyName}
            </p>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold mb-1.5 block" style={{ color: "#a3a3a3" }}>FIRST NAME</label>
                  <input type="text" className="android-input" value={formFirstName} onChange={(e) => setFormFirstName(e.target.value)} placeholder="Mary" />
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1.5 block" style={{ color: "#a3a3a3" }}>LAST NAME</label>
                  <input type="text" className="android-input" value={formLastName} onChange={(e) => setFormLastName(e.target.value)} placeholder="Njeri" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: "#a3a3a3" }}>PHONE NUMBER</label>
                <input type="tel" className="android-input" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="+254 712 345 678" />
              </div>
              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: "#a3a3a3" }}>ID NUMBER</label>
                <input type="text" className="android-input" value={formIdNumber} onChange={(e) => setIdNumber(e.target.value)} placeholder="National ID number" />
              </div>
              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: "#a3a3a3" }}>LEASE START</label>
                <input type="date" className="android-input" value={formLeaseStart} onChange={(e) => setFormLeaseStart(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: "#a3a3a3" }}>LEASE TERM</label>
                <select className="android-select" value={formLeaseTerm} onChange={(e) => setFormLeaseTerm(e.target.value)}>
                  {LEASE_TERM_OPTIONS.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold mb-1.5 block" style={{ color: "#a3a3a3" }}>RENT (KSh)</label>
                  <input type="number" className="android-input" value={formRent} onChange={(e) => setFormRent(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1.5 block" style={{ color: "#a3a3a3" }}>DEPOSIT (KSh)</label>
                  <input type="number" className="android-input" value={formDeposit} onChange={(e) => setFormDeposit(e.target.value)} />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={closeSheet} className="btn-ghost flex-1 text-center" style={{ padding: "12px 20px", fontSize: "14px" }}>Cancel</button>
              <button onClick={handleAssignTenant} className="btn-primary flex-1 text-center ripple-container" style={{ padding: "12px 20px", fontSize: "14px" }} disabled={formSaving}>
                {formSaving ? <div className="spinner mx-auto" /> : <span>{selectedUnit?.tenantName ? "Save Changes" : "Assign Tenant"}</span>}
              </button>
            </div>
          </div>
        </div>

        {/* LEASE RENEWAL */}
        <div className={`sheet-overlay ${activeSheet === "lease-renewal" ? "active" : ""}`} onClick={closeSheet} />
        <div className={`bottom-sheet ${activeSheet === "lease-renewal" ? "active" : ""}`}>
          <div className="sheet-handle" />
          <div className="p-3 pb-8">
            <h3 className="text-lg font-bold text-white mb-4">Renew Lease</h3>
            <div className="space-y-4">
              <div className="card">
                <div className="card-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px" }}>
                  <span className="text-sm" style={{ color: "#525252" }}>Current Tenant</span>
                  <span className="text-sm font-medium text-white">{selectedUnit?.tenantName}</span>
                </div>
                <div className="card-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                  <span className="text-sm" style={{ color: "#525252" }}>Current Lease End</span>
                  <span className="text-sm font-medium text-white">{getLeaseEndStr() || "—"}</span>
                </div>
                <div className="card-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                  <span className="text-sm" style={{ color: "#525252" }}>Current Rent</span>
                  <span className="text-sm font-medium text-white">KSh {selectedUnit?.rent.toLocaleString()}</span>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: "#a3a3a3" }}>NEW START DATE</label>
                <input type="date" className="android-input" value={renewStart} onChange={(e) => setRenewStart(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: "#a3a3a3" }}>NEW END DATE</label>
                <input type="date" className="android-input" value={renewEnd} onChange={(e) => setRenewEnd(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: "#a3a3a3" }}>NEW RENT (KSh)</label>
                <input type="number" className="android-input" value={renewRent} onChange={(e) => setRenewRent(e.target.value)} placeholder="Updated rent amount" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={closeSheet} className="btn-ghost flex-1 text-center" style={{ padding: "12px 20px", fontSize: "14px" }}>Cancel</button>
              <button onClick={handleRenewLease} className="btn-primary flex-1 text-center ripple-container" style={{ padding: "12px 20px", fontSize: "14px" }} disabled={renewSaving}>
                {renewSaving ? <div className="spinner mx-auto" /> : <span>Confirm Renewal</span>}
              </button>
            </div>
          </div>
        </div>

        {/* MAINTENANCE */}
        <div className={`sheet-overlay ${activeSheet === "maintenance" ? "active" : ""}`} onClick={closeSheet} />
        <div className={`bottom-sheet ${activeSheet === "maintenance" ? "active" : ""}`}>
          <div className="sheet-handle" />
          <div className="p-3 pb-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(168,85,247,0.15)" }}>
                <Wrench className="w-5 h-5" style={{ color: "#a855f7" }} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Maintenance</h3>
                <p className="text-xs" style={{ color: "#a3a3a3" }}>{selectedUnit?.name} — {selectedUnit?.propertyName}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium block mb-2" style={{ color: "#a3a3a3" }}>Reason</label>
                <select className="android-select" value={maintReason} onChange={(e) => setMaintReason(e.target.value)}>
                  {["Plumbing", "Electrical", "Painting", "Structural", "Cleaning", "Other"].map((r) => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium block mb-2" style={{ color: "#a3a3a3" }}>Notes</label>
                <textarea className="android-input" style={{ minHeight: "80px", borderRadius: "14px" }} placeholder="Describe the maintenance issue..." value={maintNotes} onChange={(e) => setMaintNotes(e.target.value)} />
              </div>
              <div className="input-group">
                <input type="text" className="android-input" placeholder=" " value={maintDuration} onChange={(e) => setMaintDuration(e.target.value)} />
                <label>Expected Duration (days)</label>
              </div>
              <button onClick={handleMaintenance} className="btn-primary ripple-container" style={{ background: "linear-gradient(to right,#7c3aed,#a855f7)", boxShadow: "0 4px 20px rgba(168,85,247,0.3)" }} disabled={maintSaving}>
                {maintSaving ? <div className="spinner mx-auto" /> : <span>Set Maintenance</span>}
              </button>
            </div>
          </div>
        </div>

        {/* VACATE CONFIRMATION */}
        <div className={`sheet-overlay ${activeSheet === "vacate-confirm" ? "active" : ""}`} onClick={closeSheet} />
        <div className={`bottom-sheet ${activeSheet === "vacate-confirm" ? "active" : ""}`}>
          <div className="sheet-handle" />
          <div className="p-3 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ background: "rgba(234,179,8,0.1)", border: "1px solid rgba(234,179,8,0.2)" }}>
            <DoorOpen className="w-8 h-8" style={{ color: "#eab308" }} />
          </div>
          <h3 className="text-lg font-bold text-white">Mark as Vacant?</h3>
            <p className="text-sm mt-2 leading-relaxed" style={{ color: "#a3a3a3" }}>
              This will remove <strong className="text-white">{selectedUnit?.tenantName}</strong> from unit <strong className="text-white">{selectedUnit?.name}</strong> and set the status to vacant.
            </p>
            <div className="flex gap-3 mt-6">
              <button onClick={closeSheet} className="btn-ghost flex-1 text-center" style={{ padding: "14px" }}>Cancel</button>
              <button onClick={handleVacate} className="btn-danger flex-1 text-center" style={{ padding: "14px" }}>Vacate Unit</button>
            </div>
          </div>
        </div>

        {/* VACATING PROCESS (Initiate Move-Out) */}
        <div className={`sheet-overlay ${activeSheet === "vacating-process" ? "active" : ""}`} onClick={closeSheet} />
        <div className={`bottom-sheet ${activeSheet === "vacating-process" ? "active" : ""}`} style={{ maxHeight: "90dvh" }}>
          <div className="sheet-handle" />
          <div className="p-3 pb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(239,68,68,0.15)" }}>
                <DoorOpen className="w-5 h-5" style={{ color: "#ef4444" }} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Initiate Move-Out</h3>
                <p className="text-xs" style={{ color: "#a3a3a3" }}>Process tenant vacating</p>
              </div>
            </div>
            <div className="p-3 rounded-xl mb-4" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}>
              <p className="text-xs" style={{ color: "#ef4444" }}>
                This will mark the unit as Vacant and clear all tenant data.
              </p>
            </div>
            <div className="space-y-4">
              <div className="card p-4">
                <p className="text-sm font-semibold text-white mb-2">Deposit Summary</p>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm" style={{ color: "#525252" }}>Security Deposit</span>
                  <span className="text-sm font-medium text-white">KSh {selectedUnit?.deposit.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm" style={{ color: "#525252" }}>Tenant</span>
                  <span className="text-sm font-medium text-white">{selectedUnit?.tenantName}</span>
                </div>
                <div className="flex justify-between items-center pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                  <span className="text-sm font-bold text-white">Net Refund</span>
                  <span className="text-sm font-bold" style={{ color: "#059669" }}>KSh {selectedUnit?.deposit.toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={closeSheet} className="btn-ghost flex-1 text-center" style={{ padding: "12px 20px", fontSize: "14px" }}>Cancel</button>
              <button onClick={handleVacate} className="btn-danger flex-1 text-center" style={{ padding: "12px 20px", fontSize: "14px", background: "linear-gradient(to right, #dc2626, #ef4444)", color: "white" }}>Process Move-Out</button>
            </div>
          </div>
        </div>

        {/* VERIFY PAYMENT */}
        <div className={`sheet-overlay ${activeSheet === "verify-payment" ? "active" : ""}`} onClick={closeSheet} />
        <div className={`bottom-sheet ${activeSheet === "verify-payment" ? "active" : ""}`}>
          <div className="sheet-handle" />
          <div className="p-3 pb-8">
            <h3 className="text-lg font-bold text-white mb-4">Verify Payment</h3>
            {selectedUnit && (
              <div className="space-y-3">
                <div className="card-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px" }}>
                  <span className="text-sm" style={{ color: "#525252" }}>Tenant</span>
                  <span className="text-sm font-medium text-white">{selectedUnit.tenantName || "—"}</span>
                </div>
                <div className="card-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                  <span className="text-sm" style={{ color: "#525252" }}>Amount Due</span>
                  <span className="text-sm font-bold text-white">KSh {selectedUnit.rent.toLocaleString()}</span>
                </div>
                <div className="card-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                  <span className="text-sm" style={{ color: "#525252" }}>Status</span>
                  <span className="chip" style={{ background: selectedUnit.payment === "Paid" ? "rgba(4,120,87,0.1)" : "rgba(234,179,8,0.1)", color: selectedUnit.payment === "Paid" ? "#047857" : "#eab308" }}>
                    {selectedUnit.payment || "Pending"}
                  </span>
                </div>
              </div>
            )}
            <div className="flex gap-3 mt-5">
              <button onClick={closeSheet} className="btn-ghost flex-1 text-center" style={{ padding: "12px 20px", fontSize: "14px" }}>Close</button>
              <button onClick={async () => {
                if (!selectedUnit || !user) return;
                try {
                  // Update unit payment status
                  await updateDoc(doc(collection(db, "units"), selectedUnit.id), {
                    payment: "Paid",
                    updatedAt: serverTimestamp(),
                  });
                  // Record payment in payments collection
                  await addDoc(collection(db, "payments"), {
                    unitId: selectedUnit.id,
                    propertyId: selectedUnit.propertyId,
                    landlordId: user.uid,
                    tenantId: selectedUnit.tenantId,
                    tenantName: selectedUnit.tenantName,
                    amount: selectedUnit.rent,
                    period: new Date().toISOString().slice(0, 7),
                    method: "manual",
                    status: "verified",
                    verifiedBy: user.uid,
                    verifiedAt: serverTimestamp(),
                    createdAt: serverTimestamp(),
                  });
                  closeSheet();
                  showSnackbar("Payment verified and recorded ✅", "success");
                } catch (err: any) {
                  showSnackbar(err?.message || "Failed to update payment", "error");
                }
              }} className="btn-primary flex-1 text-center ripple-container" style={{ padding: "12px 20px", fontSize: "14px" }}>Mark as Paid</button>
            </div>
          </div>
        </div>

        {/* SEND NOTICE */}
        <div className={`sheet-overlay ${activeSheet === "send-notice" ? "active" : ""}`} onClick={closeSheet} />
        <div className={`bottom-sheet ${activeSheet === "send-notice" ? "active" : ""}`}>
          <div className="sheet-handle" />
          <div className="p-3 pb-8">
            <h3 className="text-lg font-bold text-white mb-4">Send Notice</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: "#a3a3a3" }}>SUBJECT</label>
                <input type="text" className="android-input" placeholder="Notice title" />
              </div>
              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: "#a3a3a3" }}>MESSAGE</label>
                <textarea className="android-input" rows={4} placeholder="Type your notice here…" style={{ minHeight: "100px" }}></textarea>
              </div>
            </div>
            <button onClick={() => { closeSheet(); showSnackbar("Notice sent to tenant!", "success"); }} className="btn-primary ripple-container mt-5" style={{ padding: "12px 20px", fontSize: "14px" }}>Send Notice</button>
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
    </AuthGuard>
  );
}

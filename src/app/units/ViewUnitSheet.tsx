"use client";

import { useState, useEffect } from "react";
import {
  Building2,
  Pencil,
  Wrench,
  UserX,
  Trash2,
  Phone,
  X as XIcon,
  Check,
  X,
  Info,
  List,
  CalendarDays,
} from "lucide-react";
import { ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  setUnitMaintenance,
  vacateUnit,
  deleteUnit,
  recordLease,
  type UnitData,
} from "../../lib/units";
import { LEASE_TERM_OPTIONS, PLACEHOLDER_IMAGE } from "../constants";

type DetailTab = "overview" | "payments" | "activity";
type SnackbarType = "success" | "error" | "info";

interface ViewUnitSheetProps {
  isOpen: boolean;
  onClose: () => void;
  unit: UnitData | null;
  onEdit: () => void;
  router: ReturnType<typeof useRouter>;
  /** If set, auto-opens this sub-sheet when the component mounts */
  initialSubSheet?: string | null;
}

export default function ViewUnitSheet({
  isOpen,
  onClose,
  unit: pd,
  onEdit,
  router,
  initialSubSheet,
}: ViewUnitSheetProps) {
  // ---- Internal Sub-Sheet State ----
  const [subSheet, setSubSheet] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState<string | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<DetailTab>("overview");

  // ---- Snackbar State ----
  const [snackbar, setSnackbar] = useState<{ show: boolean; message: string; type: SnackbarType }>({ show: false, message: "", type: "info" });
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarAnimClass, setSnackbarAnimClass] = useState("");

  // ---- Maintenance Form State ----
  const [maintReason, setMaintReason] = useState("Plumbing");
  const [maintNotes, setMaintNotes] = useState("");
  const [maintDuration, setMaintDuration] = useState("");

  // ---- Record Lease Form State ----
  const [leaseTenantName, setLeaseTenantName] = useState("");
  const [leaseTenantPhone, setLeaseTenantPhone] = useState("");
  const [leaseStart, setLeaseStart] = useState("");
  const [leaseTerm, setLeaseTerm] = useState("12 months");
  const [leaseRent, setLeaseRent] = useState("");
  const [leaseDeposit, setLeaseDeposit] = useState("");

  // ---- Snackbar effect ----
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

  // ---- Reset form states when sub-sheet opens ----
  const openSubSheet = (name: string) => {
    if (name === "maintenance") {
      setMaintReason("Plumbing");
      setMaintNotes("");
      setMaintDuration("");
    }
    if (name === "recordLease" && pd) {
      setLeaseTenantName("");
      setLeaseTenantPhone("");
      setLeaseStart("");
      setLeaseTerm("12 months");
      setLeaseRent(pd.rent.toString());
      setLeaseDeposit(pd.deposit.toString());
    }
    setSubSheet(name);
  };

  // ---- Auto-open initial sub-sheet when mounted ----
  useEffect(() => {
    if (isOpen && initialSubSheet) {
      openSubSheet(initialSubSheet);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const closeSubSheet = () => setSubSheet(null);

  // ---- Action Handlers ----
  const handleMaintenance = async () => {
    if (!pd) return;
    setFormLoading("maintenance");
    try {
      await setUnitMaintenance(pd.id, maintReason, maintNotes, maintDuration);
      setFormLoading(null);
      closeSubSheet();
      showSnackbar("Unit marked for maintenance 🔧", "info");
    } catch (err: any) {
      setFormLoading(null);
      showSnackbar(err?.message || "Failed to set maintenance", "error");
    }
  };

  const handleVacate = async () => {
    if (!pd) return;
    setFormLoading("vacate");
    try {
      await vacateUnit(pd.id);
      setFormLoading(null);
      closeSubSheet();
      onClose();
      setTimeout(() => showSnackbar("Unit marked as vacant", "info"), 300);
    } catch (err: any) {
      setFormLoading(null);
      showSnackbar(err?.message || "Failed to vacate unit", "error");
    }
  };

  const handleDelete = async () => {
    if (!pd) return;
    setFormLoading("delete");
    try {
      await deleteUnit(pd.id);
      setFormLoading(null);
      closeSubSheet();
      onClose();
      setTimeout(() => showSnackbar("Unit deleted permanently", "error"), 300);
    } catch (err: any) {
      setFormLoading(null);
      showSnackbar(err?.message || "Failed to delete unit", "error");
    }
  };

  const handleRecordLease = async () => {
    if (!pd) return;
    setFormLoading("record-lease");
    try {
      await recordLease(pd.id, {
        tenantName: leaseTenantName,
        tenantPhone: leaseTenantPhone,
        leaseStart,
        leaseTerm,
        rent: parseInt(leaseRent.replace(/,/g, "")) || 0,
        deposit: parseInt(leaseDeposit.replace(/,/g, "")) || 0,
        status: "Occupied",
      });
      setFormLoading(null);
      closeSubSheet();
      onClose();
      setTimeout(() => showSnackbar("Lease recorded! 🎉", "success"), 300);
    } catch (err: any) {
      setFormLoading(null);
      showSnackbar(err?.message || "Failed to record lease", "error");
    }
  };

  if (!isOpen || !pd) return null;

  const s = getStatusStyle(pd.status);
  const leaseStartStr = pd.leaseStart?.toDate?.()?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) || '';
  const leaseEndStr = pd.leaseEnd?.toDate?.()?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) || '';

  // Cover image: use first Bunny.net image or placeholder
  const coverImage = pd.images?.[0] || PLACEHOLDER_IMAGE;
  const additionalImages = pd.images?.slice(1) || [];

  // Snackbar Icon
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

  return (
    <>
      {/* UNIT DETAIL SHEET */}
      <div className={`sheet-overlay ${isOpen && !subSheet ? "active" : ""}`} onClick={onClose} />
      <div className={`bottom-sheet ${isOpen && !subSheet ? "active" : ""}`} style={{ maxHeight: "95dvh" }}>
        <div className="sheet-handle" />

        {/* Header with cover photo */}
        <div className="relative" style={{ height: "160px" }}>
          <img src={coverImage} className="w-full h-full object-cover" alt={pd.name} />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top,#1A1D21 0%,transparent 50%)" }} />
          <div className="absolute top-3 left-3">
            <span className="chip text-white" style={{ background: s.chipBg, color: s.chipColor, backdropFilter: "blur(8px)" }}>{pd.status}</span>
          </div>
          <div className="absolute top-3 right-3">
            <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }}>
              <XIcon className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        <div className="px-5 -mt-6 relative z-10">
          <h3 className="text-xl font-bold text-white">{pd.name}</h3>
          <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: "#a3a3a3" }}>
            <Building2 className="w-3.5 h-3.5" /> {pd.propertyName}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="chip" style={{ background: "rgba(255,255,255,0.04)", color: "#a3a3a3" }}>{pd.type}</span>
            <span className="chip" style={{ background: "rgba(4,120,87,0.1)", color: "#047857" }}>KSh {pd.rent.toLocaleString()}/mo</span>
          </div>

          {/* Mini Stats */}
          <div className="grid grid-cols-4 gap-2 mt-4 mb-4">
            {[
              { label: "Deposit", value: `KSh ${(pd.deposit / 1000).toFixed(0)}K` },
              { label: "Lease Term", value: pd.leaseTerm || "—" },
              { label: "Since", value: leaseStartStr ? new Date(leaseStartStr).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : "—" },
              { label: "Area", value: pd.area ? `${pd.area} sqm` : "—" },
            ].map((stat, i) => (
              <div key={i} className="p-2.5 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.03)" }}>
                <p className="text-xs" style={{ color: "#525252" }}>{stat.label}</p>
                <p className="text-xs font-semibold text-white mt-0.5">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex -mx-5 px-5 overflow-x-auto" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", scrollbarWidth: "none" }}>
            {["overview", "payments", "activity"].map((tab) => (
              <div
                key={tab}
                className={`detail-tab ${activeDetailTab === tab ? "active" : ""}`}
                onClick={() => setActiveDetailTab(tab as DetailTab)}
              >
                {tab === "overview" ? "Overview" : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </div>
            ))}
          </div>

          {/* OVERVIEW TAB */}
          {activeDetailTab === "overview" && (
            <div className="pt-4 pb-6">
              {/* Bunny.net Image Gallery */}
              {additionalImages.length > 0 && (
                <>
                  <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#525252" }}>Photos</h4>
                  <div className="flex gap-2 overflow-x-auto pb-3 mb-3" style={{ scrollbarWidth: "none" }}>
                    {additionalImages.map((imgUrl, idx) => (
                      <div key={idx} className="flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
                        <img src={imgUrl} className="w-full h-full object-cover" alt={`${pd.name} photo ${idx + 2}`} />
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Current Tenant */}
              {pd.tenantName ? (
                <>
                  <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#525252" }}>Current Tenant</h4>
                  <div className="flex items-center gap-3 p-3 rounded-xl mb-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.04)" }}>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(4,120,87,0.15)" }}>
                      <span className="text-xs font-bold" style={{ color: "#047857" }}>{pd.tenantInitials}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white">{pd.tenantName}</p>
                      <p className="text-xs" style={{ color: "#a3a3a3" }}>{pd.tenantPhone ? `+254 ${pd.tenantPhone} • ` : ''}Since {leaseStartStr}</p>
                    </div>
                    <div className="flex gap-2">
                      {pd.tenantPhone && (
                        <a href={`tel:${pd.tenantPhone}`} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(4,120,87,0.1)" }}>
                          <Phone className="w-4 h-4" style={{ color: "#047857" }} />
                        </a>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-4 rounded-xl mb-4 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.04)" }}>
                  <p className="text-sm" style={{ color: "#a3a3a3" }}>No tenant — unit is vacant</p>
                  {/* Record Lease shortcut for vacant units */}
                  <button
                    onClick={() => openSubSheet("recordLease")}
                    className="mt-3 text-sm font-semibold"
                    style={{ color: "#3b82f6" }}
                  >
                    Record Lease →
                  </button>
                </div>
              )}

              {/* Lease Info */}
              {pd.leaseTerm && (
                <>
                  <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#525252" }}>Lease Details</h4>
                  <div className="p-3 rounded-xl mb-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.04)" }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs" style={{ color: "#a3a3a3" }}>Start Date</span>
                      <span className="text-sm font-medium text-white">{leaseStartStr || "—"}</span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs" style={{ color: "#a3a3a3" }}>End Date</span>
                      <span className="text-sm font-medium text-white">{leaseEndStr || "—"}</span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs" style={{ color: "#a3a3a3" }}>Duration</span>
                      <span className="text-sm font-medium text-white">{pd.leaseTerm}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: "#a3a3a3" }}>Rent</span>
                      <span className="text-sm font-medium text-white">KSh {pd.rent.toLocaleString()}/mo</span>
                    </div>
                  </div>
                </>
              )}

              {/* Payment Status */}
              <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#525252" }}>Payment</h4>
              <div className="p-3 rounded-xl mb-4" style={{ background: pd.payment === "Paid" ? "rgba(4,120,87,0.04)" : "rgba(234,179,8,0.04)", border: `1px solid ${pd.payment === "Paid" ? "rgba(4,120,87,0.12)" : "rgba(234,179,8,0.12)"}` }}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white">KSh {pd.rent.toLocaleString()}</span>
                  <span className="chip" style={{ background: pd.payment === "Paid" ? "rgba(4,120,87,0.1)" : "rgba(234,179,8,0.1)", color: pd.payment === "Paid" ? "#047857" : "#eab308", fontSize: "11px" }}>{pd.payment || "Pending"}</span>
                </div>
              </div>

              {/* Description */}
              {pd.description && (
                <>
                  <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#525252" }}>Description</h4>
                  <p className="text-sm leading-relaxed mb-4" style={{ color: "#a3a3a3" }}>{pd.description}</p>
                </>
              )}

              {/* Amenities */}
              {pd.amenities && pd.amenities.length > 0 && (
                <>
                  <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#525252" }}>Amenities</h4>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {pd.amenities.map((a, i) => (
                      <span key={i} className="chip" style={{ background: "rgba(4,120,87,0.1)", color: "#047857" }}>{a}</span>
                    ))}
                  </div>
                </>
              )}

              {/* Actions */}
              <div className="space-y-2 mt-5 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <button
                  onClick={onEdit}
                  className="w-full flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.12)" }}
                >
                  <Pencil className="w-4 h-4" style={{ color: "#3b82f6" }} />
                  <span className="text-sm font-medium text-white">Edit Unit</span>
                </button>

                {/* Vacant unit actions: List on Marketplace + Record Lease */}
                {pd.status === "Vacant" && (
                  <>
                    <button
                      onClick={() => {
                        onClose();
                        setTimeout(() => {
                          router.push(`/listings?createFromUnit=${pd.id}&propertyId=${pd.propertyId}&propertyName=${encodeURIComponent(pd.propertyName)}&unitName=${encodeURIComponent(pd.name)}&rent=${pd.rent}&unitType=${encodeURIComponent(pd.type)}`);
                        }, 300);
                      }}
                      className="w-full flex items-center gap-3 p-3 rounded-xl"
                      style={{ background: "rgba(4,120,87,0.06)", border: "1px solid rgba(4,120,87,0.12)" }}
                    >
                      <List className="w-4 h-4" style={{ color: "#047857" }} />
                      <span className="text-sm font-medium text-white">List on Marketplace</span>
                      <ExternalLink className="w-3.5 h-3.5 ml-auto" style={{ color: "#047857" }} />
                    </button>
                    <button
                      onClick={() => openSubSheet("recordLease")}
                      className="w-full flex items-center gap-3 p-3 rounded-xl"
                      style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.12)" }}
                    >
                      <CalendarDays className="w-4 h-4" style={{ color: "#3b82f6" }} />
                      <span className="text-sm font-medium text-white">Record Lease</span>
                    </button>
                  </>
                )}

                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => openSubSheet("maintenance")}
                    className="flex flex-col items-center gap-1 p-3 rounded-xl"
                    style={{ background: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.12)" }}
                  >
                    <Wrench className="w-4 h-4" style={{ color: "#a855f7" }} />
                    <span className="text-xs font-medium" style={{ color: "#a855f7" }}>Maintenance</span>
                  </button>
                  <button
                    onClick={() => openSubSheet("vacate")}
                    className="flex flex-col items-center gap-1 p-3 rounded-xl"
                    style={{ background: "rgba(234,179,8,0.06)", border: "1px solid rgba(234,179,8,0.12)" }}
                  >
                    <UserX className="w-4 h-4" style={{ color: "#eab308" }} />
                    <span className="text-xs font-medium" style={{ color: "#eab308" }}>Vacate</span>
                  </button>
                  <button
                    onClick={() => openSubSheet("delete")}
                    className="flex flex-col items-center gap-1 p-3 rounded-xl"
                    style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.12)" }}
                  >
                    <Trash2 className="w-4 h-4" style={{ color: "#ef4444" }} />
                    <span className="text-xs font-medium" style={{ color: "#ef4444" }}>Delete</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* PAYMENTS TAB */}
          {activeDetailTab === "payments" && (
            <div className="pt-4 pb-6">
              <div className="p-4 rounded-xl mb-4 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <p className="text-sm" style={{ color: "#a3a3a3" }}>
                  Payment history will appear here once payments are recorded.
                </p>
              </div>
            </div>
          )}

          {/* ACTIVITY TAB */}
          {activeDetailTab === "activity" && (
            <div className="pt-4 pb-6">
              <div className="p-4 rounded-xl mb-4 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <p className="text-sm" style={{ color: "#a3a3a3" }}>
                  Activity log will show updates like rent payments, lease changes, and maintenance for this unit.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ====== MAINTENANCE SUB-SHEET ====== */}
      <div className={`sheet-overlay ${subSheet === "maintenance" ? "active" : ""}`} onClick={closeSubSheet} />
      <div className={`bottom-sheet ${subSheet === "maintenance" ? "active" : ""}`}>
        <div className="sheet-handle" />
        <div className="p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-white">Set Maintenance</h3>
            <button onClick={closeSubSheet} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)" }}>
              <XIcon className="w-4 h-4" style={{ color: "#a3a3a3" }} />
            </button>
          </div>
          <div className="p-4 rounded-xl mb-5" style={{ background: "rgba(168,85,247,0.04)", border: "1px solid rgba(168,85,247,0.15)" }}>
            <div className="flex items-center gap-3">
              <Wrench className="w-5 h-5" style={{ color: "#a855f7" }} />
              <div>
                <p className="text-sm font-semibold text-white">{pd.name} — {pd.propertyName}</p>
                <p className="text-xs" style={{ color: "#a3a3a3" }}>This will mark the unit as under maintenance</p>
              </div>
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
            <button
              onClick={handleMaintenance}
              className="btn-primary ripple-container"
              style={{ background: "linear-gradient(to right,#7c3aed,#a855f7)", boxShadow: "0 4px 20px rgba(168,85,247,0.3)" }}
              disabled={formLoading === "maintenance"}
            >
              {formLoading === "maintenance" ? <div className="spinner mx-auto" /> : <span>Set Maintenance</span>}
            </button>
          </div>
        </div>
      </div>

      {/* ====== VACATE SUB-SHEET ====== */}
      <div className={`sheet-overlay ${subSheet === "vacate" ? "active" : ""}`} onClick={closeSubSheet} />
      <div className={`bottom-sheet ${subSheet === "vacate" ? "active" : ""}`}>
        <div className="sheet-handle" />
        <div className="p-5 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ background: "rgba(234,179,8,0.1)", border: "1px solid rgba(234,179,8,0.2)" }}>
            <UserX className="w-8 h-8" style={{ color: "#eab308" }} />
          </div>
          <h3 className="text-lg font-bold text-white">Mark as Vacant?</h3>
          <p className="text-sm mt-2 leading-relaxed" style={{ color: "#a3a3a3" }}>
            This will remove <strong className="text-white">{pd.tenantName || 'tenant'}</strong> from unit <strong className="text-white">{pd.name}</strong> and set the unit status to vacant.
          </p>
          <div className="flex gap-3 mt-6">
            <button onClick={closeSubSheet} className="btn-secondary flex-1" style={{ padding: "14px" }}>Cancel</button>
            <button
              onClick={handleVacate}
              className="btn-danger flex-1"
              style={{ padding: "14px", background: "rgba(234,179,8,0.1)", borderColor: "rgba(234,179,8,0.2)", color: "#eab308" }}
              disabled={formLoading === "vacate"}
            >
              {formLoading === "vacate" ? <div className="spinner mx-auto" /> : <span>Vacate Unit</span>}
            </button>
          </div>
        </div>
      </div>

      {/* ====== DELETE SUB-SHEET ====== */}
      <div className={`sheet-overlay ${subSheet === "delete" ? "active" : ""}`} onClick={closeSubSheet} />
      <div className={`bottom-sheet ${subSheet === "delete" ? "active" : ""}`}>
        <div className="sheet-handle" />
        <div className="p-5 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <Trash2 className="w-8 h-8" style={{ color: "#ef4444" }} />
          </div>
          <h3 className="text-lg font-bold text-white">Delete Unit?</h3>
          <p className="text-sm mt-2 leading-relaxed" style={{ color: "#a3a3a3" }}>
            Permanently remove <strong className="text-white">{pd.name}</strong> from {pd.propertyName}. This cannot be undone.
          </p>
          <div className="flex gap-3 mt-6">
            <button onClick={closeSubSheet} className="btn-secondary flex-1" style={{ padding: "14px" }}>Cancel</button>
            <button onClick={handleDelete} className="btn-danger flex-1" style={{ padding: "14px" }} disabled={formLoading === "delete"}>
              {formLoading === "delete" ? <div className="spinner mx-auto" /> : <span>Delete</span>}
            </button>
          </div>
        </div>
      </div>

      {/* ====== RECORD LEASE SUB-SHEET ====== */}
      <div className={`sheet-overlay ${subSheet === "recordLease" ? "active" : ""}`} onClick={closeSubSheet} />
      <div className={`bottom-sheet ${subSheet === "recordLease" ? "active" : ""}`} style={{ maxHeight: "95dvh" }}>
        <div className="sheet-handle" />
        <div className="p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-white">Record Lease</h3>
            <button onClick={closeSubSheet} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)" }}>
              <XIcon className="w-4 h-4" style={{ color: "#a3a3a3" }} />
            </button>
          </div>
          <div className="space-y-4">
            <div className="p-4 rounded-xl" style={{ background: "rgba(59,130,246,0.04)", border: "1px solid rgba(59,130,246,0.15)" }}>
              <p className="text-xs font-medium" style={{ color: "#3b82f6" }}>Recording lease for</p>
              <p className="text-sm font-bold text-white">{pd.name} — {pd.propertyName}</p>
            </div>
            <div className="input-group">
              <input type="text" className="android-input" placeholder=" " value={leaseTenantName} onChange={(e) => setLeaseTenantName(e.target.value)} />
              <label>Tenant Name</label>
            </div>
            <div className="input-group">
              <input type="tel" className="android-input" placeholder=" " style={{ paddingLeft: "60px" }} value={leaseTenantPhone} onChange={(e) => setLeaseTenantPhone(e.target.value)} />
              <label style={{ left: "60px" }}>Phone Number</label>
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: "#a3a3a3" }}>+254</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="input-group">
                <input type="date" className="android-input" placeholder=" " value={leaseStart} onChange={(e) => setLeaseStart(e.target.value)} />
                <label>Lease Start</label>
              </div>
              <div className="input-group">
                <select className="android-select" value={leaseTerm} onChange={(e) => setLeaseTerm(e.target.value)}>
                  {LEASE_TERM_OPTIONS.map((t) => <option key={t}>{t}</option>)}
                </select>
                <label style={{ top: "10px", fontSize: "11px", color: "#047857", fontWeight: 500 }}>Term</label>
              </div>
            </div>
            <div className="input-group">
              <input type="text" className="android-input ksh-prefix" placeholder=" " value={leaseRent} onChange={(e) => setLeaseRent(e.target.value)} />
              <label style={{ left: "60px" }}>Monthly Rent</label>
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: "#a3a3a3" }}>KSh</span>
            </div>
            <div className="input-group">
              <input type="text" className="android-input ksh-prefix" placeholder=" " value={leaseDeposit} onChange={(e) => setLeaseDeposit(e.target.value)} />
              <label style={{ left: "60px" }}>Security Deposit</label>
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: "#a3a3a3" }}>KSh</span>
            </div>
            <button
              onClick={handleRecordLease}
              className="btn-primary ripple-container mt-2"
              disabled={formLoading === "record-lease"}
            >
              {formLoading === "record-lease" ? <div className="spinner mx-auto" /> : <span>Confirm Lease</span>}
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
    </>
  );
}

// ---- Helper Functions ----

function getStatusStyle(status: string) {
  switch (status) {
    case "Occupied":
      return { dotColor: "#047857", chipBg: "rgba(4,120,87,0.1)", chipColor: "#047857", avatarBg: "rgba(4,120,87,0.1)", avatarColor: "#047857" };
    case "Vacant":
      return { dotColor: "#ef4444", chipBg: "rgba(239,68,68,0.1)", chipColor: "#ef4444", avatarBg: "rgba(239,68,68,0.08)", avatarColor: "#ef4444" };
    case "Overdue":
      return { dotColor: "#eab308", chipBg: "rgba(234,179,8,0.1)", chipColor: "#eab308", avatarBg: "rgba(234,179,8,0.08)", avatarColor: "#eab308" };
    default:
      return { dotColor: "#a855f7", chipBg: "rgba(168,85,247,0.1)", chipColor: "#a855f7", avatarBg: "rgba(168,85,247,0.08)", avatarColor: "#a855f7" };
  }
}

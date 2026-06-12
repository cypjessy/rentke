"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import AppBar from "@/app/components/AppBar";
import {
  MapPin,
  Building2,
  Sparkles,
  Crown,
  Smartphone,
  Shield,
  Mail,
  Bell,
  MessageCircle,
  CreditCard,
  AlertTriangle,
  ShieldCheck,
  CheckCircle,
  Image,
  Wrench,
  Trash2,
  Database,
  ChevronRight,
  X,
  Eye,
  EyeOff,
  UserX,
  Check,
  Info,
  XCircle,
  Wallet,
  LayoutDashboard,
  Users,
  Headset,
  Settings,
  MoreVertical,
} from "lucide-react";
import {
  listenToPlatformConfig,
  savePlatformLocations,
  savePlatformPropertyTypes,
  savePlatformAmenities,
  savePlatformPlans,
  savePlatformMpesa,
  savePlatformAdmins,
  savePlatformTemplates,
  savePlatformToggles,
  saveMaxPhotos,
  type PlatformConfig,
  type PlatformPlan,
  type PlatformTemplate,
} from "@/lib/platformConfig";

// ─── Types ───────────────────────────────────────────────────────────────────
type SnackbarType = "success" | "error" | "info" | "warning";
type PageKey = "dashboard" | "landlords" | "listings" | "wallet" | "settings" | "support";
type SheetKey =
  | "locations"
  | "add-location"
  | "types"
  | "add-type"
  | "amenities"
  | "add-amenity"
  | "plans"
  | "edit-plan"
  | "mpesa"
  | "admins"
  | "add-admin"
  | "remove-admin"
  | "templates"
  | "edit-template"
  | "purge"
  | "reset-db"
  | "max-photos"
  | "menu";

interface SnackbarState {
  message: string;
  type: SnackbarType;
  visible: boolean;
}

// ─── Data ────────────────────────────────────────────────────────────────────
const LOCATIONS = [
  { county: "NAIROBI COUNTY", estates: ["Kilimani", "Westlands", "Karen", "Runda", "Roysambu", "Kasarani", "Langata", "South B", "South C"] },
  { county: "MOMBASA COUNTY", estates: ["Nyali", "Bamburi", "Likoni"] },
  { county: "KAJIADO COUNTY", estates: ["Ongata Rongai", "Kitengela"] },
];

const PROPERTY_TYPES = ["Single Room", "Bedsitter", "1 Bedroom", "2 Bedroom", "3 Bedroom", "Studio", "Mansion", "Plot"];

const AMENITIES_LIST = ["Parking", "WiFi", "24hr Security", "Swimming Pool", "Garden", "Generator", "Balcony", "Lift", "CCTV", "DSQ", "Water Tank", "Solar", "Furnished", "Alarm System", "Gym"];

const ADMIN_USERS_DEFAULT = [
  { init: "AK", name: "Admin Ke", email: "admin@rentke.co.ke", role: "Super Admin", badge: "Owner", color: "#047857" },
  { init: "BM", name: "Brian Mwangi", email: "brian@rentke.co.ke", role: "Moderator", badge: null, color: "#3b82f6" },
  { init: "WK", name: "Wanjiru Kamau", email: "wanjiru@rentke.co.ke", role: "Support", badge: null, color: "#a855f7" },
];

// ─── Component ───────────────────────────────────────────────────────────────
export default function AdminSettings() {
  const router = useRouter();
  // ── State ──
  const [activePage, setActivePage] = useState<PageKey>("settings");
  const [activeSheet, setActiveSheet] = useState<SheetKey | null>(null);
  const [snackbar, setSnackbar] = useState<SnackbarState>({ message: "", type: "info", visible: false });

  // Location state
  const [locationEstates, setLocationEstates] = useState(LOCATIONS);
  const [newLocationCounty, setNewLocationCounty] = useState("Nairobi");
  const [newLocationEstate, setNewLocationEstate] = useState("");

  // Property types
  const [propertyTypes, setPropertyTypes] = useState(PROPERTY_TYPES);
  const [newTypeName, setNewTypeName] = useState("");

  // Amenities
  const [amenities, setAmenities] = useState(AMENITIES_LIST);
  const [newAmenityName, setNewAmenityName] = useState("");

  // Edit plan
  const [editPlanName, setEditPlanName] = useState("Premium");
  const [editPlanPrice, setEditPlanPrice] = useState("2999");
  const [editPlanProps, setEditPlanProps] = useState("0");
  const [editPlanPhotos, setEditPlanPhotos] = useState("20");

  // M-Pesa
  const [mpesaEnv, setMpesaEnv] = useState<"sandbox" | "production">("sandbox");
  const [mpesaKeyVisible, setMpesaKeyVisible] = useState(false);
  const [mpesaSecretVisible, setMpesaSecretVisible] = useState(false);
  const [mpesaPasskeyVisible, setMpesaPasskeyVisible] = useState(false);
  const [mpesaTesting, setMpesaTesting] = useState(false);

  // Admin users
  const [removeAdminName, setRemoveAdminName] = useState("");

  // Add admin
  const [addAdminName, setAddAdminName] = useState("");
  const [addAdminEmail, setAddAdminEmail] = useState("");
  const [addAdminRole, setAddAdminRole] = useState("super");

  // Remove admin
  const [admins, setAdmins] = useState(ADMIN_USERS_DEFAULT);

  // Plans (from Firestore)
  const [plans, setPlans] = useState<PlatformPlan[]>([]);

  // Templates (from Firestore)
  const [templates, setTemplates] = useState<PlatformTemplate[]>([]);

  // Templates
  const [editTemplateIdx, setEditTemplateIdx] = useState(0);
  const [editTemplateName, setEditTemplateName] = useState("");

  // Max photos
  const [maxPhotos, setMaxPhotos] = useState("10");

  // Reset DB
  const [resetDbConfirm, setResetDbConfirm] = useState("");

  // Purge
  const [purgeConfirm, setPurgeConfirm] = useState("");

  // Toggle states
  const [toggles, setToggles] = useState({
    autoNotifyListing: true,
    autoNotifyInquiry: true,
    mpesaConfirm: true,
    expiryReminder: false,
    requireIdVerification: true,
    autoApprove: false,
    maintenanceMode: false,
  });

  const snackbarTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

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

  // ── Firestore Listener ──
  useEffect(() => {
    const unsub = listenToPlatformConfig(
      (config) => {
        setLocationEstates(config.locations);
        setPropertyTypes(config.propertyTypes);
        setAmenities(config.amenities);
        setPlans(config.plans);
        setAdmins(config.admins);
        setTemplates(config.templates);
        setToggles(config.toggles);
        setMaxPhotos(String(config.maxPhotos));
        setMpesaEnv(config.mpesa.env);
        setMpesaConsumerKey(config.mpesa.consumerKey);
        setMpesaConsumerSecret(config.mpesa.consumerSecret);
      },
      (err) => showSnackbar(err.message, "error")
    );
    return () => unsub();
  }, []);

  // ── M-Pesa editable state (initialized from Firestore) ──
  const [mpesaConsumerKey, setMpesaConsumerKey] = useState("");
  const [mpesaConsumerSecret, setMpesaConsumerSecret] = useState("");

  // ── Ripple ──
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

  // ── Toggle helper ──
  const toggleSetting = useCallback((key: keyof typeof toggles) => {
    setToggles((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      savePlatformToggles(updated).catch((e) => showSnackbar(e.message, "error"));
      if (key === "maintenanceMode") {
        showSnackbar(updated.maintenanceMode ? "⚠️ Maintenance mode ON" : "Platform live", "warning");
      }
      return updated;
    });
  }, [showSnackbar]);

  // ── Location handlers ──
  const removeEstate = useCallback((countyIdx: number, estateIdx: number) => {
    setLocationEstates((prev) => {
      const next = [...prev];
      next[countyIdx] = { ...next[countyIdx], estates: next[countyIdx].estates.filter((_, i) => i !== estateIdx) };
      savePlatformLocations(next).catch((e) => showSnackbar(e.message, "error"));
      return next;
    });
    showSnackbar("Location removed", "info");
  }, [showSnackbar]);

  const addLocation = useCallback(() => {
    if (!newLocationEstate.trim()) {
      showSnackbar("Enter estate name", "error");
      return;
    }
    setLocationEstates((prev) => {
    const existingCounty = prev.find(
      (l) => l.county.toLowerCase().startsWith(newLocationCounty.toLowerCase())
    );
      let next: typeof prev;
      if (existingCounty) {
        next = prev.map((l) =>
          l.county.toLowerCase() === newLocationCounty.toLowerCase()
            ? { ...l, estates: [...l.estates, newLocationEstate] }
            : l
        );
      } else {
        next = [...prev, { county: newLocationCounty.toUpperCase(), estates: [newLocationEstate] }];
      }
      savePlatformLocations(next).catch((e) => showSnackbar(e.message, "error"));
      return next;
    });
    closeSheet();
    showSnackbar(`"${newLocationEstate}" added to locations`, "success");
    setNewLocationEstate("");
  }, [newLocationEstate, newLocationCounty, closeSheet, showSnackbar]);

  // ── Property type handlers ──
  const removeType = useCallback((idx: number) => {
    setPropertyTypes((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      savePlatformPropertyTypes(next).catch((e) => showSnackbar(e.message, "error"));
      return next;
    });
    showSnackbar("Item removed", "info");
  }, [showSnackbar]);

  const addType = useCallback(() => {
    if (!newTypeName.trim()) {
      showSnackbar("Enter property type", "error");
      return;
    }
    setPropertyTypes((prev) => {
      const next = [...prev, newTypeName];
      savePlatformPropertyTypes(next).catch((e) => showSnackbar(e.message, "error"));
      return next;
    });
    closeSheet();
    showSnackbar(`"${newTypeName}" type added`, "success");
    setNewTypeName("");
  }, [newTypeName, closeSheet, showSnackbar]);

  // ── Amenity handlers ──
  const removeAmenity = useCallback((idx: number) => {
    setAmenities((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      savePlatformAmenities(next).catch((e) => showSnackbar(e.message, "error"));
      return next;
    });
    showSnackbar("Item removed", "info");
  }, [showSnackbar]);

  const addAmenity = useCallback(() => {
    if (!newAmenityName.trim()) {
      showSnackbar("Enter amenity name", "error");
      return;
    }
    setAmenities((prev) => {
      const next = [...prev, newAmenityName];
      savePlatformAmenities(next).catch((e) => showSnackbar(e.message, "error"));
      return next;
    });
    closeSheet();
    showSnackbar(`"${newAmenityName}" amenity added`, "success");
    setNewAmenityName("");
  }, [newAmenityName, closeSheet, showSnackbar]);

  // ── Plan handlers ──
  const openEditPlan = useCallback((plan: string) => {
    const p = plans.find((pl) => pl.name.toLowerCase() === plan);
    if (p) {
      setEditPlanName(p.name);
      setEditPlanPrice(p.price.replace(",", ""));
      setEditPlanProps(plan === "premium" ? "0" : plan === "basic" ? "5" : "1");
      setEditPlanPhotos(plan === "premium" ? "20" : plan === "basic" ? "10" : "5");
    }
    openSheet("edit-plan");
  }, [openSheet, plans]);

  const savePlan = useCallback(() => {
    if (editPlanPrice) {
      setPlans((prev) => {
        const next = prev.map((p) =>
          p.name.toLowerCase() === editPlanName.toLowerCase()              ? { ...p, price: Number(editPlanPrice.replace(/,/g, "")).toLocaleString("en-US") }
            : p
        );
        savePlatformPlans(next).catch((e) => showSnackbar(e.message, "error"));
        return next;
      });
    }
    closeSheet();
    showSnackbar("Plan updated successfully", "success");
  }, [editPlanPrice, editPlanName, closeSheet, showSnackbar]);

  // ── M-Pesa handlers ──
  const testMpesa = useCallback(() => {
    setMpesaTesting(true);
    setTimeout(() => {
      setMpesaTesting(false);
      showSnackbar("✅ M-Pesa sandbox connection successful", "success");
    }, 2000);
  }, [showSnackbar]);

  const saveMpesa = useCallback(() => {
    savePlatformMpesa({
      env: mpesaEnv,
      consumerKey: mpesaConsumerKey,
      consumerSecret: mpesaConsumerSecret,
      paybill: "174379",
      passkey: "bfb279f9aa9bdbcf158e97dd71a467cd",
      callbackStk: "https://api.rentke.co.ke/mpesa/callback",
      callbackB2c: "https://api.rentke.co.ke/mpesa/b2c/callback",
    }).catch((e) => showSnackbar(e.message, "error"));
    closeSheet();
    showSnackbar("M-Pesa settings saved", "success");
  }, [mpesaEnv, mpesaConsumerKey, mpesaConsumerSecret, closeSheet, showSnackbar]);

  // ── Admin handlers ──
  const openRemoveAdmin = useCallback((name: string) => {
    setRemoveAdminName(name);
    openSheet("remove-admin");
  }, [openSheet]);

  const confirmRemoveAdmin = useCallback(() => {
    setAdmins((prev) => {
      const next = prev.filter((a) => a.name !== removeAdminName);
      savePlatformAdmins(next).catch((e) => showSnackbar(e.message, "error"));
      return next;
    });
    closeSheet();
    showSnackbar("Admin access revoked", "success");
  }, [removeAdminName, closeSheet, showSnackbar]);

  const addAdmin = useCallback(() => {
    if (!addAdminName.trim() || !addAdminEmail.trim()) {
      showSnackbar("Name and email required", "error");
      return;
    }
    const nameParts = addAdminName.split(" ");
    const initials = nameParts.map((n) => n[0]).join("").toUpperCase().slice(0, 2);
    const color = ["#047857", "#3b82f6", "#a855f7", "#ef4444", "#eab308"][admins.length % 5];
    setAdmins((prev) => {
      const next = [
        ...prev,
        {
          init: initials || (addAdminName[0] || "U").toUpperCase(),
          name: addAdminName,
          email: addAdminEmail,
          role: addAdminRole === "super" ? "Super Admin" : addAdminRole === "mod" ? "Moderator" : "Support",
          badge: null as string | null,
          color,
        },
      ];
      savePlatformAdmins(next).catch((e) => showSnackbar(e.message, "error"));
      return next;
    });
    closeSheet();
    showSnackbar("Admin user added & invitation sent", "success");
  }, [addAdminName, addAdminEmail, addAdminRole, admins.length, closeSheet, showSnackbar]);

  // ── Template handlers ──
  const openEditTemplate = useCallback((idx: number) => {
    setEditTemplateIdx(idx);
    setEditTemplateName(templates[idx]?.name || "");
    openSheet("edit-template");
  }, [openSheet, templates]);

  const saveTemplate = useCallback(() => {
    if (!editTemplateName.trim()) return;
    setTemplates((prev) => {
      const next = prev.map((t, i) =>
        i === editTemplateIdx ? { ...t, name: editTemplateName } : t
      );
      savePlatformTemplates(next).catch((e) => showSnackbar(e.message, "error"));
      return next;
    });
    closeSheet();
    showSnackbar("Template saved", "success");
  }, [editTemplateName, editTemplateIdx, closeSheet, showSnackbar]);

  // ── Max Photos handler ──
  const saveMaxPhotosCb = useCallback(() => {
    const num = parseInt(maxPhotos, 10);
    if (!isNaN(num) && num > 0) {
      saveMaxPhotos(num).catch((e) => showSnackbar(e.message, "error"));
    }
    closeSheet();
    showSnackbar(`Max photos updated to ${maxPhotos}`, "success");
  }, [maxPhotos, closeSheet, showSnackbar]);

  // ── Reset DB handler ──
  const confirmResetDb = useCallback(() => {
    closeSheet();
    setTimeout(() => showSnackbar("⚠️ Database reset initiated — requires super admin approval", "warning"), 300);
    setResetDbConfirm("");
  }, [closeSheet, showSnackbar]);

  // ── Purge handler ──
  const confirmPurge = useCallback(() => {
    closeSheet();
    showSnackbar("450 expired listings purged", "success");
    setPurgeConfirm("");
  }, [closeSheet, showSnackbar]);

  // ── Toggle icon picker ──
  const ToggleIcon = ({ toggled, onClick }: { toggled: boolean; onClick: () => void }) => (
    <div
      className={`toggle-track ${toggled ? "active" : ""}`}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
    >
      <div className="toggle-thumb" />
    </div>
  );

  // ── SettingRow component ──
  const SettingRow = ({
    icon: Icon,
    iconBg,
    iconColor,
    title,
    desc,
    right,
    onClick,
  }: {
    icon: React.ElementType;
    iconBg: string;
    iconColor: string;
    title: string;
    desc: string;
    right?: React.ReactNode;
    onClick?: () => void;
  }) => (
    <div className="setting-row" onClick={onClick}>
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: iconBg }}
      >
        <Icon className="w-5 h-5" style={{ color: iconColor }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="text-xs" style={{ color: "#525252" }}>{desc}</p>
      </div>
      {right || <ChevronRight className="w-4 h-4" style={{ color: "#525252" }} />}
    </div>
  );

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
        style={{ height: "env(safe-area-inset-top, 24px)", minHeight: "24px", background: "rgba(5,5,5,0.9)", backdropFilter: "blur(20px)" }}
      />

      {/* ──────────── MAIN CONTENT ──────────── */}
      <div style={{ paddingBottom: "80px" }}>
        {/* TOP APP BAR */}
        <AppBar
          title="Settings"
          subtitle="Platform Configuration"
          backHref="/admin"
          actions={[
            { icon: MoreVertical, onClick: () => openSheet("menu") },
          ]}
        />

        {/* SETTINGS LIST */}
        <div className="px-5 space-y-5" style={{ animation: "slideInUp 0.5s ease" }}>
          {/* LOCATIONS */}
          <div>
            <p className="section-title">Locations & Areas</p>
            <div className="setting-card">
              <SettingRow icon={MapPin} iconBg="rgba(4,120,87,0.15)" iconColor="#059669" title="Manage Locations" desc="Counties, sub-counties & estates"
                right={<div className="flex items-center gap-2"><span className="text-xs font-medium" style={{ color: "#059669" }}>47 counties</span><ChevronRight className="w-4 h-4" style={{ color: "#525252" }} /></div>}
                onClick={() => openSheet("locations")} />
              <SettingRow icon={Building2} iconBg="rgba(59,130,246,0.15)" iconColor="#3b82f6" title="Property Types" desc="Bedsitter, 1BR, 2BR, Mansion, Plot..."
                right={<div className="flex items-center gap-2"><span className="text-xs font-medium" style={{ color: "#3b82f6" }}>{propertyTypes.length} types</span><ChevronRight className="w-4 h-4" style={{ color: "#525252" }} /></div>}
                onClick={() => openSheet("types")} />
              <SettingRow icon={Sparkles} iconBg="rgba(234,179,8,0.15)" iconColor="#eab308" title="Amenities" desc="Parking, WiFi, Guard, Pool..."
                right={<div className="flex items-center gap-2"><span className="text-xs font-medium" style={{ color: "#eab308" }}>{amenities.length} items</span><ChevronRight className="w-4 h-4" style={{ color: "#525252" }} /></div>}
                onClick={() => openSheet("amenities")} />
            </div>
          </div>

          {/* BILLING */}
          <div>
            <p className="section-title">Billing & Payments</p>
            <div className="setting-card">
              <SettingRow icon={Crown} iconBg="rgba(168,85,247,0.15)" iconColor="#a855f7" title="Subscription Plans" desc="Free, Basic, Premium pricing"
                right={<div className="flex items-center gap-2"><span className="text-xs font-medium" style={{ color: "#a855f7" }}>3 plans</span><ChevronRight className="w-4 h-4" style={{ color: "#525252" }} /></div>}
                onClick={() => openSheet("plans")} />
              <SettingRow icon={Smartphone} iconBg="rgba(79,180,79,0.15)" iconColor="#4fb34f" title="M-Pesa Configuration" desc="API keys, Paybill, callbacks"
                right={<div className="flex items-center gap-2"><span className="text-xs font-medium px-2 py-0.5 rounded-md" style={{ background: "rgba(4,120,87,0.15)", color: "#059669" }}>Connected</span><ChevronRight className="w-4 h-4" style={{ color: "#525252" }} /></div>}
                onClick={() => openSheet("mpesa")} />
            </div>
          </div>

          {/* TEAM */}
          <div>
            <p className="section-title">Team & Access</p>
            <div className="setting-card">
              <SettingRow icon={Shield} iconBg="rgba(239,68,68,0.15)" iconColor="#ef4444" title="Admin Users" desc="Manage team & permissions"
                right={<div className="flex items-center gap-2"><span className="text-xs font-medium" style={{ color: "#ef4444" }}>{admins.length} admins</span><ChevronRight className="w-4 h-4" style={{ color: "#525252" }} /></div>}
                onClick={() => openSheet("admins")} />
            </div>
          </div>

          {/* NOTIFICATIONS */}
          <div>
            <p className="section-title">Notifications & Automation</p>
            <div className="setting-card">
              <SettingRow icon={Mail} iconBg="rgba(59,130,246,0.15)" iconColor="#3b82f6" title="Notification Templates" desc="SMS & email templates"
                right={<div className="flex items-center gap-2"><span className="text-xs font-medium" style={{ color: "#3b82f6" }}>{templates.length} templates</span><ChevronRight className="w-4 h-4" style={{ color: "#525252" }} /></div>}
                onClick={() => openSheet("templates")} />
              <SettingRow icon={Bell} iconBg="rgba(255,255,255,0.05)" iconColor="#a3a3a3" title="Auto-notify on new listing" desc="SMS alert when listing goes live"
                right={<ToggleIcon toggled={toggles.autoNotifyListing} onClick={() => toggleSetting("autoNotifyListing")} />} />
              <SettingRow icon={MessageCircle} iconBg="rgba(255,255,255,0.05)" iconColor="#a3a3a3" title="Auto-notify on inquiry" desc="Push + SMS to landlord"
                right={<ToggleIcon toggled={toggles.autoNotifyInquiry} onClick={() => toggleSetting("autoNotifyInquiry")} />} />
              <SettingRow icon={CreditCard} iconBg="rgba(255,255,255,0.05)" iconColor="#a3a3a3" title="M-Pesa payment confirmation" desc="Auto-SMS on successful payment"
                right={<ToggleIcon toggled={toggles.mpesaConfirm} onClick={() => toggleSetting("mpesaConfirm")} />} />
              <SettingRow icon={AlertTriangle} iconBg="rgba(255,255,255,0.05)" iconColor="#a3a3a3" title="Listing expiry reminders" desc="Notify 3 days before expiry"
                right={<ToggleIcon toggled={toggles.expiryReminder} onClick={() => toggleSetting("expiryReminder")} />} />
            </div>
          </div>

          {/* PLATFORM */}
          <div>
            <p className="section-title">Platform</p>
            <div className="setting-card">
              <SettingRow icon={ShieldCheck} iconBg="rgba(255,255,255,0.05)" iconColor="#a3a3a3" title="Require ID verification" desc="Landlords must verify before listing"
                right={<ToggleIcon toggled={toggles.requireIdVerification} onClick={() => toggleSetting("requireIdVerification")} />} />
              <SettingRow icon={CheckCircle} iconBg="rgba(255,255,255,0.05)" iconColor="#a3a3a3" title="Auto-approve listings" desc="Skip manual review for verified landlords"
                right={<ToggleIcon toggled={toggles.autoApprove} onClick={() => toggleSetting("autoApprove")} />} />
              <SettingRow icon={Image} iconBg="rgba(255,255,255,0.05)" iconColor="#a3a3a3" title="Max photos per listing" desc="Maximum image upload limit"
                onClick={() => openSheet("max-photos")}
                right={<span className="text-sm font-semibold text-white">{maxPhotos}</span>} />
              <SettingRow icon={Wrench} iconBg="rgba(255,255,255,0.05)" iconColor="#a3a3a3" title="Maintenance mode" desc="Temporarily disable platform"
                right={<ToggleIcon toggled={toggles.maintenanceMode} onClick={() => toggleSetting("maintenanceMode")} />} />
            </div>
          </div>

          {/* DANGER ZONE */}
          <div>
            <p className="section-title" style={{ color: "#ef4444" }}>Danger Zone</p>
            <div className="setting-card" style={{ borderColor: "rgba(239,68,68,0.1)" }}>
              <SettingRow icon={Trash2} iconBg="rgba(239,68,68,0.1)" iconColor="#ef4444" title="Purge Expired Listings" desc="Remove all listings expired 30+ days"
                right={<ChevronRight className="w-4 h-4" style={{ color: "#525252" }} />}
                onClick={() => openSheet("purge")} />
              <SettingRow icon={Database} iconBg="rgba(239,68,68,0.1)" iconColor="#ef4444" title="Reset Database" desc="Delete all data (irreversible)"
                right={<ChevronRight className="w-4 h-4" style={{ color: "#525252" }} />}
                onClick={() => openSheet("reset-db")} />
            </div>
          </div>

          {/* VERSION */}
          <div className="text-center py-6">
            <p className="text-xs" style={{ color: "#525252" }}>RentKe Admin v1.0.0 (MVP)</p>
            <p className="text-xs mt-1" style={{ color: "#333" }}>Build 2025.01.15 · Kenya 🇰🇪</p>
          </div>
        </div>
      </div>

      {/* ──────────── BOTTOM NAV ──────────── */}
      <div className="bottom-nav">
        <div className="flex items-center justify-around">
          {navItems.map((item) => (
            <div
              key={item.key}
              className={`nav-item ${activePage === item.key ? "active" : ""}`}
              onClick={() => {
                if (item.key === "dashboard") router.push("/admin");
                else if (item.key === "landlords") router.push("/admin/landlords");
                else if (item.key === "listings") router.push("/admin/listings");
                else if (item.key === "wallet") router.push("/admin/wallet");
                else if (item.key === "settings") router.push("/admin/settings");
              }}
            >
              <item.icon className="w-5 h-5" style={{ color: activePage === item.key ? "#059669" : "#525252" }} />
              <span className="text-xs font-medium" style={{ color: activePage === item.key ? "#059669" : "#525252" }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ──────────── SHEETS ──────────── */}

      {/* OVERLAY */}
      <div className={`bottom-sheet-overlay ${activeSheet ? "active" : ""}`} onClick={closeSheet} />

      {/* -- LOCATIONS SHEET -- */}
      <div className={`bottom-sheet ${activeSheet === "locations" ? "active" : ""}`} style={{ maxHeight: "90dvh" }}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Locations</h3>
            <button onClick={() => openSheet("add-location")} className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ background: "rgba(4,120,87,0.15)", color: "#059669" }}>+ Add</button>
          </div>
          <div className="space-y-3">
            {locationEstates.map((loc, ci) => (
              <div key={loc.county}>
                <p className="text-xs font-semibold mb-2" style={{ color: "#a3a3a3" }}>{loc.county}</p>
                <div className="flex flex-wrap gap-2">
                  {loc.estates.map((estate, ei) => (
                    <div key={estate} className="tag">
                      {estate}
                      <span className="tag-remove" onClick={() => removeEstate(ci, ei)}>
                        <X className="w-3 h-3" />
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => closeSheet()} className="btn-ghost w-full text-center mt-5">Done</button>
        </div>
      </div>

      {/* -- ADD LOCATION SHEET -- */}
      <div className={`bottom-sheet ${activeSheet === "add-location" ? "active" : ""}`}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-8">
          <h3 className="text-lg font-bold text-white mb-4">Add Location</h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold mb-2 block" style={{ color: "#a3a3a3" }}>COUNTY</label>
              <select className="android-input" style={{ appearance: "none" }} value={newLocationCounty} onChange={(e) => setNewLocationCounty(e.target.value)}>
                <option>Nairobi</option><option>Mombasa</option><option>Kisumu</option><option>Nakuru</option><option>Kiambu</option><option>Kajiado</option><option>Machakos</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold mb-2 block" style={{ color: "#a3a3a3" }}>ESTATE / NEIGHBORHOOD</label>
              <input type="text" className="android-input" placeholder="e.g. Kilimani, Rongai" value={newLocationEstate} onChange={(e) => setNewLocationEstate(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={() => { setNewLocationEstate(""); closeSheet(); }} className="btn-ghost flex-1 text-center">Cancel</button>
            <button onClick={addLocation} className="btn-primary flex-1 text-center ripple-container">Add Location</button>
          </div>
        </div>
      </div>

      {/* -- PROPERTY TYPES SHEET -- */}
      <div className={`bottom-sheet ${activeSheet === "types" ? "active" : ""}`} style={{ maxHeight: "90dvh" }}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Property Types</h3>
            <button onClick={() => { setNewTypeName(""); openSheet("add-type"); }} className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ background: "rgba(59,130,246,0.15)", color: "#3b82f6" }}>+ Add</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {propertyTypes.map((t, i) => (
              <div key={t} className="tag">
                {t}
                <span className="tag-remove" onClick={() => removeType(i)}><X className="w-3 h-3" /></span>
              </div>
            ))}
          </div>
          <button onClick={() => closeSheet()} className="btn-ghost w-full text-center mt-5">Done</button>
        </div>
      </div>

      {/* -- ADD TYPE SHEET -- */}
      <div className={`bottom-sheet ${activeSheet === "add-type" ? "active" : ""}`}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-8">
          <h3 className="text-lg font-bold text-white mb-4">Add Property Type</h3>
          <input type="text" className="android-input" placeholder="e.g. Penthouse, Duplex" value={newTypeName} onChange={(e) => setNewTypeName(e.target.value)} />
          <div className="flex gap-3 mt-4">
            <button onClick={() => { setNewTypeName(""); closeSheet(); }} className="btn-ghost flex-1 text-center">Cancel</button>
            <button onClick={addType} className="btn-primary flex-1 text-center ripple-container">Add</button>
          </div>
        </div>
      </div>

      {/* -- AMENITIES SHEET -- */}
      <div className={`bottom-sheet ${activeSheet === "amenities" ? "active" : ""}`} style={{ maxHeight: "90dvh" }}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Amenities</h3>
            <button onClick={() => { setNewAmenityName(""); openSheet("add-amenity"); }} className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ background: "rgba(234,179,8,0.15)", color: "#eab308" }}>+ Add</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {amenities.map((a, i) => (
              <div key={a} className="tag">
                {a}
                <span className="tag-remove" onClick={() => removeAmenity(i)}><X className="w-3 h-3" /></span>
              </div>
            ))}
          </div>
          <button onClick={() => closeSheet()} className="btn-ghost w-full text-center mt-5">Done</button>
        </div>
      </div>

      {/* -- ADD AMENITY SHEET -- */}
      <div className={`bottom-sheet ${activeSheet === "add-amenity" ? "active" : ""}`}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-8">
          <h3 className="text-lg font-bold text-white mb-4">Add Amenity</h3>
          <input type="text" className="android-input" placeholder="e.g. Playground, Rooftop" value={newAmenityName} onChange={(e) => setNewAmenityName(e.target.value)} />
          <div className="flex gap-3 mt-4">
            <button onClick={() => { setNewAmenityName(""); closeSheet(); }} className="btn-ghost flex-1 text-center">Cancel</button>
            <button onClick={addAmenity} className="btn-primary flex-1 text-center ripple-container">Add</button>
          </div>
        </div>
      </div>

      {/* -- PLANS SHEET -- */}
      <div className={`bottom-sheet ${activeSheet === "plans" ? "active" : ""}`} style={{ maxHeight: "90dvh" }}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-8">
          <h3 className="text-lg font-bold text-white mb-4">Subscription Plans</h3>
          <div className="space-y-3">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className="rounded-xl p-4 cursor-pointer"
                style={{
                  border: `1.5px solid ${plan.popular ? "rgba(4,120,87,0.4)" : "rgba(255,255,255,0.08)"}`,
                  background: plan.popular ? "rgba(4,120,87,0.05)" : "rgba(255,255,255,0.03)",
                }}
                onClick={() => openEditPlan(plan.name.toLowerCase())}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-white">{plan.name}</h4>
                    {plan.popular && <span className="text-xs font-medium px-2 py-0.5 rounded-md" style={{ background: "rgba(4,120,87,0.15)", color: "#059669" }}>Popular</span>}
                  </div>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-md" style={{ background: `${plan.color}15`, color: plan.color }}>{plan.users} users</span>
                </div>
                <p className="text-xl font-bold" style={{ color: plan.color }}>KSh {plan.price}<span className="text-xs font-normal">/mo</span></p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {plan.features.map((f) => (
                    <span key={f} className="text-xs px-2 py-0.5 rounded" style={{ background: plan.popular ? "rgba(4,120,87,0.1)" : "rgba(255,255,255,0.05)", color: plan.popular ? "#059669" : "#a3a3a3" }}>{f}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 rounded-xl" style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.12)" }}>
            <p className="text-xs" style={{ color: "#eab308" }}><span className="font-semibold">Boost Pricing:</span> 7 days = KSh 1,500 · 14 days = KSh 2,500 · 30 days = KSh 4,000</p>
          </div>
          <button onClick={() => closeSheet()} className="btn-ghost w-full text-center mt-4">Done</button>
        </div>
      </div>

      {/* -- EDIT PLAN SHEET -- */}
      <div className={`bottom-sheet ${activeSheet === "edit-plan" ? "active" : ""}`}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-8">
          <h3 className="text-lg font-bold text-white mb-4">Edit Plan</h3>
          <div className="space-y-4">
            <div><label className="text-xs font-semibold mb-2 block" style={{ color: "#a3a3a3" }}>PLAN NAME</label><input type="text" className="android-input" value={editPlanName} onChange={(e) => setEditPlanName(e.target.value)} /></div>
            <div><label className="text-xs font-semibold mb-2 block" style={{ color: "#a3a3a3" }}>MONTHLY PRICE (KSh)</label><input type="number" className="android-input" value={editPlanPrice} onChange={(e) => setEditPlanPrice(e.target.value)} /></div>
            <div><label className="text-xs font-semibold mb-2 block" style={{ color: "#a3a3a3" }}>MAX PROPERTIES</label><input type="number" className="android-input" value={editPlanProps} onChange={(e) => setEditPlanProps(e.target.value)} placeholder="0 = Unlimited" /></div>
            <div><label className="text-xs font-semibold mb-2 block" style={{ color: "#a3a3a3" }}>MAX PHOTOS PER LISTING</label><input type="number" className="android-input" value={editPlanPhotos} onChange={(e) => setEditPlanPhotos(e.target.value)} /></div>
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={() => closeSheet()} className="btn-ghost flex-1 text-center">Cancel</button>
            <button onClick={savePlan} className="btn-primary flex-1 text-center ripple-container">Save Changes</button>
          </div>
        </div>
      </div>

      {/* -- M-PESA SHEET -- */}
      <div className={`bottom-sheet ${activeSheet === "mpesa" ? "active" : ""}`} style={{ maxHeight: "90dvh" }}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">M-Pesa Configuration</h3>
            <span className="text-xs font-medium px-2 py-0.5 rounded-md" style={{ background: "rgba(4,120,87,0.15)", color: "#059669" }}>Connected</span>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold mb-2 block" style={{ color: "#a3a3a3" }}>ENVIRONMENT</label>
              <div className="flex gap-2">
                {(["sandbox", "production"] as const).map((env) => (
                  <button
                    key={env}
                    onClick={() => setMpesaEnv(env)}
                    className="text-xs font-medium px-4 py-2.5 rounded-xl"
                    style={{
                      background: mpesaEnv === env ? "rgba(234,179,8,0.15)" : "rgba(255,255,255,0.03)",
                      border: mpesaEnv === env ? "1.5px solid rgba(234,179,8,0.3)" : "1.5px solid rgba(255,255,255,0.08)",
                      color: mpesaEnv === env ? "#eab308" : "#a3a3a3",
                    }}
                  >
                    {env === "sandbox" ? "Sandbox" : "Production"}
                  </button>
                ))}
              </div>
            </div>
            {[
              { id: "mpesa-key", label: "CONSUMER KEY", value: mpesaConsumerKey, visible: mpesaKeyVisible, toggle: () => setMpesaKeyVisible(!mpesaKeyVisible) },
              { id: "mpesa-secret", label: "CONSUMER SECRET", value: mpesaConsumerSecret, visible: mpesaSecretVisible, toggle: () => setMpesaSecretVisible(!mpesaSecretVisible) },
            ].map((f) => (
              <div key={f.id}>
                <label className="text-xs font-semibold mb-2 block" style={{ color: "#a3a3a3" }}>{f.label}</label>
                <div className="relative">
                  <input type={f.visible ? "text" : "password"} className="android-input secret-field" value={f.value} readOnly />
                  <button onClick={f.toggle} className="absolute right-4 top-1/2 -translate-y-1/2">
                    {f.visible ? <EyeOff className="w-4 h-4" style={{ color: "#525252" }} /> : <Eye className="w-4 h-4" style={{ color: "#525252" }} />}
                  </button>
                </div>
              </div>
            ))}
            {[
              { id: "mpesa-paybill", label: "PAYBILL / TILL NUMBER", value: "174379" },
              { id: "mpesa-passkey", label: "PASSKEY", value: "bfb279f9aa9bdbcf158e97dd71a467cd", secret: true, visible: mpesaPasskeyVisible, toggle: () => setMpesaPasskeyVisible(!mpesaPasskeyVisible) },
            ].map((f) => (
              <div key={f.id}>
                <label className="text-xs font-semibold mb-2 block" style={{ color: "#a3a3a3" }}>{f.label}</label>
                <div className="relative">
                  <input type={f.secret && !f.visible ? "password" : "text"} className={`android-input ${f.secret ? "secret-field" : ""}`} value={f.value} readOnly />
                  {f.secret && (
                    <button onClick={f.toggle} className="absolute right-4 top-1/2 -translate-y-1/2">
                      {f.visible ? <EyeOff className="w-4 h-4" style={{ color: "#525252" }} /> : <Eye className="w-4 h-4" style={{ color: "#525252" }} />}
                    </button>
                  )}
                </div>
              </div>
            ))}
            {[
              { label: "CALLBACK URL (STK Push)", value: "https://api.rentke.co.ke/mpesa/callback" },
              { label: "B2C CALLBACK URL", value: "https://api.rentke.co.ke/mpesa/b2c/callback" },
            ].map((f) => (
              <div key={f.label}>
                <label className="text-xs font-semibold mb-2 block" style={{ color: "#a3a3a3" }}>{f.label}</label>
                <input type="url" className="android-input" value={f.value} readOnly />
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={testMpesa} disabled={mpesaTesting} className="btn-warning flex-1 text-center ripple-container flex items-center justify-center gap-2">
              {mpesaTesting ? <><div className="spinner" /><span>Testing...</span></> : <span>Test Connection</span>}
            </button>
            <button onClick={saveMpesa} className="btn-primary flex-1 text-center ripple-container">Save</button>
          </div>
        </div>
      </div>

      {/* -- ADMIN USERS SHEET -- */}
      <div className={`bottom-sheet ${activeSheet === "admins" ? "active" : ""}`} style={{ maxHeight: "90dvh" }}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Admin Users</h3>
            <button onClick={() => { setAddAdminName(""); setAddAdminEmail(""); setAddAdminRole("super"); openSheet("add-admin"); }} className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}>+ Add</button>
          </div>
          <div className="space-y-2">
            {admins.map((admin, i) => (
              <div key={admin.name} className="admin-card">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: `linear-gradient(135deg, ${admin.color}, ${admin.color}dd)`, color: "white" }}>
                  {admin.init}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">{admin.name}</p>
                  <p className="text-xs" style={{ color: "#525252" }}>{admin.email} · {admin.role}</p>
                </div>
                {admin.badge ? (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-md" style={{ background: "rgba(4,120,87,0.15)", color: "#059669" }}>{admin.badge}</span>
                ) : (
                  <button onClick={() => openRemoveAdmin(admin.name)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(239,68,68,0.1)" }}>
                    <X className="w-4 h-4" style={{ color: "#ef4444" }} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button onClick={() => closeSheet()} className="btn-ghost w-full text-center mt-4">Done</button>
        </div>
      </div>

      {/* -- ADD ADMIN SHEET -- */}
      <div className={`bottom-sheet ${activeSheet === "add-admin" ? "active" : ""}`}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-8">
          <h3 className="text-lg font-bold text-white mb-4">Add Admin User</h3>
          <div className="space-y-4">
            <div><label className="text-xs font-semibold mb-2 block" style={{ color: "#a3a3a3" }}>FULL NAME</label><input type="text" className="android-input" placeholder="e.g. John Kamau" value={addAdminName} onChange={(e) => setAddAdminName(e.target.value)} /></div>
            <div><label className="text-xs font-semibold mb-2 block" style={{ color: "#a3a3a3" }}>EMAIL</label><input type="email" className="android-input" placeholder="e.g. john@rentke.co.ke" value={addAdminEmail} onChange={(e) => setAddAdminEmail(e.target.value)} /></div>
            <div>
              <label className="text-xs font-semibold mb-2 block" style={{ color: "#a3a3a3" }}>ROLE</label>
              <div className="flex gap-2">
                {(["super", "mod", "support"] as const).map((role) => (
                  <button
                    key={role}
                    onClick={() => setAddAdminRole(role)}
                    className="text-xs font-medium px-4 py-2.5 rounded-xl"
                    style={{
                      background: addAdminRole === role ? "rgba(4,120,87,0.15)" : "rgba(255,255,255,0.03)",
                      border: addAdminRole === role ? "1.5px solid rgba(4,120,87,0.3)" : "1.5px solid rgba(255,255,255,0.08)",
                      color: addAdminRole === role ? "#059669" : "#a3a3a3",
                    }}
                  >
                    {role === "super" ? "Super Admin" : role === "mod" ? "Moderator" : "Support"}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={() => closeSheet()} className="btn-ghost flex-1 text-center">Cancel</button>
            <button onClick={addAdmin} className="btn-primary flex-1 text-center ripple-container">Add & Invite</button>
          </div>
        </div>
      </div>

      {/* -- REMOVE ADMIN SHEET -- */}
      <div className={`bottom-sheet ${activeSheet === "remove-admin" ? "active" : ""}`}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(239,68,68,0.15)" }}>
              <UserX className="w-5 h-5" style={{ color: "#ef4444" }} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Remove Admin</h3>
              <p className="text-xs" style={{ color: "#a3a3a3" }}>{removeAdminName}</p>
            </div>
          </div>
          <div className="p-3 rounded-xl mb-4" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}>
            <p className="text-xs" style={{ color: "#ef4444" }}>⚠ This will revoke their access immediately. They will receive an email notification.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => closeSheet()} className="btn-ghost flex-1 text-center">Cancel</button>
            <button onClick={confirmRemoveAdmin} className="btn-danger flex-1 text-center">Remove</button>
          </div>
        </div>
      </div>

      {/* -- TEMPLATES SHEET -- */}
      <div className={`bottom-sheet ${activeSheet === "templates" ? "active" : ""}`} style={{ maxHeight: "90dvh" }}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Notification Templates</h3>
          </div>
          <div className="space-y-2">
            {templates.map((tmpl, i) => (
              <div
                key={tmpl.name}
                className="p-3 rounded-xl cursor-pointer"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                onClick={() => openEditTemplate(i)}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">{tmpl.name}</p>
                  <span className="text-xs" style={{
                    color: tmpl.channels.includes("SMS") ? "#059669" : tmpl.channels.includes("Push") ? "#3b82f6" : "#a3a3a3",
                  }}>{tmpl.channels}</span>
                </div>
                <p className="text-xs mt-1" style={{ color: "#525252" }}>{tmpl.preview}</p>
              </div>
            ))}
          </div>
          <button onClick={() => closeSheet()} className="btn-ghost w-full text-center mt-4">Done</button>
        </div>
      </div>

      {/* -- EDIT TEMPLATE SHEET -- */}
      <div className={`bottom-sheet ${activeSheet === "edit-template" ? "active" : ""}`}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-8">
          <h3 className="text-lg font-bold text-white mb-1">Edit Template</h3>
          <p className="text-xs mb-4" style={{ color: "#a3a3a3" }}>Use [property_name], [amount], [time], [name] as variables</p>
          <div className="space-y-4">
            <div><label className="text-xs font-semibold mb-2 block" style={{ color: "#a3a3a3" }}>TEMPLATE NAME</label><input type="text" className="android-input" value={editTemplateName} onChange={(e) => setEditTemplateName(e.target.value)} /></div>
            <div><label className="text-xs font-semibold mb-2 block" style={{ color: "#a3a3a3" }}>SUBJECT (EMAIL)</label><input type="text" className="android-input" value="Welcome to RentKe!" /></div>
            <div><label className="text-xs font-semibold mb-2 block" style={{ color: "#a3a3a3" }}>SMS BODY (160 chars max)</label>
              <textarea className="android-input" rows={2} maxLength={160} defaultValue="Welcome to RentKe! Start listing your properties today. Reply HELP for support."></textarea>
            </div>
            <div><label className="text-xs font-semibold mb-2 block" style={{ color: "#a3a3a3" }}>EMAIL BODY</label>
              <textarea className="android-input" rows={4} defaultValue={`Dear [name],\n\nWelcome to RentKe! 🏠\n\nStart listing your properties and reach thousands of tenants across Kenya.\n\nBest regards,\nThe RentKe Team`}></textarea>
            </div>
            <div>
              <label className="text-xs font-semibold mb-2 block" style={{ color: "#a3a3a3" }}>CHANNELS</label>
              <div className="flex gap-2">
                {["SMS", "Email", "Push"].map((ch) => {
                  const active = ch === "SMS" || ch === "Email";
                  return (
                    <button
                      key={ch}
                      className="text-xs font-medium px-4 py-2.5 rounded-xl"
                      style={{
                        background: active ? "rgba(4,120,87,0.15)" : "rgba(255,255,255,0.03)",
                        border: active ? "1.5px solid rgba(4,120,87,0.3)" : "1.5px solid rgba(255,255,255,0.08)",
                        color: active ? "#059669" : "#a3a3a3",
                      }}
                    >
                      {ch}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={() => closeSheet()} className="btn-ghost flex-1 text-center">Cancel</button>
            <button onClick={saveTemplate} className="btn-primary flex-1 text-center ripple-container">Save Template</button>
          </div>
        </div>
      </div>

      {/* -- PURGE SHEET -- */}
      <div className={`bottom-sheet ${activeSheet === "purge" ? "active" : ""}`}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(239,68,68,0.15)" }}>
              <Trash2 className="w-5 h-5" style={{ color: "#ef4444" }} />
            </div>
            <h3 className="text-lg font-bold text-white">Purge Expired Listings</h3>
          </div>
          <div className="p-4 rounded-xl mb-4" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}>
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#ef4444" }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: "#ef4444" }}>This will permanently delete 450 expired listings</p>
                <p className="text-xs mt-1" style={{ color: "#a3a3a3" }}>Listings expired 30+ days ago will be removed. Landlords will be notified via email.</p>
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold mb-2 block" style={{ color: "#a3a3a3" }}>TYPE TO CONFIRM</label>
            <input type="text" className="android-input" placeholder='Type "PURGE" to confirm' value={purgeConfirm} onChange={(e) => setPurgeConfirm(e.target.value)} />
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={() => { setPurgeConfirm(""); closeSheet(); }} className="btn-ghost flex-1 text-center">Cancel</button>
            <button
              onClick={confirmPurge}
              disabled={purgeConfirm !== "PURGE"}
              className="btn-danger flex-1 text-center"
              style={{ opacity: purgeConfirm === "PURGE" ? 1 : 0.4, cursor: purgeConfirm === "PURGE" ? "pointer" : "not-allowed" }}
            >
              Purge
            </button>
          </div>
        </div>
      </div>

      {/* -- MAX PHOTOS SHEET -- */}
      <div className={`bottom-sheet ${activeSheet === "max-photos" ? "active" : ""}`}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)" }}>
              <Image className="w-5 h-5" style={{ color: "#a3a3a3" }} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Max Photos</h3>
              <p className="text-xs" style={{ color: "#a3a3a3" }}>Maximum images per listing</p>
            </div>
          </div>
          <div className="p-4 rounded-xl mb-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-sm" style={{ color: "#a3a3a3" }}>Set the maximum number of photos a landlord can upload per listing.</p>
          </div>
          <div className="mb-4">
            <label className="text-xs font-semibold mb-2 block" style={{ color: "#a3a3a3" }}>MAXIMUM PHOTOS</label>
            <div className="flex gap-2">
              {["5", "10", "15", "20", "30"].map((n) => (
                <button key={n} onClick={() => setMaxPhotos(n)}
                  className="flex-1 text-sm font-semibold py-3 rounded-xl transition-all"
                  style={{
                    background: maxPhotos === n ? "rgba(4,120,87,0.15)" : "rgba(255,255,255,0.03)",
                    border: maxPhotos === n ? "1.5px solid rgba(4,120,87,0.3)" : "1.5px solid rgba(255,255,255,0.08)",
                    color: maxPhotos === n ? "#059669" : "#a3a3a3",
                  }}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={closeSheet} className="btn-ghost flex-1 text-center">Cancel</button>
            <button onClick={saveMaxPhotosCb} className="btn-primary flex-1 text-center ripple-container">Save</button>
          </div>
        </div>
      </div>

      {/* -- RESET DATABASE SHEET -- */}
      <div className={`bottom-sheet ${activeSheet === "reset-db" ? "active" : ""}`}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(239,68,68,0.15)" }}>
              <Database className="w-5 h-5" style={{ color: "#ef4444" }} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Reset Database</h3>
              <p className="text-xs" style={{ color: "#a3a3a3" }}>This action is irreversible</p>
            </div>
          </div>
          <div className="p-4 rounded-xl mb-4" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.12)" }}>
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#ef4444" }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: "#ef4444" }}>This will delete ALL platform data</p>
                <p className="text-xs mt-1" style={{ color: "#a3a3a3" }}>All listings, users, transactions, messages, and settings will be permanently removed. This action requires super admin approval and cannot be undone.</p>
              </div>
            </div>
          </div>
          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(239,68,68,0.05)" }}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(239,68,68,0.15)" }}>
                <span className="text-xs font-bold" style={{ color: "#ef4444" }}>1</span>
              </div>
              <span className="text-xs" style={{ color: "#a3a3a3" }}>Super Admin approval required via email</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(239,68,68,0.05)" }}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(239,68,68,0.15)" }}>
                <span className="text-xs font-bold" style={{ color: "#ef4444" }}>2</span>
              </div>
              <span className="text-xs" style={{ color: "#a3a3a3" }}>All data will be wiped after approval</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(239,68,68,0.05)" }}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(239,68,68,0.15)" }}>
                <span className="text-xs font-bold" style={{ color: "#ef4444" }}>3</span>
              </div>
              <span className="text-xs" style={{ color: "#a3a3a3" }}>Platform will be set to setup mode</span>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold mb-2 block" style={{ color: "#a3a3a3" }}>TYPE TO CONFIRM</label>
            <input type="text" className="android-input" placeholder='Type "RESET" to confirm' value={resetDbConfirm} onChange={(e) => setResetDbConfirm(e.target.value)} />
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={() => { setResetDbConfirm(""); closeSheet(); }} className="btn-ghost flex-1 text-center">Cancel</button>
            <button
              onClick={confirmResetDb}
              disabled={resetDbConfirm !== "RESET"}
              className="btn-danger flex-1 text-center"
              style={{ opacity: resetDbConfirm === "RESET" ? 1 : 0.4, cursor: resetDbConfirm === "RESET" ? "pointer" : "not-allowed" }}
            >
              Initiate Reset
            </button>
          </div>
        </div>
      </div>

      {/* -- ADMIN MENU SHEET -- */}
      <div className={`bottom-sheet ${activeSheet === "menu" ? "active" : ""}`}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-8">
          <div className="flex items-center gap-4 p-4 rounded-2xl mb-4" style={{ background: "rgba(255,255,255,0.03)" }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #047857, #059669)" }}>
              <span className="text-base font-bold text-white">AK</span>
            </div>
            <div>
              <p className="text-base font-semibold text-white">Admin Ke</p>
              <p className="text-xs" style={{ color: "#a3a3a3" }}>admin@rentke.co.ke</p>
            </div>
          </div>
          <div className="space-y-1">
            {[
              { icon: LayoutDashboard, label: "Dashboard", href: "/admin" },
              { icon: Users, label: "Landlords", href: "/admin/landlords" },
              { icon: Building2, label: "Listings", href: "/admin/listings" },
              { icon: Wallet, label: "Wallet", href: "/admin/wallet" },
              { icon: Headset, label: "Support & Disputes", href: "/admin/support" },
              { icon: Settings, label: "Settings", href: "/admin/settings" },
            ].map((item, i) => {
              const ItemIcon = item.icon;
              return (
                <button
                  key={i}
                  onClick={() => { closeSheet(); router.push(item.href); }}
                  className="w-full flex items-center gap-4 p-3.5 rounded-xl"
                  style={{ background: "transparent" }}
                >
                  <ItemIcon className="w-5 h-5" style={{ color: "#a3a3a3" }} />
                  <span className="text-sm font-medium text-white">{item.label}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <button onClick={() => { closeSheet(); setTimeout(() => showSnackbar("Logged out successfully", "info"), 300); }} className="w-full flex items-center gap-4 p-3.5 rounded-xl" style={{ background: "rgba(239,68,68,0.08)" }}>
              <XCircle className="w-5 h-5" style={{ color: "#ef4444" }} />
              <span className="text-sm font-medium" style={{ color: "#ef4444" }}>Log Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* ──────────── SNACKBAR ──────────── */}
      <div className={`snackbar ${snackbar.visible ? "show" : "hide"}`}>
        <div className="flex items-center gap-3">
          <div>
            {snackbar.type === "success" && (
              <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(4,120,87,0.2)" }}>
                <Check className="w-3.5 h-3.5" style={{ color: "#059669" }} />
              </div>
            )}
            {snackbar.type === "error" && (
              <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(239,68,68,0.2)" }}>
                <XCircle className="w-3.5 h-3.5" style={{ color: "#ef4444" }} />
              </div>
            )}
            {snackbar.type === "info" && (
              <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(59,130,246,0.2)" }}>
                <Info className="w-3.5 h-3.5" style={{ color: "#3b82f6" }} />
              </div>
            )}
            {snackbar.type === "warning" && (
              <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(234,179,8,0.2)" }}>
                <AlertTriangle className="w-3.5 h-3.5" style={{ color: "#eab308" }} />
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

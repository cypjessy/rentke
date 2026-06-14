"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import AppBar from "@/app/components/AppBar";
import {
  Search,
  SlidersHorizontal,
  X,
  ShieldCheck,
  ShieldOff,
  Mail,
  CreditCard,
  MapPin,
  Calendar,
  Crown,
  MessageSquare,
  PauseCircle,
  Ban,
  RotateCcw,
  Eye,
  ScrollText,
  Check,
  Info,
  Maximize2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MoreVertical,
  Users,
  Building2,
  Wallet,
  LayoutDashboard,
  Settings,
  FileText,
} from "lucide-react";
import { listenToLandlords, verifyLandlord, suspendLandlord, reinstateLandlord, banLandlord, type AdminLandlordData } from "@/lib/admin";
import { collection, addDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

// ─── Types ───────────────────────────────────────────────────────────────────
type SnackbarType = "success" | "error" | "info";
type PageKey = "dashboard" | "landlords" | "listings" | "wallet" | "settings";
type SheetKey =
  | "filter"
  | "detail"
  | "verify"
  | "reject-verify"
  | "suspend"
  | "ban"
  | "reinstate"
  | "message"
  | "action"
  | "properties"
  | "activity"
  | "id-preview";
type LandlordStatus = "active" | "pending" | "suspended";

interface LandlordData {
  name: string;
  initials: string;
  phone: string;
  email: string;
  id: string;
  location: string;
  joined: string;
  plan: string;
  status: LandlordStatus;
  verified: boolean;
  properties: number;
  units: number;
  revenue: string;
  color: string;
}

interface SnackbarState {
  message: string;
  type: SnackbarType;
  visible: boolean;
}

// ─── Data ────────────────────────────────────────────────────────────────────
const LANDLORDS: LandlordData[] = [
  { name: "James Mwangi", initials: "JM", phone: "+254 712 345 678", email: "james.mwangi@gmail.com", id: "29384756", location: "Nairobi, Kenya", joined: "Jan 15, 2024", plan: "Premium — KSh 2,999/mo", status: "active", verified: true, properties: 8, units: 24, revenue: "KSh 45K", color: "#047857" },
  { name: "Grace Wanjiku", initials: "GW", phone: "+254 723 456 789", email: "grace.wanjiku@gmail.com", id: "31245678", location: "Nakuru, Kenya", joined: "Dec 3, 2024", plan: "Free", status: "pending", verified: false, properties: 2, units: 6, revenue: "KSh 8K", color: "#d97706" },
  { name: "Ali Hassan", initials: "AH", phone: "+254 734 567 890", email: "ali.hassan@yahoo.com", id: "28765432", location: "Mombasa, Kenya", joined: "Mar 22, 2024", plan: "Premium — KSh 2,999/mo", status: "active", verified: true, properties: 5, units: 15, revenue: "KSh 32K", color: "#7c3aed" },
  { name: "Peter Ochieng", initials: "PO", phone: "+254 745 678 901", email: "peter.ochieng@gmail.com", id: "34567890", location: "Kisumu, Kenya", joined: "Aug 8, 2024", plan: "Free", status: "suspended", verified: true, properties: 1, units: 3, revenue: "KSh 0", color: "#dc2626" },
  { name: "Mary Akinyi", initials: "MA", phone: "+254 756 789 012", email: "mary.akinyi@gmail.com", id: "30198765", location: "Eldoret, Kenya", joined: "Nov 1, 2024", plan: "Basic — KSh 999/mo", status: "active", verified: false, properties: 3, units: 9, revenue: "KSh 18K", color: "#0891b2" },
  { name: "Fatuma Bakari", initials: "FB", phone: "+254 767 890 123", email: "fatuma.bakari@gmail.com", id: "32876543", location: "Mombasa, Kenya", joined: "Dec 28, 2024", plan: "Free", status: "pending", verified: false, properties: 0, units: 0, revenue: "KSh 0", color: "#ea580c" },
];

const FILTER_OPTIONS = ["all", "active", "pending", "suspended", "unverified", "verified"] as const;

const REJECT_VERIFY_REASONS = ["ID image unclear", "Name mismatch", "Invalid document", "Expired ID"];

const SUSPEND_REASONS = ["Policy violation", "Suspected fraud", "Fake listings", "Unresponsive", "Complaint received"];

const SUSPEND_DURATIONS = [
  { label: "7 days", value: "7" },
  { label: "30 days", value: "30" },
  { label: "90 days", value: "90" },
  { label: "Indefinite", value: "0" },
];

const BAN_REASONS = ["Confirmed fraud", "Repeated violations", "Scam operations", "Legal requirement"];

const MESSAGE_TEMPLATES = [
  { label: "⚠ Listing Issue", text: "We noticed an issue with your listing. Please update it within 48 hours." },
  { label: "📋 Verify ID", text: "Your account verification is pending. Please submit your ID for review." },
  { label: "💎 Subscription", text: "Your premium subscription is expiring soon. Renew to keep your benefits." },
  { label: "🙏 Thank You", text: "Thank you for being a valued RentKe landlord! 🙏" },
];

const PROPERTIES_DATA: Record<string, { name: string; type: string; units: number; price: string; status: "active" | "pending" | "inactive"; image?: string }[]> = {
  "James Mwangi": [
    { name: "2BR Apartment - Kilimani", type: "Apartment", units: 3, price: "KSh 35,000/mo", status: "active" },
    { name: "Studio - Westlands", type: "Studio", units: 5, price: "KSh 15,000/mo", status: "active" },
    { name: "1BR - South B", type: "Apartment", units: 4, price: "KSh 22,000/mo", status: "active" },
    { name: "Bedsitter - Roysambu", type: "Bedsitter", units: 8, price: "KSh 8,500/mo", status: "active" },
  ],
  "Grace Wanjiku": [
    { name: "2BR - Nakuru Town", type: "Apartment", units: 3, price: "KSh 18,000/mo", status: "active" },
    { name: "Bedsitter - Nakuru", type: "Bedsitter", units: 3, price: "KSh 7,000/mo", status: "pending" },
  ],
  "Ali Hassan": [
    { name: "3BR Villa - Nyali", type: "Villa", units: 2, price: "KSh 80,000/mo", status: "active" },
    { name: "2BR - Bamburi", type: "Apartment", units: 6, price: "KSh 25,000/mo", status: "active" },
    { name: "Studio - Mombasa CBD", type: "Studio", units: 4, price: "KSh 12,000/mo", status: "active" },
    { name: "1BR - Likoni", type: "Apartment", units: 3, price: "KSh 10,000/mo", status: "inactive" },
  ],
  "Peter Ochieng": [
    { name: "Bedsitter - Kisumu", type: "Bedsitter", units: 3, price: "KSh 6,000/mo", status: "inactive" },
  ],
  "Mary Akinyi": [
    { name: "2BR - Eldoret", type: "Apartment", units: 4, price: "KSh 20,000/mo", status: "active" },
    { name: "1BR - Eldoret Town", type: "Apartment", units: 3, price: "KSh 12,000/mo", status: "pending" },
    { name: "Bedsitter - Langas", type: "Bedsitter", units: 2, price: "KSh 5,500/mo", status: "active" },
  ],
  "Fatuma Bakari": [],
};

const ACTIVITY_DATA: { action: string; detail: string; time: string; type: "approve" | "suspend" | "verify" | "message" | "payment" | "report" }[] = [
  { action: "Listing approved", detail: "2BR Apartment - Kilimani went live", time: "3 days ago", type: "approve" },
  { action: "ID verified", detail: "National ID checked and approved", time: "2 days ago", type: "verify" },
  { action: "Subscription upgraded", detail: "Upgraded to Premium plan", time: "1 week ago", type: "payment" },
  { action: "Message sent", detail: "Broadcast: Maintenance notice", time: "1 week ago", type: "message" },
  { action: "Payment received", detail: "Boost payment: KSh 1,500", time: "2 weeks ago", type: "payment" },
  { action: "Listing flagged", detail: "Reported for incorrect pricing", time: "3 weeks ago", type: "report" },
  { action: "Account suspended", detail: "Policy violation - 7 day suspension", time: "1 month ago", type: "suspend" },
  { action: "Account reinstated", detail: "Returned after suspension", time: "3 weeks ago", type: "approve" },
];

const SORT_OPTIONS: { key: "newest" | "name" | "properties"; label: string }[] = [
  { key: "newest", label: "Newest first" },
  { key: "name", label: "Name A-Z" },
  { key: "properties", label: "Most properties" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function statusColor(s: LandlordStatus): string {
  return s === "active" ? "#059669" : s === "pending" ? "#eab308" : "#ef4444";
}

function statusLabel(s: LandlordStatus): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function AdminLandlords() {
  const router = useRouter();
  // ── State ──
  const [activePage, setActivePage] = useState<PageKey>("landlords");
  const [activeSheet, setActiveSheet] = useState<SheetKey | null>(null);
  const [snackbar, setSnackbar] = useState<SnackbarState>({ message: "", type: "info", visible: false });
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentFilter, setCurrentFilter] = useState<string>("all");
  const [filterActive, setFilterActive] = useState(false);

  // Filter sheet state
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterVerify, setFilterVerify] = useState("all");
  const [filterSort, setFilterSort] = useState<"newest" | "name" | "properties">("newest");

  // Landlord detail
  const [currentIdx, setCurrentIdx] = useState(0);

  // Verify
  const [rejectVerifyReason, setRejectVerifyReason] = useState("");

  // Suspend
  const [selectedSuspendReason, setSelectedSuspendReason] = useState("");
  const [selectedSuspendDuration, setSelectedSuspendDuration] = useState("7");
  const [suspendNotify, setSuspendNotify] = useState(true);
  const [suspendNote, setSuspendNote] = useState("");

  // Ban
  const [selectedBanReason, setSelectedBanReason] = useState("");
  const [banNote, setBanNote] = useState("");
  const [banConfirm, setBanConfirm] = useState("");

  // Reinstate
  const [reinstateNote, setReinstateNote] = useState("");
  const [reinstateNotify, setReinstateNotify] = useState(true);

  // Message
  const [messageText, setMessageText] = useState("");
  const [messageSms, setMessageSms] = useState(true);
  const [messageSending, setMessageSending] = useState(false);

  const snackbarTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Refs for DOM manipulation (selectSort style updates)
  // ── Firestore data ──
  const [firestoreLandlords, setFirestoreLandlords] = useState<AdminLandlordData[]>([]);
  const [landlordsLoading, setLandlordsLoading] = useState(true);

  useEffect(() => {
    const unsub = listenToLandlords(
      (fetched) => {
        setFirestoreLandlords(fetched);
        setLandlordsLoading(false);
      },
      () => { setLandlordsLoading(false); }
    );
    return () => unsub();
  }, []);

  // Map Firestore data to admin display format
  const landlords: LandlordData[] = firestoreLandlords.map((l) => ({
    name: l.name,
    initials: l.initials || l.name.charAt(0).toUpperCase(),
    phone: l.phone,
    email: l.email,
    id: l.idNumber,
    location: l.location,
    joined: l.joined ? new Date(l.joined.seconds * 1000).toLocaleDateString() : "Recently",
    plan: l.plan === "Free" ? "Free" : `${l.plan} — KSh 2,999/mo`,
    status: l.status,
    verified: l.verified,
    properties: l.properties,
    units: l.units,
    revenue: `KSh ${(l.revenue || 0).toLocaleString()}`,
    color: l.color,
  }));

  const currentLandlord = landlords[currentIdx];

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

  // ── Filtering ──
  const filteredLandlords = landlords.filter((l) => {
    const matchesSearch =
      !searchQuery ||
      l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.phone.includes(searchQuery) ||
      l.email.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (currentFilter === "active" && l.status !== "active") return false;
    if (currentFilter === "pending" && l.status !== "pending") return false;
    if (currentFilter === "suspended" && l.status !== "suspended") return false;
    if (currentFilter === "verified" && !l.verified) return false;
    if (currentFilter === "unverified" && l.verified) return false;

    return true;
  });

  // ── Sorted ──
  const sortedLandlords = [...filteredLandlords].sort((a, b) => {
    if (filterSort === "name") return a.name.localeCompare(b.name);
    if (filterSort === "properties") return b.properties - a.properties;
    // newest first — by joined date (rough parse)
    return -1;
  });

  // ── Filter handlers ──
  const handleSetFilter = useCallback((f: string) => {
    setCurrentFilter(f);
    if (f === "all") setFilterActive(false);
    else setFilterActive(true);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setSearchOpen(false);
  }, []);

  const toggleSearch = useCallback(() => {
    setSearchOpen((s) => !s);
    if (searchOpen) setSearchQuery("");
  }, [searchOpen]);

  // ── Ripple effect (global listener) ──
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

  // ── Apply filters ──
  const applyFilters = useCallback(() => {
    if (filterVerify === "verified") handleSetFilter("verified");
    else if (filterVerify === "unverified") handleSetFilter("unverified");
    else handleSetFilter(filterStatus);
    setFilterActive(true);
    closeSheet();
    showSnackbar("Filters applied", "success");
  }, [filterStatus, filterVerify, handleSetFilter, closeSheet, showSnackbar]);

  const resetFilters = useCallback(() => {
    setFilterStatus("all");
    setFilterVerify("all");
    setFilterSort("newest");
    handleSetFilter("all");
    setFilterActive(false);
    showSnackbar("Filters reset", "info");
  }, [handleSetFilter, showSnackbar]);

  // ── Detail ──
  const openLandlordDetail = useCallback((idx: number) => {
    setCurrentIdx(idx);
    openSheet("detail");
  }, [openSheet]);

  // ── Verify ──
  const openVerifySheet = useCallback((idx: number) => {
    setCurrentIdx(idx);
    setRejectVerifyReason("");
    openSheet("verify");
  }, [openSheet]);

  const approveVerification = useCallback(() => {
    const name = landlords[currentIdx].name;
    const fsId = firestoreLandlords[currentIdx]?.id;
    if (fsId) {
      verifyLandlord(fsId).catch(() => {});
    }
    closeSheet();
    setTimeout(() => showSnackbar(`✅ ${name} is now verified`, "success"), 300);
  }, [currentIdx, landlords, firestoreLandlords, closeSheet, showSnackbar]);

  const confirmRejectVerification = useCallback(() => {
    const name = landlords[currentIdx].name;
    const fsId = firestoreLandlords[currentIdx]?.id;
    if (fsId && rejectVerifyReason) {
      updateDoc(doc(db, "users", fsId), {
        verificationNote: rejectVerifyReason,
        verified: false,
        updatedAt: serverTimestamp(),
      }).catch(() => {});
    }
    closeSheet();
    setTimeout(() => {
      showSnackbar(`❌ Verification rejected for ${name}: ${rejectVerifyReason}`, "error");
    }, 300);
  }, [currentIdx, landlords, firestoreLandlords, rejectVerifyReason, closeSheet, showSnackbar]);

  // ── Suspend ──
  const openSuspendSheet = useCallback((idx: number) => {
    setCurrentIdx(idx);
    setSelectedSuspendReason("");
    setSelectedSuspendDuration("7");
    setSuspendNote("");
    setSuspendNotify(true);
    openSheet("suspend");
  }, [openSheet]);

  const confirmSuspend = useCallback(() => {
    const dur = selectedSuspendDuration === "0" ? "indefinitely" : `for ${selectedSuspendDuration} days`;
    const name = landlords[currentIdx].name;
    const fsId = firestoreLandlords[currentIdx]?.id;
    if (fsId && selectedSuspendReason) {
      suspendLandlord(fsId, selectedSuspendReason, parseInt(selectedSuspendDuration === "0" ? "36500" : selectedSuspendDuration)).catch(() => {});
    }
    closeSheet();
    setTimeout(() => showSnackbar(`⏸ ${name} suspended ${dur}`, "success"), 300);
  }, [currentIdx, landlords, firestoreLandlords, selectedSuspendDuration, selectedSuspendReason, closeSheet, showSnackbar]);

  // ── Ban ──
  const openBanSheet = useCallback((idx: number) => {
    setCurrentIdx(idx);
    setSelectedBanReason("");
    setBanNote("");
    setBanConfirm("");
    openSheet("ban");
  }, [openSheet]);

  const confirmBan = useCallback(() => {
    const name = landlords[currentIdx].name;
    const fsId = firestoreLandlords[currentIdx]?.id;
    if (fsId) {
      banLandlord(fsId).catch(() => {});
    }
    closeSheet();
    setTimeout(() => showSnackbar(`🚫 ${name} has been permanently banned`, "error"), 300);
  }, [currentIdx, landlords, firestoreLandlords, closeSheet, showSnackbar]);

  // ── Reinstate ──
  const openReinstateSheet = useCallback((idx: number) => {
    setCurrentIdx(idx);
    setReinstateNote("");
    setReinstateNotify(true);
    openSheet("reinstate");
  }, [openSheet]);

  const confirmReinstate = useCallback(() => {
    const name = landlords[currentIdx].name;
    const fsId = firestoreLandlords[currentIdx]?.id;
    if (fsId) {
      reinstateLandlord(fsId).catch(() => {});
    }
    closeSheet();
    setTimeout(() => showSnackbar(`✅ ${name} has been reinstated`, "success"), 300);
  }, [currentIdx, landlords, firestoreLandlords, closeSheet, showSnackbar]);

  // ── Message ──
  const openMessageSheet = useCallback((idx: number) => {
    setCurrentIdx(idx);
    setMessageText("");
    setMessageSms(true);
    openSheet("message");
  }, [openSheet]);

  const applyTemplate = useCallback((text: string) => {
    setMessageText(text);
  }, []);

  const sendMessage = useCallback(() => {
    if (!messageText.trim()) {
      showSnackbar("Please type a message", "error");
      return;
    }
    const name = landlords[currentIdx].name;
    const landlordId = firestoreLandlords[currentIdx]?.id;
    setMessageSending(true);
    if (landlordId) {
      addDoc(collection(db, "messages"), {
        conversationId: `admin_${landlordId}`,
        senderId: "admin",
        text: messageText.trim(),
        read: false,
        attachments: [],
        createdAt: serverTimestamp(),
      }).catch((e) => showSnackbar(e.message, "error"));
    }
    setTimeout(() => {
      setMessageSending(false);
      closeSheet();
      setTimeout(() => showSnackbar(`💬 Message sent to ${name}`, "success"), 300);
    }, 1000);
  }, [messageText, currentIdx, landlords, firestoreLandlords, closeSheet, showSnackbar]);

  // ── Action sheet ──
  const openActionSheet = useCallback((idx: number) => {
    setCurrentIdx(idx);
    openSheet("action");
  }, [openSheet]);

  // ── Nav ──
  const navItems: { key: PageKey; icon: React.ElementType; label: string; snackbar?: string }[] = [
    { key: "dashboard", icon: LayoutDashboard, label: "Home", snackbar: "Dashboard" },
    { key: "landlords", icon: Users, label: "Landlords" },
    { key: "listings", icon: Building2, label: "Listings" },
    { key: "wallet", icon: Wallet, label: "Wallet" },
    { key: "settings", icon: Settings, label: "Settings" },
  ];

  // ── Stats ──
  const activeCount = landlords.filter((l) => l.status === "active").length;
  const pendingCount = landlords.filter((l) => l.status === "pending").length;
  const suspendedCount = landlords.filter((l) => l.status === "suspended").length;

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
          title="Landlords"
          subtitle={`${landlords.length} registered`}
          backHref="/admin"
          actions={[
            { icon: Search, onClick: toggleSearch },
            { icon: SlidersHorizontal, onClick: () => { setFilterStatus(currentFilter === "verified" || currentFilter === "unverified" ? "all" : currentFilter); setFilterVerify(currentFilter === "verified" ? "verified" : currentFilter === "unverified" ? "unverified" : "all"); openSheet("filter"); }, active: filterActive, dot: filterActive, dotColor: "#059669" },
          ]}
        />

        {/* SEARCH BAR */}
        {searchOpen && (
          <div className="px-5" style={{ animation: "slideInUp 0.3s ease" }}>
            <div className="search-bar mb-3">
              <Search className="w-5 h-5 flex-shrink-0" style={{ color: "#525252" }} />
              <input
                type="text"
                placeholder="Search by name, phone, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              {searchQuery && (
                <button onClick={clearSearch}>
                  <X className="w-5 h-5" style={{ color: "#525252" }} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* STATS BAR */}
        <div className="px-5 mb-4">
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            <div
              onClick={() => handleSetFilter("active")}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl flex-shrink-0"
              style={{ background: currentFilter === "active" ? "rgba(4,120,87,0.15)" : "rgba(4,120,87,0.1)", border: currentFilter === "active" ? "1.5px solid rgba(4,120,87,0.3)" : "1px solid rgba(4,120,87,0.15)", cursor: "pointer", transition: "all 0.2s ease" }}
            >
              <div className="w-2 h-2 rounded-full" style={{ background: "#059669" }} />
              <span className="text-xs font-semibold" style={{ color: "#059669" }}>
                {activeCount} Active
              </span>
            </div>
            <div
              onClick={() => handleSetFilter("pending")}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl flex-shrink-0"
              style={{ background: currentFilter === "pending" ? "rgba(234,179,8,0.15)" : "rgba(234,179,8,0.1)", border: currentFilter === "pending" ? "1.5px solid rgba(234,179,8,0.3)" : "1px solid rgba(234,179,8,0.15)", cursor: "pointer", transition: "all 0.2s ease" }}
            >
              <div className="w-2 h-2 rounded-full" style={{ background: "#eab308" }} />
              <span className="text-xs font-semibold" style={{ color: "#eab308" }}>
                {pendingCount} Pending
              </span>
            </div>
            <div
              onClick={() => handleSetFilter("suspended")}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl flex-shrink-0"
              style={{ background: currentFilter === "suspended" ? "rgba(239,68,68,0.15)" : "rgba(239,68,68,0.1)", border: currentFilter === "suspended" ? "1.5px solid rgba(239,68,68,0.3)" : "1px solid rgba(239,68,68,0.15)", cursor: "pointer", transition: "all 0.2s ease" }}
            >
              <div className="w-2 h-2 rounded-full" style={{ background: "#ef4444" }} />
              <span className="text-xs font-semibold" style={{ color: "#ef4444" }}>
                {suspendedCount} Suspended
              </span>
            </div>
          </div>
        </div>

        {/* FILTER CHIPS */}
        <div className="px-5 mb-4">
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {FILTER_OPTIONS.map((f) => (
              <button
                key={f}
                onClick={() => handleSetFilter(f)}
                className={`filter-chip ${currentFilter === f ? "active" : ""}`}
              >
                {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* LANDLORD LIST */}
        <div className="px-5 space-y-3">
          {sortedLandlords.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: "rgba(255,255,255,0.05)" }}
              >
                <Search className="w-8 h-8" style={{ color: "#525252" }} />
              </div>
              <h3 className="text-base font-semibold text-white">No landlords found</h3>
              <p className="text-sm mt-1" style={{ color: "#525252" }}>
                Try adjusting your search or filters
              </p>
            </div>
          )}

          {sortedLandlords.map((l, i) => {
            // Find original index for actions
            const origIdx = landlords.findIndex((o) => o.name === l.name);
            return (
              <div
                key={l.name}
                className="landlord-card"
                onClick={() => openLandlordDetail(origIdx)}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="avatar w-12 h-12 text-sm"
                    style={{ background: `linear-gradient(135deg, ${l.color}, ${l.color}dd)` }}
                  >
                    {l.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-white truncate">{l.name}</h4>
                      <span className={`status-badge status-${l.status}`}>
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: statusColor(l.status) }}
                        />
                        {statusLabel(l.status)}
                      </span>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: "#a3a3a3" }}>
                      {l.phone}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs" style={{ color: "#525252" }}>
                        <span className="font-semibold text-white">{l.properties}</span>{" "}
                        {l.properties === 1 ? "Property" : "Properties"}
                      </span>
                      <span className="text-xs" style={{ color: "#525252" }}>
                        <span className="font-semibold text-white">{l.units}</span> Units
                      </span>
                      {l.verified ? (
                        <span className="flex items-center gap-1 text-xs" style={{ color: "#059669" }}>
                          <ShieldCheck className="w-3 h-3" /> Verified
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs" style={{ color: "#9ca3af" }}>
                          <ShieldOff className="w-3 h-3" /> Unverified
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openLandlordDetail(origIdx);
                    }}
                    className="flex-1 text-center text-xs font-medium py-2 rounded-lg"
                    style={{ background: "rgba(255,255,255,0.05)", color: "#a3a3a3" }}
                  >
                    View
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (l.status === "suspended") {
                        openReinstateSheet(origIdx);
                      } else if (!l.verified) {
                        openVerifySheet(origIdx);
                      } else {
                        openMessageSheet(origIdx);
                      }
                    }}
                    className="flex-1 text-center text-xs font-medium py-2 rounded-lg"
                    style={{
                      background: l.status === "suspended"
                        ? "rgba(4,120,87,0.1)"
                        : !l.verified
                          ? "rgba(4,120,87,0.1)"
                          : "rgba(59,130,246,0.1)",
                      color: l.status === "suspended" || !l.verified ? "#059669" : "#3b82f6",
                    }}
                  >
                    {l.status === "suspended" ? "Reinstate" : !l.verified ? "Verify ID" : "Message"}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openActionSheet(origIdx);
                    }}
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,0.05)" }}
                  >
                    <MoreVertical className="w-4 h-4" style={{ color: "#a3a3a3" }} />
                  </button>
                </div>
              </div>
            );
          })}
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
                if (item.key === "dashboard") router.push("/admin");
                else if (item.key === "landlords") router.push("/admin/landlords");
                else if (item.key === "listings") router.push("/admin/listings");
                else if (item.key === "wallet") router.push("/admin/wallet");
                else if (item.key === "settings") router.push("/admin/settings");
                else if (item.snackbar) showSnackbar(item.snackbar, "info");
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

      {/* ──────────── BOTTOM SHEETS ──────────── */}

      {/* OVERLAY */}
      <div
        className={`bottom-sheet-overlay ${activeSheet ? "active" : ""}`}
        onClick={closeSheet}
      />

      {/* -- FILTER SHEET -- */}
      <div className={`bottom-sheet ${activeSheet === "filter" ? "active" : ""}`}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-8">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-white">Filters</h3>
            <button onClick={resetFilters} className="text-xs font-medium" style={{ color: "#059669" }}>
              Reset all
            </button>
          </div>

          {/* Status */}
          <div className="mb-5">
            <label className="text-xs font-semibold mb-3 block" style={{ color: "#a3a3a3" }}>
              STATUS
            </label>
            <div className="flex flex-wrap gap-2">
              {["all", "active", "pending", "suspended"].map((v) => (
                <button
                  key={v}
                  onClick={() => setFilterStatus(v)}
                  className="filter-chip"
                  style={{
                    background: filterStatus === v ? "rgba(4,120,87,0.15)" : "rgba(255,255,255,0.03)",
                    borderColor: filterStatus === v ? "rgba(4,120,87,0.3)" : "rgba(255,255,255,0.08)",
                    color: filterStatus === v ? "#059669" : "#a3a3a3",
                  }}
                >
                  {v === "all" ? "All" : v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Verification */}
          <div className="mb-5">
            <label className="text-xs font-semibold mb-3 block" style={{ color: "#a3a3a3" }}>
              VERIFICATION
            </label>
            <div className="flex flex-wrap gap-2">
              {["all", "verified", "unverified"].map((v) => (
                <button
                  key={v}
                  onClick={() => setFilterVerify(v)}
                  className="filter-chip"
                  style={{
                    background: filterVerify === v ? "rgba(4,120,87,0.15)" : "rgba(255,255,255,0.03)",
                    borderColor: filterVerify === v ? "rgba(4,120,87,0.3)" : "rgba(255,255,255,0.08)",
                    color: filterVerify === v ? "#059669" : "#a3a3a3",
                  }}
                >
                  {v === "all" ? "All" : v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Sort */}
          <div className="mb-5">
            <label className="text-xs font-semibold mb-3 block" style={{ color: "#a3a3a3" }}>
              SORT BY
            </label>
            <div className="space-y-2">
              {SORT_OPTIONS.map((opt) => (
                <label
                  key={opt.key}
                  className="flex items-center gap-3 p-3 rounded-xl cursor-pointer"
                  style={{
                    background: filterSort === opt.key ? "rgba(4,120,87,0.1)" : "rgba(255,255,255,0.03)",
                    border: filterSort === opt.key ? "1.5px solid rgba(4,120,87,0.3)" : "1.5px solid transparent",
                  }}
                  onClick={() => setFilterSort(opt.key)}
                >
                  <div
                    className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                    style={{ borderColor: filterSort === opt.key ? "#059669" : "#525252" }}
                  >
                    {filterSort === opt.key && (
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#059669" }} />
                    )}
                  </div>
                  <span
                    className="text-sm font-medium"
                    style={{ color: filterSort === opt.key ? "#059669" : "#a3a3a3" }}
                  >
                    {opt.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <button
            onClick={applyFilters}
            className="btn-primary w-full text-center ripple-container"
          >
            Apply Filters
          </button>
        </div>
      </div>

      {/* -- LANDLORD DETAIL SHEET -- */}
      <div className={`bottom-sheet ${activeSheet === "detail" ? "active" : ""}`} style={{ maxHeight: "95dvh" }}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-8">
          {currentLandlord && (
            <>
              {/* Profile Header */}
              <div className="flex items-center gap-4 mb-5">
                <div
                  className="avatar w-16 h-16 text-xl"
                  style={{ background: `linear-gradient(135deg, ${currentLandlord.color}, ${currentLandlord.color}dd)` }}
                >
                  {currentLandlord.initials}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white">{currentLandlord.name}</h3>
                  <p className="text-sm" style={{ color: "#a3a3a3" }}>
                    {currentLandlord.phone}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`status-badge status-${currentLandlord.status}`}>
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: statusColor(currentLandlord.status) }}
                      />
                      {statusLabel(currentLandlord.status)}
                    </span>
                    {currentLandlord.verified ? (
                      <span className="flex items-center gap-1 text-xs font-medium" style={{ color: "#059669" }}>
                        <ShieldCheck className="w-3.5 h-3.5" /> Verified
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-medium" style={{ color: "#9ca3af" }}>
                        <ShieldOff className="w-3.5 h-3.5" /> Unverified
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-2 mb-5">
                <div className="text-center p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
                  <p className="text-lg font-bold text-white">{currentLandlord.properties}</p>
                  <p className="text-xs" style={{ color: "#525252" }}>
                    {currentLandlord.properties === 1 ? "Property" : "Properties"}
                  </p>
                </div>
                <div className="text-center p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
                  <p className="text-lg font-bold text-white">{currentLandlord.units}</p>
                  <p className="text-xs" style={{ color: "#525252" }}>
                    Units
                  </p>
                </div>
                <div className="text-center p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
                  <p className="text-lg font-bold text-white">{currentLandlord.revenue}</p>
                  <p className="text-xs" style={{ color: "#525252" }}>
                    Revenue
                  </p>
                </div>
              </div>

              {/* Info Rows */}
              <div className="mb-5">
                <div className="info-row">
                  <Mail className="w-5 h-5 flex-shrink-0" style={{ color: "#525252" }} />
                  <div>
                    <p className="text-xs" style={{ color: "#525252" }}>Email</p>
                    <p className="text-sm text-white">{currentLandlord.email}</p>
                  </div>
                </div>
                <div className="info-row">
                  <CreditCard className="w-5 h-5 flex-shrink-0" style={{ color: "#525252" }} />
                  <div>
                    <p className="text-xs" style={{ color: "#525252" }}>ID Number</p>
                    <p className="text-sm text-white">{currentLandlord.id}</p>
                  </div>
                </div>
                <div className="info-row">
                  <MapPin className="w-5 h-5 flex-shrink-0" style={{ color: "#525252" }} />
                  <div>
                    <p className="text-xs" style={{ color: "#525252" }}>Location</p>
                    <p className="text-sm text-white">{currentLandlord.location}</p>
                  </div>
                </div>
                <div className="info-row">
                  <Calendar className="w-5 h-5 flex-shrink-0" style={{ color: "#525252" }} />
                  <div>
                    <p className="text-xs" style={{ color: "#525252" }}>Joined</p>
                    <p className="text-sm text-white">{currentLandlord.joined}</p>
                  </div>
                </div>
                <div className="info-row">
                  <Crown className="w-5 h-5 flex-shrink-0" style={{ color: "#525252" }} />
                  <div>
                    <p className="text-xs" style={{ color: "#525252" }}>Plan</p>
                    <p className="text-sm text-white">{currentLandlord.plan}</p>
                  </div>
                </div>
              </div>

              {/* Properties Preview */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold" style={{ color: "#a3a3a3" }}>
                    Properties
                  </h4>                    <button
                      onClick={() => {
                        closeSheet();
                        setTimeout(() => openSheet("properties"), 300);
                      }}
                      className="text-xs font-medium"
                      style={{ color: "#059669" }}
                    >
                      View all
                    </button>
                </div>
                <div className="space-y-2">
                  <div className="property-mini-card">
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #047857, #059669)' }}><Building2 className="w-5 h-5 text-white" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">2BR Apartment - Kilimani</p>
                      <p className="text-xs" style={{ color: "#525252" }}>
                        3 units · KSh 35,000/mo
                      </p>
                    </div>
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{ background: "rgba(4,120,87,0.15)", color: "#059669" }}
                    >
                      Active
                    </span>
                  </div>
                  <div className="property-mini-card">
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}><Building2 className="w-5 h-5 text-white" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">4BR House - Karen</p>
                      <p className="text-xs" style={{ color: "#525252" }}>
                        1 unit · KSh 120,000/mo
                      </p>
                    </div>
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{ background: "rgba(4,120,87,0.15)", color: "#059669" }}
                    >
                      Active
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <button
                  onClick={() => {
                    closeSheet();
                    setTimeout(() => openMessageSheet(currentIdx), 300);
                  }}
                  className="w-full flex items-center gap-3 p-3.5 rounded-xl transition-all"
                  style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)" }}
                >
                  <MessageSquare className="w-5 h-5" style={{ color: "#3b82f6" }} />
                  <span className="text-sm font-medium" style={{ color: "#3b82f6" }}>
                    Send Message
                  </span>
                </button>
                <button
                  onClick={() => {
                    closeSheet();
                    setTimeout(() => {
                      if (currentLandlord.status === "suspended") {
                        openReinstateSheet(currentIdx);
                      } else {
                        openSuspendSheet(currentIdx);
                      }
                    }, 300);
                  }}
                  className="w-full flex items-center gap-3 p-3.5 rounded-xl transition-all"
                  style={{
                    background: currentLandlord.status === "suspended"
                      ? "rgba(4,120,87,0.08)"
                      : "rgba(234,179,8,0.08)",
                    border: currentLandlord.status === "suspended"
                      ? "1px solid rgba(4,120,87,0.15)"
                      : "1px solid rgba(234,179,8,0.15)",
                  }}
                >
                  {currentLandlord.status === "suspended" ? (
                    <RotateCcw className="w-5 h-5" style={{ color: "#059669" }} />
                  ) : (
                    <PauseCircle className="w-5 h-5" style={{ color: "#eab308" }} />
                  )}
                  <span
                    className="text-sm font-medium"
                    style={{ color: currentLandlord.status === "suspended" ? "#059669" : "#eab308" }}
                  >
                    {currentLandlord.status === "suspended" ? "Reinstate Account" : "Suspend Account"}
                  </span>
                </button>
                <button
                  onClick={() => {
                    closeSheet();
                    setTimeout(() => openBanSheet(currentIdx), 300);
                  }}
                  className="w-full flex items-center gap-3 p-3.5 rounded-xl transition-all"
                  style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}
                >
                  <Ban className="w-5 h-5" style={{ color: "#ef4444" }} />
                  <span className="text-sm font-medium" style={{ color: "#ef4444" }}>
                    Ban Landlord
                  </span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* -- VERIFY ID SHEET -- */}
      <div className={`bottom-sheet ${activeSheet === "verify" ? "active" : ""}`}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-8">
          {currentLandlord && (
            <>
              <div className="flex items-center gap-3 mb-5">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(4,120,87,0.15)" }}
                >
                  <ShieldCheck className="w-5 h-5" style={{ color: "#059669" }} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Verify ID</h3>
                  <p className="text-xs" style={{ color: "#a3a3a3" }}>
                    {currentLandlord.name}
                  </p>
                </div>
              </div>

              {/* ID Preview */}
              <div className="mb-4">
                <p className="text-xs font-semibold mb-2" style={{ color: "#a3a3a3" }}>
                  SUBMITTED ID
                </p>
                <div
                  className="rounded-xl overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <div className="w-full h-40 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.03)' }}><FileText className="w-12 h-12" style={{ color: '#525252' }} /></div>
                  <div className="p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: "#525252" }}>
                        Kenya National ID
                      </span>
                      <button
                        onClick={() => openSheet("id-preview")}
                        className="text-xs font-medium flex items-center gap-1"
                        style={{ color: "#3b82f6" }}
                      >
                        <Maximize2 className="w-3 h-3" /> Full screen
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* ID Details */}
              <div className="space-y-2 mb-5">
                <div
                  className="flex justify-between p-3 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.03)" }}
                >
                  <span className="text-xs" style={{ color: "#525252" }}>ID Number</span>
                  <span className="text-sm font-medium text-white">{currentLandlord.id}</span>
                </div>
                <div
                  className="flex justify-between p-3 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.03)" }}
                >
                  <span className="text-xs" style={{ color: "#525252" }}>Name on ID</span>
                  <span className="text-sm font-medium text-white">{currentLandlord.name}</span>
                </div>
                <div
                  className="flex justify-between p-3 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.03)" }}
                >
                  <span className="text-xs" style={{ color: "#525252" }}>Submitted</span>
                  <span className="text-sm font-medium text-white">2 days ago</span>
                </div>
              </div>

              {/* Name Match Check */}
              <div
                className="flex items-center gap-3 p-3 rounded-xl mb-4"
                style={{ background: "rgba(4,120,87,0.08)", border: "1px solid rgba(4,120,87,0.15)" }}
              >
                <CheckCircle2 className="w-5 h-5" style={{ color: "#059669" }} />
                <div>
                  <p className="text-sm font-medium" style={{ color: "#059669" }}>
                    Name matches account
                  </p>
                  <p className="text-xs" style={{ color: "#a3a3a3" }}>
                    ID name matches registered name
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={closeSheet} className="btn-ghost flex-1 text-center">
                  Cancel
                </button>
                <button
                  onClick={approveVerification}
                  className="btn-primary flex-1 text-center ripple-container"
                >
                  Approve
                </button>
              </div>
              <button
                onClick={() => {
                  closeSheet();
                  setTimeout(() => openSheet("reject-verify"), 300);
                }}
                className="w-full mt-2 text-center text-sm font-medium py-3"
                style={{ color: "#ef4444" }}
              >
                Reject Verification
              </button>
            </>
          )}
        </div>
      </div>

      {/* -- REJECT VERIFICATION SHEET -- */}
      <div className={`bottom-sheet ${activeSheet === "reject-verify" ? "active" : ""}`}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-8">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: "rgba(239,68,68,0.15)" }}
            >
              <XCircle className="w-5 h-5" style={{ color: "#ef4444" }} />
            </div>
            <h3 className="text-lg font-bold text-white">Reject Verification</h3>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {REJECT_VERIFY_REASONS.map((reason) => (
              <button
                key={reason}
                onClick={() => setRejectVerifyReason(reason)}
                className="text-xs font-medium px-3.5 py-2 rounded-full transition-all"
                style={{
                  background: rejectVerifyReason === reason ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.05)",
                  border: rejectVerifyReason === reason
                    ? "1px solid rgba(239,68,68,0.3)"
                    : "1px solid rgba(255,255,255,0.1)",
                  color: rejectVerifyReason === reason ? "#ef4444" : "#a3a3a3",
                }}
              >
                {reason}
              </button>
            ))}
          </div>
          <textarea
            className="android-input"
            rows={2}
            placeholder="Additional notes for landlord..."
          />
          <div className="flex gap-3 mt-4">
            <button onClick={closeSheet} className="btn-ghost flex-1 text-center">
              Cancel
            </button>
            <button
              onClick={confirmRejectVerification}
              disabled={!rejectVerifyReason}
              className="btn-danger flex-1 text-center"
              style={{ opacity: rejectVerifyReason ? 1 : 0.4, cursor: rejectVerifyReason ? "pointer" : "not-allowed" }}
            >
              Reject
            </button>
          </div>
        </div>
      </div>

      {/* -- SUSPEND SHEET -- */}
      <div className={`bottom-sheet ${activeSheet === "suspend" ? "active" : ""}`}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-8">
          {currentLandlord && (
            <>
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(234,179,8,0.15)" }}
                >
                  <PauseCircle className="w-5 h-5" style={{ color: "#eab308" }} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Suspend Account</h3>
                  <p className="text-xs" style={{ color: "#a3a3a3" }}>
                    {currentLandlord.name}
                  </p>
                </div>
              </div>

              <div
                className="p-3 rounded-xl mb-4"
                style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.15)" }}
              >
                <p className="text-xs" style={{ color: "#eab308" }}>
                  ⚠ Suspending will hide all their listings and disable their account. They can be reinstated later.
                </p>
              </div>

              <div className="mb-4">
                <label className="text-xs font-semibold mb-2 block" style={{ color: "#a3a3a3" }}>
                  REASON
                </label>
                <div className="flex flex-wrap gap-2">
                  {SUSPEND_REASONS.map((reason) => (
                    <button
                      key={reason}
                      onClick={() => setSelectedSuspendReason(reason)}
                      className="text-xs font-medium px-3.5 py-2 rounded-full transition-all"
                      style={{
                        background: selectedSuspendReason === reason
                          ? "rgba(234,179,8,0.1)"
                          : "rgba(255,255,255,0.05)",
                        border: selectedSuspendReason === reason
                          ? "1px solid rgba(234,179,8,0.3)"
                          : "1px solid rgba(255,255,255,0.1)",
                        color: selectedSuspendReason === reason ? "#eab308" : "#a3a3a3",
                      }}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <label className="text-xs font-semibold mb-2 block" style={{ color: "#a3a3a3" }}>
                  DURATION
                </label>
                <div className="flex gap-2">
                  {SUSPEND_DURATIONS.map((d) => (
                    <button
                      key={d.value}
                      onClick={() => setSelectedSuspendDuration(d.value)}
                      className="text-xs font-medium px-4 py-2.5 rounded-xl transition-all"
                      style={{
                        background: selectedSuspendDuration === d.value
                          ? "rgba(234,179,8,0.15)"
                          : "rgba(255,255,255,0.03)",
                        border: selectedSuspendDuration === d.value
                          ? "1.5px solid rgba(234,179,8,0.3)"
                          : "1.5px solid rgba(255,255,255,0.08)",
                        color: selectedSuspendDuration === d.value ? "#eab308" : "#a3a3a3",
                      }}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                className="android-input"
                rows={2}
                placeholder="Additional notes..."
                value={suspendNote}
                onChange={(e) => setSuspendNote(e.target.value)}
              />

              <div className="flex items-center gap-3 mt-4 mb-4">
                <div
                  className={`toggle-track ${suspendNotify ? "active" : ""}`}
                  onClick={() => setSuspendNotify((s) => !s)}
                >
                  <div className="toggle-thumb" />
                </div>
                <span className="text-sm" style={{ color: "#a3a3a3" }}>
                  Notify landlord via SMS & email
                </span>
              </div>

              <div className="flex gap-3">
                <button onClick={closeSheet} className="btn-ghost flex-1 text-center">
                  Cancel
                </button>
                <button
                  onClick={confirmSuspend}
                  disabled={!selectedSuspendReason}
                  className="btn-warning flex-1 text-center"
                  style={{ opacity: selectedSuspendReason ? 1 : 0.4, cursor: selectedSuspendReason ? "pointer" : "not-allowed" }}
                >
                  Suspend
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* -- BAN SHEET -- */}
      <div className={`bottom-sheet ${activeSheet === "ban" ? "active" : ""}`}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-8">
          {currentLandlord && (
            <>
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(239,68,68,0.15)" }}
                >
                  <Ban className="w-5 h-5" style={{ color: "#ef4444" }} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Ban Landlord</h3>
                  <p className="text-xs" style={{ color: "#a3a3a3" }}>
                    {currentLandlord.name}
                  </p>
                </div>
              </div>

              <div
                className="p-4 rounded-xl mb-4"
                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#ef4444" }} />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "#ef4444" }}>
                      This action is permanent
                    </p>
                    <p className="text-xs mt-1" style={{ color: "#a3a3a3" }}>
                      Banning will permanently remove all listings, delete their data, and block their phone & email
                      from re-registering.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <label className="text-xs font-semibold mb-2 block" style={{ color: "#a3a3a3" }}>
                  REASON FOR BAN
                </label>
                <div className="flex flex-wrap gap-2">
                  {BAN_REASONS.map((reason) => (
                    <button
                      key={reason}
                      onClick={() => setSelectedBanReason(reason)}
                      className="text-xs font-medium px-3.5 py-2 rounded-full transition-all"
                      style={{
                        background: selectedBanReason === reason
                          ? "rgba(239,68,68,0.1)"
                          : "rgba(255,255,255,0.05)",
                        border: selectedBanReason === reason
                          ? "1px solid rgba(239,68,68,0.3)"
                          : "1px solid rgba(255,255,255,0.1)",
                        color: selectedBanReason === reason ? "#ef4444" : "#a3a3a3",
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
                placeholder="Internal note (not visible to landlord)..."
                value={banNote}
                onChange={(e) => setBanNote(e.target.value)}
              />

              <div className="mb-4">
                <label className="text-xs font-semibold mb-2 block" style={{ color: "#a3a3a3" }}>
                  TYPE TO CONFIRM
                </label>
                <input
                  type="text"
                  className="android-input"
                  placeholder='Type "BAN" to confirm'
                  value={banConfirm}
                  onChange={(e) => setBanConfirm(e.target.value)}
                />
              </div>

              <div className="flex gap-3">
                <button onClick={closeSheet} className="btn-ghost flex-1 text-center">
                  Cancel
                </button>
                <button
                  onClick={confirmBan}
                  disabled={banConfirm !== "BAN" || !selectedBanReason}
                  className="btn-danger flex-1 text-center"
                  style={{
                    opacity: banConfirm === "BAN" && selectedBanReason ? 1 : 0.4,
                    cursor: banConfirm === "BAN" && selectedBanReason ? "pointer" : "not-allowed",
                  }}
                >
                  Ban Permanently
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* -- REINSTATE SHEET -- */}
      <div className={`bottom-sheet ${activeSheet === "reinstate" ? "active" : ""}`}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-8">
          {currentLandlord && (
            <>
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(4,120,87,0.15)" }}
                >
                  <RotateCcw className="w-5 h-5" style={{ color: "#059669" }} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Reinstate Account</h3>
                  <p className="text-xs" style={{ color: "#a3a3a3" }}>
                    {currentLandlord.name}
                  </p>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div
                  className="flex justify-between p-3 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.03)" }}
                >
                  <span className="text-xs" style={{ color: "#525252" }}>Suspended on</span>
                  <span className="text-sm font-medium text-white">Dec 20, 2024</span>
                </div>
                <div
                  className="flex justify-between p-3 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.03)" }}
                >
                  <span className="text-xs" style={{ color: "#525252" }}>Reason</span>
                  <span className="text-sm font-medium text-white">Policy violation</span>
                </div>
                <div
                  className="flex justify-between p-3 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.03)" }}
                >
                  <span className="text-xs" style={{ color: "#525252" }}>Duration</span>
                  <span className="text-sm font-medium text-white">30 days (12 remaining)</span>
                </div>
              </div>

              <textarea
                className="android-input"
                rows={2}
                placeholder="Reason for early reinstatement..."
                value={reinstateNote}
                onChange={(e) => setReinstateNote(e.target.value)}
              />

              <div className="flex items-center gap-3 mt-4 mb-4">
                <div
                  className={`toggle-track ${reinstateNotify ? "active" : ""}`}
                  onClick={() => setReinstateNotify((s) => !s)}
                >
                  <div className="toggle-thumb" />
                </div>
                <span className="text-sm" style={{ color: "#a3a3a3" }}>
                  Notify landlord of reinstatement
                </span>
              </div>

              <div className="flex gap-3">
                <button onClick={closeSheet} className="btn-ghost flex-1 text-center">
                  Cancel
                </button>
                <button
                  onClick={confirmReinstate}
                  className="btn-primary flex-1 text-center ripple-container"
                >
                  Reinstate
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* -- MESSAGE SHEET -- */}
      <div className={`bottom-sheet ${activeSheet === "message" ? "active" : ""}`}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-8">
          {currentLandlord && (
            <>
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(59,130,246,0.15)" }}
                >
                  <MessageSquare className="w-5 h-5" style={{ color: "#3b82f6" }} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Send Message</h3>
                  <p className="text-xs" style={{ color: "#a3a3a3" }}>
                    To: {currentLandlord.name}
                  </p>
                </div>
              </div>

              {/* Quick Templates */}
              <div className="mb-4">
                <label className="text-xs font-semibold mb-2 block" style={{ color: "#a3a3a3" }}>
                  QUICK TEMPLATES
                </label>
                <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                  {MESSAGE_TEMPLATES.map((t, i) => (
                    <button
                      key={i}
                      onClick={() => applyTemplate(t.text)}
                      className="text-xs font-medium px-3 py-2 rounded-lg whitespace-nowrap"
                      style={{ background: "rgba(255,255,255,0.05)", color: "#a3a3a3" }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                className="android-input"
                rows={4}
                placeholder="Type your message..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
              />

              <div className="flex items-center gap-3 mt-3 mb-4">
                <div
                  className={`toggle-track ${messageSms ? "active" : ""}`}
                  onClick={() => setMessageSms((s) => !s)}
                >
                  <div className="toggle-thumb" />
                </div>
                <span className="text-sm" style={{ color: "#a3a3a3" }}>
                  Also send via SMS ({currentLandlord.phone.slice(0, 12)}...)
                </span>
              </div>

              <div className="flex gap-3">
                <button onClick={closeSheet} className="btn-ghost flex-1 text-center">
                  Cancel
                </button>
                <button
                  onClick={sendMessage}
                  className="btn-primary flex-1 text-center ripple-container flex items-center justify-center gap-2"
                >
                  {messageSending ? (
                    <>
                      <div className="spinner" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <span>Send</span>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* -- QUICK ACTIONS SHEET -- */}
      <div className={`bottom-sheet ${activeSheet === "action" ? "active" : ""}`}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-4">
          <h3 className="text-sm font-semibold mb-3" style={{ color: "#a3a3a3" }}>
            Actions
          </h3>
          <div className="space-y-1">
            <button
              onClick={() => {
                closeSheet();
                setTimeout(() => openLandlordDetail(currentIdx), 200);
              }}
              className="w-full flex items-center gap-4 p-3.5 rounded-xl"
              style={{ background: "transparent" }}
            >
              <Eye className="w-5 h-5" style={{ color: "#a3a3a3" }} />
              <span className="text-sm font-medium text-white">View Profile</span>
            </button>
            <button
              onClick={() => {
                closeSheet();
                setTimeout(() => openMessageSheet(currentIdx), 200);
              }}
              className="w-full flex items-center gap-4 p-3.5 rounded-xl"
              style={{ background: "transparent" }}
            >
              <MessageSquare className="w-5 h-5" style={{ color: "#3b82f6" }} />
              <span className="text-sm font-medium text-white">Send Message</span>
            </button>
            {!currentLandlord?.verified && (
              <button
                onClick={() => {
                  closeSheet();
                  setTimeout(() => openVerifySheet(currentIdx), 200);
                }}
                className="w-full flex items-center gap-4 p-3.5 rounded-xl"
                style={{ background: "transparent" }}
              >
                <ShieldCheck className="w-5 h-5" style={{ color: "#059669" }} />
                <span className="text-sm font-medium text-white">Verify ID</span>
              </button>
            )}
            <button
              onClick={() => {
                closeSheet();
                setTimeout(() => {
                  if (currentLandlord?.status === "suspended") {
                    openReinstateSheet(currentIdx);
                  } else {
                    openSuspendSheet(currentIdx);
                  }
                }, 200);
              }}
              className="w-full flex items-center gap-4 p-3.5 rounded-xl"
              style={{ background: "transparent" }}
            >
              {currentLandlord?.status === "suspended" ? (
                <RotateCcw className="w-5 h-5" style={{ color: "#059669" }} />
              ) : (
                <PauseCircle className="w-5 h-5" style={{ color: "#eab308" }} />
              )}
              <span className="text-sm font-medium text-white">
                {currentLandlord?.status === "suspended" ? "Reinstate" : "Suspend"}
              </span>
            </button>
            <button
              onClick={() => {
                closeSheet();
                setTimeout(() => openBanSheet(currentIdx), 200);
              }}
              className="w-full flex items-center gap-4 p-3.5 rounded-xl"
              style={{ background: "transparent" }}
            >
              <Ban className="w-5 h-5" style={{ color: "#ef4444" }} />
              <span className="text-sm font-medium text-white">Ban</span>
            </button>              <button
                onClick={() => {
                  closeSheet();
                  setTimeout(() => openSheet("activity"), 200);
                }}
                className="w-full flex items-center gap-4 p-3.5 rounded-xl"
                style={{ background: "transparent" }}
              >
                <ScrollText className="w-5 h-5" style={{ color: "#a3a3a3" }} />
                <span className="text-sm font-medium text-white">Activity Log</span>
              </button>
          </div>
          <button onClick={closeSheet} className="btn-ghost w-full text-center mt-3">
            Cancel
          </button>
        </div>
      </div>

      {/* -- PROPERTIES LIST SHEET -- */}
      <div className={`bottom-sheet ${activeSheet === "properties" ? "active" : ""}`} style={{ maxHeight: "90dvh" }}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-8">
          {currentLandlord && (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Properties</h3>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: "rgba(59,130,246,0.15)", color: "#3b82f6" }}>
                  {currentLandlord.properties} Total
                </span>
              </div>
              <p className="text-xs mb-4" style={{ color: "#a3a3a3" }}>
                {currentLandlord.name} · {currentLandlord.location}
              </p>
              <div className="space-y-3">
                {(PROPERTIES_DATA[currentLandlord.name] || []).length === 0 && (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: "rgba(255,255,255,0.05)" }}>
                      <Building2 className="w-7 h-7" style={{ color: "#525252" }} />
                    </div>
                    <p className="text-sm font-semibold text-white">No properties yet</p>
                    <p className="text-xs mt-1" style={{ color: "#525252" }}>This landlord hasn&apos;t added any properties</p>
                  </div>
                )}
                {(PROPERTIES_DATA[currentLandlord.name] || []).map((p, i) => (
                  <div key={i} className="property-mini-card">
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #047857, #059669)' }}><Building2 className="w-6 h-6 text-white" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{p.name}</p>
                      <p className="text-xs" style={{ color: "#525252" }}>{p.type} · {p.units} {p.units === 1 ? "unit" : "units"} · {p.price}</p>
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full`} style={{
                      background: p.status === "active" ? "rgba(4,120,87,0.15)" : p.status === "pending" ? "rgba(234,179,8,0.15)" : "rgba(239,68,68,0.15)",
                      color: p.status === "active" ? "#059669" : p.status === "pending" ? "#eab308" : "#ef4444"
                    }}>
                      {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={() => {
                  closeSheet();
                  setTimeout(() => openMessageSheet(currentIdx), 300);
                }} className="btn-ghost flex-1 text-center" style={{ padding: "12px", fontSize: "13px" }}>
                  Message Landlord
                </button>
                <button onClick={() => {
                  closeSheet();
                  setTimeout(() => showSnackbar("Opening listings manager...", "info"), 300);
                }} className="btn-primary flex-1 text-center ripple-container" style={{ padding: "12px", fontSize: "13px" }}>
                  Manage in Listings
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* -- ACTIVITY LOG SHEET -- */}
      <div className={`bottom-sheet ${activeSheet === "activity" ? "active" : ""}`} style={{ maxHeight: "90dvh" }}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-8">
          {currentLandlord && (
            <>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-lg font-bold text-white">Activity Log</h3>
                <button onClick={() => showSnackbar("Activity log exported", "success")} className="text-xs font-medium px-3 py-1.5 rounded-lg" style={{ background: "rgba(4,120,87,0.15)", color: "#059669" }}>Export</button>
              </div>
              <p className="text-xs mb-4" style={{ color: "#a3a3a3" }}>{currentLandlord.name}</p>
              <div className="space-y-1">
                {ACTIVITY_DATA.map((act, i) => {
                  const logColors: Record<string, string> = { approve: "#059669", suspend: "#eab308", verify: "#3b82f6", message: "#a855f7", payment: "#3b82f6", report: "#ef4444" };
                  const logIcons: Record<string, React.ElementType> = { approve: Check, suspend: PauseCircle, verify: ShieldCheck, message: MessageSquare, payment: CreditCard, report: AlertTriangle };
                  const LogIcon = logIcons[act.type] || ScrollText;
                  return (
                    <div key={i} className="flex items-start gap-3 py-3" style={{ borderBottom: i < ACTIVITY_DATA.length - 1 ? "1px solid rgba(255,255,255,0.04)" : undefined }}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${logColors[act.type]}15` }}>
                        <LogIcon className="w-4 h-4" style={{ color: logColors[act.type] }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-white">{act.action}</p>
                          <span className="text-xs" style={{ color: "#525252" }}>{act.time}</span>
                        </div>
                        <p className="text-xs" style={{ color: "#a3a3a3" }}>{act.detail}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* -- FULL SCREEN ID PREVIEW SHEET -- */}
      <div className={`bottom-sheet ${activeSheet === "id-preview" ? "active" : ""}`} style={{ maxHeight: "100dvh", borderRadius: 0 }}>
        <div className="relative w-full h-[100dvh] flex flex-col" style={{ background: "#000" }}>
          <div className="flex items-center justify-between p-4 flex-shrink-0">
            <button onClick={closeSheet} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.1)" }}>
              <X className="w-5 h-5 text-white" />
            </button>
            <span className="text-sm font-medium text-white">ID Document</span>
            <button onClick={() => showSnackbar("Image saved to downloads", "success")} className="text-xs font-medium px-3 py-1.5 rounded-lg" style={{ background: "rgba(4,120,87,0.2)", color: "#059669" }}>Save</button>
          </div>
          <div className="flex-1 flex items-center justify-center p-4">
            <div
              className="w-full max-w-md rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.03)', minHeight: '200px' }}
            >
              <FileText className="w-16 h-16" style={{ color: '#525252' }} />
            </div>
          </div>
          <div className="p-4 flex-shrink-0">
            <div className="flex items-center justify-center gap-4">
              <div className="flex items-center gap-2 text-xs" style={{ color: "#525252" }}>
                <div className="w-2 h-2 rounded-full" style={{ background: "#059669" }} />
                Kenya National ID
              </div>
              <div className="flex items-center gap-2 text-xs" style={{ color: "#525252" }}>
                <div className="w-2 h-2 rounded-full" style={{ background: "#059669" }} />
                {currentLandlord?.name || "—"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ──────────── SNACKBAR ──────────── */}
      <div
        id="snackbar"
        className={`snackbar ${snackbar.visible ? "show" : "hide"}`}
      >
        <div className="flex items-center gap-3">
          <div id="snackbar-icon">
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
                <XCircle className="w-3.5 h-3.5" style={{ color: "#ef4444" }} />
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
            <span id="snackbar-text" className="text-sm font-medium text-white">
              {snackbar.message}
            </span>
          </div>
          <button
            onClick={() => setSnackbar((s) => ({ ...s, visible: false }))}
            className="p-1"
          >
            <X className="w-4 h-4" style={{ color: "#525252" }} />
          </button>
        </div>
      </div>
    </div>
  );
}

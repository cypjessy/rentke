"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  PROPERTY_TYPE_OPTIONS,
  UNIT_TYPE_OPTIONS,
  UNIT_STATUS_OPTIONS,
  BATHROOM_OPTIONS,
  FLOOR_OPTIONS,
  COUNTY_OPTIONS,
} from "../constants";
import {
  Search,
  Bell,
  Plus,
  Building2,
  Users,
  Banknote,
  MessageCircle,
  TrendingUp,
  MapPin,
  MoreVertical,
  Check,
  X,
  Info,
  CalendarCheck,
  Wallet,
  UserPlus,
  BarChart3,
  FileText,
  Grid3x3,
  ArrowRight,
  Clock,
  LayoutDashboard,
  MessageSquare,
  List,
  ChevronRight,
  User,
  Smartphone,
  Crown,
  Settings,
  CalendarDays,
  HelpCircle,
  LogOut,
  Camera,
  Eye,
  Share2,
  Trash2,
  Pencil,
  Layers,
  CalendarPlus,
  Archive,
  Phone,
  AlertTriangle,
  BadgeCheck,
  Megaphone,
  MessageSquareWarning,
  DoorOpen,
  Wrench,
  CalendarX,
  AlertCircle,
  FileWarning,
  ShieldCheck,
  Menu,
  CreditCard,
  Download,
  Printer,
  Percent,
  PieChart,
  X as XIcon,
} from "lucide-react";

import AuthGuard from "../components/AuthGuard";
import { useAuth } from "../AuthContext";
import { listenToProperties, addProperty, type PropertyFormData } from "../../lib/properties";
import { updateUserProfile } from "../../lib/admin";
import { pickAndUploadPhoto } from "../../lib/upload";
import { openPhoneUrl } from "../../lib/phone";
import { listenToUnits, addUnit, recordLease, updateUnit, type UnitFormData } from "../../lib/units";
import { listenToViewings, confirmViewing, cancelViewing, scheduleViewing } from "../../lib/viewings";
import { listenToInquiries } from "../../lib/inquiries";
import { listenToMaintenanceRequests } from "../../lib/maintenance";
import type { PropertyData } from "../../lib/properties";
import type { UnitData } from "../../lib/units";
import type { ViewingData } from "../../lib/viewings";
import type { InquiryData } from "../../lib/inquiries";
import type { MaintenanceData } from "../../lib/maintenance";
type Period = "week" | "month" | "year";
type SnackbarType = "success" | "error" | "info";

export default function LandlordDashboard() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  // ---- Tab State ----
  const [activeTab, setActiveTab] = useState("home");

  // ---- Sheet State ----
  const [activeSheet, setActiveSheet] = useState<string | null>(null);

  // ---- Search Text ----
  const [searchText, setSearchText] = useState("");

  // ---- Chart Period ----
  const [chartPeriod, setChartPeriod] = useState<Period>("week");

  // ---- Firestore Data ----
  const [properties, setProperties] = useState<PropertyData[]>([]);
  const [units, setUnits] = useState<UnitData[]>([]);
  const [viewings, setViewings] = useState<ViewingData[]>([]);
  const [inquiries, setInquiries] = useState<InquiryData[]>([]);
  const [maintenanceReqs, setMaintenanceReqs] = useState<MaintenanceData[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // ---- Listeners ----
  useEffect(() => {
    if (!user) { setDataLoading(false); return; }
    const unsubs: (() => void)[] = [];

    unsubs.push(listenToProperties(user.uid, (data) => {
      setProperties(data);
      setDataLoading(false);
    }, () => { setDataLoading(false); }));

    unsubs.push(listenToUnits(user.uid, (data) => {
      setUnits(data);
    }, () => {}));

    unsubs.push(listenToViewings(user.uid, (data) => {
      setViewings(data);
    }, () => {}));

    unsubs.push(listenToInquiries(user.uid, (data) => {
      setInquiries(data);
    }, () => {}));

    unsubs.push(listenToMaintenanceRequests(user.uid, (data) => {
      setMaintenanceReqs(data);
    }, () => {}));

    return () => unsubs.forEach((u) => u());
  }, [user]);

  // ---- Derived Stats ----
  const totalProperties = properties.length;
  const totalUnits = units.length;
  const occupiedUnits = units.filter((u) => u.status === "Occupied").length;
  const vacantUnits = units.filter((u) => u.status === "Vacant").length;
  const occupancyPct = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;
  const monthlyRevenue = units.reduce((sum, u) => sum + (u.status === "Occupied" ? u.rent : 0), 0);
  const pendingViewings = viewings.filter((v) => v.status === "pending" || v.status === "confirmed").length;
  const newInquiries = inquiries.filter((i) => i.status === "new").length;
  const collectedRevenue = units
    .filter((u) => u.status === "Occupied" && u.payment === "Paid")
    .reduce((sum, u) => sum + u.rent, 0);
  const overdueUnits = units.filter((u) => u.status === "Occupied" && u.payment === "Overdue").length;
  const upcomingViewings = viewings
    .filter((v) => v.status === "pending" || v.status === "confirmed")
    .slice(0, 5);

  // ---- Time Ago Helper ----
  function timeAgo(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return date.toLocaleDateString();
  }

  // ---- Payment Activity (derived from units) ----
  const paymentActivity = units
    .filter((u) => u.payment === "Paid" || u.payment === "Overdue" || u.payment === "Pending")
    .map((u) => ({
      name: u.tenantName || "Tenant",
      desc: u.payment === "Paid"
        ? `${u.name} — Monthly Rent`
        : u.payment === "Overdue"
          ? `${u.name} — Rent Overdue`
          : `${u.name} — Late Payment`,
      amount: `KSh ${u.rent.toLocaleString()}`,
      time: u.updatedAt ? timeAgo(u.updatedAt.toDate()) : "Recently",
      sortTime: u.updatedAt?.toDate().getTime() || 0,
      status: u.payment === "Paid" ? "success" : u.payment === "Overdue" ? "overdue" : "warning",
      statusLabel: u.payment === "Paid" ? "Paid" : u.payment === "Overdue" ? "Overdue" : "Partial",
      statusColor: u.payment === "Paid" ? "#047857" : u.payment === "Overdue" ? "#ef4444" : "#eab308",
      statusBg: u.payment === "Paid" ? "rgba(4,120,87,0.1)" : u.payment === "Overdue" ? "rgba(239,68,68,0.1)" : "rgba(234,179,8,0.1)",
    }))
    .sort((a, b) => b.sortTime - a.sortTime)
    .slice(0, 5);

  // ---- Lease Expiry Alerts (derived from units) ----
  const leaseAlerts = units
    .filter((u) => u.status === "Occupied" && u.tenantName && u.leaseEnd)
    .map((u) => {
      const endDate = u.leaseEnd!.toDate();
      const now = new Date();
      const daysLeft = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      const endsStr = `${months[endDate.getMonth()]} ${endDate.getDate()}, ${endDate.getFullYear()}`;
      const isUrgent = daysLeft <= 30;
      const isSoon = daysLeft <= 90;
      return {
        tenant: u.tenantName || "Tenant",
        unit: `${u.name} — ${u.propertyName}`,
        ends: endsStr,
        daysLeft: daysLeft.toString(),
        color: isUrgent ? "#ef4444" : isSoon ? "#eab308" : "#3b82f6",
        bg: isUrgent ? "rgba(239,68,68,0.08)" : isSoon ? "rgba(234,179,8,0.06)" : "rgba(59,130,246,0.06)",
        border: isUrgent ? "rgba(239,68,68,0.2)" : isSoon ? "rgba(234,179,8,0.15)" : "rgba(59,130,246,0.15)",
        sortTime: endDate.getTime(),
      };
    })
    .sort((a, b) => a.sortTime - b.sortTime)
    .slice(0, 5);

  // ---- Recent Activity (merged feed from all sources) ----
  const recentActivity = [
    // New inquiries
    ...inquiries.filter((i) => i.status === "new" || i.status === "progress").map((i) => ({
      dotColor: "#047857",
      title: "New Inquiry",
      time: i.createdAt ? timeAgo(i.createdAt.toDate()) : "Recently",
      desc: `${i.tenantName} asked about ${i.unitName} at ${i.propertyName}`,
      chip: "Inquiry",
      chipBg: "rgba(4,120,87,0.1)",
      chipColor: "#047857",
      sortTime: i.createdAt?.toDate().getTime() || 0,
    })),
    // Payment received
    ...units.filter((u) => u.payment === "Paid").map((u) => ({
      dotColor: "#eab308",
      title: "Payment Received",
      time: u.updatedAt ? timeAgo(u.updatedAt.toDate()) : "Recently",
      desc: `M-Pesa KSh ${u.rent.toLocaleString()} from ${u.tenantName || "Tenant"} — ${u.name}`,
      chip: "Payment",
      chipBg: "rgba(234,179,8,0.1)",
      chipColor: "#eab308",
      sortTime: u.updatedAt?.toDate().getTime() || 0,
    })),
    // Payment overdue
    ...units.filter((u) => u.payment === "Overdue").map((u) => ({
      dotColor: "#ef4444",
      title: "Payment Overdue",
      time: u.updatedAt ? timeAgo(u.updatedAt.toDate()) : "Recently",
      desc: `${u.tenantName || "Tenant"} overdue on ${u.name} — KSh ${u.rent.toLocaleString()}`,
      chip: "Overdue",
      chipBg: "rgba(239,68,68,0.1)",
      chipColor: "#ef4444",
      sortTime: u.updatedAt?.toDate().getTime() || 0,
    })),
    // Viewing schedules
    ...viewings.filter((v) => v.status === "pending" || v.status === "confirmed").map((v) => ({
      dotColor: "#3b82f6",
      title: "Viewing Scheduled",
      time: v.createdAt ? timeAgo(v.createdAt.toDate()) : "Recently",
      desc: `${v.tenantName} wants to view ${v.unitName} at ${v.propertyName}`,
      chip: "Viewing",
      chipBg: "rgba(59,130,246,0.1)",
      chipColor: "#3b82f6",
      sortTime: v.createdAt?.toDate().getTime() || 0,
    })),
    // New tenants
    ...units.filter((u) => u.status === "Occupied" && u.tenantName).map((u) => ({
      dotColor: "#a855f7",
      title: "New Tenant",
      time: u.leaseStart ? timeAgo(u.leaseStart.toDate()) : "Recently",
      desc: `${u.tenantName} moved into ${u.name} at ${u.propertyName}`,
      chip: "Tenant",
      chipBg: "rgba(168,85,247,0.1)",
      chipColor: "#a855f7",
      sortTime: u.leaseStart?.toDate().getTime() || 0,
    })),
    // Maintenance requests
    ...maintenanceReqs.slice(0, 3).map((m) => ({
      dotColor: "#f97316",
      title: "Maintenance Request",
      time: m.createdAt ? timeAgo(m.createdAt.toDate()) : "Recently",
      desc: `${m.title} — ${m.unitName}${m.propertyName ? ` at ${m.propertyName}` : ""}`,
      chip: "Maintenance",
      chipBg: "rgba(249,115,22,0.1)",
      chipColor: "#f97316",
      sortTime: m.createdAt?.toDate().getTime() || 0,
    })),
  ].sort((a, b) => b.sortTime - a.sortTime).slice(0, 8);

  // ---- Snackbar ----
  const [snackbar, setSnackbar] = useState<{
    show: boolean;
    message: string;
    type: SnackbarType;
  }>({ show: false, message: "", type: "info" });
  const snackbarTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- Add Property Form State ----
  const [addFormName, setAddFormName] = useState("");
  const [addFormLocation, setAddFormLocation] = useState("");
  const [addFormCounty, setAddFormCounty] = useState("Nairobi");
  const [addFormType, setAddFormType] = useState("Apartment");
  const [addFormUnits, setAddFormUnits] = useState("");
  const [addFormRentMin, setAddFormRentMin] = useState("");
  const [addFormRentMax, setAddFormRentMax] = useState("");
  const [addFormDescription, setAddFormDescription] = useState("");
  const [addFormAmenities, setAddFormAmenities] = useState<string[]>([]);
  const [addPropertyLoading, setAddPropertyLoading] = useState(false);

  // ---- Add Unit Form State ----
  const [addUPropId, setAddUPropId] = useState("");
  const [addUPropName, setAddUPropName] = useState("");
  const [addUName, setAddUName] = useState("");
  const [addUType, setAddUType] = useState("Bedsitter");
  const [addUStatus, setAddUStatus] = useState<string>("Vacant");
  const [addURent, setAddURent] = useState("");
  const [addUDeposit, setAddUDeposit] = useState("");
  const [addUService, setAddUService] = useState("");
  const [addUBathrooms, setAddUBathrooms] = useState("1");
  const [addUFloor, setAddUFloor] = useState("Ground");
  const [addUArea, setAddUArea] = useState("");
  const [addUDesc, setAddUDesc] = useState("");

  // ---- Record Payment Form State ----
  const [payUnitId, setPayUnitId] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState("");
  const [payNotes, setPayNotes] = useState("");
  const [payLoading, setPayLoading] = useState(false);

  // ---- Add Tenant Form State ----
  const [tenantUnitId, setTenantUnitId] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [tenantPhone, setTenantPhone] = useState("");
  const [tenantLeaseStart, setTenantLeaseStart] = useState("");
  const [tenantTerm, setTenantTerm] = useState("12 months");
  const [tenantRent, setTenantRent] = useState("");
  const [tenantDeposit, setTenantDeposit] = useState("");
  const [tenantLoading, setTenantLoading] = useState(false);

  // ---- Edit Profile Form State ----
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [addUAmenities, setAddUAmenities] = useState<string[]>([]);
  const [addUnitLoading, setAddUnitLoading] = useState(false);

  // ---- Reset forms ----
  const resetAddProperty = () => {
    setAddFormName("");
    setAddFormLocation("");
    setAddFormCounty("Nairobi");
    setAddFormType("Apartment");
    setAddFormUnits("");
    setAddFormRentMin("");
    setAddFormRentMax("");
    setAddFormDescription("");
    setAddFormAmenities([]);
  };
  const resetAddUnit = () => {
    setAddUPropId("");
    setAddUPropName("");
    setAddUName("");
    setAddUType("Bedsitter");
    setAddUStatus("Vacant");
    setAddURent("");
    setAddUDeposit("");
    setAddUService("");
    setAddUBathrooms("1");
    setAddUFloor("Ground");
    setAddUArea("");
    setAddUDesc("");
    setAddUAmenities([]);
  };

  // ---- Count Up ----
  const [countsVisible, setCountsVisible] = useState(false);
  const countUpRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);

  // ---- Snackbar display logic ----
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarAnimClass, setSnackbarAnimClass] = useState("");

  // ---- Chart data (computed from units where possible, fallback placeholders) ----
  const weeklyRevenue = monthlyRevenue > 0 ? [
    Math.round(monthlyRevenue * 0.12),
    Math.round(monthlyRevenue * 0.15),
    Math.round(monthlyRevenue * 0.10),
    Math.round(monthlyRevenue * 0.18),
    Math.round(monthlyRevenue * 0.14),
    Math.round(monthlyRevenue * 0.08),
    Math.round(monthlyRevenue * 0.06),
  ] : [0, 0, 0, 0, 0, 0, 0];
  const maxWeekly = Math.max(...weeklyRevenue, 1);
  // ---- Chart data (computed from monthlyRevenue) ----
  const monthlyRevenueArr = monthlyRevenue > 0 ? [
    Math.round(monthlyRevenue * 0.22),
    Math.round(monthlyRevenue * 0.28),
    Math.round(monthlyRevenue * 0.20),
    Math.round(monthlyRevenue * 0.18),
    Math.round(monthlyRevenue * 0.32),
    Math.round(monthlyRevenue * 0.25),
    Math.round(monthlyRevenue * 0.30),
  ] : [0, 0, 0, 0, 0, 0, 0];
  const yearlyRevenueArr = monthlyRevenue > 0 ? [0,1,2,3,4,5,6].map(i => Math.round(monthlyRevenue * 12 * (0.12 + i * 0.02))) : [0,0,0,0,0,0,0];
  const maxMonthly = Math.max(...monthlyRevenueArr, 1);
  const maxYearly = Math.max(...yearlyRevenueArr, 1);
  const chartData: Record<Period, { heights: number[]; values: string[] }> = {
    week: {
      heights: weeklyRevenue.map(v => Math.round((v / maxWeekly) * 100)),
      values: weeklyRevenue.map(v => v >= 1000 ? `${(v / 1000).toFixed(1)}K` : String(v)),
    },
    month: {
      heights: monthlyRevenueArr.map(v => Math.round((v / maxMonthly) * 100)),
      values: monthlyRevenueArr.map(v => v >= 1000 ? `${(v / 1000).toFixed(1)}K` : String(v)),
    },
    year: {
      heights: yearlyRevenueArr.map(v => Math.round((v / maxYearly) * 100)),
      values: yearlyRevenueArr.map(v => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(1)}K` : String(v)),
    },
  };

  const dayLabels: Record<Period, string[]> = {
    week: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    month: ["W1", "W2", "W3", "W4", "W5", "W6", "W7"],
    year: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"],
  };

  // ---- Count Up Animation ----
  useEffect(() => {
    if (!countsVisible) {
      const timer = setTimeout(() => setCountsVisible(true), 300);
      return () => clearTimeout(timer);
    }
  }, [countsVisible]);

  useEffect(() => {
    if (!countsVisible) return;
    const counters = document.querySelectorAll("[data-count]");
    counters.forEach((counter) => {
      const target = parseInt(counter.getAttribute("data-count") || "0");
      const duration = 1200;
      const start = performance.now();
      function update(now: number) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(eased * target);
        counter.textContent =
          target >= 10000
            ? current.toLocaleString("en-KE")
            : current.toString();
        if (progress < 1) {
          countUpRef.current = requestAnimationFrame(update);
        } else {
          counter.textContent = target.toLocaleString("en-KE");
        }
      }
      countUpRef.current = requestAnimationFrame(update);
    });
    return () => {
      if (countUpRef.current) cancelAnimationFrame(countUpRef.current);
    };
  }, [countsVisible]);

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
    if (snackbarTimeoutRef.current) clearTimeout(snackbarTimeoutRef.current);
    snackbarTimeoutRef.current = setTimeout(() => {
      setSnackbar({ show: false, message: "", type: "info" });
    }, 3000);
  };

  const hideSnackbar = () => {
    setSnackbar({ show: false, message: "", type: "info" });
  };

  // ---- Sheet Management ----
  const openSheet = (name: string) => setActiveSheet(name);
  const closeSheet = () => setActiveSheet(null);

  // ---- Form Handlers ----
  const handleAddProperty = async () => {
    if (!user) return;
    if (!addFormName.trim()) { showSnackbar("Property name is required", "error"); return; }
    setAddPropertyLoading(true);
    try {
      await addProperty(user.uid, {
        name: addFormName,
        location: addFormLocation,
        county: addFormCounty,
        type: addFormType,
        totalUnits: parseInt(addFormUnits) || 0,
        rentMin: parseInt(addFormRentMin.replace(/,/g, "")) || 0,
        rentMax: parseInt(addFormRentMax.replace(/,/g, "")) || 0,
        description: addFormDescription,
        amenities: addFormAmenities,
      });
      resetAddProperty();
      setAddPropertyLoading(false);
      closeSheet();
      setTimeout(() => showSnackbar("Property added successfully! 🎉", "success"), 300);
    } catch (err: any) {
      setAddPropertyLoading(false);
      showSnackbar(err?.message || "Failed to add property", "error");
    }
  };

  const handleAddUnit = async () => {
    if (!user) return;
    if (!addUPropId) { showSnackbar("Please select a property", "error"); return; }
    if (!addUName.trim()) { showSnackbar("Unit name is required", "error"); return; }
    setAddUnitLoading(true);
    try {
      await addUnit(user.uid, {
        propertyId: addUPropId,
        propertyName: addUPropName,
        name: addUName,
        type: addUType as UnitFormData['type'],
        status: addUStatus as UnitFormData['status'],
        rent: parseInt(addURent.replace(/,/g, "")) || 0,
        deposit: parseInt(addUDeposit.replace(/,/g, "")) || 0,
        serviceCharge: parseInt(addUService.replace(/,/g, "")) || 0,
        bathrooms: (BATHROOM_OPTIONS as readonly string[]).indexOf(addUBathrooms) + 1 || 1,
        floor: addUFloor,
        area: parseInt(addUArea) || 0,
        description: addUDesc,
        amenities: addUAmenities,
      });
      resetAddUnit();
      setAddUnitLoading(false);
      closeSheet();
      setTimeout(() => showSnackbar("Unit added successfully! 🎉", "success"), 300);
    } catch (err: any) {
      setAddUnitLoading(false);
      showSnackbar(err?.message || "Failed to add unit", "error");
    }
  };

  // ---- Mark All Read ----
  const markAllRead = () => {
    showSnackbar('All notifications marked as read', 'success');
  };

  // ---- Snackbar Icon ----
  const snackbarIcon = () => {
    switch (snackbar.type) {
      case "success":
        return (
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center"
            style={{ background: "rgba(4,120,87,0.2)" }}
          >
            <Check className="w-3.5 h-3.5" style={{ color: "#047857" }} />
          </div>
        );
      case "error":
        return (
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center"
            style={{ background: "rgba(239,68,68,0.2)" }}
          >
            <X className="w-3.5 h-3.5" style={{ color: "#ef4444" }} />
          </div>
        );
      case "info":
        return (
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center"
            style={{ background: "rgba(59,130,246,0.2)" }}
          >
            <Info className="w-3.5 h-3.5" style={{ color: "#3b82f6" }} />
          </div>
        );
    }
  };

  // ---- Property scroll dots ----
  const [scrollIndex, setScrollIndex] = useState(0);
  const propertyScrollRef = useRef<HTMLDivElement>(null);

  const handlePropertyScroll = useCallback(() => {
    if (!propertyScrollRef.current) return;
    const sl = propertyScrollRef.current.scrollLeft;
    const cw = 272;
    const ai = Math.round(sl / cw);
    setScrollIndex(Math.min(ai, 2));
  }, []);

  // ---- Ripple Effect ----
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const container = target.closest(
        ".ripple-container"
      ) as HTMLElement | null;
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

  // ---- Get greeting ----
  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <AuthGuard>

    <div
      className="dashboard"
      style={{
        background: "#050505",
        color: "#e5e5e5",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div className="app-shell">
        <div className="status-bar" />

        {/* ====== HEADER ====== */}
        <div className="app-header">
          <div className="flex items-center justify-between px-5 py-3">
            <div className="flex items-center gap-3">
              <div
                onClick={() => openSheet("profile")}
                className="w-11 h-11 rounded-full overflow-hidden border-2 cursor-pointer"
                style={{ borderColor: "rgba(4,120,87,0.4)" }}
              >
                <img
                  src="https://picsum.photos/seed/landlord-ke/88/88.jpg"
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <p className="text-xs font-medium" style={{ color: "#a3a3a3" }}>
                  {getGreeting()} 👋
                </p>
                <h2 className="text-base font-bold text-white -mt-0.5">
                  {user?.displayName || "Landlord"}
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => openSheet("search")}
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.05)" }}
              >
                <Search className="w-5 h-5" style={{ color: "#a3a3a3" }} />
              </button>
              <button
                onClick={() => openSheet("notifications")}
                className="w-10 h-10 rounded-full flex items-center justify-center relative"
                style={{ background: "rgba(255,255,255,0.05)" }}
              >
                <Bell className="w-5 h-5" style={{ color: "#a3a3a3" }} />
                <span className="badge">{newInquiries || pendingViewings}</span>
              </button>
              <button
                onClick={() => openSheet("quick")}
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, #047857, #059669)",
                  boxShadow: "0 2px 12px rgba(4,120,87,0.3)",
                }}
              >
                <Plus className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* ====== MAIN CONTENT ====== */}
        <div className="app-content" id="main-content">
          <div className="px-5 pb-28">
            {/* STAT CARDS */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div
                className="stat-card animate-in stagger-1"
                onClick={() => router.push("/properties")}
              >
                <div className="glow" style={{ background: "#047857" }} />
                <div className="flex items-center justify-between mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: "rgba(4,120,87,0.15)" }}
                  >
                    <Building2 className="w-5 h-5" style={{ color: "#047857" }} />
                  </div>
                  <div
                    className="chip"
                    style={{ background: "rgba(4,120,87,0.1)", color: "#047857" }}
                  >
                    <TrendingUp className="w-3 h-3" /> {dataLoading ? "..." : `+${Math.max(0, totalProperties - 1)}`}
                  </div>
                </div>
                <p className="text-2xl font-bold text-white" data-count={totalProperties || 0}>
                  {dataLoading ? "..." : totalProperties}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "#a3a3a3" }}>
                  Total Properties
                </p>
                <p className="text-xs" style={{ color: "#3b82f6" }}>{totalProperties} properties ({totalUnits} units total)</p>
              </div>
              <div
                className="stat-card animate-in stagger-2"
                onClick={() => router.push("/units")}
              >
                <div className="glow" style={{ background: "#3b82f6" }} />
                <div className="flex items-center justify-between mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: "rgba(59,130,246,0.15)" }}
                  >
                    <Users className="w-5 h-5" style={{ color: "#3b82f6" }} />
                  </div>
                  <div
                    className="chip"
                    style={{ background: "rgba(59,130,246,0.1)", color: "#3b82f6" }}
                  >
                    <TrendingUp className="w-3 h-3" /> {dataLoading ? "..." : `${occupancyPct}%`}
                  </div>
                </div>
                <p className="text-2xl font-bold text-white" data-count={occupiedUnits || 0}>
                  {dataLoading ? "..." : occupiedUnits}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "#a3a3a3" }}>
                  Occupied Units
                </p>
                <p className="text-xs" style={{ color: "#3b82f6" }}>{occupiedUnits} occupied • {overdueUnits} overdue</p>
              </div>
              <div
                className="stat-card animate-in stagger-3"
                onClick={() => openSheet("revenue")}
              >
                <div className="glow" style={{ background: "#eab308" }} />
                <div className="flex items-center justify-between mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: "rgba(234,179,8,0.15)" }}
                  >
                    <Banknote className="w-5 h-5" style={{ color: "#eab308" }} />
                  </div>
                  <div
                    className="chip"
                    style={{ background: "rgba(234,179,8,0.1)", color: "#eab308" }}
                  >
                    <TrendingUp className="w-3 h-3" /> +12%
                  </div>
                </div>
                <p className="text-2xl font-bold text-white">
                  <span className="text-base font-medium" style={{ color: "#a3a3a3" }}>
                    KSh
                  </span>{" "}
                  <span data-count={monthlyRevenue || 0}>{dataLoading ? "..." : Math.round(monthlyRevenue).toLocaleString()}</span>
                </p>
                <p className="text-xs mt-0.5" style={{ color: "#a3a3a3" }}>
                  Monthly Revenue
                </p>
              </div>
              <div
                className="stat-card animate-in stagger-4"
                onClick={() => router.push("/inquiries")}
              >
                <div className="glow" style={{ background: "#a855f7" }} />
                <div className="flex items-center justify-between mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: "rgba(168,85,247,0.15)" }}
                  >
                    <MessageCircle
                      className="w-5 h-5"
                      style={{ color: "#a855f7" }}
                    />
                  </div>
                  <div
                    className="chip"
                    style={{ background: "rgba(168,85,247,0.1)", color: "#a855f7" }}
                  >
                    <TrendingUp className="w-3 h-3" /> {dataLoading ? "..." : `+${Math.max(0, newInquiries)}`}
                  </div>
                </div>
                <p className="text-2xl font-bold text-white" data-count={inquiries.length || 0}>
                  {dataLoading ? "..." : inquiries.length}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "#a3a3a3" }}>
                  Inquiries
                </p>
              </div>
            </div>

            {/* REVENUE CHART */}
            <div
              className="card mt-5 animate-in stagger-5"
              style={{ padding: "20px" }}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-white">
                    Revenue Overview
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: "#a3a3a3" }}>
                    {dataLoading ? "Loading..." : `KSh ${Math.round(monthlyRevenue).toLocaleString()} this month`}
                  </p>
                </div>
                <div
                  className="flex items-center gap-1 p-1 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.04)" }}
                >
                  {(["week", "month", "year"] as Period[]).map((p) => (
                    <button
                      key={p}
                      className={`period-pill ${chartPeriod === p ? "active" : ""}`}
                      onClick={() => setChartPeriod(p)}
                    >
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div
                className="flex items-end justify-between gap-2"
                style={{ height: "160px", paddingTop: "8px" }}
              >
                {chartData[chartPeriod].heights.map((height, i) => {
                  const isToday = chartPeriod === "week" && i === 4;
                  const isWeekend = chartPeriod === "week" && i >= 5;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2">
                      <div
                        className="w-full flex justify-center"
                        style={{ height: "130px", alignItems: "flex-end" }}
                      >
                        <div
                          className="chart-bar w-full"
                          style={{
                            height: height + "%",
                            background: isWeekend
                              ? "rgba(255,255,255,0.08)"
                              : `linear-gradient(to top, #047857, ${
                                  isToday ? "#34d399" : "#059669"
                                })`,
                            boxShadow: isToday
                              ? "0 0 20px rgba(4,120,87,0.4)"
                              : "none",
                            animationDelay: 0.1 + i * 0.05 + "s",
                          }}
                          onClick={() =>
                            showSnackbar(
                              dayLabels[chartPeriod][i] +
                                ": KSh " +
                                chartData[chartPeriod].values[i],
                              "info"
                            )
                          }
                        >
                          <div className="chart-tooltip">
                            KSh {chartData[chartPeriod].values[i]}
                          </div>
                        </div>
                      </div>
                      <span
                        className={`text-xs font-medium ${
                          isToday ? "font-semibold" : ""
                        }`}
                        style={{
                          color: isToday ? "#047857" : "#525252",
                        }}
                      >
                        {isToday ? "Today" : dayLabels[chartPeriod][i]}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div
                className="flex items-center justify-between mt-4 pt-3"
                style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ background: "#047857" }}
                    />
                    <span className="text-xs" style={{ color: "#a3a3a3" }}>
                      Income
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ background: "rgba(255,255,255,0.15)" }}
                    />
                    <span className="text-xs" style={{ color: "#a3a3a3" }}>
                      Projected
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => openSheet("revenue")}
                  className="text-xs font-semibold"
                  style={{ color: "#047857" }}
                >
                  View Details →
                </button>
              </div>
            </div>

            {/* OCCUPANCY + QUICK STATS */}
            <div className="grid grid-cols-5 gap-3 mt-5">
              <div
                className="col-span-3 card animate-in stagger-6"
                style={{ padding: "20px" }}
              >
                <div className="flex items-center gap-4">
                  <div className="relative flex-shrink-0">
                    <svg className="progress-ring" width="90" height="90">
                      <circle
                        cx="45"
                        cy="45"
                        r="38"
                        fill="none"
                        stroke="rgba(255,255,255,0.06)"
                        strokeWidth="8"
                      />
                      <circle
                        className="progress-ring-circle"
                        cx="45"
                        cy="45"
                        r="38"
                        fill="none"
                        stroke="#047857"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray="239"
                        strokeDashoffset="45"
                        style={{
                          filter: "drop-shadow(0 0 6px rgba(4,120,87,0.4))",
                        }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xl font-bold text-white">{dataLoading ? "..." : occupancyPct}%</span>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Occupancy</h3>
                    <p className="text-xs mt-1" style={{ color: "#a3a3a3" }}>
                      {totalUnits} of {Math.max(totalUnits, occupiedUnits)} units
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ background: "#047857" }}
                        />
                        <span className="text-xs" style={{ color: "#a3a3a3" }}>
                          Occupied
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ background: "rgba(255,255,255,0.15)" }}
                        />
                        <span className="text-xs" style={{ color: "#a3a3a3" }}>
                          Vacant
                        </span>
                      </div>
                    </div>
                    <p className="text-xs mt-2" style={{ color: "#047857" }}>
                      <span className="inline-flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" /> +3% this month
                      </span>
                    </p>
                  </div>
                </div>
              </div>
              <div className="col-span-2 flex flex-col gap-3 animate-in stagger-7">
                <div
                  className="card flex-1 flex flex-col items-center justify-center"
                  style={{ padding: "14px", cursor: "pointer" }}
                  onClick={() => router.push('/units')}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center mb-2"
                    style={{ background: "rgba(239,68,68,0.1)" }}
                  >
                    <DoorOpen
                      className="w-4.5 h-4.5"
                      style={{ color: "#ef4444" }}
                    />
                  </div>
                  <p className="text-lg font-bold text-white">{dataLoading ? "..." : vacantUnits}</p>
                  <p className="text-xs" style={{ color: "#a3a3a3" }}>
                    Vacant
                  </p>
                </div>
                <div
                  className="card flex-1 flex flex-col items-center justify-center"
                  style={{ padding: "14px", cursor: "pointer" }}
                  onClick={() => router.push('/viewings')}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center mb-2"
                    style={{ background: "rgba(234,179,8,0.1)" }}
                  >
                    <Clock className="w-4.5 h-4.5" style={{ color: "#eab308" }} />
                  </div>
                  <p className="text-lg font-bold text-white">{dataLoading ? "..." : pendingViewings}</p>
                  <p className="text-xs" style={{ color: "#a3a3a3" }}>
                    Pending
                  </p>
                </div>
              </div>
            </div>

            {/* RENT COLLECTION */}
            <div
              className="card mt-5 animate-in stagger-8"
              style={{ padding: "20px" }}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-white">Rent Collection</h3>
                <span className="text-xs font-medium" style={{ color: "#a3a3a3" }}>
                  {new Date().toLocaleDateString('en', { month: 'long', year: 'numeric' })}
                </span>
              </div>
              <div
                className="w-full h-3 rounded-full overflow-hidden"
                style={{ background: "rgba(255,255,255,0.06)" }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: "72%",
                    background: "linear-gradient(to right, #047857, #10b981)",
                    boxShadow: "0 0 10px rgba(4,120,87,0.4)",
                    transition: "width 1s ease",
                  }}
                />
              </div>
              <div className="flex items-center justify-between mt-3">
                <div>
                  <p className="text-xs" style={{ color: "#a3a3a3" }}>
                    Collected
                  </p>
                  <p className="text-sm font-bold text-white">KSh {collectedRevenue.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs" style={{ color: "#a3a3a3" }}>
                    Expected
                  </p>
                  <p className="text-sm font-bold" style={{ color: "#a3a3a3" }}>
                    KSh {monthlyRevenue.toLocaleString()}
                  </p>
                </div>
              </div>
              <div
                className="flex items-center gap-3 mt-3 p-3 rounded-xl"
                style={{
                  background: "rgba(234,179,8,0.06)",
                  border: "1px solid rgba(234,179,8,0.15)",
                }}
              >
                <AlertTriangle
                  className="w-4 h-4 flex-shrink-0"
                  style={{ color: "#eab308" }}
                />                  <p className="text-xs" style={{ color: "#eab308" }}>
                  {overdueUnits} tenant{overdueUnits !== 1 ? 's' : ''} ha{overdueUnits === 1 ? 's' : 've'} pending payments
                </p>
                <button
                  onClick={() =>
                    showSnackbar(`Sending reminders to ${overdueUnits} tenants...`, "success")
                  }
                  className="text-xs font-semibold whitespace-nowrap"
                  style={{ color: "#eab308" }}
                >
                  Remind
                </button>
              </div>
            </div>

            {/* MAINTENANCE REQUESTS */}
            <div className="mt-7 animate-in stagger-9">
              <div className="section-header">
                <h3 className="section-title">Maintenance Requests</h3>
                <button
                  className="section-action"
                  onClick={() => router.push("/maintenance")}
                >
                  View All
                </button>
              </div>
              <div className="space-y-2.5">
                {maintenanceReqs.length === 0 && (
                  <div className="text-center py-6">
                    <p className="text-sm" style={{ color: "#525252" }}>No maintenance requests</p>
                  </div>
                )}
                {maintenanceReqs.slice(0, 5).map((req) => {
                  const urgColor = req.urgency === "Urgent" ? "#ef4444" : req.urgency === "Medium" ? "#f97316" : "#eab308";
                  const urgBg = req.urgency === "Urgent" ? "rgba(239,68,68,0.1)" : req.urgency === "Medium" ? "rgba(249,115,22,0.1)" : "rgba(234,179,8,0.1)";
                  const timeStr = req.createdAt ? `${Math.floor((Date.now() - req.createdAt.toDate().getTime()) / 3600000)}h ago` : "Recently";
                  return (
                    <div
                      key={req.id}
                      className="flex items-start gap-3 p-3.5 rounded-2xl cursor-pointer"
                      style={{ background: "#1A1D21", border: "1px solid rgba(255,255,255,0.06)" }}
                      onClick={() => router.push('/maintenance')}
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: urgBg }}
                      >
                        <Wrench className="w-5 h-5" style={{ color: urgColor }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-white truncate pr-2">
                            {req.title}
                          </p>
                          <span
                            className="chip"
                            style={{
                              background: urgBg,
                              color: urgColor,
                              fontSize: "10px",
                              padding: "2px 8px",
                              flexShrink: 0,
                            }}
                          >
                            {req.urgency}
                          </span>
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: "#a3a3a3" }}>
                          {req.unitName} — {req.tenantName || "Vacant"}
                        </p>
                        <p className="text-xs mt-1" style={{ color: "#525252" }}>
                          {timeStr}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* QUICK ACTIONS */}
            <div className="mt-6 animate-in stagger-10">
              <div className="section-header">
                <h3 className="section-title">Quick Actions</h3>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div
                  className="quick-action"
                  onClick={() => openSheet("addProperty")}
                >
                  <div
                    className="qa-icon"
                    style={{ background: "rgba(4,120,87,0.12)" }}
                  >
                    <Building2 className="w-5 h-5" style={{ color: "#047857" }} />
                  </div>
                  <span className="text-xs font-medium" style={{ color: "#a3a3a3" }}>
                    Add Property
                  </span>
                </div>
                <div className="quick-action" onClick={() => openSheet("addUnit")}>
                  <div
                    className="qa-icon"
                    style={{ background: "rgba(59,130,246,0.12)" }}
                  >
                    <Layers className="w-5 h-5" style={{ color: "#3b82f6" }} />
                  </div>
                  <span className="text-xs font-medium" style={{ color: "#a3a3a3" }}>
                    Add Unit
                  </span>
                </div>
                <div
                  className="quick-action"
                  onClick={() => router.push("/viewings")}
                >
                  <div
                    className="qa-icon"
                    style={{ background: "rgba(234,179,8,0.12)" }}
                  >
                    <CalendarCheck
                      className="w-5 h-5"
                      style={{ color: "#eab308" }}
                    />
                  </div>
                  <span className="text-xs font-medium" style={{ color: "#a3a3a3" }}>
                    Viewings
                  </span>
                </div>
                <div
                  className="quick-action"
                  onClick={() => openSheet("payments")}
                >
                  <div
                    className="qa-icon"
                    style={{ background: "rgba(168,85,247,0.12)" }}
                  >
                    <Wallet className="w-5 h-5" style={{ color: "#a855f7" }} />
                  </div>
                  <span className="text-xs font-medium" style={{ color: "#a3a3a3" }}>
                    Payments
                  </span>
                </div>
                <div
                  className="quick-action"
                  onClick={() => openSheet("tenants")}
                >
                  <div
                    className="qa-icon"
                    style={{ background: "rgba(236,72,153,0.12)" }}
                  >
                    <UserPlus className="w-5 h-5" style={{ color: "#ec4899" }} />
                  </div>
                  <span className="text-xs font-medium" style={{ color: "#a3a3a3" }}>
                    Tenants
                  </span>
                </div>
                <div
                  className="quick-action"
                  onClick={() => openSheet("reports")}
                >
                  <div
                    className="qa-icon"
                    style={{ background: "rgba(249,115,22,0.12)" }}
                  >
                    <BarChart3 className="w-5 h-5" style={{ color: "#f97316" }} />
                  </div>
                  <span className="text-xs font-medium" style={{ color: "#a3a3a3" }}>
                    Reports
                  </span>
                </div>
                <div
                  className="quick-action"
                  onClick={() => openSheet("invoices")}
                >
                  <div
                    className="qa-icon"
                    style={{ background: "rgba(6,182,212,0.12)" }}
                  >
                    <FileText className="w-5 h-5" style={{ color: "#06b6d4" }} />
                  </div>
                  <span className="text-xs font-medium" style={{ color: "#a3a3a3" }}>
                    Invoices
                  </span>
                </div>
                <div
                  className="quick-action"
                  onClick={() => openSheet("moreMenu")}
                >
                  <div
                    className="qa-icon"
                    style={{ background: "rgba(255,255,255,0.06)" }}
                  >
                    <Grid3x3 className="w-5 h-5" style={{ color: "#a3a3a3" }} />
                  </div>
                  <span className="text-xs font-medium" style={{ color: "#a3a3a3" }}>
                    More
                  </span>
                </div>
              </div>
            </div>

            {/* MY PROPERTIES */}
            <div className="mt-7 animate-in stagger-11">
              <div className="section-header">
                <h3 className="section-title">My Properties</h3>
                <div className="flex items-center gap-3">
                  <span className="text-xs" style={{ color: "#525252" }}>
                    <ArrowRight className="w-3 h-3 inline" /> Swipe
                  </span>
                  <button
                    className="section-action"
                    onClick={() => router.push("/properties")}
                  >
                    See All
                  </button>
                </div>
              </div>
              <div
                className="property-scroll"
                ref={propertyScrollRef}
                onScroll={handlePropertyScroll}
              >
                {properties.map((prop, i) => {
                  const imgUrl = prop.images?.[0] || `https://picsum.photos/seed/prop-${prop.id}/520/320.jpg`;
                  const statusChipColor = prop.status === "active" ? "rgba(4,120,87,0.9)" : prop.status === "partial" ? "rgba(234,179,8,0.9)" : "rgba(59,130,246,0.9)";
                  const barColor = prop.status === "active" ? "#047857" : prop.status === "partial" ? "#eab308" : "#3b82f6";
                  const pct = prop.totalUnits > 0 ? Math.round((prop.occupiedUnits / prop.totalUnits) * 100) : 0;
                  const revLabel = prop.revenue >= 1000 ? `${(prop.revenue / 1000).toFixed(0)}K` : prop.revenue.toString();
                  return (
                    <div
                      key={prop.id}
                      className="property-card card"
                      onClick={() => router.push(`/properties`)}
                    >
                      <div className="relative">
                        <img
                          src={imgUrl}
                          alt=""
                          className="w-full h-36 object-cover"
                        />
                        <div className="absolute top-3 left-3">
                          <span
                            className="chip text-white"
                            style={{ background: statusChipColor }}
                          >
                            {prop.status.charAt(0).toUpperCase() + prop.status.slice(1)}
                          </span>
                        </div>
                        <div className="absolute top-3 right-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openSheet("propertyMenu");
                            }}
                            className="w-8 h-8 rounded-full flex items-center justify-center"
                            style={{ background: "rgba(0,0,0,0.5)" }}
                          >
                            <MoreVertical className="w-4 h-4 text-white" />
                          </button>
                        </div>
                      </div>
                      <div className="p-4">
                        <h4 className="text-sm font-bold text-white">
                          {prop.name}
                        </h4>
                        <p
                          className="text-xs mt-1 flex items-center gap-1"
                          style={{ color: "#a3a3a3" }}
                        >
                          <MapPin className="w-3 h-3" /> {prop.location || prop.county}
                        </p>
                        <div className="flex items-center justify-between mt-3">
                          <div>
                            <p className="text-xs" style={{ color: "#525252" }}>
                              Revenue
                            </p>
                            <p className="text-sm font-bold" style={{ color: "#047857" }}>
                              KSh {revLabel}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs" style={{ color: "#525252" }}>
                              Units
                            </p>
                            <p className="text-sm font-bold text-white">
                              {prop.occupiedUnits}/{prop.totalUnits}
                            </p>
                          </div>
                        </div>
                        <div
                          className="w-full h-1.5 rounded-full mt-2"
                          style={{ background: "rgba(255,255,255,0.06)" }}
                        >
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: pct + "%",
                              background: barColor,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-center mt-3 gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-1.5 rounded-full transition-all duration-300"
                    style={{
                      width: scrollIndex === i ? "20px" : "6px",
                      background:
                        scrollIndex === i ? "#047857" : "rgba(255,255,255,0.15)",
                    }}
                  />
                ))}
              </div>
            </div>

            {/* LEASE EXPIRY ALERTS */}
            <div className="mt-7 animate-in stagger-11">
              <div className="section-header">
                <h3 className="section-title">Lease Expiry Alerts</h3>
                <button
                  className="section-action"
                  onClick={() => router.push("/calendar")}
                >
                  Manage
                </button>
              </div>
              <div className="space-y-2.5">
                {leaseAlerts.length === 0 && (
                  <div className="text-center py-6">
                    <p className="text-sm" style={{ color: "#525252" }}>No active leases</p>
                  </div>
                )}
                {leaseAlerts.map((lease, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3.5 rounded-2xl cursor-pointer"
                    style={{
                      background: lease.bg,
                      border: `1px solid ${lease.border}`,
                    }}
                    onClick={() => router.push('/calendar')}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: lease.bg, border: `1px solid ${lease.border}` }}
                    >
                      <span className="text-base font-bold" style={{ color: lease.color }}>
                        {lease.daysLeft}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white">{lease.tenant}</p>
                      <p className="text-xs mt-0.5" style={{ color: "#a3a3a3" }}>
                        {lease.unit}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <CalendarX className="w-3 h-3" style={{ color: "#525252" }} />
                        <span className="text-xs" style={{ color: "#525252" }}>
                          Ends {lease.ends} · {lease.daysLeft} days left
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push('/calendar');
                      }}
                      className="text-xs font-semibold whitespace-nowrap"
                      style={{ color: lease.color }}
                    >
                      Renew →
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* PAYMENT ACTIVITY */}
            <div className="mt-7 animate-in stagger-12">
              <div className="section-header">
                <h3 className="section-title">Payment Activity</h3>
                <button
                  className="section-action"
                  onClick={() => router.push("/units")}
                >
                  View All
                </button>
              </div>
              <div className="card" style={{ padding: "6px 0" }}>
                {paymentActivity.map((payment, i) => (
                  <div
                    key={i}
                    className="payment-row px-4 py-3.5"
                    onClick={() => router.push('/units')}
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: payment.statusBg }}
                    >
                      {payment.status === "overdue" ? (
                        <X className="w-4 h-4" style={{ color: payment.statusColor }} />
                      ) : (
                        <Check className="w-4 h-4" style={{ color: payment.statusColor }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-white">
                          {payment.name}
                        </p>
                        <span className="text-sm font-semibold" style={{ color: "#e5e5e5" }}>
                          {payment.amount}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-xs truncate" style={{ color: "#a3a3a3" }}>
                          {payment.desc}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs" style={{ color: "#525252" }}>
                            {payment.time}
                          </span>
                          <span
                            className="chip"
                            style={{
                              background: payment.statusBg,
                              color: payment.statusColor,
                              fontSize: "9px",
                              padding: "1px 6px",
                            }}
                          >
                            {payment.statusLabel}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* RECENT ACTIVITY */}
            <div className="mt-7 animate-in stagger-14">
              <div className="section-header">
                <h3 className="section-title">Recent Activity</h3>                  <button
                    className="section-action"
                    onClick={() => openSheet("activityLog")}
                  >
                    View All
                  </button>
              </div>
              <div className="card" style={{ padding: "4px 0" }}>
                {recentActivity.map((item, i) => (
                  <div
                    key={i}
                    className="activity-item flex items-start gap-3 px-4 py-3 cursor-pointer relative"
                    onClick={() => router.push('/inquiries')}
                  >
                    {i < recentActivity.length - 1 && (
                      <div
                        className="activity-line"
                        style={{ position: "absolute", left: "19px", top: "36px", bottom: "-12px", width: "2px", background: "rgba(255,255,255,0.06)" }}
                      />
                    )}
                    <div
                      className="activity-dot mt-1"
                      style={{
                        background: item.dotColor,
                        boxShadow: `0 0 8px ${item.dotColor}66`,
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-white">
                          {item.title}
                        </p>
                        <span className="text-xs" style={{ color: "#525252" }}>
                          {item.time}
                        </span>
                      </div>
                      <p
                        className="text-xs mt-0.5 truncate"
                        style={{ color: "#a3a3a3" }}
                      >
                        {item.desc}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span
                          className="chip"
                          style={{
                            background: item.chipBg,
                            color: item.chipColor,
                            fontSize: "11px",
                          }}
                        >
                          {item.chip}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* UPCOMING VIEWINGS */}
            <div className="mt-7 animate-in stagger-15">
              <div className="section-header">
                <h3 className="section-title">Upcoming Viewings</h3>                  <button
                    className="section-action"
                    onClick={() => router.push("/viewings")}
                  >
                    Viewings
                  </button>
              </div>
              <div className="space-y-3">
                {upcomingViewings.length === 0 && (
                  <div className="text-center py-6">
                    <p className="text-sm" style={{ color: "#525252" }}>No upcoming viewings</p>
                  </div>
                )}
                {upcomingViewings.map((v) => {
                  const d = v.date ? new Date(v.date) : new Date();
                  const days = ["SUN","MON","TUE","WED","THU","FRI","SAT"];
                  const dayOfWeek = days[d.getDay()];
                const dayNum = d.getDate().toString();
                  const statusColor = v.status === "pending" ? "#eab308" : v.status === "confirmed" ? "#047857" : "#3b82f6";
                  const statusBg = v.status === "pending" ? "rgba(234,179,8,0.1)" : v.status === "confirmed" ? "rgba(4,120,87,0.1)" : "rgba(59,130,246,0.1)";
                  return (
                    <div
                      key={v.id}
                      className="card flex items-center gap-4"
                      style={{ padding: "14px" }}
                    >
                      <div
                        className="flex-shrink-0 w-12 h-12 rounded-2xl flex flex-col items-center justify-center"
                        style={{ background: statusBg, border: `1px solid ${statusColor}33` }}
                      >
                        <span
                          className="text-xs font-bold"
                          style={{ color: statusColor }}
                        >
                          {dayOfWeek}
                        </span>
                        <span className="text-sm font-bold text-white">
                          {dayNum}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white">
                          {v.tenantName || "Tenant"}
                        </p>
                        <p
                          className="text-xs mt-0.5 truncate"
                          style={{ color: "#a3a3a3" }}
                        >
                          {v.unitName ? `${v.unitName} at ` : ""}{v.propertyName} • {v.startTime}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            confirmViewing(v.id).then(() => {
                              showSnackbar("Viewing confirmed!", "success");
                            }).catch(() => showSnackbar("Failed to confirm", "error"));
                          }}
                          className="w-9 h-9 rounded-full flex items-center justify-center"
                          style={{ background: "rgba(4,120,87,0.15)" }}
                        >
                          <Check className="w-4 h-4" style={{ color: "#047857" }} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            cancelViewing(v.id, "Scheduling conflict").then(() => {
                              showSnackbar("Viewing cancelled", "info");
                            }).catch(() => showSnackbar("Failed to cancel", "error"));
                          }}
                          className="w-9 h-9 rounded-full flex items-center justify-center"
                          style={{ background: "rgba(239,68,68,0.1)" }}
                        >
                          <X className="w-4 h-4" style={{ color: "#ef4444" }} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="h-4" />
          </div>
        </div>

        {/* ====== BOTTOM NAVIGATION ====== */}
        <div className="app-bottom-nav">
          <div className="bottom-nav">
            <div className="flex">
              {[
                { key: "home", icon: LayoutDashboard, label: "Home", path: "/dashboard" },
                { key: "properties", icon: Building2, label: "Properties", path: "/properties" },
                { key: "listings", icon: List, label: "Listings", path: "/listings" },
                { key: "more", icon: Menu, label: "More" },
              ].map((item) => (
                <div
                  key={item.key}
                  className={`nav-item ${activeTab === item.key ? "active" : ""}`}
                  onClick={() => {
                    if (item.key === "more") { openSheet("moreMenu"); return; }
                    setActiveTab(item.key);
                    if (item.path) router.push(item.path);
                  }}
                >
                  {activeTab === item.key && (
                    <div className="nav-indicator" />
                  )}
                  <item.icon className="w-5 h-5 nav-icon" />
                  <span className="nav-label">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
{/*       {/* QUICK ACTIONS SHEET */}
      <div
        className={`sheet-overlay ${activeSheet === "quick" ? "active" : ""}`}
        onClick={closeSheet}
      />
      <div
        className={`bottom-sheet ${activeSheet === "quick" ? "active" : ""}`}
      >
        <div className="sheet-handle" />
        <div className="p-5 pb-2">
          <h3 className="text-lg font-bold text-white">Quick Actions</h3>
          <p className="text-xs mt-1" style={{ color: "#a3a3a3" }}>
            What would you like to do?
          </p>
        </div>
        <div className="px-3 pb-8">
          {[
            {
              icon: Building2,
              color: "#047857",
              bg: "rgba(4,120,87,0.12)",
              title: "Add New Property",
              desc: "Register a new rental property",
              action: "addProperty",
            },
            {
              icon: Layers,
              color: "#3b82f6",
              bg: "rgba(59,130,246,0.12)",
              title: "Add Unit",
              desc: "Add a unit to existing property",
              action: "addUnit",
            },
            {
              icon: Banknote,
              color: "#eab308",
              bg: "rgba(234,179,8,0.12)",
              title: "Record Payment",
              desc: "Log an M-Pesa or cash payment",
              action: "recordPayment",
            },
            {
              icon: UserPlus,
              color: "#a855f7",
              bg: "rgba(168,85,247,0.12)",
              title: "Add Tenant",
              desc: "Assign tenant to a vacant unit",
              action: "addTenant",
            },
          ].map((action, i) => (
            <button
              key={i}
              onClick={() => {
                closeSheet();
                setTimeout(() => openSheet(action.action), 300);
              }}
              className="w-full flex items-center gap-4 p-4 rounded-2xl mt-1"
              style={{ background: "rgba(255,255,255,0.03)" }}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center"
                style={{ background: action.bg }}
              >
                <action.icon className="w-5 h-5" style={{ color: action.color }} />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-white">{action.title}</p>
                <p className="text-xs" style={{ color: "#a3a3a3" }}>
                  {action.desc}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 ml-auto" style={{ color: "#525252" }} />
            </button>
          ))}
        </div>
      </div>
{/* REVENUE DETAIL SHEET */}
      <div
        className={`sheet-overlay ${activeSheet === "revenue" ? "active" : ""}`}
        onClick={closeSheet}
      />
      <div
        className={`bottom-sheet ${activeSheet === "revenue" ? "active" : ""}`}
        style={{ maxHeight: "95dvh" }}
      >
        <div className="sheet-handle" />
        <div className="p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-white">Revenue Details</h3>
            <button
              onClick={closeSheet}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              <XIcon className="w-4 h-4" style={{ color: "#a3a3a3" }} />
            </button>
          </div>
          <div
            className="p-4 rounded-2xl mb-5"
            style={{
              background: "rgba(4,120,87,0.06)",
              border: "1px solid rgba(4,120,87,0.15)",
            }}
          >
            <p className="text-xs" style={{ color: "#a3a3a3" }}>
              Total Revenue (December)
            </p>
            <p className="text-3xl font-bold text-white mt-1">KSh 775,000</p>
            <div className="flex items-center gap-1.5 mt-2">
              <span
                className="chip"
                style={{
                  background: "rgba(4,120,87,0.1)",
                  color: "#047857",
                  fontSize: "11px",
                }}
              >
                <TrendingUp className="w-3 h-3" /> +12% vs last month
              </span>
            </div>
          </div>
          <h4
            className="text-xs font-semibold uppercase tracking-wider mb-3"
            style={{ color: "#525252" }}
          >
            Breakdown by Property
          </h4>
          <div className="space-y-2">
            {[
              { color: "#047857", name: "Kilimani Heights", units: "8 units occupied", amount: "280K" },
              { color: "#3b82f6", name: "Westlands Suites", units: "12 units occupied", amount: "350K" },
              { color: "#eab308", name: "Ruaka Gardens", units: "5 units occupied", amount: "145K" },
            ].map((prop, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 rounded-xl"
                style={{ background: "rgba(255,255,255,0.03)" }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-2 h-8 rounded-full"
                    style={{ background: prop.color }}
                  />
                  <div>
                    <p className="text-sm font-medium text-white">{prop.name}</p>
                    <p className="text-xs" style={{ color: "#a3a3a3" }}>
                      {prop.units}
                    </p>
                  </div>
                </div>
                <p className="text-sm font-bold text-white">KSh {prop.amount}</p>
              </div>
            ))}
          </div>
          <div
            className="flex items-center gap-3 mt-5 p-3 rounded-xl"
            style={{
              background: "rgba(59,130,246,0.06)",
              border: "1px solid rgba(59,130,246,0.15)",
            }}
          >
            <Info className="w-4 h-4 flex-shrink-0" style={{ color: "#3b82f6" }} />
            <p className="text-xs" style={{ color: "#3b82f6" }}>
              Pending: KSh 217,000 from 2 tenants
            </p>
          </div>
        </div>
      </div>

      {/* ACTIVITY LOG SHEET */}
      <div className={`sheet-overlay ${activeSheet === "activityLog" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "activityLog" ? "active" : ""}`} style={{ maxHeight: "95dvh" }}>
        <div className="sheet-handle" />
        <div className="p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-white">Activity Log</h3>
            <button onClick={closeSheet} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)" }}>
              <XIcon className="w-4 h-4" style={{ color: "#a3a3a3" }} />
            </button>
          </div>
          <div className="space-y-0">
            {[
              { dot: "#047857", title: "New Inquiry", time: "2 min ago", desc: "Wanjiku asked about Bedsitter B3", chip: "Inquiry", chipBg: "rgba(4,120,87,0.1)", chipColor: "#047857" },
              { dot: "#eab308", title: "Payment Received", time: "28 min ago", desc: "M-Pesa KSh 18,000 from Otieno — Unit A2", chip: "Payment", chipBg: "rgba(234,179,8,0.1)", chipColor: "#eab308" },
              { dot: "#3b82f6", title: "Viewing Scheduled", time: "1h ago", desc: "Akello wants to view 2BR at Ruaka — Tomorrow 10am", chip: "Viewing", chipBg: "rgba(59,130,246,0.1)", chipColor: "#3b82f6" },
              { dot: "#a855f7", title: "New Tenant", time: "3h ago", desc: "Maina moved into B7 at Kilimani Heights", chip: "Tenant", chipBg: "rgba(168,85,247,0.1)", chipColor: "#a855f7" },
              { dot: "#ef4444", title: "Maintenance Reported", time: "5h ago", desc: "Hot water not working at Unit A2", chip: "Maintenance", chipBg: "rgba(239,68,68,0.1)", chipColor: "#ef4444" },
              { dot: "#047857", title: "Lease Renewed", time: "Yesterday", desc: "Jane at Unit C4 renewed for 12 months", chip: "Lease", chipBg: "rgba(4,120,87,0.1)", chipColor: "#047857" },
              { dot: "#f97316", title: "Listing Published", time: "Yesterday", desc: "Bedsitter B3 listed on marketplace", chip: "Listing", chipBg: "rgba(249,115,22,0.1)", chipColor: "#f97316" },
              { dot: "#3b82f6", title: "Invoice Sent", time: "2 days ago", desc: "Rent invoice sent to 12 tenants", chip: "Invoice", chipBg: "rgba(59,130,246,0.1)", chipColor: "#3b82f6" },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 py-3 cursor-pointer" onClick={closeSheet}>
                <div className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: item.dot, boxShadow: `0 0 6px ${item.dot}66` }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                    <span className="text-xs" style={{ color: "#525252" }}>{item.time}</span>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: "#a3a3a3" }}>{item.desc}</p>
                  <span className="chip mt-1.5" style={{ background: item.chipBg, color: item.chipColor, fontSize: "10px" }}>{item.chip}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      
      {/* RECORD PAYMENT SHEET */}
      <div className={`sheet-overlay ${activeSheet === "recordPayment" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "recordPayment" ? "active" : ""}`} style={{ maxHeight: "95dvh" }}>
        <div className="sheet-handle" />
        <div className="p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-white">Record Payment</h3>
            <button onClick={closeSheet} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)" }}>
              <XIcon className="w-4 h-4" style={{ color: "#a3a3a3" }} />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium block mb-2" style={{ color: "#a3a3a3" }}>Unit</label>
              <select className="android-select" value={addUPropId} onChange={(e) => {
                const unit = units.find(u => u.id === e.target.value);
                if (unit) {
                  setAddUPropId(unit.id);
                  setAddUPropName(unit.propertyName);
                  setAddUName(unit.name);
                  setAddURent(unit.rent.toString());
                }
              }}>
                <option value="">Select unit</option>
                {units.filter(u => u.status === "Occupied").map((u) => <option key={u.id} value={u.id}>{u.name} — {u.propertyName} ({u.tenantName || 'No tenant'})</option>)}
              </select>
            </div>
            <div className="input-group">
              <input type="text" className="android-input" placeholder=" " style={{ paddingLeft: "60px" }} value={addURent} onChange={(e) => setAddURent(e.target.value)} />
              <label style={{ left: "60px" }}>Amount (KSh)</label>
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: "#a3a3a3" }}>KSh</span>
            </div>
            <div>
              <label className="text-xs font-medium block mb-2" style={{ color: "#a3a3a3" }}>Payment Method</label>
              <select className="android-select">
                <option>M-Pesa</option>
                <option>Cash</option>
                <option>Bank Transfer</option>
                <option>Cheque</option>
              </select>
            </div>
            <div className="input-group">
              <input type="date" className="android-input" placeholder=" " />
              <label style={{ top: "10px", fontSize: "11px", color: "#047857", fontWeight: 500 }}>Payment Date</label>
            </div>
            <div>
              <label className="text-xs font-medium block mb-2" style={{ color: "#a3a3a3" }}>Notes</label>
              <textarea className="android-input" style={{ minHeight: "60px", borderRadius: "14px" }} placeholder="Optional notes..." />
            </div>
            <button
              onClick={async () => {
                if (!addUPropId) { showSnackbar("Please select a unit", "error"); return; }
                try {
                  setAddUnitLoading(true);
                  await updateUnit(addUPropId, { payment: "Paid", status: "Occupied" } as any);
                  setAddUnitLoading(false);
                  closeSheet();
                  setTimeout(() => showSnackbar("Payment recorded! 💰", "success"), 300);
                } catch (err: any) {
                  setAddUnitLoading(false);
                  showSnackbar(err?.message || "Failed to record payment", "error");
                }
              }}
              className="btn-primary ripple-container"
              disabled={addUnitLoading}
            >
              {addUnitLoading ? <div className="spinner mx-auto" /> : <span>Record Payment</span>}
            </button>
          </div>
        </div>
      </div>

      {/* ADD TENANT SHEET */}
      <div className={`sheet-overlay ${activeSheet === "addTenant" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "addTenant" ? "active" : ""}`} style={{ maxHeight: "95dvh" }}>
        <div className="sheet-handle" />
        <div className="p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-white">Add Tenant</h3>
            <button onClick={closeSheet} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)" }}>
              <XIcon className="w-4 h-4" style={{ color: "#a3a3a3" }} />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium block mb-2" style={{ color: "#a3a3a3" }}>Unit</label>
              <select className="android-select" value={addUPropId} onChange={(e) => {
                const unit = units.find(u => u.id === e.target.value);
                if (unit) {
                  setAddUPropId(unit.id);
                  setAddUPropName(unit.propertyName);
                  setAddUName(unit.name);
                  setAddURent(unit.rent.toString());
                }
              }}>
                <option value="">Select unit</option>
                {units.filter(u => u.status === "Vacant").map((u) => <option key={u.id} value={u.id}>{u.name} — {u.propertyName} (KSh {u.rent.toLocaleString()})</option>)}
              </select>
            </div>
            <div className="input-group">
              <input type="text" className="android-input" placeholder=" " value={tenantName} onChange={(e) => setTenantName(e.target.value)} />
              <label>Tenant Name</label>
            </div>
            <div className="input-group">
              <input type="tel" className="android-input" placeholder=" " style={{ paddingLeft: "60px" }} value={tenantPhone} onChange={(e) => setTenantPhone(e.target.value)} />
              <label style={{ left: "60px" }}>Phone Number</label>
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: "#a3a3a3" }}>+254</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="input-group">
                <input type="date" className="android-input" placeholder=" " value={tenantLeaseStart} onChange={(e) => setTenantLeaseStart(e.target.value)} />
                <label>Lease Start</label>
              </div>
              <div>
                <label className="text-xs font-medium block mb-2" style={{ color: "#a3a3a3" }}>Lease Term</label>
                <select className="android-select">
                  <option>6 months</option>
                  <option>12 months</option>
                  <option>24 months</option>
                </select>
              </div>
            </div>
            <div className="input-group">
              <input type="text" className="android-input ksh-prefix" placeholder=" " style={{ paddingLeft: "60px" }} value={addURent} onChange={(e) => setAddURent(e.target.value)} />
              <label style={{ left: "60px" }}>Monthly Rent</label>
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: "#a3a3a3" }}>KSh</span>
            </div>
            <div className="input-group">
              <input type="text" className="android-input ksh-prefix" placeholder=" " style={{ paddingLeft: "60px" }} value={addUDeposit} onChange={(e) => setAddUDeposit(e.target.value)} />
              <label style={{ left: "60px" }}>Security Deposit</label>
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: "#a3a3a3" }}>KSh</span>
            </div>
            <button
              onClick={async () => {
                if (!addUPropId) { showSnackbar("Please select a unit", "error"); return; }
                if (!tenantName.trim()) { showSnackbar("Tenant name is required", "error"); return; }
                try {
                  setAddUnitLoading(true);
                  await recordLease(addUPropId, {
                    tenantName: tenantName,
                    tenantPhone: tenantPhone,
                    leaseStart: tenantLeaseStart || new Date().toISOString().split('T')[0],
                    leaseTerm: "12 months",
                    rent: parseInt(addURent.replace(/,/g, '')) || 0,
                    deposit: parseInt(addUDeposit.replace(/,/g, '')) || 0,
                    status: "Occupied",
                  });
                  setAddUnitLoading(false);
                  closeSheet();
                  setTimeout(() => showSnackbar("Tenant added! 🎉", "success"), 300);
                } catch (err: any) {
                  setAddUnitLoading(false);
                  showSnackbar(err?.message || "Failed to add tenant", "error");
                }
              }}
              className="btn-primary ripple-container"
              disabled={addUnitLoading}
            >
              {addUnitLoading ? <div className="spinner mx-auto" /> : <span>Add Tenant</span>}
            </button>
          </div>
        </div>
      </div>

      {/* EDIT PROFILE SHEET */}
      <div className={`sheet-overlay ${activeSheet === "editProfile" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "editProfile" ? "active" : ""}`} style={{ maxHeight: "95dvh" }}>
        <div className="sheet-handle" />
        <div className="p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-white">Edit Profile</h3>
            <button onClick={closeSheet} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)" }}>
              <XIcon className="w-4 h-4" style={{ color: "#a3a3a3" }} />
            </button>
          </div>
          <div className="space-y-4">
            <div className="input-group">
              <input type="text" className="android-input" placeholder=" " value={addFormName} onChange={(e) => setAddFormName(e.target.value)} />
              <label>Full Name</label>
            </div>
            <div className="input-group">
              <input type="email" className="android-input" placeholder=" " />
              <label>Email</label>
            </div>
            <div className="input-group">
              <input type="tel" className="android-input" placeholder=" " style={{ paddingLeft: "60px" }} />
              <label style={{ left: "60px" }}>Phone Number</label>
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: "#a3a3a3" }}>+254</span>
            </div>
            <div className="input-group">
              <input type="text" className="android-input" placeholder=" " />
              <label>Location</label>
            </div>
            <div>
              <label className="text-xs font-medium block mb-2" style={{ color: "#a3a3a3" }}>Bio</label>
              <textarea className="android-input" style={{ minHeight: "60px", borderRadius: "14px" }} placeholder="A short bio..." />
            </div>
            {/* editActions */}
            <div className="flex gap-2 mt-4 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              {[
                { label: "Call", icon: Phone, color: "#047857" },
                { label: "WhatsApp", icon: MessageCircle, color: "#25D366" },
                { label: "Decline", icon: X, color: "#ef4444" },
              ].map((action) => (
                <button
                  key={action.label}
                  onClick={() => {
                    if (action.label === "Call" || action.label === "WhatsApp") {
                      if (user?.phoneNumber) {
                        openPhoneUrl(user.phoneNumber, action.label === "Call" ? "tel" : "wa");
                      }
                    } else if (action.label === "Decline") {
                      router.push("/inquiries");
                    }
                    closeSheet();
                  }}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                  style={{ background: `${action.color}15`, color: action.color }}
                >
                  <action.icon className="w-3.5 h-3.5" />
                  {action.label}
                </button>
              ))}
            </div>
            <button
              onClick={async () => {
                if (!user?.uid) return;
                try {
                  setAddPropertyLoading(true);
                  await updateUserProfile(user.uid, { displayName: addFormName || undefined });
                  setAddPropertyLoading(false);
                  closeSheet();
                  setTimeout(() => showSnackbar("Profile updated! ✅", "success"), 300);
                } catch (err: any) {
                  setAddPropertyLoading(false);
                  showSnackbar(err?.message || "Failed to update profile", "error");
                }
              }}
              className="btn-primary ripple-container"
              disabled={addPropertyLoading}
            >
              {addPropertyLoading ? <div className="spinner mx-auto" /> : <span>Save Changes</span>}
            </button>
          </div>
        </div>
      </div>
      {/* MORE MENU SHEET */}
      <div className={`sheet-overlay ${activeSheet === "moreMenu" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "moreMenu" ? "active" : ""}`}>
        <div className="sheet-handle" />
        <div className="p-5 pb-2">
          <h3 className="text-lg font-bold text-white">More</h3>
          <p className="text-xs mt-1" style={{ color: "#a3a3a3" }}>All modules &amp; settings</p>
        </div>
        <div className="px-3 pb-8">
          {[
            { icon: MessageCircle, label: "Inquiries", desc: "3 new inquiries", color: "#047857", path: "/inquiries" },
            { icon: Layers, label: "Units", desc: "8 units across 4 properties", color: "#3b82f6", path: "/units" },
            { icon: CalendarDays, label: "Viewings", desc: "8 viewing requests", color: "#eab308", path: "/viewings" },
            { icon: Clock, label: "Calendar", desc: "Viewings & schedule", color: "#eab308", path: "/viewings" },            { icon: MessageSquare, label: "Messages", desc: "18 conversations", color: "#a855f7", path: "/messages" },
            { icon: DoorOpen, label: "Vacating", desc: "Move-out management", color: "#f97316", path: "/vacating" },
            { icon: BadgeCheck, label: "Rent Verification", desc: "Review & confirm payments", color: "#6366f1", path: "/rent-verification" },
            { icon: Megaphone, label: "Notices", desc: "Broadcast to tenants", color: "#f97316", path: "/notices" },
            { icon: MessageSquareWarning, label: "Complaints", desc: "Tenant issues & maintenance", color: "#ef4444", path: "/complaints" },
            { icon: Settings, label: "Settings", desc: "Account & preferences", color: "#525252", path: "/settings" },
          ].map((item, i) => (
              <button
                key={i}
                onClick={() => {
                  closeSheet();
                  if (item.path) {
                    router.push(item.path);
                  }
                }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "rgba(4,120,87,0.08)", border: "1px solid rgba(255,255,255,0.04)" }}>
                  <item.icon className="w-5 h-5" style={{ color: item.color }} />
                </div>
                <div className="text-left flex-1">
                  <p className="text-sm font-semibold text-white">{item.label}</p>
                  <p className="text-xs" style={{ color: "#a3a3a3" }}>{item.desc}</p>
                </div>
              {item.path && <ChevronRight className="w-4 h-4" style={{ color: "#525252" }} />}
            </button>
          ))}
        </div>
      </div>



      {/* PROFILE SHEET */}
      <div className={`sheet-overlay ${activeSheet === "profile" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "profile" ? "active" : ""}`} style={{ maxHeight: "95dvh" }}>
        <div className="sheet-handle" />
        <div className="p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-white">Profile</h3>
            <button onClick={closeSheet} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)" }}>
              <XIcon className="w-4 h-4" style={{ color: "#a3a3a3" }} />
            </button>
          </div>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full overflow-hidden" style={{ border: "2px solid rgba(4,120,87,0.4)" }}>
              <img src="https://picsum.photos/seed/landlord-ke/88/88.jpg" className="w-full h-full object-cover" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white">{user?.displayName || "Landlord"}</h4>
              <p className="text-xs" style={{ color: "#a3a3a3" }}>{user?.email || ""}</p>
              <p className="text-xs" style={{ color: "#047857" }}>Verified Landlord</p>
            </div>
          </div>
          <div className="flex gap-3 mb-6">
            <button onClick={() => { closeSheet(); openSheet("editProfile"); }} className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-white" style={{ background: "#047857" }}>Edit Profile</button>
            <button onClick={() => { closeSheet(); router.push("/settings"); }} className="flex-1 py-2.5 rounded-xl text-xs font-semibold" style={{ background: "rgba(255,255,255,0.05)", color: "#e5e5e5" }}>Settings</button>
          </div>
          <div className="space-y-1">
          {[{ icon: Building2, label: "My Properties", desc: `${totalProperties} properties`, path: "/properties" },
            { icon: Users, label: "My Tenants", desc: `${occupiedUnits} tenants`, path: "/units" },
            { icon: Settings, label: "Account Settings", desc: "Preferences & security", path: "/settings" },
            { icon: HelpCircle, label: "Help & Support", desc: "Contact us", path: "/settings" },
            { icon: LogOut, label: "Sign Out", desc: "", path: "" }].map((item) => (
              <button key={item.label} onClick={() => { closeSheet(); if (item.path) router.push(item.path); else signOut(); }}
                className="w-full flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <item.icon className="w-5 h-5" style={{ color: item.label === "Sign Out" ? "#ef4444" : "#a3a3a3" }} />
                </div>
                <div className="text-left flex-1">
                  <p className="text-sm font-medium text-white">{item.label}</p>
                  {item.desc && <p className="text-xs" style={{ color: "#525252" }}>{item.desc}</p>}
                </div>
                {item.path && <ChevronRight className="w-4 h-4" style={{ color: "#525252" }} />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SEARCH SHEET */}
      <div className={`sheet-overlay ${activeSheet === "search" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "search" ? "active" : ""}`} style={{ maxHeight: "95dvh" }}>
        <div className="sheet-handle" />
        <div className="p-5">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "#525252" }} />
              <input type="text" className="android-input" style={{ paddingLeft: "44px" }} placeholder="Search properties, tenants..." value={searchText} onChange={(e) => setSearchText(e.target.value)} />
            </div>
            <button onClick={closeSheet} className="text-sm font-semibold" style={{ color: "#a3a3a3" }}>Cancel</button>
          </div>
          {searchText ? (
            <div className="space-y-2">
              {(() => {
                const results = [
                  ...properties.filter(p => p.name.toLowerCase().includes(searchText.toLowerCase())).map(p => ({ id: p.id, label: p.name, sub: p.location || p.county || '' })),
                  ...units.filter(u => u.name.toLowerCase().includes(searchText.toLowerCase()) || (u.tenantName || '').toLowerCase().includes(searchText.toLowerCase())).map(u => ({ id: u.id, label: u.tenantName || u.name, sub: u.propertyName })),
                ];
                return results.slice(0, 10).map((item: any, idx: number) => (
                  <div key={idx} onClick={() => { closeSheet(); router.push("/properties"); }}
                    className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(4,120,87,0.1)" }}>
                      <Building2 className="w-5 h-5" style={{ color: "#047857" }} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{item.label || "Untitled"}</p>
                      <p className="text-xs" style={{ color: "#525252" }}>{item.sub || ""}</p>
                    </div>
                  </div>
                ));
              })()}
            </div>
          ) : (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#525252" }}>Recent</p>
              <div className="space-y-1">
                {[{ label: "Properties" }, { label: "Kilimani Heights" }, { label: "Overdue payments" }].map((item, i) => (
                  <button key={i} onClick={() => setSearchText(item.label)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
                    <Clock className="w-4 h-4" style={{ color: "#525252" }} />
                    <span className="text-sm text-white">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
{/* NOTIFICATIONS SHEET */}
      <div className={`sheet-overlay ${activeSheet === "notifications" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "notifications" ? "active" : ""}`} style={{ maxHeight: "95dvh" }}>
        <div className="sheet-handle" />
        <div className="p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-white">Notifications</h3>
            <button onClick={markAllRead} className="text-xs font-semibold" style={{ color: "#047857" }}>Mark all read</button>
          </div>
          <div className="space-y-1">
            {recentActivity.length === 0 && (
              <div className="text-center py-8">
                <Bell className="w-10 h-10 mx-auto mb-3" style={{ color: "#525252" }} />
                <p className="text-sm" style={{ color: "#525252" }}>No notifications yet</p>
              </div>
            )}
            {recentActivity.slice(0, 15).map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl cursor-pointer" style={{ background: "rgba(255,255,255,0.03)" }} onClick={() => { closeSheet(); router.push("/inquiries"); }}>
                <div className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: item.dotColor, boxShadow: `0 0 6px ${item.dotColor}66` }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                    <span className="text-xs" style={{ color: "#525252" }}>{item.time}</span>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: "#a3a3a3" }}>{item.desc}</p>
                  <span className="chip mt-1" style={{ background: item.chipBg, color: item.chipColor, fontSize: "10px" }}>{item.chip}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ADD PROPERTY SHEET */}
      <div className={`sheet-overlay ${activeSheet === "addProperty" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "addProperty" ? "active" : ""}`} style={{ maxHeight: "95dvh" }}>
        <div className="sheet-handle" />
        <div className="p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-white">Add Property</h3>
            <button onClick={closeSheet} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)" }}>
              <XIcon className="w-4 h-4" style={{ color: "#a3a3a3" }} />
            </button>
          </div>
          <div className="space-y-4">
            <div className="input-group">
              <input type="text" className="android-input" placeholder=" " value={addFormName} onChange={(e) => setAddFormName(e.target.value)} />
              <label>Property Name</label>
            </div>
            <div className="input-group">
              <input type="text" className="android-input" placeholder=" " value={addFormLocation} onChange={(e) => setAddFormLocation(e.target.value)} />
              <label>Location</label>
            </div>
            <div>
              <label className="text-xs font-medium block mb-2" style={{ color: "#a3a3a3" }}>County</label>
              <select className="android-select" value={addFormCounty} onChange={(e) => setAddFormCounty(e.target.value)}>
                {COUNTY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium block mb-2" style={{ color: "#a3a3a3" }}>Property Type</label>
              <select className="android-select" value={addFormType} onChange={(e) => setAddFormType(e.target.value)}>
                {PROPERTY_TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="input-group">
              <input type="number" className="android-input" placeholder=" " value={addFormUnits} onChange={(e) => setAddFormUnits(e.target.value)} />
              <label>Total Units</label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="input-group">
                <input type="text" className="android-input" placeholder=" " style={{ paddingLeft: "60px" }} value={addFormRentMin} onChange={(e) => setAddFormRentMin(e.target.value)} />
                <label style={{ left: "60px" }}>Min Rent (KSh)</label>
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: "#a3a3a3" }}>KSh</span>
              </div>
              <div className="input-group">
                <input type="text" className="android-input" placeholder=" " style={{ paddingLeft: "60px" }} value={addFormRentMax} onChange={(e) => setAddFormRentMax(e.target.value)} />
                <label style={{ left: "60px" }}>Max Rent (KSh)</label>
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: "#a3a3a3" }}>KSh</span>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium block mb-2" style={{ color: "#a3a3a3" }}>Amenities</label>
              <div className="flex flex-wrap gap-2">
                {["CCTV", "Parking", "Generator", "Pool", "Gym", "Garden", "Security", "Elevator", "Furnished", "Pet Friendly"].map((a) => (
                  <button key={a} onClick={() => setAddFormAmenities(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a])}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all`}
                    style={{ background: addFormAmenities.includes(a) ? "rgba(4,120,87,0.15)" : "rgba(255,255,255,0.05)", color: addFormAmenities.includes(a) ? "#34d399" : "#a3a3a3" }}>
                    {a}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium block mb-2" style={{ color: "#a3a3a3" }}>Description</label>
              <textarea className="android-input" style={{ minHeight: "60px", borderRadius: "14px" }} placeholder="Property description..." value={addFormDescription} onChange={(e) => setAddFormDescription(e.target.value)} />
            </div>
            <button onClick={handleAddProperty} className="btn-primary ripple-container" disabled={addPropertyLoading}>
              {addPropertyLoading ? <div className="spinner mx-auto" /> : <span>Add Property</span>}
            </button>
          </div>
        </div>
      </div>

      {/* ADD UNIT SHEET */}
      <div className={`sheet-overlay ${activeSheet === "addUnit" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "addUnit" ? "active" : ""}`} style={{ maxHeight: "95dvh" }}>
        <div className="sheet-handle" />
        <div className="p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-white">Add Unit</h3>
            <button onClick={closeSheet} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)" }}>
              <XIcon className="w-4 h-4" style={{ color: "#a3a3a3" }} />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium block mb-2" style={{ color: "#a3a3a3" }}>Property</label>
              <select className="android-select" value={addUPropId} onChange={(e) => {
                const prop = properties.find(p => p.id === e.target.value);
                setAddUPropId(e.target.value);
                setAddUPropName(prop?.name || "");
              }}>
                <option value="">Select property</option>
                {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="input-group">
              <input type="text" className="android-input" placeholder=" " value={addUName} onChange={(e) => setAddUName(e.target.value)} />
              <label>Unit Name</label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium block mb-2" style={{ color: "#a3a3a3" }}>Type</label>
                <select className="android-select" value={addUType} onChange={(e) => setAddUType(e.target.value)}>
                  {UNIT_TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium block mb-2" style={{ color: "#a3a3a3" }}>Status</label>
                <select className="android-select" value={addUStatus} onChange={(e) => setAddUStatus(e.target.value)}>
                  {UNIT_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="input-group">
                <input type="text" className="android-input" placeholder=" " style={{ paddingLeft: "60px" }} value={addURent} onChange={(e) => setAddURent(e.target.value)} />
                <label style={{ left: "60px" }}>Rent (KSh)</label>
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: "#a3a3a3" }}>KSh</span>
              </div>
              <div className="input-group">
                <input type="text" className="android-input" placeholder=" " style={{ paddingLeft: "60px" }} value={addUDeposit} onChange={(e) => setAddUDeposit(e.target.value)} />
                <label style={{ left: "60px" }}>Deposit</label>
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: "#a3a3a3" }}>KSh</span>
              </div>
            </div>
            <div className="input-group">
              <input type="text" className="android-input" placeholder=" " style={{ paddingLeft: "60px" }} value={addUService} onChange={(e) => setAddUService(e.target.value)} />
              <label style={{ left: "60px" }}>Service Charge (KSh)</label>
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: "#a3a3a3" }}>KSh</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium block mb-2" style={{ color: "#a3a3a3" }}>Bathrooms</label>
                <select className="android-select" value={addUBathrooms} onChange={(e) => setAddUBathrooms(e.target.value)}>
                  {BATHROOM_OPTIONS.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium block mb-2" style={{ color: "#a3a3a3" }}>Floor</label>
                <select className="android-select" value={addUFloor} onChange={(e) => setAddUFloor(e.target.value)}>
                  {FLOOR_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            </div>
            <div className="input-group">
              <input type="number" className="android-input" placeholder=" " value={addUArea} onChange={(e) => setAddUArea(e.target.value)} />
              <label>Area (sqm)</label>
            </div>
            <div>
              <label className="text-xs font-medium block mb-2" style={{ color: "#a3a3a3" }}>Description</label>
              <textarea className="android-input" style={{ minHeight: "60px", borderRadius: "14px" }} placeholder="Unit description..." value={addUDesc} onChange={(e) => setAddUDesc(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium block mb-2" style={{ color: "#a3a3a3" }}>Amenities</label>
              <div className="flex flex-wrap gap-2">
                {["Hot Shower", "WiFi", "Parking", "CCTV", "Balcony", "A/C", "Borehole", "Furnished", "Pet Friendly", "Generator"].map((a) => (
                  <button key={a} onClick={() => setAddUAmenities(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a])}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all`}
                    style={{ background: addUAmenities.includes(a) ? "rgba(4,120,87,0.15)" : "rgba(255,255,255,0.05)", color: addUAmenities.includes(a) ? "#34d399" : "#a3a3a3" }}>
                    {a}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={handleAddUnit} className="btn-primary ripple-container" disabled={addUnitLoading}>
              {addUnitLoading ? <div className="spinner mx-auto" /> : <span>Add Unit</span>}
            </button>
          </div>
        </div>
      </div>

      {/* PAYMENTS SHEET */}
      <div className={`sheet-overlay ${activeSheet === "payments" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "payments" ? "active" : ""}`} style={{ maxHeight: "95dvh" }}>
        <div className="sheet-handle" />
        <div className="p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-white">Payments</h3>
            <button onClick={() => { closeSheet(); openSheet("recordPayment"); }} className="text-xs font-semibold flex items-center gap-1" style={{ color: "#047857" }}>
              <Plus className="w-3.5 h-3.5" /> Record
            </button>
          </div>
          <div className="flex gap-2 mb-4">
            {[{ label: "All" }, { label: "Collected" }, { label: "Pending" }, { label: "Overdue" }].map((tab) => (
              <button key={tab.label} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${tab.label === "All" ? "" : ""}`}
                style={{ background: tab.label === "All" ? "rgba(4,120,87,0.15)" : "rgba(255,255,255,0.05)", color: tab.label === "All" ? "#34d399" : "#a3a3a3" }}>
                {tab.label}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            {paymentActivity.map((p, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: p.statusBg }}>
                  {p.status === "success" ? <Check className="w-4 h-4" style={{ color: p.statusColor }} /> : <X className="w-4 h-4" style={{ color: p.statusColor }} />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-white">{p.name}</p>
                    <span className="text-sm font-semibold text-white">{p.amount}</span>
                  </div>
                  <p className="text-xs" style={{ color: "#a3a3a3" }}>{p.desc}</p>
                </div>
              </div>
            ))}
            {paymentActivity.length === 0 && (
              <div className="text-center py-8">
                <Wallet className="w-10 h-10 mx-auto mb-3" style={{ color: "#525252" }} />
                <p className="text-sm" style={{ color: "#525252" }}>No payments recorded yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TENANTS SHEET */}
      <div className={`sheet-overlay ${activeSheet === "tenants" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "tenants" ? "active" : ""}`} style={{ maxHeight: "95dvh" }}>
        <div className="sheet-handle" />
        <div className="p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-white">Tenants</h3>
            <button onClick={() => { closeSheet(); openSheet("addTenant"); }} className="text-xs font-semibold flex items-center gap-1" style={{ color: "#047857" }}>
              <UserPlus className="w-3.5 h-3.5" /> Add Tenant
            </button>
          </div>
          <div className="space-y-2">
            {units.filter(u => u.status === "Occupied").map((u) => (
              <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: "linear-gradient(135deg, #047857, #059669)", color: "white" }}>
                  {(u.tenantName || "T").charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{u.tenantName || "Vacant"}</p>
                  <p className="text-xs" style={{ color: "#a3a3a3" }}>{u.name} — {u.propertyName}</p>
                  <p className="text-xs" style={{ color: u.payment === "Paid" ? "#047857" : u.payment === "Overdue" ? "#ef4444" : "#eab308" }}>{u.payment || "N/A"}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-white">KSh {u.rent.toLocaleString()}</p>
                  <p className="text-xs" style={{ color: "#525252" }}>{u.payment === "Paid" ? "Paid" : u.payment === "Overdue" ? "Overdue" : "Unknown"}</p>
                </div>
              </div>
            ))}
            {units.filter(u => u.status === "Occupied").length === 0 && (
              <div className="text-center py-8">
                <Users className="w-10 h-10 mx-auto mb-3" style={{ color: "#525252" }} />
                <p className="text-sm" style={{ color: "#525252" }}>No tenants yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* REPORTS SHEET */}
      <div className={`sheet-overlay ${activeSheet === "reports" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "reports" ? "active" : ""}`} style={{ maxHeight: "95dvh" }}>
        <div className="sheet-handle" />
        <div className="p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-white">Reports</h3>
            <button onClick={closeSheet} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)" }}>
              <XIcon className="w-4 h-4" style={{ color: "#a3a3a3" }} />
            </button>
          </div>
          <div className="space-y-2">
            {[
              { icon: Banknote, color: "#047857", title: "Revenue Report", desc: "Monthly income breakdown by property", bg: "rgba(4,120,87,0.1)" },
              { icon: FileText, color: "#3b82f6", title: "Rent Roll", desc: "Status of all tenant payments", bg: "rgba(59,130,246,0.1)" },
              { icon: Percent, color: "#eab308", title: "Occupancy Report", desc: "Vacancy & occupancy trends", bg: "rgba(234,179,8,0.1)" },
              { icon: PieChart, color: "#a855f7", title: "Expense Summary", desc: "Maintenance & operational costs", bg: "rgba(168,85,247,0.1)" },
              { icon: Download, color: "#f97316", title: "Export Data", desc: "Download as CSV or PDF", bg: "rgba(249,115,22,0.1)" },
            ].map((report) => (
              <button key={report.title} onClick={() => { closeSheet(); showSnackbar(`Generating ${report.title}...`, "success"); }}
                className="w-full flex items-center gap-3 p-3.5 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: report.bg }}>
                  <report.icon className="w-5 h-5" style={{ color: report.color }} />
                </div>
                <div className="text-left flex-1">
                  <p className="text-sm font-medium text-white">{report.title}</p>
                  <p className="text-xs" style={{ color: "#525252" }}>{report.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4" style={{ color: "#525252" }} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* INVOICES SHEET */}
      <div className={`sheet-overlay ${activeSheet === "invoices" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "invoices" ? "active" : ""}`} style={{ maxHeight: "95dvh" }}>
        <div className="sheet-handle" />
        <div className="p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-white">Invoices</h3>
            <button onClick={() => { closeSheet(); showSnackbar("Creating new invoice...", "info"); }} className="text-xs font-semibold flex items-center gap-1" style={{ color: "#047857" }}>
              <Plus className="w-3.5 h-3.5" /> New Invoice
            </button>
          </div>
          <div className="space-y-2">
            {units.filter(u => u.status === "Occupied").slice(0, 10).map((u) => (
              <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(59,130,246,0.1)" }}>
                  <FileText className="w-4 h-4" style={{ color: "#3b82f6" }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{u.tenantName || "Vacant"}</p>
                  <p className="text-xs" style={{ color: "#525252" }}>{u.name} — {u.propertyName}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-white">KSh {u.rent.toLocaleString()}</p>
                  <button onClick={() => { closeSheet(); showSnackbar(`Invoice sent to ${u.tenantName}`, "success"); }} className="text-xs font-semibold" style={{ color: "#047857" }}>Send</button>
                </div>
              </div>
            ))}
            {units.filter(u => u.status === "Occupied").length === 0 && (
              <div className="text-center py-8">
                <FileText className="w-10 h-10 mx-auto mb-3" style={{ color: "#525252" }} />
                <p className="text-sm" style={{ color: "#525252" }}>No invoices yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PROPERTY MENU SHEET */}
      <div className={`sheet-overlay ${activeSheet === "propertyMenu" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "propertyMenu" ? "active" : ""}`}>
        <div className="sheet-handle" />
        <div className="p-5 pb-2">
          <h3 className="text-lg font-bold text-white">Property Options</h3>
        </div>
        <div className="px-3 pb-8 space-y-1">
          {[
            { icon: Pencil, label: "Edit Property", color: "#047857", action: "edit" },
            { icon: Share2, label: "Share Property", color: "#3b82f6", action: "share" },
            { icon: Eye, label: "View Details", color: "#a855f7", action: "view" },
            { icon: Camera, label: "Add Photos", color: "#eab308", action: "photos" },
            { icon: Archive, label: "Archive Property", color: "#f97316", action: "archive" },
            { icon: Trash2, label: "Delete Property", color: "#ef4444", action: "delete" },
          ].map((item) => (
            <button key={item.label} onClick={() => { closeSheet(); showSnackbar(`${item.label} opened`, "info"); }}
              className="w-full flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${item.color}15` }}>
                <item.icon className="w-5 h-5" style={{ color: item.color }} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-white">{item.label}</p>
              </div>
              <ChevronRight className="w-4 h-4" style={{ color: "#525252" }} />
            </button>
          ))}
        </div>
      </div>
      {/* ====== SNACKBAR ====== */}
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



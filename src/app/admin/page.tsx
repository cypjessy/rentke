"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import AppBar from "@/app/components/AppBar";
import {
  Users,
  Building2,
  Headset,
  Wallet,
  Clock,
  CheckCircle,
  AlertTriangle,
  Megaphone,
  UserPlus,
  CreditCard,
  ShieldCheck,
  Ban,
  LayoutDashboard,
  Settings,
  MapPin,
  Crown,
  Shield,
  ScrollText,
  LogOut,
  XCircle,
  Check,
  X,
  Info,
  Bell,
  MoreVertical,
  TrendingUp,
  Star,
} from "lucide-react";
import { listenToAdminDashboard, listenToAllListings, listenToWalletStats, approveListing, rejectListing, flagListing, deleteListingAdmin, type AdminDashboardData, type WalletStats } from "@/lib/admin";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ListingData } from "@/lib/listings";
import type {
  PageKey,
  SheetKey,
  ActivityItem,
  ActivityAction,
  ApprovalItem,
  SnackbarState,
  SnackbarType,
  BroadcastTarget,
  BroadcastChannel,
} from "./types";
import {
  CHART_DATA,
  defaultActivities,
  REJECT_REASONS,
  NOTIFICATIONS,
  MENU_ITEMS,
  LOCATIONS_DATA,
  PLANS_DATA,
  ADMIN_USERS,
  AUDIT_LOGS,
  AUDIT_TYPES,
  AUDIT_LOG_COLORS,
  AUDIT_LOG_ICONS,
} from "./data";

let APPROVALS: ApprovalItem[] = [];
let ACTIVITIES: ActivityItem[] = [...defaultActivities];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const router = useRouter();
  // ── Firestore data ──
  const [dashboardData, setDashboardData] = useState<AdminDashboardData>({
    totalListings: 0, activeListings: 0, pendingListings: 0,
    totalLandlords: 0, monthlyRevenue: 0,
  });
  const [allListings, setAllListings] = useState<ListingData[]>([]);
  const [walletStats, setWalletStats] = useState<WalletStats>({
    totalRevenue: 0, subscriptionRevenue: 0, boostRevenue: 0, commissionRevenue: 0,
    refundAmount: 0, activeSubscriptions: 0, activeBoosts: 0, transactionCount: 0,
  });
  const [dataLoading, setDataLoading] = useState(true);

  // Compute 7-day chart data from allListings
  const chartDays: { day: string; height: number; highlight?: boolean }[] = [];
  if (allListings.length > 0) {
    const now = new Date();
    const dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const dayLabel = dayNames[d.getDay()];
      const count = allListings.filter((l) => {
        if (!l.createdAt) return false;
        const created = l.createdAt.toDate().toISOString().split("T")[0];
        return created === dateStr;
      }).length;
      chartDays.push({ day: dayLabel, height: Math.max(count * 15, 3), highlight: i === 0 });
    }
  } else {
    chartDays.push(...CHART_DATA);
  }

  useEffect(() => {
    const unsub1 = listenToAdminDashboard((data) => {
      setDashboardData(data);
    }, () => {});
    const unsub2 = listenToAllListings((listings) => {
      setAllListings(listings);
      setDataLoading(false);
    }, () => { setDataLoading(false); });
    const unsub3 = listenToWalletStats((stats) => {
      setWalletStats(stats);
    }, () => {});
    return () => { unsub1(); unsub2(); unsub3(); };
  }, []);

  // Build pending approvals and activities whenever allListings changes
  useEffect(() => {
    if (allListings.length === 0) return;
    const pending = allListings.filter((l) => (l.status as string) === "draft").slice(0, 5);
    APPROVALS = pending.map((l) => ({
      id: l.id,
      name: l.title || l.propertyName || "Untitled",
      title: l.title || l.propertyName || "Untitled",
      landlord: `By ${l.landlordId || "Unknown"}`,
      price: `KSh ${(l.rent || 0).toLocaleString()}/mo`,
      submitted: l.createdAt ? `${Math.floor((Date.now() - l.createdAt.toDate().getTime()) / 3600000)}h ago` : "Recently",
      image: l.images?.[0] || "https://picsum.photos/seed/admin-pending/80/80.jpg",
    }));
    const latest = allListings.slice(0, 5);
    ACTIVITIES = latest.length > 0 ? latest.map((l): ActivityItem => {
      const isDraft = (l.status as string) === "draft";
      const isActive = l.status === "active";
      const isExpired = l.status === "expired";
      let action: ActivityAction | undefined;
      if (isDraft) {
        action = { sheet: "notifications", bg: "rgba(4,120,87,0.15)", color: "#059669", label: "Review" };
      } else if (isExpired) {
        action = { sheet: "notifications", bg: "rgba(239,68,68,0.15)", color: "#ef4444", label: "Expired" };
      }
      return {
        icon: l.boosted ? CheckCircle : UserPlus,
        color: l.boosted ? "#059669" : (isDraft ? "#eab308" : isExpired ? "#ef4444" : "#a855f7"),
        bg: l.boosted ? "rgba(4,120,87,0.15)" : (isDraft ? "rgba(234,179,8,0.15)" : isExpired ? "rgba(239,68,68,0.15)" : "rgba(168,85,247,0.15)"),
        text: (<><span className="font-semibold">{l.title || l.propertyName || "New listing"}</span> {isDraft ? "submitted for review" : isActive ? "went live" : isExpired ? "has expired" : "updated"}</>),
        time: l.createdAt ? `${Math.floor((Date.now() - l.createdAt.toDate().getTime()) / 3600000)}h ago` : "Recently",
        action,
      };
    }) : defaultActivities;
  }, [allListings]);

  // State
  const [activePage, setActivePage] = useState<PageKey>("dashboard");
  const [activeSheet, setActiveSheet] = useState<SheetKey | null>(null);
  const [snackbar, setSnackbar] = useState<SnackbarState>({ message: "", type: "info", visible: false });
  const [chartAnimated, setChartAnimated] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectNote, setRejectNote] = useState("");
  const [rejectTarget, setRejectTarget] = useState<ApprovalItem | null>(null);
  const [broadcastTarget, setBroadcastTarget] = useState<BroadcastTarget>("landlords");
  const [broadcastChannel, setBroadcastChannel] = useState<BroadcastChannel>("sms");
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [detailItem, setDetailItem] = useState<ApprovalItem | null>(null);

  // Audit log filter
  const [auditFilter, setAuditFilter] = useState("all");

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

  // ── Chart animation on mount ──
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

  // ── Nav ──
  const handleNav = useCallback((page: PageKey, snack?: string) => {
    setActivePage(page);
    if (snack) showSnackbar(snack, "info");
  }, [showSnackbar]);

  // ── Approve ──
  const handleApprove = useCallback(async (item: ApprovalItem) => {
    try {
      await approveListing(item.id);
      showSnackbar(`✅ "${item.name}" approved & now live`, "success");
    } catch {
      showSnackbar("Failed to approve listing", "error");
    }
  }, [showSnackbar]);

  // ── Reject ──
  const handleOpenReject = useCallback((item: ApprovalItem) => {
    setRejectTarget(item);
    setRejectReason("");
    setRejectNote("");
    openSheet("reject");
  }, [openSheet]);

  const handleConfirmReject = useCallback(async () => {
    if (!rejectTarget || !rejectReason) return;
    const id = rejectTarget.id;
    const name = rejectTarget.title;
    closeSheet();
    try {
      await rejectListing(id, rejectReason);
      showSnackbar(`❌ "${name}" rejected: ${rejectReason}`, "error");
    } catch {
      showSnackbar("Failed to reject listing", "error");
    }
  }, [rejectTarget, rejectReason, closeSheet, showSnackbar]);

  // ── View Detail ──
  const handleViewDetail = useCallback((item: ApprovalItem) => {
    setDetailItem(item);
    openSheet("detail");
  }, [openSheet]);

  // ── Broadcast ──
  const handleSendBroadcast = useCallback(() => {
    if (!broadcastTitle || !broadcastMsg) { showSnackbar("Please fill in title and message", "error"); return; }
    setBroadcastSending(true);
    addDoc(collection(db, "broadcasts"), {
      title: broadcastTitle,
      message: broadcastMsg,
      target: broadcastTarget,
      channel: broadcastChannel,
      sentBy: "admin",
      sentAt: serverTimestamp(),
    }).then(() => {
      setBroadcastSending(false);
      closeSheet();
      setTimeout(() => { showSnackbar(`📢 Broadcast sent to all ${broadcastTarget} via ${broadcastChannel}`, "success"); }, 300);
    }).catch((e) => {
      setBroadcastSending(false);
      showSnackbar(e.message, "error");
    });
  }, [broadcastTitle, broadcastMsg, broadcastTarget, broadcastChannel, closeSheet, showSnackbar]);

  // ── Logout ──
  const handleLogout = useCallback(async () => {
    try {
      await signOut(auth);
      closeSheet();
      setTimeout(() => showSnackbar("Logged out successfully", "info"), 300);
    } catch {
      showSnackbar("Failed to log out", "error");
    }
  }, [closeSheet, showSnackbar]);

  // ── Mark all read ──
  const markAllRead = useCallback(() => { showSnackbar("All notifications marked as read", "info"); }, [showSnackbar]);

  // ── Nav items ──
  const navItems: { key: PageKey; icon: React.ElementType; label: string; snackbar?: string; sheet?: SheetKey }[] = [
    { key: "dashboard", icon: LayoutDashboard, label: "Home" },
    { key: "landlords", icon: Users, label: "Landlords" },
    { key: "listings", icon: Building2, label: "Listings" },
    { key: "wallet", icon: Wallet, label: "Wallet" },
    { key: "settings", icon: Settings, label: "Settings" },
  ];

  // Filtered audit logs
  const filteredLogs = auditFilter === "all" ? AUDIT_LOGS : AUDIT_LOGS.filter((l) => l.type === auditFilter);

  return (
    <div className="admin-portal" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
      {/* Status Bar */}
      <div className="fixed top-0 left-0 right-0 z-60" style={{ height: "env(safe-area-inset-top, 24px)", minHeight: "24px", background: "rgba(5,5,5,0.9)", backdropFilter: "blur(20px)" }} />

      {/* ──────────── MAIN CONTENT ──────────── */}
      <div style={{ paddingBottom: "80px" }}>
        {/* TOP APP BAR */}
        <AppBar
          avatar={{
            initials: "AK",
            name: "Admin Ke",
            topLine: greeting(),
          }}
          actions={[
            { icon: Bell, onClick: () => openSheet("notifications"), dot: true },
            { icon: MoreVertical, onClick: () => openSheet("menu") },
          ]}
        />

        {/* SCROLLABLE CONTENT */}
        <div className="px-5 space-y-6" style={{ animation: "slideInUp 0.5s ease" }}>
          {/* STATS GRID */}
          <div className="grid grid-cols-2 gap-3">              <div className="stat-card" onClick={() => router.push("/admin/landlords")}>
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(4,120,87,0.15)" }}>
                  <Users className="w-[18px] h-[18px]" style={{ color: "#059669" }} />
                </div>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: "rgba(4,120,87,0.15)", color: "#059669" }}>{dataLoading ? "..." : "Live"}</span>
              </div>
              <p className="text-2xl font-bold text-white">{dataLoading ? "..." : dashboardData.totalLandlords}</p>
              <p className="text-xs mt-0.5" style={{ color: "#a3a3a3" }}>Landlords</p>
            </div>

            <div className="stat-card" onClick={() => router.push("/admin/listings")}>
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(59,130,246,0.15)" }}>
                  <Building2 className="w-[18px] h-[18px]" style={{ color: "#3b82f6" }} />
                </div>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: "rgba(59,130,246,0.15)", color: "#3b82f6" }}>{dataLoading ? "..." : "Live"}</span>
              </div>
              <p className="text-2xl font-bold text-white">{dataLoading ? "..." : dashboardData.activeListings}</p>
              <p className="text-xs mt-0.5" style={{ color: "#a3a3a3" }}>Active Listings</p>
            </div>

            <div className="stat-card" onClick={() => openSheet("revenue")}>
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(234,179,8,0.15)" }}>
                  <Wallet className="w-[18px] h-[18px]" style={{ color: "#eab308" }} />
                </div>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: "rgba(234,179,8,0.15)", color: "#eab308" }}>{dataLoading ? "..." : "Live"}</span>
              </div>
              <p className="text-2xl font-bold text-white">{dataLoading ? "..." : `KSh ${(dashboardData.monthlyRevenue / 1000).toFixed(0)}K`}</p>
              <p className="text-xs mt-0.5" style={{ color: "#a3a3a3" }}>Revenue (est.)</p>
            </div>

            <div className="stat-card" onClick={() => openSheet("notifications")}>
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(239,68,68,0.15)" }}>
                  <Clock className="w-[18px] h-[18px]" style={{ color: "#ef4444" }} />
                </div>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}>{dataLoading ? "..." : dashboardData.pendingListings > 0 ? "Urgent" : "Clear"}</span>
              </div>
              <p className="text-2xl font-bold text-white">{dataLoading ? "..." : dashboardData.pendingListings}</p>
              <p className="text-xs mt-0.5" style={{ color: "#a3a3a3" }}>Pending Approval</p>
            </div>
          </div>

          {/* QUICK ACTIONS */}
          <div>
            <h3 className="text-sm font-semibold mb-3" style={{ color: "#a3a3a3" }}>Quick Actions</h3>
            <div className="grid grid-cols-4 gap-2">
              <button className="action-btn ripple-container" onClick={() => openSheet("notifications")}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(4,120,87,0.15)" }}>
                  <CheckCircle className="w-5 h-5" style={{ color: "#059669" }} />
                </div>
                <span className="text-xs font-medium" style={{ color: "#a3a3a3" }}>Approve</span>
              </button>
              <button className="action-btn ripple-container" onClick={() => openSheet("disputes")}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(234,179,8,0.15)" }}>
                  <AlertTriangle className="w-5 h-5" style={{ color: "#eab308" }} />
                </div>
                <span className="text-xs font-medium" style={{ color: "#a3a3a3" }}>Disputes</span>
              </button>
              <button className="action-btn ripple-container" onClick={() => openSheet("revenue")}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(59,130,246,0.15)" }}>
                  <TrendingUp className="w-5 h-5" style={{ color: "#3b82f6" }} />
                </div>
                <span className="text-xs font-medium" style={{ color: "#a3a3a3" }}>Revenue</span>
              </button>
              <button className="action-btn ripple-container" onClick={() => openSheet("broadcast")}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(168,85,247,0.15)" }}>
                  <Megaphone className="w-5 h-5" style={{ color: "#a855f7" }} />
                </div>
                <span className="text-xs font-medium" style={{ color: "#a3a3a3" }}>Broadcast</span>
              </button>
            </div>
          </div>

          {/* REVENUE CHART */}
          <div className="stat-card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Revenue Overview</h3>
                <p className="text-xs mt-0.5" style={{ color: "#a3a3a3" }}>Last 7 days</p>
              </div>
              <button onClick={() => openSheet("revenue")} className="text-xs font-medium px-3 py-1.5 rounded-full ripple-container" style={{ background: "rgba(255,255,255,0.05)", color: "#a3a3a3" }}>View All</button>
            </div>
            <div className="flex items-end gap-2 h-32">
              {chartDays.map((d) => (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                  <div className="chart-bar w-full" style={{ height: chartAnimated ? `${Math.min(d.height, 100)}%` : "0%", transitionDelay: chartAnimated ? "0.1s" : "0s" }} />
                  <span className="text-xs" style={{ color: d.highlight ? "#059669" : "#525252" }}>{d.day}</span>
                </div>
              ))}
            </div>
          </div>

          {/* PENDING APPROVALS */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold" style={{ color: "#a3a3a3" }}>Pending Approvals</h3>
              <button onClick={() => openSheet("notifications")} className="text-xs font-medium" style={{ color: "#059669" }}>See all (14)</button>
            </div>
            <div className="space-y-3">
              {APPROVALS.map((item) => (
                <div key={item.id} className="approval-card">
                  <div className="flex items-start gap-3">
                    <img src={item.image} alt="" className="w-14 h-14 rounded-xl object-cover" />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-white truncate">{item.title}</h4>
                      <p className="text-xs mt-0.5" style={{ color: "#a3a3a3" }}>{item.landlord} · {item.price}</p>
                      <p className="text-xs mt-0.5" style={{ color: "#525252" }}>Submitted {item.submitted}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => handleApprove(item)} className="btn-primary flex-1 text-center ripple-container" style={{ padding: "10px", fontSize: "13px" }}>Approve</button>
                    <button onClick={() => handleOpenReject(item)} className="btn-danger ripple-container" style={{ padding: "10px 16px", fontSize: "13px" }}>Reject</button>
                    <button onClick={() => handleViewDetail(item)} className="btn-ghost ripple-container" style={{ padding: "10px 16px", fontSize: "13px" }}>View</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RECENT ACTIVITY */}
          <div className="pb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold" style={{ color: "#a3a3a3" }}>Recent Activity</h3>
              <button onClick={() => openSheet("audit-logs")} className="text-xs font-medium" style={{ color: "#059669" }}>View all</button>
            </div>
            <div>
              {ACTIVITIES.map((act, i) => (
                <div key={i} className="activity-item">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: act.bg }}>
                    <act.icon className="w-4 h-4" style={{ color: act.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white">{act.text}</p>
                    <p className="text-xs mt-0.5" style={{ color: "#525252" }}>{act.time}</p>
                  </div>
                  {act.action && (
                    <button onClick={() => openSheet(act.action!.sheet)} className="text-xs font-medium px-2.5 py-1 rounded-lg" style={{ background: act.action.bg, color: act.action.color }}>
                      {act.action.label}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ──────────── BOTTOM NAVIGATION ──────────── */}
      <div className="bottom-nav">
        <div className="flex items-center justify-around">
          {navItems.map((item) => (
            <div key={item.key} className={`nav-item ${activePage === item.key ? "active" : ""}`} onClick={() => {
              if (item.key === "dashboard") router.push("/admin");
              else if (item.key === "landlords") router.push("/admin/landlords");
              else if (item.key === "listings") router.push("/admin/listings");
              else if (item.key === "wallet") router.push("/admin/wallet");
              else if (item.key === "settings") router.push("/admin/settings");
              else handleNav(item.key, item.snackbar);
            }}>
              <item.icon className="w-5 h-5" style={{ color: activePage === item.key ? "#059669" : "#525252" }} />
              <span className="text-xs font-medium" style={{ color: activePage === item.key ? "#059669" : "#525252" }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ──────────── BOTTOM SHEETS ──────────── */}

      {/* OVERLAY */}
      <div className={`bottom-sheet-overlay ${activeSheet ? "active" : ""}`} onClick={closeSheet} />

      {/* -- NOTIFICATIONS SHEET -- */}
      <div className={`bottom-sheet ${activeSheet === "notifications" ? "active" : ""}`}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Notifications</h3>
            <button onClick={markAllRead} className="text-xs font-medium" style={{ color: "#059669" }}>Mark all read</button>
          </div>
        </div>
        <div className="px-5 pb-8 space-y-1">
          {NOTIFICATIONS.map((n, i) => (
            <div key={i} className="flex gap-3 p-3 rounded-2xl" style={{ background: n.bg, border: n.border !== "transparent" ? `1px solid ${n.border}` : undefined }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: n.iconBg }}>
                <n.icon className="w-4 h-4" style={{ color: n.iconColor }} />
              </div>
              <div>
                <p className={`text-sm ${n.unread ? "text-white font-medium" : ""}`} style={n.unread ? {} : { color: "#a3a3a3" }}>{n.text}</p>
                <p className="text-xs mt-0.5" style={{ color: "#525252" }}>{n.time}</p>
              </div>
            </div>
          ))}
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
            {MENU_ITEMS.map((item, i) => (
              <button key={i} onClick={() => {
                closeSheet();
                if ("onClick" in item && item.onClick === "nav-support") {
                  router.push("/admin/support");                  } else if ("sheet" in item && item.sheet) {
                    setTimeout(() => openSheet(item.sheet!), 300);
                  }
                } } className="w-full flex items-center gap-4 p-3.5 rounded-xl transition-all" style={{ background: "transparent" }}>
                <item.icon className="w-5 h-5" style={{ color: "#a3a3a3" }} />
                <span className="text-sm font-medium text-white">{item.label}</span>
              </button>
            ))}
          </div>
          <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <button onClick={handleLogout} className="w-full flex items-center gap-4 p-3.5 rounded-xl" style={{ background: "rgba(239,68,68,0.08)" }}>
              <LogOut className="w-5 h-5" style={{ color: "#ef4444" }} />
              <span className="text-sm font-medium" style={{ color: "#ef4444" }}>Log Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* -- REJECT LISTING SHEET -- */}
      <div className={`bottom-sheet ${activeSheet === "reject" ? "active" : ""}`}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(239,68,68,0.15)" }}>
              <XCircle className="w-5 h-5" style={{ color: "#ef4444" }} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Reject Listing</h3>
              <p className="text-xs" style={{ color: "#a3a3a3" }}>{rejectTarget?.title ?? "Select a listing"}</p>
            </div>
          </div>
          <div className="space-y-3 mb-5">
            <p className="text-sm" style={{ color: "#a3a3a3" }}>Select a reason:</p>
            <div className="flex flex-wrap gap-2">
              {REJECT_REASONS.map((reason) => (
                <button key={reason} onClick={() => setRejectReason(reason)}
                  className="text-xs font-medium px-3.5 py-2 rounded-full transition-all"
                  style={{ background: rejectReason === reason ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.05)", border: rejectReason === reason ? "1px solid rgba(239,68,68,0.3)" : "1px solid rgba(255,255,255,0.1)", color: rejectReason === reason ? "#ef4444" : "#a3a3a3" }}>
                  {reason}
                </button>
              ))}
            </div>
          </div>
          <textarea className="android-input mb-5" placeholder="Additional note (optional)" rows={3} value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} />
          <button id="confirm-reject-btn" onClick={handleConfirmReject} disabled={!rejectReason}
            className="btn-primary w-full text-center"
            style={{ opacity: rejectReason ? 1 : 0.4, cursor: rejectReason ? "pointer" : "not-allowed" }}>
            Reject Listing
          </button>
        </div>
      </div>

      {/* -- LISTING DETAIL SHEET -- */}
      <div className={`bottom-sheet ${activeSheet === "detail" ? "active" : ""}`}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-8">
          {detailItem && (
            <>
              <img id="detail-image" src={detailItem.image.replace("/80/80", "/400/200")} alt="" className="w-full h-44 rounded-2xl object-cover mb-4" />
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-bold text-white">{detailItem.title}</h3>
                  <p className="text-sm mt-1" style={{ color: "#a3a3a3" }}>{detailItem.landlord}</p>
                </div>
                <span className="text-lg font-bold" style={{ color: "#059669" }}>{detailItem.price}</span>
              </div>
              <div className="flex gap-2 mb-5">
                {(() => {
                  const l = allListings.find((li) => li.id === detailItem?.id);
                  const rent = l?.rent || 0;
                  return (
                    <>
                      <div className="flex-1 p-3 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.03)" }}>
                        <p className="text-lg font-bold text-white">KSh {(rent / 1000).toFixed(0)}K</p>
                        <p className="text-xs" style={{ color: "#525252" }}>Rent</p>
                      </div>
                      <div className="flex-1 p-3 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.03)" }}>
                        <p className="text-lg font-bold text-white">{l?.amenities?.length || 0}</p>
                        <p className="text-xs" style={{ color: "#525252" }}>Amenities</p>
                      </div>
                      <div className="flex-1 p-3 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.03)" }}>
                        <p className="text-lg font-bold text-white">{l?.views || 0}</p>
                        <p className="text-xs" style={{ color: "#525252" }}>Views</p>
                      </div>
                    </>
                  );
                })()}
              </div>
              <div className="flex gap-2">                    <button onClick={() => { handleApprove(detailItem); closeSheet(); }} className="btn-primary flex-1 text-center ripple-container" style={{ padding: "12px", fontSize: "14px" }}>Approve</button>
                <button onClick={() => { closeSheet(); setTimeout(() => handleOpenReject(detailItem), 300); }} className="btn-danger ripple-container" style={{ padding: "12px 20px", fontSize: "14px" }}>Reject</button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* -- REVENUE DETAIL SHEET (updated - removed payouts) -- */}
      <div className={`bottom-sheet ${activeSheet === "revenue" ? "active" : ""}`}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-8">
          <h3 className="text-lg font-bold text-white mb-4">Revenue Breakdown</h3>
          <div className="space-y-4">
            <div className="p-4 rounded-2xl" style={{ background: "rgba(4,120,87,0.06)", border: "1px solid rgba(4,120,87,0.12)" }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm" style={{ color: "#a3a3a3" }}>Total Revenue</span>
                <span className="text-base font-bold text-white">KSh {(walletStats.totalRevenue || dashboardData.monthlyRevenue).toLocaleString()}</span>
              </div>
              <p className="text-xs" style={{ color: "#a3a3a3" }}>{dataLoading ? "..." : walletStats.transactionCount > 0 ? `${walletStats.transactionCount} transactions` : "0 transactions"}</p>
            </div>
            <div className="pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex justify-between text-sm mb-3">
                <span style={{ color: "#a3a3a3" }}>Subscriptions</span>
                <span className="font-semibold text-white">KSh {walletStats.subscriptionRevenue.toLocaleString() || "0"}</span>
              </div>
              <div className="flex justify-between text-sm mb-3">
                <span style={{ color: "#a3a3a3" }}>Boosts</span>
                <span className="font-semibold text-white">KSh {walletStats.boostRevenue.toLocaleString() || "0"}</span>
              </div>
              <div className="flex justify-between text-sm mb-3">
                <span style={{ color: "#a3a3a3" }}>Commissions</span>
                <span className="font-semibold text-white">KSh {walletStats.commissionRevenue.toLocaleString() || "0"}</span>
              </div>
              {walletStats.refundAmount > 0 && (
                <div className="flex justify-between text-sm mb-3">
                  <span style={{ color: "#ef4444" }}>Refunds</span>
                  <span className="font-semibold" style={{ color: "#ef4444" }}>-KSh {walletStats.refundAmount.toLocaleString()}</span>
                </div>
              )}
              <div className="mt-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <button onClick={() => { closeSheet(); router.push("/admin/wallet"); }} className="btn-primary w-full text-center ripple-container" style={{ padding: "12px", fontSize: "14px" }}>
                  View Full Wallet
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* -- DISPUTES SHEET -- */}
      <div className={`bottom-sheet ${activeSheet === "disputes" ? "active" : ""}`}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-8">
          <h3 className="text-lg font-bold text-white mb-4">Active Disputes</h3>
          <div className="space-y-3">
            <div className="approval-card">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(234,179,8,0.15)" }}>
                  <AlertTriangle className="w-5 h-5" style={{ color: "#eab308" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">Westlands Listing Dispute</p>
                  <p className="text-xs mt-0.5" style={{ color: "#a3a3a3" }}>Tenant claims deposit not returned</p>
                  <p className="text-xs mt-0.5" style={{ color: "#525252" }}>Reported 18 min ago · Priority: Medium</p>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => { closeSheet(); showSnackbar("Navigating to Support & Disputes", "info"); setTimeout(() => router.push("/admin/support"), 200); }} className="btn-primary flex-1" style={{ padding: "10px", fontSize: "13px" }}>Review</button>
                <button className="btn-ghost" style={{ padding: "10px", fontSize: "13px" }}>Dismiss</button>
              </div>
            </div>
            <div className="approval-card">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(239,68,68,0.15)" }}>
                  <AlertTriangle className="w-5 h-5" style={{ color: "#ef4444" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">Kasarani Rent Issue</p>
                  <p className="text-xs mt-0.5" style={{ color: "#a3a3a3" }}>Landlord claims unpaid rent</p>
                  <p className="text-xs mt-0.5" style={{ color: "#525252" }}>Reported 2 days ago · Priority: High</p>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => { closeSheet(); showSnackbar("Navigating to Support & Disputes", "info"); setTimeout(() => router.push("/admin/support"), 200); }} className="btn-primary flex-1" style={{ padding: "10px", fontSize: "13px" }}>Review</button>
                <button className="btn-ghost" style={{ padding: "10px", fontSize: "13px" }}>Dismiss</button>
              </div>
            </div>
          </div>
          <button onClick={() => { closeSheet(); router.push("/admin/support"); }} className="btn-ghost w-full text-center mt-3">View All in Support</button>
        </div>
      </div>

      {/* -- BROADCAST SHEET -- */}
      <div className={`bottom-sheet ${activeSheet === "broadcast" ? "active" : ""}`}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(168,85,247,0.15)" }}>
              <Megaphone className="w-5 h-5" style={{ color: "#a855f7" }} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Send Broadcast</h3>
              <p className="text-xs" style={{ color: "#a3a3a3" }}>Send a message to users</p>
            </div>
          </div>
          <p className="text-sm mb-2" style={{ color: "#a3a3a3" }}>Target Audience:</p>
          <div className="flex gap-2 mb-4">
            {(["landlords", "tenants"] as BroadcastTarget[]).map((target) => (
              <button key={target} onClick={() => setBroadcastTarget(target)}
                className="flex-1 text-sm font-medium py-3 rounded-xl transition-all"
                style={{ background: broadcastTarget === target ? "rgba(4,120,87,0.15)" : "rgba(255,255,255,0.03)", border: broadcastTarget === target ? "1px solid rgba(4,120,87,0.3)" : "1px solid rgba(255,255,255,0.08)", color: broadcastTarget === target ? "#059669" : "#a3a3a3" }}>
                {target.charAt(0).toUpperCase() + target.slice(1)}
              </button>
            ))}
          </div>
          <p className="text-sm mb-2" style={{ color: "#a3a3a3" }}>Channel:</p>
          <div className="flex gap-2 mb-4">
            {(["sms", "email", "push"] as BroadcastChannel[]).map((ch) => (
              <button key={ch} onClick={() => setBroadcastChannel(ch)}
                className="flex-1 text-sm font-medium py-3 rounded-xl transition-all"
                style={{ background: broadcastChannel === ch ? "rgba(4,120,87,0.15)" : "rgba(255,255,255,0.03)", border: broadcastChannel === ch ? "1px solid rgba(4,120,87,0.3)" : "1px solid rgba(255,255,255,0.08)", color: broadcastChannel === ch ? "#059669" : "#a3a3a3" }}>
                {ch.toUpperCase()}
              </button>
            ))}
          </div>
          <input className="android-input mb-3" placeholder="Broadcast title" value={broadcastTitle} onChange={(e) => setBroadcastTitle(e.target.value)} />
          <textarea className="android-input mb-5" placeholder="Type your broadcast message..." rows={4} value={broadcastMsg} onChange={(e) => setBroadcastMsg(e.target.value)} />
          <button onClick={handleSendBroadcast} disabled={broadcastSending} className="btn-primary w-full text-center flex items-center justify-center gap-2">
            {broadcastSending ? <><div className="spinner" /><span>Sending...</span></> : <span>Send Broadcast</span>}
          </button>
        </div>
      </div>

      {/* -- SCAM ACTION SHEET -- */}
      <div className={`bottom-sheet ${activeSheet === "scam" ? "active" : ""}`}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(239,68,68,0.15)" }}>
              <Ban className="w-5 h-5" style={{ color: "#ef4444" }} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Scam Report Action</h3>
              <p className="text-xs" style={{ color: "#a3a3a3" }}>Listing: "Cheap House Ngong"</p>
            </div>
          </div>
          <div className="mb-5" style={{ background: "rgba(239,68,68,0.05)", borderRadius: "16px", padding: "14px" }}>
            <p className="text-sm" style={{ color: "#ef4444" }}>This listing has been flagged by 3 users as potentially fraudulent.</p>
          </div>
          <div className="space-y-2">
            <button onClick={() => { closeSheet(); setTimeout(() => { deleteListingAdmin("placeholder").catch(() => {}); showSnackbar("✅ Listing taken down and reported to authorities", "success"); }, 300); }} className="btn-primary w-full text-center ripple-container" style={{ padding: "14px", fontSize: "15px" }}>Take Down Listing</button>
            <button onClick={() => { closeSheet(); setTimeout(() => { flagListing("placeholder").catch(() => {}); showSnackbar("Listing flagged for review by senior admin", "info"); }, 300); }} className="btn-ghost w-full text-center ripple-container" style={{ padding: "14px", fontSize: "15px" }}>Flag for Review</button>
            <button onClick={() => { closeSheet(); setTimeout(() => showSnackbar("Dismissed — report marked as resolved", "info"), 300); }} className="w-full text-center" style={{ background: "transparent", border: "none", padding: "14px", fontSize: "14px", color: "#525252", cursor: "pointer" }}>Dismiss Report</button>
          </div>
        </div>
      </div>

      {/* -- MANAGE LOCATIONS SHEET -- */}
      <div className={`bottom-sheet ${activeSheet === "locations" ? "active" : ""}`} style={{ maxHeight: "90dvh" }}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Manage Locations</h3>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: "rgba(4,120,87,0.15)", color: "#059669" }}>47 Counties</span>
          </div>
          <div className="space-y-4">
            {LOCATIONS_DATA.map((loc) => (
              <div key={loc.county}>
                <p className="text-xs font-semibold mb-2" style={{ color: "#a3a3a3" }}>{loc.county}</p>
                <div className="flex flex-wrap gap-2">
                  {loc.estates.map((estate) => (
                    <span key={estate} className="text-xs font-medium px-3 py-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.05)", color: "#e5e5e5" }}>{estate}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => { closeSheet(); closeSheet(); router.push("/admin/settings"); }} className="btn-ghost w-full text-center mt-4">Manage in Settings</button>
        </div>
      </div>

      {/* -- SUBSCRIPTION PLANS SHEET -- */}
      <div className={`bottom-sheet ${activeSheet === "plans" ? "active" : ""}`} style={{ maxHeight: "90dvh" }}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-8">
          <h3 className="text-lg font-bold text-white mb-4">Subscription Plans</h3>
          <div className="space-y-3">
            {PLANS_DATA.map((plan) => (
              <div key={plan.name} className="rounded-xl p-4" style={{ border: `1.5px solid ${plan.popular ? "rgba(4,120,87,0.4)" : "rgba(255,255,255,0.08)"}`, background: plan.popular ? "rgba(4,120,87,0.05)" : "rgba(255,255,255,0.03)" }}>
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
          <div className="mt-3 p-3 rounded-xl" style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.12)" }}>
            <p className="text-xs" style={{ color: "#eab308" }}><span className="font-semibold">Boost Pricing:</span> 7d = KSh 1,500 · 14d = KSh 2,500 · 30d = KSh 4,000</p>
          </div>
        </div>
      </div>

      {/* -- ADMIN USERS SHEET -- */}
      <div className={`bottom-sheet ${activeSheet === "admin-users" ? "active" : ""}`}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-8">
          <h3 className="text-lg font-bold text-white mb-4">Admin Users</h3>
          <div className="space-y-2">
            {ADMIN_USERS.map((admin) => (
              <div key={admin.name} className="flex items-center gap-3 p-3.5 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: `linear-gradient(135deg, ${admin.color}, ${admin.color}dd)`, color: "white" }}>
                  {admin.init}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">{admin.name}</p>
                  <p className="text-xs" style={{ color: "#525252" }}>{admin.email} · {admin.role}</p>
                </div>
                {admin.badge && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-md" style={{ background: "rgba(4,120,87,0.15)", color: "#059669" }}>{admin.badge}</span>
                )}
              </div>
            ))}
          </div>
          <button onClick={() => { closeSheet(); closeSheet(); router.push("/admin/settings"); }} className="btn-ghost w-full text-center mt-4">Manage in Settings</button>
        </div>
      </div>

      {/* -- AUDIT LOGS SHEET -- */}
      <div className={`bottom-sheet ${activeSheet === "audit-logs" ? "active" : ""}`} style={{ maxHeight: "90dvh" }}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Audit Logs</h3>
            <button onClick={() => showSnackbar("Audit log exported", "success")} className="text-xs font-medium px-3 py-1.5 rounded-lg" style={{ background: "rgba(4,120,87,0.15)", color: "#059669" }}>Export</button>
          </div>
          {/* Filter chips */}
          <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
            {AUDIT_TYPES.map((t) => (
              <button key={t.key} onClick={() => setAuditFilter(t.key)}
                className="filter-chip" style={{ background: auditFilter === t.key ? "rgba(4,120,87,0.15)" : "rgba(255,255,255,0.03)", borderColor: auditFilter === t.key ? "rgba(4,120,87,0.3)" : "rgba(255,255,255,0.08)", color: auditFilter === t.key ? "#059669" : "#a3a3a3" }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="px-5 pb-8 space-y-1">
          {filteredLogs.map((log, i) => {
            const LogIcon = AUDIT_LOG_ICONS[log.type] || ScrollText;
            return (
              <div key={i} className="flex items-start gap-3 py-3" style={{ borderBottom: i < filteredLogs.length - 1 ? "1px solid rgba(255,255,255,0.04)" : undefined }}>                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${AUDIT_LOG_COLORS[log.type]}15` }}>
                    <LogIcon className="w-4 h-4" style={{ color: AUDIT_LOG_COLORS[log.type] }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-white">{log.action}</p>
                    <span className="text-xs" style={{ color: "#525252" }}>{log.time}</span>
                  </div>
                  <p className="text-xs" style={{ color: "#a3a3a3" }}>{log.user} · {log.target}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ──────────── SNACKBAR ──────────── */}
      <div id="snackbar" className={`snackbar ${snackbar.visible ? "show" : "hide"}`}>
        <div className="flex items-center gap-3">
          <div id="snackbar-icon">
            {snackbar.type === "success" && (
              <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(4,120,87,0.2)" }}>
                <Check className="w-3.5 h-3.5" style={{ color: "#059669" }} />
              </div>
            )}
            {snackbar.type === "error" && (
              <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(239,68,68,0.2)" }}>
                <X className="w-3.5 h-3.5" style={{ color: "#ef4444" }} />
              </div>
            )}
            {snackbar.type === "info" && (
              <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(59,130,246,0.2)" }}>
                <Info className="w-3.5 h-3.5" style={{ color: "#3b82f6" }} />
              </div>
            )}
          </div>
          <span id="snackbar-text" className="text-sm font-medium text-white">{snackbar.message}</span>
        </div>
      </div>
    </div>
  );
}

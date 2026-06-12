import React from "react";
import {
  Clock,
  AlertTriangle,
  CreditCard,
  UserPlus,
  Headset,
  MapPin,
  Crown,
  Shield,
  Megaphone,
  ScrollText,
  CheckCircle,
  XCircle,
  Ban,
  ShieldCheck,
  Star,
} from "lucide-react";
import type { SheetKey } from "./types";
import type { ActivityItem } from "./types";

// ─── CHART_DATA ──────────────────────────────────────────────────────────────

export interface ChartDay {
  day: string;
  height: number;
  highlight?: boolean;
}

export const CHART_DATA: ChartDay[] = [
  { day: "Mon", height: 0 },
  { day: "Tue", height: 0 },
  { day: "Wed", height: 0 },
  { day: "Thu", height: 0 },
  { day: "Fri", height: 0 },
  { day: "Sat", height: 0, highlight: true },
  { day: "Sun", height: 0 },
];

// ─── DEFAULT ACTIVITIES ─────────────────────────────────────────────────────

export const defaultActivities: ActivityItem[] = [
  {
    icon: UserPlus,
    color: "#059669",
    bg: "rgba(4,120,87,0.15)",
    text: (<><span className="font-semibold">Platform</span> monitoring dashboard</>),
    time: "Active",
  },
];

// ─── REJECT_REASONS ─────────────────────────────────────────────────────────

export const REJECT_REASONS: string[] = [
  "Incomplete information",
  "Misleading photos",
  "Suspicious pricing",
  "Duplicate listing",
  "Inappropriate content",
  "Location mismatch",
];

// ─── NOTIFICATIONS ──────────────────────────────────────────────────────────

export interface NotificationItem {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  bg: string;
  border: string;
  text: string;
  time: string;
  unread: boolean;
}

export const NOTIFICATIONS: NotificationItem[] = [
  {
    icon: Clock,
    iconBg: "rgba(4,120,87,0.2)",
    iconColor: "#059669",
    bg: "rgba(4,120,87,0.08)",
    border: "rgba(4,120,87,0.15)",
    text: "14 listings pending approval",
    time: "2 minutes ago",
    unread: true,
  },
  {
    icon: AlertTriangle,
    iconBg: "rgba(239,68,68,0.2)",
    iconColor: "#ef4444",
    bg: "rgba(239,68,68,0.05)",
    border: "transparent",
    text: 'Scam report on "Cheap House Ngong"',
    time: "2 hours ago",
    unread: true,
  },
  {
    icon: CreditCard,
    iconBg: "rgba(59,130,246,0.15)",
    iconColor: "#3b82f6",
    bg: "transparent",
    border: "transparent",
    text: "KSh 45,800 in commissions collected today",
    time: "5 hours ago",
    unread: false,
  },
  {
    icon: UserPlus,
    iconBg: "rgba(168,85,247,0.15)",
    iconColor: "#a855f7",
    bg: "transparent",
    border: "transparent",
    text: "8 new landlords registered today",
    time: "Today",
    unread: false,
  },
];

// ─── MENU_ITEMS ─────────────────────────────────────────────────────────────

export type MenuItem =
  | { icon: React.ElementType; label: string; onClick: "nav-support" }
  | { icon: React.ElementType; label: string; sheet: SheetKey };

export const MENU_ITEMS: MenuItem[] = [
  { icon: Headset, label: "Support & Disputes", onClick: "nav-support" as const },
  { icon: MapPin, label: "Manage Locations", sheet: "locations" as SheetKey },
  { icon: Crown, label: "Subscription Plans", sheet: "plans" as SheetKey },
  { icon: Shield, label: "Admin Users", sheet: "admin-users" as SheetKey },
  { icon: Megaphone, label: "Send Broadcast", sheet: "broadcast" as SheetKey },
  { icon: ScrollText, label: "Audit Logs", sheet: "audit-logs" as SheetKey },
];

// ─── LOCATIONS_DATA ─────────────────────────────────────────────────────────

export interface LocationCounty {
  county: string;
  estates: string[];
}

export const LOCATIONS_DATA: LocationCounty[] = [
  { county: "NAIROBI COUNTY", estates: ["Kilimani", "Westlands", "Karen", "Runda", "Roysambu", "Kasarani", "Langata", "South B", "South C"] },
  { county: "MOMBASA COUNTY", estates: ["Nyali", "Bamburi", "Likoni"] },
  { county: "KAJIADO COUNTY", estates: ["Ongata Rongai", "Kitengela"] },
];

// ─── PLANS_DATA ─────────────────────────────────────────────────────────────

export interface PlanItem {
  name: string;
  price: string;
  users: string;
  color: string;
  popular: boolean;
  features: string[];
}

export const PLANS_DATA: PlanItem[] = [
  { name: "Free", price: "0", users: "1,245", color: "#9ca3af", popular: false, features: ["1 Property", "5 Photos", "Basic Support"] },
  { name: "Basic", price: "999", users: "89", color: "#3b82f6", popular: false, features: ["5 Properties", "10 Photos", "Priority Support"] },
  { name: "Premium", price: "2,999", users: "89", color: "#059669", popular: true, features: ["Unlimited Properties", "20 Photos", "Featured Badge", "Boost Discount"] },
];

// ─── ADMIN_USERS ────────────────────────────────────────────────────────────

export interface AdminUserItem {
  init: string;
  name: string;
  email: string;
  role: string;
  badge: string | null;
  color: string;
}

export const ADMIN_USERS: AdminUserItem[] = [
  { init: "AK", name: "Admin Ke", email: "admin@rentke.co.ke", role: "Super Admin", badge: "Owner", color: "#047857" },
  { init: "BM", name: "Brian Mwangi", email: "brian@rentke.co.ke", role: "Moderator", badge: null, color: "#3b82f6" },
  { init: "WK", name: "Wanjiru Kamau", email: "wanjiru@rentke.co.ke", role: "Support", badge: null, color: "#a855f7" },
];

// ─── AUDIT_LOGS ─────────────────────────────────────────────────────────────

export type AuditLogType = "approve" | "reject" | "suspend" | "scam" | "broadcast" | "verify" | "refund" | "feature";

export interface AuditLogItem {
  action: string;
  user: string;
  target: string;
  time: string;
  type: AuditLogType;
}

export const AUDIT_LOGS: AuditLogItem[] = [
  { action: "Listing approved", user: "Admin Ke", target: "2BR Kilimani", time: "10 min ago", type: "approve" },
  { action: "Landlord suspended", user: "Admin Ke", target: "Peter Ochieng", time: "1h ago", type: "suspend" },
  { action: "Listing rejected", user: "Brian M.", target: "Studio Westlands", time: "2h ago", type: "reject" },
  { action: "Scam report actioned", user: "Admin Ke", target: "Cheap House Ngong", time: "3h ago", type: "scam" },
  { action: "Broadcast sent", user: "Admin Ke", target: "All Landlords", time: "5h ago", type: "broadcast" },
  { action: "ID verified", user: "Wanjiru K.", target: "Jane Wambui", time: "6h ago", type: "verify" },
  { action: "Payment refunded", user: "Admin Ke", target: "KSh 1,500 Boost", time: "1d ago", type: "refund" },
  { action: "Listing featured", user: "Brian M.", target: "4BR Karen", time: "1d ago", type: "feature" },
];

// ─── AUDIT TYPE FILTERS ─────────────────────────────────────────────────────

export interface AuditTypeFilter {
  key: AuditLogType | "all";
  label: string;
}

export const AUDIT_TYPES: AuditTypeFilter[] = [
  { key: "all", label: "All" },
  { key: "approve", label: "Approvals" },
  { key: "reject", label: "Rejections" },
  { key: "suspend", label: "Suspensions" },
  { key: "verify", label: "Verifications" },
];

// ─── AUDIT COLORS & ICONS ───────────────────────────────────────────────────

export const AUDIT_LOG_COLORS: Record<AuditLogType, string> = {
  approve: "#059669",
  reject: "#ef4444",
  suspend: "#eab308",
  scam: "#a855f7",
  broadcast: "#3b82f6",
  verify: "#059669",
  refund: "#3b82f6",
  feature: "#a855f7",
};

export const AUDIT_LOG_ICONS: Record<AuditLogType, React.ElementType> = {
  approve: CheckCircle,
  reject: XCircle,
  suspend: Ban,
  scam: AlertTriangle,
  broadcast: Megaphone,
  verify: ShieldCheck,
  refund: CreditCard,
  feature: Star,
};

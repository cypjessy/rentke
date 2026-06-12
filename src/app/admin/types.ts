import React from "react";

// ─── Page & Sheet Keys ───────────────────────────────────────────────────────

export type PageKey = "dashboard" | "landlords" | "listings" | "wallet" | "settings";

export type SheetKey =
  | "notifications"
  | "menu"
  | "reject"
  | "detail"
  | "revenue"
  | "disputes"
  | "broadcast"
  | "scam"
  | "locations"
  | "plans"
  | "admin-users"
  | "audit-logs";

// ─── Activity Types ──────────────────────────────────────────────────────────

export interface ActivityAction {
  sheet: SheetKey;
  bg: string;
  color: string;
  label: string;
}

export interface ActivityItem {
  icon: React.ElementType;
  color: string;
  bg: string;
  text: React.ReactNode;
  time: string;
  action?: ActivityAction;
}

// ─── Approval Types ──────────────────────────────────────────────────────────

export interface ApprovalItem {
  id: string;
  name: string;
  title: string;
  landlord: string;
  price: string;
  submitted: string;
  image: string;
}

// ─── Snackbar Types ──────────────────────────────────────────────────────────

export type SnackbarType = "success" | "error" | "info";

export interface SnackbarState {
  message: string;
  type: SnackbarType;
  visible: boolean;
}

// ─── Broadcast Types ─────────────────────────────────────────────────────────

export type BroadcastTarget = "landlords" | "tenants";
export type BroadcastChannel = "sms" | "email" | "push";

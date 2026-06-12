"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  BellOff,
  ArrowLeft,
  Trash2,
  CheckCheck,
  X,
  Settings,
} from "lucide-react";
import { useBrowse } from "../BrowseContext";
import { useAuth } from "../../AuthContext";
import {
  listenToNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  clearAllNotifications,
  getNotificationMeta,
  getNotificationLink,
  type NotificationData,
} from "@/lib/notifications";

// ---- Time Helpers ----
function formatNotifTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  if (hours < 48) return "Yesterday";
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return date.toLocaleDateString("en", { month: "short", day: "numeric" });
}

// ---- Grouping ----
type GroupLabel = "Today" | "Yesterday" | "This Week" | "Earlier";

function groupNotifications(notifs: NotificationData[]): { label: GroupLabel; items: NotificationData[] }[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const groups: Record<GroupLabel, NotificationData[]> = {
    Today: [],
    Yesterday: [],
    "This Week": [],
    Earlier: [],
  };

  notifs.forEach((n) => {
    if (!n.createdAt) {
      groups.Earlier.push(n);
      return;
    }
    const d = n.createdAt.toDate();
    if (d >= today) groups.Today.push(n);
    else if (d >= yesterday) groups.Yesterday.push(n);
    else if (d >= weekAgo) groups["This Week"].push(n);
    else groups.Earlier.push(n);
  });

  return (Object.entries(groups) as [GroupLabel, NotificationData[]][])
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }));
}

export default function NotificationsPage() {
  const router = useRouter();
  const { showSnackbar } = useBrowse();
  const { user } = useAuth();

  // ---- State ----
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");
  const [swipedId, setSwipedId] = useState<string | null>(null);

  // ---- Firestore Listener ----
  useEffect(() => {
    if (!user) return;
    const unsub = listenToNotifications(
      user.uid,
      (data) => {
        setNotifications(data);
        setLoading(false);
      },
      (err) => {
        console.error("Notifications listener error:", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [user]);

  // ---- Derived ----
  const unreadCount = notifications.filter((n) => !n.read).length;
  const displayNotifs = activeTab === "unread"
    ? notifications.filter((n) => !n.read)
    : notifications;
  const grouped = groupNotifications(displayNotifs);

  // ---- Handlers ----
  const handleTap = async (notif: NotificationData) => {
    // Mark as read
    if (!notif.read) {
      await markNotificationRead(notif.id).catch(() => {});
    }
    // Navigate
    const path = notif.link || getNotificationLink(notif.type);
    router.push(path);
  };

  const handleMarkAllRead = async () => {
    if (!user) return;
    try {
      await markAllNotificationsRead(user.uid);
      showSnackbar("All notifications marked as read", "success");
    } catch {
      showSnackbar("Failed to mark as read", "error");
    }
  };

  const handleDelete = async (notifId: string) => {
    try {
      await deleteNotification(notifId);
      showSnackbar("Notification dismissed", "info");
    } catch {
      showSnackbar("Failed to delete notification", "error");
    }
    setSwipedId(null);
  };

  const handleClearAll = async () => {
    if (!user) return;
    try {
      await clearAllNotifications(user.uid);
      showSnackbar("All notifications cleared", "success");
    } catch {
      showSnackbar("Failed to clear notifications", "error");
    }
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        position: "relative",
        overflowX: "hidden",
      }}
    >
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
        className="px-5 pt-4 pb-2 flex items-center justify-between"
        style={{ animation: "slideInUp 0.4s ease" }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/browse")}
            className="w-10 h-10 rounded-full flex items-center justify-center ripple-container"
            style={{ background: "rgba(255,255,255,0.05)" }}
          >
            <ArrowLeft className="w-5 h-5" style={{ color: "#e5e5e5" }} />
          </button>
          <h1 className="text-2xl font-bold text-white">Notifications</h1>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="w-10 h-10 rounded-full flex items-center justify-center ripple-container relative"
              style={{ background: "rgba(4,120,87,0.15)" }}
              title="Mark all as read"
            >
              <CheckCheck className="w-5 h-5" style={{ color: "#047857" }} />
            </button>
          )}
          <button
            onClick={() => router.push("/browse/profile")}
            className="w-10 h-10 rounded-full flex items-center justify-center ripple-container"
            style={{ background: "rgba(255,255,255,0.05)" }}
          >
            <Settings className="w-5 h-5" style={{ color: "#e5e5e5" }} />
          </button>
        </div>
      </header>

      {/* ====== SUBHEADER ====== */}
      <div
        className="px-5 py-3 flex items-center justify-between"
        style={{ animation: "slideInUp 0.45s ease" }}
      >
        <div className="flex items-center gap-1">
          <Bell className="w-4 h-4" style={{ color: "#047857" }} />
          <span className="text-sm" style={{ color: "#a3a3a3" }}>
            {loading ? "Loading..." : `${unreadCount} unread`}
          </span>
        </div>
        {notifications.length > 10 && (
          <button
            onClick={handleClearAll}
            className="text-xs font-semibold flex items-center gap-1"
            style={{ color: "#ef4444" }}
          >
            <Trash2 className="w-3 h-3" />
            Clear all
          </button>
        )}
      </div>

      {/* ====== TABS ====== */}
      <div
        className="flex gap-2 px-5 mb-3"
        style={{ animation: "slideInUp 0.5s ease" }}
      >
        {[
          { key: "all", label: "All", count: notifications.length },
          { key: "unread", label: "Unread", count: unreadCount },
        ].map((tab) => (
          <button
            key={tab.key}
            className={`filter-chip ${activeTab === tab.key ? "active" : ""}`}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
          >
            {tab.label}
            <span className="count">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* ====== NOTIFICATIONS LIST ====== */}
      <div className="px-2 pb-24" style={{ animation: "slideInUp 0.55s ease" }}>
        {loading ? (
          <div className="space-y-3 px-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-4 rounded-2xl"
                style={{ background: "rgba(255,255,255,0.03)" }}
              >
                <div
                  className="w-10 h-10 rounded-full flex-shrink-0"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                />
                <div className="flex-1 space-y-2">
                  <div
                    className="h-3 rounded-full w-3/4"
                    style={{ background: "rgba(255,255,255,0.05)" }}
                  />
                  <div
                    className="h-2 rounded-full w-1/2"
                    style={{ background: "rgba(255,255,255,0.03)" }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : displayNotifs.length === 0 ? (
          /* ====== EMPTY STATE ====== */
          <div className="text-center py-20 px-4">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
              style={{ background: "rgba(255,255,255,0.03)" }}
            >
              {activeTab === "unread" ? (
                <CheckCheck className="w-9 h-9" style={{ color: "#047857" }} />
              ) : (
                <BellOff className="w-9 h-9" style={{ color: "#525252" }} />
              )}
            </div>
            <h3 className="text-lg font-bold text-white mb-2">
              {activeTab === "unread" ? "All caught up!" : "No notifications"}
            </h3>
            <p className="text-sm mb-6" style={{ color: "#a3a3a3" }}>
              {activeTab === "unread"
                ? "You have no unread notifications. Check back later for updates."
                : "When you get notifications about listings, messages, and viewings, they'll appear here."}
            </p>
            {activeTab === "unread" && (
              <button
                onClick={() => setActiveTab("all")}
                className="px-6 py-3 rounded-xl text-sm font-semibold ripple-container"
                style={{
                  background: "rgba(4,120,87,0.1)",
                  color: "#34d399",
                  border: "1px solid rgba(4,120,87,0.2)",
                }}
              >
                View all notifications
              </button>
            )}
          </div>
        ) : (
          grouped.map((group) => (
            <div key={group.label}>
              <p
                className="text-xs font-semibold uppercase tracking-wider px-3 mb-2 mt-4 first:mt-0"
                style={{ color: "#525252" }}
              >
                {group.label}
              </p>
              {group.items.map((notif) => {
                const meta = getNotificationMeta(notif.type);
                return (
                  <div
                    key={notif.id}
                    className="relative"
                    onMouseLeave={() => setSwipedId(null)}
                  >
                    {/* Swipe-delete action overlay */}
                    {swipedId === notif.id && (
                      <div
                        className="absolute inset-y-0 right-0 flex items-center z-10"
                        style={{ animation: "slideInRight 0.2s ease" }}
                      >
                        <button
                          onClick={() => handleDelete(notif.id)}
                          className="h-full px-5 rounded-l-2xl flex items-center justify-center"
                          style={{ background: "#ef4444" }}
                        >
                          <Trash2 className="w-5 h-5 text-white" />
                        </button>
                      </div>
                    )}
                    <div
                      className={`flex items-start gap-3 p-4 rounded-2xl mb-1 ripple-container transition-all duration-200 ${
                        swipedId === notif.id ? "translate-x-[-72px]" : ""
                      }`}
                      style={{
                        background: notif.read
                          ? "transparent"
                          : "rgba(4,120,87,0.05)",
                        borderLeft: notif.read
                          ? "none"
                          : "3px solid #047857",
                        cursor: "pointer",
                        transform: swipedId === notif.id
                          ? "translateX(-72px)"
                          : "translateX(0)",
                      }}
                      onClick={() => handleTap(notif)}
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                        style={{ background: meta.iconBg }}
                      >
                        <span>{meta.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={`text-sm ${
                              notif.read ? "font-medium" : "font-bold"
                            } text-white`}
                          >
                            {notif.title}
                          </p>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <span
                              className="text-xs whitespace-nowrap"
                              style={{ color: "#525252" }}
                            >
                              {notif.createdAt
                                ? formatNotifTime(notif.createdAt.toDate())
                                : ""}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSwipedId(
                                  swipedId === notif.id ? null : notif.id
                                );
                              }}
                              className="p-1 rounded-full"
                            >
                              <X
                                className="w-3.5 h-3.5"
                                style={{ color: "#525252" }}
                              />
                            </button>
                          </div>
                        </div>
                        <p
                          className="text-xs mt-0.5 line-clamp-2"
                          style={{ color: "#a3a3a3" }}
                        >
                          {notif.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

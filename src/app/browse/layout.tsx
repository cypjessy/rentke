"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Search,
  Heart,
  MessageCircle,
  Menu,
  User,
  CalendarDays,
  Compass,
  X as XIcon,
  Check,
  X,
  Info,
} from "lucide-react";
import { BrowseProvider, useBrowse, type SnackbarType, type RecentView } from "./BrowseContext";
import PropertyDetailSheet from "./PropertyDetailSheet";
import { useAuth } from "../AuthContext";

const navItems = [
  { key: "home", label: "Home", icon: Home, path: "/browse" },
  { key: "explore", label: "Explore", icon: Compass, path: "/browse/explore" },
  { key: "saved", label: "Saved", icon: Heart, path: "/browse/saved" },
  { key: "messages", label: "Messages", icon: MessageCircle, path: "/browse/messages" },
  { key: "more", label: "More", icon: Menu, path: null },
];

const EXTRA_SECTIONS = [
  {
    title: "Account",
    items: [
      { icon: Home, label: "My Unit", desc: "Your rental & payments", color: "#3b82f6", bg: "rgba(59,130,246,0.12)", path: "/browse/my-unit" },
      { icon: User, label: "Profile", desc: "Your profile & settings", color: "#047857", bg: "rgba(4,120,87,0.12)", path: "/browse/profile" },
    ]
  },
  {
    title: "Activity",
    items: [
      { icon: CalendarDays, label: "Viewings", desc: "Scheduled visits", color: "#eab308", bg: "rgba(234,179,8,0.12)", path: "/browse/viewings" },
    ],
  },
];

function BrowseShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { role } = useAuth();
  const { showSnackbar: ctxShowSnackbar, closePropertyDetail, propertyDetail, unreadMessageCount } = useBrowse();
  const [moreOpen, setMoreOpen] = useState(false);

  // Role check: redirect landlords to dashboard
  useEffect(() => {
    if (role === "landlord") {
      router.replace("/dashboard");
    }
  }, [role, router]);

  // ---- Snackbar (local display) ----
  const [snackbar, setSnackbar] = useState<{ show: boolean; message: string; type: SnackbarType }>({ show: false, message: "", type: "info" });
  const snackbarTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarAnimClass, setSnackbarAnimClass] = useState("");

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

  const hideSnackbar = () => setSnackbar({ show: false, message: "", type: "info" });

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

  // Listen for snackbar from context
  const [lastSnackbarCall, setLastSnackbarCall] = useState(0);
  const origShow = useRef(ctxShowSnackbar);

  useEffect(() => {
    // Intercept context snackbar to show in layout
    const handler = (msg: string, type?: SnackbarType) => {
      setSnackbar({ show: true, message: msg, type: type || "info" });
      if (snackbarTimeoutRef.current) clearTimeout(snackbarTimeoutRef.current);
      snackbarTimeoutRef.current = setTimeout(() => {
        setSnackbar({ show: false, message: "", type: "info" });
      }, 3500);
    };
    // Patch - use the global snackbar that layout provides
    const interval = setInterval(() => {
      setLastSnackbarCall((p) => p + 1);
    }, 60000);
    return () => clearInterval(interval);
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

  return (
    <div
      className="flex flex-col h-dvh"
      style={{
        background: "#050505",
        color: "#e5e5e5",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden pb-20">
        {children}
      </div>

      {/* ====== PROPERTY DETAIL ====== */}
      <PropertyDetailSheet
        isOpen={propertyDetail.isOpen}
        property={propertyDetail.property}
        onClose={closePropertyDetail}
      />

      {/* ====== BOTTOM NAVIGATION ====== */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50"
        style={{
          background: "rgba(10,10,10,0.95)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderTop: "1px solid rgba(255,255,255,0.05)",
          paddingBottom: "max(8px, env(safe-area-inset-bottom))",
        }}
      >
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => {
            const isActive = item.key === "explore"
              ? pathname.startsWith("/browse/explore") || pathname.startsWith("/browse/area")
              : item.key === "more"
                ? false
                : pathname === item.path;
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={() => {
                  if (item.key === "more") {
                    setMoreOpen(true);
                  } else if (item.path) {
                    router.push(item.path);
                  }
                }}
                className="flex flex-col items-center gap-1 px-3 relative"
                style={{ color: isActive ? "#047857" : "#525252", fontSize: "10px", fontWeight: 500 }}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {item.label === "Messages" && unreadMessageCount > 0 && (
                    <div
                      className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 rounded-full flex items-center justify-center"
                      style={{
                        background: "#ef4444",
                        fontSize: "9px",
                        fontWeight: 700,
                        color: "white",
                        padding: "0 4px",
                      }}
                    >
                      {unreadMessageCount > 99 ? "99+" : unreadMessageCount}
                    </div>
                  )}
                </div>
                <span>{item.label}</span>
                {isActive && (
                  <div
                    className="w-1 h-1 rounded-full absolute -top-0.5"
                    style={{ background: "#047857" }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* ====== MORE SHEET OVERLAY ====== */}
      <div
        className={`sheet-overlay ${moreOpen ? "active" : ""}`}
        onClick={() => setMoreOpen(false)}
      />

      {/* ====== MORE SHEET ====== */}
      <div className={`bottom-sheet ${moreOpen ? "active" : ""}`}>
        <div className="sheet-handle" />

        <div className="px-3 pt-5 pb-2">
          <div className="flex items-center justify-between mb-1">              <h3 className="text-lg font-bold text-white">More</h3>
            <button
              onClick={() => setMoreOpen(false)}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              <XIcon className="w-4 h-4" style={{ color: "#a3a3a3" }} />
            </button>
          </div>
          <p className="text-xs" style={{ color: "#a3a3a3" }}>
            Browse, payments &amp; account tools
          </p>
        </div>

        <div className="px-3 pb-8 space-y-6">
          {EXTRA_SECTIONS.map((section) => (
            <div key={section.title}>
              {/* Section Header */}
              <div className="flex items-center gap-2 px-2 mb-3">
                <div
                  className="w-1 h-4 rounded-full"
                  style={{ background: section.items[0]?.color || "#525252" }}
                />
                <span
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "#525252" }}
                >
                  {section.title}
                </span>
              </div>

              {/* Grid Items */}
              <div className="grid grid-cols-3 gap-2">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.label}
                      onClick={() => {
                        setMoreOpen(false);
                        if (item.path) {
                          setTimeout(() => router.push(item.path), 200);
                        }
                      }}
                      className="flex flex-col items-center gap-2 p-3.5 rounded-2xl transition-all duration-150 active:scale-95"
                      style={{ background: "rgba(255,255,255,0.02)" }}
                    >
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center"
                        style={{ background: item.bg }}
                      >
                        <Icon className="w-5 h-5" style={{ color: item.color }} />
                      </div>
                      <span className="text-xs font-medium text-center leading-tight text-white">
                        {item.label}
                      </span>
                    </button>
                  );
                })}
                {/* Pad empty slots to keep alignment */}
                {section.items.length < 3 &&
                  Array.from({ length: 3 - section.items.length }).map((_, i) => (
                    <div key={`spacer-${i}`} className="invisible" />
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ====== SNACKBAR ====== */}
      {snackbarVisible && (
        <div className={`snackbar ${snackbarAnimClass}`} style={{ bottom: "96px" }}>
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

export default function BrowseLayout({ children }: { children: React.ReactNode }) {
  return (
    <BrowseProvider>
      <BrowseShell>{children}</BrowseShell>
    </BrowseProvider>
  );
}

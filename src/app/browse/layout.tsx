"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Search,
  Heart,
  MessageCircle,
  User,
  Check,
  X,
  Info,
} from "lucide-react";
import { BrowseProvider, useBrowse, type SnackbarType, type RecentView } from "./BrowseContext";
import PropertyDetailSheet from "./PropertyDetailSheet";

const navItems = [
  { label: "Home", icon: Home, path: "/browse" },
  { label: "Explore", icon: Search, path: "/browse/explore" },
  { label: "Saved", icon: Heart, path: "/browse/saved" },
  { label: "Messages", icon: MessageCircle, path: "/browse/messages" },
  { label: "Profile", icon: User, path: "/browse/profile" },
];

function BrowseShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { showSnackbar: ctxShowSnackbar, closePropertyDetail, propertyDetail, unreadMessageCount } = useBrowse();

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
      className="flex flex-col min-h-dvh"
      style={{ background: "#050505", color: "#e5e5e5", overflowX: "hidden" }}
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
            const isActive = pathname === item.path;
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={() => router.push(item.path)}
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

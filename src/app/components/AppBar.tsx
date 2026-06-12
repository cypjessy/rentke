"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
export interface AppBarAction {
  icon: React.ElementType;
  onClick?: () => void;
  /** Shows a small dot indicator (e.g. notification badge) */
  dot?: boolean;
  /** Color of the dot (defaults to #ef4444 red for notifications) */
  dotColor?: string;
  /** Active state — applies green tint to background/icon */
  active?: boolean;
}

export interface AppBarProps {
  /** Primary title text */
  title?: string;
  /** Optional subtitle shown below the title */
  subtitle?: string;
  /** If set, shows a back button that navigates to this route */
  backHref?: string;
  /** Custom back handler (takes precedence over backHref) */
  onBack?: () => void;
  /** Actions rendered on the right side */
  actions?: AppBarAction[];
  /**
   * Avatar mode — replaces the title/subtitle with an avatar + greeting layout.
   * Used for pages like Dashboard that show "Good morning, Admin Ke".
   */
  avatar?: {
    initials: string;
    name: string;
    /** e.g. "Good morning" */
    topLine: string;
    /** Gradient CSS, defaults to emerald */
    gradient?: string;
  };
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function AppBar({
  title,
  subtitle,
  backHref,
  onBack,
  actions = [],
  avatar,
}: AppBarProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (backHref) {
      router.push(backHref);
    }
  };

  const showBack = Boolean(backHref || onBack);

  return (
    <div
      className="sticky top-0 z-40"
      style={{
        background: "rgba(5,5,5,0.9)",
        backdropFilter: "blur(20px)",
      }}
    >
      <div className="flex items-center justify-between px-5 py-4">
        {/* ── Left section ── */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Back button */}
          {showBack && (
            <button
              onClick={handleBack}
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ripple-container"
              style={{ background: "rgba(255,255,255,0.05)" }}
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" style={{ color: "#a3a3a3" }} />
            </button>
          )}

          {/* Avatar mode (Dashboard-style) */}
          {avatar ? (
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background:
                    avatar.gradient ||
                    "linear-gradient(135deg, #047857, #059669)",
                }}
              >
                <span className="text-sm font-bold text-white">
                  {avatar.initials}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-xs" style={{ color: "#a3a3a3" }}>
                  {avatar.topLine}
                </p>
                <h2 className="text-base font-bold text-white truncate -mt-0.5">
                  {avatar.name}
                </h2>
              </div>
            </div>
          ) : (
            /* Title mode */
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-white truncate">
                {title}
              </h1>
              {subtitle && (
                <p
                  className="text-xs truncate"
                  style={{ color: "#a3a3a3" }}
                >
                  {subtitle}
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Right actions ── */}
        {actions.length > 0 && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {actions.map((action, index) => {
              const Icon = action.icon;
              return (
                <button
                  key={index}
                  onClick={action.onClick}
                  className="w-10 h-10 rounded-full flex items-center justify-center relative ripple-container"
                  style={{
                    background: action.active
                      ? "rgba(4,120,87,0.15)"
                      : "rgba(255,255,255,0.05)",
                  }}
                  aria-label="Action"
                >
                  <Icon
                    className="w-5 h-5"
                    style={{
                      color: action.active ? "#059669" : "#a3a3a3",
                    }}
                  />
                  {action.dot && (
                    <div
                      className="absolute"
                      style={{
                        top: "6px",
                        right: "6px",
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: action.dotColor || "#ef4444",
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

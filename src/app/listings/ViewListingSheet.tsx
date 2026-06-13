"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  X as XIcon,
  Zap,
  Pencil,
  TrendingUp,
  TrendingDown,
  Smartphone,
  Heart,
  MessageCircle,
  Eye,
  Crown,
  CalendarDays,
  Activity,
} from "lucide-react";
import type { ListingData } from "../../lib/listings";
import type { PropertyData } from "../../lib/properties";
import { getListingImage } from "../../lib/resolveImages";
import { PLACEHOLDER_IMAGE } from "../constants";

type DetailTab = "overview" | "analytics" | "activity";

interface ViewListingSheetProps {
  isOpen: boolean;
  onClose: () => void;
  listing: ListingData | null;
  onEdit: () => void;
  onBoost: () => void;
  onPause: () => void;
  onResume: () => void;
  onDelete: () => void;
  onRenew: () => void;
  properties: PropertyData[];
}

export default function ViewListingSheet({
  isOpen,
  onClose,
  listing,
  onEdit,
  onBoost,
  onPause,
  onResume,
  onDelete,
  onRenew,
  properties,
}: ViewListingSheetProps) {
  const router = useRouter();
  const [activeDetailTab, setActiveDetailTab] = useState<DetailTab>("overview");

  // Reset tab when opening
  useEffect(() => {
    if (isOpen) {
      setActiveDetailTab("overview");
    }
  }, [isOpen]);

  if (!isOpen || !listing) return null;

  const sl = listing;

  const getStatusChip = (status: string) => {
    switch (status) {
      case "active":
        return { bg: "rgba(4,120,87,0.9)", color: "white", label: "Active" };
      case "paused":
        return { bg: "rgba(234,179,8,0.9)", color: "white", label: "Paused" };
      case "expired":
        return { bg: "rgba(239,68,68,0.9)", color: "white", label: "Expired" };
      case "draft":
        return { bg: "rgba(168,85,247,0.9)", color: "white", label: "Draft" };
      default:
        return { bg: "rgba(4,120,87,0.9)", color: "white", label: status };
    }
  };

  const statusStyle = getStatusChip(sl.status);
  const listedDate =
    sl.createdAt
      ?.toDate?.()
      ?.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }) || "";
  const expiryDate =
    sl.expiresAt
      ?.toDate?.()
      ?.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }) || "";
  const score = Math.min(
    Math.round(((sl.views + sl.inquiries * 10 + sl.saves * 2) / 100) * 100),
    100
  );
  const scoreLabel = score >= 80 ? "High" : score >= 50 ? "Medium" : "Low";
  const expiryDaysLeft = sl.expiresAt
    ? Math.ceil(
        (sl.expiresAt.toDate().getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
    : 0;
  const thisWeekViews = Math.round(sl.views * 0.15);
  const convRate =
    sl.views > 0 ? ((sl.inquiries / sl.views) * 100).toFixed(1) : "0";
  const boostDaysLeft =
    sl.boosted && sl.expiresAt
      ? Math.ceil(
          (sl.expiresAt.toDate().getTime() - Date.now()) / 86400000
        )
      : 0;

  return (
    <>
      <div className={`sheet-overlay active`} onClick={onClose} />
      <div className={`bottom-sheet active`} style={{ maxHeight: "95dvh" }}>
        <div className="sheet-handle" />

        {/* Cover Photo Header */}
        <div className="relative" style={{ height: "180px" }}>
          <img
            src={getListingImage(sl, properties) || PLACEHOLDER_IMAGE}
            className="w-full h-full object-cover"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to top,#1A1D21 0%,transparent 60%)",
            }}
          />
          <div className="absolute top-3 left-3 flex gap-2">
            <span
              className="chip text-white"
              style={{ background: statusStyle.bg, backdropFilter: "blur(8px)" }}
            >
              {statusStyle.label}
            </span>
            {sl.boosted && (
              <span
                className="chip text-white"
                style={{
                  background: "linear-gradient(135deg,#f59e0b,#d97706)",
                  fontSize: "10px",
                  padding: "3px 8px",
                }}
              >
                <Zap className="w-3 h-3" /> Boosted
              </span>
            )}
          </div>
          <div className="absolute top-3 right-3">
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{
                background: "rgba(0,0,0,0.5)",
                backdropFilter: "blur(8px)",
              }}
            >
              <XIcon className="w-4 h-4 text-white" />
            </button>
          </div>
          <div className="absolute bottom-3 left-3 right-3">
            <p className="text-white font-bold text-lg">{sl.title}</p>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.8)" }}>
              {sl.propertyName} • KSh {sl.rent.toLocaleString()}/mo
            </p>
          </div>
        </div>

        <div className="px-5 -mt-1 relative z-10">
          {/* Tabs */}
          <div
            className="flex -mx-5 px-5 overflow-x-auto pt-3"
            style={{
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              scrollbarWidth: "none",
            }}
          >
            {(["overview", "analytics", "activity"] as DetailTab[]).map(
              (tab) => (
                <div
                  key={tab}
                  className={`detail-tab ${activeDetailTab === tab ? "active" : ""}`}
                  onClick={() => setActiveDetailTab(tab)}
                >
                  {tab === "overview"
                    ? "Overview"
                    : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </div>
              )
            )}
          </div>

          {/* OVERVIEW TAB */}
          {activeDetailTab === "overview" && (
            <div className="pt-4 pb-6">
              {/* Performance Stats */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                {[
                  { label: "Views", value: String(sl.views) },
                  { label: "Inquiries", value: String(sl.inquiries) },
                  { label: "Saves", value: String(sl.saves) },
                  {
                    label: "Score",
                    value: `${score}%`,
                    color:
                      score >= 80
                        ? "#047857"
                        : score >= 50
                          ? "#eab308"
                          : "#ef4444",
                  },
                ].map((s, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl text-center"
                    style={{ background: "rgba(255,255,255,0.03)" }}
                  >
                    <p
                      className="text-base font-bold text-white"
                      style={s.color ? { color: s.color } : {}}
                    >
                      {s.value}
                    </p>
                    <p className="text-xs" style={{ color: "#a3a3a3" }}>
                      {s.label}
                    </p>
                  </div>
                ))}
              </div>

              {/* Description */}
              <h4
                className="text-xs font-semibold uppercase tracking-wider mb-2"
                style={{ color: "#525252" }}
              >
                Description
              </h4>
              <p className="text-sm leading-relaxed mb-4" style={{ color: "#a3a3a3" }}>
                {sl.description || "No description available."}
              </p>

              {/* Amenities */}
              {sl.amenities && sl.amenities.length > 0 && (
                <>
                  <h4
                    className="text-xs font-semibold uppercase tracking-wider mb-2"
                    style={{ color: "#525252" }}
                  >
                    Amenities
                  </h4>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {sl.amenities.map((a) => (
                      <span
                        key={a}
                        className="chip"
                        style={{
                          background: "rgba(4,120,87,0.08)",
                          color: "#047857",
                        }}
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                </>
              )}

              {/* Listing Info */}
              <h4
                className="text-xs font-semibold uppercase tracking-wider mb-3"
                style={{ color: "#525252" }}
              >
                Listing Details
              </h4>
              <div className="space-y-3 mb-5">
                {[
                  {
                    label: "Monthly Rent",
                    value: `KSh ${sl.rent.toLocaleString()}/mo`,
                  },
                  { label: "Listing Type", value: sl.unitName || "—" },
                  { label: "Property", value: sl.propertyName },
                  { label: "Listed On", value: listedDate || "—" },
                  {
                    label: "Expires",
                    value: expiryDate
                      ? `${expiryDate} (${expiryDaysLeft} days left)`
                      : "—",
                  },
                ].map((row, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-2"
                    style={{
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                    }}
                  >
                    <span className="text-xs" style={{ color: "#525252" }}>
                      {row.label}
                    </span>
                    <span className="text-sm text-white">{row.value}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between py-2">
                  <span className="text-xs" style={{ color: "#525252" }}>
                    Status
                  </span>
                  <span
                    className="chip"
                    style={{
                      background: statusStyle.bg,
                      color: statusStyle.color,
                      fontSize: "11px",
                    }}
                  >
                    {statusStyle.label}
                  </span>
                </div>
              </div>

              {/* Performance Bar */}
              <h4
                className="text-xs font-semibold uppercase tracking-wider mb-3"
                style={{ color: "#525252" }}
              >
                Performance
              </h4>
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs" style={{ color: "#a3a3a3" }}>
                    Overall Score
                  </span>
                  <span
                    className="text-xs font-semibold"
                    style={{
                      color:
                        score >= 80
                          ? "#047857"
                          : score >= 50
                            ? "#eab308"
                            : "#ef4444",
                    }}
                  >
                    {scoreLabel} ({score}%)
                  </span>
                </div>
                <div className="perf-bar" style={{ height: "8px" }}>
                  <div
                    className="perf-bar-fill"
                    style={{
                      width: `${score}%`,
                      background: `linear-gradient(to right,${
                        score >= 80
                          ? "#047857"
                          : score >= 50
                            ? "#eab308"
                            : "#ef4444"
                      },${score >= 80 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444"})`,
                    }}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <button
                  onClick={() => {
                    onClose();
                    setTimeout(onEdit, 300);
                  }}
                  className="btn-secondary flex items-center justify-center gap-2"
                  style={{ padding: "12px" }}
                >
                  <Pencil className="w-4 h-4" />
                  <span className="text-sm">Edit</span>
                </button>
                <button
                  onClick={() => {
                    onClose();
                    setTimeout(onBoost, 300);
                  }}
                  className="btn-primary flex items-center justify-center gap-2"
                  style={{
                    padding: "12px",
                    background: "linear-gradient(to right,#d97706,#f59e0b)",
                    boxShadow: "0 4px 16px rgba(245,158,11,0.3)",
                  }}
                >
                  <Zap className="w-4 h-4" />
                  <span className="text-sm">Boost</span>
                </button>
              </div>
              {sl.status === "paused" && (
                <button
                  onClick={() => {
                    onClose();
                    setTimeout(onResume, 300);
                  }}
                  className="btn-primary w-full mt-2"
                  style={{ padding: "12px" }}
                >
                  Resume Listing
                </button>
              )}
              {sl.status === "expired" && (
                <button
                  onClick={() => {
                    onClose();
                    setTimeout(onRenew, 300);
                  }}
                  className="btn-primary w-full mt-2"
                  style={{ padding: "12px", background: "#047857" }}
                >
                  Renew Listing
                </button>
              )}
              {sl.status === "draft" && (
                <button
                  onClick={() => {
                    onClose();
                    setTimeout(onEdit, 300);
                  }}
                  className="btn-primary w-full mt-2"
                  style={{ padding: "12px" }}
                >
                  Complete Setup
                </button>
              )}
            </div>
          )}

          {/* ANALYTICS TAB */}
          {activeDetailTab === "analytics" && (
            <div className="pt-4 pb-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-2 mb-5">
                {[
                  { label: "Total Views", value: String(sl.views), color: "text-white" },
                  { label: "Inquiries", value: String(sl.inquiries), color: "#3b82f6" },
                  {
                    label: "Conversion",
                    value:
                      sl.views > 0
                        ? `${((sl.inquiries / sl.views) * 100).toFixed(1)}%`
                        : "0%",
                    color: "#047857",
                  },
                ].map((s, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl text-center"
                    style={{ background: "rgba(255,255,255,0.03)" }}
                  >
                    <p className="text-base font-bold" style={{ color: s.color }}>
                      {s.value}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "#a3a3a3" }}>
                      {s.label}
                    </p>
                  </div>
                ))}
              </div>

              {/* Detailed insights */}
              <div className="p-4 rounded-2xl mb-4" style={{ background: `${score >= 80 ? "#047857" : score >= 50 ? "#eab308" : "#ef4444"}0a`, border: `1px solid ${score >= 80 ? "#047857" : score >= 50 ? "#eab308" : "#ef4444"}22` }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs" style={{ color: "#a3a3a3" }}>
                    Overall Score
                  </span>
                  <span
                    className="text-lg font-bold"
                    style={{
                      color:
                        score >= 80
                          ? "#047857"
                          : score >= 50
                            ? "#eab308"
                            : "#ef4444",
                    }}
                  >
                    {score}%
                  </span>
                </div>
                <div
                  className="w-full h-2 rounded-full"
                  style={{ background: "rgba(255,255,255,0.06)" }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${score}%`,
                      background: `linear-gradient(to right,${score >= 80 ? "#047857" : score >= 50 ? "#eab308" : "#ef4444"},#10b981)`,
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div
                  className="p-3 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.03)" }}
                >
                  <p className="text-xs" style={{ color: "#525252" }}>
                    Views This Week
                  </p>
                  <p className="text-base font-bold text-white">
                    +{thisWeekViews}
                  </p>
                </div>
                <div
                  className="p-3 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.03)" }}
                >
                  <p className="text-xs" style={{ color: "#525252" }}>
                    Conversion
                  </p>
                  <p className="text-base font-bold text-white">{convRate}%</p>
                </div>
              </div>

              <h4
                className="text-xs font-semibold uppercase tracking-wider mb-2 mt-4"
                style={{ color: "#525252" }}
              >
                Insights
              </h4>
              <div className="space-y-2">
                <div
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.02)" }}
                >
                  <TrendingUp
                    className="w-4 h-4"
                    style={{ color: score >= 50 ? "#047857" : "#ef4444" }}
                  />
                  <p className="text-sm" style={{ color: "#a3a3a3" }}>
                    {sl.views} total views · {sl.inquiries} inquiries ·{" "}
                    {sl.saves} saves
                  </p>
                </div>
                {sl.boosted && (
                  <div
                    className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ background: "rgba(255,255,255,0.02)" }}
                  >
                    <Zap className="w-4 h-4" style={{ color: "#f59e0b" }} />
                    <p className="text-sm" style={{ color: "#a3a3a3" }}>
                      Boost active — {boostDaysLeft} days remaining
                    </p>
                  </div>
                )}
                <div
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.02)" }}
                >
                  <Smartphone className="w-4 h-4" style={{ color: "#3b82f6" }} />
                  <p className="text-sm" style={{ color: "#a3a3a3" }}>
                    Most views from Mobile
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ACTIVITY TAB */}
          {activeDetailTab === "activity" && (
            <div className="pt-4 pb-6">
              <div className="text-center py-8">
                <Activity className="w-10 h-10 mx-auto mb-3" style={{ color: "#525252" }} />
                <p className="text-sm" style={{ color: "#a3a3a3" }}>
                  Activity log will show views, inquiries, and status changes for
                  this listing. Check the{" "}
                  <button
                    onClick={() => {
                      onClose();
                      setTimeout(() => router.push("/inquiries"), 300);
                    }}
                    className="font-semibold"
                    style={{ color: "#047857" }}
                  >
                    Inquiries page
                  </button>{" "}
                  for detailed inquiry activity.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

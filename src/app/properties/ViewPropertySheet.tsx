"use client";

import { useEffect, useState } from "react";
import {
  MapPin,
  Plus,
  Pencil,
  Share2,
  Clock,
  Layers,
  Phone,
  Loader2,
  CalendarDays,
  Activity,
  Home,
  Heart,
  MessageSquare,
  Mail,
} from "lucide-react";
import { listenToPropertyUnits } from "@/lib/units";
import { listenToViewings } from "@/lib/viewings";
import { listenToInquiries } from "@/lib/inquiries";
import { listenToConversations } from "@/lib/conversations";
import { listenToLandlordFavorites } from "@/lib/browse";
import type { PropertyData } from "@/lib/properties";
import type { UnitData } from "@/lib/units";
import type { ViewingData } from "@/lib/viewings";
import type { InquiryData } from "@/lib/inquiries";
import type { ConversationData } from "@/lib/conversations";
import type { FavoriteData } from "@/lib/browse";

export interface ViewPropertySheetProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onShare: () => void;
  onAddUnit: () => void;
  onUnitClick: (unit: UnitData) => void;
  property: PropertyData | null;
}

type DetailTab = "overview" | "units" | "activity";

export default function ViewPropertySheet({
  isOpen,
  onClose,
  onEdit,
  onShare,
  onAddUnit,
  onUnitClick,
  property,
}: ViewPropertySheetProps) {
  const [activeDetailTab, setActiveDetailTab] = useState<DetailTab>("overview");
  const [propertyUnits, setPropertyUnits] = useState<UnitData[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(true);
  const [viewings, setViewings] = useState<ViewingData[]>([]);
  const [viewingsLoading, setViewingsLoading] = useState(true);
  const [inquiries, setInquiries] = useState<InquiryData[]>([]);
  const [inquiriesLoading, setInquiriesLoading] = useState(true);
  const [conversations, setConversations] = useState<ConversationData[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [favorites, setFavorites] = useState<FavoriteData[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(true);

  // Reset when sheet opens
  useEffect(() => {
    if (isOpen && property) {
      setActiveDetailTab("overview");
      setUnitsLoading(true);
      setViewingsLoading(true);
      setInquiriesLoading(true);
      setConversationsLoading(true);
      setFavoritesLoading(true);
    }
  }, [isOpen, property]);

  // Listen to units for this property
  useEffect(() => {
    if (!isOpen || !property) return;

    setUnitsLoading(true);
    const unsub = listenToPropertyUnits(
      property.id,
      (units) => {
        setPropertyUnits(units);
        setUnitsLoading(false);
      },
      (err) => {
        console.error("Error loading property units:", err);
        setUnitsLoading(false);
      }
    );
    return () => unsub();
  }, [isOpen, property]);

  // Listen to viewings for this property
  useEffect(() => {
    if (!isOpen || !property) return;

    setViewingsLoading(true);
    const unsub = listenToViewings(
      property.landlordId,
      (allViewings) => {
        const filtered = allViewings.filter(
          (v) => v.propertyId === property.id
        );
        setViewings(filtered);
        setViewingsLoading(false);
      },
      (err) => {
        console.error("Error loading viewings:", err);
        setViewingsLoading(false);
      }
    );
    return () => unsub();
  }, [isOpen, property]);

  // Listen to inquiries for this property
  useEffect(() => {
    if (!isOpen || !property) return;

    setInquiriesLoading(true);
    const unsub = listenToInquiries(
      property.landlordId,
      (allInquiries) => {
        const filtered = allInquiries.filter(
          (i) => i.propertyId === property.id
        );
        setInquiries(filtered);
        setInquiriesLoading(false);
      },
      (err) => {
        console.error("Error loading inquiries:", err);
        setInquiriesLoading(false);
      }
    );
    return () => unsub();
  }, [isOpen, property]);

  // Listen to conversations for this property
  useEffect(() => {
    if (!isOpen || !property) return;

    setConversationsLoading(true);
    const unsub = listenToConversations(
      property.landlordId,
      (allConvs) => {
        const filtered = allConvs.filter(
          (c) => c.propertyName === property.name
        );
        setConversations(filtered);
        setConversationsLoading(false);
      },
      (err) => {
        console.error("Error loading conversations:", err);
        setConversationsLoading(false);
      }
    );
    return () => unsub();
  }, [isOpen, property]);

  // Listen to favorites for this property
  useEffect(() => {
    if (!isOpen || !property) return;

    setFavoritesLoading(true);
    const unsub = listenToLandlordFavorites(
      property.landlordId,
      (allFavorites) => {
        const filtered = allFavorites.filter(
          (f) => f.propertyId === property.id
        );
        setFavorites(filtered);
        setFavoritesLoading(false);
      },
      (err) => {
        console.error("Error loading favorites:", err);
        setFavoritesLoading(false);
      }
    );
    return () => unsub();
  }, [isOpen, property]);

  if (!isOpen || !property) return null;

  const pd = property;
  const occupied = pd.occupiedUnits;
  const total = pd.totalUnits;
  const occupancyPct = total > 0 ? Math.round((occupied / total) * 100) : 0;

  const statusStyle = (() => {
    if (occupancyPct >= 80)
      return { label: "Active", bg: "rgba(4,120,87,0.9)" };
    if (occupancyPct >= 30)
      return { label: "Partial", bg: "rgba(234,179,8,0.9)" };
    return { label: "Vacant", bg: "rgba(239,68,68,0.9)" };
  })();

  const revenueLabel =
    pd.revenue >= 1000000
      ? (pd.revenue / 1000000).toFixed(1) + "M"
      : pd.revenue >= 1000
        ? Math.round(pd.revenue / 1000) + "K"
        : String(pd.revenue);

  const coverImage =
    pd.images?.[0] ||
    `https://picsum.photos/seed/${pd.id}/600/360.jpg`;

  // Build activity feed from all data sources
  const activityFeed = [
    // Viewings
    ...viewings.map((v) => ({
      id: `v-${v.id}`,
      type: "viewing" as const,
      title: `${v.tenantName} — ${v.unitName}`,
      description: `${v.status === "pending" ? "Requested" : v.status === "confirmed" ? "Confirmed" : v.status === "completed" ? "Completed" : "Cancelled"} viewing on ${v.date}`,
      time: `${v.startTime} – ${v.endTime}`,
      status: v.status,
      tenantName: v.tenantName,
      tenantInitials: v.tenantInitials,
      tenantPhone: v.tenantPhone,
      createdAt: v.createdAt?.toMillis() || 0,
    })),
    // Inquiries
    ...inquiries.map((i) => ({
      id: `inq-${i.id}`,
      type: "inquiry" as const,
      title: `${i.tenantName} — ${i.unitName}`,
      description: `Inquiry: "${i.message.slice(0, 80)}${i.message.length > 80 ? "..." : ""}"`,
      time: i.createdAt?.toDate().toLocaleDateString() || "Recently",
      status: i.status,
      tenantName: i.tenantName,
      tenantInitials: i.tenantInitials,
      tenantPhone: i.tenantPhone,
      createdAt: i.createdAt?.toMillis() || 0,
    })),
    // Conversations / Messages
    ...conversations.map((c) => ({
      id: `conv-${c.id}`,
      type: "message" as const,
      title: Object.values(c.participantNames).filter(n => n).join(", ") || "Conversation",
      description: `💬 ${c.lastMessage.slice(0, 80)}${c.lastMessage.length > 80 ? "..." : ""}`,
      time: c.lastMessageTime?.toDate().toLocaleDateString() || "Recently",
      status: c.status,
      tenantName: "",
      tenantInitials: "",
      tenantPhone: "",
      createdAt: c.lastMessageTime?.toMillis() || 0,
    })),
    // Favorites
    ...favorites.map((f) => ({
      id: `fav-${f.listingId}`,
      type: "favorite" as const,
      title: `Someone saved "${f.title || f.propertyName}"`,
      description: `Added to favorites — ${f.location}`,
      time: f.savedAt?.toDate().toLocaleDateString() || "Recently",
      status: "saved",
      tenantName: "",
      tenantInitials: "",
      tenantPhone: "",
      createdAt: f.savedAt?.toMillis() || 0,
    })),
    // Unit changes
    ...propertyUnits.map((u) => ({
      id: `unit-${u.id}`,
      type: "unit" as const,
      title: `${u.name} — ${u.type}`,
      description: `KSh ${u.rent.toLocaleString()}/mo · ${u.status}`,
      time: u.updatedAt?.toDate().toLocaleDateString() || "Recently",
      status: u.status === "Occupied" ? "occupied" : u.status === "Maintenance" ? "maintenance" : "vacant",
      tenantName: "",
      tenantInitials: "",
      tenantPhone: "",
      createdAt: 0,
    })),
  ].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <>
      <div
        className={`sheet-overlay active`}
        onClick={onClose}
      />
      <div
        className={`bottom-sheet active`}
        style={{ maxHeight: "95dvh" }}
      >
        {/* Cover Image */}
        <div className="sheet-handle" />
        <div className="relative" style={{ height: "180px" }}>
          <img
            src={coverImage}
            className="w-full h-full object-cover"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to top,#1A1D21 0%,transparent 50%)",
            }}
          />
          <div className="absolute top-3 left-3">
            <span
              className="chip text-white"
              style={{
                background: statusStyle.bg,
                backdropFilter: "blur(8px)",
              }}
            >
              {statusStyle.label}
            </span>
          </div>
          <div className="absolute top-3 right-3 flex gap-2">
            <button
              onClick={onEdit}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{
                background: "rgba(0,0,0,0.5)",
                backdropFilter: "blur(8px)",
              }}
            >
              <Pencil className="w-4 h-4 text-white" />
            </button>
            <button
              onClick={onShare}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{
                background: "rgba(0,0,0,0.5)",
                backdropFilter: "blur(8px)",
              }}
            >
              <Share2 className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {/* Header Info */}
        <div className="px-5 -mt-6 relative z-10">
          <h2 className="text-xl font-bold text-white">{pd.name}</h2>
          <p
            className="text-sm mt-1 flex items-center gap-1"
            style={{ color: "#a3a3a3" }}
          >
            <MapPin className="w-4 h-4" /> {pd.location}
          </p>
          <div className="flex items-center gap-2 mt-3">
            <span
              className="chip"
              style={{
                background: "rgba(255,255,255,0.04)",
                color: "#a3a3a3",
              }}
            >
              {pd.type}
            </span>
            <span
              className="chip"
              style={{
                background: "rgba(255,255,255,0.04)",
                color: "#a3a3a3",
              }}
            >
              {total} Units
            </span>
            <span
              className="chip"
              style={{
                background: "rgba(4,120,87,0.1)",
                color: "#047857",
              }}
            >
              KSh {pd.rentMin.toLocaleString()}–
              {pd.rentMax.toLocaleString()}
            </span>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mt-5">
            <div
              className="p-3 rounded-xl text-center"
              style={{ background: "rgba(255,255,255,0.03)" }}
            >
              <p
                className="text-lg font-bold"
                style={{ color: "#047857" }}
              >
                KSh {revenueLabel}
              </p>
              <p className="text-xs" style={{ color: "#a3a3a3" }}>
                Revenue
              </p>
            </div>
            <div
              className="p-3 rounded-xl text-center"
              style={{ background: "rgba(255,255,255,0.03)" }}
            >
              <p className="text-lg font-bold text-white">
                {occupied}/{total}
              </p>
              <p className="text-xs" style={{ color: "#a3a3a3" }}>
                Occupied
              </p>
            </div>
            <div
              className="p-3 rounded-xl text-center"
              style={{ background: "rgba(255,255,255,0.03)" }}
            >
              <p className="text-lg font-bold text-white">
                {occupancyPct}%
              </p>
              <p className="text-xs" style={{ color: "#a3a3a3" }}>
                Occupancy
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div
            className="flex mt-5 -mx-5 overflow-x-auto"
            style={{
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              scrollbarWidth: "none",
            }}
          >
            {[
              { key: "overview", label: "Overview" },
              { key: "units", label: `Units (${total})` },
              { key: "activity", label: `Activity (${activityFeed.length})` },
            ].map((tab) => (
              <div
                key={tab.key}
                className={`detail-tab ${activeDetailTab === tab.key ? "active" : ""}`}
                style={{ padding: "0 16px 12px", cursor: "pointer" }}
                onClick={() =>
                  setActiveDetailTab(tab.key as DetailTab)
                }
              >
                {tab.label}
              </div>
            ))}
          </div>

          {/* ===== OVERVIEW TAB ===== */}
          {activeDetailTab === "overview" && (
            <div className="pt-4 pb-6">
              <h4 className="text-sm font-bold text-white mb-2">
                Description
              </h4>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "#a3a3a3" }}
              >
                {pd.description || "No description added yet."}
              </p>

              <h4 className="text-sm font-bold text-white mt-4 mb-2">
                Amenities
              </h4>
              <div className="flex flex-wrap gap-2">
                {pd.amenities && pd.amenities.length > 0 ? (
                  pd.amenities.map((a) => (
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
                  ))
                ) : (
                  <p
                    className="text-xs"
                    style={{ color: "#525252" }}
                  >
                    No amenities listed
                  </p>
                )}
              </div>

              {/* Photo Gallery */}
              <h4 className="text-sm font-bold text-white mt-5 mb-3">
                Photos
              </h4>
              <div
                className="flex gap-2 overflow-x-auto pb-2"
                style={{ scrollbarWidth: "none" }}
              >
                {(pd.images && pd.images.length > 0
                  ? pd.images
                  : [1, 2, 3, 4, 5].map((n) =>
                      `https://picsum.photos/seed/${pd.id}-${n}/224/224.jpg`
                    )
                ).map((imgUrl, idx) => (
                  <div
                    key={idx}
                    className="flex-shrink-0 w-28 h-28 rounded-xl overflow-hidden relative"
                    style={{
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <img
                      src={imgUrl}
                      className="w-full h-full object-cover"
                    />
                    {idx === 0 && (
                      <div
                        className="absolute inset-0 flex items-center justify-center"
                        style={{ background: "rgba(0,0,0,0.3)" }}
                      >
                        <span
                          className="chip text-white"
                          style={{
                            background: "rgba(4,120,87,0.9)",
                            fontSize: "10px",
                          }}
                        >
                          Cover
                        </span>
                      </div>
                    )}
                  </div>
                ))}
                <div
                  className="flex-shrink-0 w-28 h-28 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer"
                  style={{ borderColor: "rgba(255,255,255,0.1)" }}
                >
                  <Plus className="w-5 h-5" style={{ color: "#525252" }} />
                  <span
                    className="text-xs mt-1"
                    style={{ color: "#525252" }}
                  >
                    Add
                  </span>
                </div>
              </div>

              {/* Units Snapshot */}
              <div className="mt-5 pt-4">
                <div
                  className="flex items-center justify-between mb-3"
                  style={{
                    borderTop: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <h4 className="text-sm font-bold text-white">
                    Units Snapshot
                  </h4>
                  <button
                    onClick={() =>
                      setActiveDetailTab("units")
                    }
                    className="text-xs font-semibold"
                    style={{ color: "#047857" }}
                  >
                    View All →
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {
                      label: "Occupied",
                      value: occupied,
                      color: "#047857",
                      bg: "rgba(4,120,87,0.06)",
                      border: "rgba(4,120,87,0.15)",
                    },
                    {
                      label: "Vacant",
                      value: total - occupied,
                      color: "#ef4444",
                      bg: "rgba(239,68,68,0.06)",
                      border: "rgba(239,68,68,0.15)",
                    },
                    {
                      label: "Revenue",
                      value: `KSh ${revenueLabel}`,
                      color: "#eab308",
                      bg: "rgba(234,179,8,0.06)",
                      border: "rgba(234,179,8,0.15)",
                    },
                  ].map((s, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl text-center"
                      style={{
                        background: s.bg,
                        border: `1px solid ${s.border}`,
                      }}
                    >
                      <p
                        className="text-lg font-bold"
                        style={{ color: s.color }}
                      >
                        {s.value}
                      </p>
                      <p
                        className="text-xs"
                        style={{ color: s.color }}
                      >
                        {s.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ===== UNITS TAB ===== */}
          {activeDetailTab === "units" && (
            <div className="pt-4 pb-6">
              <button
                onClick={onAddUnit}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl mb-4"
                style={{
                  background: "rgba(4,120,87,0.06)",
                  border: "1px dashed rgba(4,120,87,0.25)",
                  cursor: "pointer",
                }}
              >
                <Plus className="w-4 h-4" style={{ color: "#047857" }} />
                <span
                  className="text-sm font-semibold"
                  style={{ color: "#047857" }}
                >
                  Add Unit
                </span>
              </button>

              {unitsLoading ? (
                <div className="flex flex-col items-center py-10">
                  <Loader2
                    className="w-8 h-8 animate-spin"
                    style={{ color: "#047857" }}
                  />
                  <p
                    className="text-sm mt-3"
                    style={{ color: "#a3a3a3" }}
                  >
                    Loading units...
                  </p>
                </div>
              ) : propertyUnits.length === 0 ? (
                <div className="flex flex-col items-center py-10">
                  <Layers
                    className="w-10 h-10 mb-3"
                    style={{ color: "#525252" }}
                  />
                  <p className="text-sm font-medium text-white">
                    No units yet
                  </p>
                  <p
                    className="text-xs mt-1"
                    style={{ color: "#a3a3a3" }}
                  >
                    Add your first unit to this property
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {propertyUnits.map((unit) => (
                    <div
                      key={unit.id}
                      className="flex items-center gap-3 p-3 rounded-xl"
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.06)",
                      }}
                      onClick={() => onUnitClick(unit)}
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex-shrink-0 overflow-hidden"
                        style={{ background: "rgba(4,120,87,0.1)" }}
                      >
                        {unit.images?.[0] ? (
                          <img
                            src={unit.images[0]}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span
                              className="text-xs font-bold"
                              style={{ color: "#047857" }}
                            >
                              {unit.name.slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">
                          {unit.name}
                        </p>
                        <p
                          className="text-xs"
                          style={{ color: "#a3a3a3" }}
                        >
                          {unit.type} · KSh{" "}
                          {unit.rent.toLocaleString()}/mo
                        </p>
                      </div>
                      <span
                        className="text-xs font-medium px-2.5 py-1 rounded-full"
                        style={{
                          background:
                            unit.status === "Occupied"
                              ? "rgba(4,120,87,0.15)"
                              : unit.status === "Maintenance"
                                ? "rgba(234,179,8,0.15)"
                                : "rgba(239,68,68,0.15)",
                          color:
                            unit.status === "Occupied"
                              ? "#047857"
                              : unit.status === "Maintenance"
                                ? "#eab308"
                                : "#ef4444",
                        }}
                      >
                        {unit.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ===== ACTIVITY TAB ===== */}
          {activeDetailTab === "activity" && (
            <div className="pt-4 pb-6">
              {(viewingsLoading || unitsLoading || inquiriesLoading || conversationsLoading || favoritesLoading) ? (
                <div className="flex flex-col items-center py-10">
                  <Loader2
                    className="w-8 h-8 animate-spin"
                    style={{ color: "#047857" }}
                  />
                  <p
                    className="text-sm mt-3"
                    style={{ color: "#a3a3a3" }}
                  >
                    Loading activity...
                  </p>
                </div>
              ) : activityFeed.length === 0 ? (
                <div className="flex flex-col items-center py-10">
                  <Activity
                    className="w-10 h-10 mb-3"
                    style={{ color: "#525252" }}
                  />
                  <p className="text-sm font-medium text-white">
                    No recent activity
                  </p>
                  <p
                    className="text-xs mt-1"
                    style={{ color: "#a3a3a3" }}
                  >
                    Activity from viewings, inquiries, messages, and favorites will appear here
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {activityFeed.map((item) => {
                    const iconConfig = (() => {
                      switch (item.type) {
                        case "viewing":
                          return {
                            Icon: CalendarDays,
                            bg: "rgba(59,130,246,0.12)",
                            iconColor: "#3b82f6",
                          };
                        case "inquiry":
                          return {
                            Icon: Mail,
                            bg: "rgba(168,85,247,0.12)",
                            iconColor: "#a855f7",
                          };
                        case "message":
                          return {
                            Icon: MessageSquare,
                            bg: "rgba(4,120,87,0.1)",
                            iconColor: "#047857",
                          };
                        case "favorite":
                          return {
                            Icon: Heart,
                            bg: "rgba(239,68,68,0.1)",
                            iconColor: "#ef4444",
                          };
                        case "unit":
                        default:
                          return {
                            Icon: Home,
                            bg: "rgba(234,179,8,0.1)",
                            iconColor: "#eab308",
                          };
                      }
                    })();

                    const statusBadge = (() => {
                      switch (item.type) {
                        case "viewing": {
                          const colors: Record<string, { bg: string; color: string }> = {
                            pending: { bg: "rgba(234,179,8,0.12)", color: "#eab308" },
                            confirmed: { bg: "rgba(4,120,87,0.12)", color: "#047857" },
                            completed: { bg: "rgba(59,130,246,0.12)", color: "#3b82f6" },
                            cancelled: { bg: "rgba(239,68,68,0.12)", color: "#ef4444" },
                          };
                          const c = colors[item.status] || colors.pending;
                          return { label: item.status, ...c };
                        }
                        case "inquiry": {
                          const colors: Record<string, { bg: string; color: string }> = {
                            new: { bg: "rgba(234,179,8,0.12)", color: "#eab308" },
                            progress: { bg: "rgba(59,130,246,0.12)", color: "#3b82f6" },
                            responded: { bg: "rgba(4,120,87,0.12)", color: "#047857" },
                            archived: { bg: "rgba(255,255,255,0.06)", color: "#525252" },
                          };
                          const c = colors[item.status] || colors.new;
                          return { label: item.status, ...c };
                        }
                        case "message": {
                          const colors: Record<string, { bg: string; color: string }> = {
                            active: { bg: "rgba(4,120,87,0.12)", color: "#047857" },
                            archived: { bg: "rgba(255,255,255,0.06)", color: "#525252" },
                          };
                          const c = colors[item.status] || colors.active;
                          return { label: item.status, ...c };
                        }
                        case "favorite":
                          return { label: "saved", bg: "rgba(239,68,68,0.1)", color: "#ef4444" };
                        case "unit": {
                          const s = item.status === "occupied"
                            ? { label: "Occupied", bg: "rgba(4,120,87,0.12)", color: "#047857" }
                            : item.status === "maintenance"
                              ? { label: "Maintenance", bg: "rgba(234,179,8,0.12)", color: "#eab308" }
                              : { label: "Vacant", bg: "rgba(239,68,68,0.12)", color: "#ef4444" };
                          return s;
                        }
                        default:
                          return { label: "", bg: "", color: "" };
                      }
                    })();

                    const { Icon } = iconConfig;

                    return (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl"
                        style={{
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.06)",
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: iconConfig.bg }}
                          >
                            <Icon className="w-4.5 h-4.5" style={{ color: iconConfig.iconColor }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate">
                              {item.title}
                            </p>
                            <p
                              className="text-xs"
                              style={{ color: "#a3a3a3" }}
                            >
                              {item.description}
                            </p>
                            <div className="flex items-center gap-3 mt-1">
                              <div className="flex items-center gap-1">
                                <Clock
                                  className="w-3 h-3"
                                  style={{ color: "#525252" }}
                                />
                                <span
                                  className="text-xs"
                                  style={{ color: "#a3a3a3" }}
                                >
                                  {item.time}
                                </span>
                              </div>
                              <span
                                className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                                style={{
                                  background: statusBadge.bg,
                                  color: statusBadge.color,
                                }}
                              >
                                {statusBadge.label}
                              </span>
                            </div>
                          </div>
                          {item.tenantPhone && (
                            <a
                              href={`tel:${item.tenantPhone}`}
                              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                              style={{
                                background: "rgba(4,120,87,0.1)",
                              }}
                            >
                              <Phone className="w-4 h-4" style={{ color: "#047857" }} />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}


        </div>
      </div>
    </>
  );
}

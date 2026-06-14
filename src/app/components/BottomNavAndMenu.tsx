"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  List,
  Layers,
  Menu,
  CalendarDays,
  MessageSquare,
  Users,
  Settings,
  X as XIcon,
} from "lucide-react";

/* ── Navigation Configuration ── */

const NAV_ITEMS = [
  { key: "home", icon: LayoutDashboard, label: "Home", path: "/dashboard" },
  { key: "properties", icon: Building2, label: "Properties", path: "/properties" },
  { key: "listings", icon: List, label: "Listings", path: "/listings" },
  { key: "units", icon: Layers, label: "Units", path: "/units" },
  { key: "more", icon: Menu, label: "More" },
];

interface MenuLink {
  icon: any;
  label: string;
  desc: string;
  color: string;
  bg: string;
  path: string;
}

interface MenuSection {
  title: string;
  items: MenuLink[];
}

const MENU_SECTIONS: MenuSection[] = [
  {
    title: "Management",
    items: [
      { icon: Users, label: "Tenants", desc: "Unit & tenant management", color: "#06b6d4", bg: "rgba(6,182,212,0.12)", path: "/tenants" },
      { icon: MessageSquare, label: "Messages", desc: "Conversations", color: "#a855f7", bg: "rgba(168,85,247,0.12)", path: "/messages" },
      { icon: CalendarDays, label: "Viewings", desc: "Schedule & manage", color: "#eab308", bg: "rgba(234,179,8,0.12)", path: "/viewings" },
    ]
  },
  {
    title: "Account",
    items: [
      { icon: Settings, label: "Settings", desc: "Account & preferences", color: "#525252", bg: "rgba(255,255,255,0.06)", path: "/settings" },
    ],
  },
];

/* ── Component ── */

export default function BottomNavAndMenu() {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const activeTab = NAV_ITEMS.find(
    (item) => item.path && pathname.startsWith(item.path)
  )?.key || "more";

  const handleNavClick = (key: string) => {
    if (key === "more") {
      setMenuOpen(true);
      return;
    }
    const item = NAV_ITEMS.find((n) => n.key === key);
    if (item?.path) router.push(item.path);
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      {/* ── BOTTOM NAV ── */}
      <div className="app-bottom-nav">
        <div className="bottom-nav">
          <div className="flex">
            {NAV_ITEMS.map((item) => {
              const isActive = activeTab === item.key;
              const Icon = item.icon;
              return (
                <div
                  key={item.key}
                  className={`nav-item ${isActive ? "active" : ""}`}
                  onClick={() => handleNavClick(item.key)}
                >
                  {isActive && <div className="nav-indicator" />}
                  <Icon className="w-5 h-5 nav-icon" />
                  <span className="nav-label">{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── MORE MENU OVERLAY ── */}
      <div
        className={`sheet-overlay ${menuOpen ? "active" : ""}`}
        onClick={closeMenu}
      />

      {/* ── MORE MENU SHEET ── */}
      <div className={`bottom-sheet ${menuOpen ? "active" : ""}`}>
        <div className="sheet-handle" />

        <div className="px-5 pt-5 pb-2">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-lg font-bold text-white">More</h3>
            <button
              onClick={closeMenu}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              <XIcon className="w-4 h-4" style={{ color: "#a3a3a3" }} />
            </button>
          </div>
          <p className="text-xs" style={{ color: "#a3a3a3" }}>
            All landlord tools &amp; settings
          </p>
        </div>

        <div className="px-3 pb-8 space-y-6">
          {MENU_SECTIONS.map((section) => (
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
                        closeMenu();
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
    </>
  );
}

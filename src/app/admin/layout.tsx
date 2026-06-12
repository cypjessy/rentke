import type { Metadata } from "next";
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "RentKe — Admin Dashboard",
  description: "RentKe admin portal for managing landlords, listings, and platform operations.",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={inter.className}
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {children}

      {/* Admin Portal Scoped Styles */}
      <style>{`
        .admin-portal * {
          -webkit-tap-highlight-color: transparent;
          box-sizing: border-box;
        }
        .admin-portal {
          background: #050505;
          color: #e5e5e5;
          min-height: 100dvh;
          overflow-x: hidden;
          font-family: 'Inter', sans-serif;
        }
        .admin-portal ::-webkit-scrollbar { width: 0; display: none; }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideInUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes scaleIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes snackbarIn { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes snackbarOut { from { transform: translateY(0); opacity: 1; } to { transform: translateY(100%); opacity: 0; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes rippleAnim { to { transform: scale(4); opacity: 0; } }

        .admin-portal .ripple-container { position: relative; overflow: hidden; }
        .admin-portal .ripple-container .ripple { position: absolute; border-radius: 50%; background: rgba(255,255,255,0.12); transform: scale(0); animation: rippleAnim 0.6s ease-out; pointer-events: none; }

        .admin-portal .bottom-sheet-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 100; opacity: 0; transition: opacity 0.3s ease; pointer-events: none; }
        .admin-portal .bottom-sheet-overlay.active { opacity: 1; pointer-events: all; }
        .admin-portal .bottom-sheet { position: fixed; bottom: 0; left: 0; right: 0; background: #1A1D21; border-radius: 28px 28px 0 0; z-index: 101; transform: translateY(100%); transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1); max-height: 90dvh; overflow-y: auto; }
        .admin-portal .bottom-sheet.active { transform: translateY(0); }
        .admin-portal .bottom-sheet-handle { width: 40px; height: 4px; background: rgba(255,255,255,0.2); border-radius: 2px; margin: 12px auto 0; }

        .admin-portal .snackbar { position: fixed; bottom: 100px; left: 16px; right: 16px; background: #2A2D31; border-radius: 16px; padding: 14px 20px; z-index: 200; transform: translateY(100%); opacity: 0; box-shadow: 0 8px 32px rgba(0,0,0,0.5); }
        .admin-portal .snackbar.show { animation: snackbarIn 0.3s ease forwards; }
        .admin-portal .snackbar.hide { animation: snackbarOut 0.3s ease forwards; }

        .admin-portal .stat-card { background: #1A1D21; border-radius: 20px; padding: 20px; border: 1px solid rgba(255,255,255,0.05); transition: all 0.2s ease; cursor: pointer; }
        .admin-portal .stat-card:active { transform: scale(0.97); }

        .admin-portal .action-btn { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 16px; display: flex; flex-direction: column; align-items: center; gap: 10px; transition: all 0.2s ease; cursor: pointer; }
        .admin-portal .action-btn:active { background: rgba(255,255,255,0.06); transform: scale(0.96); }

        .admin-portal .bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; background: rgba(10,10,10,0.95); backdrop-filter: blur(20px); border-top: 1px solid rgba(255,255,255,0.05); padding: 8px 16px; padding-bottom: max(8px, env(safe-area-inset-bottom)); z-index: 50; }
        .admin-portal .nav-item { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 6px 12px; border-radius: 12px; transition: all 0.2s ease; cursor: pointer; }
        .admin-portal .nav-item.active { background: rgba(4,120,87,0.15); }
        .admin-portal .nav-item.active span { color: #059669; }
        .admin-portal .nav-item.active svg { color: #059669; }

        .admin-portal .chart-bar { border-radius: 6px 6px 0 0; transition: height 0.8s cubic-bezier(0.32, 0.72, 0, 1); background: linear-gradient(to top, #047857, #059669); }
        .admin-portal .activity-item { display: flex; gap: 12px; padding: 14px 0; border-bottom: 1px solid rgba(255,255,255,0.04); }
        .admin-portal .activity-item:last-child { border-bottom: none; }
        .admin-portal .badge-dot { width: 8px; height: 8px; border-radius: 50%; position: absolute; top: -2px; right: -2px; }

        .admin-portal .approval-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 16px; transition: all 0.2s ease; }
        .admin-portal .approval-card:active { background: rgba(255,255,255,0.05); }

        .admin-portal .btn-primary { background: linear-gradient(to right, #047857, #059669); color: white; font-weight: 600; font-size: 14px; padding: 12px 20px; border-radius: 12px; border: none; cursor: pointer; transition: all 0.15s ease; position: relative; overflow: hidden; box-shadow: 0 4px 15px rgba(4,120,87,0.3); }
        .admin-portal .btn-primary:active { transform: scale(0.96); }
        .admin-portal .btn-danger { background: linear-gradient(to right, #dc2626, #ef4444); color: white; font-weight: 600; font-size: 14px; padding: 12px 20px; border-radius: 12px; border: none; cursor: pointer; transition: all 0.15s ease; position: relative; overflow: hidden; box-shadow: 0 4px 15px rgba(220,38,38,0.3); }
        .admin-portal .btn-danger:active { transform: scale(0.96); }
        .admin-portal .btn-ghost { background: rgba(255,255,255,0.05); color: #e5e5e5; font-weight: 500; font-size: 14px; padding: 12px 20px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); cursor: pointer; transition: all 0.15s ease; }
        .admin-portal .btn-ghost:active { background: rgba(255,255,255,0.08); transform: scale(0.96); }

        .admin-portal .spinner { width: 18px; height: 18px; border: 2.5px solid rgba(255,255,255,0.2); border-top-color: white; border-radius: 50%; animation: spin 0.7s linear infinite; }

        .admin-portal .android-input { background: rgba(255,255,255,0.05); border: 1.5px solid rgba(255,255,255,0.1); border-radius: 14px; padding: 14px 16px; font-size: 15px; color: #e5e5e5; width: 100%; outline: none; transition: all 0.2s ease; caret-color: #047857; resize: none; font-family: 'Inter', sans-serif; }
        .admin-portal .android-input:focus { border-color: #047857; background: rgba(4,120,87,0.05); box-shadow: 0 0 0 1px rgba(4,120,87,0.2); }
        .admin-portal .android-input::placeholder { color: #525252; }

        /* ── Landlord Management ── */
        .admin-portal .landlord-card { background: #1A1D21; border-radius: 20px; padding: 16px; border: 1px solid rgba(255,255,255,0.05); transition: all 0.2s ease; cursor: pointer; }
        .admin-portal .landlord-card:active { transform: scale(0.98); background: #1e2125; }

        .admin-portal .status-badge { font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 20px; display: inline-flex; align-items: center; gap: 4px; }
        .admin-portal .status-active { background: rgba(4,120,87,0.15); color: #059669; }
        .admin-portal .status-pending { background: rgba(234,179,8,0.15); color: #eab308; }
        .admin-portal .status-suspended { background: rgba(239,68,68,0.15); color: #ef4444; }
        .admin-portal .status-unverified { background: rgba(107,114,128,0.15); color: #9ca3af; }

        .admin-portal .filter-chip { font-size: 13px; font-weight: 500; padding: 8px 16px; border-radius: 20px; border: 1.5px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.03); color: #a3a3a3; cursor: pointer; transition: all 0.2s ease; white-space: nowrap; }
        .admin-portal .filter-chip.active { background: rgba(4,120,87,0.15); border-color: rgba(4,120,87,0.3); color: #059669; }
        .admin-portal .filter-chip:active { transform: scale(0.95); }

        .admin-portal .search-bar { background: rgba(255,255,255,0.05); border: 1.5px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 12px 16px; display: flex; align-items: center; gap: 10px; transition: all 0.2s ease; }
        .admin-portal .search-bar:focus-within { border-color: #047857; background: rgba(4,120,87,0.05); }
        .admin-portal .search-bar input { background: none; border: none; outline: none; color: #e5e5e5; font-size: 15px; width: 100%; }
        .admin-portal .search-bar input::placeholder { color: #525252; }

        .admin-portal .avatar { display: flex; align-items: center; justify-content: center; border-radius: 50%; font-weight: 700; color: white; flex-shrink: 0; }

        .admin-portal .info-row { display: flex; align-items: center; gap: 12px; padding: 14px 0; border-bottom: 1px solid rgba(255,255,255,0.04); }
        .admin-portal .info-row:last-child { border-bottom: none; }

        .admin-portal .toggle-track { width: 48px; height: 28px; border-radius: 14px; background: rgba(255,255,255,0.1); position: relative; cursor: pointer; transition: background 0.2s ease; flex-shrink: 0; }
        .admin-portal .toggle-track.active { background: #047857; }
        .admin-portal .toggle-thumb { width: 22px; height: 22px; border-radius: 11px; background: white; position: absolute; top: 3px; left: 3px; transition: transform 0.2s ease; box-shadow: 0 2px 6px rgba(0,0,0,0.3); }
        .admin-portal .toggle-track.active .toggle-thumb { transform: translateX(20px); }

        .admin-portal .property-mini-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 14px; padding: 12px; display: flex; gap: 10px; }

        .admin-portal .btn-warning { background: linear-gradient(to right, #d97706, #f59e0b); color: white; font-weight: 600; font-size: 14px; padding: 12px 20px; border-radius: 12px; border: none; cursor: pointer; transition: all 0.15s ease; box-shadow: 0 4px 15px rgba(217,119,6,0.3); }
        .admin-portal .btn-warning:active { transform: scale(0.96); }
        .admin-portal .btn-primary:disabled, .admin-portal .btn-danger:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
        .admin-portal .btn-warning:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
        .admin-portal .btn-purple { background: linear-gradient(to right, #7c3aed, #a855f7); color: white; font-weight: 600; font-size: 14px; padding: 12px 20px; border-radius: 12px; border: none; cursor: pointer; box-shadow: 0 4px 15px rgba(124,58,237,0.3); }
        .admin-portal .btn-purple:active { transform: scale(0.96); }
        .admin-portal .btn-purple:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

        /* ── Listings Management ── */
        .admin-portal .listing-card { background: #1A1D21; border-radius: 20px; overflow: hidden; border: 1px solid rgba(255,255,255,0.05); transition: all 0.2s ease; cursor: pointer; }
        .admin-portal .listing-card:active { transform: scale(0.98); }

        .admin-portal .status-rejected { background: rgba(239,68,68,0.15); color: #ef4444; }
        .admin-portal .status-expired { background: rgba(107,114,128,0.15); color: #9ca3af; }
        .admin-portal .status-flagged { background: rgba(168,85,247,0.15); color: #a855f7; }
        .admin-portal .status-featured { background: rgba(234,179,8,0.15); color: #eab308; }

        .admin-portal .img-dots { display: flex; gap: 4px; justify-content: center; }
        .admin-portal .img-dot { width: 6px; height: 6px; border-radius: 3px; background: rgba(255,255,255,0.3); transition: all 0.2s ease; }
        .admin-portal .img-dot.active { width: 18px; background: white; border-radius: 3px; }

        .admin-portal .amenity-tag { font-size: 11px; font-weight: 500; padding: 4px 10px; border-radius: 8px; background: rgba(255,255,255,0.05); color: #a3a3a3; }

        /* ── Platform Settings ── */
        .admin-portal .setting-card { background: #1A1D21; border-radius: 20px; border: 1px solid rgba(255,255,255,0.05); overflow: hidden; }
        .admin-portal .setting-row { display: flex; align-items: center; gap: 14px; padding: 16px 20px; transition: background 0.15s ease; cursor: pointer; }
        .admin-portal .setting-row:active { background: rgba(255,255,255,0.03); }
        .admin-portal .setting-row + .setting-row { border-top: 1px solid rgba(255,255,255,0.04); }
        .admin-portal .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #525252; padding: 0 20px; margin-bottom: 8px; margin-top: 24px; }
        .admin-portal .tag { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 500; padding: 8px 14px; border-radius: 12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); color: #e5e5e5; transition: all 0.15s ease; }
        .admin-portal .tag:active { transform: scale(0.95); }
        .admin-portal .tag-remove { width: 18px; height: 18px; border-radius: 9px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.1); cursor: pointer; transition: background 0.15s ease; }
        .admin-portal .tag-remove:active { background: rgba(239,68,68,0.3); }
        .admin-portal .admin-card { display: flex; align-items: center; gap: 12px; padding: 14px; border-radius: 14px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); }
        .admin-portal .secret-field { font-family: 'Courier New', monospace; font-size: 13px; letter-spacing: 1px; }

        /* ── Support & Disputes ── */
        .admin-portal .ticket-card { background: #1A1D21; border-radius: 16px; padding: 14px; border: 1px solid rgba(255,255,255,0.05); border-left: 4px solid transparent; transition: all 0.2s ease; cursor: pointer; }
        .admin-portal .ticket-card:active { transform: scale(0.98); }
        .admin-portal .ticket-card.priority-high { border-left-color: #ef4444; }
        .admin-portal .ticket-card.priority-medium { border-left-color: #eab308; }
        .admin-portal .ticket-card.priority-low { border-left-color: #3b82f6; }

        .admin-portal .priority-badge { font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
        .admin-portal .priority-high { background: rgba(239,68,68,0.15); color: #ef4444; }
        .admin-portal .priority-medium { background: rgba(234,179,8,0.15); color: #eab308; }
        .admin-portal .priority-low { background: rgba(59,130,246,0.15); color: #3b82f6; }

        .admin-portal .status-open { background: rgba(239,68,68,0.15); color: #ef4444; }
        .admin-portal .status-in-progress { background: rgba(59,130,246,0.15); color: #3b82f6; }
        .admin-portal .status-escalated { background: rgba(168,85,247,0.15); color: #a855f7; }
        .admin-portal .status-resolved { background: rgba(4,120,87,0.15); color: #059669; }
        .admin-portal .status-closed { background: rgba(107,114,128,0.15); color: #9ca3af; }

        .admin-portal .cat-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

        .admin-portal .timeline-dot { width: 10px; height: 10px; border-radius: 50%; border: 2px solid; flex-shrink: 0; background: #1A1D21; }
        .admin-portal .timeline-line { width: 2px; flex-shrink: 0; margin-left: 4px; background: rgba(255,255,255,0.06); }
      `}</style>
    </div>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";
import BottomNavAndMenu from "@/app/components/BottomNavAndMenu";
import { useRouter } from "next/navigation";
import {
  Building2,
  LayoutDashboard,
  List,
  Menu,
  ChevronRight,
  Check,
  X,
  Info,
  Phone,
  MessageCircle,
  Smartphone,
  Camera,
  Image,
  FileText,
  Lock,
  ShieldCheck,
  Mail,
  CalendarClock,
  Receipt,
  Eye,
  Banknote,
  Bell,
  Megaphone,
  MessageSquareWarning,
  Moon,
  Globe,
  Trash2,
  LifeBuoy,
  Shield,
  Star,
  LogOut,
  HardDrive,
  AlertTriangle,
  Pencil,
  User,
  BellOff,
  Archive,
  Search,
  CheckCircle,
  Layers,
  MessageSquare,
  Settings as SettingsIcon,
  CalendarDays,
  Clock,
  BadgeCheck,
  DoorOpen,
  ArrowLeft,
} from "lucide-react";

import AuthGuard from "../components/AuthGuard";
import { useAuth } from "../AuthContext";
import { updateUserProfile, updateUserMpesa } from "@/lib/admin";
import { listenToProperties } from "@/lib/properties";
import { listenToUnits } from "@/lib/units";
import type { PropertyData } from "@/lib/properties";
import type { UnitData } from "@/lib/units";
import {
  updatePassword,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { pickAndUploadPhoto } from "@/lib/upload";
import { normalizePhone } from "@/lib/phone";
import { listenToNotifications } from "@/lib/notifications";
import type { NotificationData } from "@/lib/notifications";
type SnackbarType = "success" | "error" | "info";

export default function SettingsPage() {
  const router = useRouter();
  const { user, role, signOut } = useAuth();

  // ---- Tab State ----
  const [activeTab, setActiveTab] = useState("more");
  const [activeSheet, setActiveSheet] = useState<string | null>(null);

  // ---- Profile State ----
  const userDisplayName = user?.displayName || "User";
  const userEmail = user?.email || "";
  const [userPhone, setUserPhone] = useState("+254 ");
  const userInitials = userDisplayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "U";

  const [profileName, setProfileName] = useState(userDisplayName);
  const [profileEmail, setProfileEmail] = useState(userEmail);
  const [profileBio, setProfileBio] = useState(role === "landlord" ? "Landlord managing rental properties" : "");
  const [profileLocation, setProfileLocation] = useState("Nairobi, Kenya");
  const [profilePhone, setProfilePhone] = useState(userPhone);
  const [profileAvatar, setProfileAvatar] = useState("");

  // ---- Firestore Stats & Phone ----
  const [properties, setProperties] = useState<PropertyData[]>([]);
  const [units, setUnits] = useState<UnitData[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);

  // Fetch phone & notification preferences from Firestore on mount
  useEffect(() => {
    if (!user?.uid) return;
    getDoc(doc(db, "users", user.uid)).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const phone = data.phoneNumber || data.phone || "+254 ";
        setUserPhone(phone);
        setProfilePhone(phone);
        // Load notification preferences
        const prefs = data.notificationPreferences;
        if (prefs && typeof prefs === "object") {
          setToggles((prev) => ({ ...prev, ...prefs }));
        }
      }
    }).catch(() => {});
  }, [user?.uid]);

  // ---- Password State ----
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwStrength, setPwStrength] = useState(0);
  const [currentPwError, setCurrentPwError] = useState("");
  const [confirmPwError, setConfirmPwError] = useState("");

  // ---- Phone State ----
  const [newPhone, setNewPhone] = useState("");
  const [phonePassword, setPhonePassword] = useState("");
  const [phoneError, setPhoneError] = useState("");

  // ---- M-Pesa State ----
  const [mpesaType, setMpesaType] = useState("personal");
  const [mpesaPhone, setMpesaPhone] = useState("0712345678");

  // ---- Delete Account State ----
  const [deleteConfirm, setDeleteConfirm] = useState("");

  // ---- Toggle States ----
  const [toggles, setToggles] = useState({
    newInquiries: true,
    viewingRequests: true,
    paymentAlerts: true,
    reminders: true,
    promotions: false,
    darkMode: true,
    emailNewInquiries: true,
    emailReceipts: true,
    emailReports: false,
    emailMarketing: false,
  });

  // ---- Snackbar ----
  const [snackbar, setSnackbar] = useState<{ show: boolean; message: string; type: SnackbarType }>({ show: false, message: "", type: "info" });
  const snackbarTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarAnimClass, setSnackbarAnimClass] = useState("");

  // ---- Loading ----
  const [formLoading, setFormLoading] = useState<string | null>(null);

  // ---- Bunny.net Test Connection ----
  const [bunnyTesting, setBunnyTesting] = useState(false);

  // ---- Snackbar ----
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

  const showSnackbar = (message: string, type: SnackbarType = "info") => {
    setSnackbar({ show: true, message, type });
    if (snackbarTimeoutRef.current) clearTimeout(snackbarTimeoutRef.current);
    snackbarTimeoutRef.current = setTimeout(() => {
      setSnackbar({ show: false, message: "", type: "info" });
    }, 3000);
  };

  const hideSnackbar = () => setSnackbar({ show: false, message: "", type: "info" });

  // ---- Bunny.net Test Connection Handler ----
  const handleTestBunnyConnection = async () => {
    setBunnyTesting(true);
    try {
      const res = await fetch("/api/test-bunny-connection");
      const data = await res.json();
      if (data.success) {
        showSnackbar(data.message, "success");
      } else {
        showSnackbar(data.message, "error");
      }
    } catch (err: any) {
      showSnackbar("Failed to test connection: " + (err.message || "Network error"), "error");
    } finally {
      setBunnyTesting(false);
    }
  };

  // ---- Sheets ----
  const openSheet = (name: string) => setActiveSheet(name);
  const closeSheet = () => setActiveSheet(null);

  // ---- Toggle ----
  const toggleSwitch = (key: keyof typeof toggles) => {
    const newValue = !toggles[key];
    setToggles((prev) => ({ ...prev, [key]: newValue }));
    // Persist notification & app preferences to Firestore immediately
    if (user?.uid && key !== "emailNewInquiries" && key !== "emailReceipts" && key !== "emailReports" && key !== "emailMarketing") {
      updateDoc(doc(db, "users", user.uid), {
        [`notificationPreferences.${key}`]: newValue,
      }).catch((err) => console.error("Failed to save notification preference:", err));
    }
  };

  // ---- Form Handler ----
  const handleForm = async (id: string) => {
    setFormLoading(id);
    if (id === "logout") {
      closeSheet();
      await signOut();
      return;
    }
    if (id === "changePassword") {
      try {
        if (!auth.currentUser || !auth.currentUser.email) throw new Error("Not authenticated");
        // Reauthenticate before changing password
        const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
        await reauthenticateWithCredential(auth.currentUser, credential);
        await updatePassword(auth.currentUser, newPassword);
        setFormLoading(null);
        closeSheet();
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => showSnackbar("Password changed successfully", "success"), 300);
      } catch (err: any) {
        setFormLoading(null);
        if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
          setCurrentPwError("Current password is incorrect");
        } else if (err.code === "auth/weak-password") {
          showSnackbar("New password is too weak. Use at least 6 characters.", "error");
        } else if (err.code === "auth/requires-recent-login") {
          showSnackbar("Please log out and log back in before changing your password", "error");
        } else {
          showSnackbar(err.message || "Failed to change password", "error");
        }
      }
      return;
    }
    if (id === "changePhone") {
      try {
        if (!auth.currentUser) throw new Error("Not authenticated");
        await updateUserProfile(user!.uid, { phoneNumber: normalizePhone(newPhone) });
        setFormLoading(null);
        closeSheet();
        setNewPhone("");
        setPhonePassword("");
        setTimeout(() => showSnackbar("Phone number updated successfully", "success"), 300);
      } catch (err: any) {
        setFormLoading(null);
        showSnackbar(err.message || "Failed to update phone", "error");
      }
      return;
    }
    if (id === "deleteAccount") {
      try {
        if (!auth.currentUser) throw new Error("Not authenticated");
        await deleteUser(auth.currentUser);
        setFormLoading(null);
        closeSheet();
        setTimeout(() => showSnackbar("Account deleted", "info"), 300);
        await signOut();
      } catch (err: any) {
        setFormLoading(null);
        showSnackbar(err.message || "Failed to delete account. Try re-authenticating first.", "error");
      }
      return;
    }
    if (id === "saveEmailPrefs") {
      try {
        if (!user?.uid) throw new Error("Not authenticated");
        await updateDoc(doc(db, "users", user.uid), {
          emailPreferences: {
            newInquiries: toggles.emailNewInquiries,
            viewingRequests: toggles.viewingRequests,
            paymentAlerts: toggles.emailReceipts,
            marketing: toggles.emailMarketing,
            reports: toggles.emailReports,
            reminders: toggles.reminders,
          },
        });
        setFormLoading(null);
        closeSheet();
        setTimeout(() => showSnackbar("Email preferences saved", "success"), 300);
      } catch (err: any) {
        setFormLoading(null);
        showSnackbar(err.message || "Failed to save preferences", "error");
      }
      return;
    }
    setTimeout(() => {
      setFormLoading(null);
      closeSheet();
      setTimeout(() => showSnackbar("Updated", "success"), 300);
    }, 1000);
  };

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

  // ---- Firestore Listeners ----
  useEffect(() => {
    if (!user?.uid) return;
    setStatsLoading(true);
    const unsubProps = listenToProperties(
      user.uid,
      (data) => {
        setProperties(data);
        setStatsLoading(false);
      },
      (err) => {
        console.error("Failed to load properties:", err);
        setStatsLoading(false);
      },
    );
    const unsubUnits = listenToUnits(
      user.uid,
      (data) => setUnits(data),
      (err) => console.error("Failed to load units:", err),
    );
    return () => {
      unsubProps();
      unsubUnits();
    };
  }, [user?.uid]);

  // ---- Listen to notifications ----
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = listenToNotifications(
      user.uid,
      (data) => {
        setNotifications(data);
      },
      (err) => {
        console.error("Notifications error:", err);
      }
    );
    return () => unsub();
  }, [user?.uid]);

  const totalProperties = properties.length;
  const totalUnits = units.length;
  const occupiedUnits = units.filter((u) => u.status === "Occupied").length;
  const occupancyPct = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

  // ---- Snackbar Icon ----
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

  // ---- Password Strength ----
  const checkPwStrength = (pw: string) => {
    let s = 0;
    if (pw.length >= 8) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    setPwStrength(s);
  };

  // ---- Handle Save Profile ----
  const handleSaveProfile = async () => {
    if (!profileName.trim()) {
      showSnackbar("Name is required", "error");
      return;
    }
    if (!user?.uid) return;
    setFormLoading("saveProfile");
    try {
      await updateUserProfile(user.uid, {
        displayName: profileName.trim(),
        email: profileEmail.trim(),
        bio: profileBio.trim(),
        location: profileLocation.trim(),
      });
      setFormLoading(null);
      closeSheet();
      setTimeout(() => showSnackbar("Profile updated successfully", "success"), 300);
    } catch (err: any) {
      setFormLoading(null);
      showSnackbar("Failed to update profile: " + (err.message || "Unknown error"), "error");
    }
  };

  // ---- Handle Change Password ----
  const handleChangePassword = () => {
    setCurrentPwError("");
    setConfirmPwError("");
    if (!currentPassword) {
      setCurrentPwError("Current password is required");
      return;
    }
    if (newPassword.length < 8) {
      showSnackbar("New password must be at least 8 characters", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      setConfirmPwError("Passwords don't match");
      return;
    }
    handleForm("changePassword");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  // ---- Handle Change Phone ----
  const handleChangePhone = () => {
    if (!/^0[17]\d{8}$/.test(newPhone.replace(/\s/g, ""))) {
      setPhoneError("Enter a valid Kenyan phone number");
      return;
    }
    if (!phonePassword) {
      showSnackbar("Password is required", "error");
      return;
    }
    setPhoneError("");
    handleForm("changePhone");
  };

  // ---- Handle Avatar ----
  const handleChoosePhoto = () => {
    closeSheet();
    const seed = Math.random().toString(36).substr(2, 8);
    setProfileAvatar('');
    showSnackbar("Photo updated", "success");
  };

  const handleRemovePhoto = () => {
    closeSheet();
    setProfileAvatar("");
    showSnackbar("Photo removed", "success");
  };

  // ---- Styles ----
  const settingsRowStyle = {
    display: "flex",
    alignItems: "center",
    padding: "16px",
    gap: "14px",
    borderRadius: "14px",
    cursor: "pointer",
    transition: "background 0.15s ease",
    background: "transparent",
    border: "none",
    width: "100%" as const,
    textAlign: "left" as const,
    color: "inherit",
    fontFamily: "inherit",
  } as const;

  return (
    <AuthGuard>

    <div style={{ background: "#050505", color: "#e5e5e5", fontFamily: "'Inter', sans-serif" }}>
      <div className="app-shell">
        <div className="status-bar" />

        {/* ====== HEADER ====== */}
        <div className="app-header">
          <div className="flex items-center justify-between px-3 pt-2 pb-1">
            <div className="flex items-center gap-3">
              <button onClick={() => router.push("/dashboard")} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)" }}>
                <ArrowLeft className="w-5 h-5" style={{ color: "#a3a3a3" }} />
              </button>
              <div>
                <h1 className="text-xl font-bold text-white">Settings</h1>
                <p className="text-xs mt-0.5" style={{ color: "#a3a3a3" }}>Account & preferences</p>
              </div>
            </div>
            <button onClick={() => openSheet("editProfile")} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(4,120,87,0.1)", border: "1px solid rgba(4,120,87,0.2)" }}>
              <Pencil className="w-4 h-4" style={{ color: "#047857" }} />
            </button>
          </div>
        </div>

        {/* ====== MAIN CONTENT ====== */}
        <div className="app-content" style={{ paddingBottom: "80px" }}>
          {/* PROFILE CARD */}
          <div className="px-3 pt-4 pb-2">
            <div className="section-card p-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "20px" }}>
              <div className="flex items-center gap-4">
                <div style={{ padding: "3px", borderRadius: "50%", background: "linear-gradient(135deg, #047857, #059669)" }}>
                  <div className="w-20 h-20 rounded-full overflow-hidden relative cursor-pointer" onClick={() => openSheet("avatar")}>
                    {profileAvatar ? (
                      <img src={profileAvatar} className="w-full h-full object-cover" alt="Profile" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ background: "#1A1D21" }}>
                        <span className="text-2xl font-bold" style={{ color: "#333" }}>{userInitials}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-white truncate">{profileName}</h2>
                    <span className="badge badge-success px-2 py-1 rounded-full text-xs font-semibold" style={{ background: "rgba(4,120,87,0.15)", color: "#047857" }}>
                      <CheckCircle className="w-3 h-3 inline" /> Verified
                    </span>
                  </div>
                  <p className="text-sm mt-0.5 truncate" style={{ color: "#a3a3a3" }}>{profileEmail}</p>
                  <p className="text-sm truncate" style={{ color: "#a3a3a3" }}>🇰🇪 {profilePhone}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-5">
                <div className="text-center p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
                  <p className="text-xl font-bold text-white">{statsLoading ? "—" : totalProperties}</p>
                  <p className="text-xs mt-0.5" style={{ color: "#525252" }}>Properties</p>
                </div>
                <div className="text-center p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
                  <p className="text-xl font-bold text-white">{statsLoading ? "—" : totalUnits}</p>
                  <p className="text-xs mt-0.5" style={{ color: "#525252" }}>Units</p>
                </div>
                <div className="text-center p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
                  <p className="text-xl font-bold" style={{ color: "#047857" }}>{statsLoading ? "—" : `${occupancyPct}%`}</p>
                  <p className="text-xs mt-0.5" style={{ color: "#525252" }}>Occupied</p>
                </div>
              </div>
            </div>
          </div>

          {/* ACCOUNT */}
          <div className="px-3 pt-6">
            <p className="section-title text-xs font-semibold uppercase tracking-wider px-3 mb-2" style={{ color: "#525252" }}>Account</p>
            <div className="section-card" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "20px", overflow: "hidden" }}>
              <SettingsRow icon={Lock} color="#3b82f6" title="Change Password" desc="Last changed 30 days ago" onClick={() => openSheet("changePassword")} />
              <div className="section-divider" style={{ height: "1px", background: "rgba(255,255,255,0.05)", margin: "0 16px" }} />
              <SettingsRow icon={Smartphone} color="#047857" title="Change Phone Number" desc={profilePhone} onClick={() => openSheet("changePhone")} />
              <div className="section-divider" style={{ height: "1px", background: "rgba(255,255,255,0.05)", margin: "0 16px" }} />
              <SettingsRow icon={ShieldCheck} color="#a855f7" title="Verification" desc="ID & documents" value="Verified" valueColor="#047857" onClick={() => openSheet("verification")} />
              <div className="section-divider" style={{ height: "1px", background: "rgba(255,255,255,0.05)", margin: "0 16px" }} />
              <SettingsRow icon={Mail} color="#eab308" title="Email Preferences" desc="Notifications & marketing" onClick={() => openSheet("emailPrefs")} />
            </div>
          </div>

          {/* M-PESA & PAYMENTS */}
          <div className="px-3 pt-6">
            <p className="section-title text-xs font-semibold uppercase tracking-wider px-3 mb-2" style={{ color: "#525252" }}>M-Pesa & Payments</p>
            <div className="section-card" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "20px", overflow: "hidden" }}>
              <SettingsRow icon={Smartphone} color="#047857" title="M-Pesa Details" desc="Receive rent payments via M-Pesa" onClick={() => openSheet("mpesa")} />
              <div className="section-divider" style={{ height: "1px", background: "rgba(255,255,255,0.05)", margin: "0 16px" }} />
              <SettingsRow icon={CalendarClock} color="#f97316" title="Payout Schedule" desc="Monthly, 5th of each month" value="Active" valueColor="#047857" onClick={() => openSheet("payout")} />
              <div className="section-divider" style={{ height: "1px", background: "rgba(255,255,255,0.05)", margin: "0 16px" }} />
              <SettingsRow icon={Receipt} color="#3b82f6" title="Transaction History" desc="View all payments received" onClick={() => router.push('/units')} />
            </div>
          </div>

          {/* NOTIFICATIONS */}
          <div className="px-3 pt-6">
            <p className="section-title text-xs font-semibold uppercase tracking-wider px-3 mb-2" style={{ color: "#525252" }}>Notifications</p>
            <div className="section-card" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "20px", overflow: "hidden" }}>
              <ToggleRow icon={MessageSquare} color="#3b82f6" title="New Inquiries" desc="When tenants ask about your property" toggled={toggles.newInquiries} onToggle={() => toggleSwitch("newInquiries")} />
              <div className="section-divider" style={{ height: "1px", background: "rgba(255,255,255,0.05)", margin: "0 16px" }} />
              <ToggleRow icon={Eye} color="#a855f7" title="Viewing Requests" desc="When tenants request property visits" toggled={toggles.viewingRequests} onToggle={() => toggleSwitch("viewingRequests")} />
              <div className="section-divider" style={{ height: "1px", background: "rgba(255,255,255,0.05)", margin: "0 16px" }} />
              <ToggleRow icon={Banknote} color="#047857" title="Payment Alerts" desc="When rent is paid via M-Pesa" toggled={toggles.paymentAlerts} onToggle={() => toggleSwitch("paymentAlerts")} />
              <div className="section-divider" style={{ height: "1px", background: "rgba(255,255,255,0.05)", margin: "0 16px" }} />
              <ToggleRow icon={Bell} color="#eab308" title="Reminders" desc="Late rent & lease expiry alerts" toggled={toggles.reminders} onToggle={() => toggleSwitch("reminders")} />
              <div className="section-divider" style={{ height: "1px", background: "rgba(255,255,255,0.05)", margin: "0 16px" }} />
              <ToggleRow icon={Megaphone} color="#ef4444" title="Promotions" desc="Tips, offers & feature updates" toggled={toggles.promotions} onToggle={() => toggleSwitch("promotions")} />
            </div>
          </div>

          {/* APP */}
          <div className="px-3 pt-6">
            <p className="section-title text-xs font-semibold uppercase tracking-wider px-3 mb-2" style={{ color: "#525252" }}>App</p>
            <div className="section-card" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "20px", overflow: "hidden" }}>
              <ToggleRow icon={Moon} color="#8b5cf6" title="Dark Mode" desc="Currently enabled" toggled={toggles.darkMode} onToggle={() => { toggleSwitch("darkMode"); showSnackbar("Dark mode preference saved", "success"); }} />
              <div className="section-divider" style={{ height: "1px", background: "rgba(255,255,255,0.05)", margin: "0 16px" }} />
              <SettingsRow icon={Globe} color="#06b6d4" title="Language" desc="App display language" value="English" onClick={() => openSheet("language")} />
              <div className="section-divider" style={{ height: "1px", background: "rgba(255,255,255,0.05)", margin: "0 16px" }} />
              <SettingsRow icon={Trash2} color="#6b7280" title="Clear Cache" desc="Free up storage space" value="24 MB" onClick={() => showSnackbar("Cache cleared — 24 MB freed", "success")} />
            </div>
          </div>

          {/* STORAGE & INTEGRATIONS */}
          <div className="px-3 pt-6">
            <p className="section-title text-xs font-semibold uppercase tracking-wider px-3 mb-2" style={{ color: "#525252" }}>Storage & Integrations</p>
            <div className="section-card" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "20px", overflow: "hidden" }}>
              <button
                onClick={handleTestBunnyConnection}
                disabled={bunnyTesting}
                style={{ ...settingsRowStyle, opacity: bunnyTesting ? 0.5 : 1 }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(244,114,182,0.1)" }}>
                  {bunnyTesting ? (
                    <div className="spinner w-5 h-5" style={{ borderTopColor: "#f472b6", borderColor: "rgba(244,114,182,0.3)" }} />
                  ) : (
                    <HardDrive className="w-5 h-5" style={{ color: "#f472b6" }} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">Test Bunny.net Connection</p>
                  <p className="text-xs mt-0.5" style={{ color: "#525252" }}>
                    {bunnyTesting ? "Testing..." : "Verify storage credentials are working"}
                  </p>
                </div>
                {!bunnyTesting && <ChevronRight className="w-5 h-5 flex-shrink-0" style={{ color: "#525252" }} />}
              </button>
            </div>
          </div>

          {/* SUPPORT & LEGAL */}
          <div className="px-3 pt-6">
            <p className="section-title text-xs font-semibold uppercase tracking-wider px-3 mb-2" style={{ color: "#525252" }}>Support & Legal</p>
            <div className="section-card" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "20px", overflow: "hidden" }}>
              <SettingsRow icon={LifeBuoy} color="#047857" title="Help Center" onClick={() => window.open('https://rentke.com/help', '_blank')} />
              <div className="section-divider" style={{ height: "1px", background: "rgba(255,255,255,0.05)", margin: "0 16px" }} />
              <SettingsRow icon={MessageCircle} color="#25D366" title="Chat Support" onClick={() => window.open('https://wa.me/254700000000', '_blank')} />
              <div className="section-divider" style={{ height: "1px", background: "rgba(255,255,255,0.05)", margin: "0 16px" }} />
              <SettingsRow icon={FileText} color="#6b7280" title="Terms of Service" onClick={() => window.open('https://rentke.com/terms', '_blank')} />
              <div className="section-divider" style={{ height: "1px", background: "rgba(255,255,255,0.05)", margin: "0 16px" }} />
              <SettingsRow icon={Shield} color="#6b7280" title="Privacy Policy" onClick={() => window.open('https://rentke.com/privacy', '_blank')} />
              <div className="section-divider" style={{ height: "1px", background: "rgba(255,255,255,0.05)", margin: "0 16px" }} />
              <SettingsRow icon={Star} color="#eab308" title="Rate RentKe" onClick={() => window.open('https://play.google.com/store/apps/details?id=com.rentke.app', '_blank')} />
            </div>
          </div>

          {/* DANGER ZONE */}
          <div className="px-3 pt-6">
            <p className="section-title text-xs font-semibold uppercase tracking-wider px-3 mb-2" style={{ color: "#ef4444" }}>Danger Zone</p>
            <div className="section-card" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(239,68,68,0.1)", borderRadius: "20px", overflow: "hidden" }}>
              <button onClick={() => openSheet("logout")} style={settingsRowStyle}>
                <div className="row-icon w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(239,68,68,0.1)" }}>
                  <LogOut className="w-5 h-5" style={{ color: "#ef4444" }} />
                </div>
                <div className="row-content flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium" style={{ color: "#ef4444" }}>Log Out</p>
                </div>
              </button>
              <div className="section-divider" style={{ height: "1px", background: "rgba(239,68,68,0.1)", margin: "0 16px" }} />
              <button onClick={() => openSheet("deleteAccount")} style={settingsRowStyle}>
                <div className="row-icon w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(239,68,68,0.1)" }}>
                  <Trash2 className="w-5 h-5" style={{ color: "#ef4444" }} />
                </div>
                <div className="row-content flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium" style={{ color: "#ef4444" }}>Delete Account</p>
                  <p className="text-xs mt-0.5" style={{ color: "#ef4444", opacity: 0.6 }}>Permanently remove your account & data</p>
                </div>
              </button>
            </div>
          </div>

          {/* VERSION */}
          <div className="text-center py-8">
            <p className="text-xs" style={{ color: "#333" }}>RentKe v1.0.0 (MVP)</p>
            <p className="text-xs mt-1" style={{ color: "#333" }}>Made with ❤️ in Kenya</p>
          </div>
        </div>

        <BottomNavAndMenu />
      </div>

      {/* =============================================== */}
      {/* ALL SHEETS */}
      {/* =============================================== */}

      {/* EDIT PROFILE */}
      <SheetOverlay active={activeSheet === "editProfile"} onClose={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "editProfile" ? "active" : ""}`} style={{ maxHeight: "95dvh" }}>
        <div className="sheet-handle" />
        <div className="p-3">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-white">Edit Profile</h3>
            <button onClick={closeSheet} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)" }}>
              <X className="w-4 h-4" style={{ color: "#a3a3a3" }} />
            </button>
          </div>
          <div className="space-y-4">
            <div className="input-group">
              <input type="text" className="android-input" placeholder=" " value={profileName} onChange={(e) => setProfileName(e.target.value)} />
              <label>Full Name</label>
            </div>
            <div className="input-group">
              <input type="email" className="android-input" placeholder=" " value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)} />
              <label>Email Address</label>
            </div>
            <div className="input-group">
              <input type="text" className="android-input" placeholder=" " value={profileBio} onChange={(e) => setProfileBio(e.target.value)} />
              <label>Bio</label>
            </div>
            <div className="input-group">
              <input type="text" className="android-input" placeholder=" " value={profileLocation} onChange={(e) => setProfileLocation(e.target.value)} />
              <label>Location</label>
            </div>
            <button onClick={handleSaveProfile} className="btn-primary ripple-container" disabled={formLoading === "saveProfile"}>
              {formLoading === "saveProfile" ? <div className="spinner mx-auto" /> : <span>Save Changes</span>}
            </button>
            <button onClick={closeSheet} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </div>

      {/* AVATAR */}
      <SheetOverlay active={activeSheet === "avatar"} onClose={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "avatar" ? "active" : ""}`}>
        <div className="sheet-handle" />
        <div className="p-3">
          <h3 className="text-lg font-bold text-white mb-4">Change Photo</h3>
          <div className="space-y-2">
            <ActionButton icon={Camera} color="#047857" label="Take Photo" onClick={async () => { closeSheet(); if (user?.uid) { const url = await pickAndUploadPhoto('profiles', user.uid); if (url) { setProfileAvatar(url); showSnackbar('Photo updated', 'success'); } } }} />
            <ActionButton icon={Image} color="#3b82f6" label="Choose from Gallery" onClick={handleChoosePhoto} />
            <ActionButton icon={Trash2} color="#ef4444" label="Remove Photo" isDanger onClick={handleRemovePhoto} />
          </div>
          <button onClick={closeSheet} className="btn-secondary mt-5">Cancel</button>
        </div>
      </div>

      {/* CHANGE PASSWORD */}
      <SheetOverlay active={activeSheet === "changePassword"} onClose={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "changePassword" ? "active" : ""}`} style={{ maxHeight: "95dvh" }}>
        <div className="sheet-handle" />
        <div className="p-3">
          <h3 className="text-lg font-bold text-white mb-1">Change Password</h3>
          <p className="text-sm mb-5" style={{ color: "#a3a3a3" }}>Your password must be at least 8 characters</p>
          <div className="space-y-4">
            <div className="input-group">
              <input type="password" className="android-input" placeholder=" " value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
              <label>Current Password</label>
            </div>
            {currentPwError && <p className="text-xs font-medium" style={{ color: "#ef4444" }}>{currentPwError}</p>}
            <div className="input-group">
              <input type="password" className="android-input" placeholder=" " value={newPassword} onChange={(e) => { setNewPassword(e.target.value); checkPwStrength(e.target.value); }} />
              <label>New Password</label>
            </div>
            <div className="flex gap-2 px-1">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-1 flex-1 rounded-full" style={{ background: i <= pwStrength ? (pwStrength >= 4 ? "#047857" : pwStrength >= 3 ? "#eab308" : "#ef4444") : "rgba(255,255,255,0.08)" }} />
              ))}
            </div>
            <div className="input-group">
              <input type="password" className="android-input" placeholder=" " value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              <label>Confirm New Password</label>
            </div>
            {confirmPwError && <p className="text-xs font-medium" style={{ color: "#ef4444" }}>{confirmPwError}</p>}
            <button onClick={handleChangePassword} className="btn-primary ripple-container" disabled={formLoading === "changePassword"}>
              {formLoading === "changePassword" ? <div className="spinner mx-auto" /> : <span>Update Password</span>}
            </button>
            <button onClick={() => { closeSheet(); setCurrentPwError(""); setConfirmPwError(""); }} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </div>

      {/* CHANGE PHONE */}
      <SheetOverlay active={activeSheet === "changePhone"} onClose={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "changePhone" ? "active" : ""}`} style={{ maxHeight: "95dvh" }}>
        <div className="sheet-handle" />
        <div className="p-3">
          <h3 className="text-lg font-bold text-white mb-1">Change Phone Number</h3>
          <p className="text-sm mb-5" style={{ color: "#a3a3a3" }}>We'll send an OTP to verify your new number</p>
          <div className="space-y-4">
            <div className="input-group">
              <input type="tel" className="android-input" placeholder=" " value={newPhone} onChange={(e) => setNewPhone(e.target.value)} maxLength={10} style={{ paddingLeft: "90px" }} />
              <label style={{ left: "90px" }}>New Phone Number</label>
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: "#a3a3a3" }}>🇰🇪 +254</span>
            </div>
            {phoneError && <p className="text-xs font-medium" style={{ color: "#ef4444" }}>{phoneError}</p>}
            <div className="input-group">
              <input type="password" className="android-input" placeholder=" " value={phonePassword} onChange={(e) => setPhonePassword(e.target.value)} />
              <label>Account Password</label>
            </div>
            <button onClick={handleChangePhone} className="btn-primary ripple-container" disabled={formLoading === "changePhone"}>
              {formLoading === "changePhone" ? <div className="spinner mx-auto" /> : <span>Verify & Change</span>}
            </button>
            <button onClick={() => { closeSheet(); setPhoneError(""); }} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </div>

      {/* M-PESA */}
      <SheetOverlay active={activeSheet === "mpesa"} onClose={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "mpesa" ? "active" : ""}`} style={{ maxHeight: "95dvh" }}>
        <div className="sheet-handle" />
        <div className="p-3">
          <h3 className="text-lg font-bold text-white mb-1">M-Pesa Details</h3>
          <p className="text-sm mb-5" style={{ color: "#a3a3a3" }}>Where tenants will send rent payments</p>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium mb-2" style={{ color: "#a3a3a3" }}>Payment Method</p>
              <div className="flex gap-2">
                {(["personal", "till", "paybill"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setMpesaType(type)}
                    className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all`}
                    style={mpesaType === type ? { background: "#047857", color: "white" } : { background: "rgba(255,255,255,0.05)", color: "#a3a3a3" }}
                  >
                    {type === "personal" ? "Personal" : type === "till" ? "Till Number" : "Paybill"}
                  </button>
                ))}
              </div>
            </div>
            {mpesaType === "personal" && (
              <div className="input-group">
                <input type="tel" className="android-input" placeholder=" " value={mpesaPhone} onChange={(e) => setMpesaPhone(e.target.value)} style={{ paddingLeft: "90px" }} />
                <label style={{ left: "90px" }}>M-Pesa Phone Number</label>
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: "#a3a3a3" }}>🇰🇪 +254</span>
              </div>
            )}
            {mpesaType === "till" && (
              <>
                <div className="input-group"><input type="text" className="android-input" placeholder=" " /><label>Till Number</label></div>
                <div className="input-group"><input type="text" className="android-input" placeholder=" " /><label>Business Name</label></div>
              </>
            )}
            {mpesaType === "paybill" && (
              <>
                <div className="input-group"><input type="text" className="android-input" placeholder=" " /><label>Paybill Number</label></div>
                <div className="input-group"><input type="text" className="android-input" placeholder=" " /><label>Account Number</label></div>
              </>
            )}
            <button onClick={async () => {
              if (!user?.uid) return;
              setFormLoading("saveMpesa");
              try {
                await updateUserMpesa(user.uid, {
                  mpesaType: mpesaType as "personal" | "till" | "paybill",
                  mpesaNumber: mpesaType === "personal" ? mpesaPhone : undefined,
                });
                setFormLoading(null);
                closeSheet();
                setTimeout(() => showSnackbar("M-Pesa details saved successfully", "success"), 300);
              } catch (err: any) {
                setFormLoading(null);
                showSnackbar("Failed to save: " + (err.message || "Unknown error"), "error");
              }
            }} className="btn-primary ripple-container" disabled={formLoading === "saveMpesa"}>
              {formLoading === "saveMpesa" ? <div className="spinner mx-auto" /> : <span>Save M-Pesa Details</span>}
            </button>
            <button onClick={closeSheet} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </div>

      {/* LANGUAGE */}
      <SheetOverlay active={activeSheet === "language"} onClose={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "language" ? "active" : ""}`}>
        <div className="sheet-handle" />
        <div className="p-3">
          <h3 className="text-lg font-bold text-white mb-4">Language</h3>
          <div className="space-y-2">
            <button onClick={() => { closeSheet(); showSnackbar("Language set to English", "success"); }} className="w-full flex items-center justify-between p-4 rounded-2xl" style={{ background: "rgba(4,120,87,0.1)", border: "1px solid rgba(4,120,87,0.3)" }}>
              <span className="text-sm font-medium text-white">English</span>
              <Check className="w-5 h-5" style={{ color: "#047857" }} />
            </button>
            <button onClick={() => { closeSheet(); showSnackbar("Language set to Kiswahili", "success"); }} className="w-full flex items-center justify-between p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.05)" }}>
              <span className="text-sm font-medium text-white">Kiswahili</span>
            </button>
          </div>
          <button onClick={closeSheet} className="btn-secondary mt-5">Cancel</button>
        </div>
      </div>

      {/* VERIFICATION */}
      <SheetOverlay active={activeSheet === "verification"} onClose={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "verification" ? "active" : ""}`}>
        <div className="sheet-handle" />
        <div className="p-3">
          <h3 className="text-lg font-bold text-white mb-4">Verification Status</h3>
          <div className="space-y-3">
            {[
              { icon: Check, label: "Kenyan National ID", desc: "Verified on Jan 15, 2024" },
              { icon: Check, label: "Phone Number", desc: profilePhone },
              { icon: Check, label: "Email Address", desc: profileEmail },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-4 rounded-2xl" style={{ background: "rgba(4,120,87,0.05)", border: "1px solid rgba(4,120,87,0.15)" }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(4,120,87,0.2)" }}>
                  <item.icon className="w-5 h-5" style={{ color: "#047857" }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{item.label}</p>
                  <p className="text-xs" style={{ color: "#525252" }}>{item.desc}</p>
                </div>
                <span className="badge px-2 py-1 rounded-full text-xs font-semibold" style={{ background: "rgba(4,120,87,0.15)", color: "#047857" }}>Verified</span>
              </div>
            ))}
          </div>
          <button onClick={closeSheet} className="btn-secondary mt-5">Close</button>
        </div>
      </div>

      {/* EMAIL PREFERENCES */}
      <SheetOverlay active={activeSheet === "emailPrefs"} onClose={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "emailPrefs" ? "active" : ""}`}>
        <div className="sheet-handle" />
        <div className="p-3">
          <h3 className="text-lg font-bold text-white mb-4">Email Preferences</h3>
          <div className="space-y-1">
            <ToggleRow icon={MessageSquare} color="#3b82f6" title="New Inquiries" toggled={toggles.emailNewInquiries} onToggle={() => toggleSwitch("emailNewInquiries")} />
            <ToggleRow icon={Receipt} color="#047857" title="Payment Receipts" toggled={toggles.emailReceipts} onToggle={() => toggleSwitch("emailReceipts")} />
            <ToggleRow icon={FileText} color="#eab308" title="Weekly Reports" toggled={toggles.emailReports} onToggle={() => toggleSwitch("emailReports")} />
            <ToggleRow icon={Megaphone} color="#a855f7" title="Marketing & Tips" toggled={toggles.emailMarketing} onToggle={() => toggleSwitch("emailMarketing")} />
          </div>
          <button onClick={() => handleForm("saveEmailPrefs")} className="btn-primary ripple-container mt-4" disabled={formLoading === "saveEmailPrefs"}>
            {formLoading === "saveEmailPrefs" ? <div className="spinner mx-auto" /> : <span>Save Preferences</span>}
          </button>
        </div>
      </div>

      {/* PAYOUT */}
      <SheetOverlay active={activeSheet === "payout"} onClose={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "payout" ? "active" : ""}`}>
        <div className="sheet-handle" />
        <div className="p-3">
          <h3 className="text-lg font-bold text-white mb-1">Payout Schedule</h3>
          <p className="text-sm mb-5" style={{ color: "#a3a3a3" }}>How often you receive M-Pesa payouts</p>
          <div className="space-y-2">
            {["Daily", "Weekly", "Monthly (5th)"].map((schedule, i) => (
              <button
                key={schedule}
                onClick={() => { closeSheet(); showSnackbar(`Payout schedule set to ${schedule}`, "success"); }}
                className="w-full flex items-center justify-between p-4 rounded-2xl"
                style={i === 2 ? { background: "rgba(4,120,87,0.1)", border: "1px solid rgba(4,120,87,0.3)" } : { background: "rgba(255,255,255,0.05)" }}
              >
                <span className="text-sm font-medium text-white">{schedule}</span>
                {i === 2 && <Check className="w-5 h-5" style={{ color: "#047857" }} />}
              </button>
            ))}
          </div>
          <button onClick={closeSheet} className="btn-secondary mt-5">Cancel</button>
        </div>
      </div>

      {/* LOGOUT */}
      <SheetOverlay active={activeSheet === "logout"} onClose={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "logout" ? "active" : ""}`}>
        <div className="sheet-handle" />
        <div className="p-5 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ background: "rgba(239,68,68,0.1)" }}>
            <LogOut className="w-8 h-8" style={{ color: "#ef4444" }} />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Log Out?</h3>
          <p className="text-sm mb-5" style={{ color: "#a3a3a3" }}>You'll need to sign in again to access your account</p>
          <button onClick={() => handleForm("logout")} className="btn-danger" disabled={formLoading === "logout"}>
            {formLoading === "logout" ? <div className="spinner mx-auto" /> : <span>Log Out</span>}
          </button>
          <button onClick={closeSheet} className="btn-secondary mt-3">Cancel</button>
        </div>
      </div>

      {/* DELETE ACCOUNT */}
      <SheetOverlay active={activeSheet === "deleteAccount"} onClose={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "deleteAccount" ? "active" : ""}`} style={{ maxHeight: "95dvh" }}>
        <div className="sheet-handle" />
        <div className="p-3">
          <div className="text-center mb-5">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ background: "rgba(239,68,68,0.1)" }}>
              <AlertTriangle className="w-8 h-8" style={{ color: "#ef4444" }} />
            </div>
            <h3 className="text-lg font-bold text-white">Delete Account?</h3>
            <p className="text-sm mt-2" style={{ color: "#a3a3a3" }}>
              This action is <strong className="text-white">permanent</strong> and cannot be undone. All your properties, listings, and data will be permanently deleted.
            </p>
          </div>
          <div className="p-4 rounded-2xl mb-4" style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)" }}>
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: "#ef4444" }} />
              <div>
                <p className="text-xs font-medium" style={{ color: "#ef4444" }}>You will lose:</p>
                <ul className="text-xs mt-1 space-y-1" style={{ color: "#ef4444", opacity: 0.7 }}>
                  <li>• 4 properties & 8 units</li>
                  <li>• All listing data & photos</li>
                  <li>• Transaction history</li>
                  <li>• Tenant conversations</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="input-group">
            <input type="text" className="android-input" placeholder=" " value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} style={{ borderColor: "rgba(239,68,68,0.2)" }} />
            <label style={{ color: "#ef4444" }}>Type DELETE to confirm</label>
          </div>
          <button
            onClick={() => handleForm("deleteAccount")}
            className="btn-danger mt-4"
            disabled={deleteConfirm !== "DELETE" || formLoading === "deleteAccount"}
            style={{ opacity: deleteConfirm === "DELETE" ? 1 : 0.3 }}
          >
            {formLoading === "deleteAccount" ? <div className="spinner mx-auto" /> : <span>Delete My Account</span>}
          </button>
          <button onClick={closeSheet} className="btn-secondary mt-3">Cancel</button>
        </div>
      </div>

      {/* MORE MENU */}


      {/* SNACKBAR */}
      {snackbarVisible && (
        <div className={`snackbar ${snackbarAnimClass}`}>
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
      </AuthGuard>
  );
}

// ====== Helper Components ======

function SheetOverlay({ active, onClose }: { active: boolean; onClose: () => void }) {
  return <div className={`sheet-overlay ${active ? "active" : ""}`} onClick={onClose} />;
}

function SettingsRow({
  icon: Icon,
  color,
  title,
  desc,
  value,
  valueColor,
  onClick,
}: {
  icon: any;
  color: string;
  title: string;
  desc?: string;
  value?: string;
  valueColor?: string;
  onClick: () => void;
}) {
  return (

    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        padding: "16px",
        gap: "14px",
        borderRadius: "14px",
        cursor: "pointer",
        background: "transparent",
        border: "none",
        width: "100%",
        textAlign: "left",
        color: "inherit",
        fontFamily: "inherit",
      }}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}1a` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">{title}</p>
        {desc && <p className="text-xs mt-0.5" style={{ color: "#525252" }}>{desc}</p>}
      </div>
      {value && <span className="text-sm" style={{ color: valueColor || "#525252" }}>{value}</span>}
      <ChevronRight className="w-5 h-5 flex-shrink-0" style={{ color: "#525252" }} />
    </button>
  );
}

function ToggleRow({
  icon: Icon,
  color,
  title,
  desc,
  toggled,
  onToggle,
}: {
  icon: any;
  color: string;
  title: string;
  desc?: string;
  toggled: boolean;
  onToggle: () => void;
}) {
  return (

    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "16px",
        gap: "14px",
        background: "transparent",
      }}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}1a` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">{title}</p>
        {desc && <p className="text-xs mt-0.5" style={{ color: "#525252" }}>{desc}</p>}
      </div>
      <div className={`toggle-track ${toggled ? "active" : ""}`} onClick={onToggle}>
        <div className="toggle-thumb" />
      </div>
    </div>
  );
}

function ActionButton({
  icon: Icon,
  color,
  label,
  isDanger,
  onClick,
}: {
  icon: any;
  color: string;
  label: string;
  isDanger?: boolean;
  onClick: () => void;
}) {
  return (

    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 p-4 rounded-2xl"
      style={{ background: isDanger ? "rgba(239,68,68,0.05)" : "rgba(255,255,255,0.03)" }}
    >
      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: `${color}1a` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <span className={`text-sm font-medium ${isDanger ? "" : "text-white"}`} style={isDanger ? { color: "#ef4444" } : {}}>
        {label}
      </span>
    </button>
  );
}

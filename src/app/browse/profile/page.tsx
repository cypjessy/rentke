"use client";

import { useState, useEffect } from "react";
import Avatar from "@/app/components/Avatar";
import { useBrowse } from "../BrowseContext";
import { useRouter } from "next/navigation";
import { useAuth } from "../../AuthContext";
import { updateUserProfile } from "@/lib/admin";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword as firebaseUpdatePassword,
} from "firebase/auth";
import {
  Edit3,
  ShieldCheck,
  Camera,
  CreditCard,
  ChevronRight,
  Bell,
  Moon,
  Sun,
  Globe,
  HelpCircle,
  FileText,
  Info,
  LogOut,
  User as UserIcon,
  Check,
  Lock,
  Smartphone,
  Share2,
  Gift,
  Copy,
  AlertTriangle,
  TrendingUp,
  Home,
  MessageCircle,
  Megaphone,
  Loader2,
} from "lucide-react";
import { pickAndUploadPhoto } from "@/lib/upload";
import { updateProfile } from "firebase/auth";

export default function ProfilePage() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { showSnackbar, viewingsCount, favorites } = useBrowse();

  // ---- Bottom Sheets ----
  const [sheetOpen, setSheetOpen] = useState<string | null>(null);
  const [bodyOverflow, setBodyOverflow] = useState(false);

  const openSheet = (id: string) => {
    setSheetOpen(id);
    setBodyOverflow(true);
  };
  const closeSheet = () => {
    setSheetOpen(null);
    setBodyOverflow(false);
  };

  // ---- Toggle Switches ----
  const [toggles, setToggles] = useState({
    notifications: true,
    darkMode: true,
    compactCards: false,
  });
  const toggleSwitch = (key: keyof typeof toggles, name: string) => {
    setToggles((prev) => {
      const next = !prev[key];
      showSnackbar(
        next ? `${name} enabled` : `${name} disabled`,
        next ? "success" : "info"
      );
      return { ...prev, [key]: next };
    });
  };

  // ---- Granular Notification Preferences ----
  // ---- Photo Upload State ----
  const [userPhotoURL, setUserPhotoURL] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [notifPrefs, setNotifPrefs] = useState({
    priceDrops: true,
    newListings: true,
    viewingReminders: true,
    messages: true,
    promotional: false,
  });
  const toggleNotifPref = (key: keyof typeof notifPrefs) => {
    setNotifPrefs((prev) => {
      const next = !prev[key];
      showSnackbar(
        next ? `${key} alert enabled` : `${key} alert disabled`,
        next ? "success" : "info"
      );
      return { ...prev, [key]: next };
    });
  };

  // ---- Referral Code ----
  const referralCode = "DAVIDRENTKE";
  const handleCopyReferral = () => {
    navigator.clipboard.writeText(referralCode).catch(() => {});
    showSnackbar("Referral code copied!", "success");
  };

  const handleUploadPhoto = async () => {
    if (!user?.uid) return;
    setUploadingPhoto(true);
    try {
      const url = await pickAndUploadPhoto("profiles", user.uid);
      if (url) {
        setUserPhotoURL(url);
        showSnackbar("Photo selected! Save your profile to apply.", "success");
      }
    } catch (err: any) {
      showSnackbar(err?.message || "Failed to upload photo", "error");
    } finally {
      setUploadingPhoto(false);
    }
  };

  // ---- Password Change ----
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const handleUpdatePassword = async () => {
    setPasswordError("");

    // Validate
    if (!currentPassword) {
      setPasswordError("Enter your current password");
      return;
    }
    if (!newPassword) {
      setPasswordError("Enter a new password");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    if (!user?.email) {
      setPasswordError("No email on account — try signing out and back in");
      return;
    }

    setPasswordLoading(true);

    try {
      // 1. Reauthenticate with current password
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // 2. Update the password
      await firebaseUpdatePassword(user, newPassword);

      setPasswordLoading(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      closeSheet();
      setTimeout(() => {
        showSnackbar("Password updated successfully!", "success");
      }, 300);
    } catch (err: any) {
      setPasswordLoading(false);
      const code = err.code;
      if (code === "auth/wrong-password") {
        setPasswordError("Current password is incorrect");
      } else if (code === "auth/weak-password") {
        setPasswordError("New password must be at least 6 characters");
      } else if (code === "auth/requires-recent-login") {
        setPasswordError("Please sign out and sign back in, then try again");
      } else {
        setPasswordError(err.message || "Failed to update password");
      }
    }
  };

  const userDisplayName = user?.displayName || "User";
  const userEmail = user?.email || "";
  const userInitial = userDisplayName.charAt(0).toUpperCase();

  // ---- Edit Profile ----
  const [editName, setEditName] = useState(userDisplayName);
  const [editEmail, setEditEmail] = useState(userEmail);
  const [editPhone, setEditPhone] = useState("712 345 678");
  // ---- Edit Profile active tab (reserved for future tabbed UI) ----

  const saveProfile = async () => {
    if (!editName.trim()) {
      showSnackbar("Name cannot be empty", "error");
      return;
    }
    closeSheet();
    try {
      if (user) {
        const updateData: any = {
          displayName: editName.trim(),
          email: editEmail.trim(),
          phoneNumber: editPhone.replace(/\s/g, ""),
        };
        if (userPhotoURL) {
          updateData.photoURL = userPhotoURL;
        }
        await updateUserProfile(user.uid, updateData);
        // Also update Firebase Auth profile
        await updateProfile(user, {
          displayName: editName.trim(),
          photoURL: userPhotoURL || undefined,
        });
      }
      showSnackbar("Profile updated successfully!", "success");
    } catch {
      showSnackbar("Failed to update profile", "error");
    }
  };



  // ---- Language ----
  const [selectedLang, setSelectedLang] = useState("English");

  const selectLanguage = (lang: string) => {
    setSelectedLang(lang);
    setTimeout(() => {
      closeSheet();
      showSnackbar(`Language set to ${lang}`, "success");
    }, 200);
  };

  // ---- Logout ----
  const handleLogout = async () => {
    closeSheet();
    try {
      await signOut();
    } catch {
      showSnackbar("Failed to sign out", "error");
    }
  };

  // ---- Body overflow (prevent background scroll when sheet is open) ----
  useEffect(() => {
    document.body.style.overflow = bodyOverflow ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [bodyOverflow]);

  // ---- Helper to check if a sheet is open ----
  const isOpen = (id: string) => sheetOpen === id;

  // ---- Stats (dynamic from context) ----
  const stats = [
    { value: String(viewingsCount), label: "Viewings" },
    { value: String(favorites.length), label: "Saved" },
  ];

  return (
    <div className="flex flex-col min-h-dvh" style={{ background: "#050505" }}>
      <div className="status-bar" />

      {/* ====== HEADER ====== */}
      <header
        className="px-3 pt-4 pb-2 flex items-center justify-between"
        style={{ animation: "slideInUp 0.4s ease" }}
      >
        <h1 className="text-2xl font-bold text-white">Profile</h1>
      </header>

      {/* ====== PROFILE CARD ====== */}
      <div className="px-3 mt-4" style={{ animation: "slideInUp 0.5s ease" }}>
        <div
          className="p-5 rounded-2xl flex items-center gap-4"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div className="relative">
            <Avatar
              src={userPhotoURL || user?.photoURL}
              name={userDisplayName}
              size={64}
            />
            <button
              onClick={handleUploadPhoto}
              disabled={uploadingPhoto}
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
              style={{ background: "#1A1D21", border: "2px solid #050505" }}
            >
              {uploadingPhoto ? (
                <Loader2 className="w-3 h-3 animate-spin" style={{ color: "#047857" }} />
              ) : (
                <Camera className="w-3 h-3" style={{ color: "#047857" }} />
              )}
            </button>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white truncate">
                {userDisplayName}
              </h2>
              <ShieldCheck
                className="w-4 h-4 flex-shrink-0"
                style={{ color: "#047857" }}
              />
            </div>
            <p className="text-xs" style={{ color: "#a3a3a3" }}>
              {user?.phoneNumber || "+254 "}
            </p>
            <p className="text-xs truncate" style={{ color: "#525252" }}>
              {userEmail}
            </p>
          </div>
          <button
            onClick={() => {
              openSheet("bs-edit-profile");
            }}
            className="p-2 rounded-xl ripple-container"
            style={{ background: "rgba(255,255,255,0.05)" }}
          >
            <Edit3 className="w-4 h-4" style={{ color: "#a3a3a3" }} />
          </button>
        </div>
      </div>

      {/* ====== QUICK STATS ====== */}
      <div
        className="grid grid-cols-3 gap-3 px-3 mt-5"
        style={{ animation: "slideInUp 0.6s ease" }}
      >
        {stats.map((stat) => (
          <button
            key={stat.label}
            onClick={() => {
              const paths: Record<string, string> = {
                Viewings: "/browse/viewings",
                Saved: "/browse/saved",
              };
              router.push(paths[stat.label] || "/browse");
            }}
            className="p-4 rounded-2xl text-center ripple-container"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <p className="text-xl font-bold text-white">{stat.value}</p>
            <p className="text-xs mt-1" style={{ color: "#a3a3a3" }}>
              {stat.label}
            </p>
          </button>
        ))}
      </div>

      {/* ====== ACCOUNT SETTINGS ====== */}
      <div
        className="mt-8 px-3"
        style={{ animation: "slideInUp 0.7s ease" }}
      >
        <p
          className="text-xs font-semibold uppercase tracking-wider mb-3 px-1"
          style={{ color: "#525252" }}
        >
          Account
        </p>
        <div className="settings-group">
          <button
            onClick={() => {
              openSheet("bs-edit-profile");
            }}
            className="w-full settings-item ripple-container"
          >
            <div
              className="settings-icon"
              style={{ background: "rgba(4,120,87,0.1)" }}
            >
              <UserIcon className="w-5 h-5" style={{ color: "#047857" }} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-white">
                Personal Information
              </p>
              <p className="text-xs" style={{ color: "#525252" }}>
                Name, email, phone
              </p>
            </div>
            <ChevronRight className="w-5 h-5" style={{ color: "#525252" }} />
          </button>
          <button
            onClick={() => openSheet("bs-verify")}
            className="w-full settings-item ripple-container"
          >
            <div
              className="settings-icon"
              style={{ background: "rgba(4,120,87,0.1)" }}
            >
              <ShieldCheck
                className="w-5 h-5"
                style={{ color: "#047857" }}
              />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-white">Verification</p>
              <p className="text-xs" style={{ color: "#047857" }}>
                Verified ✓
              </p>
            </div>
            <ChevronRight className="w-5 h-5" style={{ color: "#525252" }} />
          </button>
          <button
            onClick={() => openSheet("bs-payment")}
            className="w-full settings-item ripple-container"
          >
            <div
              className="settings-icon"
              style={{ background: "rgba(37,211,102,0.1)" }}
            >
              <CreditCard
                className="w-5 h-5"
                style={{ color: "#25D366" }}
              />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-white">
                Payment Methods
              </p>
              <p className="text-xs" style={{ color: "#525252" }}>
                M-Pesa linked
              </p>
            </div>
            <ChevronRight className="w-5 h-5" style={{ color: "#525252" }} />
          </button>
        </div>
      </div>

      {/* ====== PREFERENCES ====== */}
      <div
        className="mt-6 px-3"
        style={{ animation: "slideInUp 0.8s ease" }}
      >
        <p
          className="text-xs font-semibold uppercase tracking-wider mb-3 px-1"
          style={{ color: "#525252" }}
        >
          Preferences
        </p>
        <div className="settings-group">
          <button
            onClick={() => openSheet("bs-notif-prefs")}
            className="w-full settings-item ripple-container"
          >
            <div
              className="settings-icon"
              style={{ background: "rgba(59,130,246,0.1)" }}
            >
              <Bell className="w-5 h-5" style={{ color: "#3b82f6" }} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-white">Notifications</p>
              <p className="text-xs" style={{ color: "#525252" }}>
                Price drops, alerts & reminders
              </p>
            </div>
            <ChevronRight className="w-5 h-5" style={{ color: "#525252" }} />
          </button>
          <button
            onClick={() => openSheet("bs-appearance")}
            className="w-full settings-item ripple-container"
          >
            <div
              className="settings-icon"
              style={{ background: "rgba(168,85,247,0.1)" }}
            >
              <Moon className="w-5 h-5" style={{ color: "#a855f7" }} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-white">Appearance</p>
              <p className="text-xs" style={{ color: "#525252" }}>
                Dark mode, compact view
              </p>
            </div>
            <ChevronRight className="w-5 h-5" style={{ color: "#525252" }} />
          </button>
          <button
            onClick={() => openSheet("bs-language")}
            className="w-full settings-item ripple-container"
          >
            <div
              className="settings-icon"
              style={{ background: "rgba(234,179,8,0.1)" }}
            >
              <Globe className="w-5 h-5" style={{ color: "#eab308" }} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-white">Language</p>
            </div>
            <span className="text-xs mr-1" style={{ color: "#a3a3a3" }}>
              {selectedLang}
            </span>
            <ChevronRight className="w-5 h-5" style={{ color: "#525252" }} />
          </button>
        </div>
      </div>

      {/* ====== SECURITY ====== */}
      <div
        className="mt-6 px-3"
        style={{ animation: "slideInUp 0.85s ease" }}
      >
        <p
          className="text-xs font-semibold uppercase tracking-wider mb-3 px-1"
          style={{ color: "#525252" }}
        >
          Security
        </p>
        <div className="settings-group">
          <button
            onClick={() => {
              setCurrentPassword("");
              setNewPassword("");
              setConfirmPassword("");
              setPasswordError("");
              openSheet("bs-password");
            }}
            className="w-full settings-item ripple-container"
          >
            <div
              className="settings-icon"
              style={{ background: "rgba(239,68,68,0.1)" }}
            >
              <Lock className="w-5 h-5" style={{ color: "#ef4444" }} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-white">
                Change Password
              </p>
              <p className="text-xs" style={{ color: "#525252" }}>
                Last changed 3 months ago
              </p>
            </div>
            <ChevronRight className="w-5 h-5" style={{ color: "#525252" }} />
          </button>
          <button
            onClick={() => openSheet("bs-2fa")}
            className="w-full settings-item ripple-container"
          >
            <div
              className="settings-icon"
              style={{ background: "rgba(59,130,246,0.1)" }}
            >
              <Smartphone className="w-5 h-5" style={{ color: "#3b82f6" }} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-white">
                Two-Factor Auth
              </p>
              <p className="text-xs" style={{ color: "#525252" }}>
                Not enabled
              </p>
            </div>
            <ChevronRight className="w-5 h-5" style={{ color: "#525252" }} />
          </button>
          <button
            onClick={() => openSheet("bs-sessions")}
            className="w-full settings-item ripple-container"
          >
            <div
              className="settings-icon"
              style={{ background: "rgba(234,179,8,0.1)" }}
            >
              <Smartphone className="w-5 h-5" style={{ color: "#eab308" }} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-white">
                Active Sessions
              </p>
              <p className="text-xs" style={{ color: "#525252" }}>
                2 devices active
              </p>
            </div>
            <ChevronRight className="w-5 h-5" style={{ color: "#525252" }} />
          </button>
        </div>
      </div>

      {/* ====== REFER & EARN ====== */}
      <div
        className="mt-6 px-3"
        style={{ animation: "slideInUp 0.88s ease" }}
      >
        <p
          className="text-xs font-semibold uppercase tracking-wider mb-3 px-1"
          style={{ color: "#525252" }}
        >
          Refer & Earn
        </p>
        <div
          className="p-5 rounded-2xl"
          style={{
            background: "linear-gradient(135deg, rgba(4,120,87,0.1), rgba(5,150,105,0.05))",
            border: "1px solid rgba(4,120,87,0.2)",
          }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(4,120,87,0.15)" }}
            >
              <Gift className="w-6 h-6" style={{ color: "#34d399" }} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Invite Friends, Earn KSh 1,000
              </h3>
              <p className="text-xs" style={{ color: "#a3a3a3" }}>
                Each friend gets KSh 500 off their first rent
              </p>
            </div>
          </div>
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <code
              className="text-sm font-bold flex-1 tracking-widest"
              style={{ color: "#34d399" }}
            >
              {referralCode}
            </code>
            <div className="flex gap-1.5">
              <button
                onClick={handleCopyReferral}
                className="p-2 rounded-lg ripple-container"
                style={{ background: "rgba(4,120,87,0.15)" }}
              >
                <Copy className="w-4 h-4" style={{ color: "#047857" }} />
              </button>
              <button
                onClick={async () => {
                  try {
                    await navigator.share({
                      title: "RentKe Referral",
                      text: `Use my referral code ${referralCode} on RentKe to get KSh 500 off your first rent!`,
                    });
                  } catch {
                    navigator.clipboard.writeText(referralCode).catch(() => {});
                    showSnackbar("Referral code copied to clipboard!", "success");
                  }
                }}
                className="p-2 rounded-lg ripple-container"
                style={{ background: "rgba(4,120,87,0.15)" }}
              >
                <Share2 className="w-4 h-4" style={{ color: "#047857" }} />
              </button>
            </div>
          </div>
          <p className="text-xs mt-3 text-center" style={{ color: "#525252" }}>
            <TrendingUp className="w-3 h-3 inline mr-1" />
            3 friends referred • KSh 3,000 earned
          </p>
        </div>
      </div>

      {/* ====== SUPPORT ====== */}
      <div
        className="mt-6 px-3"
        style={{ animation: "slideInUp 0.9s ease" }}
      >
        <p
          className="text-xs font-semibold uppercase tracking-wider mb-3 px-1"
          style={{ color: "#525252" }}
        >
          Support
        </p>
        <div className="settings-group">
          <button
            onClick={() => window.open("https://rentke.com/help", "_blank")?.focus() || showSnackbar("Open rentke.com/help in your browser", "info")}
            className="w-full settings-item ripple-container"
          >
            <div
              className="settings-icon"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              <HelpCircle className="w-5 h-5" style={{ color: "#a3a3a3" }} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-white">
                Help & Support
              </p>
            </div>
            <ChevronRight className="w-5 h-5" style={{ color: "#525252" }} />
          </button>
          <button
            onClick={() => window.open("https://rentke.com/legal", "_blank")?.focus() || showSnackbar("Open rentke.com/legal in your browser", "info")}
            className="w-full settings-item ripple-container"
          >
            <div
              className="settings-icon"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              <FileText className="w-5 h-5" style={{ color: "#a3a3a3" }} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-white">
                Terms & Privacy Policy
              </p>
            </div>
            <ChevronRight className="w-5 h-5" style={{ color: "#525252" }} />
          </button>
          <button
            onClick={() => openSheet("bs-about")}
            className="w-full settings-item ripple-container"
          >
            <div
              className="settings-icon"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              <Info className="w-5 h-5" style={{ color: "#a3a3a3" }} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-white">About RentKe</p>
            </div>
            <span className="text-xs mr-1" style={{ color: "#525252" }}>
              v1.0.0
            </span>
            <ChevronRight className="w-5 h-5" style={{ color: "#525252" }} />
          </button>
        </div>
      </div>

      {/* ====== LOG OUT / DELETE ====== */}
      <div
        className="mt-6 px-3 mb-4"
        style={{ animation: "slideInUp 1.0s ease" }}
      >
        <button
          onClick={() => openSheet("bs-logout")}
          className="w-full settings-group ripple-container"
        >
          <div className="settings-item justify-center">
            <LogOut className="w-5 h-5" style={{ color: "#ef4444" }} />
            <p className="text-sm font-semibold" style={{ color: "#ef4444" }}>
              Log Out
            </p>
          </div>
        </button>
      </div>
      <div className="px-3 mb-12">
        <button
          onClick={() => openSheet("bs-delete")}
          className="w-full text-center text-xs py-2"
          style={{ color: "#525252" }}
        >
          Delete Account
        </button>
      </div>

      {/* ================================================ */}
      {/* BOTTOM SHEET: EDIT PROFILE */}
      {/* ================================================ */}
      <div
        className={`bs-overlay ${isOpen("bs-edit-profile") ? "active" : ""}`}
        onClick={closeSheet}
      />
      <div
        id="bs-edit-profile"
        className={`bs ${isOpen("bs-edit-profile") ? "active" : ""}`}
      >
        <div className="bs-handle" />
        <div className="p-5 pb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Edit Profile</h3>
          <button
            onClick={closeSheet}
            className="text-sm font-semibold"
            style={{ color: "#a3a3a3" }}
          >
            Cancel
          </button>
        </div>
        <div className="px-3 pb-8 space-y-4">
          {/* Avatar Edit */}
          <div className="flex justify-center mb-2">
            <div className="relative">
              <Avatar
                src={userPhotoURL || user?.photoURL}
                name={editName}
                size={80}
              />
              <button
                onClick={handleUploadPhoto}
                disabled={uploadingPhoto}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center"
                style={{
                  background: "#047857",
                  boxShadow: "0 2px 8px rgba(4,120,87,0.4)",
                }}
                type="button"
              >
                {uploadingPhoto ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <Camera className="w-4 h-4 text-white" />
                )}
              </button>
            </div>
          </div>
          <div>
            <label
              className="text-xs font-semibold uppercase tracking-wider block mb-2"
              style={{ color: "#525252" }}
            >
              Full Name
            </label>
            <input
              type="text"
              className="android-input"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              id="edit-name"
            />
          </div>
          <div>
            <label
              className="text-xs font-semibold uppercase tracking-wider block mb-2"
              style={{ color: "#525252" }}
            >
              Email
            </label>
            <input
              type="email"
              className="android-input"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              id="edit-email"
            />
          </div>
          <div>
            <label
              className="text-xs font-semibold uppercase tracking-wider block mb-2"
              style={{ color: "#525252" }}
            >
              Phone Number
            </label>
            <div className="flex items-center gap-2">
              <div
                className="px-3 py-3.5 rounded-xl text-sm font-medium"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  color: "#a3a3a3",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                🇰🇪 +254
              </div>
              <input
                type="tel"
                className="android-input flex-1"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                id="edit-phone"
              />
            </div>
          </div>
          <button
            onClick={saveProfile}
            className="w-full py-3.5 rounded-xl font-semibold text-sm text-white ripple-container"
            style={{
              background: "#047857",
              boxShadow: "0 4px 16px rgba(4,120,87,0.3)",
            }}
          >
            Save Changes
          </button>
        </div>
      </div>

      {/* ================================================ */}
      {/* BOTTOM SHEET: VERIFICATION */}
      {/* ================================================ */}
      <div
        className={`bs-overlay ${isOpen("bs-verify") ? "active" : ""}`}
        onClick={closeSheet}
      />
      <div
        id="bs-verify"
        className={`bs ${isOpen("bs-verify") ? "active" : ""}`}
      >
        <div className="bs-handle" />
        <div className="p-5 pb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Verification</h3>
          <div
            className="flex items-center gap-1 px-3 py-1 rounded-full"
            style={{ background: "rgba(4,120,87,0.15)" }}
          >
            <ShieldCheck
              className="w-3.5 h-3.5"
              style={{ color: "#047857" }}
            />
            <span
              className="text-xs font-bold"
              style={{ color: "#34d399" }}
            >
              Verified
            </span>
          </div>
        </div>
        <div className="px-3 pb-8">
          <p className="text-sm mb-6" style={{ color: "#a3a3a3" }}>
            Verified users get faster responses and priority viewings.
          </p>

          {/* Step 1 */}
          <div className="flex gap-4 mb-5">
            <div className="flex flex-col items-center">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: "rgba(4,120,87,0.15)" }}
              >
                <Check className="w-5 h-5" style={{ color: "#047857" }} />
              </div>
              <div
                className="w-0.5 flex-1 mt-2"
                style={{ background: "#047857" }}
              />
            </div>
            <div className="pb-6">
              <h4 className="text-sm font-bold text-white">Phone Verified</h4>
              <p className="text-xs" style={{ color: "#525252" }}>
                +254 712 *** 678 • Jan 2024
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-4 mb-5">
            <div className="flex flex-col items-center">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: "rgba(4,120,87,0.15)" }}
              >
                <Check className="w-5 h-5" style={{ color: "#047857" }} />
              </div>
              <div
                className="w-0.5 flex-1 mt-2"
                style={{ background: "#047857" }}
              />
            </div>
            <div className="pb-6">
              <h4 className="text-sm font-bold text-white">Email Verified</h4>
              <p className="text-xs" style={{ color: "#525252" }}>
                david.ochieng@email.com • Jan 2024
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: "rgba(4,120,87,0.15)" }}
              >
                <Check className="w-5 h-5" style={{ color: "#047857" }} />
              </div>
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">ID Verified</h4>
              <p className="text-xs" style={{ color: "#525252" }}>
                Kenyan National ID • Jan 2024
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================ */}
      {/* BOTTOM SHEET: LANGUAGE */}
      {/* ================================================ */}
      <div
        className={`bs-overlay ${isOpen("bs-language") ? "active" : ""}`}
        onClick={closeSheet}
      />
      <div
        id="bs-language"
        className={`bs ${isOpen("bs-language") ? "active" : ""}`}
      >
        <div className="bs-handle" />
        <div className="p-5 pb-3">
          <h3 className="text-lg font-bold text-white">Language</h3>
        </div>
        <div className="px-3 pb-8 space-y-1">
          {["English", "Swahili", "French"].map((lang, i) => (
            <div
              key={lang}
              className="flex items-center gap-3 p-3 rounded-xl ripple-container"
              onClick={() => selectLanguage(lang)}
            >
              <div
                className={`custom-radio ${selectedLang === lang ? "checked" : ""}`}
              />
              <span className="text-lg">
                {i === 0 ? "🇬🇧" : i === 1 ? "🇰🇪" : "🇫🇷"}
              </span>
              <p className="text-sm font-medium text-white flex-1">{lang}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ================================================ */}
      {/* BOTTOM SHEET: NOTIFICATION PREFERENCES */}
      {/* ================================================ */}
      <div
        className={`bs-overlay ${isOpen("bs-notif-prefs") ? "active" : ""}`}
        onClick={closeSheet}
      />
      <div
        id="bs-notif-prefs"
        className={`bs ${isOpen("bs-notif-prefs") ? "active" : ""}`}
      >
        <div className="bs-handle" />
        <div className="p-5 pb-2 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">
            Notification Preferences
          </h3>
          <div
            className={`toggle-track ${toggles.notifications ? "active" : ""}`}
            onClick={() =>
              toggleSwitch("notifications", "All Notifications")
            }
          >
            <div className="toggle-thumb" />
          </div>
        </div>
        <p className="px-3 text-xs mb-4" style={{ color: "#525252" }}>
          Manage which alerts you receive
        </p>
        <div className="px-3 pb-8 space-y-1">
          {(
            [
              {
                key: "priceDrops" as const,
                icon: TrendingUp,
                label: "Price Drop Alerts",
                desc: "When saved properties drop in price",
                color: "#ea580c",
                bg: "rgba(234,88,12,0.1)",
              },
              {
                key: "newListings" as const,
                icon: Home,
                label: "New Listings",
                desc: "New properties matching your saved searches",
                color: "#047857",
                bg: "rgba(4,120,87,0.1)",
              },
              {
                key: "viewingReminders" as const,
                icon: Bell,
                label: "Viewing Reminders",
                desc: "Reminders before scheduled viewings",
                color: "#3b82f6",
                bg: "rgba(59,130,246,0.1)",
              },
              {
                key: "messages" as const,
                icon: MessageCircle,
                label: "Message Notifications",
                desc: "New messages from landlords and agents",
                color: "#a855f7",
                bg: "rgba(168,85,247,0.1)",
              },
              {
                key: "promotional" as const,
                icon: Megaphone,
                label: "Promotional",
                desc: "Tips, offers, and product updates",
                color: "#eab308",
                bg: "rgba(234,179,8,0.1)",
              },
            ] as const
          ).map(({ key, icon: Icon, label, desc, color, bg }) => (
            <div
              key={key}
              className="flex items-center gap-3 p-3 rounded-xl"
              style={{ cursor: "pointer" }}
              onClick={() => {
                if (!toggles.notifications) {
                  showSnackbar("Enable notifications first", "error");
                  return;
                }
                toggleNotifPref(key);
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: bg }}
              >
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{label}</p>
                <p className="text-xs" style={{ color: "#525252" }}>
                  {desc}
                </p>
              </div>
              <div
                className={`toggle-track ${
                  toggles.notifications && notifPrefs[key] ? "active" : ""
                }`}
                style={{
                  opacity:
                    toggles.notifications && notifPrefs[key] ? 1 : 0.4,
                }}
              >
                <div className="toggle-thumb" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ================================================ */}
      {/* BOTTOM SHEET: APPEARANCE */}
      {/* ================================================ */}
      <div
        className={`bs-overlay ${isOpen("bs-appearance") ? "active" : ""}`}
        onClick={closeSheet}
      />
      <div
        id="bs-appearance"
        className={`bs ${isOpen("bs-appearance") ? "active" : ""}`}
      >
        <div className="bs-handle" />
        <div className="p-5 pb-3">
          <h3 className="text-lg font-bold text-white">Appearance</h3>
        </div>
        <div className="px-3 pb-8 space-y-1">
          <div className="flex items-center gap-3 p-3 rounded-xl">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(168,85,247,0.1)" }}
            >
              <Moon className="w-5 h-5" style={{ color: "#a855f7" }} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">Dark Mode</p>
              <p className="text-xs" style={{ color: "#525252" }}>
                Dark theme optimized for your eyes
              </p>
            </div>
            <div
              className={`toggle-track ${toggles.darkMode ? "active" : ""}`}
              onClick={() => toggleSwitch("darkMode", "Dark Mode")}
            >
              <div className="toggle-thumb" />
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(59,130,246,0.1)" }}
            >
              <Sun className="w-5 h-5" style={{ color: "#3b82f6" }} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">
                Compact Property Cards
              </p>
              <p className="text-xs" style={{ color: "#525252" }}>
                Show more listings per screen
              </p>
            </div>
            <div className={`toggle-track ${toggles.compactCards ? "active" : ""}`}
                onClick={() => toggleSwitch("compactCards", "Compact Property Cards")}>
              <div className="toggle-thumb" />
            </div>
          </div>
        </div>
      </div>

      {/* ================================================ */}
      {/* BOTTOM SHEET: DELETE ACCOUNT */}
      {/* ================================================ */}
      <div
        className={`bs-overlay ${isOpen("bs-delete") ? "active" : ""}`}
        onClick={closeSheet}
      />
      <div
        id="bs-delete"
        className={`bs ${isOpen("bs-delete") ? "active" : ""}`}
      >
        <div className="bs-handle" />
        <div className="p-6 text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: "rgba(239,68,68,0.1)" }}
          >
            <AlertTriangle className="w-8 h-8" style={{ color: "#ef4444" }} />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">
            Delete Account?
          </h3>
          <p className="text-sm" style={{ color: "#a3a3a3" }}>
            This will permanently delete your account, saved properties,
            messages, and viewing history. This action cannot be undone.
          </p>
        </div>
        <div className="px-3 pb-8 space-y-3">
          <button
            onClick={() => {
              closeSheet();
              setTimeout(() => {
                showSnackbar(
                  "Account deletion requested. Check your email to confirm.",
                  "info"
                );
              }, 300);
            }}
            className="w-full py-3.5 rounded-xl font-semibold text-sm ripple-container"
            style={{ background: "#ef4444", color: "white" }}
          >
            Delete My Account
          </button>
          <button
            onClick={closeSheet}
            className="w-full py-3.5 rounded-xl font-semibold text-sm ripple-container"
            style={{
              background: "rgba(255,255,255,0.05)",
              color: "#e5e5e5",
            }}
          >
            Keep My Account
          </button>
        </div>
      </div>

      {/* ================================================ */}
      {/* BOTTOM SHEET: PAYMENT METHODS */}
      {/* ================================================ */}
      <div
        className={`bs-overlay ${isOpen("bs-payment") ? "active" : ""}`}
        onClick={closeSheet}
      />
      <div
        id="bs-payment"
        className={`bs ${isOpen("bs-payment") ? "active" : ""}`}
      >
        <div className="bs-handle" />
        <div className="p-5 pb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Payment Methods</h3>
          <button onClick={closeSheet} className="text-sm font-semibold" style={{ color: "#a3a3a3" }}>Done</button>
        </div>
        <div className="px-3 pb-8 space-y-4">
          {/* M-Pesa */}
          <div
            className="p-4 rounded-2xl flex items-center gap-3"
            style={{ background: "rgba(4,120,87,0.08)", border: "1px solid rgba(4,120,87,0.15)" }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(4,120,87,0.15)" }}>
              <Smartphone className="w-5 h-5" style={{ color: "#34d399" }} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">M-Pesa</p>
              <p className="text-xs" style={{ color: "#a3a3a3" }}>+254 712 *** 678 • Connected</p>
            </div>
            <div className="px-3 py-1 rounded-full" style={{ background: "rgba(4,120,87,0.15)" }}>
              <span className="text-xs font-medium" style={{ color: "#34d399" }}>Default</span>
            </div>
          </div>

          {/* Rent History */}
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#525252" }}>Recent Payments</p>
          {[
            { month: "May 2024", amount: "KSh 15,000", status: "Paid", date: "May 1" },
            { month: "Apr 2024", amount: "KSh 15,000", status: "Paid", date: "Apr 2" },
            { month: "Mar 2024", amount: "KSh 15,000", status: "Paid", date: "Mar 1" },
            { month: "Feb 2024", amount: "KSh 15,000", status: "Paid", date: "Feb 3" },
          ].map((p) => (
            <div key={p.month} className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-white">{p.month}</p>
                <p className="text-xs" style={{ color: "#525252" }}>{p.date}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-white">{p.amount}</p>
                <p className="text-xs" style={{ color: "#047857" }}>{p.status} ✓</p>
              </div>
            </div>
          ))}
          <button
            onClick={() => { closeSheet(); setTimeout(() => openSheet("bs-add-payment"), 300); }}
            className="w-full py-3.5 rounded-xl font-semibold text-sm text-white ripple-container"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px dashed rgba(255,255,255,0.15)" }}
          >
            + Add Payment Method
          </button>
        </div>
      </div>

      {/* ================================================ */}
      {/* BOTTOM SHEET: ADD PAYMENT METHOD */}
      {/* ================================================ */}
      <div className={`bs-overlay ${isOpen("bs-add-payment") ? "active" : ""}`} onClick={closeSheet} />
      <div id="bs-add-payment" className={`bs ${isOpen("bs-add-payment") ? "active" : ""}`}>
        <div className="bs-handle" />
        <div className="p-5 pb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Add Payment Method</h3>
          <button onClick={closeSheet} className="text-sm font-semibold" style={{ color: "#a3a3a3" }}>Cancel</button>
        </div>
        <div className="px-3 pb-8 space-y-4">
          <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ background: "rgba(4,120,87,0.08)", border: "1px solid rgba(4,120,87,0.15)" }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "rgba(4,120,87,0.15)" }}>
              <Smartphone className="w-6 h-6" style={{ color: "#34d399" }} />
            </div>
            <div>
              <p className="text-sm font-bold text-white">M-Pesa</p>
              <p className="text-xs" style={{ color: "#a3a3a3" }}>Kenya&apos;s leading mobile money service</p>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider block mb-2" style={{ color: "#525252" }}>M-Pesa Phone Number</label>
            <div className="flex items-center gap-2">
              <div className="px-3 py-3.5 rounded-xl text-sm font-medium" style={{ background: "rgba(255,255,255,0.05)", color: "#a3a3a3", border: "1px solid rgba(255,255,255,0.08)" }}>
                🇰🇪 +254
              </div>
              <input type="tel" className="android-input flex-1" placeholder="712 345 678" defaultValue="712 345 678" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider block mb-2" style={{ color: "#525252" }}>Full Name (M-Pesa Registered)</label>
            <input type="text" className="android-input" defaultValue="David Ochieng" placeholder="Enter the M-Pesa registered name" />
          </div>
          <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: "rgba(234,179,8,0.08)" }}>
            <Info className="w-4 h-4 flex-shrink-0" style={{ color: "#eab308" }} />
            <p className="text-xs" style={{ color: "#a3a3a3" }}>You may be asked to verify ownership via a small STK push (KSh 1).</p>
          </div>
          <button
            onClick={() => { closeSheet(); showSnackbar("M-Pesa linked successfully!", "success"); }}
            className="w-full py-3.5 rounded-xl font-semibold text-sm text-white ripple-container"
            style={{ background: "#047857", boxShadow: "0 4px 16px rgba(4,120,87,0.3)" }}
          >
            Link M-Pesa
          </button>
        </div>
      </div>

      {/* ================================================ */}
      {/* BOTTOM SHEET: CHANGE PASSWORD */}
      {/* ================================================ */}
      <div
        className={`bs-overlay ${isOpen("bs-password") ? "active" : ""}`}
        onClick={closeSheet}
      />
      <div
        id="bs-password"
        className={`bs ${isOpen("bs-password") ? "active" : ""}`}
      >
        <div className="bs-handle" />
        <div className="p-5 pb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Change Password</h3>
          <button onClick={closeSheet} className="text-sm font-semibold" style={{ color: "#a3a3a3" }}>Cancel</button>
        </div>
        <div className="px-3 pb-8 space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider block mb-2" style={{ color: "#525252" }}>Current Password</label>
            <input
              type="password"
              className={`android-input ${passwordError && !currentPassword ? "border-[#ef4444]/50" : ""}`}
              placeholder="Enter current password"
              value={currentPassword}
              onChange={(e) => { setCurrentPassword(e.target.value); setPasswordError(""); }}
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider block mb-2" style={{ color: "#525252" }}>New Password</label>
            <input
              type="password"
              className={`android-input ${passwordError && !newPassword ? "border-[#ef4444]/50" : ""}`}
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setPasswordError(""); }}
            />
            <p className="text-xs mt-1.5" style={{ color: "#525252" }}>Minimum 6 characters</p>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider block mb-2" style={{ color: "#525252" }}>Confirm New Password</label>
            <input
              type="password"
              className={`android-input ${passwordError && newPassword !== confirmPassword ? "border-[#ef4444]/50" : ""}`}
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(""); }}
            />
          </div>
          {passwordError && (
            <p className="text-sm" style={{ color: "#ef4444" }}>{passwordError}</p>
          )}
          <button
            onClick={handleUpdatePassword}
            disabled={passwordLoading}
            className="w-full py-3.5 rounded-xl font-semibold text-sm text-white ripple-container flex items-center justify-center gap-2"
            style={{
              background: passwordLoading ? "rgba(4,120,87,0.5)" : "#047857",
              boxShadow: "0 4px 16px rgba(4,120,87,0.3)",
            }}
          >
            {passwordLoading ? (
              <><div className="spinner" style={{width:18,height:18}} /> Updating...</>
            ) : (
              "Update Password"
            )}
          </button>
        </div>
      </div>

      {/* ================================================ */}
      {/* BOTTOM SHEET: TWO-FACTOR AUTH */}
      {/* ================================================ */}
      <div
        className={`bs-overlay ${isOpen("bs-2fa") ? "active" : ""}`}
        onClick={closeSheet}
      />
      <div
        id="bs-2fa"
        className={`bs ${isOpen("bs-2fa") ? "active" : ""}`}
      >
        <div className="bs-handle" />
        <div className="p-5 pb-3">
          <h3 className="text-lg font-bold text-white">Two-Factor Authentication</h3>
        </div>
        <div className="px-3 pb-8">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "rgba(59,130,246,0.1)" }}>
              <Smartphone className="w-6 h-6" style={{ color: "#3b82f6" }} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">2FA Status</p>
              <p className="text-xs" style={{ color: "#a3a3a3" }}>Not enabled • Recommended</p>
            </div>
            <div className="toggle-track" style={{ opacity: 0.4 }}>
              <div className="toggle-thumb" />
            </div>
          </div>
          <p className="text-sm mb-5" style={{ color: "#a3a3a3" }}>
            Two-factor authentication adds an extra layer of security to your account by requiring a verification code from your phone in addition to your password.
          </p>
          <div className="space-y-3 mb-6">
            {[
              { icon: Lock, label: "Enhanced Security", desc: "Protect your account with an extra layer" },
              { icon: ShieldCheck, label: "SMS Verification", desc: "Receive codes via SMS to your phone" },
              { icon: Smartphone, label: "Works Offline", desc: "Codes work without internet connection" },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-center gap-3">
                <Icon className="w-4 h-4" style={{ color: "#047857" }} />
                <div>
                  <p className="text-xs font-medium text-white">{label}</p>
                  <p className="text-xs" style={{ color: "#525252" }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 rounded-2xl mb-5" style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.2)" }}>
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: "#eab308" }} />
              <div>
                <p className="text-xs font-medium" style={{ color: "#eab308" }}>Coming in a future update</p>
                <p className="text-xs mt-1" style={{ color: "#a3a3a3" }}>
                  Two-factor authentication adds an extra layer of security by requiring a verification code from your phone when signing in. Support for SMS codes and authenticator apps is being developed.
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={() => { closeSheet(); showSnackbar("2FA will be available in an upcoming update", "info"); }}
            className="w-full py-3.5 rounded-xl font-semibold text-sm ripple-container"
            style={{ background: "rgba(59,130,246,0.1)", color: "#3b82f6" }}
          >
            Notify Me When Available
          </button>
        </div>
      </div>

      {/* ================================================ */}
      {/* BOTTOM SHEET: ACTIVE SESSIONS */}
      {/* ================================================ */}
      <div
        className={`bs-overlay ${isOpen("bs-sessions") ? "active" : ""}`}
        onClick={closeSheet}
      />
      <div
        id="bs-sessions"
        className={`bs ${isOpen("bs-sessions") ? "active" : ""}`}
      >
        <div className="bs-handle" />
        <div className="p-5 pb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Active Sessions</h3>
          <button onClick={closeSheet} className="text-sm font-semibold" style={{ color: "#a3a3a3" }}>Done</button>
        </div>
        <div className="px-3 pb-8 space-y-3">
          {[
            { device: "Google Pixel 7", location: "Nairobi, Kenya", time: "Current session", active: true },
            { device: "Chrome on Windows", location: "Nairobi, Kenya", time: "Active 2 hours ago", active: true },
            { device: "Safari on iPhone", location: "Mombasa, Kenya", time: "Active 3 days ago", active: false },
          ].map((s) => (
            <div
              key={s.device}
              className="p-4 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <Smartphone className="w-5 h-5" style={{ color: s.active ? "#34d399" : "#525252" }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white">{s.device}</p>
                    {s.active && <span className="w-2 h-2 rounded-full bg-green-500" />}
                  </div>
                  <p className="text-xs" style={{ color: "#a3a3a3" }}>{s.location}</p>
                  <p className="text-xs" style={{ color: "#525252" }}>{s.time}</p>
                </div>
                {s.active ? (
                  <button className="text-xs font-medium" style={{ color: "#ef4444" }}>Logout</button>
                ) : (
                  <span className="text-xs" style={{ color: "#525252" }}>Expired</span>
                )}
              </div>
            </div>
          ))}
          <button
            onClick={() => { closeSheet(); showSnackbar("All other sessions signed out", "success"); }}
            className="w-full py-3.5 rounded-xl font-semibold text-sm ripple-container"
            style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}
          >
            Sign Out All Other Sessions
          </button>
        </div>
      </div>

      {/* ================================================ */}
      {/* BOTTOM SHEET: ABOUT */}
      {/* ================================================ */}
      <div
        className={`bs-overlay ${isOpen("bs-about") ? "active" : ""}`}
        onClick={closeSheet}
      />
      <div
        id="bs-about"
        className={`bs ${isOpen("bs-about") ? "active" : ""}`}
      >
        <div className="bs-handle" />
        <div className="p-5 pb-3">
          <h3 className="text-lg font-bold text-white">About RentKe</h3>
        </div>
        <div className="px-3 pb-8 space-y-5">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: "linear-gradient(135deg, #047857, #059669)" }}>
              <Home className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white">RentKe</h3>
            <p className="text-xs" style={{ color: "#525252" }}>Version 1.0.0 (Build 1)</p>
          </div>
          <div className="space-y-3">
            {[
              { label: "App Version", value: "1.0.0" },
              { label: "Build Number", value: "20240611.1" },
              { label: "Environment", value: "Production" },
              { label: "API Version", value: "v1" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-2">
                <p className="text-sm" style={{ color: "#a3a3a3" }}>{item.label}</p>
                <p className="text-sm font-medium text-white">{item.value}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-center" style={{ color: "#525252" }}>
            Made with ❤️ in Kenya
          </p>
        </div>
      </div>

      {/* ================================================ */}
      {/* BOTTOM SHEET: LOG OUT */}
      {/* ================================================ */}
      <div
        className={`bs-overlay ${isOpen("bs-logout") ? "active" : ""}`}
        onClick={closeSheet}
      />
      <div
        id="bs-logout"
        className={`bs ${isOpen("bs-logout") ? "active" : ""}`}
      >
        <div className="bs-handle" />
        <div className="p-6 text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: "rgba(239,68,68,0.1)" }}
          >
            <LogOut className="w-8 h-8" style={{ color: "#ef4444" }} />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Log Out?</h3>
          <p className="text-sm" style={{ color: "#a3a3a3" }}>
            You'll need to log in again to access your saved properties and
            messages.
          </p>
        </div>
        <div className="px-3 pb-8 space-y-3">
          <button
            onClick={handleLogout}
            className="w-full py-3.5 rounded-xl font-semibold text-sm ripple-container"
            style={{ background: "#ef4444", color: "white" }}
          >
            Log Out
          </button>
          <button
            onClick={closeSheet}
            className="w-full py-3.5 rounded-xl font-semibold text-sm ripple-container"
            style={{
              background: "rgba(255,255,255,0.05)",
              color: "#e5e5e5",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

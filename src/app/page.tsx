"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Home,
  Smartphone,
  Mail,
  AlertCircle,
  EyeOff,
  Eye,
  ArrowLeft,
  ShieldCheck,
  KeyRound,
  MailCheck,
  Phone,
  MessageCircle,
  Check,
  X,
  Info,
  Building2,
} from "lucide-react";
import { useAuth } from "./AuthContext";

type PageState = "login" | "signup" | "otp" | "forgot" | "reset-success";
type LoginMethod = "phone" | "email";
type SnackbarType = "success" | "error" | "info";

export default function AuthPage() {
  // ---- Page State ----
  const [currentPage, setCurrentPage] = useState<PageState>("login");
  const [pageClass, setPageClass] = useState("active");

  // ---- Login Form ----
  const [loginMethod, setLoginMethod] = useState<LoginMethod>("phone");
  const [phoneInput, setPhoneInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  // ---- Registration Flow (Multi-Step) ----
  const [regStep, setRegStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState<"tenant" | "landlord" | null>(null);
  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [regErrors, setRegErrors] = useState<{name?:boolean; phone?:boolean; email?:boolean; confirm?:boolean; terms?:boolean}>({});
  const [regLoading, setRegLoading] = useState(false);

  // ---- OTP ----
  const [otpValues, setOtpValues] = useState(["", "", "", ""]);
  const [otpTimer, setOtpTimer] = useState(59);
  const [otpTimerActive, setOtpTimerActive] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [currentPhone, setCurrentPhone] = useState("");
  const otpTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ---- Forgot Password ----
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  // ---- Sheet Forgot ----
  const [sheetForgotEmail, setSheetForgotEmail] = useState("");

  // ---- Bottom Sheets ----
  const [forgotSheetOpen, setForgotSheetOpen] = useState(false);
  const [helpSheetOpen, setHelpSheetOpen] = useState(false);
  const [googleRoleSheetOpen, setGoogleRoleSheetOpen] = useState(false);
  const [activeSheet, setActiveSheet] = useState<"terms" | "privacy" | "success" | null>(null);
  const [otpError, setOtpError] = useState(false);

  // ---- Snackbar ----
  const [snackbar, setSnackbar] = useState<{
    show: boolean;
    message: string;
    type: SnackbarType;
  }>({ show: false, message: "", type: "info" });
  const snackbarTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);



  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const container = target.closest(".ripple-container") as HTMLElement | null;
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

  // ---- Ripple Effect + Keyboard Enter ----
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        const activePage = document.querySelector(".page.active");
        if (activePage) {
          const btn = activePage.querySelector(".btn-primary") as HTMLButtonElement | null;
          if (btn && !btn.disabled) btn.click();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // ---- Navigation ----
  const navigateTo = useCallback((page: PageState) => {
    setCurrentPage(page);
    setPageClass("active slide-in");
  }, []);

  // ---- Validation ----
  const validatePhone = (phone: string) => {
    const cleaned = phone.replace(/\s/g, "");
    return /^(0?7\d{8}|01\d{8})$/.test(cleaned);
  };

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.startsWith("0")) {
      return (
        "+254 " +
        cleaned.slice(1, 4) +
        " " +
        cleaned.slice(4, 7) +
        " " +
        cleaned.slice(7)
      );
    }
    return phone;
  };

  const handlePhoneChange = (val: string) => {
    let cleaned = val.replace(/\D/g, "");
    if (cleaned.startsWith("254")) cleaned = "0" + cleaned.slice(3);
    if (cleaned.length > 10) cleaned = cleaned.slice(0, 10);
    setPhoneInput(cleaned);
  };

  const handleRegPhoneChange = (val: string) => {
    let cleaned = val.replace(/\D/g, "");
    if (cleaned.startsWith("254")) cleaned = "0" + cleaned.slice(3);
    if (cleaned.length > 10) cleaned = cleaned.slice(0, 10);
    setRegPhone(cleaned);
  };

  // ---- Login Method Toggle ----
  const switchLoginMethod = (method: LoginMethod) => {
    setLoginMethod(method);
    setLoginSubmitted(false);
  };

  // ---- Login Handler ----
  const handleLogin = async () => {
    setLoginSubmitted(true);
    let valid = true;

    if (loginMethod === "phone") {
      if (!validatePhone(phoneInput)) {
        valid = false;
      } else {
        setCurrentPhone(phoneInput);
      }
    } else {
      if (!validateEmail(emailInput)) valid = false;
      if (!passwordInput) valid = false;
    }

    if (!valid) return;

    setLoginLoading(true);

    if (loginMethod === "email") {
      const { error } = await signIn(emailInput, passwordInput);
      setLoginLoading(false);
      if (error) {
        showSnackbar(error, "error");
      } else {
        router.push("/dashboard");
      }
    } else {
      setTimeout(() => {
        setLoginLoading(false);
        showSnackbar("Phone login coming soon — use email instead", "info");
      }, 800);
    }
  };

  // ---- Password Visibility ----
  const togglePasswordVisibility = () => setShowPassword(!showPassword);

  // ---- Registration Step Handlers ----
  const getPasswordStrength = (password: string) => {
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  };

  const strengthColors = ["#ef4444", "#f97316", "#eab308", "#047857"];
  const strengthLabels = ["Weak", "Fair", "Good", "Strong"];

  const toggleTerms = () => setTermsAccepted(!termsAccepted);

  const goToStep = (step: number) => {
    setRegStep(step);
  };

  const selectRole = (role: "tenant" | "landlord") => {
    setSelectedRole(role);
  };

  const validateStep2 = () => {
    const errors: {name?:boolean; phone?:boolean; email?:boolean} = {};
    let valid = true;

    if (!regName.trim()) { errors.name = true; valid = false; }
    if (!validatePhone(regPhone)) { errors.phone = true; valid = false; }
    if (!validateEmail(regEmail)) { errors.email = true; valid = false; }

    setRegErrors(errors);
    if (valid) goToStep(3);
  };

  const validateStep3 = async () => {
    let valid = true;
    const errors: {confirm?:boolean; terms?:boolean} = {};

    if (regPassword.length < 8) {
      showSnackbar("Password must be at least 8 characters", "error");
      return;
    }
    if (regPassword !== regConfirm) { errors.confirm = true; valid = false; }
    if (!termsAccepted) { errors.terms = true; valid = false; }

    setRegErrors(errors);
    if (!valid) return;

    setRegLoading(true);

    const { error } = await signUp({
      email: regEmail,
      password: regPassword,
      name: regName,
      phone: regPhone,
      role: selectedRole || "tenant",
    });

    setRegLoading(false);

    if (error) {
      showSnackbar(error, "error");
      return;
    }

    openBottomSheet("success");
  };

  // ---- Router ----
const { user: authUser, role: authRole, signIn, signUp, signInWithGoogle, resetPassword } = useAuth();
const router = useRouter();

// Auto-redirect if already authenticated (e.g., returning from Google redirect)
useEffect(() => {
  if (authUser) {
    const isNewGoogleUser = localStorage.getItem("google_sign_in_new_user");
    if (isNewGoogleUser) {
      localStorage.removeItem("google_sign_in_new_user");
      router.replace("/browse");
    } else if (authRole === "tenant") {
      router.replace("/browse");
    } else if (authRole === "landlord") {
      router.replace("/dashboard");
    }
    // If role is null/undefined, the user doc may not have been created yet
    // or there's a race condition. Don't redirect — stay on auth page.
    // The role will be resolved when AuthContext updates.
  }
}, [authUser, authRole, router]);

// ---- OTP Handlers ----
  const handleOtpInput = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otpValues];
    newOtp[index] = value;
    setOtpValues(newOtp);

    if (value && index < 3) {
      const nextInput = document.querySelector(
        `[data-otp="${index + 1}"]`
      ) as HTMLInputElement;
      if (nextInput) nextInput.focus();
    }
  };

  const handleOtpKeydown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number
  ) => {
    if (e.key === "Backspace" && !otpValues[index] && index > 0) {
      const newOtp = [...otpValues];
      newOtp[index - 1] = "";
      setOtpValues(newOtp);
      const prevInput = document.querySelector(
        `[data-otp="${index - 1}"]`
      ) as HTMLInputElement;
      if (prevInput) prevInput.focus();
    }
  };

  const isOtpComplete = otpValues.every((v) => v !== "");

  const handleVerifyOtp = () => {
    const otp = otpValues.join("");

    setOtpLoading(true);
    setOtpError(false);

    setTimeout(() => {
      setOtpLoading(false);

      if (otp === "1234" || otp.length === 4) {
        if (otpTimerRef.current) clearInterval(otpTimerRef.current);
        setOtpTimerActive(false);
        openBottomSheet("success");
      } else {
        setOtpError(true);
        setOtpValues(["", "", "", ""]);
        const firstInput = document.querySelector(
          '[data-otp="0"]'
        ) as HTMLInputElement;
        if (firstInput) firstInput.focus();
      }
    }, 1500);
  };

  const startOtpTimer = () => {
    setOtpTimer(59);
    setOtpTimerActive(true);

    if (otpTimerRef.current) clearInterval(otpTimerRef.current);

    otpTimerRef.current = setInterval(() => {
      setOtpTimer((prev) => {
        if (prev <= 1) {
          if (otpTimerRef.current) clearInterval(otpTimerRef.current);
          setOtpTimerActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const resendOtp = () => {
    startOtpTimer();
    showSnackbar("New code sent to your phone", "success");
    setOtpValues(["", "", "", ""]);
    const firstInput = document.querySelector(
      '[data-otp="0"]'
    ) as HTMLInputElement;
    if (firstInput) firstInput.focus();
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (otpTimerRef.current) clearInterval(otpTimerRef.current);
    };
  }, []);

  // ---- Forgot Password ----
  const openForgotPassword = () => setForgotSheetOpen(true);
  const closeForgotPassword = () => setForgotSheetOpen(false);

  const handleSheetForgotPassword = async () => {
    if (!validateEmail(sheetForgotEmail)) {
      showSnackbar("Please enter a valid email", "error");
      return;
    }
    closeForgotPassword();
    const { error } = await resetPassword(sheetForgotEmail);
    if (error) {
      showSnackbar(error, "error");
    } else {
      setResetEmail(sheetForgotEmail);
      navigateTo("reset-success");
    }
  };

  const handleForgotPassword = async () => {
    setForgotSubmitted(true);
    if (!validateEmail(forgotEmail)) return;

    setForgotLoading(true);

    const { error } = await resetPassword(forgotEmail);
    setForgotLoading(false);

    if (error) {
      showSnackbar(error, "error");
    } else {
      setResetEmail(forgotEmail);
      navigateTo("reset-success");
    }
  };

  // ---- Google Login ----
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleLogin = () => {
    // Open role selection sheet before Google sign-in
    setGoogleRoleSheetOpen(true);
  };

  const handleGoogleRoleSelect = async (role: "tenant" | "landlord") => {
    setGoogleRoleSheetOpen(false);
    setGoogleLoading(true);
    const { error } = await signInWithGoogle(role);
    setGoogleLoading(false);
    if (error) {
      showSnackbar(error, "error");
    }
  };

  // ---- Help Sheet ----
  const openHelpSheet = () => setHelpSheetOpen(true);
  const closeHelpSheet = () => setHelpSheetOpen(false);

  // ---- New Bottom Sheet Handlers ----
  const openBottomSheet = (sheet: "terms" | "privacy" | "success") => setActiveSheet(sheet);
  const closeBottomSheet = () => setActiveSheet(null);

  const getStarted = () => {
    closeBottomSheet();
    if (selectedRole === "tenant") {
      router.push("/browse");
    } else {
      router.push("/dashboard");
    }
  };

  // ---- Snackbar ----
  const showSnackbar = (message: string, type: SnackbarType = "info") => {
    setSnackbar({ show: true, message, type });
    if (snackbarTimeoutRef.current) clearTimeout(snackbarTimeoutRef.current);
    snackbarTimeoutRef.current = setTimeout(() => {
      setSnackbar({ show: false, message: "", type: "info" });
    }, 3500);
  };

  const hideSnackbar = () => {
    setSnackbar({ show: false, message: "", type: "info" });
  };

  const snackbarIcon = () => {
    switch (snackbar.type) {
      case "success":
        return (
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center"
            style={{ background: "rgba(4,120,87,0.2)" }}
          >
            <Check className="w-3.5 h-3.5" style={{ color: "#047857" }} />
          </div>
        );
      case "error":
        return (
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center"
            style={{ background: "rgba(239,68,68,0.2)" }}
          >
            <X className="w-3.5 h-3.5" style={{ color: "#ef4444" }} />
          </div>
        );
      case "info":
        return (
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center"
            style={{ background: "rgba(59,130,246,0.2)" }}
          >
            <Info className="w-3.5 h-3.5" style={{ color: "#3b82f6" }} />
          </div>
        );
    }
  };



  // ---- Error state for login/signup submission ----
  const [loginSubmitted, setLoginSubmitted] = useState(false);
  const [forgotSubmitted, setForgotSubmitted] = useState(false);
  const loginPhoneError = loginSubmitted && loginMethod === 'phone' && !validatePhone(phoneInput);
  const loginEmailError = loginSubmitted && loginMethod === 'email' && !validateEmail(emailInput);
  const loginPasswordError = loginSubmitted && loginMethod === 'email' && !passwordInput;

  // ---- Snackbar display logic ----
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

  return (
    <div
      className="flex-1 flex flex-col"
      style={{
        background: "#050505",
        color: "#e5e5e5",
        minHeight: "100dvh",
        overflowX: "hidden",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* ============================================ */}
      {/* PAGE: LOGIN */}
      {/* ============================================ */}
      <div
        id="page-login"
        className={`page ${currentPage === "login" ? pageClass : ""}`}
        style={currentPage === "login" ? {} : { display: "none" }}
      >
        <div className="status-bar" />

        {/* Background Glows */}
        <div
          className="glow-bg"
          style={{ top: "-80px", right: "-100px", background: "rgba(4,120,87,0.1)" }}
        />
        <div
          className="glow-bg"
          style={{ bottom: "100px", left: "-120px", background: "rgba(4,120,87,0.06)" }}
        />

        {/* Top Section */}
        <div
          className="flex-1 flex flex-col justify-center px-6 pb-4"
          style={{ animation: "slideInUp 0.6s ease" }}
        >
          {/* Logo & Branding */}
          <div className="text-center mb-10">
            <div
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5"
              style={{
                background: "linear-gradient(135deg, #047857, #059669)",
                boxShadow: "0 8px 32px rgba(4,120,87,0.3)",
              }}
            >
              <Home className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              RentKe
            </h1>
            <p className="text-sm mt-2" style={{ color: "#a3a3a3" }}>
              Find your perfect rental in Kenya
            </p>
          </div>

          {/* Login Method Toggle */}
          <div
            className="flex rounded-2xl p-1 mb-8"
            style={{ background: "rgba(255,255,255,0.05)" }}
          >
            <button
              onClick={() => switchLoginMethod("phone")}
              className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all duration-200"
              style={
                loginMethod === "phone"
                  ? { background: "#047857", color: "white" }
                  : { color: "#a3a3a3" }
              }
            >
              <span className="flex items-center justify-center gap-2">
                <Smartphone className="w-4 h-4" />
                Phone
              </span>
            </button>
            <button
              onClick={() => switchLoginMethod("email")}
              className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all duration-200"
              style={
                loginMethod === "email"
                  ? { background: "#047857", color: "white" }
                  : { color: "#a3a3a3" }
              }
            >
              <span className="flex items-center justify-center gap-2">
                <Mail className="w-4 h-4" />
                Email
              </span>
            </button>
          </div>

          {/* Phone Login Form */}
          <div
            className="space-y-4"
            style={{ display: loginMethod === "phone" ? "block" : "none" }}
          >
            <div className="input-group">
              <input
                type="tel"
                className={`android-input phone-input-padded ${loginPhoneError ? "error" : ""}`}
                placeholder=" "
                maxLength={10}
                autoComplete="tel"
                value={phoneInput}
                onChange={(e) => { handlePhoneChange(e.target.value); setLoginSubmitted(false); }}
              />
              <label>Phone Number</label>
              <div
                className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none"
                style={{ marginTop: "2px" }}
              >
                <span className="text-sm font-medium" style={{ color: "#a3a3a3" }}>
                  🇰🇪 +254
                </span>
              </div>
            </div>
            {loginPhoneError && (
              <div className="text-xs font-medium px-1" style={{ color: "#ef4444" }}>
                <span className="flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Enter a valid Kenyan phone
                  number
                </span>
              </div>
            )}
          </div>

          {/* Email Login Form */}
          <div
            className="space-y-4"
            style={{ display: loginMethod === "email" ? "block" : "none" }}
          >
            <div className="input-group">
              <input
                type="email"
                className={`android-input ${loginEmailError ? "error" : ""}`}
                placeholder=" "
                autoComplete="email"
                value={emailInput}
                onChange={(e) => { setEmailInput(e.target.value); setLoginSubmitted(false); }}
              />
              <label>Email Address</label>
            </div>
            {loginEmailError && (
              <div className="text-xs font-medium px-1" style={{ color: "#ef4444" }}>
                <span className="flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Enter a valid email address
                </span>
              </div>
            )}
            <div className="input-group">
              <input
                type={showPassword ? "text" : "password"}
                className={`android-input ${loginPasswordError ? "error" : ""}`}
                placeholder=" "
                autoComplete="current-password"
                value={passwordInput}
                onChange={(e) => { setPasswordInput(e.target.value); setLoginSubmitted(false); }}
              />
              <label>Password</label>
              <button
                onClick={togglePasswordVisibility}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1"
                style={{ marginTop: "2px" }}
              >
                {showPassword ? (
                  <Eye className="w-5 h-5" style={{ color: "#525252" }} />
                ) : (
                  <EyeOff className="w-5 h-5" style={{ color: "#525252" }} />
                )}
              </button>
            </div>
            {loginPasswordError && (
              <div className="text-xs font-medium px-1" style={{ color: "#ef4444" }}>
                <span className="flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Password is required
                </span>
              </div>
            )}

            {/* Forgot Password */}
            <div className="flex justify-end">
              <button
                onClick={openForgotPassword}
                className="text-sm font-medium"
                style={{ color: "#047857" }}
              >
                Forgot password?
              </button>
            </div>
          </div>

          {/* Login Button */}
          <button
            id="login-btn"
            onClick={handleLogin}
            className="btn-primary ripple-container mt-6"
            disabled={loginLoading}
          >
            {loginLoading ? (
              <div className="spinner mx-auto" />
            ) : (
              <span>Continue</span>
            )}
          </button>

          {/* Divider */}
          <div className="divider my-6">or continue with</div>

          {/* Social Login */}
          <button
            onClick={handleGoogleLogin}
            className="btn-secondary ripple-container flex items-center justify-center gap-3"
            disabled={googleLoading}
          >
            {googleLoading ? (
              <div className="spinner" style={{ width: "18px", height: "18px" }} />
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>Google</span>
              </>
            )}
          </button>
        </div>

        {/* Bottom Section */}
        <div
          className="px-6 pb-8 pt-4 text-center"
          style={{ animation: "slideInUp 0.8s ease" }}
        >
          <p className="text-sm" style={{ color: "#525252" }}>
            Don&apos;t have an account?{" "}
            <button
              onClick={() => navigateTo("signup")}
              className="font-semibold"
              style={{ color: "#047857" }}
            >
              Sign up
            </button>
          </p>

        </div>
      </div>

      {/* ============================================ */}
      {/* PAGE: SIGN UP (Multi-Step Registration) */}
      {/* ============================================ */}
      <div
        id="page-signup"
        className={`page ${currentPage === "signup" ? pageClass : ""}`}
        style={currentPage === "signup" ? {} : { display: "none" }}
      >
        <div className="status-bar" />

        {/* Progress Header (Steps 2-4) */}
        {regStep >= 2 && (
          <div className="px-5 pt-4 pb-2 flex items-center justify-between">
            <button
              onClick={() => goToStep(regStep - 1)}
              className="w-10 h-10 rounded-full flex items-center justify-center ripple-container"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4].map((s) => (
                <div
                  key={s}
                  className="progress-step"
                  style={{
                    background:
                      s <= regStep ? "#047857" : "rgba(255,255,255,0.08)",
                  }}
                />
              ))}
            </div>
            <div className="w-10" />
          </div>
        )}

        {/* ============================================ */}
        {/* STEP 1: ROLE SELECTION */}
        {/* ============================================ */}
        {regStep === 1 && (
          <div className="flex-1 flex flex-col px-6 pb-8">
            <div
              className="mt-8 mb-8"
              style={{ animation: "slideInUp 0.5s ease" }}
            >
              <h1 className="text-3xl font-bold text-white leading-tight">
                How will you use
                <br />
                RentKe?
              </h1>
              <p className="text-sm mt-3" style={{ color: "#a3a3a3" }}>
                Choose the account type that suits you best.
              </p>
            </div>

            <div
              className="space-y-4"
              style={{ animation: "slideInUp 0.6s ease" }}
            >
              {/* Tenant */}
              <div
                className="ripple-container"
                style={{
                  border: `2px solid ${
                    selectedRole === "tenant"
                      ? "#047857"
                      : "rgba(255,255,255,0.05)"
                  }`,
                  background:
                    selectedRole === "tenant"
                      ? "rgba(4,120,87,0.08)"
                      : "rgba(255,255,255,0.03)",
                  borderRadius: "20px",
                  padding: "24px 20px",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  boxShadow:
                    selectedRole === "tenant"
                      ? "0 0 0 1px rgba(4,120,87,0.2)"
                      : "none",
                }}
                onClick={() => selectRole("tenant")}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(59,130,246,0.1)" }}
                  >
                    <Home className="w-7 h-7" style={{ color: "#3b82f6" }} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-white">
                        I&apos;m looking
                      </h3>
                      <div
                        className="w-6 h-6 rounded-full border-2 flex items-center justify-center"
                        style={{
                          borderColor:
                            selectedRole === "tenant"
                              ? "#047857"
                              : "rgba(255,255,255,0.2)",
                        }}
                      >
                        {selectedRole === "tenant" && (
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ background: "#047857" }}
                          />
                        )}
                      </div>
                    </div>
                    <p className="text-sm mt-1" style={{ color: "#a3a3a3" }}>
                      Find rentals, buy property, schedule viewings, and contact
                      landlords directly.
                    </p>
                  </div>
                </div>
              </div>

              {/* Landlord */}
              <div
                className="ripple-container"
                style={{
                  border: `2px solid ${
                    selectedRole === "landlord"
                      ? "#047857"
                      : "rgba(255,255,255,0.05)"
                  }`,
                  background:
                    selectedRole === "landlord"
                      ? "rgba(4,120,87,0.08)"
                      : "rgba(255,255,255,0.03)",
                  borderRadius: "20px",
                  padding: "24px 20px",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  boxShadow:
                    selectedRole === "landlord"
                      ? "0 0 0 1px rgba(4,120,87,0.2)"
                      : "none",
                }}
                onClick={() => selectRole("landlord")}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(4,120,87,0.1)" }}
                  >
                    <Building2
                      className="w-7 h-7"
                      style={{ color: "#047857" }}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-white">
                        I&apos;m listing
                      </h3>
                      <div
                        className="w-6 h-6 rounded-full border-2 flex items-center justify-center"
                        style={{
                          borderColor:
                            selectedRole === "landlord"
                              ? "#047857"
                              : "rgba(255,255,255,0.2)",
                        }}
                      >
                        {selectedRole === "landlord" && (
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ background: "#047857" }}
                          />
                        )}
                      </div>
                    </div>
                    <p className="text-sm mt-1" style={{ color: "#a3a3a3" }}>
                      List your properties, manage units, track inquiries, and
                      find tenants faster.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1" />

            <button
              onClick={() => goToStep(2)}
              className="w-full py-4 rounded-2xl font-semibold text-base text-white ripple-container mt-6"
              disabled={!selectedRole}
              style={
                selectedRole
                  ? {
                      background:
                        "linear-gradient(to right, #047857, #059669)",
                      boxShadow: "0 4px 20px rgba(4,120,87,0.3)",
                      color: "white",
                    }
                  : {
                      background: "rgba(255,255,255,0.08)",
                      color: "#525252",
                    }
              }
            >
              Continue
            </button>
          </div>
        )}

        {/* ============================================ */}
        {/* STEP 2: PERSONAL INFO */}
        {/* ============================================ */}
        {regStep === 2 && (
          <div className="flex-1 flex flex-col px-6 pb-8 overflow-y-auto">
            <div className="mt-8 mb-6">
              <h1 className="text-2xl font-bold text-white">
                Create your account
              </h1>
              <p className="text-sm mt-2" style={{ color: "#a3a3a3" }}>
                Fill in your details to get started.
              </p>
            </div>

            <div className="space-y-5">
              {/* Full Name */}
              <div>
                <div className="input-group">
                  <input
                    type="text"
                    id="reg-name"
                    className={`android-input ${
                      regErrors.name ? "error" : ""
                    }`}
                    placeholder=" "
                    autoComplete="name"
                    value={regName}
                    onChange={(e) => {
                      setRegName(e.target.value);
                      setRegErrors((prev) => ({ ...prev, name: false }));
                    }}
                  />
                  <label htmlFor="reg-name">Full Name</label>
                </div>
                {regErrors.name && (
                  <p
                    className="text-xs font-medium px-1 mt-1.5"
                    style={{ color: "#ef4444" }}
                  >
                    Full name is required
                  </p>
                )}
              </div>

              {/* Phone */}
              <div>
                <div className="input-group">
                  <input
                    type="tel"
                    id="reg-phone"
                    className={`android-input phone-input-padded ${
                      regErrors.phone ? "error" : ""
                    }`}
                    placeholder=" "
                    maxLength={10}
                    autoComplete="tel"
                    value={regPhone}
                    onChange={(e) => {
                      handleRegPhoneChange(e.target.value);
                      setRegErrors((prev) => ({ ...prev, phone: false }));
                    }}
                  />
                  <label htmlFor="reg-phone" style={{ left: "90px" }}>
                    Phone Number
                  </label>
                  <div
                    className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none"
                    style={{ marginTop: "2px" }}
                  >
                    <span
                      className="text-sm font-medium"
                      style={{ color: "#a3a3a3" }}
                    >
                      🇰🇪 +254
                    </span>
                  </div>
                </div>
                {regErrors.phone && (
                  <p
                    className="text-xs font-medium px-1 mt-1.5"
                    style={{ color: "#ef4444" }}
                  >
                    Enter a valid Kenyan phone number
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <div className="input-group">
                  <input
                    type="email"
                    id="reg-email"
                    className={`android-input ${
                      regErrors.email ? "error" : ""
                    }`}
                    placeholder=" "
                    autoComplete="email"
                    value={regEmail}
                    onChange={(e) => {
                      setRegEmail(e.target.value);
                      setRegErrors((prev) => ({ ...prev, email: false }));
                    }}
                  />
                  <label htmlFor="reg-email">Email Address</label>
                </div>
                {regErrors.email && (
                  <p
                    className="text-xs font-medium px-1 mt-1.5"
                    style={{ color: "#ef4444" }}
                  >
                    Enter a valid email address
                  </p>
                )}
              </div>
            </div>

            <div className="flex-1" />

            <button
              onClick={validateStep2}
              className="btn-primary ripple-container mt-6"
            >
              Continue
            </button>
          </div>
        )}

        {/* ============================================ */}
        {/* STEP 3: PASSWORD & TERMS */}
        {/* ============================================ */}
        {regStep === 3 && (
          <div className="flex-1 flex flex-col px-6 pb-8 overflow-y-auto">
            <div className="mt-8 mb-6">
              <h1 className="text-2xl font-bold text-white">
                Secure your account
              </h1>
              <p className="text-sm mt-2" style={{ color: "#a3a3a3" }}>
                Create a strong password to protect your account.
              </p>
            </div>

            <div className="space-y-5">
              {/* Password */}
              <div>
                <div className="input-group">
                  <input
                    type={showRegPassword ? "text" : "password"}
                    id="reg-password"
                    className="android-input"
                    placeholder=" "
                    autoComplete="new-password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                  />
                  <label htmlFor="reg-password">Password</label>
                  <button
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1"
                    style={{ marginTop: "2px" }}
                  >
                    {showRegPassword ? (
                      <Eye className="w-5 h-5" style={{ color: "#525252" }} />
                    ) : (
                      <EyeOff
                        className="w-5 h-5"
                        style={{ color: "#525252" }}
                      />
                    )}
                  </button>
                </div>
                <div className="flex gap-2 mt-3 px-1">
                  {[1, 2, 3, 4].map((i) => {
                    const pwStrength = getPasswordStrength(regPassword);
                    return (
                      <div
                        key={i}
                        className="strength-bar"
                        style={{
                          background:
                            i <= pwStrength && regPassword.length > 0
                              ? strengthColors[pwStrength - 1]
                              : "rgba(255,255,255,0.08)",
                        }}
                      />
                    );
                  })}
                </div>
                <p
                  className="text-xs px-1 mt-1.5"
                  style={{
                    color:
                      regPassword.length === 0
                        ? "#525252"
                        : strengthColors[
                            getPasswordStrength(regPassword) - 1
                          ] || "#ef4444",
                  }}
                >
                  {regPassword.length === 0
                    ? "Use 8+ characters with letters, numbers & symbols"
                    : strengthLabels[
                        getPasswordStrength(regPassword) - 1
                      ] || "Too short"}
                </p>
              </div>

              {/* Confirm Password */}
              <div>
                <div className="input-group">
                  <input
                    type="password"
                    id="reg-confirm"
                    className={`android-input ${
                      regErrors.confirm ? "error" : ""
                    }`}
                    placeholder=" "
                    autoComplete="new-password"
                    value={regConfirm}
                    onChange={(e) => {
                      setRegConfirm(e.target.value);
                      setRegErrors((prev) => ({ ...prev, confirm: false }));
                    }}
                  />
                  <label htmlFor="reg-confirm">Confirm Password</label>
                </div>
                {regErrors.confirm && (
                  <p
                    className="text-xs font-medium px-1 mt-1.5"
                    style={{ color: "#ef4444" }}
                  >
                    Passwords do not match
                  </p>
                )}
              </div>

              {/* Terms */}
              <div className="flex items-start gap-3 mt-4">
                <div
                  className={`checkbox mt-0.5 ${termsAccepted ? "checked" : ""}`}
                  onClick={toggleTerms}
                >
                  <Check
                    className={`w-3 h-3 text-white ${
                      termsAccepted ? "" : "hidden"
                    }`}
                  />
                </div>
                <p
                  className="text-xs leading-relaxed"
                  style={{ color: "#a3a3a3" }}
                >
                  I agree to the{" "}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openBottomSheet("terms");
                    }}
                    className="font-semibold underline"
                    style={{ color: "#047857" }}
                  >
                    Terms of Service
                  </button>{" "}
                  and{" "}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openBottomSheet("privacy");
                    }}
                    className="font-semibold underline"
                    style={{ color: "#047857" }}
                  >
                    Privacy Policy
                  </button>
                </p>
              </div>
              {regErrors.terms && (
                <p
                  className="text-xs font-medium px-1"
                  style={{ color: "#ef4444" }}
                >
                  Please accept the terms to continue
                </p>
              )}
            </div>

            <div className="flex-1" />

            <button
              onClick={validateStep3}
              className="btn-primary ripple-container mt-6"
              disabled={regLoading}
            >
              {regLoading ? (
                <div className="spinner mx-auto" />
              ) : (
                <span>Create Account</span>
              )}
            </button>
          </div>
        )}

        {/* ============================================ */}
        {/* STEP 4: OTP VERIFICATION */}
        {/* ============================================ */}
        {regStep === 4 && (
          <div className="flex-1 flex flex-col px-6 pb-8">
            <div
              className="text-center mt-12 mb-8"
              style={{ animation: "slideInUp 0.5s ease" }}
            >
              <div
                className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-6"
                style={{
                  background: "rgba(4,120,87,0.1)",
                  border: "1px solid rgba(4,120,87,0.2)",
                }}
              >
                <ShieldCheck
                  className="w-10 h-10"
                  style={{ color: "#047857" }}
                />
              </div>
              <h1 className="text-2xl font-bold text-white">
                Verify Your Phone
              </h1>
              <p className="text-sm mt-3 leading-relaxed" style={{ color: "#a3a3a3" }}>
                We&apos;ve sent a 4-digit code to
                <br />
                <span className="font-semibold text-white">
                  {currentPhone || formatPhone(regPhone)}
                </span>
              </p>
            </div>

            {/* OTP Input */}
            <div
              className="flex justify-center gap-3 mb-4"
              style={{ animation: "slideInUp 0.6s ease" }}
            >
              {[0, 1, 2, 3].map((i) => (
                <input
                  key={i}
                  type="text"
                  className={`otp-input ${otpValues[i] ? "filled" : ""}`}
                  maxLength={1}
                  data-otp={i}
                  value={otpValues[i]}
                  onChange={(e) => handleOtpInput(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeydown(e, i)}
                />
              ))}
            </div>
            {otpError && (
              <p
                className="text-xs font-medium text-center mb-4"
                style={{ color: "#ef4444" }}
              >
                Invalid code. Please try again.
              </p>
            )}

            {/* Timer / Resend */}
            <div className="text-center mb-8">
              {otpTimerActive ? (
                <p className="text-sm" style={{ color: "#525252" }}>
                  Resend code in{" "}
                  <span className="font-semibold text-white">{otpTimer}s</span>
                </p>
              ) : (
                <button
                  onClick={resendOtp}
                  className="text-sm font-semibold"
                  style={{ color: "#047857" }}
                >
                  Resend Code
                </button>
              )}
            </div>

            <div className="flex-1" />

            <button
              onClick={handleVerifyOtp}
              className="btn-primary ripple-container"
              disabled={!isOtpComplete || otpLoading}
            >
              {otpLoading ? (
                <div className="spinner mx-auto" />
              ) : (
                <span>Verify & Continue</span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* ============================================ */}
      {/* PAGE: OTP VERIFICATION */}
      {/* ============================================ */}
      <div
        id="page-otp"
        className={`page ${currentPage === "otp" ? pageClass : ""}`}
        style={currentPage === "otp" ? {} : { display: "none" }}
      >
        <div className="status-bar" />

        {/* Header */}
        <div className="flex items-center px-4 py-3">
          <button
            onClick={() => navigateTo("login")}
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.05)" }}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1" />
        </div>

        <div className="flex-1 flex flex-col px-6 pb-8">
          {/* Illustration */}
          <div className="text-center mb-8">
            <div
              className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-6"
              style={{
                background: "rgba(4,120,87,0.1)",
                border: "1px solid rgba(4,120,87,0.2)",
              }}
            >
              <ShieldCheck className="w-10 h-10" style={{ color: "#047857" }} />
            </div>
            <h1 className="text-2xl font-bold text-white">Verify Your Phone</h1>
            <p className="text-sm mt-3 leading-relaxed" style={{ color: "#a3a3a3" }}>
              We&apos;ve sent a 4-digit code to
              <br />
              <span className="font-semibold text-white">
                {formatPhone(currentPhone)}
              </span>
            </p>
          </div>

          {/* OTP Input */}
          <div className="flex justify-center gap-3 mb-6">
            {[0, 1, 2, 3].map((i) => (
              <input
                key={i}
                type="text"
                className={`otp-input ${otpValues[i] ? "filled" : ""}`}
                maxLength={1}
                data-otp={i}
                value={otpValues[i]}
                onChange={(e) => handleOtpInput(i, e.target.value)}
                onKeyDown={(e) => handleOtpKeydown(e, i)}
              />
            ))}
          </div>

          {/* Timer / Resend */}
          <div className="text-center mb-8">
            {otpTimerActive ? (
              <p className="text-sm" style={{ color: "#525252" }}>
                Resend code in{" "}
                <span className="font-semibold text-white">{otpTimer}s</span>
              </p>
            ) : (
              <button
                onClick={resendOtp}
                className="text-sm font-semibold"
                style={{ color: "#047857" }}
              >
                Resend Code
              </button>
            )}
          </div>

          {/* Verify Button */}
          <button
            onClick={handleVerifyOtp}
            className="btn-primary ripple-container"
            disabled={!isOtpComplete || otpLoading}
          >
            {otpLoading ? (
              <div className="spinner mx-auto" />
            ) : (
              <span>Verify</span>
            )}
          </button>

          <div className="flex-1" />

          {/* Help */}
          <div className="text-center mt-8">
            <button onClick={openHelpSheet} className="text-sm" style={{ color: "#a3a3a3" }}>
              <span className="flex items-center justify-center gap-1.5">
                <MessageCircle className="w-4 h-4" />
                Didn&apos;t receive the code?
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* PAGE: FORGOT PASSWORD */}
      {/* ============================================ */}
      <div
        id="page-forgot"
        className={`page ${currentPage === "forgot" ? pageClass : ""}`}
        style={currentPage === "forgot" ? {} : { display: "none" }}
      >
        <div className="status-bar" />

        {/* Header */}
        <div className="flex items-center px-4 py-3">
          <button
            onClick={() => navigateTo("login")}
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.05)" }}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1" />
        </div>

        <div className="flex-1 flex flex-col px-6 pb-8">
          <div className="text-center mb-8">
            <div
              className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-6"
              style={{
                background: "rgba(234,179,8,0.1)",
                border: "1px solid rgba(234,179,8,0.2)",
              }}
            >
              <KeyRound className="w-10 h-10" style={{ color: "#eab308" }} />
            </div>
            <h1 className="text-2xl font-bold text-white">Reset Password</h1>
            <p className="text-sm mt-3 leading-relaxed" style={{ color: "#a3a3a3" }}>
              Enter your email and we&apos;ll send you a link to reset your password
            </p>
          </div>

          <div className="space-y-4">
            <div className="input-group">
              <input
                type="email"
                className={`android-input ${forgotSubmitted && !validateEmail(forgotEmail) ? "error" : ""}`}
                placeholder=" "
                autoComplete="email"
                value={forgotEmail}
                onChange={(e) => { setForgotEmail(e.target.value); setForgotSubmitted(false); }}
              />
              <label>Email Address</label>
            </div>
            {forgotSubmitted && !validateEmail(forgotEmail) && (
              <div className="text-xs font-medium px-1" style={{ color: "#ef4444" }}>
                <span className="flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Enter a valid email address
                </span>
              </div>
            )}

            <button
              onClick={handleForgotPassword}
              className="btn-primary ripple-container mt-4"
              disabled={forgotLoading}
            >
              {forgotLoading ? (
                <div className="spinner mx-auto" />
              ) : (
                <span>Send Reset Link</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* PAGE: RESET PASSWORD SUCCESS */}
      {/* ============================================ */}
      <div
        id="page-reset-success"
        className={`page ${currentPage === "reset-success" ? pageClass : ""}`}
        style={currentPage === "reset-success" ? {} : { display: "none" }}
      >
        <div className="status-bar" />

        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8 text-center">
          <div
            className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-6"
            style={{
              background: "rgba(4,120,87,0.1)",
              border: "1px solid rgba(4,120,87,0.2)",
              animation: "scaleIn 0.4s ease",
            }}
          >
            <MailCheck className="w-10 h-10" style={{ color: "#047857" }} />
          </div>
          <h1 className="text-2xl font-bold text-white">Check Your Email</h1>
          <p className="text-sm mt-3 leading-relaxed" style={{ color: "#a3a3a3" }}>
            We&apos;ve sent a password reset link to
            <br />
            <span className="font-semibold text-white">{resetEmail}</span>
          </p>
          <button
            onClick={() => navigateTo("login")}
            className="btn-primary ripple-container mt-8"
          >
            Back to Login
          </button>
          <button
            onClick={handleForgotPassword}
            className="mt-4 text-sm font-medium"
            style={{ color: "#047857" }}
          >
            Didn&apos;t receive it? Resend
          </button>
        </div>
      </div>

      {/* ============================================ */}
      {/* BOTTOM SHEET: Forgot Password */}
      {/* ============================================ */}
      <div
        className={`bottom-sheet-overlay ${forgotSheetOpen ? "active" : ""}`}
        onClick={closeForgotPassword}
      />
      <div className={`bottom-sheet ${forgotSheetOpen ? "active" : ""}`}>
        <div className="bottom-sheet-handle" />
        <div className="p-6 pb-8">
          <h3 className="text-lg font-bold text-white mb-2">
            Forgot Password?
          </h3>
          <p className="text-sm mb-6" style={{ color: "#a3a3a3" }}>
            No worries! We&apos;ll send you a reset link.
          </p>
          <div className="input-group mb-4">
            <input
              type="email"
              className="android-input"
              placeholder=" "
              autoComplete="email"
              value={sheetForgotEmail}
              onChange={(e) => setSheetForgotEmail(e.target.value)}
            />
            <label>Email Address</label>
          </div>
          <button
            onClick={handleSheetForgotPassword}
            className="btn-primary ripple-container"
          >
            Send Reset Link
          </button>
          <button
            onClick={closeForgotPassword}
            className="btn-secondary ripple-container mt-3"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* ============================================ */}
      {/* BOTTOM SHEET: Help */}
      {/* ============================================ */}
      <div
        className={`bottom-sheet-overlay ${helpSheetOpen ? "active" : ""}`}
        onClick={closeHelpSheet}
      />
      <div className={`bottom-sheet ${helpSheetOpen ? "active" : ""}`}>
        <div className="bottom-sheet-handle" />
        <div className="p-6 pb-8">
          <h3 className="text-lg font-bold text-white mb-4">Need Help?</h3>
          <div className="space-y-3">
            <button
              className="w-full flex items-center gap-4 p-4 rounded-2xl transition-all"
              style={{ background: "rgba(255,255,255,0.05)" }}
              onClick={() => window.location.href = "tel:+254700000000"}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: "rgba(4,120,87,0.15)" }}
              >
                <Phone className="w-5 h-5" style={{ color: "#047857" }} />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-white">Call Us</p>
                <p className="text-xs" style={{ color: "#a3a3a3" }}>
                  +254 700 000 000
                </p>
              </div>
            </button>
            <button
              className="w-full flex items-center gap-4 p-4 rounded-2xl transition-all"
              style={{ background: "rgba(255,255,255,0.05)" }}
              onClick={() => window.open("https://wa.me/254700000000", "_blank")}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: "rgba(37,211,102,0.15)" }}
              >
                <MessageCircle className="w-5 h-5" style={{ color: "#25D366" }} />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-white">WhatsApp</p>
                <p className="text-xs" style={{ color: "#a3a3a3" }}>
                  Chat with support
                </p>
              </div>
            </button>
            <button
              className="w-full flex items-center gap-4 p-4 rounded-2xl transition-all"
              style={{ background: "rgba(255,255,255,0.05)" }}
              onClick={() =>
                showSnackbar("Email sent to support@rentke.co.ke", "success")
              }
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: "rgba(59,130,246,0.15)" }}
              >
                <Mail className="w-5 h-5" style={{ color: "#3b82f6" }} />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-white">Email Support</p>
                <p className="text-xs" style={{ color: "#a3a3a3" }}>
                  support@rentke.co.ke
                </p>
              </div>
            </button>
          </div>
          <button
            onClick={closeHelpSheet}
            className="btn-secondary ripple-container mt-5"
          >
            Close
          </button>
        </div>
      </div>



      {/* ============================================ */}
      {/* BOTTOM SHEET: Google Role Selection */}
      {/* ============================================ */}
      <div
        className={`bottom-sheet-overlay ${googleRoleSheetOpen ? "active" : ""}`}
        onClick={() => setGoogleRoleSheetOpen(false)}
      />
      <div className={`bottom-sheet ${googleRoleSheetOpen ? "active" : ""}`}>
        <div className="bottom-sheet-handle" />
        <div className="p-6 pb-8">
          <h3 className="text-xl font-bold text-white mb-6">
            Continue with Google
          </h3>

          <div className="space-y-3 mb-6">
            {/* Tenant */}
            <div
              className="ripple-container flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all"
              style={{
                background: "rgba(59,130,246,0.08)",
                border: "1.5px solid rgba(59,130,246,0.2)",
              }}
              onClick={() => handleGoogleRoleSelect("tenant")}
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(59,130,246,0.15)" }}
              >
                <Home className="w-6 h-6" style={{ color: "#3b82f6" }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-white">I&apos;m looking to rent</p>
                <p className="text-xs mt-0.5" style={{ color: "#a3a3a3" }}>
                  Find properties and contact landlords
                </p>
              </div>
            </div>

            {/* Landlord */}
            <div
              className="ripple-container flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all"
              style={{
                background: "rgba(4,120,87,0.08)",
                border: "1.5px solid rgba(4,120,87,0.2)",
              }}
              onClick={() => handleGoogleRoleSelect("landlord")}
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(4,120,87,0.15)" }}
              >
                <Building2 className="w-6 h-6" style={{ color: "#047857" }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-white">I&apos;m listing properties</p>
                <p className="text-xs mt-0.5" style={{ color: "#a3a3a3" }}>
                  Manage units and find tenants
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => setGoogleRoleSheetOpen(false)}
            className="btn-secondary ripple-container"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* ============================================ */}
      {/* BOTTOM SHEET: Welcome Success */}
      {/* ============================================ */}
      <div
        className={`bottom-sheet-overlay ${activeSheet === "success" ? "active" : ""}`}
        onClick={closeBottomSheet}
      />
      <div className={`bottom-sheet ${activeSheet === "success" ? "active" : ""}`}>
        <div className="p-8 text-center">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{
              background: "rgba(4,120,87,0.15)",
              animation: "scaleIn 0.4s ease",
            }}
          >
            <Check className="w-10 h-10" style={{ color: "#047857" }} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Welcome to RentKe! 🎉
          </h2>
          <p className="text-sm" style={{ color: "#a3a3a3" }}>
            {selectedRole === "landlord"
              ? "Your landlord account is ready. Start listing your properties and reach thousands of tenants across Kenya."
              : "Your account has been created successfully. Start exploring properties across Kenya."}
          </p>
        </div>
        <div className="px-6 pb-8 space-y-3">
          <button
            onClick={getStarted}
            className="w-full py-4 rounded-2xl font-semibold text-base text-white ripple-container"
            style={{
              background: "#047857",
              boxShadow: "0 4px 20px rgba(4,120,87,0.3)",
            }}
          >
            Get Started
          </button>
        </div>
      </div>

      {/* ============================================ */}
      {/* BOTTOM SHEET: Terms of Service */}
      {/* ============================================ */}
      <div
        className={`bottom-sheet-overlay ${activeSheet === "terms" ? "active" : ""}`}
        onClick={() => closeBottomSheet()}
      />
      <div className={`bottom-sheet ${activeSheet === "terms" ? "active" : ""}`}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Terms of Service</h3>
          <button
            onClick={() => closeBottomSheet()}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.05)" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 pb-8 text-sm leading-relaxed" style={{ color: "#a3a3a3" }}>
          <p className="mb-3">
            <strong className="text-white">1. Acceptance of Terms</strong>
            <br />
            By accessing and using RentKe, you agree to be bound by these Terms
            of Service.
          </p>
          <p className="mb-3">
            <strong className="text-white">2. User Accounts</strong>
            <br />
            You are responsible for maintaining the confidentiality of your
            account. You must provide accurate and complete information.
          </p>
          <p className="mb-3">
            <strong className="text-white">3. Property Listings</strong>
            <br />
            Landlords must ensure all property information is accurate. RentKe
            reserves the right to remove misleading listings.
          </p>
          <p className="mb-3">
            <strong className="text-white">4. Payments</strong>
            <br />
            All transactions are processed securely via M-Pesa. RentKe is not
            liable for direct transactions outside the platform.
          </p>
          <p>
            <strong className="text-white">5. Liability</strong>
            <br />
            RentKe acts as a platform connecting tenants and landlords. We do
            not guarantee the condition of any property.
          </p>
        </div>
      </div>

      {/* ============================================ */}
      {/* BOTTOM SHEET: Privacy Policy */}
      {/* ============================================ */}
      <div
        className={`bottom-sheet-overlay ${activeSheet === "privacy" ? "active" : ""}`}
        onClick={() => closeBottomSheet()}
      />
      <div className={`bottom-sheet ${activeSheet === "privacy" ? "active" : ""}`}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Privacy Policy</h3>
          <button
            onClick={() => closeBottomSheet()}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.05)" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 pb-8 text-sm leading-relaxed" style={{ color: "#a3a3a3" }}>
          <p className="mb-3">
            <strong className="text-white">Data Collection</strong>
            <br />
            We collect your name, phone number, email, and usage data to provide
            our services.
          </p>
          <p className="mb-3">
            <strong className="text-white">Data Usage</strong>
            <br />
            Your data is used to match you with properties, facilitate
            communication, and improve our platform.
          </p>
          <p className="mb-3">
            <strong className="text-white">Data Protection</strong>
            <br />
            We use industry-standard encryption to protect your personal
            information.
          </p>
          <p>
            <strong className="text-white">Third Parties</strong>
            <br />
            We do not sell your data. We may share it with landlords/tenants
            solely for property transactions.
          </p>
        </div>
      </div>

      {/* ============================================ */}
      {/* SNACKBAR */}
      {/* ============================================ */}
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
  );
}

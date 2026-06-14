"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
  type User,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { generateClientCode, linkUnitsToUser, claimUnitByCode } from "@/lib/units";
import { useRouter } from "next/navigation";

type UserRole = "tenant" | "landlord" | null;

interface AuthState {
  user: User | null;
  loading: boolean;
  role: UserRole;
}

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (data: {
    email: string;
    password: string;
    name: string;
    phone: string;
    role: "tenant" | "landlord";
    unitAccessCode?: string;
  }) => Promise<{ error?: string }>;
  signInWithGoogle: (role: "tenant" | "landlord") => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    role: null,
  });
  const router = useRouter();

  // Prevents onAuthStateChanged from overwriting role during signIn/signUp/signInWithGoogle
  const authOperationInProgress = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    const init = async () => {
      // Subscribe to auth state changes
      if (!cancelled) {
        unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          if (firebaseUser && !cancelled) {
            // If signIn/signUp is in progress, skip — it will set state itself
            if (authOperationInProgress.current) return;
            try {
              const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
              const role = (userDoc.data()?.role as UserRole) || null;
              setState({ user: firebaseUser, loading: false, role });
            } catch {
              setState({ user: firebaseUser, loading: false, role: null });
            }
          } else if (!cancelled) {
            setState({ user: null, loading: false, role: null });
          }
        });
      }
    };

    init();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  const signIn = useCallback(
    async (email: string, password: string): Promise<{ error?: string }> => {
      authOperationInProgress.current = true;
      try {
        const credential = await signInWithEmailAndPassword(auth, email, password);
        // Fetch role
        const userDoc = await getDoc(doc(db, "users", credential.user.uid));
        const role = userDoc.data()?.role as UserRole;
        setState((prev) => ({ ...prev, user: credential.user, role }));
        return {};
      } catch (err: any) {
        const code = err.code;
        if (code === "auth/user-not-found" || code === "auth/invalid-credential") {
          return { error: "Invalid email or password" };
        }
        if (code === "auth/too-many-requests") {
          return { error: "Too many attempts. Try again later." };
        }
        return { error: err.message || "Login failed" };
      } finally {
        authOperationInProgress.current = false;
      }
    },
    []
  );

  const signUp = useCallback(
    async (data: {
      email: string;
      password: string;
      name: string;
      phone: string;
      role: "tenant" | "landlord";
      unitAccessCode?: string;
    }): Promise<{ error?: string }> => {
      authOperationInProgress.current = true;
      try {
        const credential = await createUserWithEmailAndPassword(
          auth,
          data.email,
          data.password
        );
        const user = credential.user;

        // Update display name
        await updateProfile(user, { displayName: data.name });

        // Generate a unique client code for this user
        const clientCode = generateClientCode();

        // Store user doc in Firestore
        await setDoc(doc(db, "users", user.uid), {
          name: data.name,
          email: data.email,
          phone: data.phone,
          role: data.role,
          clientCode,
          createdAt: serverTimestamp(),
        });

        // Auto-link any units that were assigned to this phone before they had an account
        linkUnitsToUser(data.phone, user.uid).catch(() => {});

        // If the user provided a unit access code during sign-up, claim it
        if (data.unitAccessCode) {
          claimUnitByCode(data.unitAccessCode, user.uid).catch(() => {});
        }

        setState((prev) => ({ ...prev, user, role: data.role }));
        return {};
      } catch (err: any) {
        const code = err.code;
        if (code === "auth/email-already-in-use") {
          return { error: "An account with this email already exists" };
        }
        if (code === "auth/weak-password") {
          return { error: "Password must be at least 6 characters" };
        }
        return { error: err.message || "Sign up failed" };
      } finally {
        authOperationInProgress.current = false;
      }
    },
    []
  );

  const signInWithGoogle = useCallback(
    async (role: "tenant" | "landlord"): Promise<{ error?: string }> => {
      authOperationInProgress.current = true;
      const provider = new GoogleAuthProvider();
      try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        // Read or create user doc in Firestore
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (!userDoc.exists()) {
          // First-time Google user — create doc with selected role
          const clientCode = generateClientCode();
          await setDoc(doc(db, "users", user.uid), {
            name: user.displayName || "User",
            email: user.email,
            phone: user.phoneNumber || "",
            role: role,
            clientCode,
            createdAt: serverTimestamp(),
          });

          // Auto-link any units that were assigned to this phone before they had an account
          linkUnitsToUser(user.phoneNumber || "", user.uid).catch(() => {});

          setState({ user, loading: false, role });
        } else {
          // Returning user — use role from Firestore
          const existingRole = (userDoc.data()?.role as UserRole) || null;
          setState({ user, loading: false, role: existingRole });
        }

        return {};
      } catch (err: any) {
        if (err.code === "auth/popup-closed-by-user") {
          return {}; // User closed popup — no error to show
        }
        return { error: err.message || "Google sign-in failed" };
      } finally {
        authOperationInProgress.current = false;
      }
    },
    []
  );

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
    setState({ user: null, loading: false, role: null });
    router.push("/");
  }, [router]);

  const resetPassword = useCallback(
    async (email: string): Promise<{ error?: string }> => {
      try {
        await sendPasswordResetEmail(auth, email);
        return {};
      } catch (err: any) {
        return { error: err.message || "Failed to send reset email" };
      }
    },
    []
  );

  return (
    <AuthContext.Provider
      value={{ ...state, signIn, signUp, signInWithGoogle, signOut, resetPassword }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

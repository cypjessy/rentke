"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import type { PropertyData } from "./PropertyDetailSheet";
import { PLACEHOLDER_IMAGE } from "../constants";
import { useAuth } from "../AuthContext";
import { listenToTenantViewings, listenToFavorites, toggleFavorite as toggleFavoriteFS } from "@/lib/browse";
import type { FavoriteData } from "@/lib/browse";
import { listenToConversations, getCachedConversations, setCachedConversations } from "@/lib/conversations";
import type { ConversationData } from "@/lib/conversations";
import { listenToNotifications } from "@/lib/notifications";
import type { NotificationData } from "@/lib/notifications";
import type { ViewingData } from "@/lib/viewings";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type SnackbarType = "success" | "error" | "info";

export type RecentView = {
  id: number;
  title: string;
  location: string;
  price: string;
  img: string;
  time: string;
  timeColor: string;
};

export type BrowseContextType = {
  // Snackbar
  showSnackbar: (message: string, type?: SnackbarType) => void;

  // Property Detail Sheet
  propertyDetail: { isOpen: boolean; property?: PropertyData };
  openPropertyDetail: (property?: PropertyData) => void;
  closePropertyDetail: () => void;

  // Favorites (shared between home, explore, and saved pages)
  favorites: number[];
  favoriteIds: string[];
  toggleFavorite: (id: number, metadata?: { title?: string; location?: string; price?: number; image?: string; landlordId?: string; propertyId?: string }) => void;
  isFavorite: (id: number) => boolean;

  // Recently Viewed (populated from explore/home, shown on home)
  recentlyViewed: RecentView[];
  addToRecentlyViewed: (item: RecentView) => void;

  // Full data arrays (consolidated — pages read from context instead of owning duplicate listeners)
  viewings: ViewingData[];
  notifications: NotificationData[];
  conversations: ConversationData[];
  favoriteListings: FavoriteData[];

  // Loading states for each listener
  viewingsLoading: boolean;
  notificationsLoading: boolean;
  conversationsLoading: boolean;
  favoritesLoading: boolean;

  // Error states for each listener (null = no error, string = error message)
  viewingsError: string | null;
  notificationsError: string | null;
  conversationsError: string | null;
  favoritesError: string | null;

  // Dynamic badge counts
  unreadMessageCount: number;
  unreadNotificationCount: number;

  // Home page quick stats
  viewingsCount: number;
};

export const BrowseContext = createContext<BrowseContextType>({
  showSnackbar: () => {},
  propertyDetail: { isOpen: false },
  openPropertyDetail: () => {},
  closePropertyDetail: () => {},
  favorites: [],
  favoriteIds: [],
  toggleFavorite: () => {},
  isFavorite: () => false,
  recentlyViewed: [],
  addToRecentlyViewed: () => {},
  viewings: [],
  notifications: [],
  conversations: [],
  favoriteListings: [],
  viewingsLoading: true,
  notificationsLoading: true,
  conversationsLoading: true,
  favoritesLoading: true,
  viewingsError: null,
  notificationsError: null,
  conversationsError: null,
  favoritesError: null,
  unreadMessageCount: 0,
  unreadNotificationCount: 0,
  viewingsCount: 0,
});

export function BrowseProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  // ---- Full data arrays (single source of truth) ----
  const [viewings, setViewings] = useState<ViewingData[]>([]);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [conversations, setConversations] = useState<ConversationData[]>([]);
  const [favoriteListings, setFavoriteListings] = useState<FavoriteData[]>([]);

  // ---- Loading & error states for each listener ----
  const [viewingsLoading, setViewingsLoading] = useState(true);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [favoritesLoading, setFavoritesLoading] = useState(true);
  const [viewingsError, setViewingsError] = useState<string | null>(null);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);
  const [conversationsError, setConversationsError] = useState<string | null>(null);
  const [favoritesError, setFavoritesError] = useState<string | null>(null);

  // ---- Derived counts ----
  const viewingsCount = viewings.filter(
    (v) => v.status === "pending" || v.status === "confirmed"
  ).length;
  const unreadMessageCount = conversations.reduce((sum, c) => sum + (c.unreadCount?.[user?.uid || ""] || 0), 0);
  const unreadNotificationCount = notifications.filter((n) => !n.read).length;
  const favoriteIds = favoriteListings.map((f) => f.listingId);

  const [userPhone, setUserPhone] = useState("");

  // ---- Fetch user phone from Firestore (used by viewings listener) ----
  useEffect(() => {
    if (!user?.uid) return;
    getDoc(doc(db, "users", user.uid)).then((snap) => {
      if (snap.exists()) {
        setUserPhone(snap.data().phone || "");
      }
    }).catch(() => {});
  }, [user?.uid]);

  // ---- Listener: Viewings ----
  useEffect(() => {
    if (!user) return;
    const uid = user.uid || "";
    if (!uid) return;
    setViewingsLoading(true);
    setViewingsError(null);
    const unsub = listenToTenantViewings(
      uid,
      userPhone,
      (data) => {
        setViewings(data);
        setViewingsLoading(false);
      },
      (err) => {
        setViewingsError(err?.message || "Failed to load viewings");
        setViewingsLoading(false);
      }
    );
    return () => unsub();
  }, [user, userPhone]);

  // ---- Listener: Conversations (with localStorage cache) ----
  useEffect(() => {
    if (!user) return;
    setConversationsLoading(true);
    setConversationsError(null);

    // Show cached data instantly (zero-cost, no Firestore reads)
    const cached = getCachedConversations(user.uid);
    if (cached) {
      setConversations(cached);
      setConversationsLoading(false);
    }

    const unsub = listenToConversations(
      user.uid,
      (data) => {
        setConversations(data);
        setCachedConversations(user.uid, data);  // persist to localStorage
        setConversationsLoading(false);
      },
      (err) => {
        setConversationsError(err?.message || "Failed to load conversations");
        setConversationsLoading(false);
      }
    );
    return () => unsub();
  }, [user]);

  // ---- Listener: Notifications ----
  useEffect(() => {
    if (!user) return;
    setNotificationsLoading(true);
    setNotificationsError(null);
    const unsub = listenToNotifications(
      user.uid,
      (data) => {
        setNotifications(data);
        setNotificationsLoading(false);
      },
      (err) => {
        setNotificationsError(err?.message || "Failed to load notifications");
        setNotificationsLoading(false);
      }
    );
    return () => unsub();
  }, [user]);

  // ---- Snackbar ----
  const [snackbarState, setSnackbarState] = useState<{ show: boolean; message: string; type: SnackbarType }>({
    show: false, message: "", type: "info",
  });

  const showSnackbar = useCallback((message: string, type: SnackbarType = "info") => {
    setSnackbarState({ show: true, message, type });
    setTimeout(() => setSnackbarState({ show: false, message: "", type: "info" }), 3000);
  }, []);

  // ---- Property Detail ----
  const [propertyDetail, setPropertyDetail] = useState<{ isOpen: boolean; property?: PropertyData }>({ isOpen: false });
  const openPropertyDetail = useCallback((property?: PropertyData) => {
    setPropertyDetail({ isOpen: true, property });
  }, []);
  const closePropertyDetail = useCallback(() => {
    setPropertyDetail({ isOpen: false });
  }, []);

  // ---- Listener: Favorites ----
  useEffect(() => {
    if (!user) return;
    setFavoritesLoading(true);
    setFavoritesError(null);
    const unsub = listenToFavorites(
      user.uid,
      (data) => {
        setFavoriteListings(data);
        setFavoritesLoading(false);
      },
      (err) => {
        setFavoritesError(err?.message || "Failed to load favorites");
        setFavoritesLoading(false);
      }
    );
    return () => unsub();
  }, [user]);

  // Derived numeric favorites (for backward compat with existing UI)
  const favorites: number[] = favoriteIds
    .map((id) => parseInt(id, 10))
    .filter((n) => !isNaN(n));

  const toggleFavorite = useCallback(
    async (id: number, metadata?: { title?: string; location?: string; price?: number; image?: string; landlordId?: string; propertyId?: string }) => {
      if (!user) return;
      const strId = String(id);
      const isCurrentlyFav = favoriteIds.includes(strId);
      try {
        await toggleFavoriteFS(
          user.uid,
          {
            listingId: strId,
            propertyId: metadata?.propertyId || "",
            propertyName: metadata?.title || "",
            title: metadata?.title || "",
            location: metadata?.location || "",
            price: metadata?.price || 0,
            image: metadata?.image || PLACEHOLDER_IMAGE,
            landlordId: metadata?.landlordId || "",
          },
          isCurrentlyFav
        );
      } catch (err) {
        console.error("Failed to toggle favorite:", err);
      }
    },
    [user, favoriteIds]
  );
  const isFavorite = useCallback((id: number) => favorites.includes(id), [favorites]);

  // ---- Recently Viewed ----
  const [recentlyViewed, setRecentlyViewed] = useState<RecentView[]>([]);
  const addToRecentlyViewed = useCallback((item: RecentView) => {
    setRecentlyViewed((prev) => {
      const filtered = prev.filter((r) => r.id !== item.id);
      return [item, ...filtered].slice(0, 10);
    });
  }, []);

  return (
    <BrowseContext.Provider
      value={{
        showSnackbar,
        propertyDetail,
        openPropertyDetail,
        closePropertyDetail,
        favorites,
        favoriteIds,
        toggleFavorite,
        isFavorite,
        recentlyViewed,
        addToRecentlyViewed,
        viewings,
        notifications,
        conversations,
        favoriteListings,
        viewingsLoading,
        notificationsLoading,
        conversationsLoading,
        favoritesLoading,
        viewingsError,
        notificationsError,
        conversationsError,
        favoritesError,
        unreadMessageCount,
        unreadNotificationCount,
        viewingsCount,
      }}
    >
      {children}
    </BrowseContext.Provider>
  );
}

export const useBrowse = () => useContext(BrowseContext);

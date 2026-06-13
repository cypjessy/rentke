"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import type { PropertyData } from "./PropertyDetailSheet";
import { useAuth } from "../AuthContext";
import { listenToTenantViewings, listenToTenantInquiries, listenToFavorites, toggleFavorite as toggleFavoriteFS } from "@/lib/browse";
import { listenToConversations } from "@/lib/conversations";
import { listenToNotifications } from "@/lib/notifications";

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

  // Dynamic badge counts
  unreadMessageCount: number;
  setUnreadMessageCount: (count: number) => void;
  unreadNotificationCount: number;

  // Home page quick stats
  viewingsCount: number;
  inquiriesCount: number;
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
  unreadMessageCount: 0,
  setUnreadMessageCount: () => {},
  unreadNotificationCount: 0,
  viewingsCount: 0,
  inquiriesCount: 0,
});

export function BrowseProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [viewingsCount, setViewingsCount] = useState(0);
  const [inquiriesCount, setInquiriesCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  // Listen to tenant viewings for count
  useEffect(() => {
    if (!user) return;
    const phone = user.phoneNumber || "";
    if (!phone) return;
    const unsub = listenToTenantViewings(
      phone,
      (viewings) => {
        const upcoming = viewings.filter(
          (v) => v.status === "pending" || v.status === "confirmed"
        ).length;
        setViewingsCount(upcoming);
      },
      () => {}
    );
    return () => unsub();
  }, [user]);

  // Listen to tenant inquiries for count
  useEffect(() => {
    if (!user) return;
    const unsub = listenToTenantInquiries(
      user.uid,
      (inquiries) => {
        const pending = inquiries.filter(
          (i) => i.status === "new" || i.status === "progress"
        ).length;
        setInquiriesCount(pending);
      },
      () => {}
    );
    return () => unsub();
  }, [user]);

  // Listen to conversations for unread count
  useEffect(() => {
    if (!user) return;
    const unsub = listenToConversations(
      user.uid,
      (convs) => {
        let total = 0;
        convs.forEach((c) => {
          total += c.unreadCount?.[user.uid] || 0;
        });
        setUnreadMessageCount(total);
      },
      () => {}
    );
    return () => unsub();
  }, [user]);

  // Listen to notifications for unread badge count
  useEffect(() => {
    if (!user) return;
    const unsub = listenToNotifications(
      user.uid,
      (notifs) => {
        const unread = notifs.filter((n) => !n.read).length;
        setUnreadNotificationCount(unread);
      },
      () => {}
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

  // Firestore favorites listener
  useEffect(() => {
    if (!user) return;
    const unsub = listenToFavorites(
      user.uid,
      (favs) => {
        setFavoriteIds(favs.map((f) => f.listingId));
      },
      () => {}
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
        unreadMessageCount,
        setUnreadMessageCount,
        unreadNotificationCount,
        viewingsCount,
        inquiriesCount,
      }}
    >
      {children}
    </BrowseContext.Provider>
  );
}

export const useBrowse = () => useContext(BrowseContext);

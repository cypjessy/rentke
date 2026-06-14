import { ref, onValue, set, onDisconnect, off } from "firebase/database";
import { rtdb } from "./firebase";

// ---- Types ----

export interface PresenceData {
  online: boolean;
  lastSeen: number; // timestamp from Date.now()
}

// ---- Current user presence management ----

let currentUserId: string | null = null;
let currentUserCleanup: (() => void) | null = null;

/**
 * Start tracking the current user's presence in Realtime Database.
 *
 * Writes to `presence/{userId}` with `{ online: true, lastSeen: Date.now() }`
 * and sets an `onDisconnect` handler to mark the user offline when they
 * disconnect (close tab, navigate away, etc.).
 *
 * Call `stopTrackingPresence()` on logout or unmount.
 */
export function startTrackingPresence(userId: string): void {
  // Clean up any previous tracking
  stopTrackingPresence();

  currentUserId = userId;
  const userPresenceRef = ref(rtdb, `presence/${userId}`);

  // Listen for the .info/connected signal — fires when the client connects/disconnects
  const connectedRef = ref(rtdb, ".info/connected");
  const onConnected = onValue(connectedRef, (snap) => {
    if (snap.val() === true) {
      // We're connected — set up onDisconnect to mark offline
      onDisconnect(userPresenceRef)
        .set({
          online: false,
          lastSeen: Date.now(),
        })
        .then(() => {
          // Now set the current presence
          set(userPresenceRef, {
            online: true,
            lastSeen: Date.now(),
          });
        })
        .catch((err) => {
          console.warn("Failed to set onDisconnect presence:", err);
        });
    }
  });

  currentUserCleanup = () => {
    off(connectedRef, "value", onConnected);
    // Mark offline immediately
    set(userPresenceRef, {
      online: false,
      lastSeen: Date.now(),
    }).catch(() => {});
  };
}

/**
 * Stop tracking the current user's presence and mark them offline.
 */
export function stopTrackingPresence(): void {
  if (currentUserCleanup) {
    currentUserCleanup();
    currentUserCleanup = null;
  }
  if (currentUserId) {
    const userPresenceRef = ref(rtdb, `presence/${currentUserId}`);
    set(userPresenceRef, {
      online: false,
      lastSeen: Date.now(),
    }).catch(() => {});
    currentUserId = null;
  }
}

// ---- Listening to other users' presence ----

/**
 * Listen to a specific user's presence status in real-time.
 *
 * Returns an unsubscribe function. The callback fires immediately with
 * the current value, and again whenever it changes.
 */
export function listenToUserPresence(
  userId: string,
  onData: (data: PresenceData) => void
): () => void {
  const presenceRef = ref(rtdb, `presence/${userId}`);
  return onValue(presenceRef, (snap) => {
    const val = snap.val();
    if (val && typeof val.online === "boolean" && typeof val.lastSeen === "number") {
      onData(val as PresenceData);
    } else {
      // User has no presence data yet — they're offline
      onData({ online: false, lastSeen: 0 });
    }
  });
}

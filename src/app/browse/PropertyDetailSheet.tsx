"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowLeft,
  Share2,
  Heart,
  MapPin,
  ShieldCheck,
  ChevronRight,
  BedDouble,
  Bath,
  Maximize2,
  Layers,
  Phone,
  MessageCircle,
  Calendar,
  Send,
  Search,
  X,
  Link2,
  Clock,
  AtSign,
  Globe,
  Pause,
  Edit3,
  Trash2,
  Check,
  Info,
} from "lucide-react";
import { useBrowse } from "./BrowseContext";
import { useAuth } from "../AuthContext";
import { scheduleViewing } from "@/lib/viewings";
import { createConversation } from "@/lib/conversations";
import { openPhoneUrl } from "@/lib/phone";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";

import { PLACEHOLDER_IMAGE } from "../constants";

export interface PropertyData {
  id: number;
  title: string;
  location: string;
  price: string;
  image: string;
  gallery?: string[];
  badge?: string;
  verified?: boolean;
  featured?: boolean;
  type: string;
  bathrooms: number;
  size: string;
  floor: string;
  description: string;
  amenities: { emoji: string; label: string }[];
  costBreakdown: { label: string; amount: string }[];
  totalMoveIn: string;
  landlord: {
    name: string;
    initial: string;
    verified: boolean;
    response: string;
    rating: number;
    reviews: number;
  };
  landlordId: string;
  photos: number;
  isFavorited?: boolean;
}

// ---- Default Property Data ----
const defaultProperty: PropertyData = {
  id: 1,
  title: "Modern Bedsitter - Kilimani",
  location: "Kilimani, Nairobi, Kenya",
  price: "15,000",

  badge: "FEATURED",
  featured: true,
  verified: true,
  type: "Bedsitter",
  bathrooms: 1,
  size: "20 sqm",
  floor: "3rd",
  description:
    "This is a beautifully finished bedsitter located in the heart of Kilimani, Nairobi. The unit comes with modern fittings, a separate kitchen area, and ample natural light. Water is available 24/7 via borehole, and electricity is on a token meter. The compound is secure with CCTV and a 24-hour guard. Walking distance to Yaya Centre and Quickmart Kilimani. Ideal for a young professional or student. Viewing is available on weekdays and weekends upon request.",
  amenities: [
    { emoji: "💧", label: "Borehole / 24hr Water" },
    { emoji: "⚡", label: "Token Meter" },
    { emoji: "🚿", label: "Hot Shower" },
    { emoji: "🔒", label: "CCTV & Guard" },
    { emoji: "🅿️", label: "Free Parking" },
    { emoji: "📶", label: "WiFi Ready" },
    { emoji: "🏙️", label: "Balcony" },
    { emoji: "🚧", label: "Gated Estate" },
  ],
  costBreakdown: [
    { label: "Monthly Rent", amount: "KSh 15,000" },
    { label: "Deposit (1 month)", amount: "KSh 15,000" },
    { label: "Service Charge", amount: "KSh 2,000" },
  ],
  totalMoveIn: "KSh 32,000",
  landlord: {
    name: "John Mwangi",
    initial: "J",
    verified: true,
    response: "~1 hour",
    rating: 5,
    reviews: 42,
  },
  landlordId: "",
  image: PLACEHOLDER_IMAGE,
  gallery: [PLACEHOLDER_IMAGE],
  photos: 5,
  isFavorited: false,
};

const galleryImages: string[] = [PLACEHOLDER_IMAGE];

const shareOptions = [
  { label: "WhatsApp", icon: MessageCircle, color: "#25D366", bg: "rgba(37,211,102,0.15)" },
  { label: "Twitter", icon: AtSign, color: "#1DA1F2", bg: "rgba(29,161,242,0.15)" },
  { label: "Facebook", icon: Globe, color: "#1877F2", bg: "rgba(24,119,242,0.15)" },
  { label: "Telegram", icon: Send, color: "#0088cc", bg: "rgba(0,136,204,0.15)" },
];

const timeSlots = ["10:00 AM", "12:00 PM", "2:00 PM", "4:00 PM", "6:00 PM"];

interface PropertyDetailSheetProps {
  isOpen: boolean;
  property?: PropertyData;
  onClose: () => void;
  onToggleFavorite?: (id: number) => void;
  isFavorited?: boolean;
}

export default function PropertyDetailSheet({
  isOpen,
  property: prop,
  onClose,
  onToggleFavorite,
  isFavorited: externalFav,
}: PropertyDetailSheetProps) {
  const router = useRouter();
  const { showSnackbar } = useBrowse();
  const { user } = useAuth();
  const [viewingLoading, setViewingLoading] = useState(false);
  const [messageLoading, setMessageLoading] = useState(false);
  const [landlordPhone, setLandlordPhone] = useState<string | null>(null);
  const [landlordName, setLandlordName] = useState<string>("");
  const p = prop || defaultProperty;

  // ---- Fetch landlord contact info ----
  useEffect(() => {
    if (!p.landlordId) {
      setLandlordPhone(null);
      setLandlordName("");
      return;
    }
    getDoc(doc(db, "users", p.landlordId)).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setLandlordPhone(data.phoneNumber || data.phone || "");
        setLandlordName(data.displayName || data.name || p.landlord.name || "");
      }
    }).catch(() => {});
  }, [p.landlordId]);

  // ---- Gallery ----
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);
  const galleryRef = useRef<HTMLDivElement>(null);

  const handleGalleryScroll = useCallback(() => {
    const el = galleryRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / el.offsetWidth);
    setActiveGalleryIndex(idx);
  }, []);

  // ---- Description Expand ----
  const [descExpanded, setDescExpanded] = useState(false);

  // ---- Favorite ----
  const [isFav, setIsFav] = useState(externalFav || p.isFavorited || false);

  useEffect(() => {
    setIsFav(externalFav || p.isFavorited || false);
  }, [externalFav, p.isFavorited]);

  const toggleFav = () => {
    const next = !isFav;
    setIsFav(next);
    if (onToggleFavorite) onToggleFavorite(p.id);
    showSnackbar(
      next ? "Added to saved ❤️" : "Removed from saved",
      next ? "success" : "info"
    );
  };

  // ---- Bottom Sheets ----
  const [sheetOpen, setSheetOpen] = useState<string | null>(null);
  const [bodyOverflow, setBodyOverflow] = useState(false);

  useEffect(() => {
    document.body.style.overflow = bodyOverflow ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [bodyOverflow]);

  const openSheet = (id: string) => {
    setSheetOpen(id);
    setBodyOverflow(true);
  };

  const closeSheet = () => {
    setSheetOpen(null);
    setBodyOverflow(false);
  };

  const isSheetOpen = (id: string) => sheetOpen === id;

  // ---- Schedule Viewing ----
  const [selectedTime, setSelectedTime] = useState("2:00 PM");
  const [viewingDate, setViewingDate] = useState("");

  const submitViewing = async () => {
    if (!viewingDate) {
      showSnackbar("Please select a date", "error");
      return;
    }
    setViewingLoading(true);
    try {
      const startTime = selectedTime;
      const endHour = parseInt(startTime.split(":")[0]) + 1;
      const endTime = `${endHour}:00 ${startTime.includes("PM") && endHour < 12 ? "PM" : startTime.includes("AM") && endHour >= 12 ? "PM" : startTime.includes("PM") && endHour >= 12 ? "AM" : startTime.slice(-2)}`;

      await scheduleViewing(p.landlordId, {
        propertyId: String(p.id),
        propertyName: p.title,
        unitId: "",
        unitName: "",
        tenantName: user?.displayName || "Tenant",
        tenantPhone: user?.phoneNumber || "",
        tenantId: user?.uid || "",
        date: viewingDate,
        startTime,
        endTime,
        duration: "60 min",
        notes: "",
      });
      setViewingLoading(false);
      closeSheet();
      setTimeout(() => {
        showSnackbar(
          `Viewing scheduled for ${viewingDate} at ${selectedTime} ✅`,
          "success"
        );
      }, 300);
    } catch (err: any) {
      setViewingLoading(false);
      showSnackbar(err.message || "Failed to schedule viewing", "error");
    }
  };

  // ---- Share ----
  const shareAction = (platform: string) => {
    closeSheet();
    const url = `https://rentke.co.ke/property/${p.id}`;
    const text = `Check out "${p.title}" in ${p.location} — KSh ${p.price}/mo on RentKe!`;
    switch (platform) {
      case "WhatsApp":
        window.open(`https://wa.me/?text=${encodeURIComponent(text + " " + url)}`, "_blank");
        break;
      case "Twitter":
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, "_blank");
        break;
      case "Facebook":
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`, "_blank");
        break;
      case "Telegram":
        window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, "_blank");
        break;
      default:
        if (navigator.share) {
          navigator.share({ title: p.title, text, url }).catch(() => {});
        }
    }
  };

  const copyLink = () => {
    const url = `https://rentke.co.ke/property/${p.id}`;
    navigator.clipboard?.writeText(url);
    showSnackbar("Link copied to clipboard!", "success");
  };

  // ---- Phone Actions ----
  const handleCall = () => {
    if (landlordPhone) {
      openPhoneUrl(landlordPhone, "tel");
    } else {
      showSnackbar("Phone number not available", "info");
    }
    closeSheet();
  };

  const handleWhatsApp = () => {
    if (landlordPhone) {
      openPhoneUrl(landlordPhone, "wa");
    } else {
      showSnackbar("Phone number not available", "info");
    }
    closeSheet();
  };

  // ---- In-App Message ----
  const handleSendMessage = async () => {
    if (messageLoading) return;
    if (!user) {
      showSnackbar("Please sign in to send a message", "error");
      return;
    }
    if (!p.landlordId) {
      showSnackbar("Landlord contact not available", "error");
      return;
    }
    setMessageLoading(true);
    try {
      // Build property attachment: use first gallery image or main image
      const propertyImageUrl = (p.gallery && p.gallery.length > 0) ? p.gallery[0] : p.image;
      const firstMessageAttachments = propertyImageUrl && propertyImageUrl.startsWith("http") ? [{
        type: "image" as const,
        name: p.title || "Property Image",
        url: propertyImageUrl,
        mimeType: "image/jpeg",
      }] : [];

      // Build rich first message with property details
      const richMessage = `Hi, I'm interested in "${p.title}" — KSh ${p.price}/mo in ${p.location}. Is it still available?`;

      await createConversation({
        participants: [user.uid, p.landlordId],
        participantNames: {
          [user.uid]: user.displayName || user.email || "Tenant",
          [p.landlordId]: landlordName || p.landlord.name,
        },
        propertyId: String(p.id),
        propertyName: p.title,
        propertyImage: propertyImageUrl || undefined,
        firstMessage: richMessage,
        firstMessageAttachments: firstMessageAttachments.length > 0 ? firstMessageAttachments : undefined,
        senderId: user.uid,
      });
      setMessageLoading(false);
      router.push(`/browse/messages`);
    } catch (err: any) {
      setMessageLoading(false);
      showSnackbar(err.message || "Failed to start conversation", "error");
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* ============================================ */}
      {/* FULL-SCREEN DETAIL OVERLAY */}
      {/* ============================================ */}
      <div className="detail-overlay active">
        <div className="flex flex-col min-h-dvh pb-24">
          <div className="status-bar" />

          {/* ====== HEADER ====== */}
          <header
            className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 pt-3 pb-2"
            style={{
              paddingTop: "max(24px, env(safe-area-inset-top))",
              background:
                "linear-gradient(to bottom, rgba(5,5,5,0.8) 0%, transparent 100%)",
            }}
          >
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full flex items-center justify-center ripple-container"
              style={{
                background: "rgba(0,0,0,0.4)",
                backdropFilter: "blur(8px)",
              }}
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => openSheet("bs-share")}
                className="w-10 h-10 rounded-full flex items-center justify-center ripple-container"
                style={{
                  background: "rgba(0,0,0,0.4)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <Share2 className="w-5 h-5 text-white" />
              </button>
              <button
                onClick={toggleFav}
                className="w-10 h-10 rounded-full flex items-center justify-center ripple-container"
                style={{
                  background: "rgba(0,0,0,0.4)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <Heart
                  className="w-5 h-5"
                  style={{
                    color: isFav ? "#ef4444" : "white",
                    fill: isFav ? "#ef4444" : "transparent",
                  }}
                />
              </button>
            </div>
          </header>

          {/* ====== IMAGE GALLERY ====== */}
          <div
            className="gallery-container scroll-hidden"
            ref={galleryRef}
            onScroll={handleGalleryScroll}
          >
            {(p.gallery && p.gallery.length > 0 ? p.gallery : galleryImages).map((img, i) => (
              <div key={i} className="gallery-item">
                <img 
                  src={img} 
                  alt={`${p.title} photo ${i + 1}`} 
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE;
                  }}
                />
              </div>
            ))}
            <div
              className="absolute bottom-5 right-4 px-2.5 py-1 rounded-lg text-xs font-semibold text-white z-10"
              style={{
                background: "rgba(0,0,0,0.6)",
                backdropFilter: "blur(4px)",
                WebkitBackdropFilter: "blur(4px)",
              }}
            >
              <span>{activeGalleryIndex + 1}</span>/{(p.gallery && p.gallery.length > 0 ? p.gallery : galleryImages).length} 📷
            </div>
          </div>

          {/* Gallery Dots */}
          <div className="gallery-dots">
            {(p.gallery && p.gallery.length > 0 ? p.gallery : galleryImages).map((_, i) => (
              <div
                key={i}
                className={`gallery-dot ${i === activeGalleryIndex ? "active" : ""}`}
              />
            ))}
          </div>

          {/* ====== MAIN CONTENT ====== */}
          <div className="px-3 -mt-2">
            {/* Price & Title */}
            <div style={{ animation: "slideInUp 0.5s ease" }}>
              <div className="flex items-center gap-2 mb-2">
                {p.featured && (
                  <span
                    className="px-2 py-0.5 rounded text-xs font-bold"
                    style={{ background: "#047857", color: "white" }}
                  >
                    {p.badge || "FEATURED"}
                  </span>
                )}
                {p.verified && (
                  <div className="flex items-center gap-1">
                    <ShieldCheck
                      className="w-4 h-4"
                      style={{ color: "#047857" }}
                    />
                    <span
                      className="text-xs font-semibold"
                      style={{ color: "#047857" }}
                    >
                      Verified
                    </span>
                  </div>
                )}
              </div>
              <h1 className="text-2xl font-bold text-white leading-tight">
                {p.title}
              </h1>
              <div className="flex items-center gap-1.5 mt-2">
                <MapPin className="w-4 h-4" style={{ color: "#a3a3a3" }} />
                <p className="text-sm" style={{ color: "#a3a3a3" }}>
                  {p.location}
                </p>
              </div>
              <div className="flex items-baseline gap-1 mt-3">
                <span className="text-3xl font-bold" style={{ color: "#047857" }}>
                  KSh {p.price}
                </span>
                <span className="text-sm" style={{ color: "#525252" }}>
                  /month
                </span>
              </div>
            </div>

            {/* Quick Stats */}
            <div
              className="flex items-center justify-between mt-6 py-4 rounded-2xl px-4"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.05)",
                animation: "slideInUp 0.6s ease",
              }}
            >
              <div className="text-center flex-1">
                <BedDouble className="w-5 h-5 mx-auto mb-1" style={{ color: "#a3a3a3" }} />
                <p className="text-sm font-bold text-white">{p.type}</p>
                <p className="text-xs" style={{ color: "#525252" }}>
                  Type
                </p>
              </div>
              <div
                style={{
                  width: "1px",
                  height: "40px",
                  background: "rgba(255,255,255,0.08)",
                }}
              />
              <div className="text-center flex-1">
                <Bath className="w-5 h-5 mx-auto mb-1" style={{ color: "#a3a3a3" }} />
                <p className="text-sm font-bold text-white">{p.bathrooms}</p>
                <p className="text-xs" style={{ color: "#525252" }}>
                  Bathroom
                </p>
              </div>
              <div
                style={{
                  width: "1px",
                  height: "40px",
                  background: "rgba(255,255,255,0.08)",
                }}
              />
              <div className="text-center flex-1">
                <Maximize2 className="w-5 h-5 mx-auto mb-1" style={{ color: "#a3a3a3" }} />
                <p className="text-sm font-bold text-white">{p.size}</p>
                <p className="text-xs" style={{ color: "#525252" }}>
                  Size
                </p>
              </div>
              <div
                style={{
                  width: "1px",
                  height: "40px",
                  background: "rgba(255,255,255,0.08)",
                }}
              />
              <div className="text-center flex-1">
                <Layers className="w-5 h-5 mx-auto mb-1" style={{ color: "#a3a3a3" }} />
                <p className="text-sm font-bold text-white">{p.floor}</p>
                <p className="text-xs" style={{ color: "#525252" }}>
                  Floor
                </p>
              </div>
            </div>

            {/* Description */}
            <div className="mt-6" style={{ animation: "slideInUp 0.7s ease" }}>
              <h2 className="text-base font-bold text-white mb-2">Description</h2>
              <div
                className="relative overflow-hidden transition-all duration-300"
                style={{ maxHeight: descExpanded ? "500px" : "72px" }}
              >
                <p className="text-sm leading-relaxed" style={{ color: "#a3a3a3" }}>
                  {p.description}
                </p>
              </div>
              <button
                onClick={() => setDescExpanded(!descExpanded)}
                className="text-xs font-semibold mt-1"
                style={{ color: "#047857" }}
              >
                {descExpanded ? "Show less" : "Read more"}
              </button>
            </div>

            {/* Amenities */}
            <div className="mt-6" style={{ animation: "slideInUp 0.8s ease" }}>
              <h2 className="text-base font-bold text-white mb-3">Amenities</h2>
              <div className="grid grid-cols-2 gap-2">
                {p.amenities.map((a) => (
                  <div
                    key={a.label}
                    className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ background: "rgba(255,255,255,0.03)" }}
                  >
                    <span className="text-lg">{a.emoji}</span>
                    <span className="text-sm text-white">{a.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Cost Breakdown */}
            <div
              className="mt-6"
              style={{ animation: "slideInUp 0.85s ease" }}
            >
              <h2 className="text-base font-bold text-white mb-3">
                Cost Breakdown
              </h2>
              <div
                className="p-4 rounded-2xl space-y-3"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                {p.costBreakdown.map((item) => (
                  <div key={item.label} className="flex justify-between items-center">
                    <span className="text-sm" style={{ color: "#a3a3a3" }}>
                      {item.label}
                    </span>
                    <span className="text-sm font-bold text-white">
                      {item.amount}
                    </span>
                  </div>
                ))}
                <div
                  style={{
                    height: "1px",
                    background: "rgba(255,255,255,0.08)",
                  }}
                />
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-white">
                    Move-in Total
                  </span>
                  <span
                    className="text-base font-bold"
                    style={{ color: "#047857" }}
                  >
                    {p.totalMoveIn}
                  </span>
                </div>
              </div>
            </div>

            {/* Landlord Info */}
            <div className="mt-6" style={{ animation: "slideInUp 0.9s ease" }}>
              <h2 className="text-base font-bold text-white mb-3">Listed by</h2>
              <div
                className="flex items-center gap-4 p-4 rounded-2xl"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0"
                  style={{
                    background: "linear-gradient(135deg, #047857, #059669)",
                    color: "white",
                  }}
                >
                  {p.landlord.initial}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">
                      {p.landlord.name}
                    </h3>
                    {p.landlord.verified && (
                      <ShieldCheck
                        className="w-4 h-4"
                        style={{ color: "#047857" }}
                      />
                    )}
                  </div>
                  <p className="text-xs" style={{ color: "#a3a3a3" }}>
                    {p.landlord.verified ? "Verified Landlord" : "Landlord"} • Responds in{" "}
                    {p.landlord.response}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-yellow-400 text-xs">
                      {"★".repeat(p.landlord.rating)}
                      {"☆".repeat(5 - p.landlord.rating)}
                    </span>
                    <span className="text-xs" style={{ color: "#525252" }}>
                      ({p.landlord.reviews} reviews)
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => showSnackbar(`${p.landlord.name} — Verified Landlord`, "success")}
                  className="p-2 rounded-xl ripple-container"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                >
                  <ChevronRight className="w-5 h-5" style={{ color: "#a3a3a3" }} />
                </button>
              </div>
            </div>

            {/* Location */}
            <div className="mt-6" style={{ animation: "slideInUp 0.95s ease" }}>
              <h2 className="text-base font-bold text-white mb-3">Location</h2>
              <div className="relative rounded-2xl overflow-hidden" style={{ height: "180px" }}>
                <img
                  src=""
                  alt="Map"
                  className="w-full h-full object-cover opacity-50"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-white"
                    style={{
                      background: "#047857",
                      boxShadow: "0 4px 12px rgba(4,120,87,0.5)",
                    }}
                  >
                    <MapPin className="w-3 h-3 inline-block mr-1" />
                    {p.location.split(",")[0]}
                  </div>
                </div>
                <button
                  onClick={() =>
                    window.open(`https://www.google.com/maps/search/${encodeURIComponent(p.location)}`, "_blank")
                  }
                  className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg text-xs font-semibold ripple-container"
                  style={{
                    background: "#1A1D21",
                    color: "white",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
                  }}
                >
                  View Full Map
                </button>
              </div>
            </div>

            <div className="h-6" />
          </div>
        </div>

        {/* ====== STICKY BOTTOM ACTION BAR ====== */}
        <div className="detail-bottom-bar">
          <div className="flex items-center gap-3">
            <button
              onClick={() => openSheet("bs-phone")}
              className="w-12 h-12 rounded-xl flex items-center justify-center ripple-container flex-shrink-0"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <Phone className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={handleSendMessage}
              className="w-12 h-12 rounded-xl flex items-center justify-center ripple-container flex-shrink-0"
              style={{
                background: "rgba(4,120,87,0.15)",
                border: "1px solid rgba(4,120,87,0.3)",
              }}
            >
              <MessageCircle
                className="w-5 h-5"
                style={{ color: "#34d399" }}
              />
            </button>
            <button
              onClick={() => openSheet("bs-schedule")}
              className="flex-1 h-12 rounded-xl font-semibold text-sm text-white ripple-container flex items-center justify-center gap-2"
              style={{
                background: "#047857",
                boxShadow: "0 4px 16px rgba(4,120,87,0.3)",
              }}
            >
              <Calendar className="w-4 h-4" />
              Schedule Viewing
            </button>
          </div>
        </div>
      </div>

      {/* ================================================ */}
      {/* BOTTOM SHEET: SCHEDULE VIEWING */}
      {/* ================================================ */}
      <div
        className={`bottom-sheet-overlay ${isSheetOpen("bs-schedule") ? "active" : ""}`}
        onClick={closeSheet}
      />
      <div
        className={`bottom-sheet ${isSheetOpen("bs-schedule") ? "active" : ""}`}
      >
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-3">
          <h3 className="text-lg font-bold text-white">Schedule Viewing</h3>
          <p className="text-xs mt-1" style={{ color: "#a3a3a3" }}>
            Pick a convenient date and time to visit the property
          </p>
        </div>
        <div className="px-3 pb-8 space-y-4">
          <div>
            <label
              className="text-xs font-semibold uppercase tracking-wider block mb-2"
              style={{ color: "#525252" }}
            >
              Preferred Date
            </label>
            <input
              type="date"
              className="android-input"
              value={viewingDate}
              onChange={(e) => setViewingDate(e.target.value)}
            />
          </div>
          <div>
            <label
              className="text-xs font-semibold uppercase tracking-wider block mb-2"
              style={{ color: "#525252" }}
            >
              Preferred Time
            </label>
            <div className="grid grid-cols-3 gap-2">
              {timeSlots.map((slot) => (
                <button
                  key={slot}
                  className={`time-slot ${selectedTime === slot ? "active" : ""}`}
                  onClick={() => setSelectedTime(slot)}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label
              className="text-xs font-semibold uppercase tracking-wider block mb-2"
              style={{ color: "#525252" }}
            >
              Note to Landlord (Optional)
            </label>
            <textarea
              className="android-input"
              placeholder="e.g., I'm a young professional, available immediately..."
              style={{ resize: "none", minHeight: "100px" }}
            />
          </div>
          <button
            onClick={submitViewing}
            className="w-full py-3.5 rounded-xl font-semibold text-sm text-white ripple-container"
            style={{
              background: "#047857",
              boxShadow: "0 4px 16px rgba(4,120,87,0.3)",
            }}
          >
            {viewingLoading ? <div className="spinner" style={{width:18,height:18}} /> : "Confirm Viewing"}
          </button>
        </div>
      </div>

      {/* ================================================ */}
      {/* BOTTOM SHEET: PHONE ACTIONS */}
      {/* ================================================ */}
      <div
        className={`bottom-sheet-overlay ${isSheetOpen("bs-phone") ? "active" : ""}`}
        onClick={closeSheet}
      />
      <div
        className={`bottom-sheet ${isSheetOpen("bs-phone") ? "active" : ""}`}
      >
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-3">
          <h3 className="text-lg font-bold text-white">Contact {p.landlord.name}</h3>
          <p className="text-xs mt-1" style={{ color: "#a3a3a3" }}>
            {landlordPhone ? `📞 ${landlordPhone}` : "Phone number not available"}
          </p>
        </div>
        <div className="px-3 pb-8 space-y-3">
          <button
            onClick={handleCall}
            className="w-full flex items-center gap-4 p-4 rounded-2xl ripple-container"
            style={{
              background: "rgba(4,120,87,0.1)",
              border: "1px solid rgba(4,120,87,0.2)",
            }}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: "rgba(4,120,87,0.2)" }}
            >
              <Phone className="w-6 h-6" style={{ color: "#34d399" }} />
            </div>
            <div className="text-left flex-1">
              <p className="text-sm font-bold text-white">Call</p>
              <p className="text-xs" style={{ color: "#a3a3a3" }}>
                {landlordPhone || "No number available"}
              </p>
            </div>
          </button>
          <button
            onClick={handleWhatsApp}
            className="w-full flex items-center gap-4 p-4 rounded-2xl ripple-container"
            style={{
              background: "rgba(37,211,102,0.1)",
              border: "1px solid rgba(37,211,102,0.2)",
            }}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: "rgba(37,211,102,0.2)" }}
            >
              <MessageCircle className="w-6 h-6" style={{ color: "#25D366" }} />
            </div>
            <div className="text-left flex-1">
              <p className="text-sm font-bold text-white">WhatsApp</p>
              <p className="text-xs" style={{ color: "#a3a3a3" }}>
                Send a message on WhatsApp
              </p>
            </div>
          </button>
        </div>
        <div className="px-3 pb-8">
          <button
            onClick={closeSheet}
            className="w-full py-3.5 rounded-xl font-semibold text-sm ripple-container"
            style={{ background: "rgba(255,255,255,0.05)", color: "#a3a3a3" }}
          >
            Cancel
          </button>
        </div>
      </div>

      {/* ================================================ */}
      {/* BOTTOM SHEET: SHARE */}
      {/* ================================================ */}
      <div
        className={`bottom-sheet-overlay ${isSheetOpen("bs-share") ? "active" : ""}`}
        onClick={closeSheet}
      />
      <div
        className={`bottom-sheet ${isSheetOpen("bs-share") ? "active" : ""}`}
      >
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-3">
          <h3 className="text-lg font-bold text-white">Share Listing</h3>
        </div>
        <div className="px-3 pb-8">
          <div className="grid grid-cols-4 gap-4 mb-6">
            {shareOptions.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.label}
                  onClick={() => shareAction(opt.label)}
                  className="flex flex-col items-center gap-2 ripple-container p-2 rounded-xl"
                >
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center"
                    style={{ background: opt.bg }}
                  >
                    <Icon className="w-6 h-6" style={{ color: opt.color }} />
                  </div>
                  <span className="text-xs" style={{ color: "#a3a3a3" }}>
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>
          <div
            className="flex items-center gap-3 p-3 rounded-xl"
            style={{ background: "rgba(255,255,255,0.05)" }}
          >
            <Link2 className="w-5 h-5" style={{ color: "#a3a3a3" }} />
            <span className="text-sm text-white flex-1 truncate">
              rentke.co.ke/listing/modern-bedsitter-kilimani
            </span>
            <button
              onClick={copyLink}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: "#047857", color: "white" }}
            >
              Copy
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

"use client";

import { Camera } from "lucide-react";

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  showUpload?: boolean;
  onUpload?: () => void;
}

/**
 * Reusable avatar component.
 * Shows the user's photo if `src` is provided, otherwise renders
 * the first letter of `name` on a green gradient background.
 */
export default function Avatar({
  src,
  name,
  size = 40,
  className = "",
  style,
  onClick,
  showUpload = false,
  onUpload,
}: AvatarProps) {
  const initial = (name || "U").charAt(0).toUpperCase();
  const sizeStyle = { width: size, height: size, minWidth: size, minHeight: size };
  const fontSize = Math.max(size * 0.42, 10);

  return (
    <div
      className={`relative flex-shrink-0 ${className}`}
      style={{ ...sizeStyle, ...style }}
    >
      {src ? (
        <img
          src={src}
          alt={name || "User"}
          className="w-full h-full rounded-full object-cover"
          onError={(e) => {
            // Hide image on error, show initial instead
            (e.target as HTMLImageElement).style.display = "none";
            const parent = (e.target as HTMLImageElement).parentElement;
            if (parent) {
              const fallback = document.createElement("div");
              fallback.className =
                "w-full h-full rounded-full flex items-center justify-center font-bold text-white";
              fallback.style.background =
                "linear-gradient(135deg, #047857, #059669)";
              fallback.style.fontSize = `${fontSize}px`;
              fallback.textContent = initial;
              parent.appendChild(fallback);
            }
          }}
          onClick={onClick}
          style={{ cursor: onClick ? "pointer" : undefined }}
        />
      ) : (
        <div
          className="w-full h-full rounded-full flex items-center justify-center font-bold text-white"
          style={{
            background: "linear-gradient(135deg, #047857, #059669)",
            fontSize: `${fontSize}px`,
            cursor: onClick ? "pointer" : undefined,
          }}
          onClick={onClick}
        >
          {initial}
        </div>
      )}
      {showUpload && (
        <button
          onClick={onUpload}
          className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
          style={{ background: "#1A1D21", border: "2px solid #050505" }}
          type="button"
        >
          <Camera className="w-3 h-3" style={{ color: "#047857" }} />
        </button>
      )}
    </div>
  );
}

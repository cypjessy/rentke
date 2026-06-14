"use client";

import { useState } from "react";
import {
  Camera,
  Image,
  X as XIcon,
  Plus,
} from "lucide-react";
import {
  UNIT_TYPE_OPTIONS,
  UNIT_AMENITIES,
  UNIT_STATUS_OPTIONS,
  BATHROOM_OPTIONS,
  FLOOR_OPTIONS,
} from "../constants";
import { takePhoto, openFilePicker, uploadPhoto } from "@/lib/upload";

export interface AddUnitFormData {
  name: string;
  type: string;
  status: "Vacant" | "Occupied" | "Maintenance";
  rent: number;
  deposit: number;
  serviceCharge: number;
  bathrooms: number;
  floor: string;
  area: number;
  description: string;
  amenities: string[];
  images: string[];
}

interface AddUnitSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AddUnitFormData) => Promise<void>;
  loading: boolean;
  showSnackbar: (msg: string, type?: "success" | "error" | "info") => void;
  userId: string;
}

export default function AddUnitSheet({
  isOpen,
  onClose,
  onSubmit,
  loading,
  showSnackbar,
  userId,
}: AddUnitSheetProps) {
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("Bedsitter");
  const [formStatus, setFormStatus] = useState<"Vacant" | "Occupied" | "Maintenance">("Vacant");
  const [formRent, setFormRent] = useState("");
  const [formDeposit, setFormDeposit] = useState("");
  const [formServiceCharge, setFormServiceCharge] = useState("");
  const [formBathrooms, setFormBathrooms] = useState("1");
  const [formFloor, setFormFloor] = useState("Ground");
  const [formArea, setFormArea] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formAmenities, setFormAmenities] = useState<string[]>([]);
  const [formImages, setFormImages] = useState<string[]>([]);

  const resetForm = () => {
    setFormName("");
    setFormType("Bedsitter");
    setFormStatus("Vacant");
    setFormRent("");
    setFormDeposit("");
    setFormServiceCharge("");
    setFormBathrooms("1");
    setFormFloor("Ground");
    setFormArea("");
    setFormDescription("");
    setFormAmenities([]);
    setFormImages([]);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const toggleAmenity = (amenity: string) => {
    setFormAmenities((prev) =>
      prev.includes(amenity)
        ? prev.filter((a) => a !== amenity)
        : [...prev, amenity]
    );
  };

  const removeImage = (idx: number) => {
    setFormImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleCameraClick = async () => {
    const file = await takePhoto("camera");
    if (file) {
      try {
        const result = await uploadPhoto(file, "units", userId);
        if (result?.url) {
          setFormImages((prev) => [...prev, result.url]);
          showSnackbar("Photo taken ✅", "success");
        }
      } catch {
        showSnackbar("Failed to upload photo", "error");
      }
    } else {
      showSnackbar("No photo taken", "info");
    }
  };

  const handleGalleryClick = async () => {
    try {
      const files = await openFilePicker("image/*", false);
      if (files[0]) {
        const result = await uploadPhoto(files[0], "units", userId);
        if (result?.url) {
          setFormImages((prev) => [...prev, result.url]);
          showSnackbar("Photo added", "success");
        }
      }
    } catch {
      showSnackbar("Failed to upload photo", "error");
    }
  };

  const handleSubmit = async () => {
    await onSubmit({
      name: formName,
      type: formType,
      status: formStatus,
      rent: parseInt(formRent.replace(/,/g, "")) || 0,
      deposit: parseInt(formDeposit.replace(/,/g, "")) || 0,
      serviceCharge: parseInt(formServiceCharge.replace(/,/g, "")) || 0,
      bathrooms: (BATHROOM_OPTIONS as readonly string[]).indexOf(formBathrooms) + 1 || 1,
      floor: formFloor,
      area: parseInt(formArea) || 0,
      description: formDescription,
      amenities: formAmenities,
      images: formImages,
    });
    resetForm();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className={`sheet-overlay active`} onClick={handleClose} />
      <div className={`bottom-sheet active`} style={{ maxHeight: "95dvh" }}>
        <div className="sheet-handle" />
        <div className="px-3 py-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-white">Add Unit</h3>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              <XIcon className="w-4 h-4" style={{ color: "#a3a3a3" }} />
            </button>
          </div>
          <div className="space-y-4">
            <div className="input-group">
              <input
                type="text"
                className="android-input"
                placeholder=" "
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
              <label>Unit Number / Name</label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium block mb-2" style={{ color: "#a3a3a3" }}>
                  Unit Type
                </label>
                <select
                  className="android-select"
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                >
                  {UNIT_TYPE_OPTIONS.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium block mb-2" style={{ color: "#a3a3a3" }}>
                  Status
                </label>
                <select
                  className="android-select"
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as any)}
                >
                  {UNIT_STATUS_OPTIONS.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium block mb-2" style={{ color: "#a3a3a3" }}>
                  Bathrooms
                </label>
                <select
                  className="android-select"
                  value={formBathrooms}
                  onChange={(e) => setFormBathrooms(e.target.value)}
                >
                  {BATHROOM_OPTIONS.map((b) => (
                    <option key={b}>{b}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium block mb-2" style={{ color: "#a3a3a3" }}>
                  Floor
                </label>
                <select
                  className="android-select"
                  value={formFloor}
                  onChange={(e) => setFormFloor(e.target.value)}
                >
                  {FLOOR_OPTIONS.map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="input-group">
              <input
                type="text"
                className="android-input"
                placeholder=" "
                value={formArea}
                onChange={(e) => setFormArea(e.target.value)}
              />
              <label>Area (sqm)</label>
            </div>
            <div className="input-group">
              <input
                type="text"
                className="android-input ksh-prefix"
                placeholder=" "
                value={formRent}
                onChange={(e) => setFormRent(e.target.value)}
              />
              <label style={{ left: "60px" }}>Monthly Rent</label>
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: "#a3a3a3" }}>
                KSh
              </span>
            </div>
            <div className="input-group">
              <input
                type="text"
                className="android-input ksh-prefix"
                placeholder=" "
                value={formDeposit}
                onChange={(e) => setFormDeposit(e.target.value)}
              />
              <label style={{ left: "60px" }}>Deposit</label>
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: "#a3a3a3" }}>
                KSh
              </span>
            </div>
            <div className="input-group">
              <input
                type="text"
                className="android-input ksh-prefix"
                placeholder=" "
                value={formServiceCharge}
                onChange={(e) => setFormServiceCharge(e.target.value)}
              />
              <label style={{ left: "60px" }}>Service Charge (Monthly)</label>
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: "#a3a3a3" }}>
                KSh
              </span>
            </div>
            <div>
              <label className="text-xs font-medium block mb-2" style={{ color: "#a3a3a3" }}>
                Description
              </label>
              <textarea
                className="android-input"
                style={{ minHeight: "80px", borderRadius: "14px" }}
                placeholder="Describe the unit - finishes, floor, views, nearby amenities..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </div>

            {/* Photos Section with Camera & Gallery options */}
            <div>
              <label className="text-xs font-medium block mb-2" style={{ color: "#a3a3a3" }}>
                Photos
              </label>
              <div className="flex gap-3 flex-wrap">
                {formImages.map((imgUrl, idx) => (
                  <div
                    key={idx}
                    className="w-20 h-20 rounded-xl overflow-hidden relative"
                  >
                    <img
                      src={imgUrl}
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => removeImage(idx)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: "rgba(0,0,0,0.6)" }}
                    >
                      <XIcon className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <div
                    className="w-16 h-16 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer"
                    style={{ borderColor: "rgba(255,255,255,0.1)" }}
                    onClick={handleCameraClick}
                  >
                    <Camera className="w-4 h-4" style={{ color: "#525252" }} />
                    <span className="text-[10px] mt-0.5" style={{ color: "#525252" }}>
                      Camera
                    </span>
                  </div>
                  <div
                    className="w-16 h-16 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer"
                    style={{ borderColor: "rgba(255,255,255,0.1)" }}
                    onClick={handleGalleryClick}
                  >
                    <Image className="w-4 h-4" style={{ color: "#525252" }} />
                    <span className="text-[10px] mt-0.5" style={{ color: "#525252" }}>
                      Gallery
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium block mb-2" style={{ color: "#a3a3a3" }}>
                Unit Amenities
              </label>
              <div className="flex flex-wrap gap-2">
                {UNIT_AMENITIES.map((a) => {
                  const selected = formAmenities.includes(a);
                  return (
                    <span
                      key={a}
                      className="chip cursor-pointer"
                      style={{
                        background: selected
                          ? "rgba(4,120,87,0.15)"
                          : "rgba(255,255,255,0.05)",
                        color: selected ? "#047857" : "#a3a3a3",
                        border: selected
                          ? "1px solid rgba(4,120,87,0.3)"
                          : "1px solid transparent",
                      }}
                      onClick={() => toggleAmenity(a)}
                    >
                      {a}
                    </span>
                  );
                })}
              </div>
            </div>
            <button
              onClick={handleSubmit}
              className="btn-primary ripple-container mt-2"
              disabled={loading}
            >
              {loading ? (
                <div className="spinner mx-auto" />
              ) : (
                <span>Add Unit</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

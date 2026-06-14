"use client";

import { useState } from "react";
import {
  Camera,
  Image,
  X as XIcon,
  Plus,
  Check,
} from "lucide-react";
import {
  PROPERTY_TYPE_OPTIONS,
  PROPERTY_AMENITIES,
  COUNTY_OPTIONS,
} from "../constants";
import { takePhoto, openFilePicker, uploadPhoto } from "@/lib/upload";

export interface AddPropertyFormData {
  name: string;
  location: string;
  county: string;
  type: string;
  units: string;
  rentMin: string;
  rentMax: string;
  description: string;
  amenities: string[];
  images: string[];
}

interface AddPropertySheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AddPropertyFormData) => Promise<void>;
  loading: boolean;
  showSnackbar: (msg: string, type?: "success" | "error" | "info") => void;
  userId: string;
}

export default function AddPropertySheet({
  isOpen,
  onClose,
  onSubmit,
  loading,
  showSnackbar,
  userId,
}: AddPropertySheetProps) {
  const [formName, setFormName] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formCounty, setFormCounty] = useState("Nairobi");
  const [formType, setFormType] = useState("Apartment");
  const [formUnits, setFormUnits] = useState("");
  const [formRentMin, setFormRentMin] = useState("");
  const [formRentMax, setFormRentMax] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formAmenities, setFormAmenities] = useState<string[]>([]);
  const [formImages, setFormImages] = useState<string[]>([]);

  const resetForm = () => {
    setFormName("");
    setFormLocation("");
    setFormCounty("Nairobi");
    setFormType("Apartment");
    setFormUnits("");
    setFormRentMin("");
    setFormRentMax("");
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

  const handleSubmit = async () => {
    await onSubmit({
      name: formName,
      location: formLocation,
      county: formCounty,
      type: formType,
      units: formUnits,
      rentMin: formRentMin,
      rentMax: formRentMax,
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
            <h3 className="text-lg font-bold text-white">Add Property</h3>
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
              <label>Property Name</label>
            </div>
            <div className="input-group">
              <input
                type="text"
                className="android-input"
                placeholder=" "
                value={formLocation}
                onChange={(e) => setFormLocation(e.target.value)}
              />
              <label>Location / Estate</label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  className="text-xs font-medium block mb-2"
                  style={{ color: "#a3a3a3" }}
                >
                  County
                </label>
                <select
                  className="android-select"
                  value={formCounty}
                  onChange={(e) => setFormCounty(e.target.value)}
                >
                  {COUNTY_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  className="text-xs font-medium block mb-2"
                  style={{ color: "#a3a3a3" }}
                >
                  Type
                </label>
                <select
                  className="android-select"
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                >
                  {PROPERTY_TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="input-group">
              <input
                type="text"
                className="android-input"
                placeholder=" "
                value={formUnits}
                onChange={(e) => setFormUnits(e.target.value)}
              />
              <label>Number of Units</label>
            </div>
            <div>
              <label
                className="text-xs font-medium block mb-2"
                style={{ color: "#a3a3a3" }}
              >
                Rent Range (KSh)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div className="input-group">
                  <input
                    type="text"
                    className="android-input"
                    placeholder=" "
                    value={formRentMin}
                    onChange={(e) => setFormRentMin(e.target.value)}
                    style={{ paddingLeft: "44px" }}
                  />
                  <label style={{ left: "44px" }}>Min</label>
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs">
                    KSh
                  </span>
                </div>
                <div className="input-group">
                  <input
                    type="text"
                    className="android-input"
                    placeholder=" "
                    value={formRentMax}
                    onChange={(e) => setFormRentMax(e.target.value)}
                    style={{ paddingLeft: "44px" }}
                  />
                  <label style={{ left: "44px" }}>Max</label>
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs">
                    KSh
                  </span>
                </div>
              </div>
            </div>
            <div>
              <label
                className="text-xs font-medium block mb-2"
                style={{ color: "#a3a3a3" }}
              >
                Description
              </label>
              <textarea
                className="android-input"
                style={{ minHeight: "80px", borderRadius: "14px" }}
                placeholder="Describe your property, location highlights, nearby amenities..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </div>
            <div>
              <label
                className="text-xs font-medium block mb-2"
                style={{ color: "#a3a3a3" }}
              >
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
                      onClick={() =>
                        setFormImages((prev) =>
                          prev.filter((_, i) => i !== idx)
                        )
                      }
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
                    onClick={async () => {
                      const file = await takePhoto("camera");
                      if (file) {
                        try {
                          const result = await uploadPhoto(
                            file,
                            "properties",
                            userId
                          );
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
                    }}
                  >
                    <Camera
                      className="w-4 h-4"
                      style={{ color: "#525252" }}
                    />
                    <span
                      className="text-[10px] mt-0.5"
                      style={{ color: "#525252" }}
                    >
                      Camera
                    </span>
                  </div>
                  <div
                    className="w-16 h-16 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer"
                    style={{ borderColor: "rgba(255,255,255,0.1)" }}
                    onClick={async () => {
                      try {
                        const files = await openFilePicker(
                          "image/*",
                          false
                        );
                        if (files[0]) {
                          const result = await uploadPhoto(
                            files[0],
                            "properties",
                            userId
                          );
                          if (result?.url) {
                            setFormImages((prev) => [
                              ...prev,
                              result.url,
                            ]);
                            showSnackbar("Photo added", "success");
                          }
                        }
                      } catch {
                        showSnackbar("Failed to upload photo", "error");
                      }
                    }}
                  >
                    <Image
                      className="w-4 h-4"
                      style={{ color: "#525252" }}
                    />
                    <span
                      className="text-[10px] mt-0.5"
                      style={{ color: "#525252" }}
                    >
                      Gallery
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <label
                className="text-xs font-medium block mb-2"
                style={{ color: "#a3a3a3" }}
              >
                Amenities
              </label>
              <div className="flex flex-wrap gap-2">
                {PROPERTY_AMENITIES.map((a) => {
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
            <div
              className="flex items-center justify-between p-3 rounded-xl"
              style={{ background: "rgba(255,255,255,0.03)" }}
            >
              <div>
                <p className="text-sm font-medium text-white">
                  Visible on listings
                </p>
                <p className="text-xs" style={{ color: "#a3a3a3" }}>
                  Property is publicly visible
                </p>
              </div>
              <div
                className="toggle-track active"
                onClick={(e) =>
                  e.currentTarget.classList.toggle("active")
                }
              >
                <div className="toggle-thumb" />
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
                <span>Add Property</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

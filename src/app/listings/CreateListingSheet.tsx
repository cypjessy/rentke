"use client";

import { useState, useEffect } from "react";
import { X as XIcon } from "lucide-react";
import type { UnitData } from "../../lib/units";

export interface CreateListingFormData {
  propertyId: string;
  propertyName: string;
  unitId: string;
  unitName: string;
  title: string;
  description: string;
  rent: number;
  amenities: string[];
  status: "active" | "draft";
}

interface PropertyOption {
  id: string;
  name: string;
}

interface CreateListingSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateListingFormData) => Promise<void>;
  loading: boolean;
  showSnackbar: (msg: string, type?: "success" | "error" | "info") => void;
  vacantUnits: UnitData[];
  properties: PropertyOption[];
  initialData?: {
    propertyId?: string;
    propertyName?: string;
    unitId?: string;
    unitName?: string;
    title?: string;
    description?: string;
    rent?: string;
    amenities?: string[];
  };
}

export default function CreateListingSheet({
  isOpen,
  onClose,
  onSubmit,
  loading,
  showSnackbar,
  vacantUnits,
  properties,
  initialData,
}: CreateListingSheetProps) {
  const [formPropertyId, setFormPropertyId] = useState("");
  const [formPropertyName, setFormPropertyName] = useState("");
  const [formUnitId, setFormUnitId] = useState("");
  const [formUnitName, setFormUnitName] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formRent, setFormRent] = useState("");
  const [formAmenities, setFormAmenities] = useState<string[]>([]);

  // Filter vacant units by selected property
  const filteredUnits = formPropertyId
    ? vacantUnits.filter((u) => u.propertyId === formPropertyId)
    : vacantUnits;

  // Reset form when opening
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormPropertyId(initialData.propertyId || "");
        setFormPropertyName(initialData.propertyName || "");
        setFormUnitId(initialData.unitId || "");
        setFormUnitName(initialData.unitName || "");
        setFormTitle(initialData.title || "");
        setFormDescription(initialData.description || "");
        setFormRent(initialData.rent || "");
        setFormAmenities(initialData.amenities || []);
      } else {
        resetForm();
      }
    }
  }, [isOpen, initialData]);

  const resetForm = () => {
    setFormPropertyId("");
    setFormPropertyName("");
    setFormUnitId("");
    setFormUnitName("");
    setFormTitle("");
    setFormDescription("");
    setFormRent("");
    setFormAmenities([]);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handlePropertyChange = (propId: string) => {
    setFormPropertyId(propId);
    const prop = properties.find((p) => p.id === propId);
    setFormPropertyName(prop?.name || "");
    // Reset unit selection when property changes
    setFormUnitId("");
    setFormUnitName("");
  };

  const handleUnitChange = (unitId: string) => {
    const unit = vacantUnits.find((u) => u.id === unitId);
    if (unit) {
      setFormUnitId(unit.id);
      setFormUnitName(unit.name);
      setFormPropertyId(unit.propertyId);
      setFormPropertyName(unit.propertyName);
      // Auto-fill title and rent from unit
      if (!formTitle || formTitle === `${unit.type} — ${unit.name}`.slice(0, 50)) {
        setFormTitle(`${unit.type} — ${unit.name}`);
      }
      if (!formRent || formRent === unit.rent.toString()) {
        setFormRent(unit.rent.toString());
      }
    }
  };

  const handlePublish = async () => {
    if (!formPropertyId) {
      showSnackbar("Please select a property", "error");
      return;
    }
    if (!formUnitId) {
      showSnackbar("Please select a unit", "error");
      return;
    }
    if (!formTitle.trim()) {
      showSnackbar("Please enter a listing title", "error");
      return;
    }
    await onSubmit({
      propertyId: formPropertyId,
      propertyName: formPropertyName,
      unitId: formUnitId,
      unitName: formUnitName,
      title: formTitle,
      description: formDescription,
      rent: parseInt(formRent.replace(/,/g, "")) || 0,
      amenities: formAmenities,
      status: "active",
    });
    resetForm();
  };

  const handleSaveDraft = async () => {
    await onSubmit({
      propertyId: formPropertyId,
      propertyName: formPropertyName,
      unitId: formUnitId,
      unitName: formUnitName,
      title: formTitle,
      description: formDescription,
      rent: parseInt(formRent.replace(/,/g, "")) || 0,
      amenities: formAmenities,
      status: "draft",
    });
    resetForm();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className={`sheet-overlay active`} onClick={handleClose} />
      <div className={`bottom-sheet active`} style={{ maxHeight: "95dvh" }}>
        <div className="sheet-handle" />
        <div className="p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-white">Create Listing</h3>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              <XIcon className="w-4 h-4" style={{ color: "#a3a3a3" }} />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium block mb-2" style={{ color: "#a3a3a3" }}>
                Property
              </label>
              <select
                className="android-select"
                value={formPropertyId}
                onChange={(e) => handlePropertyChange(e.target.value)}
              >
                <option value="">Select Property</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium block mb-2" style={{ color: "#a3a3a3" }}>
                Unit
              </label>
              <select
                className="android-select"
                value={formUnitId}
                onChange={(e) => handleUnitChange(e.target.value)}
              >
                <option value="">Select a vacant unit</option>
                {filteredUnits.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} — {u.type} (KSh {u.rent.toLocaleString()}/mo)
                  </option>
                ))}
              </select>
              {filteredUnits.length === 0 && formPropertyId && (
                <p className="text-xs mt-1" style={{ color: "#eab308" }}>
                  No vacant units for this property
                </p>
              )}
            </div>
            <div className="input-group">
              <input
                type="text"
                className="android-input"
                placeholder=" "
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
              <label>Listing Title</label>
            </div>
            <div>
              <label className="text-xs font-medium block mb-2" style={{ color: "#a3a3a3" }}>
                Description
              </label>
              <textarea
                className="android-input"
                style={{ minHeight: "80px", borderRadius: "14px" }}
                placeholder="Describe what makes this unit great..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </div>
            <div className="input-group">
              <input
                type="text"
                className="android-input"
                placeholder=" "
                style={{ paddingLeft: "60px" }}
                value={formRent}
                onChange={(e) => setFormRent(e.target.value)}
              />
              <label style={{ left: "60px" }}>Monthly Rent</label>
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: "#a3a3a3" }}>
                KSh
              </span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSaveDraft}
                className="btn-secondary flex-1"
                style={{ padding: "14px" }}
                disabled={loading}
              >
                {loading ? <div className="spinner mx-auto" /> : <span>Save Draft</span>}
              </button>
              <button
                onClick={handlePublish}
                className="btn-primary flex-1 ripple-container"
                style={{ padding: "14px" }}
                disabled={loading}
              >
                {loading ? <div className="spinner mx-auto" /> : <span>Publish</span>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

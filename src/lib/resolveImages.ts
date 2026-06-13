import type { ListingData } from "./listings";
import type { PropertyData } from "./properties";

/**
 * Get the primary image for a listing, falling back to the parent property's images.
 * Use this on the landlord side where properties are already loaded in memory.
 */
export function getListingImage(
  listing: ListingData,
  properties: PropertyData[]
): string {
  if (listing.images?.[0]) return listing.images[0];
  const parent = properties.find((p) => p.id === listing.propertyId);
  return parent?.images?.[0] || "";
}

/**
 * Get all images for a listing, falling back to the parent property's images.
 */
export function getListingImages(
  listing: ListingData,
  properties: PropertyData[]
): string[] {
  if (listing.images?.length) return listing.images;
  const parent = properties.find((p) => p.id === listing.propertyId);
  return parent?.images || [];
}

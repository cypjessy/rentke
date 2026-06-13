/**
 * Migration script for backfilling listing images.
 *
 * This script has been replaced by a Next.js API route at:
 *   src/app/api/migrate/backfill-listing-images/route.ts
 *
 * To run the migration:
 *   1. Start the dev server: npm run dev
 *   2. Call the API route: curl -X POST http://localhost:3000/api/migrate/backfill-listing-images
 *
 * The API route uses the existing Firebase Web SDK (no firebase-admin needed)
 * and processes listings in batches to avoid memory issues.
 */
export {};

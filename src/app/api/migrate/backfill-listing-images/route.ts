import { NextResponse } from "next/server";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  writeBatch,
  query,
  limit,
  startAfter,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * POST /api/migrate/backfill-listing-images
 *
 * One-time migration: backfill listing.images from parent property.images
 * for all listings that have an empty images array.
 *
 * Dev-only. Only works when NEXT_PUBLIC_APP_ENV=development or called
 * with a ?token= query param matching MIGRATION_TOKEN env var.
 *
 * Call: curl -X POST http://localhost:3000/api/migrate/backfill-listing-images
 */
export async function POST(request: Request) {
  // Guard — only allow in development or with a secret token
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const isDev = process.env.NEXT_PUBLIC_APP_ENV === "development" || process.env.NODE_ENV === "development";
  const expectedToken = process.env.MIGRATION_TOKEN;
  if (!isDev && (!expectedToken || token !== expectedToken)) {
    return NextResponse.json(
      { success: false, error: "Migration only allowed in development mode or with a valid token" },
      { status: 403 }
    );
  }

  try {
    const results = { total: 0, backfilled: 0, skipped: 0, errors: 0 };

    // Fetch all listings (paginated to avoid memory issues)
    let lastDoc: any = null;
    const BATCH_SIZE = 300;
    let done = false;

    while (!done) {
      let q = query(collection(db, "listings"), limit(BATCH_SIZE));
      if (lastDoc) {
        q = query(collection(db, "listings"), startAfter(lastDoc), limit(BATCH_SIZE));
      }

      const snap = await getDocs(q);
      if (snap.empty) {
        done = true;
        break;
      }

      lastDoc = snap.docs[snap.docs.length - 1];
      results.total += snap.docs.length;

      // Collect listings that need backfilling
      const toBackfill: Array<{ ref: any; propertyId: string }> = [];

      for (const d of snap.docs) {
        const data = d.data();
        const images: string[] = data.images || [];
        if (images.length > 0) continue; // already has images

        const propertyId: string = data.propertyId || "";
        if (!propertyId) {
          results.skipped++;
          continue;
        }
        toBackfill.push({ ref: d.ref, propertyId });
      }

      if (toBackfill.length === 0) {
        results.skipped += snap.docs.length;
        continue;
      }

      // Fetch all parent properties in parallel
      const propResults = await Promise.allSettled(
        toBackfill.map((item) =>
          getDoc(doc(db, "properties", item.propertyId)).then((propSnap) => ({
            ref: item.ref,
            propertyId: item.propertyId,
            propSnap,
          }))
        )
      );

      // Process in sub-batches of 500 (Firestore batch limit)
      const writes: Array<{ ref: any; images: string[] }> = [];

      for (const result of propResults) {
        if (result.status === "rejected") {
          results.errors++;
          continue;
        }

        const { ref, propertyId, propSnap } = result.value;

        if (!propSnap.exists()) {
          results.skipped++;
          continue;
        }

        const propData = propSnap.data();
        const propImages: string[] = propData?.images || [];

        if (propImages.length === 0) {
          results.skipped++;
          continue;
        }

        writes.push({ ref, images: propImages });
      }

      // Commit writes in batches of 500
      for (let i = 0; i < writes.length; i += 500) {
        const batch = writeBatch(db);
        const slice = writes.slice(i, i + 500);
        for (const w of slice) {
          batch.update(w.ref, { images: w.images });
        }
        await batch.commit();
      }

      results.backfilled += writes.length;
    }

    return NextResponse.json({
      success: true,
      message: `Migration complete. Backfilled ${results.backfilled} listings.`,
      stats: results,
    });
  } catch (error: any) {
    console.error("Migration failed:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

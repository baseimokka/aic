import { prisma } from "@/lib/db/client";

/**
 * Route price resolution — the single place the fallback rule lives (mirrors
 * the locale-fallback helper pattern in /lib/db): an exact
 * (from, to, vehicle) row wins; otherwise the route's any-vehicle row
 * (`vehicleId = null`); otherwise the route has no configured price
 * ("price on request" on the public form, `quotedPrice = null` on the record).
 */
export interface ResolvedTransferPrice {
  price: number;
  currency: string;
}

export async function resolveTransferPrice(
  fromLocationId: string,
  toLocationId: string,
  vehicleId: string,
): Promise<ResolvedTransferPrice | null> {
  const routes = await prisma.transferRoute.findMany({
    where: {
      fromLocationId,
      toLocationId,
      archivedAt: null,
      OR: [{ vehicleId }, { vehicleId: null }],
    },
    select: { vehicleId: true, price: true, currency: true },
  });
  const hit = routes.find((r) => r.vehicleId === vehicleId) ?? routes.find((r) => r.vehicleId === null);
  return hit ? { price: Number(hit.price), currency: hit.currency } : null;
}

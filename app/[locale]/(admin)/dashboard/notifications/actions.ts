"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { requireActor } from "@/lib/auth/require";

/**
 * Notification reads are personal state, not administrative mutations —
 * deliberately NOT audited (§13 bounded scope).
 */
export async function markAllNotificationsRead(): Promise<void> {
  const actor = await requireActor();
  await prisma.notification.updateMany({
    where: { userId: actor.id, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/en/dashboard", "layout");
}

/** Mark one notification read, then follow its link. */
export async function openNotification(id: string): Promise<void> {
  const actor = await requireActor();
  const notification = await prisma.notification.findFirst({
    where: { id, userId: actor.id }, // scoped to the owner — ids are not trusted
    select: { linkUrl: true, readAt: true },
  });
  if (!notification) redirect("/en/dashboard/notifications");
  if (!notification.readAt) {
    await prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
    revalidatePath("/en/dashboard", "layout");
  }
  redirect(notification.linkUrl ?? "/en/dashboard/notifications");
}

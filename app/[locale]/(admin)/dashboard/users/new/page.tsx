import Link from "next/link";
import { requireActor } from "@/lib/auth/require";
import { can } from "@/lib/rbac/matrix";
import { NoAccess } from "@/components/admin/no-access";
import { IconBack } from "@/components/admin/icons";
import { UserForm } from "@/components/admin/user-form";

export default async function NewUserPage() {
  const actor = await requireActor();
  if (!can(actor.role, "users", "create")) return <NoAccess />;

  return (
    <div>
      <Link href="/en/dashboard/users" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <IconBack width={16} height={16} /> Users
      </Link>
      <h2 className="mb-5 font-serif text-2xl font-semibold text-ink">New user</h2>
      <UserForm initial={{ name: "", email: "", role: "SALES_ADMIN", password: "" }} />
    </div>
  );
}

import {notFound, redirect} from "next/navigation";
import AdminApp from "@/features/admin/components/admin-app";
import {adminSectionFromPath} from "@/features/admin/routes";
import {currentAdmin, canAccess} from "@/lib/auth";
import {adminSnapshot} from "@/features/admin/server";

export default async function AdminSectionPage({params}: {params: Promise<{section: string}>}) {
  const {section: slug} = await params;
  const section = adminSectionFromPath(`/admin/${slug}`);
  if (!section) notFound();
  const user = await currentAdmin();
  if (!user) redirect("/login");
  if (section !== "overview" && !canAccess(user.role, section)) notFound();
  return <AdminApp initial={await adminSnapshot(user)}/>;
}

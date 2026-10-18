import AuthForm from "@/features/auth/components/auth-form";
import {currentAdmin} from "@/lib/auth";
import {redirect} from "next/navigation";
import "@/app/admin/admin.css";
export const metadata = {title: "Admin sign in | Falak Rides", robots: {index: false, follow: false}};
export default async function Page({searchParams}: {searchParams: Promise<{password?: string | string[]}>}) {
  if (await currentAdmin()) redirect("/admin");
  const {password} = await searchParams;
  return <div className="admin-app adm-auth-app"><AuthForm passwordChanged={password === "changed"}/></div>;
}

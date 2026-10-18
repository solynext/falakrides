import PasswordResetForm from "@/features/auth/components/password-reset-form";
import "@/app/admin/admin.css";
export const metadata = {title: "Reset admin password | Falak Rides", robots: {index: false, follow: false}};
export default async function Page({searchParams}: {searchParams: Promise<{email?: string | string[]}>}) {
  const {email} = await searchParams;
  return <div className="admin-app adm-auth-app"><PasswordResetForm initialEmail={typeof email === "string" ? email.slice(0, 254) : ""}/></div>;
}

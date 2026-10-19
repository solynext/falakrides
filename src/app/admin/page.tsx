import AdminApp from "@/features/admin/components/admin-app";
import {currentAdmin} from "@/lib/auth";
import {redirect} from "next/navigation";
import {adminSnapshot} from "@/features/admin/server";
export default async function AdminPage() {const user=await currentAdmin();if(!user)redirect("/login");const initial = await adminSnapshot(user); return <AdminApp initial={initial}/>;}

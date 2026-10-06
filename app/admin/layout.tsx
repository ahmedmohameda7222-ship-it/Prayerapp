import { AdminAuthProvider } from "@/lib/auth/use-admin-auth";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminAuthProvider>{children}</AdminAuthProvider>;
}

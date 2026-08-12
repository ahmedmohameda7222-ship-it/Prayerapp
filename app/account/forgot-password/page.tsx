import { AppShell } from "@/components/layout/AppShell";
import { AuthForm } from "@/components/account/AuthForm";

export default function ForgotPasswordPage() {
  return <AppShell><div className="py-6"><AuthForm mode="forgot" /></div></AppShell>;
}

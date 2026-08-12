import { AppShell } from "@/components/layout/AppShell";
import { AuthForm } from "@/components/account/AuthForm";

export default function SignInPage() {
  return <AppShell><div className="py-6"><AuthForm mode="sign-in" /></div></AppShell>;
}

import { WarningCard } from "@/components/ui/WarningCard";

export function AdminWarningCard({ message }: { message: string }) {
  return <WarningCard message={message} />;
}

import { AuthGate } from "@/components/auth/auth-gate";
import { DemoReviewProvider } from "@/components/validation/demo-review-provider";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGate>
      <DemoReviewProvider>{children}</DemoReviewProvider>
    </AuthGate>
  );
}

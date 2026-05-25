import AuthGate from "@/components/agent/AuthGate";

export default function AgentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthGate>{children}</AuthGate>;
}

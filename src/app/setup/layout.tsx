/**
 * Setup wizard layout — renders a full-screen overlay that covers
 * the sidebar and header from the root layout.
 */
export default function SetupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <div className="w-full max-w-lg px-6 py-8">
        {children}
      </div>
    </div>
  );
}

interface PageTitleProps {
  children: React.ReactNode;
  icon?: React.ReactNode;
}

export function PageTitle({ children, icon }: PageTitleProps) {
  return (
    <h2 className="mb-6 flex items-center gap-2 border-l-3 border-primary pl-3 text-xl font-semibold tracking-tight tv:text-2xl">
      {icon}
      {children}
    </h2>
  );
}

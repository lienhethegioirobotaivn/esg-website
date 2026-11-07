export function Tag({ children }: { children: string }) {
  return (
    <span className="inline-block rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-bold text-primary-900">
      {children}
    </span>
  );
}

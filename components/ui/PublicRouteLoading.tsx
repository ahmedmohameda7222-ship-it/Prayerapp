export function PublicRouteLoading() {
  return (
    <div className="grid gap-4" role="status" aria-label="Loading">
      <div className="h-14 animate-pulse rounded-[16px] bg-black/[0.045] motion-reduce:animate-none" />
      <div className="h-28 animate-pulse rounded-[18px] bg-black/[0.04] motion-reduce:animate-none" />
      <div className="h-20 animate-pulse rounded-[18px] bg-black/[0.035] motion-reduce:animate-none" />
      <span className="sr-only">Loading</span>
    </div>
  );
}

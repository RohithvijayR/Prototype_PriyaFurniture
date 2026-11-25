export function ProductCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex flex-col bg-white border border-[#D9CBB8]/60 rounded-2xl overflow-hidden"
    >
      <div className="aspect-[4/3] skeleton-shimmer" />
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-3 w-24 rounded skeleton-shimmer" />
          <div className="h-3 w-14 rounded skeleton-shimmer" />
        </div>
        <div className="h-6 w-4/5 rounded skeleton-shimmer" />
        <div className="space-y-2">
          <div className="h-3.5 w-full rounded skeleton-shimmer" />
          <div className="h-3.5 w-3/4 rounded skeleton-shimmer" />
        </div>
        <div className="pt-4 border-t border-[#EAE1D3] flex items-center justify-between gap-4">
          <div className="h-4 w-24 rounded skeleton-shimmer" />
          <div className="h-9 w-28 rounded-full skeleton-shimmer" />
        </div>
      </div>
    </div>
  );
}

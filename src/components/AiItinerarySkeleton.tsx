// src/components/AiItinerarySkeleton.tsx

export default function AiItinerarySkeleton() {
  return (
    <div className="mb-8 animate-pulse">
      <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gray-200" />
          <div>
            <div className="mb-2 h-4 w-32 rounded bg-gray-200" />
            <div className="h-3 w-24 rounded bg-gray-100" />
          </div>
        </div>
      </div>
    </div>
  );
}

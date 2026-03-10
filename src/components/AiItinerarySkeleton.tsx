export default function AiItinerarySkeleton() {
  return (
    <div className="mb-8 animate-pulse">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-gray-200 p-2 rounded-lg w-10 h-10"></div>
          <div>
            <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
            <div className="h-3 bg-gray-100 rounded w-24"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

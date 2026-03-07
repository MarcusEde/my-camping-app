'use client';

import { useState, useTransition } from 'react';
import { adminSyncCampground, adminClearGooglePlaces } from './actions';
import { RefreshCw, Trash2, MapPin, ExternalLink, Loader2 } from 'lucide-react';

interface Props {
  campground: {
    id: string;
    name: string;
    slug: string;
    latitude: number;
    longitude: number;
  };
  googleCount: number;
  customCount: number;
}

export default function AdminCampgroundCard({ campground, googleCount, customCount }: Props) {
  const [isPending, startTransition] = useTransition();
  const [actionType, setActionType] = useState<'sync' | 'clear' | null>(null);

  const handleSync = () => {
    setActionType('sync');
    startTransition(async () => {
      try {
        const res = await adminSyncCampground(campground.id);
        alert(`✅ Hämtade ${res.addedCount} nya platser från Google för ${campground.name}.`);
      } catch (e: any) {
        alert(`Fel: ${e.message}`);
      }
      setActionType(null);
    });
  };

  const handleClear = () => {
    if (!confirm(`Är du helt säker på att du vill radera alla API-platser för ${campground.name}?`)) return;
    
    setActionType('clear');
    startTransition(async () => {
      try {
        await adminClearGooglePlaces(campground.id);
        alert('🗑️ Alla API-platser har raderats.');
      } catch (e: any) {
        alert(`Fel: ${e.message}`);
      }
      setActionType(null);
    });
  };

  return (
    <div className="flex flex-col justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:flex-row md:items-center">
      
      {/* Vänster: Info */}
      <div>
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-black">{campground.name}</h2>
          <a 
            href={`/camp/${campground.slug}`} 
            target="_blank" 
            className="flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-xs font-bold text-gray-600 hover:bg-gray-200"
          >
            Öppna gästvy <ExternalLink size={12} />
          </a>
        </div>
        <p className="mt-1 flex items-center gap-1 text-sm text-gray-500">
          <MapPin size={14} /> 
          {campground.latitude}, {campground.longitude}
        </p>
        
        <div className="mt-3 flex gap-3 text-sm font-medium">
          <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">
            {googleCount} platser från Google
          </span>
          <span className="rounded-full bg-green-50 px-3 py-1 text-green-700">
            {customCount} egna platser
          </span>
        </div>
      </div>

      {/* Höger: Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleClear}
          disabled={isPending || googleCount === 0}
          className="flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-600 transition-all hover:bg-red-50 disabled:opacity-50"
        >
          {isPending && actionType === 'clear' ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
          Rensa
        </button>

        <button
          onClick={handleSync}
          disabled={isPending}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-indigo-700 shadow-md active:scale-95 disabled:opacity-50"
        >
          {isPending && actionType === 'sync' ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          Synka mot Google
        </button>
      </div>
    </div>
  );
}
'use client';

import React, { useState } from 'react';
import { Campground, CachedPlace, Announcement, PromotedPartner } from '@/types/database';
import { 
  Home, Map as MapIcon, Sparkles, Info, Wifi, 
  Trash2, Clock, Phone, MapPin, ExternalLink, Copy, Check
} from 'lucide-react';
import AiItinerary from './AiItinerary';

// --- ÖVERSÄTTNINGAR (Hårdkodade för demon) ---
const translations = {
  sv: { 
    welcome: "Välkommen till",
    wifi: "Wi-Fi på området", 
    trash: "Sopsortering", 
    checkout: "Utcheckning", 
    rules: "Ordningsregler", 
    explore: "Utforska närområdet", 
    plan: "AI Reseplanerare", 
    info: "Min Vistelse", 
    find: "Vägbeskrivning", 
    onboard: "Hitta på området",
    copy: "Kopiera",
    copied: "Kopierat!",
    emergency: "Nödnummer",
    announcements: "Dagens anslag"
  },
  en: { 
    welcome: "Welcome to",
    wifi: "Wi-Fi on site", 
    trash: "Trash & Recycling", 
    checkout: "Check-out info", 
    rules: "Campground Rules", 
    explore: "Explore the area", 
    plan: "AI Trip Planner", 
    info: "My Stay", 
    find: "Directions", 
    onboard: "Find on site",
    copy: "Copy",
    copied: "Copied!",
    emergency: "Emergency",
    announcements: "Daily Notices"
  },
  de: { 
    welcome: "Willkommen bei",
    wifi: "WLAN am Platz", 
    trash: "Mülltrennung", 
    checkout: "Check-out Infos", 
    rules: "Platzordnung", 
    explore: "Umgebung erkunden", 
    plan: "AI Reiseplaner", 
    info: "Mein Aufenthalt", 
    find: "Anfahrt", 
    onboard: "Auf dem Platz",
    copy: "Kopieren",
    copied: "Kopiert!",
    emergency: "Notfall",
    announcements: "Tagesnotizen"
  }
};

interface GuestAppUIProps {
  campground: Campground;
  places: CachedPlace[];
  announcements?: Announcement[];
  partners?: PromotedPartner[] | null;
  weather?: any;
}

export default function GuestAppUI({ 
  campground, 
  places, 
  announcements = [], 
  partners = [], 
  weather 
}: GuestAppUIProps) {
  const [activeTab, setActiveTab] = useState<'home' | 'explore' | 'ai' | 'info'>('home');
  const [lang, setLang] = useState<'sv' | 'en' | 'de'>('sv');
  const [copied, setCopied] = useState(false);

  const t = translations[lang];
  const brandColor = campground.primary_color || '#2A3C34';

  // --- HJÄLPFUNKTIONER ---

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getMapLink = (place: CachedPlace) => {
    if (place.latitude && place.longitude) {
      return `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`;
    }
    // Fallback till campingens reception
    return `https://www.google.com/maps/dir/?api=1&destination=${campground.latitude},${campground.longitude}`;
  };

  const getPlaceImage = (place: CachedPlace) => {
    const rawData = place.raw_data as any;
    if (rawData?.photos?.[0]) return rawData.photos[0];

    const fallbacks: Record<string, string> = {
      restaurant: "https://images.unsplash.com/photo-1517248135467-4c7ed9d8c47c?w=600",
      beach: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600",
      park: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600",
      shopping: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600",
      other: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600"
    };
    return fallbacks[place.category] || fallbacks.other;
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-28 font-sans text-gray-900 selection:bg-green-100">
      
      {/* HEADER */}
      <header 
        style={{ backgroundColor: brandColor }}
        className="pt-10 pb-16 px-6 rounded-b-[3.5rem] text-white shadow-2xl relative transition-colors duration-700"
      >
        <div className="flex justify-between items-start mb-6">
          <div className="flex bg-black/20 backdrop-blur-md p-1 rounded-xl">
            {(['sv', 'en', 'de'] as const).map(l => (
              <button 
                key={l} 
                onClick={() => setLang(l)}
                className={`text-[10px] font-black px-3 py-1.5 rounded-lg transition-all ${lang === l ? 'bg-white text-gray-900 shadow-sm' : 'text-white/70 hover:text-white'}`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          {campground.logo_url && <img src={campground.logo_url} alt="Logo" className="h-10 drop-shadow-md" />}
        </div>
        
        <p className="text-white/70 text-xs font-bold uppercase tracking-[0.2em] mb-1">{t.welcome}</p>
        <h1 className="text-3xl font-black tracking-tight drop-shadow-sm">{campground.name}</h1>
      </header>

      {/* CONTENT AREA */}
      <main className="px-5 -mt-8 relative z-10">
        
        {/* HOME TAB */}
        {activeTab === 'home' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
            {/* Wi-Fi Card */}
            <div className="bg-white p-6 rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-white">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3.5 rounded-2xl shadow-inner" style={{ backgroundColor: brandColor + '15', color: brandColor }}>
                  <Wifi size={24} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="font-black text-gray-400 text-[10px] uppercase tracking-widest">{t.wifi}</h3>
                  <p className="font-bold text-lg text-gray-900">{campground.wifi_name || 'Åsa Guest Network'}</p>
                </div>
              </div>
              <div 
                onClick={() => copyToClipboard(campground.wifi_password || '')}
                className="bg-gray-50 p-4 rounded-2xl flex justify-between items-center cursor-pointer active:bg-gray-100 transition-colors group"
              >
                <code className="font-mono font-black text-blue-600 text-lg tracking-wider">
                  {campground.wifi_password || 'asa2024'}
                </code>
                <div className="flex items-center gap-1.5 text-gray-400 font-bold text-[10px] uppercase tracking-tighter">
                  {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                  <span className={copied ? "text-green-500" : ""}>{copied ? t.copied : t.copy}</span>
                </div>
              </div>
            </div>

            {/* Announcements */}
            <section>
              <h2 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 px-2 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                {t.announcements}
              </h2>
              {announcements.length > 0 ? (
                announcements.map(ann => (
                  <div key={ann.id} className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100 mb-3 flex gap-4 transition-transform hover:scale-[1.02]">
                    <div className="text-2xl mt-1">
                      {ann.type === 'warning' ? '⚠️' : ann.type === 'event' ? '🎉' : '📢'}
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-gray-900">{ann.title}</h4>
                      <p className="text-xs text-gray-500 leading-relaxed mt-1">{ann.content}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-gray-100/50 p-8 rounded-[2rem] border-2 border-dashed border-gray-200 text-center">
                  <p className="text-xs text-gray-400 font-medium italic">Inga anslag just nu. Njut av semestern!</p>
                </div>
              )}
            </section>
          </div>
        )}

        {/* EXPLORE TAB */}
        {activeTab === 'explore' && (
          <div className="space-y-5 pt-4 animate-in fade-in duration-500">
            <h2 className="text-2xl font-black px-2 tracking-tight">{t.explore}</h2>
            <div className="grid grid-cols-1 gap-5">
              {places.filter(p => !p.is_hidden).map(place => {
                const imageUrl = getPlaceImage(place);
                return (
                  <div key={place.id} className="bg-white rounded-[2.5rem] overflow-hidden shadow-md border border-white group">
                    <div className="h-44 relative">
                      <img src={imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={place.name} />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                      {place.is_pinned && (
                        <div className="absolute top-4 left-4 bg-yellow-400 text-black text-[10px] font-black px-3 py-1.5 rounded-full uppercase shadow-lg">
                          ⭐ Personalens val
                        </div>
                      )}
                    </div>
                    <div className="p-6">
                      <h3 className="font-black text-xl text-gray-900 leading-none mb-1">{place.name}</h3>
                      <p className="text-[11px] text-gray-400 font-bold flex items-center gap-1 mb-5">
                        <MapPin size={12} strokeWidth={3} /> {place.address?.split(',')[0] || campground.name}
                      </p>
                      <a 
                        href={getMapLink(place)} 
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ backgroundColor: brandColor }}
                        className="flex items-center justify-center gap-3 w-full py-4 text-white rounded-2xl font-black text-sm shadow-lg shadow-gray-200 transition-all active:scale-95 hover:brightness-110"
                      >
                        <ExternalLink size={18} strokeWidth={2.5} />
                        {place.latitude ? t.find : t.onboard}
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* AI TAB */}
        {activeTab === 'ai' && (
          <div className="pt-4 h-[75vh] animate-in zoom-in-95 duration-500">
            <AiItinerary campground={campground} weather={weather} />
          </div>
        )}

        {/* INFO TAB */}
        {activeTab === 'info' && (
          <div className="space-y-4 pt-4 animate-in fade-in duration-500">
            <h2 className="text-2xl font-black px-2 tracking-tight">{t.info}</h2>
            <InfoBox icon={<Trash2 size={20}/>} title={t.trash} content={campground.trash_rules} color={brandColor} />
            <InfoBox icon={<Clock size={20}/>} title={t.checkout} content={campground.check_out_info} color={brandColor} />
            <InfoBox icon={<Phone size={20}/>} title={t.emergency} content={campground.emergency_info || "Vid akuta händelser: Ring 112. För jourfrågor: Ring receptionen."} color={brandColor} />
          </div>
        )}

      </main>

      {/* FLOATING BOTTOM NAV */}
      <nav className="fixed bottom-8 left-6 right-6 bg-white/80 backdrop-blur-2xl h-18 rounded-[2rem] border border-white/40 shadow-[0_20px_50px_rgba(0,0,0,0.15)] flex justify-around items-center px-4 z-50">
        <NavIcon active={activeTab === 'home'} onClick={() => setActiveTab('home')} icon={<Home size={22}/>} color={brandColor} />
        <NavIcon active={activeTab === 'explore'} onClick={() => setActiveTab('explore')} icon={<MapIcon size={22}/>} color={brandColor} />
        <NavIcon active={activeTab === 'ai'} onClick={() => setActiveTab('ai')} icon={<Sparkles size={22}/>} color={brandColor} />
        <NavIcon active={activeTab === 'info'} onClick={() => setActiveTab('info')} icon={<Info size={22}/>} color={brandColor} />
      </nav>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function NavIcon({ active, onClick, icon, color }: any) {
  return (
    <button 
      onClick={onClick} 
      className={`relative p-4 transition-all duration-500 rounded-2xl ${active ? 'scale-110' : 'scale-100 hover:bg-gray-50'}`}
      style={{ 
        color: active ? color : '#94a3b8', 
        backgroundColor: active ? color + '15' : 'transparent' 
      }}
    >
      {icon}
      {active && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full shadow-sm" style={{ backgroundColor: color }} />
      )}
    </button>
  );
}

function InfoBox({ icon, title, content, color }: any) {
  return (
    <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 flex gap-5 items-start">
      <div className="p-4 rounded-2xl shadow-inner" style={{ backgroundColor: color + '10', color: color }}>
        {icon}
      </div>
      <div>
        <h4 className="font-black text-xs uppercase tracking-widest text-gray-400 mb-1">{title}</h4>
        <p className="text-sm text-gray-700 leading-relaxed font-medium">{content || "Information kommer inom kort."}</p>
      </div>
    </div>
  );
}
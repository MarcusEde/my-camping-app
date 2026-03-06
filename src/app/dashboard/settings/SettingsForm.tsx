'use client';

import React, { useState } from 'react';
import { Campground, Announcement } from '@/types/database';
import { updateCampgroundSettings, createAnnouncement, deleteAnnouncement } from '@/app/dashboard/actions';
import { Palette, Wifi, Trash2, Clock, Megaphone, Save, Trash } from 'lucide-react';

interface SettingsFormProps {
  campground: Campground;
  announcements: Announcement[];
}

export default function SettingsForm({ campground, announcements }: SettingsFormProps) {
  const [loading, setLoading] = useState(false);
  const [color, setColor] = useState(campground.primary_color || '#2A3C34');

  // Hantera uppdatering av grundinställningar
  async function handleUpdateSettings(formData: FormData) {
    setLoading(true);
    const updates = {
      primary_color: color,
      wifi_name: formData.get('wifi_name') as string,
      wifi_password: formData.get('wifi_password') as string,
      trash_rules: formData.get('trash_rules') as string,
      check_out_info: formData.get('check_out_info') as string,
    };

    try {
      await updateCampgroundSettings(campground.id, updates);
      alert('Inställningar sparade!');
    } catch (err) {
      alert('Något gick fel.');
    } finally {
      setLoading(false);
    }
  }

  // Hantera nytt anslag
  async function handleAddAnnouncement(formData: FormData) {
    const title = formData.get('title') as string;
    const content = formData.get('content') as string;
    const type = formData.get('type') as any;

    try {
      await createAnnouncement(campground.id, title, content, type);
      (document.getElementById('announcement-form') as HTMLFormElement).reset();
    } catch (err) {
      alert('Kunde inte skapa anslag.');
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-10">
      
      {/* SEKTION 1: BRANDING & TEMA */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="flex items-center gap-3 mb-6">
          <Palette className="text-blue-500" />
          <h2 className="text-xl font-bold">Appens utseende (Tema)</h2>
        </div>
        
        <form action={handleUpdateSettings} className="space-y-6">
          <div className="flex items-center gap-6 p-4 bg-gray-50 rounded-xl">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Huvudfärg (Brand Color)</label>
              <input 
                type="color" 
                value={color} 
                onChange={(e) => setColor(e.target.value)}
                className="h-12 w-24 rounded cursor-pointer border-none shadow-sm"
              />
            </div>
            <div className="text-sm text-gray-500 italic">
              "Denna färg används för knappar och rubriker i gästappen."
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Wifi size={16} /> Wi-Fi Namn
              </label>
              <input name="wifi_name" defaultValue={campground.wifi_name || ''} className="w-full p-3 border rounded-xl" placeholder="t.ex. Åsa_Camping_Gäst" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Wi-Fi Lösenord</label>
              <input name="wifi_password" defaultValue={campground.wifi_password || ''} className="w-full p-3 border rounded-xl" placeholder="t.ex. camping2024" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Trash2 size={16} /> Sopsortering (Regler)
              </label>
              <textarea name="trash_rules" defaultValue={campground.trash_rules || ''} className="w-full p-3 border rounded-xl h-24" placeholder="Vart slänger man sopor?" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Clock size={16} /> Utchecknings-info
              </label>
              <textarea name="check_out_info" defaultValue={campground.check_out_info || ''} className="w-full p-3 border rounded-xl h-24" placeholder="När och hur checkar man ut?" />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="flex items-center justify-center gap-2 w-full py-4 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-all"
          >
            <Save size={20} />
            {loading ? 'Sparar...' : 'Spara alla ändringar'}
          </button>
        </form>
      </section>

      {/* SEKTION 2: ANSLAGSTAVLA */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="flex items-center gap-3 mb-6">
          <Megaphone className="text-orange-500" />
          <h2 className="text-xl font-bold">Dagens Anslagstavla</h2>
        </div>

        <form id="announcement-form" action={handleAddAnnouncement} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 bg-orange-50 p-6 rounded-2xl">
          <div className="md:col-span-1">
            <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Rubrik</label>
            <input name="title" required className="w-full p-3 border rounded-xl" placeholder="t.ex. Bullar kl 08" />
          </div>
          <div className="md:col-span-1">
            <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Innehåll</label>
            <input name="content" required className="w-full p-3 border rounded-xl" placeholder="Beskrivning..." />
          </div>
          <div className="md:col-span-1 flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Typ</label>
              <select name="type" className="w-full p-3 border rounded-xl bg-white">
                <option value="info">Information</option>
                <option value="event">Händelse/Event</option>
                <option value="warning">Viktigt</option>
              </select>
            </div>
            <button type="submit" className="p-3 bg-orange-500 text-white rounded-xl font-bold">Lägg till</button>
          </div>
        </form>

        <div className="space-y-3">
          {announcements.map((ann) => (
            <div key={ann.id} className="flex items-center justify-between p-4 border rounded-xl hover:bg-gray-50">
              <div>
                <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded mr-3 ${
                  ann.type === 'warning' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                }`}>
                  {ann.type}
                </span>
                <span className="font-bold">{ann.title}</span>
              </div>
              <button onClick={() => deleteAnnouncement(ann.id)} className="text-gray-400 hover:text-red-500 p-2">
                <Trash size={18} />
              </button>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
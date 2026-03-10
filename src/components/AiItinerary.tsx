'use client'; // Måste vara client för att kunna chatta/klicka

import React, { useState } from 'react';
// Importera din server action som sköter AI-anropet
// import { generatePlan } from '@/app/dashboard/actions'; 

export default function AiItinerary({ campground, weather }: any) {
  const [plan, setPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Själva AI-anropet görs i en vanlig asynkron funktion, INTE i komponent-toppen
  async function handleGeneratePlan() {
    setLoading(true);
    try {
      // Här anropar du din server action eller API-rutt
      // const res = await generatePlan(campground.name, weather);
      // setPlan(res);
      setPlan("Här är din plan för Åsa Camping..."); 
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-purple-100">
      <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
        <span className="text-purple-500">✨</span> AI Reseplanerare
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        Låt AI skapa en personlig dagsplan baserat på vädret i {campground.name}.
      </p>

      {loading ? (
        <div className="animate-pulse flex space-y-4 flex-col">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-full"></div>
        </div>
      ) : plan ? (
        <div className="prose prose-sm text-gray-700">
          {plan}
        </div>
      ) : (
        <button 
          onClick={handleGeneratePlan}
          className="w-full py-4 bg-purple-600 text-white rounded-2xl font-bold hover:bg-purple-700 transition-colors"
        >
          Skapa min dagsplan
        </button>
      )}
    </div>
  );
}
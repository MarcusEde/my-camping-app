"use client";

import React, { useState } from "react";
import type { CachedPlace, Campground, InternalLocation } from "@/types/database";
import PlacesManager from "./PlacesManager";
import FacilityManager from "../FacilityManager";
import { MapPin, Building2 } from "lucide-react";

interface Props {
  campground: Campground;
  places: CachedPlace[];
  facilities: InternalLocation[];
  brand: string;
}

export default function PlacesTabs({ campground, places, facilities, brand }: Props) {
  const [activeTab, setActiveTab] = useState<"places" | "facilities">("places");

  return (
    <div className="space-y-6">
      {/* Intentionally robust tab bar fitting the dashboard style */}
      <div className="flex gap-1 rounded-full bg-stone-100/80 p-1 w-max mx-auto sm:mx-0">
        <button
          onClick={() => setActiveTab("places")}
          className="flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-[11px] font-black uppercase tracking-[0.15em] transition-all active:scale-95"
          style={
            activeTab === "places"
              ? { backgroundColor: "white", color: brand, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }
              : { color: "#a8a29e" }
          }
        >
          <MapPin size={16} />
          <span>Utflykter</span>
        </button>
        <button
          onClick={() => setActiveTab("facilities")}
          className="flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-[11px] font-black uppercase tracking-[0.15em] transition-all active:scale-95"
          style={
            activeTab === "facilities"
              ? { backgroundColor: "white", color: brand, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }
              : { color: "#a8a29e" }
          }
        >
          <Building2 size={16} />
          <span>Faciliteter</span>
        </button>
      </div>

      <div>
        {activeTab === "places" ? (
          <PlacesManager campground={campground} places={places} />
        ) : (
          <div className="bg-white rounded-[16px] shadow-sm ring-1 ring-stone-200/50 p-6">
            <div className="mb-6 px-1">
              <h2 className="text-[16px] font-black tracking-tight text-stone-900">
                🏗️ Faciliteter
              </h2>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-stone-400 mt-1">
                Toaletter, duschar & service på campingen
              </p>
            </div>
            <FacilityManager
              campgroundId={campground.id}
              facilities={facilities}
              brand={brand}
            />
          </div>
        )}
      </div>
    </div>
  );
}

import { calculateDistanceKm, formatDistance } from './distance';

/**
 * Returnerar ett objekt med information om dagens öppettider:
 * text: t.ex. "09:00 - 18:00"
 * isOpenNow: boolean (true om stället de facto är öppet precis just nu)
 */
export function getTodaysOpeningHours(rawData: any): { text: string, isOpenNow: boolean } | null {
  if (!rawData?.openingHours || !Array.isArray(rawData.openingHours)) return null;
  
  // Hämta aktuell tid i svensk tidzon
  const now = new Date();
  const options = { timeZone: 'Europe/Stockholm' };
  
  // Bygg ett svenskt datum-objekt för att få rätt timme & minut
  const svTimeStr = now.toLocaleString('en-US', { ...options, hour12: false, hour: 'numeric', minute: 'numeric' });
  // svTimeStr ser ut typ "14:30" eller "24:15" (men vi hanterar 24 as 00)
  
  let currentHour = now.getHours(); 
  const currentMinute = now.getMinutes();
  
  // Hitta veckodag (0=Sön, 1=Mån...)
  const jsDay = now.getDay();
  const googleIndex = (jsDay + 6) % 7; // Mappar till Googles index (Måndag = 0)
  
  const todayString = rawData.openingHours[googleIndex];
  if (!todayString) return null; // T.ex. "Monday: 09:00 - 18:00"

  const hoursOnly = todayString.split(': ')[1]; // "09:00 - 18:00" eller "Closed" eller "Open 24 hours"

  // Snabbkoll för extremfall
  if (hoursOnly.toLowerCase() === 'closed' || hoursOnly.toLowerCase() === 'stängt') {
    return { text: 'Stängt idag', isOpenNow: false };
  }
  if (hoursOnly.toLowerCase() === 'open 24 hours' || hoursOnly.toLowerCase() === 'öppet dygnet runt') {
    return { text: 'Dygnet runt', isOpenNow: true };
  }

  // Nu parsear vi "09:00 - 18:00"
  const timeMatch = hoursOnly.match(/(\d{1,2}):(\d{2})\s*(?:-|to|–)\s*(\d{1,2}):(\d{2})/i);
  
  if (timeMatch) {
    const openH = parseInt(timeMatch[1], 10);
    const openM = parseInt(timeMatch[2], 10);
    const closeH = parseInt(timeMatch[3], 10);
    const closeM = parseInt(timeMatch[4], 10);

    const currentTimeInMinutes = currentHour * 60 + currentMinute;
    const openTimeInMinutes = openH * 60 + openM;
    let closeTimeInMinutes = closeH * 60 + closeM;

    // Hantera ställen som stänger efter midnatt (t.ex. 09:00 - 02:00)
    if (closeTimeInMinutes <= openTimeInMinutes) {
      closeTimeInMinutes += 24 * 60; // Lägg på ett dygn i minuter
    }

    // Även aktuell tid måste kalkyleras upp om klockan är efter midnatt och man stänger ex 02
    let adjustedCurrentTime = currentTimeInMinutes;
    if (currentHour < openH && closeTimeInMinutes > 24 * 60) {
      adjustedCurrentTime += 24 * 60;
    }

    const isOpenNow = adjustedCurrentTime >= openTimeInMinutes && adjustedCurrentTime < closeTimeInMinutes;

    return { 
      text: hoursOnly, 
      isOpenNow 
    };
  }

  // Fallback ifall Google har något knasigt format vi inte kunde matcha
  return { text: hoursOnly, isOpenNow: true };
}

export function getFormattedDistance(campLat: number, campLng: number, placeLat: number | null, placeLng: number | null): string | null {
  if (!placeLat || !placeLng) return null;
  const distKm = calculateDistanceKm(campLat, campLng, placeLat, placeLng);
  return formatDistance(distKm);
}
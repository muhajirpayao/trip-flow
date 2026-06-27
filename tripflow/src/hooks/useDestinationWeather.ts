import { useEffect, useState } from 'react';

interface WeatherInfo {
  tempC: number;
  description: string;
  emoji: string;
  isDay: boolean;
}

const CODE_MAP: Record<number, { description: string; emoji: string }> = {
  0:  { description: 'clear skies',   emoji: '☀️' },
  1:  { description: 'mostly clear',  emoji: '🌤️' },
  2:  { description: 'partly cloudy', emoji: '⛅' },
  3:  { description: 'overcast',      emoji: '☁️' },
  45: { description: 'foggy',         emoji: '🌫️' },
  48: { description: 'foggy',         emoji: '🌫️' },
  51: { description: 'light drizzle', emoji: '🌦️' },
  61: { description: 'light rain',    emoji: '🌧️' },
  63: { description: 'rainy',         emoji: '🌧️' },
  65: { description: 'heavy rain',    emoji: '🌧️' },
  71: { description: 'light snow',    emoji: '🌨️' },
  80: { description: 'showers',       emoji: '🌦️' },
  95: { description: 'thunderstorms', emoji: '⛈️' },
};

export function useDestinationWeather(destination: string | undefined) {
  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!destination) {
      setWeather(null);
      setLoading(false);
      return;
    }
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const city = destination.split(',')[0].trim();
        const geoRes = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`
        );
        const geo = await geoRes.json();
        const place = geo?.results?.[0];
        if (!place) {
          if (!cancelled) { setWeather(null); setLoading(false); }
          return;
        }

        const wRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current_weather=true`
        );
        const wData = await wRes.json();
        const cw = wData?.current_weather;
        if (!cw || cancelled) {
          if (!cancelled) setLoading(false);
          return;
        }

        const meta = CODE_MAP[cw.weathercode] ?? { description: 'mild weather', emoji: '🌥️' };
        setWeather({
          tempC: Math.round(cw.temperature),
          description: meta.description,
          emoji: meta.emoji,
          isDay: cw.is_day === 1,
        });
      } catch (err) {
        console.error('weather fetch error', err);
        if (!cancelled) setWeather(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [destination]);

  return { weather, loading };
}

export function getTimeGreeting(): { label: string; isDay: boolean } {
  const hour = new Date().getHours();
  if (hour < 12) return { label: 'Good morning', isDay: true };
  if (hour < 18) return { label: 'Good afternoon', isDay: true };
  return { label: 'Good evening', isDay: false };
}
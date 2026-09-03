import { useEffect, useState } from 'react';
import { APP_CONFIG } from '../../config';

// Current conditions + rolling 24h rainfall from Open-Meteo (free, no key,
// CORS-enabled). Cached in localStorage so a browser refetches at most a few
// times a day, well inside the free limits. Hydrometric data is out of scope.

const CACHE_KEY = 'mv_weather_cache';
const TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

type Weather = {
  tempC: number;
  code: number;
  windKmh: number;
  humidity: number;
  precip24hMm: number;
  observedAt: string;
};

const WMO: Record<number, { label: string; icon: string }> = {
  0: { label: 'Sereno', icon: 'bi-sun' },
  1: { label: 'Prevalentemente sereno', icon: 'bi-sun' },
  2: { label: 'Parzialmente nuvoloso', icon: 'bi-cloud-sun' },
  3: { label: 'Coperto', icon: 'bi-clouds' },
  45: { label: 'Nebbia', icon: 'bi-cloud-fog2' },
  48: { label: 'Nebbia con brina', icon: 'bi-cloud-fog2' },
  51: { label: 'Pioviggine debole', icon: 'bi-cloud-drizzle' },
  53: { label: 'Pioviggine', icon: 'bi-cloud-drizzle' },
  55: { label: 'Pioviggine intensa', icon: 'bi-cloud-drizzle' },
  61: { label: 'Pioggia debole', icon: 'bi-cloud-rain' },
  63: { label: 'Pioggia', icon: 'bi-cloud-rain' },
  65: { label: 'Pioggia forte', icon: 'bi-cloud-rain-heavy' },
  66: { label: 'Pioggia gelata', icon: 'bi-cloud-sleet' },
  67: { label: 'Pioggia gelata forte', icon: 'bi-cloud-sleet' },
  71: { label: 'Neve debole', icon: 'bi-cloud-snow' },
  73: { label: 'Neve', icon: 'bi-cloud-snow' },
  75: { label: 'Neve forte', icon: 'bi-cloud-snow' },
  77: { label: 'Nevischio', icon: 'bi-cloud-snow' },
  80: { label: 'Rovesci deboli', icon: 'bi-cloud-rain' },
  81: { label: 'Rovesci', icon: 'bi-cloud-rain' },
  82: { label: 'Rovesci violenti', icon: 'bi-cloud-rain-heavy' },
  85: { label: 'Rovesci di neve', icon: 'bi-cloud-snow' },
  86: { label: 'Rovesci di neve forti', icon: 'bi-cloud-snow' },
  95: { label: 'Temporale', icon: 'bi-cloud-lightning-rain' },
  96: { label: 'Temporale con grandine', icon: 'bi-cloud-lightning-rain' },
  99: { label: 'Temporale con grandine forte', icon: 'bi-cloud-lightning-rain' },
};

function describe(code: number): { label: string; icon: string } {
  return WMO[code] ?? { label: 'Dati meteo', icon: 'bi-thermometer-half' };
}

async function fetchWeather(): Promise<Weather> {
  const [lon, lat] = APP_CONFIG.map.center;
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    '&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m' +
    '&hourly=precipitation&past_days=1&forecast_days=1&timezone=Europe%2FRome';
  const response = await fetch(url);
  if (!response.ok) throw new Error('meteo non disponibile');
  const data = await response.json();

  const times: string[] = data.hourly?.time ?? [];
  const values: number[] = data.hourly?.precipitation ?? [];
  const nowIndex = times.findIndex((t) => t > data.current.time);
  const end = nowIndex === -1 ? times.length : nowIndex;
  const precip24hMm = values
    .slice(Math.max(0, end - 24), end)
    .reduce((sum, value) => sum + (value ?? 0), 0);

  return {
    tempC: data.current.temperature_2m,
    code: data.current.weather_code,
    windKmh: data.current.wind_speed_10m,
    humidity: data.current.relative_humidity_2m,
    precip24hMm,
    observedAt: data.current.time,
  };
}

export default function WeatherCard() {
  const [weather, setWeather] = useState<Weather | null>(null);

  useEffect(() => {
    let cancelled = false;

    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw) as { data: Weather; fetchedAt: number };
        if (Date.now() - cached.fetchedAt < TTL_MS) {
          setWeather(cached.data);
          return;
        }
      }
    } catch {
      /* ignore unreadable cache */
    }

    fetchWeather()
      .then((w) => {
        if (cancelled) return;
        setWeather(w);
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ data: w, fetchedAt: Date.now() }));
        } catch {
          /* storage unavailable, still show this session */
        }
      })
      .catch(() => {
        /* leave the card hidden on failure */
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!weather) return null;

  const { label, icon } = describe(weather.code);
  const time = new Date(weather.observedAt).toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="weather-card" aria-label="Meteo attuale">
      <i className={`bi ${icon} weather-icon`} aria-hidden="true" />
      <div className="weather-main">
        <span className="weather-temp">{Math.round(weather.tempC)}&deg;C</span>
        <span className="weather-label">{label}</span>
      </div>
      <ul className="weather-meta">
        <li><i className="bi bi-umbrella" aria-hidden="true" /> {weather.precip24hMm.toFixed(1)} mm / 24h</li>
        <li><i className="bi bi-wind" aria-hidden="true" /> {Math.round(weather.windKmh)} km/h</li>
        <li><i className="bi bi-droplet" aria-hidden="true" /> {weather.humidity}%</li>
      </ul>
      <span className="weather-source">
        <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo</a> &middot; agg. {time}
      </span>
    </div>
  );
}

import { PrayerSchedule, WeatherInfo } from '../types';

interface GeoCoords {
  latitude: number;
  longitude: number;
  locationLabel: string;
}

/**
 * Pure Auto-Geolocation (Browser GPS -> IP Geolocation Fallback)
 * Tidak membutuhkan pengaturan kota manual; otomatis menyesuaikan saat pindah kota.
 */
export async function detectAutoLocation(): Promise<GeoCoords> {
  const isElectronDesktop = typeof window !== 'undefined' && Boolean(window.electronAPI?.isElectron);

  // 1. Pada Mobile Companion / Browser luar: Coba Browser GPS cepat (maks 2.5 detik)
  if (!isElectronDesktop && typeof navigator !== 'undefined' && 'geolocation' in navigator) {
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 2500,
          maximumAge: 1000 * 60 * 30, // cache 30 menit
        });
      });

      const { latitude, longitude } = pos.coords;
      const label = await reverseGeocodeLabel(latitude, longitude);
      const res: GeoCoords = { latitude, longitude, locationLabel: label };
      try {
        localStorage.setItem('loony_last_geo_coords', JSON.stringify(res));
      } catch {}
      return res;
    } catch {
      // Lanjut ke IP Geolocation
    }
  }

  // 2. Fallback Utama (Sangat Cepat & Akurat ~200ms): ipwho.is
  try {
    const res = await fetch('https://ipwho.is/');
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.latitude && data.longitude) {
        const result: GeoCoords = {
          latitude: Number(data.latitude),
          longitude: Number(data.longitude),
          locationLabel: data.city ? `${data.city}, ${data.region_code || 'ID'}` : 'Auto-Location (IP)',
        };
        try {
          localStorage.setItem('loony_last_geo_coords', JSON.stringify(result));
        } catch {}
        return result;
      }
    }
  } catch {
    // ignore
  }

  // 3. Fallback kedua: GeoJS
  try {
    const res = await fetch('https://get.geojs.io/v1/ip/geo.json');
    if (res.ok) {
      const data = await res.json();
      if (data.latitude && data.longitude) {
        const result: GeoCoords = {
          latitude: Number(data.latitude),
          longitude: Number(data.longitude),
          locationLabel: data.city || 'Auto-Location',
        };
        try {
          localStorage.setItem('loony_last_geo_coords', JSON.stringify(result));
        } catch {}
        return result;
      }
    }
  } catch {
    // ignore
  }

  // 4. Fallback ketiga: ipapi.co
  try {
    const res = await fetch('https://ipapi.co/json/');
    if (res.ok) {
      const data = await res.json();
      if (data.latitude && data.longitude) {
        const result: GeoCoords = {
          latitude: Number(data.latitude),
          longitude: Number(data.longitude),
          locationLabel: data.city ? `${data.city}, ${data.region || 'ID'}` : 'Auto-Location (IP)',
        };
        try {
          localStorage.setItem('loony_last_geo_coords', JSON.stringify(result));
        } catch {}
        return result;
      }
    }
  } catch {
    // ignore
  }

  // 5. Cek cache lokasi terakhir yang sukses dari localStorage
  try {
    const cached = localStorage.getItem('loony_last_geo_coords');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && parsed.latitude && parsed.longitude) {
        return parsed as GeoCoords;
      }
    }
  } catch {}

  // Default koordinat Indonesia (WIB) jika benar-benar offline pertama kali
  return {
    latitude: -6.2088,
    longitude: 106.8456,
    locationLabel: 'Lokasi Otomatis (Offline)',
  };
}

async function reverseGeocodeLabel(lat: number, lon: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`
    );
    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const city =
        addr.city || addr.town || addr.county || addr.municipality || addr.state_district;
      if (city) return city;
    }
  } catch {
    // ignore
  }
  return `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`;
}

/**
 * Mengambil Jadwal Shalat dari Aladhan API (Method 20 = Kemenag RI)
 */
export async function fetchPrayerScheduleAuto(): Promise<PrayerSchedule> {
  const coords = await detectAutoLocation();
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, '0');
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const yyyy = today.getFullYear();

  try {
    const url = `https://api.aladhan.com/v1/timings/${dd}-${mm}-${yyyy}?latitude=${coords.latitude}&longitude=${coords.longitude}&method=20`;
    const res = await fetch(url);
    if (res.ok) {
      const json = await res.json();
      const timings = json?.data?.timings;
      if (timings) {
        return {
          Fajr: cleanTime(timings.Fajr),
          Dhuhr: cleanTime(timings.Dhuhr),
          Asr: cleanTime(timings.Asr),
          Maghrib: cleanTime(timings.Maghrib),
          Isha: cleanTime(timings.Isha),
          locationLabel: coords.locationLabel,
          latitude: coords.latitude,
          longitude: coords.longitude,
          fetchedDate: `${yyyy}-${mm}-${dd}`,
        };
      }
    }
  } catch {
    // Fallback jadwal standar jika sedang offline
  }

  return {
    Fajr: '04:32',
    Dhuhr: '11:54',
    Asr: '15:14',
    Maghrib: '17:58',
    Isha: '19:09',
    locationLabel: coords.locationLabel,
    latitude: coords.latitude,
    longitude: coords.longitude,
    fetchedDate: `${yyyy}-${mm}-${dd}`,
  };
}

function cleanTime(raw: string): string {
  return (raw || '00:00').split(' ')[0].slice(0, 5);
}

/**
 * Mengambil Cuaca Ringkas dari Open-Meteo berdasarkan koordinat Auto-Geolocation
 */
export async function fetchWeatherAuto(
  lat: number,
  lon: number,
  lang: 'en' | 'id' = 'id'
): Promise<WeatherInfo> {
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
    );
    if (res.ok) {
      const data = await res.json();
      const cw = data.current_weather;
      if (cw) {
        const code = Number(cw.weathercode);
        const liveWeather: WeatherInfo = {
          tempC: Math.round(cw.temperature),
          conditionText: mapWeatherCode(code, lang),
          icon: mapWeatherIcon(code),
          weatherCode: code,
        };
        try {
          localStorage.setItem('loony_last_weather_info', JSON.stringify(liveWeather));
        } catch {}
        return liveWeather;
      }
    }
  } catch {
    // ignore
  }

  // Gunakan cache cuaca riil terakhir jika koneksi sedang offline
  try {
    const cached = localStorage.getItem('loony_last_weather_info');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && typeof parsed.tempC === 'number') {
        return {
          ...parsed,
          conditionText: mapWeatherCode(parsed.weatherCode ?? 2, lang),
          icon: mapWeatherIcon(parsed.weatherCode ?? 2),
        };
      }
    }
  } catch {}

  return {
    tempC: 28,
    conditionText: lang === 'en' ? 'Partly Cloudy' : 'Cerah Berawan',
    icon: '⛅',
    weatherCode: 2,
  };
}

export function mapWeatherCode(code: number, lang: 'en' | 'id' = 'id'): string {
  if (lang === 'en') {
    if (code === 0) return 'Clear Sky';
    if (code === 1) return 'Mainly Clear';
    if (code === 2) return 'Partly Cloudy';
    if (code === 3) return 'Overcast';
    if (code === 45 || code === 48) return 'Foggy';
    if (code >= 51 && code <= 55) return 'Drizzle';
    if (code >= 61 && code <= 65) return 'Rain';
    if (code >= 71 && code <= 77) return 'Snow';
    if (code >= 80 && code <= 82) return 'Rain Showers';
    if (code >= 95) return 'Thunderstorm';
    return 'Cloudy';
  }
  if (code === 0) return 'Cerah';
  if (code === 1) return 'Cerah Berawan';
  if (code === 2) return 'Berawan Sebagian';
  if (code === 3) return 'Mendung';
  if (code === 45 || code === 48) return 'Berkabut';
  if (code >= 51 && code <= 55) return 'Gerimis';
  if (code >= 61 && code <= 65) return 'Hujan';
  if (code >= 71 && code <= 77) return 'Salju';
  if (code >= 80 && code <= 82) return 'Hujan Deras';
  if (code >= 95) return 'Hujan Petir';
  return 'Berawan';
}

function mapWeatherIcon(code: number): string {
  if (code === 0) return '☀️';
  if (code === 1) return '🌤️';
  if (code === 2) return '⛅';
  if (code === 3) return '☁️';
  if (code === 45 || code === 48) return '🌫️';
  if (code >= 51 && code <= 55) return '🌦️';
  if (code >= 61 && code <= 65) return '🌧️';
  if (code >= 71 && code <= 77) return '❄️';
  if (code >= 80 && code <= 82) return '🌧️';
  if (code >= 95) return '⛈️';
  return '🌤️';
}

export interface NextPrayerStatus {
  name: string;
  time: string;
  countdownText: string;
  minutesRemaining: number;
  isPrayerMomentNow: boolean; // True selama 5 menit sejak waktu shalat masuk
}

export function getNextPrayerStatus(
  schedule: PrayerSchedule,
  now: Date = new Date(),
  lang: 'en' | 'id' = 'id'
): NextPrayerStatus {
  const isEn = lang === 'en';
  const prayers: Array<{ name: string; time: string }> = [
    { name: isEn ? 'Fajr' : 'Subuh', time: schedule.Fajr },
    { name: isEn ? 'Dhuhr' : 'Dzuhur', time: schedule.Dhuhr },
    { name: isEn ? 'Asr' : 'Ashar', time: schedule.Asr },
    { name: 'Maghrib', time: schedule.Maghrib },
    { name: isEn ? 'Isha' : 'Isya', time: schedule.Isha },
  ];

  const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

  // Cek apakah saat ini baru saja masuk waktu shalat (0 - 5 menit setelah masuk waktu)
  for (const p of prayers) {
    const [h, m] = p.time.split(':').map(Number);
    const pSec = h * 3600 + m * 60;
    const diff = nowSec - pSec;
    if (diff >= 0 && diff <= 300) {
      return {
        name: p.name,
        time: p.time,
        countdownText: isEn ? 'Prayer Time Now' : 'Waktu Shalat Tiba',
        minutesRemaining: 0,
        isPrayerMomentNow: true,
      };
    }
  }

  for (const p of prayers) {
    const [h, m] = p.time.split(':').map(Number);
    const pSec = h * 3600 + m * 60;
    if (pSec > nowSec) {
      const remSec = pSec - nowSec;
      return {
        name: p.name,
        time: p.time,
        countdownText: formatCountdown(remSec, isEn),
        minutesRemaining: Math.ceil(remSec / 60),
        isPrayerMomentNow: false,
      };
    }
  }

  // Jika sudah lewat Isya, hitung mundur ke Subuh besok
  const [fh, fm] = schedule.Fajr.split(':').map(Number);
  const fajrTomorrowSec = 24 * 3600 - nowSec + (fh * 3600 + fm * 60);
  return {
    name: isEn ? 'Fajr' : 'Subuh',
    time: schedule.Fajr,
    countdownText: formatCountdown(fajrTomorrowSec, isEn),
    minutesRemaining: Math.ceil(fajrTomorrowSec / 60),
    isPrayerMomentNow: false,
  };
}

function formatCountdown(totalSec: number, isEn = false): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `-${h}${isEn ? 'h' : 'j'} ${String(m).padStart(2, '0')}m`;
  }
  return `-${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

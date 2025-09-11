/**
 * Fetch JSON from a URL.
 * @param {string} url - The endpoint to request.
 * @returns {Promise<any>} Resolves with parsed JSON, rejects on error.
 *
 * What's going on here?  Radio Caroline has 2 interesting json feeds.
 * I don't want to alter my existing tools to handle 2 feeds, so this is separate.
 *
 */
async function fetchJson(url) {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      cache: 'no-store' // avoid cached responses
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (err) {
    console.error('fetchJson error:', err);
    throw err;
  }
}


function getCurrentShowName(scheduleJson) {
  const tz = 'Europe/London';

  // ---- helpers: UK calendar parts & minutes since midnight
  function ukParts(d = new Date()) {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false,
      weekday: 'long'
    }).formatToParts(d);
    const m = Object.fromEntries(parts.map(p => [p.type, p.value]));
    return {
      year: +m.year, month: +m.month, day: +m.day,
      hour: +m.hour, minute: +m.minute,
      weekday: m.weekday.toLowerCase() // "monday"...
    };
  }

  function minutesSinceMidnightUK() {
    const { hour, minute } = ukParts();
    return hour * 60 + minute;
  }

  const WEEKDAYS = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];

  // ---- compute the key for the *previous Monday* in UK calendar
  const now = new Date();
  const nowUK = ukParts(now);
  const weekdayIdx = WEEKDAYS.indexOf(nowUK.weekday); // 0..6
  const daysSinceMonday = (weekdayIdx + 6) % 7;       // 0 if Monday, 1 if Tuesday, ...

  // Build a date for UK "today 00:00", then subtract daysSinceMonday
  // We use UTC date construction to avoid local TZ affecting calendar math.
  const todayMidUTC = Date.UTC(nowUK.year, nowUK.month - 1, nowUK.day); // 00:00 of the UK calendar day, in UTC
  const prevMondayUTC = new Date(todayMidUTC - daysSinceMonday * 86400000);
  const key = `${prevMondayUTC.getUTCDate()}_${prevMondayUTC.getUTCMonth()+1}_${prevMondayUTC.getUTCFullYear()}`;

  const week = scheduleJson?.schedules?.[key];
  if (!week) return null;

  // Get today's schedule array (e.g., week["monday"])
  let dayName = nowUK.weekday; // "monday"
  let slots = Array.isArray(week[dayName]) ? week[dayName] : null;
  if (!slots || !slots.length) return null;

  const nowMin = minutesSinceMidnightUK();
  const toMin = (t) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  // Find slot where start <= now < nextStart
  let idx = -1;
  for (let i = 0; i < slots.length; i++) {
    const start = toMin(slots[i].time);
    const next = (i + 1 < slots.length) ? toMin(slots[i + 1].time) : 24 * 60 + 1;
    if (nowMin >= start && nowMin < next) { idx = i; break; }
  }

  // Boundary cases:
  if (idx === -1) {
    // If after the last slot of the day, take the last slot of today
    if (nowMin >= toMin(slots[slots.length - 1].time)) {
      idx = slots.length - 1;
    } else {
      // If before the first slot (e.g., 00:00 is later than first?),
      // fall back to previous day's last slot within the same week
      const prevIdx = (weekdayIdx + 6) % 7;
      const prevDayName = WEEKDAYS[prevIdx];
      const prevSlots = week[prevDayName];
      if (Array.isArray(prevSlots) && prevSlots.length) {
        dayName = prevDayName;
        slots = prevSlots;
        idx = prevSlots.length - 1;
      }
    }
  }

  return (idx >= 0 && slots[idx]) ? (slots[idx].showname || null) : null;
}

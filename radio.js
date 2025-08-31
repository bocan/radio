let hls = null; // hls.js instance when using HLS
let sse = null;

/**
 * Define your stations here. Each station can provide multiple stream URLs (different codecs/bitrates)
 * The first working one will be used.
 * Optionally provide a metadataUrl and a custom parser (parseNowPlaying) if the host exposes a JSON endpoint
 * (e.g. Icecast at /status-json.xsl). Without it, we fall back to the station name.
 */
const STATIONS = [
  {
    id: 'groove-salad',
    name: 'SomaFM: Groove Salad',
    location: 'San Francisco, California',
   description: '<a href="https://somafm.com/" target=_blank>SomaFM</a> is a trailblazing commercial-free, listener-supported internet radio broadcaster based in San Francisco with a diverse catalog including ambient, downtempo, IDM, world beats, and more—often spotlighting indie and unsigned artists.',
    streams: [
      { url: 'https://ice1.somafm.com/groovesalad-256-mp3', type: 'audio/mpeg' },
      { url: 'https://ice2.somafm.com/groovesalad-256-mp3', type: 'audio/mpeg' }
    ],
    // Example metadata endpoint (may be CORS-restricted):
    metadataUrl: 'https://somafm.com/songs/groovesalad.json',
    parseNowPlaying: (data) => {
      const s = Array.isArray(data?.songs) ? data.songs[0] : null;
      if (!s) return null;
      const artist = (s.artist || '').trim();
      const title  = (s.title  || '').trim();
      const album  = (s.album  || '').trim();
      // Show "Artist — Title" if both exist, else whichever we have
      return (artist && title) ? `${artist} — ${title}, from ${album}` : (title || artist || null);
    }
  },

  {
    id: 'radioxclassicrock',
    name: 'Radio X Classic Rock',
    location: 'United Kingdom',
   description: "<a href='https://www.radiox.co.uk/classic-rock/' target=_blank>Radio X</a> Classic Rock is a national digital radio station in the UK, launched in February 2023. It's dedicated to the greatest rock music of all time!",
    streams: [
      { url: 'https://media-ice.musicradio.com/RadioXClassicRockMP3', type: 'audio/mpeg' }
    ],
    metadataUrl: 'https://scraper2.onlineradiobox.com/uk.xclassicrock?l=0',
    parseNowPlaying: (data) => {
      if (!data) return null;
      const artist = (data.iArtist || '').trim();
      const track  = (data.iName   || data.title || '').trim();
      return (artist && track) ? `${artist} — ${track}` : (data.title || null);
    }
  },




  {
    id: 'nightride',
    name: 'Nightride FM (Synthwave)',
    location: 'Global',
   description: '<a href="https://nightride.fm/" target=_blank>Nightride FM</a> is an independent, community-driven radio station and digital platform specialising in synthwave and adjacent genres. It delivers 24/7 high-quality, ad-free streaming across multiple curated sub-stations.',
    streams: [
      { url: 'https://stream.nightride.fm/nightride.mp3', type: 'audio/mpeg' }
    ],
    metadataUrl: 'https://nightride.fm/meta',
    metadataFormat: 'sse',
    parseNowPlaying: (obj) => {
      const artist = (obj.artist || '').trim();
      const title  = (obj.title  || '').trim();
      return (artist && title) ? `${artist} — ${title}` : (title || artist || null);
    }
  },

  {
    id: 'KUTX',
    name: 'KUTX 98.9 FM',
    location: 'Austin, Texas',
    description: "<a href='https://kutx.org/' target=_blank>KUTX</a> is deeply rooted in the Austin music scene. The on-air hosts handpick music with a collaborative editorial slant to highlight the city’s creative heartbeat—ranging from indie rock and hip-hop to electronica, outlaw country, jazz, blues, and psych-metal",
    streams: [
      { url: 'https://streams.kut.org/4428_192.mp3', type: 'audio/mpeg' }
    ],
    metadataUrl: 'https://api.composer.nprstations.org/v1/widget/50ef24ebe1c8a1369593d032/now?format=json',
    parseNowPlaying: (data) => {
      // NPR widget shape: { onNow: { song: { trackName, artistName, ... } } }
      const s = data?.onNow?.song;
      if (!s) return null;
      const artist = (s.artistName || '').trim();
      const title  = (s.trackName  || '').trim();
      if (artist && title) return `${artist} — ${title}`;
      return title || artist || null; // fallback if one is missing
    }
  },

  {
    id: 'WWOZ',
    name: 'WWOZ 90.7 FM',
    location: 'New Orleans, Louisiana',
    description: "<a href='https://www.wwoz.org/' target=_blank>WWOZ</a> 99.7 FM is the New Orleans Jazz and Heritage Station, a community radio station currently operating out of the French Quarter in New Orleans.",
    streams: [
      { url: 'https://wwoz-sc.streamguys1.com/wwoz-hi.mp3', type: 'audio/mpeg' } 
    ],
    metadataUrl: 'https://chris.funderburg.me/proxy/wwoz', // I proxy 'https://www.wwoz.org/api/tracks/current',
    parseNowPlaying: (data) => {
      if (!data) return null;
      const artist = (data.artist || '').trim();
      const track  = (data.song   || '').trim();
      if (artist && track) return `${artist} — ${track}`;
      return data.title || null;
    }
  },

  {
    id: 'thelot',
    name: 'The Lot Radio',
    location: 'New York City',
    description: "<a href='https://www.thelotradio.com/' target=_blank>The Lot Radio</a> is an independent, non-profit, online radio station live streaming 24/7 from a reclaimed shipping container on an empty lot in NYC. Expect a continuous stream of the best and most varied music New York City has to offer.",
    streams: [
      { url: 'https://livepeercdn.studio/hls/85c28sa2o8wppm58/index.m3u8', type: 'application/vnd.apple.mpegurl' }
    ]
  },

  {
    id: 'radiofreenash',
    name: 'Radio Free Nashville',
    location: 'Nashville, Tennessee',
    description: "<a href='https://www.radiofreenashville.org' target=_blank>Radio Free Nashville</a> is a true community radio station, completely locally owned and operated by volunteers from the Nashville and Middle Tennessee community. Local people create programming, design events, and keep the station up and running and on the air. ",
    streams: [
      { url: 'https://ice23.securenetsystems.net/WRFNLP', type: 'audio/aac' }
    ],
    metadataFormat: 'xml',  // 'xml' | 'json' (default json if omitted)
    metadataUrl: 'https://streamdb8web.securenetsystems.net/player_status_update/WRFNLP.xml',
    parseNowPlaying: (xmlText) => {
      const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
      // Basic error check
      if (doc.querySelector('parsererror')) return null;

      const pick = (tag) => (doc.querySelector(tag)?.textContent || '').trim();
      const title  = pick('title');
      const artist = pick('artist');

      if (artist && title) return `${artist} — ${title}`;
      return title || artist || null;
    }
  },

  {
    id: 'kennetradio',
    name: 'Kennet Radio',
    location: 'Newbury, United Kingdom',
    description: "<a href='https://kennetradio.com/' target=_blank>Kennet Radio</a> is my local community radio station, broadcasting 24/7/365 on 106.7 FM to Newbury and Thatcham. Formed in October 2012 as a not-for-profit, volunteer-led organisation, they were awarded a full-time FM Community Radio broadcasting licence by Ofcom in 2016 and have been broadcasting on FM since March 2018.",
    streams: [
      { url: 'https://stream.kennetradio.com/128.mp3', type: 'audio/aac' }
    ],
    metadataFormat: 'text',
    metadataUrl: 'https://kennet.redio.co/hooks/get/y525gyrvtt',
    parseNowPlaying: (text) => {
      if (typeof text !== 'string') return null;
      const parts = text.split(/\s*-\s*/, 2); // split into at most 2 pieces
      const artist = (parts[0] || '').trim();
      const title  = (parts[1] || '').trim();
      if (artist && title) return `${artist} — ${title}`;
      return text.trim() || null; // fallback if format is odd
    }
  }
];

// --- App State ---
const els = {
  list: document.getElementById('stations'),
  audio: document.getElementById('audio'),
  btnPlay: document.getElementById('btnPlay'),
  icoPlay: document.getElementById('icoPlay'),
  icoPause: document.getElementById('icoPause'),
  volume: document.getElementById('volume'),
  nowPlaying: document.getElementById('nowPlaying')
};

let currentStation = null;
let metaTimer = null;

// Restore persisted settings
const savedVol = localStorage.getItem('ir_volume');
els.volume.value = savedVol !== null ? savedVol : 0.8;
els.audio.volume = parseFloat(els.volume.value);

const savedStationId = localStorage.getItem('ir_last_station');

// Render station cards
function renderStations(){
  els.list.innerHTML = '';
  STATIONS.forEach(st => {
    const card = document.createElement('button');
    card.className = 'card';
    card.setAttribute('role','listitem');
    card.setAttribute('aria-label', `${st.name} — ${st.location}`);
    card.innerHTML = `
      <div class="badge">${st.location}</div>
      <div class="title">${st.name}</div>
      <div class="desc">${st.description}</div>
    `;
    card.addEventListener('click', () => startStation(st));
    card.id = `station-${st.id}`;
    els.list.appendChild(card);
  });
}

function markActive(){
  document.querySelectorAll('.card').forEach(c => c.classList.remove('active'));
  if(currentStation){
    const el = document.getElementById(`station-${currentStation.id}`);
    if(el) el.classList.add('active');
  }
}

async function startStation(station){

  currentStation = station;
  localStorage.setItem('ir_last_station', station.id);
  markActive();

  // Stop metadata polling
  if (metaTimer) { clearInterval(metaTimer); metaTimer = null; }
  if (sse) {
    try { sse.close(); } catch {}
    sse = null;
  }

  // Tear down any previous HLS instance
  if (hls) { try { hls.destroy(); } catch {} hls = null; }

  // Pause & clear the audio element so we don't overlap
  els.audio.pause();
  els.audio.removeAttribute('src');
  try { els.audio.load(); } catch {}

  // Pick first compatible source (by MIME type) OR just use first if none specify type
  const source = (station.streams || []).find(s => !s.type || els.audio.canPlayType(s.type)) || station.streams?.[0];
  if (!source) {
    alert('No compatible stream for this browser.');
    return;
  }

  const isHls = /m3u8|application\/(x-)?mpegurl|application\/vnd\.apple\.mpegurl/i.test(source.type || source.url);

  if (isHls) {
    // Safari can sometimes play HLS natively (usually <video>, sometimes <audio> too).
    if (els.audio.canPlayType('application/vnd.apple.mpegurl')) {
      els.audio.src = source.url;
    } else if (window.Hls && Hls.isSupported()) {
      // Use hls.js for Chrome/Firefox/Edge
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        // If the master has audio-only renditions, hls.js will expose them in audioTracks
        // You can also cap to lowest level to save bandwidth:
        // capLevelToPlayerSize: true,
      });
      hls.loadSource(source.url);
      hls.attachMedia(els.audio);

      hls.on(Hls.Events.ERROR, (_evt, data) => {
        if (data?.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              try { hls.destroy(); } catch {}
              hls = null;
          }
        }
      });

      // Optional: pick first audio-only track if present
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        // If alternate audio tracks exist, pick the first (or English)
        const a = hls.audioTracks || [];
        const eng = a.find(t => /en/i.test(t.name || t.lang || ''));
        if (eng) hls.audioTrack = eng.id;
        // Auto-play (user gesture likely present because you clicked a card)
        els.audio.play().catch(()=>{});
      });
    } else {
      alert('HLS is not supported in this browser.');
      return;
    }
  } else {
    // Plain MP3/AAC stream
    els.audio.src = source.url;
  }

  // Kick off playback (OK if it races with HLS manifest parsed)
  els.audio.play().catch(err => console.warn('Autoplay blocked or play failed:', err));
  setPlayIcon(true);

  // UI text
  els.nowPlaying.textContent = `${station.name}`;

  // Media Session
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: station.name,
      artist: station.location,
      album: 'Live Radio',
    });
    navigator.mediaSession.setActionHandler('play', () => els.audio.play());
    navigator.mediaSession.setActionHandler('pause', () => els.audio.pause());
  }

  // Metadata polling if configured
  if (station.metadataUrl) {
    // SSE path
    if (station.metadataFormat === 'sse' && 'EventSource' in window) {
      sse = new EventSource(station.metadataUrl, { withCredentials: false });
      sse.onmessage = (ev) => {
        try {
          const arr = JSON.parse(ev.data);          // ev.data is the JSON after "data: "
          const item = Array.isArray(arr) ? arr[0] : null;
          if (!item) return;
          if (item.station && item.station.toLowerCase() !== 'nightride') return; // keep only the nightride line
          const title = station.parseNowPlaying ? station.parseNowPlaying(item) : null;
          if (title) {
            els.nowPlaying.textContent = title;
            if ('mediaSession' in navigator) {
              navigator.mediaSession.metadata = new MediaMetadata({
                title, artist: station.name, album: station.location
              });
            }
          }
        } catch (_) {}
      };
      sse.onerror = () => { /* network hiccup; browser auto-reconnects */ };
  } else {
    const poll = async () => {
      try {
        const res = await fetch(station.metadataUrl, { cache: 'no-store' });
        if (!res.ok) throw new Error('HTTP ' + res.status);

        const ctype = (res.headers.get('content-type') || '').toLowerCase();

        // Decide payload format:
        const wantsXml = station.metadataFormat === 'xml'
          || /(^|\/)(xml|html)\b/.test(ctype)           // application/xml, text/xml, text/html (some servers lie)
          || /text\/plain/.test(ctype) && station.metadataFormat === 'xml';

        const payload = wantsXml ? await res.text() : await res.json();

        // Let each station's parser handle its own shape
        const title = station.parseNowPlaying ? station.parseNowPlaying(payload) : null;

        if (title) {
          els.nowPlaying.textContent = title;
          if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
              title,
              artist: station.name,
              album: station.location
            });
          }
        }
      } catch (e) {
        // quietly ignore CORS/HTTP/parse issues
      }
    };
    poll();
    metaTimer = setInterval(poll, 12000);
  }

  }

}


function setPlayIcon(isPlaying){
  els.icoPlay.style.display = isPlaying ? 'none' : '';
  els.icoPause.style.display = isPlaying ? '' : 'none';
}

// Controls
els.btnPlay.addEventListener('click', () => {
  if(els.audio.paused){ els.audio.play(); }
  else { els.audio.pause(); }
});

els.audio.addEventListener('play', () => setPlayIcon(true));
els.audio.addEventListener('pause', () => setPlayIcon(false));

els.volume.addEventListener('input', (e) => {
  els.audio.volume = parseFloat(e.target.value);
  localStorage.setItem('ir_volume', e.target.value);
});

// Keyboard shortcuts
window.addEventListener('keydown', (e) => {
  if(e.code === 'Space'){
    e.preventDefault();
    if(els.audio.paused) els.audio.play(); else els.audio.pause();
  } else if(e.code === 'ArrowRight'){
    els.volume.value = Math.min(1, parseFloat(els.volume.value) + 0.05);
    els.volume.dispatchEvent(new Event('input'));
  } else if(e.code === 'ArrowLeft'){
    els.volume.value = Math.max(0, parseFloat(els.volume.value) - 0.05);
    els.volume.dispatchEvent(new Event('input'));
  }
});

// Initial render
renderStations();

// Auto-start last station if saved
const defaultStation = STATIONS.find(s => s.id === savedStationId) || STATIONS[0];
if(defaultStation) startStation(defaultStation);

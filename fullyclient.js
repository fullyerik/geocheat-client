// ==UserScript==
// @name         FULLY Client v3.2
// @namespace    http://tampermonkey.net/
// @version      3.2
// @description  GeoGuessr location resolver – basiert auf dem originalen XHR-Interceptor
// @author       nerdyass
// @match        https://www.geoguessr.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=geoguessr.com
// @run-at       document-start
// @grant        none
// ==/UserScript==

/* =========================================================
   XHR INTERCEPTOR – genau wie das Original-Script
   Fängt POST-Requests an GetMetadata + SingleImageSearch ab
   ========================================================= */
var originalOpen = XMLHttpRequest.prototype.open;

XMLHttpRequest.prototype.open = function(method, url) {
    if (method.toUpperCase() === 'POST' && (
        url.startsWith('https://maps.googleapis.com/$rpc/google.internal.maps.mapsjs.v1.MapsJsInternalService/GetMetadata') ||
        url.startsWith('https://maps.googleapis.com/$rpc/google.internal.maps.mapsjs.v1.MapsJsInternalService/SingleImageSearch')
    )) {
        this.addEventListener('load', function() {
            try {
                const iR = this.responseText;

                // Koordinaten per Regex extrahieren
                const coordPattern = /-?\d+\.\d+,-?\d+\.\d+/g;
                const matches = iR.match(coordPattern);
                if (!matches || matches.length === 0) return;

                const split = matches[0].split(',');
                const lat = parseFloat(split[0]);
                const lng = parseFloat(split[1]);

                if (!lat || !lng) return;

                // Adresse per Regex extrahieren
                const addressPattern = /\[\["([^"]+)",\s*"en"\],\s*\["([^"]+)",\s*"en"\]\]/;
                const addressMatch = iR.match(addressPattern);
                const address = addressMatch
                    ? `${addressMatch[1]}, ${addressMatch[2]}`
                    : null;

                updateUI(lat, lng, address);
            } catch(e) {
                console.log('[FULLY] XHR parse error:', e);
            }
        });
    }
    return originalOpen.apply(this, arguments);
};

/* =========================================================
   GLOBAL STATE
   ========================================================= */
let gC = { lat: 0, lng: 0 };
let isVisible    = false;
let isMinimized  = false;
let roundHistory = [];
let currentZoom  = 4;
let lastAddrFetch= 0;

/* =========================================================
   STYLES
   ========================================================= */
const STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;700&family=JetBrains+Mono:wght@400;600&display=swap');

  #fullyClient {
    position: fixed; top: 80px; left: 80px; width: 360px; min-height: 60px;
    background: linear-gradient(160deg, #0a0f1e 0%, #050810 100%);
    border: 1px solid rgba(30,100,255,0.4); border-radius: 10px;
    box-shadow: 0 0 0 1px rgba(30,100,255,0.1), 0 0 30px rgba(20,80,255,0.15),
      0 20px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05);
    z-index: 10000; cursor: move; font-family: 'JetBrains Mono', monospace;
    color: #c8d8ff; overflow: hidden; resize: both;
    box-sizing: border-box; user-select: none; display: none;
  }
  #fullyClient::before {
    content: ''; position: absolute; inset: 0; pointer-events: none; z-index: 0; border-radius: 10px;
    background: repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(10,30,80,0.08) 3px,rgba(10,30,80,0.08) 4px);
  }

  #fullyHeader {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 16px; border-bottom: 1px solid rgba(30,100,255,0.2);
    background: linear-gradient(90deg, rgba(20,60,180,0.2) 0%, transparent 100%);
    position: relative; z-index: 1;
  }
  #fullyLogo {
    font-family: 'Rajdhani', sans-serif; font-size: 20px; font-weight: 700;
    letter-spacing: 3px; color: #4d8eff;
    text-shadow: 0 0 8px rgba(77,142,255,0.8), 0 0 20px rgba(77,142,255,0.4);
  }
  #fullyLogo span { color: #a0c0ff; font-weight: 500; }
  #fullySubtitle { font-size: 8px; letter-spacing: 2px; color: rgba(77,142,255,.4); }

  .fhbtns { display: flex; gap: 6px; }
  .fhbtn {
    background: rgba(30,70,180,0.2); border: 1px solid rgba(30,100,255,0.3);
    color: #6090e0; width: 26px; height: 26px; border-radius: 5px;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; font-size: 13px; transition: all 0.15s;
  }
  .fhbtn:hover { background: rgba(40,100,255,0.3); color: #a0c4ff; border-color: rgba(60,140,255,0.6); }

  #fullyBody {
    padding: 14px 16px; position: relative; z-index: 1;
    display: flex; flex-direction: column; gap: 10px;
  }

  .slabel { font-size: 9px; letter-spacing: 2px; text-transform: uppercase; color: rgba(77,142,255,0.6); margin-bottom: 4px; }

  .flag-row { display: flex; align-items: center; }
  #fullyFlag { font-size: 26px; }
  #fullyCountry { font-size: 11px; color: #6090d0; margin-left: 6px; font-family: 'Rajdhani', sans-serif; font-weight: 500; letter-spacing: 1px; }

  #fullyAddress {
    font-size: 12px; color: #8fb0ff; line-height: 1.5; padding: 8px 10px; margin-top: 6px;
    background: rgba(20,50,140,0.2); border-radius: 6px;
    border-left: 2px solid rgba(60,120,255,0.4); word-break: break-word;
  }

  #fullyCoords { font-size: 11px; color: #4d7ee0; line-height: 1.8; letter-spacing: 0.5px; }
  #fullyCoords b { color: #a0c4ff; font-weight: 600; }

  .act-row { display: flex; gap: 6px; }
  .act-btn {
    flex: 1; padding: 7px 10px; background: rgba(20,60,160,0.25);
    border: 1px solid rgba(40,100,255,0.3); border-radius: 6px; color: #7aabff;
    font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.5px;
    cursor: pointer; text-align: center; transition: all 0.15s; text-decoration: none;
    display: flex; align-items: center; justify-content: center; gap: 5px;
  }
  .act-btn:hover { background: rgba(40,100,255,0.35); border-color: rgba(77,142,255,0.6); color: #c0d8ff; }
  .act-btn.ok { background: rgba(0,200,80,0.15); border-color: rgba(0,220,80,0.4); color: #60ffaa; }

  .zoom-row { display: flex; align-items: center; gap: 8px; }
  .zoom-row label { font-size: 9px; letter-spacing: 1.5px; text-transform: uppercase; color: rgba(77,142,255,0.5); white-space: nowrap; }
  #fullyZoom { flex: 1; -webkit-appearance: none; height: 3px; background: rgba(30,80,200,0.3); border-radius: 2px; outline: none; cursor: pointer; }
  #fullyZoom::-webkit-slider-thumb { -webkit-appearance: none; width: 12px; height: 12px; background: #4d8eff; border-radius: 50%; box-shadow: 0 0 6px rgba(77,142,255,0.6); }
  #fullyZoomVal { font-size: 10px; color: #4d7ee0; width: 14px; text-align: right; }

  #fullyMap { border-radius: 7px; overflow: hidden; border: 1px solid rgba(30,100,255,0.25); margin-top: 8px; }
  #fullyMap iframe { display: block; width: 100%; height: 220px; border: none; }

  #fullyHistory {
    max-height: 130px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px;
    scrollbar-width: thin; scrollbar-color: rgba(40,100,255,0.3) transparent;
  }
  .hist-item {
    padding: 6px 10px; background: rgba(15,40,120,0.2); border-radius: 5px;
    border-left: 2px solid rgba(40,100,200,0.3); font-size: 10px; color: #5878c0;
    cursor: pointer; transition: all 0.1s; line-height: 1.5;
  }
  .hist-item:hover { background: rgba(30,70,180,0.3); color: #8aabf0; border-left-color: rgba(77,142,255,0.6); }
  .hist-addr { color: #7090d0; font-size: 9px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; }

  #fullyFooter {
    padding: 8px 16px; border-top: 1px solid rgba(30,100,255,0.1); font-size: 9px;
    letter-spacing: 1px; color: rgba(60,100,180,0.5);
    display: flex; justify-content: space-between; position: relative; z-index: 1;
  }
  .divider { height: 1px; background: linear-gradient(90deg,transparent,rgba(40,100,255,0.2),transparent); margin: 0 -16px; }

  #fullyClient.minimized #fullyBody, #fullyClient.minimized #fullyFooter { display: none; }
  #fullyClient.minimized { resize: none; min-height: unset; }

  #fullyToggleBtn {
    position: fixed; bottom: 24px; right: 24px; width: 44px; height: 44px; border-radius: 50%;
    background: #0a0f1e; border: 1.5px solid rgba(77,142,255,0.7);
    box-shadow: 0 0 12px rgba(77,142,255,0.5), 0 4px 12px rgba(0,0,0,0.6);
    color: #4d8eff; font-family: 'Rajdhani', sans-serif; font-size: 20px; font-weight: 700;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; z-index: 10001; transition: all 0.2s; user-select: none;
  }
  #fullyToggleBtn:hover { background: #101a2a; border-color: #7aabff; box-shadow: 0 0 20px rgba(77,142,255,0.8); color: #a0c4ff; }
  #fullyToggleBtn:active { transform: scale(0.95); }
`;

/* =========================================================
   UI AUFBAUEN
   ========================================================= */
function buildUI() {
    const s = document.createElement('style');
    s.textContent = STYLE;
    document.head.appendChild(s);

    const box = document.createElement('div');
    box.id = 'fullyClient';
    box.innerHTML = `
      <div id="fullyHeader">
        <div>
          <div id="fullyLogo">FULLY <span>CLIENT</span></div>
          <div id="fullySubtitle">GEOGUESSR v3.2</div>
        </div>
        <div class="fhbtns">
          <div class="fhbtn" id="fMin">—</div>
          <div class="fhbtn" id="fClose">✕</div>
        </div>
      </div>

      <div id="fullyBody">
        <div>
          <div class="slabel">Location</div>
          <div class="flag-row">
            <span id="fullyFlag">🌐</span>
            <span id="fullyCountry">—</span>
          </div>
          <div id="fullyAddress">Waiting for round...</div>
        </div>

        <div class="divider"></div>
        <div>
          <div class="slabel">Coordinates</div>
          <div id="fullyCoords">—</div>
        </div>

        <div class="divider"></div>
        <div class="act-row">
          <button class="act-btn" id="btnCopy">📋 Copy Coords</button>
          <a class="act-btn" id="btnSV" target="_blank" href="#">🔗 Street View</a>
        </div>

        <div class="divider"></div>
        <div>
          <div class="zoom-row">
            <label>MAP ZOOM</label>
            <input type="range" id="fullyZoom" min="1" max="18" value="4">
            <span id="fullyZoomVal">4</span>
          </div>
          <div id="fullyMap">
            <div style="height:220px;display:flex;align-items:center;justify-content:center;color:rgba(60,100,180,.4);font-size:11px;letter-spacing:2px">NO DATA YET</div>
          </div>
        </div>

        <div class="divider"></div>
        <div>
          <div class="slabel">Round History</div>
          <div id="fullyHistory">
            <div style="font-size:10px;color:rgba(60,100,180,.4);letter-spacing:1px">No rounds yet.</div>
          </div>
        </div>
      </div>

      <div id="fullyFooter">
        <span>FULLY CLIENT v3.2</span>
        <span>nerdyass industries</span>
      </div>
    `;
    document.body.appendChild(box);

    const toggleBtn = document.createElement('div');
    toggleBtn.id = 'fullyToggleBtn';
    toggleBtn.textContent = 'F';
    document.body.appendChild(toggleBtn);

    bindEvents(box, toggleBtn);
}

/* =========================================================
   EVENTS
   ========================================================= */
function bindEvents(box, toggleBtn) {
    toggleBtn.addEventListener('click', () => {
        const v = box.style.display === 'block';
        box.style.display = v ? 'none' : 'block';
        toggleBtn.textContent = v ? 'F' : '✕';
        isVisible = !v;
    });

    document.getElementById('fullyHeader').addEventListener('mousedown', dragStart);

    document.getElementById('fMin').addEventListener('click', e => {
        e.stopPropagation();
        isMinimized = !isMinimized;
        box.classList.toggle('minimized', isMinimized);
        document.getElementById('fMin').textContent = isMinimized ? '▢' : '—';
    });

    document.getElementById('fClose').addEventListener('click', e => {
        e.stopPropagation();
        box.style.display = 'none';
        toggleBtn.textContent = 'F';
        isVisible = false;
    });

    document.getElementById('btnCopy').addEventListener('click', () => {
        if (!gC.lat && !gC.lng) return;
        navigator.clipboard.writeText(`${gC.lat.toFixed(6)}, ${gC.lng.toFixed(6)}`).then(() => {
            const b = document.getElementById('btnCopy');
            b.textContent = '✓ Copied!'; b.classList.add('ok');
            setTimeout(() => { b.textContent = '📋 Copy Coords'; b.classList.remove('ok'); }, 1500);
        });
    });

    document.getElementById('fullyZoom').addEventListener('input', e => {
        currentZoom = parseInt(e.target.value);
        document.getElementById('fullyZoomVal').textContent = currentZoom;
        if (gC.lat || gC.lng) renderMap(gC.lat, gC.lng);
    });

    document.addEventListener('keydown', e => {
        if ((e.key === 't' || e.key === 'T') && !e.target.matches('input, textarea')) {
            isVisible = !isVisible;
            box.style.display = isVisible ? 'block' : 'none';
            toggleBtn.textContent = isVisible ? '✕' : 'F';
        }
    });
}

/* =========================================================
   DRAG
   ========================================================= */
let dX = 0, dY = 0;
function dragStart(e) {
    if (e.target.closest('.fhbtn')) return;
    e.preventDefault();
    const b = document.getElementById('fullyClient');
    dX = e.clientX - b.offsetLeft; dY = e.clientY - b.offsetTop;
    document.addEventListener('mousemove', dragMove);
    document.addEventListener('mouseup', dragEnd);
}
function dragMove(e) {
    const b = document.getElementById('fullyClient');
    b.style.left = (e.clientX - dX) + 'px';
    b.style.top  = (e.clientY - dY) + 'px';
}
function dragEnd() {
    document.removeEventListener('mousemove', dragMove);
    document.removeEventListener('mouseup', dragEnd);
}

/* =========================================================
   UI AKTUALISIEREN
   ========================================================= */
function renderMap(lat, lng) {
    document.getElementById('fullyMap').innerHTML =
        `<iframe src="https://maps.google.com/maps?q=${lat},${lng}&z=${currentZoom}&output=embed" allowfullscreen></iframe>`;
}

function addHistory(lat, lng, address) {
    roundHistory.unshift({ lat, lng, address, time: new Date().toLocaleTimeString() });
    if (roundHistory.length > 10) roundHistory.pop();
    document.getElementById('fullyHistory').innerHTML = roundHistory.map((r, i) => `
        <div class="hist-item" onclick="window._fcJump(${i})">
          <span class="hist-addr">${r.address || 'Unknown Address'}</span>
          ${r.lat.toFixed(4)}, ${r.lng.toFixed(4)} · <span style="color:#354880">${r.time}</span>
        </div>
    `).join('');
}
window._fcJump = i => { const r = roundHistory[i]; if (r) renderMap(r.lat, r.lng); };

async function updateUI(lat, lng, addressFromXHR) {
    gC.lat = lat; gC.lng = lng;

    document.getElementById('fullyCoords').innerHTML =
        `<b>LAT</b> ${lat.toFixed(6)}<br><b>LNG</b> ${lng.toFixed(6)}`;
    document.getElementById('btnSV').href =
        `https://www.google.com/maps?q=&layer=c&cbll=${lat},${lng}`;

    renderMap(lat, lng);

    // Sofort XHR-Adresse zeigen falls vorhanden
    if (addressFromXHR) {
        document.getElementById('fullyAddress').textContent = addressFromXHR;
    } else {
        document.getElementById('fullyAddress').textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }

    // Nominatim für Flag + genaue Adresse (non-blocking)
    fetchAddressAndFlag(lat, lng).then(d => {
        if (!d) return;
        document.getElementById('fullyFlag').textContent = d.flag;
        document.getElementById('fullyCountry').textContent = d.country;
        document.getElementById('fullyAddress').textContent = d.address;
        addHistory(lat, lng, d.address);
    }).catch(() => {
        addHistory(lat, lng, addressFromXHR || null);
    });

    // History sofort mit vorläufiger Adresse eintragen
    addHistory(lat, lng, addressFromXHR || `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
}

async function fetchAddressAndFlag(lat, lng) {
    const now = Date.now();
    if (now - lastAddrFetch < 1200) return null;
    lastAddrFetch = now;

    // Nominatim versuchen
    try {
        const r = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
            { headers: { 'Accept-Language': 'en' }, signal: AbortSignal.timeout(5000) }
        );
        const d = await r.json();
        const code = d?.address?.country_code?.toUpperCase() || '';
        const flag = code
            ? [...code].map(c => String.fromCodePoint(c.charCodeAt(0) + 127397)).join('')
            : '🌐';
        return {
            address: d?.display_name || 'No address found',
            flag,
            country: d?.address?.country || '—',
            code
        };
    } catch {
        // Fallback: BigDataCloud (kein API-Key nötig)
        try {
            const r2 = await fetch(
                `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
            );
            const d2 = await r2.json();
            const code = d2?.countryCode?.toUpperCase() || '';
            const flag = code
                ? [...code].map(c => String.fromCodePoint(c.charCodeAt(0) + 127397)).join('')
                : '🌐';
            const city = d2?.city || d2?.locality || '';
            const country = d2?.countryName || '—';
            return {
                address: city ? `${city}, ${country}` : country,
                flag,
                country,
                code
            };
        } catch { return null; }
    }
}

/* =========================================================
   INIT
   ========================================================= */
(function init() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', buildUI);
    } else {
        buildUI();
    }
})();

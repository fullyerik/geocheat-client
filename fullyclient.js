// ==UserScript==
// @name         FULLY Client v2.5.1
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  GeoGuessr location resolver – stable, with external toggle button
// @author       nerdyass (v3.0)
// @match        https://www.geoguessr.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=geoguessr.com
// @run-at       document-start
// @grant        none
// ==/UserScript==

/* =========================================================
   GLOBAL STATE
   ========================================================= */
let gC = { lat: 0, lng: 0, address: '' };
let isVisible = false;
let isMinimized = false;
let roundHistory = [];
let currentZoom = 4;
let lastAddressFetch = 0;

/* =========================================================
   STYLES
   ========================================================= */
const STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;700&family=JetBrains+Mono:wght@400;600&display=swap');

  /* ===== Panel ===== */
  #fullyClient {
    position: fixed;
    top: 80px;
    left: 80px;
    width: 360px;
    min-height: 60px;
    background: linear-gradient(160deg, #0a0f1e 0%, #050810 100%);
    border: 1px solid rgba(30, 100, 255, 0.4);
    border-radius: 10px;
    box-shadow:
      0 0 0 1px rgba(30, 100, 255, 0.1),
      0 0 30px rgba(20, 80, 255, 0.15),
      0 20px 60px rgba(0,0,0,0.6),
      inset 0 1px 0 rgba(255,255,255,0.05);
    z-index: 10000;
    cursor: move;
    font-family: 'JetBrains Mono', monospace;
    color: #c8d8ff;
    overflow: hidden;
    resize: both;
    box-sizing: border-box;
    user-select: none;
    display: none;
  }

  #fullyClient::before {
    content: '';
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(
      0deg,
      transparent,
      transparent 3px,
      rgba(10, 30, 80, 0.08) 3px,
      rgba(10, 30, 80, 0.08) 4px
    );
    pointer-events: none;
    z-index: 0;
    border-radius: 10px;
  }

  #fullyHeader {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid rgba(30, 100, 255, 0.2);
    background: linear-gradient(90deg, rgba(20,60,180,0.2) 0%, transparent 100%);
    position: relative;
    z-index: 1;
  }

  #fullyLogo {
    font-family: 'Rajdhani', sans-serif;
    font-size: 20px;
    font-weight: 700;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: #4d8eff;
    text-shadow:
      0 0 8px rgba(77, 142, 255, 0.8),
      0 0 20px rgba(77, 142, 255, 0.4);
  }

  #fullyLogo span {
    color: #a0c0ff;
    font-weight: 500;
  }

  .fully-header-btns {
    display: flex;
    gap: 6px;
  }

  .fully-btn-icon {
    background: rgba(30, 70, 180, 0.2);
    border: 1px solid rgba(30, 100, 255, 0.3);
    color: #6090e0;
    width: 26px;
    height: 26px;
    border-radius: 5px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 13px;
    transition: all 0.15s ease;
    line-height: 1;
  }
  .fully-btn-icon:hover {
    background: rgba(40, 100, 255, 0.3);
    color: #a0c4ff;
    border-color: rgba(60, 140, 255, 0.6);
    box-shadow: 0 0 8px rgba(60, 120, 255, 0.3);
  }

  #fullyBody {
    padding: 14px 16px;
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .fully-section-label {
    font-size: 9px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: rgba(77, 142, 255, 0.6);
    margin-bottom: 4px;
  }

  #fullyAddress {
    font-size: 12px;
    color: #8fb0ff;
    line-height: 1.5;
    padding: 8px 10px;
    background: rgba(20, 50, 140, 0.2);
    border-radius: 6px;
    border-left: 2px solid rgba(60, 120, 255, 0.4);
    word-break: break-word;
  }

  #fullyFlag {
    font-size: 28px;
    line-height: 1;
    display: inline-block;
  }

  #fullyCountryName {
    font-size: 11px;
    color: #6090d0;
    margin-left: 6px;
    font-family: 'Rajdhani', sans-serif;
    font-weight: 500;
    letter-spacing: 1px;
  }

  .fully-flag-row {
    display: flex;
    align-items: center;
  }

  #fullyCoords {
    font-size: 11px;
    color: #4d7ee0;
    line-height: 1.8;
    letter-spacing: 0.5px;
  }

  #fullyCoords b {
    color: #a0c4ff;
    font-weight: 600;
  }

  .fully-actions {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .fully-action-btn {
    flex: 1;
    min-width: 80px;
    padding: 7px 10px;
    background: rgba(20, 60, 160, 0.25);
    border: 1px solid rgba(40, 100, 255, 0.3);
    border-radius: 6px;
    color: #7aabff;
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.5px;
    cursor: pointer;
    text-align: center;
    transition: all 0.15s ease;
    text-decoration: none;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
  }
  .fully-action-btn:hover {
    background: rgba(40, 100, 255, 0.35);
    border-color: rgba(77, 142, 255, 0.6);
    color: #c0d8ff;
    box-shadow: 0 0 12px rgba(60, 120, 255, 0.25);
  }
  .fully-action-btn.copied {
    background: rgba(0, 200, 80, 0.15);
    border-color: rgba(0, 220, 80, 0.4);
    color: #60ffaa;
  }

  .fully-zoom-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .fully-zoom-row label {
    font-size: 9px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: rgba(77, 142, 255, 0.5);
    white-space: nowrap;
  }
  #fullyZoomSlider {
    flex: 1;
    -webkit-appearance: none;
    appearance: none;
    height: 3px;
    background: rgba(30, 80, 200, 0.3);
    border-radius: 2px;
    outline: none;
    cursor: pointer;
  }
  #fullyZoomSlider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 12px;
    height: 12px;
    background: #4d8eff;
    border-radius: 50%;
    box-shadow: 0 0 6px rgba(77, 142, 255, 0.6);
  }
  #fullyZoomVal {
    font-size: 10px;
    color: #4d7ee0;
    width: 14px;
    text-align: right;
  }

  #fullyMap {
    border-radius: 7px;
    overflow: hidden;
    border: 1px solid rgba(30, 100, 255, 0.25);
    background: #050810;
  }
  #fullyMap iframe {
    display: block;
    width: 100%;
    height: 220px;
    border: none;
  }

  #fullyHistory {
    max-height: 130px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 4px;
    scrollbar-width: thin;
    scrollbar-color: rgba(40, 100, 255, 0.3) transparent;
  }
  .fully-hist-item {
    padding: 6px 10px;
    background: rgba(15, 40, 120, 0.2);
    border-radius: 5px;
    border-left: 2px solid rgba(40, 100, 200, 0.3);
    font-size: 10px;
    color: #5878c0;
    cursor: pointer;
    transition: all 0.1s;
    line-height: 1.5;
  }
  .fully-hist-item:hover {
    background: rgba(30, 70, 180, 0.3);
    color: #8aabf0;
    border-left-color: rgba(77, 142, 255, 0.6);
  }
  .fully-hist-item .hist-addr {
    color: #7090d0;
    font-size: 9px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: block;
  }

  #fullyFooter {
    padding: 8px 16px;
    border-top: 1px solid rgba(30, 100, 255, 0.1);
    font-size: 9px;
    letter-spacing: 1px;
    color: rgba(60, 100, 180, 0.5);
    display: flex;
    justify-content: space-between;
    position: relative;
    z-index: 1;
  }

  .fully-divider {
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(40, 100, 255, 0.2), transparent);
    margin: 0 -16px;
  }

  #fullyClient.minimized #fullyBody,
  #fullyClient.minimized #fullyFooter {
    display: none;
  }
  #fullyClient.minimized {
    resize: none;
    min-height: unset;
  }

  /* ===== Toggle-Button ===== */
  #fullyToggleBtn {
    position: fixed;
    bottom: 24px;
    right: 24px;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: #0a0f1e;
    border: 1.5px solid rgba(77, 142, 255, 0.7);
    box-shadow: 0 0 12px rgba(77, 142, 255, 0.5), 0 4px 12px rgba(0,0,0,0.6);
    color: #4d8eff;
    font-family: 'Rajdhani', sans-serif;
    font-size: 20px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 10001;
    transition: all 0.2s ease;
    user-select: none;
  }
  #fullyToggleBtn:hover {
    background: #101a2a;
    border-color: #7aabff;
    box-shadow: 0 0 20px rgba(77, 142, 255, 0.8);
    color: #a0c4ff;
  }
  #fullyToggleBtn:active {
    transform: scale(0.95);
  }
`;

/* =========================================================
   INJECT STYLES
   ========================================================= */
function injectStyles() {
    const styleEl = document.createElement('style');
    styleEl.textContent = STYLE;
    document.head.appendChild(styleEl);
}

/* =========================================================
   NOMINATIM – Adresse + Land
   ========================================================= */
async function fetchAddressDetails(lat, lng) {
    const now = Date.now();
    if (now - lastAddressFetch < 1000) return null;
    lastAddressFetch = now;

    try {
        const resp = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
            { headers: { 'Accept-Language': 'en' } }
        );
        const data = await resp.json();
        const code = data?.address?.country_code?.toUpperCase() || '';
        const country = data?.address?.country || '';
        const flag = code
            ? [...code].map(c => String.fromCodePoint(c.charCodeAt(0) + 127397)).join('')
            : '🌐';
        const address = data?.display_name || 'No address found';
        return { address, flag, countryName: country };
    } catch {
        return { address: 'Address not available', flag: '🌐', countryName: 'Unknown' };
    }
}

/* =========================================================
   BUILD UI
   ========================================================= */
function buildUI() {
    injectStyles();

    const box = document.createElement('div');
    box.id = 'fullyClient';
    box.innerHTML = `
      <div id="fullyHeader">
        <div id="fullyLogo">FULLY <span>CLIENT</span></div>
        <div class="fully-header-btns">
          <div class="fully-btn-icon" id="fullyMinBtn" title="Minimize">—</div>
          <div class="fully-btn-icon" id="fullyCloseBtn" title="Hide (T)">✕</div>
        </div>
      </div>

      <div id="fullyBody">
        <div>
          <div class="fully-section-label">Location</div>
          <div class="fully-flag-row">
            <span id="fullyFlag">🌐</span>
            <span id="fullyCountryName">—</span>
          </div>
          <div id="fullyAddress" style="margin-top:6px">Waiting for round...</div>
        </div>
        <div class="fully-divider"></div>
        <div>
          <div class="fully-section-label">Coordinates</div>
          <div id="fullyCoords">—</div>
        </div>
        <div class="fully-divider"></div>
        <div class="fully-actions">
          <button class="fully-action-btn" id="fullyCopyBtn">📋 Copy Coords</button>
          <a class="fully-action-btn" id="fullySVBtn" target="_blank" href="#">🔗 Street View</a>
        </div>
        <div class="fully-divider"></div>
        <div>
          <div class="fully-zoom-row">
            <label>MAP ZOOM</label>
            <input type="range" id="fullyZoomSlider" min="1" max="18" value="4">
            <span id="fullyZoomVal">4</span>
          </div>
          <div id="fullyMap" style="margin-top:8px">
            <div style="height:220px;display:flex;align-items:center;justify-content:center;color:rgba(60,100,180,0.4);font-size:11px;letter-spacing:2px">
              NO DATA YET
            </div>
          </div>
        </div>
        <div class="fully-divider"></div>
        <div>
          <div class="fully-section-label">Round History</div>
          <div id="fullyHistory">
            <div style="font-size:10px;color:rgba(60,100,180,0.4);letter-spacing:1px">No rounds yet.</div>
          </div>
        </div>
      </div>

      <div id="fullyFooter">
        <span>FULLY CLIENT v3.0</span>
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
   BIND EVENTS
   ========================================================= */
function bindEvents(box, toggleBtn) {
    toggleBtn.addEventListener('click', () => {
        const panel = document.getElementById('fullyClient');
        if (panel.style.display === 'none' || panel.style.display === '') {
            panel.style.display = 'block';
            toggleBtn.textContent = '✕';
            isVisible = true;
        } else {
            panel.style.display = 'none';
            toggleBtn.textContent = 'F';
            isVisible = false;
        }
    });

    document.getElementById('fullyHeader').addEventListener('mousedown', dragStart);

    document.getElementById('fullyMinBtn').addEventListener('click', e => {
        e.stopPropagation();
        isMinimized = !isMinimized;
        box.classList.toggle('minimized', isMinimized);
        document.getElementById('fullyMinBtn').textContent = isMinimized ? '▢' : '—';
    });

    document.getElementById('fullyCloseBtn').addEventListener('click', e => {
        e.stopPropagation();
        box.style.display = 'none';
        toggleBtn.textContent = 'F';
        isVisible = false;
    });

    document.getElementById('fullyCopyBtn').addEventListener('click', () => {
        if (!gC.lat && !gC.lng) return;
        const text = `${gC.lat.toFixed(6)}, ${gC.lng.toFixed(6)}`;
        navigator.clipboard.writeText(text).then(() => {
            const btn = document.getElementById('fullyCopyBtn');
            btn.textContent = '✓ Copied!';
            btn.classList.add('copied');
            setTimeout(() => {
                btn.textContent = '📋 Copy Coords';
                btn.classList.remove('copied');
            }, 1500);
        });
    });

    document.getElementById('fullyZoomSlider').addEventListener('input', e => {
        currentZoom = parseInt(e.target.value);
        document.getElementById('fullyZoomVal').textContent = currentZoom;
        if (gC.lat || gC.lng) updateMap(gC.lat, gC.lng);
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
let dragOffX = 0, dragOffY = 0;

function dragStart(e) {
    if (e.target.closest('.fully-btn-icon')) return;
    e.preventDefault();
    const box = document.getElementById('fullyClient');
    dragOffX = e.clientX - box.offsetLeft;
    dragOffY = e.clientY - box.offsetTop;
    document.addEventListener('mousemove', dragMove);
    document.addEventListener('mouseup', dragEnd);
}
function dragMove(e) {
    const box = document.getElementById('fullyClient');
    box.style.left = (e.clientX - dragOffX) + 'px';
    box.style.top  = (e.clientY - dragOffY) + 'px';
}
function dragEnd() {
    document.removeEventListener('mousemove', dragMove);
    document.removeEventListener('mouseup', dragEnd);
}

/* =========================================================
   UPDATE UI
   ========================================================= */
function updateMap(lat, lng) {
    const mapUrl = `https://maps.google.com/maps?q=${lat},${lng}&z=${currentZoom}&output=embed`;
    document.getElementById('fullyMap').innerHTML =
        `<iframe src="${mapUrl}" allowfullscreen></iframe>`;
}

function updateHistory(lat, lng, address) {
    roundHistory.unshift({ lat, lng, address, time: new Date().toLocaleTimeString() });
    if (roundHistory.length > 10) roundHistory.pop();

    const hist = document.getElementById('fullyHistory');
    hist.innerHTML = roundHistory.map((r, i) => `
        <div class="fully-hist-item" onclick="jumpToRound(${i})">
          <span class="hist-addr">${r.address || 'Unknown Address'}</span>
          ${r.lat.toFixed(4)}, ${r.lng.toFixed(4)} · <span style="color:#354880">${r.time}</span>
        </div>
    `).join('');
}

window.jumpToRound = function(i) {
    const r = roundHistory[i];
    if (!r) return;
    updateMap(r.lat, r.lng);
};

async function updateUI(lat, lng, addressOverride = null) {
    let address = addressOverride;
    let flag = '🌐';
    let countryName = '—';

    const details = await fetchAddressDetails(lat, lng);
    if (details) {
        if (!address) address = details.address;
        flag = details.flag;
        countryName = details.countryName;
    }

    document.getElementById('fullyAddress').textContent = address || 'Address not found';
    document.getElementById('fullyCoords').innerHTML =
        `<b>LAT</b> ${lat.toFixed(6)}<br><b>LNG</b> ${lng.toFixed(6)}`;
    document.getElementById('fullySVBtn').href =
        `https://www.google.com/maps?q=&layer=c&cbll=${lat},${lng}`;
    document.getElementById('fullyFlag').textContent = flag;
    document.getElementById('fullyCountryName').textContent = countryName;

    updateMap(lat, lng);
    updateHistory(lat, lng, address);
}

/* =========================================================
   STREET VIEW HOOK
   ========================================================= */
function hookStreetView() {
    if (!window.google?.maps?.StreetViewPanorama) return false;

    const OriginalPanorama = google.maps.StreetViewPanorama;
    google.maps.StreetViewPanorama = function (...args) {
        const instance = new OriginalPanorama(...args);
        instance.addListener('position_changed', () => {
            const pos = instance.getPosition();
            if (pos) {
                const lat = pos.lat();
                const lng = pos.lng();
                if (lat && lng) {
                    gC.lat = lat;
                    gC.lng = lng;
                    updateUI(lat, lng, null);
                }
            }
        });
        return instance;
    };

    Object.setPrototypeOf(google.maps.StreetViewPanorama, OriginalPanorama);
    google.maps.StreetViewPanorama.prototype = OriginalPanorama.prototype;
    return true;
}

const waitForGoogleMaps = setInterval(() => {
    if (window.google?.maps?.StreetViewPanorama) {
        clearInterval(waitForGoogleMaps);
        hookStreetView();
    }
}, 50);

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

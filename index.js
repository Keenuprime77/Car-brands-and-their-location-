/* ============================================================
   AutoGlobe — Car Brand HQ Locator
   index.js  –  map logic + sidebar + search + custom markers
============================================================ */

// ── Map Setup ──────────────────────────────────────────────
const MAPTILER_KEY = 'ru7M28Ag1JcyseRwSrac';

const map = L.map('map', {
  center: [25, 15],
  zoom: 3,
  zoomControl: false,
  attributionControl: false
});

// MapTiler dark tile layer
L.tileLayer(
  `https://api.maptiler.com/maps/streets-v2-dark/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`,
  {
    tileSize: 512,
    zoomOffset: -1,
    minZoom: 1,
    crossOrigin: true
  }
).addTo(map);

// Custom zoom control position
L.control.zoom({ position: 'bottomright' }).addTo(map);

// ── State ──────────────────────────────────────────────────
let allBrands    = [];
let markerMap    = {};   // brand name → { marker, el }
let activeBrand  = null;

// ── Helpers ────────────────────────────────────────────────
function getInitials(name) {
  return name
    .split(/[\s\-]+/)
    .slice(0, 2)
    .map(w => w[0] || '')
    .join('')
    .toUpperCase();
}

function extractCountry(hq) {
  const parts = hq.split(',');
  return parts[parts.length - 1].trim();
}

function countUniqueCountries(brands) {
  return new Set(brands.map(b => extractCountry(b.headquarters))).size;
}

// ── Custom Marker Icon ─────────────────────────────────────
function createMarkerIcon(brand, active = false) {
  const initials = getInitials(brand);
  const activeClass = active ? 'marker-active' : '';

  return L.divIcon({
    className: '',
    iconSize: [36, 44],
    iconAnchor: [18, 40],
    popupAnchor: [0, -42],
    html: `
      <div class="custom-marker-wrap ${activeClass}">
        <div class="marker-pulse"></div>
        <div class="marker-pin"></div>
        <div class="marker-initials">${initials}</div>
      </div>
    `
  });
}

// ── Popup HTML ─────────────────────────────────────────────
function buildPopupHTML(element) {
  const lat  = element.latitude.toFixed(4);
  const lng  = element.longitude.toFixed(4);
  const country = extractCountry(element.headquarters);

  return `
    <div class="popup-inner">
      <div class="popup-badge">
        <div class="popup-badge-dot"></div>
        <span>Headquarters</span>
      </div>
      <div class="popup-brand-name">${element.brand}</div>
      <div class="popup-row">
        <span class="popup-row-icon">📍</span>
        <div>
          <div class="popup-row-label">Location</div>
          <div class="popup-row-value">${element.headquarters}</div>
          <div class="popup-coords">${lat}° N, ${lng}° E</div>
        </div>
      </div>
      <div class="popup-row">
        <span class="popup-row-icon">🌍</span>
        <div>
          <div class="popup-row-label">Country</div>
          <div class="popup-row-value">${country}</div>
        </div>
      </div>
    </div>
  `;
}

// ── Sidebar Brand List ─────────────────────────────────────
function buildSidebarList(brands) {
  const listEl = document.getElementById('brand-list');
  listEl.innerHTML = '';

  brands.forEach(element => {
    const item = document.createElement('div');
    item.className = 'brand-item';
    item.dataset.brand = element.brand;

    const initials = getInitials(element.brand);
    item.innerHTML = `
      <div class="brand-avatar">${initials}</div>
      <div class="brand-info">
        <div class="brand-name">${element.brand}</div>
        <div class="brand-hq">${element.headquarters}</div>
      </div>
      <span class="brand-arrow">›</span>
    `;

    item.addEventListener('click', () => focusBrand(element.brand));
    listEl.appendChild(item);
  });
}

// ── Focus Brand ────────────────────────────────────────────
function focusBrand(brandName) {
  // Deactivate previous
  if (activeBrand && markerMap[activeBrand]) {
    const prev = markerMap[activeBrand];
    prev.marker.setIcon(createMarkerIcon(activeBrand, false));
    const prevItem = document.querySelector(`.brand-item[data-brand="${CSS.escape(activeBrand)}"]`);
    if (prevItem) prevItem.classList.remove('active');
  }

  activeBrand = brandName;
  const entry = markerMap[brandName];
  if (!entry) return;

  // Activate marker
  entry.marker.setIcon(createMarkerIcon(brandName, true));

  // Fly to location
  map.flyTo(entry.marker.getLatLng(), 6, { duration: 1.2 });

  // Open popup
  setTimeout(() => entry.marker.openPopup(), 1000);

  // Activate sidebar item
  const item = document.querySelector(`.brand-item[data-brand="${CSS.escape(brandName)}"]`);
  if (item) {
    item.classList.add('active');
    item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // Close sidebar on mobile
  if (window.innerWidth <= 700) {
    document.getElementById('sidebar').classList.remove('open');
  }
}

// ── Search Filter ──────────────────────────────────────────
function filterBrands(query) {
  const q = query.trim().toLowerCase();
  const items = document.querySelectorAll('.brand-item');
  let shown = 0;

  items.forEach(item => {
    const name = item.dataset.brand.toLowerCase();
    const hq   = item.querySelector('.brand-hq').textContent.toLowerCase();
    const match = name.includes(q) || hq.includes(q);
    item.classList.toggle('hidden', !match);
    if (match) shown++;
  });

  document.getElementById('no-results').style.display = shown === 0 ? 'block' : 'none';
  document.getElementById('stat-shown').textContent = shown;
}

// ── Stats ──────────────────────────────────────────────────
function updateStats(brands) {
  document.getElementById('stat-total').textContent    = brands.length;
  document.getElementById('stat-countries').textContent = countUniqueCountries(brands);
  document.getElementById('stat-shown').textContent    = brands.length;
}

const sidebar = document.getElementById("sidebar");
const resizer = document.getElementById("resizer");

let isResizing = false;

resizer.addEventListener("mousedown", () => {
  isResizing = true;
  document.body.style.cursor = "col-resize";
  document.body.style.userSelect = "none";
});

document.addEventListener("mousemove", (e) => {
  if (!isResizing) return;

  const width = e.clientX;

  if (width >= 100 && width <= 500) {
    sidebar.style.width = `${width}px`;
  }
});

document.addEventListener("mouseup", () => {
  isResizing = false;
  document.body.style.cursor = "";
  document.body.style.userSelect = "";
});


// ── Main: Load & Render ────────────────────────────────────
function updateMap() {
  fetch('car_location.json')
    .then(res => res.json())
    .then(data => {
      allBrands = data.car_brands;

      // Build sidebar
      buildSidebarList(allBrands);
      updateStats(allBrands);

      // Layer group for search plugin
      const markersLayer = new L.LayerGroup();
      map.addLayer(markersLayer);

      allBrands.forEach(element => {
        const icon = createMarkerIcon(element.brand, false);

        const marker = L.marker(
          [element.latitude, element.longitude],
          { title: element.brand, icon }
        );

        marker.bindPopup(buildPopupHTML(element), {
          maxWidth: 300,
          closeButton: true
        });

        marker.on('click', () => {
          // Update active state without re-flying (map already centred)
          if (activeBrand && activeBrand !== element.brand && markerMap[activeBrand]) {
            markerMap[activeBrand].marker.setIcon(createMarkerIcon(activeBrand, false));
            const prevItem = document.querySelector(`.brand-item[data-brand="${CSS.escape(activeBrand)}"]`);
            if (prevItem) prevItem.classList.remove('active');
          }
          activeBrand = element.brand;
          marker.setIcon(createMarkerIcon(element.brand, true));

          const item = document.querySelector(`.brand-item[data-brand="${CSS.escape(element.brand)}"]`);
          if (item) {
            item.classList.add('active');
            item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        });

        marker.on('popupclose', () => {
          if (activeBrand === element.brand) {
            marker.setIcon(createMarkerIcon(element.brand, false));
            const item = document.querySelector(`.brand-item[data-brand="${CSS.escape(element.brand)}"]`);
            if (item) item.classList.remove('active');
            activeBrand = null;
          }
        });

        markersLayer.addLayer(marker);
        markerMap[element.brand] = { marker };
      });

      // Hide loading overlay
      const overlay = document.getElementById('loading-overlay');
      overlay.classList.add('hidden');
      setTimeout(() => overlay.remove(), 600);
    })
    .catch(err => {
      console.error('Failed to load car data:', err);
      document.getElementById('loading-overlay').remove();
    });
}

// ── Sidebar Search Binding ─────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('brand-search');
  const clearBtn    = document.getElementById('search-clear-btn');

  searchInput.addEventListener('input', () => {
    const val = searchInput.value;
    filterBrands(val);
    clearBtn.classList.toggle('visible', val.length > 0);
  });

  clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearBtn.classList.remove('visible');
    filterBrands('');
    searchInput.focus();
  });

  // Mobile sidebar toggle
  const toggle  = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('sidebar');

  toggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
  });

  // Close sidebar on outside click (mobile)
  document.getElementById('map').addEventListener('click', () => {
    if (window.innerWidth <= 700) {
      sidebar.classList.remove('open');
    }
  });
});

// ── Init ───────────────────────────────────────────────────
updateMap();

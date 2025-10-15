// Estado y refs globales
let map, marker, geocoderCtrl;

const BUENOS_AIRES_BOUNDS = L.latLngBounds(
  L.latLng(-41.5, -66.5),
  L.latLng(-33.0, -56.0)
);
let userLocation = { lat: -36.6769, lng: -60.5588 }; // centro aproximado provincia BA

let userLocation = { lat: -34.6037, lng: -58.3816 }; // por defecto BA


let userSelections = {
  userType: null,
  location: userLocation,
  city: null, // <-- NUEVO: nombre de ciudad a guardar en B7
  installationType: null,
  incomeLevel: null,
  zonaInstalacionExpert: null,
  zonaInstalacionBasic: null,
  electrodomesticos: {},
  totalMonthlyConsumption: 0,
  totalAnnualConsumption: 0,
  selectedCurrency: 'Pesos argentinos'
};

function updateLocationDisplay(lat, lng) {
  const latDisplay = document.getElementById('lat-display');
  const lngDisplay = document.getElementById('lng-display');
  const cityDisplay = document.getElementById('city-display');

  if (latDisplay) latDisplay.textContent = typeof lat === 'number' ? lat.toFixed(5) : '-';
  if (lngDisplay) lngDisplay.textContent = typeof lng === 'number' ? lng.toFixed(5) : '-';
  if (cityDisplay) cityDisplay.textContent = userSelections.city || '-';
}

function placeMarker(latlng) {
  if (!map) return;
  if (!marker) {
    marker = L.marker(latlng, { draggable: true }).addTo(map);
    marker.on('dragend', (event) => {
      const newLatLng = event.target.getLatLng();
      handleLocationSelected(newLatLng);
    });
  } else {
    marker.setLatLng(latlng);
  }
}

function initializeMap() {
  if (map) {
    try {
      map.off();
    } catch (e) {}
    try {
      map.remove();
    } catch (e) {}
    map = null;
  }


  map = L.map('map', {
    maxBounds: BUENOS_AIRES_BOUNDS,
    maxBoundsViscosity: 1.0
  }).setView([userLocation.lat, userLocation.lng], 6);

  map = L.map('map').setView([userLocation.lat, userLocation.lng], 5);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  // Geocoder global
  geocoderCtrl = L.Control.geocoder({
    defaultMarkGeocode: false,
    placeholder: 'Buscar ciudad o dirección...',
    showResultIcons: true
  });

  geocoderCtrl.on('markgeocode', (e) => {
    const center = e.geocode.center;

    if (!BUENOS_AIRES_BOUNDS.contains(center)) {
      alert('Seleccioná una ubicación dentro de la provincia de Buenos Aires.');
      map.fitBounds(BUENOS_AIRES_BOUNDS);
      return;
    }


    map.setView(center, 13);
    // nombre de ciudad desde el resultado
    userSelections.city = e.geocode.name || e.geocode.properties?.display_name || null;
    handleLocationSelected(center);
  });

  const geocoderContainer = document.getElementById('geocoder-container');
  if (geocoderContainer) {
    while (geocoderContainer.firstChild) geocoderContainer.removeChild(geocoderContainer.firstChild);
    geocoderCtrl.addTo(map);
    const geocoderEl = document.querySelector('.leaflet-control-geocoder');
    if (geocoderEl && geocoderEl.parentNode !== geocoderContainer) {
      geocoderContainer.appendChild(geocoderEl);
      const form = geocoderEl.querySelector('.leaflet-control-geocoder-form');
      if (form) {
        let btn = form.querySelector('button');
        if (!btn) {
          btn = document.createElement('button');
          btn.type = 'submit';
          form.appendChild(btn);
        }
        btn.textContent = 'Buscar';
      }
    }
  }

  map.on('click', (e) => handleLocationSelected(e.latlng));
  placeMarker(userLocation);
  updateLocationDisplay(userLocation.lat, userLocation.lng);
}


function clampToBuenosAires(latlng) {
  const north = BUENOS_AIRES_BOUNDS.getNorth();
  const south = BUENOS_AIRES_BOUNDS.getSouth();
  const east = BUENOS_AIRES_BOUNDS.getEast();
  const west = BUENOS_AIRES_BOUNDS.getWest();

  const clampedLat = Math.min(Math.max(latlng.lat, south), north);
  const clampedLng = Math.min(Math.max(latlng.lng, west), east);
  return L.latLng(clampedLat, clampedLng);
}

function handleLocationSelected(latlng) {
  const boundedLatLng = clampToBuenosAires(latlng);
  if (!BUENOS_AIRES_BOUNDS.contains(latlng)) {
    alert('La ubicación debe estar dentro de la provincia de Buenos Aires.');
  }

  userLocation = { lat: boundedLatLng.lat, lng: boundedLatLng.lng };
  userSelections.location = userLocation;
  placeMarker(boundedLatLng);
  updateLocationDisplay(boundedLatLng.lat, boundedLatLng.lng);

  // Intentar reverse geocoding para obtener nombre de ciudad si el usuario hizo click/drag
  if (geocoderCtrl?.options?.geocoder?.reverse) {
    geocoderCtrl.options.geocoder.reverse(boundedLatLng, map.getZoom(), (results) => {

function handleLocationSelected(latlng) {
  userLocation = { lat: latlng.lat, lng: latlng.lng };
  userSelections.location = userLocation;
  placeMarker(latlng);
  updateLocationDisplay(latlng.lat, latlng.lng);

  // Intentar reverse geocoding para obtener nombre de ciudad si el usuario hizo click/drag
  if (geocoderCtrl?.options?.geocoder?.reverse) {
    geocoderCtrl.options.geocoder.reverse(latlng, map.getZoom(), (results) => {

      if (results && results[0]) {
        userSelections.city =
          results[0].name ||
          results[0].properties?.display_name ||
          userSelections.city || null;

        updateLocationDisplay(boundedLatLng.lat, boundedLatLng.lng);

        updateLocationDisplay(latlng.lat, latlng.lng);

      }
    });
  }

  const confirmBtn = document.getElementById('confirm-location-btn');
  if (confirmBtn) confirmBtn.disabled = false;
}

// Listener del botón Confirmar
const confirmBtn = document.getElementById('confirm-location-btn');
if (confirmBtn) {
  confirmBtn.addEventListener('click', async () => {
    if (!userSelections.city) {
      alert('Elegí una ubicación o buscá una ciudad antes de confirmar.');
      return;
    }
    try {
      // Usar ruta relativa si backend corre bajo el mismo dominio (proxy)
      const resp = await fetch('/api/guardar_ciudad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ciudad: userSelections.city }) // <-- SOLO ciudad
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || 'No se pudo guardar la ubicación');

      alert(`Ubicación guardada en Excel (B7): ${userSelections.city}`);
      // Si querés continuar al siguiente paso, descomentar:
      // showScreen('data-form-screen');
    } catch (err) {
      alert('Error guardando la ubicación: ' + err.message);
    }
  });
}

// (mantener el resto del código existente)
// En DOMContentLoaded, NO re-inicializar el mapa más de una vez.
document.addEventListener('DOMContentLoaded', () => {
  initializeMap();
  updateLocationDisplay(userLocation.lat, userLocation.lng);
  // showScreen('map-screen'); // si aplica en tu flujo
  // showFormSection(userTypeSection); // si aplica
  // cargarElectrodomesticosJSON(); // si aplica
});

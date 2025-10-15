// Estado y refs globales
let map, marker, geocoderCtrl;
// Locks para no re-montar mapa/geocoder
window.__mapInitLock = window.__mapInitLock || false;
window.__geocoderMounted = window.__geocoderMounted || false;

const BUENOS_AIRES_BOUNDS = L.latLngBounds(
  L.latLng(-41.5, -66.5),
  L.latLng(-33.0, -56.0)
);

let userLocation = { lat: -34.6037, lng: -58.3816 }; // por defecto BA

let userSelections = {
  userType: null,
  location: userLocation,
  city: null, // nombre de ciudad a guardar en B7
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

function clampToBuenosAires(latlng) {
  const north = BUENOS_AIRES_BOUNDS.getNorth();
  const south = BUENOS_AIRES_BOUNDS.getSouth();
  const east = BUENOS_AIRES_BOUNDS.getEast();
  const west = BUENOS_AIRES_BOUNDS.getWest();

  const clampedLat = Math.min(Math.max(latlng.lat, south), north);
  const clampedLng = Math.min(Math.max(latlng.lng, west), east);
  return L.latLng(clampedLat, clampedLng);
}

function initializeMap() {
  // Evitar doble init
  if (window.__mapInitLock) return;
  window.__mapInitLock = true;
  if (map) {
    try { map.off(); } catch (e) {}
    try { map.remove(); } catch (e) {}
    map = null;
  }

  map = L.map('map', {
    maxBounds: BUENOS_AIRES_BOUNDS,
    maxBoundsViscosity: 1.0
  }).setView([userLocation.lat, userLocation.lng], 6);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  // Geocoder global para poder usar reverse
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
    // Guardar nombre de la ciudad desde el resultado
    userSelections.city = e.geocode.name || e.geocode.properties?.display_name || null;
    handleLocationSelected(center);
  });

  // Montar el geocoder en el mapa una sola vez
  if (!window.__geocoderMounted) {
    geocoderCtrl.addTo(map);
    window.__geocoderMounted = true;
  }
  // Mover el nodo del geocoder al host SIN crear jerarquías inválidas
  const geocoderContainer = document.getElementById('geocoder-container');
  if (geocoderContainer) {
    const mapGeocoderElement = document.querySelector('.leaflet-control-container .leaflet-control-geocoder');
    if (
      mapGeocoderElement &&
      mapGeocoderElement !== geocoderContainer &&
      !geocoderContainer.contains(mapGeocoderElement) &&
      !mapGeocoderElement.contains(geocoderContainer) && // evita contener al padre
      mapGeocoderElement.parentNode !== geocoderContainer
    ) {
      geocoderContainer.innerHTML = '';
      geocoderContainer.appendChild(mapGeocoderElement);
      // Asegurar el botón "Buscar"
      const form = mapGeocoderElement.querySelector('.leaflet-control-geocoder-form');
      if (form) {
        let searchButton = form.querySelector('button');
        if (!searchButton) {
          searchButton = document.createElement('button');
          searchButton.type = 'submit';
          form.appendChild(searchButton);
        }
        searchButton.textContent = 'Buscar';
      }
    }
  }

  map.on('click', (e) => handleLocationSelected(e.latlng));
  placeMarker(userLocation);
  updateLocationDisplay(userLocation.lat, userLocation.lng);
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
  // Reverse geocoding si vino por click/drag
  const canReverse = geocoderCtrl && geocoderCtrl.options && geocoderCtrl.options.geocoder && geocoderCtrl.options.geocoder.reverse;
  if (canReverse) {
    geocoderCtrl.options.geocoder.reverse(boundedLatLng, map.getZoom(), (results) => {
      if (results && results[0]) {
        userSelections.city =
          results[0].name ||
          (results[0].properties && results[0].properties.display_name) ||
          userSelections.city || null;
        updateLocationDisplay(boundedLatLng.lat, boundedLatLng.lng);
      }
    });
  }
  const confirmBtn = document.getElementById('confirm-location-btn');
  if (confirmBtn) confirmBtn.disabled = false;
}

const confirmBtn = document.getElementById('confirm-location-btn');
if (confirmBtn) {
  confirmBtn.addEventListener('click', async (e) => {
    e.preventDefault(); // nunca hacer submit
    if (!userSelections.city) {
      alert('Elegí una ubicación o buscá una ciudad antes de confirmar.');
      return;
    }
    try {
      const resp = await fetch('/api/guardar_ciudad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ciudad: userSelections.city }) // SOLO ciudad
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || 'No se pudo guardar la ubicación');
      // OK: ir al formulario "Tipo de usuario"
      if (typeof showFormSection === 'function') {
        const userTypeSectionEl = document.getElementById('user-type-section');
        if (userTypeSectionEl) showFormSection(userTypeSectionEl);
      }
      // (opcional) hacer scroll al formulario
      const userType = document.getElementById('user-type-section');
      if (userType) userType.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      alert('Error guardando la ubicación: ' + err.message);
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initializeMap(); // solo una vez gracias al lock
  if (typeof cargarElectrodomesticosJSON === 'function') { cargarElectrodomesticosJSON(); }
});

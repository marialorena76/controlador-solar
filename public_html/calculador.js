// Estado y refs globales
let map, marker, geocoderCtrl;
// Locks globales para no duplicar instancias
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
  // Evitar doble init en navegaciones/recargas parciales
  if (window.__mapInitLock) return;
  window.__mapInitLock = true;
  if (map) {
    try { map.off(); } catch (e) {}
    try { map.remove(); } catch (e) {}
    map = null;
  }

  map = L.map('map').setView([userLocation.lat, userLocation.lng], 5);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  // Geocoder global para poder usar reverse()
  geocoderCtrl = L.Control.geocoder({
    defaultMarkGeocode: false,
    placeholder: 'Buscar ciudad o dirección...',
    showResultIcons: true
  });

  geocoderCtrl.on('markgeocode', function (e) {
    map.setView(e.geocode.center, 13);
    // Guardar nombre de ciudad
    userSelections.city = e.geocode.name || (e.geocode.properties && e.geocode.properties.display_name) || null;
    handleLocationSelected(e.geocode.center);
  });

  if (!window.__geocoderMounted) {
    geocoderCtrl.addTo(map);
    window.__geocoderMounted = true;
  }

  // Mover el nodo del widget al host SIN crear jerarquías inválidas
  const host = document.getElementById('geocoder-container');
  if (host) {
    let widget = document.querySelector('.leaflet-control-container .leaflet-control-geocoder');

    // Si no hay widget (DOM corrupto), reconstruirlo
    if (!widget) {
      try {
        if (geocoderCtrl && typeof geocoderCtrl.remove === 'function') {
          geocoderCtrl.remove();
        }
      } catch (_) {}
      geocoderCtrl = L.Control.geocoder({
        defaultMarkGeocode: false,
        placeholder: 'Buscar ciudad o dirección...',
        showResultIcons: true
      });
      geocoderCtrl.on('markgeocode', function (e) {
        map.setView(e.geocode.center, 13);
        userSelections.city = e.geocode.name || (e.geocode.properties && e.geocode.properties.display_name) || null;
        handleLocationSelected(e.geocode.center);
      });
      geocoderCtrl.addTo(map);
      window.__geocoderMounted = true;
      widget = document.querySelector('.leaflet-control-container .leaflet-control-geocoder');
    }

    if (widget) {
      // Si el widget contiene al host, mover el host para que sea hermano
      if (widget.contains(host)) {
        const parent = widget.parentNode;
        if (parent) {
          parent.insertBefore(host, widget);
        }
      }

      // Si el host ya contiene al widget, no hacer nada
      if (!host.contains(widget)) {
        if (widget.parentNode && widget.parentNode !== host) {
          widget.parentNode.removeChild(widget);
        }
        host.innerHTML = '';
        host.appendChild(widget);
      }

      const form = widget.querySelector('.leaflet-control-geocoder-form');
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

function handleLocationSelected(latlng) {
  userLocation = { lat: latlng.lat, lng: latlng.lng };
  userSelections.location = userLocation;
  placeMarker(latlng);
  updateLocationDisplay(latlng.lat, latlng.lng);
  // Reverse si vino de click/drag
  const canReverse = geocoderCtrl && geocoderCtrl.options && geocoderCtrl.options.geocoder && geocoderCtrl.options.geocoder.reverse;
  if (canReverse) {
    geocoderCtrl.options.geocoder.reverse(latlng, map.getZoom(), (results) => {
      if (results && results[0]) {
        userSelections.city =
          results[0].name ||
          (results[0].properties && results[0].properties.display_name) ||
          userSelections.city || null;
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

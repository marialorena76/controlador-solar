// ---- PRODUCCIÓN: base de API relativa al dominio ----
const API_BASE = window.location.origin + "/api";

console.log('🤖 calculador.js cargado - v2');

let availableCities = [];
let filteredCities = [];
let selectedCity = null;

// Mapa
let map, marker;
let selectedAddress = null;
// Ambos estilos del geocoder pueden existir según la versión del plugin:
let geocoderControl = null;   // UI del buscador
let geocoderService = null;   // servicio reverse (Nominatim)

function cacheDOMElements() {
    // Cache all relevant DOM elements for faster access
    const ids = [
        'map-screen', 'data-form-screen', 'map-container-section', 'map', 'geocoder-container',
        'address-display', 'lat-display', 'lng-display', 'map-error', 'map-loading', 'confirmar-ubicacion-mapa',
        'user-type-section', 'supply-section', 'income-section', 'data-meteorologicos-section', 'energia-section', 'paneles-section',
        'inversor-section', 'perdidas-section', 'analisis-economico-section', 'finalizar-calculo'
    ];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            window[id.replace(/-/g, '_')] = el;
        } else {
            console.warn(`Element with ID '${id}' not found.`);
        }
    });
}

function showMapScreenFormSection(sectionIdToShow) {
    ['map-container-section', 'user-type-section', 'supply-section', 'income-section'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    const sectionToShow = document.getElementById(sectionIdToShow);
    if (sectionToShow) {
        sectionToShow.style.display = 'block';
    }
}

function showScreen(screenId) {
    ['map-screen', 'data-form-screen'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.style.display = screenId === 'map-screen' ? 'flex' : 'block';
    }
}

function normalizeCityName(properties) {
    if (!properties || !properties.address) return null;
    const addr = properties.address;
    return addr.city || addr.town || addr.village || addr.county || addr.state || 'Ubicación sin nombre';
}

function updateLocationInfo(latlng, addressName, properties) {
    try {
        const city = normalizeCityName(properties);
        if (!city) {
            console.warn("Could not determine city from geocoded properties:", properties);
            map_error.textContent = 'No se pudo determinar una ciudad para esta ubicación. Por favor, intente con otra.';
            map_error.style.display = 'block';
            confirmar_ubicacion_mapa.disabled = true;
            return;
        }

        selectedLocationData = {
            city: city,
            address: addressName,
            lat: latlng.lat,
            lng: latlng.lng,
        };

        address_display.textContent = selectedLocationData.address;
        lat_display.textContent = selectedLocationData.lat.toFixed(4);
        lng_display.textContent = selectedLocationData.lng.toFixed(4);

        if (marker) {
            marker.setLatLng(latlng);
        } else {
            marker = L.marker(latlng, { draggable: true }).addTo(map);
            marker.on('dragend', function(event) {
                const newLatLng = event.target.getLatLng();
                map_loading.style.display = 'block';
                map_error.style.display = 'none';
                geocoder.options.geocoder.reverse(newLatLng, map.options.crs.scale(map.getZoom()), (results) => {
                    map_loading.style.display = 'none';
                    if (results && results.length > 0) {
                        updateLocationInfo(newLatLng, results[0].name, results[0].properties);
                    } else {
                        map_error.textContent = 'No se pudo encontrar una dirección para esta ubicación.';
                        map_error.style.display = 'block';
                    }
                });
            });
        }

        map.setView(latlng, 15);
        confirmar_ubicacion_mapa.disabled = false;
        map_error.style.display = 'none';
    } catch (error) {
        console.error("Error in updateLocationInfo:", error);
        map_error.textContent = 'Ocurrió un error al actualizar la ubicación.';
        map_error.style.display = 'block';
        confirmar_ubicacion_mapa.disabled = true;
    }
}

function initMap() {
  const mapEl = document.getElementById('map');
  if (!mapEl || !window.L) {
    console.error('Leaflet o #map no disponible');
    return;
  }

  map = L.map('map').setView([-34.6037, -58.3816], 10);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);

  // --- Instanciar servicio de reverse geocoding (según API disponible) ---
  if (L.Control && L.Control.Geocoder && typeof L.Control.Geocoder.nominatim === 'function') {
    geocoderService = L.Control.Geocoder.nominatim();
  } else {
    console.warn('L.Control.Geocoder no disponible, el reverse usará el control si existe');
  }

  // --- Agregar el control de buscador con API tolerante ---
  if (L.Control && typeof L.Control.geocoder === 'function') {
    geocoderControl = L.Control.geocoder({
      defaultMarkGeocode: false,
      placeholder: 'Buscá una dirección...'
    })
    .on('markgeocode', (e) => {
      const center = e.geocode.center;
      map.setView(center, 14);
      if (marker) map.removeLayer(marker);
      marker = L.marker(center).addTo(map);

      const p = (e.geocode && e.geocode.properties) || {};
      selectedCity = p.city || p.town || p.village || p.municipality || '';
      selectedAddress = e.geocode.name || '';
      setCityDisplay(selectedCity);
      updateConfirmButton();
    })
    .addTo(map);
  } else {
    console.warn('L.Control.geocoder no disponible. ¿Falta el script leaflet-control-geocoder?');
  }

  // --- Click en el mapa → reverse geocoding (si hay servicio disponible) ---
  map.on('click', (e) => {
    if (marker) map.removeLayer(marker);
    marker = L.marker(e.latlng).addTo(map);

    if (geocoderService && typeof geocoderService.reverse === 'function') {
      geocoderService.reverse(e.latlng, map.getZoom(), (results) => {
        if (results && results.length) {
          const r = results[0];
          const props = r.properties || {};
          selectedCity = props.city || props.town || props.village || props.municipality || '';
          selectedAddress = props.display_name || '';
          setCityDisplay(selectedCity);
          updateConfirmButton();
        }
      });
    } else {
      console.warn('Reverse geocoder no disponible (L.Control.Geocoder.nominatim no encontrado)');
    }
  });

  // Estado inicial del botón
  updateConfirmButton();
}

function setupNavigationButtons() {
    confirmar_ubicacion_mapa.addEventListener('click', async () => {
        if (!selectedLocationData.city) return;

        confirmar_ubicacion_mapa.textContent = 'Confirmando...';
        confirmar_ubicacion_mapa.disabled = true;
        map_error.style.display = 'none';

        try {
            const response = await fetch(`${API_BASE}/seleccionar_ubicacion`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(selectedLocationData)
            });

            const data = await response.json();
            if (!response.ok || !data.ok) {
                throw new Error(data.error || 'Error del servidor.');
            }

            userSelections.location = { ...selectedLocationData };
            userSelections.selectedCity = data.city; // Maintain compatibility
            userSelections.ciudad.nombre = data.city; // Maintain compatibility

            showMapScreenFormSection('user-type-section');

        } catch (error) {
            console.error('Error confirming location:', error);
            map_error.textContent = `Error: ${error.message}`;
            map_error.style.display = 'block';
        } finally {
            confirmar_ubicacion_mapa.textContent = 'Confirmar Ubicación';
            confirmar_ubicacion_mapa.disabled = false;
        }
    });

    // --- Initial Wizard Flow ---
    document.getElementById('basic-user-button').addEventListener('click', () => {
        userSelections.userType = 'basico';
        showMapScreenFormSection('supply-section');
    });

    document.getElementById('expert-user-button').addEventListener('click', () => {
        userSelections.userType = 'experto';
        showMapScreenFormSection('supply-section');
    });

    document.getElementById('residential-button').addEventListener('click', () => {
        userSelections.installationType = 'Residencial';
        showMapScreenFormSection('income-section');
    });

    const handleNonResidential = (type) => {
        userSelections.installationType = type;
        showScreen('data-form-screen');
    };

    document.getElementById('commercial-button').addEventListener('click', () => handleNonResidential('Comercial'));
    document.getElementById('pyme-button').addEventListener('click', () => handleNonResidential('PYME'));

    const handleIncome = (level) => {
        userSelections.incomeLevel = level;
        showScreen('data-form-screen');
    };

    document.getElementById('income-high-button').addEventListener('click', () => handleIncome('ALTO'));
    document.getElementById('income-low-button').addEventListener('click', () => handleIncome('BAJO'));
    document.getElementById('income-medium-button').addEventListener('click', () => handleIncome('MEDIO'));

    finalizar_calculo.addEventListener('click', async e => {
        e.preventDefault();
        const payload = {
            userType: userSelections.userType,
            ciudad: { nombre: userSelections.location.city },
            // ... (rest of the payload for the report)
        };
        try {
            const response = await fetch(`${API_BASE}/generar_informe`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error ${response.status}`);
            }
            const informeFinal = await response.json();
            localStorage.setItem('informeSolar', JSON.stringify(informeFinal));
            window.location.href = 'informe.html';
        } catch (error) {
            console.error('Error generating report:', error);
            alert(`Error al generar el informe: ${error.message}`);
        }
    });
}

function setCityDisplay(name){
  const el = document.getElementById('location-display');
  if (el) el.textContent = name ? `Ubicación: ${name}` : 'Ubicación no seleccionada';
}

// Ajusta el selector si tu botón tiene un id/clase distinto
function updateConfirmButton(){
  const btn = document.querySelector('#confirmar-ciudad, .btn-confirmar-ciudad, button[data-role="confirmar-ciudad"]');
  if (btn) btn.disabled = !(selectedCity || selectedAddress);
}

// Arranque sin bloquear la UI si falla el mapa
document.addEventListener('DOMContentLoaded', () => {
  try {
    initMap();
  } catch (e) {
    console.error('initMap error:', e);
    // Aun si el mapa falla, no bloquees el resto de la UI
    updateConfirmButton();
  }
});
<<<<<<< HEAD
document.addEventListener('DOMContentLoaded', () => {
  const map = L.map('map', { zoomControl: true })
               .setView([-34.6037, -58.3816], 12);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '&copy; OpenStreetMap'
  }).addTo(map);

  const geocoderControl = L.Control.geocoder({
    defaultMarkGeocode: false,
    collapsed: false, // Ensure the geocoder is not collapsed
    placeholder: 'Buscar domicilio o ciudad...'
  })
    .on('markgeocode', (e) => {
      const b = e.geocode.bbox;
      const poly = L.polygon([
        b.getSouthEast(), b.getNorthEast(), b.getNorthWest(), b.getSouthWest()
      ]);
      map.fitBounds(poly.getBounds(), { padding: [20, 20] });
    })
    .addTo(map);

  // Mover control al contenedor custom
  const gcEl = geocoderControl.getContainer();
  const gcTarget = document.getElementById('geocoder-container');
  if (gcEl && gcTarget && gcEl.parentNode !== gcTarget) {
    gcTarget.appendChild(gcEl);
  }

  // Use requestAnimationFrame to ensure invalidateSize is called after DOM is painted
  requestAnimationFrame(() => {
      map.invalidateSize();
  });
});
=======
// ---- PRODUCCIÓN: base de API relativa al dominio ----
const API_BASE = "/api";

console.log('🤖 calculador.js cargado - v3');
window.addEventListener('error', e => console.error('[calculador.js] error global:', e.message, e.filename, e.lineno));

// Objeto para almacenar todas las selecciones del usuario
let userSelections = {
    userType: null,
    location: {
        city: null,
        address: null,
        lat: null,
        lng: null,
    },
    ciudad: { codigo: null, nombre: null },
    installationType: null,
    incomeLevel: null,
    zonaInstalacionExpert: null,
    zonaInstalacionBasic: null,
    selectedZonaInstalacion: null,
    superficieRodea: {
        descripcion: null,
        valor: null
    },
    rugosidadSuperficie: {
        descripcion: null,
        valor: null
    },
    rotacionInstalacion: {
        descripcion: null,
        valor: null
    },
    alturaInstalacion: null,
    metodoCalculoRadiacion: null,
    modeloMetodoRadiacion: null,
    marcaPanel: null,
    potenciaPanelDeseada: null,
    modeloTemperaturaPanel: null,
    frecuenciaLluvias: null,
    focoPolvoCercano: null,
    metodoIngresoConsumoEnergia: null,
    electrodomesticos: {},
    totalMonthlyConsumption: 0,
    totalAnnualConsumption: 0,
    selectedCurrency: 'Pesos argentinos',
    panelesSolares: {
        tipo: null,
        cantidad: 0,
        modelo: null,
        potenciaNominal: 0,
        superficie: 0
    },
    inversor: {
        tipo: null,
        potenciaNominal: 0
    },
    perdidas: {
        eficienciaPanel: 0,
        eficienciaInversor: 0,
        factorPerdidas: 0
    }
};

let map, geocoder, marker;
let selectedLocationData = {};

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
                        map_error.textContent = 'No se pudo encontrar una direccin para esta ubicación.';
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

async function initMap() {
    try {
        map = L.map('map').setView([-34.6037, -58.3816], 10); // Center on Buenos Aires
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        const geocodingService = L.Control.Geocoder.nominatim();

        geocoder = L.Control.geocoder({
            defaultMarkGeocode: false,
            geocoder: geocodingService,
            placeholder: 'Buscar domicilio o ciudad...',
            collapsed: false,
        });

        // Add the geocoder to the map and then move it to the container
        geocoder.addTo(map);
        const geocoderControl = geocoder.getContainer();
        document.getElementById('geocoder-container').appendChild(geocoderControl);


        geocoder.on('markgeocode', function(e) {
            map_loading.style.display = 'block';
            map_error.style.display = 'none';
            try {
                const { center, name, properties } = e.geocode;
                updateLocationInfo(center, name, properties);
            } catch (error) {
                console.error('Error in markgeocode handler:', error);
                map_error.textContent = 'Error al procesar la dirección.';
                map_error.style.display = 'block';
            } finally {
                map_loading.style.display = 'none';
            }
        });

        map.on('click', function(e) {
            map_loading.style.display = 'block';
            map_error.style.display = 'none';
            try {
                geocodingService.reverse(e.latlng, map.options.crs.scale(map.getZoom()), (results) => {
                    map_loading.style.display = 'none';
                    if (results && results.length > 0) {
                        updateLocationInfo(e.latlng, results[0].name, results[0].properties);
                    } else {
                        map_error.textContent = 'No se pudo encontrar una dirección para esta ubicación.';
                        map_error.style.display = 'block';
                    }
                });
            } catch (error) {
                console.error('Error in map click handler:', error);
                map_loading.style.display = 'none';
                map_error.textContent = 'Error al obtener la dirección.';
                map_error.style.display = 'block';
            }
        });

    } catch (error) {
        console.error("Error initializing map:", error);
        map_error.textContent = "No se pudo cargar el mapa.";
        map_error.style.display = 'block';
    }
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

const finalizarCalculoButton = document.getElementById('finalizarCalculoButton');

finalizarCalculoButton.onclick = async () => {
  const out = document.getElementById('resultados-informe');
  out.textContent = 'Generando informe...';

  try {
    const resp = await fetch(`${API_BASE}/generar_informe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // IMPORTANTE: mandamos el objeto dentro de la clave userSelections
      body: JSON.stringify({ userSelections })
    });

    const raw = await resp.text();
    if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${raw.slice(0,200)}`);

    // Parseo seguro
    let data;
    try { data = JSON.parse(raw); }
    catch { throw new Error(`Respuesta no-JSON: ${raw.slice(0,200)}`); }

    // Mostrar algo básico (ajustalo a tu UI)
    out.innerHTML = `
      <h3>Informe</h3>
      <ul>
        <li><b>Consumo base:</b> ${data.consumo_base ?? '-'}</li>
        <li><b>kWh ajustado:</b> ${data.kwh_ajustado ?? '-'}</li>
        <li><b>Tarifa:</b> ${data.tarifa ?? '-'}</li>
      </ul>`;
  } catch (e) {
    out.innerHTML = `<span style="color:red">Error: ${e.message}</span>`;
  }
};
function onCitySelected(city) {
  userSelections.city = city;        // guarda la ciudad elegida
  const btn = document.getElementById('finalizarCalculoButton');
  btn.disabled = false;
  btn.classList.remove('disabled');  // si tenés estilos
}


document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log("DOM content loaded. Starting initialization.");
        cacheDOMElements();
        await initMap();
        setupNavigationButtons();
        showScreen('map-screen');
        showMapScreenFormSection('map-container-section');
        console.log("Initialization complete.");
    } catch (error) {
        console.error("Fatal error during initialization:", error);
        const errorContainer = document.getElementById('map-error') || document.body;
        errorContainer.innerHTML = `<p style="color: red; font-weight: bold;">Error grave al cargar la aplicación: ${error.message}</p>`;
        errorContainer.style.display = 'block';
    }
});

// ===== MAPA + HABILITAR "CONFIRMAR UBICACIÓN" =====
document.addEventListener('DOMContentLoaded', () => {
  // refs UI (coinciden con tu punto 2)
  const btn = document.getElementById('confirmar-ubicacion-mapa');
  const addrEl = document.getElementById('address-display');
  const latEl  = document.getElementById('lng-display') ? document.getElementById('lat-display') : document.querySelector('#lat-display');
  const lngEl  = document.getElementById('lng-display');

  // estado global
  window.userSelections = window.userSelections || {};

  // crear mapa
    const map = window._map || L.map('map').setView([-34.6037,-58.3816], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

  // marcador
  const marker = L.marker(map.getCenter(), { draggable: true }).addTo(map);
  window.userSelections = window.userSelections || {};

  // helper para actualizar UI + estado + botón
  function setLocation(lat, lng, address) {
    userSelections.lat = lat;
    userSelections.lng = lng;
    if (address) userSelections.address = address;

    if (addrEl) addrEl.textContent = address || '—';
    if (latEl)  latEl.textContent  = typeof lat === 'number' ? lat.toFixed(5) : '-';
    if (lngEl)  lngEl.textContent  = typeof lng === 'number' ? lng.toFixed(5) : '-';

    if (btn) {
      btn.disabled = false;
      btn.classList.remove('disabled');
    }
  }

  // click en mapa
  map.on('click', (e) => {
    const { lat, lng } = e.latlng;
    marker.setLatLng([lat, lng]);
    setLocation(lat, lng);
  });

  // drag del marcador
  marker.on('moveend', () => {
    const { lat, lng } = marker.getLatLng();
    setLocation(lat, lng);
  });

  // geocoder
  const geocoder = L.Control.geocoder({ defaultMarkGeocode: false })
    .on('markgeocode', (e) => {
      const { center, name } = e.geocode;
      map.setView(center, 14);
      marker.setLatLng(center);
      setLocation(center.lat, center.lng, name);
    })
    .addTo(map);

  // reubicar el control al contenedor custom (tu punto 2)
  const gcEl = geocoder.getContainer?.();
  const gcTarget = document.getElementById('geocoder-container');
  if (gcEl && gcTarget && gcEl.parentNode !== gcTarget) gcTarget.appendChild(gcEl);

  // asegurar render
  setTimeout(() => map.invalidateSize(), 250);

  // (opcional) acción del botón: ejemplo de POST al backend
  btn?.addEventListener('click', async () => {
    try {
      const resp = await fetch('/api/generar_informe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userSelections })
      });
      const raw = await resp.text();
      if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${raw.slice(0,200)}`);
      const data = JSON.parse(raw);
      console.log('Informe OK:', data);
    } catch (err) {
      console.error('Error al confirmar ubicación:', err);
    }
  });
});
// ===== BUSCADOR (Leaflet Control Geocoder) =====
document.addEventListener('DOMContentLoaded', () => {
  if (typeof L === 'undefined') return; // seguridad

  // Usamos el mapa existente si ya lo creaste; si no, salimos.
  const mapEl = document.getElementById('map');
  if (!mapEl) return;

  // Intentar encontrar el mapa ya creado por tu código
  let map = window._map;
  if (!map) {
    // Si no lo guardaste en window._map, probamos obtenerlo del DOM (Leaflet 1.9):
    map = mapEl._leaflet_id ? Object.values(L)?.find?.(x => x && x._loaded === true) : null;
  }
  if (!map || !map.setView) return; // no hay mapa aún

  // Crear el geocoder si no existe
  if (!window._geocoder) {
    if (typeof L.Control.geocoder === 'undefined') {
      console.error('Leaflet Control Geocoder no está cargado. Revisá el <script> de Control.Geocoder.js.');
      return;
    }

    window._geocoder = L.Control.geocoder({
      defaultMarkGeocode: false,
      placeholder: 'Buscar ciudad o dirección…'
    })
    .on('markgeocode', (e) => {
      const { center, name } = e.geocode;
      // Centrar y (opcional) mover tu marcador si tenés uno global
      map.setView(center, 14);
      if (window._marker && window._marker.setLatLng) {
        window._marker.setLatLng(center);
      }
      // Si usás spans para mostrar datos:
      const aEl = document.getElementById('address-display');
      const latEl = document.getElementById('lat-display');
      const lngEl = document.getElementById('lng-display');
      if (aEl)  aEl.textContent  = name || '—';
      if (latEl) latEl.textContent = center.lat.toFixed(5);
      if (lngEl) lngEl.textContent = center.lng.toFixed(5);

      // Guardar en userSelections y habilitar botón si corresponde
      window.userSelections = window.userSelections || {};
      userSelections.address = name;
      userSelections.lat = center.lat;
      userSelections.lng = center.lng;
      const btn = document.getElementById('confirmar-ubicacion-mapa');
      if (btn) { btn.disabled = false; btn.classList.remove('disabled'); }
    })
    .addTo(map);
  }

  // Mover el control al contenedor custom (superpuesto)
  const target = document.getElementById('geocoder-container');
  const gcEl = window._geocoder.getContainer?.();
  if (target && gcEl && gcEl.parentNode !== target) {
    // Limpio para evitar duplicados si recargás el módulo
    target.innerHTML = '';
    target.appendChild(gcEl);
  }

  // Si el mapa estaba oculto al cargar, asegurar layout
  setTimeout(() => map.invalidateSize(), 250);
});

// ====== GEOCODER + CLICS EN MAPA ======
document.addEventListener('DOMContentLoaded', () => {
  // 1) Obtener (o crear) el mapa
  const mapEl = document.getElementById('map');
  if (!mapEl) return;

  let map = window._map;
  if (!map) {
    map = L.map('map', { zoomControl: true }).setView([-34.6037, -58.3816], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '&copy; OpenStreetMap'
    }).addTo(map);
    window._map = map;
  }

  // 2) Marcador draggable
  let marker = window._marker;
  if (!marker) {
    marker = L.marker(map.getCenter(), { draggable: true }).addTo(map);
    window._marker = marker;
  }

  const btn   = document.getElementById('confirmar-ubicacion-mapa');
  const aEl   = document.getElementById('address-display');
  const latEl = document.getElementById('lat-display');
  const lngEl = document.getElementById('lng-display');

  function setLocation(lat, lng, address) {
    window.userSelections = window.userSelections || {};
    userSelections.lat = lat;
    userSelections.lng = lng;
    if (address) userSelections.address = address;

    if (aEl)   aEl.textContent  = address || '—';
    if (latEl) latEl.textContent = (typeof lat === 'number') ? lat.toFixed(5) : '-';
    if (lngEl) lngEl.textContent = (typeof lng === 'number') ? lng.toFixed(5) : '-';

    if (btn) {
      btn.disabled = false;
      btn.classList.remove('disabled');
    }
  }

  // 3) Click en mapa y drag del marcador
  map.on('click', (e) => {
    const { lat, lng } = e.latlng;
    marker.setLatLng([lat, lng]);
    setLocation(lat, lng);
  });
  marker.on('moveend', () => {
    const { lat, lng } = marker.getLatLng();
    setLocation(lat, lng);
  });

  // 4) Crear geocoder si no existe y manejar selección
  if (typeof L.Control.geocoder === 'undefined') {
    console.error('Leaflet Control Geocoder no está cargado. Revisá el <script> Control.Geocoder.js.');
    return;
  }
  if (!window._geocoder) {
    window._geocoder = L.Control.geocoder({
      defaultMarkGeocode: false,
      placeholder: 'Buscar ciudad o dirección…'
    })
    .on('markgeocode', (e) => {
      const { center, name } = e.geocode;
      map.setView(center, 14);
      marker.setLatLng(center);
      setLocation(center.lat, center.lng, name);
    })
    .addTo(map);
  }

  // 5) Reubicar el control dentro del overlay (sin duplicar)
  const target = document.getElementById('geocoder-container');
  const gcEl = window._geocoder.getContainer?.();
  if (target && gcEl && gcEl.parentNode !== target) {
    target.innerHTML = '';
    target.appendChild(gcEl);
  }

  // 6) Asegurar render correcto
  setTimeout(() => map.invalidateSize(), 250);
});
>>>>>>> 52640f8 (WIP)

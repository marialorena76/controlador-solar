// ---- PRODUCCIÓN: base de API relativa al dominio ----
const API_BASE = "/api";

console.log('🤖 calculador.js cargado - v3');

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
}

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

        // Force map to re-render after its container is visible
        requestAnimationFrame(() => {
            if (map) {
                map.invalidateSize();
            }
        });

        console.log("Initialization complete.");
    } catch (error) {
        console.error("Fatal error during initialization:", error);
        const errorContainer = document.getElementById('map-error') || document.body;
        errorContainer.innerHTML = `<p style="color: red; font-weight: bold;">Error grave al cargar la aplicación: ${error.message}</p>`;
        errorContainer.style.display = 'block';
    }
});
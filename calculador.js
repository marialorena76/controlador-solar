// ---- PRODUCCIÓN: base de API relativa al dominio ----
const API_BASE = window.location.origin + "/api";

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
    selectedLocationData = {
        city: normalizeCityName(properties),
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
            geocoder.options.geocoder.reverse(newLatLng, map.options.crs.scale(map.getZoom()), (results) => {
                map_loading.style.display = 'none';
                if (results && results.length > 0) {
                    updateLocationInfo(newLatLng, results[0].name, results[0].properties);
                }
            });
        });
    }

    map.setView(latlng, 15);
    confirmar_ubicacion_mapa.disabled = !selectedLocationData.city;
    map_error.style.display = 'none';
}

async function initMap() {
    try {
        map = L.map('map').setView([-34.6037, -58.3816], 10); // Center on Buenos Aires
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        geocoder = L.Control.geocoder({
            defaultMarkGeocode: false,
            geocoder: L.Control.Geocoder.nominatim(),
            placeholder: 'Buscar domicilio o ciudad...',
            collapsed: false,
        }).addTo(map);

        geocoder.on('markgeocode', function(e) {
            try {
                console.log('markgeocode event triggered:', e);
                const { center, name, properties } = e.geocode;
                updateLocationInfo(center, name, properties);
            } catch (error) {
                console.error('Error in markgeocode handler:', error);
                map_error.textContent = 'Error al procesar la dirección.';
                map_error.style.display = 'block';
            }
        });

        map.on('click', function(e) {
            try {
                console.log('Map clicked:', e.latlng);
                map_loading.style.display = 'block';
                geocoder.options.geocoder.reverse(e.latlng, map.options.crs.scale(map.getZoom()), (results) => {
                    map_loading.style.display = 'none';
                    if (results && results.length > 0) {
                        console.log('Reverse geocoding results:', results);
                        updateLocationInfo(e.latlng, results[0].name, results[0].properties);
                    } else {
                        console.warn('No results from reverse geocoding.');
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
            confirmar_ubicacion_mapa.textContent = 'Confirmar Ubicación';
            confirmar_ubicacion_mapa.disabled = false;
        }
    });

    // --- Initial Wizard Flow ---
    basic_user_button.addEventListener('click', () => {
        userSelections.userType = 'basico';
        showMapScreenFormSection('supply-section');
    });

    expert_user_button.addEventListener('click', () => {
        userSelections.userType = 'experto';
        showMapScreenFormSection('supply-section');
    });

    residential_button.addEventListener('click', () => {
        userSelections.installationType = 'Residencial';
        showMapScreenFormSection('income-section');
    });

    const handleNonResidential = (type) => {
        userSelections.installationType = type;
        showScreen('data-form-screen');
    };

    commercial_button.addEventListener('click', () => handleNonResidential('Comercial'));
    pyme_button.addEventListener('click', () => handleNonResidential('PYME'));

    const handleIncome = (level) => {
        userSelections.incomeLevel = level;
        showScreen('data-form-screen');
    };

    income_high_button.addEventListener('click', () => handleIncome('ALTO'));
    income_low_button.addEventListener('click', () => handleIncome('BAJO'));
    income_medium_button.addEventListener('click', () => handleIncome('MEDIO'));

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
                throw new Error(`HTTP error ${response.status}`);
            }
            const informeFinal = await response.json();
            localStorage.setItem('informeSolar', JSON.stringify(informeFinal));
            window.location.href = 'informe.html';
        } catch (error) {
            console.error('Error generating report:', error);
            alert('Error al generar el informe.');
        }
    });
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
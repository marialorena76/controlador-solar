// ---- PRODUCCIÓN: base de API relativa al dominio ----
const API_BASE = window.location.origin + "/api";

co
let geocoderService = null;
let selectedCity = null;
let selectedAddress = null;

let availableCities = [];
let filteredCities = [];


// Objeto para almacenar todas las selecciones del usuario
let userSelections = {
    userType: null,
    selectedCity: null,
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

let electrodomesticosCategorias = {};

const sectionInfoMap = {
    'user-type-section': { generalCategory: 'Configuración Inicial', specificName: 'Nivel de Conocimiento', sidebarId: null },
    'supply-section': { generalCategory: 'Configuración Inicial', specificName: 'Tipo de Instalación', sidebarId: null },
    'income-section': { generalCategory: 'Configuración Inicial', specificName: 'Nivel de Ingreso', sidebarId: null },
    'data-meteorologicos-section': { generalCategory: 'Datos', specificName: 'Zona de Instalación', sidebarId: 'sidebar-datos' },
    'superficie-section': { generalCategory: 'Datos', specificName: 'Superficie Circundante', sidebarId: 'sidebar-datos' },
    'rugosidad-section': { generalCategory: 'Datos', specificName: 'Rugosidad Superficie', sidebarId: 'sidebar-datos' },
    'rotacion-section': { generalCategory: 'Datos', specificName: 'Rotación Instalación', sidebarId: 'sidebar-datos' },
    'altura-instalacion-section': { generalCategory: 'Datos', specificName: 'Altura Instalación', sidebarId: 'sidebar-datos' },
    'metodo-calculo-section': { generalCategory: 'Datos', specificName: 'Método Cálculo Radiación', sidebarId: 'sidebar-datos' },
    'modelo-metodo-section': { generalCategory: 'Datos', specificName: 'Modelo Método Radiación', sidebarId: 'sidebar-datos' },
    'energia-section': { generalCategory: 'Energía', specificName: 'Consumo de Energía', sidebarId: 'sidebar-energia' },
    'energia-modo-seleccion': { generalCategory: 'Energía', specificName: 'Selección Método Consumo', sidebarId: 'sidebar-energia'},
    'consumo-factura-section': { generalCategory: 'Energía', specificName: 'Consumo por Factura', sidebarId: 'sidebar-energia' },
    'paneles-section': { generalCategory: 'Paneles', specificName: 'Paneles Solares', sidebarId: 'sidebar-paneles' },
    'panel-marca-subform': { generalCategory: 'Paneles', specificName: 'Marca Panel', sidebarId: 'sidebar-paneles' },
    'panel-potencia-subform': { generalCategory: 'Paneles', specificName: 'Potencia Panel', sidebarId: 'sidebar-paneles' },
    'panel-modelo-subform': { generalCategory: 'Paneles', specificName: 'Modelo Panel', sidebarId: 'sidebar-paneles' },
    'panel-modelo-temperatura-subform': { generalCategory: 'Paneles', specificName: 'Modelo Temperatura Panel', sidebarId: 'sidebar-paneles' },
    'inversor-section': { generalCategory: 'Inversor', specificName: 'Selección de Inversor', sidebarId: 'sidebar-inversor' },
    'perdidas-section': { generalCategory: 'Pérdidas', specificName: 'Registro de Pérdidas', sidebarId: 'sidebar-perdidas' },
    'frecuencia-lluvias-subform-content': { generalCategory: 'Pérdidas', specificName: 'Frecuencia Lluvias', sidebarId: 'sidebar-perdidas' },
    'foco-polvo-subform-content': { generalCategory: 'Pérdidas', specificName: 'Foco de Polvo', sidebarId: 'sidebar-perdidas' },
    'analisis-economico-section': { generalCategory: 'Análisis Económico', specificName: 'Análisis Económico', sidebarId: 'sidebar-analisis-economico' }
};

// --- DOM Element Cache ---
const dom = {};

function cacheDOMElements() {
    const elementIds = [
        'map-screen', 'data-form-screen', 'data-meteorologicos-section',
        'energia-section', 'paneles-section', 'inversor-section', 'perdidas-section',
        'analisis-economico-section', 'step-indicator-text', 'totalConsumoMensual',
        'totalConsumoAnual', 'user-type-section', 'supply-section', 'income-section',
        'superficie-section', 'rugosidad-section', 'rotacion-section',
        'altura-instalacion-section', 'metodo-calculo-section', 'modelo-metodo-section',
        'frecuencia-lluvias-subform-content', 'foco-polvo-subform-content',
        'panel-marca-subform', 'marca-panel-options-container', 'panel-potencia-subform',
        'potencia-panel-deseada-input', 'panel-modelo-subform', 'modelo-panel-options-container',
        'panel-modelo-temperatura-subform', 'modelo-temperatura-select', 'buscar-ciudad',
        'lista-ciudades', 'confirmar-ciudad', 'ciudades-loading', 'ciudad-error', 'ciudad-seleccionada',
        'consumo-factura-section', 'basic-user-button', 'expert-user-button', 'residential-button',
        'commercial-button', 'pyme-button', 'income-high-button', 'income-low-button', 'income-medium-button',
        'moneda', 'tipo-panel', 'cantidad-paneles-input', 'tipo-inversor', 'potencia-inversor-input',
        'eficiencia-panel-input', 'eficiencia-inversor-input', 'factor-perdidas-input',
        'altura-instalacion-input', 'back-to-map-from-zona', 'next-to-energia',
        'back-to-data-meteorologicos-from-superficie', 'next-to-energia-from-superficie',
        'back-to-superficie-from-rugosidad', 'next-to-rotacion-from-rugosidad',
        'back-to-rugosidad-from-rotacion', 'next-to-paneles-from-rotacion',
        'back-to-rotacion-from-altura', 'next-to-metodo-calculo-from-altura',
        'back-to-altura-from-metodo', 'next-to-paneles-from-modelo',
        'next-to-inversor-from-panels', 'back-to-data-meteorologicos',
        'next-to-paneles', 'back-to-energia', 'next-to-perdidas', 'back-to-paneles',
        'back-to-inversor-from-perdidas', 'next-to-frecuencia-lluvias-from-modelo-temperatura',
        'back-to-modelo-temperatura-from-frecuencia-lluvias',
        'next-to-foco-polvo-from-frecuencia', 'back-to-frecuencia-lluvias-from-foco-polvo',
        'next-to-analisis-from-foco-polvo', 'back-from-panel-marca', 'finalizar-calculo'
    ];
    elementIds.forEach(id => dom[id] = document.getElementById(id));
    dom.backToPerdidasFromAnalisisBtn = document.querySelector('#analisis-economico-section .back-button');
}


function normalizeCityName(value) {
    if (typeof value !== 'string') return '';
    return value.trim().toLowerCase();
}

async function initCitySearch() {
    console.log("initCitySearch: Starting");
    if (!dom['buscar-ciudad'] || !dom['lista-ciudades'] || !dom['confirmar-ciudad'] || !dom['ciudades-loading'] || !dom['ciudad-error'] || !dom['ciudad-seleccionada']) {
        console.error('City search elements not found.');
        return;
    }

    const showLoading = (isLoading) => dom['ciudades-loading'].style.display = isLoading ? 'block' : 'none';
    const showError = (message) => {
        dom['ciudad-error'].textContent = message || '';
        dom['ciudad-error'].style.display = message ? 'block' : 'none';
    };
    const updateSelectionDisplay = (city, confirmed = false) => {
        if (!city) {
            dom['ciudad-seleccionada'].textContent = '';
            dom['ciudad-seleccionada'].style.display = 'none';
            return;
        }
        dom['ciudad-seleccionada'].textContent = confirmed ? `Ciudad confirmada: ${city}` : `Ciudad seleccionada: ${city}`;
        dom['ciudad-seleccionada'].style.display = 'block';
    };

    const applyCitySelection = (city) => {
        selectedCity = city;
        dom['buscar-ciudad'].value = city || '';
        updateSelectionDisplay(city);
        dom['confirmar-ciudad'].disabled = !city;
        Array.from(dom['lista-ciudades'].children).forEach(item => {
            if (item instanceof HTMLElement) {
                item.classList.toggle('active', !!city && normalizeCityName(item.dataset.city || '') === normalizeCityName(city));
            }
        });
    };

    const renderCitySuggestions = (cities) => {
        filteredCities = [...cities];
        dom['lista-ciudades'].innerHTML = '';
        if (!cities.length) {
            const emptyItem = document.createElement('li');
            emptyItem.textContent = 'No se encontraron coincidencias.';
            emptyItem.classList.add('empty');
            dom['lista-ciudades'].appendChild(emptyItem);
            return;
        }
        cities.forEach(city => {
            const item = document.createElement('li');
            item.textContent = city;
            item.dataset.city = city;
            item.setAttribute('role', 'option');
            if (selectedCity && normalizeCityName(selectedCity) === normalizeCityName(city)) {
                item.classList.add('active');
            }
            item.addEventListener('click', () => applyCitySelection(city));
            dom['lista-ciudades'].appendChild(item);
        });
    };

    const fetchCities = async () => {
        showLoading(true);
        showError('');
        dom['confirmar-ciudad'].disabled = true;
        try {
            console.log("Fetching cities from /api/ciudades");
            const response = await fetch(`${API_BASE}/ciudades`);
            if (!response.ok) throw new Error(`HTTP error ${response.status}`);
            const data = await response.json();
            console.log("Cities received:", data);
            availableCities = (data.ciudades || [])
                .filter(city => typeof city === 'string' && city.trim())
                .filter((city, index, array) => index === array.findIndex(c => normalizeCityName(c) === normalizeCityName(city)))
                .sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
            renderCitySuggestions(availableCities);
        } catch (error) {
            console.error('Error fetching cities:', error);
            availableCities = [];
            renderCitySuggestions([]);
            showError('No se pudo obtener la lista de ciudades.');
        } finally {
            showLoading(false);
        }
    };

    dom['buscar-ciudad'].addEventListener('input', () => {
        const query = dom['buscar-ciudad'].value;
        const normalizedQuery = normalizeCityName(query);
        if (selectedCity && normalizeCityName(selectedCity) !== normalizedQuery) {
            selectedCity = null;
            updateSelectionDisplay(null);
            dom['confirmar-ciudad'].disabled = true;
        }
        const matches = normalizedQuery ? availableCities.filter(city => normalizeCityName(city).includes(normalizedQuery)) : availableCities;
        renderCitySuggestions(matches);
    });

    dom['buscar-ciudad'].addEventListener('keydown', (event) => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        const normalizedValue = normalizeCityName(dom['buscar-ciudad'].value);
        if (!normalizedValue) return;
        const exactMatch = availableCities.find(city => normalizeCityName(city) === normalizedValue);
        const cityToApply = exactMatch || (filteredCities.length === 1 ? filteredCities[0] : null);
        if (cityToApply) {
            applyCitySelection(cityToApply);
            dom['confirmar-ciudad'].focus();
        }
    });

    dom['confirmar-ciudad'].addEventListener('click', async () => {
        if (!selectedCity) {
            return;
        }

        const previousLabel = dom['confirmar-ciudad'].textContent;
        dom['confirmar-ciudad'].textContent = 'Confirmando...';
        dom['confirmar-ciudad'].disabled = true;
        showError('');

        try {
            const response = await fetch(`${API_BASE}/seleccionar_ciudad`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ciudad: selectedCity })
            });

            const data = await response.json();

            if (!response.ok || !data.ok) {
                throw new Error(data.error || `Error del servidor: ${response.status}`);
            }

            // Success path
            userSelections.selectedCity = data.ciudad;
            userSelections.ciudad = { codigo: null, nombre: data.ciudad };
            updateSelectionDisplay(data.ciudad, true);
            showMapScreenFormSection('user-type-section');
            updateStepIndicator('user-type-section');

            // The button remains disabled on success as we move to the next screen

        } catch (error) {
            console.error('Error during city confirmation:', error);
            showError(error.message || 'Ocurrió un error desconocido.');
            // Restore button state only on error
            dom['confirmar-ciudad'].textContent = previousLabel;
            dom['confirmar-ciudad'].disabled = false;
        }
    });

    updateSelectionDisplay(null);
    await fetchCities();
}

function showScreen(screenId) {
    ['map-screen', 'data-form-screen'].forEach(id => {
        if (dom[id]) dom[id].style.display = 'none';
    });

    const allSections = [
        'data-meteorologicos-section', 'superficie-section', 'rugosidad-section',
        'rotacion-section', 'altura-instalacion-section', 'metodo-calculo-section',
        'modelo-metodo-section', 'energia-section', 'consumo-factura-section',
        'paneles-section', 'inversor-section', 'perdidas-section', 'analisis-economico-section'
    ];
    allSections.forEach(id => {
        if(dom[id]) dom[id].style.display = 'none';
    });


    const targetElement = dom[screenId] || document.getElementById(screenId); // Fallback for dynamic elements
    if (!targetElement) {
        console.error(`Screen with ID '${screenId}' not found.`);
        return;
    }

    if (screenId === 'map-screen') {
        dom['map-screen'].style.display = 'flex';
    } else if (screenId === 'data-form-screen') {
        dom['data-form-screen'].style.display = 'block';
        dom['data-meteorologicos-section'].style.display = 'block'; // Default section
    } else {
        if (dom['data-form-screen']) dom['data-form-screen'].style.display = 'block';
        targetElement.style.display = 'block';
    }
}

function updateStepIndicator(currentSectionId) {
    document.querySelectorAll('.sidebar .sidebar-item').forEach(item => item.classList.remove('active'));
    const sectionInfo = sectionInfoMap[currentSectionId];
    if (sectionInfo && sectionInfo.sidebarId) {
        const activeSidebarItem = document.getElementById(sectionInfo.sidebarId);
        if (activeSidebarItem) activeSidebarItem.classList.add('active');
    }
    if (dom['step-indicator-text'] && sectionInfo) {
        dom['step-indicator-text'].textContent = sectionInfo.specificName;
    }
}
function extractCityFromProps(props) {
  const addr = (props && props.address) || {};
  return addr.city || addr.town || addr.village || addr.municipality || addr.locality || addr.county || addr.state || null;
}
function setCityDisplay(city) {
  const el = document.getElementById('ciudad-display');
  if (el) el.textContent = city || '—';
}
function updateConfirmButton() {
  const btn = document.getElementById('confirmar-ubicacion');
  if (btn) btn.disabled = !selectedCity;
}

async function reverseGeocode(lat, lon) {
    try {
        const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=es`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Error al obtener dirección');
        const data = await response.json();
        const city = extractCityFromProps(data.address);
        if (city) {
            selectedCity = city;
            userSelections.selectedCity = city;
            userSelections.ciudad = { codigo: null, nombre: city };
            setCityDisplay(city);
            updateConfirmButton();
        }
    } catch (err) {
        console.error('Error en reverseGeocode:', err);
    }
}

function showMapScreenFormSection(sectionIdToShow) {
    ['city-selection-section', 'user-type-section', 'supply-section', 'income-section'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    const sectionToShow = document.getElementById(sectionIdToShow);
    if (sectionToShow) {
        sectionToShow.style.display = 'block';
    } else {
        console.error(`Map screen section '${sectionIdToShow}' not found.`);
    }
}

function setupNavigationButtons() {
    console.log("Setting up navigation buttons...");
    const addSafeListener = (id, event, handler) => {
        const element = dom[id] || document.getElementById(id);
        if (element) {
            element.addEventListener(event, handler);
        } else {
            console.warn(`Element with ID '${id}' not found for event listener.`);
        }
    };

    addSafeListener('basic-user-button', 'click', () => {
        userSelections.userType = 'basico';
        if (dom['data-form-screen']) dom['data-form-screen'].classList.add('basic-user-mode');
        showMapScreenFormSection('supply-section');
    });

    addSafeListener('expert-user-button', 'click', () => {
        userSelections.userType = 'experto';
        if (dom['data-form-screen']) dom['data-form-screen'].classList.remove('basic-user-mode');
        showMapScreenFormSection('supply-section');
    });

    addSafeListener('residential-button', 'click', () => {
        userSelections.installationType = 'Residencial';
        showMapScreenFormSection('income-section');
    });

    const handleNonResidential = (type) => {
        userSelections.installationType = type;
        showScreen('data-form-screen');
        if (dom['data-meteorologicos-section']) dom['data-meteorologicos-section'].style.display = 'block';
        updateStepIndicator('data-meteorologicos-section');
    };

    addSafeListener('commercial-button', 'click', () => handleNonResidential('Comercial'));
    addSafeListener('pyme-button', 'click', () => handleNonResidential('PYME'));

    const handleIncome = (level) => {
        userSelections.incomeLevel = level;
        showScreen('data-form-screen');
        if (dom['data-meteorologicos-section']) dom['data-meteorologicos-section'].style.display = 'block';
        updateStepIndicator('data-meteorologicos-section');
    };

    addSafeListener('income-high-button', 'click', () => handleIncome('ALTO'));
    addSafeListener('income-low-button', 'click', () => handleIncome('BAJO'));
    addSafeListener('income-medium-button', 'click', () => handleIncome('MEDIO'));

    addSafeListener('moneda', 'change', e => userSelections.selectedCurrency = e.target.value);

    addSafeListener('next-to-energia', 'click', e => {
        e.preventDefault();
        const selectedZona = document.querySelector('input[name="zonaInstalacionNewScreen"]:checked');
        if (selectedZona) userSelections.selectedZonaInstalacion = selectedZona.value;
        showScreen('energia-section');
        updateStepIndicator('energia-section');
        // initElectrodomesticosSection(); // This should be called here
    });

    addSafeListener('finalizar-calculo', 'click', async e => {
        e.preventDefault();
        console.log('Finalizing...');
        const payload = { /* ... create payload from userSelections ... */ };
        try {
            const response = await fetch(API_BASE + '/generar_informe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userSelections) // Sending the whole object for now
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error ${response.status}`);
            }
            const informeFinal = await response.json();
            localStorage.setItem('informeSolar', JSON.stringify(informeFinal));
            localStorage.setItem('userSelections', JSON.stringify(userSelections));
            window.location.href = 'informe.html';
        } catch (error) {
            console.error('Error generating report:', error);
            alert('Error al generar el informe: ' + error.message);
        }
    });

    console.log("Navigation buttons setup complete.");
}


function setupSidebarNavigation() {
    console.log("Setting up sidebar navigation...");
    const navMap = {
        'sidebar-datos': 'data-meteorologicos-section',
        'sidebar-energia': 'energia-section',
        'sidebar-paneles': 'paneles-section',
        'sidebar-inversor': 'inversor-section',
        'sidebar-perdidas': 'perdidas-section',
        'sidebar-analisis-economico': 'analisis-economico-section',
    };
    Object.entries(navMap).forEach(([sidebarId, target]) => {
        const element = document.getElementById(sidebarId);
        if (element) {
            element.addEventListener('click', () => {
                showScreen(target);
                updateStepIndicator(target);
                // Here you could call init functions if needed, e.g.,
                // if (target === 'energia-section') initElectrodomesticosSection();
            });
        } else {
             console.warn(`Sidebar element '${sidebarId}' not found.`);
        }
    });
    console.log("Sidebar navigation setup complete.");
}

document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOM content loaded. Starting initialization.");
    try {
        cacheDOMElements();
        await initCitySearch();
        setupNavigationButtons();
        setupSidebarNavigation();
        showScreen('map-screen');
        showMapScreenFormSection('city-selection-section');
if (window.map) {
    map.on('click', function(e) {
        handleLocationSelected(e.latlng); // si ya la tenés, dejala

        if (!geocoderService) geocoderService = L.Control.Geocoder.nominatim();
        geocoderService.reverse(e.latlng, map.getZoom(), (results) => {
            if (results && results.length) {
                const r = results[0];
                selectedCity = extractCityFromProps(r.properties);
                selectedAddress = (r.properties && r.properties.display_name) || "";
                setCityDisplay(selectedCity);
                updateConfirmButton();
            }
        });
    });
}
updateConfirmButton();
        console.log("Initialization complete.");
    } catch (error) {
        console.error("Fatal error during initialization:", error);
        document.body.innerHTML = `<div style="text-align: center; padding: 50px;">
            <h1>Error al cargar la aplicación</h1>
            <p>Detalle: ${error.message}</p>
        </div>`;
    }
});
const confirmarUbicacionBtn = document.getElementById('confirmar-ubicacion');
if (confirmarUbicacionBtn) {
  confirmarUbicacionBtn.addEventListener('click', async () => {
    if (!selectedCity) {
      alert('Seleccioná una ciudad válida (buscá o hacé click en el mapa).');
      return;
    }
    try {
      // Guardamos en Excel: Datos de Entrada!B7
      const res = await fetch('/api/seleccionar_ubicacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: selectedCity,
          address: selectedAddress || '',
          lat: userSelections.location.lat,
          lng: userSelections.location.lng
        })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'No se pudo guardar la ubicación');

      // Guardar en estado del front si lo usás después
      userSelections.selectedCity = data.city;

      alert(`Ubicación guardada: ${data.city}. Podés continuar con el cálculo.`);
    } catch (err) {
      console.error(err);
      alert('Error guardando la ubicación. Probá nuevamente.');
    }
  });
}

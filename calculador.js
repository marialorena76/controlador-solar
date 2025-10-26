// Evitar ejecutar este archivo dos veces
if (window.__CS_LOADED__) { console.warn('calculador.js ya cargado'); }
if (window.__CS_LOADED__) throw new Error('CS_DUP_LOAD'); // corta la segunda ejecución
window.__CS_LOADED__ = true;

const API_BASE = "/api";

let map = null;
let marker = null; 
let geocoderCtrl = null;
let userLocation = { lat: -34.6037, lng: -58.3816 };

const userSelections = {
  userType: null,
  location: { lat: userLocation.lat, lng: userLocation.lng, address: null },
  city: null,
  installationType: null,
  incomeLevel: null,
  zonaInstalacionExpert: null,
  zonaInstalacionBasic: null,
  selectedZonaInstalacion: null,
  superficieRodea: { descripcion: null, valor: null },
  rugosidadSuperficie: { descripcion: null, valor: null },
  rotacionInstalacion: { descripcion: null, valor: null },
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


window.appliancesCache ??= null; 

function loadSavedLocation() {
  try {
    const stored = localStorage.getItem('ubicacionSeleccionada');
    if (!stored) return;

    const parsed = JSON.parse(stored);
    if (parsed && typeof parsed.lat === 'number' && typeof parsed.lng === 'number') {
      const savedAddress = typeof parsed.address === 'string' ? parsed.address : null;
      userLocation = { lat: parsed.lat, lng: parsed.lng };
      userSelections.location = {
        lat: parsed.lat,
        lng: parsed.lng,
        address: savedAddress
      };
      userSelections.city = savedAddress && savedAddress.trim() ? savedAddress : null;
    }
  } catch (error) {
    console.warn('No se pudo cargar la ubicación guardada:', error);
  }
}

function updateLocationDisplay(lat, lng, label = null) {
  const latDisplay = document.getElementById('lat-display');
  if (latDisplay) {
    latDisplay.textContent = typeof lat === 'number' ? lat.toFixed(6) : '-';
  }

  const lngDisplay = document.getElementById('lng-display');
  if (lngDisplay) {
    lngDisplay.textContent = typeof lng === 'number' ? lng.toFixed(6) : '-';
  }

  const addressDisplay = document.getElementById('address-display');
  if (addressDisplay) {
    const addressText =
      label ||
      userSelections.city ||
      (userSelections.location && userSelections.location.address) ||
      '-';
    addressDisplay.textContent = addressText;
  }
}

function placeMarker(latlng) {
  if (!map || !latlng) return;

  const position = [latlng.lat, latlng.lng];

  if (!marker) {
    marker = L.marker(position, { draggable: true }).addTo(map);
    marker.on('dragend', (event) => {
      const newLatLng = event.target.getLatLng();
      handleLocationSelected(newLatLng);
    });
  } else {
    marker.setLatLng(position);
  }
}

function updateCitySelection(cityName) {
  const normalizedCity =
    typeof cityName === 'string' && cityName.trim().length > 0
      ? cityName.trim()
      : null;

  userSelections.city = normalizedCity;
  if (userSelections.location) {
    userSelections.location.address = normalizedCity;
  }

  const confirmBtn = document.getElementById('confirm-location-btn');
  if (confirmBtn) {
        confirmBtn.disabled = !userSelections.city;
  }
}

function handleLocationSelected(latlng, cityName = null) {
  if (!latlng) return;

  const loadingIndicator = document.getElementById('map-loading');
  const mapError = document.getElementById('map-error');
  if (mapError) {
    mapError.style.display = 'none';
    mapError.textContent = '';
  }

  userLocation = { lat: latlng.lat, lng: latlng.lng };
  userSelections.location = {
    lat: latlng.lat,
    lng: latlng.lng,
    address: cityName || userSelections.city || null
  };

  placeMarker(latlng);
  updateLocationDisplay(latlng.lat, latlng.lng, cityName || userSelections.city);

  if (cityName) {
    if (loadingIndicator) {
      loadingIndicator.style.display = 'none';
    }
    updateCitySelection(cityName);
  } else {
    if (loadingIndicator) {
      loadingIndicator.style.display = 'block';
    }
    updateCitySelection(null);

    if (geocoderCtrl?.options?.geocoder?.reverse) {
      geocoderCtrl.options.geocoder.reverse(latlng, map.getZoom(), (results) => {
        if (loadingIndicator) {
          loadingIndicator.style.display = 'none';
        }
        if (results && results[0]) {
          const result = results[0];
          const reverseName =
            result.name ||
            result.properties?.display_name ||
            null;
          if (reverseName) {
            updateCitySelection(reverseName);
            updateLocationDisplay(latlng.lat, latlng.lng, reverseName);
          }
        } else {
          if (mapError) {
            mapError.style.display = 'block';
            mapError.textContent = 'No se pudo determinar la ciudad seleccionada. Probá otra ubicación.';
          }
        }
      });
    } else {
      if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
      }
      if (mapError) {
        mapError.style.display = 'block';
        mapError.textContent = 'El geocodificador no está disponible para obtener la ciudad.';
      }
    }
  }
}

function initializeMap() {
  if (typeof L === 'undefined') {
    console.error('Leaflet no está cargado.');
    return;
  }

  // Cerrar/limpiar mapa previo sin romper si 'map' no es de Leaflet
  if (map && typeof map.remove === 'function') {
    try { map.off(); } catch (e) { /* nada */ }
    try { map.remove(); } catch (e) { /* nada */ }
  }
  map = null;
  marker = null;
  geocoderCtrl = null;

  // Esperar a que el contenedor exista y tenga dimensiones
  const mapContainer = document.getElementById('map');
  if (!mapContainer) {
    console.warn('Contenedor del mapa no encontrado.');
    return;
  }

  // A veces el contenedor existe pero aún no tiene layout; forzá el init al próximo frame
  if (mapContainer.offsetWidth === 0 || mapContainer.offsetHeight === 0) {
    requestAnimationFrame(initializeMap);
    return;
  }

  // Crear mapa y capa base
  map = L.map('map').setView(
    [ (userLocation?.lat ?? -34.6037), (userLocation?.lng ?? -58.3816) ],
    13
  );

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  // Geocoder
  geocoderCtrl = L.Control.geocoder({
    defaultMarkGeocode: false,
    placeholder: 'Buscar ciudad o dirección...',
    showResultIcons: true
  })
  .on('markgeocode', (e) => {
    const center = e.geocode.center;
    const cityName = e.geocode.name || e.geocode.properties?.display_name || null;
    map.setView(center, 13);
    handleLocationSelected(center, cityName); // tu función actual
  })
  .addTo(map);

  // Si querés mover el geocoder a tu contenedor custom
  const geocoderContainer = document.getElementById('geocoder-container');
  if (geocoderContainer) {
    const geocoderEl = document.querySelector('.leaflet-control-geocoder');
    if (geocoderEl && geocoderEl.parentNode !== geocoderContainer) {
      geocoderContainer.appendChild(geocoderEl);
    }
  }

  // Marker inicial (si tenés userLocation)
  if (userLocation?.lat && userLocation?.lng) {
    marker = L.marker([userLocation.lat, userLocation.lng]).addTo(map);
  }

  // Click en el mapa → actualizar selección
  map.on('click', (e) => {
    const latlng = e.latlng;
    if (!marker) marker = L.marker(latlng).addTo(map);
    else marker.setLatLng(latlng);
    handleLocationSelected(latlng, null); // vos resolvés el nombre vía backend o reverse
  });
}

function initMap() {
  const mapContainer = document.getElementById('map');
  const wasHidden =
    mapContainer && (mapContainer.offsetParent === null || mapContainer.clientHeight === 0);









  const invalidate = () => {
    if (!map) return;
    try {
      map.invalidateSize();
    } catch (error) {
      console.warn('No se pudo invalidar el tamaño del mapa:', error);
    }
  };

  if (wasHidden) {
    requestAnimationFrame(() => requestAnimationFrame(invalidate));
  } else {
    requestAnimationFrame(invalidate);
  }
}


function showScreen(screenId) {
  const screens = ['map-screen', 'data-form-screen'];
  screens.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (id === screenId) {
      el.style.display = id === 'map-screen' ? 'flex' : 'block';
    } else {
      el.style.display = 'none';
    }
  });
}

function showMapScreenFormSection(sectionIdToShow) {
  const sections = ['map-container-section', 'user-type-section', 'supply-section', 'income-section'];
  sections.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = id === sectionIdToShow ? 'block' : 'none';
  });
}

function setupNavigationButtons() {
  const confirmBtn = document.getElementById('confirm-location-btn');
  const basicUserBtn = document.getElementById('basic-user-button');
  const expertUserBtn = document.getElementById('expert-user-button');
  const residentialBtn = document.getElementById('residential-button');
  const commercialBtn = document.getElementById('commercial-button');
  const pymeBtn = document.getElementById('pyme-button');
  const incomeHighBtn = document.getElementById('income-high-button');
  const incomeMediumBtn = document.getElementById('income-medium-button');
  const incomeLowBtn = document.getElementById('income-low-button');
  const sidebar = document.querySelector('#data-form-screen .sidebar');

  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      if (!userSelections.location.lat) {
        alert('Por favor, selecciona una ubicación en el mapa.');
        return;
      }
      showMapScreenFormSection('user-type-section');
    });
  }

  if (basicUserBtn) {
    basicUserBtn.addEventListener('click', () => {
      userSelections.userType = 'Basico';
      if(sidebar) sidebar.classList.add('hidden');
      showMapScreenFormSection('supply-section');
    });
  }

  if (expertUserBtn) {
    expertUserBtn.addEventListener('click', () => {
      userSelections.userType = 'Experto';
      if(sidebar) sidebar.classList.remove('hidden');
      showMapScreenFormSection('supply-section');
    });
  }

  if (residentialBtn) {
    residentialBtn.addEventListener('click', () => {
      userSelections.installationType = 'Residencial';
      showMapScreenFormSection('income-section');
    });
  }

  if (commercialBtn) {
      commercialBtn.addEventListener('click', () => {
        userSelections.installationType = 'Comercial';
        if (sidebar) sidebar.classList.remove('hidden');
        showScreen('data-form-screen');
      });
  }

  if (pymeBtn) {
      pymeBtn.addEventListener('click', () => {
        userSelections.installationType = 'PYME';
        if (sidebar) sidebar.classList.remove('hidden');
        showScreen('data-form-screen');
      });
  }

  const handleIncomeSelection = (level) => {
    userSelections.incomeLevel = level;
    if (userSelections.userType === 'Basico') {
      showScreen('data-form-screen');
      document.getElementById('data-meteorologicos-section').classList.remove('hidden');
      document.getElementById('energia-section').classList.add('hidden');
    } else {
      showScreen('data-form-screen');
    }
  };

  if (incomeHighBtn) incomeHighBtn.addEventListener('click', () => handleIncomeSelection('ALTO'));
  if (incomeMediumBtn) incomeMediumBtn.addEventListener('click', () => handleIncomeSelection('MEDIO'));
  if (incomeLowBtn) incomeLowBtn.addEventListener('click', () => handleIncomeSelection('BAJO'));
}

function setupZonaInstalacionStep() {
    const nextButton = document.getElementById('next-to-energia');
    const backButton = document.getElementById('back-to-income-from-zona');
    const zonaSection = document.getElementById('data-meteorologicos-section');
    const energiaSection = document.getElementById('energia-section');

    if (nextButton) {
        nextButton.addEventListener('click', () => {
            const selectedZona = document.querySelector('input[name="zonaInstalacionNewScreen"]:checked');
            if (!selectedZona) {
                alert('Por favor, selecciona una zona de instalación.');
                return;
            }
            userSelections.zonaInstalacionBasic = selectedZona.value;
            zonaSection.classList.add('hidden');
            energiaSection.classList.remove('hidden');
            initEnergyForBasic();
        });
    }

    if (backButton) {
        backButton.addEventListener('click', () => {
            showScreen('map-screen');
            showMapScreenFormSection('income-section');
        });
    }
}

// === Config ===
// URL del JSON (debe existir en la raíz pública del sitio)
const APPLIANCES_JSON_URL = '/consumos_electrodomesticos.json';

// Cache en memoria del JSON
let appliancesCache = null;

// Helpers de UI mínimos usados aquí
function show(el) { if (el) el.style.display = ''; }
function hide(el) { if (el) el.style.display = 'none'; }

// Referencias a elementos de ENERGÍA (coinciden con tu HTML)
const energiaSectionEl          = document.getElementById('energia-section');
const listaElectrodomesticosEl = document.getElementById('electrodomesticos-categorias');
const facturaMensualEl         = document.getElementById('consumo-factura-section');
const promedioMensualEl        = document.getElementById('consumo-promedio-section'); // lo dejamos oculto salvo que lo uses
const totalMensualEl           = document.getElementById('totalConsumoMensual');
const totalAnualEl             = document.getElementById('totalConsumoAnual');
const btnNextPaneles           = document.getElementById('next-to-paneles');

// ---------- API de alto nivel que vas a llamar al entrar a Energía ----------
async function initEnergyForBasic() {
  if (!energiaSectionEl) return;

  // Modo en función del tipo de instalación
  const tipo = (userSelections?.installationType || '').toLowerCase(); // 'residencial' | 'comercial' | 'pyme'...

  if (tipo === 'residencial') {
    // Mostrar electrodomésticos
    await ensureAppliancesLoaded();
    renderAppliances(appliancesCache);
    show(listaElectrodomesticosEl);
    hide(facturaMensualEl);
    hide(promedioMensualEl);
  } else {
    // Mostrar inputs de factura (12 meses)
    ensureMonthlyInputsHandlers();
    hide(listaElectrodomesticosEl);
    show(facturaMensualEl);
    hide(promedioMensualEl);
  }

  // Actualizar el resumen por si algo ya estaba tildado/completado
  recalcEnergySummary();
  show(energiaSectionEl);
  energiaSectionEl.scrollIntoView({ behavior: 'smooth' });
}

// ---------- Carga de electrodomésticos vía API ----------
async function ensureAppliancesLoaded() {
  if (appliancesCache) return;
  try {
    const res = await fetch(`${API_BASE}/electrodomesticos`);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    appliancesCache = data.categorias; // API envuelve en "categorias"
  } catch (err) {
    console.error('No se pudo cargar los datos de electrodomésticos desde la API:', err);
    const container = document.getElementById('electrodomesticos-categorias');
    if (container) {
      container.innerHTML = `<div class="city-error">No se pudieron cargar los electrodomésticos.</div>`;
    }
  }
}

// ---------- Render de electrodomésticos (residencial) ----------
function renderAppliances(data) {
    const container = document.getElementById('electrodomesticos-categorias');
    if (!container) return;
    container.innerHTML = '';

    if (!data || typeof data !== 'object') {
        console.error("No appliance data or incorrect format:", data);
        return;
    }

    // `data` is now the object of categories, e.g., {"Cocina": [...]}
    for (const category in data) {
        const items = data[category];
        if (!Array.isArray(items)) continue;

        const categoryId = category.replace(/\s+/g, '-').toLowerCase();
        const categorySection = document.createElement('div');
        categorySection.className = 'accordion-item';
        categorySection.innerHTML = `
            <h2 class="accordion-header" id="heading-${categoryId}">
                <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse-${categoryId}" aria-expanded="false" aria-controls="collapse-${categoryId}">
                    ${category}
                </button>
            </h2>
            <div id="collapse-${categoryId}" class="accordion-collapse collapse" aria-labelledby="heading-${categoryId}" data-bs-parent="#electrodomesticos-categorias">
                <div class="accordion-body"></div>
            </div>
        `;

        const accordionBody = categorySection.querySelector('.accordion-body');
        items.forEach(item => {
            const kwhMes = (Number(item.consumo_diario_kwh || 0) * 30.4).toFixed(2);
            const nombre = item.name || 'Item';
            const watts = item.watts || 0;

            const itemEl = document.createElement('div');
            itemEl.className = 'appliance-item-row d-flex justify-content-between align-items-center mb-2';
            itemEl.innerHTML = `
                <label class="form-check-label">${nombre}</label>
                <div class="quantity-control d-flex align-items-center" style="width: 120px;">
                    <button type="button" class="btn btn-outline-secondary btn-sm quantity-btn" data-action="decrease">-</button>
                    <input type="number" class="form-control form-control-sm text-center appliance-quantity" value="0" min="0" data-item-name="${nombre}" data-watts="${watts}" data-kwh-mes="${kwhMes}">
                    <button type="button" class="btn btn-outline-secondary btn-sm quantity-btn" data-action="increase">+</button>
                </div>
            `;
            accordionBody.appendChild(itemEl);
        });
        container.appendChild(categorySection);
    }

    container.addEventListener('click', (event) => {
        if (event.target.classList.contains('quantity-btn')) {
            const action = event.target.dataset.action;
            const input = event.target.parentElement.querySelector('.appliance-quantity');
            let currentValue = parseInt(input.value, 10);
            if (action === 'increase') {
                currentValue++;
            } else if (action === 'decrease' && currentValue > 0) {
                currentValue--;
            }
            input.value = currentValue;
            input.dispatchEvent(new Event('change', { bubbles: true }));
        }
    });

    container.addEventListener('change', (event) => {
        if (event.target.classList.contains('appliance-quantity')) {
            calcularConsumoTotal();
        }
    });

    // Initial calculation
    calcularConsumoTotal();
}

// Suma los kWh/mes de los items según cantidad
function calcularConsumoTotal() {
    let totalKwhMes = 0;
    const inputs = document.querySelectorAll('.appliance-quantity');
    userSelections.electrodomesticos = {}; // Reset

    inputs.forEach(input => {
        const quantity = parseInt(input.value, 10);
        const itemName = input.dataset.itemName;
        if (quantity > 0) {
            const kwhMes = parseFloat(input.dataset.kwhMes);
            totalKwhMes += quantity * kwhMes;
            userSelections.electrodomesticos[itemName] = quantity;
        } else {
            delete userSelections.electrodomesticos[itemName];
        }
    });

    userSelections.totalMonthlyConsumption = totalKwhMes;
    userSelections.totalAnnualConsumption = totalKwhMes * 12;

    const totalMensualEl = document.getElementById('totalConsumoMensual');
    const totalAnualEl = document.getElementById('totalConsumoAnual');

    if (totalMensualEl) {
        totalMensualEl.value = userSelections.totalMonthlyConsumption.toFixed(2);
    }
    if (totalAnualEl) {
        totalAnualEl.value = userSelections.totalAnnualConsumption.toFixed(2);
    }
}

// ---------- Handlers para inputs de 12 meses (comercial/pyme) ----------
let monthlyInputsWired = false;
function ensureMonthlyInputsHandlers() {
  if (monthlyInputsWired) return;

  const ids = [
    'consumo-enero','consumo-febrero','consumo-marzo','consumo-abril',
    'consumo-mayo','consumo-junio','consumo-julio','consumo-agosto',
    'consumo-septiembre','consumo-octubre','consumo-noviembre','consumo-diciembre'
  ];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => {
        recalcEnergyFromMonthlyInputs();
        recalcEnergySummary();
      });
    }
  });
  monthlyInputsWired = true;
}

function recalcEnergyFromMonthlyInputs() {
  const ids = [
    'consumo-enero','consumo-febrero','consumo-marzo','consumo-abril',
    'consumo-mayo','consumo-junio','consumo-julio','consumo-agosto',
    'consumo-septiembre','consumo-octubre','consumo-noviembre','consumo-diciembre'
  ];
  let sum = 0;
  let count = 0;
  ids.forEach(id => {
    const v = Number(document.getElementById(id)?.value || 0);
    sum += v;
    if (!Number.isNaN(v) && v > 0) count++;
  });
  const promedioMes = sum / 12; // usamos promedio anual / 12; si querés promedio de meses cargados, usa (sum / count) con guardas
  userSelections.totalMonthlyKwh = Math.round(promedioMes * 100) / 100;
  userSelections.totalYearlyKwh  = Math.round(sum);
}

// ---------- Actualiza los 2 campos del resumen ----------
function recalcEnergySummary() {
  const kwhMes  = Number(userSelections.totalMonthlyKwh || 0);
  const kwhAnio = Number(userSelections.totalYearlyKwh  || Math.round(kwhMes * 12));
  if (totalMensualEl) totalMensualEl.value = kwhMes.toString();
  if (totalAnualEl)   totalAnualEl.value   = kwhAnio.toString();
}

async function generarInformeDesdeFrontend() {
    // Validaciones
    if (!userSelections.location || !userSelections.location.lat) {
        alert("Por favor, selecciona tu ubicación en el mapa antes de generar el informe.");
        return;
    }
    if (userSelections.totalAnnualConsumption <= 0) {
        alert("Por favor, ingresa tu consumo de energía antes de generar el informe.");
        return;
    }

    try {
        const response = await fetch('/api/generar_informe', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userSelections),
        });

        if (!response.ok) {
            throw new Error(`Error del servidor: ${response.status}`);
        }

        const results = await response.json();

        // Ocultar la pantalla de datos y mostrar la de resultados
        showScreen('resultados-informe');
        const resultadosContainer = document.getElementById('resultados-informe');

        // Renderizar los resultados (ejemplo simple)
        if (typeof renderReportData === 'function') {
            renderReportData(results, 'resultados-informe');
        } else {
            let html = '<h1>Resultados del Informe</h1>';
            for (const key in results) {
                html += `<p><strong>${key}:</strong> ${results[key]}</p>`;
            }
            resultadosContainer.innerHTML = html;
        }
        resultadosContainer.classList.remove('hidden');

    } catch (error) {
        console.error('Error al generar el informe:', error);
        alert('Hubo un error al generar el informe. Por favor, intenta de nuevo.');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadSavedLocation();
    setupNavigationButtons();
    setupZonaInstalacionStep();
    showScreen('map-screen');
    showMapScreenFormSection('map-container-section');

    const mapScreen = document.getElementById('map-screen');
    if (mapScreen) mapScreen.style.display = 'block';

    requestAnimationFrame(() => {
        initializeMap();
        setTimeout(() => {
            if (window.map && map.invalidateSize) map.invalidateSize();
        }, 200);
    });

    initMap();

    const confirmBtn = document.getElementById('confirm-location-btn');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', async () => {
            if (!userSelections.location || userSelections.location.lat === null) {
                alert("Por favor, selecciona tu ubicación en el mapa antes de continuar.");
                return;
            }
            if (!userSelections.city) {
                alert('Elegí una ubicación o buscá una ciudad antes de confirmar.');
                return;
            }

            try {
                const response = await fetch(`${API_BASE}/ubicacion`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ city: userSelections.city })
                });

                const data = await response.json().catch(() => ({}));
                if (!response.ok || data?.ok !== true) {
                    throw new Error(data?.error || 'No se pudo guardar la ubicación');
                }

                const savedCity = typeof data.city === 'string' && data.city.trim()
                    ? data.city.trim()
                    : userSelections.city;

                try {
                    localStorage.setItem('ubicacionSeleccionada', JSON.stringify({
                        lat: userLocation.lat,
                        lng: userLocation.lng,
                        address: savedCity
                    }));
                } catch (error) {
                    console.warn('No se pudo guardar la ubicación seleccionada:', error);
                }

                showMapScreenFormSection('user-type-section');

                const mapAreaTitle = document.querySelector('.map-area h2');
                const mapAreaHelpText = document.querySelector('.map-area .help-text');
                if (mapAreaTitle) mapAreaTitle.style.display = 'none';
                if (mapAreaHelpText) mapAreaHelpText.style.display = 'none';

            } catch (error) {
                console.error('Error al guardar la ubicación:', error);
                alert('Error guardando la ubicación: ' + error.message);
            }
        });
    }

    const nextToPanelesButton = document.getElementById('next-to-paneles');
    if (nextToPanelesButton) {
        nextToPanelesButton.addEventListener('click', (e) => {
            e.preventDefault();
            if (userSelections.userType === 'Basico') {
                generarInformeDesdeFrontend();
            } else {
                // Flujo experto
                const dataMeteorologicosSection = document.getElementById('data-meteorologicos-section');
                const panelesSection = document.getElementById('paneles-section');
                if (dataMeteorologicosSection) dataMeteorologicosSection.classList.add('hidden');
                if (panelesSection) panelesSection.classList.remove('hidden');
            }
        });
    }

    const backToZonaButton = document.getElementById('back-to-zona-from-energia');
    if (backToZonaButton) {
        backToZonaButton.addEventListener('click', () => {
            document.getElementById('energia-section').classList.add('hidden');
            document.getElementById('data-meteorologicos-section').classList.remove('hidden');
        });
    }
});

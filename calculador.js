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


let appliancesCache = null;

// Cargar el JSON solo una vez
async function ensureAppliancesLoaded() {
  if (appliancesCache) { renderAppliances(appliancesCache); return; }
  try {
    const res = await fetch('/consumos_electrodomesticos.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    appliancesCache = await res.json();
    renderAppliances(appliancesCache);
  } catch (err) {
    console.error('No se pudo cargar consumos_electrodomesticos.json:', err);
    const cont = document.getElementById('appliance-list');
    if (cont) cont.innerHTML = `<div class="city-error">No se pudieron cargar los electrodomésticos.</div>`;
  }
}

// Pintar la lista en la pantalla de Energía
function renderAppliances(data) {
  const cont = document.getElementById('appliance-list'); // Asegurate que exista en el HTML
  if (!cont) return;
  cont.innerHTML = '';

  (data || []).forEach(item => {
    const row = document.createElement('div');
    row.className = 'appliance-item';
    // Ajustá las propiedades según tu JSON (nombre / kwh_mes / etc.)
    row.innerHTML = `
      <label class="appliance-row">
        <input type="checkbox" class="appliance-check" data-kwh="${item.kwh_mes || item.kwhMes || 0}">
        <span>${item.nombre || item.name}</span>
      </label>
    `;
    cont.appendChild(row);
  });

  // (opcional) recalcular consumo cuando el usuario tilda
  cont.addEventListener('change', handleApplianceChange, { once: true });
}

function handleApplianceChange() {
  const checks = [...document.querySelectorAll('.appliance-check:checked')];
  const kwhMes = checks.reduce((acc, el) => acc + Number(el.dataset.kwh || 0), 0);
  const kwhAnio = Math.round(kwhMes * 12);

  // Mostrarlos en los campos que ves en la captura
  const mesEl  = document.querySelector('#energia-mensual'); // id del input mensual
  const anioEl = document.querySelector('#energia-anual');   // id del input anual
  if (mesEl)  mesEl.value  = (Math.round(kwhMes * 100) / 100).toString();
  if (anioEl) anioEl.value = kwhAnio.toString();
}

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

  if (map) {
    try { map.off(); } catch (error) { console.warn('No se pudo quitar eventos previos del mapa:', error); }
    try { map.remove(); } catch (error) { console.warn('No se pudo remover el mapa previo:', error); }
    map = null;
  }
  marker = null;
  geocoderCtrl = null;

  const mapContainer = document.getElementById('map');
  if (!mapContainer) {
    console.warn('Contenedor del mapa no encontrado.');
    return;
  }

  const confirmBtn = document.getElementById('confirm-location-btn');
  if (confirmBtn) {
    confirmBtn.disabled = !userSelections.city;
  }

  const defaultLat = typeof userLocation.lat === 'number' ? userLocation.lat : -34.6037;
  const defaultLng = typeof userLocation.lng === 'number' ? userLocation.lng : -58.3816;

  map = L.map('map').setView([defaultLat, defaultLng], 5);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors',
  maxZoom: 19
}).addTo(map);

// Diagnóstico si hubiera bloqueo de tiles
map.on('load', () => console.log('Leaflet map load OK'));
map.eachLayer(l => l.on?.('tileerror', e => console.error('Tile error', e)));

  geocoderCtrl = L.Control.geocoder({
    defaultMarkGeocode: false,
    placeholder: 'Buscar ciudad o dirección...',
    showResultIcons: true
  });

  geocoderCtrl.on('markgeocode', (e) => {
    const center = e.geocode.center;
    const cityName = e.geocode.name || e.geocode.properties?.display_name || null;
    map.setView(center, 13);
    handleLocationSelected(center, cityName);
  });

  const geocoderContainer = document.getElementById('geocoder-container');
  if (geocoderContainer) {
    while (geocoderContainer.firstChild) {
      geocoderContainer.removeChild(geocoderContainer.firstChild);
    }

    geocoderCtrl.addTo(map);
    const geocoderEl = mapContainer.querySelector('.leaflet-control-geocoder');
    if (geocoderEl && geocoderEl.parentNode !== geocoderContainer) {
      geocoderContainer.appendChild(geocoderEl);

      const form = geocoderEl.querySelector('.leaflet-control-geocoder-form');
      if (form) {
        let submitBtn = form.querySelector('button');
        if (!submitBtn) {
          submitBtn = document.createElement('button');
          submitBtn.type = 'submit';
          form.appendChild(submitBtn);
        }
        submitBtn.textContent = 'Buscar';
      }
    }
  } else {
    geocoderCtrl.addTo(map);
  }

  map.on('click', (e) => handleLocationSelected(e.latlng));

  handleLocationSelected({ lat: defaultLat, lng: defaultLng }, userSelections.city);
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
  const basicUserButton = document.getElementById('basic-user-button');
  if (basicUserButton) {
    basicUserButton.addEventListener('click', () => {
      userSelections.userType = 'basico';
      showMapScreenFormSection('supply-section');
    });
  }

  const expertUserButton = document.getElementById('expert-user-button');
  if (expertUserButton) {
    expertUserButton.addEventListener('click', () => {
      userSelections.userType = 'experto';
      showMapScreenFormSection('supply-section');
    });
  }

  const residentialButton = document.getElementById('residential-button');
  if (residentialButton) {
    residentialButton.addEventListener('click', () => {
      userSelections.installationType = 'Residencial';
      showMapScreenFormSection('income-section');
    });
  }

  const goToDataScreen = (type) => {
    userSelections.installationType = type;
    showScreen('data-form-screen');
  };

  const commercialButton = document.getElementById('commercial-button');
  if (commercialButton) {
    commercialButton.addEventListener('click', () => goToDataScreen('Comercial'));
  }

  const pymeButton = document.getElementById('pyme-button');
  if (pymeButton) {
    pymeButton.addEventListener('click', () => goToDataScreen('PYME'));
  }

  const registerIncome = (level) => {
    userSelections.incomeLevel = level;
    showScreen('data-form-screen');
  };

  const incomeHighButton = document.getElementById('income-high-button');
  if (incomeHighButton) {
    incomeHighButton.addEventListener('click', () => registerIncome('ALTO'));
  }

  const incomeMediumButton = document.getElementById('income-medium-button');
  if (incomeMediumButton) {
    incomeMediumButton.addEventListener('click', () => registerIncome('MEDIO'));
  }

  const incomeLowButton = document.getElementById('income-low-button');
  if (incomeLowButton) {
    incomeLowButton.addEventListener('click', () => registerIncome('BAJO'));
  }
}

function setupZonaInstalacionStep() {
  const zonaRadios = Array.from(
    document.querySelectorAll('input[name="zona-instalacion"], input[name="zonaInstalacionNewScreen"]')
  );
  const nextButton =
    document.getElementById('btn-zona-siguiente') || document.getElementById('next-to-energia');

  const zonaSection = document.getElementById('data-meteorologicos-section');
  const energiaSection =
    document.getElementById('energia-screen') || document.getElementById('energia-section');

  const sectionsToHide = [
    'data-meteorologicos-section',
    'superficie-section',
    'rugosidad-section',
    'rotacion-section',
    'altura-instalacion-section',
    'metodo-calculo-section'
  ];

  const updateSelectionState = () => {
    const selectedRadio = zonaRadios.find((radio) => radio.checked);
    if (selectedRadio) {
      userSelections.selectedZonaInstalacion = selectedRadio.value;
      if (nextButton) nextButton.disabled = false;
    } else {
      userSelections.selectedZonaInstalacion = null;
      if (nextButton) nextButton.disabled = true;
    }
  };

  zonaRadios.forEach((radio) => {
    radio.addEventListener('change', updateSelectionState);
  });

  if (nextButton) {
    nextButton.disabled = true;
    nextButton.addEventListener('click', (event) => {
      event?.preventDefault?.();

      if (!userSelections.selectedZonaInstalacion) {
        alert('Seleccioná una zona antes de continuar.');
        return;
      }

      // Ocultar secciones intermedias
      sectionsToHide.forEach((sectionId) => {
        const sectionEl = document.getElementById(sectionId);
        if (sectionEl && sectionEl !== energiaSection) {
          sectionEl.style.display = 'none';
        }
      });

      // Mostrar pantalla/section de energía
      if (energiaSection) {
        energiaSection.style.display = 'block';
        energiaSection.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
      } else {
        console.warn('Pantalla de energía no encontrada.');
      }

      // Ocultar la sección actual (si existe)
      if (zonaSection) {
        zonaSection.style.display = 'none';
      }

      // Si usás pantallas por clase
      document.querySelectorAll('.step-screen').forEach((screen) => {
        if (screen instanceof HTMLElement) screen.style.display = 'none';
      });
      const energiaScreen = document.getElementById('energia-screen');
      if (energiaScreen) energiaScreen.style.display = '';
    });
  }

  updateSelectionState();
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
const listaElectrodomesticosEl = document.getElementById('electrodomesticos-list');
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

// ---------- Carga del JSON de electrodomésticos ----------
async function ensureAppliancesLoaded() {
  if (appliancesCache) return;
  try {
    const res = await fetch(APPLIANCES_JSON_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    appliancesCache = await res.json();
  } catch (err) {
    console.error('No se pudo cargar consumos_electrodomesticos.json:', err);
    if (listaElectrodomesticosEl) {
      listaElectrodomesticosEl.innerHTML =
        `<div class="city-error">No se pudieron cargar los electrodomésticos.</div>`;
    }
  }
}

// ---------- Render de electrodomésticos (residencial) ----------
function renderAppliances(data) {
  if (!listaElectrodomesticosEl) return;
  listaElectrodomesticosEl.innerHTML = '';

  (data || []).forEach(item => {
    // Ajustá claves según tu JSON (dejo kwh_mes como principal)
    const kwhMes  = Number(item.kwh_mes ?? item.kwhMes ?? 0);
    const nombre  = item.nombre ?? item.name ?? 'Item';

    const row = document.createElement('div');
    row.className = 'appliance-item';
    row.innerHTML = `
      <label class="appliance-row" style="display:flex;gap:.6rem;align-items:center;">
        <input type="checkbox" class="appliance-check" data-kwh="${kwhMes}">
        <span style="flex:1">${nombre}</span>
        <small title="Consumo de referencia">(≈ ${kwhMes} kWh/mes)</small>
      </label>
    `;
    listaElectrodomesticosEl.appendChild(row);
  });

  // Recalcular cada vez que el usuario tilda/ destilda algo
  listaElectrodomesticosEl.addEventListener('change', () => {
    recalcEnergyFromAppliances();
    recalcEnergySummary();
  }, { once: true });
}

// Suma los kWh/mes de los items tildados (residencial)
function recalcEnergyFromAppliances() {
  const checks = [...document.querySelectorAll('.appliance-check:checked')];
  const kwhMes = checks.reduce((acc, el) => acc + Number(el.dataset.kwh || 0), 0);
  // Guardamos en userSelections por si lo usás luego
  userSelections.totalMonthlyKwh = kwhMes;
  userSelections.totalYearlyKwh  = Math.round(kwhMes * 12);
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

document.getElementById('btn-zona-next')?.addEventListener('click', async () => {
  // (validaciones de zona, etc.)
  const tipoUsuario = (userSelections.userType || '').toLowerCase();

  if (tipoUsuario === 'basico') {
    // Mostrar la sección de energía con el modo correcto
    await initEnergyForBasic();

    // ⚠️ Cuando termina la sección de energía, el botón "Siguiente"
    // ya no lleva a paneles, sino a generar el informe.
    const btnNext = document.getElementById('next-to-paneles');
    if (btnNext) {
      btnNext.addEventListener('click', async (e) => {
        e.preventDefault();
        // Calcula el consumo final y genera el informe automáticamente
        recalcEnergySummary();
        console.log('Generando informe para usuario básico...');
        await generarInformeDesdeFrontend(); // 👈 función que tenés o agregamos abajo
      });
    }

  } else {
    // Flujo Avanzado (lo que ya tenías)
    // showScreen('paneles-section');  // o como se llame tu siguiente pantalla
  }
});

async function generarInformeDesdeFrontend() {
  try {
    const res = await fetch('/api/generar_informe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userSelections),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al generar el informe');
    console.log('Informe generado:', data);
    alert('✅ Informe generado correctamente');
  } catch (err) {
    console.error('Error generando informe:', err);
    alert('❌ No se pudo generar el informe.');
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
  setTimeout(() => {        // por si el contenedor se pintó oculto
    if (window.map && map.invalidateSize) map.invalidateSize();
  }, 200);
  });
  initMap();

  const confirmBtn = document.getElementById('confirm-location-btn');
  if (confirmBtn) {
    confirmBtn.addEventListener('click', async () => {
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

        const locationDisplay = document.getElementById('location-display');
        if (locationDisplay) {
          locationDisplay.textContent = `Ubicación guardada: ${savedCity}`;
          locationDisplay.style.backgroundColor = '#e9f5e9';
        }

        // Navegación: Ocultar la sección del mapa y mostrar la sección de tipo de usuario
        showMapScreenFormSection('user-type-section');
        
        // Ocultar el encabezado y el texto de ayuda de la sección del mapa
        const mapAreaTitle = document.querySelector('.map-area h2');
        const mapAreaHelpText = document.querySelector('.map-area .help-text');
        if (mapAreaTitle) {
            mapAreaTitle.style.display = 'none';
        }
        if (mapAreaHelpText) {
            mapAreaHelpText.style.display = 'none';
        }
      } catch (error) {
        console.error('Error al guardar la ubicación:', error);
        const locationDisplay = document.getElementById('location-display');
        if (locationDisplay) {
          locationDisplay.textContent = 'Error al guardar la ubicación.';
          locationDisplay.style.backgroundColor = '#fbe9e7';
        }
        alert('Error guardando la ubicación: ' + error.message);
      }
    });
  }

  if (typeof cargarElectrodomesticosJSON === 'function') {
    try {
      cargarElectrodomesticosJSON();
    } catch (error) {
      console.error('Error al cargar electrodomésticos:', error);
    }
  }
});

// ===== Hook universal para pasar de ZONA → ENERGÍA (usuario BÁSICO) =====

// Helpers mínimos
function isVisible(el) {
  if (!el) return false;
  const s = getComputedStyle(el);
  if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}
function textMatch(el, re) {
  return el && re.test((el.textContent || '').trim());
}
function inZonaScreen() {
  // Heurísticas: cualquiera que dé true ya alcanza
  // 1) contenedor con id típico de zona
  const candidates = [
    '#zona-section', '#zona-instalacion-section', '#zona-inst-section',
    '[data-step="zona"]', '.zona-section'
  ];
  if (candidates.some(sel => isVisible(document.querySelector(sel)))) return true;

  // 2) hay radios/inputs de zona visibles
  if ([...document.querySelectorAll('input[name="selectedZonaInstalacion"]')].some(isVisible)) return true;

  // 3) hay un título típico
  const h = [...document.querySelectorAll('h1,h2,h3')]
    .find(x => /zona.*instalaci[oó]n/i.test(x.textContent || ''));
  if (isVisible(h)) return true;

  return false;
}

// Generar informe (si no tenés una función propia)
async function generarInformeDesdeFrontend() {
  try {
    const res = await fetch('/api/generar_informe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userSelections),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al generar el informe');
    alert('✅ Informe generado correctamente');
    console.log('Informe:', data);
  } catch (err) {
    console.error(err);
    alert('❌ No se pudo generar el informe.');
  }
}

// Enganche global: cualquier click en “Siguiente” estando en Zona
document.addEventListener('click', async (ev) => {
  const btn = ev.target.closest('button, a[role="button"], input[type="submit"]');
  if (!btn) return;

  // ¿Es un “Siguiente” visible?
  if (!isVisible(btn) || !textMatch(btn, /siguiente/i)) return;

  // ¿Estamos en la pantalla de Zona?
  if (!inZonaScreen()) return;

  const tipoUsuario = (userSelections?.userType || '').toLowerCase();
  if (tipoUsuario !== 'basico') return; // solo para Básico

  // Intercepto la navegación normal y abro ENERGÍA
  ev.preventDefault();
  ev.stopPropagation();

  try {
    if (typeof initEnergyForBasic === 'function') {
      await initEnergyForBasic();
    }

    // Mostrar energía sí o sí
    document.querySelectorAll('.screen, [id$="-section"]').forEach(s => {
      if (isVisible(s)) s.style.display = 'none';
    });
    const energia = document.getElementById('energia-section');
    if (energia) {
      energia.style.display = '';
      energia.scrollIntoView({ behavior: 'smooth' });
    } else {
      console.error('[ENERGIA] No existe #energia-section en el DOM.');
    }

    // En Básico, el botón “Siguiente” de Energía debe generar informe
    const nextBtn = document.getElementById('next-to-paneles');
    if (nextBtn && !nextBtn.__hookGenInforme) {
      nextBtn.__hookGenInforme = true;
      nextBtn.addEventListener('click', async (e2) => {
        e2.preventDefault();
        if (typeof recalcEnergySummary === 'function') recalcEnergySummary();
        await (typeof generarInformeDesdeFrontend === 'function'
          ? generarInformeDesdeFrontend()
          : Promise.resolve());
      });
    }
  } catch (err) {
    console.error('[ENERGIA] Error al abrir energía:', err);
  }
}, { capture: true });

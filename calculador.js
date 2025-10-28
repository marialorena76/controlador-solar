// Evitar ejecutar este archivo dos veces
if (window.__CS_LOADED__) { console.warn('calculador.js ya cargado'); }
if (window.__CS_LOADED__) throw new Error('CS_DUP_LOAD'); // corta la segunda ejecución
window.__CS_LOADED__ = true;

const API_BASE = "/api";

let map = null;
let marker = null; 
let geocoderCtrl = null;
let userLocation = { lat: -34.6037, lng: -58.3816 };
// --- Datos electrodomésticos ---
let electrodomesticosCategorias = {};
let appliancesCache = null; 

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
const energiaSectionEl         = document.getElementById('energia-section');
const listaElectrodomesticosEl = document.getElementById('electrodomesticos-categorias');
const totalConsumoMensualDisplay = document.getElementById('totalConsumoMensual');
const totalConsumoAnualDisplay   = document.getElementById('totalConsumoAnual');
const consumoFacturaSectionEl    = document.getElementById('consumo-factura-section');
const consumoPromedioSectionEl   = document.getElementById('consumo-promedio-section');

// helpers show/hide si no los tenés aún:
function show(el){ if(el) el.classList.remove('hidden'); }
function hide(el){ if(el) el.classList.add('hidden'); }


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
        showMapScreenFormSection('income-section');
      });
  }

  if (pymeBtn) {
      pymeBtn.addEventListener('click', () => {
        userSelections.installationType = 'PYME';
        showMapScreenFormSection('income-section');
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
    if (nextButton) {
        nextButton.addEventListener('click', () => {
            const selectedZona = document.querySelector('input[name="zonaInstalacionNewScreen"]:checked');
            if (!selectedZona) {
                alert('Por favor, selecciona una zona de instalación.');
                return;
            }
            userSelections.zonaInstalacionBasic = selectedZona.value;
            userSelections.installationType = 'Residencial';
            zonaSection.classList.add('hidden');
            if (energiaSectionEl) energiaSectionEl.classList.remove('hidden');
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

// ---------- API de alto nivel que vas a llamar al entrar a Energía ----------
async function initEnergyForBasic() {
  console.log('[ENERGIA] init for tipo =', (userSelections?.installationType || ''));
  console.log('[ENERGIA] elementos:', { energiaSectionEl, listaElectrodomesticosEl });

  if (!energiaSectionEl || !listaElectrodomesticosEl) {
    console.warn('[ENERGIA] Faltan elementos requeridos para iniciar la sección de energía.');
    return;
  }

  const tipo = (userSelections?.installationType || '').toLowerCase();

  if (tipo === 'residencial') {
    try {
      const data = await ensureAppliancesLoaded();
      renderAppliances(data);
      recalcEnergySummary(data);
      show(listaElectrodomesticosEl);
      hide(consumoFacturaSectionEl);
      hide(consumoPromedioSectionEl);
    } catch (error) {
      console.error('[ENERGIA] No se pudo inicializar el detalle de electrodomésticos:', error);
      listaElectrodomesticosEl.innerHTML = '<p class="energy-error">No se pudo cargar la información de electrodomésticos.</p>';
    }
  } else {
    ensureMonthlyInputsHandlers();
    hide(listaElectrodomesticosEl);
    show(consumoFacturaSectionEl);
    hide(consumoPromedioSectionEl);
    recalcEnergySummaryFromMonthlyInputsUI();
  }

  show(energiaSectionEl);
  energiaSectionEl.scrollIntoView({ behavior: 'smooth' });
}

// ---------- Carga de electrodomésticos vía API ----------
async function ensureAppliancesLoaded(){
  if (appliancesCache) return appliancesCache;
  const url = 'consumos_electrodomesticos.json';
  const res = await fetch(url);
  if(!res.ok) throw new Error(`No se pudo cargar ${url} (HTTP ${res.status})`);
  appliancesCache = await res.json();
  console.log('[ENERGIA] JSON cargado correctamente:', url);
  electrodomesticosCategorias = appliancesCache;
  return appliancesCache;
}


// ---------- Render de electrodomésticos (residencial) ----------
function renderAppliances(data) {
  if (!listaElectrodomesticosEl) {
    console.warn('No existe #electrodomesticos-categorias para renderizar');
    return;
  }

  listaElectrodomesticosEl.innerHTML = '';

  if (!data || Object.keys(data).length === 0) {
    listaElectrodomesticosEl.innerHTML = '<p class="energy-error">No hay datos de electrodomésticos disponibles.</p>';
    return;
  }

  console.log('[ENERGIA] renderAppliances data keys =', Object.keys(data).length);

  Object.entries(data).forEach(([categoria, items]) => {
    const header = document.createElement('button');
    header.type = 'button';
    header.className = 'acordeon-categoria';
    header.textContent = categoria;
    header.style = `
      width:100%; padding:10px 16px; margin:10px 0 0 0;
      background:#e2e8f0; border:none; border-radius:6px; font-weight:600; text-align:left; cursor:pointer;
    `;

    const panel = document.createElement('div');
    panel.className = 'acordeon-items';
    panel.style = 'display:none; padding:12px 16px; background:#f9fafb; border-radius:0 0 6px 6px;';

    header.onclick = () => {
      const open = panel.style.display === 'block';
      document.querySelectorAll('.acordeon-items').forEach(d => (d.style.display = 'none'));
      document.querySelectorAll('.acordeon-categoria').forEach(b => b.setAttribute('aria-expanded', 'false'));
      if (!open) {
        panel.style.display = 'block';
        header.setAttribute('aria-expanded', 'true');
      }
    };

    items.forEach(item => {
      const row = document.createElement('div');
      row.style = 'display:flex; align-items:center; justify-content:space-between; gap:16px; margin:10px 0;';

      const name = document.createElement('span');
      name.textContent = item.name;
      name.style = 'flex:1 1 auto; font-weight:500;';

      const info = document.createElement('span');
      const consumoDiario = ((item.watts || 0) * (item.hoursPerDay || 0)) / 1000;
      info.textContent = `${consumoDiario.toFixed(3)} kWh/día`;
      info.style = 'flex:0 0 140px; color:#475569; font-size:0.9rem; text-align:right;';

      const input = document.createElement('input');
      input.type = 'number';
      input.min = '0';
      input.value = (userSelections.electrodomesticos?.[item.name] || 0);
      input.style = 'width:70px; text-align:right;';
      input.oninput = (e) => {
        const cant = parseInt(e.target.value, 10) || 0;
        if (!userSelections.electrodomesticos) userSelections.electrodomesticos = {};
        userSelections.electrodomesticos[item.name] = cant;
        recalcEnergySummary(data);
      };

      row.appendChild(name);
      row.appendChild(info);
      row.appendChild(input);
      panel.appendChild(row);
    });

    listaElectrodomesticosEl.appendChild(header);
    listaElectrodomesticosEl.appendChild(panel);
  });
}

function recalcEnergySummary(dataRef) {
  const data = dataRef || appliancesCache || electrodomesticosCategorias;
  if (!data) return;

  let totalMensual = 0;

  for (const categoria in data) {
    data[categoria].forEach(item => {
      const cant = (userSelections.electrodomesticos?.[item.name] || 0);
      const kWhDia = ((item.watts || 0) * (item.hoursPerDay || 0)) / 1000;
      const diasMes = item.daysPerMonth ?? 30;    // usa tu campo del JSON si viene; default 30
      totalMensual += kWhDia * diasMes * cant;
    });
  }

  const totalAnual = totalMensual * 12;

  userSelections.totalMonthlyConsumption = totalMensual;
  userSelections.totalAnnualConsumption  = totalAnual;

  // si existen, actualizá inputs de resumen
  if (totalConsumoMensualDisplay) totalConsumoMensualDisplay.value = totalMensual.toFixed(2);
  if (totalConsumoAnualDisplay)   totalConsumoAnualDisplay.value   = totalAnual.toFixed(2);
}

function calcularConsumo() {
  recalcEnergySummary();
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
        recalcEnergySummaryFromMonthlyInputsUI();
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
  recalcEnergySummaryFromMonthlyInputsUI();
}

// ---------- Actualiza los 2 campos del resumen ----------
function recalcEnergySummaryFromMonthlyInputsUI(){
  const kwhMes  = Number(userSelections.totalMonthlyKwh || 0);
  const kwhAnio = Number(userSelections.totalYearlyKwh  || Math.round(kwhMes * 12));
  if (totalConsumoMensualDisplay) totalConsumoMensualDisplay.value = kwhMes.toString();
  if (totalConsumoAnualDisplay)   totalConsumoAnualDisplay.value   = kwhAnio.toString();
}

async function generarInformeDesdeFrontend() {
  const ui = document.getElementById('resultados-informe');
  if (ui) ui.innerHTML = '<b>Generando informe...</b>';

  try {
    const res = await fetch('/api/generar_informe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userSelections)
    });

    if (!res.ok) {
      throw new Error(`Error del servidor: ${res.status}`);
    }

    const data = await res.json();
    if (ui) {
      if (data.error) {
        ui.innerHTML = `<span style="color:#b91c1c;">${data.error}</span>`;
      } else {
        const tabla = (data.tabla_resultados || [])
          .map(row => {
            const cells = row
              .map(col => `<td style="border:1px solid #e5e7eb; padding:6px;">${col ?? ''}</td>`)
              .join('');
            return `<tr>${cells}</tr>`;
          })
          .join('');

        ui.innerHTML = `
          <h2>Informe generado</h2>
          <p><b>Moneda:</b> ${data.moneda ?? '-'}</p>
          <p><b>Zona:</b> ${data.resumen?.zona ?? '-'}</p>
          <p><b>Consumo mensual:</b> ${data.resumen?.consumo_mensual_kwh ?? '-'} kWh</p>
          <p><b>Consumo anual:</b> ${data.resumen?.consumo_anual_kwh ?? '-'} kWh</p>
          <h3>Resultados (B3:L50)</h3>
          <div style="overflow:auto; max-height:340px; border:1px solid #e5e7eb;">
            <table style="width:100%; border-collapse:collapse;">
              ${tabla}
            </table>
          </div>
        `;
        ui.scrollIntoView({ behavior: 'smooth' });
      }
    }
  } catch (err) {
    console.error('Error al generar el informe:', err);
    if (ui) ui.innerHTML = `<span style="color:#b91c1c;">Error al generar el informe: ${err.message}</span>`;
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
        nextToPanelesButton.onclick = async (e) => {
            e.preventDefault();
            calcularConsumo();
            if ((userSelections.totalAnnualConsumption || 0) <= 0) {
                alert('Por favor, ingresa la cantidad de electrodomésticos para calcular el consumo de energía.');
                return;
            }

            if (userSelections.userType === 'Basico') {
                await generarInformeDesdeFrontend();
            } else {
                if (typeof showDataFormSubSection === 'function') {
                    showDataFormSubSection('paneles-section');
                } else {
                    const dataMeteorologicosSection = document.getElementById('data-meteorologicos-section');
                    const panelesSection = document.getElementById('paneles-section');
                    if (dataMeteorologicosSection) dataMeteorologicosSection.classList.add('hidden');
                    if (panelesSection) panelesSection.classList.remove('hidden');
                }
            }
        };
    }

    const backToZonaButton = document.getElementById('back-to-datos');
    if (backToZonaButton) {
        backToZonaButton.addEventListener('click', () => {
            document.getElementById('energia-section').classList.add('hidden');
            document.getElementById('data-meteorologicos-section').classList.remove('hidden');
        });
    }
});

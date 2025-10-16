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

window.userSelections = userSelections;

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

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

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

  initializeMap();

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
  const zonaRadios = Array.from(document.querySelectorAll('input[name="zona-instalacion"]'));
  const nextButton = document.getElementById('btn-zona-siguiente');

  const updateSelectionState = () => {
    const selectedRadio = zonaRadios.find((radio) => radio.checked);
    if (selectedRadio) {
      userSelections.selectedZonaInstalacion = selectedRadio.value;
      if (nextButton) {
        nextButton.disabled = false;
      }
    } else {
      userSelections.selectedZonaInstalacion = null;
      if (nextButton) {
        nextButton.disabled = true;
      }
    }
  };

  zonaRadios.forEach((radio) => {
    radio.addEventListener('change', () => {
      updateSelectionState();
    });
  });

  if (nextButton) {
    nextButton.addEventListener('click', () => {
      if (!userSelections.selectedZonaInstalacion) {
        alert('Seleccioná una zona antes de continuar.');
        return;
      }

      const stepScreens = document.querySelectorAll('.step-screen');
      stepScreens.forEach((screen) => {
        if (screen instanceof HTMLElement) {
          screen.style.display = 'none';
        }
      });

      const energiaScreen = document.getElementById('energia-screen');
      if (energiaScreen) {
        energiaScreen.style.display = '';
      }
    });
  }

  updateSelectionState();
}

document.addEventListener('DOMContentLoaded', () => {
  loadSavedLocation();
  setupNavigationButtons();
  setupZonaInstalacionStep();
  showScreen('map-screen');
  showMapScreenFormSection('map-container-section');
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

        // Ocultar todos los elementos del área del mapa y mostrar solo la selección de tipo de usuario
        const mapArea = document.querySelector('.map-area');
        if (mapArea) {
            mapArea.querySelector('h2').style.display = 'none';
            mapArea.querySelector('.help-text').style.display = 'none';
            mapArea.querySelector('#map-container-section').style.display = 'none';

            const userTypeSection = mapArea.querySelector('#user-type-section');
            if (userTypeSection) {
                userTypeSection.style.display = 'block';
            }
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

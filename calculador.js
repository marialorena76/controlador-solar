console.log('🤖 calculador.js cargado - flujo de controlador ajustado y persistencia de datos');

let map, marker;
let userLocation = { lat: -34.6037, lng: -58.3816 }; // Buenos Aires por defecto

// Objeto para almacenar todas las selecciones del usuario
let userSelections = {
    userType: null,
    location: userLocation,
    installationType: null,
    incomeLevel: null,
    zonaInstalacionExpert: null, // Remains for now, though the element is gone
    zonaInstalacionBasic: null,
    selectedZonaInstalacion: null, // New property
    superficieRodea: { // New property for "Superficie Rodea"
        descripcion: null,
        valor: null
    },
    rugosidadSuperficie: { // New property
        descripcion: null,
        valor: null
    },
    rotacionInstalacion: { // New property
        descripcion: null,
        valor: null
    },
    electrodomesticos: {}, // Almacenará { "Nombre Electrodoméstico": cantidad }
    totalMonthlyConsumption: 0,
    totalAnnualConsumption: 0,
    selectedCurrency: 'Pesos argentinos', // Valor por defecto
    // Propiedades para los nuevos pasos (ajusta si ya tenías estas estructuras con otros nombres)
    panelesSolares: {
        tipo: null,
        cantidad: 0,
        potenciaNominal: 0, // Potencia total de paneles en kWp
        superficie: 0
    },
    inversor: {
        tipo: null,
        potenciaNominal: 0 // Potencia nominal del inversor en kW
    },
    perdidas: {
        eficienciaPanel: 0,
        eficienciaInversor: 0,
        factorPerdidas: 0
    }
};

let electrodomesticosCategorias = {}; // JSON que se cargará desde el backend

// Elementos principales del DOM
const latitudDisplay = document.getElementById('latitud-display');
const longitudDisplay = document.getElementById('longitud-display');
const mapScreen = document.getElementById('map-screen');
const dataFormScreen = document.getElementById('data-form-screen');
const dataMeteorologicosSection = document.getElementById('data-meteorologicos-section');
const energiaSection = document.getElementById('energia-section');
const panelesSection = document.getElementById('paneles-section');
const inversorSection = document.getElementById('inversor-section');
const perdidasSection = document.getElementById('perdidas-section');
const analisisEconomicoSection = document.getElementById('analisis-economico-section');
const stepIndicatorText = document.getElementById('step-indicator-text');
const totalConsumoMensualDisplay = document.getElementById('totalConsumoMensual');
const totalConsumoAnualDisplay = document.getElementById('totalConsumoAnual');

// Elementos de las secciones del formulario en map-screen
const userTypeSection = document.getElementById('user-type-section');
const supplySection = document.getElementById('supply-section');
const incomeSection = document.getElementById('income-section');
const expertSection = document.getElementById('expert-section');
const consumoFacturaSection = document.getElementById('consumo-factura-section');
const superficieSection = document.getElementById('superficie-section');
const rugosidadSection = document.getElementById('rugosidad-section');
const rotacionSection = document.getElementById('rotacion-section');


// --- Funciones de Persistencia (NUEVO BLOQUE INTEGRADO) ---

function saveUserSelections() {
    localStorage.setItem('userSelections', JSON.stringify(userSelections));
    console.log('User selections guardadas:', userSelections);
}

function loadUserSelections() {
    const savedSelections = localStorage.getItem('userSelections');
    if (savedSelections) {
        userSelections = JSON.parse(savedSelections);
        console.log('User selections cargadas:', userSelections);
        // Asegurarse de que userLocation esté actualizado si se cargó de localStorage
        if (userSelections.location) {
            userLocation = userSelections.location;
        }
        // También actualiza la UI para los campos no-electrodomésticos
        updateUIFromSelections();
    }
}

// Función para actualizar la UI con las selecciones cargadas (para inputs no-electrodomésticos)
function updateUIFromSelections() {
    // Asegúrate de que estos IDs existen en tu HTML
    // const userTypeSelect = document.getElementById('user-type');
    // if (userTypeSelect && userSelections.userType) {
    //     userTypeSelect.value = userSelections.userType;
    // }

    // const installationTypeSelect = document.getElementById('installation-type');
    // if (installationTypeSelect && userSelections.installationType) {
    //     installationTypeSelect.value = userSelections.installationType;
    // }

    // const incomeLevelSelect = document.getElementById('income-level');
    // if (incomeLevelSelect && userSelections.incomeLevel) {
    //     incomeLevelSelect.value = userSelections.incomeLevel;
    // }

    const zonaInstalacionExpertSelect = document.getElementById('zona-instalacion-expert');
    if (zonaInstalacionExpertSelect && userSelections.zonaInstalacionExpert) {
        zonaInstalacionExpertSelect.value = userSelections.zonaInstalacionExpert;
    }

    // const zonaInstalacionBasicSelect = document.getElementById('zona-instalacion-basic');
    // if (zonaInstalacionBasicSelect && userSelections.zonaInstalacionBasic) {
    //     zonaInstalacionBasicSelect.value = userSelections.zonaInstalacionBasic;
    // }

    const monedaSelect = document.getElementById('moneda');
    if (monedaSelect && userSelections.selectedCurrency) {
        monedaSelect.value = userSelections.selectedCurrency;
    }

    // Actualizar displays de consumo (se recalcularán con calcularConsumo después de cargar electrodomésticos)
    if (totalConsumoMensualDisplay) totalConsumoMensualDisplay.value = userSelections.totalMonthlyConsumption.toFixed(2);
    if (totalConsumoAnualDisplay) totalConsumoAnualDisplay.value = userSelections.totalAnnualConsumption.toFixed(2);

    // Si tienes inputs para paneles, inversor o pérdidas que guardas en userSelections, actualízalos aquí también
    const tipoPanelInput = document.getElementById('tipo-panel'); // Asegúrate que este ID exista en tu HTML
    if (tipoPanelInput && userSelections.panelesSolares?.tipo) {
        tipoPanelInput.value = userSelections.panelesSolares.tipo;
    }
    // ... y así para otros campos de paneles, inversor, pérdidas si los tienes en userSelections
    const cantidadPanelesInput = document.getElementById('cantidad-paneles-input'); // Si tienes un input para cantidad
    if (cantidadPanelesInput && userSelections.panelesSolares?.cantidad) {
        cantidadPanelesInput.value = userSelections.panelesSolares.cantidad;
    }

    const potenciaInversorInput = document.getElementById('potencia-inversor-input'); // Si tienes un input para potencia de inversor
    if (potenciaInversorInput && userSelections.inversor?.potenciaNominal) {
        potenciaInversorInput.value = userSelections.inversor.potenciaNominal;
    }
    const eficienciaPanelInput = document.getElementById('eficiencia-panel-input');
    if (eficienciaPanelInput && userSelections.perdidas?.eficienciaPanel) {
        eficienciaPanelInput.value = userSelections.perdidas.eficienciaPanel;
    }
    const eficienciaInversorInput = document.getElementById('eficiencia-inversor-input');
    if (eficienciaInversorInput && userSelections.perdidas?.eficienciaInversor) {
        eficienciaInversorInput.value = userSelections.perdidas.eficienciaInversor;
    }
    const factorPerdidasInput = document.getElementById('factor-perdidas-input');
    if (factorPerdidasInput && userSelections.perdidas?.factorPerdidas) {
        factorPerdidasInput.value = userSelections.perdidas.factorPerdidas;
    }
}


// --- Nueva función para inicializar la sección de Superficie Rodea ---
async function initSuperficieSection() {
    const container = document.getElementById('superficie-options-container');
    if (!container) {
        console.error("Contenedor 'superficie-options-container' no encontrado.");
        return;
    }
    container.innerHTML = ''; // Limpiar opciones anteriores

    try {
        const response = await fetch('http://127.0.0.1:5000/api/superficie_options'); // Ensure this URL is correct
        if (!response.ok) {
            // Throw an error that includes response status to be caught by the catch block
            throw new Error(`Error HTTP: ${response.status} ${response.statusText}`);
        }
        const options = await response.json(); // Changed from 'data' to 'options' to match previous version

        if (!Array.isArray(options)) {
            console.error('Respuesta de /api/superficie_options no es un array:', options);
            // Display error in container as well
            container.innerHTML = '<p style="color: red; text-align: center;">Error: Formato de datos incorrecto.</p>';
            return;
        }

        options.forEach(item => {
            const label = document.createElement('label');
            const input = document.createElement('input');
            input.type = 'radio';
            input.name = 'superficieRodeaOption'; // Nombre común para el grupo de radios
            input.value = item.valor;
            input.dataset.descripcion = item.descripcion; // Guardar descripción en dataset

            // Comprobar si esta opción debe estar seleccionada (persistiendo selección)
            if (userSelections.superficieRodea && userSelections.superficieRodea.valor === item.valor) {
                input.checked = true;
            }

            input.addEventListener('change', () => {
                if (input.checked) {
                    userSelections.superficieRodea.descripcion = item.descripcion;
                    userSelections.superficieRodea.valor = parseFloat(item.valor);
                    saveUserSelections();
                    console.log('Superficie rodea seleccionada:', userSelections.superficieRodea);
                }
            });

            label.appendChild(input);
            label.appendChild(document.createTextNode(" " + item.descripcion));
            container.appendChild(label);
        });

    } catch (error) {
        console.error('[SUPERFICIE OPTIONS LOAD ERROR] Error fetching or processing superficie options:', error);
        if (error.message) {
            console.error('[SUPERFICIE OPTIONS LOAD ERROR] Message:', error.message);
        }
        // Attempt to get more details if it's a custom error from !response.ok
        // Note: 'error.response' is not standard for fetch API errors.
        // The 'Error(`Error HTTP: ${response.status} ${response.statusText}`);' line
        // makes error.message contain the status, so this check might be redundant if that's the only source.
        // However, if other types of errors could have a 'response' property, it could be useful.
        if (error.response && error.response.status) {
             console.error('[SUPERFICIE OPTIONS LOAD ERROR] Response Status:', error.response.status);
             console.error('[SUPERFICIE OPTIONS LOAD ERROR] Response Status Text:', error.response.statusText);
        }

        alert('Error al cargar las opciones de superficie. Intente más tarde. Revise la consola del navegador para más detalles técnicos.');

        // Ensure the options container is referenced correctly (it's 'container' in this scope)
        if (container) {
            container.innerHTML = '<p style="color: red; text-align: center;">No se pudieron cargar las opciones. Intente recargar o contacte a soporte si el problema persiste.</p>';
        }
    }
}

// --- Nueva función para inicializar la sección de Rugosidad ---
async function initRugosidadSection() {
    const container = document.getElementById('rugosidad-options-container');
    if (!container) {
        console.error("Contenedor 'rugosidad-options-container' no encontrado.");
        return;
    }
    container.innerHTML = ''; // Limpiar opciones anteriores

    try {
        const response = await fetch('http://127.0.0.1:5000/api/rugosidad_options');
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();

        if (!Array.isArray(data)) {
            console.error('Respuesta de /api/rugosidad_options no es un array:', data);
            container.innerHTML = '<p style="color: red; text-align: center;">Error: Formato de datos incorrecto para rugosidad.</p>';
            return;
        }

        if (data.length === 0) {
            container.innerHTML = '<p style="text-align: center;">No hay opciones de rugosidad disponibles.</p>';
            return;
        }

        data.forEach(item => {
            const label = document.createElement('label');
            const input = document.createElement('input');
            input.type = 'radio';
            input.name = 'rugosidadOption';
            input.value = item.valor;
            input.dataset.descripcion = item.descripcion;

            if (userSelections.rugosidadSuperficie && userSelections.rugosidadSuperficie.valor === item.valor) {
                input.checked = true;
            }

            input.addEventListener('change', () => {
                if (input.checked) {
                    userSelections.rugosidadSuperficie.descripcion = item.descripcion;
                    userSelections.rugosidadSuperficie.valor = parseFloat(item.valor);
                    saveUserSelections();
                    console.log('Rugosidad de superficie seleccionada:', userSelections.rugosidadSuperficie);
                }
            });

            label.appendChild(input);
            label.appendChild(document.createTextNode(" " + item.descripcion));
            container.appendChild(label);
        });

    } catch (error) {
        console.error('[RUGOSIDAD OPTIONS LOAD ERROR] Error fetching or processing rugosidad options:', error);
        if (error.message) {
            console.error('[RUGOSIDAD OPTIONS LOAD ERROR] Message:', error.message);
        }
        alert('Error al cargar las opciones de rugosidad. Intente más tarde. Revise la consola del navegador para más detalles técnicos.');
        if (container) {
            container.innerHTML = '<p style="color: red; text-align: center;">No se pudieron cargar las opciones de rugosidad. Intente recargar o contacte a soporte.</p>';
        }
    }
}

// --- Nueva función para inicializar la sección de Rotación ---
async function initRotacionSection() {
    const container = document.getElementById('rotacion-options-container');
    if (!container) {
        console.error("Contenedor 'rotacion-options-container' no encontrado.");
        return;
    }
    container.innerHTML = ''; // Limpiar opciones anteriores

    try {
        const response = await fetch('http://127.0.0.1:5000/api/rotacion_options');
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();

        if (!Array.isArray(data)) {
            console.error('Respuesta de /api/rotacion_options no es un array:', data);
            container.innerHTML = '<p style="color: red; text-align: center;">Error: Formato de datos incorrecto para rotación.</p>';
            return;
        }

        if (data.length === 0) {
            container.innerHTML = '<p style="text-align: center;">No hay opciones de rotación disponibles.</p>';
            return;
        }

        data.forEach(item => {
            const label = document.createElement('label');
            const input = document.createElement('input');
            input.type = 'radio';
            input.name = 'rotacionOption';
            input.value = item.valor;
            input.dataset.descripcion = item.descripcion;

            if (userSelections.rotacionInstalacion && userSelections.rotacionInstalacion.valor === item.valor) {
                input.checked = true;
            }

            input.addEventListener('change', () => {
                if (input.checked) {
                    userSelections.rotacionInstalacion.descripcion = item.descripcion;
                    userSelections.rotacionInstalacion.valor = parseFloat(item.valor);
                    saveUserSelections();
                    console.log('Rotación de instalación seleccionada:', userSelections.rotacionInstalacion);
                }
            });

            label.appendChild(input);
            label.appendChild(document.createTextNode(" " + item.descripcion));
            container.appendChild(label);
        });

    } catch (error) {
        console.error('[ROTACIÓN OPTIONS LOAD ERROR] Error fetching or processing rotación options:', error);
        if (error.message) {
            console.error('[ROTACIÓN OPTIONS LOAD ERROR] Message:', error.message);
        }
        alert('Error al cargar las opciones de rotación. Intente más tarde. Revise la consola del navegador para más detalles técnicos.');
        if (container) {
            container.innerHTML = '<p style="color: red; text-align: center;">No se pudieron cargar las opciones de rotación. Intente recargar o contacte a soporte.</p>';
        }
    }
}


// --- Funciones para Consumo y Electrodomésticos (NUEVO BLOQUE INTEGRADO) ---

async function cargarElectrodomesticosDesdeBackend() {
    try {
        const response = await fetch('http://127.0.0.1:5000/api/electrodomesticos');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        // Asumiendo que el backend devuelve un objeto con la clave 'categorias'
        electrodomesticosCategorias = data.categorias;
        console.log('Electrodomésticos cargados desde el backend:', electrodomesticosCategorias);
        initElectrodomesticosSection(); // Inicializa la interfaz de electrodomésticos
        calcularConsumo(); // Recalcula el consumo con los datos cargados y cantidades del usuario
    } catch (error) {
        console.error('No se pudieron cargar los electrodomésticos desde el backend:', error);
        alert('No se pudieron cargar los electrodomésticos. Usando datos de respaldo. Asegúrate de que tu backend esté corriendo y sea accesible en http://127.0.0.1:5000');
        // Datos de respaldo en caso de falla para desarrollo/prueba
        electrodomesticosCategorias = {
            "Cocina": [
                { name: "Heladera", consumo_diario_kwh: 1.5 },
                { name: "Microondas", consumo_diario_kwh: 0.6 },
                { name: "Lavarropas", consumo_diario_kwh: 0.7 }
            ],
            "Entretenimiento": [
                { name: "Televisor", consumo_diario_kwh: 0.4 },
                { name: "Computadora", consumo_diario_kwh: 1.2 }
            ]
        };
        initElectrodomesticosSection();
        calcularConsumo();
    }
}

// Función que genera dinámicamente los campos de entrada para electrodomésticos
function initElectrodomesticosSection() {
    const contenedor = document.getElementById('electrodomesticos-list');
    if (!contenedor) {
        console.error("El contenedor 'electrodomesticos-list' no se encontró en el HTML.");
        return;
    }
    contenedor.innerHTML = ''; // Limpiar el contenido anterior

    Object.keys(electrodomesticosCategorias).forEach(categoria => {
        const h2 = document.createElement('h2');
        h2.textContent = categoria;
        contenedor.appendChild(h2);

        const itemsDiv = document.createElement('div');
        itemsDiv.className = 'electrodomesticos-categoria';

        electrodomesticosCategorias[categoria].forEach(item => {
            const row = document.createElement('div');
            row.className = 'electrodomestico-row';

            const name = document.createElement('span');
            name.textContent = item.name;

            const input = document.createElement('input');
            input.type = 'number';
            input.min = '0';
            // Carga la cantidad guardada para este electrodoméstico, o 0 si no existe
            input.value = userSelections.electrodomesticos[item.name] || 0;
            input.id = `cant-${item.name.replace(/\s+/g, '-')}`;
            input.className = 'electrodomestico-input';
            input.addEventListener('change', (e) => { // Usar 'change' para mejor manejo de blur/enter
                userSelections.electrodomesticos[item.name] = parseInt(e.target.value) || 0;
                calcularConsumo(); // Recalcula el consumo total al cambiar una cantidad
                saveUserSelections(); // Guarda las selecciones
            });

            // Calcula el consumo diario individual y lo muestra
            // Asumiendo que tu backend proporciona 'watts' y 'hoursPerDay'
            // Si tu backend solo da 'consumo_diario', puedes usar item.consumo_diario directamente.
            const consumoDiario = item.consumo_diario_kwh || 0;
            const consumoLabel = document.createElement('span');
            consumoLabel.textContent = `${consumoDiario.toFixed(3)} kWh/día`;

            row.appendChild(name);
            row.appendChild(consumoLabel);
            row.appendChild(input);
            itemsDiv.appendChild(row);
        });
        contenedor.appendChild(itemsDiv); // NO debe haber un 'btn' aquí si no quieres un botón por categoría
    });
}

function calcularConsumo() {
    let totalDiario = 0;
    for (const categoria in electrodomesticosCategorias) {
        if (electrodomesticosCategorias.hasOwnProperty(categoria)) {
            electrodomesticosCategorias[categoria].forEach(item => {
                const cant = userSelections.electrodomesticos[item.name] || 0;
                // Ajusta esta lógica si tu backend solo da 'consumo_diario'
                const consumoDiarioItem = item.consumo_diario_kwh || 0;
                totalDiario += consumoDiarioItem * cant;
            });
        }
    }
    userSelections.totalMonthlyConsumption = totalDiario * 30;
    userSelections.totalAnnualConsumption = totalDiario * 365;
    if (totalConsumoMensualDisplay) totalConsumoMensualDisplay.value = userSelections.totalMonthlyConsumption.toFixed(2);
    if (totalConsumoAnualDisplay) totalConsumoAnualDisplay.value = userSelections.totalAnnualConsumption.toFixed(2);
}


// --- Lógica del Mapa (EXISTENTE, CON PEQUEÑAS MEJORAS) ---

function initMap() {
    // CORRECCIÓN: Si el mapa ya está inicializado, lo destruimos para evitar errores de doble inicialización
    if (map) {
        map.remove();
    }
    map = L.map('map').setView(userLocation, 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    marker = L.marker(userLocation).addTo(map);
    if (latitudDisplay) latitudDisplay.value = userLocation.lat.toFixed(6);
    if (longitudDisplay) longitudDisplay.value = userLocation.lng.toFixed(6);

    map.on('click', function(e) {
        userLocation.lat = e.latlng.lat;
        userLocation.lng = e.latlng.lng;
        marker.setLatLng(userLocation);
        if (latitudDisplay) latitudDisplay.value = userLocation.lat.toFixed(6);
        if (longitudDisplay) longitudDisplay.value = userLocation.lng.toFixed(6);
        userSelections.location = userLocation; // Guardar la ubicación en userSelections
        saveUserSelections(); // Guardar las selecciones en localStorage
    });

    // Asegúrate de que el geocodificador esté importado correctamente en tu HTML
    // <script src="https://unpkg.com/leaflet-control-geocoder/dist/Control.Geocoder.js"></script>
    const geocoderControlInstance = L.Control.geocoder({
        placeholder: 'Buscar o ingresar dirección...',
        errorMessage: 'No se encontró la dirección.'
        // defaultMarkGeocode: true, // Let control handle its own marker by default
    }).on('markgeocode', function(e) {
        if (e.geocode && e.geocode.center) {
            userLocation.lat = e.geocode.center.lat;
            userLocation.lng = e.geocode.center.lng;
            
            // The control's default behavior will place/update its own marker.
            // If a separate 'marker' variable is used for map clicks, ensure they coordinate
            // or let the geocoder manage its marker exclusively.
            // For simplicity, if 'marker' is primarily for map clicks,
            // we might not need to call marker.setLatLng(userLocation) here if defaultMarkGeocode is true.
            // However, to ensure OUR 'marker' (from map clicks) is also updated:
            if (marker) { // Check if 'marker' (from map clicks) exists
                marker.setLatLng(userLocation);
            } else { // If no map-click marker exists yet, create one
                marker = L.marker(userLocation).addTo(map);
            }
            
            map.setView(userLocation, 13); // Center map on geocoded location

            if (latitudDisplay) latitudDisplay.value = userLocation.lat.toFixed(6);
            if (longitudDisplay) longitudDisplay.value = userLocation.lng.toFixed(6);
            userSelections.location = userLocation;
            saveUserSelections();
        }
    }).addTo(map);

    // Relocate the geocoder DOM element
    const geocoderElement = geocoderControlInstance.getContainer();
    const customGeocoderContainer = document.getElementById('geocoder-container');
    
    if (customGeocoderContainer && geocoderElement) {
        customGeocoderContainer.innerHTML = ''; // Clear the container first if it has placeholder content or old controls
        customGeocoderContainer.appendChild(geocoderElement);
    } else {
        if (!customGeocoderContainer) console.error('Custom geocoder container (geocoder-container) not found.');
        if (!geocoderElement) console.error('Geocoder control element (geocoderElement) not found.');
    }
}


// --- Lógica de la Navegación de Pantallas (EXISTENTE, VERIFICADA) ---

function showScreen(screenId) {
    // Hide main screen containers first
    if (mapScreen) mapScreen.style.display = 'none';
    if (dataFormScreen) dataFormScreen.style.display = 'none';

    // Hide all individual sub-sections within dataFormScreen explicitly
    if (dataMeteorologicosSection) dataMeteorologicosSection.style.display = 'none';
    if (superficieSection) superficieSection.style.display = 'none';
    if (rugosidadSection) rugosidadSection.style.display = 'none';   // Add/ensure this
    if (rotacionSection) rotacionSection.style.display = 'none';   // Add/ensure this
    if (energiaSection) energiaSection.style.display = 'none';
    if (consumoFacturaSection) consumoFacturaSection.style.display = 'none';
    if (panelesSection) panelesSection.style.display = 'none';
    if (inversorSection) inversorSection.style.display = 'none';
    if (perdidasSection) perdidasSection.style.display = 'none';
    if (analisisEconomicoSection) analisisEconomicoSection.style.display = 'none';

    const targetElement = document.getElementById(screenId);

    if (targetElement) {
        if (screenId === 'map-screen') {
            // Ensure mapScreen variable is the correct DOM element
            if (mapScreen) mapScreen.style.display = 'block'; 
        } else if (screenId === 'data-form-screen') {
            // Ensure dataFormScreen variable is the correct DOM element
            if (dataFormScreen) dataFormScreen.style.display = 'block'; 
            // Default to showing the first step of data-form-screen
            if (dataMeteorologicosSection) dataMeteorologicosSection.style.display = 'block';
        } else { 
            // This case handles screenId being a sub-section like 'energia-section', 
            // 'paneles-section', 'data-meteorologicos-section', etc.
            // These sub-sections are children of the main 'data-form-screen' container.
            
            // First, ensure the main 'data-form-screen' container is visible.
            if (dataFormScreen) {
                dataFormScreen.style.display = 'block';
            }
            // Then, show the specific target sub-section.
            targetElement.style.display = 'block'; 
        }
    } else {
        console.error(`Error: La pantalla con ID '${screenId}' no fue encontrada.`);
    }
    // Note: updateStepIndicator is called by the individual button event listeners 
    // immediately after they call showScreen.
}

function updateStepIndicator(screenId) {
    // let stepNumber = 0; // Original step numbering logic commented out for more descriptive text
    switch (screenId) {
        case 'map-screen':
            if (stepIndicatorText) stepIndicatorText.textContent = 'Paso 1: Ubicación y Tipo de Usuario';
            return;
        // data-form-screen is a container, specific section will dictate the text
        case 'data-meteorologicos-section':
            if (userSelections.userType === 'experto') {
                if (stepIndicatorText) stepIndicatorText.textContent = 'Experto: Paso 1 > Zona de Instalación';
            } else { // Basic user or default
                if (stepIndicatorText) stepIndicatorText.textContent = 'Paso 1 > Datos Meteorológicos';
            }
            return;
        case 'superficie-section': // For expert path
            if (stepIndicatorText) stepIndicatorText.textContent = 'Experto: Paso 2 > Superficie Circundante';
            return;
        case 'rugosidad-section': // For expert path
            if (stepIndicatorText) stepIndicatorText.textContent = 'Experto: Paso 3 > Rugosidad Superficie';
            return;
        case 'rotacion-section': // For expert path
            if (stepIndicatorText) stepIndicatorText.textContent = 'Experto: Paso 4 > Rotación Instalación';
            return;
        case 'energia-section': // For basic path primarily now
            // If an expert somehow lands here, it would be after rotacion (step 4 for expert)
            // but basic path is simpler.
            if (userSelections.userType === 'experto') {
                 if (stepIndicatorText) stepIndicatorText.textContent = 'Experto: Paso 5 > Consumo de Energía';
            } else {
                 if (stepIndicatorText) stepIndicatorText.textContent = 'Paso 2 > Consumo de Energía';
            }
            return;
        case 'consumo-factura-section': // Alternative path for Comercial/PYME
            if (stepIndicatorText) stepIndicatorText.textContent = 'Paso Alternativo > Consumo por Factura';
            return;
        case 'paneles-section':
            if (userSelections.userType === 'experto') {
                if (stepIndicatorText) stepIndicatorText.textContent = 'Experto: Paso 5 > Paneles';
                                                                    // This was step 5 if energia was not shown.
                                                                    // If energia is shown after rotacion, then this is step 6.
                                                                    // For now, keeping it simple as per previous structure.
                                                                    // The Rotacion Next button directly goes here.
            } else { // Basic user
                if (stepIndicatorText) stepIndicatorText.textContent = 'Paso 3 > Paneles';
            }
            return;
        case 'inversor-section':
             if (userSelections.userType === 'experto') {
                if (stepIndicatorText) stepIndicatorText.textContent = 'Experto: Paso 6 > Inversor';
            } else { // Basic user
                if (stepIndicatorText) stepIndicatorText.textContent = 'Paso 4 > Inversor';
            }
            return;
        case 'perdidas-section':
            if (userSelections.userType === 'experto') {
                if (stepIndicatorText) stepIndicatorText.textContent = 'Experto: Paso 7 > Registro Pérdidas';
            } else { // Basic user (doesn't have this step in current flow)
                 if (stepIndicatorText) stepIndicatorText.textContent = 'Paso Avanzado > Registro Pérdidas';
            }
            return;
        case 'analisis-economico-section':
            let pasoFinalTexto = "Análisis Económico";
            if (userSelections.userType === 'experto') {
                pasoFinalTexto = `Experto: Paso 8 > ${pasoFinalTexto}`;
            } else if (userSelections.installationType === 'Comercial' || userSelections.installationType === 'PYME') {
                 pasoFinalTexto = `Paso Final > ${pasoFinalTexto}`; // After Consumo Factura
            } else { // Basic Residencial
                 pasoFinalTexto = `Paso 5 > ${pasoFinalTexto}`; // After Inversor for basic
            }
            if (stepIndicatorText) stepIndicatorText.textContent = pasoFinalTexto;
            return;
        default:
            if (stepIndicatorText) stepIndicatorText.textContent = 'Calculador Solar'; // Default or error text
            return;
    }
}

// Helper function to manage visibility of form sections within map-screen
function showMapScreenFormSection(sectionIdToShow) {
    if (userTypeSection) userTypeSection.style.display = 'none';
    if (supplySection) supplySection.style.display = 'none';
    if (incomeSection) incomeSection.style.display = 'none';
    if (expertSection) expertSection.style.display = 'none';

    const sectionToShow = document.getElementById(sectionIdToShow);
    if (sectionToShow) {
        sectionToShow.style.display = 'block';
    } else {
        console.error('Section with ID ' + sectionIdToShow + ' not found for showMapScreenFormSection.');
    }
}


// --- Configuración de Event Listeners para Botones y Selects (EXISTENTE, MODIFICADA) ---

function setupNavigationButtons() {
    // Get buttons - ensure these IDs exist in calculador.html
    const basicUserButton = document.getElementById('basic-user-button');
    const expertUserButton = document.getElementById('expert-user-button');
    
    const residentialButton = document.getElementById('residential-button');
    const commercialButton = document.getElementById('commercial-button');
    const pymeButton = document.getElementById('pyme-button');

    const incomeHighButton = document.getElementById('income-high-button');
    const incomeLowButton = document.getElementById('income-low-button');
    
    const expertDataForm = document.getElementById('expert-data-form'); // Form itself

    // Initial state on map-screen: show only user-type-section
    // This should ideally be handled by default HTML (display:block for user-type, none for others)
    // or called once in DOMContentLoaded after defining showMapScreenFormSection
    // For safety, can call it here if not sure about initial HTML state:
    // showMapScreenFormSection('user-type-section');

    if (basicUserButton) {
        basicUserButton.addEventListener('click', () => {
            userSelections.userType = 'basico';
            saveUserSelections();
            showMapScreenFormSection('supply-section');
        });
    }

    if (expertUserButton) {
        expertUserButton.addEventListener('click', () => {
            userSelections.userType = 'experto';
            saveUserSelections();

            // Explicitly hide map-screen if it's the current one.
            // The showScreen function should handle this, but being explicit can be safer.
            const mapScreenElement = document.getElementById('map-screen');
            if (mapScreenElement) mapScreenElement.style.display = 'none';

            // Show data-form-screen and ensure data-meteorologicos-section is visible
            // and hide other sections within data-form-screen.
            showScreen('data-meteorologicos-section');
            updateStepIndicator('data-meteorologicos-section');
        });
    }

    if (residentialButton) {
        residentialButton.addEventListener('click', () => {
            userSelections.installationType = 'Residencial';
            saveUserSelections();
            showMapScreenFormSection('income-section');
        });
    }

    if (commercialButton) {
        commercialButton.addEventListener('click', () => {
            userSelections.installationType = 'Comercial';
            saveUserSelections();
            showScreen('consumo-factura-section'); 
            updateStepIndicator('consumo-factura-section'); 
        });
    }

    if (pymeButton) {
        pymeButton.addEventListener('click', () => {
            userSelections.installationType = 'PYME';
            saveUserSelections();
            showScreen('consumo-factura-section'); 
            updateStepIndicator('consumo-factura-section');
        });
    }

    if (incomeHighButton) {
        incomeHighButton.addEventListener('click', () => {
            userSelections.incomeLevel = 'ALTO';
            saveUserSelections();
            showScreen('data-form-screen'); 

            if (dataMeteorologicosSection) dataMeteorologicosSection.style.display = 'block'; // Explicitly show this section
            // Update step indicator to 'data-meteorologicos-section'.
            // The section itself should be visible by default HTML structure within data-form-screen's main-content
            // after showScreen('data-form-screen') has hidden all specific sub-sections.
            updateStepIndicator('data-meteorologicos-section');
        });
    }

    if (incomeLowButton) {
        incomeLowButton.addEventListener('click', () => {
            userSelections.incomeLevel = 'BAJO';
            saveUserSelections();
            showScreen('data-form-screen');

            if (dataMeteorologicosSection) dataMeteorologicosSection.style.display = 'block'; // Explicitly show this section
            // Update step indicator to 'data-meteorologicos-section'.
            updateStepIndicator('data-meteorologicos-section');
        });
    }
    
    if (expertDataForm) {
        expertDataForm.addEventListener('submit', (event) => {
            event.preventDefault(); // Prevent actual form submission
            // Assuming data from expert-data-form is already handled by its 'zona-instalacion-expert' select listener
            // The main purpose here is to navigate
            console.log('Formulario experto guardado (simulado), procediendo a data-form-screen.');
            showScreen('data-form-screen');
        });
    }

    // Listeners para inputs de selección y otros que guardan userSelections
    // Asegúrate de que estos IDs existan en tu HTML
    // document.getElementById('user-type')?.addEventListener('change', (e) => {
    //     userSelections.userType = e.target.value;
    //     saveUserSelections(); // AÑADIDO: Guardar en localStorage
    // });
    // document.getElementById('installation-type')?.addEventListener('change', (e) => {
    //     userSelections.installationType = e.target.value;
    //     saveUserSelections(); // AÑADIDO: Guardar en localStorage
    // });
    // document.getElementById('income-level')?.addEventListener('change', (e) => {
    //     userSelections.incomeLevel = e.target.value;
    //     saveUserSelections(); // AÑADIDO: Guardar en localStorage
    // });
    document.getElementById('zona-instalacion-expert')?.addEventListener('change', (e) => {
        userSelections.zonaInstalacionExpert = e.target.value;
        saveUserSelections(); // AÑADIDO: Guardar en localStorage
    });
    // document.getElementById('zona-instalacion-basic')?.addEventListener('change', (e) => {
    //     userSelections.zonaInstalacionBasic = e.target.value;
    //     saveUserSelections(); // AÑADIDO: Guardar en localStorage
    // });
    document.getElementById('moneda')?.addEventListener('change', (e) => {
        userSelections.selectedCurrency = e.target.value;
        saveUserSelections(); // AÑADIDO: Guardar en localStorage
    });

    // Añade listeners para Paneles Solares si los campos existen y guardan en userSelections.panelesSolares
    document.getElementById('tipo-panel')?.addEventListener('change', (e) => {
        userSelections.panelesSolares.tipo = e.target.value;
        saveUserSelections();
    });
    document.getElementById('cantidad-paneles-input')?.addEventListener('input', (e) => { // Usar input o change
        userSelections.panelesSolares.cantidad = parseInt(e.target.value) || 0;
        saveUserSelections();
    });
    // ... y para potenciaNominal, superficie de paneles

    // Añade listeners para Inversor
    document.getElementById('tipo-inversor')?.addEventListener('change', (e) => {
        userSelections.inversor.tipo = e.target.value;
        saveUserSelections();
    });
    document.getElementById('potencia-inversor-input')?.addEventListener('input', (e) => {
        userSelections.inversor.potenciaNominal = parseFloat(e.target.value) || 0;
        saveUserSelections();
    });

    // Añade listeners para Pérdidas
    document.getElementById('eficiencia-panel-input')?.addEventListener('input', (e) => {
        userSelections.perdidas.eficienciaPanel = parseFloat(e.target.value) || 0;
        saveUserSelections();
    });
    document.getElementById('eficiencia-inversor-input')?.addEventListener('input', (e) => {
        userSelections.perdidas.eficienciaInversor = parseFloat(e.target.value) || 0;
        saveUserSelections();
    });
    document.getElementById('factor-perdidas-input')?.addEventListener('input', (e) => {
        userSelections.perdidas.factorPerdidas = parseFloat(e.target.value) || 0;
        saveUserSelections();
    });


    // Configurar los botones de navegación entre secciones (EXISTENTES)
    // document.getElementById('next-to-data-form')?.addEventListener('click', () => showScreen('data-form-screen'));
    // document.getElementById('back-to-map')?.addEventListener('click', () => showScreen('map-screen'));
    // document.getElementById('next-to-data-meteorologicos')?.addEventListener('click', () => showScreen('data-meteorologicos-section'));
    // document.getElementById('back-to-data-form')?.addEventListener('click', () => showScreen('data-form-screen'));
    document.getElementById('next-to-energia')?.addEventListener('click', () => {
        // Get the selected value from the 'zonaInstalacionNewScreen' radio buttons
        const selectedZona = document.querySelector('input[name="zonaInstalacionNewScreen"]:checked');
        if (selectedZona) {
            userSelections.selectedZonaInstalacion = selectedZona.value;
            saveUserSelections(); // Save the updated selections
            console.log('Zona de instalación seleccionada:', userSelections.selectedZonaInstalacion);
        } else {
            // Optional: Handle case where no option is selected, though 'required' attribute on radio should prevent this.
            console.warn('No se seleccionó zona de instalación.');
            // Consider if you want to prevent navigation if nothing is selected,
            // though HTML 'required' attribute should ideally handle form validation.
        }

        // Proceed with navigation
        if (userSelections.userType === 'experto') {
            showScreen('superficie-section');
            updateStepIndicator('superficie-section');
            initSuperficieSection(); // Load options for the new section
        } else {
            // Basic users skip superficie-section and go directly to energia
            showScreen('energia-section');
            updateStepIndicator('energia-section');
        }
    });

    // Listener for back button from superficie-section to data-meteorologicos-section
    document.getElementById('back-to-data-meteorologicos-from-superficie')?.addEventListener('click', () => {
        showScreen('data-meteorologicos-section');
        updateStepIndicator('data-meteorologicos-section');
    });

    // Listener for next button from superficie-section to RUGOSIDAD section
    const nextFromSuperficieButton = document.getElementById('next-to-energia-from-superficie');
    if (nextFromSuperficieButton) {
        nextFromSuperficieButton.addEventListener('click', () => {
            // Optional: Add validation here if needed for superficie selection
            showScreen('rugosidad-section');
            updateStepIndicator('rugosidad-section');
            initRugosidadSection();
        });
    }

    // Listener for "Back" from rugosidad-section to superficie-section
    document.getElementById('back-to-superficie-from-rugosidad')?.addEventListener('click', () => {
        showScreen('superficie-section');
        updateStepIndicator('superficie-section');
    });

    // Listener for "Next" from rugosidad-section to ROTACION section
    document.getElementById('next-to-rotacion-from-rugosidad')?.addEventListener('click', () => {
        // Optional: Add validation here if needed for rugosidad selection
        showScreen('rotacion-section');
        updateStepIndicator('rotacion-section');
        initRotacionSection();
    });

    // Listener for "Back" from rotacion-section to rugosidad-section
    document.getElementById('back-to-rugosidad-from-rotacion')?.addEventListener('click', () => {
        showScreen('rugosidad-section');
        updateStepIndicator('rugosidad-section');
    });

    // Listener for "Next" from rotacion-section to PANELES section
    document.getElementById('next-to-paneles-from-rotacion')?.addEventListener('click', () => {
        // Optional: Add validation here if needed for rotacion selection
        showScreen('paneles-section');
        updateStepIndicator('paneles-section');
    });

    // Listener for back button from energia-section to data-meteorologicos-section (for basic user)
    // OR back to rotacion-section (for expert user, though this path is now more direct to paneles)
    // This button ID 'back-to-data-meteorologicos' is on the energia-section.
    // For an expert, they would not typically see this button if they came from rotacion.
    // This specific listener might need review if expert path can land on energia from somewhere else than rotacion.
    // For now, it correctly points back from energia to data-meteorologicos, which is fine for basic users.
    document.getElementById('back-to-data-meteorologicos')?.addEventListener('click', () => {
        showScreen('data-meteorologicos-section');
        updateStepIndicator('data-meteorologicos-section');
    });
    
    const backFromConsumoFacturaButton = document.getElementById('back-from-consumo-factura');
    if (backFromConsumoFacturaButton) {
        backFromConsumoFacturaButton.addEventListener('click', () => {
            showScreen('map-screen');
            showMapScreenFormSection('supply-section'); // Go back to supply type selection
            // updateStepIndicator('map-screen'); // Or a more specific step if map-screen has conceptual steps
        });
    }

    const nextFromConsumoFacturaButton = document.getElementById('next-from-consumo-factura');
    if (nextFromConsumoFacturaButton) {
        nextFromConsumoFacturaButton.addEventListener('click', () => {
            const monthIds = [
                'consumo-enero', 'consumo-febrero', 'consumo-marzo', 'consumo-abril', 
                'consumo-mayo', 'consumo-junio', 'consumo-julio', 'consumo-agosto',
                'consumo-septiembre', 'consumo-octubre', 'consumo-noviembre', 'consumo-diciembre'
            ];
            let totalAnnualConsumptionFromBill = 0;
            const monthlyConsumptions = [];
            let allInputsValid = true;

            monthIds.forEach(id => {
                const inputElement = document.getElementById(id);
                if (inputElement) {
                    const value = parseFloat(inputElement.value);
                    if (isNaN(value) || value < 0) {
                        console.warn(`Valor inválido o vacío para ${id}, usando 0.`);
                        monthlyConsumptions.push(0);
                    } else {
                        monthlyConsumptions.push(value);
                        totalAnnualConsumptionFromBill += value;
                    }
                } else {
                    console.error(`Input con ID ${id} no encontrado.`);
                    allInputsValid = false; 
                }
            });

            userSelections.consumosMensualesFactura = monthlyConsumptions; 
            userSelections.totalAnnualConsumption = totalAnnualConsumptionFromBill; 
            
            console.log('Consumos mensuales (factura):', userSelections.consumosMensualesFactura);
            console.log('Consumo anual total (factura):', userSelections.totalAnnualConsumption);
            saveUserSelections();

            showScreen('analisis-economico-section');
            updateStepIndicator('analisis-economico-section');
        });
    }

    const nextToPanelesButton = document.getElementById('next-to-paneles');
    if (nextToPanelesButton) {
        nextToPanelesButton.addEventListener('click', () => {
            if (userSelections.userType === 'basico') {
                showScreen('analisis-economico-section');
                updateStepIndicator('analisis-economico-section');
            } else { // Assumes 'experto' or any other type follows the expert path
                showScreen('paneles-section');
                updateStepIndicator('paneles-section');
            }
        });
    }
    document.getElementById('back-to-energia')?.addEventListener('click', () => showScreen('energia-section'));
    document.getElementById('next-to-inversor')?.addEventListener('click', () => showScreen('inversor-section'));
    document.getElementById('back-to-paneles')?.addEventListener('click', () => showScreen('paneles-section'));
    document.getElementById('next-to-perdidas')?.addEventListener('click', () => showScreen('perdidas-section'));
    document.getElementById('back-to-inversor')?.addEventListener('click', () => showScreen('inversor-section'));
    document.getElementById('next-to-analisis-economico')?.addEventListener('click', () => showScreen('analisis-economico-section'));
    document.getElementById('back-to-perdidas')?.addEventListener('click', () => showScreen('perdidas-section'));

    // --- Lógica del botón "Finalizar Cálculo" (NUEVO BLOQUE INTEGRADO) ---
    const finalizarCalculoBtn = document.getElementById('finalizar-calculo');
    if (finalizarCalculoBtn) {
        finalizarCalculoBtn.addEventListener('click', async (event) => {
            event.preventDefault(); // Evita el envío del formulario si está dentro de uno
            console.log('Finalizar Cálculo clickeado. Enviando datos al backend para generar informe...');

            saveUserSelections(); // Guardar las últimas selecciones antes de enviar

            try {
                // Envía TODOS los userSelections al backend
                const response = await fetch('http://127.0.0.1:5000/api/generar_informe', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(userSelections)
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(`HTTP error! status: ${response.status} - ${errorData.error || response.statusText}`);
                }

                const informeFinal = await response.json();
                console.log('Informe recibido del backend:', informeFinal);

                localStorage.setItem('informeSolar', JSON.stringify(informeFinal)); // Guardar el informe para informe.html

                window.location.href = 'informe.html'; // Redirigir a la página de informe

            } catch (error) {
                console.error('Error al generar el informe:', error);
                alert('Hubo un error al generar el informe. Por favor, intente de nuevo. Detalle: ' + error.message);
            }
        });
    } else {
        console.error("Botón 'finalizar-calculo' no encontrado.");
    }
}


// --- INIT principal (Se ejecuta al cargar el DOM) (EXISTENTE, MODIFICADO) ---
document.addEventListener('DOMContentLoaded', async () => {
    loadUserSelections(); // 1. Carga las selecciones guardadas primero
    initMap(); // 2. Inicializa el mapa (usará userLocation de userSelections)
    // 3. updateUIFromSelections() ya se llama dentro de loadUserSelections()

    await cargarElectrodomesticosDesdeBackend(); // 4. Carga electrodomésticos y los renderiza, luego recalcula consumo.
                                                // Usamos 'await' para asegurar que los electrodomésticos estén cargados
                                                // antes de que se muestre la pantalla, si es la de energía.
    setupNavigationButtons(); // 5. Configura todos los botones de navegación y otros listeners.

    // 6. Muestra la pantalla guardada o la inicial después de que todo esté cargado y listo
    const currentScreenId = 'map-screen';
    showScreen(currentScreenId);

    // Si la pantalla inicial es la de energía, nos aseguramos de que el consumo se muestre correctamente
    if (currentScreenId === 'energia-section') {
        calcularConsumo();
    }

    // ********************************************************************************
    // MANTENIENDO TU CÓDIGO ORIGINAL DESPUÉS DEL DOMContentLoaded:
    // Asegúrate de que las funciones de tu validador, gráficos,
    // y cualquier otra inicialización que ya tenías en tu script original
    // se mantengan aquí o sean llamadas desde aquí si aún no lo están.
    // Por ejemplo:
    // validarFormularioInicial();
    // initCharts();
    // initOtherFeature();
    // ********************************************************************************

    // EJEMPLO DE CÓDIGO EXISTENTE QUE PODRÍA ESTAR AQUÍ O SER LLAMADO:
    // Algunas de tus funciones que ya tenías podrían ser llamadas aquí si no están
    // atadas a botones o eventos específicos.
    // validateForm(); // Si tenías una función de validación global
    // loadCharts(); // Si tenías una función para cargar gráficos
    // initTooltips(); // Si tenías tooltips

    // El código de "handleFormSubmission" (si existía) debería estar atado al evento submit del formulario
    // principal o al botón "finalizar-calculo", como lo hemos hecho.
});


// ********************************************************************************
// MÁS ABAJO, EL RESTO DE TU CÓDIGO ORIGINAL DE calculateCharts, validateForm, etc.
// DEBE PERMANECER INTACTO.
// ********************************************************************************

// --------------------------------------------------------------------------------
// A PARTIR DE AQUÍ, DEBE CONTINUAR EL CÓDIGO ORIGINAL DE TU ARCHIVO CALCULADOR.JS
// (Ej: Funciones como calculateCharts, validateForm, updateChart, etc.)
// No se ha modificado nada de lo que ya tenías aparte de las integraciones
// marcadas arriba.
// --------------------------------------------------------------------------------


// --- Funciones para gráficos (ejemplo, si ya las tenías) ---
// function updateChart(chartId, newData) { ... }

// --- Funciones de validación (ejemplo, si ya las tenías) ---
// function validateStep1() { ... }
// function validateForm() { ... }

// --------------------------------------------------------------------------------
// INICIO DEL CÓDIGO QUE ORIGINALMENTE DEBERÍA ESTAR EN TU CALCULADOR.JS
// Y QUE NO DEBE SER MODIFICADO, SINO MANTENIDO.
// Si tu archivo original tenía 732 líneas, la mayoría de ellas irían aquí.
// Ejemplo de funciones que pueden estar en tu archivo:
// --------------------------------------------------------------------------------

// function calculateCharts() {
//     // Lógica para calcular y actualizar gráficos
//     // Esto podría usar los datos de userSelections
//     // y llamar a updateChart()
// }

// function validateFormStep(step) {
//     // Lógica de validación específica por paso
//     return true; // o false
// }

// // Ejemplo de cómo podrías actualizar userSelections en otras secciones
// document.getElementById('tipo-panel').addEventListener('change', (e) => {
//     userSelections.panelesSolares.tipo = e.target.value;
//     saveUserSelections();
// });
// document.getElementById('potencia-panel').addEventListener('input', (e) => {
//     userSelections.panelesSolares.potenciaNominal = parseFloat(e.target.value);
//     saveUserSelections();
// });

// // Si tienes funciones que se llamaban en cada "next" button, deberían seguir haciéndolo.
// // Por ejemplo, si al pasar de "Energía" a "Paneles" querías validar algo o calcular
// // ciertos valores, esa lógica debería seguir en los listeners de los botones "next".
// document.getElementById('next-to-paneles').addEventListener('click', () => {
//     // if (validateFormStep('energia')) { // Ejemplo de validación
//         // calculateEnergyNeeds(); // Ejemplo de cálculo específico de energía
//         showScreen('paneles-section');
//     // }
// });

// --------------------------------------------------------------------------------
// FIN DEL CÓDIGO ORIGINAL DE TU ARCHIVO CALCULADOR.JS QUE DEBE PERMANECER
// --------------------------------------------------------------------------------
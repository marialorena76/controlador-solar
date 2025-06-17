console.log('🤖 calculador.js cargado - flujo de controlador ajustado y persistencia de datos');

let map, marker;
let userLocation = { lat: -34.6037, lng: -58.3816 }; // Buenos Aires por defecto

// Objeto para almacenar todas las selecciones del usuario
let userSelections = {
    userType: null,
    location: userLocation,
    installationType: null,
    incomeLevel: null,
    zonaInstalacionExpert: null,
    zonaInstalacionBasic: null,
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
const superficieRodeaSection = document.getElementById('superficie-rodea-section');


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
    const userTypeSelect = document.getElementById('user-type');
    if (userTypeSelect && userSelections.userType) {
        userTypeSelect.value = userSelections.userType;
    }

    const installationTypeSelect = document.getElementById('installation-type');
    if (installationTypeSelect && userSelections.installationType) {
        installationTypeSelect.value = userSelections.installationType;
    }

    const incomeLevelSelect = document.getElementById('income-level');
    if (incomeLevelSelect && userSelections.incomeLevel) {
        incomeLevelSelect.value = userSelections.incomeLevel;
    }

    const zonaInstalacionExpertSelect = document.getElementById('zona-instalacion-expert');
    if (zonaInstalacionExpertSelect && userSelections.zonaInstalacionExpert) {
        zonaInstalacionExpertSelect.value = userSelections.zonaInstalacionExpert;
    }

    const zonaInstalacionBasicSelect = document.getElementById('zona-instalacion-basic');
    if (zonaInstalacionBasicSelect && userSelections.zonaInstalacionBasic) {
        zonaInstalacionBasicSelect.value = userSelections.zonaInstalacionBasic;
    }

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
            input.style = 'width: 60px; text-align: center; margin-left: 15px; text-align: right;';
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
    L.Control.geocoder().addTo(map).on('markgeocode', function(e) {
        if (e.geocode && e.geocode.center) {
            userLocation.lat = e.geocode.center.lat;
            userLocation.lng = e.geocode.center.lng;
            marker.setLatLng(userLocation);
            map.setView(userLocation, 13);
            if (latitudDisplay) latitudDisplay.value = userLocation.lat.toFixed(6);
            if (longitudDisplay) longitudDisplay.value = userLocation.lng.toFixed(6);
            userSelections.location = userLocation; // Guardar la ubicación en userSelections
            saveUserSelections(); // Guardar las selecciones en localStorage
        }
    });
}


// --- Lógica de la Navegación de Pantallas (EXISTENTE, VERIFICADA) ---

function showScreen(screenId) {
    // Hide main screen containers first
    if (mapScreen) mapScreen.style.display = 'none';
    if (dataFormScreen) dataFormScreen.style.display = 'none';

    // Hide all individual sub-sections within dataFormScreen explicitly
    if (dataMeteorologicosSection) dataMeteorologicosSection.style.display = 'none';
    if (energiaSection) energiaSection.style.display = 'none';
    // consumoFacturaSection will be added later in this recovery process
    if (panelesSection) panelesSection.style.display = 'none';
    if (inversorSection) inversorSection.style.display = 'none';
    if (perdidasSection) perdidasSection.style.display = 'none';
    if (analisisEconomicoSection) analisisEconomicoSection.style.display = 'none';

    const targetElement = document.getElementById(screenId);

    if (targetElement) {
        if (screenId === 'map-screen') {
            if (mapScreen) mapScreen.style.display = 'block';
        } else if (screenId === 'data-form-screen') {
            if (dataFormScreen) dataFormScreen.style.display = 'block';
            if (dataMeteorologicosSection) dataMeteorologicosSection.style.display = 'block'; // Default to first step
        } else {
            if (dataFormScreen) {
                dataFormScreen.style.display = 'block';
            }
            targetElement.style.display = 'block';
        }
    } else {
        console.error(`Error: La pantalla con ID '${screenId}' no fue encontrada.`);
    }
    // updateStepIndicator is called by event listeners
}

function updateStepIndicator(screenId) {
    let stepNumber = 0;
    let currentStepText = '';
    switch (screenId) {
        case 'map-screen':
            currentStepText = 'Paso 1: Ubicación y Tipo de Usuario';
            break;
        // data-form-screen is a container, specific steps below set their own text.
        // If data-form-screen is called directly, dataMeteorologicosSection is shown by default.
        case 'data-form-screen':
        case 'data-meteorologicos-section':
            currentStepText = 'Paso 2: Datos Meteorológicos';
            break;
        case 'energia-section':
            currentStepText = 'Paso 3: Consumo de Energía (Electrodomésticos)';
            break;
        case 'consumo-factura-section': // Will be added later
            currentStepText = 'Paso 3: Consumo de Energía (Factura)';
            break;
        case 'paneles-section':
            currentStepText = 'Paso 4: Selección de Paneles';
            break;
        case 'inversor-section':
            currentStepText = 'Paso 5: Selección de Inversor';
            break;
        case 'perdidas-section':
            currentStepText = 'Paso 6: Registro de Pérdidas';
            break;
        case 'analisis-economico-section':
            currentStepText = 'Paso 7: Análisis Económico';
            break;
        default:
            currentStepText = 'Calculador Solar'; // Default or unknown step
            break;
    }
    if (stepIndicatorText) {
        stepIndicatorText.textContent = currentStepText;
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
    const expertDataForm = document.getElementById('expert-data-form');

    // New buttons for superficie-rodea-section
    const nextFromSuperficieRodeaButton = document.getElementById('next-from-superficie-rodea');
    const backFromSuperficieRodeaButton = document.getElementById('back-from-superficie-rodea');

    // New buttons for consumo-factura-section
    const nextFromConsumoFacturaButton = document.getElementById('next-from-consumo-factura');
    const backFromConsumoFacturaButton = document.getElementById('back-from-consumo-factura');

    // Initial state on map-screen (handled by HTML default or showMapScreenFormSection if needed)
    // showMapScreenFormSection('user-type-section'); // Call if explicit control needed here

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
            // Save zonaInstalacionExpert if it's part of this initial expert form.
            // const zonaExpertSelect = document.getElementById('zona-instalacion-expert');
            // if (zonaExpertSelect) userSelections.zonaInstalacionExpert = zonaExpertSelect.value;
            saveUserSelections();
            // For experts, after selecting 'experto', they might go to a different first step
            // like 'superficie-rodea-section' or directly to 'expert-section' if that's the primary expert input area on map-screen.
            // The provided HTML shows 'expert-section' with 'zonaInstalacion' on map screen.
            // Let's assume clicking "Usuario Experto" reveals "expert-section" first.
            showMapScreenFormSection('expert-section');
        });
    }

    if (expertDataForm) { // This form is within 'expert-section' on map-screen
        expertDataForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const zonaExpertSelect = document.getElementById('zona-instalacion-expert');
            if (zonaExpertSelect) userSelections.zonaInstalacionExpert = zonaExpertSelect.value;
            saveUserSelections();

            showScreen('superficie-rodea-section');
            updateStepIndicator('superficie-rodea-section');
            cargarOpcionesSuperficieRodea();
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
            if (dataMeteorologicosSection) dataMeteorologicosSection.style.display = 'block';
            updateStepIndicator('data-meteorologicos-section');
        });
    }

    if (incomeLowButton) {
        incomeLowButton.addEventListener('click', () => {
            userSelections.incomeLevel = 'BAJO';
            saveUserSelections();
            showScreen('data-form-screen');
            if (dataMeteorologicosSection) dataMeteorologicosSection.style.display = 'block';
            updateStepIndicator('data-meteorologicos-section');
        });
    }

    // Listeners for superficie-rodea-section
    if (nextFromSuperficieRodeaButton) {
        nextFromSuperficieRodeaButton.addEventListener('click', () => {
            const selectSuperficie = document.getElementById('superficieRodea');
            if (selectSuperficie && selectSuperficie.value) {
                userSelections.superficieRodea = selectSuperficie.value;
                saveUserSelections();
                showScreen('data-meteorologicos-section');
                updateStepIndicator('data-meteorologicos-section');
            } else {
                alert('Por favor, seleccione una superficie circundante.');
            }
        });
    }

    if (backFromSuperficieRodeaButton) {
        backFromSuperficieRodeaButton.addEventListener('click', () => {
            showScreen('map-screen'); // Go back to map screen
            showMapScreenFormSection('expert-section'); // Show the previous section on map screen
        });
    }

    // Listeners for consumo-factura-section
    if (nextFromConsumoFacturaButton) {
        nextFromConsumoFacturaButton.addEventListener('click', () => {
            const monthIds = [
                'consumo-enero', 'consumo-febrero', 'consumo-marzo', 'consumo-abril',
                'consumo-mayo', 'consumo-junio', 'consumo-julio', 'consumo-agosto',
                'consumo-septiembre', 'consumo-octubre', 'consumo-noviembre', 'consumo-diciembre'
            ];
            let totalAnnualConsumptionFromBill = 0;
            const monthlyConsumptions = [];
            // let allInputsValid = true; // Optional: for stricter validation

            monthIds.forEach(id => {
                const inputElement = document.getElementById(id);
                if (inputElement) {
                    const value = parseFloat(inputElement.value);
                    if (isNaN(value) || value < 0) {
                        console.warn(`Valor inválido o vacío para ${id}, usando 0.`);
                        monthlyConsumptions.push(0);
                        // allInputsValid = false;
                    } else {
                        monthlyConsumptions.push(value);
                        totalAnnualConsumptionFromBill += value;
                    }
                } else {
                    console.error(`Input con ID ${id} no encontrado.`);
                    // allInputsValid = false;
                }
            });

            // if (!allInputsValid) {
            //    alert("Por favor, ingrese valores numéricos válidos para todos los meses.");
            //    return;
            // }

            userSelections.consumosMensualesFactura = monthlyConsumptions;
            userSelections.totalAnnualConsumption = totalAnnualConsumptionFromBill;

            console.log('Consumos mensuales (factura):', userSelections.consumosMensualesFactura);
            console.log('Consumo anual total (factura):', userSelections.totalAnnualConsumption);
            saveUserSelections();

            showScreen('analisis-economico-section');
            updateStepIndicator('analisis-economico-section');
        });
    }

    if (backFromConsumoFacturaButton) {
        backFromConsumoFacturaButton.addEventListener('click', () => {
            showScreen('map-screen');
            showMapScreenFormSection('supply-section');
        });
    }

    // Standard navigation for other select elements (if any were missed or need specific handling)
    document.getElementById('zona-instalacion-expert')?.addEventListener('change', (e) => {
        userSelections.zonaInstalacionExpert = e.target.value;
        saveUserSelections();
    });
    // document.getElementById('user-type')?.addEventListener('change', ...); // Already handled by buttons
    // document.getElementById('installation-type')?.addEventListener('change', ...); // Handled by buttons
    // document.getElementById('income-level')?.addEventListener('change', ...); // Handled by buttons
    // document.getElementById('zona-instalacion-basic')?.addEventListener('change', ...); // This element might not be used if basic flow is simplified

    });
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


    // Configurar los botones de navegación entre secciones (EXISTENTES, but some are now conditional or replaced)
    // document.getElementById('next-to-data-form')?.addEventListener('click', () => showScreen('data-form-screen')); // Replaced by user type buttons
    // document.getElementById('back-to-map')?.addEventListener('click', () => showScreen('map-screen')); // Contextual back buttons are better
    // document.getElementById('next-to-data-meteorologicos')?.addEventListener('click', () => showScreen('data-meteorologicos-section')); // This is now a target from other flows
    // document.getElementById('back-to-data-form')?.addEventListener('click', () => showScreen('data-form-screen')); // Contextual back buttons

    document.getElementById('next-to-energia')?.addEventListener('click', () => { // From data-meteorologicos to energia
        showScreen('energia-section');
        updateStepIndicator('energia-section');
    });
    document.getElementById('back-to-data-meteorologicos')?.addEventListener('click', () => { // From energia to data-meteorologicos
        showScreen('data-meteorologicos-section');
        updateStepIndicator('data-meteorologicos-section');
    });

    const nextToPanelesButton = document.getElementById('next-to-paneles'); // From energia to (paneles OR analisis-economico)
    if (nextToPanelesButton) {
        nextToPanelesButton.addEventListener('click', () => {
            if (userSelections.userType === 'basico') {
                showScreen('analisis-economico-section');
                updateStepIndicator('analisis-economico-section');
            } else {
                showScreen('paneles-section');
                updateStepIndicator('paneles-section');
            }
        });
    }
    document.getElementById('back-to-energia')?.addEventListener('click', () => { // From paneles to energia
        showScreen('energia-section');
        updateStepIndicator('energia-section');
    });
    document.getElementById('next-to-inversor')?.addEventListener('click', () => { // From paneles to inversor
        showScreen('inversor-section');
        updateStepIndicator('inversor-section');
    });
    document.getElementById('back-to-paneles')?.addEventListener('click', () => { // From inversor to paneles
        showScreen('paneles-section');
        updateStepIndicator('paneles-section');
    });
    document.getElementById('next-to-perdidas')?.addEventListener('click', () => { // From inversor to perdidas
        showScreen('perdidas-section');
        updateStepIndicator('perdidas-section');
    });
    document.getElementById('back-to-inversor')?.addEventListener('click', () => { // From perdidas to inversor
        showScreen('inversor-section');
        updateStepIndicator('inversor-section');
    });
    document.getElementById('next-to-analisis-economico')?.addEventListener('click', () => { // From perdidas to analisis-economico
        showScreen('analisis-economico-section');
        updateStepIndicator('analisis-economico-section');
    });
    document.getElementById('back-to-perdidas')?.addEventListener('click', () => { // From analisis-economico to perdidas
        showScreen('perdidas-section');
        updateStepIndicator('perdidas-section');
    });

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
    const currentScreenId = 'map-screen'; // Always start on map-screen
    showScreen(currentScreenId);
    // Ensure the first step indicator is for the map screen
    updateStepIndicator('map-screen');


    // Si la pantalla inicial es la de energía, nos aseguramos de que el consumo se muestre correctamente
    // This might be redundant now as showScreen handles default views.
    // if (currentScreenId === 'energia-section') {
    //     calcularConsumo();
    // }
    cargarOpcionesSuperficieRodea(); // Pre-load options for expert flow

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

async function cargarOpcionesSuperficieRodea() {
    const selectElement = document.getElementById('superficieRodea');
    if (!selectElement) {
        console.error('Elemento select#superficieRodea no encontrado.');
        return;
    }

    // Evitar recargar si ya tiene opciones (más allá del placeholder)
    if (selectElement.options.length > 1 && selectElement.options[0].value !== "") {
            // console.log('Opciones de superficieRodea ya cargadas.'); // Optional: for debugging
            return;
    }

    try {
        console.log('Fetching /api/superficies_rodean...');
        const response = await fetch('http://127.0.0.1:5000/api/superficies_rodean');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        if (data.superficies && Array.isArray(data.superficies)) {
            selectElement.innerHTML = '<option value="">Seleccionar...</option>'; // Clear placeholder & add default
            data.superficies.forEach(opcion => {
                const optionElement = document.createElement('option');
                optionElement.value = opcion;
                optionElement.textContent = opcion;
                selectElement.appendChild(optionElement);
            });
            console.log('Opciones de superficieRodea cargadas en el dropdown.');
        } else {
            console.error('Respuesta de /api/superficies_rodean no tiene el formato esperado:', data);
            selectElement.innerHTML = '<option value="">Error al cargar opciones</option>';
        }
    } catch (error) {
        console.error('Error al cargar opciones de superficieRodea:', error);
        if (selectElement) selectElement.innerHTML = '<option value="">Error al cargar opciones</option>';
    }
}

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
// // The next-to-paneles button is now handled with conditional logic based on userType.
// // document.getElementById('next-to-paneles').addEventListener('click', () => {
// //     // if (validateFormStep('energia')) { // Ejemplo de validación
// //         // calculateEnergyNeeds(); // Ejemplo de cálculo específico de energía
// //         showScreen('paneles-section');
// //     // }
// // });

// --------------------------------------------------------------------------------
// FIN DEL CÓDIGO ORIGINAL DE TU ARCHIVO CALCULADOR.JS QUE DEBE PERMANECER
// --------------------------------------------------------------------------------
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
    alturaInstalacion: null,       // New property
    metodoCalculoRadiacion: null,  // New property
    modeloMetodoRadiacion: null,   // New property
    marcaPanel: null,               // New property
    potenciaPanelDeseada: null,     // New property
    modeloTemperaturaPanel: null,   // New property
    frecuenciaLluvias: null,      // New property
    focoPolvoCercano: null,       // New property
    metodoIngresoConsumoEnergia: null, // New property
    electrodomesticos: {}, // This will now store objects like { "Heladera": { cantidad: 1 } }
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

const sectionInfoMap = {
    // Initial Map Screen Sections (step numbers handled by direct logic)
    'user-type-section': { generalCategory: 'Configuración Inicial', specificName: 'Nivel de Conocimiento', sidebarId: null },
    'supply-section': { generalCategory: 'Configuración Inicial', specificName: 'Tipo de Instalación', sidebarId: null },
    'income-section': { generalCategory: 'Configuración Inicial', specificName: 'Nivel de Ingreso', sidebarId: null },

    // Data Form Screen Sections
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

    'paneles-section': { generalCategory: 'Paneles', specificName: 'Paneles Solares', sidebarId: 'sidebar-paneles' }, // Main section
    'panel-marca-subform': { generalCategory: 'Paneles', specificName: 'Marca Panel', sidebarId: 'sidebar-paneles' },
    'panel-potencia-subform': { generalCategory: 'Paneles', specificName: 'Potencia Panel', sidebarId: 'sidebar-paneles' },
    'panel-modelo-temperatura-subform': { generalCategory: 'Paneles', specificName: 'Modelo Temperatura Panel', sidebarId: 'sidebar-paneles' },

    'inversor-section': { generalCategory: 'Inversor', specificName: 'Selección de Inversor', sidebarId: 'sidebar-inversor' },

    'perdidas-section': { generalCategory: 'Pérdidas', specificName: 'Registro de Pérdidas', sidebarId: 'sidebar-perdidas' }, // Main section
    'frecuencia-lluvias-subform-content': { generalCategory: 'Pérdidas', specificName: 'Frecuencia Lluvias', sidebarId: 'sidebar-perdidas' },
    'foco-polvo-subform-content': { generalCategory: 'Pérdidas', specificName: 'Foco de Polvo', sidebarId: 'sidebar-perdidas' },

    'analisis-economico-section': { generalCategory: 'Análisis Económico', specificName: 'Análisis Económico', sidebarId: 'sidebar-analisis-economico' }
};

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
const alturaInstalacionSection = document.getElementById('altura-instalacion-section');
const metodoCalculoSection = document.getElementById('metodo-calculo-section');
const modeloMetodoSection = document.getElementById('modelo-metodo-section');
const frecuenciaLluviasSubformContent = document.getElementById('frecuencia-lluvias-subform-content');
const focoPolvoSubformContent = document.getElementById('foco-polvo-subform-content');

// Paneles Section - Expert Sub-forms & Content Containers
const panelMarcaSubform = document.getElementById('panel-marca-subform');
const marcaPanelOptionsContainer = document.getElementById('marca-panel-options-container');

const panelPotenciaSubform = document.getElementById('panel-potencia-subform');
const potenciaPanelDeseadaInput = document.getElementById('potencia-panel-deseada-input');

const panelModeloTemperaturaSubform = document.getElementById('panel-modelo-temperatura-subform');
const modeloTemperaturaOptionsContainer = document.getElementById('modelo-temperatura-options-container');


// --- Funciones de Persistencia (NUEVO BLOQUE INTEGRADO) ---

function saveUserSelections() {
    localStorage.setItem('userSelections', JSON.stringify(userSelections));
    console.log('User selections guardadas:', userSelections);
}

function loadUserSelections() {
    const savedSelections = localStorage.getItem('userSelections');

    // Define the complete default structure for userSelections, including all nested objects.
    // This should align with the initial global declaration of userSelections.
    const defaultUserSelectionsStructure = {
        userType: null,
        location: { lat: -34.6037, lng: -58.3816 }, // Default Buenos Aires
        installationType: null,
        incomeLevel: null,
        zonaInstalacionExpert: null,
        zonaInstalacionBasic: null,
        selectedZonaInstalacion: null,
        superficieRodea: { descripcion: null, valor: null },
        rugosidadSuperficie: { descripcion: null, valor: null },
        anguloInclinacion: null,
        anguloOrientacion: null,
        rotacionInstalacion: { descripcion: null, valor: null },
        // modeloMetodoRadiacion: null, // This was already present in the global userSelections
        marcaPanel: null,
        potenciaPanelDeseada: null,
        modeloTemperaturaPanel: null,
        frecuenciaLluvias: null,      // New property
        focoPolvoCercano: null,       // New property
        metodoIngresoConsumoEnergia: null,
        electrodomesticos: {},
        totalMonthlyConsumption: 0,
        totalAnnualConsumption: 0,
        selectedCurrency: 'Pesos argentinos',
        panelesSolares: { tipo: null, cantidad: 0, potenciaNominal: 0, superficie: 0 },
        inversor: { tipo: null, potenciaNominal: 0 },
        perdidas: { eficienciaPanel: 0, eficienciaInversor: 0, factorPerdidas: 0 },
        consumosMensualesFactura: [] // Assuming this might be stored
        // Add any other top-level properties that should have a default
    };

    if (savedSelections) {
        const loadedSelections = JSON.parse(savedSelections);

        // Start with a fresh copy of the default structure
        let newSelections = JSON.parse(JSON.stringify(defaultUserSelectionsStructure));

        // Merge loaded top-level properties
        for (const key in loadedSelections) {
            if (loadedSelections.hasOwnProperty(key)) {
                if (typeof defaultUserSelectionsStructure[key] === 'object' &&
                    defaultUserSelectionsStructure[key] !== null &&
                    !Array.isArray(defaultUserSelectionsStructure[key]) &&
                    typeof loadedSelections[key] === 'object' && // Ensure loaded value is also an object for merging
                    loadedSelections[key] !== null) {
                    // Merge nested objects: default values first, then loaded values
                    newSelections[key] = { ...defaultUserSelectionsStructure[key], ...loadedSelections[key] };
                } else if (typeof defaultUserSelectionsStructure[key] !== 'undefined') {
                    // For non-objects or if loaded[key] is not an object, take the loaded value if the key is valid
                    newSelections[key] = loadedSelections[key];
                } else {
                    // If loaded key is not in default structure at all, still copy it (might be from newer version)
                     newSelections[key] = loadedSelections[key];
                }
            }
        }

        // Ensure all default keys are present even if not in loadedSelections
        for (const key in defaultUserSelectionsStructure) {
            if (typeof newSelections[key] === 'undefined') {
                newSelections[key] = defaultUserSelectionsStructure[key];
            }
        }

        userSelections = newSelections;

        // Special handling for the global 'userLocation' variable
        if (userSelections.location && typeof userSelections.location.lat !== 'undefined' && typeof userSelections.location.lng !== 'undefined') {
            userLocation = userSelections.location;
        } else {
            // Fallback to default if location is malformed or missing after merge
            userLocation = defaultUserSelectionsStructure.location;
            userSelections.location = userLocation;
        }

        console.log('User selections cargadas y normalizadas:', userSelections);
        updateUIFromSelections();
    } else {
        // No saved data, so global userSelections (which should already match defaultUserSelectionsStructure) is used.
        // Optionally, explicitly set userSelections to a deep copy of defaults here too for consistency:
        // userSelections = JSON.parse(JSON.stringify(defaultUserSelectionsStructure));
        // And ensure userLocation is also set from this default:
        // userLocation = userSelections.location;
        console.log('No saved selections found, using initial default structure.');
    }

    // Migration/Normalization for userSelections.electrodomesticos
    if (userSelections.electrodomesticos) {
        const normalizedElectrodomesticos = {};
        for (const key in userSelections.electrodomesticos) {
            if (userSelections.electrodomesticos.hasOwnProperty(key)) {
                const currentEntry = userSelections.electrodomesticos[key];
                if (typeof currentEntry === 'number') { // Old format: "Heladera": 1
                    normalizedElectrodomesticos[key] = { cantidad: currentEntry };
                } else if (typeof currentEntry === 'object' && currentEntry !== null) { // New format or partially new
                    normalizedElectrodomesticos[key] = {
                        cantidad: currentEntry.cantidad || 0,
                        horasVerano: currentEntry.horasVerano || null, // Prepare for future fields
                        horasInvierno: currentEntry.horasInvierno || null // Prepare for future fields
                    };
                } else {
                     normalizedElectrodomesticos[key] = { cantidad: 0 }; // Default if malformed
                }
            }
        }
        userSelections.electrodomesticos = normalizedElectrodomesticos;
    } else {
        userSelections.electrodomesticos = {}; // Ensure it's an object if missing entirely
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

    const alturaInstalacionInput = document.getElementById('altura-instalacion-input');
    if (alturaInstalacionInput && userSelections.alturaInstalacion !== null) {
        alturaInstalacionInput.value = userSelections.alturaInstalacion;
    } else if (alturaInstalacionInput) {
        alturaInstalacionInput.value = ''; // Clear if null
    }

    // Update Potencia Panel Deseada Input
    // const potenciaPanelDeseadaInputEl = document.getElementById('potencia-panel-deseada-input'); // Global const potenciaPanelDeseadaInput is used
    if (potenciaPanelDeseadaInput && userSelections.potenciaPanelDeseada !== null) {
        potenciaPanelDeseadaInput.value = userSelections.potenciaPanelDeseada;
    } else if (potenciaPanelDeseadaInput) {
        potenciaPanelDeseadaInput.value = ''; // Clear if null
    }

    // Add similar blocks here for metodoCalculoRadiacion and modeloMetodoRadiacion if they have direct inputs in UI
    // For example, if they were text inputs (though they are planned as selects):
    // const metodoCalculoInput = document.getElementById('metodo-calculo-input'); // Assuming such an ID
    // if (metodoCalculoInput && userSelections.metodoCalculoRadiacion !== null) {
    //     metodoCalculoInput.value = userSelections.metodoCalculoRadiacion;
    // } else if (metodoCalculoInput) {
    //     metodoCalculoInput.value = '';
    // }
    // const modeloMetodoInput = document.getElementById('modelo-metodo-input'); // Assuming such an ID
    // if (modeloMetodoInput && userSelections.modeloMetodoRadiacion !== null) {
    //     modeloMetodoInput.value = userSelections.modeloMetodoRadiacion;
    // } else if (modeloMetodoInput) {
    //     modeloMetodoInput.value = '';
    // }

    const anguloInclinacionInput = document.getElementById('angulo-inclinacion-input');
    if (anguloInclinacionInput && userSelections.anguloInclinacion !== null) {
        anguloInclinacionInput.value = userSelections.anguloInclinacion;
    } else if (anguloInclinacionInput) {
        anguloInclinacionInput.value = ''; // Clear if null
    }

    const anguloOrientacionInput = document.getElementById('angulo-orientacion-input');
    if (anguloOrientacionInput && userSelections.anguloOrientacion !== null) {
        anguloOrientacionInput.value = userSelections.anguloOrientacion;
    } else if (anguloOrientacionInput) {
        anguloOrientacionInput.value = ''; // Clear if null
    }
}


// --- Nueva función para inicializar la sección de Superficie Rodea ---
async function initSuperficieSection() {
    console.log('[initSuperficieSection] called'); // Function entry
    const container = document.getElementById('superficie-options-container');
    console.log('[initSuperficieSection] container:', container); // Container element

    if (!container) {
        console.error("[initSuperficieSection] Contenedor 'superficie-options-container' no encontrado.");
        return;
    }
    container.innerHTML = '';

    const apiUrl = 'http://127.0.0.1:5000/api/superficie_options';
    console.log('[initSuperficieSection] fetching from:', apiUrl); // Before fetch

    try {
        const response = await fetch(apiUrl);
        console.log('[initSuperficieSection] response status:', response.status); // Response status
        if (!response.ok) {
            // Log the response text if not ok
            const errorText = await response.text();
            console.error('[initSuperficieSection] Response not OK. Status:', response.status, 'Text:', errorText);
            throw new Error(`Error HTTP: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        console.log('[initSuperficieSection] data received:', data); // Data received

        if (!Array.isArray(data)) {
            console.error('[initSuperficieSection] Data is not an array:', data); // Data validation
            container.innerHTML = '<p style="color: red; text-align: center;">Error: Formato de datos incorrecto.</p>';
            return;
        }

        const selectElement = document.createElement('select');
        selectElement.id = 'superficie-select';
        selectElement.className = 'form-control';

        const placeholderOption = document.createElement('option');
        placeholderOption.value = '';
        placeholderOption.textContent = 'Seleccione una opción...';
        placeholderOption.disabled = true;
        placeholderOption.selected = true;
        selectElement.appendChild(placeholderOption);

        if (data.length === 0) {
            console.log('[initSuperficieSection] No options data received from API.');
        } else {
            console.log('[initSuperficieSection] Processing item 0:', data[0]); // Log first item
            data.forEach((item, index) => {
                // console.log('[initSuperficieSection] Processing item:', index, item); // Optional: log each item
                const optionElement = document.createElement('option');
                optionElement.value = item.valor;
                optionElement.textContent = item.descripcion;
                optionElement.dataset.descripcion = item.descripcion;

                if (userSelections.superficieRodea.valor !== null &&
                    String(userSelections.superficieRodea.valor) === String(item.valor)) {
                    optionElement.selected = true;
                    placeholderOption.selected = false;
                    console.log('[initSuperficieSection] pre-selecting option for value:', userSelections.superficieRodea.valor); // Pre-selection
                }
                selectElement.appendChild(optionElement);
            });
        }

        selectElement.addEventListener('change', (event) => {
            const selectedOption = event.target.options[event.target.selectedIndex];
            const valor = selectedOption.value;
            const descripcion = selectedOption.dataset.descripcion;

            if (valor && valor !== '') {
                userSelections.superficieRodea.valor = parseFloat(valor);
                userSelections.superficieRodea.descripcion = descripcion;
            } else {
                userSelections.superficieRodea.valor = null;
                userSelections.superficieRodea.descripcion = null;
            }
            saveUserSelections();
            console.log('[initSuperficieSection] Superficie rodea seleccionada (select):', userSelections.superficieRodea);
        });

        container.appendChild(selectElement);
        console.log('[initSuperficieSection] select element appended.'); // After append

    } catch (error) {
        console.error('[initSuperficieSection] CATCH block error:', error); // Catch block
        if (error.message) {
            console.error('[initSuperficieSection] CATCH error message:', error.message);
        }
        alert('Error al cargar las opciones de superficie. Intente más tarde. Revise la consola del navegador para más detalles técnicos.');
        if (container) {
            container.innerHTML = '<p style="color: red; text-align: center;">No se pudieron cargar las opciones. Intente recargar o contacte a soporte si el problema persiste.</p>';
        }
    }
}

// --- Nueva función para inicializar la sección de Rugosidad ---
async function initRugosidadSection() {
    console.log('[initRugosidadSection] called');
    const container = document.getElementById('rugosidad-options-container');
    console.log('[initRugosidadSection] container:', container);

    if (!container) {
        console.error("[initRugosidadSection] Contenedor 'rugosidad-options-container' no encontrado.");
        return;
    }
    container.innerHTML = '';

    const apiUrl = 'http://127.0.0.1:5000/api/rugosidad_options';
    console.log('[initRugosidadSection] fetching from:', apiUrl);

    try {
        const response = await fetch(apiUrl);
        console.log('[initRugosidadSection] response status:', response.status);
        if (!response.ok) {
            const errorText = await response.text();
            console.error('[initRugosidadSection] Response not OK. Status:', response.status, 'Text:', errorText);
            throw new Error(`Error HTTP: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        console.log('[initRugosidadSection] data received:', data);

        if (!Array.isArray(data)) {
            console.error('[initRugosidadSection] Data is not an array:', data);
            container.innerHTML = '<p style="color: red; text-align: center;">Error: Formato de datos incorrecto para rugosidad.</p>';
            return;
        }

        const selectElement = document.createElement('select');
        selectElement.id = 'rugosidad-select';
        selectElement.className = 'form-control';

        const placeholderOption = document.createElement('option');
        placeholderOption.value = '';
        placeholderOption.textContent = 'Seleccione una opción...';
        placeholderOption.disabled = true;
        placeholderOption.selected = true;
        selectElement.appendChild(placeholderOption);

        if (data.length === 0) {
            console.log('[initRugosidadSection] No options data received from API.');
        } else {
            console.log('[initRugosidadSection] Processing item 0:', data[0]);
            data.forEach((item, index) => {
                // console.log('[initRugosidadSection] Processing item:', index, item);
                const optionElement = document.createElement('option');
                optionElement.value = item.valor;
                optionElement.textContent = item.descripcion;
                optionElement.dataset.descripcion = item.descripcion;

                if (userSelections.rugosidadSuperficie.valor !== null &&
                    String(userSelections.rugosidadSuperficie.valor) === String(item.valor)) {
                    optionElement.selected = true;
                    placeholderOption.selected = false;
                    console.log('[initRugosidadSection] pre-selecting option for value:', userSelections.rugosidadSuperficie.valor);
                }
                selectElement.appendChild(optionElement);
            });
        }

        selectElement.addEventListener('change', (event) => {
            const selectedOption = event.target.options[event.target.selectedIndex];
            const valor = selectedOption.value;
            const descripcion = selectedOption.dataset.descripcion;

            if (valor && valor !== '') {
                userSelections.rugosidadSuperficie.valor = parseFloat(valor);
                userSelections.rugosidadSuperficie.descripcion = descripcion;
            } else {
                userSelections.rugosidadSuperficie.valor = null;
                userSelections.rugosidadSuperficie.descripcion = null;
            }
            saveUserSelections();
            console.log('[initRugosidadSection] Rugosidad de superficie seleccionada (select):', userSelections.rugosidadSuperficie);
        });

        container.appendChild(selectElement);
        console.log('[initRugosidadSection] select element appended.');

    } catch (error) {
        console.error('[initRugosidadSection] CATCH block error:', error);
        if (error.message) {
            console.error('[initRugosidadSection] CATCH error message:', error.message);
        }
        alert('Error al cargar las opciones de rugosidad. Intente más tarde. Revise la consola del navegador para más detalles técnicos.');
        if (container) {
            container.innerHTML = '<p style="color: red; text-align: center;">No se pudieron cargar las opciones de rugosidad. Intente recargar o contacte a soporte.</p>';
        }
    }
}

async function initRotacionSection() {
    console.log('[initRotacionSection] called');
    const container = document.getElementById('rotacion-options-container');
    console.log('[initRotacionSection] container:', container);

    const fijoAnglesContainer = document.getElementById('fijo-angles-container');
    const anguloInclinacionInput = document.getElementById('angulo-inclinacion-input');
    const anguloOrientacionInput = document.getElementById('angulo-orientacion-input');

    // Get references to the form group wrappers for more granular control
    const inclinacionFormGroup = document.getElementById('form-group-inclinacion');
    const orientacionFormGroup = document.getElementById('form-group-orientacion');

    if (!fijoAnglesContainer || !anguloInclinacionInput || !anguloOrientacionInput || !inclinacionFormGroup || !orientacionFormGroup) {
        console.error('[initRotacionSection] One or more conditional input elements or their form groups not found.');
    }

    if (!container) {
        console.error("[initRotacionSection] Contenedor 'rotacion-options-container' no encontrado.");
        return;
    }
    container.innerHTML = '';

    // Renamed and enhanced helper function
    function updateAngleFieldsVisibilityAndData(selectedText) {
        console.log('[initRotacionSection] updateAngleFieldsVisibilityAndData received raw selectedText: "' + selectedText + '" (length: ' + (selectedText ? selectedText.length : 0) + ')');
        const cleanSelectedText = selectedText ? selectedText.trim() : "";
        console.log('[initRotacionSection] updateAngleFieldsVisibilityAndData using cleanSelectedText: "' + cleanSelectedText + '" (length: ' + cleanSelectedText.length + ')');

        if (!fijoAnglesContainer || !inclinacionFormGroup || !orientacionFormGroup || !anguloInclinacionInput || !anguloOrientacionInput) {
            console.warn('[initRotacionSection] updateAngleFieldsVisibilityAndData: conditional elements not found.');
            return;
        }

        const isFijos = (cleanSelectedText === "Fijos");
        const isInclinacionFijaVertical = (cleanSelectedText === "Inclinación fija, rotación sobre eje vertical");
        console.log('[initRotacionSection] Condition check - isFijos:', isFijos, 'isInclinacionFijaVertical:', isInclinacionFijaVertical);

        if (isFijos) {
            fijoAnglesContainer.style.display = 'block';
            inclinacionFormGroup.style.display = 'block';
            orientacionFormGroup.style.display = 'block';
            if (userSelections.anguloInclinacion !== null) anguloInclinacionInput.value = userSelections.anguloInclinacion; else anguloInclinacionInput.value = '';
            if (userSelections.anguloOrientacion !== null) anguloOrientacionInput.value = userSelections.anguloOrientacion; else anguloOrientacionInput.value = '';
            console.log('[initRotacionSection] "Fijos" selected. Both angle fields shown.');
        } else if (isInclinacionFijaVertical) {
            fijoAnglesContainer.style.display = 'block';
            inclinacionFormGroup.style.display = 'block';
            orientacionFormGroup.style.display = 'none'; // Hide orientation
            if (userSelections.anguloInclinacion !== null) anguloInclinacionInput.value = userSelections.anguloInclinacion; else anguloInclinacionInput.value = '';

            // Clear orientation data as it's not applicable
            if (userSelections.anguloOrientacion !== null) {
                userSelections.anguloOrientacion = null;
                anguloOrientacionInput.value = '';
                // saveUserSelections(); // Will be saved by the main change listener
                console.log('[initRotacionSection] "Inclinación fija, rotación sobre eje vertical" selected. Orientation field hidden and data cleared.');
            } else {
                 console.log('[initRotacionSection] "Inclinación fija, rotación sobre eje vertical" selected. Orientation field hidden.');
            }
        } else { // All other options
            fijoAnglesContainer.style.display = 'none';
            // Clear both angle data if changing from a state where they might have been set
            let changed = false;
            if (userSelections.anguloInclinacion !== null) {
                userSelections.anguloInclinacion = null;
                anguloInclinacionInput.value = '';
                changed = true;
            }
            if (userSelections.anguloOrientacion !== null) {
                userSelections.anguloOrientacion = null;
                anguloOrientacionInput.value = '';
                changed = true;
            }
            if (changed) {
                // saveUserSelections(); // Will be saved by the main change listener
                console.log('[initRotacionSection] Non-angle rotation selected. Angle fields hidden and data cleared.');
            } else {
                 console.log('[initRotacionSection] Non-angle rotation selected. Angle fields hidden.');
            }
        }
    }

    const apiUrl = 'http://127.0.0.1:5000/api/rotacion_options';
    console.log('[initRotacionSection] fetching from:', apiUrl);

    try {
        const response = await fetch(apiUrl);
        console.log('[initRotacionSection] response status:', response.status);
        if (!response.ok) {
            const errorText = await response.text();
            console.error('[initRotacionSection] Response not OK. Status:', response.status, 'Text:', errorText);
            throw new Error(`Error HTTP: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        console.log('[initRotacionSection] data received:', data);

        if (!Array.isArray(data)) {
            console.error('[initRotacionSection] Data is not an array:', data);
            container.innerHTML = '<p style="color: red; text-align: center;">Error: Formato de datos incorrecto.</p>';
            return;
        }

        const selectElement = document.createElement('select');
        selectElement.id = 'rotacion-select';
        selectElement.className = 'form-control';

        const placeholderOption = document.createElement('option');
        placeholderOption.value = '';
        placeholderOption.textContent = 'Seleccione una opción...';
        placeholderOption.disabled = true;
        selectElement.appendChild(placeholderOption);

        if (data.length === 0) {
            console.log('[initRotacionSection] No options data received from API.');
        } else {
            data.forEach((item) => {
                const optionElement = document.createElement('option');
                optionElement.value = item.valor; // Store 'valor' in value
                optionElement.textContent = item.descripcion; // Display 'descripcion'
                // optionElement.dataset.descripcion = item.descripcion; // Not strictly needed if textContent is descripcion
                console.log(`[initRotacionSection] Adding option: Valor='${item.valor}', Descripcion='${item.descripcion}'`);

                if (userSelections.rotacionInstalacion && userSelections.rotacionInstalacion.descripcion === item.descripcion) {
                    optionElement.selected = true;
                    placeholderOption.selected = false;
                    console.log('[initRotacionSection] pre-selecting option by description:', item.descripcion);
                }
                selectElement.appendChild(optionElement);
            });
        }

        if (selectElement.selectedIndex === -1 || (selectElement.options[selectElement.selectedIndex] && selectElement.options[selectElement.selectedIndex].disabled)) {
             placeholderOption.selected = true;
        }

        selectElement.addEventListener('change', (event) => {
            const selectedOption = event.target.options[event.target.selectedIndex];
            const valor = selectedOption.value; // This is item.valor
            const descripcion = selectedOption.textContent; // This is item.descripcion

            if (valor && valor !== '') { // Not the placeholder
                userSelections.rotacionInstalacion = {
                    descripcion: descripcion,
                    valor: parseFloat(valor)
                };
            } else {
                userSelections.rotacionInstalacion = { descripcion: null, valor: null };
            }
            // Call visibility update BEFORE saving, so angle data is nulled if needed
            updateAngleFieldsVisibilityAndData(descripcion);
            saveUserSelections();
            console.log('[initRotacionSection] Rotación de instalación seleccionada:', userSelections.rotacionInstalacion);
        });

        container.appendChild(selectElement);
        console.log('[initRotacionSection] select element appended.');

        // Initial visibility check based on the actual selected option after population
        const finalSelectedOptionAfterPopulation = selectElement.options[selectElement.selectedIndex];
        if (finalSelectedOptionAfterPopulation) {
            updateAngleFieldsVisibilityAndData(finalSelectedOptionAfterPopulation.textContent);
        } else {
            updateAngleFieldsVisibilityAndData(null); // Should hide if no valid selection
        }

        if (anguloInclinacionInput) {
            anguloInclinacionInput.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                userSelections.anguloInclinacion = isNaN(value) ? null : value;
                saveUserSelections();
                console.log('[initRotacionSection] anguloInclinacion input changed:', userSelections.anguloInclinacion);
            });
        }

        if (anguloOrientacionInput) {
            anguloOrientacionInput.addEventListener('input', (e) => {
                let value = parseFloat(e.target.value);
                userSelections.anguloOrientacion = isNaN(value) ? null : value;
                saveUserSelections();
                console.log('[initRotacionSection] anguloOrientacion input changed:', userSelections.anguloOrientacion);
            });
        }

    } catch (error) {
        console.error('[initRotacionSection] CATCH block error:', error);
        if (error.message) {
            console.error('[initRotacionSection] CATCH error message:', error.message);
        }
        alert('Error al cargar las opciones de rotación. Intente más tarde. Revise la consola.');
        if (container) {
            container.innerHTML = '<p style="color: red; text-align: center;">No se pudieron cargar las opciones de rotación.</p>';
        }
    }
}

// --- Nueva función para inicializar la sección de Método de Cálculo ---
async function initMetodoCalculoSection() {
    const container = document.getElementById('metodo-calculo-options-container');
    if (!container) {
        console.error("Contenedor 'metodo-calculo-options-container' no encontrado.");
        return;
    }
    container.innerHTML = ''; // Limpiar opciones anteriores

    const selectElement = document.createElement('select');
    selectElement.id = 'metodo-calculo-select';
    selectElement.className = 'form-control';

    const placeholderOption = document.createElement('option');
    placeholderOption.value = '';
    placeholderOption.textContent = 'Seleccione un método...';
    placeholderOption.disabled = true;
    placeholderOption.selected = true;
    selectElement.appendChild(placeholderOption);

    try {
        const response = await fetch('http://127.0.0.1:5000/api/metodo_calculo_options');
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status} ${response.statusText}`);
        }
        const data = await response.json(); // Expected: ["Método A", "Método B"]

        if (!Array.isArray(data)) {
            console.error('[METODO CALCULO OPTIONS LOAD ERROR] Data received is not an array:', data);
            container.innerHTML = '<p style="color: red; text-align: center;">Error: Formato de datos incorrecto para método de cálculo.</p>';
            return; // Exit if data format is wrong
        }

        if (data.length === 0) {
            console.log('[METODO CALCULO OPTIONS LOAD] No hay opciones de método de cálculo disponibles.');
            // selectElement will only have the placeholder.
        } else {
            data.forEach(optionText => { // data is an array of strings
                const optionElement = document.createElement('option');
                optionElement.value = optionText;
                optionElement.textContent = optionText;

                if (userSelections.metodoCalculoRadiacion === optionText) {
                    optionElement.selected = true;
                    placeholderOption.selected = false;
                }
                selectElement.appendChild(optionElement);
            });
        }

        selectElement.addEventListener('change', (event) => {
            const selectedValue = event.target.value;
            if (selectedValue && selectedValue !== '') {
                userSelections.metodoCalculoRadiacion = selectedValue;
            } else {
                userSelections.metodoCalculoRadiacion = null;
            }
            saveUserSelections();
            console.log('Método de cálculo seleccionado:', userSelections.metodoCalculoRadiacion);

            console.log('[initMetodoCalculoSection] Método de cálculo changed, resetting and re-initializing modelo del método.');
            userSelections.modeloMetodoRadiacion = null; // Clear previous model selection

            // Attempt to clear existing options in child dropdown explicitly
            const modeloMetodoContainer = document.getElementById('modelo-metodo-options-container');
            if (modeloMetodoContainer) {
                const modeloSelect = modeloMetodoContainer.querySelector('select'); // More robust way to find it
                if (modeloSelect) {
                    modeloSelect.innerHTML = ''; // Clear its options
                    console.log('[initMetodoCalculoSection] Cleared options for modelo-metodo-select.');
                }
            }

            saveUserSelections(); // Save the nulled modeloMetodoRadiacion

            // Re-initialize the modeloMetodoSection to reflect filtered options
            if (typeof initModeloMetodoSection === 'function') {
                initModeloMetodoSection();
            } else {
                console.error('[initMetodoCalculoSection] initModeloMetodoSection function is not defined and cannot be called.');
            }
        });

        container.appendChild(selectElement);

    } catch (error) {
        console.error('[METODO CALCULO OPTIONS LOAD ERROR] Error fetching or processing método de cálculo options:', error);
        if (error.message) {
            console.error('[METODO CALCULO OPTIONS LOAD ERROR] Message:', error.message);
        }
        alert('Error al cargar las opciones de método de cálculo. Intente más tarde. Revise la consola del navegador para más detalles técnicos.');
        if (container) {
            container.innerHTML = '<p style="color: red; text-align: center;">No se pudieron cargar las opciones de método de cálculo. Intente recargar o contacte a soporte.</p>';
        }
    }
}

// --- Nueva función para inicializar la sección de Modelo del Método ---
async function initModeloMetodoSection() {
    console.log('[initModeloMetodoSection] called');
    const container = document.getElementById('modelo-metodo-options-container');
    console.log('[initModeloMetodoSection] container:', container);

    if (!container) {
        console.error("[initModeloMetodoSection] Contenedor 'modelo-metodo-options-container' no encontrado.");
        return;
    }
    container.innerHTML = '';

    const metodoCalculoSeleccionado = userSelections.metodoCalculoRadiacion;
    console.log('[initModeloMetodoSection] Parent metodoCalculoSeleccionado:', metodoCalculoSeleccionado);

    const apiUrl = 'http://127.0.0.1:5000/api/modelo_metodo_options';
    console.log('[initModeloMetodoSection] fetching from:', apiUrl);

    try {
        const response = await fetch(apiUrl);
        console.log('[initModeloMetodoSection] response status:', response.status);
        if (!response.ok) {
            const errorText = await response.text();
            console.error('[initModeloMetodoSection] Response not OK. Status:', response.status, 'Text:', errorText);
            throw new Error(`Error HTTP: ${response.status} ${response.statusText}`);
        }
        const allModelOptions = await response.json();
        console.log('[initModeloMetodoSection] allModelOptions received:', allModelOptions);

        if (!Array.isArray(allModelOptions)) {
            console.error('[initModeloMetodoSection] Data is not an array:', allModelOptions);
            container.innerHTML = '<p style="color: red; text-align: center;">Error: Formato de datos incorrecto.</p>';
            return;
        }

        let filteredData = [];
        let autoSelectModel = null;

        if (metodoCalculoSeleccionado === "Cielo Isotrópico") {
            console.log('[initModeloMetodoSection] Filtering for "Cielo Isotrópico"');
            filteredData = allModelOptions.filter(optText => optText === "Método Liu-Jordan");
            if (filteredData.length > 0) {
                autoSelectModel = "Método Liu-Jordan";
                userSelections.modeloMetodoRadiacion = autoSelectModel; // Auto-select and save
                // saveUserSelections(); // Will be saved after populating or on change
                console.log('[initModeloMetodoSection] Auto-selecting "Método Liu-Jordan" and updated userSelections.');
            } else {
                 console.warn('[initModeloMetodoSection] "Método Liu-Jordan" not found in API options for "Cielo Isotrópico".');
                 userSelections.modeloMetodoRadiacion = null; // Ensure it's null if the expected option isn't there
            }
        } else { // Assumed "Cielo Anisotrópico" or any other selection
            console.log('[initModeloMetodoSection] Filtering for other methods (excluding "Método Liu-Jordan")');
            filteredData = allModelOptions.filter(optText => optText !== "Método Liu-Jordan");
            // If previously "Método Liu-Jordan" was selected, it's no longer valid.
            if (userSelections.modeloMetodoRadiacion === "Método Liu-Jordan") {
                userSelections.modeloMetodoRadiacion = null;
                console.log('[initModeloMetodoSection] Cleared modeloMetodoRadiacion as "Método Liu-Jordan" is not valid for current parent selection.');
            }
        }
        // Ensure saveUserSelections is called if modeloMetodoRadiacion was changed due to filtering logic
        saveUserSelections();
        console.log('[initModeloMetodoSection] Filtered data for dropdown:', filteredData);

        const selectElement = document.createElement('select');
        selectElement.id = 'modelo-metodo-select';
        selectElement.className = 'form-control';

        const placeholderOption = document.createElement('option');
        placeholderOption.value = '';
        placeholderOption.textContent = 'Seleccione un modelo...';
        placeholderOption.disabled = true;
        selectElement.appendChild(placeholderOption);

        if (filteredData.length === 0) {
            console.log('[initModeloMetodoSection] No options available after filtering.');
        } else {
            filteredData.forEach((optionText) => {
                const optionElement = document.createElement('option');
                optionElement.value = optionText; // Value and text are the same
                optionElement.textContent = optionText;
                console.log(`[initModeloMetodoSection] Adding option: '${optionText}'`);

                if (userSelections.modeloMetodoRadiacion === optionText) {
                    optionElement.selected = true;
                    placeholderOption.selected = false;
                    console.log('[initModeloMetodoSection] pre-selecting option:', optionText);
                }
                selectElement.appendChild(optionElement);
            });
        }

        if (selectElement.selectedIndex === -1 || (selectElement.options[selectElement.selectedIndex] && selectElement.options[selectElement.selectedIndex].disabled)) {
            placeholderOption.selected = true;
            // If placeholder is selected, ensure userSelection reflects no choice, unless autoSelectModel was set
            if (!autoSelectModel) {
                 userSelections.modeloMetodoRadiacion = null;
                 // saveUserSelections(); // Already saved after filtering
            }
        }

        selectElement.addEventListener('change', (event) => {
            const selectedValue = event.target.value;
            if (selectedValue && selectedValue !== '') {
                userSelections.modeloMetodoRadiacion = selectedValue;
            } else {
                userSelections.modeloMetodoRadiacion = null;
            }
            saveUserSelections();
            console.log('[initModeloMetodoSection] Modelo del método seleccionado:', userSelections.modeloMetodoRadiacion);
        });

        container.appendChild(selectElement);
        console.log('[initModeloMetodoSection] select element appended.');

    } catch (error) {
        console.error('[initModeloMetodoSection] CATCH block error:', error);
        if (error.message) {
            console.error('[initModeloMetodoSection] CATCH error message:', error.message);
        }
        alert('Error al cargar las opciones de modelo del método. Intente más tarde.');
        if (container) {
            container.innerHTML = '<p style="color: red; text-align: center;">No se pudieron cargar las opciones.</p>';
        }
    }
}

// --- Nueva función para inicializar la sección de Pérdidas ---
function initPerdidasSection() {
    // Ensure global DOM variables for sub-form content wrappers are accessible here
    // const frecuenciaLluviasSubformContent = document.getElementById('frecuencia-lluvias-subform-content');
    // const focoPolvoSubformContent = document.getElementById('foco-polvo-subform-content');
    // (These were defined globally in a previous step)

    if (!frecuenciaLluviasSubformContent || !focoPolvoSubformContent) {
        console.error("Contenedores de sub-formularios de pérdidas no encontrados.");
        return;
    }

    // Hide all sub-form content wrappers first
    frecuenciaLluviasSubformContent.style.display = 'none';
    focoPolvoSubformContent.style.display = 'none';

    // Show the first sub-form: Frecuencia de Lluvias
    frecuenciaLluviasSubformContent.style.display = 'block';

    // Initialize its content (e.g., populate dropdown)
    initFrecuenciaLluviasOptions(); // This function is defined below

    // The existing updateStepIndicator call when showing 'perdidas-section'
    // from setupNavigationButtons should be sufficient for the overall section title.
}

async function initFrecuenciaLluviasOptions() {
    const container = document.getElementById('frecuencia-lluvias-options-container');
    if (!container) {
        console.error("Contenedor 'frecuencia-lluvias-options-container' no encontrado.");
        return;
    }
    container.innerHTML = '';

    const selectElement = document.createElement('select');
    selectElement.id = 'frecuencia-lluvias-select';
    selectElement.className = 'form-control';

    const placeholderOption = document.createElement('option');
    placeholderOption.value = '';
    placeholderOption.textContent = 'Seleccione frecuencia de lluvias...';
    placeholderOption.disabled = true;
    placeholderOption.selected = true;
    selectElement.appendChild(placeholderOption);

    try {
        const response = await fetch('http://127.0.0.1:5000/api/frecuencia_lluvias_options');
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status} ${response.statusText}`);
        }
        const data = await response.json(); // Expected: array of strings

        if (!Array.isArray(data)) {
            console.error('[FRECUENCIA LLUVIAS LOAD ERROR] Data not an array:', data);
            container.innerHTML = '<p style="color:red;">Error: Formato de datos incorrecto.</p>';
            return;
        }

        if (data.length === 0) {
            // If no options, display a message or leave placeholder.
            // For consistency with other similar functions, we can just leave the placeholder.
            console.log('[FRECUENCIA LLUVIAS LOAD] No hay opciones de frecuencia de lluvias disponibles.');
            // Optionally, add a message to the container:
            // container.innerHTML = '<p>No hay opciones de frecuencia de lluvias disponibles.</p>';
        } else {
            data.forEach(optionText => {
                const optionElement = document.createElement('option');
                optionElement.value = optionText;
                optionElement.textContent = optionText;
                if (userSelections.frecuenciaLluvias === optionText) {
                    optionElement.selected = true;
                    placeholderOption.selected = false; // Unselect placeholder if a real option is selected
                }
                selectElement.appendChild(optionElement);
            });
        }

        selectElement.addEventListener('change', (event) => {
            const selectedValue = event.target.value;
            if (selectedValue && selectedValue !== '') { // Check it's not the placeholder
                userSelections.frecuenciaLluvias = selectedValue;
            } else {
                userSelections.frecuenciaLluvias = null; // Reset if placeholder is re-selected
            }
            saveUserSelections();
            console.log('Frecuencia de lluvias seleccionada:', userSelections.frecuenciaLluvias);
        });
        container.appendChild(selectElement);

    } catch (error) {
        console.error('[FRECUENCIA LLUVIAS LOAD ERROR] Fetch/process error:', error);
        if (error.message) console.error('[FRECUENCIA LLUVIAS LOAD ERROR] Message:', error.message);
        alert('Error al cargar las opciones de frecuencia de lluvias. Revise la consola del navegador para más detalles.');
        container.innerHTML = '<p style="color:red;">Error al cargar opciones. Intente más tarde.</p>';
    }
}

function initFocoPolvoOptions() {
    const container = document.getElementById('foco-polvo-options-container');
    if (!container) {
        console.error("Contenedor 'foco-polvo-options-container' no encontrado.");
        return;
    }
    container.innerHTML = ''; // Clear previous content

    const options = [
        { text: "SI", value: "SI" },
        { text: "NO", value: "NO" }
    ];

    options.forEach(opt => {
        const label = document.createElement('label');
        // Assuming 'radio-group' class on container handles individual radio/label styling.
        // If specific styling for each label/radio pair is needed, add classes here.

        const radioInput = document.createElement('input');
        radioInput.type = 'radio';
        radioInput.name = 'focoPolvoOption'; // Shared name for radio group behavior
        radioInput.value = opt.value;
        radioInput.id = `focoPolvo-${opt.value.toLowerCase()}`; // Unique ID for each radio

        if (userSelections.focoPolvoCercano === opt.value) {
            radioInput.checked = true;
        }

        radioInput.addEventListener('change', (event) => {
            // Radio buttons only fire 'change' on the one being selected.
            // No need to check event.target.checked here usually, but good practice.
            if (event.target.checked) {
                userSelections.focoPolvoCercano = event.target.value;
                saveUserSelections();
                console.log('Foco de polvo cercano seleccionado:', userSelections.focoPolvoCercano);
            }
        });

        label.appendChild(radioInput);
        label.appendChild(document.createTextNode(" " + opt.text)); // Add space before text
        container.appendChild(label);
    });
}

function initPanelesSectionExpert() {
    console.log('[DEBUG] initPanelesSectionExpert: Called.');
    console.log('[DEBUG] panelMarcaSubform:', typeof panelMarcaSubform !== 'undefined' ? panelMarcaSubform : 'NOT DEFINED');
    console.log('[DEBUG] panelPotenciaSubform:', typeof panelPotenciaSubform !== 'undefined' ? panelPotenciaSubform : 'NOT DEFINED');
    console.log('[DEBUG] panelModeloTemperaturaSubform:', typeof panelModeloTemperaturaSubform !== 'undefined' ? panelModeloTemperaturaSubform : 'NOT DEFINED');
    // panelCantidadExpertSubform was removed, ensure it's not referenced.

    if (!panelMarcaSubform || !panelPotenciaSubform || !panelModeloTemperaturaSubform) {
        console.error("Uno o más contenedores de sub-formularios de Paneles no fueron encontrados en initPanelesSectionExpert. panelMarcaSubform:", panelMarcaSubform, "panelPotenciaSubform:", panelPotenciaSubform, "panelModeloTemperaturaSubform:", panelModeloTemperaturaSubform);
        return;
    }

    // Hide all Paneles sub-form content wrappers first
    panelMarcaSubform.style.display = 'none';
    panelPotenciaSubform.style.display = 'none';
    // panelCantidadExpertSubform was removed
    panelModeloTemperaturaSubform.style.display = 'none';
    console.log('[DEBUG] initPanelesSectionExpert: All panel sub-forms hidden.');

    console.log('[DEBUG] initPanelesSectionExpert: Attempting to show panelMarcaSubform.');
    panelMarcaSubform.style.display = 'block'; // Show the first sub-form

    if (panelMarcaSubform) {
        try {
            console.log('[DEBUG] initPanelesSectionExpert: panelMarcaSubform display set to block. Computed style:', window.getComputedStyle(panelMarcaSubform).display);
        } catch (e) {
            console.error('[DEBUG] initPanelesSectionExpert: Error getting computed style for panelMarcaSubform', e);
        }
    }

    console.log('[DEBUG] initPanelesSectionExpert: Calling initMarcaPanelOptions.');
    if (typeof initMarcaPanelOptions === 'function') {
        initMarcaPanelOptions();
    } else {
        console.error('[DEBUG] initPanelesSectionExpert: initMarcaPanelOptions function IS NOT DEFINED.');
    }
    console.log('[DEBUG] initPanelesSectionExpert: Returned from initMarcaPanelOptions call attempt.');
}

// async function initModeloTemperaturaPanelOptions() { ... } // This was the duplicated incorrect one, remove it.

async function initMarcaPanelOptions() {
    const container = document.getElementById('marca-panel-options-container');
    if (!container) {
        console.error("Contenedor 'marca-panel-options-container' no encontrado.");
        return;
    }
    container.innerHTML = ''; // Clear previous content, including the debug placeholder

    const selectElement = document.createElement('select');
    selectElement.id = 'marca-panel-select';
    selectElement.className = 'form-control';

    const placeholderOption = document.createElement('option');
    placeholderOption.value = '';
    placeholderOption.textContent = 'Seleccione una marca...';
    placeholderOption.disabled = true;
    placeholderOption.selected = true;
    selectElement.appendChild(placeholderOption);

    try {
        const response = await fetch('http://127.0.0.1:5000/api/marca_panel_options');
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status} ${response.statusText}`);
        }
        const data = await response.json(); // Expected: array of strings

        if (!Array.isArray(data)) {
            console.error('[MARCA PANEL OPTIONS LOAD ERROR] Data not an array:', data);
            container.innerHTML = '<p style="color:red;">Error: Formato de datos incorrecto.</p>';
            return;
        }
        if (data.length === 0) {
            console.log('[MARCA PANEL OPTIONS LOAD] No hay marcas de panel disponibles desde la API.');
            // If API returns empty, "Genéricos" might need to be added manually if it's a fallback.
            // For now, select will just have placeholder.
        } else {
            data.forEach(optionText => {
                const optionElement = document.createElement('option');
                optionElement.value = optionText;
                optionElement.textContent = optionText;
                // Note: dataset.descripcion is not strictly needed if value and textContent are the same string.
                // optionElement.dataset.descripcion = optionText;
                if (userSelections.marcaPanel === optionText) {
                    optionElement.selected = true;
                    placeholderOption.selected = false;
                }
                selectElement.appendChild(optionElement);
            });
        }

        selectElement.addEventListener('change', (event) => {
            const selectedValue = event.target.value;
            if (selectedValue && selectedValue !== '') {
                userSelections.marcaPanel = selectedValue;
            } else {
                userSelections.marcaPanel = null;
            }
            saveUserSelections();
            console.log('Marca de panel seleccionada:', userSelections.marcaPanel);
        });
        container.appendChild(selectElement);

    } catch (error) {
        console.error('[MARCA PANEL OPTIONS LOAD ERROR] Fetch/process error:', error);
        if (error.message) console.error('[MARCA PANEL OPTIONS LOAD ERROR] Message:', error.message);
        alert('Error al cargar las marcas de panel. Revise consola e intente más tarde.');
        container.innerHTML = '<p style="color:red;">Error al cargar opciones de marca. Verifique la conexión o contacte a soporte.</p>';
    }
}

async function initModeloTemperaturaPanelOptions() { // Keep async if other init functions are, for consistency
    const container = document.getElementById('modelo-temperatura-options-container');
    if (!container) {
        console.error("Contenedor 'modelo-temperatura-options-container' no encontrado.");
        return;
    }
    container.innerHTML = '<p style="text-align: center; font-style: italic; padding: 10px;">Opciones para Modelo de Cálculo de Temperatura se definirán próximamente.</p>';

    // Ensure userSelections.modeloTemperaturaPanel is reset if we are not loading options
    // or providing a way to select it. This prevents stale data if user navigates back and forth.
    // However, if the user *could* have set it previously and we want to retain that (even if options aren't shown),
    // then don't reset. Given "me faltan datos", resetting seems safer.
    // userSelections.modeloTemperaturaPanel = null;
    // saveUserSelections(); // If resetting. For now, let's not reset, just show placeholder.
                            // The selection mechanism (dropdown) is removed, so it can't be changed from UI here.
}

function initInversorSection() {
    console.log('initInversorSection called. User Type:', userSelections.userType);

    // Get references to old input elements (or their parent form-groups)
    const tipoInversorInput = document.getElementById('tipo-inversor');
    const potenciaInversorInput = document.getElementById('potencia-inversor-input');

    // Get their parent form-group elements to hide them completely
    const tipoInversorFormGroup = tipoInversorInput?.closest('.form-group');
    const potenciaInversorFormGroup = potenciaInversorInput?.closest('.form-group');

    if (userSelections.userType === 'experto') {
        console.log('Configuring Inversor section for EXPERT user (currently empty form).');
        // Ensure old input fields (if they somehow still exist or are re-added) are hidden
        if (tipoInversorFormGroup) {
            tipoInversorFormGroup.style.display = 'none';
        }
        if (potenciaInversorFormGroup) {
            potenciaInversorFormGroup.style.display = 'none';
        }
        // The HTML was already modified to have the correct title and placeholder P tag.
        // No specific JS action needed here to show content for the expert's empty form,
        // as the HTML itself defines the "empty" state with the new title and placeholder.
        // userSelections.inversor.tipo and userSelections.inversor.potenciaNominal will not be set here for experts.

    } else { // Basic User (should not reach here based on current flow)
        console.log('Configuring Inversor section for BASIC user (showing original inputs).');
        // If basic users could reach here and old inputs were meant for them:
        if (tipoInversorFormGroup) {
            tipoInversorFormGroup.style.display = 'block'; // Or its default
        }
        if (potenciaInversorFormGroup) {
            potenciaInversorFormGroup.style.display = 'block'; // Or its default
        }
        // And ensure the expert-specific title/placeholder (if managed by JS) are hidden.
        // However, since the HTML title was changed directly, this path is less relevant now.
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


function initElectrodomesticosSection() {
    const modoSeleccionContainer = document.getElementById('energia-modo-seleccion-container');
    const listContainer = document.getElementById('electrodomesticos-list');
    const summaryContainer = document.querySelector('#energia-section .energy-summary');
    // Ensure totalConsumoMensualDisplay and totalConsumoAnualDisplay are accessible if needed here
    // const totalConsumoMensualDisplay = document.getElementById('totalConsumoMensual');
    // const totalConsumoAnualDisplay = document.getElementById('totalConsumoAnual');


    if (!listContainer || !modoSeleccionContainer) {
        console.error("Elementos necesarios para energia-section no encontrados.");
        return;
    }

    // Default states
    modoSeleccionContainer.style.display = 'none';
    listContainer.innerHTML = ''; // Clear previous content from list area
    if (summaryContainer) summaryContainer.style.display = 'none';


    if (userSelections.userType === 'experto') {
        // --- START: Definition of handleExpertEnergyChoice (moved up) ---
        const handleExpertEnergyChoice = (choice) => {
            // modoSeleccionContainer.style.display = 'none'; // Keep it visible unless a choice leads to navigation
            listContainer.innerHTML = ''; // Clear list container before populating based on choice

            if (choice === 'detalleHogar') {
                if (summaryContainer) summaryContainer.style.display = 'flex'; // Show summary for this option
                populateStandardApplianceList(listContainer);
            } else if (choice === 'boletaMensual') {
                // Navigation happens, so this section will be hidden by showScreen
                if (summaryContainer) summaryContainer.style.display = 'none';
                listContainer.innerHTML = '';
                showScreen('consumo-factura-section');
                updateStepIndicator('consumo-factura-section');
            } else if (choice === 'detalleHogarHoras') {
                // Summary display is handled by populateDetailedApplianceList
                populateDetailedApplianceList(listContainer);
            } else {
                // This case should ideally not be hit if radios are the only trigger
                // but as a fallback, ensure mode selection is visible.
                modoSeleccionContainer.style.display = 'block';
                if (summaryContainer) summaryContainer.style.display = 'none';
            }
        };
        // --- END: Definition of handleExpertEnergyChoice ---

        // --- START: NEW BLOCK for Comercial/PYME ---
        if (userSelections.installationType === 'Comercial' || userSelections.installationType === 'PYME') {
            console.log('[DEBUG] Expert Comercial/PYME: Forcing to boletaMensual method.');
            modoSeleccionContainer.style.display = 'none'; // Ensure choice screen is hidden
            listContainer.innerHTML = ''; // Clear any potential list
            if (summaryContainer) summaryContainer.style.display = 'none'; // Hide summary

            userSelections.metodoIngresoConsumoEnergia = 'boletaMensual';
            saveUserSelections();

            handleExpertEnergyChoice('boletaMensual'); // Call the now-defined function
            return; // Exit function, as navigation will occur
        }
        // --- END: NEW BLOCK for Comercial/PYME ---

        // --- START: Original logic for Expert Residencial (continues from SEARCH block) ---
        // 1. Always show choice screen & reset content areas
        //    (Note: modoSeleccionContainer.style.display = 'block' is here, which is fine for Residencial)
        modoSeleccionContainer.style.display = 'block';
        listContainer.innerHTML = '';
        if (summaryContainer) summaryContainer.style.display = 'none';
        if (totalConsumoMensualDisplay) totalConsumoMensualDisplay.value = 'N/A';
        if (totalConsumoAnualDisplay) totalConsumoAnualDisplay.value = 'N/A';

        // 2. Pre-check radio based on saved selection
        if (userSelections.metodoIngresoConsumoEnergia) {
            const currentRadio = document.querySelector(`input[name="metodoIngresoConsumo"][value="${userSelections.metodoIngresoConsumoEnergia}"]`);
            if (currentRadio) {
                currentRadio.checked = true;
            }
        } else {
            // If no method was previously selected, explicitly uncheck all radio buttons
            document.querySelectorAll('input[name="metodoIngresoConsumo"]').forEach(rb => rb.checked = false);
        }

        // 3. Ensure radio button 'change' listeners are active
        //    (handleExpertEnergyChoice definition was moved up, so listeners will use it)
        const radioButtons = document.querySelectorAll('input[name="metodoIngresoConsumo"]');
        radioButtons.forEach(radio => {
            if (!radio.dataset.listenerAttached) {
                radio.addEventListener('change', (event) => {
                    userSelections.metodoIngresoConsumoEnergia = event.target.value;
                    saveUserSelections();
                    handleExpertEnergyChoice(event.target.value);
                });
                radio.dataset.listenerAttached = 'true';
            }
        });

    } else { // Basic user
        modoSeleccionContainer.style.display = 'none';
        if (summaryContainer) summaryContainer.style.display = 'flex';
        populateStandardApplianceList(listContainer);
    }
}

// Helper function for the standard appliance list population
function populateStandardApplianceList(listContainerElement) {
    if (!listContainerElement) return;
    listContainerElement.innerHTML = '';

    Object.keys(electrodomesticosCategorias).forEach(categoria => {
        const categoryWrapper = document.createElement('div');
        categoryWrapper.className = 'acordeon-categoria-wrapper';

        const titleH2 = document.createElement('h2');
        titleH2.className = 'acordeon-titulo';
        titleH2.textContent = categoria;

        const iconSpan = document.createElement('span');
        iconSpan.className = 'acordeon-icono';
        iconSpan.innerHTML = '&#9660;';
        titleH2.appendChild(iconSpan);

        const itemsDiv = document.createElement('div');
        itemsDiv.className = 'acordeon-items';
        itemsDiv.style.display = 'none';

        electrodomesticosCategorias[categoria].forEach(item => {
            const row = document.createElement('div');
            row.className = 'electrodomestico-row';
            const name = document.createElement('span');
            name.textContent = item.name;
            const input = document.createElement('input');
            input.type = 'number';
            input.min = '0';
            input.value = userSelections.electrodomesticos[item.name]?.cantidad || 0;
            input.id = `cant-${item.name.replace(/\s+/g, '-')}`;
            input.className = 'electrodomestico-input';
            input.addEventListener('change', (e) => {
                const itemName = item.name;
                if (!userSelections.electrodomesticos[itemName]) {
                    userSelections.electrodomesticos[itemName] = { cantidad: 0, horasVerano: null, horasInvierno: null };
                }
                userSelections.electrodomesticos[itemName].cantidad = parseInt(e.target.value) || 0;
                calcularConsumo();
                saveUserSelections();
            });
            const consumoDiario = item.consumo_diario_kwh || 0;
            const consumoLabel = document.createElement('span');
            consumoLabel.textContent = `${consumoDiario.toFixed(3)} kWh/día`;
            row.appendChild(name);
            row.appendChild(consumoLabel);
            row.appendChild(input);
            itemsDiv.appendChild(row);
        });

        categoryWrapper.appendChild(titleH2);
        categoryWrapper.appendChild(itemsDiv);
        listContainerElement.appendChild(categoryWrapper);
    });
    initAccordionEventListeners(); // Add this call
    calcularConsumo(); // Initial calculation after populating
}

function populateDetailedApplianceList(listContainerElement) {
    if (!listContainerElement) {
        console.error("Target container for detailed appliance list not provided.");
        return;
    }
    listContainerElement.innerHTML = ''; // Clear previous content

    Object.keys(electrodomesticosCategorias).forEach(categoria => {
        const categoryWrapper = document.createElement('div');
        categoryWrapper.className = 'acordeon-categoria-wrapper';

        const titleH2 = document.createElement('h2');
        titleH2.className = 'acordeon-titulo';
        titleH2.textContent = categoria;

        const iconSpan = document.createElement('span');
        iconSpan.className = 'acordeon-icono';
        iconSpan.innerHTML = '&#9660;';
        titleH2.appendChild(iconSpan);

        const itemsDiv = document.createElement('div');
        itemsDiv.className = 'acordeon-items';
        itemsDiv.style.display = 'none';

        electrodomesticosCategorias[categoria].forEach(item => {
            const itemName = item.name;
            const applianceData = userSelections.electrodomesticos[itemName] || { cantidad: 0, horasVerano: null, horasInvierno: null };

            const row = document.createElement('div');
            row.className = 'electrodomestico-row electrodomestico-detailed-inputs';

            const nameSpan = document.createElement('span');
            nameSpan.textContent = itemName;
            nameSpan.style.flexBasis = '30%';

            const wattsSpan = document.createElement('span');
            wattsSpan.textContent = `(${item.watts || 0} W)`;
            wattsSpan.style.fontSize = '0.8em';
            wattsSpan.style.flexBasis = '15%';

            const cantidadInput = document.createElement('input');
            cantidadInput.type = 'number';
            cantidadInput.min = '0';
            cantidadInput.value = applianceData.cantidad || 0;
            cantidadInput.id = `cant-detailed-${itemName.replace(/\s+/g, '-')}`;
            cantidadInput.className = 'electrodomestico-input';
            cantidadInput.style.maxWidth = '60px';
            cantidadInput.addEventListener('input', (e) => {
                if (!userSelections.electrodomesticos[itemName]) {
                    userSelections.electrodomesticos[itemName] = { cantidad: 0, horasVerano: null, horasInvierno: null };
                }
                userSelections.electrodomesticos[itemName].cantidad = parseInt(e.target.value) || 0;
                // TODO: Deferred - Trigger specific consumption calculation for this mode if/when implemented
                saveUserSelections();
            });

            const horasVeranoInput = document.createElement('input');
            horasVeranoInput.type = 'number';
            horasVeranoInput.min = '0';
            horasVeranoInput.placeholder = 'Hs. Verano/mes';
            horasVeranoInput.value = applianceData.horasVerano || '';
            horasVeranoInput.id = `horas-verano-${itemName.replace(/\s+/g, '-')}`;
            horasVeranoInput.className = 'electrodomestico-input';
            horasVeranoInput.style.maxWidth = '100px';
            horasVeranoInput.addEventListener('input', (e) => {
                if (!userSelections.electrodomesticos[itemName]) {
                    userSelections.electrodomesticos[itemName] = { cantidad: 0, horasVerano: null, horasInvierno: null };
                }
                const val = parseFloat(e.target.value);
                userSelections.electrodomesticos[itemName].horasVerano = isNaN(val) ? null : val;
                // TODO: Deferred - Trigger specific consumption calculation
                saveUserSelections();
            });

            const horasInviernoInput = document.createElement('input');
            horasInviernoInput.type = 'number';
            horasInviernoInput.min = '0';
            horasInviernoInput.placeholder = 'Hs. Invierno/mes';
            horasInviernoInput.value = applianceData.horasInvierno || '';
            horasInviernoInput.id = `horas-invierno-${itemName.replace(/\s+/g, '-')}`;
            horasInviernoInput.className = 'electrodomestico-input';
            horasInviernoInput.style.maxWidth = '100px';
            horasInviernoInput.addEventListener('input', (e) => {
                if (!userSelections.electrodomesticos[itemName]) {
                    userSelections.electrodomesticos[itemName] = { cantidad: 0, horasVerano: null, horasInvierno: null };
                }
                const val = parseFloat(e.target.value);
                userSelections.electrodomesticos[itemName].horasInvierno = isNaN(val) ? null : val;
                // TODO: Deferred - Trigger specific consumption calculation
                saveUserSelections();
            });

            row.appendChild(nameSpan);
            row.appendChild(wattsSpan);
            row.appendChild(cantidadInput);
            row.appendChild(horasVeranoInput);
            row.appendChild(horasInviernoInput);
            itemsDiv.appendChild(row);
        });

        categoryWrapper.appendChild(titleH2);
        categoryWrapper.appendChild(itemsDiv);
        listContainerElement.appendChild(categoryWrapper);
    });
    initAccordionEventListeners(); // Add this call

    const summaryContainer = document.querySelector('#energia-section .energy-summary');
    if (summaryContainer) {
        const totalConsumoMensualDisplay = document.getElementById('totalConsumoMensual');
        const totalConsumoAnualDisplay = document.getElementById('totalConsumoAnual');
        if (totalConsumoMensualDisplay) totalConsumoMensualDisplay.value = 'N/A (modo detallado)';
        if (totalConsumoAnualDisplay) totalConsumoAnualDisplay.value = 'N/A (modo detallado)';
        summaryContainer.style.display = 'flex';
    }
}

function initAccordionEventListeners() {
    const accordionTitles = document.querySelectorAll('.acordeon-titulo');

    accordionTitles.forEach(title => {
        // Check if a listener is already attached to avoid duplicates if called multiple times
        if (title.dataset.accordionListenerAttached === 'true') {
            return;
        }
        title.dataset.accordionListenerAttached = 'true';

        title.addEventListener('click', () => {
            const itemsDiv = title.nextElementSibling;
            const iconSpan = title.querySelector('.acordeon-icono');

            if (itemsDiv && itemsDiv.classList.contains('acordeon-items')) {
                if (itemsDiv.style.display === 'none' || itemsDiv.style.display === '') {
                    itemsDiv.style.display = 'block';
                    title.classList.add('open'); // Add this line
                    if (iconSpan) iconSpan.innerHTML = '&#9650;'; // Up arrow ▲
                } else {
                    itemsDiv.style.display = 'none';
                    title.classList.remove('open'); // Add this line
                    if (iconSpan) iconSpan.innerHTML = '&#9660;'; // Down arrow ▼
                }
            } else {
                console.warn('Accordion items div not found or is not the next sibling for:', title);
            }
        });
    });
}

function calcularConsumo() {
    let totalDiario = 0;
    for (const categoria in electrodomesticosCategorias) {
        if (electrodomesticosCategorias.hasOwnProperty(categoria)) {
            electrodomesticosCategorias[categoria].forEach(item => {
                const cant = userSelections.electrodomesticos[item.name]?.cantidad || 0;
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
    if (rugosidadSection) rugosidadSection.style.display = 'none';
    if (rotacionSection) rotacionSection.style.display = 'none';
    if (alturaInstalacionSection) alturaInstalacionSection.style.display = 'none'; // Added
    if (metodoCalculoSection) metodoCalculoSection.style.display = 'none';   // Added
    if (modeloMetodoSection) modeloMetodoSection.style.display = 'none';     // Added
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

function updateStepIndicator(currentSectionId) {
    if (!stepIndicatorText) return;

    let currentStepText = 'Calculador Solar'; // Default
    const sectionInfo = sectionInfoMap[currentSectionId];
    const userTypeDisplay = userSelections.userType === 'experto' ? 'Experto' : 'Básico';

    document.querySelectorAll('.sidebar .sidebar-item').forEach(item => {
        item.classList.remove('active');
    });

    if (sectionInfo) {
        if (sectionInfo.sidebarId) {
            const sidebarElement = document.getElementById(sectionInfo.sidebarId);
            if (sidebarElement) {
                sidebarElement.classList.add('active');
            }
        }

        let stepNum = 0;
        const onMapScreen = (mapScreen.style.display !== 'none' && dataFormScreen.style.display === 'none');

        if (onMapScreen) {
            if (currentSectionId === 'user-type-section') stepNum = 0; // Or a different representation
            else if (currentSectionId === 'supply-section') stepNum = 1;
            else if (currentSectionId === 'income-section') stepNum = 2;

            if (stepNum > 0) {
                currentStepText = `${userTypeDisplay}, Paso ${stepNum} (${sectionInfo.generalCategory}), ${sectionInfo.specificName}`;
            } else {
                currentStepText = `${userTypeDisplay}, ${sectionInfo.generalCategory}, ${sectionInfo.specificName}`;
            }
        } else { // On dataFormScreen
            let currentFlowOrder = [];
            let baseStepForDataForm = 2; // Steps on map screen before data form (supply-1, income-2)

            if (userSelections.userType === 'experto') {
                const expertCoreDatosOrder = [
                    'superficie-section', 'rugosidad-section', 'rotacion-section',
                    'altura-instalacion-section', 'metodo-calculo-section', 'modelo-metodo-section'
                ];
                const expertPostEnergyOrder = [
                    'panel-marca-subform', 'panel-potencia-subform', 'panel-modelo-temperatura-subform',
                    'inversor-section',
                    'frecuencia-lluvias-subform-content', 'foco-polvo-subform-content',
                    'analisis-economico-section'
                ];

                let tempFlowOrder = ['data-meteorologicos-section']; // Starts with Zona

                if (userSelections.installationType === 'Comercial' || userSelections.installationType === 'PYME') {
                    tempFlowOrder.push('consumo-factura-section');
                } else { // Residencial
                    tempFlowOrder.push('energia-section');
                    if (userSelections.metodoIngresoConsumoEnergia === 'boletaMensual') {
                         tempFlowOrder.push('consumo-factura-section');
                    }
                }
                currentFlowOrder = tempFlowOrder.concat(expertCoreDatosOrder, expertPostEnergyOrder);

            } else { // basico
                if (userSelections.installationType === 'Residencial') {
                    currentFlowOrder = ['data-meteorologicos-section', 'energia-section', 'analisis-economico-section'];
                } else { // Comercial or PYME
                    currentFlowOrder = ['data-meteorologicos-section', 'consumo-factura-section', 'analisis-economico-section'];
                }
            }

            let sectionIndex = currentFlowOrder.indexOf(currentSectionId);
            // If currentSectionId is a main container for sub-forms, find first sub-form's index
            if (sectionIndex === -1) {
                if (currentSectionId === 'paneles-section') sectionIndex = currentFlowOrder.indexOf('panel-marca-subform');
                else if (currentSectionId === 'perdidas-section') sectionIndex = currentFlowOrder.indexOf('frecuencia-lluvias-subform-content');
                else if (currentSectionId === 'energia-modo-seleccion') sectionIndex = currentFlowOrder.indexOf('energia-section');
            }

            if (sectionIndex !== -1) {
                stepNum = baseStepForDataForm + 1 + sectionIndex;
                let subStepIndicator = "";

                if (currentSectionId === 'consumo-factura-section' && userSelections.userType === 'experto') {
                     let energiaOrPrecedingIndex = currentFlowOrder.indexOf('energia-section');
                     if(energiaOrPrecedingIndex === -1) energiaOrPrecedingIndex = currentFlowOrder.indexOf('data-meteorologicos-section'); // If energia section was skipped for com/pyme expert
                     stepNum = baseStepForDataForm + 1 + energiaOrPrecedingIndex;
                     subStepIndicator = "a";
                } else if (currentSectionId === 'panel-marca-subform') subStepIndicator = ".1";
                else if (currentSectionId === 'panel-potencia-subform') subStepIndicator = ".2";
                else if (currentSectionId === 'panel-modelo-temperatura-subform') subStepIndicator = ".3";
                else if (currentSectionId === 'frecuencia-lluvias-subform-content') subStepIndicator = ".1";
                else if (currentSectionId === 'foco-polvo-subform-content') subStepIndicator = ".2";

                if (subStepIndicator.startsWith(".")) {
                    let parentSectionFlowId = '';
                    if (sectionInfo.sidebarId === 'sidebar-paneles') parentSectionFlowId = 'panel-marca-subform'; // Use first subform as representative
                    else if (sectionInfo.sidebarId === 'sidebar-perdidas') parentSectionFlowId = 'frecuencia-lluvias-subform-content'; // Use first subform

                    if (parentSectionFlowId) {
                         const parentIndexInFlow = currentFlowOrder.indexOf(parentSectionFlowId);
                         if (parentIndexInFlow !== -1) stepNum = baseStepForDataForm + 1 + parentIndexInFlow;
                    }
                }
                currentStepText = `${userTypeDisplay}, Paso ${stepNum}${subStepIndicator} (${sectionInfo.generalCategory}), ${sectionInfo.specificName}`;
            } else {
                currentStepText = `${userTypeDisplay}, (${sectionInfo.generalCategory}), ${sectionInfo.specificName}`; // Fallback if not in defined flow order
            }
        }
    } else if (currentSectionId === 'map-screen') {
        currentStepText = 'Paso Inicial: Ubicación y Tipo de Usuario';
        const defaultSidebar = document.getElementById('sidebar-datos');
        if (defaultSidebar) defaultSidebar.classList.add('active');
    } else {
        console.warn(`[updateStepIndicator] Section ID '${currentSectionId}' not found in sectionInfoMap.`);
        currentStepText = `${userTypeDisplay}: Paso Desconocido`;
    }
    stepIndicatorText.textContent = currentStepText;
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
    const incomeMediumButton = document.getElementById('income-medium-button'); // Add this
    
    const expertDataForm = document.getElementById('expert-data-form'); // Form itself

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
            // Ensure map-screen is visible, as supply-section is part of it.
            // showScreen('map-screen'); // This might be redundant if already on map-screen and only sub-sections change.
                                      // showMapScreenFormSection handles showing map-screen implicitly if needed or if it's better structured.
                                      // For now, let's assume user is on map-screen when clicking this.
            showMapScreenFormSection('supply-section');
            updateStepIndicator('map-screen'); // Or a more specific step for supply-section if created
                                               // For now, 'map-screen' indicates they are on the first main screen.
                                               // Or, perhaps, 'supply-section' needs its own step text.
                                               // Let's stick to map-screen for now, step indicators for sub-map sections can be refined.
        });
    }

    if (residentialButton) {
        residentialButton.addEventListener('click', () => {
            userSelections.installationType = 'Residencial';
            saveUserSelections();
            showMapScreenFormSection('income-section');
        });
    }

    if (commercialButton) { // commercialButton is const commercialButton = document.getElementById('commercial-button');
        commercialButton.addEventListener('click', () => {
            userSelections.installationType = 'Comercial';
            saveUserSelections();
            if (userSelections.userType === 'experto') {
                showMapScreenFormSection('income-section');
                updateStepIndicator('income-section');
            } else {
                showMapScreenFormSection('income-section');
                updateStepIndicator('income-section');
            }
        });
    }

    if (pymeButton) { // pymeButton is const pymeButton = document.getElementById('pyme-button');
        pymeButton.addEventListener('click', () => {
            userSelections.installationType = 'PYME';
            saveUserSelections();
            if (userSelections.userType === 'experto') {
                showMapScreenFormSection('income-section');
                updateStepIndicator('income-section');
            } else {
                showMapScreenFormSection('income-section');
                updateStepIndicator('income-section');
            }
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

    if (incomeMediumButton) { // Check if the button element exists
        incomeMediumButton.addEventListener('click', () => {
            userSelections.incomeLevel = 'MEDIO'; // Using uppercase 'MEDIO' for consistency with ALTO/BAJO values
            saveUserSelections();
            showScreen('data-form-screen'); // This shows the dataFormScreen container
            // Ensure dataMeteorologicosSection is the one shown by default within dataFormScreen
            if (dataMeteorologicosSection) dataMeteorologicosSection.style.display = 'block';
            updateStepIndicator('data-meteorologicos-section');
        });
    }
    
    if (expertDataForm) {
        expertDataForm.addEventListener('submit', (event) => {
            event.preventDefault();
            console.log('Formulario experto guardado (simulado), procediendo a data-form-screen.');
            showScreen('data-form-screen');
        });
    }

    document.getElementById('zona-instalacion-expert')?.addEventListener('change', (e) => {
        userSelections.zonaInstalacionExpert = e.target.value;
        saveUserSelections();
    });
    document.getElementById('moneda')?.addEventListener('change', (e) => {
        userSelections.selectedCurrency = e.target.value;
        saveUserSelections();
    });

    document.getElementById('tipo-panel')?.addEventListener('change', (e) => {
        userSelections.panelesSolares.tipo = e.target.value;
        saveUserSelections();
    });
    document.getElementById('cantidad-paneles-input')?.addEventListener('input', (e) => {
        userSelections.panelesSolares.cantidad = parseInt(e.target.value) || 0;
        saveUserSelections();
    });

    document.getElementById('tipo-inversor')?.addEventListener('change', (e) => {
        userSelections.inversor.tipo = e.target.value;
        saveUserSelections();
    });
    document.getElementById('potencia-inversor-input')?.addEventListener('input', (e) => {
        userSelections.inversor.potenciaNominal = parseFloat(e.target.value) || 0;
        saveUserSelections();
    });

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

    // Listener for Potencia Panel Deseada (Expert Panel Sub-form)
    if (potenciaPanelDeseadaInput) {
        potenciaPanelDeseadaInput.addEventListener('input', (event) => {
            const valueStr = event.target.value;
            if (valueStr === '') {
                userSelections.potenciaPanelDeseada = null;
            } else {
                const value = parseFloat(valueStr);
                if (!isNaN(value) && value >= 0) {
                    userSelections.potenciaPanelDeseada = value;
                }
                // If input is invalid (e.g. negative or non-numeric and not empty),
                // userSelections.potenciaPanelDeseada retains its previous valid value or null.
                // The input field itself will show what the user typed, but it won't be saved if invalid.
            }
            saveUserSelections();
        });
    }

    // Listener for Cantidad Paneles (Expert Panel Sub-form)
    // if (cantidadPanelesExpertInput) { // Block removed as cantidadPanelesExpertInput is removed
    //     cantidadPanelesExpertInput.addEventListener('input', (event) => {
    //         const valueStr = event.target.value;
    //         if (valueStr === '') {
    //             userSelections.cantidadPanelesExpert = null;
    //         } else {
    //             const value = parseInt(valueStr, 10); // Use radix 10
    //             if (!isNaN(value) && value >= 1) { // Panels should be at least 1
    //                 userSelections.cantidadPanelesExpert = value;
    //             }
    //             // If input is invalid (e.g., text, zero, negative, or float),
    //             // userSelections.cantidadPanelesExpert retains its previous valid value or null.
    //         }
    //         saveUserSelections();
    //     });
    // }

    const alturaInstalacionInput = document.getElementById('altura-instalacion-input');
    if (alturaInstalacionInput) {
        alturaInstalacionInput.addEventListener('input', (event) => {
            const value = parseFloat(event.target.value);
            if (!isNaN(value) && value >= 0) {
                userSelections.alturaInstalacion = value;
            } else if (event.target.value === '') {
                userSelections.alturaInstalacion = null;
            }
            saveUserSelections();
        });
    }

    // Listener for 'Atrás' button in 'data-meteorologicos-section'
    document.getElementById('back-to-map-from-zona')?.addEventListener('click', () => {
        showScreen('map-screen'); // Show the whole map screen container
        // Determine which map sub-section to show based on user selections
        if (userSelections.incomeLevel) { // If income was selected, go back there
            showMapScreenFormSection('income-section');
            updateStepIndicator('income-section');
        } else if (userSelections.installationType) { // Else if installation type was selected, go there
            showMapScreenFormSection('supply-section');
            updateStepIndicator('supply-section');
        } else { // Else go back to user type selection
            showMapScreenFormSection('user-type-section');
            updateStepIndicator('user-type-section');
        }
    });

    document.getElementById('next-to-energia')?.addEventListener('click', () => {
        const selectedZona = document.querySelector('input[name="zonaInstalacionNewScreen"]:checked');
        if (selectedZona) {
            userSelections.selectedZonaInstalacion = selectedZona.value;
            saveUserSelections();
            console.log('Zona de instalación seleccionada:', userSelections.selectedZonaInstalacion);
        } else {
            // alert('Por favor, seleccione una zona de instalación.'); // Optional: User feedback
            console.warn('No se seleccionó zona de instalación.');
            // return; // Optional: Prevent navigation if selection is mandatory
        }

        // ** START: MODIFIED BLOCK for next-to-energia **
        if (userSelections.userType === 'experto') {
            showScreen('energia-section');
            updateStepIndicator('energia-section');
            initElectrodomesticosSection(); // This handles expert energy choices
        } else if (userSelections.userType === 'basico' &&
            (userSelections.installationType === 'Comercial' || userSelections.installationType === 'PYME')) {
            showScreen('consumo-factura-section');
            updateStepIndicator('consumo-factura-section');
            // initConsumoFacturaSection(); // Call if there's an init for this section
        } else { // Basic Residencial (or other default)
            showScreen('energia-section');
            updateStepIndicator('energia-section');
            initElectrodomesticosSection();
        }
        // ** END: MODIFIED BLOCK for next-to-energia **
    });

    document.getElementById('back-to-data-meteorologicos-from-superficie')?.addEventListener('click', () => {
        if (userSelections.userType === 'experto') {
            if (userSelections.metodoIngresoConsumoEnergia === 'boletaMensual' ||
                userSelections.installationType === 'Comercial' ||
                userSelections.installationType === 'PYME') {
                showScreen('consumo-factura-section');
                updateStepIndicator('consumo-factura-section');
            } else { // Expert Residencial who chose detalleHogar/Horas
                showScreen('energia-section');
                updateStepIndicator('energia-section');
                initElectrodomesticosSection(); // Re-show energy choices
            }
        } else { // Should not be reached by basic if this is expert-only section
            showScreen('data-meteorologicos-section');
            updateStepIndicator('data-meteorologicos-section');
        }
    });

    const nextFromSuperficieButton = document.getElementById('next-to-energia-from-superficie');
    if (nextFromSuperficieButton) {
        nextFromSuperficieButton.addEventListener('click', () => {
            // Validate superficieRodea selection if necessary
            // if (!userSelections.superficieRodea.valor) {
            //     alert("Por favor, seleccione una opción de superficie.");
            //     return;
            // }
            showScreen('rugosidad-section');
            updateStepIndicator('rugosidad-section');
            if (typeof initRugosidadSection === 'function') initRugosidadSection();
        });
    }

    document.getElementById('back-to-superficie-from-rugosidad')?.addEventListener('click', () => {
        showScreen('superficie-section');
        updateStepIndicator('superficie-section');
        if (typeof initSuperficieSection === 'function') initSuperficieSection(); // Re-init if needed
    });

    document.getElementById('next-to-rotacion-from-rugosidad')?.addEventListener('click', () => {
        // Validate rugosidadSuperficie selection if necessary
        // if (!userSelections.rugosidadSuperficie.valor) {
        //     alert("Por favor, seleccione una opción de rugosidad.");
        //     return;
        // }
        showScreen('rotacion-section');
        updateStepIndicator('rotacion-section');
        if (typeof initRotacionSection === 'function') initRotacionSection();
    });

    document.getElementById('back-to-rugosidad-from-rotacion')?.addEventListener('click', () => {
        showScreen('rugosidad-section');
        updateStepIndicator('rugosidad-section');
        if (typeof initRugosidadSection === 'function') initRugosidadSection(); // Re-init
    });

    document.getElementById('next-to-paneles-from-rotacion')?.addEventListener('click', () => {
        // Validate rotacionInstalacion selection if necessary
        // if (!userSelections.rotacionInstalacion.valor) {
        //     alert("Por favor, seleccione una opción de rotación.");
        //     return;
        // }
        // If "Fijos", validate angle inputs
        // if (userSelections.rotacionInstalacion.descripcion === "Fijos" &&
        //     (userSelections.anguloInclinacion === null || userSelections.anguloOrientacion === null)) {
        //     alert("Por favor, ingrese los ángulos de inclinación y orientación para la instalación fija.");
        //     return;
        // }
        showScreen('altura-instalacion-section');
        updateStepIndicator('altura-instalacion-section');
        // No specific init for altura-instalacion as it's a simple input, but ensure value is restored
        const alturaInput = document.getElementById('altura-instalacion-input');
        if (alturaInput && userSelections.alturaInstalacion !== null) {
            alturaInput.value = userSelections.alturaInstalacion;
        } else if (alturaInput) {
            alturaInput.value = '';
        }
    });

    document.getElementById('back-to-rotacion-from-altura')?.addEventListener('click', () => {
        showScreen('rotacion-section');
        updateStepIndicator('rotacion-section');
        if (typeof initRotacionSection === 'function') initRotacionSection(); // Re-init
    });

    document.getElementById('next-to-metodo-calculo-from-altura')?.addEventListener('click', () => {
        // Validate alturaInstalacion if necessary
        // if (userSelections.alturaInstalacion === null || userSelections.alturaInstalacion < 0) {
        //     alert("Por favor, ingrese una altura válida para la instalación.");
        //     return;
        // }
        showScreen('metodo-calculo-section');
        updateStepIndicator('metodo-calculo-section');
        if (typeof initMetodoCalculoSection === 'function') initMetodoCalculoSection();
    });

    document.getElementById('back-to-altura-from-metodo')?.addEventListener('click', () => {
        showScreen('altura-instalacion-section');
        updateStepIndicator('altura-instalacion-section');
        // No specific init for altura-instalacion
    });

    document.getElementById('next-to-modelo-metodo-from-metodo')?.addEventListener('click', () => {
        // Validate metodoCalculoRadiacion if necessary
        // if (!userSelections.metodoCalculoRadiacion) {
        //     alert("Por favor, seleccione un método de cálculo.");
        //     return;
        // }
        showScreen('modelo-metodo-section');
        updateStepIndicator('modelo-metodo-section');
        if (typeof initModeloMetodoSection === 'function') initModeloMetodoSection();
    });

    document.getElementById('back-to-metodo-calculo-from-modelo')?.addEventListener('click', () => {
        showScreen('metodo-calculo-section');
        updateStepIndicator('metodo-calculo-section');
        if (typeof initMetodoCalculoSection === 'function') initMetodoCalculoSection(); // Re-init
    });

    // ** START: MODIFIED BLOCK for next-to-paneles-from-modelo **
    document.getElementById('next-to-paneles-from-modelo')?.addEventListener('click', () => {
        // Validate modeloMetodoRadiacion if necessary
        // if (!userSelections.modeloMetodoRadiacion) {
        //     alert("Por favor, seleccione un modelo del método.");
        //     return;
        // }
        // For Experts, this now goes to paneles-section (first sub-form)
        showScreen('paneles-section');
        initPanelesSectionExpert(); // Shows the first panel sub-form
        updateStepIndicator('panel-marca-subform'); // Indicator for the first panel sub-form
    });
    // ** END: MODIFIED BLOCK for next-to-paneles-from-modelo **

    // Navigation from last Paneles sub-form (Modelo Temperatura Panel) to Inversor section
    const nextFromPanelesToInversorBtn = document.getElementById('next-to-inversor-from-panels'); // CORRECTED ID
    if (nextFromPanelesToInversorBtn) {
        nextFromPanelesToInversorBtn.addEventListener('click', () => {
            // Optional: Add validation for the last panel sub-form (modeloTemperaturaPanel) if needed
            showScreen('inversor-section');
            updateStepIndicator('inversor-section');
            // initInversorSection(); // initInversorSection will be defined/updated later
                                     // For now, ensure the call is there if the function is expected to exist.
                                     // If initInversorSection doesn't exist yet, this might cause an error.
                                     // Let's assume it will exist or be created in a following step.
                                     // To be safe for now if it doesn't exist:
            if (typeof initInversorSection === 'function') {
                initInversorSection();
            } else {
                console.warn('initInversorSection function not yet defined. Inversor section may not initialize correctly.');
            }
        });
    } else {
        // This warning will appear if this JS runs before the 'panel-modelo-temperatura-subform' and its button
        // are dynamically shown, OR if the ID is still mismatched with the HTML.
        // The HTML for this button (id="next-to-inversor-from-panels") was added in plan step B.3 (HTML for Expert Paneles Sub-Forms).
        console.warn("Button 'next-to-inversor-from-panels' (for Paneles to Inversor) not found. Check HTML and JS execution order.");
    }

    document.getElementById('back-to-data-meteorologicos')?.addEventListener('click', () => {
        showScreen('data-meteorologicos-section');
        updateStepIndicator('data-meteorologicos-section');
    });

    // MODIFICATION 2: `back-from-consumo-factura` button
    const backFromConsumoFacturaButton = document.getElementById('back-from-consumo-factura');
    if (backFromConsumoFacturaButton) {
        backFromConsumoFacturaButton.addEventListener('click', () => {
            if (userSelections.userType === 'experto') {
                if (userSelections.installationType === 'Comercial' || userSelections.installationType === 'PYME') {
                    // Expert + Comercial/PYME was auto-routed to boleta. "Back" goes to Zona.
                    showScreen('data-meteorologicos-section');
                    updateStepIndicator('data-meteorologicos-section');
                } else { // Expert + Residencial who chose 'boletaMensual' from options
                    showScreen('energia-section');
                    updateStepIndicator('energia-section');
                    initElectrodomesticosSection(); // This will show the 3 choices again
                }
            } else { // Basic user (must be Comercial or PYME to have reached consumo-factura-section via new flow)
                showScreen('data-meteorologicos-section');
                updateStepIndicator('data-meteorologicos-section');
            }
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
            monthIds.forEach(id => {
                const inputElement = document.getElementById(id);
                if (inputElement) {
                    const value = parseFloat(inputElement.value);
                    if (isNaN(value) || value < 0) {
                        monthlyConsumptions.push(0);
                    } else {
                        monthlyConsumptions.push(value);
                        totalAnnualConsumptionFromBill += value;
                    }
                }
            });
            userSelections.consumosMensualesFactura = monthlyConsumptions; 
            userSelections.totalAnnualConsumption = totalAnnualConsumptionFromBill; 
            saveUserSelections();

            if (userSelections.userType === 'experto') {
                showScreen('superficie-section');
                updateStepIndicator('superficie-section');
                if (typeof initSuperficieSection === 'function') {
                    initSuperficieSection();
                }
            } else { // Basic user (or default if userType not set, though it should be)
                showScreen('analisis-economico-section');
                updateStepIndicator('analisis-economico-section');
            }
        });
    }

    // MODIFICATION 3: `next-to-paneles` button (from `energia-section`)
    const nextToPanelesButton = document.getElementById('next-to-paneles');
    if (nextToPanelesButton) {
        nextToPanelesButton.addEventListener('click', () => {
            // ADD THESE LINES HERE:
            console.log('[DEBUG] Next from Energía clicked. User Type:', userSelections.userType);
            console.log('[DEBUG] Metodo Ingreso Consumo Energia:', userSelections.metodoIngresoConsumoEnergia);

            // Existing logic follows:
            if (userSelections.userType === 'experto') {
                const metodo = userSelections.metodoIngresoConsumoEnergia;
                if (metodo === 'detalleHogar' || metodo === 'detalleHogarHoras') {
                    showScreen('superficie-section');
                    updateStepIndicator('superficie-section');
                    if (typeof initSuperficieSection === 'function') {
                        initSuperficieSection();
                    }
                } else if (metodo === 'boletaMensual') {
                    // This case should ideally not be hit if 'boletaMensual' directly navigates to 'consumo-factura-section'
                    // and 'next-from-consumo-factura' is the button that leads to 'superficie-section'.
                    // However, if it can be reached, it might mean the user selected boleta but didn't proceed from there.
                    alert('Por favor, complete el ingreso de consumo por boleta en su sección correspondiente o elija otro método.');
                } else {
                    alert('Por favor, seleccione un método para ingresar los datos de consumo antes de continuar.');
                }
            } else { // Basic user
                showScreen('analisis-economico-section');
                updateStepIndicator('analisis-economico-section');
            }
        });
    }

    document.getElementById('back-to-energia')?.addEventListener('click', () => showScreen('energia-section'));

    // Listener for "Next" button on Inversor section (going to Perdidas)
    document.getElementById('next-to-perdidas')?.addEventListener('click', () => {
        showScreen('perdidas-section');
        updateStepIndicator('perdidas-section'); // Shows main Perdidas step or its first sub-step
        initPerdidasSection(); // Initializes the first sub-form of Perdidas
    });

    // Listener for "Back" button on Inversor section (going to last Paneles sub-form)
    document.getElementById('back-to-paneles')?.addEventListener('click', () => {
        showScreen('paneles-section'); // Show the main Paneles section container

        // Explicitly set the state to the last Paneles sub-form (Modelo Temperatura)
        if (panelMarcaSubform) panelMarcaSubform.style.display = 'none';
        if (panelPotenciaSubform) panelPotenciaSubform.style.display = 'none';
        if (panelModeloTemperaturaSubform) panelModeloTemperaturaSubform.style.display = 'block';

        if (typeof initModeloTemperaturaPanelOptions === 'function') {
            initModeloTemperaturaPanelOptions(); // Re-initialize its content (placeholder)
        }
        updateStepIndicator('panel-modelo-temperatura-subform'); // Step indicator for the last panel sub-form
    });

    // --- Navigation within "Pérdidas" sub-forms ---

    // Back from "Frecuencia Lluvias" to "Inversor"
    document.getElementById('back-to-inversor-from-perdidas')?.addEventListener('click', () => {
        if (frecuenciaLluviasSubformContent) frecuenciaLluviasSubformContent.style.display = 'none'; // Hide current
        showScreen('inversor-section');
        updateStepIndicator('inversor-section');
        if (typeof initInversorSection === 'function') {
            initInversorSection();
        }
    });

    const nextToFocoPolvoBtn = document.getElementById('next-to-foco-polvo-from-frecuencia');
    if (nextToFocoPolvoBtn) {
        nextToFocoPolvoBtn.addEventListener('click', () => {
            if(frecuenciaLluviasSubformContent) frecuenciaLluviasSubformContent.style.display = 'none';
            if(focoPolvoSubformContent) focoPolvoSubformContent.style.display = 'block';
            initFocoPolvoOptions();
            updateStepIndicator('foco-polvo-subform-content');
        });
    }

    const backToFrecuenciaLluviasBtn = document.getElementById('back-to-frecuencia-lluvias-from-foco-polvo');
    if (backToFrecuenciaLluviasBtn) {
        backToFrecuenciaLluviasBtn.addEventListener('click', () => {
            if(focoPolvoSubformContent) focoPolvoSubformContent.style.display = 'none';
            if(frecuenciaLluviasSubformContent) frecuenciaLluviasSubformContent.style.display = 'block';
            updateStepIndicator('frecuencia-lluvias-subform-content');
            // Re-init frecuencia lluvias options if necessary, e.g., if they could change
            if (typeof initFrecuenciaLluviasOptions === 'function') {
                initFrecuenciaLluviasOptions();
            }
        });
    }

    // Next from "Foco de Polvo" sub-form (Exiting "Pérdidas") to Analisis Economico
    const nextToAnalisisFromFocoPolvoBtn = document.getElementById('next-to-analisis-from-foco-polvo');
    if (nextToAnalisisFromFocoPolvoBtn) {
        nextToAnalisisFromFocoPolvoBtn.addEventListener('click', () => {
            showScreen('analisis-economico-section');
            updateStepIndicator('analisis-economico-section');
        });
    }

    // Main "Back" button for perdidas-section (REMOVED as buttons are now in sub-forms)
    // const backFromPerdidasBtn = document.getElementById('back-from-perdidas');
    // if (backFromPerdidasBtn) {
    //     backFromPerdidasBtn.addEventListener('click', () => {
    //         showScreen('inversor-section');
    //         updateStepIndicator('inversor-section');
    //         if (typeof initInversorSection === 'function') {
    //             initInversorSection();
    //         } else {
    //             console.warn('initInversorSection function not yet defined.');
    //         }
    //     });
    // }

    // Back button on Analisis Economico page
    const backToPerdidasFromAnalisisBtn = document.querySelector('#analisis-economico-section .back-button');
    if (backToPerdidasFromAnalisisBtn) { // Assuming there's a common class or a specific ID
        // To avoid attaching multiple listeners if this code runs multiple times or if ID is generic:
        // A more robust way would be to ensure this specific button has a unique ID like 'back-to-perdidas-from-analisis'
        // For now, let's assume it's the only .back-button or has the specific ID 'back-to-perdidas'.
        // If its ID is 'back-to-perdidas', this will override any previous generic listener for that ID.
        backToPerdidasFromAnalisisBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showScreen('perdidas-section');
            if (frecuenciaLluviasSubformContent) frecuenciaLluviasSubformContent.style.display = 'none';
            if (focoPolvoSubformContent) focoPolvoSubformContent.style.display = 'block'; // Show last sub-form
            initFocoPolvoOptions();
            updateStepIndicator('foco-polvo-subform-content');
        });
    }

    // --- Start of Paneles Sub-Form Navigation Listeners ---

    // Listener for "Back" from "Marca Panel" to "Modelo Método Radiación"
    document.getElementById('back-from-panel-marca')?.addEventListener('click', () => {
        if (panelMarcaSubform) panelMarcaSubform.style.display = 'none';
        showScreen('modelo-metodo-section');
        updateStepIndicator('modelo-metodo-section');
        if (typeof initModeloMetodoSection === 'function') {
            initModeloMetodoSection();
        }
    });

    // 1. From "Marca Panel" to "Potencia Deseada"
    document.getElementById('next-from-panel-marca')?.addEventListener('click', () => {
        if (panelMarcaSubform) panelMarcaSubform.style.display = 'none';
        if (panelPotenciaSubform) panelPotenciaSubform.style.display = 'block';
        updateStepIndicator('panel-potencia-subform');
        // Ensure potencia input shows persisted value
        if (potenciaPanelDeseadaInput && userSelections.potenciaPanelDeseada !== null) {
            potenciaPanelDeseadaInput.value = userSelections.potenciaPanelDeseada;
        } else if (potenciaPanelDeseadaInput) {
            potenciaPanelDeseadaInput.value = '';
        }
    });

    // 2. From "Potencia Deseada" back to "Marca Panel"
    document.getElementById('back-to-panel-marca')?.addEventListener('click', () => {
        if (panelPotenciaSubform) panelPotenciaSubform.style.display = 'none';
        if (panelMarcaSubform) panelMarcaSubform.style.display = 'block';
        updateStepIndicator('panel-marca-subform');
        // initMarcaPanelOptions(); // Optional: Re-call if options could change; usually not for 'Back'
    });

    // 3. From "Potencia Deseada" to "Modelo Temperatura Panel"
    document.getElementById('next-from-panel-potencia')?.addEventListener('click', () => {
        if (panelPotenciaSubform) panelPotenciaSubform.style.display = 'none';
        if (panelModeloTemperaturaSubform) panelModeloTemperaturaSubform.style.display = 'block';
        initModeloTemperaturaPanelOptions(); // Call to populate/display placeholder
        updateStepIndicator('panel-modelo-temperatura-subform');
    });

    // 4. From "Modelo Temperatura Panel" back to "Potencia Deseada"
    // Assuming the back button on panel-modelo-temperatura-subform still has id="back-to-panel-cantidad"
    // as per HTML structure after "Cantidad" subform removal, where its next button was changed.
    // The HTML for panel-modelo-temperatura-subform is:
    // <button type="button" id="back-to-panel-potencia" class="back-button">Atrás</button> (ID was changed in HTML)
    // <button type="button" id="next-to-inversor-from-panels">Siguiente</button>
    // So, we use 'back-to-panel-potencia' as the selector.
    document.getElementById('back-to-panel-potencia')?.addEventListener('click', () => {
        if (panelModeloTemperaturaSubform) panelModeloTemperaturaSubform.style.display = 'none';
        if (panelPotenciaSubform) panelPotenciaSubform.style.display = 'block';
        updateStepIndicator('panel-potencia-subform');
        // Ensure potencia input shows persisted value
        if (potenciaPanelDeseadaInput && userSelections.potenciaPanelDeseada !== null) {
            potenciaPanelDeseadaInput.value = userSelections.potenciaPanelDeseada;
        } else if (potenciaPanelDeseadaInput) {
            potenciaPanelDeseadaInput.value = '';
        }
    });

    // 5. Navigation from "Modelo Temperatura Panel" to "Inversor" section
    const nextFromPanelModeloToInversor = document.getElementById('next-to-inversor-from-panels');
    if (nextFromPanelModeloToInversor) {
        nextFromPanelModeloToInversor.addEventListener('click', () => {
            showScreen('inversor-section');
            updateStepIndicator('inversor-section');
            if (typeof initInversorSection === 'function') {
                initInversorSection();
            } else {
                console.warn('initInversorSection function not yet defined.');
            }
        });
    } else {
        console.warn("Button 'next-to-inversor-from-panels' (for navigating Paneles to Inversor) not found in HTML or DOM not ready.");
    }
    // --- End of Paneles Sub-Form Navigation Listeners ---


    const finalizarCalculoBtn = document.getElementById('finalizar-calculo');
    if (finalizarCalculoBtn) {
        finalizarCalculoBtn.addEventListener('click', async (event) => {
            event.preventDefault();
            console.log('Finalizar Cálculo clickeado. Enviando datos al backend para generar informe...');
            saveUserSelections();
            try {
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
                localStorage.setItem('informeSolar', JSON.stringify(informeFinal));
                window.location.href = 'informe.html';
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

    // EJEMPLO DE CÓDIGO EXISTENTE CHE PODRÍA ESTAR AQUÍ O SER LLAMADO:
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
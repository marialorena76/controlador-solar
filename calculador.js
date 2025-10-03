// ---- PRODUCCIÓN: base de API relativa al dominio ----
const API_BASE = window.location.origin + "/api";

console.log('🤖 calculador.js cargado - flujo de controlador ajustado y persistencia de datos');

let map, marker, geocoderControlInstance;
let userLocation = { lat: -34.6037, lng: -58.3816 }; // Buenos Aires por defecto

// Objeto para almacenar todas las selecciones del usuario
let userSelections = {
    userType: null,
    location: userLocation,
    ciudad: { codigo: null, nombre: null }, // Nueva propiedad para la ciudad
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
        modelo: null,
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
    'panel-modelo-subform': { generalCategory: 'Paneles', specificName: 'Modelo Panel', sidebarId: 'sidebar-paneles' },
    'panel-modelo-temperatura-subform': { generalCategory: 'Paneles', specificName: 'Modelo Temperatura Panel', sidebarId: 'sidebar-paneles' },

    'inversor-section': { generalCategory: 'Inversor', specificName: 'Selección de Inversor', sidebarId: 'sidebar-inversor' },

    'perdidas-section': { generalCategory: 'Pérdidas', specificName: 'Registro de Pérdidas', sidebarId: 'sidebar-perdidas' }, // Main section
    'frecuencia-lluvias-subform-content': { generalCategory: 'Pérdidas', specificName: 'Frecuencia Lluvias', sidebarId: 'sidebar-perdidas' },
    'foco-polvo-subform-content': { generalCategory: 'Pérdidas', specificName: 'Foco de Polvo', sidebarId: 'sidebar-perdidas' },

    'analisis-economico-section': { generalCategory: 'Análisis Económico', specificName: 'Análisis Económico', sidebarId: 'sidebar-analisis-economico' }
};

// Elementos principales del DOM
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

const panelModeloSubform = document.getElementById('panel-modelo-subform');
const modeloPanelOptionsContainer = document.getElementById('modelo-panel-options-container');

const panelModeloTemperaturaSubform = document.getElementById('panel-modelo-temperatura-subform');
const modeloTemperaturaSelect = document.getElementById('modelo-temperatura-select');


// --- State persistence functions removed ---
// The application now uses an in-memory state for the user selections.
// The `userSelections` object is initialized once and mutated throughout the session.
// This avoids bugs related to loading/saving state from localStorage and ensures a clean state for each visit.


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

    const apiUrl = API_BASE + '/superficie_options';
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
                const valorFloat = parseFloat(valor);
                userSelections.superficieRodea.valor = valorFloat;
                userSelections.superficieRodea.descripcion = descripcion;
            } else {
                userSelections.superficieRodea.valor = null;
                userSelections.superficieRodea.descripcion = null;
            }

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

    const apiUrl = API_BASE + '/rugosidad_options';
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
        const cleanSelectedText = selectedText ? selectedText.trim().toLowerCase() : "";

        if (!fijoAnglesContainer || !inclinacionFormGroup || !orientacionFormGroup || !anguloInclinacionInput || !anguloOrientacionInput) {
            console.warn('[initRotacionSection] updateAngleFieldsVisibilityAndData: conditional elements not found.');
            return;
        }

        const isFijos = (cleanSelectedText === "fijos");
        const isInclinacionFijaVertical = (cleanSelectedText === "inclinación fija, rotación sobre un eje vertical");

        if (isFijos) {
            fijoAnglesContainer.style.display = 'block';
            inclinacionFormGroup.style.display = 'block';
            orientacionFormGroup.style.display = 'block';
            if (userSelections.anguloInclinacion !== null) anguloInclinacionInput.value = userSelections.anguloInclinacion; else anguloInclinacionInput.value = '';
            if (userSelections.anguloOrientacion !== null) anguloOrientacionInput.value = userSelections.anguloOrientacion; else anguloOrientacionInput.value = '';
            // console.log('[initRotacionSection] "Fijos" selected. Both angle fields shown.');
        } else if (isInclinacionFijaVertical) {
            fijoAnglesContainer.style.display = 'block';
            inclinacionFormGroup.style.display = 'block';
            orientacionFormGroup.style.display = 'none'; // Hide orientation
            if (userSelections.anguloInclinacion !== null) anguloInclinacionInput.value = userSelections.anguloInclinacion; else anguloInclinacionInput.value = '';

            // Clear orientation data as it's not applicable
            if (userSelections.anguloOrientacion !== null) {
                userSelections.anguloOrientacion = null;
                anguloOrientacionInput.value = '';
                // console.log('[initRotacionSection] "Inclinación fija, rotación sobre eje vertical" selected. Orientation field hidden and data cleared.');
            } else {
                // console.log('[initRotacionSection] "Inclinación fija, rotación sobre eje vertical" selected. Orientation field hidden.');
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
                // console.log('[initRotacionSection] Non-angle rotation selected. Angle fields hidden and data cleared.');
            } else {
                // console.log('[initRotacionSection] Non-angle rotation selected. Angle fields hidden.');
            }
        }
    }

    const apiUrl = API_BASE + '/rotacion_options';
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

                console.log('[initRotacionSection] anguloInclinacion input changed:', userSelections.anguloInclinacion);
            });
        }

        if (anguloOrientacionInput) {
            anguloOrientacionInput.addEventListener('input', (e) => {
                let value = parseFloat(e.target.value);
                userSelections.anguloOrientacion = isNaN(value) ? null : value;

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
    container.className = 'radio-group'; // Add class for styling

    try {
        const data = ["Cielo Anisotrópico", "Cielo Isotrópico"];

        data.forEach(optionText => {
            const label = document.createElement('label');
            const radioInput = document.createElement('input');
            radioInput.type = 'radio';
            radioInput.name = 'metodoCalculoRadiacion';
            radioInput.value = optionText;

            if (userSelections.metodoCalculoRadiacion === optionText) {
                radioInput.checked = true;
            }

            radioInput.addEventListener('change', (event) => {
                if (event.target.checked) {
                    userSelections.metodoCalculoRadiacion = event.target.value;
                    console.log('Método de cálculo seleccionado:', userSelections.metodoCalculoRadiacion);

                    // Reset and re-initialize the dependent model section
                    userSelections.modeloMetodoRadiacion = null;
                    if (typeof initModeloMetodoSection === 'function') {
                        initModeloMetodoSection();
                    }
                }
            });

            label.appendChild(radioInput);
            label.appendChild(document.createTextNode(" " + optionText));
            container.appendChild(label);
        });

    } catch (error) {
        console.error('[METODO CALCULO OPTIONS LOAD ERROR]', error);
        container.innerHTML = '<p style="color: red; text-align: center;">No se pudieron cargar las opciones de método de cálculo.</p>';
    }
}

// --- Nueva función para inicializar la sección de Modelo del Método ---
async function initModeloMetodoSection() {
    const container = document.getElementById('modelo-metodo-options-container');
    if (!container) {
        console.error("Contenedor 'modelo-metodo-options-container' no encontrado.");
        return;
    }
    container.innerHTML = '';
    container.className = 'radio-group'; // Add class for styling

    const metodoCalculoSeleccionado = userSelections.metodoCalculoRadiacion;

    const allModelOptions = {
        "Cielo Anisotrópico": ["Modelo Hay and Davies", "Modelo Riendl", "Modelo Perez"],
        "Cielo Isotrópico": ["Método Liu-Jordan"]
    };

    let filteredData = [];
    let autoSelectModel = null;

    if (metodoCalculoSeleccionado === "Cielo Isotrópico") {
        filteredData = allModelOptions["Cielo Isotrópico"];
        autoSelectModel = "Método Liu-Jordan";
        userSelections.modeloMetodoRadiacion = autoSelectModel; // Auto-select and save
    } else if (metodoCalculoSeleccionado === "Cielo Anisotrópico") {
        filteredData = allModelOptions["Cielo Anisotrópico"];
        if (!userSelections.modeloMetodoRadiacion || !filteredData.includes(userSelections.modeloMetodoRadiacion)) {
            userSelections.modeloMetodoRadiacion = "Modelo Perez"; // Default to Perez
        }
    }

    if (filteredData.length === 0) {
        container.innerHTML = '<p style="color: #666;">Seleccione un método de cálculo para ver los modelos disponibles.</p>';
        return;
    }

    filteredData.forEach(optionText => {
        const label = document.createElement('label');
        const radioInput = document.createElement('input');
        radioInput.type = 'radio';
        radioInput.name = 'modeloMetodoRadiacion';
        radioInput.value = optionText;

        if (userSelections.modeloMetodoRadiacion === optionText) {
            radioInput.checked = true;
        }

        if (metodoCalculoSeleccionado === "Cielo Isotrópico") {
            radioInput.disabled = true;
        }

        radioInput.addEventListener('change', (event) => {
            if (event.target.checked) {
                userSelections.modeloMetodoRadiacion = event.target.value;
                console.log('Modelo del método seleccionado:', userSelections.modeloMetodoRadiacion);
            }
        });

        label.appendChild(radioInput);
        label.appendChild(document.createTextNode(" " + optionText));
        container.appendChild(label);
    });
}

// --- Nueva función para inicializar la sección de Pérdidas ---
function initPerdidasSection() {
    if (!panelModeloTemperaturaSubform || !frecuenciaLluviasSubformContent || !focoPolvoSubformContent) {
        console.error("Contenedores de sub-formularios de pérdidas no encontrados.");
        return;
    }

    // Hide all sub-form content wrappers first
    panelModeloTemperaturaSubform.style.display = 'none';
    frecuenciaLluviasSubformContent.style.display = 'none';
    focoPolvoSubformContent.style.display = 'none';

    // Show the first sub-form: Modelo de Temperatura
    panelModeloTemperaturaSubform.style.display = 'block';
    updateStepIndicator('panel-modelo-temperatura-subform');

    // Initialize its content
    initModeloTemperaturaPanelOptions();
}

async function initFrecuenciaLluviasOptions() {
    const container = document.getElementById('frecuencia-lluvias-options-container');
    if (!container) {
        console.error("Contenedor 'frecuencia-lluvias-options-container' no encontrado.");
        return;
    }
    container.innerHTML = '';
    container.className = 'radio-group';

    try {
        const response = await fetch(API_BASE + '/frecuencia_lluvias_options');
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
            console.log('[FRECUENCIA LLUVIAS LOAD] No hay opciones de frecuencia de lluvias disponibles.');
            container.innerHTML = '<p>No hay opciones de frecuencia de lluvias disponibles.</p>';
        } else {
            data.forEach(optionText => {
                const label = document.createElement('label');
                const radioInput = document.createElement('input');
                radioInput.type = 'radio';
                radioInput.name = 'frecuenciaLluvias';
                radioInput.value = optionText;

                if (userSelections.frecuenciaLluvias === optionText) {
                    radioInput.checked = true;
                }

                radioInput.addEventListener('change', (event) => {
                    if (event.target.checked) {
                        userSelections.frecuenciaLluvias = event.target.value;
                        console.log('Frecuencia de lluvias seleccionada:', userSelections.frecuenciaLluvias);
                    }
                });

                label.appendChild(radioInput);
                label.appendChild(document.createTextNode(" " + optionText));
                container.appendChild(label);
            });
        }
    } catch (error) {
        console.error('[FRECUENCIA LLUVIAS LOAD ERROR] Fetch/process error:', error);
        if (error.message) console.error('[FRECUENCIA LLUVIAS LOAD ERROR] Message:', error.message);
        alert('Error al cargar las opciones de frecuencia de lluvias. Revise la consola del navegador para más detalles.');
        container.innerHTML = '<p style="color:red;">Error al cargar opciones. Intente más tarde.</p>';
    }
}

function initAnalisisEconomicoSection() {
    const container = document.getElementById('analisis-economico-section');
    if (!container) return;

    // Remove existing help text to avoid duplicates
    const existingHelp = container.querySelector('.form-description');
    if (existingHelp) {
        existingHelp.remove();
    }

    const helpText = document.createElement('p');
    helpText.className = 'form-description';
    helpText.innerHTML = 'Pesos argentinos (AR$) o Dólares estadounidenses (US$). La conversión entre una y otra moneda se hace de forma automática utilizando el valor oficial del Banco Nación.';

    const formGroup = container.querySelector('.form-group');
    if (formGroup) {
        // Insert after the select element within the form-group
        const selectElement = formGroup.querySelector('select');
        if (selectElement) {
            selectElement.after(helpText);
        } else {
            formGroup.appendChild(helpText);
        }
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

                console.log('Foco de polvo cercano seleccionado:', userSelections.focoPolvoCercano);
            }
        });

        label.appendChild(radioInput);
        label.appendChild(document.createTextNode(" " + opt.text)); // Add space before text
        container.appendChild(label);
    });
}


// --- Nueva función para implementar el buscador de ciudades ---
async function initCitySearch() {
    const searchInput = document.getElementById('ciudad-search-input');
    const dataList = document.getElementById('ciudades-list');
    const locationDisplay = document.getElementById('location-display');

    if (!searchInput || !dataList || !locationDisplay) {
        console.error("No se encontraron los elementos para el buscador de ciudades.");
        return;
    }

    try {
        const response = await fetch(API_BASE + '/ciudades');
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        const ciudades = await response.json();

        // Guardar la lista para referencia en el evento
        searchInput.ciudadesData = ciudades;

        // Rellenar el datalist
        ciudades.forEach(ciudad => {
            const option = document.createElement('option');
            option.value = ciudad.nombre;
            dataList.appendChild(option);
        });

        // Usar el evento 'change' que es más robusto para datalists
        searchInput.addEventListener('change', async (e) => {
            const selectedName = e.target.value.trim();
            const userTypeSection = document.getElementById('user-type-section');
            const ciudadSeleccionada = searchInput.ciudadesData.find(
                c => c.nombre.trim().toLowerCase() === selectedName.toLowerCase()
            );

            if (ciudadSeleccionada) {
                console.log('Ciudad seleccionada desde el buscador:', ciudadSeleccionada);
                userSelections.ciudad = {
                    codigo: ciudadSeleccionada.codigo,
                    nombre: ciudadSeleccionada.nombre
                };
                locationDisplay.textContent = `Ubicación seleccionada: ${ciudadSeleccionada.nombre}`;
                locationDisplay.style.backgroundColor = '#e9f5e9';
                if (userTypeSection) userTypeSection.style.display = 'block'; // Show next step
                await persistSelectedCityName(ciudadSeleccionada.nombre);
            } else {
                console.warn(`La ciudad '${selectedName}' no se encontró en la lista.`);
                userSelections.ciudad = { codigo: null, nombre: null };
                locationDisplay.textContent = 'Ciudad no válida. Por favor, seleccione una de la lista.';
                locationDisplay.style.backgroundColor = '#fbe9e7';
                if (userTypeSection) userTypeSection.style.display = 'none'; // Hide next step
                await persistSelectedCityName('');
            }
        });

    } catch (error) {
        console.error("Error al cargar la lista de ciudades:", error);
        // Opcional: mostrar un mensaje de error al usuario
    }
}

async function persistSelectedCityName(cityName) {
    const locationDisplay = document.getElementById('location-display');
    try {
        const response = await fetch(API_BASE + '/excel/update_cell', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ciudad: cityName || '' })
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok || data.success === false) {
            const errorMessage = (data && data.error) ? data.error : `Error del servidor: ${response.status}`;
            throw new Error(errorMessage);
        }

        return true;
    } catch (error) {
        console.error('Error al persistir la ciudad seleccionada:', error);
        if (locationDisplay) {
            const warningSuffix = ' (No se pudo guardar en el servidor)';
            if (!locationDisplay.textContent.includes(warningSuffix.trim())) {
                locationDisplay.textContent = `${locationDisplay.textContent}${warningSuffix}`;
            }
            locationDisplay.style.backgroundColor = '#fbe9e7';
        }
        return false;
    }
}

// --- Lógica del Mapa (EXISTENTE, CON PEQUEÑAS MEJORAS) ---

function initMap() {
    try {
        const mapContainer = document.getElementById('map');
        if (!mapContainer) {
            console.error('No se encontró el contenedor del mapa.');
            return;
        }

        // Si el mapa ya existe, lo eliminamos para recrearlo.
        if (map) {
            map.off();
            map.remove();
        }
        marker = null;

        map = L.map(mapContainer).setView(userLocation, 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        marker = L.marker(userLocation).addTo(map);

        map.on('click', function(e) {
            userLocation.lat = e.latlng.lat;
            userLocation.lng = e.latlng.lng;
            marker.setLatLng(userLocation);
            userSelections.location = userLocation;

            if (geocoderControlInstance && geocoderControlInstance.options.geocoder) {
                geocoderControlInstance.options.geocoder.reverse(e.latlng, map.options.crs.scale(map.getZoom()), async function(results) {
                    const r = results[0];
                    const locationDisplay = document.getElementById('location-display');

                    if (r && r.name) {
                        const props = r.properties || {};
                        const address = props.address || {};
                        const immediateCityName = address.city || address.town || address.village || props.city || props.town || props.village;

                        if (locationDisplay) {
                            locationDisplay.textContent = immediateCityName ? `Ubicación: ${immediateCityName}` : 'Identificando ubicación...';
                            locationDisplay.style.backgroundColor = immediateCityName ? '#e9f5e9' : '#e3f2fd';
                        }

                        const ciudadResult = await buscarCodigoCiudad(r.name);
                        if (ciudadResult) {
                            userSelections.ciudad = ciudadResult;
                            if (locationDisplay) locationDisplay.textContent = `Ubicación seleccionada: ${ciudadResult.nombre}`;
                            await persistSelectedCityName(ciudadResult.nombre);
                        } else {
                            userSelections.ciudad = { codigo: null, nombre: immediateCityName || null };
                            if (locationDisplay) {
                                locationDisplay.textContent = immediateCityName ? `Ubicación: ${immediateCityName} (No confirmada)` : 'No se pudo encontrar la ciudad.';
                                locationDisplay.style.backgroundColor = immediateCityName ? '#fff9c4' : '#fbe9e7';
                            }
                            await persistSelectedCityName(immediateCityName || '');
                        }
                    } else {
                        if (locationDisplay) {
                            locationDisplay.textContent = 'No se pudo identificar la ubicación.';
                            locationDisplay.style.backgroundColor = '#fbe9e7';
                        }
                        userSelections.ciudad = { codigo: null, nombre: null };
                        await persistSelectedCityName('');
                    }
                });
            }
        });

        geocoderControlInstance = L.Control.geocoder({
            placeholder: 'Ej: Buchardo 3232, Olavarría',
            errorMessage: 'No se encontró la dirección.',
            defaultMarkGeocode: true,
            collapsed: false,
            geocoder: new L.Control.Geocoder.Photon()
        }).on('markgeocode', async function(e) {
            try {
                const locationDisplay = document.getElementById('location-display');
                if (e.geocode && e.geocode.center) {
                    userLocation = { lat: e.geocode.center.lat, lng: e.geocode.center.lng };
                    map.setView(userLocation, 13);
                    userSelections.location = userLocation;

                    if (locationDisplay) {
                        locationDisplay.textContent = 'Buscando ciudad...';
                        locationDisplay.style.backgroundColor = '#e3f2fd';
                    }

                    const ciudadResult = await buscarCodigoCiudad(e.geocode.name);
                    if (ciudadResult) {
                        userSelections.ciudad = ciudadResult;
                        if (locationDisplay) {
                            locationDisplay.textContent = `Ubicación seleccionada: ${ciudadResult.nombre}`;
                            locationDisplay.style.backgroundColor = '#e9f5e9';
                        }
                        await persistSelectedCityName(ciudadResult.nombre);
                    } else {
                        const ciudadParcial = extraerCiudadDeDireccion(e.geocode.name);
                        userSelections.ciudad = { codigo: null, nombre: ciudadParcial };
                        if (locationDisplay) {
                            locationDisplay.textContent = ciudadParcial ? `Ubicación: ${ciudadParcial} (No confirmada)` : 'Ciudad no encontrada.';
                            locationDisplay.style.backgroundColor = ciudadParcial ? '#fff9c4' : '#fbe9e7';
                        }
                        await persistSelectedCityName(ciudadParcial || '');
                    }
                }
            } catch (error) {
                console.error('Error en el handler de markgeocode:', error);
                const locationDisplay = document.getElementById('location-display');
                if(locationDisplay) {
                    locationDisplay.textContent = 'Error al procesar la ubicación.';
                    locationDisplay.style.backgroundColor = '#fbe9e7';
                }
            }
        }).addTo(map);

        const geocoderContainer = document.getElementById('geocoder-container');
        if (geocoderContainer) {
            const geocoderElement = geocoderControlInstance.getContainer();
            if (geocoderElement) {
                geocoderContainer.innerHTML = '';
                geocoderContainer.appendChild(geocoderElement);
            }
        }

        requestAnimationFrame(() => {
            if (map) {
                map.invalidateSize();
            }
        });
    } catch (error) {
        console.error("Error fatal al inicializar el mapa. El buscador de ciudades seguirá funcionando.", error);
        const mapContainer = document.getElementById('map');
        if (mapContainer) {
            mapContainer.innerHTML = '<p style="text-align:center; padding: 20px;">El mapa no se pudo cargar. Por favor, utilice el buscador de ciudades.</p>';
        }
    }
}

// --- Nueva función para buscar el código de la ciudad (refactorizada) ---
async function buscarCodigoCiudad(fullAddress) {
    try {
        const response = await fetch(API_BASE + '/buscar_ciudad', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ full_address: fullAddress }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Error del servidor: ${response.status}`);
        }

        const data = await response.json();
        if (data.codigo_ciudad !== null && data.codigo_ciudad !== undefined) {
            console.log(`Ciudad encontrada desde backend: ${data.nombre_ciudad}, Código: ${data.codigo_ciudad}`);
            return {
                codigo: data.codigo_ciudad,
                nombre: data.nombre_ciudad
            };
        } else {
            console.warn('Backend no encontró código para la dirección:', fullAddress);
            return null; // Devuelve null si el backend no encuentra la ciudad
        }
    } catch (error) {
        console.error('Error en la llamada a /buscar_ciudad:', error);
        return null; // Devuelve null en caso de error de red o de servidor
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
            if (mapScreen) {
                mapScreen.style.display = 'flex'; // Usar flex para alinear contenido
            }

            // Llama a invalidateSize usando requestAnimationFrame para asegurar que el DOM esté listo.
            // Esto soluciona el problema del mapa que no se muestra si el contenedor estaba oculto.
            requestAnimationFrame(() => {
                if (map) {
                    map.invalidateSize(true);
                } else {
                    // Si el mapa no está inicializado, lo inicializamos aquí.
                    // Esto puede suceder si la pantalla del mapa es la primera en mostrarse.
                    initMap();
                }
            });

        } else if (screenId === 'data-form-screen') {
            if (dataFormScreen) dataFormScreen.style.display = 'block';
            if (dataMeteorologicosSection) dataMeteorologicosSection.style.display = 'block';
        } else {
            if (dataFormScreen) {
                dataFormScreen.style.display = 'block';
            }
            targetElement.style.display = 'block';
        }
    } else {
        console.error(`Error: La pantalla con ID '${screenId}' no fue encontrada.`);
    }
    // Note: updateStepIndicator is called by the individual button event listeners 
    // immediately after they call showScreen.
}

function updateStepIndicator(currentSectionId) {
    // Deactivate all sidebar items
    const allSidebarItems = document.querySelectorAll('.sidebar .sidebar-item');
    allSidebarItems.forEach(item => {
        item.classList.remove('active');
    });

    // Find the new active sidebar item based on the current screen
    const sectionInfo = sectionInfoMap[currentSectionId];
    if (sectionInfo && sectionInfo.sidebarId) {
        const activeSidebarItem = document.getElementById(sectionInfo.sidebarId);
        if (activeSidebarItem) {
            activeSidebarItem.classList.add('active');
        }
    }

    // Also update the text indicator, simplified for now
    if (stepIndicatorText && sectionInfo) {
        stepIndicatorText.textContent = sectionInfo.specificName;
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
    const alturaInstalacionInput = document.getElementById('altura-instalacion-input');
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
            document.getElementById('data-form-screen').classList.add('basic-user-mode');

            showMapScreenFormSection('supply-section');
        });
    }

    if (expertUserButton) {
        expertUserButton.addEventListener('click', () => {
            userSelections.userType = 'experto';
            document.getElementById('data-form-screen').classList.remove('basic-user-mode');

            showMapScreenFormSection('supply-section');
            updateStepIndicator('map-screen');
        });
    }

    if (residentialButton) {
        residentialButton.addEventListener('click', () => {
            userSelections.installationType = 'Residencial';

            showMapScreenFormSection('income-section');
        });
    }

    if (commercialButton) { // commercialButton is const commercialButton = document.getElementById('commercial-button');
        commercialButton.addEventListener('click', () => {
            userSelections.installationType = 'Comercial';

            if (userSelections.userType === 'experto') {
                showScreen('data-form-screen');
                if (dataMeteorologicosSection) dataMeteorologicosSection.style.display = 'block';
                updateStepIndicator('data-meteorologicos-section');
            } else { // Basic user, non-residential
                showScreen('data-form-screen');
                if (dataMeteorologicosSection) dataMeteorologicosSection.style.display = 'block';
                updateStepIndicator('data-meteorologicos-section');
            }
        });
    }

    if (pymeButton) { // pymeButton is const pymeButton = document.getElementById('pyme-button');
        pymeButton.addEventListener('click', () => {
            userSelections.installationType = 'PYME';

            if (userSelections.userType === 'experto') {
                showScreen('data-form-screen');
                if (dataMeteorologicosSection) dataMeteorologicosSection.style.display = 'block';
                updateStepIndicator('data-meteorologicos-section');
            } else { // Basic user, non-residential
                showScreen('data-form-screen');
                if (dataMeteorologicosSection) dataMeteorologicosSection.style.display = 'block';
                updateStepIndicator('data-meteorologicos-section');
            }
        });
    }

    if (incomeHighButton) {
        incomeHighButton.addEventListener('click', () => {
            userSelections.incomeLevel = 'ALTO';

            showScreen('data-form-screen'); 
            if (dataMeteorologicosSection) dataMeteorologicosSection.style.display = 'block';
            updateStepIndicator('data-meteorologicos-section');
        });
    }

    if (incomeLowButton) {
        incomeLowButton.addEventListener('click', () => {
            userSelections.incomeLevel = 'BAJO';

            showScreen('data-form-screen');
            if (dataMeteorologicosSection) dataMeteorologicosSection.style.display = 'block';
            updateStepIndicator('data-meteorologicos-section');
        });
    }

    if (incomeMediumButton) { // Check if the button element exists
        incomeMediumButton.addEventListener('click', () => {
            userSelections.incomeLevel = 'MEDIO'; // Using uppercase 'MEDIO' for consistency with ALTO/BAJO values

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

    });
    document.getElementById('moneda')?.addEventListener('change', (e) => {
        userSelections.selectedCurrency = e.target.value;

    });

    document.getElementById('tipo-panel')?.addEventListener('change', (e) => {
        userSelections.panelesSolares.tipo = e.target.value;

    });
    document.getElementById('cantidad-paneles-input')?.addEventListener('input', (e) => {
        userSelections.panelesSolares.cantidad = parseInt(e.target.value) || 0;

    });

    document.getElementById('tipo-inversor')?.addEventListener('change', (e) => {
        userSelections.inversor.tipo = e.target.value;

    });
    document.getElementById('potencia-inversor-input')?.addEventListener('input', (e) => {
        userSelections.inversor.potenciaNominal = parseFloat(e.target.value) || 0;

    });

    document.getElementById('eficiencia-panel-input')?.addEventListener('input', (e) => {
        userSelections.perdidas.eficienciaPanel = parseFloat(e.target.value) || 0;

    });
    document.getElementById('eficiencia-inversor-input')?.addEventListener('input', (e) => {
        userSelections.perdidas.eficienciaInversor = parseFloat(e.target.value) || 0;

    });
    document.getElementById('factor-perdidas-input')?.addEventListener('input', (e) => {
        userSelections.perdidas.factorPerdidas = parseFloat(e.target.value) || 0;

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
    //
    //     });
    // }

    // Declaration moved to the top of the function
    if (alturaInstalacionInput) {
        alturaInstalacionInput.addEventListener('input', (event) => {
            const value = parseFloat(event.target.value);
            if (!isNaN(value) && value >= 0) {
                userSelections.alturaInstalacion = value;
            } else if (event.target.value === '') {
                userSelections.alturaInstalacion = null;
            }

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

    document.getElementById('next-to-energia')?.addEventListener('click', (event) => {
        event.preventDefault();
        const selectedZona = document.querySelector('input[name="zonaInstalacionNewScreen"]:checked');
        if (selectedZona) {
            userSelections.selectedZonaInstalacion = selectedZona.value;

            console.log('Zona de instalación seleccionada:', userSelections.selectedZonaInstalacion);
        } else {
            console.warn('No se seleccionó zona de instalación.');
        }

        if (userSelections.userType === 'experto') {
            showScreen('superficie-section');
            updateStepIndicator('superficie-section');
            if (typeof initSuperficieSection === 'function') initSuperficieSection();
        } else {
            showScreen('energia-section');
            updateStepIndicator('energia-section');
            if (typeof initElectrodomesticosSection === 'function') initElectrodomesticosSection();
        }
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
            // Validate superficieRodea selection
            if (userSelections.superficieRodea.valor === null) {
                alert("Por favor, seleccione una opción de superficie.");
                return;
            }
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
        // Validate rugosidadSuperficie selection
        if (userSelections.rugosidadSuperficie.valor === null) {
            alert("Por favor, seleccione una opción de rugosidad.");
            return;
        }
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



    // ** START: MODIFIED BLOCK for next-to-paneles-from-modelo **
    document.getElementById('next-to-paneles-from-modelo')?.addEventListener('click', () => {
        showScreen('energia-section');
        updateStepIndicator('energia-section');
        if (typeof initElectrodomesticosSection === 'function') initElectrodomesticosSection();
    });
    // ** END: MODIFIED BLOCK for next-to-paneles-from-modelo **

    // Navigation from last Paneles sub-form (Modelo Temperatura Panel) to Inversor section
    const nextFromPanelesToInversorBtn = document.getElementById('next-to-inversor-from-panels'); // CORRECTED ID
    if (nextFromPanelesToInversorBtn) {
        nextFromPanelesToInversorBtn.addEventListener('click', () => {
            // Optional: Add validation for the last panel sub-form (modeloTemperaturaPanel) if needed
            showScreen('inversor-section');
            updateStepIndicator('inversor-section');
            initInversorSection();
        });
    } else {
        // This warning will appear if this JS runs before the 'panel-modelo-temperatura-subform' and its button
        // are dynamically shown, OR if the ID is still mismatched with the HTML.
        // The HTML for this button (id="next-to-inversor-from-panels") was added in plan step B.3 (HTML for Expert Paneles Sub-Forms).
        console.warn("Button 'next-to-inversor-from-panels' (for Paneles to Inversor) not found. Check HTML and JS execution order.");
    }

    document.getElementById('back-to-data-meteorologicos')?.addEventListener('click', () => {
        if (userSelections.userType === 'basico') {
            showScreen('data-meteorologicos-section');
            updateStepIndicator('data-meteorologicos-section');
        } else { // Expert user
            showScreen('modelo-metodo-section');
            updateStepIndicator('modelo-metodo-section');
            if (typeof initModeloMetodoSection === 'function') initModeloMetodoSection();
        }
    });

    // The `back-from-consumo-factura` and `next-from-consumo-factura` buttons
    // were inside the moved HTML section. Their logic is now handled by the main
    // navigation buttons of the `energia-section` (`#back-to-data-meteorologicos` and `#next-to-paneles`).
    // The old listeners are removed to prevent conflicts.

    // MODIFICATION 3: `next-to-paneles` button (from `energia-section`)
    const nextToPanelesButton = document.getElementById('next-to-paneles');
    if (nextToPanelesButton) {
        nextToPanelesButton.addEventListener('click', () => {
            if (userSelections.metodoIngresoConsumoEnergia === 'promedioMensual') {
                const promedioInput = document.getElementById('consumo-promedio-mes');
                if (promedioInput) {
                    const promedioValue = parseFloat(promedioInput.value) || 0;
                    userSelections.totalAnnualConsumption = promedioValue * 12;
                    userSelections.totalMonthlyConsumption = promedioValue;
                }
            } else if (userSelections.metodoIngresoConsumoEnergia === 'boletaMensual') {
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
                // También actualizamos el consumo mensual promedio para consistencia
                userSelections.totalMonthlyConsumption = totalAnnualConsumptionFromBill / 12;

            }

            // La navegación continúa como antes...
            if (userSelections.userType === 'experto') {
                showScreen('paneles-section');
                initPanelesSectionExpert();
                updateStepIndicator('panel-marca-subform');
            } else {
                // Para usuarios básicos, salteamos la sección de paneles y
                // vamos directo al análisis económico
                showScreen('analisis-economico-section');
                updateStepIndicator('analisis-economico-section');
                initAnalisisEconomicoSection();
            }
        });
    }

    document.getElementById('back-to-energia')?.addEventListener('click', () => {
        showScreen('energia-section');
        initElectrodomesticosSection();
    });

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
        if (panelModeloSubform) panelModeloSubform.style.display = 'none';
        if (panelModeloTemperaturaSubform) panelModeloTemperaturaSubform.style.display = 'block';

        if (typeof initModeloTemperaturaPanelOptions === 'function') {
            initModeloTemperaturaPanelOptions(); // Re-initialize its content (placeholder)
        }
        updateStepIndicator('panel-modelo-temperatura-subform'); // Step indicator for the last panel sub-form
    });

    // --- Navigation within "Pérdida por Factoreo Ambiental" sub-forms (Reordered) ---

    // Back from "Modelo Temperatura" to "Inversor"
    document.getElementById('back-to-inversor-from-perdidas')?.addEventListener('click', () => {
        showScreen('inversor-section');
        updateStepIndicator('inversor-section');
        initInversorSection();
    });

    // Next from "Modelo Temperatura" to "Frecuencia Lluvias"
    document.getElementById('next-to-frecuencia-lluvias-from-modelo-temperatura')?.addEventListener('click', () => {
        if(panelModeloTemperaturaSubform) panelModeloTemperaturaSubform.style.display = 'none';
        if(frecuenciaLluviasSubformContent) frecuenciaLluviasSubformContent.style.display = 'block';
        initFrecuenciaLluviasOptions();
        updateStepIndicator('frecuencia-lluvias-subform-content');
    });

    // Back from "Frecuencia Lluvias" to "Modelo Temperatura"
    document.getElementById('back-to-modelo-temperatura-from-frecuencia-lluvias')?.addEventListener('click', () => {
        if(frecuenciaLluviasSubformContent) frecuenciaLluviasSubformContent.style.display = 'none';
        if(panelModeloTemperaturaSubform) panelModeloTemperaturaSubform.style.display = 'block';
        initModeloTemperaturaPanelOptions();
        updateStepIndicator('panel-modelo-temperatura-subform');
    });

    // Next from "Frecuencia Lluvias" to "Foco de Polvo"
    document.getElementById('next-to-foco-polvo-from-frecuencia')?.addEventListener('click', () => {
        if(frecuenciaLluviasSubformContent) frecuenciaLluviasSubformContent.style.display = 'none';
        if(focoPolvoSubformContent) focoPolvoSubformContent.style.display = 'block';
        initFocoPolvoOptions();
        updateStepIndicator('foco-polvo-subform-content');
    });

    // Back from "Foco de Polvo" to "Frecuencia Lluvias"
    document.getElementById('back-to-frecuencia-lluvias-from-foco-polvo')?.addEventListener('click', () => {
        if(focoPolvoSubformContent) focoPolvoSubformContent.style.display = 'none';
        if(frecuenciaLluviasSubformContent) frecuenciaLluviasSubformContent.style.display = 'block';
        initFrecuenciaLluviasOptions();
        updateStepIndicator('frecuencia-lluvias-subform-content');
    });

    // Next from "Foco de Polvo" to "Análisis Económico"
    document.getElementById('next-to-analisis-from-foco-polvo')?.addEventListener('click', () => {
        showScreen('analisis-economico-section');
        updateStepIndicator('analisis-economico-section');
        initAnalisisEconomicoSection();
    });

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
    if (backToPerdidasFromAnalisisBtn) {
        backToPerdidasFromAnalisisBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (userSelections.userType === 'basico') {
                showScreen('energia-section');
                updateStepIndicator('energia-section');
                // Re-initialize the energy section to show the correct view
                if (typeof initElectrodomesticosSection === 'function') {
                    initElectrodomesticosSection();
                }
            } else { // Expert user
                showScreen('perdidas-section');
                if (frecuenciaLluviasSubformContent) frecuenciaLluviasSubformContent.style.display = 'none';
                if (focoPolvoSubformContent) focoPolvoSubformContent.style.display = 'block'; // Show last sub-form
                initFocoPolvoOptions();
                updateStepIndicator('foco-polvo-subform-content');
            }
        });
    }

    // --- Start of Paneles Sub-Form Navigation Listeners ---

    // Listener for "Back" from the combined "Marca/Potencia/Modelo" form to "Modelo Método Radiación"
    document.getElementById('back-from-panel-marca')?.addEventListener('click', () => {
        showScreen('modelo-metodo-section');
        updateStepIndicator('modelo-metodo-section');
        if (typeof initModeloMetodoSection === 'function') {
            initModeloMetodoSection();
        }
    });

    // Listener for "Next" from the combined "Marca/Potencia/Modelo" form to "Inversor"
    document.getElementById('next-to-inversor-from-panels')?.addEventListener('click', () => {
        showScreen('inversor-section');
        updateStepIndicator('inversor-section');
        initInversorSection();
    });

    // --- End of Paneles Sub-Form Navigation Listeners ---


    const finalizarCalculoBtn = document.getElementById('finalizar-calculo');
    if (finalizarCalculoBtn) {
        finalizarCalculoBtn.addEventListener('click', async (event) => {
            event.preventDefault();
            console.log('Finalizar Cálculo clickeado. Enviando datos al backend para generar informe...');

            try {
                // Create a clean payload object (DTO) to send to the backend.
                // This prevents circular reference errors from complex objects (like the map)
                // and ensures only necessary data is sent.
                const payload = {
                    userType: userSelections.userType,
                    location: userSelections.location,
                    ciudad: userSelections.ciudad,
                    installationType: userSelections.installationType,
                    incomeLevel: userSelections.incomeLevel,
                    selectedZonaInstalacion: userSelections.selectedZonaInstalacion,
                    superficieRodea: userSelections.superficieRodea,
                    rugosidadSuperficie: userSelections.rugosidadSuperficie,
                    rotacionInstalacion: userSelections.rotacionInstalacion,
                    anguloInclinacion: userSelections.anguloInclinacion,
                    anguloOrientacion: userSelections.anguloOrientacion,
                    alturaInstalacion: userSelections.alturaInstalacion,
                    metodoCalculoRadiacion: userSelections.metodoCalculoRadiacion,
                    modeloMetodoRadiacion: userSelections.modeloMetodoRadiacion,
                    marcaPanel: userSelections.marcaPanel,
                    potenciaPanelDeseada: userSelections.potenciaPanelDeseada,
                    modeloTemperaturaPanel: userSelections.modeloTemperaturaPanel,
                    frecuenciaLluvias: userSelections.frecuenciaLluvias,
                    focoPolvoCercano: userSelections.focoPolvoCercano,
                    metodoIngresoConsumoEnergia: userSelections.metodoIngresoConsumoEnergia,
                    consumosMensualesFactura: userSelections.consumosMensualesFactura,
                    totalAnnualConsumption: userSelections.totalAnnualConsumption,
                    selectedCurrency: userSelections.selectedCurrency,
                    panelesSolares: userSelections.panelesSolares,
                    inversor: userSelections.inversor
                };

                const response = await fetch(API_BASE + '/generar_informe', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(`HTTP error! status: ${response.status} - ${errorData.error || response.statusText}`);
                }
                const informeFinal = await response.json();
                console.log('Informe recibido del backend:', informeFinal);

                localStorage.setItem('informeSolar', JSON.stringify(informeFinal));
                try {
                    localStorage.setItem('userSelections', JSON.stringify(payload));
                } catch (storageError) {
                    console.warn('No se pudo guardar userSelections en localStorage', storageError);
                }

                // Redirigir siempre a informe.html, que es la página de reporte correcta.
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

function setupSidebarNavigation() {
    const navMap = {
        'sidebar-datos': 'data-meteorologicos-section',
        'sidebar-energia': 'energia-section',
        'sidebar-paneles': 'paneles-section',
        'sidebar-inversor': 'inversor-section',
        'sidebar-perdidas': 'perdidas-section',
        'sidebar-analisis-economico': 'analisis-economico-section',
        'sidebar-resultados': 'resultados-informe'
    };
    Object.entries(navMap).forEach(([sidebarId, target]) => {
        const element = document.getElementById(sidebarId);
        if (element) {
            element.addEventListener('click', () => {
                showScreen(target);
                updateStepIndicator(target);

                // Call the appropriate init function when navigating via sidebar
                if (target === 'energia-section') {
                    initElectrodomesticosSection();
                } else if (target === 'analisis-economico-section') {
                    initAnalisisEconomicoSection();
                } else if (target === 'paneles-section' && userSelections.userType === 'experto') {
                    initPanelesSectionExpert();
                } else if (target === 'inversor-section' && userSelections.userType === 'experto') {
                    initInversorSection();
                } else if (target === 'perdidas-section' && userSelections.userType === 'experto') {
                    initPerdidasSection();
                }
                // Add other init functions as needed for robustness
            });
        }
    });
}


// --- INIT principal (Se ejecuta al cargar el DOM) (EXISTENTE, MODIFICADO) ---
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // La inicialización del mapa se ha deshabilitado para priorizar el buscador de ciudades.
        // initMap();

        // Inicializa el nuevo buscador de ciudades
        initCitySearch();

        // Intenta cargar los datos de electrodomésticos. Si falla, el catch lo manejará.
        await cargarElectrodomesticosDesdeBackend();

        // Configura los botones y la navegación. Esto se ejecutará incluso si la carga de datos falla.
        setupNavigationButtons();
        setupSidebarNavigation();

        // Muestra la pantalla inicial.
        showScreen('map-screen');

    } catch (error) {
        console.error("Error fatal durante la inicialización:", error);
        // Opcional: Muestra un mensaje de error al usuario en la propia página.
        const body = document.querySelector('body');
        if (body) {
            body.innerHTML = `<div style="text-align: center; padding: 50px; font-family: sans-serif;">
                <h1>Error al cargar la aplicación</h1>
                <p>No se pudieron cargar los datos necesarios para iniciar la calculadora. Por favor, intente recargar la página más tarde.</p>
                <p><i>Detalle del error: ${error.message}</i></p>
            </div>`;
        }
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
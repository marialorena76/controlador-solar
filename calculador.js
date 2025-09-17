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
// const latitudDisplay = document.getElementById('latitud-display'); // Eliminado
// const longitudDisplay = document.getElementById('longitud-display'); // Eliminado
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

async function fetchAndDisplayPanelModel() {
    console.log('[DEBUG] fetchAndDisplayPanelModel called. Fetching from the correct endpoint...');
    const modeloPanelInput = document.getElementById('modelo-panel-input');
    if (!modeloPanelInput) {
        console.error("Elemento 'modelo-panel-input' no encontrado.");
        return;
    }

    // Ensure we have the necessary data before making the call
    const marca = userSelections.marcaPanel;
    const potencia = userSelections.potenciaPanelDeseada;

    if (!marca || !potencia) {
        modeloPanelInput.value = 'Seleccione marca y potencia';
        // Clear any previously fetched model name
        if (userSelections.panelesSolares) {
            userSelections.panelesSolares.modelo = null;

        }
        return;
    }

    modeloPanelInput.value = 'Buscando modelo...'; // Show loading state

    try {
        const response = await fetch('http://127.0.0.1:5000/api/get_panel_model', { // Correct endpoint
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ // Send only the required data
                marca: marca,
                potencia: potencia
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: `Error del servidor: ${response.status}` }));
            throw new Error(errorData.error || `Error del servidor: ${response.status}`);
        }

        const data = await response.json();
        console.log('[DEBUG] Modelo de panel recibido:', data);

        const modelName = data.model_name; // Correctly extract model name from the new response structure

        if (modelName && modelName.trim() !== '' && !modelName.startsWith('VERIFIQUE')) {
            modeloPanelInput.value = modelName;
            if (userSelections.panelesSolares) {
                userSelections.panelesSolares.modelo = modelName;
                 // Save the found model
            }
        } else {
            // Display the error/info message from the backend or a default one
            modeloPanelInput.value = modelName || 'No hay modelo disponible';
            if (userSelections.panelesSolares) {
                userSelections.panelesSolares.modelo = null; // Clear stale model data

            }
        }

    } catch (error) {
        console.error('Error al obtener el modelo del panel:', error);
        modeloPanelInput.value = 'Error al buscar modelo';
        if (userSelections.panelesSolares) {
            userSelections.panelesSolares.modelo = null; // Clear stale model data

        }
    }
}

function initPanelesSectionExpert() {
    console.log('[DEBUG] initPanelesSectionExpert: Called.');
    console.log('[DEBUG] panelMarcaSubform:', typeof panelMarcaSubform !== 'undefined' ? panelMarcaSubform : 'NOT DEFINED');
    console.log('[DEBUG] panelPotenciaSubform:', typeof panelPotenciaSubform !== 'undefined' ? panelPotenciaSubform : 'NOT DEFINED');
    console.log('[DEBUG] panelModeloSubform:', typeof panelModeloSubform !== 'undefined' ? panelModeloSubform : 'NOT DEFINED');
    console.log('[DEBUG] panelModeloTemperaturaSubform:', typeof panelModeloTemperaturaSubform !== 'undefined' ? panelModeloTemperaturaSubform : 'NOT DEFINED');
    // panelCantidadExpertSubform was removed, ensure it's not referenced.

    if (!panelMarcaSubform || !panelPotenciaSubform || !panelModeloSubform || !panelModeloTemperaturaSubform) {
        console.error("Uno o más contenedores de sub-formularios de Paneles no fueron encontrados en initPanelesSectionExpert. panelMarcaSubform:", panelMarcaSubform, "panelPotenciaSubform:", panelPotenciaSubform, "panelModeloSubform:", panelModeloSubform, "panelModeloTemperaturaSubform:", panelModeloTemperaturaSubform);
        return;
    }

    // Hide all Paneles sub-form content wrappers first
    panelMarcaSubform.style.display = 'none';
    panelPotenciaSubform.style.display = 'none';
    // panelCantidadExpertSubform was removed
    panelModeloSubform.style.display = 'none';
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

    // Add this call
    if (typeof initPotenciaPanelOptions === 'function') {
        initPotenciaPanelOptions();
    } else {
        console.error('[DEBUG] initPanelesSectionExpert: initPotenciaPanelOptions function IS NOT DEFINED.');
    }
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
        let data = await response.json(); // Expected: array of strings

        const requiredBrands = ['AMERISOLAR', 'ASTRONERGY', 'TRINASOLAR', 'EGING'];
        if (Array.isArray(data)) {
            requiredBrands.forEach(brand => {
                if (!data.includes(brand)) {
                    data.push(brand);
                }
            });
            data.sort(); // Optional: sort the list alphabetically
        }

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
            console.log("[DEBUG] Marca panel listener fired.");
            const selectedValue = event.target.value;
            if (selectedValue && selectedValue !== '') {
                userSelections.marcaPanel = selectedValue;
            } else {
                userSelections.marcaPanel = null;
            }

            console.log('Marca de panel seleccionada:', userSelections.marcaPanel);

            // When brand changes, we must reset power and model, then update.
            userSelections.potenciaPanelDeseada = null;


            // Re-initialize potencia panel options, which will show the correct range
            if (typeof initPotenciaPanelOptions === 'function') {
                initPotenciaPanelOptions();
            }
            // Also trigger the model update (it will be blank until power is selected)
            // updatePanelModel(); // This is now handled by the "Next" button logic.
        });
        container.appendChild(selectElement);

    } catch (error) {
        console.error('[MARCA PANEL OPTIONS LOAD ERROR] Fetch/process error:', error);
        if (error.message) console.error('[MARCA PANEL OPTIONS LOAD ERROR] Message:', error.message);
        alert('Error al cargar las marcas de panel. Revise consola e intente más tarde.');
        container.innerHTML = '<p style="color:red;">Error al cargar opciones de marca. Verifique la conexión o contacte a soporte.</p>';
    }
}

function initModeloPanelOptions() {
    const inputElement = document.getElementById('modelo-panel-input');
    if (!inputElement) {
        console.error("Input 'modelo-panel-input' no encontrado.");
        return;
    }
    // This function should only prepare the field.
    // The actual model is now populated by updatePanelModel().
    // We set it to the saved value, or empty if there's no saved value.
    const savedModel = userSelections.panelesSolares?.modelo;
    inputElement.value = savedModel || ''; // Show saved model or clear it
}

function initModeloTemperaturaPanelOptions() {
    if (!modeloTemperaturaSelect) {
        console.error("Elemento 'modelo-temperatura-select' no encontrado.");
        return;
    }

    const opciones = ['Standard', 'Skoplaki', 'Koehl', 'Mattei', 'de Kurtz'];
    modeloTemperaturaSelect.innerHTML = '';

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.disabled = true;
    placeholder.selected = true;
    placeholder.textContent = 'Seleccione un modelo...';
    modeloTemperaturaSelect.appendChild(placeholder);

    opciones.forEach(opt => {
        const optionEl = document.createElement('option');
        optionEl.value = opt;
        optionEl.textContent = opt;
        if (userSelections.modeloTemperaturaPanel === opt) {
            optionEl.selected = true;
            placeholder.selected = false;
        }
        modeloTemperaturaSelect.appendChild(optionEl);
    });

    modeloTemperaturaSelect.addEventListener('change', (e) => {
        const value = e.target.value;
        userSelections.modeloTemperaturaPanel = value || null;

    });
}

function initPotenciaPanelOptions() {
    const marcaSeleccionada = userSelections.marcaPanel;
    const container = document.getElementById('panel-potencia-subform'); // The whole subform container
    const potenciaDeseadaInput = document.getElementById('potencia-panel-deseada-input');

    if (!container || !potenciaDeseadaInput) {
        console.error("Contenedor de potencia o input no encontrado.");
        return;
    }

    // Clear previous dynamic elements
    const existingSelect = document.getElementById('potencia-panel-select');
    if (existingSelect) {
        existingSelect.remove();
    }

    potenciaDeseadaInput.style.display = 'block'; // Show the input by default

    const powerRanges = {
        'AMERISOLAR': { start: 270, end: 400, step: 5 },
        'ASTRONERGY': { start: 585, end: 605, step: 5 },
        'TRINASOLAR': { start: 430, end: 510, step: 5 },
        'GENERICOS': { start: 280, end: 430, step: 5 },
        'EGING': { start: 440, end: 550, step: 5 }
    };

    const range = powerRanges[marcaSeleccionada];

    if (range) {
        potenciaDeseadaInput.style.display = 'none'; // Hide the original input

        const selectElement = document.createElement('select');
        selectElement.id = 'potencia-panel-select';
        selectElement.className = 'form-control';

        const placeholderOption = document.createElement('option');
        placeholderOption.value = '';
        placeholderOption.textContent = 'Seleccione una potencia...';
        placeholderOption.disabled = true;
        placeholderOption.selected = true;
        selectElement.appendChild(placeholderOption);

        for (let i = range.start; i <= range.end; i += range.step) {
            const optionElement = document.createElement('option');
            optionElement.value = i;
            optionElement.textContent = `${i} W`;
            if (userSelections.potenciaPanelDeseada === i) {
                optionElement.selected = true;
                placeholderOption.selected = false;
            }
            selectElement.appendChild(optionElement);
        }

        selectElement.addEventListener('change', (event) => {
            console.log("[DEBUG] Potencia panel listener fired.");
            const value = parseInt(event.target.value, 10);
            userSelections.potenciaPanelDeseada = isNaN(value) ? null : value;

            // The model will be fetched when the user clicks "Next", so no call is needed here.
        });

        // Insert the select after the label
        const label = container.querySelector('label[for="potencia-panel-deseada-input"]');
        if (label) {
            label.after(selectElement);
        } else {
            container.prepend(selectElement);
        }
    }
}

async function initInversorSection() {
    console.log('[initInversorSection] called');
    const container = document.getElementById('inversor-options-container');
    if (!container) {
        console.error("Contenedor 'inversor-options-container' no encontrado.");
        return;
    }
    container.innerHTML = 'Cargando opciones de inversor adecuadas...';

    try {
        const response = await fetch('http://127.0.0.1:5000/api/get_suitable_inverters', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userSelections),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: `Error HTTP: ${response.status}` }));
            throw new Error(errorData.error || `Error HTTP: ${response.status}`);
        }

        const inverterOptions = await response.json();
        container.innerHTML = ''; // Clear loading message

        if (!Array.isArray(inverterOptions)) {
             throw new Error("La respuesta del servidor para los inversores no es una lista válida.");
        }

        if (inverterOptions.length === 0) {
            container.innerHTML = '<p style="color:orange; font-size:0.9em;">No se encontraron inversores adecuados para la potencia del sistema calculada. Puede continuar, pero la selección del inversor no estará disponible y el informe puede no ser preciso.</p>';
            return;
        }

        const selectElement = document.createElement('select');
        selectElement.id = 'inversor-select';
        selectElement.className = 'form-control';

        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'Seleccione un modelo de inversor...';
        placeholder.disabled = true;
        placeholder.selected = true;
        selectElement.appendChild(placeholder);

        inverterOptions.forEach(inverter => {
            const option = document.createElement('option');
            option.value = inverter.NOMBRE;
            option.dataset.power = inverter['Pot nom CA [W]'];
            option.textContent = `${inverter.NOMBRE} (${(inverter['Pot nom CA [W]']/1000).toFixed(2)} kW)`;

            if (userSelections.inversor && userSelections.inversor.tipo === inverter.NOMBRE) {
                option.selected = true;
                placeholder.selected = false;
            }
            selectElement.appendChild(option);
        });

        selectElement.addEventListener('change', (e) => {
            const selectedOption = e.target.options[e.target.selectedIndex];
            const model = selectedOption.value;
            const power = parseFloat(selectedOption.dataset.power);

            if (model) {
                userSelections.inversor = {
                    tipo: model,
                    potenciaNominal: isNaN(power) ? 0 : power / 1000 // Store in kW
                };
            } else {
                userSelections.inversor = { tipo: null, potenciaNominal: 0 };
            }

            console.log('Inversor seleccionado:', userSelections.inversor);
        });

        container.appendChild(selectElement);

    } catch (error) {
        console.error("Error al cargar opciones de inversor adecuadas:", error);
        container.innerHTML = `<p style="color:red;">Error al cargar los modelos de inversor: ${error.message}</p>`;
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
        // El JSON generado tiene una clave raíz "categorias"
        electrodomesticosCategorias = data.categorias;
        console.log('Electrodomésticos cargados desde el backend:', electrodomesticosCategorias);
        initElectrodomesticosSection(); // Inicializa la interfaz de electrodomésticos
        calcularConsumo(); // Recalcula el consumo con los datos cargados y cantidades del usuario
    } catch (error) {
        console.error('No se pudo cargar los electrodomésticos desde el backend (/api/electrodomesticos):', error);
        alert('Error crítico: No se pudo cargar la lista de electrodomésticos desde el servidor. Usando datos de respaldo.');
        // Datos de respaldo en caso de falla para desarrollo/prueba
        electrodomesticosCategorias = {
            "Cocina": [
                { name: "Heladera", consumo_diario_kwh: 1.5, watts: 100 },
                { name: "Microondas", consumo_diario_kwh: 0.6, watts: 1200 },
                { name: "Lavarropas", consumo_diario_kwh: 0.7, watts: 2000 }
            ],
            "Entretenimiento": [
                { name: "Televisor", consumo_diario_kwh: 0.4, watts: 80 },
                { name: "Computadora", consumo_diario_kwh: 1.2, watts: 200 }
            ]
        };
        initElectrodomesticosSection();
        calcularConsumo();
    }
}


function initElectrodomesticosSection() {
    // Dynamically set the title and description for the 'Energia' section based on user profile.
    // NOTE: The selectors target the H1 and the P tags that are direct children of #energia-section.
    // The P tag was added in a previous step to serve as a dynamic description area.
    const energiaSectionTitle = document.querySelector('#energia-section > h1');
    const energiaSectionDescription = document.querySelector('#energia-section > p');

    let title = 'Consumo de Energía';
    let description = 'A continuación ingrese los datos requeridos acerca de su consumo de energía eléctrica.';

    if (userSelections.installationType === 'Comercial' || userSelections.installationType === 'PYME') {
        title = 'Ingrese su consumo de Energia';
        description = ''; // Remove subtitle
    }

    if (energiaSectionTitle) energiaSectionTitle.innerHTML = title;
    if (energiaSectionDescription) energiaSectionDescription.innerHTML = description;

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
            const consumoFacturaForm = document.getElementById('consumo-factura-section');
            const electrodomesticosList = document.getElementById('electrodomesticos-list');

            // Hide all possible content sections first
            if (electrodomesticosList) electrodomesticosList.style.display = 'none';
            if (consumoFacturaForm) consumoFacturaForm.style.display = 'none';
            if (summaryContainer) summaryContainer.style.display = 'none';
            // Clear the list container to prevent old data from showing
            if (listContainer) listContainer.innerHTML = '';


            if (choice === 'detalleHogar') {
                if (summaryContainer) summaryContainer.style.display = 'flex';
                if (electrodomesticosList) electrodomesticosList.style.display = 'block';
                populateStandardApplianceList(listContainer);
            } else if (choice === 'boletaMensual') {
                if (consumoFacturaForm) consumoFacturaForm.style.display = 'block';
            } else if (choice === 'detalleHogarHoras') {
                if (electrodomesticosList) electrodomesticosList.style.display = 'block';
                populateDetailedApplianceList(listContainer);
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

                    handleExpertEnergyChoice(event.target.value);
                });
                radio.dataset.listenerAttached = 'true';
            }
        });

    } else { // Basic user
    // Default states for basic user flow within energia-section
    modoSeleccionContainer.style.display = 'none';
    listContainer.innerHTML = ''; // Clear appliance list content to be safe
    listContainer.style.display = 'none'; // Hide appliance list by default
    if (consumoFacturaSection) consumoFacturaSection.style.display = 'none'; // Hide bill form by default


        if (userSelections.installationType === 'Comercial' || userSelections.installationType === 'PYME') {
        console.log('[DEBUG] Basic Comercial/PYME: showing average consumption form.');
        userSelections.metodoIngresoConsumoEnergia = 'promedioMensual'; // New method

        const consumoPromedioSection = document.getElementById('consumo-promedio-section');
        if(consumoPromedioSection) consumoPromedioSection.style.display = 'block';
        if (summaryContainer) summaryContainer.style.display = 'flex';

    } else { // Basic Residencial
        console.log('[DEBUG] Basic Residencial: showing appliance list.');

        // START: Add help text for basic residential user
        const helpTextId = 'basic-residential-help-text';
        const existingHelpText = document.getElementById(helpTextId);
        if (existingHelpText) {
            existingHelpText.remove();
        }

        // The user requested to remove this text.
        // const helpText = document.createElement('p');
        // helpText.id = helpTextId;
        // helpText.className = 'form-description';
        // helpText.textContent = 'Ingresa la cantidad de electrodomésticos de cada tipo que tenés en tu casa.';

        // // Insert the help text before the appliance list container
        // if (listContainer) {
        //     listContainer.before(helpText);
        // }
        // END: Add help text

        listContainer.style.display = 'block'; // Show appliance list container
        if (summaryContainer) summaryContainer.style.display = 'flex'; // Show summary
        populateStandardApplianceList(listContainer); // Populate it with appliances
        // consumoFacturaSection is already hidden by default state above
        }
    }

    // Add event listener for the average consumption input
    const consumoPromedioInput = document.getElementById('consumo-promedio-mes');
    if(consumoPromedioInput) {
        consumoPromedioInput.addEventListener('input', (e) => {
            const monthlyValue = parseFloat(e.target.value) || 0;
            const annualValue = monthlyValue * 12;
            if (totalConsumoMensualDisplay) totalConsumoMensualDisplay.value = monthlyValue.toFixed(2);
            if (totalConsumoAnualDisplay) totalConsumoAnualDisplay.value = annualValue.toFixed(2);
        });
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

            });
            const consumoDiario = item.consumo_diario_kwh || 0;
            const consumoLabel = document.createElement('span');
            consumoLabel.textContent = `${parseFloat(consumoDiario.toFixed(3))} kWh/día`;
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



// Utilidad para extraer la ciudad de una dirección con formato
// "calle número, ciudad". Devuelve null si no se encuentra una coma.
function extraerCiudadDeDireccion(direccion) {
    if (!direccion) return null;
    const partes = direccion.split(',');
    if (partes.length >= 2) {
        return partes[1].trim();
    }
    return null;
}

// --- Lógica del Mapa (EXISTENTE, CON PEQUEÑAS MEJORAS) ---

function initMap() {
    console.log('--- initMap CALLED ---');
    // CORRECCIÓN: Si el mapa ya está inicializado, lo destruimos para evitar errores de doble inicialización
    if (map) {
        map.remove();
    }
    map = L.map('map').setView(userLocation, 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    marker = L.marker(userLocation).addTo(map);
    // if (latitudDisplay) latitudDisplay.value = userLocation.lat.toFixed(6); // Eliminado
    // if (longitudDisplay) longitudDisplay.value = userLocation.lng.toFixed(6); // Eliminado

    map.on('click', function(e) {
        userLocation.lat = e.latlng.lat;
        userLocation.lng = e.latlng.lng;
        marker.setLatLng(userLocation);
        userSelections.location = userLocation;
        // La llamada a saveUserSelections() se mueve para ser consistente con el geocodificador de búsqueda.

        // Realizar geocodificación inversa para encontrar la ciudad
        if (geocoderControlInstance && geocoderControlInstance.options.geocoder) {
            geocoderControlInstance.options.geocoder.reverse(e.latlng, map.options.crs.scale(map.getZoom()), function(results) {
                const r = results[0];
                if (r && r.name) {
                    console.log('Reverse geocode result from click:', r.name);
                    buscarCodigoCiudad(r.name); // Esta función ya guarda las selecciones.
                } else {
                    const locationDisplay = document.getElementById('location-display');
                    if (locationDisplay) {
                        locationDisplay.textContent = 'No se pudo identificar la ubicación. Intente de nuevo.';
                        locationDisplay.style.backgroundColor = '#fbe9e7';
                    }
                    // Si no se encuentra un nombre, nos aseguramos de que el código de ciudad sea nulo y guardamos.
                    userSelections.codigoCiudad = null;

                }
            });
        } else {
            // Si no hay geocodificador, al menos guardamos la lat/lng.

        }
    });

    // Asegúrate de que el geocodificador esté importado correctamente en tu HTML
    // <script src="https://unpkg.com/leaflet-control-geocoder/dist/Control.Geocoder.js"></script>
    geocoderControlInstance = L.Control.geocoder({
        placeholder: 'Ej: Buchardo 3232, Olavarría', // Nuevo placeholder
        errorMessage: 'No se encontró la dirección.',
        defaultMarkGeocode: false
    }).on('markgeocode', async function(e) {
        console.log('Geocode event:', e);
        if (e.geocode && e.geocode.center) {
            userLocation.lat = e.geocode.center.lat;
            userLocation.lng = e.geocode.center.lng;

            if (marker) {
                marker.setLatLng(userLocation);
            } else {
                marker = L.marker(userLocation).addTo(map);
            }
            map.setView(userLocation, 13);
            userSelections.location = userLocation;

            // Enviar la dirección completa al backend para que la procese
            if (e.geocode.name) {
                console.log('Geocode name to be sent to backend:', e.geocode.name);
                buscarCodigoCiudad(e.geocode.name);
            } else {
                console.warn('Geocoder did not return a name.');
                userSelections.ciudad = { codigo: null, nombre: null };

            }
        }
    }).addTo(map);

}

// --- Nueva función para buscar el código de la ciudad (modificada) ---
async function buscarCodigoCiudad(fullAddress) {
    const locationDisplay = document.getElementById('location-display');
    if (locationDisplay) {
        locationDisplay.textContent = 'Buscando ciudad...';
        locationDisplay.style.backgroundColor = '#e3f2fd'; // Blue for searching
    }

    try {
        const response = await fetch('http://127.0.0.1:5000/api/buscar_ciudad', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ full_address: fullAddress }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Error del servidor: ${response.status}`);
        }

        const data = await response.json();
        // MODIFICACIÓN: Comprobar explícitamente que no sea null o undefined.
        // Esto evita problemas si el código de ciudad es 0 (aunque ya vimos que no es el caso)
        // y es una comprobación más robusta.
        if (data.codigo_ciudad !== null && data.codigo_ciudad !== undefined) {
            console.log(`Ciudad encontrada: ${data.nombre_ciudad}, Código: ${data.codigo_ciudad}`);
            userSelections.ciudad = {
                codigo: data.codigo_ciudad,
                nombre: data.nombre_ciudad
            };

            if (locationDisplay) {
                locationDisplay.textContent = `Ubicación seleccionada: ${data.nombre_ciudad}`;
                locationDisplay.style.backgroundColor = '#e9f5e9'; // Green for success
            }
            // La escritura al archivo Excel se ha eliminado para evitar corrupción.
        } else {
            console.warn('No se encontró código para la dirección:', fullAddress);
            userSelections.ciudad = { codigo: null, nombre: null };
            if (locationDisplay) {
                locationDisplay.textContent = 'No se pudo encontrar la ciudad en la base de datos.';
                locationDisplay.style.backgroundColor = '#fbe9e7'; // Red for failure
            }
        }
    } catch (error) {
        console.error('Error en la búsqueda de ciudad:', error);
        if (locationDisplay) {
            locationDisplay.textContent = 'Error al buscar la ciudad.';
            locationDisplay.style.backgroundColor = '#fbe9e7';
        }
        userSelections.ciudad = { codigo: null, nombre: null };
    } finally {

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
            initAnalisisEconomicoSection();
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

    // 3. From "Potencia Deseada" to "Modelo Panel"
    document.getElementById('next-from-panel-potencia')?.addEventListener('click', async () => {
        if (panelPotenciaSubform) panelPotenciaSubform.style.display = 'none';
        if (panelModeloSubform) panelModeloSubform.style.display = 'block';
        updateStepIndicator('panel-modelo-subform');
        // Fetch and display the panel model when the user proceeds to this step.
        await fetchAndDisplayPanelModel();
    });

    // 4. From "Modelo Panel" back to "Potencia Deseada"
    document.getElementById('back-to-panel-potencia')?.addEventListener('click', () => {
        if (panelModeloSubform) panelModeloSubform.style.display = 'none';
        if (panelPotenciaSubform) panelPotenciaSubform.style.display = 'block';
        updateStepIndicator('panel-potencia-subform');
        if (potenciaPanelDeseadaInput && userSelections.potenciaPanelDeseada !== null) {
            potenciaPanelDeseadaInput.value = userSelections.potenciaPanelDeseada;
        } else if (potenciaPanelDeseadaInput) {
            potenciaPanelDeseadaInput.value = '';
        }
    });

    // 5. From "Modelo Panel" to "Modelo Temperatura Panel"
    document.getElementById('next-to-temperatura-from-modelo')?.addEventListener('click', () => {
        if (panelModeloSubform) panelModeloSubform.style.display = 'none';
        if (panelModeloTemperaturaSubform) panelModeloTemperaturaSubform.style.display = 'block';
        initModeloTemperaturaPanelOptions();
        updateStepIndicator('panel-modelo-temperatura-subform');
    });

    // 6. From "Modelo Temperatura Panel" back to "Modelo Panel"
    document.getElementById('back-to-panel-modelo')?.addEventListener('click', () => {
        if (panelModeloTemperaturaSubform) panelModeloTemperaturaSubform.style.display = 'none';
        if (panelModeloSubform) panelModeloSubform.style.display = 'block';
        updateStepIndicator('panel-modelo-subform');
    });

    // 7. Navigation from "Modelo Temperatura Panel" to "Inversor" section
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

                const response = await fetch('http://127.0.0.1:5000/api/generar_informe', {
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

                // The userType from the backend's response is now the source of truth.
                // The redundant and buggy overwriting of the value has been removed.

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
    // State is now in-memory, so we no longer load from localStorage on page start.
    initMap(); // Inicializa el mapa con la ubicación por defecto.

    await cargarElectrodomesticosDesdeBackend(); // Carga electrodomésticos y los renderiza, luego recalcula consumo.
    setupNavigationButtons(); // Configura todos los botones de navegación y otros listeners.
    setupSidebarNavigation();

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
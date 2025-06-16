// calculador.js

console.log('🤖 calculador.js cargado - flujo de controlador ajustado y persistencia de datos');

// Variables para el mapa (renombradas para evitar posibles conflictos)
let mapInstance, markerInstance;

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
    consumoFactura: {}, // Almacenará {enero: val, febrero: val, ...}
    totalMonthlyConsumption: 0, // Consumo total mensual calculado de electrodomésticos (kWh)
    totalAnnualConsumption: 0,  // Consumo total anual calculado de electrodomésticos (kWh)
    selectedCurrency: 'Pesos argentinos', // Valor por defecto
    panelesSolares: {
        tipo: null,
        cantidad: 0,
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

// Variable global para almacenar los datos de electrodomésticos leídos del backend (Excel)
let electrodomesticosDatosBackend = {};

// --- FUNCIONES DE PERSISTENCIA ---
function saveUserSelections() {
    localStorage.setItem('userSelections', JSON.stringify(userSelections));
    console.log('User selections saved:', userSelections);
}

function loadUserSelections() {
    const savedSelections = localStorage.getItem('userSelections');
    if (savedSelections) {
        try {
            const parsedSelections = JSON.parse(savedSelections);
            Object.assign(userSelections, parsedSelections);
            // Asegurarse de que las propiedades clave existen después de la carga
            if (!userSelections.electrodomesticos) userSelections.electrodomesticos = {};
            if (!userSelections.consumoFactura) userSelections.consumoFactura = {};
            if (typeof userSelections.totalMonthlyConsumption === 'undefined') userSelections.totalMonthlyConsumption = 0;
            if (typeof userSelections.totalAnnualConsumption === 'undefined') userSelections.totalAnnualConsumption = 0;
            if (typeof userSelections.selectedCurrency === 'undefined') userSelections.selectedCurrency = 'Pesos argentinos'; // Valor por defecto

            console.log('User selections loaded:', userSelections);
        } catch (e) {
            console.error("Error al parsear userSelections desde localStorage:", e);
            localStorage.removeItem('userSelections');
            console.log("LocalStorage 'userSelections' limpiado debido a datos corruptos.");
        }
    }
}

// --- FUNCIONES DE MAPA (Asegúrate de que esta lógica es la que realmente usas para inicializar el mapa) ---
function initMap() {
    console.log("Intentando inicializar el mapa.");
    const mapDiv = document.getElementById('map');
    if (mapDiv && typeof L !== 'undefined') { // Verifica si el div existe y si Leaflet (L) está cargado
        // Importante: Si el mapa ya existe, destrúyelo antes de recrearlo para evitar duplicados
        // y problemas de renderizado si la sección se oculta y luego se muestra de nuevo.
        if (mapInstance) {
            mapInstance.remove();
        }
        mapInstance = L.map('map').setView([userLocation.lat, userLocation.lng], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(mapInstance);

        markerInstance = L.marker([userLocation.lat, userLocation.lng], { draggable: true }).addTo(mapInstance)
            .bindPopup("Arrastra para cambiar la ubicación").openPopup();

        markerInstance.on('dragend', function(event) {
            const latlng = markerInstance.getLatLng();
            userLocation.lat = latlng.lat;
            userLocation.lng = latlng.lng;
            userSelections.location = userLocation; // Actualiza userSelections
            saveUserSelections();
            console.log('Nueva ubicación por arrastre:', userLocation);
        });

        // Opcional: Geocodificador para buscar lugares
        if (typeof L.Control.Geocoder !== 'undefined') {
            L.Control.geocoder({
                defaultMarkGeocode: false
            })
            .on('markgeocode', function(e) {
                const latlng = e.geocode.center;
                markerInstance.setLatLng(latlng).setPopupContent(e.geocode.name || "Ubicación seleccionada").openPopup();
                mapInstance.setView(latlng, mapInstance.getZoom()); // Centrar el mapa en la nueva ubicación
                userLocation.lat = latlng.lat;
                userLocation.lng = latlng.lng;
                userSelections.location = userLocation; // Actualiza userSelections
                saveUserSelections();
                console.log('Ubicación por geocodificador:', userLocation);
            })
            .addTo(mapInstance);
        } else {
            console.warn("Leaflet Control Geocoder no está cargado. La funcionalidad de búsqueda de ubicación no estará disponible.");
        }
        // Invalida el tamaño del mapa para que se ajuste correctamente al contenedor visible
        mapInstance.invalidateSize();
    } else {
        console.warn("No se pudo inicializar el mapa. Asegúrate de que el div con id='map' existe y Leaflet está cargado.");
    }
}


// --- FUNCIONES DE NAVEGACIÓN Y CONTROL DE PANTALLAS ---
function showScreen(screenId) {
    document.querySelectorAll('.form-section').forEach(section => {
        section.style.display = 'none'; // Oculta todas las secciones del formulario
    });
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.style.display = 'block'; // Muestra la sección deseada
        targetScreen.scrollIntoView({ behavior: 'smooth', block: 'start' });
        console.log(`Mostrando pantalla: ${screenId}`); // Debugging
    } else {
        console.error(`Error: La sección con ID '${screenId}' no fue encontrada.`);
    }
}

function setupNavigation() {
    // Event listeners para los selects de tipo de usuario e instalación
    document.getElementById('user-type')?.addEventListener('change', (event) => {
        userSelections.userType = event.target.value;
        saveUserSelections();
        console.log("User Type selected:", userSelections.userType); // Debugging
    });

    document.getElementById('installation-type')?.addEventListener('change', (event) => {
        userSelections.installationType = event.target.value;
        saveUserSelections();
        console.log("Installation Type selected:", userSelections.installationType); // Debugging
    });

    // --- Botones "Siguiente" ---
    // Botón 'Siguiente' en user-type-section (Paso 1)
    document.getElementById('next-to-installation-type')?.addEventListener('click', () => {
        console.log("Clic en 'Siguiente' desde Tipo de Usuario.");
        if (userSelections.userType) { // Asegurarse de que algo fue seleccionado
            showScreen('installation-type-section');
        } else {
            alert('Por favor, selecciona un tipo de usuario para continuar.');
        }
    });

    // Botón 'Siguiente' en installation-type-section (Paso 2)
    document.getElementById('next-to-location')?.addEventListener('click', () => {
        console.log("Clic en 'Siguiente' desde Tipo de Instalación.");
        if (!userSelections.installationType) { // Asegurarse de que algo fue seleccionado
            alert('Por favor, selecciona un tipo de instalación para continuar.');
            return;
        }

        if (userSelections.userType === 'basic' && userSelections.installationType === 'residential') {
            showScreen('electrodomesticos-section');
        } else {
            showScreen('location-section');
            initMap(); // Inicializa el mapa solo cuando la sección de ubicación es visible
        }
    });

    // Botón 'Siguiente' en electrodomesticos-section (Paso 3 para Básico/Residencial)
    document.getElementById('next-to-consumo-factura')?.addEventListener('click', () => {
        calcularConsumoTotal(); // Asegurarse de que el cálculo se haya hecho antes de avanzar
        showScreen('consumo-factura-section');
    });

    // Botón 'Siguiente' en consumo-factura-section (Paso 4)
    document.getElementById('next-to-location-or-zona-instalacion')?.addEventListener('click', () => {
        console.log("Clic en 'Siguiente' desde Consumo por Factura.");
        // Si el usuario es experto/comercial/industrial, podría ir a zona de instalación experto, si no, a income level (o lo que siga)
        if (userSelections.userType === 'expert' || userSelections.installationType === 'commercial' || userSelections.installationType === 'industrial' || userSelections.installationType === 'rural') {
            showScreen('zona-instalacion-expert-section'); // Asumiendo que esta es la siguiente para expertos
        } else {
            showScreen('income-level-section'); // Para básico no residencial, o lo que siga después de factura
        }
    });

    // ... (el resto de tus navegaciones 'next' y 'back' existentes) ...
    // Asegúrate de que todos los IDs de botones estén conectados a una función showScreen
    document.getElementById('next-to-income-level')?.addEventListener('click', () => showScreen('income-level-section'));
    document.getElementById('next-to-zona-instalacion-expert')?.addEventListener('click', () => showScreen('zona-instalacion-expert-section'));
    document.getElementById('next-to-paneles-solares')?.addEventListener('click', () => showScreen('paneles-solares-section'));
    document.getElementById('next-to-inversor')?.addEventListener('click', () => showScreen('inversor-section'));
    document.getElementById('next-to-perdidas')?.addEventListener('click', () => showScreen('perdidas-section'));
    document.getElementById('next-to-analisis-economico')?.addEventListener('click', () => showScreen('analisis-economico-section'));


    // --- Botones "Atrás" ---
    document.getElementById('back-to-initial')?.addEventListener('click', () => showScreen('user-type-section')); // Desde installation-type-section
    document.getElementById('back-to-user-type-from-installation')?.addEventListener('click', () => showScreen('user-type-section'));

    document.getElementById('back-to-installation-type-from-electrod')?.addEventListener('click', () => {
        // Desde electrodomésticos, siempre a instalación
        showScreen('installation-type-section');
    });

    document.getElementById('back-to-consumo-tipo-usuario')?.addEventListener('click', () => {
        // Desde consumo factura, retrocede según el flujo anterior
        if (userSelections.userType === 'basic' && userSelections.installationType === 'residential') {
            showScreen('electrodomesticos-section');
        } else {
            showScreen('location-section'); // O la pantalla anterior para expertos/comerciales
        }
    });

    document.getElementById('back-to-location')?.addEventListener('click', () => showScreen('location-section'));
    document.getElementById('back-to-user-type-from-expert')?.addEventListener('click', () => showScreen('user-type-section')); // Si hay una sección expert-options-section

    document.getElementById('back-to-location-from-expert-zona')?.addEventListener('click', () => {
        // Si tienes múltiples rutas a zona-instalacion-expert-section, aquí decides a dónde volver.
        // Por simplicidad, volvamos a la última pantalla "común" antes de esta sección.
        // Podría ser 'consumo-factura-section' si ese es el paso anterior para expertos, o 'location-section'.
        showScreen('location-section'); // Asumo que se vuelve a la ubicación
    });

    document.getElementById('back-to-zona-instalacion-expert')?.addEventListener('click', () => showScreen('zona-instalacion-expert-section'));
    document.getElementById('back-to-paneles-solares')?.addEventListener('click', () => showScreen('paneles-solares-section'));
    document.getElementById('back-to-inversor')?.addEventListener('click', () => showScreen('inversor-section'));
    document.getElementById('back-to-perdidas')?.addEventListener('click', () => showScreen('perdidas-section'));


    // Finalizar Cálculo y enviar al backend
    document.getElementById('finalizar-calculo')?.addEventListener('click', async (event) => {
        event.preventDefault();
        saveUserSelections(); // Asegurarse de que los últimos datos estén guardados
        try {
            console.log("Enviando datos al backend para generar informe:", userSelections);
            const response = await fetch('http://127.0.0.1:5000/api/generar_informe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userSelections)
            });
            if (!response.ok) {
                const errorText = await response.text(); // Intenta leer el cuerpo del error
                throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
            }
            const informeFinal = await response.json();
            localStorage.setItem('informeSolar', JSON.stringify(informeFinal));
            window.location.href = 'informe.html';
        } catch (error) {
            console.error('Error al generar el informe:', error);
            alert('Hubo un error al generar el informe: ' + error.message + '. Por favor, revisa la consola para más detalles.');
        }
    });
}


// --- FUNCIÓN PARA CARGAR ELECTRODOMÉSTICOS DESDE EL BACKEND (EXCEL) ---
async function cargarElectrodomesticosDesdeBackend() {
    console.log("Cargando electrodomésticos desde el backend (Excel)...");
    try {
        const response = await fetch('http://127.0.0.1:5000/api/electrodomesticos');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        electrodomesticosDatosBackend = await response.json();
        console.log("Electrodomésticos cargados del backend:", electrodomesticosDatosBackend);
        initElectrodomesticosSection(); // Inicializa la sección con los datos recién cargados
    } catch (error) {
        console.error("Error al cargar electrodomésticos desde el backend:", error);
        alert("No se pudieron cargar los electrodomésticos desde el servidor. Por favor, asegúrese de que el servidor está funcionando y el archivo Excel es accesible. Error: " + error.message);
    }
}

// --- FUNCIÓN PARA INICIALIZAR LA SECCIÓN DE ELECTRODOMÉSTICOS ---
function initElectrodomesticosSection() {
    const electrodomesticosContainer = document.getElementById('electrodomesticos-container');
    if (!electrodomesticosContainer) {
        console.warn("Contenedor #electrodomesticos-container no encontrado.");
        return;
    }

    electrodomesticosContainer.innerHTML = ''; // Limpiar el contenedor

    for (const categoria in electrodomesticosDatosBackend) {
        if (Object.prototype.hasOwnProperty.call(electrodomesticosDatosBackend, categoria)) {
            const categoryHeader = document.createElement('h3');
            categoryHeader.textContent = categoria;
            electrodomesticosContainer.appendChild(categoryHeader);

            const categoryGridDiv = document.createElement('div');
            categoryGridDiv.className = 'category-grid'; // Permite estilos de grid por categoría
            electrodomesticosContainer.appendChild(categoryGridDiv);

            electrodomesticosDatosBackend[categoria].forEach(electrodomestico => {
                const nombreElectrodomestico = electrodomestico.nombre;
                const consumoKWhDiario = electrodomestico.consumo_kwh_diario;

                const div = document.createElement('div');
                div.className = 'electrodomestico-item';

                const inputId = `electro-${nombreElectrodomestico.replace(/[^a-zA-Z0-9-]/g, '_')}-cantidad`;

                div.innerHTML = `
                    <label for="${inputId}">${nombreElectrodomestico}</label>
                    <input type="number" id="${inputId}"
                           name="${nombreElectrodomestico}"
                           value="${userSelections.electrodomesticos[nombreElectrodomestico] || 0}"
                           min="0" step="1">
                    <span class="consumo-info">(${consumoKWhDiario} kWh/día)</span>
                `;
                categoryGridDiv.appendChild(div);

                document.getElementById(inputId).addEventListener('change', (event) => {
                    userSelections.electrodomesticos[nombreElectrodomestico] = parseInt(event.target.value) || 0;
                    saveUserSelections();
                    calcularConsumoTotal();
                });
            });
        }
    }
    calcularConsumoTotal();
}

// --- FUNCIÓN PARA CALCULAR EL CONSUMO TOTAL ---
function calcularConsumoTotal() {
    let totalConsumoMensualKWh = 0;
    for (const nombre in userSelections.electrodomesticos) {
        if (Object.prototype.hasOwnProperty.call(userSelections.electrodomesticos, nombre)) {
            const cantidad = userSelections.electrodomesticos[nombre];
            if (cantidad > 0) {
                let consumoEncontrado = null;
                for (const categoria in electrodomesticosDatosBackend) {
                    if (Object.prototype.hasOwnProperty.call(electrodomesticosDatosBackend, categoria)) {
                        const found = electrodomesticosDatosBackend[categoria].find(item => item.nombre === nombre);
                        if (found) {
                            consumoEncontrado = found.consumo_kwh_diario;
                            break;
                        }
                    }
                }

                if (consumoEncontrado !== null) {
                    totalConsumoMensualKWh += consumoEncontrado * cantidad * 30; // Consumo mensual = kWh/día * cantidad * 30 días
                } else {
                    console.warn(`Consumo no encontrado en datos del backend para: ${nombre}. No se incluirá en el total.`);
                }
            }
        }
    }
    userSelections.totalMonthlyConsumption = totalConsumoMensualKWh;
    userSelections.totalAnnualConsumption = totalConsumoMensualKWh * 12;

    console.log(`Consumo mensual estimado: ${userSelections.totalMonthlyConsumption.toFixed(2)} kWh`);
    console.log(`Consumo anual estimado: ${userSelections.totalAnnualConsumption.toFixed(2)} kWh`);

    const consumoEstimadoDisplay = document.getElementById('consumo-estimado-electrodomesticos');
    if (consumoEstimadoDisplay) {
        consumoEstimadoDisplay.textContent = `${userSelections.totalMonthlyConsumption.toFixed(2)} kWh`;
    }
}

// Implementa esta función si no la tienes, para la sección de Consumo por Factura
function initConsumoFacturaSection() {
    const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const consumoFacturaContainer = document.getElementById('consumo-factura-container');
    if (consumoFacturaContainer) {
        consumoFacturaContainer.innerHTML = '';
        months.forEach(month => {
            const monthKey = month.toLowerCase();
            const div = document.createElement('div');
            div.className = 'form-group';
            div.innerHTML = `
                <label for="consumo-${monthKey}">Consumo ${month} (kWh/mes):</label>
                <input type="number" id="consumo-${monthKey}"
                       name="consumo-${monthKey}"
                       value="${userSelections.consumoFactura[monthKey] || ''}"
                       min="0" step="any">
            `;
            consumoFacturaContainer.appendChild(div);

            document.getElementById(`consumo-${monthKey}`).addEventListener('change', (event) => {
                userSelections.consumoFactura[monthKey] = parseFloat(event.target.value) || 0;
                saveUserSelections();
            });
        });
    }
}


// --- INIT principal: Se ejecuta cuando el DOM está completamente cargado ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOM Content Loaded. Initializing app.");
    loadUserSelections(); // Carga las selecciones guardadas primero

    initConsumoFacturaSection(); // Inicializa la sección de factura

    // Carga los datos de electrodomésticos del backend
    await cargarElectrodomesticosDesdeBackend(); // Espera a que los electrodomésticos carguen

    setupNavigation(); // Configura todos los event listeners de navegación

    // Lógica para determinar qué pantalla mostrar al inicio
    // Prioridad: 1. Estado guardado. 2. user-type-section si no hay estado.
    const userTypeSection = document.getElementById('user-type-section');
    if (userTypeSection) {
        // Asegurarse de que el input 'user-type' refleje la selección guardada
        const userTypeSelect = document.getElementById('user-type');
        if (userTypeSelect && userSelections.userType) {
            userTypeSelect.value = userSelections.userType;
        }
        // Asegurarse de que el input 'installation-type' refleje la selección guardada
        const installationTypeSelect = document.getElementById('installation-type');
        if (installationTypeSelect && userSelections.installationType) {
            installationTypeSelect.value = userSelections.installationType;
        }

        // Determinar qué pantalla mostrar al inicio
        if (userSelections.userType && userSelections.installationType) {
            console.log("Found saved user selections. Attempting to restore screen.");
            if (userSelections.userType === 'basic' && userSelections.installationType === 'residential') {
                showScreen('electrodomesticos-section');
            } else if (userSelections.userType === 'expert' || userSelections.installationType === 'commercial' || userSelections.installationType === 'industrial' || userSelections.installationType === 'rural') {
                showScreen('location-section');
                initMap(); // Inicializa el mapa si vamos a location-section directamente al cargar
            } else {
                console.log("Saved selections don't match a direct flow, starting from user type.");
                showScreen('user-type-section'); // Fallback si el estado es inconsistente o el flujo no es directo
            }
        } else {
            console.log("No saved user selections found, starting from user type section.");
            showScreen('user-type-section'); // Mostrar la primera pantalla si no hay selecciones previas
        }
    } else {
        console.error("La sección inicial 'user-type-section' no se encontró en el HTML. Esto es crítico para el inicio de la aplicación.");
    }
});
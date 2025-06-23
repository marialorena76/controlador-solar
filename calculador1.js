console.log('🤖 calculador.js cargado - flujo de controlador ajustado y persistencia de datos');

let map, marker;
let userLocation = { lat: -34.6037, lng: -58.3816 }; // Buenos Aires por defecto

// Objeto para almacenar todas las selecciones del usuario
let userSelections = {
    userType: null,
    location: userLocation,
    // connectionType: null, // Eliminado ya que la sección fue eliminada
    installationType: null,
    incomeLevel: null,
    zonaInstalacion: null, // This is for the expert user
    zonaInstalacionBasic: null, // New for basic user
    superficieRodea: null // New for basic user
};

const latitudDisplay = document.getElementById('latitud-display');
const longitudDisplay = document.getElementById('longitud-display');

function updateLocationDisplay(lat, lng) {
    if (latitudDisplay) latitudDisplay.textContent = lat.toFixed(6);
    if (longitudDisplay) longitudDisplay.textContent = lng.toFixed(6);
}

function initializeMap() {
    if (map) {
        map.remove();
    }
    map = L.map('map').setView([userLocation.lat, userLocation.lng], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    const geocoder = L.Control.geocoder({
        defaultMarkGeocode: false,
        placeholder: 'Buscar ciudad o dirección...',
        showResultIcons: true
    });

    geocoder.on('markgeocode', function(e) {
        map.setView(e.geocode.center, 13);
        handleLocationSelected(e.geocode.center);
    });

    const geocoderContainer = document.getElementById('geocoder-container');
    if (geocoderContainer) {
        while (geocoderContainer.firstChild) {
            geocoderContainer.removeChild(geocoderContainer.firstChild);
        }
        geocoder.addTo(map);

        const mapGeocoderElement = document.querySelector('.leaflet-control-geocoder');
        if (mapGeocoderElement && mapGeocoderElement.parentNode !== geocoderContainer) {
             geocoderContainer.appendChild(mapGeocoderElement);
             const form = mapGeocoderElement.querySelector('.leaflet-control-geocoder-form');
             if (form) {
                 let searchButton = form.querySelector('button');
                 if (!searchButton) {
                     searchButton = document.createElement('button');
                     searchButton.type = 'submit';
                     form.appendChild(searchButton);
                 }
                 searchButton.textContent = 'Buscar';
             }
        }
    }

    map.on('click', function(e) {
        handleLocationSelected(e.latlng);
    });

    placeMarker(userLocation);
    updateLocationDisplay(userLocation.lat, userLocation.lng);
}

function placeMarker(latlng) {
    if (marker) {
        marker.setLatLng(latlng);
    } else {
        marker = L.marker(latlng, { draggable: true }).addTo(map);
        marker.on('dragend', function() {
            const latlng = marker.getLatLng();
            handleLocationSelected(latlng);
        });
    }
    updateLocationDisplay(latlng.lat, latlng.lng);
}

function handleLocationSelected(latlng) {
    userLocation = { lat: latlng.lat, lng: latlng.lng };
    userSelections.location = userLocation; // Guardar en userSelections
    console.log('Ubicación seleccionada y guardada:', userSelections.location);
    placeMarker(latlng);
}

// -- Secciones del formulario
const userTypeSection = document.getElementById('user-type-section');
const supplySection = document.getElementById('supply-section');
const incomeSection = document.getElementById('income-section');
const expertSection = document.getElementById('expert-section');
const additionalFormsSection = document.getElementById('additional-forms-section'); // New section

// Referencias a los botones
const basicUserButton = document.getElementById('basic-user-button');
const expertUserButton = document.getElementById('expert-user-button');
const residentialButton = document.getElementById('residential-button');
const commercialButton = document.getElementById('commercial-button');
const pymeButton = document.getElementById('pyme-button');
const incomeHighButton = document.getElementById('income-high-button');
const incomeLowButton = document.getElementById('income-low-button');
const expertDataForm = document.getElementById('expert-data-form');
const additionalDataForm = document.getElementById('additional-data-form'); // New form

function showSection(sectionToShow) {
    // Oculta todas las secciones del formulario
    if (userTypeSection) userTypeSection.style.display = 'none';
    if (supplySection) supplySection.style.display = 'none';
    if (incomeSection) incomeSection.style.display = 'none';
    if (expertSection) expertSection.style.display = 'none';
    if (additionalFormsSection) additionalFormsSection.style.display = 'none'; // Hide new section

    // Muestra la sección deseada
    if (sectionToShow) sectionToShow.style.display = 'block';
}

// Eventos de click para los botones de tipo de usuario
if (basicUserButton) {
    basicUserButton.onclick = () => {
        userSelections.userType = 'Basico';
        console.log('Tipo de usuario seleccionado:', userSelections.userType);
        showSection(supplySection);
    };
}
if (expertUserButton) {
    expertUserButton.onclick = () => {
        userSelections.userType = 'Experto';
        console.log('Tipo de usuario seleccionado:', userSelections.userType);
        showSection(expertSection);
    };
}

if (residentialButton) {
    residentialButton.onclick = () => {
        userSelections.installationType = 'Residencial';
        console.log('Tipo de instalación seleccionado:', userSelections.installationType);
        showSection(incomeSection);
    };
}
if (commercialButton) {
    commercialButton.onclick = () => {
        userSelections.installationType = 'Comercial';
        console.log('Tipo de instalación seleccionado:', userSelections.installationType);
        showSection(expertSection);
    };
}
if (pymeButton) {
    pymeButton.onclick = () => {
        userSelections.installationType = 'PYME';
        console.log('Tipo de instalación seleccionado:', userSelections.installationType);
        showSection(expertSection);
    };
}
if (incomeHighButton) {
    incomeHighButton.onclick = () => {
        userSelections.incomeLevel = 'ALTO';
        console.log('Nivel de ingreso seleccionado:', userSelections.incomeLevel);

        // Conditional logic for Basic User, Residential, High Income
        if (userSelections.userType === 'Basico' && userSelections.installationType === 'Residencial' && userSelections.incomeLevel === 'ALTO') {
            showSection(additionalFormsSection); // Show new section
        } else {
            showSection(expertSection); // Keep original flow for other cases
        }
    };
}
if (incomeLowButton) {
    incomeLowButton.onclick = () => {
        userSelections.incomeLevel = 'BAJO';
        console.log('Nivel de ingreso seleccionado:', userSelections.incomeLevel);
        showSection(expertSection);
    };
}

if (expertDataForm) {
    expertDataForm.onsubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(expertDataForm);
        userSelections.zonaInstalacion = formData.get('zonaInstalacion');
        console.log('Datos adicionales (Experto) guardados:', userSelections.zonaInstalacion);

        console.log('✨ Informe final (todos los datos recogidos hasta ahora):', userSelections);
        alert('¡Datos recopilados! Revisa la consola para ver el informe final.');
    };
}

// New form submission handler for additional forms
if (additionalDataForm) {
    additionalDataForm.onsubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(additionalDataForm);
        userSelections.zonaInstalacionBasic = formData.get('zonaInstalacionBasic');
        userSelections.superficieRodea = formData.get('superficieRodea');
        console.log('Datos adicionales (Básico - Residencial - ALTO) guardados:', userSelections.zonaInstalacionBasic, userSelections.superficieRodea);

        console.log('✨ Informe final (todos los datos recogidos hasta ahora):', userSelections);
        alert('¡Datos recopilados! Revisa la consola para ver el informe final.');
    };
}

document.addEventListener('DOMContentLoaded', () => {
    initializeMap();
    showSection(userTypeSection);
});
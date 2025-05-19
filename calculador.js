console.log('🤖 calculador.js cargado');

let formContainer;
let map;
let marker;
let isBasicUser = false; // Variable para rastrear el tipo de usuario
let userDataSubmitted = false; // Variable para controlar el formulario de datos de usuario

document.addEventListener('DOMContentLoaded', () => {
    console.log('🤖 DOM listo para inicializar mapa');
    formContainer = document.getElementById('form-container');
    const latitudMostrar = document.getElementById('latitud-mostrar');
    const longitudMostrar = document.getElementById('longitud-mostrar');
    const landingPage = document.getElementById('landing-page');
    const formSteps = document.getElementById('form-steps');

    // Verificar si el usuario es básico
    isBasicUser = localStorage.getItem('userType') === 'basic';

    // Mostrar la landing page solo si es usuario básico
    if (isBasicUser) {
        landingPage.style.display = 'block';
        formSteps.style.display = 'none';
    } else {
        landingPage.style.display = 'none';
        formSteps.style.display = 'block';
    }

    // Inicializar Leaflet
    map = L.map('map').setView([-34.6037, -58.3816], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Buscador de direcciones
    L.Control.geocoder({
        defaultMarkGeocode: false,
        placeholder: 'Buscá tu dirección…'
    })
        .on('markgeocode', evt => {
            placeMarker(evt.geocode.center);
            map.fitBounds(evt.geocode.bbox);
            // Ocultar landing page y mostrar formulario si los datos de usuario ya se enviaron
            if (userDataSubmitted) {
                landingPage.style.display = 'none';
                formSteps.style.display = 'block';
            }
        })
        .addTo(map);

    // Marcar ubicación y actualizar inputs
    function placeMarker(latlng) {
        if (marker) {
            marker.setLatLng(latlng);
        } else {
            marker = L.marker(latlng, {
                draggable: true
            }).addTo(map);
            marker.on('dragend', () => {
                const p = marker.getLatLng();
                updateInputs(p.lat, p.lng);
            });
        }
        updateInputs(latlng.lat, latlng.lng);
    }

    function updateInputs(lat, lng) {
        latitudMostrar.textContent = lat.toFixed(6);
        longitudMostrar.textContent = lng.toFixed(6);
        getWeatherData(lat, lng); // Llamar a getWeatherData aquí
    }

    // 1) Provincia → Localidad
    const localityData = {
        'Buenos Aires': ['Olavarría', 'La Plata', 'Mar del Plata'],
        // … completa con el resto de provincias …
    };
    document.getElementById('province').addEventListener('change', e => {
        const loc = document.getElementById('locality');
        loc.innerHTML = '<option value="">Seleccionar</option>';
        (localityData[e.target.value] || []).forEach(name => {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            loc.appendChild(opt);
        });
    });

    // 5) Obtener datos del clima (OpenWeatherMap)
    const apiKey = 'YOUR_API_KEY'; // Coloca tu API Key aquí
    const latitudSpan = document.getElementById('latitud');
    const longitudSpan = document.getElementById('longitud');
    const temperaturaSpan = document.getElementById('temperatura');
    const condicionSpan = document.getElementById('condicion');
    const humedadSpan = document.getElementById('humedad');

    function getWeatherData(lat, lng) {
        if (!apiKey) {
            console.error('Error: API Key de OpenWeatherMap no configurada.');
            return;
        }
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric&lang=es`;
        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Error HTTP: ${response.status} - ${response.statusText}. Por favor, verifica tu API Key.`);
                }
                return response.json();
            })
            .then(data => {
                console.log("Datos del clima:", data);
                latitudSpan.textContent = lat.toFixed(4);
                longitudSpan.textContent = lng.toFixed(4);
                temperaturaSpan.textContent = `${data.main.temp}°C`;
                condicionSpan.textContent = data.weather[0].description;
                humedadSpan.textContent = `${data.main.humidity}%`;
            })
            .catch(error => {
                console.error("Error al obtener los datos del clima:", error);
                latitudSpan.textContent = 'Error';
                longitudSpan.textContent = 'Error';
                temperaturaSpan.textContent = 'Error';
                condicionSpan.textContent = 'Error al cargar';
                humedadSpan.textContent = 'Error';
            });
    }

    // 6) Manejar el envío del formulario de datos de usuario
    document.getElementById('user-data-form').addEventListener('submit', (event) => {
        event.preventDefault();

        // Obtener los valores del formulario
        const nombre = document.getElementById('nombre').value;
        const apellido = document.getElementById('apellido').value;
        const email = document.getElementById('email').value;

        // Aquí puedes guardar los datos (por ejemplo, en localStorage o enviarlos a un servidor)
        console.log('Datos del usuario:', { nombre, apellido, email });
        localStorage.setItem('nombre', nombre);
        localStorage.setItem('apellido', apellido);
        localStorage.setItem('email', email);

        // Ocultar la landing page y mostrar el formulario principal
        landingPage.style.display = 'none';
        formSteps.style.display = 'block';
        userDataSubmitted = true; // Marcar que los datos del usuario se enviaron
    });

    // 7) Manejar el envío del formulario principal
    document.getElementById('solar-form').addEventListener('submit', (event) => {
        event.preventDefault(); // Evita que el formulario se envíe de la manera tradicional

        // Obtener los valores de los campos del formulario
        const formData = new FormData(event.target);
        const zonaInstalacion = formData.get('zonaInstalacion');
        const superficieInstalacion = formData.get('superficieInstalacion');
        const rugosidadSuperficie = formData.get('rugosidadSuperficie');
        const rotacionInstalacion = formData.get('rotacionInstalacion');
        const alturaInstalacion = formData.get('alturaInstalacion');
        const metodoCalculoRadiacion = formData.get('metodoCalculoRadiacion');
        const provincia = formData.get('province');
        const localidad = formData.get('locality');
        const installationType = formData.get('installationType');
        const panelBrand = formData.get('panelBrand');
        const panelPower = formData.get('panelPower');
        const panelQuantity = formData.get('panelQuantity');
        const inverterBrand = formData.get('inverterBrand');
        const inverterPower = formData.get('inverterPower');
        const roofOrientation = formData.get('roofOrientation');
        const roofInclination = formData.get('roofInclination');
        const energyConsumption = formData.get('energyConsumption');
        const lossesPercentage = formData.get('lossesPercentage');
        const rainFrequency = formData.get('rainFrequency');
        const annualIncrease = formData.get('annualIncrease');
        const maintenanceCost = formData.get('maintenanceCost');
        const electricityPrice = formData.get('electricityPrice');
        const period = formData.get('period');
        const dustPresence = formData.get('dustPresence');
        const currency = formData.get('currency');
        const tariffBands = formData.get('tariffBands');


        // Aquí puedes hacer lo que quieras con los datos, como guardarlos en un objeto, enviarlos a un servidor, etc.
        const datosInstalacion = {
            ubicacion: {
                latitud: document.getElementById('latitud').textContent,
                longitud: document.getElementById('longitud').textContent
            },
            zonaInstalacion,
            superficieInstalacion,
            rugosidadSuperficie,
            rotacionInstalacion,
            alturaInstalacion,
            metodoCalculoRadiacion,
            provincia,
            localidad,
            installationType,
            panelBrand,
            panelPower,
            panelQuantity,
            inverterBrand,
            inverterPower,
            roofOrientation,
            roofInclination,
            energyConsumption,
            lossesPercentage,
            rainFrequency,
            annualIncrease,
            maintenanceCost,
            electricityPrice,
            period,
            dustPresence,
            currency,
            tariffBands
        };

        console.log('Datos del formulario:', datosInstalacion);

        // Por ejemplo, puedes mostrar los datos en un elemento de la página
        const reportDiv = document.getElementById('report');
        reportDiv.innerHTML = `<p>Datos ingresados:</p><pre>${JSON.stringify(datosInstalacion, null, 2)}</pre>`;
    });
});
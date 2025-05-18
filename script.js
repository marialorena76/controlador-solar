// Lógica para los botones de tipo de usuario
const userBasicCard = document.getElementById('user-basic-card');
const userExpertCard = document.getElementById('user-expert-card');
const btnEmpiezaAhora = document.querySelector('.primary-btn'); // Asume que "Empieza Ahora" tiene esta clase


btnEmpiezaAhora.addEventListener('click', () => {
    window.location.href = 'calculador.html'; // Redirige a la página del calculador
});

userBasicCard.addEventListener('click', () => {
    // Si quieres alguna lógica específica para usuario básico antes de redirigir
    // alert('Redirigiendo a Calculador como Usuario Básico.');
    window.location.href = 'calculador.html'; // Redirige a la página del calculador
});

userExpertCard.addEventListener('click', () => {
    // Si quieres alguna lógica específica para usuario experto antes de redirigir
    // alert('Redirigiendo a Calculador como Usuario Experto.');
    window.location.href = 'calculador.html'; // Redirige a la página del calculador
});

// NOTA IMPORTANTE: Si tenías algún script de Leaflet o la API del clima en este index.html, ¡QUÍTALO!
// Esos scripts solo deben estar en calculador.html ahora.


userBasicCard.addEventListener('click', () => {
    alert('Has seleccionado "Usuario Básico". Implementaremos la lógica de redirección aquí.');
    // Aquí puedes redirigir a una página de ingreso de datos simplificada
    // window.location.href = 'calculador-basico.html';
});

userExpertCard.addEventListener('click', () => {
    alert('Has seleccionado "Usuario Experto". Implementaremos la lógica de redirección aquí.');
    // Aquí puedes redirigir a la página del calculador principal con más opciones (tu actual RF1)
    // window.location.href = 'calculador-experto.html';
});

// Lógica para los botones del header (Registro/Ingresar)
const registerButton = document.querySelector('.register-button');
const loginButton = document.querySelector('.login-button');

registerButton.addEventListener('click', (e) => {
    e.preventDefault(); // Evita que el enlace recargue la página
    alert('Funcionalidad de Registro pendiente.');
    // Aquí podrías mostrar un modal de registro o redirigir a una página de registro
});

loginButton.addEventListener('click', (e) => {
    e.preventDefault(); // Evita que el enlace recargue la página
    alert('Funcionalidad de Ingresar pendiente.');
    // Aquí podrías mostrar un modal de inicio de sesión o redirigir a una página de login
});


// NOTA: El código de Leaflet y OpenWeatherMap NO va en este script si esta es solo la landing page.
// Esos irán en el script de la página donde realmente esté el calculador.


// Funcionalidad para mostrar/ocultar datos avanzados (de la iteración 1)
const botonMostrarAvanzado = document.getElementById('mostrar-avanzado');
const datosAvanzados = document.getElementById('datos-avanzados');

botonMostrarAvanzado.addEventListener('click', () => {
    if (datosAvanzados.style.display === 'none') {
        datosAvanzados.style.display = 'block';
        botonMostrarAvanzado.textContent = 'Ocultar Datos Avanzados';
    } else {
        datosAvanzados.style.display = 'none';
        botonMostrarAvanzado.textContent = 'Mostrar Datos Avanzados';
    }
});

// Referencias a los elementos donde se mostrarán los datos del clima
const latitudSpan = document.getElementById('latitud');
const longitudSpan = document.getElementById('longitud');
const temperaturaSpan = document.getElementById('temperatura');
const condicionSpan = document.getElementById('condicion');
const humedadSpan = document.getElementById('humedad');

// 1. Inicialización del Mapa con Leaflet
// Asegúrate de que 'mapa-container' existe en el HTML antes de que este script se ejecute
const mapaContainer = document.getElementById('mapa-container');

// VERIFICACIÓN CRÍTICA: Asegurarse de que mapaContainer no es null
if (!mapaContainer) {
    console.error("Error: El elemento con ID 'mapa-container' no fue encontrado en el HTML.");
    // Podrías mostrar un mensaje al usuario aquí si lo deseas
} else {
    // Si el contenedor existe, inicializa el mapa
    const mapa = L.map(mapaContainer).setView([-34.6037, -58.3816], 13); // Coordenadas de ejemplo (Buenos Aires)

    // Añadimos un "tile layer" (capas de mapa) de OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(mapa);

    let marcador; // Variable para almacenar el marcador actual

    // 2. Manejo del Click en el Mapa
    mapa.on('click', (e) => {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;

        // Eliminar el marcador anterior si existe
        if (marcador) {
            mapa.removeLayer(marcador);
        }

        // Añadir un nuevo marcador en la ubicación del click
        marcador = L.marker([lat, lng]).addTo(mapa)
            .bindPopup(`Ubicación seleccionada: ${lat.toFixed(2)}, ${lng.toFixed(2)}`)
            .openPopup();

        console.log("Latitud seleccionada: " + lat + ", Longitud seleccionada: " + lng);

        // Llamar a la función para obtener el clima
        obtenerClima(lat, lng);
    });

    // 3. Función para Obtener Datos del Clima (OpenWeatherMap API)
    function obtenerClima(lat, lng) {
        // ¡IMPORTANTE! Reemplaza 'TU_API_KEY_DE_OPENWEATHERMAP' con tu clave API real.
        const apiKey = 'TU_API_KEY_DE_OPENWEATHERMAP'; 
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric&lang=es`; // 'units=metric' para Celsius, 'lang=es' para español

        fetch(url)
            .then(response => {
                if (!response.ok) {
                    // Manejar errores HTTP (por ejemplo, si la API Key es inválida o hay un error de servidor)
                    throw new Error(`Error HTTP: ${response.status} - ${response.statusText}. Por favor, verifica tu API Key.`);
                }
                return response.json();
            })
            .then(data => {
                console.log("Datos del clima:", data);

                // Actualizar la interfaz con los datos del clima
                latitudSpan.textContent = lat.toFixed(4); // Limitar decimales
                longitudSpan.textContent = lng.toFixed(4); // Limitar decimales
                temperaturaSpan.textContent = `${data.main.temp}°C`;
                condicionSpan.textContent = data.weather[0].description;
                humedadSpan.textContent = `${data.main.humidity}%`;

            })
            .catch(error => {
                console.error("Error al obtener los datos del clima:", error);
                // Mostrar un mensaje de error al usuario en la interfaz si lo deseas
                latitudSpan.textContent = 'Error';
                longitudSpan.textContent = 'Error';
                temperaturaSpan.textContent = 'Error';
                condicionSpan.textContent = 'Error al cargar';
                humedadSpan.textContent = 'Error';
            });
    }
} // Fin del bloque 'if (mapaContainer)'
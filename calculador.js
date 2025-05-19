console.log('🤖 calculador.js cargado');

let map; // Variable para almacenar la instancia del mapa
let marker; // Variable para almacenar el marcador en el mapa
let isBasicUser = false; // Bandera para indicar si el usuario es básico
let userLocation = null; // Variable para almacenar la ubicación seleccionada por el usuario (lat, lng)

// Espera a que el DOM esté completamente cargado antes de ejecutar el script
document.addEventListener('DOMContentLoaded', () => {
    console.log('🤖 DOM listo para inicializar');

    // Obtener referencias a elementos HTML
    const latitudMostrar = document.getElementById('latitud-mostrar');
    const longitudMostrar = document.getElementById('longitud-mostrar');
    const mapContainer = document.getElementById('map'); // Contenedor del mapa
    const landingPage = document.getElementById('landing-page'); // Sección del mapa (para usuario básico)
    const mainAppArea = document.getElementById('main-app-area'); // Nueva sección para barra lateral + formularios
    const sidebar = document.querySelector('.sidebar'); // Barra lateral (dentro de main-app-area)
    const mainFormsArea = document.getElementById('main-forms-area'); // Área donde irán los formularios (dentro de main-app-area)
    const weatherInfoDiv = document.getElementById('weather-info'); // Contenedor para datos del clima
    const fase1FormsContainer = document.getElementById('fase1-forms-container'); // Contenedor donde irán los formularios de Fase 1
    const nextButton = document.getElementById('next-button'); // Botón "Siguiente"
    const fase1DataForm = document.getElementById('fase1-data-form'); // El formulario de datos de Fase 1

    // Determinar el tipo de usuario a partir del parámetro de URL 'userType'
    const urlParams = new URLSearchParams(window.location.search);
    isBasicUser = urlParams.get('userType') === 'basic';

    // Ajustar la visibilidad inicial según el tipo de usuario
    if (isBasicUser) {
        // Para usuario básico, mostrar la sección del mapa y ocultar todo lo demás inicialmente
        if (landingPage) landingPage.style.display = 'flex'; // Mostrar la sección del mapa
        if (mainAppArea) mainAppArea.style.display = 'none'; // Ocultar la sección principal de la app
        if (nextButton) nextButton.style.display = 'none'; // Ocultar botón Siguiente inicialmente

        // Inicializar el mapa inmediatamente para el usuario básico
        initializeMap(latitudMostrar, longitudMostrar);

        // Ocultar inicialmente el contenedor de formularios de Fase 1 (ya está oculto con mainAppArea)
        // if (fase1FormsContainer) fase1FormsContainer.style.display = 'none';


    } else {
        // Lógica para usuario experto o por defecto
         if (landingPage) landingPage.style.display = 'none'; // Ocultar la sección de landing (mapa)
         if (mainAppArea) { // Mostrar la sección principal de la app para experto
             mainAppArea.style.display = 'flex'; // Usar flexbox para el layout lado a lado
             // Asegurarse de que la barra lateral y el área de formularios estén visibles si mainAppArea lo está
             if(sidebar) sidebar.style.display = 'block';
             if(mainFormsArea) mainFormsArea.style.display = 'block';
         }
         if (nextButton) nextButton.style.display = 'none'; // Ocultar botón Siguiente

        // Inicializar mapa también para experto si es necesario en su flujo (quizás en mainFormsArea)
         // initializeMap(latitudMostrar, longitudMostrar); // Si el experto usa el mapa en otra sección
         // Ocultar el contenedor de formularios de Fase 1 si no es usuario básico (ya está oculto con mainAppArea)
         // if (fase1FormsContainer) fase1FormsContainer.style.display = 'none';
    }

    // Función para inicializar el mapa Leaflet
    function initializeMap(latitudDisplay, longitudDisplay) {
         // Verificar si el contenedor del mapa existe
         if (!mapContainer) {
            console.error("Error: El elemento con ID 'map' no fue encontrado en el HTML.");
            return; // Salir de la función si no se encuentra el contenedor del mapa
        }
        // Inicializar Leaflet en el div con ID 'map'
        map = L.map(mapContainer).setView([-34.6037, -58.3816], 5); // Vista por defecto para Argentina (lat, lng, zoom)
        // Añadir capa de tiles de OpenStreetMap al mapa
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors' // Atribución requerida por OpenStreetMap
        }).addTo(map);

        // Agregar control de Geocoder (buscador de direcciones) al mapa
        L.Control.geocoder({
            defaultMarkGeocode: false, // No marcar automáticamente el resultado de la búsqueda
            placeholder: 'Buscá tu dirección…' // Texto de placeholder en el buscador
        })
        .on('markgeocode', evt => {
            // Evento que se dispara cuando se selecciona una dirección del buscador
            const latlng = evt.geocode.center; // Obtener las coordenadas del resultado
            handleLocationSelected(latlng); // Llamar a la función para manejar la ubicación seleccionada
             map.fitBounds(evt.geocode.bbox); // Ajustar la vista del mapa al área del resultado
        })
        .addTo(map);

         // Manejar el evento de clic en el mapa
        map.on('click', (e) => {
            const latlng = e.latlng; // Obtener las coordenadas del clic
            handleLocationSelected(latlng); // Llamar a la función para manejar la ubicación seleccionada
        });


        // Función para colocar o mover el marcador en el mapa
        function placeMarker(latlng) {
            if (marker) {
                // Si ya existe un marcador, simplemente actualiza su posición
                marker.setLatLng(latlng);
            } else {
                // Si no existe un marcador, crea uno nuevo y lo añade al mapa
                marker = L.marker(latlng, { draggable: true }).addTo(map); // Marcador arrastrable
                // Manejar el evento de finalización de arrastre del marcador
                marker.on('dragend', () => {
                    const p = marker.getLatLng(); // Obtener las coordenadas del marcador arrastrado
                    handleLocationSelected(p); // Llamar a la función para manejar la ubicación seleccionada
                });
            }
            // Actualizar la visualización de las coordenadas al colocar o mover el marcador
            updateLocationDisplay(latlng.lat, latlng.lng);
        }

         // Función para actualizar los elementos HTML que muestran la latitud y longitud
        function updateLocationDisplay(lat, lng) {
            if(latitudDisplay) latitudDisplay.textContent = lat.toFixed(6); // Muestra latitud con 6 decimales
            if(longitudMostrar) longitudMostrar.textContent = lng.toFixed(6); // Muestra longitud con 6 decimales
        }

        // Función para manejar la selección de ubicación (ya sea por clic o geocodificador)
        function handleLocationSelected(latlng) {
             placeMarker(latlng); // Colocar el marcador en la ubicación seleccionada
             // Almacenar los datos de la ubicación seleccionada
             userLocation = { lat: latlng.lat, lng: latlng.lng };
             console.log("Ubicación seleccionada:", userLocation);

             // Opcional: Obtener datos del clima para la ubicación seleccionada
             getWeatherData(latlng.lat, latlng.lng);

             // Mostrar el botón "Siguiente" una vez que se ha seleccionado una ubicación
             if (nextButton) {
                 nextButton.style.display = 'block';
             }
        }
    }

    // Manejar el clic en el botón "Siguiente"
    if (nextButton) {
        nextButton.addEventListener('click', () => {
            console.log("Botón Siguiente clicado. Pasando a formularios de Datos.");
            // Verificar si se ha seleccionado una ubicación antes de pasar
            if (userLocation) {
                // Ocultar la sección del mapa
                if (landingPage) landingPage.style.display = 'none';

                // Mostrar la sección principal de la aplicación (barra lateral + formularios)
                if (mainAppArea) {
                    mainAppArea.style.display = 'flex'; // Usar flexbox para el layout lado a lado
                }

                // Asegurarse de que la barra lateral y el área de formularios estén visibles
                if (sidebar) sidebar.style.display = 'block';
                if (mainFormsArea) mainFormsArea.style.display = 'block';

                // Opcional: Desplazar la vista hacia la parte superior de la barra lateral o del área de formularios
                 if (mainAppArea) {
                     mainAppArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
                 }

            } else {
                alert("Por favor, selecciona una ubicación en el mapa primero.");
            }
        });
    }

    // Manejo del envío del formulario de Datos de la Fase 1
    if (fase1DataForm) {
        fase1DataForm.addEventListener('submit', (event) => {
            event.preventDefault(); // Prevenir el envío por defecto del formulario
            console.log("Formulario de Datos de Fase 1 enviado");

            // Obtener los valores de los campos del formulario de Fase 1
            const formData = new FormData(event.target);
            const fase1Data = {
                ubicacion: userLocation, // Incluir la ubicación guardada
                zonaInstalacion: formData.get('zonaInstalacion'),
                superficieRodea: formData.get('superficieRodea'),
                rugosidadSuperficie: formData.get('rugosidadSuperficie'),
                rotacionInstalacion: formData.get('rotacionInstalacion'),
                alturaInstalacion: formData.get('alturaInstalacion'),
                metodoCalculoRadiacion: formData.get('metodoCalculoRadiacion'),
                modeloMetodo: formData.get('modeloMetodo')
            };

            console.log('Datos de Fase 1 a Guardar:', fase1Data);

            // TODO: Implementa tu lógica de guardado aquí (por ejemplo, usando fetch para enviar a un servidor)
            // Por ahora, solo mostramos los datos en la consola.
            alert("Datos de Fase 1 guardados (ver consola)");

            // Opcional: Pasar al siguiente paso del wizard si existe
            // Esto implicaría ocultar los formularios de Fase 1 y mostrar el siguiente conjunto de formularios
            // Por ejemplo:
            // if (fase1FormsContainer) fase1FormsContainer.style.display = 'none';
            // const nextFormSection = document.getElementById('next-form-section'); // Asumiendo un ID para la siguiente sección
            // if (nextFormSection) nextFormSection.style.display = 'block';
        });
    }


    // Lógica para obtener datos del clima utilizando la API de OpenWeatherMap
    // TODO: Reemplaza 'YOUR_API_KEY' con tu clave API real de OpenWeatherMap
    const apiKey = 'YOUR_API_KEY';
    // Obtener referencias a los elementos donde se mostrarán los datos del clima
    const latitudSpan = document.getElementById('latitud');
    const longitudSpan = document.getElementById('longitud');
    const temperaturaSpan = document.getElementById('temperatura');
    const condicionSpan = document.getElementById('condicion');
    const humedadSpan = document.getElementById('humedad');


    function getWeatherData(lat, lng) {
        // Verifica si la API Key está configurada y si los elementos de visualización existen
        if (!apiKey || !latitudSpan || !longitudSpan || !temperaturaSpan || !condicionSpan || !humedadSpan) {
            console.error('Error: API Key de OpenWeatherMap no configurada o elementos de clima no encontrados en el HTML.');
            // Ocultar la sección del clima si los elementos necesarios no existen o la API key falta
            if(weatherInfoDiv) weatherInfoDiv.style.display = 'none';
            return; // Salir de la función si no se puede obtener o mostrar el clima
        }

         // Mostrar la sección del clima si los elementos existen y la API key está configurada
        if(weatherInfoDiv) weatherInfoDiv.style.display = 'block';

        // Construir la URL de la API de OpenWeatherMap
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric&lang=es`; // units=metric para Celsius, lang=es para español

        // Realizar la solicitud a la API utilizando fetch
        fetch(url)
            .then(response => {
                // Verificar si la respuesta fue exitosa (status 200-299)
                if (!response.ok) {
                    // Lanzar un error si la respuesta HTTP no es exitosa
                    throw new Error(`Error HTTP: ${response.status} - ${response.statusText}. Por favor, verifica tu API Key.`);
                }
                // Parsear la respuesta como JSON
                return response.json();
            })
            .then(data => {
                console.log("Datos del clima:", data);

                // Actualizar la interfaz con los datos del clima obtenidos
                latitudSpan.textContent = lat.toFixed(4); // Limitar decimales para mostrar
                longitudSpan.textContent = lng.toFixed(4); // Limitar decimales para mostrar
                temperaturaSpan.textContent = `${data.main.temp}°C`; // Mostrar temperatura en Celsius
                condicionSpan.textContent = data.weather[0].description; // Mostrar descripción del clima
                humedadSpan.textContent = `${data.main.humidity}%`; // Mostrar porcentaje de humedad

            })
            .catch(error => {
                // Manejar cualquier error que ocurra durante la solicitud fetch
                console.error("Error al obtener los datos del clima:", error);
                // Mostrar mensajes de error en la interfaz
                if(latitudSpan) latitudSpan.textContent = 'Error';
                if(longitudSpan) longitudSpan.textContent = 'Error';
                 if(temperaturaSpan) temperaturaSpan.textContent = 'Error';
                 if(condicionSpan) condicionSpan.textContent = 'Error al cargar';
                 if(humedadSpan) humedadSpan.textContent = 'Error';
                 // Opcional: Ocultar la sección del clima en caso de error
                 // if(weatherInfoDiv) weatherInfoDiv.style.display = 'none';
            });
    }

    // Manejo del envío del formulario solar principal (si aplica para el usuario básico más adelante)
    const solarForm = document.getElementById('solar-form');
    if(solarForm) {
        solarForm.addEventListener('submit', (event) => {
            event.preventDefault(); // Prevenir el envío por defecto del formulario
            console.log("Formulario solar principal enviado");
            // Obtener los valores de los campos del formulario principal
            const formData = new FormData(event.target);
            const datosInstalacion = {
                ubicacion: userLocation, // Usar la ubicación guardada
                // TODO: Agrega aquí el resto de los campos del formulario solar principal
                // Puedes acceder a los valores usando formData.get('nombreDelCampo')
            };

            console.log('Datos del formulario solar:', datosInstalacion);

            // Por ejemplo, puedes mostrar los datos en un elemento de la página
            const reportDiv = document.getElementById('report');
            if(reportDiv) reportDiv.innerHTML = `<p>Datos ingresados:</p><pre>${JSON.stringify(datosInstalacion, null, 2)}</pre>`;
             // TODO: Implementa tu lógica de procesamiento o envío de estos datos
        });
    }
});

// Mostrar/Ocultar datos avanzados
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

// Aquí iría la lógica para integrar el mapa y obtener los datos meteorológicos
// (Esto se hará en iteraciones posteriores, usando una API de mapas y clima)
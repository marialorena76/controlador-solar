document.addEventListener('DOMContentLoaded', () => {
    console.log(' informe.js cargado - Intentando cargar datos del informe.');

    // Carga los datos del informe desde localStorage
    const informeSolarString = localStorage.getItem('informeSolar');
    let datos = null;

    if (informeSolarString) {
        try {
            datos = JSON.parse(informeSolarString);
            console.log('Datos del informe cargados exitosamente:', datos);
        } catch (e) {
            console.error('Error al parsear el JSON del informe desde localStorage:', e);
            // En caso de error, limpia el localStorage para evitar problemas futuros
            localStorage.removeItem('informeSolar');
            alert('Hubo un problema al cargar el informe. Por favor, vuelva a realizar el cálculo.');
            window.location.href = 'calculador.html'; // Redirige al calculador
            return; // Detiene la ejecución
        }
    }

    // Si no hay datos, muestra un mensaje o redirige
    if (!datos) {
        console.warn('No se encontraron datos de informe en localStorage.');
        document.querySelector('.solar-report').innerHTML = `
            <div class="report-title">
                Informe de Viabilidad de Instalación Solar Fotovoltaica
            </div>
            <p style="text-align: center; padding: 20px; font-size: 1.1rem;">
                No se ha encontrado ningún informe. Por favor, complete el <a href="calculador.html">formulario de cálculo</a> para generar uno.
            </p>
            <div class="informe-btns">
                <button class="informe-btn" onclick="window.location.href='calculador.html'">Volver al Calculador</button>
            </div>
        `;
        return; // Detiene la ejecución si no hay datos
    }

    // Función auxiliar para poblar elementos
    function setTextContent(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        } else {
            console.warn(`Elemento con ID '${id}' no encontrado.`);
        }
    }

    // Poblar los datos del informe en el HTML
    // Resumen General
    setTextContent('consumo-anual', datos.consumo_anual?.toFixed(2) || 'N/A');
    setTextContent('generacion-anual', datos.generacion_anual?.toFixed(2) || 'N/A');
    setTextContent('autoconsumo', datos.autoconsumo?.toFixed(2) || 'N/A');
    setTextContent('inyectada-red', datos.inyectada_red?.toFixed(2) || 'N/A');

    // Datos de la Instalación Propuesta
    setTextContent('potencia-paneles', datos.potencia_paneles?.toFixed(2) || 'N/A');
    setTextContent('cantidad-paneles', datos.cantidad_paneles || 'N/A');
    setTextContent('superficie', datos.superficie?.toFixed(2) || 'N/A');
    setTextContent('vida-util', datos.vida_util || 'N/A');

    // Nuevos campos del Paso 5, 6 y 7
    setTextContent('tipo-panel-informe', datos.panelesSolares?.tipo || 'N/A');
    setTextContent('potencia-inversor-informe', (datos.inversor?.potenciaNominal?.toFixed(2) || 'N/A') + ' kW');
    setTextContent('tipo-inversor-informe', datos.inversor?.tipo || 'N/A');
    setTextContent('eficiencia-panel-informe', (datos.perdidas?.eficienciaPanel?.toFixed(1) || 'N/A') + '%');
    setTextContent('eficiencia-inversor-informe', (datos.perdidas?.eficienciaInversor?.toFixed(1) || 'N/A') + '%');
    setTextContent('factor-perdidas-informe', (datos.perdidas?.factorPerdidas?.toFixed(1) || 'N/A') + '%');


    // Análisis Económico - Asegurarse de que la moneda se muestre correctamente
    const monedaSimbolo = datos.moneda === 'Dólares' ? 'U$D' : '$'; // O el símbolo que prefieras para Pesos Argentinos
    const currencyElements = document.querySelectorAll('[id^="moneda-display"]');
    currencyElements.forEach(el => {
        el.textContent = monedaSimbolo;
    });

    setTextContent('costo-actual', datos.costo_actual?.toFixed(2) || 'N/A');
    setTextContent('inversion-inicial', datos.inversion_inicial?.toFixed(2) || 'N/A');
    setTextContent('mantenimiento', datos.mantenimiento?.toFixed(2) || 'N/A');
    setTextContent('costo-futuro', datos.costo_futuro?.toFixed(2) || 'N/A');
    setTextContent('ingreso-red', datos.ingreso_red?.toFixed(2) || 'N/A');
    setTextContent('resumen-economico', datos.resumen_economico || 'N/A');


    // Contribución al Cambio Climático
    setTextContent('emisiones', datos.emisiones?.toFixed(2) || 'N/A');


    // Descargar PDF con html2pdf.js
    document.getElementById('descargarPDF')?.addEventListener('click', function() {
        const element = document.querySelector('.solar-report');
        const opt = {
            margin: 0.5,
            filename: 'informe_solar.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, logging: true, dpi: 192, letterRendering: true },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
        };
        html2pdf().set(opt).from(element).save();
    });
});
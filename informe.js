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

    // • Consumo y generación
    setTextContent('consumo_anual_kwh', datos.consumo_anual_kwh?.toFixed(0) || 'N/A');
    setTextContent('energia_generada_anual', datos.energia_generada_anual?.toFixed(0) || 'N/A');
    setTextContent('autoconsumo', datos.autoconsumo?.toFixed(0) || 'N/A');
    setTextContent('inyectada_red', datos.inyectada_red?.toFixed(0) || 'N/A');

    // • Detalles de la instalación
    setTextContent('potencia_panel_sugerida', datos.panel_seleccionado?.['Pmax[W]'] || 'N/A');
    setTextContent('numero_paneles', datos.numero_paneles || 'N/A');
    setTextContent('area_paneles_m2', datos.area_paneles_m2?.toFixed(2) || 'N/A');

    // Vida útil
    setTextContent('vida_util', datos.vida_util || '25');

    // Resultados económicos
    const monedaSimbolo = datos.moneda === 'Dólares' ? 'U$D' : '$';
    const currencyElements = document.querySelectorAll('[id^="moneda-display"]');
    currencyElements.forEach(el => {
        el.textContent = monedaSimbolo;
    });

    const formatNumber = (num) => num?.toLocaleString('es-AR', { maximumFractionDigits: 0 }) || 'N/A';

    setTextContent('costo_actual', formatNumber(datos.costo_actual));
    setTextContent('inversion_inicial', formatNumber(datos.inversion_inicial));
    setTextContent('mantenimiento', formatNumber(datos.mantenimiento));
    setTextContent('costo_futuro', formatNumber(datos.costo_futuro));
    setTextContent('ingreso_red', formatNumber(datos.ingreso_red));

    // • Contribución a la mitigación del cambio climático
    setTextContent('emisiones', datos.emisiones?.toFixed(1) || 'N/A');


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
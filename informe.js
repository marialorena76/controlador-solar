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
    // Consumo y generación
    setTextContent('consumo_anual_kwh', datos.consumo_anual_kwh?.toFixed(2) || 'N/A');
    setTextContent('energia_generada_anual', datos.energia_generada_anual?.toFixed(2) || 'N/A');
    setTextContent('autoconsumo', datos.autoconsumo?.toFixed(2) || 'N/A');
    setTextContent('inyectada_red', datos.inyectada_red?.toFixed(2) || 'N/A');

    // Datos de la Instalación Propuesta
    setTextContent('panel_marca', datos.panel_seleccionado?.Marca || 'N/A');
    setTextContent('panel_modelo', datos.panel_seleccionado?.Modelo || 'N/A');
    setTextContent('potencia_sistema_kwp', datos.potencia_sistema_kwp?.toFixed(2) || 'N/A');
    setTextContent('numero_paneles', datos.numero_paneles || 'N/A');
    setTextContent('area_paneles_m2', datos.area_paneles_m2?.toFixed(2) || 'N/A');
    setTextContent('tipo_inversor', datos.tipo_inversor || 'N/A');
    setTextContent('potencia_inversor_kwa', datos.potencia_inversor_kwa?.toFixed(2) || 'N/A');
    setTextContent('vida_util', datos.vida_util || '25'); // Fallback a 25 si no viene del backend

    // Análisis Económico
    const monedaSimbolo = datos.moneda === 'Dólares' ? 'U$D' : '$';
    const currencyElements = document.querySelectorAll('[id^="moneda-display"]');
    currencyElements.forEach(el => {
        el.textContent = monedaSimbolo;
    });

    setTextContent('costo_actual', datos.costo_actual?.toFixed(2) || 'N/A');
    setTextContent('inversion_inicial', datos.inversion_inicial?.toFixed(2) || 'N/A');
    setTextContent('mantenimiento', datos.mantenimiento?.toFixed(2) || 'N/A');
    setTextContent('costo_futuro', datos.costo_futuro?.toFixed(2) || 'N/A');
    setTextContent('ingreso_red', datos.ingreso_red?.toFixed(2) || 'N/A');
    setTextContent('ahorro_total', datos.ahorro_total?.toFixed(2) || 'N/A');
    setTextContent('resumen_economico', datos.resumen_economico || 'Cálculo de período de repago y otros indicadores avanzados estarán disponibles en futuras versiones.');

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
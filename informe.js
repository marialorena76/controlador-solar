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

    // --- Conditional Display Logic ---
    const userType = datos.userType || 'basico'; // Default to basic if not specified
    const basicReport = document.getElementById('basic-report-sections');
    const expertReport = document.getElementById('expert-report-sections');
    const reportTitle = document.getElementById('report-main-title');

    if (userType === 'experto') {
        basicReport.style.display = 'none';
        expertReport.style.display = 'block';
        reportTitle.textContent = 'Resultado del dimensionamiento fotovoltaico (Detallado)';
    } else {
        basicReport.style.display = 'block';
        expertReport.style.display = 'none';
        reportTitle.textContent = 'Datos técnicos del dimensionamiento';
    }

    // --- Data Population ---
    const formatNumber = (num, decimals = 0) => num?.toLocaleString('es-AR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) || 'N/A';
    const monedaSimbolo = datos.moneda === 'Dólares' ? 'U$D' : '$';

    if (userType === 'experto') {
        // Populate Expert Report
        // Radiación
        setTextContent('experto_radiacion_anual', 'N/A'); // Placeholder
        setTextContent('experto_incremento_radiacion', 'N/A'); // Placeholder
        // Consumo
        setTextContent('experto_consumo_anual', formatNumber(datos.consumo_anual_kwh, 0));
        // Panel
        setTextContent('experto_panel_marca', datos.panel_seleccionado?.Marca || 'N/A');
        setTextContent('experto_panel_potencia', datos.panel_seleccionado?.['Pmax[W]'] || 'N/A');
        setTextContent('experto_panel_modelo', datos.panel_seleccionado?.Modelo || 'N/A');
        setTextContent('experto_panel_eficiencia', datos.panel_seleccionado?.['Eficiencia[%]'] || 'N/A');
        setTextContent('experto_cantidad_paneles', datos.numero_paneles || 'N/A');
        setTextContent('experto_superficie', formatNumber(datos.area_paneles_m2, 2));
        setTextContent('experto_potencia_instalada', (datos.potencia_sistema_kwp * 1000)?.toFixed(0) || 'N/A');
        // Inversor
        setTextContent('experto_inversor_sugerido', datos.tipo_inversor || 'N/A');
        setTextContent('experto_inversor_potencia', (datos.potencia_inversor_kwa * 1000)?.toFixed(0) || 'N/A');
        setTextContent('experto_inversor_eficiencia', 'N/A'); // Placeholder
        setTextContent('experto_cantidad_inversores', '1'); // Placeholder
        // Emisiones
        setTextContent('experto_emisiones_primer_ano', formatNumber(datos.emisiones, 1));
        setTextContent('experto_emisiones_totales', 'N/A'); // Placeholder
        // Económico
        document.querySelectorAll('[id^="experto_moneda_"]').forEach(el => el.textContent = monedaSimbolo);
        setTextContent('experto_cargo_pico', 'N/A'); // Placeholder
        setTextContent('experto_cargo_fuera_pico', 'N/A'); // Placeholder
        setTextContent('experto_costo_actual', formatNumber(datos.costo_actual));
        setTextContent('experto_costo_total_actualizado', 'N/A'); // Placeholder
        setTextContent('experto_inversion_inicial', formatNumber(datos.inversion_inicial));
        setTextContent('experto_mantenimiento', formatNumber(datos.mantenimiento));
        setTextContent('experto_tarifa_inyeccion', 'N/A'); // Placeholder
        setTextContent('experto_costo_futuro', formatNumber(datos.costo_futuro));
        setTextContent('experto_ahorro_actualizado', 'N/A'); // Placeholder
        setTextContent('experto_ingreso_anual_inyeccion', formatNumber(datos.ingreso_red));
        setTextContent('experto_ingreso_total_inyeccion', 'N/A'); // Placeholder
        setTextContent('experto_ahorro_neto', 'N/A'); // Placeholder
    } else {
        // Populate Basic Report
        // Consumo y generación
        setTextContent('basico_consumo_anual', formatNumber(datos.consumo_anual_kwh, 0));
        setTextContent('basico_generacion_anual', formatNumber(datos.energia_generada_anual, 0));
        setTextContent('basico_autoconsumo', formatNumber(datos.autoconsumo, 0));
        setTextContent('basico_inyectada_red', formatNumber(datos.inyectada_red, 0));
        // Detalles de la instalación
        setTextContent('basico_potencia_panel', datos.panel_seleccionado?.['Pmax[W]'] || 'N/A');
        setTextContent('basico_cantidad_paneles', datos.numero_paneles || 'N/A');
        setTextContent('basico_superficie', formatNumber(datos.area_paneles_m2, 2));
        // Vida útil
        setTextContent('basico_vida_util', datos.vida_util || '25');
        // Resultados económicos
        document.querySelectorAll('[id^="basico_moneda_"]').forEach(el => el.textContent = monedaSimbolo);
        setTextContent('basico_costo_actual', formatNumber(datos.costo_actual));
        setTextContent('basico_inversion_inicial', formatNumber(datos.inversion_inicial));
        setTextContent('basico_mantenimiento', formatNumber(datos.mantenimiento));
        setTextContent('basico_costo_futuro', formatNumber(datos.costo_futuro));
        setTextContent('basico_ingreso_red', formatNumber(datos.ingreso_red));
        // Contribución
        setTextContent('basico_emisiones', formatNumber(datos.emisiones, 1));
    }


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
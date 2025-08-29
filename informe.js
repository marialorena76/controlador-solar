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
    const formatNumber = (num, decimals = 2) => num != null ? num.toLocaleString('es-AR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : 'N/A';
    const monedaSimbolo = datos.moneda === 'Dólares' ? 'U$D' : '$';

    if (userType === 'experto') {
        // Populate Expert Report
        setTextContent('experto_consumo_anual', formatNumber(datos.consumo_anual_kwh, 0));
        setTextContent('experto_panel_marca', datos.panel_seleccionado?.Marca || 'N/A');
        setTextContent('experto_panel_potencia', datos.panel_seleccionado?.['Pmax[W]'] || 'N/A');
        setTextContent('experto_panel_modelo', datos.panel_seleccionado?.Modelo || 'N/A');
        setTextContent('experto_panel_eficiencia', datos.panel_seleccionado?.['Eficiencia[%]'] || 'N/A');
        setTextContent('experto_cantidad_paneles', datos.numero_paneles || 'N/A');
        setTextContent('experto_superficie', formatNumber(datos.area_paneles_m2, 2));
        setTextContent('experto_potencia_instalada', (datos.potencia_sistema_kwp * 1000)?.toFixed(0) || 'N/A');
        setTextContent('experto_inversor_sugerido', datos.tipo_inversor || 'N/A');
        setTextContent('experto_inversor_potencia', (datos.potencia_inversor_kwa * 1000)?.toFixed(0) || 'N/A');

        setTextContent('experto_emisiones_primer_ano', formatNumber(datos.emisiones_evitadas_primer_ano_tco2));
        setTextContent('experto_emisiones_totales', formatNumber(datos.emisiones_evitadas_total_tco2));

        document.querySelectorAll('[id^="experto_moneda_"]').forEach(el => el.textContent = monedaSimbolo);
        setTextContent('experto_costo_actual', formatNumber(datos.costo_actual, 0));
        setTextContent('experto_inversion_inicial', formatNumber(datos.inversion_inicial, 0));
        setTextContent('experto_mantenimiento', formatNumber(datos.mantenimiento, 0));
        setTextContent('experto_costo_futuro', formatNumber(datos.costo_futuro, 0));
        setTextContent('experto_ingreso_anual_inyeccion', formatNumber(datos.ingreso_red, 0));
        setTextContent('experto_ahorro_neto', formatNumber(datos.ahorro_total, 0));

    } else { // Basic user
        setTextContent('basico_consumo_anual', formatNumber(datos.consumo_anual_kwh, 0));
        setTextContent('basico_energia_generada_anual', formatNumber(datos.energia_generada_anual, 0));
        setTextContent('basico_autoconsumo', formatNumber(datos.autoconsumo, 0));
        setTextContent('basico_inyectada_red', formatNumber(datos.inyectada_red, 0));
        setTextContent('basico_potencia_panel', datos.panel_seleccionado?.['Pmax[W]'] || 'N/A');
        setTextContent('basico_cantidad_paneles', datos.numero_paneles || 'N/A');
        setTextContent('basico_superficie', formatNumber(datos.area_paneles_m2, 2));
        setTextContent('basico_vida_util', datos.vida_util || '25');

        document.querySelectorAll('[id^="basico_moneda_"]').forEach(el => el.textContent = monedaSimbolo);
        setTextContent('basico_costo_actual', formatNumber(datos.costo_actual, 0));
        setTextContent('basico_inversion_inicial', formatNumber(datos.inversion_inicial, 0));
        setTextContent('basico_mantenimiento', formatNumber(datos.mantenimiento, 0));
        setTextContent('basico_costo_futuro', formatNumber(datos.costo_futuro, 0));
        setTextContent('basico_ingreso_red', formatNumber(datos.ingreso_red, 0));

        setTextContent('basico_emisiones_primer_ano', formatNumber(datos.emisiones_evitadas_primer_ano_tco2));
        setTextContent('basico_emisiones_total', formatNumber(datos.emisiones_evitadas_total_tco2));
    }

    // --- Chart Rendering ---
    renderCharts(datos, userType, monedaSimbolo);

    // --- PDF Download ---
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

function renderCharts(datos, userType, monedaSimbolo) {
    if (!datos || !datos.flujo_de_fondos) {
        console.error("No se encontraron datos de 'flujo_de_fondos' para el gráfico.");
        return;
    }

    const canvasIdSuffix = userType === 'experto' ? 'Expert' : 'Basic';

    // --- Cash Flow Chart ---
    const cashFlowCtx = document.getElementById(`cashFlowChart${canvasIdSuffix}`).getContext('2d');
    const labels = datos.flujo_de_fondos.map(item => `Año ${item.anio}`);
    const dataSinProyecto = datos.flujo_de_fondos.map(item => item.sin_proyecto);
    const dataConProyecto = datos.flujo_de_fondos.map(item => item.con_proyecto);

    new Chart(cashFlowCtx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: `Flujo sin Proyecto (${monedaSimbolo})`,
                    data: dataSinProyecto,
                    backgroundColor: 'rgba(255, 99, 132, 0.5)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                },
                {
                    label: `Flujo con Proyecto (${monedaSimbolo})`,
                    data: dataConProyecto,
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return monedaSimbolo + ' ' + value.toLocaleString('es-AR');
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += monedaSimbolo + ' ' + context.parsed.y.toLocaleString('es-AR');
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });

    // --- Emissions Chart ---
    const emissionsCtx = document.getElementById(`emissionsChart${canvasIdSuffix}`).getContext('2d');
    new Chart(emissionsCtx, {
        type: 'bar',
        data: {
            labels: ['Primer Año', 'Total en Vida Útil'],
            datasets: [{
                label: 'Emisiones Evitadas (tCO2)',
                data: [datos.emisiones_evitadas_primer_ano_tco2, datos.emisiones_evitadas_total_tco2],
                backgroundColor: [
                    'rgba(75, 192, 192, 0.5)',
                    'rgba(153, 102, 255, 0.5)'
                ],
                borderColor: [
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            scales: {
                x: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Toneladas de CO2'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'Comparativa de Emisiones de CO2 Evitadas'
                }
            }
        }
    });
}
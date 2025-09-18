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
        const techData = datos.technical_data || {};
        const expertData = datos.expert_data || {};
        const panelDetails = expertData.panel_details || {};
        const inverterDetails = expertData.inverter_details || {};
        const economicDetails = expertData.economic_details || {};

        // Populate Radiacion and Consumo
        setTextContent('experto_radiacion_anual', formatNumber(expertData.radiacion_anual_incidente, 2));
        setTextContent('experto_incremento_radiacion', formatNumber(expertData.incremento_plano_horizontal * 100, 2));
        setTextContent('experto_consumo_anual', formatNumber(expertData.consumo_anual_energia_electrica, 0));

        // Populate Panel Details
        setTextContent('experto_panel_marca', panelDetails.marca || 'N/A');
        setTextContent('experto_panel_potencia', panelDetails.potencia || 'N/A');
        setTextContent('experto_panel_modelo', panelDetails.modelo || 'N/A');
        setTextContent('experto_panel_eficiencia', `${formatNumber(panelDetails.eficiencia * 100, 2)} %`);
        setTextContent('experto_cantidad_paneles', panelDetails.cantidad_paneles || 'N/A');
        setTextContent('experto_superficie', `${formatNumber(panelDetails.superficie_necesaria, 2)} m²`);
        setTextContent('experto_potencia_instalada', `${formatNumber(panelDetails.potencia_instalada, 0)} W`);

        // Populate Inverter Details
        const sugeridos = inverterDetails.inversores_sugeridos || 'N/A';
        const modelo = inverterDetails.modelo || 'N/A';
        const inversor = inverterDetails.inversor || 'N/A';
        setTextContent('experto_inversor_sugerido', `${sugeridos} (Modelo: ${modelo}, Inversor: ${inversor})`);
        setTextContent('experto_inversor_potencia', `${formatNumber(inverterDetails.potencia, 0)} W`);
        setTextContent('experto_inversor_eficiencia', `${formatNumber(inverterDetails.eficiencia * 100, 2)} %`);
        setTextContent('experto_cantidad_inversores', inverterDetails.cantidad || 'N/A');

        // Populate Economic Details
        document.querySelectorAll('[id^="experto_moneda_"]').forEach(el => el.textContent = monedaSimbolo);
        setTextContent('experto_costo_actual', formatNumber(economicDetails.costo_actual_anual, 0));
        setTextContent('experto_inversion_inicial', formatNumber(economicDetails.inversion_inicial, 0));
        setTextContent('experto_mantenimiento', formatNumber(economicDetails.costo_mantenimiento_anual, 0));
        setTextContent('experto_costo_futuro', formatNumber(economicDetails.costo_futuro_energia, 0));
        setTextContent('experto_ingreso_anual_inyeccion', formatNumber(economicDetails.ingreso_anual_inyeccion, 0));

        const ahorroNetoLabel = document.getElementById('experto_ahorro_neto_label');
        if (ahorroNetoLabel) {
            ahorroNetoLabel.textContent = economicDetails.ahorro_neto_label || "Ahorro neto logrado durante la vida util del proyecto";
        }
        setTextContent('experto_ahorro_neto', formatNumber(economicDetails.ahorro_neto_valor, 0));

        // Emissions
        setTextContent('experto_emisiones_primer_ano', formatNumber(datos.emisiones_evitadas_primer_ano_tco2, 2));
        setTextContent('experto_emisiones_totales', formatNumber(datos.emisiones_evitadas_total_tco2, 2));

    } else { // Basic user
        const economicData = datos.economic_data || {};
        const techData = datos.technical_data || {};

        // Technical Data
        setTextContent('basico_consumo_anual_kwh', formatNumber(techData.consumo_anual_kwh, 0));
        setTextContent('basico_energia_generada_anual', formatNumber(techData.energia_generada_anual, 0));
        setTextContent('basico_autoconsumo', formatNumber(techData.autoconsumo, 0));
        setTextContent('basico_inyectada_red', formatNumber(techData.inyectada_red, 0));
        setTextContent('basico_potencia_panel_sugerida', formatNumber(techData.potencia_paneles_sugerida, 0));
        setTextContent('basico_numero_paneles', techData.cantidad_paneles_necesarios || 'N/A');
        setTextContent('basico_area_paneles_m2', formatNumber(techData.superficie_necesaria, 2));
        setTextContent('basico_vida_util', techData.vida_util_proyecto || '25');

        // Economic Data (New Boxes)
        // Ensure the currency symbol is set correctly in the new layout
        document.querySelectorAll('#basic-report-sections .currency').forEach(el => {
            el.textContent = monedaSimbolo;
        });
        setTextContent('basico_costo_sin_instalacion', formatNumber(economicData.gasto_anual_sin_fv, 0));
        setTextContent('basico_inversion_inicial_total', formatNumber(economicData.inversion_inicial, 0));

        // Conditional title based on saldo_anual_favor
        const saldoAnualFavor = economicData.saldo_anual_favor || 0;
        const resultadoLabel = document.getElementById('basico_resultado_label');
        if (resultadoLabel) {
            if (saldoAnualFavor > 0) {
                resultadoLabel.textContent = 'Si realiza la instalación fotovoltaica tendrá un saldo neto anual a su favor de';
                setTextContent('basico_costo_reducido', formatNumber(saldoAnualFavor, 0));
            } else {
                resultadoLabel.textContent = 'Si realiza la instalación fotovoltaica su costo anual en energía eléctrica se reducirá a';
                setTextContent('basico_costo_reducido', formatNumber(economicData.costo_anual_reducido, 0));
            }
        } else {
            setTextContent('basico_costo_reducido', formatNumber(economicData.costo_anual_reducido, 0));
        }

        // Emissions
        setTextContent('basico_emisiones_total_vida_util', formatNumber(datos.emisiones_evitadas_total_tco2, 2));
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
    if (!datos) return;

    if (userType === 'experto') {
        renderExpertCharts(datos);
    } else {
        renderBasicCharts(datos);
    }
}

function renderBasicCharts(datos) {
    const chartData = datos.chart_data || {};

    // --- Daily Profile Charts ---
    const renderDailyChart = (canvasId, title, consumptionData, generationData) => {
        const ctx = document.getElementById(canvasId)?.getContext('2d');
        if (!ctx) {
            console.error(`Canvas con ID '${canvasId}' no encontrado.`);
            return;
        }

        const labels = Array.from({ length: 24 }, (_, i) => `${i+1}`);
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Demanda',
                    data: consumptionData || [],
                    borderColor: 'rgba(255, 99, 132, 1)',
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    fill: true,
                    tension: 0.4
                }, {
                    label: 'Generación solar fotovoltaica generada',
                    data: generationData || [],
                    borderColor: 'rgba(255, 206, 86, 1)',
                    backgroundColor: 'rgba(255, 206, 86, 0.2)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: { display: false }, // Title is in the section header
                    legend: { position: 'bottom' }
                },
                scales: {
                    x: { title: { display: true, text: 'Hora del día' } },
                    y: { title: { display: true, text: 'kW' } }
                }
            }
        });
    };

    renderDailyChart('winterDailyChart', 'Perfil diario Invierno', chartData.winter_daily_consumption, chartData.winter_daily_generation);
    renderDailyChart('summerDailyChart', 'Perfil diario Verano', chartData.summer_daily_consumption, chartData.summer_daily_generation);


    // --- Monthly Comparison Bar Chart ---
    const monthlyCtx = document.getElementById('monthlyComparisonChart')?.getContext('2d');
    if (monthlyCtx) {
        const monthLabels = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        new Chart(monthlyCtx, {
            type: 'bar',
            data: {
                labels: monthLabels,
                datasets: [{
                    label: 'Consumo de energía de la red',
                    data: chartData.monthly_consumption || [],
                    backgroundColor: '#d32f2f' // Red
                }, {
                    label: 'Autoconsumo de energía solar fotovoltaica',
                    data: chartData.monthly_autoconsumption || [],
                    backgroundColor: '#fbc02d' // Yellow
                }, {
                    label: 'Sobrante de energía solar inyectada a la red',
                    data: chartData.monthly_injection || [],
                    backgroundColor: '#4caf50' // Green
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: { display: false }, // Title is in the section header
                    legend: { position: 'bottom' }
                },
                scales: {
                    x: { stacked: true },
                    y: { stacked: true, title: { display: true, text: 'Energía (kWh)' } }
                }
            }
        });
    } else {
        console.error("Canvas con ID 'monthlyComparisonChart' no encontrado.");
    }
}

function renderExpertCharts(datos) {
    console.log("Rendering expert charts with corrected data paths:", datos);
    const techData = datos.technical_data || {};

    // --- Monthly Balance Bar Chart ---
    const monthlyCtx = document.getElementById('monthlyBalanceChart').getContext('2d');
    const monthLabels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    new Chart(monthlyCtx, {
        type: 'bar',
        data: {
            labels: monthLabels,
            datasets: [{
                label: 'Consumo (kWh)',
                data: datos.consumosMensualesFactura || [],
                backgroundColor: 'rgba(255, 99, 132, 0.5)',
            }, {
                label: 'Generación (kWh)',
                data: techData.monthly_generation || [],
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Balance Mensual de Energía'
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });

    // --- Loss Distribution Pie Chart ---
    const lossCtx = document.getElementById('lossDistributionChart').getContext('2d');
    const losses = techData.losses || {};
    const lossLabels = Object.keys(losses).map(key => key.charAt(0).toUpperCase() + key.slice(1)); // Capitalize keys
    const lossValues = Object.values(losses);

    new Chart(lossCtx, {
        type: 'pie',
        data: {
            labels: lossLabels,
            datasets: [{
                data: lossValues,
                backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'],
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Distribución Estimada de Pérdidas del Sistema (%)'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed !== null) {
                                label += context.parsed.toFixed(2) + '%';
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });

    // --- Annual Evolution Line Chart ---
    const annualCtx = document.getElementById('annualEvolutionChart').getContext('2d');
    const years = Array.from({
        length: 25
    }, (_, i) => i + 1);
    const annualConsumption = datos.consumo_anual_kwh || 0;
    const annualGenerationStart = techData.annual_generation || 0;
    const degradationRate = 0.005; // 0.5% annual degradation
    const annualGenSeries = years.map(year => annualGenerationStart * Math.pow(1 - degradationRate, year - 1));

    new Chart(annualCtx, {
        type: 'line',
        data: {
            labels: years.map(y => `Año ${y}`),
            datasets: [{
                label: 'Consumo Anual (kWh)',
                data: Array(25).fill(annualConsumption),
                borderColor: 'rgba(255, 99, 132, 1)',
                backgroundColor: 'rgba(255, 99, 132, 0.1)',
                fill: false,
                tension: 0.1
            }, {
                label: 'Generación Anual (con degradación)',
                data: annualGenSeries,
                borderColor: 'rgba(54, 162, 235, 1)',
                backgroundColor: 'rgba(54, 162, 235, 0.1)',
                fill: false,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Evolución Anual de Consumo y Generación (25 Años)'
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}
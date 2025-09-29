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
            window.location.href = 'index.html'; // Redirige al calculador
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
                No se ha encontrado ningún informe. Por favor, complete el <a href="index.html">formulario de cálculo</a> para generar uno.
            </p>
            <div class="informe-btns">
                <button class="informe-btn" onclick="window.location.href='index.html'">Volver al Calculador</button>
            </div>
        `;
        return; // Detiene la ejecución si no hay datos
    }

    // Función auxiliar para poblar elementos
    function setTextContent(id, value) {
        const element = document.getElementById(id);
        if (element) {
            const safeValue = (value === undefined || value === null || value === '') ? 'N/A' : value;
            element.textContent = safeValue;
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
    const formatNumber = (num, decimals = 2) => {
        if (typeof num !== 'number' || !Number.isFinite(num)) {
            return 'N/A';
        }
        return num.toLocaleString('es-AR', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        });
    };
    const monedaSimbolo = datos.moneda === 'Dólares' ? 'U$D' : '$';

    if (userType === 'experto') {
        const fallbackIfEmpty = (section, fallback) => {
            if (section && typeof section === 'object' && Object.keys(section).length > 0) {
                return section;
            }
            if (fallback && typeof fallback === 'object' && Object.keys(fallback).length > 0) {
                return fallback;
            }
            return {};
        };

        const rawExpertReport = datos.expert_report || {};
        const expertReport = {
            systemDesign: fallbackIfEmpty(rawExpertReport.systemDesign, datos.system_design),
            energy: fallbackIfEmpty(rawExpertReport.energy, datos.energy),
            economy: fallbackIfEmpty(rawExpertReport.economy, datos.economy),
            emissions: fallbackIfEmpty(rawExpertReport.emissions, datos.emissions),
            tariffs: fallbackIfEmpty(rawExpertReport.tariffs, datos.tariffs),
        };

        const systemDesign = fallbackIfEmpty(expertReport.systemDesign, datos.system_design);
        const energy = fallbackIfEmpty(expertReport.energy, datos.energy);
        const economy = fallbackIfEmpty(expertReport.economy, datos.economy);
        const tariffs = fallbackIfEmpty(expertReport.tariffs, datos.tariffs);
        const emissions = fallbackIfEmpty(expertReport.emissions, datos.emissions);

        const lifetimeYears = (typeof systemDesign.projectLifetimeYears === 'number' && Number.isFinite(systemDesign.projectLifetimeYears))
            ? systemDesign.projectLifetimeYears
            : 0;

        const installedCapacityKWp = (typeof systemDesign.installedCapacityKWp === 'number' && Number.isFinite(systemDesign.installedCapacityKWp))
            ? systemDesign.installedCapacityKWp
            : null;
        const installedCapacityW = installedCapacityKWp != null ? installedCapacityKWp * 1000 : null;

        const requiredSurface = (typeof systemDesign.requiredSurfaceM2 === 'number' && Number.isFinite(systemDesign.requiredSurfaceM2) && systemDesign.requiredSurfaceM2 > 0)
            ? systemDesign.requiredSurfaceM2
            : null;
        const annualIrradiance = (typeof energy.annualGenerationKWh === 'number' && Number.isFinite(energy.annualGenerationKWh) && requiredSurface)
            ? energy.annualGenerationKWh / requiredSurface
            : null;

        const totalConsumptionCost = (typeof economy.preProjectAnnualCost === 'number' && Number.isFinite(economy.preProjectAnnualCost) && lifetimeYears)
            ? economy.preProjectAnnualCost * lifetimeYears
            : null;
        const postProjectLifetimeCost = (typeof economy.postProjectAnnualCost === 'number' && Number.isFinite(economy.postProjectAnnualCost) && lifetimeYears)
            ? economy.postProjectAnnualCost * lifetimeYears
            : null;
        const totalSavingsLifetime = (totalConsumptionCost != null && postProjectLifetimeCost != null)
            ? totalConsumptionCost - postProjectLifetimeCost
            : null;
        const netSavingsLifetime = (totalSavingsLifetime != null && typeof economy.initialInvestment === 'number' && Number.isFinite(economy.initialInvestment))
            ? totalSavingsLifetime - economy.initialInvestment
            : null;
        const totalInjectionRevenue = (typeof economy.injectionRevenue === 'number' && Number.isFinite(economy.injectionRevenue) && lifetimeYears)
            ? economy.injectionRevenue * lifetimeYears
            : null;

        // Radiación y consumo
        setTextContent('experto_radiacion_anual', formatNumber(annualIrradiance, 2));
        setTextContent('experto_incremento_radiacion', 'N/A');
        setTextContent('experto_consumo_anual', formatNumber(energy.annualConsumptionKWh, 0));

        // Paneles
        const panelBrand = systemDesign.panelBrand || systemDesign.panelModel || 'N/A';
        setTextContent('experto_panel_marca', panelBrand);
        setTextContent('experto_panel_potencia', formatNumber(systemDesign.panelPowerW, 0));
        setTextContent('experto_panel_modelo', systemDesign.panelModel || 'N/A');
        setTextContent('experto_panel_eficiencia', formatNumber(systemDesign.panelEfficiency, 2));
        setTextContent('experto_cantidad_paneles', systemDesign.panelCount);
        setTextContent('experto_superficie', formatNumber(requiredSurface, 2));
        setTextContent('experto_potencia_instalada', formatNumber(installedCapacityW, 0));

        // Inversores - no disponibles actualmente en el motor
        setTextContent('experto_inversor_sugerido', 'No disponible');
        setTextContent('experto_inversor_potencia', 'N/A');
        setTextContent('experto_inversor_eficiencia', 'N/A');
        setTextContent('experto_cantidad_inversores', 'N/A');

        // Datos económicos
        document.querySelectorAll('[id^="experto_moneda_"]').forEach(el => el.textContent = monedaSimbolo);
        setTextContent('experto_cargo_pico', formatNumber(tariffs.consumptionTariff, 4));
        setTextContent('experto_cargo_fuera_pico', formatNumber(tariffs.consumptionTariff, 4));
        setTextContent('experto_costo_actual', formatNumber(economy.preProjectAnnualCost, 0));
        setTextContent('experto_costo_total_actualizado', formatNumber(totalConsumptionCost, 0));
        setTextContent('experto_inversion_inicial', formatNumber(economy.initialInvestment, 0));
        setTextContent('experto_mantenimiento', formatNumber(economy.maintenanceAnnualCost, 0));
        setTextContent('experto_tarifa_inyeccion', formatNumber(tariffs.injectionTariff, 4));
        setTextContent('experto_costo_futuro', formatNumber(postProjectLifetimeCost, 0));
        setTextContent('experto_ahorro_actualizado', formatNumber(totalSavingsLifetime, 0));
        setTextContent('experto_ingreso_anual_inyeccion', formatNumber(economy.injectionRevenue, 0));
        setTextContent('experto_ingreso_total_inyeccion', formatNumber(totalInjectionRevenue, 0));
        setTextContent('experto_ahorro_neto', formatNumber(netSavingsLifetime, 0));

        // Emisiones
        setTextContent('experto_emisiones_primer_ano', formatNumber(emissions.avoidedTonsCO2PerYear, 2));
        setTextContent('experto_emisiones_totales', formatNumber(emissions.avoidedTonsCO2Lifetime, 2));

    } else { // Basic user
        const economicData = datos.economic_data || {};
        const techData = datos.technical_data || {};
        const basicReportData = datos.basic_report && datos.basic_report.excel_table ? datos.basic_report.excel_table : [];

        renderBasicExcelTable(basicReportData);

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

function renderBasicExcelTable(tableData) {
    const tbody = document.getElementById('basico_resultados_excel_body');
    if (!tbody) {
        return;
    }

    tbody.innerHTML = '';

    if (!Array.isArray(tableData) || tableData.length === 0) {
        const emptyRow = document.createElement('tr');
        const emptyCell = document.createElement('td');
        emptyCell.colSpan = 11;
        emptyCell.textContent = 'No se encontraron datos para mostrar el informe básico detallado.';
        emptyRow.appendChild(emptyCell);
        tbody.appendChild(emptyRow);
        return;
    }

    const columnCount = Array.isArray(tableData[0]) ? tableData[0].length : 1;

    tableData.forEach((row) => {
        const tr = document.createElement('tr');
        const normalizedRow = Array.isArray(row) ? row : [row];

        normalizedRow.forEach((cellValue) => {
            const td = document.createElement('td');
            let displayValue = '';

            if (cellValue !== null && cellValue !== undefined) {
                if (typeof cellValue === 'number') {
                    let formatted = cellValue.toFixed(6).replace(/\.0+$/, '').replace(/\.?0+$/, '');
                    if (formatted === '') {
                        formatted = '0';
                    }
                    displayValue = formatted;
                } else {
                    displayValue = String(cellValue);
                }
            }

            td.textContent = displayValue;
            tr.appendChild(td);
        });

        const cellsToPad = columnCount - tr.children.length;
        for (let i = 0; i < cellsToPad; i += 1) {
            tr.appendChild(document.createElement('td'));
        }

        tbody.appendChild(tr);
    });
}

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
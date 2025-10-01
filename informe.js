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
    const formatNumber = (num) => {
        if (typeof num !== 'number' || !Number.isFinite(num)) {
            return 'N/A';
        }
        const rounded = Math.round(num);
        return rounded.toLocaleString('es-AR', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
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
        setTextContent('experto_radiacion_anual', formatNumber(annualIrradiance));
        setTextContent('experto_incremento_radiacion', 'N/A');
        setTextContent('experto_consumo_anual', formatNumber(energy.annualConsumptionKWh));

        // Paneles
        const panelBrand = systemDesign.panelBrand || systemDesign.panelModel || 'N/A';
        setTextContent('experto_panel_marca', panelBrand);
        setTextContent('experto_panel_potencia', formatNumber(systemDesign.panelPowerW));
        setTextContent('experto_panel_modelo', systemDesign.panelModel || 'N/A');
        setTextContent('experto_panel_eficiencia', formatNumber(systemDesign.panelEfficiency));
        setTextContent('experto_cantidad_paneles', systemDesign.panelCount);
        setTextContent('experto_superficie', formatNumber(requiredSurface));
        setTextContent('experto_potencia_instalada', formatNumber(installedCapacityW));

        // Inversores - no disponibles actualmente en el motor
        setTextContent('experto_inversor_sugerido', 'No disponible');
        setTextContent('experto_inversor_potencia', 'N/A');
        setTextContent('experto_inversor_eficiencia', 'N/A');
        setTextContent('experto_cantidad_inversores', 'N/A');

        // Datos económicos
        document.querySelectorAll('[id^="experto_moneda_"]').forEach(el => el.textContent = monedaSimbolo);
        setTextContent('experto_cargo_pico', formatNumber(tariffs.consumptionTariff));
        setTextContent('experto_cargo_fuera_pico', formatNumber(tariffs.consumptionTariff));
        setTextContent('experto_costo_actual', formatNumber(economy.preProjectAnnualCost));
        setTextContent('experto_costo_total_actualizado', formatNumber(totalConsumptionCost));
        setTextContent('experto_inversion_inicial', formatNumber(economy.initialInvestment));
        setTextContent('experto_mantenimiento', formatNumber(economy.maintenanceAnnualCost));
        setTextContent('experto_tarifa_inyeccion', formatNumber(tariffs.injectionTariff));
        setTextContent('experto_costo_futuro', formatNumber(postProjectLifetimeCost));
        setTextContent('experto_ahorro_actualizado', formatNumber(totalSavingsLifetime));
        setTextContent('experto_ingreso_anual_inyeccion', formatNumber(economy.injectionRevenue));
        setTextContent('experto_ingreso_total_inyeccion', formatNumber(totalInjectionRevenue));
        setTextContent('experto_ahorro_neto', formatNumber(netSavingsLifetime));

        // Emisiones
        setTextContent('experto_emisiones_primer_ano', formatNumber(emissions.avoidedTonsCO2PerYear));
        setTextContent('experto_emisiones_totales', formatNumber(emissions.avoidedTonsCO2Lifetime));

    } else { // Basic user
        const basicReportData = datos.basic_report && Array.isArray(datos.basic_report.excel_table)
            ? datos.basic_report.excel_table
            : [];

        renderBasicExcelTable(basicReportData);
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

    if (window.BasicReportTableHelper && typeof window.BasicReportTableHelper.renderRows === 'function') {
        window.BasicReportTableHelper.renderRows(tbody, tableData, { columnCount: 4 });
        return;
    }

    // Fallback rendering in case the helper is not available for any reason.
    tbody.innerHTML = '';

    if (!Array.isArray(tableData) || tableData.length === 0) {
        const emptyRow = document.createElement('tr');
        const emptyCell = document.createElement('td');
        emptyCell.colSpan = 4;
        emptyCell.textContent = 'No se encontraron datos para mostrar el informe básico detallado.';
        emptyRow.appendChild(emptyCell);
        tbody.appendChild(emptyRow);
        return;
    }

    const formatNumber = (value) => {
        if (typeof value !== 'number' || !Number.isFinite(value)) {
            return '';
        }
        if (Number.isInteger(value)) {
            return value.toLocaleString('es-AR', { maximumFractionDigits: 0 });
        }
        const abs = Math.abs(value);
        const fractionDigits = abs < 1 ? 3 : 2;
        return value.toLocaleString('es-AR', {
            minimumFractionDigits: fractionDigits,
            maximumFractionDigits: fractionDigits,
        });
    };

    const isUnit = (value) => typeof value === 'string' && /(%|US\$|U\$S|\$|d[oó]lares|tCO2|m2|kWh|W|años?|USD)/i.test(value);
 codex/add-usertype-check-and-report-rendering-8qnaoy

    const applyRowClass = (rowElement, className) => {
        if (!rowElement || !className) {
            return;
        }
        className.split(/\s+/).forEach((cls) => {
            if (cls) {
                rowElement.classList.add(cls);
            }
        });
    };

 main

    tableData.forEach((row) => {
        const rawCells = Array.isArray(row) ? row : [row];
        const cleanedCells = rawCells.map((cell) => {
            if (cell === null || cell === undefined) {
                return null;
            }
            if (typeof cell === 'number') {
                return Number.isFinite(cell) ? cell : null;
            }
            if (typeof cell === 'string') {
                const trimmed = cell.trim();
                return trimmed ? trimmed : null;
            }
            return null;
        });

        if (cleanedCells.every((cell) => cell === null)) {
 codex/add-usertype-check-and-report-rendering-8qnaoy
            const spacerRow = document.createElement('tr');
            applyRowClass(spacerRow, 'spacer-row');
            for (let i = 0; i < 4; i += 1) {
                const td = document.createElement('td');
                td.innerHTML = '&nbsp;';
                spacerRow.appendChild(td);
            }
            tbody.appendChild(spacerRow);

 main
            return;
        }

        const label = typeof cleanedCells[0] === 'string' ? cleanedCells[0] : '';
        const rest = cleanedCells.slice(1);
        let value = '';
 codex/add-usertype-check-and-report-rendering-8qnaoy
        let numericValue = null;

main
        let unit = typeof cleanedCells[2] === 'string' ? cleanedCells[2] : '';
        const notes = [];

        if (typeof cleanedCells[1] === 'number') {
            value = formatNumber(cleanedCells[1]);
codex/add-usertype-check-and-report-rendering-8qnaoy
            numericValue = cleanedCells[1];

 main
        } else if (typeof cleanedCells[1] === 'string') {
            value = cleanedCells[1];
        }

        if (!value) {
            const fallbackNumber = rest.find((cell) => typeof cell === 'number');
            if (typeof fallbackNumber === 'number') {
                value = formatNumber(fallbackNumber);
 codex/add-usertype-check-and-report-rendering-8qnaoy
                numericValue = fallbackNumber;
 main
            } else {
                const fallbackText = rest.find((cell) => typeof cell === 'string' && !isUnit(cell));
                if (fallbackText) {
                    value = fallbackText;
                }
            }
        }

        if (!unit) {
            const fallbackUnit = rest.find((cell) => typeof cell === 'string' && isUnit(cell));
            if (fallbackUnit) {
                unit = fallbackUnit;
            }
        }

        rest.forEach((cell) => {
            if (!cell) {
                return;
            }
            if (typeof cell === 'string' && !isUnit(cell) && cell !== value) {
                notes.push(cell);
            }
        });

        const note = notes.join('\n');
        const tr = document.createElement('tr');

        const addFullRow = (className, text) => {
 codex/add-usertype-check-and-report-rendering-8qnaoy
            applyRowClass(tr, className);

            tr.classList.add(className);
 main
            const td = document.createElement('td');
            td.colSpan = 4;
            td.textContent = text;
            tr.appendChild(td);
            tbody.appendChild(tr);
        };
 codex/add-usertype-check-and-report-rendering-8qnaoy

        const normalizedLabel = (label || '').toLowerCase();

        if (normalizedLabel.includes('resultado del dimensionamiento') ||
            normalizedLabel.includes('datos técnicos') ||
            normalizedLabel.includes('resultados económicos') ||
            normalizedLabel.includes('contribución a la mitigación') ||
            normalizedLabel.startsWith('•')) {
            const className = normalizedLabel.includes('resultado del dimensionamiento')
                ? 'table-main-title'
                : normalizedLabel.startsWith('•')
                    ? 'subsection-header'
                    : 'section-header';
            addFullRow(className, label);
            return;
        }



        const normalizedLabel = (label || '').toLowerCase();

        if (normalizedLabel.includes('resultado del dimensionamiento') ||
            normalizedLabel.includes('datos técnicos') ||
            normalizedLabel.includes('resultados económicos') ||
            normalizedLabel.includes('contribución a la mitigación') ||
            normalizedLabel.startsWith('•')) {
            const className = normalizedLabel.includes('resultado del dimensionamiento')
                ? 'table-main-title'
                : normalizedLabel.startsWith('•')
                    ? 'subsection-header'
                    : 'section-header';
            addFullRow(className, label);
            return;
        }

 main
        if (!label && note) {
            addFullRow('note-row', note);
            return;
        }

        if (!label && !note && !value && !unit) {
 codex/add-usertype-check-and-report-rendering-8qnaoy
            addFullRow('spacer-row', '');
            return;
        }

        const displayValue = value || (label ? 'N/A' : '');
        const cells = [label || '', displayValue, unit || '', note || ''];

            return;
        }

        const cells = [label || '', value || '', unit || '', note || ''];
 main

        cells.forEach((cellValue, index) => {
            const td = document.createElement('td');
            td.textContent = cellValue;
            if (index === 3 && note) {
                td.classList.add('note-cell');
            }
            tr.appendChild(td);
        });

 codex/add-usertype-check-and-report-rendering-8qnaoy
        const highlightRow = label && (
            normalizedLabel.includes('saldo neto') ||
            normalizedLabel.includes('inversión inicial') ||
            normalizedLabel.includes('ahorro económico') ||
            normalizedLabel.includes('ahorro anual')
        );

        if (highlightRow) {
            tr.classList.add('highlight-row');
        }

        if (normalizedLabel.includes('efecto económico') || (numericValue !== null && Number.isFinite(numericValue) && numericValue < 0)) {
            tr.classList.remove('highlight-row');
            tr.classList.add('warning-row', 'negative-value');

        if (label && (normalizedLabel.includes('saldo neto') || normalizedLabel.includes('inversión inicial') || normalizedLabel.includes('ahorro económico'))) {
            tr.classList.add('highlight-row');
        } else if (normalizedLabel.includes('efecto económico')) {
            tr.classList.add('warning-row');
 main
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
    const energyData = {
        ...(datos.energy || {}),
        ...(datos.basic_report?.energy || {})
    };

    const canvasIds = ['winterDailyChart', 'summerDailyChart', 'monthlyComparisonChart'];
    const hasAnyCanvas = canvasIds.some((id) => document.getElementById(id));
    if (!hasAnyCanvas) {
        return;
    }

    const ensureTwelveValues = (arr, fallback = []) => {
        const source = Array.isArray(arr) ? arr : fallback;
        const normalized = Array.isArray(source) ? source.slice(0, 12) : [];
        if (normalized.length >= 12) {
            return normalized.slice(0, 12);
        }
        return normalized.concat(Array(12 - normalized.length).fill(0));
    };

    // --- Daily Profile Charts ---
    const renderDailyChart = (canvasId, title, consumptionData, generationData) => {
        const ctx = document.getElementById(canvasId)?.getContext('2d');
        if (!ctx) {
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
        const monthlyConsumption = ensureTwelveValues(
            energyData.monthlyConsumption,
            chartData.monthly_consumption
        );
        const monthlyAutoconsumption = ensureTwelveValues(
            energyData.monthlyAutoconsumption,
            chartData.monthly_autoconsumption
        );
        const monthlyInjection = ensureTwelveValues(
            energyData.monthlyInjection,
            chartData.monthly_injection
        );
        new Chart(monthlyCtx, {
            type: 'bar',
            data: {
                labels: monthLabels,
                datasets: [{
                    label: 'Consumo de energía de la red',
                    data: monthlyConsumption,
                    backgroundColor: '#d32f2f' // Red
                }, {
                    label: 'Autoconsumo de energía solar fotovoltaica',
                    data: monthlyAutoconsumption,
                    backgroundColor: '#fbc02d' // Yellow
                }, {
                    label: 'Sobrante de energía solar inyectada a la red',
                    data: monthlyInjection,
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
    }
}

function renderExpertCharts(datos) {
    console.log("Rendering expert charts with corrected data paths:", datos);
    const techData = datos.technical_data || {};
    const energyData = {
        ...(datos.energy || {}),
        ...(datos.expert_report?.energy || {})
    };

    const ensureTwelveValues = (arr, fallback = []) => {
        const source = Array.isArray(arr) ? arr : fallback;
        const normalized = Array.isArray(source) ? source.slice(0, 12) : [];
        if (normalized.length >= 12) {
            return normalized.slice(0, 12);
        }
        return normalized.concat(Array(12 - normalized.length).fill(0));
    };

    const monthlyConsumption = ensureTwelveValues(
        energyData.monthlyConsumption,
        datos.consumosMensualesFactura
    );
    const monthlyGeneration = ensureTwelveValues(
        energyData.monthlyGeneration,
        techData.monthly_generation
    );

    // --- Monthly Balance Bar Chart ---
    const monthlyCtx = document.getElementById('monthlyBalanceChart').getContext('2d');
    const monthLabels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    new Chart(monthlyCtx, {
        type: 'bar',
        data: {
            labels: monthLabels,
            datasets: [{
                label: 'Consumo mensual (kWh)',
                data: monthlyConsumption,
                backgroundColor: 'rgba(255, 99, 132, 0.5)',
            }, {
                label: 'Generación mensual (kWh)',
                data: monthlyGeneration,
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
                            if (Number.isFinite(context.parsed)) {
                                label += `${Math.round(context.parsed)}%`;
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
    const annualConsumption = energyData.annualConsumptionKWh
        ?? datos.consumo_anual_kwh
        ?? 0;
    const annualGenerationStart = energyData.annualGenerationKWh
        ?? techData.annual_generation
        ?? 0;
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
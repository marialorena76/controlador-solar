// Evitar ejecutar este archivo dos veces
if (window.__CS_LOADED__) { console.warn('calculador.js ya cargado'); }
if (window.__CS_LOADED__) throw new Error('CS_DUP_LOAD'); // corta la segunda ejecución
window.__CS_LOADED__ = true;

const API_BASE = "/api";

// --- Datos electrodomésticos ---
let electrodomesticosCategorias = {};
let appliancesCache = null;

const userSelections = {
  userType: null,
  location: null,
  city: null,
  installationType: null,
  incomeLevel: null,
  zonaInstalacionExpert: null,
  zonaInstalacionBasic: null,
  selectedZonaInstalacion: null,
  superficieRodea: { descripcion: null, valor: null },
  rugosidadSuperficie: { descripcion: null, valor: null },
  rotacionInstalacion: { descripcion: null, valor: null },
  alturaInstalacion: null,
  metodoCalculoRadiacion: null,
  modeloMetodoRadiacion: null,
  marcaPanel: null,
  potenciaPanelDeseada: null,
  modeloTemperaturaPanel: null,
  frecuenciaLluvias: null,
  focoPolvoCercano: null,
  metodoIngresoConsumoEnergia: null,
  electrodomesticos: {},
  totalMonthlyConsumption: 0,
  totalAnnualConsumption: 0,
  selectedCurrency: 'Pesos argentinos',
  panelesSolares: {
    tipo: null,
    cantidad: 0,
    modelo: null,
    potenciaNominal: 0,
    superficie: 0
  },
  inversor: {
    tipo: null,
    potenciaNominal: 0
  },
  perdidas: {
    eficienciaPanel: 0,
    eficienciaInversor: 0,
    factorPerdidas: 0
  }
};
const energiaSectionEl         = document.getElementById('energia-section');
const listaElectrodomesticosEl = document.getElementById('electrodomesticos-categorias');
const facturaMensualEl         = document.getElementById('consumo-factura-section');
const totalMensualEl           = document.getElementById('totalConsumoMensual');
const totalAnualEl             = document.getElementById('totalConsumoAnual');
const resultadosInformeEl      = document.getElementById('resultados-informe');

// helpers show/hide si no los tenés aún:
function show(el){ if(el) el.classList.remove('hidden'); }
function hide(el){ if(el) el.classList.add('hidden'); }

function mostrarCiudadSeleccionada(ciudad) {
  const textoCiudad = document.getElementById('ciudad-seleccionada-texto');
  if (textoCiudad) {
    textoCiudad.textContent = ciudad ? `Ciudad seleccionada: ${ciudad}` : '';
  }
}

function setCiudadSeleccionada(ciudad) {
  const normalizedCity =
    typeof ciudad === 'string' && ciudad.trim().length > 0
      ? ciudad.trim()
      : null;
  userSelections.city = normalizedCity;
  mostrarCiudadSeleccionada(normalizedCity);
}

async function cargarCiudades() {
  try {
    const resp = await fetch('/api/ciudades');
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json();

    const select = document.getElementById('ciudad-select');
    if (!select) {
      console.error('No existe #ciudad-select en el DOM');
      return;
    }

    // Dejar la opción por defecto
    select.innerHTML = '<option value="">Elegí una ciudad...</option>';

    (data.ciudades || []).forEach(nombre => {
      const opt = document.createElement('option');
      opt.value = nombre;
      opt.textContent = nombre;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error('Error cargando ciudades:', err);
    alert('No se pudieron cargar las ciudades desde el servidor.');
  }
}

function showScreen(screenId) {
  const screens = ['map-screen', 'data-form-screen'];
  screens.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (id === screenId) {
      el.style.display = id === 'map-screen' ? 'flex' : 'block';
    } else {
      el.style.display = 'none';
    }
  });
}

function showMapScreenFormSection(sectionIdToShow) {
  const sections = ['map-container-section', 'user-type-section', 'supply-section', 'income-section'];
  sections.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = id === sectionIdToShow ? 'block' : 'none';
  });
}

function setupNavigationButtons() {
  const basicUserBtn = document.getElementById('basic-user-button');
  const expertUserBtn = document.getElementById('expert-user-button');
  const residentialBtn = document.getElementById('residential-button');
  const commercialBtn = document.getElementById('commercial-button');
  const pymeBtn = document.getElementById('pyme-button');
  const incomeHighBtn = document.getElementById('income-high-button');
  const incomeMediumBtn = document.getElementById('income-medium-button');
  const incomeLowBtn = document.getElementById('income-low-button');
  const ciudadSelect = document.getElementById('ciudad-select');
  const confirmarCiudadButton = document.getElementById('confirmar-ciudad-button');
  const ciudadSeleccionadaTexto = document.getElementById('ciudad-seleccionada-texto');
  const userTypeSection = document.getElementById('user-type-section');
  const sidebar = document.querySelector('#data-form-screen .sidebar');

  if (basicUserBtn) {
    basicUserBtn.addEventListener('click', () => {
      userSelections.userType = 'Basico';
      if(sidebar) sidebar.classList.add('hidden');
      showMapScreenFormSection('supply-section');
    });
  }

  if (expertUserBtn) {
    expertUserBtn.addEventListener('click', () => {
      userSelections.userType = 'Experto';
      if(sidebar) sidebar.classList.remove('hidden');
      showMapScreenFormSection('supply-section');
    });
  }

  if (residentialBtn) {
    residentialBtn.addEventListener('click', () => {
      userSelections.installationType = 'Residencial';
      showMapScreenFormSection('income-section');
    });
  }

  if (commercialBtn) {
      commercialBtn.addEventListener('click', () => {
        userSelections.installationType = 'Comercial';
        showMapScreenFormSection('income-section');
      });
  }

  if (pymeBtn) {
      pymeBtn.addEventListener('click', () => {
        userSelections.installationType = 'PYME';
        showMapScreenFormSection('income-section');
      });
  }

  const handleIncomeSelection = (level) => {
    userSelections.incomeLevel = level;
    if (userSelections.userType === 'Basico') {
      showScreen('data-form-screen');
      document.getElementById('data-meteorologicos-section').classList.remove('hidden');
      document.getElementById('energia-section').classList.add('hidden');
    } else {
      showScreen('data-form-screen');
    }
  };

  if (incomeHighBtn) incomeHighBtn.addEventListener('click', () => handleIncomeSelection('ALTO'));
  if (incomeMediumBtn) incomeMediumBtn.addEventListener('click', () => handleIncomeSelection('MEDIO'));
  if (incomeLowBtn) incomeLowBtn.addEventListener('click', () => handleIncomeSelection('BAJO'));

  if (confirmarCiudadButton && ciudadSelect) {
    confirmarCiudadButton.addEventListener('click', async (e) => {
      e.preventDefault();
      const ciudad = ciudadSelect.value;
      if (!ciudad) {
        alert('Elegí una ciudad antes de continuar.');
        return;
      }

      try {
        const resp = await fetch('/api/guardar_ciudad', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ciudad })
        });
        const data = await resp.json();
        if (!resp.ok || !data.ok) {
          throw new Error(data.error || 'Error guardando ciudad');
        }

        userSelections.city = ciudad;
        if (ciudadSeleccionadaTexto) {
          ciudadSeleccionadaTexto.textContent = 'Ciudad seleccionada: ' + ciudad;
        }

        // Después de confirmar ciudad, mostrar la sección de tipo de usuario
        if (typeof showFormSection === 'function' && userTypeSection) {
          showFormSection(userTypeSection);
        } else {
          showMapScreenFormSection('user-type-section');
        }
      } catch (err) {
        console.error('Error al guardar ciudad:', err);
        alert('No se pudo guardar la ciudad en el servidor.');
      }
    });
  }
}

function setupZonaInstalacionStep() {
    const nextButton = document.getElementById('next-to-energia');
    const backButton = document.getElementById('back-to-income-from-zona');
    const zonaSection = document.getElementById('data-meteorologicos-section');
    if (nextButton) {
        nextButton.addEventListener('click', () => {
            const selectedZona = document.querySelector('input[name="zonaInstalacionNewScreen"]:checked');
            if (!selectedZona) {
                alert('Por favor, selecciona una zona de instalación.');
                return;
            }
            userSelections.zonaInstalacionBasic = selectedZona.value;
            zonaSection.classList.add('hidden');
            if (energiaSectionEl) energiaSectionEl.classList.remove('hidden');
            initEnergyForBasic();
        });
    }

    if (backButton) {
        backButton.addEventListener('click', () => {
            showScreen('map-screen');
            showMapScreenFormSection('income-section');
        });
    }
}




async function initEnergyForBasic(){
  if(!energiaSectionEl) return;
  if(resultadosInformeEl){
    hide(resultadosInformeEl);
    resultadosInformeEl.innerHTML = '';
  }
  const tipo = (userSelections?.installationType || '').toLowerCase();

  if(tipo === 'residencial'){
    try{
      await ensureAppliancesLoaded();
      renderAppliances(appliancesCache);
      show(listaElectrodomesticosEl);
      hide(facturaMensualEl);
    }catch(err){
      console.error('[ENERGIA] No se pudo cargar electrodomésticos:', err);
      if(listaElectrodomesticosEl){
        listaElectrodomesticosEl.innerHTML = '<p class="energy-error">No se pudo cargar la información de electrodomésticos.</p>';
      }
    }
  }else{
    ensureMonthlyInputsHandlers();
    hide(listaElectrodomesticosEl);
    show(facturaMensualEl);
  }

  show(energiaSectionEl);
  energiaSectionEl.scrollIntoView({behavior:'smooth'});
}

async function ensureAppliancesLoaded(){
  if(appliancesCache) return appliancesCache;
  const r = await fetch('consumos_electrodomesticos.json');
  if(!r.ok) throw new Error(`No se pudo cargar consumos_electrodomesticos.json: ${r.status}`);
  appliancesCache = await r.json();
  electrodomesticosCategorias = appliancesCache;
  return appliancesCache;
}

function renderAppliances(data){
  if(!listaElectrodomesticosEl) return;
  listaElectrodomesticosEl.innerHTML = '';
  for(const categoria in data){
    const items = data[categoria] || [];
    const cat = document.createElement('div');
    cat.className = 'accordion-item';
    const catId = categoria.replace(/\s+/g,'-').toLowerCase();
    cat.innerHTML = `
      <h2 class="accordion-header" id="heading-${catId}">
        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse"
          data-bs-target="#collapse-${catId}" aria-expanded="false" aria-controls="collapse-${catId}">
          ${categoria}
        </button>
      </h2>
      <div id="collapse-${catId}" class="accordion-collapse collapse" aria-labelledby="heading-${catId}"
           data-bs-parent="#electrodomesticos-categorias">
        <div class="accordion-body"></div>
      </div>`;
    const body = cat.querySelector('.accordion-body');

    items.forEach(item=>{
      const kwhMes = ((Number(item.watts||0) * Number(item.hoursPerDay||0))/1000) * (item.daysPerMonth ?? 30);
      const row = document.createElement('div');
      row.className = 'appliance-item-row d-flex justify-content-between align-items-center mb-2';
      row.innerHTML = `
        <label class="form-check-label">${item.name || 'Item'}</label>
        <div class="quantity-control d-flex align-items-center" style="width: 120px;">
          <button type="button" class="btn btn-outline-secondary btn-sm quantity-btn" data-action="decrease">-</button>
          <input type="number" class="form-control form-control-sm text-center appliance-quantity"
                 value="0" min="0"
                 data-item-name="${item.name || ''}"
                 data-kwh-mes="${kwhMes}">
          <button type="button" class="btn btn-outline-secondary btn-sm quantity-btn" data-action="increase">+</button>
        </div>`;
      body.appendChild(row);
    });

    listaElectrodomesticosEl.appendChild(cat);
  }

  listaElectrodomesticosEl.addEventListener('click', (ev)=>{
    if(ev.target.classList.contains('quantity-btn')){
      const input = ev.target.parentElement.querySelector('.appliance-quantity');
      let v = parseInt(input.value, 10) || 0;
      v += (ev.target.dataset.action === 'increase') ? 1 : (v>0 ? -1 : 0);
      input.value = v;
      input.dispatchEvent(new Event('change',{bubbles:true}));
    }
  });

  listaElectrodomesticosEl.addEventListener('change', (ev)=>{
    if(ev.target.classList.contains('appliance-quantity')){
      calcularConsumoTotal();
    }
  });

  calcularConsumoTotal();
}

function calcularConsumoTotal(){
  let totalKwhMes = 0;
  userSelections.electrodomesticos = {};
  document.querySelectorAll('.appliance-quantity').forEach(input=>{
    const q = parseInt(input.value,10)||0;
    const kwh = parseFloat(input.dataset.kwhMes)||0;
    const name = input.dataset.itemName || '';
    if(q>0){
      totalKwhMes += q * kwh;
      userSelections.electrodomesticos[name] = q;
    }
  });
  userSelections.totalMonthlyConsumption = totalKwhMes;
  userSelections.totalAnnualConsumption = totalKwhMes * 12;
  if(totalMensualEl) totalMensualEl.value = (totalKwhMes).toFixed(2);
  if(totalAnualEl)   totalAnualEl.value   = (totalKwhMes*12).toFixed(2);
}

let monthlyInputsWired = false;
function ensureMonthlyInputsHandlers(){
  if(monthlyInputsWired) return;
  const ids = ['consumo-enero','consumo-febrero','consumo-marzo','consumo-abril','consumo-mayo','consumo-junio','consumo-julio','consumo-agosto','consumo-septiembre','consumo-octubre','consumo-noviembre','consumo-diciembre'];
  ids.forEach(id=>{
    const el = document.getElementById(id);
    if(el){
      el.addEventListener('input', ()=>{
        let sum = 0;
        ids.forEach(ix=> sum += Number(document.getElementById(ix)?.value || 0));
        const prom = sum/12;
        userSelections.totalMonthlyConsumption = Math.round(prom*100)/100;
        userSelections.totalAnnualConsumption  = Math.round(sum);
        if(totalMensualEl) totalMensualEl.value = userSelections.totalMonthlyConsumption;
        if(totalAnualEl)   totalAnualEl.value   = userSelections.totalAnnualConsumption;
      });
    }
  });
  monthlyInputsWired = true;
}

document.getElementById('next-to-paneles')?.addEventListener('click', async (e)=>{
  e.preventDefault();

  // recalcular por las dudas
  if(typeof calcularConsumoTotal === 'function') calcularConsumoTotal();

    // Validaciones mínimas
    if(!userSelections.city){
      alert('Falta confirmar la ciudad.');
      return;
    }
    const anual = Number(userSelections.totalAnnualConsumption||0);
    if(!anual || anual <= 0){
      alert('El consumo anual es 0. Ingresá cantidades/valores.');
    return;
  }

  await generarInformeDesdeFrontend();
});

async function generarInformeDesdeFrontend(){
  const target = resultadosInformeEl;
  if(!target) return;
  show(target);
  target.innerHTML = '<div style="padding:12px">Generando informe…</div>';

  try{
    const res = await fetch('/api/generar_informe', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(userSelections)
    });
    const text = await res.text().catch(()=> '');
    if(!res.ok) throw new Error(`Error del servidor: ${res.status} ${text}`);

    const data = JSON.parse(text || '{}');
    if(data.error) throw new Error(data.error);

    let tablaHTML = '';
    if(Array.isArray(data.tabla_resultados)){
      tablaHTML = `
        <div style="overflow:auto; max-height:340px; border:1px solid #e5e7eb; margin-top:8px">
          <table style="width:100%; border-collapse:collapse">
            ${data.tabla_resultados.map(r =>
              `<tr>${(r||[]).map(c=>`<td style="border:1px solid #e5e7eb; padding:6px;">${c ?? ''}</td>`).join('')}</tr>`
            ).join('')}
          </table>
        </div>`;
    }
    target.innerHTML = `<h2>Informe</h2>${tablaHTML}`;
    target.scrollIntoView({behavior:'smooth'});

  }catch(err){
    console.error('[INFORME] Error:', err);
    target.innerHTML = `<div style="color:#b91c1c">${err.message}</div>`;
  }
}


document.addEventListener('DOMContentLoaded', () => {
    setupNavigationButtons();
    setupZonaInstalacionStep();
    showScreen('map-screen');
    showMapScreenFormSection('map-container-section');
    cargarCiudades();

    try {
      const storedCity = localStorage.getItem('ciudadSeleccionada');
      if (storedCity) {
        setCiudadSeleccionada(storedCity);
      }
    } catch (error) {
      console.warn('No se pudo recuperar la ciudad almacenada:', error);
    }

    const backToZonaButton = document.getElementById('back-to-datos');
    if (backToZonaButton) {
        backToZonaButton.addEventListener('click', () => {
            document.getElementById('energia-section').classList.add('hidden');
            document.getElementById('data-meteorologicos-section').classList.remove('hidden');
        });
    }
});

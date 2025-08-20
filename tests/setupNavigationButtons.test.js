const fs = require('fs');
const vm = require('vm');

function extractFunction(code, name) {
  const start = code.indexOf(`function ${name}`);
  if (start === -1) throw new Error('Function not found');
  let i = start;
  while (code[i] !== '{') i++;
  let depth = 1;
  i++;
  for (; i < code.length; i++) {
    if (code[i] === '{') depth++;
    else if (code[i] === '}') {
      depth--;
      if (depth === 0) { i++; break; }
    }
  }
  return code.slice(start, i);
}

test('setupNavigationButtons attaches listeners', () => {
  const code = fs.readFileSync('calculador.js', 'utf8');
  const fnCode = extractFunction(code, 'setupNavigationButtons');

  const elements = {};
  function createElement(id) {
    elements[id] = { addEventListener: jest.fn(), style: {} };
    return elements[id];
  }

  const context = {
    document: {
      getElementById: (id) => elements[id] || null,
      querySelector: () => null,
      body: { innerHTML: '' },
    },
    userSelections: {
      superficieRodea: { valor: null },
      rugosidadSuperficie: { valor: null },
      panelesSolares: {},
      inversor: {},
      perdidas: {},
    },
    saveUserSelections: jest.fn(),
    showMapScreenFormSection: jest.fn(),
    showScreen: jest.fn(),
    updateStepIndicator: jest.fn(),
    initSuperficieSection: jest.fn(),
    initElectrodomesticosSection: jest.fn(),
    initRugosidadSection: jest.fn(),
    initRotacionSection: jest.fn(),
    initMetodoCalculoSection: jest.fn(),
    initModeloMetodoSection: jest.fn(),
    initPanelesSectionExpert: jest.fn(),
    initInversorSection: jest.fn(),
    initPerdidasSection: jest.fn(),
    initFocoPolvoOptions: jest.fn(),
    initFrecuenciaLluviasOptions: jest.fn(),
    escribirPotenciaPanelEnExcel: jest.fn(),
    alert: jest.fn(),
  };

  const basicBtn = createElement('basic-user-button');
  const residentialBtn = createElement('residential-button');
  createElement('moneda');
  context.potenciaPanelDeseadaInput = createElement('potencia-panel-deseada-input');

  vm.createContext(context);
  vm.runInContext(fnCode, context);
  context.setupNavigationButtons();

  expect(basicBtn.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
  expect(residentialBtn.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
});

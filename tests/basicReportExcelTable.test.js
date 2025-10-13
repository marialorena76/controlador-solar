const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

jest.setTimeout(120000);

const API_BASE_URL = 'http://127.0.0.1:5000';

function loadPayload() {
  const payloadPath = path.join(__dirname, '..', 'test_payload.json');
  const payload = JSON.parse(fs.readFileSync(payloadPath, 'utf-8'));
  payload.userType = 'basico';
  return payload;
}

test('POST /api/generar_informe returns a valid basic report', async () => {
  const payload = loadPayload();
  // Ensure the payload is set to 'basico' for this test
  payload.userType = 'basico';
  // The basic engine uses the `electrodomesticos` field, not the expert payload fields.
  // We'll add a sample appliance to ensure consumption is non-zero.
  payload.electrodomesticos = { "Heladera": 1 };


  const response = await axios.post(`${API_BASE_URL}/api/generar_informe`, payload, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 120000,
  });

  // For a 'basico' user, the pure Python engine is used, which returns a flat object.
  // The test should validate this structure, not the Excel table structure.
  expect(response.status).toBe(200);
  expect(response.data).toBeDefined();
  // Check for a key metric from the basic report to confirm it was generated.
  // The new endpoint returns 'consumo_base' instead of 'consumo_anual'.
  expect(response.data.consumo_base).toBeDefined();
  // Ensure the excel_table is NOT present for a basic report.
  expect(response.data.excel_table).toBeUndefined();
});

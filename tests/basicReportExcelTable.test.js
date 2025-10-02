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

test('POST /api/generar_informe incluye la tabla básica del Excel', async () => {
  const payload = loadPayload();

  const response = await axios.post(`${API_BASE_URL}/api/generar_informe`, payload, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 120000,
  });

  expect(response.status).toBe(200);
  expect(response.data.basic_report).toBeDefined();
  expect(Array.isArray(response.data.basic_report.excel_table)).toBe(true);

  const expectedTablePath = path.join(__dirname, '..', 'test_basic_report_output.json');
  const expectedTable = JSON.parse(fs.readFileSync(expectedTablePath, 'utf-8'));
  expect(response.data.basic_report.excel_table).toEqual(expectedTable);
});

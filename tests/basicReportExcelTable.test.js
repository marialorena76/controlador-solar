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

  const expectedTableJson = execSync(`python - <<'PY'
import pandas as pd
import json
import math
from pathlib import Path

excel_path = Path('backend') / 'Calculador Solar - web 06-24_con ayuda - modificaciones 2025_5.xlsx'
df_resultados = pd.read_excel(excel_path, sheet_name='Resultados')
subset = df_resultados.iloc[2:56, 1:12]
table = subset.where(pd.notna(subset), None).values.tolist()

def clean_nan(obj):
    if isinstance(obj, list):
        return [clean_nan(elem) for elem in obj]
    if isinstance(obj, float) and math.isnan(obj):
        return None
    return obj

print(json.dumps(clean_nan(table), ensure_ascii=False))
PY
`, { encoding: 'utf-8' });

  const expectedTable = JSON.parse(expectedTableJson);
  expect(response.data.basic_report.excel_table).toEqual(expectedTable);
});

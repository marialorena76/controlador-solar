(function (global) {
  const DEFAULT_EMPTY_MESSAGE = 'No se encontraron datos para mostrar el informe básico detallado.';
  const DEFAULT_COLUMN_COUNT = 4;
  const UNIT_REGEX = /(%|US\$|U\$S|\$|d[oó]lares|tCO2|m2|kWh|W|años?|USD)/i;

  function formatNumber(value) {
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
  }

  function cleanCellValue(cellValue) {
    if (cellValue === null || cellValue === undefined) {
      return null;
    }

    if (typeof cellValue === 'number') {
      return Number.isFinite(cellValue) ? cellValue : null;
    }

    if (typeof cellValue === 'string') {
      const trimmed = cellValue.trim();
      return trimmed ? trimmed : null;
    }

    return null;
  }

  function isUnit(value) {
    if (typeof value !== 'string') {
      return false;
    }
    return UNIT_REGEX.test(value);
  }

  function deriveRowClass(label, note) {
    const safeLabel = (label || '').toLowerCase();
    const safeNote = (note || '').toLowerCase();

    if (!safeLabel && safeNote) {
      return 'note-row';
    }

    if (safeLabel.includes('resultado del dimensionamiento')) {
      return 'table-main-title';
    }

    if (
      safeLabel.includes('datos técnicos') ||
      safeLabel.includes('resultados económicos') ||
      safeLabel.includes('contribución a la mitigación')
    ) {
      return 'section-header';
    }

    if (safeLabel.startsWith('•')) {
      return 'subsection-header';
    }

    if (
      safeLabel.includes('saldo neto') ||
      safeLabel.includes('inversión inicial') ||
      safeLabel.includes('ahorro económico')
    ) {
      return 'highlight-row';
    }

    if (safeLabel.includes('efecto económico')) {
      return 'warning-row';
    }

    return null;
  }

  function normalizeRow(row, columnCount) {
    const baseRow = Array.isArray(row) ? row : [row];
    const cleaned = baseRow.map(cleanCellValue);

    const hasMeaningfulContent = cleaned.some((cell) => {
      if (cell === null) {
        return false;
      }
      if (typeof cell === 'number') {
        return true;
      }
      return typeof cell === 'string' && cell.trim() !== '';
    });

    if (!hasMeaningfulContent) {
      return null;
    }

    const label = typeof cleaned[0] === 'string' ? cleaned[0] : '';
    const rest = cleaned.slice(1);
    const usedRestIndices = new Set();

    let value = '';
    if (typeof cleaned[1] === 'number') {
      value = formatNumber(cleaned[1]);
      usedRestIndices.add(0);
    } else if (typeof cleaned[1] === 'string') {
      value = cleaned[1];
      usedRestIndices.add(0);
    }

    if (!value) {
      for (let i = 0; i < rest.length; i += 1) {
        const cell = rest[i];
        if (typeof cell === 'number') {
          value = formatNumber(cell);
          usedRestIndices.add(i);
          break;
        }
        if (!value && typeof cell === 'string' && !isUnit(cell)) {
          value = cell;
          usedRestIndices.add(i);
          break;
        }
      }
    }

    let unit = typeof cleaned[2] === 'string' ? cleaned[2] : '';
    if (unit) {
      usedRestIndices.add(1);
    }

    if (!unit) {
      for (let i = 0; i < rest.length; i += 1) {
        if (usedRestIndices.has(i)) {
          continue;
        }
        const cell = rest[i];
        if (typeof cell === 'string' && isUnit(cell)) {
          unit = cell;
          usedRestIndices.add(i);
          break;
        }
      }
    }

    const noteParts = [];
    for (let i = 0; i < rest.length; i += 1) {
      if (usedRestIndices.has(i)) {
        continue;
      }
      const cell = rest[i];
      if (typeof cell === 'string' && cell.trim() !== '') {
        noteParts.push(cell);
        usedRestIndices.add(i);
      }
    }

    const note = noteParts.join('\n');
    const rowClass = deriveRowClass(label, note);

    if (!label && !note && !value && !unit) {
      return null;
    }

    if (rowClass === 'table-main-title' || rowClass === 'section-header' || rowClass === 'subsection-header') {
      const fullText = label || note;
      return {
        type: 'full',
        className: rowClass,
        cells: [fullText],
      };
    }

    if (rowClass === 'note-row') {
      const fullText = note || label;
      return {
        type: 'full',
        className: 'note-row',
        cells: [fullText],
      };
    }

    const resolvedColumns = columnCount || DEFAULT_COLUMN_COUNT;
    const cells = new Array(resolvedColumns).fill('');
    cells[0] = label || '';
    cells[1] = value || '';
    cells[2] = unit || '';
    if (note) {
      cells[3] = note;
    }

    return {
      type: 'standard',
      className: rowClass,
      cells,
      noteColumnIndex: note ? 3 : null,
    };
  }

  function renderRows(tbody, tableData, options = {}) {
    if (!tbody) {
      return { rendered: false };
    }

    const { emptyMessage = DEFAULT_EMPTY_MESSAGE } = options;
    const resolvedColumnCount = options.columnCount && options.columnCount > 0
      ? options.columnCount
      : DEFAULT_COLUMN_COUNT;

    tbody.innerHTML = '';

    if (!Array.isArray(tableData) || tableData.length === 0) {
      const emptyRow = document.createElement('tr');
      const emptyCell = document.createElement('td');
      emptyCell.colSpan = resolvedColumnCount;
      emptyCell.textContent = emptyMessage;
      emptyRow.appendChild(emptyCell);
      tbody.appendChild(emptyRow);
      return { rendered: true, rows: 0 };
    }

    const processedRows = tableData
      .map((row) => normalizeRow(row, resolvedColumnCount))
      .filter((row) => row !== null);

    if (processedRows.length === 0) {
      const emptyRow = document.createElement('tr');
      const emptyCell = document.createElement('td');
      emptyCell.colSpan = resolvedColumnCount;
      emptyCell.textContent = emptyMessage;
      emptyRow.appendChild(emptyCell);
      tbody.appendChild(emptyRow);
      return { rendered: true, rows: 0 };
    }

    processedRows.forEach((row) => {
      const tr = document.createElement('tr');
      if (row.className) {
        tr.classList.add(row.className);
      }

      if (row.type === 'full') {
        const td = document.createElement('td');
        td.colSpan = resolvedColumnCount;
        td.textContent = row.cells[0] || '';
        tr.appendChild(td);
      } else {
        row.cells.forEach((cellValue, cellIndex) => {
          const td = document.createElement('td');
          if (cellValue) {
            td.textContent = cellValue;
          }
          if (row.noteColumnIndex === cellIndex) {
            td.classList.add('note-cell');
          }
          tr.appendChild(td);
        });
      }

      tbody.appendChild(tr);
    });

    return { rendered: true, rows: processedRows.length };
  }

  function renderTableInContainer(container, tableData, options = {}) {
    if (!container) {
      return { rendered: false };
    }

    container.innerHTML = '';

    const table = document.createElement('table');
    table.className = options.tableClass || 'report-table basic-excel-table';
    const tbody = document.createElement('tbody');

    if (options.tbodyId) {
      tbody.id = options.tbodyId;
    }

    table.appendChild(tbody);
    container.appendChild(table);

    const renderResult = renderRows(tbody, tableData, options);
    return { rendered: renderResult.rendered, rows: renderResult.rows, table, tbody };
  }

  global.BasicReportTableHelper = {
    renderRows,
    renderTableInContainer,
  };
})(typeof window !== 'undefined' ? window : this);

import * as XLSX from 'xlsx'

export interface ExportColumn {
  key: string
  header: string
  width?: number
}

/**
 * Build a multi-sheet Excel workbook and return it as a Buffer.
 * For use in Route Handlers (server-side).
 */
export function buildWorkbook(sheets: Array<{ name: string; data: Record<string, unknown>[] }>): Blob {
  const workbook = XLSX.utils.book_new()

  for (const sheet of sheets) {
    const worksheet = XLSX.utils.json_to_sheet(sheet.data)
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name)
  }

  const uint8 = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Uint8Array
  return new Blob([uint8])
}

export function exportToExcel<T extends Record<string, unknown>>(
  data: T[],
  columns: ExportColumn[],
  filename: string
): void {
  const headers = columns.map((c) => c.header)
  const rows = data.map((row) =>
    columns.map((col) => {
      const value = row[col.key]
      if (value instanceof Date) return value.toLocaleDateString('en-GB')
      if (value === null || value === undefined) return ''
      return String(value)
    })
  )

  const worksheetData = [headers, ...rows]
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)

  // Set column widths
  worksheet['!cols'] = columns.map((col) => ({ wch: col.width ?? 20 }))

  // Style header row bold
  const range = XLSX.utils.decode_range(worksheet['!ref'] ?? 'A1')
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: col })
    if (!worksheet[cellRef]) continue
    worksheet[cellRef].s = { font: { bold: true } }
  }

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')
  XLSX.writeFile(workbook, `${filename}.xlsx`)
}

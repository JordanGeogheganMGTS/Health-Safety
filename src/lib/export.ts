import * as XLSX from 'xlsx'

export interface ExportColumn {
  key: string
  header: string
  width?: number
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

import type { LegalTableData } from '../types'

interface LegalInfoTableProps {
  data: LegalTableData
}

export function LegalInfoTable({ data }: LegalInfoTableProps) {
  return (
    <div className="mb-4 overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {data.headers.map((header, i) => (
              <th
                key={i}
                className="border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3 text-left font-medium text-[var(--color-text-primary)]"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td
                  key={j}
                  className="border border-[var(--color-border)] p-3 text-[var(--color-text-secondary)]"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

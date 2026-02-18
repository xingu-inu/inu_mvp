import type { LegalSection as LegalSectionType } from '../types'
import { LegalInfoTable } from './legal-info-table'

interface LegalSectionProps {
  section: LegalSectionType
}

export function LegalSection({ section }: LegalSectionProps) {
  return (
    <section id={section.id} className="scroll-mt-24">
      <h2 className="mb-3 text-lg font-semibold text-[var(--color-text-primary)]">
        제{section.articleNumber}조 ({section.title})
      </h2>
      {section.content.map((paragraph, i) => (
        <p key={i} className="mb-3 text-[15px] leading-relaxed text-[var(--color-text-secondary)]">
          {paragraph}
        </p>
      ))}
      {section.subsections && (
        <ol className="mb-4 list-none space-y-2 pl-1">
          {section.subsections.map((sub) => (
            <li
              key={sub.number}
              className="text-[15px] leading-relaxed text-[var(--color-text-secondary)]"
            >
              <span className="mr-1 text-[var(--color-text-tertiary)]">{sub.number}.</span>{' '}
              {sub.content}
            </li>
          ))}
        </ol>
      )}
      {section.table && <LegalInfoTable data={section.table} />}
    </section>
  )
}

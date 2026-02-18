import type { Metadata } from 'next'

import { LegalPageHeader, LegalSection, LegalTableOfContents } from '@/features/legal/components'
import { termsDocument } from '@/features/legal/data/terms-content'

export const metadata: Metadata = {
  title: '이용약관 | inu',
  description: 'inu 서비스 이용약관',
}

export default function TermsPage() {
  return (
    <>
      <LegalPageHeader
        title={termsDocument.title}
        effectiveDate={termsDocument.effectiveDate}
        version={termsDocument.version}
      />
      <LegalTableOfContents sections={termsDocument.sections} />
      <div className="space-y-10">
        {termsDocument.sections.map((section) => (
          <LegalSection key={section.id} section={section} />
        ))}
      </div>
    </>
  )
}

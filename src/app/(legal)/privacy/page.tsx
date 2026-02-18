import type { Metadata } from 'next'

import { LegalPageHeader, LegalSection, LegalTableOfContents } from '@/features/legal/components'
import { privacyDocument } from '@/features/legal/data/privacy-content'

export const metadata: Metadata = {
  title: '개인정보처리방침 | inu',
  description: 'inu 개인정보처리방침 - 개인정보보호법 제30조에 따른 공개',
}

export default function PrivacyPolicyPage() {
  return (
    <>
      <LegalPageHeader
        title={privacyDocument.title}
        effectiveDate={privacyDocument.effectiveDate}
        version={privacyDocument.version}
      />
      <LegalTableOfContents sections={privacyDocument.sections} />
      <div className="space-y-10">
        {privacyDocument.sections.map((section) => (
          <LegalSection key={section.id} section={section} />
        ))}
      </div>
    </>
  )
}

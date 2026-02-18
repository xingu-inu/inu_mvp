export interface LegalDocument {
  title: string
  effectiveDate: string
  version: string
  sections: LegalSection[]
}

export interface LegalSection {
  id: string
  articleNumber: number
  title: string
  content: string[]
  subsections?: LegalSubsection[]
  table?: LegalTableData
}

export interface LegalSubsection {
  number: number
  content: string
}

export interface LegalTableData {
  headers: string[]
  rows: string[][]
}

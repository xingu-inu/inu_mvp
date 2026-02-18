import { InlineGroupForm } from './inline-group-form'

interface InlineGroupCreateProps {
  goalId: string
  onDone: () => void
}

export function InlineGroupCreate({ goalId, onDone }: InlineGroupCreateProps) {
  return <InlineGroupForm mode="create" goalId={goalId} onDone={onDone} />
}

import { InlineGroupForm } from './inline-group-form'

interface InlineGroupEditProps {
  goalId: string
  groupId: string
  onDone: () => void
}

export function InlineGroupEdit({ goalId, groupId, onDone }: InlineGroupEditProps) {
  return <InlineGroupForm mode="edit" goalId={goalId} groupId={groupId} onDone={onDone} />
}

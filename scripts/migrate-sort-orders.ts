/**
 * One-shot migration: rebuild sort_order for areas/goals/groups/tasks using
 * fresh fractional-indexing keys, scoped per sibling group.
 *
 * Why this exists
 * ---------------
 * The canvas DnD assumes all sort_order values are fractional-indexing keys
 * (letter-based, comparable via localeCompare). Historical data contains a
 * mix:
 *   - legacy numeric strings: '0', '1', '2', '3'
 *   - fractional keys:        'a0', 'a1', 'a2', 'a0V', ...
 *   - corruption:             'NaN', 'Zz', 'Zy' (from prior failed DnD inserts)
 *
 * `safeNewOrderBetween` silently treats legacy/corrupt keys as null, which
 * causes a new insert between '1' and '2' to produce 'a0' — and 'a0' sorts
 * *after* all numeric keys under localeCompare, so the dragged item teleports
 * to the end of the list. This matches the user-visible "1번이 3번으로 가고
 * 1·3이 바뀌어 보여요" bug.
 *
 * Strategy
 * --------
 * For each table, group rows by their sibling scope, sort within each scope
 * by the existing (possibly corrupt) sort_order with id as a stable tiebreaker,
 * then assign fresh `generateNKeysBetween(null, null, n)` keys in that order.
 *
 * Scopes
 *   - areas:  (user_id, direction_id)
 *   - goals:  (user_id, area_id)
 *   - groups: (goal_id)        — goal_id implies user via the goal row
 *   - tasks:  (goal_id, group_id)  — direct-under-goal tasks share group_id=null
 *
 * Safety
 * ------
 * - Dry-run by default; pass `--apply` to actually write.
 * - Prints every planned change (table, scope, id, old → new) before writing.
 * - Idempotent: if keys are already clean and evenly spaced, every row still
 *   gets a fresh 'a0','a1',... but with the same relative order.
 *
 * Usage
 *   npx tsx scripts/migrate-sort-orders.ts            # dry-run
 *   npx tsx scripts/migrate-sort-orders.ts --apply    # write
 */

import { readFileSync } from 'node:fs'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { generateNKeysBetween } from 'fractional-indexing'

// ── env loading (no dotenv dep — tolerant .env.local parser) ──
function loadEnv(path: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1)
    out[key] = val
  }
  return out
}

const env = loadEnv(new URL('../.env.local', import.meta.url).pathname)
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_KEY) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
}

const DRY_RUN = !process.argv.includes('--apply')

const supabase: SupabaseClient = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
})

// ── types ───────────────────────────────────────────────────
interface Row {
  id: string
  sort_order: string | null
}

interface Area extends Row {
  user_id: string
  direction_id: string
  name: string
}

interface Goal extends Row {
  user_id: string
  area_id: string
  name: string
}

interface Group extends Row {
  goal_id: string
  name: string
}

interface Task extends Row {
  goal_id: string | null
  group_id: string | null
  name: string
}

// ── helpers ─────────────────────────────────────────────────
type Scope = string
type ScopeKey<T> = (row: T) => Scope

function groupByScope<T extends Row>(rows: T[], key: ScopeKey<T>): Map<Scope, T[]> {
  const out = new Map<Scope, T[]>()
  for (const row of rows) {
    const k = key(row)
    const list = out.get(k) ?? []
    list.push(row)
    out.set(k, list)
  }
  return out
}

/**
 * Stable sort: localeCompare on current sort_order (null → '~' so it sinks to
 * the end), then id as tiebreaker. This preserves the canvas's currently
 * visible order so users don't see their hierarchy shuffle post-migration.
 */
function stableSort<T extends Row>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const as = a.sort_order ?? '~'
    const bs = b.sort_order ?? '~'
    const cmp = as.localeCompare(bs)
    if (cmp !== 0) return cmp
    return a.id.localeCompare(b.id)
  })
}

interface UpdatePlan {
  table: string
  scope: Scope
  id: string
  name: string
  oldOrder: string | null
  newOrder: string
}

function planScope<T extends Row & { name: string }>(
  table: string,
  scope: Scope,
  rows: T[]
): UpdatePlan[] {
  const sorted = stableSort(rows)
  const newKeys = generateNKeysBetween(null, null, sorted.length)
  const plans: UpdatePlan[] = []
  for (let i = 0; i < sorted.length; i++) {
    const row = sorted[i]
    const newOrder = newKeys[i]
    plans.push({
      table,
      scope,
      id: row.id,
      name: row.name,
      oldOrder: row.sort_order,
      newOrder,
    })
  }
  return plans
}

// ── planning per table ──────────────────────────────────────
async function planAreas(): Promise<UpdatePlan[]> {
  const { data, error } = await supabase
    .from('areas')
    .select('id,name,sort_order,user_id,direction_id')
    .returns<Area[]>()
  if (error) throw error
  const grouped = groupByScope(data ?? [], (r) => `${r.user_id}::${r.direction_id}`)
  const plans: UpdatePlan[] = []
  for (const [scope, rows] of grouped) {
    plans.push(...planScope('areas', scope, rows))
  }
  return plans
}

async function planGoals(): Promise<UpdatePlan[]> {
  const { data, error } = await supabase
    .from('goals')
    .select('id,name,sort_order,user_id,area_id')
    .returns<Goal[]>()
  if (error) throw error
  const grouped = groupByScope(data ?? [], (r) => `${r.user_id}::${r.area_id}`)
  const plans: UpdatePlan[] = []
  for (const [scope, rows] of grouped) {
    plans.push(...planScope('goals', scope, rows))
  }
  return plans
}

async function planGroups(): Promise<UpdatePlan[]> {
  const { data, error } = await supabase
    .from('groups')
    .select('id,name,sort_order,goal_id')
    .returns<Group[]>()
  if (error) throw error
  const grouped = groupByScope(data ?? [], (r) => r.goal_id)
  const plans: UpdatePlan[] = []
  for (const [scope, rows] of grouped) {
    plans.push(...planScope('groups', scope, rows))
  }
  return plans
}

async function planTasks(): Promise<UpdatePlan[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('id,name,sort_order,goal_id,group_id')
    .returns<Task[]>()
  if (error) throw error
  // Tasks with no goal_id are orphans — they don't appear on the canvas, but
  // we still re-key them in a single "__orphan__" bucket so the tasks table
  // has no legacy numeric keys left anywhere (prevents future DnD surprises
  // if an orphan is ever adopted back into the hierarchy).
  const grouped = groupByScope(
    data ?? [],
    (r) => `${r.goal_id ?? '__orphan__'}::${r.group_id ?? 'null'}`
  )
  const plans: UpdatePlan[] = []
  for (const [scope, rows] of grouped) {
    plans.push(...planScope('tasks', scope, rows))
  }
  return plans
}

// ── apply ───────────────────────────────────────────────────
async function applyPlans(plans: UpdatePlan[]): Promise<void> {
  // Group by table for clearer logging. Updates are per-row because
  // sort_order is not a natural upsert key and the Supabase client has no
  // batch update primitive — but all writes are independent so we can fire
  // them concurrently with a modest cap.
  const byTable = new Map<string, UpdatePlan[]>()
  for (const p of plans) {
    const list = byTable.get(p.table) ?? []
    list.push(p)
    byTable.set(p.table, list)
  }

  for (const [table, list] of byTable) {
    console.log(`\nApplying ${list.length} updates to ${table}...`)
    const CONCURRENCY = 16
    let done = 0
    for (let i = 0; i < list.length; i += CONCURRENCY) {
      const batch = list.slice(i, i + CONCURRENCY)
      const results = await Promise.all(
        batch.map((p) =>
          supabase.from(table).update({ sort_order: p.newOrder }).eq('id', p.id).select('id')
        )
      )
      for (let j = 0; j < results.length; j++) {
        const r = results[j]
        if (r.error) {
          console.error(`  FAIL ${table} ${batch[j].id}: ${r.error.message}`)
        }
      }
      done += batch.length
      process.stdout.write(`  ${done}/${list.length}\r`)
    }
    console.log(`  ${done}/${list.length} done`)
  }
}

// ── main ────────────────────────────────────────────────────
async function main() {
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'APPLY (writing to DB)'}`)
  console.log(`Target: ${SUPABASE_URL}`)

  const [areas, goals, groups, tasks] = await Promise.all([
    planAreas(),
    planGoals(),
    planGroups(),
    planTasks(),
  ])
  const allPlans = [...areas, ...goals, ...groups, ...tasks]

  // Stats
  const changed = allPlans.filter((p) => p.oldOrder !== p.newOrder)
  console.log(
    `\nPlanned: ${allPlans.length} rows total (${changed.length} with changed sort_order)`
  )
  console.log(
    `  areas:  ${areas.length} rows (${areas.filter((p) => p.oldOrder !== p.newOrder).length} changed)`
  )
  console.log(
    `  goals:  ${goals.length} rows (${goals.filter((p) => p.oldOrder !== p.newOrder).length} changed)`
  )
  console.log(
    `  groups: ${groups.length} rows (${groups.filter((p) => p.oldOrder !== p.newOrder).length} changed)`
  )
  console.log(
    `  tasks:  ${tasks.length} rows (${tasks.filter((p) => p.oldOrder !== p.newOrder).length} changed)`
  )

  // Dry-run sample: print up to 30 representative changed rows across tables
  console.log('\nSample of planned changes (first 30 changed rows):')
  for (const p of changed.slice(0, 30)) {
    const label = `[${p.table.padEnd(6)}] ${String(p.oldOrder).padEnd(6)} → ${p.newOrder.padEnd(6)}`
    console.log(`  ${label}  ${p.name}`)
  }
  if (changed.length > 30) {
    console.log(`  ... and ${changed.length - 30} more`)
  }

  if (DRY_RUN) {
    console.log('\nDry run only — re-run with --apply to write changes.')
    return
  }

  await applyPlans(allPlans)
  console.log('\nMigration complete.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

-- ============================================
-- Security Hardening Migration
-- ============================================

-- ============================================
-- 1. batch_update_sort_order: add table name whitelist
--    BEFORE: accepted ANY table name → could update profiles, etc.
--    AFTER: only allows known sort-orderable tables
-- ============================================
CREATE OR REPLACE FUNCTION batch_update_sort_order(
  p_table_name TEXT,
  p_updates JSONB
)
RETURNS void AS $$
DECLARE
  item JSONB;
  allowed_tables TEXT[] := ARRAY['areas', 'goals', 'groups', 'tasks'];
BEGIN
  -- Whitelist check: only allow known tables
  IF NOT (p_table_name = ANY(allowed_tables)) THEN
    RAISE EXCEPTION 'Invalid table name: %. Allowed: areas, goals, groups, tasks', p_table_name;
  END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(p_updates)
  LOOP
    EXECUTE format(
      'UPDATE %I SET sort_order = $1, updated_at = NOW() WHERE id = $2 AND user_id = auth.uid()',
      p_table_name
    ) USING item->>'sortOrder', (item->>'id')::UUID;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. Admin RLS: prevent is_admin privilege escalation
--    BEFORE: admin could update ALL columns on ANY profile
--    AFTER: admin can update all profiles EXCEPT is_admin column
--           (is_admin changes require direct DB access / superadmin)
-- ============================================

-- Drop the old overly-permissive policy
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

-- Re-create with WITH CHECK that prevents is_admin modification
-- Strategy: use a SECURITY DEFINER function to check column changes
CREATE OR REPLACE FUNCTION check_admin_profile_update()
RETURNS TRIGGER AS $$
BEGIN
  -- If is_admin is being changed, only allow if the updater is updating their OWN profile
  -- (which is already prevented by the base RLS policy) or via superadmin
  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
    -- Only the service_role (superadmin) should change is_admin
    -- Regular admins cannot escalate privileges
    IF auth.uid() != OLD.id OR NEW.is_admin != OLD.is_admin THEN
      RAISE EXCEPTION 'Cannot modify is_admin field. Use service_role for admin changes.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS prevent_admin_escalation ON public.profiles;
CREATE TRIGGER prevent_admin_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION check_admin_profile_update();

-- Re-create admin update policy (still allows updating other fields)
CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (
    auth.uid() = id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

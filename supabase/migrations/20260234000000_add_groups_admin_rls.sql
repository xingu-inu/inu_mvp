-- Add missing admin SELECT policy for groups table.
-- All other user-data tables already have admin policies via 20260229000000.

CREATE POLICY "Admins can view all groups"
  ON public.groups FOR SELECT
  USING (public.is_admin());

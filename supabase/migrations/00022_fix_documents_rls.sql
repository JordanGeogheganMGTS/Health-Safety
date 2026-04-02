-- Fix documents SELECT policy so Read-Only (and all authenticated users)
-- can see company-wide documents AND all site-specific documents.
-- Previously Read-Only users with no site assignment couldn't see site-scoped docs.

DROP POLICY IF EXISTS documents_select ON documents;

CREATE POLICY documents_select ON documents
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      -- Company-wide docs visible to all
      site_id IS NULL
      -- Admins and managers see everything
      OR auth_role() IN ('System Admin', 'H&S Manager', 'Read-Only')
      -- Others see their own site's docs
      OR site_id = auth_site_id()
    )
  );

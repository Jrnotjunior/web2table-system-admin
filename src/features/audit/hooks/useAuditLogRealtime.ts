import { useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';

/** Refresh the active audit query when its underlying table changes. */
export function useAuditLogRealtime(
  enabled: boolean,
  onAuditChange: () => void,
): void {
  const onAuditChangeRef = useRef(onAuditChange);

  useEffect(() => {
    onAuditChangeRef.current = onAuditChange;
  }, [onAuditChange]);

  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel('system-admin-audit-logs')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'system_admin_audit_logs' },
        () => {
          // Re-run the current server-side filters and page instead of applying
          // unfiltered realtime rows to a potentially filtered/paginated list.
          onAuditChangeRef.current();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [enabled]);
}

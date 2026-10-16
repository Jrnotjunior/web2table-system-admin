import { useEffect, type Dispatch, type SetStateAction } from 'react';
import { supabase } from '../../../lib/supabase';
import type { AuditLog } from '../../../shared/types/audit';

/** Subscribe to audit-table changes only while the audit page is active. */
export function useAuditLogRealtime(
  enabled: boolean,
  setAuditLogs: Dispatch<SetStateAction<AuditLog[]>>,
): void {
  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel('system-admin-audit-logs')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'system_admin_audit_logs' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newLog = payload.new as AuditLog;
            setAuditLogs((current) => {
              if (current.some((log) => log.id === newLog.id)) return current;
              return [newLog, ...current];
            });
          }

          if (payload.eventType === 'UPDATE') {
            const updatedLog = payload.new as AuditLog;
            setAuditLogs((current) =>
              current
                .map((log) => log.id === updatedLog.id ? updatedLog : log)
                .sort((a, b) => b.created_at.localeCompare(a.created_at)),
            );
          }

          if (payload.eventType === 'DELETE') {
            const deletedLog = payload.old as AuditLog;
            setAuditLogs((current) => current.filter((log) => log.id !== deletedLog.id));
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [enabled, setAuditLogs]);
}

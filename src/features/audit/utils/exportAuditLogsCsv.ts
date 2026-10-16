import type { AuditLog } from '../../../shared/types/audit';

export function exportAuditLogsCsv(logs: AuditLog[]) {
  const headers = ['Date & Time', 'Administrator', 'Restaurant', 'Event', 'Action', 'Entity', 'Details'];
  const escapeCsv = (value: unknown) => '"' + String(value ?? '').replaceAll('"', '""') + '"';
  const rows = logs.map((log) => [
    new Date(log.created_at).toLocaleString(),
    log.admin_name || log.admin_email || 'Unknown administrator',
    log.restaurant_name || '',
    log.event_type,
    log.action,
    log.entity_type || '',
    JSON.stringify(log.details ?? {}),
  ]);
  const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `web2table-audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

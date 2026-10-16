type AuditLog = {
  id: string;
  admin_user_id: string | null;
  admin_email: string | null;
  admin_name: string | null;
  restaurant_id: string | null;
  restaurant_name: string | null;
  event_type: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
};

type Props = {
  logs: AuditLog[];
  filteredLogs: AuditLog[];
  search: string;
  setSearch: (value: string) => void;
  eventFilter: string;
  setEventFilter: (value: string) => void;
  datePreset: 'ALL' | 'TODAY' | '7_DAYS' | '30_DAYS' | 'CUSTOM';
  setDatePreset: (value: 'ALL' | 'TODAY' | '7_DAYS' | '30_DAYS' | 'CUSTOM') => void;
  startDate: string;
  setStartDate: (value: string) => void;
  endDate: string;
  setEndDate: (value: string) => void;
  onExport: () => void;
  error: string;
  loading: boolean;
  pageNumber: number;
  onLoadPage: (page: number) => void;
  hasMore: boolean;
  onOpenLog: (log: AuditLog) => void;
};

export default function AuditLogsPanel({
  logs, filteredLogs, search, setSearch, eventFilter, setEventFilter, datePreset, setDatePreset,
  startDate, setStartDate, endDate, setEndDate, onExport, error, loading, pageNumber, onLoadPage,
  hasMore, onOpenLog,
}: Props) {
  return (
          <section className="dashboard-card audit-page-card">
            <div className="audit-summary-row">
              <div className="stat-card"><span>Total records</span><strong>{logs.length}</strong></div>
              <div className="stat-card"><span>Administrative actions</span><strong>{logs.filter((log) => log.event_type === 'ADMIN_ACTION').length}</strong></div>
              <div className="stat-card"><span>Authentication events</span><strong>{logs.filter((log) => log.event_type !== 'ADMIN_ACTION').length}</strong></div>
            </div>
  
            <div className="audit-toolbar">
              <input
                className="search-input uniform-search-input"
                type="search"
                placeholder="Search administrator, restaurant, action..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <select value={eventFilter} onChange={(event) => setEventFilter(event.target.value)}>
                <option value="ALL">All events</option>
                <option value="ADMIN_ACTION">Administrative actions</option>
                <option value="LOGIN_SUCCESS">Login success</option>
                <option value="LOGOUT">Logout</option>
                <option value="ACCESS_DENIED">Access denied</option>
              </select>
              <select value={datePreset} onChange={(event) => setDatePreset(event.target.value as typeof datePreset)}>
                <option value="ALL">All dates</option>
                <option value="TODAY">Today</option>
                <option value="7_DAYS">Last 7 days</option>
                <option value="30_DAYS">Last 30 days</option>
                <option value="CUSTOM">Custom range</option>
              </select>
              {datePreset === 'CUSTOM' && (
                <>
                  <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} aria-label="Audit start date" />
                  <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} aria-label="Audit end date" />
                </>
              )}
               <button className="secondary-button audit-export-button" type="button" onClick={onExport} disabled={filteredLogs.length === 0}>Export CSV</button>
            </div>
  
            {error && <div className="error-banner">{error}</div>}
  
            {loading ? (
              <div className="empty-state">Loading audit logs...</div>
            ) : filteredLogs.length === 0 ? (
              <div className="empty-state">
                <strong>No audit records found</strong>
                <span>Try a different search or filter.</span>
              </div>
            ) : (
              <div className="audit-table-wrap">
                <table className="audit-table">
                  <thead>
                    <tr>
                      <th>Date &amp; Time</th>
                      <th>Administrator</th>
                      <th>Restaurant</th>
                      <th>Event</th>
                      <th>Action</th>
                      <th>Changes / Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log) => {
                      const changes = (log.details?.changes ?? null) as Record<string, unknown> | null;
                      const createdValues = (log.details?.created_values ?? null) as Record<string, unknown> | null;
  
                      return (
                        <tr key={log.id}>
                          <td className="audit-date">{new Date(log.created_at).toLocaleString()}</td>
                          <td>
                            <strong>{log.admin_name || log.admin_email || 'Unknown administrator'}</strong>
                            {log.admin_name && log.admin_email && <span className="audit-subtext">{log.admin_email}</span>}
                          </td>
                          <td>{log.restaurant_name || '—'}</td>
                          <td><span className={log.event_type === 'ADMIN_ACTION' ? 'audit-event admin' : 'audit-event'}>{log.event_type}</span></td>
                          <td>{log.action}</td>
                          <td>
                            {changes && Object.keys(changes).length > 0 ? (
                              <div className="audit-change-list">
                                {Object.entries(changes).map(([field, value]) => {
                                  const pair = Array.isArray(value) ? value : [];
                                  return (
                                    <div className="audit-change" key={field}>
                                      <strong>{field.replaceAll('_', ' ')}</strong>
                                      <span>{String(pair[0] ?? '—')} → {String(pair[1] ?? '—')}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : createdValues ? (
                              <div className="audit-change-list">
                                <div className="audit-change"><strong>Created with</strong><span>{String(createdValues.name ?? 'restaurant')}</span></div>
                              </div>
                            ) : (
                              <span className="audit-subtext">{String(log.details?.source ?? '—')}</span>
                            )}
                          </td>
                           <td>
                             <button className="secondary-button audit-view-button" type="button" onClick={() => onOpenLog(log)}>View</button>
                           </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
  
            <div className="audit-pagination">
              <button
                type="button"
                className="secondary-button"
                onClick={() => void onLoadPage(Math.max(0, pageNumber - 1))}
                disabled={loading || pageNumber === 0}
              >
                Previous
              </button>
              <span>Page {pageNumber + 1}</span>
              <button
                type="button"
                className="secondary-button"
                onClick={() => void onLoadPage(pageNumber + 1)}
                disabled={loading || !hasMore}
              >
                Next
              </button>
            </div>
          </section>
  );
}

type RestaurantStaff = {
  id: string;
  name: string;
  mobile_number: string;
  email: string;
  role: string;
  is_active: boolean;
  auth_user_id: string | null;
};

type RestaurantStaffPanelProps = {
  canManage: boolean;
  staffLoading: boolean;
  staffError: string;
  restaurantStaff: RestaurantStaff[];
  staffActionError: string;
  staffActionId: string | null;
  onSetStaffActive: (staffId: string, isActive: boolean) => void;
  onRequestDelete: (staff: RestaurantStaff) => void;
};

export default function RestaurantStaffPanel({
  canManage,
  staffLoading,
  staffError,
  restaurantStaff,
  staffActionError,
  staffActionId,
  onSetStaffActive,
  onRequestDelete,
}: RestaurantStaffPanelProps) {
  return (
    <div className="manage-overview">
      <div className="overview-section">
        <div className="eyebrow">Staff</div>
        <h3>Restaurant staff</h3>
        <p>View the staff accounts associated with this restaurant. Staff invitations and account management remain part of the restaurant owner's workflow.</p>
        {staffLoading ? (
          <div className="empty-state">Loading staff...</div>
        ) : staffError ? (
          <div className="error-banner">{staffError}</div>
        ) : restaurantStaff.length === 0 ? (
          <div className="empty-state">No staff accounts found for this restaurant.</div>
        ) : (
          <>
            {staffActionError && <div className="error-banner">{staffActionError}</div>}
            <div className="staff-table-wrap">
              <table className="staff-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Email</th>
                    <th>Mobile</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {restaurantStaff.map((staff) => (
                    <tr key={staff.id}>
                      <td>{staff.name || '—'}</td>
                      <td>{staff.role.charAt(0).toUpperCase() + staff.role.slice(1)}</td>
                      <td>{staff.email || '—'}</td>
                      <td>{staff.mobile_number || '—'}</td>
                      <td><span className={staff.is_active ? 'status active' : 'status inactive'}>{staff.is_active ? 'Active' : 'Inactive'}</span></td>
                      <td>
                        <div className="staff-actions">
                          {canManage && <>
                            <button
                              className="secondary-button"
                              type="button"
                              onClick={() => onSetStaffActive(staff.id, !staff.is_active)}
                              disabled={staffActionId !== null}
                            >
                              {staffActionId === staff.id ? 'Saving...' : staff.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              className="danger-button"
                              type="button"
                              onClick={() => onRequestDelete(staff)}
                              disabled={staffActionId !== null}
                            >
                              {staffActionId === staff.id ? 'Working...' : 'Delete'}
                            </button>
                          </>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

import React from 'react'

export default function DeleteModal({ user, onConfirm, onCancel, loading }) {
  return (
    <div className="ul-modal-overlay" onClick={onCancel}>
      <div className="ul-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ul-modal-icon">&#9888;</div>
        <h3 className="ul-modal-title">Delete User Access</h3>
        <p className="ul-modal-msg">
          Are you sure you want to delete access for{" "}
          <strong>{user.user_name}</strong>? This action cannot be undone.
        </p>
        <div className="ul-modal-actions">
          <button
            className="ua-btn ua-btn-secondary"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="ua-btn ua-btn-danger"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
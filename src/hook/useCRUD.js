/**
 * useCRUD — Issue 3 fix
 *
 * Returns a `can(page, operation)` function that components use to
 * conditionally render or disable action buttons.
 *
 * Rules:
 *  - admin / super_admin  → always true (bypass all CRUD checks)
 *  - everyone else        → must have page in pageAccess AND
 *                           crudAccess[page][operation] === true
 *
 * Usage:
 *   const { can } = useCRUD();
 *   {can("Invoice Submission", "create") && <button>New Invoice</button>}
 *   {can("Finance Review", "update") && <button>Accept</button>}
 */

import { useAuth } from "../context/AuthContext";
import { useCallback } from "react";

// Page name constants — must match the strings used in main.go CRUDCheck() calls
export const PAGE = {
  DASHBOARD:           "KPI Dashboard",
  INVOICE_SUBMISSION:  "Invoice Submission",
  FINANCE_REVIEW:      "Finance Review",
  HOD_APPROVAL:        "HOD Approval",
  PAYMENT_APPROVAL:    "Payment Approval",
  PAYMENT_PROCESSING:  "Payment Processing",
  USER_MANAGEMENT:     "User Management",
  USER_ACCESS:         "User Access",
  ACTIVITY_LOGS:       "Activity Logs",
  USER_WISE_DATA:      "User-Wise Data",
  VENDOR_LIST:         "Vendor List",
};

export const OP = {
  CREATE: "create",
  READ:   "read",
  UPDATE: "update",
  DELETE: "delete",
};

export function useCRUD() {
  const { user } = useAuth();

  const can = useCallback(
    (page, operation) => {
      if (!user) return false;

      // Admins bypass all checks
      if (user.role === "admin" || user.role === "super_admin") return true;

      // Check page access
      const pageAccess = user.pageAccess || user.page_access || [];
      if (!pageAccess.includes(page)) return false;

      // Check CRUD operation
      const crudAccess = user.crudAccess || user.crud_access || {};
      const pagePerms  = crudAccess[page];
      if (!pagePerms) return false;

      return Boolean(pagePerms[operation]);
    },
    [user]
  );

  /**
   * canPage(page) — true if user has ANY access to this page
   * Used to show/hide entire sections in the sidebar.
   */
  const canPage = useCallback(
    (page) => {
      if (!user) return false;
      if (user.role === "admin" || user.role === "super_admin") return true;
      const pageAccess = user.pageAccess || user.page_access || [];
      return pageAccess.includes(page);
    },
    [user]
  );

  return { can, canPage };
}
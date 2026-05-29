const V1 = "/api/v1";

// // kpis
// export const DASHBOARD_KPIS = "api/v1/dashboard/kpis";

// // invoices
// export const GET_INVOICES = "api/v1/invoices";
// export const INVOICE_ACTION = "api/v1/invoice";

export const AUTH_LOGIN = `${V1}/auth/login`;
// export const AUTH_REGISTER = `${V1}/auth/register`;
// ── Invoice APIs ───────────────────────────────────────
export const INVOICES = `${V1}/invoices`;
export const INVOICE_BY_ID = (id) => `${V1}/invoices/${id}`;
export const INVOICE_AUDIT_TRAIL = (id) => `${V1}/invoices/${id}/audit-trail`;
export const UPDATE_INVOICE = (id) => `${V1}/invoices/${id}`;
export const DELETE_INVOICE = (id) => `${V1}/invoices/${id}`;
export const DOWNLOAD_DOCUMENT = (id, filename) =>
  `${V1}/invoices/${id}/documents/${encodeURIComponent(filename)}`;
export const DOWNLOAD_ZIP_DOCUMENT = (id) => `${V1}/invoices/${id}/documents/download-zip`;


export const FINANCE_ACCEPT = (id) => `${V1}/invoices/${id}/finance/accept`;
export const FINANCE_REJECT = (id) => `${V1}/invoices/${id}/finance/reject`;
export const FINANCE_HOLD = (id) => `${V1}/invoices/${id}/finance/hold`;
export const FINANCE_PENDING = (id) => `${V1}/invoices/${id}/finance/pending`;
export const UPDATE_FINANCE = (id) => `${V1}/invoices/${id}/finance/edit`;
export const HOD_APPROVE = (id) => `${V1}/invoices/${id}/hod/approve`;
export const HOD_REJECT = (id) => `${V1}/invoices/${id}/hod/reject`;
export const HOD_SEND_BACK = (id) => `${V1}/invoices/${id}/hod/send-back`;

export const PA_APPROVE = (id) =>
  `${V1}/invoices/${id}/payment-approval/approve`;
export const PA_REJECT = (id) => `${V1}/invoices/${id}/payment-approval/reject`;
export const PA_HOLD = (id) => `${V1}/invoices/${id}/payment-approval/hold`;
export const PA_SEND_BACK = (id) =>
  `${V1}/invoices/${id}/payment-approval/send-back`;

export const PROCESS_PAYMENT = (id) => `${V1}/invoices/${id}/process-payment`;

export const DASHBOARD_KPIS = `${V1}/dashboard/kpis`;
export const DASHBOARD_AGING = `${V1}/dashboard/aging`;
export const DASHBOARD_DEPT_STATS = `${V1}/dashboard/department-stats`;
// ── Dashboard Extra ───────────────────────────────────────
export const DASHBOARD_MONTHLY_TRENDS = `${V1}/dashboard/monthly-trends`;
export const DASHBOARD_TOP_VENDORS = `${V1}/dashboard/top-vendors`;
export const DASHBOARD_SUMMARY = `${V1}/dashboard/summary`;

// ── Invoice Section APIs ───────────────────────────────────
export const FINANCE_SECTION_INVOICES = `${V1}/invoices/section/finance`;
export const HOD_SECTION_INVOICES = `${V1}/invoices/section/hod`;
export const PA_SECTION_INVOICES = `${V1}/invoices/section/payment-approval`;
export const PROCESSING_SECTION_INVOICES = `${V1}/invoices/section/payment-processing`;

// ── Vendors ────────────────────────────────────────────────
export const VENDORS = `${V1}/vendors`;
export const VENDOR_BY_ID = (id) => `${V1}/vendors/${id}`;

// ── Users ──────────────────────────────────────────────────
export const USERS = `${V1}/users`;
export const CREATE_USER = `${V1}/users`;
export const USER_BY_ID = (id) => `${V1}/users/${id}`;
export const UPDATE_USER = (id) => `${V1}/users/${id}`;
export const DELETE_USER = (id) => `${V1}/users/${id}`;
export const USER_ME = `${V1}/users/me`;
export const CHANGE_PASSWORD = `${V1}/users/me/password`;
// export const USERS = `${V1}/users`;
// export const USER_BY_ID = (id) => `${V1}/users/${id}`;
// export const USER_ME = `${V1}/users/me`;
// export const CHANGE_PASSWORD = `${V1}/users/me/password`;

// ── User Access Control ──────────────────────────────────────────────────
// ── User Access Control ───────────────────────────────────────────────

export const USER_ACCESS = `${V1}/user-access/`;
export const USER_ACCESS_BY_ID = (id) => `${V1}/user-access/${id}`;
export const DELETE_USER_ACCESS = (id) => `${V1}/user-access/${id}`;
export const CREATE_USER_ACCESS = `${V1}/user-access/create-user-access`;
export const UPDATE_USER_ACCESS = (id) => `${V1}/user-access/${id}`;

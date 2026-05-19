import API from "./axios";
import {
  AUTH_LOGIN,
  AUTH_REGISTER,
  DASHBOARD_KPIS,
  FINANCE_ACCEPT,
  FINANCE_HOLD,
  FINANCE_REJECT,
  HOD_APPROVE,
  HOD_REJECT,
  HOD_SEND_BACK,
  INVOICE_AUDIT_TRAIL,
  INVOICE_BY_ID,
  INVOICES,
  PA_APPROVE,
  PA_HOLD,
  PA_REJECT,
  PROCESS_PAYMENT,
  DASHBOARD_MONTHLY_TRENDS,
  DASHBOARD_TOP_VENDORS,
  DASHBOARD_SUMMARY,
  FINANCE_SECTION_INVOICES,
  HOD_SECTION_INVOICES,
  PA_SECTION_INVOICES,
  PROCESSING_SECTION_INVOICES,
  UPDATE_INVOICE,
  DELETE_INVOICE,
  VENDORS,
  VENDOR_BY_ID,
  USERS,
  USER_BY_ID,
  USER_ME,
  CHANGE_PASSWORD,
  FINANCE_PENDING,
  PA_SEND_BACK,
  DOWNLOAD_DOCUMENT,
  USER_ACCESS,
  USER_ACCESS_BY_ID,
  UPDATE_USER_ACCESS,
  DELETE_USER_ACCESS,
  CREATE_USER_ACCESS
} from "./endpoints";

export const fetchDashboardKpis = async () => {
  try {
    const response = await API.get(DASHBOARD_KPIS);
    return response.data;
  } catch (error) {
    throw error.response?.data?.error || "Failed to fetch dashboard kpis";
  }
};
export const fetchInvoices = async ({
  status,
  department,
  search,
  page = 1,
  limit = 100,
} = {}) => {
  try {
    const params = new URLSearchParams();
    if (status) params.append("status", status);
    if (department) params.append("department", department);
    if (search) params.append("search", search);
    params.append("page", page);
    params.append("limit", limit);
    const response = await API.get(`${INVOICES}?${params.toString()}`);
    return response.data;
  } catch (error) {
    throw error.response?.data?.error || "Failed to fetch invoices";
  }
};
// FIXED DOWNLOAD SERVICE
export const downloadFile = async (invoiceId, fileName) => {
  try {
    const response = await API.get(
      DOWNLOAD_DOCUMENT(invoiceId, fileName),
      {
        responseType: "blob",
      }
    );

    return response; // return full response (important)
  } catch (error) {
    throw error;
  }
};
// ── Fetch single invoice ──────────────────────────────────────
export const fetchInvoiceById = async (id) => {
  try {
    const response = await API.get(INVOICE_BY_ID(id));
    return response.data;
  } catch (error) {
    throw error.response?.data?.error || "Failed to fetch invoice";
  }
};

// ── Submit new invoice ────────────────────────────────────────
export const createInvoice = async (formData) => {
  const response = await API.post(INVOICES, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  return response.data;
};

export const updateInvoice = async (id, formData) => {
  const response = await API.put(UPDATE_INVOICE(id), formData
    , {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  return response.data;
};
export const deleteInvoice = async (id) => {
  try {
    const res = await API.delete(DELETE_INVOICE(id));
    return res.data;
  } catch (error) {
    throw error.response?.data?.error || "Invoice delete failed";
  }
};
// ── Finance actions ───────────────────────────────────────────
export const financeAccept = async (id, payload) => {
  try {
    const response = await API.patch(FINANCE_ACCEPT(id), payload);
    return response.data;
  } catch (error) {
    throw error.response?.data?.error || "Finance accept failed";
  }
};

export const financeReject = async (id, payload) => {
  try {
    const response = await API.patch(FINANCE_REJECT(id), payload);
    return response.data;
  } catch (error) {
    throw error.response?.data?.error || "Finance reject failed";
  }
};

export const financeHold = async (id, payload) => {
  try {
    const response = await API.patch(FINANCE_HOLD(id), payload);
    return response.data;
  } catch (error) {
    throw error.response?.data?.error || "Finance hold failed";
  }
};

export const financePending = async (id, payload) => {
  try {
    const response = await API.patch(FINANCE_PENDING(id), payload);
    return response.data;
  } catch (error) {
    throw error.response?.data?.error || "Finance pending failed";
  }
}
// ── HOD actions ───────────────────────────────────────────────
export const hodApprove = async (id, payload) => {
  try {
    const response = await API.patch(HOD_APPROVE(id), payload);
    return response.data;
  } catch (error) {
    throw error.response?.data?.error || "HOD approve failed";
  }
};
export const hodReject = async (id, payload) => {
  try {
    const response = await API.patch(HOD_REJECT(id), payload);
    return response.data;
  } catch (error) {
    throw error.response?.data?.error || "HOD reject failed";
  }
};

export const hodSendBack = async (id, payload) => {
  try {
    const response = await API.patch(HOD_SEND_BACK(id), payload);
    return response.data;
  } catch (error) {
    throw error.response?.data?.error || "HOD send-back failed";
  }
};

// ── Payment Approval actions ──────────────────────────────────
export const paymentApprovalApprove = async (id, payload) => {
  try {
    const response = await API.patch(PA_APPROVE(id), payload);
    return response.data;
  } catch (error) {
    throw error.response?.data?.error || "Payment approval failed";
  }
};

export const paymentApprovalReject = async (id, payload) => {
  try {
    const response = await API.patch(PA_REJECT(id), payload);
    return response.data;
  } catch (error) {
    throw error.response?.data?.error || "Payment rejection failed";
  }
};

export const paymentApprovalHold = async (id, payload) => {
  try {
    const response = await API.patch(PA_HOLD(id), payload);
    return response.data;
  } catch (error) {
    throw error.response?.data?.error || "Payment hold failed";
  }
};

export const paymentApprovalSendBack = async (id) => {
  try {
    const response = await API.patch(PA_SEND_BACK(id));
    return response.data;
  } catch (error) {
    throw error.response?.data?.error || "Payment send-back failed";
  }
}
// ── Process Payment ───────────────────────────────────────────
export const processPaymentAPI = async (id, bankRef) => {
  try {
    const response = await API.patch(PROCESS_PAYMENT(id), { bankRef });
    return response.data;
  } catch (error) {
    throw error.response?.data?.error || "Payment processing failed";
  }
};

// ── Audit Trail ───────────────────────────────────────────────
export const fetchAuditTrail = async (id) => {
  try {
    const response = await API.get(INVOICE_AUDIT_TRAIL(id));
    return response.data;
  } catch (error) {
    throw error.response?.data?.error || "Failed to fetch audit trail";
  }
};

export const fetchMonthlyTrends = async () => {
  const res = await API.get(DASHBOARD_MONTHLY_TRENDS);
  return res.data;
};

export const fetchTopVendors = async () => {
  const res = await API.get(DASHBOARD_TOP_VENDORS);
  return res.data;
};

export const fetchDashboardSummary = async () => {
  const res = await API.get(DASHBOARD_SUMMARY);
  return res.data;
};

// export const updateInvoice = async (id, payload) => {
//   try {
//     const res = await API.put(UPDATE_INVOICE(id), payload);
//     return res.data;
//   } catch (error) {
//     throw error.response?.data?.error || "Invoice update failed";
//   }
// };



export const fetchFinanceInvoices = async () => {
  const res = await API.get(FINANCE_SECTION_INVOICES);
  return res.data;
};

export const fetchHodInvoices = async () => {
  const res = await API.get(HOD_SECTION_INVOICES);
  return res.data;
};

export const fetchPaymentApprovalInvoices = async () => {
  const res = await API.get(PA_SECTION_INVOICES);
  return res.data;
};

export const fetchProcessingInvoices = async () => {
  const res = await API.get(PROCESSING_SECTION_INVOICES);
  return res.data;
};
export const fetchVendors = async () => {
  const res = await API.get(VENDORS);
  return res.data;
};

export const createVendor = async (payload) => {
  const res = await API.post(VENDORS, payload);
  return res.data;
};

export const updateVendor = async (id, payload) => {
  const res = await API.put(VENDOR_BY_ID(id), payload);
  return res.data;
};

export const deleteVendor = async (id) => {
  const res = await API.delete(VENDOR_BY_ID(id));
  return res.data;
};

export const fetchUsers = async () => {
  const res = await API.get(USERS);
  return res.data;
};

export const fetchUserById = async (id) => {
  const res = await API.get(USER_BY_ID(id));
  return res.data;
};

export const fetchCurrentUser = async () => {
  const res = await API.get(USER_ME);
  return res.data;
};

export const updateUser = async (id, payload) => {
  const res = await API.put(USER_BY_ID(id), payload);
  return res.data;
};

export const deleteUser = async (id) => {
  const res = await API.delete(USER_BY_ID(id));
  return res.data;
};

export const changePassword = async (payload) => {
  const res = await API.put(CHANGE_PASSWORD, payload);
  return res.data;
};
// ── Auth ──────────────────────────────────────────────────────────
export const loginUser = async (credentials) => {
  try {
    const res = await API.post(AUTH_LOGIN, credentials);
    return res.data;
  } catch (error) {
    throw error.response?.data?.message || "Login failed";
  }
};

export const registerUser = async (payload) => {
  try {
    const res = await API.post(AUTH_REGISTER, payload);
    return res.data;
  } catch (error) {
    throw error.response?.data?.message || "Registration failed";
  }
};

// ─── User Access ───────────────────────────────────────────────
export const getAllUserAccess = async () => {
  const res = await API.get(USER_ACCESS);
  return res.data;
};

export const getUserAccessById = async (id) => {
  const res = await API.get(USER_ACCESS_BY_ID(id));
  return res.data;
};

export const createUserAccess = async (payload) => {
  try {
    const res = await API.post(CREATE_USER_ACCESS, payload);
    return res.data;
  } catch (error) {
    throw error.response?.data?.error || "Creating user access failed";
  }
};

export const updateUserAccess = async (id, payload) => {
  try {
    const res = await API.put(UPDATE_USER_ACCESS(id), payload);
    return res.data;
  } catch (error) {
    throw error.response?.data?.error || "Updating user access failed";
  }
};

export const deleteUserAccess = async (id) => {
  try {
    const res = await API.delete(DELETE_USER_ACCESS(id));
    return res.data;
  } catch (error) {
    throw error.response?.data?.error || "Deleting user access failed";
  }
};

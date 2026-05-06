import { createContext, useContext, useState } from "react";

const InvoiceContext = createContext();

const INITIAL_INVOICES = [
  {
    id: "INV-2024-001",
    vendor: "TechCorp Solutions",
    invoiceNo: "TC-8821",
    invoiceDate: "2024-01-02",
    dateOfReceipt: "2024-01-03",
    department: "IT",
    uploadedBy: "Ramesh Kumar",
    amount: 145000,
    status: "Pending Review",
    financeStatus: null,
    hodStatus: null,
    paymentApprovalStatus: null,
    paymentStatus: null,
    paymentDate: null,
    dueDate: "2024-01-31",
    glCode: "",
    expenseHead: "",
    taxDetails: "GST 18%",
    remarks: "",
    paymentMode: null,
    bankRef: null,
    priority: null,
  },
  {
    id: "INV-2024-002",
    vendor: "Sharma Traders",
    invoiceNo: "SHT-4432",
    invoiceDate: "2024-01-04",
    dateOfReceipt: "2024-01-05",
    department: "Operations",
    uploadedBy: "Priya Mehta",
    amount: 87500,
    status: "Under Review",
    financeStatus: "Accepted",
    hodStatus: null,
    paymentApprovalStatus: null,
    paymentStatus: null,
    paymentDate: null,
    dueDate: "2024-02-04",
    glCode: "5100",
    expenseHead: "Raw Material",
    taxDetails: "GST 12%",
    remarks: "Verified by finance",
    paymentMode: null,
    bankRef: null,
    priority: null,
  },
  {
    id: "INV-2024-003",
    vendor: "Global Logistics Ltd",
    invoiceNo: "GL-9901",
    invoiceDate: "2023-12-28",
    dateOfReceipt: "2023-12-29",
    department: "Logistics",
    uploadedBy: "Anita Singh",
    amount: 32000,
    status: "HOD Approval",
    financeStatus: "Accepted",
    hodStatus: null,
    paymentApprovalStatus: null,
    paymentStatus: null,
    paymentDate: null,
    dueDate: "2024-01-28",
    glCode: "5200",
    expenseHead: "Freight",
    taxDetails: "GST 5%",
    remarks: "",
    paymentMode: null,
    bankRef: null,
    priority: "High",
  },
  {
    id: "INV-2024-004",
    vendor: "Office Essentials",
    invoiceNo: "OE-2201",
    invoiceDate: "2024-01-06",
    dateOfReceipt: "2024-01-06",
    department: "Admin",
    uploadedBy: "Suresh Patil",
    amount: 15600,
    status: "On Hold",
    financeStatus: "Hold",
    hodStatus: null,
    paymentApprovalStatus: null,
    paymentStatus: null,
    paymentDate: null,
    dueDate: "2024-02-06",
    glCode: "",
    expenseHead: "",
    taxDetails: "GST 18%",
    remarks: "GST number mismatch - awaiting vendor correction",
    paymentMode: null,
    bankRef: null,
    priority: null,
  },
  {
    id: "INV-2024-005",
    vendor: "Infra Build Co.",
    invoiceNo: "IBC-5521",
    invoiceDate: "2023-12-20",
    dateOfReceipt: "2023-12-22",
    department: "Facilities",
    uploadedBy: "Meena Desai",
    amount: 520000,
    status: "Payment Approval",
    financeStatus: "Accepted",
    hodStatus: "Approved",
    paymentApprovalStatus: null,
    paymentStatus: null,
    paymentDate: null,
    dueDate: "2024-01-20",
    glCode: "6100",
    expenseHead: "Capital Expenditure",
    taxDetails: "GST 18%",
    remarks: "HOD approved on priority",
    paymentMode: "NEFT",
    bankRef: null,
    priority: "High",
  },
  {
    id: "INV-2024-006",
    vendor: "PrintMasters",
    invoiceNo: "PM-1122",
    invoiceDate: "2024-01-01",
    dateOfReceipt: "2024-01-02",
    department: "Marketing",
    uploadedBy: "Vikram Joshi",
    amount: 28900,
    status: "Rejected",
    financeStatus: "Rejected",
    hodStatus: null,
    paymentApprovalStatus: null,
    paymentStatus: null,
    paymentDate: null,
    dueDate: "2024-02-01",
    glCode: "",
    expenseHead: "",
    taxDetails: "GST 18%",
    remarks: "Duplicate invoice - already processed as INV-2023-198",
    paymentMode: null,
    bankRef: null,
    priority: null,
  },
  {
    id: "INV-2024-007",
    vendor: "Cloudware Tech",
    invoiceNo: "CWT-7712",
    invoiceDate: "2023-12-15",
    dateOfReceipt: "2023-12-16",
    department: "IT",
    uploadedBy: "Deepa Nair",
    amount: 240000,
    status: "Paid",
    financeStatus: "Accepted",
    hodStatus: "Approved",
    paymentApprovalStatus: "Approved",
    paymentStatus: "Processed",
    paymentDate: "2024-01-08",
    dueDate: "2024-01-15",
    glCode: "5300",
    expenseHead: "Software License",
    taxDetails: "GST 18%",
    remarks: "",
    paymentMode: "RTGS",
    bankRef: "HDFC2024010800821",
    priority: "Normal",
  },
  {
    id: "INV-2024-008",
    vendor: "Nationwide Courier",
    invoiceNo: "NC-3341",
    invoiceDate: "2024-01-07",
    dateOfReceipt: "2024-01-07",
    department: "Logistics",
    uploadedBy: "Amit Gupta",
    amount: 9800,
    status: "Pending Review",
    financeStatus: null,
    hodStatus: null,
    paymentApprovalStatus: null,
    paymentStatus: null,
    paymentDate: null,
    dueDate: "2024-02-07",
    glCode: "",
    expenseHead: "",
    taxDetails: "GST 5%",
    remarks: "",
    paymentMode: null,
    bankRef: null,
    priority: null,
  },
];

const DEPARTMENTS = [
  "IT",
  "Operations",
  "Logistics",
  "Admin",
  "Facilities",
  "Marketing",
  "HR",
  "Finance",
];
const VENDORS = [
  "TechCorp Solutions",
  "Sharma Traders",
  "Global Logistics Ltd",
  "Office Essentials",
  "Infra Build Co.",
  "PrintMasters",
  "Cloudware Tech",
  "Nationwide Courier",
];

export function InvoiceProvider({ children }) {
  const [invoices, setInvoices] = useState(INITIAL_INVOICES);

  const addInvoice = (inv) => {
    const newInv = {
      ...inv,
      id: `INV-2024-${String(invoices.length + 1).padStart(3, "0")}`,
      dateOfReceipt: new Date().toISOString().split("T")[0],
      status: "Pending Review",
      financeStatus: null,
      hodStatus: null,
      paymentApprovalStatus: null,
      paymentStatus: null,
      paymentDate: null,
      glCode: "",
      expenseHead: "",
      taxDetails: "",
      remarks: "",
      paymentMode: null,
      bankRef: null,
      priority: null,
    };
    setInvoices((prev) => [newInv, ...prev]);
  };

  const updateInvoice = (id, updates) => {
    setInvoices((prev) =>
      prev.map((inv) => (inv.id === id ? { ...inv, ...updates } : inv)),
    );
  };

  const financeAction = (id, action, data) => {
    const statusMap = {
      Accept: "Under Review",
      Reject: "Rejected",
      Hold: "On Hold",
    };

    // Add the new invoice to the list of invoices.
    const finMap = { Accept: "Accepted", Reject: "Rejected", Hold: "Hold" };
    updateInvoice(id, {
      financeStatus: finMap[action],
      status: statusMap[action],
      ...data,
    });
  };

  const hodAction = (id, action, remarks) => {
    if (action === "Approve") {
      updateInvoice(id, {
        hodStatus: "Approved",
        status: "Payment Approval",
        remarks,
      });
    } else if (action === "Reject") {
      updateInvoice(id, { hodStatus: "Rejected", status: "Rejected", remarks });
    } else {
      updateInvoice(id, {
        hodStatus: "Sent Back",
        status: "Under Review",
        remarks,
      });
    }
  };

  const paymentApprovalAction = (id, action, data) => {
    if (action === "Approve") {
      updateInvoice(id, {
        paymentApprovalStatus: "Approved",
        status: "Ready for Payment",
        ...data,
      });
    } else if (action === "Reject") {
      updateInvoice(id, {
        paymentApprovalStatus: "Rejected",
        status: "Rejected",
        ...data,
      });
    } else {
      updateInvoice(id, {
        paymentApprovalStatus: "Hold",
        status: "On Hold",
        ...data,
      });
    }
  };

  const processPayment = (id, bankRef) => {
    updateInvoice(id, {
      paymentStatus: "Processed",
      status: "Paid",
      paymentDate: new Date().toISOString().split("T")[0],
      bankRef,
    });
  };

  const getDaysPending = (dateOfReceipt) => {
    console.log(dateOfReceipt,'dateOfReceipt')
    const receipt = new Date(dateOfReceipt);
    const today = new Date();
    return Math.floor((today - receipt) / (1000 * 60 * 60 * 24));
  };
//   const getDaysPending = (dateOfReceipt) => {
//     // console.log(dateOfReceipt,'dateOfReceipt')
//   if (!dateOfReceipt) return 0;

//   const receipt = new Date(dateOfReceipt);
//   const today = new Date();

//   // remove time part (optional but recommended)
//   receipt.setHours(0, 0, 0, 0);
//   today.setHours(0, 0, 0, 0);

//   const diffTime = today - receipt;
//   const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

//   return diffDays;
// };

  const getAgingBucket = (days) => {
    if (days <= 3) return "0–3 Days";
    if (days <= 7) return "4–7 Days";
    if (days <= 15) return "8–15 Days";
    return "15+ Days";
  };

  return (
    <InvoiceContext.Provider
      value={{
        invoices,
        addInvoice,
        updateInvoice,
        financeAction,
        hodAction,
        paymentApprovalAction,
        processPayment,
        getDaysPending,
        getAgingBucket,
        DEPARTMENTS,
        VENDORS,
      }}
    >
      {children}
    </InvoiceContext.Provider>
  );
}

export const useInvoices = () => useContext(InvoiceContext);

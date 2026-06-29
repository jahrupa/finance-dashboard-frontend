import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import InvoiceSubmission from "./pages/InvoiceSubmission";
import FinanceReview from "./pages/FinanceReview";
import HODApproval from "./pages/HODApproval";
import PaymentApproval from "./pages/PaymentApproval";
import PaymentProcessing from "./pages/PaymentProcessing";
import KPIDashboard from "./pages/KPIDashboard";
import Vendor from "./pages/Vendor";
import UserManagement from "./pages/UserManagement";
import ActivityLogs from "./pages/ActivityLogs";
import UserWiseData from "./pages/UserWiseData";
import { InvoiceProvider } from "./context/InvoiceContext";
import { useAuth } from "./context/AuthContext";
import "./App.css";
import "../src/styles/Components.css";
import { useCRUD, PAGE } from "./hook/useCRUD";

const ALL_PAGES = [
  {
    id: "dashboard",
    label: "KPI Dashboard",
    icon: "📊",
    short: "Dashboard",
    path: "/kpi-dashboard",
  },
  {
    id: "invoice",
    label: "Invoice Submission",
    icon: "📤",
    short: "Invoice",
    path: "/invoice",
  },
  {
    id: "finance",
    label: "Finance Review",
    icon: "🔍",
    short: "Finance",
    path: "/finance",
  },
  { id: "hod", label: "HOD Approval", icon: "👨‍💼", short: "HOD", path: "/hod" },
  {
    id: "payment-approval",
    label: "Payment Approval",
    icon: "✅",
    short: "Approve",
    path: "/payment-approval",
  },
  {
    id: "payment-processing",
    label: "Payment Processing",
    icon: "💳",
    short: "Process",
    path: "/payment-processing",
  },
  {
    id: "vendor",
    label: "Vendor",
    icon: "👥",
    short: "Vendor",
    path: "/vendor",
  },
  {
    id: "user-management",
    label: "User Management",
    icon: "👤",
    short: "Users",
    path: "/user-management",
  },
  {
    id: "activity-logs",
    label: "Activity Logs",
    icon: "📋",
    short: "Logs",
    path: "/activity-logs",
  },
  {
    id: "user-wise-data",
    label: "User-Wise Data",
    icon: "📊",
    short: "By User",
    path: "/user-wise-data",
  },
];

const PATH_TO_ID = Object.fromEntries(ALL_PAGES.map((p) => [p.path, p.id]));
const ID_TO_PATH = Object.fromEntries(ALL_PAGES.map((p) => [p.id, p.path]));

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { canPage } = useCRUD();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [screenSize, setScreenSize] = useState(() => {
    const w = window.innerWidth;
    return w < 600 ? "mobile" : w < 960 ? "tablet" : "desktop";
  });

  useEffect(() => {
    const handler = () => {
      const w = window.innerWidth;
      const size = w < 600 ? "mobile" : w < 960 ? "tablet" : "desktop";
      setScreenSize(size);
      if (size === "desktop") setDrawerOpen(false);
    };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  // Filter pages based on user role
  const userRole = user?.role || "employee";
  const isAdmin = ["admin", "super_admin"].includes(userRole);

  // Filter sidebar pages by:
  // 1. role-based visibility (admin/super_admin see all admin pages)
  // 2. for non-admin roles: also check pageAccess from user permissions
  const PAGES = ALL_PAGES.filter((p) => {
    // const roleOk = p.roles.includes("all") || p.roles.includes(userRole);
    // if (!roleOk) return false;
    // Admin/super_admin always see all pages they have role access to
    if (isAdmin) return true;
    // For other roles: also check pageAccess permission if it's a non-"all" page
    // Map sidebar page id to permission page name
    const pageNameMap = {
      dashboard: "KPI Dashboard",
      invoice: "Invoice Submission",
      finance: "Finance Review",
      hod: "HOD Approval",
      "payment-approval": "Payment Approval",
      "payment-processing": "Payment Processing",
    };
    const permPage = pageNameMap[p.id];
    if (!permPage) return true; // pages without a permission mapping are always shown
    return canPage(permPage);
  });

  const activePage = PATH_TO_ID[location.pathname] ?? "dashboard";
  const currentPage = ALL_PAGES.find((p) => p.id === activePage);

  const handlePageChange = (id) => {
    navigate(ID_TO_PATH[id] ?? "/");
    setDrawerOpen(false);
  };

  const isDesktop = screenSize === "desktop";
  const isMobile = screenSize === "mobile";

  // Department-based invoice filter helper — passed down via context or prop drilling
  // Non-admin users should only see invoices from their own department
  const userDepartment = !isAdmin && user?.department ? user.department : null;

  const renderPage = () => {
    switch (activePage) {
      case "dashboard":
        return <KPIDashboard />;
      case "invoice":
        return (
          <InvoiceSubmission
            userDepartment={userDepartment}
            isAdmin={isAdmin}
          />
        );
      case "finance":
        return <FinanceReview />;
      case "hod":
        return <HODApproval />;
      case "payment-approval":
        return <PaymentApproval />;
      case "payment-processing":
        return <PaymentProcessing />;
      case "vendor":
        return <Vendor />;
      case "user-management":
        return <UserManagement />;
      case "activity-logs":
        return <ActivityLogs />;
      case "user-wise-data":
        return <UserWiseData />;
      default:
        return <KPIDashboard />;
    }
  };

  return (
    <InvoiceProvider>
      <div className="app-shell">
        {isDesktop && (
          <Sidebar
            pages={PAGES}
            activePage={activePage}
            setActivePage={handlePageChange}
          />
        )}

        {!isDesktop && (
          <>
            <div
              className={`drawer-overlay ${drawerOpen ? "drawer-overlay-visible" : ""}`}
              onClick={() => setDrawerOpen(false)}
            />
            <div
              className={`drawer-sidebar ${drawerOpen ? "drawer-open" : ""}`}
            >
              <div className="drawer-close-row">
                <button
                  className="drawer-close-btn"
                  onClick={() => setDrawerOpen(false)}
                >
                  ✕
                </button>
              </div>
              <Sidebar
                pages={PAGES}
                activePage={activePage}
                setActivePage={handlePageChange}
              />
            </div>
          </>
        )}

        <main
          className={`main-content ${isDesktop ? "with-sidebar" : "no-sidebar"}`}
        >
          {!isDesktop && (
            <div className="topbar">
              <button
                className="topbar-hamburger"
                onClick={() => setDrawerOpen((o) => !o)}
                aria-label="Open menu"
              >
                <span className="ham-line" />
                <span className="ham-line" />
                <span className="ham-line" />
              </button>
              <div className="topbar-title">
                <span className="topbar-icon">{currentPage?.icon}</span>
                <span>{currentPage?.label}</span>
              </div>
            </div>
          )}

          <div
            className={`page-wrapper ${isMobile ? "page-wrapper-mobile" : ""}`}
          >
            {renderPage()}
          </div>

          {isMobile && (
            <nav className="bottom-nav">
              {PAGES.slice(0, 6).map((page) => (
                <button
                  key={page.id}
                  className={`bottom-nav-item ${activePage === page.id ? "active" : ""}`}
                  onClick={() => handlePageChange(page.id)}
                >
                  <span className="bottom-nav-icon">{page.icon}</span>
                  <span className="bottom-nav-label">{page.short}</span>
                </button>
              ))}
            </nav>
          )}
        </main>
      </div>
    </InvoiceProvider>
  );
}

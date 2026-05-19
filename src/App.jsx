import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import InvoiceSubmission from "./pages/InvoiceSubmission";
import FinanceReview from "./pages/FinanceReview";
import HODApproval from "./pages/HODApproval";
import PaymentApproval from "./pages/PaymentApproval";
import PaymentProcessing from "./pages/PaymentProcessing";
import KPIDashboard from "./pages/KPIDashboard";
import { InvoiceProvider } from "./context/InvoiceContext";
import "./App.css";
import UserAccessForm from "./pages/UserAccessForm";
import UserList from "./pages/UserList";

const PAGES = [
  {
    id: "dashboard",
    label: "KPI Dashboard",
    icon: "📊",
    short: "Dashboard",
    path: "/kpi-dashboard",
  },
  {
    id: "submission",
    label: "Invoice Submission",
    icon: "📤",
    short: "Submit",
    path: "/submit",
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
    id: "user-access",
    label: "User Access",
    icon: "👤",
    short: "User Access",
    path: "/user-access",
  },
   {
    id: "user-list",
    label: "User List",
    icon: "👤",
    short: "User List",
    path: "/user-list",
  },
];

// Map route path → page id
const PATH_TO_ID = Object.fromEntries(PAGES.map((p) => [p.path, p.id]));
// Map page id → route path
const ID_TO_PATH = Object.fromEntries(PAGES.map((p) => [p.id, p.path]));

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

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

  // Derive the active page from the URL
  const activePage = PATH_TO_ID[location.pathname] ?? "dashboard";
  const currentPage = PAGES.find((p) => p.id === activePage);

  const handlePageChange = (id) => {
    navigate(ID_TO_PATH[id] ?? "/");
    setDrawerOpen(false);
  };

  const isDesktop = screenSize === "desktop";
  const isMobile = screenSize === "mobile";

  const renderPage = () => {
    switch (activePage) {
      case "dashboard":
        return <KPIDashboard />;
      case "submission":
        return <InvoiceSubmission />;
      case "finance":
        return <FinanceReview />;
      case "hod":
        return <HODApproval />;
      case "payment-approval":
        return <PaymentApproval />;
      case "payment-processing":
        return <PaymentProcessing />;
         case "user-access":
        return <UserAccessForm />;
         case "user-list":
        return <UserList />;
      default:
        return <KPIDashboard />;
    }
  };

  return (
    <InvoiceProvider>
      <div className="app-shell">
        {/* Sidebar — desktop only */}
        {isDesktop && (
          <Sidebar
            pages={PAGES}
            activePage={activePage}
            setActivePage={handlePageChange}
          />
        )}

        {/* Drawer — mobile/tablet */}
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
          {/* Top bar — mobile/tablet */}
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

          {/* Bottom nav — mobile only */}
          {isMobile && (
            <nav className="bottom-nav">
              {PAGES.map((page) => (
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

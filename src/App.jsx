import { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import InvoiceSubmission from "./pages/InvoiceSubmission";
import FinanceReview from "./pages/FinanceReview";
import HODApproval from "./pages/HODApproval";
import PaymentApproval from "./pages/PaymentApproval";
import PaymentProcessing from "./pages/PaymentProcessing";
import KPIDashboard from "./pages/KPIDashboard";
import { InvoiceProvider } from "./context/InvoiceContext";
import "./App.css";

const PAGES = [
  { id: "dashboard", label: "KPI Dashboard", icon: "📊", short: "Dashboard" },
  { id: "submission", label: "Invoice Submission", icon: "📤", short: "Submit" },
  { id: "finance", label: "Finance Review", icon: "🔍", short: "Finance" },
  { id: "hod", label: "HOD Approval", icon: "👨‍💼", short: "HOD" },
  { id: "payment-approval", label: "Payment Approval", icon: "✅", short: "Approve" },
  { id: "payment-processing", label: "Payment Processing", icon: "💳", short: "Process" },
];

export default function App() {
  const [activePage, setActivePage] = useState("dashboard");
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

  const handlePageChange = (id) => {
    setActivePage(id);
    setDrawerOpen(false);
  };

  const currentPage = PAGES.find(p => p.id === activePage);
  const isDesktop = screenSize === "desktop";
  const isMobile = screenSize === "mobile";

  const renderPage = () => {
    switch (activePage) {
      case "dashboard": return <KPIDashboard />;
      case "submission": return <InvoiceSubmission />;
      case "finance": return <FinanceReview />;
      case "hod": return <HODApproval />;
      case "payment-approval": return <PaymentApproval />;
      case "payment-processing": return <PaymentProcessing />;
      default: return <KPIDashboard />;
    }
  };

  return (
    <InvoiceProvider>
      <div className="app-shell">

        {/* Sidebar — desktop only */}
        {isDesktop && (
          <Sidebar pages={PAGES} activePage={activePage} setActivePage={handlePageChange} />
        )}

        {/* Drawer — mobile/tablet */}
        {!isDesktop && (
          <>
            <div
              className={`drawer-overlay ${drawerOpen ? "drawer-overlay-visible" : ""}`}
              onClick={() => setDrawerOpen(false)}
            />
            <div className={`drawer-sidebar ${drawerOpen ? "drawer-open" : ""}`}>
              <div className="drawer-close-row">
                <button className="drawer-close-btn" onClick={() => setDrawerOpen(false)}>✕</button>
              </div>
              <Sidebar pages={PAGES} activePage={activePage} setActivePage={handlePageChange} />
            </div>
          </>
        )}

        <main className={`main-content ${isDesktop ? "with-sidebar" : "no-sidebar"}`}>

          {/* Top bar — mobile/tablet */}
          {!isDesktop && (
            <div className="topbar">
              <button className="topbar-hamburger" onClick={() => setDrawerOpen(o => !o)} aria-label="Open menu">
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

          <div className={`page-wrapper ${isMobile ? "page-wrapper-mobile" : ""}`}>
            {renderPage()}
          </div>

          {/* Bottom nav — mobile only */}
          {isMobile && (
            <nav className="bottom-nav">
              {PAGES.map(page => (
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

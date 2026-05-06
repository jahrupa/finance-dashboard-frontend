import "./Sidebar.css";

export default function Sidebar({ pages, activePage, setActivePage }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-icon">AP</div>
        <div className="brand-text">
          <span className="brand-title">PayFlow</span>
          <span className="brand-sub">Accounts Payable</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <span className="nav-section-label">Navigation</span>
        {pages.map((page) => (
          <button
            key={page.id}
            className={`nav-item ${activePage === page.id ? "active" : ""}`}
            onClick={() => setActivePage(page.id)}
          >
            <span className="nav-icon">{page.icon}</span>
            <span className="nav-label">{page.label}</span>
            {activePage === page.id && <span className="nav-indicator" />}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-badge">
          <div className="user-avatar">SK</div>
          <div className="user-info">
            <span className="user-name">Samir Kapoor</span>
            <span className="user-role">Finance Manager</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

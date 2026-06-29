import { useState, useEffect, useMemo } from "react";
import { fetchUsers, fetchInvoices } from "../api/Service";
import SearchBar from "../components/ui/SearchBar";
import Pagination from "../components/ui/Pagination";
import usePagination from "../components/ui/usePagination";

const STATUS_COLORS = {
  pending:    { bg:"#fff7ed", color:"#ea580c", border:"#fed7aa" },
  approved:   { bg:"#f0fdf4", color:"#16a34a", border:"#bbf7d0" },
  rejected:   { bg:"#fef2f2", color:"#dc2626", border:"#fecaca" },
  paid:       { bg:"#eff6ff", color:"#2563eb", border:"#bfdbfe" },
  processing: { bg:"#ecfeff", color:"#0891b2", border:"#a5f3fc" },
  "on hold":  { bg:"#f5f3ff", color:"#7c3aed", border:"#ddd6fe" },
};
function StatusBadge({ status }) {
  const s = STATUS_COLORS[status?.toLowerCase()] || { bg:"#f8fafc", color:"#475569", border:"#e2e8f0" };
  return (
    <span style={{ display:"inline-flex", alignItems:"center", padding:"3px 10px",
      borderRadius:20, fontSize:12, fontWeight:600, background:s.bg, color:s.color, border:`1px solid ${s.border}` }}>
      {status || "—"}
    </span>
  );
}

function Avatar({ name, size=40 }) {
  const colors = ["#2563eb","#7c3aed","#16a34a","#ea580c","#0891b2","#d97706","#db2777"];
  const initials = (name||"?").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
  const color = colors[(name?.charCodeAt(0)||0) % colors.length];
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", background:color, color:"#fff",
      display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:size*0.38, flexShrink:0 }}>
      {initials}
    </div>
  );
}

function fmt(n) { return new Intl.NumberFormat("en-IN", { style:"currency", currency:"INR", maximumFractionDigits:0 }).format(n||0); }

function UserCard({ user, invoices, selected, onClick }) {
  const total   = invoices.length;
  const paid    = invoices.filter(i => i.status?.toLowerCase()==="paid").length;
  const pending = invoices.filter(i => i.status?.toLowerCase()==="pending").length;
  const amount  = invoices.reduce((s,i) => s + (i.amount||0), 0);

  return (
    <div onClick={onClick} style={{
      background: selected ? "var(--accent)" : "#fff",
      border: `2px solid ${selected ? "var(--accent)" : "var(--border)"}`,
      borderRadius:12, padding:"16px 18px", cursor:"pointer",
      transition:"all 0.18s", boxShadow: selected ? "0 4px 16px rgba(37,99,235,0.2)" : "var(--shadow-sm)",
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
        <Avatar name={user.name||user.uploadedBy} size={42} />
        <div>
          <div style={{ fontWeight:700, fontSize:14, color: selected ? "#fff" : "var(--text-primary)" }}>{user.name||user.uploadedBy}</div>
          <div style={{ fontSize:12, color: selected ? "rgba(255,255,255,0.7)" : "var(--text-muted)" }}>{user.department||user.email||""}</div>
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
        {[
          ["Invoices", total, selected ? "rgba(255,255,255,0.2)" : "#eff6ff", selected ? "#fff" : "#2563eb"],
          ["Paid",     paid,  selected ? "rgba(255,255,255,0.2)" : "#f0fdf4", selected ? "#fff" : "#16a34a"],
          ["Pending",  pending, selected ? "rgba(255,255,255,0.2)" : "#fff7ed", selected ? "#fff" : "#ea580c"],
        ].map(([label, val, bg, color]) => (
          <div key={label} style={{ background:bg, borderRadius:8, padding:"8px 10px" }}>
            <div style={{ fontSize:11, color, fontWeight:600, opacity:0.8 }}>{label}</div>
            <div style={{ fontSize:18, fontWeight:700, color }}>{val}</div>
          </div>
        ))}
        <div style={{ background: selected ? "rgba(255,255,255,0.2)" : "#f5f3ff", borderRadius:8, padding:"8px 10px" }}>
          <div style={{ fontSize:11, color: selected ? "#fff" : "#7c3aed", fontWeight:600, opacity:0.8 }}>Value</div>
          <div style={{ fontSize:13, fontWeight:700, color: selected ? "#fff" : "#7c3aed" }}>{fmt(amount)}</div>
        </div>
      </div>
    </div>
  );
}

export default function UserWiseData() {
  const [users,    setUsers]    = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState(null); // selectedUser name
  const [search,   setSearch]   = useState("");
  const [invSearch, setInvSearch] = useState("");

  const { page, pageSize, setPage, setPageSize, resetPage, paginate } = usePagination(10);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      setLoading(true);
      const [uRes, iRes] = await Promise.all([
        fetchUsers().catch(() => ({ users:[] })),
        fetchInvoices({ limit:500 }).catch(() => ({ invoices:[] }))
      ]);
      const userList = uRes.users || uRes.data || uRes || [];
      const invList  = iRes.invoices || iRes.data || iRes || [];
      setUsers(userList);
      setInvoices(invList);
      if (userList.length > 0) setSelected(userList[0].name || userList[0].uploadedBy);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  // Group invoices by uploadedBy
  const userInvoiceMap = useMemo(() => {
    const map = {};
    invoices.forEach(inv => {
      const key = inv.uploadedBy || "Unknown";
      if (!map[key]) map[key] = [];
      map[key].push(inv);
    });
    return map;
  }, [invoices]);

  // Build display user list (merge users + invoice uploaders)
  const displayUsers = useMemo(() => {
    const uploaders = Object.keys(userInvoiceMap);
    const allNames  = new Set([...users.map(u=>u.name), ...uploaders]);
    return [...allNames].map(name => ({
      name,
      ...(users.find(u=>u.name===name)||{}),
      uploadedBy: name,
    })).filter(u => {
      const q = search.toLowerCase();
      return !q || u.name?.toLowerCase().includes(q) || u.department?.toLowerCase().includes(q);
    });
  }, [users, userInvoiceMap, search]);

  const selectedInvoices = useMemo(() => {
    const base = userInvoiceMap[selected] || [];
    const q = invSearch.toLowerCase();
    return q ? base.filter(i =>
      i.invoiceNo?.toLowerCase().includes(q) ||
      i.vendor?.toLowerCase().includes(q) ||
      i.status?.toLowerCase().includes(q) ||
      i.department?.toLowerCase().includes(q)
    ) : base;
  }, [selected, userInvoiceMap, invSearch]);

  const pageData = paginate(selectedInvoices);
  const selectedUser = displayUsers.find(u=>u.name===selected)||{name:selected};
  const allInvForUser = userInvoiceMap[selected] || [];

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:300, flexDirection:"column", gap:12 }}>
      <div style={{ width:40, height:40, border:"3px solid var(--border)", borderTopColor:"var(--accent)", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
      <span style={{ color:"var(--text-muted)", fontSize:14 }}>Loading user data…</span>
      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">👤 User-Wise Invoice Data</h1>
        <p className="page-subtitle">View invoices submitted by each user — select a user to see their activity</p>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"320px 1fr", gap:20, alignItems:"start" }}>
        {/* Left: User list */}
        <div>
          <div style={{ marginBottom:12 }}>
            <SearchBar value={search} onChange={setSearch} placeholder="Search users…" />
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:10, maxHeight:"calc(100vh - 240px)", overflowY:"auto", paddingRight:4 }}>
            {displayUsers.length === 0 ? (
              <div style={{ textAlign:"center", padding:"40px 20px", color:"var(--text-muted)", fontSize:14 }}>No users found</div>
            ) : displayUsers.map(u => (
              <UserCard
                key={u.name}
                user={u}
                invoices={userInvoiceMap[u.name]||[]}
                selected={selected===u.name}
                onClick={() => { setSelected(u.name); resetPage(); setInvSearch(""); }}
              />
            ))}
          </div>
        </div>

        {/* Right: Invoice table */}
        <div>
          {selected ? (
            <>
              {/* User summary header */}
              <div style={{ background:"#fff", borderRadius:12, border:"1px solid var(--border)", padding:"20px 24px", marginBottom:16, display:"flex", alignItems:"center", gap:16 }}>
                <Avatar name={selected} size={52} />
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, fontSize:18 }}>{selected}</div>
                  <div style={{ fontSize:13, color:"var(--text-muted)" }}>{selectedUser.department||selectedUser.email||"—"}</div>
                </div>
                <div style={{ display:"flex", gap:20, textAlign:"center" }}>
                  {[
                    ["Total",   allInvForUser.length, "#2563eb"],
                    ["Paid",    allInvForUser.filter(i=>i.status?.toLowerCase()==="paid").length, "#16a34a"],
                    ["Pending", allInvForUser.filter(i=>i.status?.toLowerCase()==="pending").length, "#ea580c"],
                    ["Rejected",allInvForUser.filter(i=>i.status?.toLowerCase()==="rejected").length, "#dc2626"],
                  ].map(([label,val,color])=>(
                    <div key={label}>
                      <div style={{ fontSize:22, fontWeight:700, color }}>{val}</div>
                      <div style={{ fontSize:11, color:"var(--text-muted)", fontWeight:600 }}>{label}</div>
                    </div>
                  ))}
                  <div style={{ borderLeft:"1px solid var(--border)", paddingLeft:20 }}>
                    <div style={{ fontSize:16, fontWeight:700, color:"#7c3aed" }}>{fmt(allInvForUser.reduce((s,i)=>s+(i.amount||0),0))}</div>
                    <div style={{ fontSize:11, color:"var(--text-muted)", fontWeight:600 }}>Total Value</div>
                  </div>
                </div>
              </div>

              {/* Invoice search */}
              <div style={{ marginBottom:12 }}>
                <SearchBar value={invSearch} onChange={v=>{setInvSearch(v);resetPage();}} placeholder="Search invoices…" />
              </div>

              <div className="card">
                <div className="card-header">
                  <span className="card-title">📄 Invoices by {selected}</span>
                  <span style={{ fontSize:12, color:"var(--text-muted)" }}>{selectedInvoices.length} invoices</span>
                </div>
                {selectedInvoices.length === 0 ? (
                  <div style={{ textAlign:"center", padding:"40px 20px" }}>
                    <div style={{ fontSize:40, marginBottom:8 }}>📭</div>
                    <p style={{ color:"var(--text-muted)", fontSize:14 }}>{allInvForUser.length === 0 ? "This user has not submitted any invoices." : "No invoices match your search."}</p>
                  </div>
                ) : (
                  <>
                    <div className="table-wrapper">
                      <table>
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Invoice No</th>
                            <th>Vendor</th>
                            <th>Department</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Date</th>
                            <th>Files</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pageData.map((inv, idx) => (
                            <tr key={inv.id}>
                              <td style={{ color:"var(--text-muted)", fontSize:12 }}>{(page-1)*pageSize+idx+1}</td>
                              <td style={{ fontWeight:600, fontSize:13, color:"var(--accent)" }}>{inv.invoiceNo||"—"}</td>
                              <td style={{ fontSize:13 }}>{inv.vendor||"—"}</td>
                              <td>
                                <span style={{ fontSize:12, background:"var(--bg)", padding:"3px 8px", borderRadius:6, border:"1px solid var(--border)", color:"var(--text-secondary)" }}>
                                  {inv.department||"—"}
                                </span>
                              </td>
                              <td style={{ fontWeight:600, fontSize:13 }}>{fmt(inv.amount)}</td>
                              <td><StatusBadge status={inv.status} /></td>
                              <td style={{ fontSize:12, color:"var(--text-muted)" }}>
                                {inv.dateOfReceipt ? new Date(inv.dateOfReceipt).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}) :
                                 inv.createdAt    ? new Date(inv.createdAt).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}) : "—"}
                              </td>
                              <td style={{ fontSize:12 }}>
                                <span style={{ background:"#eff6ff", color:"#2563eb", padding:"3px 8px", borderRadius:6, fontWeight:600 }}>
                                  {(inv.documents?.length||0) + (inv.documentUrl ? 1 : 0)} file{(inv.documents?.length||0) !== 1 ? "s" : ""}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <Pagination currentPage={page} totalItems={selectedInvoices.length} pageSize={pageSize}
                      onPageChange={setPage} pageSizeOptions={[10,20,50]} onPageSizeChange={setPageSize} />
                  </>
                )}
              </div>
            </>
          ) : (
            <div style={{ textAlign:"center", padding:"80px 20px", background:"#fff", borderRadius:12, border:"1px solid var(--border)" }}>
              <div style={{ fontSize:48, marginBottom:12 }}>👈</div>
              <p style={{ color:"var(--text-muted)", fontSize:15 }}>Select a user from the left to view their invoices</p>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
    </div>
  );
}

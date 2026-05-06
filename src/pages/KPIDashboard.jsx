import { useEffect, useState } from "react";
import { useInvoices } from "../context/InvoiceContext";
import { fetchDashboardKpis } from "../api/Service";

const STATUS_COLORS = {
  "Pending Review": "badge-blue",
  "Under Review": "badge-cyan",
  "HOD Approval": "badge-purple",
  "Payment Approval": "badge-yellow",
  "Ready for Payment": "badge-green",
  "On Hold": "badge-yellow",
  "Rejected": "badge-red",
  "Paid": "badge-green",
};

export default function KPIDashboard() {
  const { invoices,getDaysPending, getAgingBucket } = useInvoices();
// const[invoices, setInvoices]=useState([])
  const total = invoices?.length;
  const pending = invoices?.filter(i => ["Pending Review","Under Review"]?.includes(i.status))?.length;
  const onHold = invoices?.filter(i => i.status === "On Hold").length;
  const rejected = invoices?.filter(i => i.status === "Rejected").length;
  const paid = invoices?.filter(i => i.status === "Paid").length;
  const awaitingPayment = invoices?.filter(i => ["Payment Approval","Ready for Payment","HOD Approval"].includes(i.status))?.length;

  const totalValue = invoices?.reduce((s, i) => s + i.amount, 0);
  const paidValue = invoices?.filter(i => i.status === "Paid").reduce((s, i) => s + i.amount, 0);

  const fmt = (n) => "₹" + n.toLocaleString("en-IN");

  const agingData = ["0–3 Days","4–7 Days","8–15 Days","15+ Days"].map(bucket => ({
    bucket,
    count: invoices?.filter(i => i.status !== "Paid" && i.status !== "Rejected" && getAgingBucket(getDaysPending(i.dateOfReceipt)) === bucket)?.length
  }));
  const maxAging = Math.max(...agingData.map(a => a.count), 1);

  const byDept = {};
  invoices?.forEach(i => {
    if (!byDept[i.department]) byDept[i.department] = { total: 0, pending: 0 };
    byDept[i.department].total++;
    if (!["Paid","Rejected"].includes(i.status)) byDept[i.department].pending++;
  });
  const deptData = Object.entries(byDept).sort((a,b) => b[1].pending - a[1].pending);
  const maxDept = Math.max(...deptData.map(d => d[1].total), 1);

  const recentInvoices = [...invoices].sort((a,b) => new Date(b.dateOfReceipt) - new Date(a.dateOfReceipt)).slice(0,5);

  const statusCounts = {};
  invoices?.forEach(i => { statusCounts[i.status] = (statusCounts[i.status] || 0) + 1; });

  const avgProcessingDays = () => {
    const paid = invoices?.filter(i => i.paymentDate && i.dateOfReceipt);
    if (!paid.length) return "N/A";
    const avg = paid.reduce((s, i) => s + Math.floor((new Date(i.paymentDate) - new Date(i.dateOfReceipt)) / 86400000), 0) / paid.length;
    return avg.toFixed(1) + " days";
  };
   
     useEffect(() => {
        const fetchKpiData = async () => {
          try {
            const response = await fetchDashboardKpis();
            const data = response?.data || [];
            // setInvoices(data);
          } catch {
            // setInvoices([]);
          }
        };
    
        fetchKpiData();
      }, []);
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Accounts Payable Dashboard</h1>
        <p className="page-subtitle">Real-time overview of invoice workflow and payment status</p>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card blue">
          <div className="kpi-label">Total Invoices</div>
          <div className="kpi-value">{total}</div>
          <div className="kpi-meta">{fmt(totalValue)} total value</div>
        </div>
        <div className="kpi-card cyan">
          <div className="kpi-label">Pending Review</div>
          <div className="kpi-value">{pending}</div>
          <div className="kpi-meta">Awaiting finance action</div>
        </div>
        <div className="kpi-card yellow">
          <div className="kpi-label">Awaiting Approval</div>
          <div className="kpi-value">{awaitingPayment}</div>
          <div className="kpi-meta">HOD + payment approvals</div>
        </div>
        <div className="kpi-card red">
          <div className="kpi-label">On Hold / Rejected</div>
          <div className="kpi-value">{onHold + rejected}</div>
          <div className="kpi-meta">{onHold} hold · {rejected} rejected</div>
        </div>
        <div className="kpi-card green">
          <div className="kpi-label">Paid Invoices</div>
          <div className="kpi-value">{paid}</div>
          <div className="kpi-meta">{fmt(paidValue)} disbursed</div>
        </div>
        <div className="kpi-card purple">
          <div className="kpi-label">Avg Processing</div>
          <div className="kpi-value" style={{fontSize:22}}>{avgProcessingDays()}</div>
          <div className="kpi-meta">Receipt to payment</div>
        </div>
      </div>

      <div className="content-grid grid-2">
        {/* Aging Analysis */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">📅 Aging Analysis</span>
            <span style={{fontSize:11,color:'var(--text-muted)'}}>Active invoices only</span>
          </div>
          <div className="card-body">
            {agingData.map(({bucket, count}) => {
              const colors = {"0–3 Days":"var(--success)","4–7 Days":"var(--warning)","8–15 Days":"#c2410c","15+ Days":"var(--danger)"};
              const pct = (count / maxAging) * 100;
              return (
                <div key={bucket} style={{marginBottom:14}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                    <span style={{fontSize:12,fontWeight:600,color:'var(--text-secondary)'}}>{bucket}</span>
                    <span style={{fontSize:13,fontWeight:700,color:colors[bucket]}}>{count}</span>
                  </div>
                  <div style={{height:8,background:'#f1f5f9',borderRadius:4,overflow:'hidden'}}>
                    <div style={{height:'100%',width:`${pct}%`,background:colors[bucket],borderRadius:4,transition:'width 0.5s ease'}} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Status Distribution */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">📊 Status Distribution</span>
          </div>
          <div className="card-body">
            {Object.entries(statusCounts).map(([status, count]) => {
              const pct = (count / total) * 100;
              return (
                <div key={status} style={{marginBottom:11,display:'flex',alignItems:'center',gap:10}}>
                  <span style={{width:140,fontSize:12,fontWeight:500,color:'var(--text-secondary)',flexShrink:0}}>{status}</span>
                  <div style={{flex:1,height:7,background:'#f1f5f9',borderRadius:4,overflow:'hidden'}}>
                    <div style={{height:'100%',width:`${pct}%`,background:'var(--accent)',borderRadius:4,opacity:0.7+0.3*(count/total)}} />
                  </div>
                  <span style={{width:24,textAlign:'right',fontSize:12,fontWeight:700,color:'var(--text-primary)'}}>{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{height:20}} />

      <div className="content-grid grid-2">
        {/* Department Breakdown */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">🏢 Department Breakdown</span>
          </div>
          <div className="card-body">
            {deptData.map(([dept, data]) => (
              <div key={dept} style={{marginBottom:12}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                  <span style={{fontSize:12.5,fontWeight:600,color:'var(--text-primary)'}}>{dept}</span>
                  <span style={{fontSize:11.5,color:'var(--text-muted)'}}>{data.pending} pending / {data.total} total</span>
                </div>
                <div style={{height:6,background:'#f1f5f9',borderRadius:3,overflow:'hidden',display:'flex',gap:2}}>
                  <div style={{height:'100%',width:`${(data.pending/maxDept)*100}%`,background:'var(--warning)',borderRadius:3}} />
                  <div style={{height:'100%',width:`${((data.total-data.pending)/maxDept)*100}%`,background:'var(--success)',borderRadius:3,opacity:0.6}} />
                </div>
              </div>
            ))}
            <div style={{display:'flex',gap:14,marginTop:14}}>
              <div style={{display:'flex',alignItems:'center',gap:5,fontSize:11}}>
                <div style={{width:10,height:10,borderRadius:2,background:'var(--warning)'}} />
                <span style={{color:'var(--text-muted)'}}>Pending</span>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:5,fontSize:11}}>
                <div style={{width:10,height:10,borderRadius:2,background:'var(--success)',opacity:0.6}} />
                <span style={{color:'var(--text-muted)'}}>Processed</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Invoices */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">🕐 Recent Invoices</span>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Invoice ID</th>
                  <th>Vendor</th>
                  <th>Amount</th>
                  <th>Receipt Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentInvoices?.map(inv => (
                  <tr key={inv.id}>
                    <td>{inv.id}</td>
                    <td style={{maxWidth:130,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{inv.vendor}</td>
                    <td className="amount-cell">₹{inv.amount.toLocaleString("en-IN")}</td>
                    <td><span className="receipt-date">{inv.dateOfReceipt}</span></td>
                    <td><span className={`badge ${STATUS_COLORS[inv.status] || 'badge-gray'}`}>{inv.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

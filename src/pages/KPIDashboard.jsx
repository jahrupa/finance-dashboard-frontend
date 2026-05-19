/**
 * components/KPIDashboard.jsx
 * Production-grade AP Dashboard — full API integration.
 * Styling: Pure CSS (no Tailwind)
 *
 * Features:
 *  ✓ All 5 dashboard endpoints called in parallel
 *  ✓ 8 KPI cards with icons and sub-labels
 *  ✓ Invoice Aging bar chart (Recharts)
 *  ✓ Monthly Trend dual-axis area chart
 *  ✓ Department breakdown table
 *  ✓ Top Vendors horizontal bar chart
 *  ✓ Skeleton loading states
 *  ✓ Error banner
 *  ✓ Auto-refresh every 60 s
 *  ✓ Month selector (3 / 6 / 12)
 *  ✓ INR currency formatting (₹Cr / ₹L)
 */

import {
  ArrowPathIcon,
  BanknotesIcon,
  CheckBadgeIcon,
  ClockIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  PauseCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { ArrowTrendingUpIcon } from "@heroicons/react/24/solid";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { dashboardApi } from "../api/dashboard";
// import "../dashboard.css";

// ─── Formatters ───────────────────────────────────────────────────────────────

const formatINR = (v) => {
  if (v == null) return "—";
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)}Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(2)}L`;
  if (v >= 1e3) return `₹${(v / 1e3).toFixed(1)}K`;
  return `₹${v.toLocaleString("en-IN")}`;
};

const fmtNum = (v) => (v != null ? v.toLocaleString("en-IN") : "—");

const fmtMonth = (ym) => {
  if (!ym) return "";
  const [y, m] = ym.split("-");
  return new Date(+y, +m - 1).toLocaleString("en-IN", {
    month: "short",
    year: "2-digit",
  });
};

// ─── Design tokens ────────────────────────────────────────────────────────────

const PALETTE = {
  primary: "#6366f1",
  success: "#10b981",
  warning: "#f59e0b",
  danger:  "#ef4444",
  info:    "#3b82f6",
  slate:   "#94a3b8",
  aging:   ["#10b981", "#f59e0b", "#f97316", "#ef4444"],
};

// ─── Primitives ───────────────────────────────────────────────────────────────

function Skeleton({ style = {} }) {
  return <div className="skeleton" style={style} />;
}

function SectionTitle({ children }) {
  return (
    <h2 className="section-title">
      <span className="section-title-bar" />
      {children}
    </h2>
  );
}

function EmptyState({ message = "No data available" }) {
  return (
    <div className="empty-state">
      <DocumentTextIcon />
      <p>{message}</p>
    </div>
  );
}

function ChartTooltip({ active, payload, label, valueFormatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="chart-tooltip-row">
          <span className="chart-tooltip-name" style={{ color: p.color }}>
            {p.name}
          </span>
          <span className="chart-tooltip-val">
            {valueFormatter ? valueFormatter(p.value, p.name) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KPICard({ title, value, sub, icon: Icon, color, loading }) {
  if (loading) {
    return (
      <div className="kpi-card-skeleton">
        <Skeleton style={{ height: 11, width: "65%", marginBottom: 16 }} />
        <Skeleton style={{ height: 26, width: "50%", marginBottom: 8 }} />
        <Skeleton style={{ height: 11, width: "35%" }} />
      </div>
    );
  }
  return (
    <div className="kpi-card">
      <div className="kpi-card-header">
        <p className="kpi-card-title">{title}</p>
        <span
          className="kpi-card-icon"
          style={{ backgroundColor: `${color}18`, color }}
        >
          <Icon />
        </span>
      </div>
      <p className="kpi-card-value">{value}</p>
      {sub && <p className="kpi-card-sub">{sub}</p>}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function KPIDashboard() {
  const [data, setData]               = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing]   = useState(false);
  const [months, setMonths]           = useState(6);
  const timerRef                      = useRef(null);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      setError(null);

      const result = await dashboardApi.fetchAll(months);

      if (result.errors.length > 0 && !result.kpis) {
        setError(result.errors.join(" · "));
      } else {
        setData(result);
        if (result.errors.length > 0) {
          setError(`Some data could not be loaded: ${result.errors.join(", ")}`);
        }
      }

      setLastUpdated(new Date());
      setLoading(false);
      setRefreshing(false);
    },
    [months]
  );

  useEffect(() => { load(false); }, [load]);

  useEffect(() => {
    timerRef.current = setInterval(() => load(true), 60_000);
    return () => clearInterval(timerRef.current);
  }, [load]);

  // ── Derived data ──────────────────────────────────────────────────────────
  const kpis    = data?.kpis;
  const aging   = data?.aging        ?? [];
  const depts   = data?.deptStats    ?? [];
  const trends  = (data?.monthlyTrends ?? []).map((t) => ({
    ...t,
    label: fmtMonth(t.month),
  }));
  const vendors = data?.topVendors   ?? [];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="dashboard-root">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="header">
        <div className="header-inner">
          <div className="header-brand">
            <div className="header-logo">
              <BanknotesIcon />
            </div>
            <div>
              <p className="header-title">AP Dashboard</p>
              <p className="header-subtitle">Accounts Payable · Invoice Operations</p>
            </div>
          </div>

          <div className="header-actions">
            {/* {lastUpdated && !loading && (
              <span className="header-updated">
                Updated {lastUpdated.toLocaleTimeString("en-IN")}
              </span>
            )} */}

            <select
              className="month-select"
              value={months}
              onChange={(e) => setMonths(+e.target.value)}
            >
              <option value={3}>3 Months</option>
              <option value={6}>6 Months</option>
              <option value={12}>12 Months</option>
            </select>

            <button
              className="refresh-btn"
              onClick={() => load(true)}
              disabled={loading || refreshing}
            >
              <ArrowPathIcon className={refreshing ? "spin" : ""} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <main className="main">

        {/* Error Banner */}
        {error && (
          <div className="error-banner">
            <ExclamationTriangleIcon />
            <div>
              <p className="error-banner-title">Failed to load some data</p>
              <p className="error-banner-detail">{error}</p>
            </div>
          </div>
        )}

        {/* ── KPI Cards ─────────────────────────────────────────────────── */}
        <section>
          <SectionTitle>Key Performance Indicators</SectionTitle>
          <div className="kpi-grid">
            <KPICard
              loading={loading}
              title="Total Invoices"
              value={fmtNum(kpis?.totalInvoices)}
              sub={`Portfolio: ${formatINR(kpis?.totalValue)}`}
              icon={DocumentTextIcon}
              color={PALETTE.primary}
            />
            <KPICard
              loading={loading}
              title="Pending Review"
              value={fmtNum(kpis?.pendingReview)}
              sub="Awaiting Finance check"
              icon={ClockIcon}
              color={PALETTE.warning}
            />
            <KPICard
              loading={loading}
              title="Awaiting Approval"
              value={fmtNum(kpis?.awaitingApproval)}
              sub={kpis ? `HOD: ${kpis.hodPending} · Pmt: ${kpis.paymentPending}` : undefined}
              icon={ArrowTrendingUpIcon}
              color={PALETTE.info}
            />
            <KPICard
              loading={loading}
              title="Ready for Payment"
              value={fmtNum(kpis?.readyForPayment)}
              sub="Approved, pending disbursement"
              icon={BanknotesIcon}
              color={PALETTE.success}
            />
            <KPICard
              loading={loading}
              title="Paid"
              value={fmtNum(kpis?.paidCount)}
              sub={formatINR(kpis?.paidValue)}
              icon={CheckBadgeIcon}
              color={PALETTE.success}
            />
            <KPICard
              loading={loading}
              title="On Hold"
              value={fmtNum(kpis?.onHold)}
              sub="Requires attention"
              icon={PauseCircleIcon}
              color={PALETTE.warning}
            />
            <KPICard
              loading={loading}
              title="Rejected"
              value={fmtNum(kpis?.rejected)}
              sub="Needs correction"
              icon={XCircleIcon}
              color={PALETTE.danger}
            />
            <KPICard
              loading={loading}
              title="Avg Cycle Days"
              value={kpis?.avgCycleDays ? `${kpis.avgCycleDays}d` : "—"}
              sub="Receipt → Payment"
              icon={ClockIcon}
              color={PALETTE.slate}
            />
          </div>
        </section>

        {/* ── Charts Row ────────────────────────────────────────────────── */}
        <div className="charts-row">

          {/* Aging Analysis */}
          <div className="card">
            <SectionTitle>Invoice Aging — Open Invoices</SectionTitle>
            {loading ? (
              <Skeleton style={{ height: 192 }} />
            ) : aging.length === 0 ? (
              <EmptyState />
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={aging} barSize={40} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="bucket"
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "#f8fafc" }} />
                  <Bar dataKey="count" name="Invoices" radius={[6, 6, 0, 0]}>
                    {aging.map((_, i) => (
                      <Cell key={i} fill={PALETTE.aging[i % PALETTE.aging.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Monthly Trends */}
          <div className="card">
            <SectionTitle>Monthly Volume Trend</SectionTitle>
            {loading ? (
              <Skeleton style={{ height: 192 }} />
            ) : trends.length === 0 ? (
              <EmptyState />
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <AreaChart data={trends} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="gCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={PALETTE.primary} stopOpacity={0.15} />
                      <stop offset="95%" stopColor={PALETTE.primary} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gAmt" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={PALETTE.success} stopOpacity={0.15} />
                      <stop offset="95%" stopColor={PALETTE.success} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="cnt"
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                    width={28}
                  />
                  <YAxis
                    yAxisId="amt"
                    orientation="right"
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => formatINR(v)}
                    width={44}
                  />
                  <Tooltip
                    content={
                      <ChartTooltip
                        valueFormatter={(v, n) => (n === "Amount" ? formatINR(v) : v)}
                      />
                    }
                  />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                  <Area
                    yAxisId="cnt"
                    type="monotone"
                    dataKey="count"
                    name="Count"
                    stroke={PALETTE.primary}
                    fill="url(#gCount)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  <Area
                    yAxisId="amt"
                    type="monotone"
                    dataKey="amount"
                    name="Amount"
                    stroke={PALETTE.success}
                    fill="url(#gAmt)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ── Department + Top Vendors ───────────────────────────────────── */}
        <div className="bottom-row">

          {/* Department Breakdown */}
          <div className="card">
            <SectionTitle>Department Breakdown</SectionTitle>
            {loading ? (
              <div className="skeleton-rows">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} style={{ height: 32 }} />
                ))}
              </div>
            ) : depts.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="table-wrapper">
                <table className="dept-table">
                  <thead>
                    <tr>
                      <th>Department</th>
                      <th>Total</th>
                      <th>Pending</th>
                      <th>Paid</th>
                      <th>Rejected</th>
                    </tr>
                  </thead>
                  <tbody>
                    {depts.map((d) => (
                      <tr key={d.department}>
                        <td>{d.department || "—"}</td>
                        <td>{d.total}</td>
                        <td>
                          <span className={d.pending > 0 ? "cell-pending-active" : "cell-pending-zero"}>
                            {d.pending}
                          </span>
                        </td>
                        <td>
                          <span className="cell-paid">{d.paid}</span>
                        </td>
                        <td>
                          <span className={d.rejected > 0 ? "cell-rejected-active" : "cell-rejected-zero"}>
                            {d.rejected}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Top Vendors */}
          <div className="card">
            <SectionTitle>Top Vendors by Invoice Value</SectionTitle>
            {loading ? (
              <Skeleton style={{ height: 230 }} />
            ) : vendors.length === 0 ? (
              <EmptyState />
            ) : (
              <ResponsiveContainer width="100%" height={230}>
                <BarChart
                  data={vendors.slice(0, 8)}
                  layout="vertical"
                  barSize={12}
                  margin={{ left: 4, right: 16, top: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => formatINR(v)}
                  />
                  <YAxis
                    type="category"
                    dataKey="vendor"
                    width={88}
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => (v?.length > 11 ? `${v.slice(0, 11)}…` : (v ?? "—"))}
                  />
                  <Tooltip
                    content={<ChartTooltip valueFormatter={(v) => formatINR(v)} />}
                    cursor={{ fill: "#f8fafc" }}
                  />
                  <Bar dataKey="amount" name="Amount" fill={PALETTE.primary} radius={[0, 5, 5, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Footer */}
        {/* <p className="dashboard-footer">
          AP Dashboard v2.0 · Auto-refreshes every 60 seconds
        </p> */}
      </main>
    </div>
  );
}
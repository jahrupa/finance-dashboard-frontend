import API from "./axios";
import { DASHBOARD_AGING, DASHBOARD_DEPT_STATS, DASHBOARD_KPIS, DASHBOARD_MONTHLY_TRENDS, DASHBOARD_TOP_VENDORS } from "./endpoints";

async function safe(fn) {
  try {
    const res = await fn();
    // Unwrap { success, data } backend shape
    return { data: res.data?.data ?? res.data, error: null };
  } catch (err) {
    return { data: null, error: err.message };
  }
}

export const dashboardApi = {
  /** GET /dashboard/kpis → KPIResponse */
  getKPIs: () =>
    safe(() => API.get(DASHBOARD_KPIS)),

  /** GET /dashboard/aging → AgingBucket[] */
  getAging: () =>
    safe(() => API.get(DASHBOARD_AGING)),

  /** GET /dashboard/department-stats → DeptStat[] */
  getDepartmentStats: () =>
    safe(() => API.get(DASHBOARD_DEPT_STATS)),

  /** GET /dashboard/monthly-trends?months=N → MonthlyTrend[] */
  getMonthlyTrends: (months = 6) =>
    safe(() => API.get(DASHBOARD_MONTHLY_TRENDS, { params: { months } })),

  /** GET /dashboard/top-vendors?limit=N → VendorStat[] */
  getTopVendors: (limit = 10) =>
    safe(() => API.get(DASHBOARD_TOP_VENDORS, { params: { limit } })),

  /**
   * Fetch all dashboard data in parallel.
   * Returns { kpis, aging, deptStats, monthlyTrends, topVendors, errors }
   */
  async fetchAll(months = 6) {
    const [kpiRes, agingRes, deptRes, trendRes, vendorRes] = await Promise.all([
      this.getKPIs(),
      this.getAging(),
      this.getDepartmentStats(),
      this.getMonthlyTrends(months),
      this.getTopVendors(10),
    ]);
console.log(kpiRes,'kpiRes')
    return {
      kpis:          kpiRes.data,
      aging:         agingRes.data,
      deptStats:     deptRes.data,
      monthlyTrends: trendRes.data,
      topVendors:    vendorRes.data,
      // Collect only non-null errors
      errors: [
        kpiRes.error,
        agingRes.error,
        deptRes.error,
        trendRes.error,
        vendorRes.error,
      ].filter(Boolean),
    };
  },
};

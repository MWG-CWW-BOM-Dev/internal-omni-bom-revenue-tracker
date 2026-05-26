import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  BarChart, 
  Bar, 
  Cell, 
  PieChart, 
  Pie, 
  Legend, 
  CartesianGrid,
  ReferenceLine
} from 'recharts';
import { LayoutDashboard, Calendar, Users, FolderKanban, TrendingUp, Award, DollarSign, Clock, Briefcase, Target } from 'lucide-react';

function toDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function range(start, end) {
  return { startDate: toDateInput(start), endDate: toDateInput(end) };
}

function getPresetRange(period) {
  const now = new Date();
  const year = now.getFullYear();

  if (period === 'this-month') return range(new Date(year, now.getMonth(), 1), new Date(year, now.getMonth() + 1, 0));
  if (period === 'last-month') return range(new Date(year, now.getMonth() - 1, 1), new Date(year, now.getMonth(), 0));
  if (period === 'q1') return range(new Date(year, 0, 1), new Date(year, 2, 31));
  if (period === 'q2') return range(new Date(year, 3, 1), new Date(year, 5, 30));
  if (period === 'q3') return range(new Date(year, 6, 1), new Date(year, 8, 30));
  if (period === 'q4') return range(new Date(year, 9, 1), new Date(year, 11, 31));
  if (period === 'fy') {
    const startYear = now.getMonth() >= 3 ? year : year - 1;
    return range(new Date(startYear, 3, 1), new Date(startYear + 1, 2, 31));
  }
  return range(new Date(year, 0, 1), new Date(year, 11, 31));
}

export default function Dashboard({ summary, resources, projects, brands = [], markets = [], filters, timesheets = [], showAnalytics, currencyConfig = { rate: 1, symbol: '$' }, ippBudget = 100000 }) {
  const [analytics, setAnalytics] = useState({
    q1: 0, q2: 0, q3: 0, q4: 0, fy: 0, cy: 0, thisMonth: 0, lastMonth: 0
  });

  const [utilizationPeriod, setUtilizationPeriod] = useState('monthly');
  const [customStartDate, setCustomStartDate] = useState(filters?.startDate || toDateInput(new Date()));
  const [customEndDate, setCustomEndDate] = useState(filters?.endDate || toDateInput(new Date()));

  // Dynamic capacity count excluding weekends
  function getWorkdaysCount(startDateStr, endDateStr) {
    if (!startDateStr || !endDateStr) return 0;
    const start = new Date(startDateStr + 'T00:00:00');
    const end = new Date(endDateStr + 'T00:00:00');
    let count = 0;
    const current = new Date(start);
    while (current <= end) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // 0 = Sunday, 6 = Saturday
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
    return count;
  }

  function getUtilizationPeriodRange(period) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    if (period === 'active') {
      return { startDate: filters?.startDate || toDateInput(new Date(year, month, 1)), endDate: filters?.endDate || toDateInput(new Date(year, month + 1, 0)) };
    }
    if (period === 'weekly') {
      const start = new Date(now);
      start.setDate(now.getDate() - 6);
      return { startDate: toDateInput(start), endDate: toDateInput(now) };
    }
    if (period === 'monthly') {
      return { startDate: toDateInput(new Date(year, month, 1)), endDate: toDateInput(new Date(year, month + 1, 0)) };
    }
    if (period === 'quarterly') {
      const quarterIndex = Math.floor(month / 3);
      const start = new Date(year, quarterIndex * 3, 1);
      const end = new Date(year, (quarterIndex + 1) * 3, 0);
      return { startDate: toDateInput(start), endDate: toDateInput(end) };
    }
    if (period === 'half-yearly') {
      const start = month < 6 ? new Date(year, 0, 1) : new Date(year, 6, 1);
      const end = month < 6 ? new Date(year, 5, 30) : new Date(year, 11, 31);
      return { startDate: toDateInput(start), endDate: toDateInput(end) };
    }
    if (period === 'cy-26') {
      return { startDate: '2026-01-01', endDate: '2026-12-31' };
    }
    if (period === 'fy-26-27') {
      return { startDate: '2026-04-01', endDate: '2027-03-31' };
    }
    if (period === 'custom') {
      return { startDate: customStartDate, endDate: customEndDate };
    }
    return { startDate: toDateInput(new Date(year, month, 1)), endDate: toDateInput(new Date(year, month + 1, 0)) };
  }

  function formatRangeCaption(startDate, endDate) {
    if (!startDate || !endDate) return '';
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    const fmt = (d) => d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${fmt(start)} - ${fmt(end)}`;
  }

  const utilRange = getUtilizationPeriodRange(utilizationPeriod);
  const weekdaysCount = getWorkdaysCount(utilRange.startDate, utilRange.endDate);
  const capacityHours = weekdaysCount * 8;

  const utilizationData = resources.map(res => {
    // Filter timesheet entries for this resource in the calculated date range
    const resEntries = timesheets.filter(entry => {
      const entryResId = entry.resourceId?._id || entry.resourceId;
      const entryDate = entry.date ? entry.date.slice(0, 10) : '';
      
      const matchesResource = entryResId === res._id;
      const matchesDate = entryDate >= utilRange.startDate && entryDate <= utilRange.endDate;
      
      return matchesResource && matchesDate;
    });

    let workHours = 0;
    let leaveHours = 0;

    resEntries.forEach(entry => {
      if (entry.projectId) {
        workHours += entry.hoursWorked;
      } else if (entry.leaveType) {
        leaveHours += entry.hoursWorked;
      }
    });

    const totalHours = workHours + leaveHours;
    const utilizationRate = capacityHours > 0 ? Math.round((totalHours / capacityHours) * 100) : 0;

    return {
      name: res.name,
      designation: res.designation || '',
      'Work Hours': Math.round(workHours),
      'Leave Hours': Math.round(leaveHours),
      'Total Hours': Math.round(totalHours),
      'Capacity Hours': capacityHours,
      'Utilization Rate': utilizationRate
    };
  }).sort((a, b) => b['Utilization Rate'] - a['Utilization Rate']);

  useEffect(() => {
    if (!showAnalytics) return;
    
    async function loadAnalytics() {
      try {
        const fetchRange = (period) => api.dashboard({ ...getPresetRange(period), marketId: filters?.marketId || '' });
        
        const [q1, q2, q3, q4, fy, cy, thisMonth, lastMonth] = await Promise.all([
          fetchRange('q1'),
          fetchRange('q2'),
          fetchRange('q3'),
          fetchRange('q4'),
          fetchRange('fy'),
          fetchRange('this-year'),
          fetchRange('this-month'),
          fetchRange('last-month')
        ]);
        
        setAnalytics({
          q1: q1.totalRevenue,
          q2: q2.totalRevenue,
          q3: q3.totalRevenue,
          q4: q4.totalRevenue,
          fy: fy.totalRevenue,
          cy: cy.totalRevenue,
          thisMonth: thisMonth.totalRevenue,
          lastMonth: lastMonth.totalRevenue
        });
      } catch (err) {
        console.error('Failed to load analytics', err);
      }
    }
    loadAnalytics();
  }, [filters?.marketId, showAnalytics]);

  const fmt = (val) => currency(val, currencyConfig);
  const rawVal = (val) => Number(val || 0) * currencyConfig.rate;

  // Dynamic delta calculations comparing active filtered date range against the previous period of the exact same length
  const metricsDeltas = React.useMemo(() => {
    const idVal = (val) => {
      if (!val) return '';
      return typeof val === 'string' ? val : val._id || String(val);
    };

    let diffDays = 30;
    if (filters?.startDate && filters?.endDate) {
      const start = new Date(filters.startDate + 'T00:00:00');
      const end = new Date(filters.endDate + 'T00:00:00');
      const diffTime = end.getTime() - start.getTime();
      diffDays = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1);
    }

    let prevStartStr = '';
    let prevEndStr = '';
    let periodLabel = 'vs last period';

    if (filters?.startDate && filters?.endDate) {
      const start = new Date(filters.startDate + 'T00:00:00');
      const prevEnd = new Date(start);
      prevEnd.setDate(start.getDate() - 1);
      
      const prevStart = new Date(prevEnd);
      prevStart.setDate(prevEnd.getDate() - diffDays + 1);

      prevStartStr = toDateInput(prevStart);
      prevEndStr = toDateInput(prevEnd);

      if (diffDays <= 8) {
        periodLabel = 'vs last 7 days';
      } else if (diffDays <= 32) {
        periodLabel = 'vs last month';
      } else if (diffDays <= 95) {
        periodLabel = 'vs last 90 days';
      } else if (diffDays <= 185) {
        periodLabel = 'vs last 6 months';
      } else {
        periodLabel = 'vs last year';
      }
    }

    const currentEntries = timesheets.filter(entry => {
      const d = entry.date.slice(0, 10);
      const matchesDate = d >= filters?.startDate && d <= filters?.endDate;
      const matchesMarket = !filters?.marketId || idVal(entry.projectId?.marketId || entry.projectId) === filters.marketId;
      return matchesDate && matchesMarket;
    });

    const previousEntries = timesheets.filter(entry => {
      const d = entry.date.slice(0, 10);
      const matchesDate = d >= prevStartStr && d <= prevEndStr;
      const matchesMarket = !filters?.marketId || idVal(entry.projectId?.marketId || entry.projectId) === filters.marketId;
      return matchesDate && matchesMarket;
    });

    const curRev = currentEntries.reduce((sum, entry) => sum + (entry.revenue || 0), 0);
    const prevRev = previousEntries.reduce((sum, entry) => sum + (entry.revenue || 0), 0);
    const revDelta = prevRev > 0 ? ((curRev - prevRev) / prevRev) * 100 : (curRev > 0 ? 100 : 0);

    const curHrs = currentEntries.reduce((sum, entry) => sum + (entry.hoursWorked || 0), 0);
    const prevHrs = previousEntries.reduce((sum, entry) => sum + (entry.hoursWorked || 0), 0);
    const hrsDelta = prevHrs > 0 ? ((curHrs - prevHrs) / prevHrs) * 100 : (curHrs > 0 ? 100 : 0);

    const curResources = new Set(currentEntries.map(entry => idVal(entry.resourceId)).filter(Boolean));
    const prevResources = new Set(previousEntries.map(entry => idVal(entry.resourceId)).filter(Boolean));
    const curResCount = curResources.size;
    const prevResCount = prevResources.size;
    const resDelta = prevResCount > 0 ? ((curResCount - prevResCount) / prevResCount) * 100 : (curResCount > 0 ? 100 : 0);

    const curProjects = new Set(currentEntries.map(entry => idVal(entry.projectId)).filter(Boolean));
    const prevProjects = new Set(previousEntries.map(entry => idVal(entry.projectId)).filter(Boolean));
    const curProjCount = curProjects.size;
    const prevProjCount = prevProjects.size;
    const projDelta = prevProjCount > 0 ? ((curProjCount - prevProjCount) / prevProjCount) * 100 : (curProjCount > 0 ? 100 : 0);

    return {
      periodLabel,
      revenue: { current: curRev, previous: prevRev, delta: revDelta },
      hours: { current: curHrs, previous: prevHrs, delta: hrsDelta },
      resources: { current: curResCount, previous: prevResCount, delta: resDelta },
      projects: { current: curProjCount, previous: prevProjCount, delta: projDelta }
    };
  }, [filters?.startDate, filters?.endDate, filters?.marketId, timesheets]);

  const renderDelta = (delta, periodLabel) => {
    if (delta > 0) {
      return (
        <small className="positive">
          +{delta.toFixed(1)}% <em>{periodLabel}</em>
        </small>
      );
    } else if (delta < 0) {
      return (
        <small className="negative">
          {delta.toFixed(1)}% <em>{periodLabel}</em>
        </small>
      );
    } else {
      return (
        <small>
          0.0% <em>{periodLabel}</em>
        </small>
      );
    }
  };

  // FUTURISTIC SLATE COLOR SCHEME (NO FLUORESCENTS)
  const COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#14b8a6', '#0d9488', '#3b82f6', '#1d4ed8'];

  // Permutation 1: Revenue by Market (calculated dynamically by mapping projects to markets)
  const marketMap = {};
  if (summary.revenueByProject) {
    summary.revenueByProject.forEach(p => {
      const fullProj = projects.find(proj => proj._id === p._id);
      let marketName = '';
      if (fullProj) {
        const mId = fullProj.marketId?._id || fullProj.marketId;
        const matchedMarket = markets.find(m => m._id === mId);
        marketName = matchedMarket?.name || fullProj.marketId?.name || 'Global / Core';
      } else {
        marketName = 'Global / Core';
      }
      marketMap[marketName] = (marketMap[marketName] || 0) + p.revenue;
    });
  }
  const marketData = Object.entries(marketMap).map(([name, value]) => ({
    name,
    value: Math.round(rawVal(value)),
    formatted: fmt(value)
  })).sort((a, b) => b.value - a.value);

  // Permutation 2: Revenue by Brand (calculated dynamically by mapping projects to brands)
  const brandMap = {};
  if (summary.revenueByProject) {
    summary.revenueByProject.forEach(p => {
      const fullProj = projects.find(proj => proj._id === p._id);
      let brandName = '';
      if (fullProj) {
        const bId = fullProj.brandId?._id || fullProj.brandId;
        const matchedBrand = brands.find(b => b._id === bId);
        brandName = matchedBrand?.name || fullProj.brandId?.name || 'Corporate';
      } else {
        brandName = 'Corporate';
      }
      brandMap[brandName] = (brandMap[brandName] || 0) + p.revenue;
    });
  }
  const brandData = Object.entries(brandMap).map(([name, value]) => ({
    name,
    value: Math.round(rawVal(value)),
    formatted: fmt(value)
  })).sort((a, b) => b.value - a.value);

  // Permutation 3: Quarterly Analytics Timeline
  const quarterlyTimeline = [
    { name: 'Q1', Revenue: Math.round(rawVal(analytics.q1)) },
    { name: 'Q2', Revenue: Math.round(rawVal(analytics.q2)) },
    { name: 'Q3', Revenue: Math.round(rawVal(analytics.q3)) },
    { name: 'Q4', Revenue: Math.round(rawVal(analytics.q4)) }
  ];

  // Permutation 4: Top Resources by Revenue
  const resourceData = (summary.revenueByResource || [])
    .map(r => ({
      name: r.name,
      Revenue: Math.round(rawVal(r.revenue)),
      Hours: Math.round(r.hours)
    }))
    .sort((a, b) => b.Revenue - a.Revenue)
    .slice(0, 5);

  // Permutation 5: Projects Count & Revenue by Classification (Adhoc vs. FTE)
  let adhocCount = 0;
  let fteCount = 0;
  let adhocRevenue = 0;
  let fteRevenue = 0;

  projects.forEach(proj => {
    const isFte = proj.projectType === 'fte';
    if (isFte) {
      fteCount++;
      const projSummary = summary.revenueByProject?.find(p => p._id === proj._id);
      fteRevenue += projSummary?.revenue || 0;
    } else {
      adhocCount++;
      if (proj.billingType === 'fixed') {
        adhocRevenue += proj.fixedBudget || 0;
      }
      if (proj.totalBudget > 0) {
        adhocRevenue += proj.quarterlyBilledAmount || 0;
      }
    }
  });

  const projectTypeData = [
    {
      name: 'Adhoc Project',
      Count: adhocCount,
      Revenue: Math.round(rawVal(adhocRevenue)),
      formattedRevenue: fmt(adhocRevenue)
    },
    {
      name: 'FTE Project',
      Count: fteCount,
      Revenue: Math.round(rawVal(fteRevenue)),
      formattedRevenue: fmt(fteRevenue)
    }
  ];

  // Custom tooltips to match premium design
  const CustomChartTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: 'var(--sidebar-bg)',
          border: '1px solid var(--line)',
          borderRadius: '8px',
          padding: '12px',
          boxShadow: 'var(--shadow)',
          fontSize: '12px',
          color: '#ffffff'
        }}>
          <p style={{ margin: '0 0 6px 0', fontWeight: 'bold' }}>{label || payload[0].name}</p>
          {payload.map((item, idx) => (
            <p key={idx} style={{ margin: 0, display: 'flex', gap: '8px', color: item.color || '#a78bfa' }}>
              <span>{item.name}:</span>
              <strong style={{ marginLeft: 'auto' }}>
                {item.name.toLowerCase().includes('hours') 
                  ? `${item.value} hrs` 
                  : `${currencyConfig.symbol}${item.value.toLocaleString()}`}
              </strong>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const CustomUtilizationTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{
          background: 'var(--sidebar-bg)',
          border: '1px solid var(--line)',
          borderRadius: '8px',
          padding: '14px',
          boxShadow: 'var(--shadow)',
          fontSize: '12px',
          color: '#ffffff',
          minWidth: '200px'
        }}>
          <p style={{ margin: '0 0 4px 0', fontWeight: 'bold', fontSize: '13px' }}>{data.name}</p>
          <p style={{ margin: '0 0 10px 0', fontSize: '11px', color: 'var(--muted)' }}>{data.designation}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--line)', paddingBottom: '6px', marginBottom: '4px' }}>
              <span style={{ color: 'var(--muted)' }}>Utilization Rate:</span>
              <strong style={{ color: data['Utilization Rate'] > 100 ? '#ef4444' : data['Utilization Rate'] < 50 ? '#a78bfa' : '#10b981', fontWeight: 'bold' }}>{data['Utilization Rate']}%</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Project Work:</span>
              <strong>{data['Work Hours']} hrs</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Leaves Taken:</span>
              <strong>{data['Leave Hours']} hrs</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Standard Capacity:</span>
              <span style={{ color: 'var(--muted)' }}>{data['Capacity Hours']} hrs</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomProjectTypeTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{
          background: 'var(--sidebar-bg)',
          border: '1px solid var(--line)',
          borderRadius: '8px',
          padding: '12px',
          boxShadow: 'var(--shadow)',
          fontSize: '12px',
          color: '#ffffff'
        }}>
          <p style={{ margin: '0 0 6px 0', fontWeight: 'bold' }}>{data.name}</p>
          <p style={{ margin: '0 0 4px 0', display: 'flex', gap: '8px' }}>
            <span style={{ color: 'var(--primary)' }}>Active Projects:</span>
            <strong style={{ marginLeft: 'auto' }}>{data.Count}</strong>
          </p>
          <p style={{ margin: 0, display: 'flex', gap: '8px' }}>
            <span style={{ color: '#14b8a6' }}>Revenue Earned:</span>
            <strong style={{ marginLeft: 'auto' }}>{data.formattedRevenue}</strong>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <section className="dashboard-strip" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* Dynamic Summary Metric Cards */}
      <div className="metrics">
        <div className="metric-card">
          <div className="metric-icon">
            <DollarSign size={20} />
          </div>
          <span>Total Revenue</span>
          <strong>{fmt(summary.totalRevenue)}</strong>
          {renderDelta(metricsDeltas.revenue.delta, metricsDeltas.periodLabel)}
        </div>
        <div className="metric-card">
          <div className="metric-icon">
            <Clock size={20} />
          </div>
          <span>Total Hours</span>
          <strong>{Number(summary.totalHours || 0).toLocaleString()}h</strong>
          {renderDelta(metricsDeltas.hours.delta, metricsDeltas.periodLabel)}
        </div>
        <div className="metric-card">
          <div className="metric-icon green">
            <Users size={20} />
          </div>
          <span>Active Resources</span>
          <strong>{resources.length}</strong>
          {renderDelta(metricsDeltas.resources.delta, metricsDeltas.periodLabel)}
        </div>
        <div className="metric-card">
          <div className="metric-icon orange">
            <FolderKanban size={20} />
          </div>
          <span>Active Projects</span>
          <strong>{projects.length}</strong>
          {renderDelta(metricsDeltas.projects.delta, metricsDeltas.periodLabel)}
        </div>
      </div>

      {/* Advanced Visual Charts when showAnalytics is enabled */}
      {showAnalytics && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', marginTop: '20px' }}>
          
          {/* Row 1: Quarterly Timeline Area & Market Distribution Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
            
            {/* Chart 1: Revenue Timeline (Area) */}
            <div className="panel" style={{ minHeight: '340px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <TrendingUp size={18} style={{ color: 'var(--primary)' }} />
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700' }}>Quarterly Revenue Trend</h3>
              </div>
              <div style={{ flex: 1, width: '100%', height: '240px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={quarterlyTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                    <XAxis dataKey="name" stroke="var(--muted)" fontSize={11} tickLine={false} />
                    <YAxis stroke="var(--muted)" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomChartTooltip />} cursor={false} />
                    <Area type="monotone" dataKey="Revenue" stroke="var(--primary)" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Revenue by Market (Horizontal Bar) */}
            <div className="panel" style={{ minHeight: '340px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <LayoutDashboard size={18} style={{ color: 'var(--primary)' }} />
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700' }}>Revenue Share by Market</h3>
              </div>
              <div style={{ flex: 1, width: '100%', height: '240px' }}>
                {marketData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={marketData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" horizontal={false} />
                      <XAxis type="number" stroke="var(--muted)" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis dataKey="name" type="category" stroke="var(--muted)" fontSize={11} tickLine={false} width={90} />
                      <Tooltip content={<CustomChartTooltip />} cursor={false} />
                      <Bar dataKey="value" name="Revenue" radius={[0, 4, 4, 0]} barSize={16}>
                        {marketData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'var(--muted)', fontSize: '13px' }}>
                    No market allocation data in this range.
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Row 2: Brand Share Donut & Top Resources Stacked Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
            
            {/* Chart 3: Revenue by Brand (Donut Pie) */}
            <div className="panel" style={{ minHeight: '340px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Award size={18} style={{ color: 'var(--primary)' }} />
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700' }}>Revenue Share by Brand</h3>
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '240px' }}>
                {brandData.length > 0 ? (
                  <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center' }}>
                    <div style={{ width: '60%', height: '100%' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Tooltip content={<CustomChartTooltip />} cursor={false} />
                          <Pie
                            data={brandData}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={75}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {brandData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    {/* Visual Legend Right */}
                    <div style={{ width: '40%', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '10px', overflowY: 'auto', maxHeight: '200px' }}>
                      {brandData.slice(0, 4).map((entry, index) => (
                        <div key={entry.name} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: COLORS[index % COLORS.length] }} />
                            <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '80px' }}>{entry.name}</span>
                          </div>
                          <span style={{ fontSize: '10px', color: 'var(--muted)', paddingLeft: '14px' }}>{entry.formatted}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ color: 'var(--muted)', fontSize: '13px' }}>
                    No brand allocation data in this range.
                  </div>
                )}
              </div>
            </div>

            {/* Chart 4: Top 5 Resources (Double Bar) */}
            <div className="panel" style={{ minHeight: '340px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Users size={18} style={{ color: 'var(--primary)' }} />
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700' }}>Top 5 Resources Performance</h3>
              </div>
              <div style={{ flex: 1, width: '100%', height: '240px' }}>
                {resourceData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={resourceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                      <XAxis dataKey="name" stroke="var(--muted)" fontSize={10} tickLine={false} />
                      <YAxis stroke="var(--muted)" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomChartTooltip />} cursor={false} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                      <Bar dataKey="Revenue" name="Revenue Earned" fill="var(--primary)" radius={[4, 4, 0, 0]} barSize={12} />
                      <Bar dataKey="Hours" name="Total Hours" fill="#14b8a6" radius={[4, 4, 0, 0]} barSize={12} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'var(--muted)', fontSize: '13px' }}>
                    No resource hourly allocations in this range.
                  </div>
                )}
              </div>
            </div>

            {/* Chart 5: Project Classification (Clustered Bar Chart) */}
            <div className="panel" style={{ minHeight: '340px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Briefcase size={18} style={{ color: 'var(--primary)' }} />
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700' }}>Projects &amp; Revenue by Type</h3>
              </div>
              <div style={{ flex: 1, width: '100%', height: '240px' }}>
                {projects.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={projectTypeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                      <XAxis dataKey="name" stroke="var(--muted)" fontSize={10} tickLine={false} />
                      <YAxis yAxisId="left" orientation="left" stroke="var(--primary)" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis yAxisId="right" orientation="right" stroke="#14b8a6" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomProjectTypeTooltip />} cursor={false} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                      <Bar yAxisId="left" dataKey="Count" name="Active Projects" fill="var(--primary)" radius={[4, 4, 0, 0]} barSize={14} />
                      <Bar yAxisId="right" dataKey="Revenue" name="Revenue Earned" fill="#14b8a6" radius={[4, 4, 0, 0]} barSize={14} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'var(--muted)', fontSize: '13px' }}>
                    No projects configured in this range.
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Row 3 Container (Utilization & IPP Goal Tracker Side-by-Side) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px', alignItems: 'stretch' }}>
            
            {/* Left: Resource Utilization Tracker */}
            <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px', margin: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={18} style={{ color: 'var(--primary)' }} />
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700' }}>Resource Utilization Tracker</h3>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: '500' }}>
                  {formatRangeCaption(utilRange.startDate, utilRange.endDate)} ({weekdaysCount} working weekdays)
                </span>
              </div>

              <div className="segment-tabs">
                <button 
                  type="button" 
                  className={`segment-tab-btn ${utilizationPeriod === 'active' ? 'active' : ''}`}
                  onClick={() => setUtilizationPeriod('active')}
                >
                  Active Range
                </button>
                <button 
                  type="button" 
                  className={`segment-tab-btn ${utilizationPeriod === 'weekly' ? 'active' : ''}`}
                  onClick={() => setUtilizationPeriod('weekly')}
                >
                  Weekly
                </button>
                <button 
                  type="button" 
                  className={`segment-tab-btn ${utilizationPeriod === 'monthly' ? 'active' : ''}`}
                  onClick={() => setUtilizationPeriod('monthly')}
                >
                  Monthly
                </button>
                <button 
                  type="button" 
                  className={`segment-tab-btn ${utilizationPeriod === 'quarterly' ? 'active' : ''}`}
                  onClick={() => setUtilizationPeriod('quarterly')}
                >
                  Quarterly
                </button>
                <button 
                  type="button" 
                  className={`segment-tab-btn ${utilizationPeriod === 'half-yearly' ? 'active' : ''}`}
                  onClick={() => setUtilizationPeriod('half-yearly')}
                >
                  Half Yearly
                </button>
                <button 
                  type="button" 
                  className={`segment-tab-btn ${utilizationPeriod === 'cy-26' ? 'active' : ''}`}
                  onClick={() => setUtilizationPeriod('cy-26')}
                >
                  CY 26
                </button>
                <button 
                  type="button" 
                  className={`segment-tab-btn ${utilizationPeriod === 'fy-26-27' ? 'active' : ''}`}
                  onClick={() => setUtilizationPeriod('fy-26-27')}
                >
                  FY 26-27
                </button>
                <button 
                  type="button" 
                  className={`segment-tab-btn ${utilizationPeriod === 'custom' ? 'active' : ''}`}
                  onClick={() => setUtilizationPeriod('custom')}
                >
                  Custom Range
                </button>
              </div>

              {utilizationPeriod === 'custom' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '4px', background: 'var(--surface-strong)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--line)', width: 'fit-content' }}>
                  <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--muted)' }}>Choose Date Range:</span>
                  <input 
                    type="date" 
                    value={customStartDate} 
                    onChange={(e) => setCustomStartDate(e.target.value)} 
                    style={{
                      padding: '5px 10px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--line)',
                      background: 'var(--surface-strong)',
                      color: 'var(--ink)',
                      fontSize: '12px',
                      fontFamily: 'inherit',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  />
                  <span style={{ fontSize: '12px', color: 'var(--muted)' }}>to</span>
                  <input 
                    type="date" 
                    value={customEndDate} 
                    onChange={(e) => setCustomEndDate(e.target.value)} 
                    style={{
                      padding: '5px 10px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--line)',
                      background: 'var(--surface-strong)',
                      color: 'var(--ink)',
                      fontSize: '12px',
                      fontFamily: 'inherit',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  />
                </div>
              )}

              <div style={{ flex: 1, width: '100%', marginTop: '8px' }}>
                {utilizationData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={Math.max(240, utilizationData.length * 40)}>
                    <BarChart 
                      data={utilizationData} 
                      layout="vertical" 
                      margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" horizontal={false} />
                      <XAxis 
                        type="number" 
                        stroke="var(--muted)" 
                        fontSize={11} 
                        tickLine={false} 
                        axisLine={false} 
                        domain={[0, 'dataMax + 10']} 
                        unit="%" 
                      />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        stroke="var(--muted)" 
                        fontSize={11} 
                        tickLine={false} 
                        width={100} 
                      />
                      <Tooltip content={<CustomUtilizationTooltip />} cursor={false} />
                      <ReferenceLine x={80} stroke="#f59e0b" strokeDasharray="3 3" strokeWidth={1.5} label={{ value: 'Target (80%)', position: 'insideTopRight', fill: '#f59e0b', fontSize: 10, fontWeight: 'bold' }} />
                      <Bar dataKey="Utilization Rate" name="Utilization" radius={[0, 4, 4, 0]} barSize={14}>
                        {utilizationData.map((entry, index) => {
                          let barColor = 'var(--primary)';
                          if (entry['Utilization Rate'] > 100) {
                            barColor = '#ef4444'; // Overtime
                          } else if (entry['Utilization Rate'] < 50) {
                            barColor = '#a78bfa'; // Under-utilized
                          }
                          return <Cell key={`cell-${index}`} fill={barColor} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ display: 'grid', placeItems: 'center', height: '200px', color: 'var(--muted)', fontSize: '13px' }}>
                    No active resources found in this scope.
                  </div>
                )}
              </div>
            </div>

            {/* Right: IPP Budget Goal Tracker */}
            <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px', justifyContent: 'space-between', margin: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Target size={18} style={{ color: 'var(--primary)' }} />
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700' }}>Initial Project Plan (IPP) Goal</h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', flex: 1, justifyContent: 'center' }}>
                
                {/* Stats Summary */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: '700', letterSpacing: '0.04em' }}>Adhoc Revenue Achieved</span>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--ink)', marginTop: '4px' }}>
                      {fmt(adhocRevenue)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: '700', letterSpacing: '0.04em' }}>IPP Annual Goal</span>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--soft)', marginTop: '4px' }}>
                      {fmt(ippBudget)}
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '700', marginBottom: '8px' }}>
                    <span style={{ color: 'var(--primary)' }}>Target Achievement</span>
                    <span style={{ color: 'var(--ink)' }}>{Math.min(100, Math.round((adhocRevenue / ippBudget) * 100)) || 0}%</span>
                  </div>
                  
                  <div style={{
                    height: '12px',
                    borderRadius: '6px',
                    background: 'var(--surface-strong)',
                    border: '1px solid var(--line)',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: 'inset var(--shadow-soft)'
                  }}>
                    <div style={{
                      width: `${Math.min(100, (adhocRevenue / ippBudget) * 100)}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, var(--primary) 0%, #34d399 100%)',
                      borderRadius: '6px',
                      boxShadow: '0 0 8px var(--primary)',
                      transition: 'width 600ms cubic-bezier(0.4, 0, 0.2, 1)'
                    }} />
                  </div>
                </div>

                {/* Notification Alert Box */}
                <div style={{
                  padding: '16px',
                  borderRadius: '8px',
                  background: adhocRevenue >= ippBudget ? 'rgba(16, 185, 129, 0.08)' : 'var(--surface-strong)',
                  border: adhocRevenue >= ippBudget ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid var(--line)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  boxShadow: 'var(--shadow-soft)'
                }}>
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', color: adhocRevenue >= ippBudget ? '#10b981' : 'var(--muted)', fontWeight: '700' }}>
                    {adhocRevenue >= ippBudget ? '🎯 Target Achieved' : '📈 Revenue Remaining'}
                  </span>
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: '600', color: 'var(--ink)', lineHeight: '1.4' }}>
                    {adhocRevenue >= ippBudget ? (
                      <span>Goal achieved! Exceeded by <strong style={{ color: '#10b981' }}>{fmt(adhocRevenue - ippBudget)}</strong> USD</span>
                    ) : (
                      <span>Still <strong style={{ color: 'var(--primary)' }}>{fmt(ippBudget - adhocRevenue)}</strong> to reach this year's goal</span>
                    )}
                  </p>
                </div>

              </div>
            </div>

          </div>

          {/* Quick Realtime Grid Strip Summary */}
          <h3 style={{ marginTop: '18px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={16} style={{ color: 'var(--primary)' }} />
            <span>Quarterly &amp; Monthly Performance Summary</span>
          </h3>
          
          <div className="metrics" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            <div className="metric-card" style={{ padding: '16px 20px', minHeight: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--muted)' }}>Quarter 1</span>
              <strong style={{ fontSize: '18px', color: 'var(--ink)' }}>{fmt(analytics.q1)}</strong>
            </div>
            <div className="metric-card" style={{ padding: '16px 20px', minHeight: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--muted)' }}>Quarter 2</span>
              <strong style={{ fontSize: '18px', color: 'var(--ink)' }}>{fmt(analytics.q2)}</strong>
            </div>
            <div className="metric-card" style={{ padding: '16px 20px', minHeight: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--muted)' }}>Quarter 3</span>
              <strong style={{ fontSize: '18px', color: 'var(--ink)' }}>{fmt(analytics.q3)}</strong>
            </div>
            <div className="metric-card" style={{ padding: '16px 20px', minHeight: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--muted)' }}>Quarter 4</span>
              <strong style={{ fontSize: '18px', color: 'var(--ink)' }}>{fmt(analytics.q4)}</strong>
            </div>
            <div className="metric-card" style={{ padding: '16px 20px', minHeight: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--muted)' }}>This Month</span>
              <strong style={{ fontSize: '18px', color: 'var(--success)' }}>{fmt(analytics.thisMonth)}</strong>
            </div>
            <div className="metric-card" style={{ padding: '16px 20px', minHeight: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--muted)' }}>Last Month</span>
              <strong style={{ fontSize: '18px', color: 'var(--ink)' }}>{fmt(analytics.lastMonth)}</strong>
            </div>
          </div>

        </div>
      )}
      
    </section>
  );
}

function currency(value, config) {
  const converted = Number(value || 0) * config.rate;
  return new Intl.NumberFormat(config.locale || undefined, { style: 'currency', currency: config.code || 'USD', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(converted);
}

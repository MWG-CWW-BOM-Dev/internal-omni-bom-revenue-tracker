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
import { LayoutDashboard, Calendar, Users, FolderKanban, TrendingUp, Award, DollarSign, Clock, Briefcase } from 'lucide-react';

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

export default function Dashboard({ summary, resources, projects, brands = [], markets = [], filters, timesheets = [], showAnalytics, currencyConfig = { rate: 1, symbol: '$' } }) {
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
          <small className="positive">+12.5% <em>vs last 7 days</em></small>
        </div>
        <div className="metric-card">
          <div className="metric-icon">
            <Clock size={20} />
          </div>
          <span>Total Hours</span>
          <strong>{Number(summary.totalHours || 0).toLocaleString()}h</strong>
          <small className="positive">+8.2% <em>vs last 7 days</em></small>
        </div>
        <div className="metric-card">
          <div className="metric-icon green">
            <Users size={20} />
          </div>
          <span>Active Resources</span>
          <strong>{resources.length}</strong>
          <small><em>vs last 7 days</em></small>
        </div>
        <div className="metric-card">
          <div className="metric-icon orange">
            <FolderKanban size={20} />
          </div>
          <span>Active Projects</span>
          <strong>{projects.length}</strong>
          <small className="negative">-4.3% <em>vs last 7 days</em></small>
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
                    <Tooltip content={<CustomChartTooltip />} />
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
                      <Tooltip content={<CustomChartTooltip />} />
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
                          <Tooltip content={<CustomChartTooltip />} />
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
                      <Tooltip content={<CustomChartTooltip />} />
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
                      <Tooltip content={<CustomProjectTypeTooltip />} />
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

          {/* Row 3: Resource Utilization Tracker */}
          <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                    <Tooltip content={<CustomUtilizationTooltip />} />
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

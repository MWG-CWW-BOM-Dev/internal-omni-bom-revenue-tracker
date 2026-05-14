import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';

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

export default function Dashboard({ summary, resources, projects, filters, showAnalytics, currencyConfig = { rate: 1, symbol: '$' } }) {
  const [analytics, setAnalytics] = useState({
    q1: 0, q2: 0, q3: 0, q4: 0, fy: 0, cy: 0, thisMonth: 0, lastMonth: 0
  });

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

  return (
    <section className="dashboard-strip">
      <div className="metrics">
        <div className="metric-card revenue-card">
          <span className="metric-icon">{currencyConfig.symbol}</span>
          <span>Total Revenue</span>
          <strong>{fmt(summary.totalRevenue)}</strong>
          <small className="positive">+12.5% <em>vs last 7 days</em></small>
        </div>
        <div className="metric-card">
          <span className="metric-icon">h</span>
          <span>Total Hours</span>
          <strong>{number(summary.totalHours)}h</strong>
          <small className="positive">+8.2% <em>vs last 7 days</em></small>
        </div>
        <div className="metric-card">
          <span className="metric-icon green">R</span>
          <span>Active Resources</span>
          <strong>{resources.length}</strong>
          <small><em>vs last 7 days</em></small>
        </div>
        <div className="metric-card">
          <span className="metric-icon orange">P</span>
          <span>Active Projects</span>
          <strong>{projects.length}</strong>
          <small className="negative">-4.3% <em>vs last 7 days</em></small>
        </div>
      </div>

      {showAnalytics && (
        <>
          <h3 style={{ marginTop: '48px', marginBottom: '24px' }}>Realtime Revenue Analytics</h3>
          <div className="metrics">
            <div className="metric-card revenue-card">
              <span className="metric-icon">{currencyConfig.symbol}</span>
              <span>Quarter 1</span>
              <strong>{fmt(analytics.q1)}</strong>
            </div>
            <div className="metric-card revenue-card">
              <span className="metric-icon">{currencyConfig.symbol}</span>
              <span>Quarter 2</span>
              <strong>{fmt(analytics.q2)}</strong>
            </div>
            <div className="metric-card revenue-card">
              <span className="metric-icon">{currencyConfig.symbol}</span>
              <span>Quarter 3</span>
              <strong>{fmt(analytics.q3)}</strong>
            </div>
            <div className="metric-card revenue-card">
              <span className="metric-icon">{currencyConfig.symbol}</span>
              <span>Quarter 4</span>
              <strong>{fmt(analytics.q4)}</strong>
            </div>
            <div className="metric-card revenue-card">
              <span className="metric-icon">{currencyConfig.symbol}</span>
              <span>FY 26-27</span>
              <strong>{fmt(analytics.fy)}</strong>
            </div>
            <div className="metric-card revenue-card">
              <span className="metric-icon">{currencyConfig.symbol}</span>
              <span>CY 26</span>
              <strong>{fmt(analytics.cy)}</strong>
            </div>
            <div className="metric-card revenue-card">
              <span className="metric-icon">{currencyConfig.symbol}</span>
              <span>This Month</span>
              <strong>{fmt(analytics.thisMonth)}</strong>
            </div>
            <div className="metric-card revenue-card">
              <span className="metric-icon">{currencyConfig.symbol}</span>
              <span>Last Month</span>
              <strong>{fmt(analytics.lastMonth)}</strong>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function currency(value, config) {
  const converted = Number(value || 0) * config.rate;
  return new Intl.NumberFormat(config.locale || undefined, { style: 'currency', currency: config.code || 'USD', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(converted);
}

function number(value) {
  return Number(value || 0).toLocaleString();
}

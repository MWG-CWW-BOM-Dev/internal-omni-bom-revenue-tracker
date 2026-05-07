import React from 'react';

export default function Dashboard({ summary, resources, projects }) {
  return (
    <section className="dashboard-strip">
      <div className="metrics">
        <div className="metric-card revenue-card">
          <span className="metric-icon">$</span>
          <span>Total Revenue</span>
          <strong>{currency(summary.totalRevenue)}</strong>
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
    </section>
  );
}

function currency(value) {
  return Number(value || 0).toLocaleString(undefined, { style: 'currency', currency: 'USD' });
}

function number(value) {
  return Number(value || 0).toLocaleString();
}

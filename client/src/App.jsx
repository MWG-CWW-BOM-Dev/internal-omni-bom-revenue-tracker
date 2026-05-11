import React, { useEffect, useState } from 'react';
import Dashboard from './components/Dashboard.jsx';
import EntityPage from './components/EntityPage.jsx';
import ProjectsPage from './components/ProjectsPage.jsx';
import TimesheetForm from './components/TimesheetForm.jsx';
import { api } from './services/api.js';

const emptySummary = {
  totalRevenue: 0,
  totalHours: 0,
  revenueByResource: [],
  revenueByProject: []
};

export default function App() {
  const initialRange = getPresetRange('this-month');
  const [markets, setMarkets] = useState([]);
  const [brands, setBrands] = useState([]);
  const [projects, setProjects] = useState([]);
  const [resources, setResources] = useState([]);
  const [timesheets, setTimesheets] = useState([]);
  const [summary, setSummary] = useState(emptySummary);
  const [period, setPeriod] = useState('this-month');
  const [filters, setFilters] = useState({ marketId: '', ...initialRange });
  const [error, setError] = useState('');
  const [activePage, setActivePage] = useState('timesheet');

  async function loadAll() {
    try {
      const [marketData, brandData, projectData, resourceData, timesheetData] = await Promise.all([
        api.list('/markets'),
        api.list('/brands'),
        api.list('/projects'),
        api.list('/resources'),
        api.list('/timesheets')
      ]);
      setMarkets(marketData);
      setBrands(brandData);
      setProjects(projectData);
      setResources(resourceData);
      setTimesheets(timesheetData);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }

  async function loadDashboard() {
    try {
      setSummary(await api.dashboard(filters));
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [filters]);

  async function create(path, body) {
    await api.create(path, body);
    await loadAll();
    await loadDashboard();
  }

  async function remove(path, id) {
    await api.remove(path, id);
    await loadAll();
    await loadDashboard();
  }

  async function update(path, id, body) {
    await api.update(path, id, body);
    await loadAll();
    await loadDashboard();
  }

  const [activeCurrency, setActiveCurrency] = useState('USD');
  const CURRENCY_RATES = { USD: 1, INR: 83, CAD: 1.35 };
  const CURRENCY_SYMBOLS = { USD: '$', INR: '₹', CAD: 'C$' };
  const CURRENCY_LOCALES = { USD: 'en-US', INR: 'en-IN', CAD: 'en-CA' };

  const currencyConfig = {
    code: activeCurrency,
    rate: CURRENCY_RATES[activeCurrency],
    symbol: CURRENCY_SYMBOLS[activeCurrency],
    locale: CURRENCY_LOCALES[activeCurrency]
  };

  const filteredResources = filters.marketId
    ? resources.filter((resource) => idValue(resource.marketId) === filters.marketId)
    : resources;
  const filteredProjects = filters.marketId
    ? projects.filter((project) => idValue(project.marketId) === filters.marketId)
    : projects;
  const filteredTimesheets = timesheets.filter((entry) => {
    const date = entry.date.slice(0, 10);
    const matchesDate = date >= filters.startDate && date <= filters.endDate;
    const matchesMarket = !filters.marketId || idValue(entry.projectId?.marketId) === filters.marketId;
    return matchesDate && matchesMarket;
  });
  const calendarDates = buildDateRange(filters.startDate, filters.endDate);

  const pages = {
    dashboard: {
      label: 'Dashboard',
      content: <Dashboard summary={summary} resources={filteredResources} projects={filteredProjects} filters={filters} showAnalytics={true} currencyConfig={currencyConfig} />
    },
    timesheet: {
      label: 'Timesheet',
      content: (
        <>
          <Dashboard summary={summary} resources={filteredResources} projects={filteredProjects} filters={filters} currencyConfig={currencyConfig} />
          <TimesheetForm
            resources={filteredResources}
            projects={filteredProjects}
            timesheets={filteredTimesheets}
            dates={calendarDates}
            currencyConfig={currencyConfig}
            onCreate={(body) => create('/timesheets', body)}
            onUpdate={(id, body) => update('/timesheets', id, body)}
            onDelete={(id) => remove('/timesheets', id)}
          />
        </>
      )
    },
    markets: {
      label: 'Markets',
      content: (
        <EntityPage
          title="Markets"
          fields={[{ name: 'name', label: 'Market name', tableLabel: 'Name', required: true }]}
          items={markets}
          onCreate={(body) => create('/markets', body)}
          onUpdate={(id, body) => update('/markets', id, body)}
          onDelete={(id) => remove('/markets', id)}
        />
      )
    },
    brands: {
      label: 'Brands',
      content: (
        <EntityPage
          title="Brands"
          fields={[
            { name: 'name', label: 'Brand name', tableLabel: 'Name', required: true },
            { name: 'marketId', label: 'Market optional', tableLabel: 'Market', type: 'select', options: markets, optional: true }
          ]}
          items={brands}
          onCreate={(body) => create('/brands', body)}
          onUpdate={(id, body) => update('/brands', id, body)}
          onDelete={(id) => remove('/brands', id)}
        />
      )
    },
    projects: {
      label: 'Projects',
      content: (
        <ProjectsPage
          projects={filteredProjects}
          markets={markets}
          brands={brands}
          summary={summary}
          currencyConfig={currencyConfig}
          onCreate={(body) => create('/projects', body)}
          onUpdate={(id, body) => update('/projects', id, body)}
          onDelete={(id) => remove('/projects', id)}
        />
      )
    },
    resources: {
      label: 'Resources',
      content: (
        <EntityPage
          title="Resources"
          fields={[
            { name: 'name', label: 'Resource name', tableLabel: 'Name', required: true },
            { name: 'designation', label: 'Designation', tableLabel: 'Designation', required: true },
            { name: 'photoUrl', label: 'Profile Photo', tableLabel: 'Photo', type: 'image', optional: true },
            { name: 'hourlyRate', label: 'Base Hourly Rate', tableLabel: 'Base Rate', type: 'number', min: '0', step: '0.01', required: true },
            { name: 'marketId', label: 'Default Market', tableLabel: 'Default Market', type: 'select', options: markets, required: true },
            {
              name: 'marketRates',
              label: 'Market specific rates',
              tableLabel: 'Market Rates',
              type: 'market-rates',
              options: markets,
              defaultValue: [],
              optional: true,
              format: (rates) => formatMarketRates(rates, markets, currencyConfig)
            }
          ]}
          items={resources}
          onCreate={(body) => create('/resources', body)}
          onUpdate={(id, body) => update('/resources', id, body)}
          onDelete={(id) => remove('/resources', id)}
        />
      )
    }
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <div className="brand-block">
            <span className="brand-mark">O</span>
            <h1>Revenue Tracker</h1>
            <p>Timesheets & Revenue</p>
          </div>
          <nav>
            {Object.entries(pages).map(([key, page]) => (
              <button
                className={activePage === key ? 'nav-item active' : 'nav-item'}
                key={key}
                type="button"
                onClick={() => setActivePage(key)}
              >
                {page.label}
              </button>
            ))}
          </nav>
        </div>
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '11px', color: '#aab3c2', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.05em' }}>Currency</label>
          <select 
            value={activeCurrency} 
            onChange={(e) => setActiveCurrency(e.target.value)}
            style={{ padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', outline: 'none' }}
          >
            <option value="USD" style={{color: 'black'}}>USD ($)</option>
            <option value="INR" style={{color: 'black'}}>INR (₹)</option>
            <option value="CAD" style={{color: 'black'}}>CAD (C$)</option>
          </select>
        </div>
      </aside>

      <main>
        <header className="topbar">
          <div>
            <h2>{pages[activePage].label}</h2>
            <p>Track time, manage projects, calculate revenue.</p>
          </div>
          <div className="topbar-actions">
            <select value={filters.marketId} onChange={(event) => setFilters({ ...filters, marketId: event.target.value })}>
              <option value="">All Markets</option>
              {markets.map((market) => (
                <option key={market._id} value={market._id}>
                  {market.name}
                </option>
              ))}
            </select>
            <select value={period} onChange={(event) => applyPeriod(event.target.value)}>
              <option value="this-month">This Month</option>
              <option value="last-month">Last Month</option>
              <option value="q1">Q1</option>
              <option value="q2">Q2</option>
              <option value="q3">Q3</option>
              <option value="q4">Q4</option>
              <option value="fy">FY {financialYearLabel()}</option>
              <option value="this-year">This Year</option>
              <option value="custom">Custom</option>
            </select>
            <div className="date-range-control">{dateRangeLabel(filters.startDate, filters.endDate)}</div>
            {period === 'custom' && (
              <>
                <input type="date" value={filters.startDate} onChange={(event) => setFilters({ ...filters, startDate: event.target.value })} />
                <input type="date" value={filters.endDate} onChange={(event) => setFilters({ ...filters, endDate: event.target.value })} />
              </>
            )}
            <button className="secondary icon-button" type="button" onClick={() => shiftRange(-1)}>
              &lt;
            </button>
            <button className="secondary icon-button" type="button" onClick={() => shiftRange(1)}>
              &gt;
            </button>
            <a className="button" href={`${api.baseUrl}/timesheets/export.csv`}>
              Export CSV
            </a>
          </div>
        </header>

        {error && <div className="error">{error}</div>}
        {pages[activePage].content}
      </main>
    </div>
  );

  function applyPeriod(nextPeriod) {
    setPeriod(nextPeriod);
    if (nextPeriod === 'custom') return;
    setFilters({ ...filters, ...getPresetRange(nextPeriod) });
  }

  function shiftRange(direction) {
    const start = parseDate(filters.startDate);
    const end = parseDate(filters.endDate);
    const span = daysBetween(start, end) + 1;
    start.setDate(start.getDate() + direction * span);
    end.setDate(end.getDate() + direction * span);
    setPeriod('custom');
    setFilters({ ...filters, startDate: toDateInput(start), endDate: toDateInput(end) });
  }
}

function dateRangeLabel(startDate, endDate) {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  return `${monthDay(start)} - ${monthDay(end)}, ${end.getFullYear()}`;
}

function monthDay(date) {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
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

function financialYearLabel() {
  const now = new Date();
  const startYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return `${String(startYear).slice(2)}-${String(startYear + 1).slice(2)}`;
}

function range(start, end) {
  return { startDate: toDateInput(start), endDate: toDateInput(end) };
}

function buildDateRange(startDate, endDate) {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  const dates = [];
  for (const date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    dates.push(toDateInput(date));
  }
  return dates;
}

function parseDate(value) {
  return new Date(`${value}T00:00:00`);
}

function daysBetween(start, end) {
  return Math.round((end - start) / 86400000);
}

function toDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function idValue(value) {
  if (!value) return '';
  return typeof value === 'string' ? value : value._id || String(value);
}

function formatMarketRates(rates = [], markets = [], config = { rate: 1, symbol: '$', locale: 'en-US' }) {
  if (!rates.length) return '-';
  return rates
    .map((rate) => {
      const market = markets.find((item) => item._id === idValue(rate.marketId));
      return `${market?.name || 'Market'}: ${config.symbol}${Number((rate.hourlyRate || 0) * config.rate).toLocaleString(config.locale || undefined, { maximumFractionDigits: 0 })}`;
    })
    .join(', ');
}

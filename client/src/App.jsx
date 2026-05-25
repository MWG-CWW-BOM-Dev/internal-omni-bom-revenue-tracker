import React, { useEffect, useState, useRef } from 'react';
import Dashboard from './components/Dashboard.jsx';
import EntityPage from './components/EntityPage.jsx';
import ProjectsPage from './components/ProjectsPage.jsx';
import TimesheetForm from './components/TimesheetForm.jsx';
import BudgetTracker from './components/BudgetTracker.jsx';
import ReportsPage from './components/ReportsPage.jsx';
import SettingsPage from './components/SettingsPage.jsx';
import CustomSelect from './components/CustomSelect.jsx';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { api } from './services/api.js';
import {
  LayoutDashboard,
  Calendar,
  Globe,
  Layers,
  FolderKanban,
  DollarSign,
  Users,
  FileBarChart,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  Menu,
  X
} from 'lucide-react';


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
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'system');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const exportDropdownRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    
    function applyTheme() {
      let resolvedTheme = theme;
      if (theme === 'system') {
        resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      document.documentElement.setAttribute('data-theme', resolvedTheme);
      document.documentElement.setAttribute('data-theme-setting', theme);
    }
    
    applyTheme();
    
    if (theme === 'system') {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = (e) => {
        document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
      };
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    }
  }, [theme]);

  // Click outside to close export dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target)) {
        setIsExportDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function getFormattedFilename(extension) {
    const startDMY = formatDateDMY(filters.startDate);
    const endDMY = formatDateDMY(filters.endDate);
    return `all-resources-${startDMY}-to-${endDMY}.${extension}`;
  }

  function formatDateDMY(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }

  function handleExportExcel() {
    setIsExportDropdownOpen(false);

    const getProjectRevenueInPeriod = (proj) => {
      if (proj.projectType === 'fte') {
        const pRevObj = summary.revenueByProject?.find(p => p._id === proj._id);
        return pRevObj?.revenue || 0;
      } else {
        let rev = 0;
        if (proj.billingType === 'fixed') {
          rev += proj.fixedBudget || 0;
        }
        if (proj.totalBudget > 0) {
          rev += proj.quarterlyBilledAmount || 0;
        }
        return rev;
      }
    };
    
    // Sheet 1: Overview Summary
    const summaryData = [
      { Metric: 'Total Revenue', Value: currencyConfig.symbol + summary.totalRevenue.toLocaleString() },
      { Metric: 'Total Hours Worked', Value: summary.totalHours + ' hrs' },
      { Metric: 'Active Resources', Value: filteredResources.length },
      { Metric: 'Active Projects', Value: filteredProjects.length },
      { Metric: 'Reporting Start Date', Value: formatDateDMY(filters.startDate) },
      { Metric: 'Reporting End Date', Value: formatDateDMY(filters.endDate) },
      { Metric: 'Filtered Market', Value: markets.find(m => m._id === filters.marketId)?.name || 'All Markets' }
    ];

    // Sheet 2: Timesheet Details
    const timesheetData = filteredTimesheets.map(entry => {
      const res = resources.find(r => r._id === idValue(entry.resourceId));
      const proj = projects.find(p => p._id === idValue(entry.projectId));
      return {
        Date: formatDateDMY(entry.date.slice(0, 10)),
        'Resource Name': res?.name || '',
        'Resource Designation': res?.designation || '',
        'Type / Project': entry.leaveType || proj?.name || '',
        'Hours Worked': entry.hoursWorked,
        'Calculated Revenue': entry.revenue,
        Comments: entry.comments || ''
      };
    });

    // Sheet 3: Project Summary
    const projectData = filteredProjects.map(proj => {
      const marketObj = markets.find(m => m._id === idValue(proj.marketId));
      const brandObj = brands.find(b => b._id === idValue(proj.brandId));
      const pHours = summary.revenueByProject?.find(p => p._id === proj._id)?.hours || 0;
      return {
        'Project Name': proj.name,
        'Point of Contact': proj.pointOfContact || '',
        'Project Type': (proj.projectType || 'adhoc') === 'fte' ? 'FTE Project' : 'Adhoc Project',
        Market: marketObj ? `${marketObj.flag || ''} ${marketObj.name}`.trim() : 'Global / Core',
        Brand: brandObj?.name || 'Corporate',
        'Billing Type': proj.billingType === 'fixed' ? 'Fixed Budget' : 'Hourly Rate',
        'Total Approved Budget': proj.totalBudget || 0,
        'Calculated Consumed Budget': proj.consumedBudget || 0,
        'Calculated Remaining Budget': (proj.totalBudget || 0) - (proj.consumedBudget || 0),
        'Revenue Earned in Period': getProjectRevenueInPeriod(proj),
        'Hours Spent in Period': pHours,
        Status: proj.status
      };
    });

    // Sheet 3a: Adhoc Projects Details
    const adhocProjectData = filteredProjects
      .filter(proj => (proj.projectType || 'adhoc') === 'adhoc')
      .map(proj => {
        const marketObj = markets.find(m => m._id === idValue(proj.marketId));
        const brandObj = brands.find(b => b._id === idValue(proj.brandId));
        const pHours = summary.revenueByProject?.find(p => p._id === proj._id)?.hours || 0;
        return {
          'Project Name': proj.name,
          'Point of Contact': proj.pointOfContact || '',
          Market: marketObj ? `${marketObj.flag || ''} ${marketObj.name}`.trim() : 'Global / Core',
          Brand: brandObj?.name || 'Corporate',
          'Billing Type': proj.billingType === 'fixed' ? 'Fixed Budget' : 'Hourly Rate',
          'Total Approved Budget': proj.totalBudget || 0,
          'Calculated Consumed Budget': proj.consumedBudget || 0,
          'Calculated Remaining Budget': (proj.totalBudget || 0) - (proj.consumedBudget || 0),
          'Revenue Earned in Period': getProjectRevenueInPeriod(proj),
          'Hours Spent in Period': pHours,
          Status: proj.status
        };
      });

    // Sheet 3b: FTE Projects Details
    const fteProjectData = filteredProjects
      .filter(proj => proj.projectType === 'fte')
      .map(proj => {
        const marketObj = markets.find(m => m._id === idValue(proj.marketId));
        const brandObj = brands.find(b => b._id === idValue(proj.brandId));
        const pHours = summary.revenueByProject?.find(p => p._id === proj._id)?.hours || 0;
        return {
          'Project Name': proj.name,
          'Point of Contact': proj.pointOfContact || '',
          Market: marketObj ? `${marketObj.flag || ''} ${marketObj.name}`.trim() : 'Global / Core',
          Brand: brandObj?.name || 'Corporate',
          'Billing Type': proj.billingType === 'fixed' ? 'Fixed Budget' : 'Hourly Rate',
          'Total Approved Budget': proj.totalBudget || 0,
          'Calculated Consumed Budget': proj.consumedBudget || 0,
          'Calculated Remaining Budget': (proj.totalBudget || 0) - (proj.consumedBudget || 0),
          'Revenue Earned in Period': getProjectRevenueInPeriod(proj),
          'Hours Spent in Period': pHours,
          Status: proj.status
        };
      });

    // Sheet 4: Resource Summary
    const resourceSummaryData = filteredResources.map(res => {
      const marketObj = markets.find(m => m._id === idValue(res.marketId));
      const resRev = summary.revenueByResource?.find(r => r.name === res.name)?.revenue || 0;
      const resHours = summary.revenueByResource?.find(r => r.name === res.name)?.hours || 0;
      return {
        'Resource Name': res.name,
        Designation: res.designation || '',
        'Default Market': marketObj ? `${marketObj.flag || ''} ${marketObj.name}`.trim() : '-',
        'Hourly Rate': res.hourlyRate || 0,
        'Hours in Period': resHours,
        'Revenue in Period': resRev
      };
    });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryData), "Overview");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(timesheetData), "Timesheet Details");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(projectData), "Projects Summary");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(adhocProjectData), "Adhoc Projects");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(fteProjectData), "FTE Projects");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(resourceSummaryData), "Resources Summary");
    XLSX.writeFile(workbook, getFormattedFilename('xlsx'));
  }

  function handleExportCSV() {
    setIsExportDropdownOpen(false);
    const header = ['Date', 'Resource Name', 'Designation', 'Type/Project', 'Hours Worked', 'Calculated Revenue', 'Comments'];
    const rows = filteredTimesheets.map(entry => {
      const res = resources.find(r => r._id === idValue(entry.resourceId));
      const proj = projects.find(p => p._id === idValue(entry.projectId));
      const type = entry.leaveType || proj?.name || '';
      return [
        formatDateDMY(entry.date.slice(0, 10)),
        `"${res?.name || ''}"`,
        `"${res?.designation || ''}"`,
        `"${type}"`,
        entry.hoursWorked,
        entry.revenue,
        `"${(entry.comments || '').replace(/"/g, '""')}"`
      ].join(',');
    });
    const csvContent = [header.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = getFormattedFilename('csv');
    a.click();
  }

  function handleExportPDF() {
    setIsExportDropdownOpen(false);
    const doc = new jsPDF();
    doc.text("BOM Revenue Tracker - Summary Report", 14, 15);
    doc.setFontSize(10);
    doc.text(`Period: ${formatDateDMY(filters.startDate)} to ${formatDateDMY(filters.endDate)}`, 14, 22);
    doc.text(`Total Revenue: ${currencyConfig.symbol}${summary.totalRevenue.toLocaleString()}`, 14, 28);
    doc.text(`Total Hours: ${summary.totalHours} hrs`, 14, 34);
    
    const tableData = filteredTimesheets.map(entry => {
      const res = resources.find(r => r._id === idValue(entry.resourceId));
      const proj = projects.find(p => p._id === idValue(entry.projectId));
      return [
        formatDateDMY(entry.date.slice(0, 10)),
        res?.name || '',
        entry.leaveType || proj?.name || '',
        entry.hoursWorked,
        `${currencyConfig.symbol}${entry.revenue.toLocaleString()}`,
        entry.comments || ''
      ];
    });

    autoTable(doc, {
      head: [['Date', 'Resource', 'Type/Project', 'Hours', 'Revenue', 'Comments']],
      body: tableData,
      startY: 40
    });
    doc.save(getFormattedFilename('pdf'));
  }


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

  useEffect(() => {
    window.reloadApp = async () => {
      await loadAll();
      await loadDashboard();
    };
    return () => {
      delete window.reloadApp;
    };
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
  const [currencyRates, setCurrencyRates] = useState({ USD: 1, INR: 83, CAD: 1.35 });
  
  useEffect(() => {
    async function fetchRates() {
      try {
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const data = await response.json();
        if (data && data.rates) {
          setCurrencyRates({
            USD: 1,
            INR: data.rates.INR || 83,
            CAD: data.rates.CAD || 1.35
          });
        }
      } catch (err) {
        console.error('Failed to fetch live currency rates:', err);
      }
    }
    fetchRates();
  }, []);

  const CURRENCY_SYMBOLS = { USD: '$', INR: '₹', CAD: 'C$' };
  const CURRENCY_LOCALES = { USD: 'en-US', INR: 'en-IN', CAD: 'en-CA' };

  const currencyConfig = {
    code: activeCurrency,
    rate: currencyRates[activeCurrency],
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
      content: <Dashboard summary={summary} resources={filteredResources} projects={filteredProjects} brands={brands} markets={markets} filters={filters} timesheets={timesheets} showAnalytics={true} currencyConfig={currencyConfig} />
    },
    timesheet: {
      label: 'Timesheet',
      content: (
        <>
          <Dashboard summary={summary} resources={filteredResources} projects={filteredProjects} brands={brands} markets={markets} filters={filters} timesheets={timesheets} currencyConfig={currencyConfig} />
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
          fields={[
            { name: 'name', label: 'Market name', tableLabel: 'Name', required: true },
            { name: 'flag', label: 'Flag Symbol (Emoji)', tableLabel: 'Flag', required: false }
          ]}
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
    budget: {
      label: 'Budget Tracker',
      content: <BudgetTracker projects={projects} currencyConfig={currencyConfig} currency={(val, config) => new Intl.NumberFormat(config.locale || undefined, { style: 'currency', currency: config.code || 'USD', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(val || 0) * config.rate)} api={api} />
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
    },
    reports: {
      label: 'Reports',
      content: (
        <ReportsPage
          timesheets={timesheets}
          projects={projects}
          resources={resources}
          markets={markets}
          brands={brands}
          currencyConfig={currencyConfig}
          currencyFormatter={(val, config) => new Intl.NumberFormat(config.locale || undefined, { style: 'currency', currency: config.code || 'USD', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(val || 0) * config.rate)}
        />
      )
    },
    settings: {
      label: 'Settings',
      content: <SettingsPage theme={theme} setTheme={setTheme} />
    }
  };

  const pageIcons = {
    dashboard: <LayoutDashboard size={18} />,
    timesheet: <Calendar size={18} />,
    markets: <Globe size={18} />,
    brands: <Layers size={18} />,
    projects: <FolderKanban size={18} />,
    budget: <DollarSign size={18} />,
    resources: <Users size={18} />,
    reports: <FileBarChart size={18} />,
    settings: <Settings size={18} />
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <div className="brand-block">
            <span className="brand-mark">O</span>
            <div>
              <h1>Omni BOM</h1>
              <p>Revenue & Timesheets</p>
            </div>
          </div>
          <nav style={{ marginTop: '20px' }}>
            {Object.entries(pages).map(([key, page]) => (
              <button
                className={activePage === key ? 'nav-item active' : 'nav-item'}
                key={key}
                type="button"
                onClick={() => setActivePage(key)}
              >
                {pageIcons[key]}
                <span>{page.label}</span>
              </button>
            ))}
          </nav>
        </div>
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.05em' }}>Currency</label>
          <CustomSelect 
            value={activeCurrency} 
            onChange={(val) => setActiveCurrency(val)}
            options={[
              { value: 'USD', label: 'USD ($)' },
              { value: 'INR', label: 'INR (₹)' },
              { value: 'CAD', label: 'CAD (C$)' }
            ]}
            placeholder="Select Currency"
            direction="up"
          />
        </div>
      </aside>

      <main>
        <header className="topbar">
          <div>
            <h2>{pages[activePage].label}</h2>
            <p>Track time, manage projects, calculate revenue.</p>
          </div>
          {activePage !== 'reports' && activePage !== 'settings' && (
            <div className="topbar-actions">
              <CustomSelect 
                value={filters.marketId} 
                onChange={(val) => setFilters({ ...filters, marketId: val })}
                options={[
                  { value: '', label: 'All Markets' },
                  ...markets.map((market) => ({ value: market._id, label: market.flag ? `${market.flag} ${market.name}` : market.name }))
                ]}
                placeholder="All Markets"
                style={{ width: '160px' }}
              />
              <CustomSelect 
                value={period} 
                onChange={(val) => applyPeriod(val)}
                options={[
                  { value: 'this-month', label: 'This Month' },
                  { value: 'last-month', label: 'Last Month' },
                  { value: 'q1', label: 'Q1' },
                  { value: 'q2', label: 'Q2' },
                  { value: 'q3', label: 'Q3' },
                  { value: 'q4', label: 'Q4' },
                  { value: 'fy', label: `FY ${financialYearLabel()}` },
                  { value: 'this-year', label: 'This Year' },
                  { value: 'custom', label: 'Custom' }
                ]}
                placeholder="Period"
                style={{ width: '160px' }}
              />
              <div className="date-range-control">{dateRangeLabel(filters.startDate, filters.endDate)}</div>
              {period === 'custom' && (
                <>
                  <input type="date" value={filters.startDate} onChange={(event) => setFilters({ ...filters, startDate: event.target.value })} />
                  <input type="date" value={filters.endDate} onChange={(event) => setFilters({ ...filters, endDate: event.target.value })} />
                </>
              )}
              <button className="secondary icon-button" type="button" onClick={() => shiftRange(-1)}>
                <ChevronLeft size={16} />
              </button>
              <button className="secondary icon-button" type="button" onClick={() => shiftRange(1)}>
                <ChevronRight size={16} />
              </button>
              <div className="export-dropdown-container" ref={exportDropdownRef}>
                <button 
                  type="button" 
                  className="export-trigger-btn" 
                  onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
                >
                  <Download size={14} />
                  <span>Export Data</span>
                  <ChevronDown size={14} style={{ transform: isExportDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>
                {isExportDropdownOpen && (
                  <div className="export-dropdown-menu">
                    <button type="button" className="export-dropdown-item" onClick={handleExportExcel}>
                      <FileSpreadsheet size={14} style={{ color: '#107c41' }} />
                      <span>Excel (.xlsx)</span>
                    </button>
                    <button type="button" className="export-dropdown-item" onClick={handleExportCSV}>
                      <FileText size={14} style={{ color: '#007acc' }} />
                      <span>CSV (.csv)</span>
                    </button>
                    <button type="button" className="export-dropdown-item" onClick={handleExportPDF}>
                      <FileBarChart size={14} style={{ color: '#e01e22' }} />
                      <span>PDF (.pdf)</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
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
      return `${market?.name || 'Market'}: ${config.symbol}${Number((rate.hourlyRate || 0) * config.rate).toLocaleString(config.locale || undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
    })
    .join(', ');
}

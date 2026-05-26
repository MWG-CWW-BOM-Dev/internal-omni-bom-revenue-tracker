import React, { useState, useMemo } from 'react';
import CustomSelect from './CustomSelect.jsx';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Download, ChevronLeft, ChevronRight, Filter, FileText } from 'lucide-react';

export default function ReportsPage({ timesheets, projects, resources, markets, brands, currencyConfig, currencyFormatter }) {
  const [filters, setFilters] = useState({
    marketId: '',
    brandId: '',
    projectId: '',
    resourceId: '',
    startDate: '',
    endDate: '',
    type: ''
  });

  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 20;

  const filteredData = useMemo(() => {
    return timesheets.filter(entry => {
      const date = entry.date.slice(0, 10);
      const res = resources.find(r => r._id === (entry.resourceId?._id || entry.resourceId));
      const proj = projects.find(p => p._id === (entry.projectId?._id || entry.projectId));
      
      if (filters.startDate && date < filters.startDate) return false;
      if (filters.endDate && date > filters.endDate) return false;
      if (filters.resourceId && res?._id !== filters.resourceId) return false;
      if (filters.projectId && proj?._id !== filters.projectId) return false;
      
      const marketMatchId = proj?.marketId?._id || proj?.marketId || res?.marketId?._id || res?.marketId;
      if (filters.marketId && marketMatchId !== filters.marketId) return false;
      
      if (filters.brandId && (proj?.brandId?._id || proj?.brandId) !== filters.brandId) return false;
      
      if (filters.type === 'project' && !proj) return false;
      if (filters.type === 'leave' && !entry.leaveType) return false;
      
      return true;
    });
  }, [timesheets, resources, projects, filters]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / rowsPerPage));
  const paginatedData = filteredData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  function formatFilenameDate(dateStr) {
    if (!dateStr) return '';
    const [yyyy, mm, dd] = dateStr.split('-');
    return `${dd}-${mm}-${yyyy}`;
  }

  function getExportFilename(extension) {
    let resourcePart = 'all-resources';
    if (filters.resourceId) {
      const res = resources.find(r => r._id === filters.resourceId);
      if (res) resourcePart = res.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    }

    let datePart = 'all-time';
    const startFormatted = formatFilenameDate(filters.startDate);
    const endFormatted = formatFilenameDate(filters.endDate);

    if (startFormatted && endFormatted) {
      datePart = `${startFormatted}-to-${endFormatted}`;
    } else if (startFormatted) {
      datePart = `from-${startFormatted}`;
    } else if (endFormatted) {
      datePart = `until-${endFormatted}`;
    }

    return `${resourcePart}-${datePart}.${extension}`;
  }

  function exportCSV() {
    const header = ['Date', 'Resource', 'Type/Project', 'Hours', 'Revenue', 'Comments'];
    const rows = filteredData.map(entry => {
      const res = resources.find(r => r._id === (entry.resourceId?._id || entry.resourceId));
      const proj = projects.find(p => p._id === (entry.projectId?._id || entry.projectId));
      const type = entry.leaveType || proj?.name || '';
      return [
        entry.date.slice(0, 10),
        `"${res?.name || ''}"`,
        `"${type}"`,
        entry.hoursWorked,
        entry.revenue,
        `"${(entry.comments || '').replace(/"/g, '""')}"`
      ].join(',');
    });
    
    const csv = [header.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = getExportFilename('csv');
    a.click();
  }

  function exportExcel() {
    const idValue = (x) => x?._id || x || '';

    // Calculate summary dynamically based on filteredData (timesheets matching active filters)
    let totalRevenue = 0;
    let totalHours = 0;
    const resourceMap = {};
    const projectMap = {};

    filteredData.forEach(entry => {
      totalRevenue += entry.revenue || 0;
      totalHours += entry.hoursWorked || 0;

      // Group by resource
      const resId = idValue(entry.resourceId);
      const res = resources.find(r => r._id === resId);
      if (res) {
        if (!resourceMap[res.name]) {
          resourceMap[res.name] = { name: res.name, revenue: 0, hours: 0 };
        }
        resourceMap[res.name].revenue += entry.revenue || 0;
        resourceMap[res.name].hours += entry.hoursWorked || 0;
      }

      // Group by project
      const projId = idValue(entry.projectId);
      const proj = projects.find(p => p._id === projId);
      if (proj) {
        if (!projectMap[proj._id]) {
          projectMap[proj._id] = { _id: proj._id, revenue: 0, hours: 0 };
        }
        projectMap[proj._id].revenue += entry.revenue || 0;
        projectMap[proj._id].hours += entry.hoursWorked || 0;
      }
    });

    const localSummary = {
      totalRevenue,
      totalHours,
      revenueByResource: Object.values(resourceMap),
      revenueByProject: Object.values(projectMap)
    };

    const getProjectRevenueInPeriod = (proj) => {
      if (proj.projectType === 'fte') {
        const pRevObj = localSummary.revenueByProject?.find(p => p._id === proj._id);
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

    const reportsFilteredProjects = projects.filter(proj => {
      if (filters.projectId && proj._id !== filters.projectId) return false;
      if (filters.marketId && idValue(proj.marketId) !== filters.marketId) return false;
      if (filters.brandId && idValue(proj.brandId) !== filters.brandId) return false;
      return true;
    });

    const reportsFilteredResources = resources.filter(res => {
      if (filters.resourceId && res._id !== filters.resourceId) return false;
      if (filters.marketId && idValue(res.marketId) !== filters.marketId) return false;
      return true;
    });

    // Sheet 1: Overview Summary
    const summaryData = [
      { Metric: 'Total Revenue', Value: currencyConfig.symbol + localSummary.totalRevenue.toLocaleString() },
      { Metric: 'Total Hours Worked', Value: localSummary.totalHours + ' hrs' },
      { Metric: 'Active Resources', Value: reportsFilteredResources.length },
      { Metric: 'Active Projects', Value: reportsFilteredProjects.length },
      { Metric: 'Reporting Start Date', Value: filters.startDate ? formatFilenameDate(filters.startDate) : 'All Start Dates' },
      { Metric: 'Reporting End Date', Value: filters.endDate ? formatFilenameDate(filters.endDate) : 'All End Dates' },
      { Metric: 'Filtered Market', Value: markets.find(m => m._id === filters.marketId)?.name || 'All Markets' }
    ];

    // Sheet 2: Timesheet Details
    const timesheetData = filteredData.map(entry => {
      const res = resources.find(r => r._id === idValue(entry.resourceId));
      const proj = projects.find(p => p._id === idValue(entry.projectId));
      const marketObj = proj ? markets.find(m => m._id === idValue(proj.marketId)) : null;
      const brandObj = proj ? brands.find(b => b._id === idValue(proj.brandId)) : null;

      const dStr = entry.date.slice(0, 10);
      const y = parseInt(dStr.slice(0, 4));
      const m = parseInt(dStr.slice(5, 7)) - 1;
      const d = parseInt(dStr.slice(8, 10));

      return {
        Date: new Date(y, m, d),
        'Resource Name': res?.name || '',
        'Resource Designation': res?.designation || '',
        Market: marketObj ? `${marketObj.flag || ''} ${marketObj.name}`.trim() : (entry.leaveType ? 'Paid Leave' : 'Global / Core'),
        Brand: brandObj?.name || 'Corporate',
        'Type / Project': entry.leaveType || proj?.name || '',
        'Project Type': proj ? ((proj.projectType || 'adhoc') === 'fte' ? 'FTE Project' : 'Adhoc Project') : (entry.leaveType ? 'Leave' : '-'),
        'Billing Type': proj ? (proj.billingType === 'fixed' ? 'Fixed Budget' : 'Hourly Rate') : (entry.leaveType ? 'Paid Leave' : '-'),
        'Hours Worked': entry.hoursWorked,
        'Calculated Revenue': entry.revenue,
        Comments: entry.comments || ''
      };
    });

    // Sheet 3: Project Summary
    const projectData = reportsFilteredProjects.map(proj => {
      const marketObj = markets.find(m => m._id === idValue(proj.marketId));
      const brandObj = brands.find(b => b._id === idValue(proj.brandId));
      const pHours = localSummary.revenueByProject?.find(p => p._id === proj._id)?.hours || 0;
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
    const adhocProjectData = reportsFilteredProjects
      .filter(proj => (proj.projectType || 'adhoc') === 'adhoc')
      .map(proj => {
        const marketObj = markets.find(m => m._id === idValue(proj.marketId));
        const brandObj = brands.find(b => b._id === idValue(proj.brandId));
        const pHours = localSummary.revenueByProject?.find(p => p._id === proj._id)?.hours || 0;
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
    const fteProjectData = reportsFilteredProjects
      .filter(proj => proj.projectType === 'fte')
      .map(proj => {
        const marketObj = markets.find(m => m._id === idValue(proj.marketId));
        const brandObj = brands.find(b => b._id === idValue(proj.brandId));
        const pHours = localSummary.revenueByProject?.find(p => p._id === proj._id)?.hours || 0;
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
    const resourceSummaryData = reportsFilteredResources.map(res => {
      const marketObj = markets.find(m => m._id === idValue(res.marketId));
      const resRev = localSummary.revenueByResource?.find(r => r.name === res.name)?.revenue || 0;
      const resHours = localSummary.revenueByResource?.find(r => r.name === res.name)?.hours || 0;
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
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(timesheetData, { cellDates: true }), "Timesheet Details");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(projectData), "Projects Summary");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(adhocProjectData), "Adhoc Projects");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(fteProjectData), "FTE Projects");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(resourceSummaryData), "Resources Summary");
    XLSX.writeFile(workbook, getExportFilename('xlsx'));
  }

  function exportPDF() {
    const doc = new jsPDF();
    doc.text("Revenue Tracker Reports", 14, 15);
    
    const tableData = filteredData.map(entry => {
      const res = resources.find(r => r._id === (entry.resourceId?._id || entry.resourceId));
      const proj = projects.find(p => p._id === (entry.projectId?._id || entry.projectId));
      return [
        entry.date.slice(0, 10),
        res?.name || '',
        entry.leaveType || proj?.name || '',
        entry.hoursWorked,
        currencyFormatter(entry.revenue, currencyConfig),
        entry.comments || ''
      ];
    });

    autoTable(doc, {
      head: [['Date', 'Resource', 'Type/Project', 'Hours', 'Revenue', 'Comments']],
      body: tableData,
      startY: 20
    });
    
    doc.save(getExportFilename('pdf'));
  }

  return (
    <div className="reports-page panel" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header and Export controls */}
      <div className="reports-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', borderBottom: '1px solid var(--line)', paddingBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FileText size={20} style={{ color: 'var(--primary)' }} />
          <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>Filter Reports</h2>
        </div>
        <div className="export-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', minHeight: '36px', fontSize: '13px', borderRadius: '6px' }} onClick={exportCSV}>
            <Download size={14} />
            <span>CSV</span>
          </button>
          <button className="secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', minHeight: '36px', fontSize: '13px', borderRadius: '6px' }} onClick={exportExcel}>
            <Download size={14} />
            <span>Excel</span>
          </button>
          <button className="secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', minHeight: '36px', fontSize: '13px', borderRadius: '6px' }} onClick={exportPDF}>
            <Download size={14} />
            <span>PDF</span>
          </button>
        </div>
      </div>

      {/* Dynamic Filters Grid */}
      <div className="reports-filters" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div className="filter-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--muted)' }}>Start Date</label>
          <input type="date" style={{ minHeight: '38px', borderRadius: 'var(--radius-sm)' }} value={filters.startDate} onChange={e => { setFilters({...filters, startDate: e.target.value}); setCurrentPage(1); }} />
        </div>
        <div className="filter-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--muted)' }}>End Date</label>
          <input type="date" style={{ minHeight: '38px', borderRadius: 'var(--radius-sm)' }} value={filters.endDate} onChange={e => { setFilters({...filters, endDate: e.target.value}); setCurrentPage(1); }} />
        </div>
        <div className="filter-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--muted)' }}>Market</label>
          <CustomSelect 
            value={filters.marketId} 
            onChange={val => { setFilters({...filters, marketId: val}); setCurrentPage(1); }}
            options={[
              { value: '', label: 'All Markets' },
              ...markets.map(m => ({ value: m._id, label: m.flag ? `${m.flag} ${m.name}` : m.name }))
            ]}
            placeholder="All Markets"
          />
        </div>
        <div className="filter-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--muted)' }}>Brand</label>
          <CustomSelect 
            value={filters.brandId} 
            onChange={val => { setFilters({...filters, brandId: val}); setCurrentPage(1); }}
            options={[
              { value: '', label: 'All Brands' },
              ...brands.map(b => ({ value: b._id, label: b.name }))
            ]}
            placeholder="All Brands"
          />
        </div>
        <div className="filter-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--muted)' }}>Project</label>
          <CustomSelect 
            value={filters.projectId} 
            onChange={val => { setFilters({...filters, projectId: val}); setCurrentPage(1); }}
            options={[
              { value: '', label: 'All Projects' },
              ...projects.map(p => ({ value: p._id, label: p.name }))
            ]}
            placeholder="All Projects"
          />
        </div>
        <div className="filter-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--muted)' }}>Resource</label>
          <CustomSelect 
            value={filters.resourceId} 
            onChange={val => { setFilters({...filters, resourceId: val}); setCurrentPage(1); }}
            options={[
              { value: '', label: 'All Resources' },
              ...resources.map(r => ({ value: r._id, label: r.name }))
            ]}
            placeholder="All Resources"
          />
        </div>
        <div className="filter-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--muted)' }}>Type</label>
          <CustomSelect 
            value={filters.type} 
            onChange={val => { setFilters({...filters, type: val}); setCurrentPage(1); }}
            options={[
              { value: '', label: 'All Types' },
              { value: 'project', label: 'Projects Only' },
              { value: 'leave', label: 'Leaves Only' }
            ]}
            placeholder="All Types"
          />
        </div>
      </div>

      {/* Tabular Reports */}
      <div className="table-wrap">
        <table style={{ width: '100%', textAlign: 'left' }}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Resource</th>
              <th>Type / Project</th>
              <th>Hours</th>
              <th>Revenue</th>
              <th>Comments</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map(entry => {
              const res = resources.find(r => r._id === (entry.resourceId?._id || entry.resourceId));
              const proj = projects.find(p => p._id === (entry.projectId?._id || entry.projectId));
              const type = entry.leaveType || proj?.name || '';
              return (
                <tr key={entry._id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{entry.date.slice(0, 10)}</td>
                  <td><strong>{res?.name}</strong></td>
                  <td>
                    {entry.leaveType ? (
                      <span className="status-badge cancelled" style={{ padding: '2px 8px', fontSize: '11px', minHeight: 'auto' }}>
                        {entry.leaveType}
                      </span>
                    ) : (
                      type
                    )}
                  </td>
                  <td>{entry.hoursWorked}h</td>
                  <td><strong>{currencyFormatter(entry.revenue, currencyConfig)}</strong></td>
                  <td><span className="truncate" title={entry.comments}>{entry.comments || '-'}</span></td>
                </tr>
              )
            })}
            {paginatedData.length === 0 && (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: 'var(--soft)' }}>No records match your filters</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="pagination" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '16px' }}>
          <button className="secondary icon-button" style={{ width: '36px', minHeight: '36px', borderRadius: '6px' }} disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--ink)' }}>Page {currentPage} of {totalPages}</span>
          <button className="secondary icon-button" style={{ width: '36px', minHeight: '36px', borderRadius: '6px' }} disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

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
    const data = filteredData.map(entry => {
      const res = resources.find(r => r._id === (entry.resourceId?._id || entry.resourceId));
      const proj = projects.find(p => p._id === (entry.projectId?._id || entry.projectId));
      return {
        Date: entry.date.slice(0, 10),
        Resource: res?.name || '',
        'Type / Project': entry.leaveType || proj?.name || '',
        Hours: entry.hoursWorked,
        Revenue: entry.revenue,
        Comments: entry.comments || ''
      };
    });
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Reports");
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

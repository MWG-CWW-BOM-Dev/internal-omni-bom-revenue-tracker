import React, { useState } from 'react';
import CustomSelect from './CustomSelect.jsx';
import { 
  FolderPlus, 
  Briefcase, 
  Clock, 
  Coins, 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  Check, 
  X,
  FileSpreadsheet
} from 'lucide-react';

const statusOptions = ['In Pipeline', 'On Hold', 'In Progress', 'Delivered', 'Cancelled'];

export default function ProjectsPage({ projects, markets, brands, summary, onCreate, onUpdate, onDelete, currencyConfig = { rate: 1, symbol: '$', code: 'USD' }, timesheets = [], filters }) {
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState('');
  const [form, setForm] = useState(initialForm());
  const [editForm, setEditForm] = useState(initialForm());
  const visibleProjects = projects.filter((project) => project.name.toLowerCase().includes(search.toLowerCase()));
  const activeProjects = projects.filter((project) => !['Delivered', 'Cancelled'].includes(project.status)).length;

  const metricsDeltas = React.useMemo(() => {
    const idVal = (val) => {
      if (!val) return '';
      return typeof val === 'string' ? val : val._id || String(val);
    };

    const toDateStr = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
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

      prevStartStr = toDateStr(prevStart);
      prevEndStr = toDateStr(prevEnd);

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

    // Filter timesheets for current and previous period timezone-agnostically
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

    // 1. Total Projects
    const curProjTotal = projects.length;
    const prevProjTotal = projects.filter(p => !p.startDate || p.startDate.slice(0, 10) <= prevEndStr).length;
    const projTotalDelta = prevProjTotal > 0 ? ((curProjTotal - prevProjTotal) / prevProjTotal) * 100 : (curProjTotal > 0 ? 100 : 0);

    // 2. Active Projects
    const curActiveProj = projects.filter(p => !['Delivered', 'Cancelled'].includes(p.status)).length;
    const prevActiveProj = projects.filter(p => {
      const pStart = p.startDate ? p.startDate.slice(0, 10) : '';
      const pEnd = p.endDate ? p.endDate.slice(0, 10) : '';
      return (!pStart || pStart <= prevEndStr) && (!pEnd || pEnd >= prevStartStr) && p.status !== 'Cancelled';
    }).length;
    const activeProjDelta = prevActiveProj > 0 ? ((curActiveProj - prevActiveProj) / prevActiveProj) * 100 : (curActiveProj > 0 ? 100 : 0);

    // 3. Total Hours
    const curHrs = currentEntries.reduce((sum, entry) => sum + (entry.hoursWorked || 0), 0);
    const prevHrs = previousEntries.reduce((sum, entry) => sum + (entry.hoursWorked || 0), 0);
    const hrsDelta = prevHrs > 0 ? ((curHrs - prevHrs) / prevHrs) * 100 : (curHrs > 0 ? 100 : 0);

    // 4. Total Budgeted (Revenue)
    const curRev = currentEntries.reduce((sum, entry) => sum + (entry.revenue || 0), 0);
    const prevRev = previousEntries.reduce((sum, entry) => sum + (entry.revenue || 0), 0);
    const revDelta = prevRev > 0 ? ((curRev - prevRev) / prevRev) * 100 : (curRev > 0 ? 100 : 0);

    return {
      periodLabel,
      totalProjectsDelta: projTotalDelta,
      activeProjectsDelta: activeProjDelta,
      totalHoursDelta: hrsDelta,
      totalBudgetedDelta: revDelta
    };
  }, [filters?.startDate, filters?.endDate, filters?.marketId, timesheets, projects]);

  async function submit(event) {
    event.preventDefault();
    const newName = form.name.trim();
    if (projects.some((p) => p.name.toLowerCase() === newName.toLowerCase())) {
      alert(`A project with the name "${newName}" already exists.`);
      return;
    }
    await onCreate(payload(form));
    setForm(initialForm());
  }

  async function save(id) {
    const newName = editForm.name.trim();
    if (projects.some((p) => p._id !== id && p.name.toLowerCase() === newName.toLowerCase())) {
      alert(`A project with the name "${newName}" already exists.`);
      return;
    }
    await onUpdate(id, payload(editForm));
    setEditingId('');
  }

  function startEdit(project) {
    setEditingId(project._id);
    setEditForm({
      name: project.name || '',
      pointOfContact: project.pointOfContact || '',
      marketId: project.marketId?._id || project.marketId || '',
      brandId: project.brandId?._id || project.brandId || '',
      billingType: project.billingType || 'hourly',
      fixedBudget: project.fixedBudget || 0,
      totalBudget: project.totalBudget || 0,
      status: project.status || 'In Pipeline',
      startDate: project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      endDate: project.endDate ? new Date(project.endDate).toISOString().split('T')[0] : '',
      projectType: project.projectType || 'adhoc'
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* Visual Banners */}
      <section className="project-metrics">
        <ProjectMetric tone="purple" label="Total Projects" value={projects.length} deltaVal={metricsDeltas.totalProjectsDelta} periodLabel={metricsDeltas.periodLabel} icon={<FolderPlus size={18} />} />
        <ProjectMetric tone="green" label="Active Projects" value={activeProjects} deltaVal={metricsDeltas.activeProjectsDelta} periodLabel={metricsDeltas.periodLabel} icon={<Briefcase size={18} />} />
        <ProjectMetric tone="amber" label="Total Hours" value={`${number(summary.totalHours)}h`} deltaVal={metricsDeltas.totalHoursDelta} periodLabel={metricsDeltas.periodLabel} icon={<Clock size={18} />} />
        <ProjectMetric tone="red" label="Total Budgeted" value={currency(summary.totalRevenue, currencyConfig)} deltaVal={metricsDeltas.totalBudgetedDelta} periodLabel={metricsDeltas.periodLabel} icon={<Coins size={18} />} />
      </section>

      {/* Add New Project Card */}
      <section className="project-card add-project-card">
        <div className="project-card-title" style={{ borderBottom: '1px solid var(--line)', paddingBottom: '12px', marginBottom: '18px' }}>
          <FolderPlus size={20} className="project-title-icon" />
          <h3 style={{ margin: 0 }}>Add New Project</h3>
        </div>
        <form className="project-form" onSubmit={submit}>
          <Field label="Project Name">
            <input placeholder="Enter project name" value={form.name} required onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </Field>
          <Field label="Point of Contact">
            <input placeholder="Enter contact name" value={form.pointOfContact} required onChange={(event) => setForm({ ...form, pointOfContact: event.target.value })} />
          </Field>
          <Field label="Market">
            <CustomSelect
              value={form.marketId}
              required
              onChange={(val) => setForm({ ...form, marketId: val })}
              options={markets.map(market => ({ value: market._id, label: market.flag ? `${market.flag} ${market.name}` : market.name }))}
              placeholder="Select market"
            />
          </Field>
          <Field label="Brand (Optional)">
            <CustomSelect
              value={form.brandId}
              onChange={(val) => setForm({ ...form, brandId: val })}
              options={[
                { value: '', label: 'Select brand' },
                ...brands.map(brand => ({ value: brand._id, label: brand.name }))
              ]}
              placeholder="Select brand"
            />
          </Field>
          <Field label="Billing Type">
            <BillingToggle value={form.billingType} onChange={(billingType) => setForm({ ...form, billingType })} />
          </Field>
          <Field label="Project Type">
            <CustomSelect
              value={form.projectType || 'adhoc'}
              required
              onChange={(val) => setForm({ ...form, projectType: val })}
              options={[
                { value: 'adhoc', label: 'Adhoc Project' },
                { value: 'fte', label: 'FTE Project' }
              ]}
              placeholder="Select Type"
            />
          </Field>
          <Field label="Fixed Budget (Optional)" wide>
            <input type="number" min="0" step="0.01" placeholder="Enter budget amount" value={form.fixedBudget} onChange={(event) => setForm({ ...form, fixedBudget: event.target.value })} />
          </Field>
          <Field label="Total Approved Budget" wide>
            <input type="number" min="0" step="0.01" placeholder="Enter total approved budget" value={form.totalBudget} onChange={(event) => setForm({ ...form, totalBudget: event.target.value })} />
          </Field>
          <Field label="Start Date">
            <input type="date" required value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} />
          </Field>
          <Field label="End Date (Optional)">
            <input type="date" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} />
          </Field>
          <Field label="Status">
            <CustomSelect
              value={form.status}
              required
              onChange={(val) => setForm({ ...form, status: val })}
              options={statusOptions}
              placeholder="Select status"
            />
          </Field>
          <button className="project-submit" type="submit" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={16} />
            <span>Add Project</span>
          </button>
        </form>
      </section>

      {/* Projects List Card */}
      <section className="project-card">
        <div className="project-list-head" style={{ borderBottom: '1px solid var(--line)', paddingBottom: '16px', marginBottom: '16px' }}>
          <div className="project-card-title">
            <FileSpreadsheet size={20} className="project-title-icon" />
            <h3 style={{ margin: 0 }}>All Active Projects</h3>
          </div>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={14} style={{ position: 'absolute', left: '12px', color: 'var(--muted)', pointerEvents: 'none' }} />
            <input 
              className="project-search" 
              placeholder="Search projects..." 
              value={search} 
              onChange={(event) => setSearch(event.target.value)} 
              style={{ paddingLeft: '32px', minHeight: '38px', borderRadius: '999px' }}
            />
          </div>
        </div>

        <div className="project-table-wrap">
          <table className="project-table">
            <thead>
              <tr>
                <th>Project Name</th>
                <th>Market</th>
                <th>Point of Contact</th>
                <th>Brand</th>
                <th>Project Type</th>
                <th>Billing</th>
                <th>Fixed Budget</th>
                <th>Total Budget</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleProjects.map((project) => {
                const isEditing = editingId === project._id;
                return (
                  <tr key={project._id}>
                    <td>
                      <div className="project-name-cell">
                        <span className="project-initial">{project.name[0]?.toUpperCase()}</span>
                        {isEditing ? <input value={editForm.name} onChange={(event) => setEditForm({ ...editForm, name: event.target.value })} /> : project.name}
                      </div>
                    </td>
                    <td>{isEditing ? <MarketSelect value={editForm.marketId} markets={markets} onChange={(marketId) => setEditForm({ ...editForm, marketId })} /> : (project.marketId?.flag ? `${project.marketId.flag} ${project.marketId.name}` : project.marketId?.name || '-')}</td>
                    <td>{isEditing ? <input value={editForm.pointOfContact} onChange={(event) => setEditForm({ ...editForm, pointOfContact: event.target.value })} /> : project.pointOfContact || '-'}</td>
                    <td>{isEditing ? <BrandSelect value={editForm.brandId} brands={brands} onChange={(brandId) => setEditForm({ ...editForm, brandId })} /> : project.brandId?.name || '-'}</td>
                    <td>
                      {isEditing ? (
                        <CustomSelect
                          value={editForm.projectType || 'adhoc'}
                          onChange={(val) => setEditForm({ ...editForm, projectType: val })}
                          options={[
                            { value: 'adhoc', label: 'Adhoc' },
                            { value: 'fte', label: 'FTE' }
                          ]}
                          style={{ minWidth: '95px' }}
                        />
                      ) : (
                        <span className={`type-pill ${(project.projectType || 'adhoc')}`}>
                          {(project.projectType || 'adhoc') === 'fte' ? 'FTE Project' : 'Adhoc Project'}
                        </span>
                      )}
                    </td>
                    <td>{isEditing ? <BillingToggle value={editForm.billingType} onChange={(billingType) => setEditForm({ ...editForm, billingType })} compact /> : <span className="billing-pill">{project.billingType === 'fixed' ? 'Fixed Budget' : 'Hourly Based'}</span>}</td>
                    <td>{isEditing ? <input type="number" min="0" step="0.01" value={editForm.fixedBudget} style={{maxWidth: '100px'}} onChange={(event) => setEditForm({ ...editForm, fixedBudget: event.target.value })} /> : currency(project.fixedBudget || 0, currencyConfig)}</td>
                    <td>{isEditing ? <input type="number" min="0" step="0.01" value={editForm.totalBudget || 0} style={{maxWidth: '100px'}} onChange={(event) => setEditForm({ ...editForm, totalBudget: event.target.value })} /> : currency(project.totalBudget || 0, currencyConfig)}</td>
                    <td>{isEditing ? <input type="date" value={editForm.startDate} required onChange={(event) => setEditForm({ ...editForm, startDate: event.target.value })} /> : (project.startDate ? new Date(project.startDate).toLocaleDateString() : '-')}</td>
                    <td>{isEditing ? <input type="date" value={editForm.endDate} onChange={(event) => setEditForm({ ...editForm, endDate: event.target.value })} /> : (project.endDate ? new Date(project.endDate).toLocaleDateString() : '-')}</td>
                    <td>{isEditing ? <StatusSelect value={editForm.status} onChange={(status) => setEditForm({ ...editForm, status })} /> : <StatusBadge status={project.status} />}</td>
                    <td>
                      <div className="project-actions">
                        {isEditing ? (
                          <>
                            <button className="secondary icon-button" type="button" onClick={() => save(project._id)} title="Save changes">
                              <Check size={14} />
                            </button>
                            <button className="secondary icon-button" type="button" onClick={() => setEditingId('')} title="Cancel">
                              <X size={14} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button className="secondary icon-button" type="button" onClick={() => startEdit(project)} title="Edit project">
                              <Edit2 size={14} />
                            </button>
                            <button className="danger icon-button" type="button" onClick={() => onDelete(project._id)} title="Delete project">
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="project-pagination">Showing 1 to {visibleProjects.length} of {projects.length} projects</div>
      </section>
    </div>
  );
}

function ProjectMetric({ tone, label, value, deltaVal = 0, periodLabel, icon }) {
  const isPositive = deltaVal > 0;
  const isNegative = deltaVal < 0;
  const deltaClass = isPositive ? 'positive' : isNegative ? 'negative' : '';
  const deltaText = isPositive ? `+${deltaVal.toFixed(1)}%` : isNegative ? `${deltaVal.toFixed(1)}%` : '0.0%';

  return (
    <div className={`project-metric ${tone}`}>
      <span className="project-metric-icon">{icon}</span>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small className={deltaClass}>
          {deltaText} <em>{periodLabel}</em>
        </small>
      </div>
    </div>
  );
}

function Field({ label, children, wide = false }) {
  return (
    <label className={wide ? 'project-field wide' : 'project-field'}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function BillingToggle({ value, onChange, compact = false }) {
  return (
    <div className={compact ? 'billing-toggle compact' : 'billing-toggle'}>
      <button className={value === 'hourly' ? 'active' : ''} type="button" onClick={() => onChange('hourly')}>Hourly Based</button>
      <button className={value === 'fixed' ? 'active' : ''} type="button" onClick={() => onChange('fixed')}>Fixed Budget</button>
    </div>
  );
}

function MarketSelect({ value, markets, onChange }) {
  return (
    <CustomSelect
      value={value}
      onChange={onChange}
      options={markets.map((market) => ({ value: market._id, label: market.flag ? `${market.flag} ${market.name}` : market.name }))}
      style={{ minWidth: '120px' }}
    />
  );
}

function BrandSelect({ value, brands, onChange }) {
  return (
    <CustomSelect
      value={value}
      onChange={onChange}
      options={[
        { value: '', label: '-' },
        ...brands.map((brand) => ({ value: brand._id, label: brand.name }))
      ]}
      style={{ minWidth: '120px' }}
    />
  );
}

function StatusSelect({ value, onChange }) {
  return (
    <CustomSelect
      value={value}
      onChange={onChange}
      options={statusOptions}
      style={{ minWidth: '120px' }}
    />
  );
}

function StatusBadge({ status = 'In Pipeline' }) {
  return <span className={`status-badge ${status.toLowerCase().replaceAll(' ', '-')}`}>{status}</span>;
}

function initialForm() {
  const today = new Date().toISOString().split('T')[0];
  return { name: '', pointOfContact: '', marketId: '', brandId: '', billingType: 'hourly', fixedBudget: 0, totalBudget: 0, status: 'In Pipeline', startDate: today, endDate: '', projectType: 'adhoc' };
}

function payload(form) {
  return {
    name: form.name,
    pointOfContact: form.pointOfContact,
    marketId: form.marketId,
    brandId: form.brandId || null,
    billingType: form.billingType,
    fixedBudget: Number(form.fixedBudget || 0),
    totalBudget: Number(form.totalBudget || 0),
    startDate: form.startDate,
    endDate: form.endDate || null,
    status: form.status,
    projectType: form.projectType || 'adhoc'
  };
}

function currency(value, config) {
  const converted = Number(value || 0) * config.rate;
  return new Intl.NumberFormat(config.locale || undefined, { style: 'currency', currency: config.code || 'USD', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(converted);
}

function number(value) {
  return Number(value || 0).toLocaleString();
}

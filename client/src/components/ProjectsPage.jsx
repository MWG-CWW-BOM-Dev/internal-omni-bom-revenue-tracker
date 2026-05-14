import React, { useState } from 'react';

const statusOptions = ['In Pipeline', 'On Hold', 'In Progress', 'Delivered', 'Cancelled'];

export default function ProjectsPage({ projects, markets, brands, summary, onCreate, onUpdate, onDelete, currencyConfig = { rate: 1, symbol: '$', code: 'USD' } }) {
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState('');
  const [form, setForm] = useState(initialForm());
  const [editForm, setEditForm] = useState(initialForm());
  const visibleProjects = projects.filter((project) => project.name.toLowerCase().includes(search.toLowerCase()));
  const activeProjects = projects.filter((project) => !['Delivered', 'Cancelled'].includes(project.status)).length;

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
      endDate: project.endDate ? new Date(project.endDate).toISOString().split('T')[0] : ''
    });
  }

  return (
    <>
      <section className="project-metrics">
        <ProjectMetric tone="purple" label="Total Projects" value={projects.length} delta="+12.5%" />
        <ProjectMetric tone="green" label="Active Projects" value={activeProjects} delta="+8.2%" />
        <ProjectMetric tone="amber" label="Total Hours" value={`${number(summary.totalHours)}h`} delta="+10.3%" icon="h" />
        <ProjectMetric tone="red" label="Total Revenue" value={currency(summary.totalRevenue, currencyConfig)} delta="+12.5%" icon={currencyConfig.symbol} />
      </section>

      <section className="project-card add-project-card">
        <div className="project-card-title">
          <span className="project-title-icon">+</span>
          <h3>Add New Project</h3>
        </div>
        <form className="project-form" onSubmit={submit}>
          <Field label="Project Name">
            <input placeholder="Enter project name" value={form.name} required onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </Field>
          <Field label="Point of Contact">
            <input placeholder="Enter contact name" value={form.pointOfContact} required onChange={(event) => setForm({ ...form, pointOfContact: event.target.value })} />
          </Field>
          <Field label="Market">
            <select value={form.marketId} required onChange={(event) => setForm({ ...form, marketId: event.target.value })}>
              <option value="">Select market</option>
              {markets.map((market) => (
                <option key={market._id} value={market._id}>
                  {market.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Brand (Optional)">
            <select value={form.brandId} onChange={(event) => setForm({ ...form, brandId: event.target.value })}>
              <option value="">Select brand</option>
              {brands.map((brand) => (
                <option key={brand._id} value={brand._id}>
                  {brand.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Billing Type">
            <BillingToggle value={form.billingType} onChange={(billingType) => setForm({ ...form, billingType })} />
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
            <select value={form.status} required onChange={(event) => setForm({ ...form, status: event.target.value })}>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </Field>
          <button className="project-submit" type="submit">Add Project</button>
        </form>
      </section>

      <section className="project-card">
        <div className="project-list-head">
          <div className="project-card-title">
            <span className="project-title-icon">P</span>
            <h3>All Projects</h3>
          </div>
          <input className="project-search" placeholder="Search projects..." value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>

        <div className="project-table-wrap">
          <table className="project-table">
            <thead>
              <tr>
                <th>Project Name</th>
                <th>Market</th>
                <th>Point of Contact</th>
                <th>Brand</th>
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
                    <td>{isEditing ? <MarketSelect value={editForm.marketId} markets={markets} onChange={(marketId) => setEditForm({ ...editForm, marketId })} /> : project.marketId?.name || '-'}</td>
                    <td>{isEditing ? <input value={editForm.pointOfContact} onChange={(event) => setEditForm({ ...editForm, pointOfContact: event.target.value })} /> : project.pointOfContact || '-'}</td>
                    <td>{isEditing ? <BrandSelect value={editForm.brandId} brands={brands} onChange={(brandId) => setEditForm({ ...editForm, brandId })} /> : project.brandId?.name || '-'}</td>
                    <td>{isEditing ? <BillingToggle value={editForm.billingType} onChange={(billingType) => setEditForm({ ...editForm, billingType })} compact /> : <span className="billing-pill">{project.billingType === 'fixed' ? 'Fixed Budget' : 'Hourly Based'}</span>}</td>
                    <td>{isEditing ? <input type="number" min="0" step="0.01" value={editForm.fixedBudget} onChange={(event) => setEditForm({ ...editForm, fixedBudget: event.target.value })} /> : currency(project.fixedBudget || 0, currencyConfig)}</td>
                    <td>{isEditing ? <input type="number" min="0" step="0.01" value={editForm.totalBudget || 0} onChange={(event) => setEditForm({ ...editForm, totalBudget: event.target.value })} /> : currency(project.totalBudget || 0, currencyConfig)}</td>
                    <td>{isEditing ? <input type="date" value={editForm.startDate} required onChange={(event) => setEditForm({ ...editForm, startDate: event.target.value })} /> : (project.startDate ? new Date(project.startDate).toLocaleDateString() : '-')}</td>
                    <td>{isEditing ? <input type="date" value={editForm.endDate} onChange={(event) => setEditForm({ ...editForm, endDate: event.target.value })} /> : (project.endDate ? new Date(project.endDate).toLocaleDateString() : '-')}</td>
                    <td>{isEditing ? <StatusSelect value={editForm.status} onChange={(status) => setEditForm({ ...editForm, status })} /> : <StatusBadge status={project.status} />}</td>
                    <td>
                      <div className="project-actions">
                        {isEditing ? (
                          <>
                            <button type="button" onClick={() => save(project._id)}>Save</button>
                            <button className="secondary" type="button" onClick={() => setEditingId('')}>Cancel</button>
                          </>
                        ) : (
                          <>
                            <button className="secondary icon-button" type="button" onClick={() => startEdit(project)}>E</button>
                            <button className="danger icon-button" type="button" onClick={() => onDelete(project._id)}>D</button>
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
    </>
  );
}

function ProjectMetric({ tone, label, value, delta, icon = 'P' }) {
  return (
    <div className={`project-metric ${tone}`}>
      <span className="project-metric-icon">{icon}</span>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{delta} <em>vs last month</em></small>
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
    <select value={value} onChange={(event) => onChange(event.target.value)}>
      {markets.map((market) => <option key={market._id} value={market._id}>{market.name}</option>)}
    </select>
  );
}

function BrandSelect({ value, brands, onChange }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">-</option>
      {brands.map((brand) => <option key={brand._id} value={brand._id}>{brand.name}</option>)}
    </select>
  );
}

function StatusSelect({ value, onChange }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)}>
      {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
    </select>
  );
}

function StatusBadge({ status = 'In Pipeline' }) {
  return <span className={`status-badge ${status.toLowerCase().replaceAll(' ', '-')}`}>{status}</span>;
}

function initialForm() {
  const today = new Date().toISOString().split('T')[0];
  return { name: '', pointOfContact: '', marketId: '', brandId: '', billingType: 'hourly', fixedBudget: 0, totalBudget: 0, status: 'In Pipeline', startDate: today, endDate: '' };
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
    status: form.status
  };
}

function currency(value, config) {
  const converted = Number(value || 0) * config.rate;
  return new Intl.NumberFormat(config.locale || undefined, { style: 'currency', currency: config.code || 'USD', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(converted);
}

function number(value) {
  return Number(value || 0).toLocaleString();
}

import React, { useEffect, useState } from 'react';
import CustomSelect from './CustomSelect.jsx';
import { 
  Coins, 
  Clock, 
  TrendingUp, 
  Plus, 
  Check, 
  X, 
  Edit2, 
  Trash2, 
  Briefcase, 
  FileText,
  DollarSign
} from 'lucide-react';

export default function BudgetTracker({ projects, currencyConfig, currency, api }) {
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [requests, setRequests] = useState([]);
  const [form, setForm] = useState({
    requestName: '',
    requestType: '',
    quotedAmount: '',
    createdDate: new Date().toISOString().split('T')[0],
    quarter: 'Q1',
    status: 'Approved',
    billingStatus: 'Pending'
  });

  const selectedProject = projects.find(p => p._id === selectedProjectId);

  useEffect(() => {
    if (selectedProjectId) {
      loadRequests(selectedProjectId);
    } else {
      setRequests([]);
    }
  }, [selectedProjectId]);

  async function loadRequests(projectId) {
    try {
      const data = await api.list('/project-requests');
      setRequests(data.filter(r => r.projectId === projectId || (r.projectId && r.projectId._id === projectId)));
    } catch (err) {
      console.error(err);
    }
  }

  const [editingReqId, setEditingReqId] = useState('');
  const [editForm, setEditForm] = useState({});

  async function submit(event) {
    event.preventDefault();
    if (!selectedProjectId) return;
    
    await api.create('/project-requests', { ...form, projectId: selectedProjectId, quotedAmount: Number(form.quotedAmount) });
    setForm({ ...form, requestName: '', requestType: '', quotedAmount: '' });
    
    if (typeof window.reloadApp === 'function') {
      window.reloadApp();
    }
    loadRequests(selectedProjectId);
  }

  function startEdit(req) {
    setEditingReqId(req._id);
    setEditForm({
      requestName: req.requestName,
      requestType: req.requestType,
      quotedAmount: req.quotedAmount,
      createdDate: new Date(req.createdDate).toISOString().split('T')[0],
      quarter: req.quarter
    });
  }

  async function saveEdit(id) {
    await api.update('/project-requests', id, { ...editForm, quotedAmount: Number(editForm.quotedAmount) });
    setEditingReqId('');
    if (typeof window.reloadApp === 'function') {
      window.reloadApp();
    }
    loadRequests(selectedProjectId);
  }

  async function deleteRequest(id) {
    if (!window.confirm('Are you sure you want to delete this request?')) return;
    await api.remove('/project-requests', id);
    if (typeof window.reloadApp === 'function') {
      window.reloadApp();
    }
    loadRequests(selectedProjectId);
  }

  async function toggleBillingStatus(req) {
    const newStatus = req.billingStatus === 'Pending' ? 'Billed' : 'Pending';
    await api.update('/project-requests', req._id, { billingStatus: newStatus });
    
    if (typeof window.reloadApp === 'function') {
      window.reloadApp();
    }
    loadRequests(selectedProjectId);
  }

  const fmt = (val) => currency(val, currencyConfig);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* Project Selector Card */}
      <section className="project-card">
        <div className="project-card-title" style={{ borderBottom: '1px solid var(--line)', paddingBottom: '12px', marginBottom: '18px' }}>
          <Briefcase size={20} className="project-title-icon" />
          <h3 style={{ margin: 0 }}>Select Project for Budget Tracking</h3>
        </div>
        <div>
          <CustomSelect
            value={selectedProjectId}
            onChange={(val) => setSelectedProjectId(val)}
            options={[
              { value: '', label: '-- Select a Project --' },
              ...projects.filter(p => p.totalBudget > 0 || p.consumedBudget > 0).map(p => ({ value: p._id, label: p.name }))
            ]}
            placeholder="-- Select a Project --"
            style={{ width: '100%', maxWidth: '400px' }}
          />
        </div>
      </section>

      {selectedProject && (
        <>
          {/* Summary Metrics & Progress Strip */}
          <section className="dashboard-strip" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="metrics">
              <div className="metric-card">
                <div className="metric-icon">
                  <Coins size={20} />
                </div>
                <span>Total Budget</span>
                <strong>{fmt(selectedProject.totalBudget || 0)}</strong>
              </div>
              <div className="metric-card">
                <div className="metric-icon orange">
                  <TrendingUp size={20} />
                </div>
                <span>Consumed Budget</span>
                <strong>{fmt(selectedProject.consumedBudget || 0)}</strong>
              </div>
              <div className="metric-card">
                <div className="metric-icon green">
                  <DollarSign size={20} />
                </div>
                <span>Remaining Budget</span>
                <strong>{fmt(selectedProject.remainingBudget || 0)}</strong>
              </div>
              <div className="metric-card">
                <div className="metric-icon">
                  <Clock size={20} />
                </div>
                <span>Quarterly Billed</span>
                <strong>{fmt(selectedProject.quarterlyBilledAmount || 0)}</strong>
              </div>
            </div>
            
            {/* Visual Progress Bar */}
            <div style={{ 
              padding: '24px', 
              background: 'var(--surface-strong)', 
              borderRadius: 'var(--radius)', 
              border: '1px solid var(--line)',
              boxShadow: 'var(--shadow-soft)' 
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', color: 'var(--ink)' }}>
                <span style={{ fontWeight: '700' }}>Budget Utilization</span>
                <span style={{ fontWeight: '700' }}>{selectedProject.totalBudget > 0 ? Math.round(((selectedProject.consumedBudget || 0) / selectedProject.totalBudget) * 100) : 0}%</span>
              </div>
              <div style={{ width: '100%', height: '10px', background: 'var(--bg)', borderRadius: '6px', overflow: 'hidden' }}>
                <div style={{ 
                  width: `${selectedProject.totalBudget > 0 ? Math.min(100, ((selectedProject.consumedBudget || 0) / selectedProject.totalBudget) * 100) : 0}%`, 
                  height: '100%', 
                  background: 'var(--primary)', 
                  boxShadow: '0 0 10px rgba(99, 102, 241, 0.4)',
                  transition: 'width 0.4s ease' 
                }}></div>
              </div>
            </div>
          </section>

          {/* Add Request Card */}
          <section className="project-card add-project-card">
            <div className="project-card-title" style={{ borderBottom: '1px solid var(--line)', paddingBottom: '12px', marginBottom: '18px' }}>
              <Plus size={20} className="project-title-icon" />
              <h3 style={{ margin: 0 }}>Add Project Request</h3>
            </div>
            <form className="project-form" onSubmit={submit}>
              <label className="project-field">
                <span>Request Name</span>
                <input required value={form.requestName} onChange={e => setForm({...form, requestName: e.target.value})} placeholder="e.g. Staples Spring Emailer" />
              </label>
              <label className="project-field">
                <span>Type</span>
                <input required value={form.requestType} onChange={e => setForm({...form, requestType: e.target.value})} placeholder="e.g. Emailer, Banner" />
              </label>
              <label className="project-field">
                <span>Quoted Amount</span>
                <input type="number" min="0" step="0.01" required value={form.quotedAmount} onChange={e => setForm({...form, quotedAmount: e.target.value})} placeholder="e.g. 200" />
              </label>
              <label className="project-field">
                <span>Date</span>
                <input type="date" required value={form.createdDate} onChange={e => setForm({...form, createdDate: e.target.value})} />
              </label>
              <label className="project-field">
                <span>Quarter</span>
                <CustomSelect
                  value={form.quarter}
                  onChange={(val) => setForm({...form, quarter: val})}
                  options={['Q1', 'Q2', 'Q3', 'Q4']}
                  placeholder="Select Quarter"
                />
              </label>
              <button className="project-submit" type="submit" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={16} />
                <span>Add Request</span>
              </button>
            </form>
          </section>

          {/* Requests List Card */}
          <section className="project-card">
            <div className="project-list-head" style={{ borderBottom: '1px solid var(--line)', paddingBottom: '16px', marginBottom: '16px' }}>
              <div className="project-card-title">
                <FileText size={20} className="project-title-icon" />
                <h3 style={{ margin: 0 }}>Project Requests List</h3>
              </div>
            </div>
            <div className="project-table-wrap">
              <table className="project-table">
                <thead>
                  <tr>
                    <th>Request Name</th>
                    <th>Type</th>
                    <th>Date</th>
                    <th>Quote</th>
                    <th>Quarter</th>
                    <th>Billing Status</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map(req => {
                    const isEditing = editingReqId === req._id;
                    return (
                      <tr key={req._id}>
                        <td>
                          {isEditing ? <input value={editForm.requestName} onChange={(e) => setEditForm({ ...editForm, requestName: e.target.value })} /> : <strong>{req.requestName}</strong>}
                        </td>
                        <td>
                          {isEditing ? <input value={editForm.requestType} onChange={(e) => setEditForm({ ...editForm, requestType: e.target.value })} /> : req.requestType}
                        </td>
                        <td>
                          {isEditing ? <input type="date" value={editForm.createdDate} onChange={(e) => setEditForm({ ...editForm, createdDate: e.target.value })} /> : new Date(req.createdDate).toLocaleDateString()}
                        </td>
                        <td>
                          {isEditing ? <input type="number" min="0" step="0.01" value={editForm.quotedAmount} onChange={(e) => setEditForm({ ...editForm, quotedAmount: e.target.value })} /> : fmt(req.quotedAmount)}
                        </td>
                        <td>
                          {isEditing ? (
                            <CustomSelect
                              value={editForm.quarter}
                              onChange={(val) => setEditForm({ ...editForm, quarter: val })}
                              options={['Q1', 'Q2', 'Q3', 'Q4']}
                              placeholder="Select Quarter"
                              style={{ minWidth: '100px' }}
                            />
                          ) : req.quarter}
                        </td>
                        <td>
                          <span className={`status-badge ${req.billingStatus.toLowerCase() === 'billed' ? 'in-progress' : 'on-hold'}`}>{req.billingStatus}</span>
                        </td>
                        <td>
                          <div className="project-actions" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            {isEditing ? (
                              <>
                                <button className="secondary icon-button" type="button" onClick={() => saveEdit(req._id)} title="Save request">
                                  <Check size={14} />
                                </button>
                                <button className="secondary icon-button" type="button" onClick={() => setEditingReqId('')} title="Cancel">
                                  <X size={14} />
                                </button>
                              </>
                            ) : (
                              <>
                                <button type="button" className="secondary" style={{ fontSize: '11px', minHeight: '32px', borderRadius: '6px' }} onClick={() => toggleBillingStatus(req)}>
                                  Mark {req.billingStatus === 'Pending' ? 'Billed' : 'Pending'}
                                </button>
                                <button className="secondary icon-button" type="button" onClick={() => startEdit(req)} title="Edit request">
                                  <Edit2 size={14} />
                                </button>
                                <button className="danger icon-button" type="button" onClick={() => deleteRequest(req._id)} title="Delete request">
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {requests.length === 0 && (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: 'var(--muted)' }}>No requests added yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

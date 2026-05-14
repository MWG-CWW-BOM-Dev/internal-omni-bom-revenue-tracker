import React, { useEffect, useState } from 'react';

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
    <div>
      <section className="project-card">
        <div className="project-card-title">
          <h3>Select Project for Budget Tracking</h3>
        </div>
        <div style={{ padding: '24px' }}>
          <select value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)} style={{ padding: '10px', width: '100%', maxWidth: '400px', borderRadius: '4px' }}>
            <option value="">-- Select a Project --</option>
            {projects.filter(p => p.totalBudget > 0 || p.consumedBudget > 0).map(p => (
              <option key={p._id} value={p._id}>{p.name}</option>
            ))}
          </select>
        </div>
      </section>

      {selectedProject && (
        <>
          <section className="dashboard-strip" style={{ marginTop: '24px' }}>
            <div className="metrics">
              <div className="metric-card">
                <span>Total Budget</span>
                <strong>{fmt(selectedProject.totalBudget || 0)}</strong>
              </div>
              <div className="metric-card revenue-card">
                <span>Consumed Budget</span>
                <strong>{fmt(selectedProject.consumedBudget || 0)}</strong>
              </div>
              <div className="metric-card">
                <span className="metric-icon green">B</span>
                <span>Remaining Budget</span>
                <strong>{fmt(selectedProject.remainingBudget || 0)}</strong>
              </div>
              <div className="metric-card">
                <span>Quarterly Billed</span>
                <strong>{fmt(selectedProject.quarterlyBilledAmount || 0)}</strong>
              </div>
            </div>
            
            <div style={{ padding: '24px', background: 'white', borderRadius: '16px', marginTop: '24px', boxShadow: 'var(--shadow-soft)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontWeight: 'bold' }}>Budget Usage</span>
                <span>{selectedProject.totalBudget > 0 ? Math.round(((selectedProject.consumedBudget || 0) / selectedProject.totalBudget) * 100) : 0}%</span>
              </div>
              <div style={{ width: '100%', height: '12px', background: '#eef4ff', borderRadius: '6px', overflow: 'hidden' }}>
                <div style={{ width: `${selectedProject.totalBudget > 0 ? Math.min(100, ((selectedProject.consumedBudget || 0) / selectedProject.totalBudget) * 100) : 0}%`, height: '100%', background: '#5b4aff', transition: 'width 0.3s ease' }}></div>
              </div>
            </div>
          </section>

          <section className="project-card add-project-card" style={{ marginTop: '24px' }}>
            <div className="project-card-title">
              <span className="project-title-icon">+</span>
              <h3>Add Project Request</h3>
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
                <select value={form.quarter} onChange={e => setForm({...form, quarter: e.target.value})}>
                  <option value="Q1">Q1</option>
                  <option value="Q2">Q2</option>
                  <option value="Q3">Q3</option>
                  <option value="Q4">Q4</option>
                </select>
              </label>
              <button className="project-submit" type="submit">Add Request</button>
            </form>
          </section>

          <section className="project-card" style={{ marginTop: '24px' }}>
            <div className="project-list-head">
              <div className="project-card-title">
                <span className="project-title-icon">R</span>
                <h3>Project Requests</h3>
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
                    <th>Action</th>
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
                            <select value={editForm.quarter} onChange={(e) => setEditForm({ ...editForm, quarter: e.target.value })}>
                              <option value="Q1">Q1</option>
                              <option value="Q2">Q2</option>
                              <option value="Q3">Q3</option>
                              <option value="Q4">Q4</option>
                            </select>
                          ) : req.quarter}
                        </td>
                        <td>
                          <span className={`status-badge ${req.billingStatus.toLowerCase()}`}>{req.billingStatus}</span>
                        </td>
                        <td>
                          <div className="project-actions" style={{ display: 'flex', gap: '8px' }}>
                            {isEditing ? (
                              <>
                                <button type="button" onClick={() => saveEdit(req._id)}>Save</button>
                                <button className="secondary" type="button" onClick={() => setEditingReqId('')}>Cancel</button>
                              </>
                            ) : (
                              <>
                                <button type="button" className="secondary" onClick={() => toggleBillingStatus(req)}>
                                  Mark {req.billingStatus === 'Pending' ? 'Billed' : 'Pending'}
                                </button>
                                <button className="secondary icon-button" type="button" onClick={() => startEdit(req)}>E</button>
                                <button className="danger icon-button" type="button" onClick={() => deleteRequest(req._id)}>D</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {requests.length === 0 && (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '24px' }}>No requests added yet.</td>
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

import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { Shield, Trash2, Edit2, Plus, X } from 'lucide-react';

const ALL_PAGES = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'timesheet', label: 'Timesheet' },
  { id: 'markets', label: 'Markets' },
  { id: 'brands', label: 'Brands' },
  { id: 'projects', label: 'Projects' },
  { id: 'budget', label: 'Budget Tracker' },
  { id: 'resources', label: 'Resources' },
  { id: 'reports', label: 'Reports' },
  { id: 'settings', label: 'Settings' }
];

export default function UserManagement({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'user',
    permissions: []
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await api.list('/auth/users');
      setUsers(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({ username: '', password: '', role: 'user', permissions: [] });
    setIsModalOpen(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setFormData({ 
      username: user.username, 
      password: '', // Blank password unless changing
      role: user.role, 
      permissions: user.permissions || [] 
    });
    setIsModalOpen(true);
  };

  const handlePermissionToggle = (pageId) => {
    setFormData(prev => {
      const perms = prev.permissions.includes(pageId)
        ? prev.permissions.filter(p => p !== pageId)
        : [...prev.permissions, pageId];
      return { ...prev, permissions: perms };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData };
      if (editingUser && !payload.password) {
        delete payload.password; // Don't send empty password if editing
      }

      if (editingUser) {
        await api.update('/auth/users', editingUser._id, payload);
      } else {
        await api.create('/auth/users', payload);
      }
      
      setIsModalOpen(false);
      loadUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await api.remove('/auth/users', id);
      loadUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="page-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3>Manage Users</h3>
        <button className="primary" onClick={openCreateModal}>
          <Plus size={16} /> Add User
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Username</th>
              <th>Role</th>
              <th>Permissions</th>
              <th>Created At</th>
              <th style={{ width: '100px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user._id}>
                <td style={{ fontWeight: 500 }}>{user.username}</td>
                <td>
                  <span className={`badge ${user.role === 'superadmin' ? 'blue' : 'gray'}`}>
                    {user.role}
                  </span>
                </td>
                <td>
                  {user.role === 'superadmin' ? (
                    <span style={{ color: 'var(--muted)', fontSize: '13px' }}>All Access</span>
                  ) : (
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {user.permissions.length === 0 ? <span style={{ color: 'var(--muted)', fontSize: '13px' }}>None</span> : 
                        user.permissions.map(p => (
                          <span key={p} className="badge gray" style={{ fontSize: '11px', padding: '2px 6px' }}>
                            {ALL_PAGES.find(page => page.id === p)?.label || p}
                          </span>
                        ))
                      }
                    </div>
                  )}
                </td>
                <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                <td>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="icon-button secondary" onClick={() => openEditModal(user)} title="Edit User">
                      <Edit2 size={14} />
                    </button>
                    {user._id !== currentUser.id && (
                      <button className="icon-button danger" onClick={() => handleDelete(user._id)} title="Delete User">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)' }}>
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>{editingUser ? 'Edit User' : 'Create New User'}</h3>
              <button className="icon-button" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Username</label>
                <input 
                  type="text" 
                  value={formData.username}
                  onChange={e => setFormData({...formData, username: e.target.value})}
                  required 
                />
              </div>
              
              <div className="form-group">
                <label>Password {editingUser && '(Leave blank to keep current)'}</label>
                <input 
                  type="password" 
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  required={!editingUser}
                  placeholder={editingUser ? '••••••••' : 'Enter password'}
                />
              </div>

              <div className="form-group">
                <label>Role</label>
                <select 
                  value={formData.role} 
                  onChange={e => setFormData({...formData, role: e.target.value})}
                >
                  <option value="user">User</option>
                  <option value="superadmin">Super Admin</option>
                </select>
              </div>

              {formData.role === 'user' && (
                <div className="form-group">
                  <label>Page Permissions</label>
                  <div className="permissions-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
                    {ALL_PAGES.map(page => (
                      <label key={page.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
                        <input 
                          type="checkbox"
                          checked={formData.permissions.includes(page.id)}
                          onChange={() => handlePermissionToggle(page.id)}
                          style={{ width: '16px', height: '16px', margin: 0 }}
                        />
                        {page.label}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" className="secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="primary">{editingUser ? 'Save Changes' : 'Create User'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { Shield, Trash2, Edit2, Plus, X, Key, Eye, EyeOff, Copy, Check, RefreshCw } from 'lucide-react';

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
  const [successMessage, setSuccessMessage] = useState('');

  // Create / Edit User Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'user',
    permissions: []
  });
  const [showFormPassword, setShowFormPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);

  // Dedicated Change Password Modal State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordUser, setPasswordUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showModalCurrentPassword, setShowModalCurrentPassword] = useState(false);
  const [passwordModalSuccess, setPasswordModalSuccess] = useState('');

  // Password Visibility & Copy States in Table
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [revealAll, setRevealAll] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

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
    setShowFormPassword(false);
    setError('');
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
    setShowFormPassword(false);
    setShowCurrentPassword(false);
    setError('');
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
        showFlashMessage(`User "${payload.username}" updated successfully`);
      } else {
        await api.create('/auth/users', payload);
        showFlashMessage(`User "${payload.username}" created successfully`);
      }
      
      setIsModalOpen(false);
      loadUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    const targetUser = users.find(u => u._id === id);
    if (!window.confirm(`Are you sure you want to delete user "${targetUser?.username || id}"?`)) return;
    try {
      await api.remove('/auth/users', id);
      showFlashMessage('User deleted successfully');
      loadUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  // Quick Password Change Modal
  const openPasswordModal = (user) => {
    setPasswordUser(user);
    setNewPassword('');
    setShowNewPassword(false);
    setShowModalCurrentPassword(false);
    setPasswordModalSuccess('');
    setError('');
    setIsPasswordModalOpen(true);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!newPassword) return;
    try {
      await api.update('/auth/users', passwordUser._id, { password: newPassword });
      setPasswordModalSuccess(`Password updated successfully for ${passwordUser.username}`);
      setTimeout(() => {
        setIsPasswordModalOpen(false);
        setPasswordModalSuccess('');
        showFlashMessage(`Password updated for "${passwordUser.username}"`);
      }, 900);
      loadUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const showFlashMessage = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  // Copy password helper
  const copyPassword = (id, pwd) => {
    if (!pwd) return;
    navigator.clipboard.writeText(pwd);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  // Toggle individual row password visibility
  const togglePasswordVisibility = (userId) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  // Toggle reveal all passwords in table
  const handleToggleRevealAll = () => {
    const nextState = !revealAll;
    setRevealAll(nextState);
    const updated = {};
    users.forEach(u => {
      updated[u._id] = nextState;
    });
    setVisiblePasswords(updated);
  };

  // Random strong password generator
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    let res = '';
    for (let i = 0; i < 10; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  };

  return (
    <div className="page-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ margin: '0 0 4px 0' }}>Manage Users</h3>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: '13px' }}>
            View, manage, and change credentials and access permissions for all users.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button 
            type="button" 
            className="secondary" 
            onClick={handleToggleRevealAll}
            title={revealAll ? "Mask all passwords" : "Show all passwords"}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {revealAll ? <EyeOff size={15} /> : <Eye size={15} />}
            <span>{revealAll ? 'Hide Passwords' : 'Show Passwords'}</span>
          </button>
          <button className="primary" onClick={openCreateModal} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={16} /> Add User
          </button>
        </div>
      </div>

      {error && <div className="error" style={{ marginBottom: '16px' }}>{error}</div>}
      {successMessage && (
        <div style={{ marginBottom: '16px', padding: '10px 14px', background: '#dcfce7', color: '#166534', borderRadius: '8px', border: '1px solid #bbf7d0', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Check size={16} />
          <span>{successMessage}</span>
        </div>
      )}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Username</th>
              <th>Password</th>
              <th>Role</th>
              <th>Permissions</th>
              <th>Created At</th>
              <th style={{ width: '130px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => {
              const isRevealed = revealAll || Boolean(visiblePasswords[user._id]);
              return (
                <tr key={user._id}>
                  <td style={{ fontWeight: 600 }}>{user.username}</td>
                  <td>
                    {user.plainPassword ? (
                      <div style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '8px', 
                        background: 'var(--surface, #f8fafc)', 
                        padding: '4px 8px', 
                        borderRadius: '6px', 
                        border: '1px solid var(--line, #e2e8f0)' 
                      }}>
                        <span style={{ 
                          fontFamily: isRevealed ? 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' : 'inherit', 
                          fontSize: '13px', 
                          fontWeight: isRevealed ? 600 : 400,
                          color: isRevealed ? 'var(--ink)' : 'var(--muted)',
                          letterSpacing: isRevealed ? 'normal' : '0.1em'
                        }}>
                          {isRevealed ? user.plainPassword : '••••••••'}
                        </span>
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility(user._id)}
                          title={isRevealed ? "Hide password" : "Show password"}
                          style={{ 
                            background: 'none', 
                            border: 'none', 
                            padding: '2px', 
                            cursor: 'pointer', 
                            display: 'flex', 
                            alignItems: 'center', 
                            color: 'var(--muted)',
                            borderRadius: '4px'
                          }}
                        >
                          {isRevealed ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        <button
                          type="button"
                          onClick={() => copyPassword(user._id, user.plainPassword)}
                          title="Copy password"
                          style={{ 
                            background: 'none', 
                            border: 'none', 
                            padding: '2px', 
                            cursor: 'pointer', 
                            display: 'flex', 
                            alignItems: 'center', 
                            color: copiedId === user._id ? '#16a34a' : 'var(--muted)',
                            borderRadius: '4px'
                          }}
                        >
                          {copiedId === user._id ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: 'var(--muted)', fontSize: '12px', fontStyle: 'italic' }}>Not stored</span>
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => openPasswordModal(user)}
                          style={{ fontSize: '11px', padding: '2px 8px', height: 'auto', minHeight: '24px' }}
                        >
                          Set Password
                        </button>
                      </div>
                    )}
                  </td>
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
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button 
                        className="icon-button secondary" 
                        onClick={() => openPasswordModal(user)} 
                        title="Change / Manage Password"
                        style={{ width: '32px', height: '32px', minHeight: '32px' }}
                      >
                        <Key size={14} />
                      </button>
                      <button 
                        className="icon-button secondary" 
                        onClick={() => openEditModal(user)} 
                        title="Edit User"
                        style={{ width: '32px', height: '32px', minHeight: '32px' }}
                      >
                        <Edit2 size={14} />
                      </button>
                      {user._id !== currentUser.id && (
                        <button 
                          className="icon-button danger" 
                          onClick={() => handleDelete(user._id)} 
                          title="Delete User"
                          style={{ width: '32px', height: '32px', minHeight: '32px' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {users.length === 0 && (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)' }}>
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* CREATE / EDIT USER MODAL */}
      {isModalOpen && (
        <div className="modal-backdrop" role="presentation" onClick={() => setIsModalOpen(false)}>
          <div className="modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>{editingUser ? 'Edit User' : 'Create New User'}</h3>
              <button className="icon-button secondary" type="button" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Username</label>
                <input 
                  type="text" 
                  value={formData.username}
                  onChange={e => setFormData({...formData, username: e.target.value})}
                  required 
                  placeholder="e.g. john.doe"
                  style={{ width: '100%' }}
                />
              </div>

              {/* Display current password when editing if available */}
              {editingUser && editingUser.plainPassword && (
                <div style={{ 
                  marginBottom: '16px', 
                  padding: '10px 14px', 
                  background: 'var(--bg, #f1f5f9)', 
                  borderRadius: '8px', 
                  border: '1px solid var(--line, #e2e8f0)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between' 
                }}>
                  <div>
                    <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--muted)', display: 'block', fontWeight: 700 }}>
                      Current Password
                    </span>
                    <strong style={{ 
                      fontFamily: showCurrentPassword ? 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' : 'inherit', 
                      fontSize: '14px', 
                      color: 'var(--ink)' 
                    }}>
                      {showCurrentPassword ? editingUser.plainPassword : '••••••••'}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      className="icon-button secondary"
                      style={{ width: '32px', height: '32px', minHeight: '32px' }}
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      title={showCurrentPassword ? "Hide password" : "Show password"}
                    >
                      {showCurrentPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button
                      type="button"
                      className="icon-button secondary"
                      style={{ width: '32px', height: '32px', minHeight: '32px' }}
                      onClick={() => copyPassword(editingUser._id, editingUser.plainPassword)}
                      title="Copy password"
                    >
                      {copiedId === editingUser._id ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              )}
              
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600 }}>
                    {editingUser ? 'New Password (leave blank to keep current)' : 'Password'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, password: generateRandomPassword() })}
                    style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '12px', fontWeight: 600, padding: 0 }}
                  >
                    Generate Random
                  </button>
                </div>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input 
                    type={showFormPassword ? 'text' : 'password'} 
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    required={!editingUser}
                    placeholder={editingUser ? 'Enter new password or leave blank' : 'Enter password'}
                    style={{ paddingRight: '42px', width: '100%' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowFormPassword(!showFormPassword)}
                    title={showFormPassword ? "Hide password" : "Show password"}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--muted)',
                      display: 'flex',
                      alignItems: 'center',
                      padding: 0
                    }}
                  >
                    {showFormPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Role</label>
                <select 
                  value={formData.role} 
                  onChange={e => setFormData({...formData, role: e.target.value})}
                  style={{ width: '100%' }}
                >
                  <option value="user">User</option>
                  <option value="superadmin">Super Admin</option>
                </select>
              </div>

              {formData.role === 'user' && (
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>Page Permissions</label>
                  <div className="permissions-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', padding: '10px', background: 'var(--bg, #f8fafc)', borderRadius: '8px', border: '1px solid var(--line, #e2e8f0)' }}>
                    {ALL_PAGES.map(page => (
                      <label key={page.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
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

      {/* DEDICATED QUICK CHANGE PASSWORD MODAL */}
      {isPasswordModalOpen && passwordUser && (
        <div className="modal-backdrop" role="presentation" onClick={() => setIsPasswordModalOpen(false)}>
          <div className="modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Key size={18} style={{ color: 'var(--primary)' }} />
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>Manage Password</h3>
              </div>
              <button className="icon-button secondary" type="button" onClick={() => setIsPasswordModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handlePasswordSubmit}>
              <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '13px', color: 'var(--muted)' }}>Account:</span>
                <strong style={{ fontSize: '14px', color: 'var(--ink)' }}>{passwordUser.username}</strong>
                <span className={`badge ${passwordUser.role === 'superadmin' ? 'blue' : 'gray'}`} style={{ marginLeft: 'auto', fontSize: '11px' }}>
                  {passwordUser.role}
                </span>
              </div>

              {passwordUser.plainPassword && (
                <div style={{ 
                  marginBottom: '16px', 
                  padding: '10px 14px', 
                  background: 'var(--bg, #f1f5f9)', 
                  borderRadius: '8px', 
                  border: '1px solid var(--line, #e2e8f0)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between' 
                }}>
                  <div>
                    <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--muted)', display: 'block', fontWeight: 700 }}>
                      Current Password
                    </span>
                    <strong style={{ 
                      fontFamily: showModalCurrentPassword ? 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' : 'inherit', 
                      fontSize: '14px', 
                      color: 'var(--ink)' 
                    }}>
                      {showModalCurrentPassword ? passwordUser.plainPassword : '••••••••'}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      className="icon-button secondary"
                      style={{ width: '32px', height: '32px', minHeight: '32px' }}
                      onClick={() => setShowModalCurrentPassword(!showModalCurrentPassword)}
                      title={showModalCurrentPassword ? "Hide password" : "Show password"}
                    >
                      {showModalCurrentPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button
                      type="button"
                      className="icon-button secondary"
                      style={{ width: '32px', height: '32px', minHeight: '32px' }}
                      onClick={() => copyPassword(passwordUser._id, passwordUser.plainPassword)}
                      title="Copy password"
                    >
                      {copiedId === passwordUser._id ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              )}

              {passwordModalSuccess && (
                <div style={{ marginBottom: '16px', padding: '10px', background: '#dcfce7', color: '#166534', borderRadius: '6px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Check size={16} /> {passwordModalSuccess}
                </div>
              )}

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600 }}>New Password</label>
                  <button
                    type="button"
                    onClick={() => setNewPassword(generateRandomPassword())}
                    style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '12px', fontWeight: 600, padding: 0 }}
                  >
                    Generate Random
                  </button>
                </div>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                    placeholder="Enter new password"
                    style={{ paddingRight: '42px', width: '100%' }}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    title={showNewPassword ? "Hide password" : "Show password"}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--muted)',
                      display: 'flex',
                      alignItems: 'center',
                      padding: 0
                    }}
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" className="secondary" onClick={() => setIsPasswordModalOpen(false)}>Cancel</button>
                <button type="submit" className="primary">Update Password</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

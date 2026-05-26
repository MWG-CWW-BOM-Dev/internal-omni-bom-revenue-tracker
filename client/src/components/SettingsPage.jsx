import React, { useState } from 'react';
import { Sun, Moon, Monitor, Sliders, Shield, Bell, Target, Save, CheckCircle } from 'lucide-react';

export default function SettingsPage({ theme, setTheme, ippBudget, setIppBudget }) {
  const [activeTab, setActiveTab] = useState('general'); // 'general' or 'ipp'
  const [localBudget, setLocalBudget] = useState(ippBudget);
  const [isSaved, setIsSaved] = useState(false);

  const handleSaveBudget = (e) => {
    e.preventDefault();
    setIppBudget(Number(localBudget || 0));
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const themes = [
    {
      value: 'light',
      label: 'Light Mode',
      desc: 'Clean and bright modern aesthetic for high-contrast visibility.',
      icon: <Sun className="theme-card-icon text-yellow-500" />
    },
    {
      value: 'dark',
      label: 'Dark Mode',
      desc: 'Sleek, premium futuristic slate theme designed for reduced eye strain.',
      icon: <Moon className="theme-card-icon text-indigo-400" />
    },
    {
      value: 'system',
      label: 'System Preference',
      desc: 'Automatically sync with your operating system light and dark settings.',
      icon: <Monitor className="theme-card-icon text-slate-400" />
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', maxWidth: '800px', margin: '0 auto' }}>
      
      {/* Segment Tabs Selector */}
      <div className="segment-tabs" style={{ alignSelf: 'flex-start' }}>
        <button 
          type="button" 
          className={`segment-tab-btn ${activeTab === 'general' ? 'active' : ''}`}
          onClick={() => setActiveTab('general')}
        >
          General Preferences
        </button>
        <button 
          type="button" 
          className={`segment-tab-btn ${activeTab === 'ipp' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('ipp');
            setLocalBudget(ippBudget);
          }}
        >
          IPP Budget Setup
        </button>
      </div>

      {activeTab === 'general' ? (
        <>
          {/* Settings Grid Panel */}
          <section className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ borderBottom: '1px solid var(--line)', paddingBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Sliders style={{ color: 'var(--primary)', width: '22px', height: '22px' }} />
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>System Preferences</h3>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--muted)' }}>Manage your application layout, styling, and general settings.</p>
              </div>
            </div>

            {/* Appearance Section */}
            <div>
              <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--primary)' }}>Appearance Theme</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                {themes.map((t) => {
                  const isActive = theme === t.value;
                  return (
                    <div
                      key={t.value}
                      onClick={() => setTheme(t.value)}
                      style={{
                        border: isActive ? '2px solid var(--primary)' : '1px solid var(--line)',
                        background: isActive ? 'var(--primary-soft)' : 'var(--surface-strong)',
                        borderRadius: 'var(--radius)',
                        padding: '20px',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '14px',
                        boxShadow: isActive ? 'var(--shadow)' : 'var(--shadow-soft)',
                        transform: isActive ? 'translateY(-2px)' : 'none',
                        transition: 'all 200ms ease',
                        position: 'relative'
                      }}
                      className="theme-select-card"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '8px',
                          background: isActive ? 'var(--surface-strong)' : 'var(--bg)',
                          display: 'grid',
                          placeItems: 'center',
                          boxShadow: 'var(--shadow-soft)'
                        }}>
                          {t.icon}
                        </div>
                        {isActive && (
                          <span style={{
                            fontSize: '10px',
                            background: 'var(--primary)',
                            color: 'white',
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontWeight: '700',
                            textTransform: 'uppercase'
                          }}>Active</span>
                        )}
                      </div>
                      <div>
                        <h5 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: '700', color: 'var(--ink)' }}>{t.label}</h5>
                        <p style={{ margin: 0, fontSize: '12px', color: 'var(--muted)', lineHeight: '1.4' }}>{t.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Security & Access Mock Block */}
          <section className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Shield style={{ color: 'var(--primary)', width: '20px', height: '20px' }} />
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700' }}>Security &amp; Permissions</h3>
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>
              Only administrators can modify default market hourly rates. Current user role: <strong>Manager</strong> (Full Write Access).
            </p>
          </section>

          {/* Notification Preferences Mock Block */}
          <section className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Bell style={{ color: 'var(--primary)', width: '20px', height: '20px' }} />
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700' }}>Application Alerts</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', color: 'var(--ink)' }}>
                <input type="checkbox" defaultChecked style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }} />
                Notify when project budget usage exceeds 80%
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', color: 'var(--ink)' }}>
                <input type="checkbox" defaultChecked style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }} />
                Email weekly timesheet missing summaries to team leads
              </label>
            </div>
          </section>
        </>
      ) : (
        /* IPP Budget Setup Panel */
        <section className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ borderBottom: '1px solid var(--line)', paddingBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Target style={{ color: 'var(--primary)', width: '22px', height: '22px' }} />
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>IPP (Initial Project Plan) Budget Setup</h3>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--muted)' }}>Configure your annual budget targets and business planning parameters.</p>
            </div>
          </div>

          <form onSubmit={handleSaveBudget} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--ink)' }}>IPP Annual Budget Target (USD)</label>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'stretch', maxWidth: '400px', position: 'relative' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: '14px', fontWeight: '700' }}>$</span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    placeholder="e.g. 100000"
                    value={localBudget}
                    onChange={(e) => setLocalBudget(e.target.value)}
                    style={{
                      paddingLeft: '28px',
                      width: '100%',
                      minHeight: '40px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--surface)',
                      border: '1px solid var(--line)',
                      color: 'var(--ink)',
                      fontWeight: '600'
                    }}
                  />
                </div>
                <button
                  type="submit"
                  style={{
                    minHeight: '40px',
                    padding: '0 20px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--primary)',
                    color: 'white',
                    fontWeight: '700',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: 'var(--shadow)',
                    transition: 'all 200ms ease'
                  }}
                >
                  <Save size={16} />
                  <span>Save</span>
                </button>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                Please specify the target budget in USD ($). This value represents the annual goal for your Adhoc projects' revenue and will be used directly inside your visual analytics dashboard.
              </p>
            </div>

            {isSaved && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 16px',
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                color: '#10b981',
                fontSize: '13px',
                fontWeight: '600',
                maxWidth: '400px'
              }}>
                <CheckCircle size={16} />
                <span>IPP budget target saved successfully!</span>
              </div>
            )}
          </form>
        </section>
      )}
      
    </div>
  );
}

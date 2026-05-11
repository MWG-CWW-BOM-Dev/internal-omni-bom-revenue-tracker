import React, { useState } from 'react';

export default function TimesheetForm({ resources, projects, timesheets, dates, onCreate, onUpdate, onDelete, currencyConfig = { rate: 1, symbol: '$', code: 'USD' } }) {
  const [search, setSearch] = useState('');
  const [selectedCell, setSelectedCell] = useState(null);
  const [form, setForm] = useState({ projectId: '', hoursWorked: '' });
  const filteredResources = resources.filter((resource) =>
    `${resource.name} ${resource.designation || ''}`.toLowerCase().includes(search.toLowerCase())
  );

  function openCell(resource, date, entry = null) {
    if (entry) {
      setSelectedCell({ resource, date, entryId: entry._id });
      setForm({ projectId: entry.projectId?._id || entry.projectId, hoursWorked: entry.hoursWorked });
    } else {
      setSelectedCell({ resource, date });
      setForm({ projectId: '', hoursWorked: '' });
    }
  }

  async function submit(event) {
    event.preventDefault();
    const payload = {
      date: selectedCell.date,
      resourceId: selectedCell.resource._id,
      projectId: form.projectId,
      hoursWorked: form.hoursWorked
    };
    if (selectedCell.entryId) {
      await onUpdate(selectedCell.entryId, payload);
    } else {
      await onCreate(payload);
    }
    setSelectedCell(null);
    setForm({ projectId: '', hoursWorked: '' });
  }

  return (
    <section className="panel scheduler-panel">
      <div className="scheduler" style={{ gridTemplateColumns: `224px repeat(${Math.max(dates.length, 1)}, minmax(126px, 1fr))` }}>
        <div className="scheduler-head resource-head">
          <input
            className="scheduler-search"
            placeholder="Search resource..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        {dates.map((date) => (
          <div className={date === dates[0] ? 'scheduler-head date-head active-date' : 'scheduler-head date-head'} key={date}>
            <span>{weekday(date)}</span>
            <strong>{day(date)}</strong>
          </div>
        ))}

        {filteredResources.map((resource) => (
          <React.Fragment key={resource._id}>
            <div className="resource-card">
              <Avatar resource={resource} />
              <div>
                <strong>{resource.name}</strong>
                <span>{resource.designation || 'Resource'}</span>
                <small>{currencyConfig.symbol}{Number((displayRate(resource, projects) || 0) * currencyConfig.rate).toLocaleString(currencyConfig.locale || undefined, { maximumFractionDigits: 0 })} / hr</small>
              </div>
            </div>
            {dates.map((date) => {
              const entries = entriesFor(timesheets, resource._id, date);
              return (
                <div className="schedule-cell" key={`${resource._id}-${date}`} role="button" tabIndex={0} onClick={() => openCell(resource, date)}>
                  {entries.map((entry) => (
                    <span className={`time-block ${colorClass(entry.projectId?.name)}`} key={entry._id} onClick={(event) => { event.stopPropagation(); openCell(resource, date, entry); }}>
                      <div className="custom-tooltip">
                        Project: {entry.projectId?.name}<br />
                        Hours: {entry.hoursWorked}h/day
                      </div>
                      <button
                        className="delete-time"
                        type="button"
                        aria-label="Delete timesheet entry"
                        onClick={(event) => {
                          event.stopPropagation();
                          onDelete(entry._id);
                        }}
                      >
                        X
                      </button>
                      <strong>{entry.projectId?.name}</strong>
                      <small>{entry.hoursWorked}h per day</small>
                    </span>
                  ))}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>

      {selectedCell && (
        <div className="modal-backdrop" role="presentation" onClick={() => setSelectedCell(null)}>
          <div className="modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="section-head">
              <div>
                <span className="eyebrow">{formatDate(selectedCell.date)}</span>
                <h2>{selectedCell.entryId ? 'Edit Time' : 'Add Time'}</h2>
                <p>{selectedCell.resource.name}</p>
              </div>
              <button className="secondary icon-button" type="button" onClick={() => setSelectedCell(null)}>
                X
              </button>
            </div>

            <form className="modal-form" onSubmit={submit}>
              <select required value={form.projectId} onChange={(event) => setForm({ ...form, projectId: event.target.value })}>
                <option value="">Project</option>
                {projects.map((project) => (
                  <option key={project._id} value={project._id}>
                    {project.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="0"
                step="0.25"
                placeholder="Hours worked"
                value={form.hoursWorked}
                required
                onChange={(event) => setForm({ ...form, hoursWorked: event.target.value })}
              />
              <button type="submit">Save Time</button>
            </form>
          </div>
        </div>
      )}
      <div className="scheduler-legend">
        {['Design', 'Copywriting', 'Development', 'Marketing', 'UX', 'Project Management', 'Content', 'Other', 'Time Off'].map((label) => (
          <span key={label}>
            <i className={`legend-dot ${legendClass(label)}`} />
            {label}
          </span>
        ))}
      </div>
    </section>
  );
}

function Avatar({ resource }) {
  const [hasImageError, setHasImageError] = useState(false);
  const initials = resource.name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  if (resource.photoUrl && !hasImageError) {
    return <img className="avatar" src={resource.photoUrl} alt={resource.name} onError={() => setHasImageError(true)} />;
  }

  return <span className="avatar fallback-avatar">{initials}</span>;
}

function entriesFor(timesheets, resourceId, date) {
  return timesheets.filter((entry) => entry.resourceId?._id === resourceId && entry.date.slice(0, 10) === date);
}

function weekday(date) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short' });
}

function day(date) {
  const d = new Date(`${date}T00:00:00`);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function formatDate(date) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

function colorClass(value = '') {
  const classes = ['design', 'copy', 'dev', 'marketing', 'ux', 'pm', 'content', 'other'];
  const index = value.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % classes.length;
  return classes[index];
}

function legendClass(label) {
  return label.toLowerCase().replaceAll(' ', '-');
}

function displayRate(resource, projects) {
  const marketId = projects[0]?.marketId?._id || projects[0]?.marketId;
  const marketRate = resource.marketRates?.find((rate) => {
    const rateMarketId = rate.marketId?._id || rate.marketId;
    return marketId && rateMarketId === marketId;
  });
  return marketRate?.hourlyRate ?? resource.hourlyRate;
}

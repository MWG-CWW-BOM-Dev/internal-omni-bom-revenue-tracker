import React, { useState } from 'react';
import CustomSelect from './CustomSelect.jsx';
import { Search, X, Loader2 } from 'lucide-react';


export default function TimesheetForm({ resources, projects, timesheets, dates, onCreate, onUpdate, onDelete, currencyConfig = { rate: 1, symbol: '$', code: 'USD' } }) {
  const [search, setSearch] = useState('');
  const [selectedCell, setSelectedCell] = useState(null);
  const [form, setForm] = useState({ projectId: '', leaveType: '', hoursWorked: '', comments: '' });
  const [dragContext, setDragContext] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredResources = resources.filter((resource) =>
    `${resource.name} ${resource.designation || ''}`.toLowerCase().includes(search.toLowerCase())
  );

  function openCell(resource, date, entry = null) {
    setIsSubmitting(false);
    if (entry) {
      setSelectedCell({ resource, date, entryId: entry._id });
      setForm({ projectId: entry.projectId?._id || entry.projectId || '', leaveType: entry.leaveType || '', hoursWorked: entry.hoursWorked, comments: entry.comments || '' });
    } else {
      setSelectedCell({ resource, date });
      setForm({ projectId: '', leaveType: '', hoursWorked: '', comments: '' });
    }
  }

  async function submit(event) {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const payload = {
        date: selectedCell.date,
        resourceId: selectedCell.resource._id,
        projectId: form.projectId || undefined,
        leaveType: form.leaveType || undefined,
        hoursWorked: form.hoursWorked,
        comments: form.comments
      };
      if (selectedCell.entryId) {
        await onUpdate(selectedCell.entryId, payload);
      } else {
        await onCreate(payload);
      }
      setSelectedCell(null);
      setForm({ projectId: '', leaveType: '', hoursWorked: '', comments: '' });
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleDragStart(e, entry, date, resourceId, direction = 'forward') {
    e.dataTransfer.effectAllowed = 'copy';
    // Create a tiny transparent image for the drag image so it doesn't show the whole block
    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(img, 0, 0);

    setDragContext({
      sourceEntry: entry,
      resourceId: resourceId,
      startIndex: dates.indexOf(date),
      currentHoverIndex: dates.indexOf(date),
      direction
    });
  }

  function handleDragOver(e, date, resourceId) {
    e.preventDefault(); // Necessary to allow dropping
    e.dataTransfer.dropEffect = 'copy';

    if (dragContext && dragContext.resourceId === resourceId) {
      const hoverIndex = dates.indexOf(date);
      if (hoverIndex !== -1 && hoverIndex !== dragContext.currentHoverIndex) {
        setDragContext({ ...dragContext, currentHoverIndex: hoverIndex });
      }
    }
  }

  async function handleDrop(e, date, resourceId) {
    e.preventDefault();
    if (!dragContext || dragContext.resourceId !== resourceId) {
      setDragContext(null);
      return;
    }

    const dropIndex = dates.indexOf(date);
    if (dropIndex === -1) {
      setDragContext(null);
      return;
    }

    let datesToFill = [];
    if (dropIndex > dragContext.startIndex) {
      // Dragged forward (to future dates)
      datesToFill = dates.slice(dragContext.startIndex + 1, dropIndex + 1);
    } else if (dropIndex < dragContext.startIndex) {
      // Dragged backward (to previous dates)
      datesToFill = dates.slice(dropIndex, dragContext.startIndex);
    }

    if (datesToFill.length > 0) {
      const payloads = datesToFill.map(d => ({
        date: d,
        resourceId: dragContext.resourceId,
        projectId: dragContext.sourceEntry.projectId?._id || dragContext.sourceEntry.projectId || undefined,
        leaveType: dragContext.sourceEntry.leaveType || undefined,
        hoursWorked: dragContext.sourceEntry.hoursWorked,
        comments: dragContext.sourceEntry.comments
      }));
      await onCreate(payloads);
    }
    setDragContext(null);
  }

  return (
    <section className="panel scheduler-panel">
      <div className="scheduler" style={{ gridTemplateColumns: `224px repeat(${Math.max(dates.length, 1)}, minmax(126px, 1fr))` }}>
        <div className="scheduler-head resource-head" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={14} style={{ position: 'absolute', left: '22px', color: 'var(--muted)', pointerEvents: 'none' }} />
          <input
            className="scheduler-search"
            placeholder="Search resource..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            style={{ paddingLeft: '32px' }}
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
                <small>{currencyConfig.symbol}{Number((displayRate(resource, projects) || 0) * currencyConfig.rate).toLocaleString(currencyConfig.locale || undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} / hr</small>
              </div>
            </div>
            {dates.map((date) => {
              const entries = entriesFor(timesheets, resource._id, date);
              const dateIndex = dates.indexOf(date);
              const isDragTarget = dragContext &&
                dragContext.resourceId === resource._id &&
                (
                  (dragContext.currentHoverIndex > dragContext.startIndex &&
                   dateIndex > dragContext.startIndex &&
                   dateIndex <= dragContext.currentHoverIndex) ||
                  (dragContext.currentHoverIndex < dragContext.startIndex &&
                   dateIndex >= dragContext.currentHoverIndex &&
                   dateIndex < dragContext.startIndex)
                );
              return (
                <div
                  className={`schedule-cell ${isDragTarget ? 'drag-target' : ''}`}
                  key={`${resource._id}-${date}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => openCell(resource, date)}
                  onDragOver={(e) => handleDragOver(e, date, resource._id)}
                  onDrop={(e) => handleDrop(e, date, resource._id)}
                  onDragEnter={(e) => e.preventDefault()}
                >
                  {entries.map((entry) => (
                    <span className={`time-block ${entry.leaveType ? 'time-off' : colorClass(entry.projectId?.name)}`} key={entry._id} onClick={(event) => { event.stopPropagation(); openCell(resource, date, entry); }}>
                      <div className="custom-tooltip">
                        {entry.leaveType ? `Leave: ${entry.leaveType}` : `${entry.projectId?.name}`}<br />
                        Hours: {entry.hoursWorked}h/day<br />
                        {entry.comments && <span>Comments: {entry.comments}</span>}
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
                        <X size={10} />
                      </button>
                      <strong>{entry.leaveType ? entry.leaveType : entry.projectId?.name}</strong>
                      <small>{entry.hoursWorked}h per day</small>
                      <div
                        className="drag-handle drag-handle-left"
                        draggable
                        onDragStart={(e) => { e.stopPropagation(); handleDragStart(e, entry, date, resource._id, 'backward'); }}
                        onDragEnd={() => setDragContext(null)}
                        onClick={(e) => e.stopPropagation()}
                        title="Drag left to copy to previous days"
                      />
                      <div
                        className="drag-handle drag-handle-right"
                        draggable
                        onDragStart={(e) => { e.stopPropagation(); handleDragStart(e, entry, date, resource._id, 'forward'); }}
                        onDragEnd={() => setDragContext(null)}
                        onClick={(e) => e.stopPropagation()}
                        title="Drag right to copy to next days"
                      />
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
              <button className="secondary icon-button" type="button" onClick={() => !isSubmitting && setSelectedCell(null)} disabled={isSubmitting}>
                <X size={16} />
              </button>
            </div>

            <form className="modal-form" onSubmit={submit}>
              <CustomSelect
                required
                value={form.leaveType || form.projectId}
                onChange={(val) => {
                  if (['TWT', 'SL', 'CL', 'PL'].includes(val)) {
                    setForm({ ...form, leaveType: val, projectId: '' });
                  } else {
                    setForm({ ...form, projectId: val, leaveType: '' });
                  }
                }}
                options={[
                  { value: '', label: 'Project / Leave Type' },
                  { value: 'TWT', label: 'Leave: TWT (Time Without Time)' },
                  { value: 'SL', label: 'Leave: SL (Sick Leave)' },
                  { value: 'CL', label: 'Leave: CL (Casual Leave)' },
                  { value: 'PL', label: 'Leave: PL (Privilege Leave)' },
                  ...projects.map((project) => ({ value: project._id, label: `${project.name}` }))
                ]}
                placeholder="Project / Leave Type"
              />
              <input
                type="number"
                min="0"
                step="0.25"
                placeholder="Hours worked"
                value={form.hoursWorked}
                required
                onChange={(event) => setForm({ ...form, hoursWorked: event.target.value })}
              />
              <textarea
                placeholder="Comments (optional)"
                value={form.comments}
                onChange={(event) => setForm({ ...form, comments: event.target.value })}
                rows="3"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--surface-strong)',
                  color: 'var(--ink)',
                  outline: 'none',
                  resize: 'vertical'
                }}
              ></textarea>
              <button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="spinner" />
                    <span>Saving Time...</span>
                  </>
                ) : (
                  <span>Save Time</span>
                )}
              </button>
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

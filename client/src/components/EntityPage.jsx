import React, { useState } from 'react';

export default function EntityPage({ title, fields, items, onCreate, onUpdate, onDelete }) {
  const initialForm = emptyForm(fields);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState('');
  const [editForm, setEditForm] = useState(initialForm);

  async function submit(event) {
    event.preventDefault();
    await onCreate(cleanPayload(form, fields));
    setForm(initialForm);
  }

  function startEdit(item) {
    setEditingId(item._id);
    setEditForm(itemToForm(item, fields));
  }

  async function saveEdit(id) {
    await onUpdate(id, cleanPayload(editForm, fields));
    setEditingId('');
    setEditForm(initialForm);
  }

  return (
    <section className="panel entity-panel">
      <div className="section-head">
        <div>
          <span className="eyebrow">Master data</span>
          <h2>{title}</h2>
          <p>{items.length} records</p>
        </div>
      </div>

      <form className="inline-form" onSubmit={submit}>
        {fields.map((field) => (
          <FieldControl
            key={field.name}
            field={field}
            value={form[field.name]}
            onChange={(value) => setForm({ ...form, [field.name]: value })}
          />
        ))}
        <button type="submit">Add</button>
      </form>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {fields.map((field) => (
                <th key={field.name}>{field.tableLabel || field.label}</th>
              ))}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const isEditing = editingId === item._id;

              return (
                <tr key={item._id}>
                  {fields.map((field) => (
                    <td key={field.name}>
                      {isEditing ? (
                        <FieldControl
                          field={field}
                          value={editForm[field.name]}
                          onChange={(value) => setEditForm({ ...editForm, [field.name]: value })}
                          compact
                        />
                      ) : (
                        displayValue(item, field)
                      )}
                    </td>
                  ))}
                  <td>
                    <div className="row-actions">
                      {isEditing ? (
                        <>
                          <button type="button" onClick={() => saveEdit(item._id)}>
                            Save
                          </button>
                          <button className="secondary" type="button" onClick={() => setEditingId('')}>
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button className="secondary" type="button" onClick={() => startEdit(item)}>
                            Edit
                          </button>
                          <button className="danger" type="button" onClick={() => onDelete(item._id)}>
                            Delete
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
    </section>
  );
}

function FieldControl({ field, value, onChange, compact = false }) {
  if (field.type === 'radio') {
    return (
      <div className={compact ? 'radio-group compact-field' : 'radio-group'}>
        {field.options.map((option) => (
          <label key={option.value}>
            <input
              type="radio"
              name={field.name}
              value={option.value}
              checked={(value || field.defaultValue || '') === option.value}
              required={field.required}
              onChange={(event) => onChange(event.target.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    );
  }

  if (field.type === 'json') {
    return (
      <textarea
        className={compact ? 'compact-field' : ''}
        placeholder={field.label}
        value={value || ''}
        required={field.required}
        rows={compact ? 3 : 2}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  if (field.type === 'select') {
    return (
      <select className={compact ? 'compact-field' : ''} value={value || ''} required={field.required} onChange={(event) => onChange(event.target.value)}>
        <option value="">{field.label}</option>
        {field.options.map((option) => (
          <option key={option._id} value={option._id}>
            {option.name}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      className={compact ? 'compact-field' : ''}
      type={field.type || 'text'}
      placeholder={field.label}
      value={value || ''}
      required={field.required}
      min={field.min}
      step={field.step}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function emptyForm(fields) {
  return Object.fromEntries(fields.map((field) => [field.name, field.defaultValue || '']));
}

function itemToForm(item, fields) {
  return Object.fromEntries(
    fields.map((field) => {
      const value = item[field.name];
      if (field.type === 'json') return [field.name, JSON.stringify(value || [], null, 2)];
      return [field.name, value?._id || value || field.defaultValue || ''];
    })
  );
}

function cleanPayload(form, fields) {
  return fields.reduce((payload, field) => {
    if (field.type === 'json') {
      payload[field.name] = form[field.name] ? JSON.parse(form[field.name]) : [];
      return payload;
    }
    if (field.optional && !form[field.name]) {
      payload[field.name] = null;
      return payload;
    }
    const value = form[field.name] || field.defaultValue || '';
    payload[field.name] = field.type === 'number' ? Number(value || 0) : value;
    return payload;
  }, {});
}

function displayValue(item, field) {
  const value = item[field.name];
  if (field.type === 'select') return value?.name || '-';
  if (field.type === 'number') return Number(value || 0).toLocaleString();
  if (field.type === 'radio') return field.options.find((option) => option.value === value)?.label || value || '-';
  if (field.type === 'json') return field.format ? field.format(value) : JSON.stringify(value || []);
  return value || '-';
}

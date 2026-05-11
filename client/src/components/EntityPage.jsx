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

  if (field.type === 'image') {
    const handleFile = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const res = await fetch('http://localhost:5000/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: reader.result })
          });
          const data = await res.json();
          if (data.url) onChange(data.url);
        } catch (err) {
          console.error('Failed to upload image', err);
        }
      };
      reader.readAsDataURL(file);
    };

    return (
      <div className={compact ? 'compact-field' : ''} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {value && <img src={value} alt="Preview" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />}
        <input type="file" accept="image/*" onChange={handleFile} />
      </div>
    );
  }

  if (field.type === 'market-rates') {
    const rates = Array.isArray(value) ? value : [];
    return (
      <div className={compact ? 'compact-field market-rates-field' : 'market-rates-field'} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <span style={{ fontSize: '12px', color: '#aab3c2' }}>Set specific rate per market</span>
        {field.options.map((market) => {
          const rateObj = rates.find(r => r.marketId === market._id || r.marketId?._id === market._id) || { marketId: market._id, hourlyRate: '' };
          return (
            <div key={market._id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ minWidth: '80px', fontSize: '12px' }}>{market.name}</span>
              <input 
                type="number" 
                min="0" 
                step="0.01" 
                placeholder="Rate" 
                style={{ width: '100px', padding: '4px 8px' }}
                value={rateObj.hourlyRate} 
                onChange={(e) => {
                  const newRates = [...rates.filter(r => r.marketId !== market._id && r.marketId?._id !== market._id)];
                  if (e.target.value !== '') {
                    newRates.push({ marketId: market._id, hourlyRate: Number(e.target.value) });
                  }
                  onChange(newRates);
                }}
              />
            </div>
          );
        })}
      </div>
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
      if (field.type === 'market-rates') return [field.name, value || []];
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
    if (field.type === 'market-rates') {
      payload[field.name] = form[field.name] || [];
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
  if (field.type === 'json' || field.type === 'market-rates') return field.format ? field.format(value) : JSON.stringify(value || []);
  if (field.type === 'image') return value ? <img src={value} alt="Profile" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} /> : '-';
  return value || '-';
}

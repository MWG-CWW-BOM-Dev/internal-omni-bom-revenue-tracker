import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search, Check, X } from 'lucide-react';

export default function CustomSelect({
  options = [],
  value = '',
  onChange,
  placeholder = 'Select option...',
  searchPlaceholder = 'Search...',
  disabled = false,
  required = false,
  className = '',
  style = {},
  direction = 'down'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Normalize options to [{ value, label }]
  const normalizedOptions = options.map(opt => {
    if (opt && typeof opt === 'object') {
      return { 
        value: opt.value !== undefined ? opt.value : '', 
        label: opt.label !== undefined ? opt.label : String(opt.value || '') 
      };
    }
    return { value: opt, label: String(opt) };
  });

  const selectedOption = normalizedOptions.find(opt => String(opt.value) === String(value));

  // Filter options based on search query
  const filteredOptions = normalizedOptions.filter(opt =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  // Auto-focus search input when opening
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
    if (!isOpen) {
      setSearch('');
      setFocusedIndex(-1);
    }
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation inside popover
  const handleKeyDown = (e) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => (prev + 1 < filteredOptions.length ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => (prev - 1 >= 0 ? prev - 1 : filteredOptions.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < filteredOptions.length) {
          handleSelect(filteredOptions[focusedIndex].value);
        } else if (filteredOptions.length > 0) {
          handleSelect(filteredOptions[0].value);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
      case 'Tab':
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  const handleSelect = (val) => {
    if (onChange) {
      onChange(val);
    }
    setIsOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className={`custom-select-container ${disabled ? 'disabled' : ''} ${isOpen ? 'open' : ''} ${className}`}
      style={{
        position: 'relative',
        display: 'inline-block',
        width: '100%',
        fontFamily: 'inherit',
        ...style
      }}
      onKeyDown={handleKeyDown}
    >
      {/* Hidden Native Select for standard form compatibility */}
      {required && (
        <select
          value={value}
          onChange={(e) => handleSelect(e.target.value)}
          required
          style={{
            position: 'absolute',
            opacity: 0,
            pointerEvents: 'none',
            width: '100%',
            height: '100%',
            top: 0,
            left: 0
          }}
          tabIndex={-1}
        >
          <option value="" disabled>{placeholder}</option>
          {normalizedOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      )}

      {/* Select Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="custom-select-trigger"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          minHeight: '38px',
          padding: '8px 14px',
          background: 'var(--surface-strong)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius-sm)',
          color: selectedOption ? 'var(--ink)' : 'var(--muted)',
          fontSize: '13px',
          fontWeight: '500',
          textAlign: 'left',
          cursor: disabled ? 'not-allowed' : 'pointer',
          outline: 'none',
          boxShadow: 'var(--shadow-soft)',
          transition: 'border-color 0.2s, box-shadow 0.2s, background 0.2s',
          minWidth: 0
        }}
      >
        <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown 
          size={16} 
          style={{ 
            color: 'var(--soft)',
            transition: 'transform 0.2s',
            transform: isOpen ? 'rotate(180deg)' : 'none',
            marginLeft: '8px',
            flexShrink: 0
          }} 
        />
      </button>

      {/* Select Dropdown Popover */}
      {isOpen && (
        <div
          className="custom-select-popover"
          style={{
            position: 'absolute',
            ...(direction === 'up' ? { bottom: 'calc(100% + 5px)' } : { top: 'calc(100% + 5px)' }),
            left: 0,
            minWidth: '100%',
            width: 'max-content',
            maxWidth: '320px',
            background: 'var(--surface-strong)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius-sm)',
            boxShadow: 'var(--shadow)',
            zIndex: 1000,
            overflow: 'hidden',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '300px',
            animation: 'fadeInUp 0.15s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {/* Search Input Area */}
          <div
            className="custom-select-search-container"
            style={{
              padding: '8px 10px',
              borderBottom: '1px solid var(--line)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(0, 0, 0, 0.02)'
            }}
          >
            <Search size={14} style={{ color: 'var(--soft)', flexShrink: 0 }} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setFocusedIndex(0);
              }}
              style={{
                flex: 1,
                border: 'none',
                background: 'transparent',
                outline: 'none',
                color: 'var(--ink)',
                fontSize: '13px',
                padding: '4px 0',
                fontFamily: 'inherit'
              }}
              onClick={(e) => e.stopPropagation()}
            />
            {search && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSearch('');
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'grid',
                  placeItems: 'center',
                  color: 'var(--soft)'
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Options List */}
          <div
            className="custom-select-options-list"
            style={{
              overflowY: 'auto',
              flex: 1,
              padding: '4px'
            }}
          >
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, index) => {
                const isSelected = String(opt.value) === String(value);
                const isFocused = index === focusedIndex;

                return (
                  <div
                    key={opt.value}
                    onClick={() => handleSelect(opt.value)}
                    onMouseEnter={() => setFocusedIndex(index)}
                    className={`custom-select-option ${isSelected ? 'selected' : ''} ${isFocused ? 'focused' : ''}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: '4px',
                      fontSize: '13px',
                      cursor: 'pointer',
                      background: isSelected 
                        ? 'var(--primary-soft)' 
                        : isFocused 
                          ? 'rgba(0, 0, 0, 0.04)' 
                          : 'transparent',
                      color: isSelected ? 'var(--primary)' : 'var(--ink)',
                      fontWeight: isSelected ? '600' : '400',
                      transition: 'background 0.15s, color 0.15s'
                    }}
                  >
                    <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {opt.label}
                    </span>
                    {isSelected && <Check size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />}
                  </div>
                );
              })
            ) : (
              <div
                style={{
                  padding: '12px 10px',
                  color: 'var(--muted)',
                  fontSize: '12px',
                  textAlign: 'center'
                }}
              >
                No results found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

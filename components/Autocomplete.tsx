'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface AutocompleteProps<T> {
  value: string;
  onChange: (value: string) => void;
  onSelect: (item: T) => void;
  fetchItems: (query: string) => Promise<T[]>;
  renderItem: (item: T) => React.ReactNode;
  getItemKey: (item: T) => string | number;
  placeholder?: string;
  required?: boolean;
  rightAction?: React.ReactNode;
  debounceMs?: number;
}

export function Autocomplete<T>({
  value,
  onChange,
  onSelect,
  fetchItems,
  renderItem,
  getItemKey,
  placeholder = '',
  required = false,
  rightAction,
  debounceMs = 300,
}: AutocompleteProps<T>) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(false);
  const cachedItems = useRef<T[]>([]);

  const updatePosition = useCallback(() => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    setDropdownStyle({
      position: 'fixed',
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      zIndex: 60,
    });
  }, []);

  // Fetch + show dropdown
  const doFetch = useCallback((query: string, showDropdown: boolean) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setActiveIndex(-1);

    if (showDropdown) {
      debounceRef.current = setTimeout(async () => {
        setLoading(true);
        try {
          // Try online fetch first
          const results = await fetchItems(query);
          setItems(results);
          // Cache results for offline use
          if (results.length > 0) {
            cachedItems.current = results;
          }
          setOpen(true);
          updatePosition();
        } catch {
          // Offline — fall back to filtering cached items
          if (cachedItems.current.length > 0) {
            const q = query.toLowerCase();
            const filtered = cachedItems.current.filter((item: any) => {
              const name = item.name || item.service || '';
              const phone = item.phone || '';
              return name.toLowerCase().includes(q) || phone.toLowerCase().includes(q);
            });
            setItems(filtered as T[]);
          } else {
            setItems([]);
          }
          setOpen(true);
          updatePosition();
        }
        setLoading(false);
      }, debounceMs);
    } else {
      // Silent pre-fetch (no debounce needed)
      fetchItems(query).then(results => {
        setItems(results);
        if (results.length > 0) cachedItems.current = results;
      }).catch(() => {});
    }
  }, [fetchItems, debounceMs, updatePosition]);

  // On mount: silent pre-fetch all items
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      fetchItems('').then(results => {
        setItems(results);
        if (results.length > 0) cachedItems.current = results;
      }).catch(() => {});
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (dropdownRef.current?.contains(target) || inputRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Update position on scroll/resize while open
  useEffect(() => {
    if (!open) return;
    const handler = () => updatePosition();
    window.addEventListener('scroll', handler, true);
    window.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('scroll', handler, true);
      window.removeEventListener('resize', handler);
    };
  }, [open, updatePosition]);

  const handleSelect = useCallback((item: T) => {
    onSelect(item);
    setOpen(false);
    setActiveIndex(-1);
  }, [onSelect]);

  const handleInputChange = (newValue: string) => {
    onChange(newValue);
    doFetch(newValue, true); // user typed → show dropdown
  };

  const handleFocus = () => {
    updatePosition();
    if (items.length > 0) {
      setOpen(true);
    } else if (value.trim()) {
      doFetch(value, true);
    } else {
      // Empty value — try to show all cached items
      if (cachedItems.current.length > 0) {
        setItems(cachedItems.current as T[]);
        setOpen(true);
      } else {
        doFetch('', true);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || items.length === 0) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex(i => Math.min(i + 1, items.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < items.length) {
          handleSelect(items[activeIndex]);
        }
        break;
      case 'Escape':
        setOpen(false);
        setActiveIndex(-1);
        break;
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex < 0 || !dropdownRef.current) return;
    const el = dropdownRef.current.children[activeIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          ref={inputRef}
          className="input-glass"
          style={{ flex: 1 }}
          value={value}
          onChange={e => handleInputChange(e.target.value)}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          required={required}
          autoComplete="off"
        />
        {rightAction}
      </div>

      {open && (
        <div ref={dropdownRef} className="autocomplete-dropdown" style={dropdownStyle}>
          {loading ? (
            <div className="autocomplete-loading">
              <div className="spinner" style={{ margin: '0 auto' }} />
            </div>
          ) : items.length === 0 ? (
            <div className="autocomplete-empty">Ничего не найдено</div>
          ) : (
            items.map((item, i) => (
              <div
                key={getItemKey(item)}
                className={`autocomplete-item ${i === activeIndex ? 'active' : ''}`}
                onMouseDown={e => { e.preventDefault(); handleSelect(item); }}
                onMouseEnter={() => setActiveIndex(i)}
              >
                {renderItem(item)}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

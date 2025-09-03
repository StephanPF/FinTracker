import React, { useState, useEffect, useRef } from 'react';

const Autocomplete = ({ 
  value = '',
  onChange,
  onSelect,
  options = [],
  placeholder = '',
  label = '',
  className = '',
  disabled = false,
  required = false,
  isError = false,
  getOptionLabel = (option) => option.name || option.label || option,
  getOptionValue = (option) => option.id || option.value || option,
  filterFunction = (options, input) => 
    options.filter(option => 
      getOptionLabel(option).toLowerCase().includes(input.toLowerCase())
    ),
  allowFreeText = true
}) => {
  const [inputValue, setInputValue] = useState(value || '');
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredOptions, setFilteredOptions] = useState([]);
  const containerRef = useRef(null);

  // Update input value when prop value changes
  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  // Filter options based on input
  useEffect(() => {
    if (inputValue.length > 0) {
      const filtered = filterFunction(options, inputValue);
      setFilteredOptions(filtered);
      setShowDropdown(filtered.length > 0);
    } else {
      setFilteredOptions([]);
      setShowDropdown(false);
    }
  }, [inputValue, options, filterFunction]);

  // Handle input change
  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    if (onChange) {
      onChange(newValue);
    }
  };

  // Handle option selection
  const handleOptionSelect = (option) => {
    const optionLabel = getOptionLabel(option);
    const optionValue = getOptionValue(option);
    
    setInputValue(optionLabel);
    setShowDropdown(false);
    
    if (onSelect) {
      onSelect(option, optionValue, optionLabel);
    }
    
    if (onChange) {
      onChange(optionLabel);
    }
  };

  // Handle input blur
  const handleInputBlur = () => {
    // Delay hiding dropdown to allow option selection
    setTimeout(() => {
      setShowDropdown(false);
    }, 200);
  };

  // Handle input focus
  const handleInputFocus = () => {
    if (inputValue.length > 0 && filteredOptions.length > 0) {
      setShowDropdown(true);
    }
  };

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className={`autocomplete-container ${className}`} ref={containerRef}>
      {label && (
        <label className="autocomplete-label">
          {label}
          {required && <span className="required-asterisk"> *</span>}
        </label>
      )}
      
      <div className="autocomplete-input-wrapper" style={{ position: 'relative' }}>
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={`autocomplete-input ${isError ? 'field-error' : ''}`}
          style={{ width: '100%' }}
        />
        
        {showDropdown && filteredOptions.length > 0 && (
          <div 
            className="autocomplete-dropdown"
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              backgroundColor: 'white',
              border: '1px solid #ddd',
              borderTop: 'none',
              borderRadius: '0 0 4px 4px',
              maxHeight: '200px',
              overflowY: 'auto',
              zIndex: 1000,
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            {filteredOptions.map((option, index) => (
              <div
                key={getOptionValue(option) || index}
                className="autocomplete-option"
                onClick={() => handleOptionSelect(option)}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #f0f0f0',
                  '&:hover': {
                    backgroundColor: '#f5f5f5'
                  }
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#f5f5f5';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'white';
                }}
              >
                {getOptionLabel(option)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Autocomplete;
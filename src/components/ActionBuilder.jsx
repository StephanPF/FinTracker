import React from 'react';
import './ActionBuilder.css';

const TRANSFORM_FUNCTIONS = [
  {
    key: 'absolute',
    label: 'Make Positive (Math.abs)',
    description: 'Convert negative amounts to positive values',
    dataTypes: ['number']
  },
  {
    key: 'negate',
    label: 'Change Sign (multiply by -1)',
    description: 'Convert positive to negative or vice versa',
    dataTypes: ['number']
  },
  {
    key: 'multiply',
    label: 'Multiply by Value',
    description: 'Multiply the field by a constant',
    dataTypes: ['number'],
    requiresParameter: true
  },
  {
    key: 'uppercase',
    label: 'Convert to Uppercase',
    description: 'Convert text to uppercase',
    dataTypes: ['string']
  },
  {
    key: 'lowercase',
    label: 'Convert to Lowercase',
    description: 'Convert text to lowercase',
    dataTypes: ['string']
  },
  {
    key: 'trim',
    label: 'Remove Extra Spaces',
    description: 'Remove leading and trailing whitespace',
    dataTypes: ['string']
  }
];

const SYSTEM_FIELDS = [
  { key: 'transactionType', label: 'Transaction Type', values: ['Income', 'Expenses', 'Transfer', 'Investment - SELL', 'Investment - BUY'] },
  { key: 'transactionGroup', label: 'Transaction Group', values: ['Salary', 'Food & Dining', 'Transportation', 'Shopping', 'Healthcare', 'Entertainment', 'Utilities'] },
  { key: 'payee', label: 'Payee', values: [] },
  { key: 'payer', label: 'Payer', values: [] },
  { key: 'tag', label: 'Tag', values: [] },
  { key: 'notes', label: 'Notes', values: [] }
];

const ActionBuilder = ({ actions, availableFields, onUpdateActions }) => {
  const addAction = () => {
    const newAction = {
      type: 'SET_FIELD',
      field: '',
      value: ''
    };
    onUpdateActions([...actions, newAction]);
  };

  const updateAction = (index, updates) => {
    const updatedActions = actions.map((action, idx) => 
      idx === index ? { ...action, ...updates } : action
    );
    onUpdateActions(updatedActions);
  };

  const removeAction = (index) => {
    const updatedActions = actions.filter((_, idx) => idx !== index);
    onUpdateActions(updatedActions);
  };

  const getFieldDataType = (fieldName) => {
    if (['amount', 'destinationAmount'].includes(fieldName)) return 'number';
    return 'string';
  };

  const getAvailableTransforms = (fieldName) => {
    const dataType = getFieldDataType(fieldName);
    return TRANSFORM_FUNCTIONS.filter(transform => 
      transform.dataTypes.includes(dataType)
    );
  };

  const getSystemFieldValues = (fieldKey) => {
    const systemField = SYSTEM_FIELDS.find(f => f.key === fieldKey);
    return systemField ? systemField.values : [];
  };

  const getAllTargetFields = () => {
    // Combine available CSV fields with system fields
    return [
      ...availableFields,
      ...SYSTEM_FIELDS.map(f => f.key)
    ].filter((value, index, self) => self.indexOf(value) === index); // Remove duplicates
  };

  return (
    <div className="action-builder">
      <div className="actions-header">
        <h6>Actions (Then)</h6>
      </div>

      <div className="actions-list">
        {actions.length === 0 && (
          <div className="empty-actions">
            <p>No actions defined. Add an action to specify what should happen when conditions are met.</p>
          </div>
        )}

        {actions.map((action, index) => (
          <div key={index} className="action-item">
            <div className="action-type-selector">
              <select
                className="action-type-select"
                value={action.type}
                onChange={(e) => {
                  const newType = e.target.value;
                  updateAction(index, { 
                    type: newType,
                    // Reset fields when changing type
                    field: '',
                    value: '',
                    transform: '',
                    targetField: '',
                    parameter: ''
                  });
                }}
              >
                <option value="SET_FIELD">Set Field Value</option>
                <option value="TRANSFORM_FIELD">Transform Field</option>
                <option value="IGNORE_ROW">Ignore Row</option>
              </select>
            </div>

            {action.type === 'SET_FIELD' && (
              <div className="set-field-action">
                <div className="action-row">
                  <span className="action-label">Set</span>
                  <select
                    className="field-select"
                    value={action.field}
                    onChange={(e) => updateAction(index, { field: e.target.value, value: '' })}
                  >
                    <option value="">Select field...</option>
                    {getAllTargetFields().map(field => (
                      <option key={field} value={field}>{field}</option>
                    ))}
                  </select>
                  <span className="action-label">to</span>
                  
                  {getSystemFieldValues(action.field).length > 0 ? (
                    <select
                      className="value-select"
                      value={action.value}
                      onChange={(e) => updateAction(index, { value: e.target.value })}
                      disabled={!action.field}
                    >
                      <option value="">Select value...</option>
                      {getSystemFieldValues(action.field).map(value => (
                        <option key={value} value={value}>{value}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      className="value-input"
                      placeholder="Enter value"
                      value={action.value}
                      onChange={(e) => updateAction(index, { value: e.target.value })}
                      disabled={!action.field}
                    />
                  )}

                  <button
                    type="button"
                    className="btn btn-small btn-danger remove-action"
                    onClick={() => removeAction(index)}
                    title="Remove action"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}

            {action.type === 'TRANSFORM_FIELD' && (
              <div className="transform-field-action">
                <div className="action-row">
                  <span className="action-label">Transform</span>
                  <select
                    className="field-select"
                    value={action.field}
                    onChange={(e) => updateAction(index, { 
                      field: e.target.value, 
                      transform: '',
                      targetField: e.target.value,
                      parameter: ''
                    })}
                  >
                    <option value="">Select field...</option>
                    {availableFields.map(field => (
                      <option key={field} value={field}>{field}</option>
                    ))}
                  </select>
                  <span className="action-label">using</span>
                  <select
                    className="transform-select"
                    value={action.transform}
                    onChange={(e) => {
                      const selectedTransform = TRANSFORM_FUNCTIONS.find(t => t.key === e.target.value);
                      updateAction(index, { 
                        transform: e.target.value,
                        parameter: selectedTransform?.requiresParameter ? '' : undefined
                      });
                    }}
                    disabled={!action.field}
                  >
                    <option value="">Select transform...</option>
                    {getAvailableTransforms(action.field).map(transform => (
                      <option key={transform.key} value={transform.key}>{transform.label}</option>
                    ))}
                  </select>

                  <button
                    type="button"
                    className="btn btn-small btn-danger remove-action"
                    onClick={() => removeAction(index)}
                    title="Remove action"
                  >
                    ×
                  </button>
                </div>

                {action.field && action.transform && (
                  <div className="transform-options">
                    {TRANSFORM_FUNCTIONS.find(t => t.key === action.transform)?.requiresParameter && (
                      <div className="parameter-input">
                        <label>Parameter:</label>
                        <input
                          type="number"
                          className="parameter-field"
                          placeholder="Enter value"
                          value={action.parameter || ''}
                          onChange={(e) => updateAction(index, { parameter: e.target.value })}
                        />
                      </div>
                    )}
                    
                    <div className="target-field">
                      <label>Store result in:</label>
                      <select
                        className="target-field-select"
                        value={action.targetField || action.field}
                        onChange={(e) => updateAction(index, { targetField: e.target.value })}
                      >
                        {getAllTargetFields().map(field => (
                          <option key={field} value={field}>{field}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {action.transform && (
                  <div className="transform-description">
                    <small>{TRANSFORM_FUNCTIONS.find(t => t.key === action.transform)?.description}</small>
                  </div>
                )}
              </div>
            )}

            {action.type === 'IGNORE_ROW' && (
              <div className="ignore-row-action">
                <div className="action-row">
                  <span className="ignore-row-info">
                    🚫 This row will be skipped during import when conditions are met. No additional configuration needed.
                  </span>
                  <button
                    type="button"
                    className="btn btn-small btn-danger remove-action"
                    onClick={() => removeAction(index)}
                    title="Remove action"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        className="btn btn-secondary btn-small add-action"
        onClick={addAction}
      >
        + Add Action
      </button>
    </div>
  );
};

export default ActionBuilder;
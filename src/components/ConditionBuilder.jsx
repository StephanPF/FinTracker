import React from 'react';
import './ConditionBuilder.css';

const CONDITION_OPERATORS = [
  { value: 'equals', label: 'equals' },
  { value: 'contains', label: 'contains' },
  { value: 'startsWith', label: 'starts with' },
  { value: 'endsWith', label: 'ends with' },
  { value: 'matches', label: 'matches (regex)' },
  { value: 'greaterThan', label: '>' },
  { value: 'lessThan', label: '<' },
  { value: 'isEmpty', label: 'is empty' },
  { value: 'isNotEmpty', label: 'is not empty' }
];

const ConditionBuilder = ({ 
  conditions, 
  conditionLogic, 
  availableFields, 
  onUpdateConditions,
  onUpdateConditionLogic 
}) => {
  const addCondition = () => {
    const newCondition = {
      field: availableFields[0] || '',
      operator: 'equals',
      value: '',
      caseSensitive: false,
      dataType: 'string'
    };
    onUpdateConditions([...conditions, newCondition]);
  };

  const updateCondition = (index, updates) => {
    const updatedConditions = conditions.map((condition, idx) => 
      idx === index ? { ...condition, ...updates } : condition
    );
    onUpdateConditions(updatedConditions);
  };

  const removeCondition = (index) => {
    const updatedConditions = conditions.filter((_, idx) => idx !== index);
    onUpdateConditions(updatedConditions);
  };

  const getFieldDataType = (fieldName) => {
    // Determine data type based on field name
    if (['amount', 'destinationAmount'].includes(fieldName)) return 'number';
    if (['date'].includes(fieldName)) return 'date';
    return 'string';
  };

  const getOperatorsForField = (fieldName) => {
    const dataType = getFieldDataType(fieldName);
    
    if (dataType === 'number') {
      return CONDITION_OPERATORS.filter(op => 
        ['equals', 'greaterThan', 'lessThan', 'isEmpty', 'isNotEmpty'].includes(op.value)
      );
    }
    
    if (dataType === 'date') {
      return CONDITION_OPERATORS.filter(op => 
        ['equals', 'greaterThan', 'lessThan', 'isEmpty', 'isNotEmpty'].includes(op.value)
      );
    }
    
    // String type gets all operators
    return CONDITION_OPERATORS;
  };

  const shouldShowValue = (operator) => {
    return !['isEmpty', 'isNotEmpty'].includes(operator);
  };

  const shouldShowCaseSensitive = (field, operator) => {
    const dataType = getFieldDataType(field);
    return dataType === 'string' && ['equals', 'contains', 'startsWith', 'endsWith', 'matches'].includes(operator);
  };

  return (
    <div className="condition-builder">
      <div className="conditions-header">
        <h6>Conditions (When)</h6>
        {conditions.length > 1 && (
          <div className="logic-selector">
            <label>
              <input
                type="radio"
                name="conditionLogic"
                value="ALL"
                checked={conditionLogic === 'ALL'}
                onChange={(e) => onUpdateConditionLogic(e.target.value)}
              />
              All conditions must match
            </label>
            <label>
              <input
                type="radio"
                name="conditionLogic"
                value="ANY"
                checked={conditionLogic === 'ANY'}
                onChange={(e) => onUpdateConditionLogic(e.target.value)}
              />
              Any condition can match
            </label>
          </div>
        )}
      </div>

      <div className="conditions-list">
        {conditions.length === 0 && (
          <div className="empty-conditions">
            <p>No conditions defined. Add a condition to specify when this rule should apply.</p>
          </div>
        )}

        {conditions.map((condition, index) => (
          <div key={index} className="condition-item">
            <div className="condition-row">
              <select
                className="field-select"
                value={condition.field}
                onChange={(e) => updateCondition(index, { 
                  field: e.target.value,
                  dataType: getFieldDataType(e.target.value),
                  operator: 'equals' // Reset operator when field changes
                })}
              >
                <option value="">Select field...</option>
                {availableFields.map(field => (
                  <option key={field} value={field}>{field}</option>
                ))}
              </select>

              <select
                className="operator-select"
                value={condition.operator}
                onChange={(e) => updateCondition(index, { operator: e.target.value })}
                disabled={!condition.field}
              >
                {getOperatorsForField(condition.field).map(op => (
                  <option key={op.value} value={op.value}>{op.label}</option>
                ))}
              </select>

              {shouldShowValue(condition.operator) && (
                <input
                  type={getFieldDataType(condition.field) === 'number' ? 'number' : 'text'}
                  className="value-input"
                  placeholder={`Enter ${getFieldDataType(condition.field)} value`}
                  value={condition.value}
                  onChange={(e) => updateCondition(index, { value: e.target.value })}
                  disabled={!condition.field || !condition.operator}
                />
              )}

              <button
                type="button"
                className="btn btn-small btn-danger remove-condition"
                onClick={() => removeCondition(index)}
                title="Remove condition"
              >
                ×
              </button>
            </div>

            {shouldShowCaseSensitive(condition.field, condition.operator) && (
              <div className="condition-options">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={!condition.caseSensitive}
                    onChange={(e) => updateCondition(index, { caseSensitive: !e.target.checked })}
                  />
                  Case insensitive
                </label>
              </div>
            )}

            {conditions.length > 1 && index < conditions.length - 1 && (
              <div className="condition-connector">
                {conditionLogic === 'ALL' ? 'AND' : 'OR'}
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        className="btn btn-secondary btn-small add-condition"
        onClick={addCondition}
        disabled={availableFields.length === 0}
      >
        + Add Condition
      </button>

      {availableFields.length === 0 && (
        <p className="warning-text">
          No fields available for conditions. Please map CSV columns in Step 4 first.
        </p>
      )}
    </div>
  );
};

export default ConditionBuilder;
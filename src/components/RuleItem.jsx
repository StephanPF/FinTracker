import React, { useState } from 'react';
import './RuleItem.css';

const RuleItem = ({ rule, index, onEdit, onDelete, onToggleActive, availableFields }) => {
  const [expanded, setExpanded] = useState(false);

  const getRuleTypeIcon = (type) => {
    switch (type) {
      case 'FIELD_TRANSFORM': return '🔄';
      case 'FIELD_VALUE_SET': return '📝';
      case 'ROW_IGNORE': return '🚫';
      default: return '⚙️';
    }
  };

  const getRuleTypeLabel = (type) => {
    switch (type) {
      case 'FIELD_TRANSFORM': return 'Transform Field';
      case 'FIELD_VALUE_SET': return 'Set Field Value';
      case 'ROW_IGNORE': return 'Ignore Row';
      default: return 'Unknown';
    }
  };

  const getConditionSummary = (conditions, logic) => {
    if (!conditions || conditions.length === 0) return 'No conditions';
    
    if (conditions.length === 1) {
      const condition = conditions[0];
      return `${condition.field} ${condition.operator} "${condition.value}"`;
    }
    
    const connector = logic === 'ALL' ? ' AND ' : ' OR ';
    return conditions.map(c => `${c.field} ${c.operator} "${c.value}"`).join(connector);
  };

  const getActionSummary = (actions) => {
    if (!actions || actions.length === 0) return 'No actions';
    
    return actions.map(action => {
      if (action.type === 'SET_FIELD') {
        return `Set ${action.field} = "${action.value}"`;
      } else if (action.type === 'TRANSFORM_FIELD') {
        return `Transform ${action.field} using ${action.transform}`;
      }
      return 'Unknown action';
    }).join(', ');
  };

  return (
    <div className={`rule-item ${rule.active ? 'active' : 'inactive'}`}>
      <div className="rule-header" onClick={() => setExpanded(!expanded)}>
        <div className="rule-info">
          <div className="rule-title-row">
            <span className="rule-icon">{getRuleTypeIcon(rule.type)}</span>
            <span className="rule-name">{rule.name}</span>
            <span className="rule-type">{getRuleTypeLabel(rule.type)}</span>
            <div className="rule-status">
              <span className={`status-indicator ${rule.active ? 'active' : 'inactive'}`}>
                {rule.active ? '✓ Active' : '○ Inactive'}
              </span>
            </div>
          </div>
          <div className="rule-summary">
            <div className="rule-order">Order: {rule.ruleOrder || 0}</div>
            <div className="rule-preview">
              <span className="summary-when">When: {getConditionSummary(rule.conditions, rule.conditionLogic)}</span>
              <span className="summary-then">Then: {getActionSummary(rule.actions)}</span>
            </div>
          </div>
        </div>
        
        <div className="rule-actions">
          <button
            type="button"
            className={`btn btn-small toggle-btn ${rule.active ? 'btn-warning' : 'btn-success'}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleActive(rule.id, !rule.active);
            }}
            title={rule.active ? 'Deactivate rule' : 'Activate rule'}
          >
            {rule.active ? 'Disable' : 'Enable'}
          </button>
          <button
            type="button"
            className="btn btn-small btn-secondary"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(rule);
            }}
            title="Edit rule"
          >
            Edit
          </button>
          <button
            type="button"
            className="btn btn-small btn-danger"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(rule.id);
            }}
            title="Delete rule"
          >
            Delete
          </button>
          <button
            type="button"
            className="btn btn-small btn-ghost expand-btn"
            title={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="rule-details">
          <div className="rule-section">
            <h6>Conditions ({rule.conditionLogic || 'ANY'}):</h6>
            {rule.conditions && rule.conditions.length > 0 ? (
              <ul className="conditions-list">
                {rule.conditions.map((condition, idx) => (
                  <li key={idx} className="condition-item">
                    <strong>{condition.field}</strong> {condition.operator} 
                    <em>"{condition.value}"</em>
                    {condition.caseSensitive === false && (
                      <span className="condition-modifier">(case insensitive)</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-list">No conditions defined</p>
            )}
          </div>

          <div className="rule-section">
            <h6>Actions:</h6>
            {rule.actions && rule.actions.length > 0 ? (
              <ul className="actions-list">
                {rule.actions.map((action, idx) => (
                  <li key={idx} className="action-item">
                    {action.type === 'SET_FIELD' && (
                      <>Set <strong>{action.field}</strong> to <em>"{action.value}"</em></>
                    )}
                    {action.type === 'TRANSFORM_FIELD' && (
                      <>
                        Transform <strong>{action.field}</strong> using <em>{action.transform}</em>
                        {action.targetField && action.targetField !== action.field && (
                          <> → <strong>{action.targetField}</strong></>
                        )}
                      </>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-list">No actions defined</p>
            )}
          </div>

          <div className="rule-metadata">
            <div className="metadata-item">
              <span className="metadata-label">Created:</span>
              <span className="metadata-value">{new Date(rule.createdAt).toLocaleDateString()}</span>
            </div>
            {rule.updatedAt && rule.updatedAt !== rule.createdAt && (
              <div className="metadata-item">
                <span className="metadata-label">Updated:</span>
                <span className="metadata-value">{new Date(rule.updatedAt).toLocaleDateString()}</span>
              </div>
            )}
            <div className="metadata-item">
              <span className="metadata-label">ID:</span>
              <span className="metadata-value">{rule.id}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RuleItem;
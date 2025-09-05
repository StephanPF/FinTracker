import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import './RuleItem.css';

const RuleItem = ({ rule, index, onEdit, onDelete, onToggleActive, availableFields }) => {
  const { t } = useLanguage();
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
      case 'FIELD_TRANSFORM': return t('transformField');
      case 'FIELD_VALUE_SET': return t('setFieldValue');
      case 'ROW_IGNORE': return t('ignoreRow');
      default: return t('unknown');
    }
  };

  const getConditionSummary = (conditions, logic) => {
    if (!conditions || conditions.length === 0) return t('noConditions');
    
    if (conditions.length === 1) {
      const condition = conditions[0];
      return `${condition.field} ${condition.operator} "${condition.value}"`;
    }
    
    const connector = logic === 'ALL' ? ' AND ' : ' OR ';
    return conditions.map(c => `${c.field} ${c.operator} "${c.value}"`).join(connector);
  };

  const getActionSummary = (actions) => {
    if (!actions || actions.length === 0) return t('noActions');
    
    return actions.map(action => {
      if (action.type === 'SET_FIELD') {
        return `${t('set')} ${action.field} = "${action.value}"`;
      } else if (action.type === 'TRANSFORM_FIELD') {
        return `${t('transform')} ${action.field} ${t('using')} ${action.transform}`;
      }
      return t('unknown');
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
                {rule.active ? `✓ ${t('active')}` : `○ ${t('inactive')}`}
              </span>
            </div>
          </div>
          <div className="rule-summary">
            <div className="rule-order">{t('order')} {rule.ruleOrder || 0}</div>
            <div className="rule-preview">
              <span className="summary-when">{t('when')} {getConditionSummary(rule.conditions, rule.conditionLogic)}</span>
              <span className="summary-then">{t('then')} {getActionSummary(rule.actions)}</span>
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
            title={rule.active ? t('deactivateRule') : t('activateRule')}
          >
            {rule.active ? t('disable') : t('enable')}
          </button>
          <button
            type="button"
            className="btn btn-small btn-secondary"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(rule);
            }}
            title={t('editRule')}
          >
            {t('edit')}
          </button>
          <button
            type="button"
            className="btn btn-small btn-danger"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(rule.id);
            }}
            title={t('deleteRule')}
          >
            {t('delete')}
          </button>
          <button
            type="button"
            className="btn btn-small btn-ghost expand-btn"
            title={expanded ? t('collapse') : t('expand')}
          >
            {expanded ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="rule-details">
          <div className="rule-section">
            <h6>{t('conditions')} ({rule.conditionLogic || 'ANY'}):</h6>
            {rule.conditions && rule.conditions.length > 0 ? (
              <ul className="conditions-list">
                {rule.conditions.map((condition, idx) => (
                  <li key={idx} className="condition-item">
                    <strong>{condition.field}</strong> {condition.operator} 
                    <em>"{condition.value}"</em>
                    {condition.caseSensitive === false && (
                      <span className="condition-modifier">{t('caseInsensitive')}</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-list">{t('noConditionsDefined')}</p>
            )}
          </div>

          <div className="rule-section">
            <h6>{t('actions')}:</h6>
            {rule.actions && rule.actions.length > 0 ? (
              <ul className="actions-list">
                {rule.actions.map((action, idx) => (
                  <li key={idx} className="action-item">
                    {action.type === 'SET_FIELD' && (
                      <>{t('set')} <strong>{action.field}</strong> {t('to')} <em>"{action.value}"</em></>
                    )}
                    {action.type === 'TRANSFORM_FIELD' && (
                      <>
                        {t('transform')} <strong>{action.field}</strong> {t('using')} <em>{action.transform}</em>
                        {action.targetField && action.targetField !== action.field && (
                          <> → <strong>{action.targetField}</strong></>
                        )}
                      </>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-list">{t('noActionsDefined')}</p>
            )}
          </div>

          <div className="rule-metadata">
            <div className="metadata-item">
              <span className="metadata-label">{t('created')}</span>
              <span className="metadata-value">{new Date(rule.createdAt).toLocaleDateString()}</span>
            </div>
            {rule.updatedAt && rule.updatedAt !== rule.createdAt && (
              <div className="metadata-item">
                <span className="metadata-label">{t('updated')}</span>
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
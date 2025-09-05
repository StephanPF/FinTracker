import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../contexts/LanguageContext';
import ConditionBuilder from './ConditionBuilder';
import ActionBuilder from './ActionBuilder';
import './RuleCreationModal.css';

// Simplified to single rule type - actions now handle the different behaviors

const RuleCreationModal = ({ 
  isOpen, 
  rule = null, 
  onClose, 
  onSave, 
  availableFields = [], 
  isEditing = false 
}) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    name: '',
    type: 'PROCESSING_RULE', // Single rule type now
    active: true,
    ruleOrder: 0,
    conditions: [],
    conditionLogic: 'ANY',
    actions: []
  });
  
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (rule) {
      setFormData({
        name: rule.name || '',
        type: 'PROCESSING_RULE',
        active: rule.active !== undefined ? rule.active : true,
        ruleOrder: rule.ruleOrder || 0,
        conditions: rule.conditions || [],
        conditionLogic: rule.conditionLogic || 'ANY',
        actions: rule.actions || []
      });
    } else {
      setFormData({
        name: '',
        type: 'PROCESSING_RULE',
        active: true,
        ruleOrder: 0,
        conditions: [],
        conditionLogic: 'ANY',
        actions: []
      });
    }
    setErrors({});
  }, [rule, isOpen]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = t('ruleNameRequired');
    }

    if (formData.conditions.length === 0) {
      newErrors.conditions = t('atLeastOneCondition');
    } else {
      // Validate each condition
      formData.conditions.forEach((condition, index) => {
        if (!condition.field) {
          newErrors[`condition_${index}_field`] = t('fieldIsRequired');
        }
        if (!condition.operator) {
          newErrors[`condition_${index}_operator`] = t('operatorIsRequired');
        }
        if (shouldShowValue(condition.operator) && !condition.value) {
          newErrors[`condition_${index}_value`] = t('valueIsRequired');
        }
      });
    }

    if (formData.actions.length === 0) {
      newErrors.actions = t('atLeastOneAction');
    } else {
      // Validate each action
      formData.actions.forEach((action, index) => {
        if (action.type === 'SET_FIELD') {
          if (!action.field) {
            newErrors[`action_${index}_field`] = t('fieldIsRequired');
          }
          if (!action.value) {
            newErrors[`action_${index}_value`] = t('valueIsRequired');
          }
        }
        if (action.type === 'TRANSFORM_FIELD') {
          if (!action.field) {
            newErrors[`action_${index}_field`] = t('fieldIsRequired');
          }
          if (!action.transform) {
            newErrors[`action_${index}_transform`] = t('transformFunctionRequired');
          }
          const transformFunctions = [
            { key: 'absolute', requiresParameter: false },
            { key: 'negate', requiresParameter: false },
            { key: 'multiply', requiresParameter: true },
            { key: 'uppercase', requiresParameter: false },
            { key: 'lowercase', requiresParameter: false },
            { key: 'trim', requiresParameter: false }
          ];
          const transformFunc = transformFunctions.find(t => t.key === action.transform);
          if (transformFunc?.requiresParameter && !action.parameter) {
            newErrors[`action_${index}_parameter`] = t('parameterRequiredForTransform');
          }
        }
        // IGNORE_ROW actions don't need additional validation
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const shouldShowValue = (operator) => {
    return !['isEmpty', 'isNotEmpty'].includes(operator);
  };

  const handleSubmit = async () => {
    
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      await onSave(formData);
    } catch (error) {
      console.error('Error saving rule:', error);
      setErrors({ 
        general: error.message || t('failedToSaveRule')
      });
    } finally {
      setSaving(false);
    }
  };

  const updateFormData = (updates) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  // Rule type change function removed - now using single rule type with different action types

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isEditing ? t('editProcessingRule') : t('createProcessingRule')}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {errors.general && (
            <div className="error-alert">
              {errors.general}
            </div>
          )}

          <div className="rule-basic-info">
            <div className="form-field">
              <label htmlFor="ruleName">{t('ruleName')} *</label>
              <input
                id="ruleName"
                type="text"
                className={`form-input ${errors.name ? 'error' : ''}`}
                placeholder={t('convertNegativeAmounts')}
                value={formData.name}
                onChange={(e) => updateFormData({ name: e.target.value })}
              />
              {errors.name && <span className="field-error">{errors.name}</span>}
            </div>

            {/* Rule type selector removed - now using single rule type with different action types */}

            <div className="form-row">
              <div className="form-field">
                <label htmlFor="ruleOrder">{t('executionOrder')}</label>
                <input
                  id="ruleOrder"
                  type="number"
                  className="form-input"
                  min="0"
                  value={formData.ruleOrder}
                  onChange={(e) => updateFormData({ ruleOrder: parseInt(e.target.value) || 0 })}
                />
                <small>{t('lowerNumbersFirst')}</small>
              </div>

              <div className="form-field">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => updateFormData({ active: e.target.checked })}
                  />
                  {t('ruleIsActive')}
                </label>
              </div>
            </div>
          </div>

          <div className="rule-builder-sections">
            <div className={`builder-section ${errors.conditions ? 'error' : ''}`}>
              <ConditionBuilder
                conditions={formData.conditions}
                conditionLogic={formData.conditionLogic}
                availableFields={availableFields}
                onUpdateConditions={(conditions) => updateFormData({ conditions })}
                onUpdateConditionLogic={(logic) => updateFormData({ conditionLogic: logic })}
              />
              {errors.conditions && <span className="field-error">{errors.conditions}</span>}
            </div>

            <div className={`builder-section ${errors.actions ? 'error' : ''}`}>
              <ActionBuilder
                actions={formData.actions}
                availableFields={availableFields}
                onUpdateActions={(actions) => updateFormData({ actions })}
              />
              {errors.actions && <span className="field-error">{errors.actions}</span>}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={onClose}
            disabled={saving}
          >
            {t('cancel')}
          </button>
          <button 
            type="button" 
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? t('saving') : (isEditing ? t('updateRule') : t('createRule'))}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default RuleCreationModal;
import { useAccounting } from '../contexts/AccountingContext';

export const useDate = () => {
  const { dateFormatService } = useAccounting();

  // Fallback date formatting function
  const fallbackFormatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatDate = (dateInput, options = {}) => {
    if (!dateFormatService) {
      return fallbackFormatDate(dateInput);
    }
    return dateFormatService.formatDate(dateInput, options);
  };

  const formatDateTime = (dateInput, options = {}) => {
    if (!dateFormatService) {
      return fallbackFormatDate(dateInput);
    }
    return dateFormatService.formatDateTime(dateInput, options);
  };

  const formatTime = (dateInput, options = {}) => {
    if (!dateFormatService) {
      const date = new Date(dateInput);
      return isNaN(date.getTime()) ? '-' : date.toLocaleTimeString();
    }
    return dateFormatService.formatTime(dateInput, options);
  };

  const formatForInput = (dateInput) => {
    if (!dateFormatService) {
      if (!dateInput) return '';
      const date = new Date(dateInput);
      if (isNaN(date.getTime())) return '';
      return date.toISOString().split('T')[0];
    }
    return dateFormatService.formatForInput(dateInput);
  };

  const getRelativeDate = (dateInput) => {
    if (!dateFormatService) {
      return fallbackFormatDate(dateInput);
    }
    return dateFormatService.getRelativeDate(dateInput);
  };

  const formatDateRange = (startDate, endDate, options = {}) => {
    if (!dateFormatService) {
      return `${fallbackFormatDate(startDate)} - ${fallbackFormatDate(endDate)}`;
    }
    return dateFormatService.formatDateRange(startDate, endDate, options);
  };

  return {
    formatDate,
    formatDateTime,
    formatTime,
    formatForInput,
    getRelativeDate,
    formatDateRange,
    // Direct access to service for advanced usage
    dateFormatService
  };
};

export default useDate;
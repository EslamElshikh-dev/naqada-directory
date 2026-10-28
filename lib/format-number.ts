export const NUMBER_LOCALE = 'ar-EG-u-nu-latn';
export const formatNumber = (value: number) => new Intl.NumberFormat(NUMBER_LOCALE).format(value);
export const formatDateTime = (value: Date | number) => new Intl.DateTimeFormat(NUMBER_LOCALE, {
  dateStyle: 'medium', timeStyle: 'short',
}).format(value);

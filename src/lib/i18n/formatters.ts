import type { FormattersInitializer } from 'typesafe-i18n';
import type { Locales, Formatters } from './i18n-types';
import { date, number } from 'typesafe-i18n/formatters';

export const initFormatters: FormattersInitializer<Locales, Formatters> = (locale: Locales) => {
	const currencyCode = locale === 'es' ? 'EUR' : 'USD';

	const formatters: Formatters = {
		shortDate: date(locale, { day: '2-digit', month: 'short', year: 'numeric' }) as any,
		dateTime: date(locale, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) as any,
		percent: number(locale, { style: 'percent', minimumFractionDigits: 2 }) as any,
		currency: number(locale, { style: 'currency', currency: currencyCode }) as any,
		compactNumber: number(locale, { notation: 'compact', maximumFractionDigits: 1 }) as any,
	};

	return formatters;
};

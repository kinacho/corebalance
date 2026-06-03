import type { FormattersInitializer } from 'typesafe-i18n';
import type { Locales, Formatters } from './i18n-types';
import { date, number } from 'typesafe-i18n/formatters';
import { ui } from '../stores/ui.svelte';

export const initFormatters: FormattersInitializer<Locales, Formatters> = (locale: Locales) => {
	const formatters: Formatters = {
		shortDate: date(locale, { day: '2-digit', month: 'short', year: 'numeric' }) as any,
		dateTime: date(locale, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) as any,
		percent: number(locale, { style: 'percent', minimumFractionDigits: 2 }) as any,
		currency: ((val: number) => {
			return new Intl.NumberFormat(locale === 'es' ? 'es-ES' : 'en-US', {
				style: 'currency',
				currency: ui.baseCurrency,
				minimumFractionDigits: 2,
				maximumFractionDigits: 2
			}).format(val);
		}) as any,
		compactNumber: number(locale, { notation: 'compact', maximumFractionDigits: 1 }) as any,
	};

	return formatters;
};

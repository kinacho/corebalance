import { describe, it, expect, vi } from 'vitest';
import { locales } from '../i18n/i18n-util';
import { detectLocale as detectLocaleFn } from 'typesafe-i18n/detectors';

// Mock de la lógica de hooks.server.ts
const getLocaleLogic = (langCookie: string | undefined, acceptLanguage: string | undefined): string => {
	// 1. Mirar cookie
	if (langCookie && (langCookie === 'es' || langCookie === 'en')) {
		return langCookie;
	}

	// 2. Mirar Accept-Language
    // Simulamos el detector
    const detector = () => [acceptLanguage].filter(Boolean) as string[];
	return detectLocaleFn('en', locales, detector);
};

describe('Language Detection Logic', () => {
	it('should return "es" if cookie is "es"', () => {
		expect(getLocaleLogic('es', 'en')).toBe('es');
	});

	it('should return "en" if cookie is "en"', () => {
		expect(getLocaleLogic('en', 'es')).toBe('en');
	});

	it('should return "es" if no cookie and browser is "es"', () => {
		expect(getLocaleLogic(undefined, 'es')).toBe('es');
	});

	it('should return "en" if no cookie and browser is "en"', () => {
		expect(getLocaleLogic(undefined, 'en')).toBe('en');
	});

	it('should return "en" (fallback) if no cookie and browser is "fr"', () => {
		expect(getLocaleLogic(undefined, 'fr')).toBe('en');
	});

	it('should return "en" (fallback) if no cookie and browser is empty', () => {
		expect(getLocaleLogic(undefined, undefined)).toBe('en');
	});
});

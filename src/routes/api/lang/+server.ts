import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies }) => {
	const { locale } = await request.json();

	if (locale && (locale === 'en' || locale === 'es')) {
		cookies.set('lang', locale, {
			path: '/',
			maxAge: 60 * 60 * 24 * 365, // 1 año
			sameSite: 'lax',
			httpOnly: false, // Permitimos acceso desde JS si fuera necesario, aunque el store es preferible
			secure: true
		});
		return json({ success: true });
	}

	return json({ success: false }, { status: 400 });
};

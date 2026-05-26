import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);

	// Security Headers
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('X-XSS-Protection', '1; mode=block');
	response.headers.set('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()');
	
	// FIX 2: HSTS
	response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
	
	// FIX 2: CSP
	const csp = [
		"default-src 'self'",
		"script-src 'self' 'unsafe-inline'",
		"connect-src 'self' *.firebaseio.com *.googleapis.com *.google.com",
		"img-src 'self' data: https:",
		"font-src 'self' https://fonts.gstatic.com",
		"style-src 'self' 'unsafe-inline'"
	].join('; ');
	
	response.headers.set('Content-Security-Policy', csp);

	return response;
};

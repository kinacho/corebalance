import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { Resend } from 'resend';
import { env } from '$env/dynamic/private';

const resend = new Resend(env.RESEND_API_KEY);

// Sencillo rate limiter en memoria
const recentRequests = new Map<string, number>();
const RATE_LIMIT_MS = 60000; // 1 minuto de cooldown

function escapeHtml(str: string): string {
	if (!str) return '';
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	const ip = getClientAddress();
	const now = Date.now();

	if (recentRequests.has(ip) && now - (recentRequests.get(ip) || 0) < RATE_LIMIT_MS) {
		return json({ error: 'Demasiadas solicitudes. Por favor espera un minuto.' }, { status: 429 });
	}

	try {
		const data = await request.json();
		const { type, email, subject, message, userAgent, timestamp } = data;

		if (!email || !subject || !message) {
			return json({ error: 'Faltan campos obligatorios' }, { status: 400 });
		}

		const cleanEmail = escapeHtml(email);
		const cleanSubject = escapeHtml(subject);
		const cleanMessage = escapeHtml(message);
		const cleanUserAgent = escapeHtml(userAgent);

		recentRequests.set(ip, now);

		await resend.emails.send({
			from: 'CoreBalance Soporte <onboarding@resend.dev>',
			to: env.SUPPORT_EMAIL || 'kino166@gmail.com',
			subject: `[${type.toUpperCase()}] ${cleanSubject}`,
			html: `
				<h2>Nuevo mensaje de ${type === 'bug' ? 'Bug Report' : 'Contacto'}</h2>
				<p><strong>De:</strong> ${cleanEmail}</p>
				<p><strong>Asunto:</strong> ${cleanSubject}</p>
				<p><strong>Mensaje:</strong><br>${cleanMessage.replace(/\n/g, '<br>')}</p>
				<hr />
				<p><small>Enviado desde CoreBalance App (${cleanUserAgent}) el ${timestamp}</small></p>
			`
		});

		return json({ success: true, message: 'Correo enviado correctamente' });
	} catch (error) {
		console.error('Error enviando email vía Resend:', error);
		return json({ error: 'Error interno al enviar el correo' }, { status: 500 });
	}
};

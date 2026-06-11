import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { Resend } from 'resend';
import { env } from '$env/dynamic/private';
import { checkRateLimit } from '$lib/server/rateLimit';
import { escapeHtml } from '$lib/utils';

const resend = new Resend(env.RESEND_API_KEY);

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	const ip = getClientAddress();
	
	const allowed = await checkRateLimit(ip, {
		limit: 1,
		windowSeconds: 60,
		prefix: 'support'
	});
	if (!allowed) {
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

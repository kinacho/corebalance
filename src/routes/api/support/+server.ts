import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { Resend } from 'resend';

const resend = new Resend('re_KBDyejrt_NPuoLznhUSwR8GfTKJ8NZChG');

// Sencillo rate limiter en memoria
const recentRequests = new Map<string, number>();
const RATE_LIMIT_MS = 60000; // 1 minuto de cooldown

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

		recentRequests.set(ip, now);

		await resend.emails.send({
			from: 'CoreBalance Soporte <onboarding@resend.dev>',
			to: 'kino166@gmail.com',
			subject: `[${type.toUpperCase()}] ${subject}`,
			html: `
				<h2>Nuevo mensaje de ${type === 'bug' ? 'Bug Report' : 'Contacto'}</h2>
				<p><strong>De:</strong> ${email}</p>
				<p><strong>Asunto:</strong> ${subject}</p>
				<p><strong>Mensaje:</strong><br>${message.replace(/\n/g, '<br>')}</p>
				<hr />
				<p><small>Enviado desde CoreBalance App (${userAgent}) el ${timestamp}</small></p>
			`
		});

		return json({ success: true, message: 'Correo enviado correctamente' });
	} catch (error) {
		console.error('Error enviando email vía Resend:', error);
		return json({ error: 'Error interno al enviar el correo' }, { status: 500 });
	}
};

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { Resend } from 'resend';
import { RESEND_API_KEY } from '$env/static/private';

// Inicializar Resend con la API Key cargada desde las variables de entorno
const resend = new Resend(RESEND_API_KEY);


export const POST: RequestHandler = async ({ request }) => {
	try {
		const data = await request.json();
		const { type, email, subject, message, userAgent, timestamp } = data;

		if (!email || !subject || !message) {
			return json({ error: 'Faltan campos obligatorios' }, { status: 400 });
		}

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

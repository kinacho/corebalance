<script lang="ts">
	import { fade, scale, fly } from 'svelte/transition';
	import { ui } from '$lib/stores/ui.svelte';
	import { portfolio } from '$lib/stores/portfolio.svelte';
	import { focusTrap } from '$lib/actions/focusTrap';

	let email = $state(portfolio.user?.email || '');
	let subject = $state('');
	let message = $state('');
	let isSending = $state(false);
	let isSuccess = $state(false);

	const type = $derived(ui.supportType);
	const title = $derived(type === 'bug' ? 'Reportar un error' : 'Contacto');
	const icon = $derived(type === 'bug' ? '🪲' : '✉️');

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!email || !subject || !message) {
			ui.addToast('Por favor, rellena todos los campos', 'error');
			return;
		}

		isSending = true;
		
		try {
			// Simulamos el envío o llamamos a una API futura
			// Por ahora, como no hay backend de correo configurado, 
			// avisamos que el envío simulado ha funcionado.
			
			const response = await fetch('/api/support', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					type,
					email,
					subject,
					message,
					userAgent: navigator.userAgent,
					timestamp: new Date().toISOString()
				})
			});

			if (response.ok) {
				isSuccess = true;
				ui.hapticFeedback('medium');
				setTimeout(() => {
					ui.showSupportModal = false;
					resetForm();
				}, 2000);
			} else {
				throw new Error('Error en el servidor');
			}
		} catch (error) {
			ui.addToast('Error al enviar el mensaje. Inténtalo de nuevo.', 'error');
		} finally {
			isSending = false;
		}
	}

	function resetForm() {
		subject = '';
		message = '';
		isSuccess = false;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') ui.showSupportModal = false;
	}
</script>

{#if ui.showSupportModal}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div 
		class="modal-backdrop" 
		transition:fade={{ duration: 200 }}
		onclick={() => ui.showSupportModal = false}
		onkeydown={handleKeydown}
	>
		<div 
			class="modal-container" 
			use:focusTrap
			transition:scale={{ duration: 300, start: 0.95 }}
			onclick={(e) => e.stopPropagation()}
		>
			<button class="btn-close" onclick={() => ui.showSupportModal = false} aria-label="Cerrar">
				<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2.5" fill="none">
					<line x1="18" y1="6" x2="6" y2="18"></line>
					<line x1="6" y1="6" x2="18" y2="18"></line>
				</svg>
			</button>

			{#if isSuccess}
				<div class="success-view" in:fly={{ y: 20, duration: 400 }}>
					<div class="success-icon">✨</div>
					<h3>¡Mensaje enviado!</h3>
					<p>Gracias por tu feedback. Nos pondremos en contacto contigo pronto en <strong>{email}</strong>.</p>
				</div>
			{:else}
				<div class="modal-header">
					<div class="header-icon">{icon}</div>
					<div class="header-text">
						<h2>{title}</h2>
						<p>Cuéntanos qué necesitas y te responderemos lo antes posible.</p>
					</div>
				</div>

				<form class="support-form" onsubmit={handleSubmit}>
					<div class="form-group">
						<label for="email">Tu Email</label>
						<input 
							type="email" 
							id="email" 
							bind:value={email} 
							placeholder="ejemplo@correo.com"
							required
							disabled={isSending}
						/>
					</div>

					<div class="form-group">
						<label for="subject">Asunto</label>
						<input 
							type="text" 
							id="subject" 
							bind:value={subject} 
							placeholder={type === 'bug' ? '¿Qué error has encontrado?' : '¿En qué podemos ayudarte?'}
							required
							disabled={isSending}
						/>
					</div>

					<div class="form-group">
						<label for="message">Descripción</label>
						<textarea 
							id="message" 
							bind:value={message} 
							placeholder={type === 'bug' ? 'Describe los pasos para reproducir el error...' : 'Escribe aquí tu mensaje...'}
							rows="5"
							required
							disabled={isSending}
						></textarea>
					</div>

					<button type="submit" class="btn-submit" disabled={isSending}>
						{#if isSending}
							<div class="spinner"></div>
							Enviando...
						{:else}
							Enviar mensaje
						{/if}
					</button>
				</form>
			{/if}
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.8);
		backdrop-filter: blur(8px);
		z-index: 2000;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1.5rem;
	}

	.modal-container {
		width: 100%;
		max-width: 500px;
		background: #0f0f1a;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 28px;
		position: relative;
		padding: 2.5rem;
		box-shadow: 0 30px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05);
	}

	.btn-close {
		position: absolute;
		top: 1.5rem;
		right: 1.5rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.5);
		width: 36px;
		height: 36px;
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn-close:hover {
		background: rgba(239, 68, 68, 0.1);
		color: #ef4444;
		border-color: rgba(239, 68, 68, 0.2);
	}

	.modal-header {
		display: flex;
		gap: 1.25rem;
		margin-bottom: 2rem;
		align-items: center;
	}

	.header-icon {
		font-size: 2.5rem;
		background: rgba(255, 255, 255, 0.03);
		width: 64px;
		height: 64px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 18px;
		border: 1px solid rgba(255, 255, 255, 0.08);
	}

	.header-text h2 {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 800;
		letter-spacing: -0.02em;
	}

	.header-text p {
		margin: 0.25rem 0 0;
		font-size: 0.9rem;
		color: rgba(160, 160, 200, 0.6);
		line-height: 1.4;
	}

	.support-form {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.form-group label {
		font-size: 0.85rem;
		font-weight: 700;
		color: rgba(255, 255, 255, 0.4);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-left: 0.25rem;
	}

	input, textarea {
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 14px;
		padding: 0.85rem 1rem;
		color: #fff;
		font-family: inherit;
		font-size: 1rem;
		transition: all 0.2s;
	}

	input:focus, textarea:focus {
		outline: none;
		border-color: #3b82f6;
		background: rgba(59, 130, 246, 0.05);
		box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
	}

	.btn-submit {
		margin-top: 0.5rem;
		background: #3b82f6;
		color: white;
		border: none;
		border-radius: 16px;
		padding: 1rem;
		font-size: 1rem;
		font-weight: 800;
		cursor: pointer;
		transition: all 0.2s;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
	}

	.btn-submit:hover:not(:disabled) {
		background: #2563eb;
		transform: translateY(-2px);
		box-shadow: 0 8px 20px rgba(59, 130, 246, 0.3);
	}

	.btn-submit:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.success-view {
		text-align: center;
		padding: 2rem 0;
	}

	.success-icon {
		font-size: 4rem;
		margin-bottom: 1.5rem;
	}

	.success-view h3 {
		font-size: 1.75rem;
		font-weight: 800;
		margin-bottom: 0.75rem;
	}

	.success-view p {
		color: rgba(160, 160, 200, 0.7);
		line-height: 1.6;
	}

	.spinner {
		width: 18px;
		height: 18px;
		border: 3px solid rgba(255, 255, 255, 0.3);
		border-top-color: #fff;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	@media (max-width: 480px) {
		.modal-container {
			padding: 1.75rem;
		}
		
		.header-icon {
			width: 48px;
			height: 48px;
			font-size: 1.75rem;
		}
	}
</style>
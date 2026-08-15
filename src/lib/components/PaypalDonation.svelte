<script lang="ts">
	import { LL } from '$lib/i18n/i18n-svelte';
	let { username = "kinacho" } = $props();
	
	const amounts = [5, 10, 20];
</script>

<div class="donation-container">
	<span class="donation-label">{$LL.donation.title()}</span>
	<div class="donation-options">
		{#each amounts as amount}
			<a
				href="https://paypal.me/{username}/{amount}EUR"
				target="_blank"
				rel="noopener noreferrer"
				class="amount-chip glass"
				title={$LL.donation.tooltip_amount({ amount })}
			>
				{amount}€
			</a>
		{/each}

		<a
			href="https://paypal.me/{username}"
			target="_blank"
			rel="noopener noreferrer"
			class="paypal-btn glass"
			title={$LL.donation.tooltip_other()}
		>			<div class="paypal-icon">
				<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
					<path d="M20.067 8.478c.492.88.556 2.014.307 3.232-.405 1.966-1.66 3.851-3.447 4.701-.938.447-2.012.572-3.289.572h-1.604c-.33 0-.583.235-.644.554l-1.055 5.485c-.032.164-.175.281-.343.281h-2.316c-.225 0-.391-.202-.352-.423l1.108-6.196c.032-.164.175-.281.343-.281h.631c2.19 0 3.791-.603 4.468-2.57.27-.783.254-1.442.015-1.921-.265-.532-.83-.873-1.642-1.012l.142-.746c1.472.062 2.378.508 2.877 1.407zm-5.011-5.467c-.23 1.25-.863 2.502-1.854 3.424-.967.904-2.222 1.488-3.486 1.488h-1.55c-.328 0-.583.235-.644.554l-.841 4.372-1.055 5.485c-.032.164-.175.281-.343.281h-2.316c-.225 0-.391-.202-.352-.423l2.251-12.441c.03-.166.175-.283.344-.283h4.636c1.282 0 2.257.348 2.898 1.042.667.72.842 1.702.611 2.501z"/>
				</svg>
			</div>
			<span>{$LL.donation.btn_other()}</span>
		</a>
	</div>
</div>

<style>
	.donation-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.6rem;
		padding: 0.5rem;
	}

	.donation-label {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--text-faint);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.donation-options {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.amount-chip {
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 3.5rem;
		padding: 0.5rem 0.75rem;
		background: rgba(16, 185, 129, 0.08);
		border: 1px solid rgba(16, 185, 129, 0.2);
		border-radius: 12px;
		color: var(--accent-green-ink);
		font-size: 0.85rem;
		font-weight: 700;
		text-decoration: none;
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.amount-chip:hover {
		background: rgba(16, 185, 129, 0.15);
		border-color: var(--accent-green);
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(16, 185, 129, 0.1);
	}

	.paypal-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		background: rgba(0, 112, 186, 0.08);
		border: 1px solid rgba(0, 112, 186, 0.2);
		border-radius: 12px;
		color: #4aa8e0;
		font-size: 0.85rem;
		font-weight: 700;
		text-decoration: none;
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.paypal-btn:hover {
		background: rgba(0, 112, 186, 0.15);
		border-color: #0070ba;
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 112, 186, 0.1);
	}

	.paypal-btn:active, .amount-chip:active {
		transform: translateY(0) scale(0.95);
	}

	.paypal-icon {
		display: flex;
		align-items: center;
	}
</style>

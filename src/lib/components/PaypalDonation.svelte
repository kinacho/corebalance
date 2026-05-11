<script lang="ts">
	let { username = "kinacho" } = $props();
</script>

<a 
	href="https://paypal.me/{username}" 
	target="_blank" 
	rel="noopener noreferrer" 
	class="paypal-btn glass"
>
	<div class="paypal-icon">
		<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
			<path d="M20.067 8.478c.492.88.556 2.014.307 3.232-.405 1.966-1.66 3.851-3.447 4.701-.938.447-2.012.572-3.289.572h-1.604c-.33 0-.583.235-.644.554l-1.055 5.485c-.032.164-.175.281-.343.281h-2.316c-.225 0-.391-.202-.352-.423l1.108-6.196c.032-.164.175-.281.343-.281h.631c2.19 0 3.791-.603 4.468-2.57.27-.783.254-1.442.015-1.921-.265-.532-.83-.873-1.642-1.012l.142-.746c1.472.062 2.378.508 2.877 1.407zm-5.011-5.467c-.23 1.25-.863 2.502-1.854 3.424-.967.904-2.222 1.488-3.486 1.488h-1.55c-.328 0-.583.235-.644.554l-.841 4.372-1.055 5.485c-.032.164-.175.281-.343.281h-2.316c-.225 0-.391-.202-.352-.423l2.251-12.441c.03-.166.175-.283.344-.283h4.636c1.282 0 2.257.348 2.898 1.042.667.72.842 1.702.611 2.501z"/>
		</svg>
	</div>
	<span class="btn-text">Apoyar proyecto</span>
</a>

<style>
	.paypal-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.8rem;
		padding: 0.65rem 1.4rem;
		background: rgba(0, 112, 186, 0.1);
		border: 1px solid rgba(0, 112, 186, 0.25);
		border-radius: 50px;
		color: #0070ba;
		font-size: 0.85rem;
		font-weight: 700;
		text-decoration: none;
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
	}

	.paypal-btn:hover {
		background: rgba(0, 112, 186, 0.2);
		border-color: rgba(0, 112, 186, 0.4);
		color: #00a2ff;
		transform: translateY(-2px);
		box-shadow: 0 8px 25px rgba(0, 112, 186, 0.15);
	}

	.paypal-btn:active {
		transform: translateY(0) scale(0.95);
	}

	.paypal-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		filter: drop-shadow(0 0 5px rgba(0, 112, 186, 0.3));
	}

	.btn-text {
		letter-spacing: 0.01em;
	}
</style>

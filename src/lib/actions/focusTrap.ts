export function focusTrap(node: HTMLElement) {
	const focusableElements = node.querySelectorAll(
		'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select, [tabindex]:not([tabindex="-1"])'
	);
	
	if (focusableElements.length === 0) return;

	const firstFocusableElement = focusableElements[0] as HTMLElement;
	const lastFocusableElement = focusableElements[focusableElements.length - 1] as HTMLElement;

	function handleKeyDown(e: KeyboardEvent) {
		const isTabPressed = e.key === 'Tab' || e.keyCode === 9;

		if (!isTabPressed) {
			return;
		}

		if (e.shiftKey) { 
			// Si hace Shift + Tab
			if (document.activeElement === firstFocusableElement) {
				lastFocusableElement.focus();
				e.preventDefault();
			}
		} else { 
			// Si hace Tab
			if (document.activeElement === lastFocusableElement) {
				firstFocusableElement.focus();
				e.preventDefault();
			}
		}
	}

	node.addEventListener('keydown', handleKeyDown);
	
	// Autofocus primer elemento si es posible (no en movil para no abrir teclado)
	if (window.innerWidth >= 1024) {
		firstFocusableElement.focus();
	}

	return {
		destroy() {
			node.removeEventListener('keydown', handleKeyDown);
		}
	};
}

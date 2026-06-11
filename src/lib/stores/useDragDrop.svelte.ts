import { ui } from '$lib/stores/ui.svelte';
import type { AssetCategory } from '$lib/types';

export function createDragDropManager(options: {
	onAssetMoved: (ticker: string, newCategory: AssetCategory) => void;
	getTranslation: (key: string) => string;
}) {
	let scrollContainer = $state<HTMLElement | null>(null);
	let dragScrollInterval = $state<any>(null);
	
	let activeTouchTicker = $state<string | null>(null);
	let activeTouchItem = $state<HTMLElement | null>(null);
	let touchGhost = $state<HTMLElement | null>(null);
	let touchTargetSectionId = $state<AssetCategory | null>(null);

	function handleScrollDragOver(e: DragEvent) {
		if (!scrollContainer) return;
		
		const rect = scrollContainer.getBoundingClientRect();
		const y = e.clientY - rect.top;
		const containerHeight = rect.height;
		
		const threshold = 70; // 70px scroll boundary
		
		clearInterval(dragScrollInterval);
		dragScrollInterval = null;
		
		if (y < threshold) {
			const speed = Math.max(3, (threshold - y) / 1.2);
			dragScrollInterval = setInterval(() => {
				if (scrollContainer) scrollContainer.scrollTop -= speed;
			}, 16);
		} else if (y > containerHeight - threshold) {
			const speed = Math.max(3, (y - (containerHeight - threshold)) / 1.2);
			dragScrollInterval = setInterval(() => {
				if (scrollContainer) scrollContainer.scrollTop += speed;
			}, 16);
		}
	}

	function handleDragEnd() {
		clearInterval(dragScrollInterval);
		dragScrollInterval = null;
	}

	function handleTouchStart(e: TouchEvent, ticker: string) {
		const target = e.currentTarget as HTMLElement;
		const item = target.closest('.asset-item') as HTMLElement;
		if (!item) return;

		activeTouchTicker = ticker;
		activeTouchItem = item;

		const rect = item.getBoundingClientRect();
		
		touchGhost = document.createElement('div');
		touchGhost.className = 'touch-drag-ghost';
		
		const iconEl = target.querySelector('.asset-icon')?.outerHTML || '';
		const infoEl = target.querySelector('.asset-info')?.outerHTML || '';
		
		touchGhost.innerHTML = `
			<div style="display: flex; align-items: center; gap: 0.8rem; padding: 0.75rem 1rem;">
				${iconEl}
				${infoEl}
			</div>
		`;
		
		touchGhost.style.position = 'fixed';
		touchGhost.style.top = `${rect.top}px`;
		touchGhost.style.left = `${rect.left}px`;
		touchGhost.style.width = `${rect.width}px`;
		touchGhost.style.opacity = '0.9';
		touchGhost.style.pointerEvents = 'none';
		touchGhost.style.zIndex = '9999';
		touchGhost.style.background = 'rgba(25, 25, 40, 0.95)';
		touchGhost.style.border = '2.5px solid var(--accent, #3b82f6)';
		touchGhost.style.borderRadius = '16px';
		touchGhost.style.boxShadow = '0 15px 35px rgba(0,0,0,0.6)';
		touchGhost.style.transform = 'scale(0.98)';
		
		const accent = item.style.getPropertyValue('--accent');
		if (accent) touchGhost.style.setProperty('--accent', accent);

		document.body.appendChild(touchGhost);
		item.classList.add('dragging');
		
		ui.hapticFeedback('light');
	}

	function handleTouchMove(e: TouchEvent) {
		if (!activeTouchTicker || !touchGhost || !scrollContainer) return;
		
		const touch = e.touches[0];
		
		const ghostRect = touchGhost.getBoundingClientRect();
		touchGhost.style.top = `${touch.clientY - ghostRect.height / 2}px`;
		touchGhost.style.left = `${touch.clientX - ghostRect.width / 2}px`;

		const scrollRect = scrollContainer.getBoundingClientRect();
		const y = touch.clientY - scrollRect.top;
		const threshold = 70;
		
		clearInterval(dragScrollInterval);
		dragScrollInterval = null;
		
		if (y < threshold) {
			const speed = Math.max(3, (threshold - y) / 1.2);
			dragScrollInterval = setInterval(() => {
				if (scrollContainer) scrollContainer.scrollTop -= speed;
			}, 16);
		} else if (y > scrollRect.height - threshold) {
			const speed = Math.max(3, (y - (scrollRect.height - threshold)) / 1.2);
			dragScrollInterval = setInterval(() => {
				if (scrollContainer) scrollContainer.scrollTop += speed;
			}, 16);
		}

		const elements = document.elementsFromPoint(touch.clientX, touch.clientY);
		const sectionBlock = elements.find(el => el.classList.contains('section-block')) as HTMLElement;
		
		const allSections = document.querySelectorAll('.section-block');
		allSections.forEach(sec => sec.classList.remove('drag-over'));
		
		if (sectionBlock) {
			sectionBlock.classList.add('drag-over');
			const sectionId = sectionBlock.getAttribute('data-section-id') as AssetCategory;
			touchTargetSectionId = sectionId;
		} else {
			touchTargetSectionId = null;
		}
	}

	function handleTouchEnd() {
		clearInterval(dragScrollInterval);
		dragScrollInterval = null;

		if (touchGhost) {
			touchGhost.remove();
			touchGhost = null;
		}

		if (activeTouchItem) {
			activeTouchItem.classList.remove('dragging');
			activeTouchItem = null;
		}

		const allSections = document.querySelectorAll('.section-block');
		allSections.forEach(sec => sec.classList.remove('drag-over'));

		if (activeTouchTicker && touchTargetSectionId) {
			options.onAssetMoved(activeTouchTicker, touchTargetSectionId);
			ui.addToast(options.getTranslation('asset_reclassified'), 'success');
			ui.hapticFeedback('medium');
		}

		activeTouchTicker = null;
		touchTargetSectionId = null;
	}

	function cleanup() {
		clearInterval(dragScrollInterval);
		if (touchGhost) {
			touchGhost.remove();
			touchGhost = null;
		}
	}

	return {
		get scrollContainer() { return scrollContainer; },
		set scrollContainer(val) { scrollContainer = val; },
		get activeTouchTicker() { return activeTouchTicker; },
		handleScrollDragOver,
		handleDragEnd,
		handleTouchStart,
		handleTouchMove,
		handleTouchEnd,
		cleanup
	};
}

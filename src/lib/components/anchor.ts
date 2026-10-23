import type { Attachment } from 'svelte/attachments';

const GAP = 6;

/**
 * Positions a `popover` element next to its trigger while open, flipping above
 * when there is no room below. Used until CSS anchor positioning is Baseline.
 */
export function anchorTo(getTrigger: () => HTMLElement | undefined): Attachment<HTMLElement> {
	return (popover) => {
		function place() {
			const trigger = getTrigger();
			if (!trigger) return;
			const anchor = trigger.getBoundingClientRect();
			const box = popover.getBoundingClientRect();
			const below = anchor.bottom + GAP;
			const top =
				below + box.height > window.innerHeight && anchor.top - GAP - box.height > 0
					? anchor.top - GAP - box.height
					: below;
			const left = Math.min(Math.max(GAP, anchor.left), window.innerWidth - box.width - GAP);
			popover.style.top = `${top}px`;
			popover.style.left = `${left}px`;
		}

		function onToggle(event: Event) {
			if ((event as ToggleEvent).newState !== 'open') return;
			place();
			window.addEventListener('scroll', place, { passive: true, capture: true });
			window.addEventListener('resize', place, { passive: true });
		}

		function onClose(event: Event) {
			if ((event as ToggleEvent).newState !== 'closed') return;
			window.removeEventListener('scroll', place, { capture: true });
			window.removeEventListener('resize', place);
		}

		popover.addEventListener('toggle', onToggle);
		popover.addEventListener('toggle', onClose);
		return () => {
			popover.removeEventListener('toggle', onToggle);
			popover.removeEventListener('toggle', onClose);
			window.removeEventListener('scroll', place, { capture: true });
			window.removeEventListener('resize', place);
		};
	};
}

import type { Attachment } from 'svelte/attachments';
import { prefersReducedMotion } from 'svelte/motion';

/** Calls `onEnter` the first time the element meets the observer options, then stops watching. */
export function onceInView(
	element: Element,
	onEnter: () => void,
	options: IntersectionObserverInit = {}
): () => void {
	const observer = new IntersectionObserver((entries) => {
		if (!entries.some((entry) => entry.isIntersecting)) return;
		observer.disconnect();
		onEnter();
	}, options);
	observer.observe(element);
	return () => {
		observer.disconnect();
	};
}

/**
 * Fades and lifts an element in the first time it scrolls into view. Elements
 * already on screen at mount, and every element under reduced motion, are left
 * alone, so server-rendered content never blinks or hides without JavaScript.
 */
export const reveal: Attachment<HTMLElement> = (element) => {
	if (prefersReducedMotion.current) return;
	if (element.getBoundingClientRect().top < window.innerHeight) return;
	element.dataset.reveal = 'pending';
	return onceInView(
		element,
		() => {
			element.dataset.reveal = 'shown';
		},
		{ rootMargin: '0px 0px -10% 0px' }
	);
};

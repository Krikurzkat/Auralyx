import { PropsWithChildren, useEffect } from 'react';
import { gsap } from 'gsap';

const INTERACTIVE_SELECTOR = [
  'button:not(:disabled)',
  'a[href]',
  '[role="button"]:not([aria-disabled="true"])',
  '.cursor-pointer',
  '[data-gsap-click]',
].join(',');

type InteractionState = {
  hovered: boolean;
  focused: boolean;
  pressed: boolean;
};

const interactionStates = new WeakMap<HTMLElement, InteractionState>();
const pressedElements = new Set<HTMLElement>();

function getInteractionState(element: HTMLElement) {
  const existing = interactionStates.get(element);
  if (existing) return existing;

  const initialState: InteractionState = {
    hovered: false,
    focused: false,
    pressed: false,
  };
  interactionStates.set(element, initialState);
  return initialState;
}

function isIgnoredElement(element: HTMLElement) {
  if (element.closest('[data-gsap-ignore]')) return true;

  if (element instanceof HTMLInputElement) {
    return !['button', 'submit', 'reset', 'checkbox', 'radio'].includes(element.type);
  }

  return false;
}

function resolveInteractiveElement(target: EventTarget | null) {
  if (!(target instanceof Element)) return null;

  const interactiveElement = target.closest(INTERACTIVE_SELECTOR);
  if (!(interactiveElement instanceof HTMLElement)) return null;
  if (isIgnoredElement(interactiveElement)) return null;

  return interactiveElement;
}

function animateElement(element: HTMLElement) {
  const state = getInteractionState(element);
  const isActive = state.hovered || state.focused;

  gsap.killTweensOf(element);

  if (state.pressed) {
    gsap.to(element, {
      scale: 0.975,
      y: 0,
      filter: 'brightness(0.96)',
      duration: 0.12,
      ease: 'power2.out',
      overwrite: 'auto',
      force3D: true,
    });
    return;
  }

  if (isActive) {
    gsap.to(element, {
      scale: 1.015,
      y: -2,
      filter: 'brightness(1.08)',
      duration: 0.18,
      ease: 'power2.out',
      overwrite: 'auto',
      force3D: true,
    });
    return;
  }

  gsap.to(element, {
    scale: 1,
    y: 0,
    filter: 'brightness(1)',
    duration: 0.22,
    ease: 'power3.out',
    overwrite: 'auto',
    force3D: true,
    clearProps: 'filter',
  });
}

function setHovered(element: HTMLElement | null, hovered: boolean) {
  if (!element) return;
  const state = getInteractionState(element);
  state.hovered = hovered;
  if (!hovered) state.pressed = false;
  animateElement(element);
}

function setFocused(element: HTMLElement | null, focused: boolean) {
  if (!element) return;
  const state = getInteractionState(element);
  state.focused = focused;
  if (!focused) state.pressed = false;
  animateElement(element);
}

function setPressed(element: HTMLElement | null, pressed: boolean) {
  if (!element) return;
  const state = getInteractionState(element);
  state.pressed = pressed;
  if (pressed) {
    pressedElements.add(element);
  } else {
    pressedElements.delete(element);
  }
  animateElement(element);
}

export default function GlobalInteractionEffects({ children }: PropsWithChildren) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const handlePointerOver = (event: PointerEvent) => {
      const nextElement = resolveInteractiveElement(event.target);
      const previousElement = resolveInteractiveElement(event.relatedTarget);
      if (!nextElement || nextElement === previousElement) return;
      setHovered(nextElement, true);
    };

    const handlePointerOut = (event: PointerEvent) => {
      const currentElement = resolveInteractiveElement(event.target);
      const nextElement = resolveInteractiveElement(event.relatedTarget);
      if (!currentElement || currentElement === nextElement) return;
      setHovered(currentElement, false);
    };

    const handlePointerDown = (event: PointerEvent) => {
      const element = resolveInteractiveElement(event.target);
      if (!element) return;
      setPressed(element, true);
    };

    const releasePressedElements = () => {
      Array.from(pressedElements).forEach((element) => setPressed(element, false));
    };

    const handleFocusIn = (event: FocusEvent) => {
      setFocused(resolveInteractiveElement(event.target), true);
    };

    const handleFocusOut = (event: FocusEvent) => {
      setFocused(resolveInteractiveElement(event.target), false);
    };

    document.addEventListener('pointerover', handlePointerOver);
    document.addEventListener('pointerout', handlePointerOut);
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('pointerup', releasePressedElements);
    document.addEventListener('pointercancel', releasePressedElements);
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);
    window.addEventListener('blur', releasePressedElements);

    return () => {
      document.removeEventListener('pointerover', handlePointerOver);
      document.removeEventListener('pointerout', handlePointerOut);
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('pointerup', releasePressedElements);
      document.removeEventListener('pointercancel', releasePressedElements);
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
      window.removeEventListener('blur', releasePressedElements);
      releasePressedElements();
    };
  }, []);

  return <>{children}</>;
}

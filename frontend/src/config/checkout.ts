// Must match the backend's CHECKOUT_FLOW. Off by default: card checkout uses the legacy one-step charge.
export const CARD_CHECKOUT_FLOW: 'legacy' | 'manual_capture' =
  import.meta.env.VITE_CHECKOUT_FLOW === 'manual_capture' ? 'manual_capture' : 'legacy';

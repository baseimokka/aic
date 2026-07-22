/**
 * Sticky WhatsApp CTA (PRD §20, Phase 1 = wa.me deep link only).
 * 60px FAB with a green glow; logical inset so it mirrors in RTL.
 */
export function WhatsAppButton({
  phone = "201221416299",
  message = "Hello AIC Travel, I'd like to ask about a tour.",
}: {
  phone?: string;
  message?: string;
}) {
  const href = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contact us on WhatsApp"
      className="fixed bottom-5 end-5 z-50 flex h-[60px] w-[60px] items-center justify-center rounded-full bg-whatsapp text-white shadow-[0_8px_20px_rgba(37,211,102,0.45)] transition-transform hover:scale-105"
    >
      <svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor" aria-hidden>
        <path d="M17.5 14.4c-.3-.1-1.7-.8-1.9-.9-.3-.1-.5-.1-.7.1-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-1.7-.9-2.9-1.6-4-3.5-.3-.5.3-.5.8-1.5.1-.2 0-.4 0-.5s-.7-1.6-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.1 3.2 5.1 4.5 1.9.8 2.6.9 3.5.7.6-.1 1.7-.7 1.9-1.3.2-.7.2-1.2.2-1.3-.1-.2-.3-.2-.6-.4z" />
        <path d="M12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.5A10 10 0 1 0 12 2zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-2.9.9.9-2.8-.2-.3A8 8 0 1 1 12 20z" />
      </svg>
    </a>
  );
}

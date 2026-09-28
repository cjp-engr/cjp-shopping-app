import type { FC } from 'react';

interface Props {
  brand?: string;
  className?: string;
}

export const CardBrandIcon: FC<Props> = ({ brand, className = 'h-8 w-12' }) => {
  const b = brand?.toLowerCase();

  if (b === 'visa') return (
    <svg className={className} viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Visa">
      <rect width="48" height="32" rx="4" fill="#1A1F71"/>
      <text x="7" y="23" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="16" fill="#FFFFFF" letterSpacing="0">VISA</text>
    </svg>
  );

  if (b === 'mastercard') return (
    <svg className={className} viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Mastercard">
      <rect width="48" height="32" rx="4" fill="#252525"/>
      <circle cx="19" cy="16" r="10" fill="#EB001B"/>
      <circle cx="29" cy="16" r="10" fill="#F79E1B"/>
      <path d="M24 8.54a10 10 0 0 1 0 14.92A10 10 0 0 1 24 8.54z" fill="#FF5F00"/>
    </svg>
  );

  if (b === 'amex' || b === 'american_express') return (
    <svg className={className} viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="American Express">
      <rect width="48" height="32" rx="4" fill="#2E77BC"/>
      <text x="5" y="22" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="10" fill="#FFFFFF" letterSpacing="0.5">AMERICAN</text>
      <text x="5" y="30" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="10" fill="#FFFFFF" letterSpacing="0.5">EXPRESS</text>
    </svg>
  );

  if (b === 'discover') return (
    <svg className={className} viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Discover">
      <rect width="48" height="32" rx="4" fill="#FFFFFF" stroke="#E5E7EB"/>
      <text x="5" y="21" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="9" fill="#231F20">DISCOVER</text>
      <circle cx="36" cy="16" r="8" fill="#F76F20"/>
    </svg>
  );

  if (b === 'unionpay') return (
    <svg className={className} viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="UnionPay">
      <rect width="48" height="32" rx="4" fill="#E21836"/>
      <rect x="18" y="0" width="30" height="32" rx="4" fill="#00447C"/>
      <rect x="15" y="0" width="18" height="32" fill="#FFFFFF"/>
      <text x="6" y="21" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="8" fill="#FFFFFF">UP</text>
    </svg>
  );

  // Generic card fallback
  return (
    <svg className={className} viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Card">
      <rect width="48" height="32" rx="4" fill="#6B7280"/>
      <rect x="4" y="10" width="10" height="8" rx="1" fill="#FCD34D"/>
      <rect x="4" y="22" width="16" height="2" rx="1" fill="rgba(255,255,255,0.5)"/>
      <rect x="24" y="22" width="8" height="2" rx="1" fill="rgba(255,255,255,0.5)"/>
    </svg>
  );
};

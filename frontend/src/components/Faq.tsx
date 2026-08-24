import type { ReactNode } from 'react';

export default function Faq({ children }: { children: ReactNode }) {
  return (
    <details className="faq-details">
      <summary>Cos'è e come è calcolato?</summary>
      <p>{children}</p>
    </details>
  );
}

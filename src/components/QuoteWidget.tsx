"use client";

import React, { useState, useEffect } from 'react';

const SWAMI_QUOTES = [
  { text: "Arise, awake, and stop not till the goal is reached.", context: "Universal call for spiritual and physical strength" },
  { text: "Atmano mokshartham jagat hitaya cha.", context: "For one's own salvation and for the welfare of the world" },
  { text: "Tamas ma jyotirgamaya.", context: "Lead me from darkness to light" },
  { text: "They alone live, who live for others, the rest are more dead than alive.", context: "Ideal of selfless service" },
  { text: "Character has to be established through a thousand stumbles.", context: "Ideal of resilience and moral growth" },
  { text: "Truth can be stated in a thousand different ways, yet each one can be true.", context: "Ideal of spiritual harmony" },
  { text: "Education is the manifestation of the perfection already in man.", context: "Core educational philosophy of Vidyapith" }
];

export const QuoteWidget: React.FC = () => {
  const [index, setIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % SWAMI_QUOTES.length);
        setFade(true);
      }, 300);
    }, 10000);

    return () => clearInterval(timer);
  }, []);

  const quote = SWAMI_QUOTES[index];

  return (
    <div className="glass-panel quote-widget" style={{
      padding: '20px 24px',
      borderRadius: 'var(--border-radius-md)',
      background: 'linear-gradient(135deg, rgba(243, 112, 33, 0.05) 0%, rgba(18, 33, 56, 0.8) 100%)',
      borderLeft: '4px solid var(--primary-color)',
      marginBottom: '28px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{
        opacity: fade ? 1 : 0,
        transform: fade ? 'translateY(0)' : 'translateY(8px)',
        transition: 'all 0.3s ease',
      }}>
        <p style={{
          fontFamily: 'Georgia, serif',
          fontSize: '1.1rem',
          fontStyle: 'italic',
          color: 'var(--text-primary)',
          lineHeight: '1.6',
          marginBottom: '8px'
        }}>
          "{quote.text}"
        </p>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.75rem'
        }}>
          <span style={{ color: 'var(--accent-gold)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            — Swami Vivekananda
          </span>
          <span style={{ color: 'var(--text-muted)' }}>
            {quote.context}
          </span>
        </div>
      </div>
      <span style={{
        position: 'absolute',
        bottom: '-12px',
        right: '12px',
        fontSize: '4.5rem',
        opacity: 0.04,
        fontFamily: 'serif',
        lineHeight: 1,
        pointerEvents: 'none',
        userSelect: 'none'
      }}>
        🏵️
      </span>
    </div>
  );
};

/**
 * MetaChronos Guided Tour
 * ========================
 * Auto-walks the user through all 6 features on first visit.
 * Uses a spotlight + tooltip overlay — no external library needed.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ChevronRight, ChevronLeft, Zap } from 'lucide-react';

export interface TourStep {
  route: string;
  targetId?: string;       // element id to spotlight (optional)
  title: string;
  description: string;
  emoji: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: string;         // optional CTA label
}

const TOUR_STEPS: TourStep[] = [
  {
    route: '/',
    title: 'Welcome to MetaChronos ⏳',
    emoji: '👋',
    description:
      'MetaChronos is a temporal intelligence platform built on OpenMetadata. ' +
      'It lets you time-travel through your metadata history, calculate blast radius before breaking changes, ' +
      'and get AI-powered root-cause analysis — all for free.',
    position: 'center',
    action: 'Start the tour',
  },
  {
    route: '/assets',
    targetId: 'tour-assets',
    title: 'Asset Explorer',
    emoji: '🗄️',
    description:
      'Browse every table, dashboard, pipeline and topic from OpenMetadata sandbox. ' +
      'Search by name, filter by type, and copy a UUID — you\'ll need it for the next steps.',
    position: 'bottom',
    action: 'Next',
  },
  {
    route: '/timeline',
    targetId: 'tour-timeline',
    title: 'Time Travel — Timeline',
    emoji: '⏱',
    description:
      'Paste any entity UUID to see its complete change history. ' +
      'Every schema edit, owner change, and tag update is recorded. ' +
      'Pick two versions and compare them with a live schema diff.',
    position: 'bottom',
    action: 'Next',
  },
  {
    route: '/lineage',
    targetId: 'tour-lineage',
    title: 'Lineage Graph',
    emoji: '🕸️',
    description:
      'See every upstream source and downstream consumer in an interactive graph. ' +
      'Drag nodes, zoom in, and click any node to highlight its connections.',
    position: 'bottom',
    action: 'Next',
  },
  {
    route: '/impact',
    targetId: 'tour-impact',
    title: 'Blast Radius Calculator',
    emoji: '💥',
    description:
      'Before breaking a schema, know exactly what will break downstream. ' +
      'MetaChronos scores every impacted asset by criticality: Critical 🔴, Warning 🟡, Low 🟢.',
    position: 'bottom',
    action: 'Next',
  },
  {
    route: '/governance',
    targetId: 'tour-governance',
    title: 'Governance & Compliance',
    emoji: '🛡️',
    description:
      'See which assets are missing owners, descriptions, tags or domains. ' +
      'Every tagging event, ownership transfer and PII classification is tracked in the audit trail.',
    position: 'bottom',
    action: 'Next',
  },
  {
    route: '/ai',
    targetId: 'tour-ai',
    title: 'AI Root-Cause Assistant',
    emoji: '🤖',
    description:
      'Ask anything in plain English. The AI uses real OpenMetadata change events — ' +
      'not hallucinations — to answer "Why did my pipeline break?" or "Who changed this column?".' +
      '\n\nPowered by Google Gemini (free) with OpenAI as fallback.',
    position: 'bottom',
    action: 'Finish tour 🎉',
  },
];

const STORAGE_KEY = 'mc_tour_done';

// ── Spotlight overlay ───────────────────────────────────────────────────────

function getRect(id?: string): DOMRect | null {
  if (!id) return null;
  const el = document.getElementById(id);
  return el ? el.getBoundingClientRect() : null;
}

// ── Tour component ───────────────────────────────────────────────────────────

interface Props {
  onDone: () => void;
}

export default function GuidedTour({ onDone }: Props) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [visible, setVisible] = useState(false);

  const current = TOUR_STEPS[step];

  // Navigate + update spotlight rect
  const updateStep = useCallback(
    (idx: number) => {
      const s = TOUR_STEPS[idx];
      navigate(s.route);
      setStep(idx);
      setRect(null);
      // wait for page to render
      setTimeout(() => {
        setRect(getRect(s.targetId));
        setVisible(true);
      }, 400);
    },
    [navigate],
  );

  useEffect(() => {
    updateStep(0);
  }, []); // eslint-disable-line

  function next() {
    if (step < TOUR_STEPS.length - 1) {
      updateStep(step + 1);
    } else {
      finish();
    }
  }

  function prev() {
    if (step > 0) updateStep(step - 1);
  }

  function finish() {
    localStorage.setItem(STORAGE_KEY, '1');
    onDone();
  }

  if (!visible) return null;

  const PAD = 12;
  const hasSpotlight = !!rect && current.position !== 'center';

  // Tooltip position
  let tooltipStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 10001,
    width: 360,
    background: 'var(--bg2)',
    border: '1px solid rgba(124,92,252,0.5)',
    borderRadius: 14,
    padding: '22px 24px',
    boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
  };

  if (hasSpotlight && rect) {
    const below = rect.bottom + PAD + 260 < window.innerHeight;
    tooltipStyle = {
      ...tooltipStyle,
      top: below ? rect.bottom + PAD : rect.top - 260 - PAD,
      left: Math.min(Math.max(rect.left, 16), window.innerWidth - 376),
    };
  } else {
    tooltipStyle = {
      ...tooltipStyle,
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    };
  }

  return (
    <>
      {/* Full-screen dim overlay */}
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(8,5,20,0.75)',
          backdropFilter: 'blur(2px)',
          pointerEvents: 'none',
        }}
      />

      {/* Spotlight cutout */}
      {hasSpotlight && rect && (
        <div
          style={{
            position: 'fixed', zIndex: 10000,
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            borderRadius: 10,
            boxShadow: '0 0 0 9999px rgba(8,5,20,0.75)',
            border: '2px solid rgba(124,92,252,0.7)',
            pointerEvents: 'none',
            animation: 'pulse-border 1.5s ease-in-out infinite',
          }}
        />
      )}

      {/* Tooltip card */}
      <div style={tooltipStyle}>
        {/* Close */}
        <button
          onClick={finish}
          style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4 }}
        >
          <X size={16} />
        </button>

        {/* Emoji + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 28 }}>{current.emoji}</span>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{current.title}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>
              Step {step + 1} of {TOUR_STEPS.length}
            </div>
          </div>
        </div>

        {/* Description */}
        <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.75, marginBottom: 20, whiteSpace: 'pre-line' }}>
          {current.description}
        </p>

        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 5, marginBottom: 16 }}>
          {TOUR_STEPS.map((_, i) => (
            <div
              key={i}
              onClick={() => updateStep(i)}
              style={{
                width: i === step ? 20 : 7, height: 7,
                borderRadius: 4,
                background: i === step ? 'var(--accent)' : 'var(--border)',
                cursor: 'pointer',
                transition: 'width 0.3s, background 0.2s',
              }}
            />
          ))}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between' }}>
          <button
            onClick={finish}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text3)', padding: 0 }}
          >
            Skip tour
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            {step > 0 && (
              <button className="btn btn-ghost" onClick={prev} style={{ padding: '7px 14px', fontSize: 13 }}>
                <ChevronLeft size={14} /> Back
              </button>
            )}
            <button className="btn btn-primary" onClick={next} style={{ padding: '7px 18px', fontSize: 13 }}>
              {current.action || 'Next'} {step < TOUR_STEPS.length - 1 ? <ChevronRight size={14} /> : <Zap size={14} />}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse-border {
          0%,100% { border-color: rgba(124,92,252,0.7); }
          50%      { border-color: rgba(56,189,248,0.9); }
        }
      `}</style>
    </>
  );
}

// ── Hook to decide whether to show tour ─────────────────────────────────────

export function useTour() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      // small delay so the app renders first
      const t = setTimeout(() => setShow(true), 600);
      return () => clearTimeout(t);
    }
  }, []);
  return { show, startTour: () => setShow(true), endTour: () => setShow(false) };
}

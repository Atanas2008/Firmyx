'use client';

import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

interface TourStep {
  targetId: string;
  title: string;
  description: string;
}

interface GuidedTourProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function GuidedTour({ onComplete, onSkip }: GuidedTourProps) {
  const { t } = useLanguage();
  const [currentStep, setCurrentStep] = useState(0);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number; width: number } | null>(null);

  const steps: TourStep[] = [
    {
      targetId: 'tour-decision-header',
      title: t.onboarding.tourStep1Title,
      description: t.onboarding.tourStep1Desc,
    },
    {
      targetId: 'tour-risk-drivers',
      title: t.onboarding.tourStep2Title,
      description: t.onboarding.tourStep2Desc,
    },
    {
      targetId: 'tour-recommendations',
      title: t.onboarding.tourStep3Title,
      description: t.onboarding.tourStep3Desc,
    },
  ];

  const positionTooltip = useCallback(() => {
    const step = steps[currentStep];
    if (!step) return;
    const el = document.getElementById(step.targetId);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const scrollY = window.scrollY;
    setTooltipPos({
      top: rect.top + scrollY + rect.height + 12,
      left: rect.left + rect.width / 2,
      width: rect.width,
    });
    // Scroll element into view
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [currentStep, steps]);

  useEffect(() => {
    // Small delay to let page render
    const timer = setTimeout(positionTooltip, 400);
    window.addEventListener('resize', positionTooltip);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', positionTooltip);
    };
  }, [positionTooltip]);

  function handleNext() {
    if (currentStep < steps.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      onComplete();
    }
  }

  const step = steps[currentStep];

  return (
    <>
      {/* Semi-transparent backdrop */}
      <div className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-[1px] pointer-events-auto" />

      {/* Highlight ring on target element */}
      <HighlightRing targetId={step.targetId} />

      {/* Tooltip */}
      {tooltipPos && (
        <div
          className="fixed z-[70] w-80 animate-fade-in-up"
          style={{
            top: tooltipPos.top,
            left: Math.max(16, Math.min(tooltipPos.left - 160, window.innerWidth - 336)),
          }}
        >
          <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-2xl p-5">
            {/* Progress */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex gap-1.5">
                {steps.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all ${
                      i === currentStep ? 'w-6 bg-blue-600' : i < currentStep ? 'w-3 bg-blue-300' : 'w-3 bg-gray-200 dark:bg-gray-700'
                    }`}
                  />
                ))}
              </div>
              <button
                onClick={onSkip}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X className="h-3 w-3" />
                {t.onboarding.skipTour}
              </button>
            </div>

            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-1">
              {step.title}
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              {step.description}
            </p>

            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-gray-400">
                {currentStep + 1} / {steps.length}
              </span>
              <button
                onClick={handleNext}
                className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                {currentStep < steps.length - 1 ? t.common.next : t.onboarding.finish}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function HighlightRing({ targetId }: { targetId: string }) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    function update() {
      const el = document.getElementById(targetId);
      if (el) setRect(el.getBoundingClientRect());
    }
    const timer = setTimeout(update, 400);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update);
    };
  }, [targetId]);

  if (!rect) return null;

  return (
    <div
      className="fixed z-[65] rounded-xl ring-4 ring-blue-500/50 pointer-events-none transition-all duration-300"
      style={{
        top: rect.top - 4,
        left: rect.left - 4,
        width: rect.width + 8,
        height: rect.height + 8,
      }}
    />
  );
}

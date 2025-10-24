import React, { useState, useLayoutEffect, useRef } from 'react';
import ReactDOM from 'react-dom';

export interface TourStep {
  target: string | { desktop: string; mobile: string };
  title: string;
  content: string;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

interface OnboardingTourProps {
  steps: TourStep[];
  onComplete: () => void;
  tourKey: string;
}

const OnboardingTour: React.FC<OnboardingTourProps> = ({ steps, onComplete, tourKey }) => {
    const [stepIndex, setStepIndex] = useState(0);
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    
    const currentStep = steps[stepIndex];

    const calculatePosition = () => {
        const getSelector = () => {
            if (!currentStep.target) return '';
            if (typeof currentStep.target === 'string') {
                return currentStep.target;
            }
            const isMobile = window.innerWidth < 768; // md breakpoint
            return isMobile ? currentStep.target.mobile : currentStep.target.desktop;
        };
        const selector = getSelector();

        if (!selector) {
            setTargetRect(null);
            return;
        }

        const element = document.querySelector(selector);
        if (element) {
            const rect = element.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                 setTargetRect(rect);
            } else {
                setTargetRect(null);
            }
        } else {
            console.warn(`Onboarding tour target not found: ${selector}`);
            setTargetRect(null); 
        }
    };

    useLayoutEffect(() => {
        calculatePosition();
        
        const handleResize = () => calculatePosition();
        window.addEventListener('resize', handleResize);
        window.addEventListener('scroll', handleResize, true);

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('scroll', handleResize, true);
        };
    }, [stepIndex, currentStep.target]);
    
    const handleNext = () => {
        if (stepIndex < steps.length - 1) {
            setStepIndex(stepIndex + 1);
        } else {
            handleComplete();
        }
    };

    const handlePrev = () => {
        if (stepIndex > 0) {
            setStepIndex(stepIndex - 1);
        }
    };

    const handleComplete = () => {
        localStorage.setItem(tourKey, 'true');
        onComplete();
    };

    const getTooltipPosition = () => {
        if (!tooltipRef.current) return {};
        const tooltipRect = tooltipRef.current.getBoundingClientRect();
        
        if (!targetRect) {
            return {
                top: `50%`,
                left: `50%`,
                transform: 'translate(-50%, -50%)',
            };
        }

        const placement = currentStep.placement || 'bottom';
        const gap = 16;
        let top = 0, left = 0;

        switch (placement) {
            case 'top':
                top = targetRect.top - tooltipRect.height - gap;
                left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
                break;
            case 'bottom':
                top = targetRect.bottom + gap;
                left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
                break;
            case 'left':
                top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
                left = targetRect.left - tooltipRect.width - gap;
                break;
            case 'right':
                top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
                left = targetRect.right + gap;
                break;
            default:
                // FIX: This handles 'center' placement. The original code was assigning string values to 'top' and 'left',
                // which were inferred as numbers, causing a type error. This now returns directly, correctly positioning
                // the tooltip in the center and skipping unnecessary boundary checks.
                return {
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                };
        }
        
        if (top < gap) top = gap;
        if (left < gap) left = gap;
        if (left + tooltipRect.width > window.innerWidth - gap) left = window.innerWidth - tooltipRect.width - gap;
        if (top + tooltipRect.height > window.innerHeight - gap) top = window.innerHeight - tooltipRect.height - gap;

        return { top: `${top}px`, left: `${left}px` };
    };

    const highlightStyle: React.CSSProperties = targetRect ? {
        position: 'fixed',
        top: `${targetRect.top - 4}px`,
        left: `${targetRect.left - 4}px`,
        width: `${targetRect.width + 8}px`,
        height: `${targetRect.height + 8}px`,
        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.7)',
        borderRadius: '8px',
        zIndex: 10000,
        pointerEvents: 'none',
        transition: 'all 0.3s ease-in-out',
    } : {};
    
    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999]">
            {targetRect && <div style={highlightStyle}></div>}
            {!targetRect && <div className="fixed inset-0 bg-black/70"></div>}

            <div
                ref={tooltipRef}
                className="fixed bg-white rounded-lg shadow-2xl p-6 w-80 z-[10001] transition-all duration-300 ease-in-out animate-fade-in-up"
                style={getTooltipPosition()}
            >
                <h3 className="text-xl font-bold text-text-heading mb-2">{currentStep.title}</h3>
                <p className="text-text-body">{currentStep.content}</p>

                <div className="flex justify-between items-center mt-6">
                    <span className="text-sm font-semibold text-text-muted">{stepIndex + 1} / {steps.length}</span>
                    <div className="flex gap-2">
                         {stepIndex > 0 && (
                            <button onClick={handlePrev} className="px-4 py-2 text-sm font-semibold text-text-body bg-slate-200 hover:bg-slate-300 rounded-lg transition-colors">
                                Prev
                            </button>
                        )}
                        <button onClick={handleNext} className="px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-focus rounded-lg transition-colors">
                            {stepIndex === steps.length - 1 ? 'Finish' : 'Next'}
                        </button>
                    </div>
                </div>

                <button onClick={handleComplete} className="absolute top-2 right-2 text-text-muted hover:text-text-heading p-2 rounded-full">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
        </div>,
        document.body
    );
};

export default OnboardingTour;

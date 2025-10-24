import React, { useEffect, useRef } from 'react';

interface SuccessAnimationProps {
    onComplete: () => void;
    text?: string;
}

const SuccessAnimation: React.FC<SuccessAnimationProps> = ({ onComplete, text = "Task Completed!" }) => {
    const checkRef = useRef<SVGPathElement>(null);
    const circleRef = useRef<SVGCircleElement>(null);

    useEffect(() => {
        const circle = circleRef.current;
        const check = checkRef.current;

        if (circle && check) {
            const circleLength = circle.getTotalLength();
            circle.style.strokeDasharray = `${circleLength}`;
            circle.style.strokeDashoffset = `${circleLength}`;
            
            const checkLength = check.getTotalLength();
            check.style.strokeDasharray = `${checkLength}`;
            check.style.strokeDashoffset = `${checkLength}`;
            
            // Force reflow to apply initial styles before transition
            circle.getBoundingClientRect();
            check.getBoundingClientRect();
            
            circle.style.transition = 'stroke-dashoffset 0.6s cubic-bezier(0.65, 0, 0.45, 1)';
            check.style.transition = 'stroke-dashoffset 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.5s';

            circle.style.strokeDashoffset = '0';
            check.style.strokeDashoffset = '0';
        }

        const timer = setTimeout(onComplete, 2500); // Wait for animation to finish + a bit more

        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-4 animate-scale-in">
                <svg className="w-24 h-24" viewBox="0 0 52 52">
                    <circle 
                        ref={circleRef}
                        className="text-green-500 stroke-current"
                        cx="26" 
                        cy="26" 
                        r="25" 
                        fill="none" 
                        strokeWidth="3"
                    />
                    <path
                        ref={checkRef}
                        className="text-green-500 stroke-current"
                        d="M14.1 27.2l7.1 7.2 16.7-16.8"
                        fill="none"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
                <p className="text-xl font-bold text-text-heading -mt-4">{text}</p>
            </div>
        </div>
    );
};

export default SuccessAnimation;

import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils/utils';
import { Button } from '@/components/radix/Button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/radix/Tooltip';
import { CircularStepper } from '@/components/Stepper';
import { useOnboardStep, STEP_DESCRIPTIONS } from '@/lib/contexts/OnboardStepContext';

interface OnboardButtonProps {
  isCollapsed: boolean;
}

export function OnboardButton({ isCollapsed }: OnboardButtonProps) {
  const location = useLocation();
  const { currentStep, totalSteps } = useOnboardStep();

  const isActive = location.pathname === '/dashboard/onboard';

  // Limit displayed step to totalSteps for the sidebar
  const displayStep = Math.min(currentStep, totalSteps);
  const currentDescription = STEP_DESCRIPTIONS[displayStep - 1];

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link to="/dashboard/onboard" className="block">
            <Button
              variant="ghost"
              className={cn(
                'w-full h-16 relative transition-all duration-200 ease-in-out border-2 rounded-lg justify-start',
                isCollapsed ? 'pl-[11px] pr-2.5' : 'px-3.5',
                isActive
                  ? 'border-zinc-900 dark:bg-emerald-300 dark:hover:bg-emerald-200 bg-zinc-900 hover:bg-zinc-900 '
                  : 'border-zinc-200 dark:border-neutral-700 hover:bg-zinc-50 dark:hover:bg-neutral-600 hover:border-zinc-300 dark:text-white'
              )}
            >
              <CircularStepper
                currentStep={displayStep}
                totalSteps={totalSteps}
                size={40}
                isActive={isActive}
              />
              {!isCollapsed && (
                <div className="absolute left-16.5 flex flex-col items-start">
                  <span
                    className={cn(
                      'font-semibold text-sm transition-colors duration-200',
                      isActive ? 'text-zinc-50 dark:text-black' : 'text-zinc-950 dark:text-white'
                    )}
                  >
                    Get Started
                  </span>
                  <span
                    className={cn(
                      'text-xs transition-colors duration-200',
                      isActive
                        ? 'text-text-gray dark:text-zinc-800'
                        : 'text-zinc-500 dark:text-white'
                    )}
                  >
                    {currentDescription}
                  </span>
                </div>
              )}
            </Button>
          </Link>
        </TooltipTrigger>
        {isCollapsed && (
          <TooltipContent side="right">
            <div className="text-center">
              <p className="font-semibold">Get Started</p>
              <p className="text-xs text-text-gray dark:text-neutural-600">{currentDescription}</p>
            </div>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}

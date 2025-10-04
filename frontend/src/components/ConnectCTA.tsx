import { useNavigate } from 'react-router-dom';
import { useOnboardingCompletion } from '@/lib/hooks/useOnboardingCompletion';

interface ConnectCTAProps {
  className?: string;
  fallback?: string;
}

export function ConnectCTA({ className, fallback }: ConnectCTAProps) {
  const navigate = useNavigate();
  const { isCompleted } = useOnboardingCompletion();
  const shouldShow = !isCompleted;

  if (!shouldShow) {
    return fallback;
  }

  const handleConnect = () => {
    void navigate('/dashboard');
  };

  return (
    <span className={className}>
      <button
        onClick={handleConnect}
        className="text-chart-blue-dark dark:text-emerald-300 hover:no-underline focus:outline-none"
      >
        Connect
      </button>{' '}
      to your coding agent to get started.
    </span>
  );
}

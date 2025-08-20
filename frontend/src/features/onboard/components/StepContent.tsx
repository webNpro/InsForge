import { OnboardStep } from '../types';
import { CodeBlock } from '@/components/CodeBlock';
import { McpInstallation } from '@/components/mcp';
import { TestConnectionStep } from './TestConnectionStep';

interface StepContentProps {
  step: OnboardStep;
}

export function StepContent({ step }: StepContentProps) {
  switch (step) {
    case OnboardStep.INSTALL_NODEJS:
      return (
        <div className="border border-transparent dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-800 py-8 px-6 space-y-4">
          <div>
            <p className="text-zinc-950 dark:text-white text-sm mb-4">
              Install{' '}
              <a
                href="https://nodejs.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-link-blue underline inline-flex items-center gap-1"
              >
                Node.js
              </a>
              . Visit the official Node.js website at{' '}
              <a
                href="https://nodejs.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-link-blue underline"
              >
                https://nodejs.org/
              </a>
            </p>
            <p className="text-zinc-950 dark:text-white text-sm">
              Verify installation by opening a terminal and running:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CodeBlock
              code="node --version"
              className="dark:bg-neutral-700 dark:text-white"
              buttonClassName="dark:bg-neutral-800 dark:hover:bg-neutral-800"
            />
            <CodeBlock
              code="npm --version"
              className="dark:bg-neutral-700 dark:text-white"
              buttonClassName="dark:bg-neutral-800 dark:hover:bg-neutral-800"
            />
          </div>
        </div>
      );

    case OnboardStep.INSTALL_MCP:
      return <McpInstallation TabListClassName="dark:bg-neutral-800" />;

    case OnboardStep.TEST_CONNECTION:
      return <TestConnectionStep />;

    case OnboardStep.FINAL_SETUP:
      return (
        <div className="space-y-6 border border-transparent dark:border-neutral-700 rounded-xl bg-white dark:bg-neutral-800 py-8 px-6">
          <div>
            <p className="text-zinc-950 dark:text-white text-sm mb-4">
              Whenever you start a new chat session, init your AI agents with the InsForge init
              prompt:
            </p>
          </div>

          <CodeBlock
            code="Learn how to use InsForge"
            className="bg-slate-50 dark:bg-neutral-700 dark:text-white"
            buttonClassName="dark:bg-neutral-800 dark:hover:bg-neutral-800"
          />

          <div>
            <p className="text-zinc-950 dark:text-white text-sm">Then you can start building!</p>
          </div>
        </div>
      );

    default:
      return (
        <div className="text-center text-zinc-500">
          <p>Step content not found</p>
        </div>
      );
  }
}

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/radix/Dialog';
import { CopyButton } from '@/components/CopyButton';
import { cn } from '@/lib/utils/utils';

interface PromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  subtitle?: string;
  prompt: string;
}

export function PromptDialog({
  open,
  onOpenChange,
  title = 'Integrate with your application',
  subtitle = 'Paste the prompt below into your cloud agent',
  prompt,
}: PromptDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 border-zinc-200 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)]">
        <div className="flex flex-col">
          <DialogHeader className="px-6 py-3 flex flex-col gap-1 justify-start border-b border-zinc-200 dark:border-neutral-700">
            <DialogTitle className="text-lg font-semibold text-zinc-950 dark:text-white">
              {title}
            </DialogTitle>
          </DialogHeader>
          {/* Title */}
          <div className="px-6 py-3 flex flex-col">
            <p className="text-sm text-white font-normal leading-5 mb-4">{subtitle}</p>
            {/* Action buttons */}
            <div className="flex gap-2 mb-4">
              <CopyButton
                text={prompt}
                variant="default"
                size="default"
                showText={true}
                copyText="Copy Prompt"
                copiedText="Copied!"
                className="h-9 px-3 py-2 text-sm font-medium bg-neutral-700 hover:bg-neutral-600 text-white rounded-md shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)] border-0"
              />
            </div>
            {/* Prompt display */}
            <div className="relative">
              <pre
                className={cn(
                  'px-6 py-4 font-mono text-sm leading-5 overflow-y-auto whitespace-pre-wrap break-words rounded bg-neutral-700 text-white',
                  'max-h-96'
                )}
              >
                {prompt}
              </pre>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

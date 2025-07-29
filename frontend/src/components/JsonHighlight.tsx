import { useState } from 'react';
import { Copy } from 'lucide-react';
import { Button } from '@/components/radix/Button';
import { useToast } from '@/lib/hooks/useToast';

// Import custom checked icon
import CheckedIcon from '@/assets/icons/checked.svg';

interface JsonHighlightProps {
  json: string;
}

export function JsonHighlight({ json }: JsonHighlightProps) {
  const { showToast } = useToast();
  const [isCopied, setIsCopied] = useState(false);

  const highlightJson = (str: string) => {
    // Tokenize JSON string
    const tokens = str.split(/("(?:[^"\\]|\\.)*")|(\s+)|([:,{}[\]])/g).filter(Boolean);

    return tokens.map((token, index) => {
      // String values (including keys)
      if (token.startsWith('"') && token.endsWith('"')) {
        // Check if this is a key (next non-whitespace token is ':')
        let isKey = false;
        for (let i = index + 1; i < tokens.length; i++) {
          if (tokens[i].trim()) {
            isKey = tokens[i] === ':';
            break;
          }
        }

        if (isKey) {
          return (
            <span key={index} className="text-blue-600">
              {token}
            </span>
          );
        } else {
          return (
            <span key={index} className="text-green-600">
              {token}
            </span>
          );
        }
      }

      // Punctuation
      if (/^[:,{}[\]]$/.test(token)) {
        return (
          <span key={index} className="text-gray-600">
            {token}
          </span>
        );
      }

      // Whitespace and other
      return <span key={index}>{token}</span>;
    });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setIsCopied(true);

      // Reset the copied state after 3 seconds
      setTimeout(() => {
        setIsCopied(false);
      }, 3000);
    } catch {
      showToast('Failed to copy to clipboard', 'error');
    }
  };

  return (
    <div className="relative">
      <pre className="font-mono text-sm leading-6 whitespace-pre overflow-x-auto bg-gray-50 rounded-md py-4 px-6 pr-16">
        {highlightJson(json)}
      </pre>
      {isCopied ? (
        <div className="absolute top-4 right-4 flex flex-row items-center px-3 w-fit h-8 rounded-md bg-transparent gap-1.5 transition-all duration-200">
          <img src={CheckedIcon} alt="Checked" className="h-4 w-4" />
          <span className="text-black font-medium text-sm">Copied</span>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          className={`absolute top-4 right-4 px-3 w-fit h-8 rounded-md bg-transparent border-border-gray hover:bg-[#EBEBEB] border shadow gap-1.5 transition-all duration-200 ${
            isCopied ? 'text-green-700' : 'text-black'
          }`}
          onClick={() => void handleCopy()}
        >
          <Copy className="h-4 w-4" />
          <span className="text-black font-medium text-sm">Copy</span>
        </Button>
      )}
    </div>
  );
}

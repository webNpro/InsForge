interface CodeEditorProps {
  code: string;
}

export function CodeEditor({ code }: CodeEditorProps) {
  // Split code into lines for line numbers
  const lines = code.split('\n');

  return (
    <div className="h-full bg-white dark:bg-neutral-900 overflow-auto">
      <div className="flex min-h-full">
        {/* Line Numbers */}
        <div className="flex-shrink-0 bg-gray-50 dark:bg-neutral-800 px-3 py-4 font-mono text-sm text-gray-500 dark:text-gray-400 select-none">
          {lines.map((_, index) => (
            <div key={index} className="leading-6 text-right min-w-[2rem]">
              {index + 1}
            </div>
          ))}
          {/* Extra line numbers for blank lines */}
          {Array.from({ length: 6 }, (_, i) => (
            <div key={`extra-${i}`} className="leading-6 text-right min-w-[2rem]">
              {lines.length + 1 + i}
            </div>
          ))}
        </div>

        {/* Code Area */}
        <div className="flex-1">
          <pre className="font-mono text-sm leading-6 p-4 m-0 bg-transparent text-gray-900 dark:text-white">
            {lines.map((line, index) => (
              <div key={index} className="min-h-[1.5rem]">
                {line || <span>&nbsp;</span>}
              </div>
            ))}
            {/* Some blank lines at the end */}
            {Array.from({ length: 6 }, (_, i) => (
              <div key={`blank-${i}`} className="min-h-[1.5rem]">
                &nbsp;
              </div>
            ))}
          </pre>
        </div>
      </div>
    </div>
  );
}

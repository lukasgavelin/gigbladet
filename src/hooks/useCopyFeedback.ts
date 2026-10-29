import { useCallback, useEffect, useRef, useState } from 'react';

const DEFAULT_RESET_MS = 2200;

export async function writeTextToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

export function useCopyFeedback<K extends string>(resetMs = DEFAULT_RESET_MS) {
  const [copiedKey, setCopiedKey] = useState<K | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const copyWithFeedback = useCallback(
    async (text: string, key: K) => {
      try {
        await writeTextToClipboard(text);
        setCopiedKey(key);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          setCopiedKey(null);
        }, resetMs);
      } catch {
        // Ignore clipboard denial
      }
    },
    [resetMs]
  );

  return { copiedKey, copyWithFeedback };
}

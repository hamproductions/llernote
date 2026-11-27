import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Text } from '~/components/ui/text';

const CAPTION_STEPS = [
  { scale: 1, phrase: true },
  { scale: 0.9, phrase: true },
  { scale: 0.8, phrase: true },
  { scale: 0.72, phrase: true },
  { scale: 0.8, phrase: false },
  { scale: 0.72, phrase: false },
  { scale: 0.65, phrase: false },
  { scale: 0.58, phrase: false },
  { scale: 0.5, phrase: false }
];

export function FitCaption({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [step, setStep] = useState(0);
  useLayoutEffect(() => setStep(0), [children]);
  useLayoutEffect(() => {
    const element = ref.current;
    if (
      element &&
      step < CAPTION_STEPS.length - 1 &&
      element.scrollHeight > element.clientHeight + 1
    )
      setStep(step + 1);
  });
  return (
    <Text
      ref={ref}
      style={{
        wordBreak: CAPTION_STEPS[step].phrase ? ('auto-phrase' as 'normal') : 'normal',
        fontSize: `${CAPTION_STEPS[step].scale}em`,
        lineHeight: 1.2
      }}
      fontWeight="600"
      textAlign="center"
      lineClamp="2"
      overflowWrap="break-word"
    >
      {children}
    </Text>
  );
}

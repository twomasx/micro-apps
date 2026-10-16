import type { MouseEvent, ReactNode } from 'react';
import { appHref, navigate } from '../lib/navigation';

interface LinkProps {
  /** Path without the base, like 'restore'. An empty string is the pass page. */
  to: string;
  className?: string;
  children: ReactNode;
}

/** An in-app link. A plain anchor, so open in new tab and long-press still work. */
export function Link({ to, className, children }: LinkProps) {
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(to);
  };
  return (
    <a href={appHref(to)} className={className} onClick={onClick}>
      {children}
    </a>
  );
}

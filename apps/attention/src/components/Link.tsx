import type { MouseEvent, ReactNode } from 'react';
import { appHref, navigate } from '../lib/navigation';

interface LinkProps {
  /** App path without the base, like 'science'. An empty string is Today. */
  to: string;
  /** Replace the current history entry. Used for links inside a sheet, which has its own entry. */
  replace?: boolean;
  className?: string;
  children: ReactNode;
}

/** An in-app link. A plain anchor, so open in new tab and long-press still work. */
export function Link({ to, replace, className, children }: LinkProps) {
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(to, { replace });
  };
  return (
    <a href={appHref(to)} className={className} onClick={onClick}>
      {children}
    </a>
  );
}

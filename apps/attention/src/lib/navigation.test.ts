import { describe, expect, it, vi } from 'vitest';
import { onPageRestored } from './navigation';

describe('onPageRestored', () => {
  const pageshow = (persisted: boolean) => Object.assign(new Event('pageshow'), { persisted });

  it('calls back only when the page comes back from the back-forward cache, until stopped', () => {
    const target = new EventTarget() as unknown as Window;
    const onReturn = vi.fn();
    const stop = onPageRestored(onReturn, target);
    target.dispatchEvent(pageshow(false));
    expect(onReturn).not.toHaveBeenCalled();
    target.dispatchEvent(pageshow(true));
    expect(onReturn).toHaveBeenCalledTimes(1);
    stop();
    target.dispatchEvent(pageshow(true));
    expect(onReturn).toHaveBeenCalledTimes(1);
  });
});

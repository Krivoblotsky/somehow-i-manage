import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Vitest runs without globals, so React Testing Library cannot register this itself.
afterEach(cleanup);

// React Flow needs layout APIs that jsdom does not implement (see reactflow.dev/learn/advanced-use/testing).
class ResizeObserverMock {
  private readonly callback: ResizeObserverCallback;
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
  observe(target: Element) {
    const el = target as HTMLElement;
    const width = el.offsetWidth || 1;
    const height = el.offsetHeight || 1;
    const contentRect = {
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: width,
      bottom: height,
      width,
      height,
    };
    this.callback(
      [{ target, contentRect } as unknown as ResizeObserverEntry],
      this as unknown as ResizeObserver,
    );
  }
  unobserve() {}
  disconnect() {}
}

class DOMMatrixReadOnlyMock {
  readonly m22: number;
  constructor(transform?: string) {
    const scale = transform?.match(/scale\(([1-9.])\)/)?.[1];
    this.m22 = scale !== undefined ? Number(scale) : 1;
  }
}

globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
globalThis.DOMMatrixReadOnly = DOMMatrixReadOnlyMock as unknown as typeof DOMMatrixReadOnly;
Object.defineProperties(globalThis.HTMLElement.prototype, {
  offsetHeight: {
    get(this: HTMLElement) {
      return parseFloat(this.style.height) || 1;
    },
  },
  offsetWidth: {
    get(this: HTMLElement) {
      return parseFloat(this.style.width) || 1;
    },
  },
});
(globalThis.SVGElement.prototype as unknown as { getBBox: () => DOMRect }).getBBox = () =>
  ({ x: 0, y: 0, width: 0, height: 0 }) as DOMRect;
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

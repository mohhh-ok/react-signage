import 'fake-indexeddb/auto';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
    cleanup();
});

if (typeof globalThis.ResizeObserver === 'undefined') {
    class ResizeObserverMock {
        observe() {}
        unobserve() {}
        disconnect() {}
    }
    globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
}

URL.createObjectURL = (() => 'blob:mock-url') as typeof URL.createObjectURL;
URL.revokeObjectURL = (() => {}) as typeof URL.revokeObjectURL;

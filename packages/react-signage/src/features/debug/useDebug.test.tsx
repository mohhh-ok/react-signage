import { renderHook } from '@testing-library/react';
import { ReactNode } from 'react';
import { DebugProvider } from './DebugProvider';
import { useDebug } from './useDebug';

vi.mock('react-hot-toast', () => ({ toast: vi.fn() }));

describe('useDebug', () => {
    it('returns default values when no provider', () => {
        const { result } = renderHook(() => useDebug());
        expect(result.current.debug).toBe(false);
        expect(typeof result.current.debugMessage).toBe('function');
    });

    it('reads values from DebugProvider', () => {
        const wrapper = ({ children }: { children: ReactNode }) => (
            <DebugProvider debug={true}>{children}</DebugProvider>
        );
        const { result } = renderHook(() => useDebug(), { wrapper });
        expect(result.current.debug).toBe(true);
    });
});

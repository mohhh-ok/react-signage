import { act, renderHook } from '@testing-library/react';
import { ReactNode } from 'react';
import { toast } from 'react-hot-toast';
import { DebugProvider } from './DebugProvider';
import { useDebug } from './useDebug';

vi.mock('react-hot-toast', () => ({ toast: vi.fn() }));

const mockToast = vi.mocked(toast);

function makeWrapper(debug: boolean) {
    return ({ children }: { children: ReactNode }) => (
        <DebugProvider debug={debug}>{children}</DebugProvider>
    );
}

describe('DebugProvider', () => {
    beforeEach(() => {
        mockToast.mockClear();
    });

    it('does not call toast when debug is false', () => {
        const { result } = renderHook(() => useDebug(), { wrapper: makeWrapper(false) });
        act(() => result.current.debugMessage({ message: 'hi', severity: 'info' }));
        expect(mockToast).not.toHaveBeenCalled();
    });

    it('does not call toast when message is empty', () => {
        const { result } = renderHook(() => useDebug(), { wrapper: makeWrapper(true) });
        act(() => result.current.debugMessage({ message: '', severity: 'info' }));
        expect(mockToast).not.toHaveBeenCalled();
    });

    it('calls toast with info style when debug is true', () => {
        const { result } = renderHook(() => useDebug(), { wrapper: makeWrapper(true) });
        act(() => result.current.debugMessage({ message: 'hi', severity: 'info' }));
        expect(mockToast).toHaveBeenCalledWith(
            'hi',
            expect.objectContaining({
                duration: 5000,
                style: { backgroundColor: 'white', color: 'black' },
            })
        );
    });

    it('calls toast with warning style', () => {
        const { result } = renderHook(() => useDebug(), { wrapper: makeWrapper(true) });
        act(() => result.current.debugMessage({ message: 'careful', severity: 'warning' }));
        expect(mockToast).toHaveBeenCalledWith(
            'careful',
            expect.objectContaining({
                style: { backgroundColor: 'yellow', color: 'black' },
            })
        );
    });

    it('calls toast with error style', () => {
        const { result } = renderHook(() => useDebug(), { wrapper: makeWrapper(true) });
        act(() => result.current.debugMessage({ message: 'oops', severity: 'error' }));
        expect(mockToast).toHaveBeenCalledWith(
            'oops',
            expect.objectContaining({
                style: { backgroundColor: 'red', color: 'white' },
            })
        );
    });
});

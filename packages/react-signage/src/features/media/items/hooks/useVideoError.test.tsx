import { renderHook, act } from '@testing-library/react';
import { useVideoError } from './useVideoError';
import { MAX_RETRY_SPAN, MIN_RETRY_SPAN } from '../../../../consts';

vi.mock('../../../debug/useDebug', () => ({
    useDebug: () => ({ debug: false, debugMessage: vi.fn() }),
}));

function makeVideo(src = 'http://example.test/video.mp4') {
    const video = document.createElement('video');
    Object.defineProperty(video, 'src', { value: src, configurable: true, writable: true });
    const loadSpy = vi.spyOn(video, 'load').mockImplementation(() => {});
    const playSpy = vi.spyOn(video, 'play').mockResolvedValue(undefined);
    return { video, loadSpy, playSpy };
}

describe('useVideoError', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    it('does nothing when video has no src', () => {
        const video = document.createElement('video');
        Object.defineProperty(video, 'src', { value: '', configurable: true, writable: true });
        const loadSpy = vi.spyOn(video, 'load').mockImplementation(() => {});
        const ref = { current: video };
        const { result } = renderHook(() => useVideoError({ ref }));
        act(() => result.current.handleVideoError());
        act(() => vi.advanceTimersByTime(MIN_RETRY_SPAN + 100));
        expect(loadSpy).not.toHaveBeenCalled();
    });

    it('calls load and play after the initial retry span', () => {
        const { video, loadSpy, playSpy } = makeVideo();
        const ref = { current: video };
        const { result } = renderHook(() => useVideoError({ ref }));
        act(() => result.current.handleVideoError());
        act(() => vi.advanceTimersByTime(MIN_RETRY_SPAN));
        expect(loadSpy).toHaveBeenCalledTimes(1);
        expect(playSpy).toHaveBeenCalledTimes(1);
    });

    it('grows the retry span exponentially up to MAX_RETRY_SPAN', () => {
        const { video, loadSpy } = makeVideo();
        const ref = { current: video };
        const { result } = renderHook(() => useVideoError({ ref }));

        let expectedSpan = MIN_RETRY_SPAN;
        for (let i = 0; i < 30; i++) {
            act(() => result.current.handleVideoError());
            act(() => vi.advanceTimersByTime(expectedSpan));
            expectedSpan = Math.min(expectedSpan * 1.2, MAX_RETRY_SPAN);
        }
        expect(loadSpy).toHaveBeenCalledTimes(30);

        act(() => result.current.handleVideoError());
        act(() => vi.advanceTimersByTime(MAX_RETRY_SPAN - 1));
        expect(loadSpy).toHaveBeenCalledTimes(30);
        act(() => vi.advanceTimersByTime(1));
        expect(loadSpy).toHaveBeenCalledTimes(31);
    });

    it('resetSpan brings the next retry back to MIN_RETRY_SPAN', () => {
        const { video, loadSpy } = makeVideo();
        const ref = { current: video };
        const { result } = renderHook(() => useVideoError({ ref }));

        for (let i = 0; i < 5; i++) {
            act(() => result.current.handleVideoError());
            act(() => vi.advanceTimersByTime(MAX_RETRY_SPAN));
        }
        const callsBefore = loadSpy.mock.calls.length;

        act(() => result.current.resetSpan());
        act(() => result.current.handleVideoError());
        act(() => vi.advanceTimersByTime(MIN_RETRY_SPAN));
        expect(loadSpy).toHaveBeenCalledTimes(callsBefore + 1);
    });
});

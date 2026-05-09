import { act, render } from '@testing-library/react';
import { createRef } from 'react';
import { Video, VideoRef } from './Video';

const getOrFetchAndCache = vi.fn(async (src: string) => `cached:${src}`);
const playSpy = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
const pauseSpy = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});

vi.mock('../../cacher', () => ({
    useCacher: () => ({
        getOrFetchAndCache,
        getStatus: vi.fn(),
        fetchAndCache: vi.fn(),
    }),
}));

vi.mock('../../debug/useDebug', () => ({
    useDebug: () => ({ debug: false, debugMessage: vi.fn() }),
}));

vi.mock('./hooks/useVideoError', () => ({
    useVideoError: () => ({ handleVideoError: vi.fn(), resetSpan: vi.fn() }),
}));

describe('Video imperative handle', () => {
    beforeEach(() => {
        getOrFetchAndCache.mockClear();
        playSpy.mockClear();
        pauseSpy.mockClear();
    });

    it('changeShow toggles inline display', () => {
        const ref = createRef<VideoRef>();
        render(<Video ref={ref} muted={true} useDbCache={false} />);
        const el = ref.current!.elementRef.current!;
        act(() => ref.current!.changeShow(false));
        expect(el.style.display).toBe('none');
        act(() => ref.current!.changeShow(true));
        expect(el.style.display).toBe('block');
    });

    it('setSrc uses raw src when useDbCache is false', async () => {
        const ref = createRef<VideoRef>();
        render(<Video ref={ref} muted={true} useDbCache={false} />);
        await act(async () => {
            await ref.current!.setSrc('a.mp4');
        });
        expect(getOrFetchAndCache).not.toHaveBeenCalled();
        expect(ref.current!.elementRef.current!.getAttribute('src')).toBe('a.mp4');
    });

    it('setSrc routes through cache when useDbCache is true', async () => {
        const ref = createRef<VideoRef>();
        render(<Video ref={ref} muted={true} useDbCache={true} />);
        await act(async () => {
            await ref.current!.setSrc('a.mp4');
        });
        expect(getOrFetchAndCache).toHaveBeenCalledWith('a.mp4');
        expect(ref.current!.elementRef.current!.getAttribute('src')).toBe('cached:a.mp4');
    });

    it('play and pause delegate to the underlying HTMLVideoElement', async () => {
        const ref = createRef<VideoRef>();
        render(<Video ref={ref} muted={true} useDbCache={false} />);
        await act(async () => {
            await ref.current!.play();
        });
        expect(playSpy).toHaveBeenCalled();

        act(() => ref.current!.pause());
        expect(pauseSpy).toHaveBeenCalled();
    });

    it('passes muted prop to the underlying element', () => {
        const ref = createRef<VideoRef>();
        render(<Video ref={ref} muted={true} useDbCache={false} />);
        expect(ref.current!.elementRef.current!.muted).toBe(true);
    });
});

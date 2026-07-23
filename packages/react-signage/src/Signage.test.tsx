import { act, render } from '@testing-library/react';
import { createRef, forwardRef, useImperativeHandle } from 'react';
import { interactionDummyVideo } from './assets/interactionDummyVideo';
import { Signage } from './Signage';
import { SignageItem, SignageRefType } from './types';

const mockStartFadeout = vi.fn();

vi.mock('./features/fadeOverlay/fadeOverlay', () => ({
    FadeoutOverlay: forwardRef(function FadeoutOverlay(_props: any, ref: any) {
        useImperativeHandle(ref, () => ({ startFadeout: mockStartFadeout }));
        return null;
    }),
    useFadeoutOverlay: () => ({ ref: { current: { startFadeout: mockStartFadeout } } }),
}));

const playSpy = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
const pauseSpy = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
const loadSpy = vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});

function getImg(container: HTMLElement) {
    return container.querySelector('img') as HTMLImageElement;
}

function getVideo(container: HTMLElement) {
    return container.querySelector('video') as HTMLVideoElement;
}

async function flush() {
    await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
    });
}

async function advance(ms: number) {
    await act(async () => {
        await vi.advanceTimersByTimeAsync(ms);
    });
}

describe('Signage', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        playSpy.mockClear();
        pauseSpy.mockClear();
        loadSpy.mockClear();
        mockStartFadeout.mockClear();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('shows the first item after the initial flush', async () => {
        const items: SignageItem[] = [
            { type: 'image', src: 'imageA.png', second: 2 },
            { type: 'image', src: 'imageB.png', second: 3 },
        ];
        const { container } = render(<Signage play={true} fullScreen={false} items={items} />);
        await flush();

        const img = getImg(container);
        const video = getVideo(container);
        expect(img.getAttribute('src')).toBe('imageA.png');
        expect(img.style.display).toBe('block');
        expect(video.style.display).toBe('none');
    });

    it('advances to the next image after its duration and wraps back around', async () => {
        const items: SignageItem[] = [
            { type: 'image', src: 'imageA.png', second: 2 },
            { type: 'image', src: 'imageB.png', second: 3 },
        ];
        const { container } = render(<Signage play={true} fullScreen={false} items={items} />);
        await flush();

        await advance(2000);
        expect(getImg(container).getAttribute('src')).toBe('imageB.png');

        await advance(3000);
        expect(getImg(container).getAttribute('src')).toBe('imageA.png');
    });

    it('never auto-advances an image item whose second is 0', async () => {
        const items: SignageItem[] = [
            { type: 'image', src: 'onlyImage.png', second: 0 },
        ];
        const { container } = render(<Signage play={true} fullScreen={false} items={items} />);
        await flush();

        await advance(100_000);
        expect(getImg(container).getAttribute('src')).toBe('onlyImage.png');
    });

    it('advances to the next item when the video element fires an ended event', async () => {
        const items: SignageItem[] = [
            { type: 'video', src: 'video1.mp4' },
            { type: 'image', src: 'imageC.png', second: 5 },
        ];
        const { container } = render(<Signage play={true} fullScreen={false} items={items} />);
        await flush();

        const video = getVideo(container);
        await act(async () => {
            video.dispatchEvent(new Event('ended'));
            await vi.advanceTimersByTimeAsync(0);
        });

        expect(getImg(container).getAttribute('src')).toBe('imageC.png');
    });

    it('plays the interaction dummy video first on initial start', async () => {
        const items: SignageItem[] = [
            { type: 'image', src: 'imageA.png', second: 2 },
        ];
        const { container } = render(<Signage play={true} fullScreen={false} items={items} />);
        await flush();

        expect(playSpy).toHaveBeenCalled();
        expect(getVideo(container).getAttribute('src')).toBe(interactionDummyVideo);
    });

    it('pauses the video, hides both elements, and clears the pending timer when play becomes false', async () => {
        const items: SignageItem[] = [
            { type: 'image', src: 'imageA.png', second: 2 },
        ];
        const { container, rerender } = render(<Signage play={true} fullScreen={false} items={items} />);
        await flush();
        pauseSpy.mockClear();

        rerender(<Signage play={false} fullScreen={false} items={items} />);
        await flush();

        expect(pauseSpy).toHaveBeenCalled();
        expect(getImg(container).style.display).toBe('none');
        expect(getVideo(container).style.display).toBe('none');

        const srcBefore = getImg(container).getAttribute('src');
        await advance(5000);
        expect(getImg(container).getAttribute('src')).toBe(srcBefore);
    });

    it('ref.advanceNext() advances to the next item immediately', async () => {
        const items: SignageItem[] = [
            { type: 'image', src: 'imageA.png', second: 100 },
            { type: 'image', src: 'imageB.png', second: 100 },
        ];
        const ref = createRef<SignageRefType>();
        const { container } = render(<Signage ref={ref} play={true} fullScreen={false} items={items} />);
        await flush();
        expect(getImg(container).getAttribute('src')).toBe('imageA.png');

        act(() => {
            ref.current!.advanceNext();
        });
        await flush();

        expect(getImg(container).getAttribute('src')).toBe('imageB.png');
    });

    it('resets to index 0 when items shrink below the current index', async () => {
        const items: SignageItem[] = [
            { type: 'image', src: 'first.png', second: 0 },
            { type: 'image', src: 'second.png', second: 0 },
            { type: 'image', src: 'third.png', second: 0 },
        ];
        const ref = createRef<SignageRefType>();
        const { container, rerender } = render(<Signage ref={ref} play={true} fullScreen={false} items={items} />);
        await flush();

        act(() => ref.current!.advanceNext());
        await flush();
        act(() => ref.current!.advanceNext());
        await flush();
        expect(getImg(container).getAttribute('src')).toBe('third.png');

        rerender(<Signage ref={ref} play={true} fullScreen={false} items={[items[0]]} />);
        await flush();

        expect(getImg(container).getAttribute('src')).toBe('first.png');
    });
});

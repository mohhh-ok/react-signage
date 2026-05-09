import { act, render } from '@testing-library/react';
import { createRef } from 'react';
import { Img, ImgRef } from './Img';

const getOrFetchAndCache = vi.fn(async (src: string) => `cached:${src}`);

vi.mock('../../cacher', () => ({
    useCacher: () => ({
        getOrFetchAndCache,
        getStatus: vi.fn(),
        fetchAndCache: vi.fn(),
    }),
}));

describe('Img imperative handle', () => {
    beforeEach(() => {
        getOrFetchAndCache.mockClear();
    });

    it('changeShow toggles inline display', () => {
        const ref = createRef<ImgRef>();
        render(<Img ref={ref} />);
        const el = ref.current!.elementRef.current!;
        act(() => ref.current!.changeShow(false));
        expect(el.style.display).toBe('none');
        act(() => ref.current!.changeShow(true));
        expect(el.style.display).toBe('block');
    });

    it('setSrc uses raw src when useDbCache is not enabled', async () => {
        const ref = createRef<ImgRef>();
        render(<Img ref={ref} />);
        await act(async () => {
            await ref.current!.setSrc('a.png');
        });
        expect(ref.current!.elementRef.current!.getAttribute('src')).toBe('a.png');
        expect(getOrFetchAndCache).not.toHaveBeenCalled();
    });

    it('setSrc routes through cache when useDbCache is true', async () => {
        const ref = createRef<ImgRef>();
        render(<Img ref={ref} useDbCache />);
        await act(async () => {
            await ref.current!.setSrc('a.png');
        });
        expect(getOrFetchAndCache).toHaveBeenCalledWith('a.png');
        expect(ref.current!.elementRef.current!.getAttribute('src')).toBe('cached:a.png');
    });

    it('setSrc bypasses cache when noDbCache option is true', async () => {
        const ref = createRef<ImgRef>();
        render(<Img ref={ref} useDbCache />);
        await act(async () => {
            await ref.current!.setSrc('a.png', { noDbCache: true });
        });
        expect(getOrFetchAndCache).not.toHaveBeenCalled();
        expect(ref.current!.elementRef.current!.getAttribute('src')).toBe('a.png');
    });
});

import { getMediaSrcSize } from './utils';

describe('getMediaSrcSize', () => {
    it('returns naturalWidth/naturalHeight for HTMLImageElement', () => {
        const img = document.createElement('img');
        Object.defineProperty(img, 'naturalWidth', { value: 320, configurable: true });
        Object.defineProperty(img, 'naturalHeight', { value: 240, configurable: true });
        expect(getMediaSrcSize(img)).toEqual({ width: 320, height: 240 });
    });

    it('returns videoWidth/videoHeight for HTMLVideoElement', () => {
        const video = document.createElement('video');
        Object.defineProperty(video, 'videoWidth', { value: 1920, configurable: true });
        Object.defineProperty(video, 'videoHeight', { value: 1080, configurable: true });
        expect(getMediaSrcSize(video)).toEqual({ width: 1920, height: 1080 });
    });

    it('throws for unsupported media element', () => {
        const div = document.createElement('div') as unknown as HTMLImageElement;
        expect(() => getMediaSrcSize(div)).toThrow();
    });
});

import { renderHook, act, waitFor } from '@testing-library/react';
import axios from 'axios';
import { db } from './db';
import { useCacher } from './useCacher';

vi.mock('axios');

const mockedAxios = vi.mocked(axios, true);

async function clearDb() {
    await db.mediaData.clear();
    await db.mediaStatus.clear();
}

describe('useCacher', () => {
    beforeEach(async () => {
        await clearDb();
        mockedAxios.get.mockReset();
    });

    it('fetchAndCache stores blob and marks status as success', async () => {
        const blob = new Blob(['payload'], { type: 'image/png' });
        mockedAxios.get.mockResolvedValue({ data: blob });
        const { result } = renderHook(() => useCacher());

        await act(async () => {
            await result.current.fetchAndCache('http://a/img.png');
        });

        expect(mockedAxios.get).toHaveBeenCalledWith(
            'http://a/img.png',
            expect.objectContaining({ responseType: 'blob' })
        );
        const status = await db.mediaStatus.get('http://a/img.png');
        expect(status?.status).toBe('success');
        expect(status?.size).toBe(blob.size);
        const data = await db.mediaData.get('http://a/img.png');
        expect(data?.blob).toBeDefined();
    });

    it('fetchAndCache skips network when status is already downloading', async () => {
        const url = 'http://a/img.png';
        await db.mediaStatus.put({
            url,
            status: 'downloading',
            size: 0,
            accessedAt: new Date(),
        });
        const { result } = renderHook(() => useCacher());

        await act(async () => {
            await result.current.fetchAndCache(url);
        });
        expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('getOrFetchAndCache returns a blob URL when cached and triggers no fetch', async () => {
        const url = 'http://a/img.png';
        const blob = new Blob(['cached']);
        await db.mediaData.put({ url, blob, updatedAt: new Date() });
        await db.mediaStatus.put({
            url,
            status: 'success',
            size: blob.size,
            accessedAt: new Date(),
        });
        const { result } = renderHook(() => useCacher());

        let returned = '';
        await act(async () => {
            returned = await result.current.getOrFetchAndCache(url);
        });
        expect(returned.startsWith('blob:')).toBe(true);
        expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('getOrFetchAndCache returns raw url and triggers fetch when not cached', async () => {
        const blob = new Blob(['x']);
        mockedAxios.get.mockResolvedValue({ data: blob });
        const { result } = renderHook(() => useCacher());

        let returned = '';
        await act(async () => {
            returned = await result.current.getOrFetchAndCache('http://a/img.png');
        });
        expect(returned).toBe('http://a/img.png');
        await waitFor(() => expect(mockedAxios.get).toHaveBeenCalled());
    });

    it('on mount, downloading statuses are reset to pending', async () => {
        await db.mediaStatus.put({
            url: 'a',
            status: 'downloading',
            size: 0,
            accessedAt: new Date(),
        });
        renderHook(() => useCacher());
        await waitFor(async () => {
            const row = await db.mediaStatus.get('a');
            expect(row?.status).toBe('pending');
        });
    });
});

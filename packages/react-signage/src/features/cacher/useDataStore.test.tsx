import { renderHook, act } from '@testing-library/react';
import { db } from './db';
import { useDataStore } from './useDataStore';

async function clearDb() {
    await db.mediaData.clear();
    await db.mediaStatus.clear();
}

describe('useDataStore', () => {
    beforeEach(async () => {
        await clearDb();
    });

    it('upsertMediaData persists blob and tracks size in mediaStatus', async () => {
        const { result } = renderHook(() => useDataStore());
        const blob = new Blob(['hello']);
        let ok = false;
        await act(async () => {
            ok = await result.current.upsertMediaData({ url: 'a', blob });
        });
        expect(ok).toBe(true);
        const data = await db.mediaData.get('a');
        expect(data?.blob).toBeDefined();
        expect(data?.url).toBe('a');
        const status = await db.mediaStatus.get('a');
        expect(status?.size).toBe(5);
    });

    it('getMediaData updates accessedAt and returns the row', async () => {
        const { result } = renderHook(() => useDataStore());
        const blob = new Blob(['x']);
        await act(async () => {
            await result.current.upsertMediaData({ url: 'a', blob });
        });
        const before = (await db.mediaStatus.get('a'))!.accessedAt;
        await new Promise((r) => setTimeout(r, 5));
        let data;
        await act(async () => {
            data = await result.current.getMediaData('a');
        });
        expect(data?.url).toBe('a');
        const after = (await db.mediaStatus.get('a'))!.accessedAt;
        expect(after.getTime()).toBeGreaterThan(before.getTime());
    });

    it('mediaDataExists is true after upsert and false after delete', async () => {
        const { result } = renderHook(() => useDataStore());
        await act(async () => {
            await result.current.upsertMediaData({ url: 'a', blob: new Blob(['x']) });
        });
        expect(await result.current.mediaDataExists('a')).toBe(true);

        await act(async () => {
            await result.current.deleteMediaData('a');
        });
        expect(await result.current.mediaDataExists('a')).toBe(false);
    });

    it('deleteMediaData returns the previously stored size', async () => {
        const { result } = renderHook(() => useDataStore());
        await act(async () => {
            await result.current.upsertMediaData({ url: 'a', blob: new Blob(['1234']) });
        });
        let removed = -1;
        await act(async () => {
            removed = await result.current.deleteMediaData('a');
        });
        expect(removed).toBe(4);
    });

    it('updateMediaStatus merges values and creates default rows', async () => {
        const { result } = renderHook(() => useDataStore());
        await act(async () => {
            await result.current.updateMediaStatus('a', { status: 'downloading' });
        });
        const row = await db.mediaStatus.get('a');
        expect(row?.status).toBe('downloading');
        expect(row?.size).toBe(0);
    });
});

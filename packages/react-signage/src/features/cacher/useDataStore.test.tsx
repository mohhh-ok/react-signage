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

describe('upsertMediaData quota handling', () => {
    beforeEach(async () => {
        await clearDb();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    it('evicts the least recently accessed entry and retries when put fails once', async () => {
        const { result } = renderHook(() => useDataStore());

        vi.setSystemTime(new Date('2020-01-01T00:00:00Z'));
        await act(async () => {
            await result.current.upsertMediaData({ url: 'entryOld', blob: new Blob(['old-data']) });
        });

        vi.setSystemTime(new Date('2021-01-01T00:00:00Z'));
        await act(async () => {
            await result.current.upsertMediaData({ url: 'entryNew', blob: new Blob(['new-data']) });
        });

        // the incoming url gets its own mediaStatus row (accessedAt = now) before the put
        // loop runs, so it must be the most recently accessed of the three to keep the
        // LRU pick deterministic.
        vi.setSystemTime(new Date('2022-01-01T00:00:00Z'));
        vi.spyOn(db.mediaData, 'put').mockRejectedValueOnce(new Error('QuotaExceededError'));

        let ok = false;
        await act(async () => {
            ok = await result.current.upsertMediaData({ url: 'incoming', blob: new Blob(['incoming-data']) });
        });

        expect(ok).toBe(true);
        expect(await db.mediaData.get('entryOld')).toBeUndefined();
        expect(await db.mediaStatus.get('entryOld')).toBeUndefined();
        expect(await db.mediaData.get('entryNew')).toBeDefined();
        expect(await db.mediaStatus.get('entryNew')).toBeDefined();
        expect((await db.mediaData.get('incoming'))?.blob).toBeDefined();
    });

    it('returns false without looping forever when put keeps failing and nothing is left to evict', async () => {
        const { result } = renderHook(() => useDataStore());
        vi.spyOn(db.mediaData, 'put').mockRejectedValue(new Error('QuotaExceededError'));

        // the incoming url's own mediaStatus row (written before the put loop) is the only
        // row in the store, so it gets evicted first; the next eviction attempt then finds
        // nothing left and the loop must terminate with false rather than spin forever.
        let ok = true;
        await act(async () => {
            ok = await result.current.upsertMediaData({ url: 'a', blob: new Blob(['data']) });
        });

        expect(ok).toBe(false);
        expect(await db.mediaStatus.get('a')).toBeUndefined();
        expect(await db.mediaData.get('a')).toBeUndefined();
    }, 5000);

    it('evicts entries until exhausted then returns false when put always fails', async () => {
        const { result } = renderHook(() => useDataStore());

        vi.setSystemTime(new Date('2020-01-01T00:00:00Z'));
        await act(async () => {
            await result.current.upsertMediaData({ url: 'entryOld', blob: new Blob(['old-data']) });
        });

        vi.setSystemTime(new Date('2021-01-01T00:00:00Z'));
        await act(async () => {
            await result.current.upsertMediaData({ url: 'entryNew', blob: new Blob(['new-data']) });
        });

        vi.setSystemTime(new Date('2022-01-01T00:00:00Z'));
        vi.spyOn(db.mediaData, 'put').mockRejectedValue(new Error('QuotaExceededError'));

        let ok = true;
        await act(async () => {
            ok = await result.current.upsertMediaData({ url: 'incoming', blob: new Blob(['incoming-data']) });
        });

        expect(ok).toBe(false);
        expect(await db.mediaData.get('entryOld')).toBeUndefined();
        expect(await db.mediaStatus.get('entryOld')).toBeUndefined();
        expect(await db.mediaData.get('entryNew')).toBeUndefined();
        expect(await db.mediaStatus.get('entryNew')).toBeUndefined();
        expect(await db.mediaData.get('incoming')).toBeUndefined();
        expect(await db.mediaStatus.get('incoming')).toBeUndefined();
    }, 5000);
});

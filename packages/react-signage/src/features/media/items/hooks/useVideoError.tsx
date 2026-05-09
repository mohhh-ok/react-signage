import { MAX_RETRY_SPAN, MIN_RETRY_SPAN } from "../../../../consts";
import { useDebug } from "../../../debug/useDebug";
import { useEffect, useRef } from "react";

type Params = {
    ref: React.RefObject<HTMLVideoElement | null>;
}

export function useVideoError(params: Params) {
    const { ref } = params;
    const { debugMessage } = useDebug();
    const retrySpanRef = useRef<number>(1000);
    const retryTimerRef = useRef<number | undefined>(undefined);

    useEffect(() => {
        return () => clearTimeout(retryTimerRef.current);
    }, []);

    const handleVideoError = () => {
        if (!ref.current?.src) return;
        debugMessage({ message: 'video error. retrying...', severity: 'error' });
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = setTimeout(() => {
            ref.current?.load();
            ref.current?.play();
            upSpan();
        }, retrySpanRef.current);
    };

    const upSpan = () => {
        retrySpanRef.current = Math.min(retrySpanRef.current * 1.2, MAX_RETRY_SPAN);
    };

    const resetSpan = () => {
        retrySpanRef.current = MIN_RETRY_SPAN;
    };

    return { handleVideoError, resetSpan };
}

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Toaster } from 'react-hot-toast';
import { interactionDummyVideo } from './assets/interactionDummyVideo';
import { DEFAULT_SIZE, FADE_DURATION } from './consts';
import { useDebug } from './features/debug/useDebug';
import { FadeoutOverlay, useFadeoutOverlay } from './features/fadeOverlay/fadeOverlay';
import { FullscreenableContainer } from "./features/fullscreen/FullscreenableContainer";
import { Img, ImgRef } from './features/media/items/Img';
import { Video, VideoRef } from './features/media/items/Video';
import { SignageItem, SignageRefType } from "./types";


export type SignageProps = {
    items: SignageItem[];
    play: boolean;
    fullScreen: boolean;
    onFullScreenChange?: (fullScreen: boolean) => void;
    size?: { width: number, height: number };
    mute?: boolean;
    useDbCache?: boolean;
}

type IndexData = {
    index: number;
    changedAt: number;
}


export const Signage = forwardRef<SignageRefType, SignageProps>(
    function Signage(props, ref) {
        const { play, fullScreen, mute, items, onFullScreenChange, size = DEFAULT_SIZE, useDbCache } = props;
        const [indexData, setIndexData] = useState<IndexData>({ index: 0, changedAt: 0 });
        const item: SignageItem | undefined = items[indexData.index];
        const imgRef = useRef<ImgRef>(null);
        const videoRef = useRef<VideoRef>(null);
        const { ref: overlayRef } = useFadeoutOverlay();
        const timerRef = useRef<number | undefined>(undefined);
        const { debug, debugMessage } = useDebug();

        useImperativeHandle(ref, () => ({
            advanceNext,
        }));

        const itemsJson = useMemo(() => JSON.stringify(items), [items]);
        useEffect(() => {
            debugMessage({ message: `items changed`, severity: 'info' });
            setIndexData(prev => {
                const index = prev.index < items.length ? prev.index : 0;
                return { index, changedAt: Date.now() };
            });
        }, [itemsJson]);

        useEffect(() => {
            if (!play) return;
            startItem({ isFirst: false });
        }, [indexData]);

        useEffect(() => {
            if (play) {
                startItem({ isFirst: true });
            } else {
                stopItem();
            }
            return () => stopItem();
        }, [play]);

        async function startItem(params: { isFirst: boolean }) {
            if (!videoRef.current) return;

            const process = async () => {
                overlayRef.current?.startFadeout({ mediaRef: [imgRef.current?.elementRef, videoRef.current?.elementRef].filter(isVisible)[0], duration: FADE_DURATION });
                await setElements();
                resetEvents();
            };
            // 古い端末用に、一旦ダミー動画を再生させる
            if (params.isFirst) {
                await videoRef.current.setSrc(interactionDummyVideo, { noDbCache: true });
                await videoRef.current.play();
            }
            await process();
        }

        function stopItem() {
            videoRef.current?.pause();
            clearTimeout(timerRef.current)
            changeShow('none');
        }


        function advanceNext() {
            setIndexData(prev => {
                const newIndex = prev.index + 1;
                const result = newIndex >= items.length ? 0 : newIndex
                debugMessage({ message: `advanceNext: ${result}`, severity: 'info' });
                return { index: result, changedAt: Date.now() };
            });
        }

        async function setElements() {
            if (!item) {
                videoRef.current?.pause();
                return changeShow('none');
            };
            switch (item.type) {
                case 'image':
                    imgRef.current?.fadeIn();
                    await imgRef.current?.setSrc(item.src);
                    videoRef.current?.pause();
                    changeShow('image');
                    break;
                case 'video':
                    if (!videoRef.current) break;
                    videoRef.current.fadeIn();
                    debugMessage({ message: 'start video', severity: 'info' });
                    await videoRef.current.setSrc(item.src);
                    await videoRef.current.play();
                    changeShow('video');
                    break;
            }
        }

        function changeShow(type: 'image' | 'video' | 'none') {
            if (!imgRef.current || !videoRef.current) {
                return;
            }
            if (type == 'image') {
                imgRef.current.changeShow(true);
                videoRef.current.changeShow(false);
            } else if (type == 'video') {
                imgRef.current.changeShow(false);
                videoRef.current.changeShow(true);
            } else if (type == 'none') {
                imgRef.current.changeShow(false);
                videoRef.current.changeShow(false);
            }
        }

        function resetEvents() {
            if (item?.type != 'image') return;
            clearTimeout(timerRef.current);
            const second = item.second ?? 0;
            if (second > 0) {
                timerRef.current = setTimeout(() => {
                    advanceNext();
                }, second * 1000);
            }
        }

        return <>
            <FullscreenableContainer play={play} fullScreen={fullScreen} style={{ position: "relative", ...size }} onFullscreenChange={onFullScreenChange}>
                <Img
                    ref={imgRef}
                />
                <Video
                    ref={videoRef}
                    onEnded={advanceNext}
                    muted={mute}
                    useDbCache={useDbCache}
                />
                <FadeoutOverlay ref={overlayRef} {...size} />
                {debug && <Toaster position="bottom-right" />}
            </FullscreenableContainer>
        </>
    }
);


function isVisible(ref: React.RefObject<HTMLElement | null> | undefined) {
    if (!ref?.current) return false;
    return ref.current.style.display != 'none';
}

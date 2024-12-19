import { animated, useSpring } from "@react-spring/web";
import { VideoHTMLAttributes, forwardRef, useImperativeHandle, useRef } from "react";
import { FADE_DURATION } from "../../../consts";
import { useCacher } from "../../cacher";
import { useDebug } from "../../debug/useDebug";
import { ItemBaseStyle } from "./consts";
import { useVideoError } from "./hooks/useVideoError";
import { MediaItemRefBase } from "./types";

type VideoProps = VideoHTMLAttributes<HTMLVideoElement> & {
    muted: boolean | undefined;
    useDbCache: boolean | undefined;
}

export interface VideoRef extends MediaItemRefBase {
    elementRef: React.RefObject<HTMLVideoElement>;
    play: () => Promise<void>;
    pause: () => void;
}


export const Video = forwardRef<VideoRef, VideoProps>(
    function Video(props, ref) {
        const { useDbCache } = props;
        const elementRef = useRef<HTMLVideoElement>(null);
        const { debugMessage } = useDebug();
        const { handleVideoError, resetSpan } = useVideoError({ ref: elementRef });
        const [fadeInSpring, fadeInSpringApi] = useSpring(() => ({}));
        const { getOrFetchAndCache } = useCacher();

        useImperativeHandle(ref, () => ({
            changeShow: (show: boolean) => {
                if (!elementRef.current) return;
                elementRef.current.style.display = show ? 'block' : 'none';
            },
            fadeIn: () => {
                fadeInSpringApi.start({
                    from: { opacity: 0 },
                    to: { opacity: 1 },
                    config: { duration: FADE_DURATION }
                });
            },
            setSrc: async (src: string, ops?: { noDbCache?: boolean }) => {
                const { noDbCache } = ops || {};
                if (!elementRef.current) return;
                const newSrc = (!noDbCache && useDbCache) ? await getOrFetchAndCache(src) : src;
                elementRef.current.src = newSrc;
            },
            play: async () => {
                if (!elementRef.current) return Promise.reject();
                return elementRef.current.play();
            },
            pause: () => {
                if (!elementRef.current) return;
                elementRef.current.pause();
            },
            elementRef: elementRef
        }));

        function onEnded(ev: any) {
            resetSpan();
            return props.onEnded?.(ev);
        }

        return <>
            <animated.video
                ref={elementRef}
                onError={handleVideoError}
                onEnded={onEnded}
                onWaiting={() => debugMessage({ message: 'video waiting', severity: 'warning' })}
                playsInline={true}
                style={{
                    ...ItemBaseStyle,
                    ...fadeInSpring,
                }}
                muted={props.muted}
            // preload="auto"
            />
        </>
    });
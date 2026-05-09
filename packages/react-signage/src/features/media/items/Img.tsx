import { animated, useSpring } from '@react-spring/web';
import { forwardRef, useImperativeHandle, useRef } from "react";
import { FADE_DURATION } from '../../../consts';
import { ItemBaseStyle } from './consts';
import { MediaItemRefBase } from './types';
import { useCacher } from '../../cacher';
import { useDataStore } from '../../cacher/useDataStore';

type Props = {
    useDbCache?: boolean;
}

export interface ImgRef extends MediaItemRefBase {
    elementRef: React.RefObject<HTMLImageElement | null>;
}

export const Img = forwardRef<ImgRef, Props>(
    function Img(props, ref) {
        const { useDbCache } = props;
        const elementRef = useRef<HTMLImageElement>(null);
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
            elementRef: elementRef
        }));

        return <>
            <animated.img
                ref={elementRef}
                style={{
                    ...ItemBaseStyle,
                    ...fadeInSpring
                }}
            />
        </>
    }
);

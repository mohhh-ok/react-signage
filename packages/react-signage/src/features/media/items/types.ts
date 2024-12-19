export interface MediaItemRefBase {
    changeShow: (show: boolean) => void;
    fadeIn: () => void;
    setSrc: (src: string, ops?: { noDbCache?: boolean }) => Promise<void>;
}

import { render } from '@testing-library/react';
import { FullscreenableContainer } from './FullscreenableContainer';

function setFullscreenSupport(enabled: boolean) {
    Object.defineProperty(document, 'fullscreenEnabled', {
        value: enabled,
        configurable: true,
    });
}

function setFullscreenElement(el: Element | null) {
    Object.defineProperty(document, 'fullscreenElement', {
        value: el,
        configurable: true,
    });
}

describe('FullscreenableContainer', () => {
    beforeEach(() => {
        setFullscreenSupport(true);
        setFullscreenElement(null);
        HTMLDivElement.prototype.requestFullscreen = vi.fn().mockResolvedValue(undefined);
        document.exitFullscreen = vi.fn().mockResolvedValue(undefined);
    });

    it('requests fullscreen when fullScreen=true and play=true', () => {
        const { container } = render(
            <FullscreenableContainer play={true} fullScreen={true}>
                <span>x</span>
            </FullscreenableContainer>
        );
        const div = container.firstChild as HTMLDivElement;
        expect(div.requestFullscreen).toHaveBeenCalled();
    });

    it('does not request fullscreen when play=false', () => {
        const { container } = render(
            <FullscreenableContainer play={false} fullScreen={true}>
                <span>x</span>
            </FullscreenableContainer>
        );
        const div = container.firstChild as HTMLDivElement;
        expect(div.requestFullscreen).not.toHaveBeenCalled();
    });

    it('uses fallback inline style when fullscreenEnabled=false', () => {
        setFullscreenSupport(false);
        const { container } = render(
            <FullscreenableContainer play={true} fullScreen={true}>
                <span>x</span>
            </FullscreenableContainer>
        );
        const div = container.firstChild as HTMLElement;
        expect(div.style.position).toBe('fixed');
        expect(div.style.top).toBe('0px');
        expect(div.style.zIndex).toBe('1000');
    });

    it('exits fullscreen when fullScreen toggles to false while document is fullscreen', () => {
        setFullscreenElement(document.body);
        render(
            <FullscreenableContainer play={true} fullScreen={false}>
                <span>x</span>
            </FullscreenableContainer>
        );
        expect(document.exitFullscreen).toHaveBeenCalled();
    });

    it('clears the fallback style when fullScreen becomes false (no native support)', () => {
        setFullscreenSupport(false);
        const { container, rerender } = render(
            <FullscreenableContainer play={true} fullScreen={true}>
                <span>x</span>
            </FullscreenableContainer>
        );
        const div = container.firstChild as HTMLElement;
        expect(div.style.position).toBe('fixed');
        rerender(
            <FullscreenableContainer play={true} fullScreen={false}>
                <span>x</span>
            </FullscreenableContainer>
        );
        expect(div.style.position).toBe('');
    });

    it('forwards fullscreenchange events through onFullscreenChange', () => {
        const onChange = vi.fn();
        render(
            <FullscreenableContainer play={true} fullScreen={true} onFullscreenChange={onChange}>
                <span>x</span>
            </FullscreenableContainer>
        );
        setFullscreenElement(document.body);
        window.dispatchEvent(new Event('fullscreenchange'));
        expect(onChange).toHaveBeenCalledWith(true);

        setFullscreenElement(null);
        window.dispatchEvent(new Event('fullscreenchange'));
        expect(onChange).toHaveBeenCalledWith(false);
    });
});

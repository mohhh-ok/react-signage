import { Context } from './context';
import { presets } from './presets';
import { useSearchParams } from 'react-router';


type PresetProviderProps = {
    children: React.ReactNode;
}
export function PresetProvider({ children }: PresetProviderProps) {
    const [searchParams, setSearchParams] = useSearchParams();
    const presetName = searchParams.get('preset');
    const preset = presets.find(p => p.name === presetName) || presets[0];

    function setPresetName(presetName: string) {
        if (!presets.some(p => p.name === presetName)) return;
        const next = new URLSearchParams(searchParams);
        next.set('preset', presetName);
        setSearchParams(next);
    }


    return <Context.Provider value={{ preset, setPresetName }}>
        {children}
    </Context.Provider>;
}

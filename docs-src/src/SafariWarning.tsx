import { Alert } from "@mui/material";

export function NoChromeWarning() {
    const isChrome = /Chrome/.test(navigator.userAgent);
    if (isChrome) return null;
    return null;
    return <Alert severity="warning">This app is supported on Chrome.</Alert>
}
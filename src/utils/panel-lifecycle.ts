import { CLOSE_PANELS, PAGE_BEFORE_REPLACE } from "./page-lifecycle";

export function bindPanelLifecycle(options: {
    isOpen: () => boolean;
    close: () => void;
    triggerId: string | (() => string);
}) {
    const close = () => options.close();
    const handleKey = (event: KeyboardEvent) => {
        if (event.key !== "Escape" || !options.isOpen()) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        options.close();
        const triggerId = typeof options.triggerId === "function" ? options.triggerId() : options.triggerId;
        document.getElementById(triggerId)?.focus();
    };
    document.addEventListener("keydown", handleKey);
    document.addEventListener(CLOSE_PANELS, close);
    document.addEventListener(PAGE_BEFORE_REPLACE, close);
    return () => {
        document.removeEventListener("keydown", handleKey);
        document.removeEventListener(CLOSE_PANELS, close);
        document.removeEventListener(PAGE_BEFORE_REPLACE, close);
    };
}

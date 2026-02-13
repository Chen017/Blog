import {
    DARK_MODE,
} from "@constants/constants";
import type {
    LIGHT_DARK_MODE,
} from "@/types/config";
import {
    siteConfig,
} from "@/config";


// Function to apply theme to document
export function applyThemeToDocument(theme: LIGHT_DARK_MODE, force = false) {
    if (typeof document === "undefined") return;
    const currentIsDark = document.documentElement.classList.contains("dark");
    const currentTheme = document.documentElement.getAttribute("data-theme");
    // Force dark mode globally regardless of requested theme.
    const targetIsDark = true;
    const needsThemeChange = currentIsDark !== targetIsDark;
    const targetTheme = "github-dark";
    const needsCodeThemeUpdate = currentTheme !== targetTheme;
    if (!force && !needsThemeChange && !needsCodeThemeUpdate) {
        return;
    }
    if (needsThemeChange) {
        document.documentElement.classList.add("is-theme-transitioning");
    }
    requestAnimationFrame(() => {
        if (needsThemeChange) {
            document.documentElement.classList.add("dark");
        }
        document.documentElement.setAttribute("data-theme", targetTheme);
        if (needsThemeChange) {
            requestAnimationFrame(() => {
                document.documentElement.classList.remove("is-theme-transitioning");
            });
        }
    });
}

// Function to set theme
export function setTheme(theme: LIGHT_DARK_MODE): void {
    if (typeof localStorage !== "undefined") {
        localStorage.setItem("theme", DARK_MODE);
    }
    applyThemeToDocument(DARK_MODE);
}

// Function to get default theme from config-carrier
export function getDefaultTheme(): LIGHT_DARK_MODE {
    const fallback = siteConfig.defaultTheme;
    if (typeof document !== "undefined") {
        const configCarrier = document.getElementById("config-carrier");
        return (configCarrier?.dataset.theme as LIGHT_DARK_MODE) || fallback;
    }
    return fallback;
}

// Function to get stored theme from local storage or default
export function getStoredTheme(): LIGHT_DARK_MODE {
    return DARK_MODE;
}

// Function to initialize theme from local storage or default
export function initTheme(): void {
    if (typeof window === "undefined") return;
    applyThemeToDocument(DARK_MODE, true);
    if (typeof localStorage !== "undefined") {
        localStorage.setItem("theme", DARK_MODE);
    }
}
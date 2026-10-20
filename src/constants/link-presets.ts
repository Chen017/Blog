import { LinkPreset, type NavbarLink } from "@/types/config";
import { i18n } from "@i18n/translation";
import I18nKey from "@i18n/i18nKey";


export const LinkPresets: { [key in LinkPreset]: NavbarLink } = {
    [LinkPreset.Home]: {
        name: i18n(I18nKey.home),
        url: "/",
        icon: "material-symbols:home",
        description: "This is homepage",
    },
    [LinkPreset.Archive]: {
        name: i18n(I18nKey.archive),
        url: "/archive/",
        icon: "material-symbols:archive",
        description: "A list of all published posts",
    },
    [LinkPreset.Skills]: {
        name: i18n(I18nKey.skills),
        url: "/skills/",
        icon: "material-symbols:psychology",
        description: i18n(I18nKey.skillsSubtitle),
    },
    [LinkPreset.Friends]: {
        name: i18n(I18nKey.friends),
        url: "/friends/",
        icon: "material-symbols:group",
        description: "My other websites",
    },
    [LinkPreset.About]: {
        name: i18n(I18nKey.about),
        url: "/about/",
        icon: "material-symbols:info",
        description: i18n(I18nKey.about),
    },
};
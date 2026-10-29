import type { FancyboxOptions } from "@fancyapps/ui";
import fancyboxStyleUrl from "@fancyapps/ui/dist/fancybox/fancybox.css?url";
import customStyleUrl from "@styles/fancybox.css?url";

let fancyboxSelectors: string[] = [];
let Fancybox: typeof import("@fancyapps/ui").Fancybox | undefined;
let generation = 0;
let stylesReady: Promise<unknown> | undefined;

function loadStyles() {
	if (stylesReady) return stylesReady;
	stylesReady = Promise.all(
		[fancyboxStyleUrl, customStyleUrl].map(
			(href) =>
				new Promise<void>((resolve, reject) => {
					const link = document.createElement("link");
					link.rel = "stylesheet";
					link.href = href;
					link.onload = () => resolve();
					link.onerror = () => {
						link.remove();
						reject(new Error("Could not load image viewer styles"));
					};
					document.head.append(link);
				}),
		),
	).catch((error) => {
		stylesReady = undefined;
		throw error;
	});
	return stylesReady;
}

// 图片灯箱按需加载
export async function initFancybox() {
	if (typeof document === "undefined") return;
	const currentGeneration = generation;
	// 相册图片选择器 (只绑定不在 a 标签内的图片，避免与链接绑定冲突)
	const albumImagesSelector =
		".custom-md img:not(a *):not([hidden]), #post-cover img:not(a *):not([hidden]), .moment-images img:not(a *):not([hidden]), .photo-gallery img:not(a *):not([hidden])";
	// 相册链接选择器
	const albumLinksSelector =
		".moment-images a[data-fancybox], .photo-gallery a[data-fancybox]";
	// 单张图片选择器
	const singleFancyboxSelector =
		"[data-fancybox]:not(.moment-images a):not(.photo-gallery a)";
	// 检查是否有图片需要绑定
	const hasImages =
		document.querySelector(albumImagesSelector) ||
		document.querySelector(albumLinksSelector) ||
		document.querySelector(singleFancyboxSelector);
	if (!hasImages) return;
	// 检查是否已初始化 Fancybox
	if (!Fancybox) {
		const mod = await import("@fancyapps/ui");
		Fancybox = mod.Fancybox;
	}
	await loadStyles();
	if (generation !== currentGeneration) return;
	if (fancyboxSelectors.length > 0) {
		return; // 已经初始化，直接返回
	}
	// 公共配置
	const commonConfig: Partial<FancyboxOptions> = {
		mainClass: "voyage-viewer",
		theme: "dark",
		idle: false,
		placeFocusBack: true,
		Carousel: {
			infinite: true,
			Lazyload: { preload: 2 },
			Thumbs: { type: "classic", showOnStart: false },
			Toolbar: {
				display: {
					left: ["counter"],
					middle: [],
					right: ["toggle1to1", "autoplay", "fullscreen", "thumbs", "close"],
				},
			},
		},
		on: {
			init: (instance) => {
				const reduce = window.matchMedia(
					"(prefers-reduced-motion: reduce)",
				).matches;
				instance.getOptions().zoomEffect = !reduce;
				instance.getOptions().fadeEffect = !reduce;
			},
		},
		dragToClose: true,
		keyboard: {
			Escape: "close",
			Delete: "close",
			Backspace: "close",
			PageUp: "prev",
			PageDown: "next",
			ArrowUp: "prev",
			ArrowDown: "next",
			ArrowRight: "next",
			ArrowLeft: "prev",
		},
	};
	// 绑定相册/文章图片
	Fancybox.bind(albumImagesSelector, {
		...commonConfig,
		groupAll: true,
		Carousel: {
			...commonConfig.Carousel,
			transition: "slide",
		},
	});
	fancyboxSelectors.push(albumImagesSelector);
	// 绑定相册链接
	Fancybox.bind(albumLinksSelector, {
		...commonConfig,
	});
	fancyboxSelectors.push(albumLinksSelector);
	// 绑定单独的 fancybox 图片
	Fancybox.bind(singleFancyboxSelector, commonConfig);
	fancyboxSelectors.push(singleFancyboxSelector);
}

// 清理 Fancybox 实例
export function cleanupFancybox() {
	generation++;
	if (!Fancybox) return; // 如果从未加载过，无需清理
	Fancybox.close?.();
	for (const selector of fancyboxSelectors) Fancybox.unbind(selector);
	fancyboxSelectors = [];
}

# MiSans fonts used by this website

This website uses MiSans and MiSans Latin, created by Xiaomi and its font partners.
Font files are served by the blog itself. The fonts retain their original glyphs;
no font subsetting, redrawing, or conversion was performed.

Official source: https://hyperos.mi.com/font/zh/download/
Official FAQ: https://hyperos.mi.com/font/faq
License: https://hyperos.mi.com/font-download/MiSans字体知识产权许可协议.pdf

Retrieved and verified on 2026-10-19:

| File | Official archive | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| MiSansLatin-Regular.woff2 | https://hyperos.mi.com/font-download/MiSans_Latin.zip | 61,144 | fc17182f3f2b941cef6ca1317cb50d556532fdff46d8c540234543947b9fa0e5 |
| MiSansLatin-Semibold.woff2 | https://hyperos.mi.com/font-download/MiSans_Latin.zip | 69,284 | 8d81deaf1c0fae067649d572171f63c08c2bb434c3a3263aa6f1c831282a2c46 |
| Existing public/MiSans/woff2/MiSans-Normal.woff2 | https://hyperos.mi.com/font-download/MiSans.zip | 4,882,604 | 672d1ab1cc9c89a91ce57c00fd972ab7a8ac04c7444991acd841698e58837af6 |

The existing Chinese file was compared byte for byte with the official archive.
It remains at its original URL for compatibility. Astro's local Fonts API also
emits a fingerprinted copy for the generated font-face declaration. The browser
requests that copy, not both copies.

Only the Latin Regular face is preloaded. Chinese and Semibold load when used.
The Chinese file is still 4.88 MB: this change improves loading priority and
English text rendering, and does not claim to reduce the full Chinese font size.
Code and math retain their dedicated fonts to preserve alignment and formulas.

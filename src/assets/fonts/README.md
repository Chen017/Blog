# MiSans fonts used by this website

The Voyage homepage additionally uses locally hosted Latin subsets of DM Sans
and Instrument Serif from Google Fonts, retrieved on 2026-10-29. Both are
licensed under the SIL Open Font License; the original licenses are included
as `DM-Sans-OFL.txt` and `Instrument-Serif-OFL.txt`. No third-party font request
is made by the homepage. Article and archive pages retain MiSans.

This website uses MiSans Latin, created by Xiaomi and its font partners, for
English, Arabic numerals, and English punctuation. Chinese text and punctuation
use the device's system font.
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
It remains at its original URL for compatibility, but is no longer declared in
the website's font stack or requested by ordinary pages.

Only the Latin Regular face is preloaded. Latin Semibold loads when used.
The unmodified Latin fonts contain every printable ASCII character (U+0020-007E),
including all digits and English punctuation, plus curly quotes, en/em dashes,
and ellipses. They do not contain Chinese ideographs or Chinese punctuation.
Removing the full Chinese font from the font stack avoids its 4.88 MB request;
Chinese glyphs and line wrapping can consequently differ between devices.
Code and math retain their dedicated fonts to preserve alignment and formulas.

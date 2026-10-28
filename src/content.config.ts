import { defineCollection } from "astro:content";
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

import { getCategoryPathParts } from "@utils/category";
import { hasValidPostPassword } from "@utils/post-security";


// Helper for handling dates that might be empty strings from JSON
const optionalDateSchema = z.preprocess((arg) => {
    if (typeof arg === "string" && arg.trim() === "") return undefined;
    return arg;
}, z.coerce.date().optional());

const categorySchema = z.preprocess((arg) => {
    const parts = getCategoryPathParts(arg as any);
    return parts ?? arg;
}, z.union([z.string(), z.array(z.string())]).optional().nullable().default(""));


const postsCollection = defineCollection({
    loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: "./src/content/posts" }),
    schema: z.object({
        title: z.coerce.string(),
        directoryTitle: z.coerce.string().optional().default("").transform(s => s.trim()),
        published: optionalDateSchema,
        updated: optionalDateSchema,
        description: z.string().optional().default(""),
        displayTitle: z.string().optional(),
        displayDescription: z.string().optional(),
        cover: z.string().optional().default(""),
        coverInContent: z.boolean().optional().default(false),
        category: categorySchema,
        lang: z.string().optional().default(""),
        pinned: z.boolean().optional().default(false),
        comment: z.boolean().optional().default(true),
        draft: z.boolean().optional().default(false),

        /* Page encryption fields */
        encrypted: z.boolean().optional().default(false),
        password: z.string().optional().default(""),

        /* Copy protection fields */
        copyProtection: z.object({
            blockSelection: z.boolean().optional().default(false),
            blockClipboard: z.boolean().optional().default(false),
            blockContextMenu: z.boolean().optional().default(false),
            blockDevTools: z.boolean().optional().default(false),
        }).optional().default({
            blockSelection: false,
            blockClipboard: false,
            blockContextMenu: false,
            blockDevTools: false,
        }),

        /* Custom routeName */
        routeName: z.string().optional(),

        /* For internal use */
        prevTitle: z.string().default(""),
        prevSlug: z.string().default(""),
        nextTitle: z.string().default(""),
        nextSlug: z.string().default(""),
    }).refine(hasValidPostPassword, {
        message: "Encrypted posts require a non-empty password.",
        path: ["password"],
    }),
});

const specCollection = defineCollection({
    loader: glob({ pattern: '[^_]*.{md,mdx}', base: "./src/content" }),
    schema: z.object({
        title: z.coerce.string().optional(),
        description: z.string().optional(),
    }),
});

export const collections = {
    posts: postsCollection,
    spec: specCollection,
};

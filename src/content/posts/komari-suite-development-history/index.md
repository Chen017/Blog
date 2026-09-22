---
title: "From a Single Tool to Four Projects: The Development Chronicle of Komari Theme & Plugins — A Wrap-Up Gift to Myself"
directoryTitle: "Komari Suite Journey"
published: 2026-09-22
description: "A retrospective on evolving Komari from a humble IP quality logging script into a coordinated 4-project monitoring and observability ecosystem."
category: "Development"
tags:
  - "Komari"
  - "Open Source"
  - "Architecture"
  - "DevLog"
cover: "https://raw.githubusercontent.com/Chen017/komari-emerald-suite/main/docs/ecosystem.png"
coverInContent: true
---

# From a Single Tool to Four Projects: The Development Chronicle of Komari Theme & Plugins — A Wrap-Up Gift to Myself

![Komari Emerald Ecosystem](https://raw.githubusercontent.com/Chen017/komari-emerald-suite/main/docs/ecosystem.png)

## September 12 — Morning
It all started with **IP-Quality-Archive**. Initially, it was just a simple script to persist IPQuality inspection results. Soon enough, I added dual-stack (IPv4/IPv6) history tracking, risk assessment, streaming unlock verification, and automated cron jobs. By afternoon, I realized that fixed-interval sampling would inadvertently skip records where actual changes occurred, so I pivoted the strategy to prioritize recording change points.

## September 13, Evening – September 14, Afternoon
I continued fleshing out risk grading, change notifications, and daily summaries. By this point, the core challenge had shifted from *"how to store data"* to *"how to discern meaningful changes across an ever-growing historical dataset."*

## September 20 — Afternoon
Tired of SSH-ing into individual VPS nodes one by one just to inspect results, I began building **komari-plugin-ipqa-alert-report**. It was conceived purely as an alerting plugin, but on day one I bumped into roadblocks with Komari's `TaskResult` semantics, notification payload formatting, and admin panel quirks.

## September 21 — Evening
The plugin continued to expand with archive storage, read-only REST APIs, and RPC handlers. Concurrently, I shifted focus to the existing **Emerald Theme**, intensely developing **Resource Insights**—cramming cost tracking, 7/30-day traffic metrics, uptime/availability rates, and IPQA visualization into a tight schedule. In no time, I ran headfirst into data retention, downsampling, UTC vs. Beijing time (UTC+8) timezone discrepancies, and legacy history API compatibility issues.

## September 22 — Morning
Availability was the first component to spiral out of control: inferring online/offline transitions from CPU metrics ended up swallowing real offline downtime, and at one point I even mistakenly treated `updated_at` as a heartbeat timestamp. Meanwhile, on the traffic front, I found myself endlessly patching 30-day aggregation, billing cycle reset dates, timezone logic, and Metric Store compatibility.

## September 22 — Midday
I executed a ruthless cleanup: decoupled availability into an independent dedicated plugin, simplified traffic handling, and tore down a bunch of legacy History compatibility layers. The codebase shrank dramatically, but in the heat of refactoring, I also accidentally threw out critical historical data processing that Traffic genuinely depended on.

## September 22 — Afternoon
The fourth project, **komari-plugin-availability-history**, emerged. Instead of guessing uptime after the fact, it directly hooks into WebSocket `connect` / `disconnect` events to maintain an exact availability ledger. The initial version stumbled over `load()`, `require('server')`, plugin manifest definitions, and persistent storage directories. After ironing those out and deliberately disconnecting an agent for a live test, offline events were finally recorded with rock-solid consistency.

## September 22 — Evening
Time to circle back and fix Traffic. I started by retrieving the accidentally pruned architecture from Git history, but the 30-day timeframe issue persisted. After digging into the internals of the Komari Metric Store, I realized that long-range queries were getting dragged down into 24-hour rollups by their oldest starting point. Ultimately, I resolved it by switching to segmented queries combined with adaptive subdivision, supplemented by coarse granularity detection, request race-condition guards, and cache/loading edge-case handling. Only then did the 30-day view and current billing cycle metrics truly stabilize.

---

Over the past few days, I was essentially repeating the same cycle: rush to add features, watch complexity explode, realize the architecture took a wrong turn, and then painstakingly decouple collection, history, aggregation, and presentation all over again.

Thankfully, everything is now finally complete — 🎉 cheers!

Feel free to check out the project on GitHub: [https://github.com/Chen017/komari-emerald-suite](https://github.com/Chen017/komari-emerald-suite)

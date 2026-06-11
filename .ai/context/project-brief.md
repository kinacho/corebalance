# CoreBalance Project Brief

## Overview
CoreBalance is a local-first, premium portfolio tracking and rebalancing web application designed for individual long-term investors.

## Audience & Core Mission
- **Target**: Individual long-term investors (DIY indexing, passive portfolios).
- **Mission**: Provide clear asset visibility, automatic portfolio rebalancing suggestions, and risk analysis without compromising user privacy.

## Key Jobs to be Done (JTBD)
1. **Track Portfolio Value**: Aggregate holdings and compute real-time values using public APIs.
2. **Rebalance Portfolio**: Calculate exact buy/sell amounts needed to match target allocation percentages.
3. **Simulate Crisis Impacts**: Model historical drawdowns on current holdings to assess risk tolerance.
4. **Protect Privacy**: Run calculations locally using Dexie.js (IndexedDB); backup/sync to cloud is opt-in (Firebase).

## Strategic Priorities
- Performance & Offline capability (PWA).
- Local-first architecture (Dexie IndexedDB fallback).
- Premium, high-quality aesthetic (Tailwind v4, Glassmorphism, smooth Chart.js views).
- Zero registration barrier.

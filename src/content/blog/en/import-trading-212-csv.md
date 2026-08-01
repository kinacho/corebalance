---
title: "Importing Your Trading 212 CSV into CoreBalance: Step-by-Step Guide"
description: "How to export your Trading 212 order history to CSV and import it into CoreBalance: automatic detection, weighted average cost and multi-currency."
summary:
  - "Trading 212 lets you export your history to CSV; CoreBalance auto-detects the format from its headers (Action, ISIN, No. of shares, Price / share…)."
  - "The importer processes buy and sell orders, sorts them chronologically and rebuilds each position with its weighted average purchase cost."
  - "Deposit, dividend and interest rows are not imported as transactions: they are listed as skipped with a reason, so nothing disappears silently."
publishDate: "2026-08-01"
updatedDate: "2026-08-01"
author: "kinacho"
tags: [trading 212, import, csv, etfs]
lang: en
canonical: "https://corebalance.app/blog/import-trading-212-csv"
ogImage: "/blog/og/import-trading-212-csv.jpg"
slugs: { es: 'importar-csv-trading-212', en: 'import-trading-212-csv' }
---

Trading 212 has become one of the favourite brokers for European index investors: commission-free trading, fractional shares, and the "Pies" feature that makes recurring contributions painless. What it does not give you out of the box is a clear view of **how far each asset has drifted from its target weight**, or a calculator that tells you where next month's contribution should go.

That is where CoreBalance comes in: you export your order history to CSV, import it, and the app rebuilds your positions with their average purchase cost so you can [rebalance your index portfolio](/blog/how-to-rebalance-indexed-portfolio) with contributions instead of sales. This guide walks through the whole process and — most importantly — explains **exactly what the importer does with your data**. No magic, no vague promises.

---

## 1. Why Import the History Instead of Typing Positions In

You can of course add your assets to CoreBalance manually. But if you have been making recurring contributions on Trading 212 for months or years, your real position is the sum of dozens of small purchases at different prices, many of them fractional. Working out the weighted average cost of all that by hand is tedious and error-prone.

Importing the CSV gets you:

* **An exact average purchase cost**, computed from every real order.
* **Fractional shares preserved** exactly as Trading 212 exports them (the importer never rounds to whole units).
* **Sales accounted for correctly**: a sell reduces shares and total cost proportionally, without changing the average cost of what you keep.

The entire process happens **in your browser** — the CSV is never uploaded to any server.

---

## 2. How to Export Your Trading 212 History to CSV

Trading 212 lets you export your account history to CSV from the app or the web platform. Roughly (the UI changes from time to time, so treat this as orientation):

1. Log into your Trading 212 account (mobile app or web).
2. Go to your account **History**.
3. Look for the **export** option (download/share icon).
4. Pick the **date range** — ideally from your very first trade — and make sure **Orders** are included. You can also include dividends and cash transactions; they do no harm.
5. Generate the CSV and download it (depending on the version, it downloads directly or arrives by email).

The resulting file has English headers such as `Action`, `Time`, `ISIN`, `Ticker`, `Name`, `No. of shares`, `Price / share`, `Currency (Price / share)` and `Exchange rate`. Those are precisely the headers CoreBalance uses to recognise the format.

---

## 3. Importing the CSV into CoreBalance

1. Open the [CoreBalance dashboard](/dashboard) and hit the **import CSV** button.
2. Select the file. The Trading 212 detector checks the headers against a list of format markers (`Action`, `No. of shares`, `Price / share`, `ISIN`, `Ticker`, `Exchange rate`, `Stamp duty`…). If enough of them match, you will see a **"Trading 212 detected"** notice and parsing is fully automatic.
3. Review the list of rebuilt positions, untick any you do not want, and choose the **target category** (core, satellite or stocks).
4. CoreBalance resolves each **ISIN to a quotable ticker** so it can fetch live prices, and on confirmation it creates the new assets (with a 0% target weight, which you adjust afterwards) or updates the holdings of assets you already track.

### What If the File Is Not Detected Automatically?

If automatic detection does not reach enough confidence (for instance with a heavily trimmed or edited CSV), CoreBalance falls back to **manual column mapping**: you tell it which column holds the quantity, which one the price, which one the ISIN, and so on. It is the same mechanism used for generic CSVs from any other source.

---

## 4. What the Parser Actually Does with Your Rows

This is what happens under the hood, all of it verifiable in the importer's code:

* **Only buy and sell orders are processed**: any `Action` containing *buy* or *sell* (Market buy, Limit buy, Market sell, Limit sell…). Every other row is skipped explicitly.
* From each order it reads the **ISIN, ticker, name, number of shares, price per share, price currency and date** (the `Time` column). Rows without a valid ISIN, or with a quantity of zero, are discarded and logged with a reason.
* It sorts all transactions **chronologically** and consolidates them per asset using the **weighted average cost** method: each buy adds shares and cost; each sell removes shares and reduces total cost proportionally at the previous average cost (selling does not change the average cost of the remainder).
* It understands both **European (1.234,56) and American (1,234.56)** number formats.
* **Multi-currency**: each position keeps the original currency from the CSV — Trading 212 frequently exports prices in USD or GBP. When valuing your portfolio, CoreBalance applies the corresponding exchange rate so that everything — current value and average cost — is shown in your base currency.

### What Happens to Dividends, Deposits and Interest in the CSV?

They are not imported as transactions: the Trading 212 parser only converts buys and sells. Those rows show up in the **skipped-rows summary**, each with its reason, so you know exactly what was left out. If you track dividends closely, you can record them manually afterwards in CoreBalance's transaction ledger, where they lower the position's average cost.

### Why Is an Asset I Fully Sold Missing?

Because that is the correct outcome: if replaying your entire history leaves a position at zero shares, the importer **does not include it** in the result. Only live positions are imported — they are the ones that matter for rebalancing.

---

## 5. Common Issues

* **"Invalid ISIN" on several rows**: these are usually rows that are not security orders (adjustments, cash movements). Check the skipped-rows detail; if a genuine order lands there, make sure the ISIN column was not mangled by opening the CSV in Excel.
* **An edited CSV is no longer detected**: opening and re-saving the file in a spreadsheet can change delimiters or headers. Use the original Trading 212 file, or fall back to manual mapping.
* **You only exported the last few months**: the average cost will be wrong because older purchases are missing. Export from your first trade onwards.
* **An ISIN does not resolve to a ticker**: it can happen with very exotic assets; you can assign the ticker manually or add the asset by hand.

---

## 6. After the Import: Target Weights and Rebalancing

With your positions loaded, the important part begins: assign each asset its **target weight** (imported assets start at 0%) and let CoreBalance compute the drifts. Since Trading 212 portfolios are built with [ETFs rather than transferable index funds](/blog/index-funds-vs-etfs-comparison), the sensible strategy is to rebalance **with new contributions only**, directing each purchase to the most underweight asset — and to decide [when to rebalance](/blog/when-to-rebalance-portfolio) using a calendar or tolerance bands rather than gut feeling.

If your portfolio is of the "one world ETF" kind, you may also enjoy the [IWDA vs VWCE comparison](/blog/iwda-vs-vwce-comparison) — two of the most bought ETFs on Trading 212.

> [!TIP]
> Keep the CSV you exported. If you ever want to re-import from scratch or audit a figure, having the complete original history saves you another round with the broker's export filters.

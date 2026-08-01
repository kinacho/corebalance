---
title: "Importing Your Interactive Brokers CSV into CoreBalance: Full Guide"
description: "Step-by-step guide to importing your Interactive Brokers Activity Statement CSV into CoreBalance: auto-detection, multi-currency and average cost."
summary:
  - "CoreBalance recognizes IBKR's multi-section Activity Statement CSV (Header/Data rows per section) as well as single-table exports with columns like Symbol, Quantity and Price."
  - "If the file contains a Trades section, each position is rebuilt with its weighted average cost; if only positions are present, the snapshot is imported with its Average Cost."
  - "Every position keeps its trading currency (USD, EUR...); conversion to your base currency uses the current market exchange rate, not the historical rate of each trade."
publishDate: "2026-08-01"
updatedDate: "2026-08-01"
author: "kinacho"
tags: [interactive brokers, import, csv, etfs]
lang: en
canonical: "https://corebalance.app/blog/import-interactive-brokers-csv"
ogImage: "/blog/og/import-interactive-brokers-csv.jpg"
slugs: { es: 'importar-csv-interactive-brokers', en: 'import-interactive-brokers-csv' }
---

Interactive Brokers (IBKR) is the broker of choice for many European investors thanks to its low commissions and access to exchanges around the world. Its well-known weak spot is reporting. Between TWS, the web portal and Flex Queries, IBKR offers half a dozen ways to export your data — and none of them is designed to be typed by hand into a portfolio tool.

CoreBalance ships a CSV importer with a dedicated Interactive Brokers detector. This guide covers which file to download, how the import works and — honestly — what the parser does and does not do, so you know exactly what to expect.

---

## 1. Why Import Instead of Typing

If you hold three ETFs, entering shares and average cost by hand is trivial. But if you have been trading on IBKR for years — monthly buys, the occasional sale, assets in several currencies — reconstructing your **true average purchase cost** manually is tedious and error-prone.

The importer does that work for you: it reads your trade history, sorts it chronologically and computes the weighted average cost of every position. And because CoreBalance is local-first, **the file is processed in your browser**: your CSV is never uploaded to any server.

---

## 2. Which Report to Download from Interactive Brokers

IBKR has several export formats and its interface changes often, so treat these steps as a general guide:

1. Log into the IBKR web portal (Client Portal).
2. Go to the reports section (**Performance & Reports → Statements**, or similar depending on the interface version).
3. Generate an **Activity Statement** for the period you want to import (ideally since you opened the account, so the average cost comes out complete).
4. Download it as **CSV** (not PDF).

That Activity Statement CSV is a peculiar file: it is not a single table but a **multi-section** document where each line starts with the section name ("Trades", "Open Positions", "Dividends"...) followed by a `Header` or `Data` marker. That is exactly the format the importer is built around.

### Which IBKR Export Formats Does CoreBalance Recognize?

CoreBalance recognizes two kinds of IBKR export: the **multi-section Activity Statement CSV** (lines with `Header`/`Data` markers per section) and **single-table exports** — such as a Flex Query or a TWS export — as long as they include recognizable columns like *Symbol*, *Position*, *Market Value*, *Average Cost*, *Cost Basis*, *Asset Class* or *Conid* (for positions), or *Symbol*, *Date/Time*, *Quantity*, *T. Price*, *Proceeds* and *Comm/Fee* (for trades). If your export uses different column names it will not be detected as IBKR, but you can still import it through the manual column mapper.

---

## 3. Importing the File into CoreBalance

1. Open the CoreBalance [dashboard](/dashboard).
2. Open the CSV importer and select (or drag in) the downloaded file.
3. CoreBalance scans the headers of every section in the file and, if it finds the IBKR markers, applies the Interactive Brokers detector automatically.
4. You get a **preview** of the detected positions: name, shares and average cost in the original currency. There you can untick anything you do not want and choose which portfolio category new assets go to.
5. Confirm, and CoreBalance resolves each ISIN or symbol to a market ticker so it can fetch live prices.

If automatic detection fails (low confidence or zero positions extracted), CoreBalance falls back to a generic importer and, as a last resort, offers **manual mapping**: you tell it which column holds the quantity, which the price, which the ISIN, and so on.

---

## 4. What the Parser Actually Does (Verified in the Code)

To avoid any surprises, this is what the IBKR importer does — no more, no less:

- **Splits the file into sections.** It detects IBKR's multi-section style (second column set to `Header`/`Data`) and groups rows by section: Trades, Open Positions, Dividends...
- **Mines ISINs from the whole document.** IBKR does not always include an ISIN column in the trades section, so the parser scans *all* sections for ISIN columns and for `SYMBOL (ISIN)` patterns in any text cell (dividend descriptions, for instance). It builds a symbol-to-ISIN map from that.
- **Prefers trades over positions.** If there is a *Trades* section (or one with symbol and quantity columns), it reads every trade: symbol, quantity, price (*T. Price*), currency and date. Positive quantity = buy; negative = sell.
- **Computes the weighted average cost.** It sorts trades by date and consolidates them: buys accumulate cost; sells reduce shares and cost proportionally **without changing the average price** of the remaining shares (the correct accounting treatment for average cost).
- **Falls back to the snapshot.** With no trades section, it imports the open positions directly using their *Average Cost* (or *Cost Basis Per Share*).
- **Understands both number formats.** `1,234.56` (US) and `1.234,56` (European) are both parsed correctly.

It is equally important to say what it does **not** do: the *Comm/Fee* column is not read, so **the computed average cost excludes commissions**. And dividend rows are not imported as transactions (they are only used to mine ISINs); if you want dividends reflected in your cost basis, you will need to add them manually in the ledger.

### How Does CoreBalance Handle Currencies if I Trade in USD and EUR?

Every imported position **keeps its trading currency**: an ETF bought in dollars keeps its average cost in USD (if the CSV does not state a currency, the parser assumes USD, IBKR's default). To display your portfolio in your base currency, CoreBalance applies the **current exchange rate** fetched alongside market prices — not the historical rate of each purchase. If you need to record the exact rate of a specific trade, you can do so by adding that transaction manually in the ledger, which does support a per-transaction `fxRate`.

---

## 5. Common Problems

- **"Only part of my holdings were imported."** Check the Activity Statement period: if you generated a one-year report, earlier purchases are missing and the average cost will be incomplete.
- **Odd dates.** The parser interprets the *Date/Time* column with the browser's date engine. If a date cannot be parsed, the row is **not discarded** — it is imported with today's date. This only affects chronological ordering, which matters if you have sold shares.
- **Skipped rows.** Rows without a symbol or with zero quantity are skipped, and the importer records the reason for every skip so you can review it.
- **Closed positions.** If you bought and fully sold an asset, the net result is zero shares and that position is not imported (correctly — you no longer hold it).

---

## 6. After the Import: From CSV to Rebalancing

With your positions loaded, the routine is the usual one: assign a **target weight** to each asset, and CoreBalance computes each position's drift using live prices. From there, every new contribution is directed to whatever is most underweight — the [cash-flow rebalancing method](/blog/how-to-rebalance-indexed-portfolio) that avoids selling and triggering capital gains tax, which matters for ETF investors since [ETFs lack the tax-free switching](/blog/index-funds-vs-etfs-comparison) that some fund structures enjoy.

Two useful follow-up reads once your portfolio is set up: [when to rebalance](/blog/when-to-rebalance-portfolio) (tolerance bands versus calendar) and, if you hold distributing ETFs at IBKR, the [accumulating vs distributing comparison](/blog/msci-world-accumulating-vs-distributing).

> [!TIP]
> Keep the original CSV. If you later spot a discrepancy in an average cost, re-importing from the full-history file is the fastest way to fix it.

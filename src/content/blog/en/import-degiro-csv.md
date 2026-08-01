---
title: "How to Import Your DEGIRO CSV into CoreBalance"
description: "Step-by-step guide to importing your DEGIRO transactions into CoreBalance from a CSV: which export to use, how detection works and how your average cost is computed."
summary:
  - "CoreBalance auto-detects DEGIRO CSVs in three formats (transactions, account statement and portfolio snapshot); the transactions export is the most reliable."
  - "The importer sorts your trades chronologically and computes a weighted average purchase cost; sells reduce the position without changing that average."
  - "The file is parsed locally in your browser: only the ISINs are sent to the server, to resolve each asset's market ticker."
publishDate: "2026-08-01"
updatedDate: "2026-08-01"
author: "kinacho"
tags: [degiro, import, csv, portfolio]
lang: en
canonical: "https://corebalance.app/blog/import-degiro-csv"
ogImage: "/blog/og/import-degiro-csv.jpg"
slugs: { es: 'importar-csv-degiro', en: 'import-degiro-csv' }
---

If you have been investing through DEGIRO for a few years, typing your portfolio into any tool by hand is painful: dozens of buys, partial sells, the odd stock split — and a single typo in your average cost throws everything off. That is why CoreBalance ships with a **CSV importer that understands DEGIRO's export files** and rebuilds your positions for you.

This guide covers which file to download from the broker, how to import it into the [dashboard](/dashboard), and — because we like being transparent — exactly what the importer's code does with your data.

---

## Which DEGIRO CSV should I download?

**The Transactions export.** It has the cleanest columns (date, time, product, ISIN, quantity and price) and lets CoreBalance rebuild your average purchase cost most reliably. The other two formats also work, with caveats.

DEGIRO offers three different exports and CoreBalance recognises all of them:

1. **Transactions** — usually found in DEGIRO's activity section, with an export-to-CSV button and a date-range picker. Each row is one trade with its date, time, product, ISIN, quantity and price. **This is the recommended option**: export from your very first trade up to today.
2. **Account statement** (the classic `Account.csv`) — the full ledger of your account: deposits, withdrawals, fees, dividends, currency exchanges... and, in between, your buys and sells written as free text ("Buy 10 Vanguard FTSE All-World@105.20 EUR (IE00BK5BQT80)"). CoreBalance can extract the trades from that text and ignores the rest of the entries, but it is a more fragile format. Its one exclusive advantage: it is the only export that captures **stock splits**.
3. **Portfolio** (positions snapshot) — a photo of what you hold today: product, ISIN, quantity and closing price. It gets you started quickly, but **the imported cost is approximated from the current value**, not from your actual purchases, so your average cost will not be the historical one.

Keep in mind that DEGIRO's interface changes from time to time: exact menu names may vary, but these three exports have been available for years.

---

## Importing the file into CoreBalance

The whole process takes under a minute:

1. Open the [CoreBalance dashboard](/dashboard) and go to asset management.
2. Choose **import** and drag your CSV into the upload zone (or pick it with the button). `.csv`, `.tsv` and `.txt` files up to 1 MB are accepted.
3. CoreBalance **automatically detects that the file comes from DEGIRO** by analysing the column headers. You never have to tell it which broker it is.
4. The ISINs of your positions are resolved to market tickers so live quotes can be fetched. The CSV itself is **never uploaded to a server**: parsing happens in your browser, and only the ISINs travel for that resolution step.
5. Review the preview: you will see each position with its shares and average cost, you can untick anything you do not want, and choose which portfolio bucket the new assets go into.

What if auto-detection fails? There is a **manual column mapping** as a safety net: you point at which column holds the ISIN, the quantity, the price... and CoreBalance remembers that mapping the next time you upload a file with the same structure.

---

## What the importer actually does (verified in the code)

No opaque magic — this is what the DEGIRO parser does:

- **Headers in three languages.** It recognises columns in Spanish, English and Dutch: `Fecha/Date/Datum`, `Hora/Time/Tijd`, `Producto/Product`, `ISIN`, `Cantidad/Número/Aantal/Quantity`, `Precio/Price/Koers`, `Descripción/Description/Omschrijving`. Accents and capitalisation do not matter.
- **European dates.** It understands the `DD-MM-YYYY` and `DD/MM/YYYY` formats (with optional time) that DEGIRO uses.
- **Buys and sells by sign.** In the transactions CSV, a positive quantity is read as a buy and a negative one as a sell.
- **Account statement via text.** In the account statement, trades are extracted from the description field using the pattern "Buy/Sell N Product@Price CURRENCY (ISIN)" — also in Spanish (Compra/Venta) and Dutch (Koop/Verkoop). Non-trade entries — deposits, fees, dividends, FX conversions — are skipped, and the importer shows you how many rows were skipped and why.
- **Weighted average cost.** All trades are sorted chronologically and reduced to positions: each buy accumulates shares and cost, and the resulting average is total cost divided by total shares. **Sells shrink the position proportionally without changing the average cost** of what remains, which is the standard accounting treatment. Fully-sold positions disappear from the result.
- **ISIN validation.** Only well-formed ISINs are accepted (2 letters + 9 alphanumeric characters + a check digit); rows without a reliable identifier are skipped and reported.

---

## Common import problems

- **The delimiter.** DEGIRO uses commas, but many European CSVs use semicolons or tabs. CoreBalance **detects the delimiter automatically** among `,`, `;` and tab, so you never need to touch the file.
- **Comma decimals.** The number parser handles both the European format (`1.234,56`) and the American one (`1,234.56`), plus "dirty" prices with currency symbols or letters attached.
- **Currencies.** Each position keeps the purchase currency stated in the CSV (EUR, USD...). The dashboard then fetches exchange rates along with the quotes so the whole portfolio is valued consistently.
- **Opening the CSV in Excel first.** Avoid it: Excel can rewrite dates and decimals on save. Import the file exactly as DEGIRO produced it.

## Why doesn't my average cost match DEGIRO's exactly?

**Because the importer computes the average from price × shares of each trade, without adding purchase fees**, while DEGIRO may fold fees into its own average cost figure. The difference is usually a few cents per share. Also, if you imported the portfolio snapshot instead of the history, the cost was approximated from the current value rather than your real purchases — re-importing the transactions CSV fixes that. And remember that dividends are never imported as trades: if you receive [ETF dividends on DEGIRO](/blog/degiro-etf-dividends-guide), those entries are deliberately skipped.

---

## After the import: from data to rebalancing

With your positions loaded, the important part begins:

1. **Set your target weights.** Imported assets arrive with a 0% target; define your allocation — whether you build it with ETFs or with [index mutual funds](/blog/index-funds-vs-etfs-comparison).
2. **Let the quotes arrive.** CoreBalance refreshes prices automatically right after the import.
3. **Calculate your next contribution.** Enter how much you plan to invest this month and the calculator will direct the purchase towards your underweighted assets, [without selling anything](/blog/how-to-rebalance-indexed-portfolio) and without triggering capital gains tax.

If you trade ETFs on DEGIRO, this contribution-based mechanic matters even more — we explain why in our guide to [rebalancing on DEGIRO with ETFs](/blog/degiro-etf-rebalancing).

> [!TIP]
> Keep the CSV you exported. CoreBalance stores your data in your browser, so if you ever want to rebuild the portfolio on another device, re-importing the file takes two clicks.

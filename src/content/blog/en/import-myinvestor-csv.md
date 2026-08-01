---
title: "How to Import Your MyInvestor Transactions into CoreBalance (CSV)"
description: "Step-by-step guide to exporting your MyInvestor index fund transactions and importing them into CoreBalance with automatic CSV detection."
summary:
  - "CoreBalance auto-detects MyInvestor transaction CSVs by their headers (fund name, ISIN, units, amount, status) and rebuilds your weighted average cost."
  - "The importer processes subscriptions, redemptions, buys, sells, contributions and both legs of fund transfers, and ignores orders that are not completed or executed."
  - "If auto-detection fails, you can map the columns manually and CoreBalance remembers that mapping for future files with the same structure."
publishDate: "2026-08-01"
updatedDate: "2026-08-01"
author: "kinacho"
tags: [myinvestor, import, csv, index-funds]
lang: en
canonical: "https://corebalance.app/blog/import-myinvestor-csv"
ogImage: "/blog/og/import-myinvestor-csv.jpg"
slugs: { es: 'importar-movimientos-myinvestor', en: 'import-myinvestor-csv' }
---

**MyInvestor** is a Spanish neobank that has become the default home for index investors in Spain: it offers index funds from managers like **Vanguard, iShares and Fidelity** with no custody fee, which makes it a natural fit for the Bogleheads approach. If you've been making monthly contributions there for years, rebuilding your portfolio by hand in any tool is painful: dozens of subscriptions, the odd fund transfer, maybe an occasional redemption.

In this guide you'll see how to **export your MyInvestor transaction history and import it into CoreBalance in a couple of minutes**, exactly what the importer does with your file, and what to check when something doesn't add up. As always with CoreBalance, everything happens **in your browser**: the CSV is never uploaded to any server.

---

## 1. Why Import Instead of Typing

You could simply copy the current value of each fund, and for a one-off rebalancing calculation that's enough. But importing your real transactions gets you two things:

* **Your true weighted average cost.** CoreBalance rebuilds your positions from the operations, in chronological order, using the same average-cost method your broker shows.
* **Zero transcription errors.** With 40 or 50 accumulated contributions, one mistyped digit can go unnoticed for months.

If you're still designing your first indexed portfolio, you may want to start with the guide to a [Bogleheads portfolio for beginners](/blog/bogleheads-portfolio-beginners).

---

## 2. How to Export Your Transactions from MyInvestor

MyInvestor has no single "export everything" button, and **its interface changes fairly often**, so treat these steps as general guidance:

1. Log in to the MyInvestor **website** (downloading files is usually easier on desktop than in the app).
2. Go to **Investments > Investment funds** and open your positions detail or the **orders/transactions** history.
3. Look for the **download or export** option. Depending on the screen, MyInvestor offers the file as CSV or Excel.
4. If you're only offered **Excel (.xlsx)**, open it and save it as **CSV** before importing: CoreBalance reads CSV files, comma- or semicolon-separated (the semicolon is standard in Spanish exports and is detected automatically).

What matters is that the final file contains, as columns, at least: **the fund name or its ISIN, the units (participaciones), the amount and the date** of each operation. A "Status" column and an "Operation type" column help refine the result, as you'll see next.

---

## 3. Importing the CSV into CoreBalance

1. Open the [CoreBalance dashboard](/dashboard) and go to asset management.
2. Click the **import CSV** button and drop your file.
3. CoreBalance analyses the headers and, if it recognises the MyInvestor format with enough confidence, jumps straight to the position **preview**.
4. ISINs are automatically resolved to quoted tickers, so prices update on their own from that point on.
5. Review the list, untick anything you don't want to bring in, assign the category (core, satellite or stocks) and confirm.

### What If CoreBalance Doesn't Recognise My File?

**Nothing serious: manual column mapping kicks in.** If auto-detection doesn't reach enough confidence, CoreBalance shows you your file's columns so you can point out which one holds the name, the ISIN, the units and the price or amount. That mapping **is saved in your browser, tied to the file's structure**, so the next time you import a CSV with the same columns it's applied automatically. And if the specific detector guesses wrong and extracts nothing, a generic fallback importer tries to interpret the table heuristically.

---

## 4. What the Importer Actually Does with Your CSV

This isn't marketing copy: it's what the code does, line by line.

* **Detection:** the MyInvestor detector looks in the headers for markers such as *fund name, ISIN, units, net asset value, amount, order date or status*. With three or more matches, confidence is high and manual mapping is skipped.
* **Status filter:** if the file has a **Status** column, only rows marked as **completed or executed** ("finalizada"/"ejecutada") are processed. Pending or cancelled orders are discarded (and listed as skipped rows, with the reason).
* **ISIN required:** every row needs a valid ISIN. If there's no ISIN column but the code appears inside the fund name, the importer **extracts it from the text itself**. Without an ISIN, the row is skipped.
* **Operation types:** rows whose type contains **subscription, buy, contribution or transfer-in** ("suscripción", "compra", "aportación", "entrada") are read as *increases*; rows containing **redemption, sell or transfer-out** ("reembolso", "venta", "salida") as *decreases*. A fund transfer is covered by its two legs: transfer-out and transfer-in. If there's no type column but a row has units and a completed status, it's assumed to be a purchase.
* **Price per unit:** if your file includes a price or average-cost column, it's used; otherwise it's computed as **amount ÷ units**. European number formats (1.234,56 €) and DD/MM/YYYY dates are parsed correctly, and amounts are assumed to be in euros.
* **Weighted average cost aggregation:** all operations are sorted chronologically and reduced to one position per ISIN. Buys add units and cost; sells subtract units and reduce total cost **proportionally, without changing the average price** of what remains. Positions that end up at zero are not imported.

The result is your **consolidated positions** (units + average price), loaded as your portfolio's holdings.

---

## 5. The MyInvestor Special Case: Fund Transfers

Fund transfers (*traspasos*) are the Spanish index investor's killer feature, because they let you [rebalance on MyInvestor without paying tax](/blog/myinvestor-rebalancing-tax-free). And they have one quirk when importing that's worth understanding.

### How Does CoreBalance Handle Fund Transfers on Import?

**Each transfer is processed through its two legs: the outgoing leg is subtracted from the source fund and the incoming leg is added to the destination fund, at the net asset value on the transfer date.** That's the correct way to rebuild how many units you hold and at what *operational* average price you entered each fund.

> [!IMPORTANT]
> That average price is the **operational** one, not the **tax** one. In Spain, [fund-to-fund transfers preserve the original acquisition price and date for tax purposes](/blog/index-fund-transfers-spain-tax-guide); your broker is the custodian of that tax data. CoreBalance is a rebalancing and tracking tool, not a substitute for your bank's tax report.

Also, once your portfolio is imported, the dashboard's transaction ledger includes a **transfer** type alongside buy, sell and dividend: when you record the incoming leg of a future transfer, its units and cost are added to your position just like a purchase at that day's net asset value.

---

## 6. Common Problems

* **"Several rows were skipped."** Almost always non-completed orders, rows without an ISIN, or rows with zero units. CoreBalance shows you each skipped row and the reason; review it before assuming something is missing.
* **The file is .xlsx.** Save it as CSV from Excel or LibreOffice. The separator (comma or semicolon) doesn't matter: it's detected automatically.
* **It detects another broker, or nothing at all.** Use manual column mapping; it'll be remembered next time.
* **The average price doesn't exactly match MyInvestor.** Check that the exported history is complete (from your very first contribution) and remember the difference between operational and tax cost in funds that went through transfers.
* **A fund shows up without a ticker.** If the ISIN can't be resolved automatically, you can search for it and assign one manually right in the preview.

---

## 7. After Importing: Time to Rebalance

With your positions and average cost loaded, the useful part begins: set a target weight for each fund, and every time you add new savings CoreBalance will tell you **exactly how many euros to put into each fund** so the portfolio drifts back into place on its own, without selling anything. If the mechanics aren't clear yet, here's the full guide on [how to rebalance an indexed portfolio](/blog/how-to-rebalance-indexed-portfolio).

Importing your history is a one-time job; the discipline of contributing and rebalancing does the rest for the coming decades.

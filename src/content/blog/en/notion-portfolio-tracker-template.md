---
title: "Free Notion and Markdown Portfolio Tracker Template"
description: "Get a free, custom Notion or Markdown template to manually track your index funds, ETFs, and asset allocation with absolute privacy."
publishDate: "2026-06-16"
updatedDate: "2026-06-16"
author: "kinacho"
tags: [resources, notion, markdown, templates, portfolio-tracker]
lang: en
canonical: "https://corebalance.app/blog/notion-portfolio-tracker-template"
ogImage: "/blog/og/notion-portfolio-tracker-template.jpg"
slugs: { es: 'plantilla-notion-seguimiento-cartera', en: 'notion-portfolio-tracker-template' }
---

Keeping a financial journal or a structured log of your investments is one of the best habits you can build. It keeps you grounded during times of market volatility, reminds you of your long-term goals, and keeps your cost basis organized.

While spreadsheets like Excel or Google Sheets are common, many investors prefer the visual cleanliness and focus of notes tools like **Notion** or plain-text files written in **Markdown** (which integrate beautifully with tools like Obsidian, Logseq, or Joplin).

In this article, we provide a **free, copy-pasteable portfolio tracking template in Notion and Markdown**, explain how to structure it, and share tips for integrating it into your monthly routine.

---

## 1. Recommended Structure for Portfolio Tracking

Whether you use Notion or plain Markdown, a healthy investment log should cover three primary areas:

1. **Strategic Asset Allocation:** Your target weights (e.g., 80% equities, 20% bonds).
2. **Asset Inventory:** The list of funds or ETFs you own, their ISIN/ticker, the custodian platform, and your average cost basis.
3. **Transaction / Rebalancing Log:** A chronological record of how much money you contribute each month and the adjustments you make.

---

## 2. Copy-Pasteable Markdown Template

Here is a clean Markdown template. You can copy the block below and paste it directly into your notes editor (such as Obsidian, Logseq, Typora, or VS Code):

```markdown
# 📈 Investment Journal & Portfolio Tracker

*Last Updated: 2026-06-16*

---

## 🎯 Target Asset Allocation

| Asset Class | Fund / ETF | Target Weight (%) |
|---|---|---|
| Developed Markets Equities | Vanguard FTSE Developed World (IE00BK5BQV36) | 80% |
| Emerging Markets Equities | Vanguard FTSE Emerging Markets (IE00BK5BR733) | 20% |
| Global Fixed Income | iShares Global Aggregate Bond (IE00B3F81R35) | 0% |

**Total Equities:** 100%  
**Total Fixed Income:** 0%

---

## 💼 Current Holdings Inventory

| Asset | Broker / Custodian | Shares | Avg Cost | Current Balance |
|---|---|---|---|---|
| Vanguard FTSE Dev World | Interactive Brokers | 124.512 | $80.32 | $10,000.00 |
| Vanguard FTSE Emerging | Interactive Brokers | 32.145 | $62.21 | $2,000.00 |

*Note: Update current balances manually once a month by logging into your broker account.*

---

## 📝 Contribution & Trade History

- **2026-06-16:** New contribution of **$500.00**.
  - Allocated $400.00 to *Vanguard FTSE Dev World*.
  - Allocated $100.00 to *Vanguard FTSE Emerging*.
  - *Result:* Portfolio remains aligned at 80/20 target.
- **2026-05-15:** Regular monthly contribution of **$500.00** allocated proportionally.
```

---

## 3. Notion Template: Designing Your Dashboard

If you prefer Notion's visual database system, we recommend building a layout with the following databases:

1. **Create a Master Database called "Portfolio":**
   - **Column 1 (Name):** Name of the Fund or ETF.
   - **Column 2 (Select):** Asset Class (Equities / Fixed Income / Cash / Gold).
   - **Column 3 (Number):** Target Weight (%).
   - **Column 4 (Number):** Current Balance ($).
   - **Column 5 (Formula):** Actual Weight (formula: `prop("Current Balance") / sum(prop("Current Balance"))`).
2. **Create a Second Database called "Contributions Log":**
   - Relate it to the "Portfolio" database to associate each money injection with its corresponding asset.
   - Add a date property to track cash flows over time.

---

## 4. The Benefits of Local-First Records

Keeping your financial logs in local Markdown files on your hard drive offers a major benefit: **absolute privacy**.

No cloud corporation has access to your net worth details, and your financial data does not travel across servers where it could be leaked. You remain the sole owner of your financial data, which aligns perfectly with the independent and prudent spirit of passive investing.

---

## CoreBalance: Reconciling Automation with Privacy

If you value the privacy of local Markdown logs but get tired of calculating percentages and decimal adjustments manually at the end of each month, **CoreBalance** is the perfect companion.

Our free web calculator does not require registration and never uploads your data. All portfolio inputs are encrypted and stored locally in your web browser (`localStorage`). CoreBalance calculates your target trades in seconds so you can execute them at your broker and then quickly record a clean log entry in your Markdown files.

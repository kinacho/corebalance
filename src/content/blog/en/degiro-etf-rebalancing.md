---
title: "DeGiro ETF Rebalancing: How to Do It Efficiently"
description: "A practical guide to rebalancing your ETF portfolio on DeGiro. Learn efficient strategies to minimize transaction fees and avoid tax events."
summary:
  - "ETFs do not get the tax-free transfer that index funds enjoy in Spain: selling in order to rebalance realises the gain and triggers tax."
  - "The efficient strategy is to rebalance exclusively with new contributions, directing every purchase to the most underweighted asset."
  - "If contributions are not enough: widen your tolerance bands, use the broker commission-free ETF selection, and account for rounding to whole shares."
publishDate: "2026-06-16"
updatedDate: "2026-06-16"
author: "kinacho"
tags: [rebalancing, degiro, etfs, transaction-fees, taxes]
lang: en
canonical: "https://corebalance.app/blog/degiro-etf-rebalancing"
ogImage: "/blog/og/degiro-etf-rebalancing.jpg"
slugs: { es: 'rebalanceo-degiro-etfs', en: 'degiro-etf-rebalancing' }
---

DeGiro is one of the most popular online brokers in Europe due to its **low fees** and user-friendly interface. Many retail investors choose DeGiro to build their long-term passive portfolios using **ETFs (exchange-traded funds)** instead of traditional mutual funds, attracted by the high liquidity and the vast selection of global index products.

However, managing an ETF portfolio and performing periodic rebalances comes with costs and tax considerations. In this guide, we will explore how to **rebalance your ETF portfolio on DeGiro in the most efficient way**, minimizing both transaction commissions and tax friction.

---

## 1. The Real Cost of Rebalancing: Fees and Tax Friction

Unlike managing a robo-advisor portfolio where adjustments happen behind the scenes, DIY investing on DeGiro requires manual execution. Rebalancing by selling winning assets to buy underperforming ones introduces two sources of friction:

1. **Brokerage Commissions:** Although DeGiro has highly competitive rates, buying and selling ETFs still incurs transaction fees (unless you use their promotional selection under specific conditions).
2. **Capital Gains Taxes:** In most European tax jurisdictions, selling an ETF that has increased in value triggers a taxable event. You must pay capital gains taxes on those profits in the current tax year, reducing the capital that remains invested to grow.

Because of this double drag, the classic strategy of "selling high to buy low" can be **highly inefficient** for smaller portfolios or frequent adjustments.

---

## 2. The Golden Rule: Rebalancing via Contributions (Cash Flow)

To avoid triggering unnecessary taxes and brokerage commissions, the smartest strategy is to **rebalance exclusively through new contributions**.

Instead of selling your overweight ETFs, you keep them intact and direct your fresh monthly savings to purchase shares of the underweight ETFs that have lagged behind.

### A Practical Example:
Suppose you have a target [asset allocation](/blog/what-is-asset-allocation) of **70% Equities / 30% Bonds** using two ETFs on DeGiro:
* **ETF 1 (Vanguard FTSE All-World):** Current value is $7,500 (75% of the portfolio).
* **ETF 2 (iShares Global Government Bond):** Current value is $2,500 (25% of the portfolio).
* **Total Portfolio Value:** $10,000 (a 5% drift from target).

If you are adding **$600** of fresh savings this month:
1. **New Projected Value:** $10,000 + $600 = $10,600.
2. **Ideal Target Distribution:**
   * Equities (70%): $10,600 x 0.70 = $7,420.
   * Bonds (30%): $10,600 x 0.30 = $3,180.
3. **Allocation Calculation:**
   * In Equities, you already have $7,500 (which exceeds the target ideal). You contribute **$0**.
   * In Bonds, you have $2,500, while your target is $3,180. You allocate the entire **$600** new deposit to buy more shares of this ETF.

By doing this, you reduce your portfolio drift from 5% to just **1.3%** without selling any shares, without triggering tax events, and by executing only one buy trade instead of a sell and a buy.

---

## 3. Optimization Strategies for DeGiro Investors

If your portfolio size is large and your monthly contributions are not enough to correct drifts, keep these three optimization rules in mind:

### A. Set Wider Tolerance Bands
Instead of rebalancing when an asset drifts by a mere 2% or 3%, expand your threshold to a **5% or 10% absolute deviation** (e.g., if a 30% target bond allocation drops below 25% or rises above 35%). Because selling incurs transaction costs and capital gains taxes, tolerating slightly larger drifts is usually more cost-effective than frequent trading.

### B. Make Use of DeGiro's Core Selection (Core ETFs)
DeGiro offers a list of **ETFs with reduced transaction fees** (subject to their fair-use policy). If your portfolio consists of ETFs from this core list—such as *Vanguard FTSE All-World* or *iShares Core [MSCI World](/blog/msci-world-emerging-markets-80-20)*—you can make regular buy orders without paying commissions. Make sure you read DeGiro's active terms and conditions to verify which tickers qualify.

### C. The Whole-Share Problem (Rounding Residual Cash)
Unlike mutual funds, which allow fractional investing (where you can invest exactly $123.45 in a fund), **ETFs trade like stocks and can only be bought in whole units**.
If a bond ETF share trades at $150 and CoreBalance calculates that you need to contribute $200, you can only buy 1 share ($150), leaving $50 in cash in your account. That cash will remain uninvested until the next month.

---

## 4. Month-to-Month Workflow with CoreBalance and DeGiro

Simplify your investment routine using this quick process:

1. **Retrieve Your DeGiro Balances:**
   Log into your DeGiro account and check the number of shares and current valuation of your ETFs.
2. **Input Balances into CoreBalance:**
   Add your target weights and enter your current holdings in CoreBalance.
3. **Calculate Your Contribution:**
   Enter the amount of cash you want to invest. CoreBalance will automatically calculate the optimal number of whole shares to buy for each ETF to minimize drifts while keeping uninvested cash to a minimum.
4. **Place Orders on DeGiro:**
   Execute your limit buy orders on DeGiro based on the calculations.

> [!TIP]
> Because ETFs must be purchased in whole shares, a residual drift of +/- 1-2% is entirely normal and acceptable. Do not leave money sitting idle in cash just to match an exact target down to the decimal point. Let your money work.

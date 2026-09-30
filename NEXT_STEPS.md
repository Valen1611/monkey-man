# 🚀 NEXT STEPS: Monkey-Man Project Roadmap

This document outlines the architectural roadmap to take this personal finance app from a local MVP to a robust, publishable, and highly usable system.

## 2. 📬 Email Ingestion & Dynamic Routing
- [x] **Pluggable BaseParser Architecture**: Extensible `BaseParser` class contract with automatic sender routing and dynamic loading from `./custom-parsers/`.
- [x] **Zero Hardcoded Bank Sources**: Removed built-in Spanish banks from core; individual sources live in gitignored custom parser directory.

## 3. 🧹 Code Cleanup & Open Source Readiness
- [x] **Environment Variables Audit**: Centralized configuration into `.env.example` and local `.env`, isolating credentials and secrets in `secrets/`.
- [x] **Prisma Seed Script**: Seed script in `apps/backend/prisma/seed.js` generating standard Categories, Wallets, and starter Rules.
- [x] **Documentation**: Comprehensive root `README.md` and `custom-parsers/README.md` explaining architecture, Pub/Sub, and parser creation.

## 4. 🖥️ Frontend Enhancements (Usability)
- [x] **Live Transaction Feed**: Real-time transaction dashboard with category tags and wallet links.
- [x] **Manual Transaction UI**: Modal and forms to add cash or manual expenses and transfers directly.
- [x] **Data Visualization**: Budget and spending charts by category group and limits.
- [x] **Rule Management UI**: Full CRUD interface at `/rules` for managing parser rules (key type, key value, category, wallet, internal transfer flag).
- [ ] **Transaction Search & Filter**: Date range picker, category/wallet filter, and text search for the transactions list.
- [ ] **Data Export**: CSV/JSON export of transactions for backup and external analysis.

## 5. ⚙️ DevOps & Stability
- [ ] **Error Alerts**: Add a simple webhook (like Telegram or Discord) to ping you if the worker catches an error or if an email regex fails to parse.
- [ ] **Logging**: Implement a structured logger instead of `console.log` for better observability inside the Docker container.

## 6. 📱 Proactive Notifications & Alerts (Telegram)
- [ ] **Budget Proximity Alerts**: Hook into the transaction creation flow. When an expense is stored, calculate if it pushes a category budget near its limit (e.g., >80%), and trigger a real-time Telegram alert.
- [ ] **Weekly Spending Limits**: Expand the `Budget` schema to support weekly limits that can group multiple categories together, separate from monthly goals.
- [ ] **Pacing Updates (Digests)**: Create a cron job in the background worker that sends a Telegram ping summarizing your spending pacing for the week (whether you hit the limit or just as a status update).

## 7. 🏗️ Financial Edge Cases (The Final Polish)
- [ ] **Account Reconciliation**: Build a feature to input your *actual* bank balance. If the app says you have $500 but the bank says $480 (because an email was missed), the app should automatically create a $20 "Adjustment" transaction to keep the truth aligned.
- [ ] **The "Cash Hole"**: Create a fast-track UI (or a Telegram Bot command) to instantly log cash purchases. If cash isn't tracked seamlessly, your budgets become inaccurate.
- [ ] **Double-Counting Prevention**: Strengthen the internal transfer logic. Moving money from Santander to MercadoPago shouldn't count as an "Expense" and an "Income". It must perfectly link as a zero-sum transfer.

# 10. Feature Specification: Cancel Running Transactions

## 1. Executive Summary
Long-running transactions, complex background scripts, or heavy database queries in ServiceNow can lock up session threads, making the active user interface freeze and degrade instance performance. Stopping these running scripts usually requires navigating to `v_transaction.do` or waiting for the transaction timeout to fire.

The **Cancel Running Transactions** feature allows developers to view their current active session transactions and immediately send terminal signals to cancel or kill the thread, releasing locked session threads directly from the extension.

---

## 2. Key Capabilities

### A. Active Transactions List
- **Description:** Queries and monitors active server transactions belonging to the current session.
- **Backend Table:** Queries the Active Transactions (`v_transaction`) table.
- **Fields Displayed:** Transaction ID, Age (duration running), Thread Name, and URL/Action.

### B. Single-Click Thread Cancellation
- **Description:** Sends cancellation queries to terminate selected execution threads.
- **Cancel Endpoint:** Executes a call to `/cancel_my_transaction.do` or kills specific sys_id records in `v_transaction`.

---

## 3. Technical Architecture & Security
- **Endpoints Used:**
  - View Transactions: `/api/now/table/v_transaction` (GET)
  - Cancel Transaction: `/cancel_my_transaction.do?sysparm_status=cancel` (POST)
- **Security Context:** Operations are restricted to the developer's session context and respect access control rules governing thread termination.

---

## 4. UI/UX Interface Design
- **Header:** Displays title and "Server Script" status badge.
- **Grid View:** Renders active transactions in a table list showing Age, Action, and a **Cancel** action button next to each running task.
- **Action Control:** A primary action button (**Cancel My Current Transaction**) to immediately cancel the active browser tab thread.

---

## 5. API Contracts & JavaScript functions
- **View Transactions:** `SNOW_API.getActiveTransactions()`
  - **Endpoint:** `/api/now/table/v_transaction?sysparm_query=session_id=CURRENT_SESSION`
- **Cancel Transaction:** `SNOW_API.cancelCurrentTransaction()`
  - **Endpoint:** `/cancel_my_transaction.do?sysparm_status=cancel`

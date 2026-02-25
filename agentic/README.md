# StockBot — Inventory Prediction Agent

AI-powered stock prediction using **Strands + OpenAI + FastAPI + React**.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Your PHP App                      │
│                                                     │
│  ┌─────────────────┐      ┌──────────────────────┐  │
│  │  React Chat UI  │ ───► │  stockbot_api.php     │  │
│  │ StockBotChat.jsx│ ◄─── │  (AJAX bridge)        │  │
│  └─────────────────┘      └──────────┬───────────┘  │
└──────────────────────────────────────┼──────────────┘
                                       │ HTTP POST /chat
                          ┌────────────▼────────────────┐
                          │   Python FastAPI Server      │
                          │   api/api_server.py :8000    │
                          │                              │
                          │   ┌──────────────────────┐  │
                          │   │  Strands Agent        │  │
                          │   │  + OpenAI GPT-4o      │  │
                          │   │  + Conversation Memory│  │
                          │   └──────────┬───────────┘  │
                          │              │ calls tools   │
                          │   ┌──────────▼───────────┐  │
                          │   │  Stock Tools          │  │
                          │   │  - get_current_stock  │  │
                          │   │  - get_consumption_rate│  │
                          │   │  - predict_reorder    │  │
                          │   │  - get_critical_items │  │
                          │   │  - calculate_cost     │  │
                          │   └──────────┬───────────┘  │
                          └─────────────┼───────────────┘
                                        │ SQL queries
                          ┌─────────────▼───────────────┐
                          │         PostgreSQL           │
                          │   stock_left table           │
                          │   stock_in_transaction table │
                          └─────────────────────────────┘
```

---

## Project Structure

```
stock-agent/
├── agent/
│   ├── stock_tools.py      # 6 Strands tools (PostgreSQL queries)
│   └── stock_agent.py      # CLI agent for testing
├── api/
│   └── api_server.py       # FastAPI server with session memory
├── StockBotChat.jsx        # React chat component
├── stockbot_api.php        # PHP AJAX bridge
├── requirements.txt
└── .env.example
```

---

## Setup

### 1. Python environment

```bash
cd stock-agent
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Environment variables

```bash
cp .env.example .env
# Edit .env with your DB credentials and OpenAI key
```

### 3. Start the API server

```bash
cd api
uvicorn api_server:app --host 0.0.0.0 --port 8000 --reload
```

The API will be live at `http://localhost:8000`

### 4. Test in CLI first

```bash
cd agent
python stock_agent.py
```

### 5. Add React component to your app

```bash
# Install in your React project (no extra dependencies needed)
cp StockBotChat.jsx src/components/

# Set API URL in your .env
REACT_APP_STOCKBOT_API_URL=http://localhost:8000
# OR point to your PHP bridge:
REACT_APP_STOCKBOT_API_URL=https://yourapp.com/stockbot_api.php
```

### 6. Use the React component

```jsx
import StockBotChat from './components/StockBotChat';

function InventoryPage() {
  return (
    <div style={{ padding: 24 }}>
      <h1>Inventory Management</h1>
      <StockBotChat 
        height="600px"
        title="🤖 StockBot"
      />
    </div>
  );
}
```

### 7. PHP bridge

Place `stockbot_api.php` in your PHP webroot:
```
/var/www/html/stockbot_api.php
```

Then in React, point to the PHP endpoint:
```js
// In StockBotChat.jsx, change API_BASE_URL:
const API_BASE_URL = "https://yourapp.com/stockbot_api.php";
// (the PHP file handles the /chat routing automatically)
```

---

## Memory & Sessions

- Each user gets a unique `session_id` (UUID)
- The session_id is stored in `localStorage` in the browser
- PHP also stores it in `$_SESSION` as a fallback
- The Python agent keeps the full conversation history in memory for that session
- Session expires after 60 minutes of inactivity (configurable in `api_server.py`)

**Multi-user safe:** Each session_id gets its own independent agent instance.

---

## Prediction Logic

| Step | Formula |
|------|---------|
| Daily consumption | `(prev_remaining + stock_in - curr_remaining) / days` across all snapshots |
| Days remaining | `current_remaining / daily_consumption` |
| Stockout date | `today + days_remaining` |
| Reorder by date | `stockout_date - lead_time_days` |
| **CRITICAL** | `days_remaining ≤ lead_time` (7 days) |
| **ORDER NOW** | `days_remaining ≤ lead_time + buffer` (12 days) |
| **ORDER SOON** | `days_remaining ≤ threshold × 1.5` (18 days) |
| **SUFFICIENT** | `days_remaining > 18 days` |
| Suggested qty | `daily × (lead_time + buffer + 14 extra days)` |

---

## Example Questions the Agent Can Answer

- "What items need to be reordered urgently?"
- "How many days of stock left for Non Dairy Creamer?"
- "Show all food items running low"
- "What will my reorder cost be for critical items?"
- "When did we last order Tapioca Pearls?"
- "Show me all Packaging items"
- "Which items will run out this week?"
- "What's the order history for item 1020030?"

---

## Production Notes

1. **Memory persistence**: Replace in-memory `sessions` dict in `api_server.py` with Redis
2. **Authentication**: Add API key header validation in FastAPI
3. **PHP security**: Validate/sanitize session_id before passing to the API
4. **CORS**: Set `FRONTEND_URL` env var to your exact domain instead of `*`
5. **Process manager**: Use `supervisord` or `systemd` to keep the Python server running

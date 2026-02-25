"""
Stock Prediction Tools for Strands Agent
- Uses stock_left table ONLY for predictions (no stock_in_transaction)
- Consumption = decline in remaining between consecutive snapshots
- Connection pooling + in-memory cache for fast repeated calls
"""

import os
import json
import time
import logging
from datetime import datetime, timedelta
from typing import Optional

import psycopg2
import psycopg2.extras
from psycopg2 import pool
from strands import tool

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────
# 1. CONNECTION POOL — created ONCE at startup
# ─────────────────────────────────────────────
_pool: Optional[pool.SimpleConnectionPool] = None

def get_pool() -> pool.SimpleConnectionPool:
    """Return the global connection pool, creating it if needed."""
    global _pool
    if _pool is None or _pool.closed:
        _pool = pool.SimpleConnectionPool(
            minconn=2,
            maxconn=10,
            host=os.getenv("DB_HOST", "localhost"),
            port=int(os.getenv("DB_PORT", 5432)),
            dbname=os.getenv("DB_NAME", "aero_foods_finance"),
            user=os.getenv("DB_USER", "postgres"),
            password=os.getenv("DB_PASSWORD", "123"),
            connect_timeout=5,
        )
        logger.info("DB connection pool created")
    return _pool


def get_conn():
    """Borrow a connection from the pool."""
    return get_pool().getconn()


def release_conn(conn):
    """Return a connection to the pool."""
    get_pool().putconn(conn)


# ─────────────────────────────────────────────
# 2. SIMPLE IN-MEMORY CACHE
# ─────────────────────────────────────────────
_cache: dict = {}
CACHE_TTL = 300  # seconds (5 minutes)


def cache_get(key: str):
    entry = _cache.get(key)
    if entry and (time.time() - entry["ts"]) < CACHE_TTL:
        return entry["data"]
    return None


def cache_set(key: str, data):
    _cache[key] = {"data": data, "ts": time.time()}


def cache_clear():
    """Call this if you want fresh data immediately."""
    _cache.clear()


# ─────────────────────────────────────────────
# REQUIRED INDEXES — run once in PostgreSQL:
#   CREATE INDEX IF NOT EXISTS idx_stock_left_code_date
#       ON stock_left(code, month_date DESC);
#   CREATE INDEX IF NOT EXISTS idx_stock_left_category
#       ON stock_left(category);
# ─────────────────────────────────────────────


# ─────────────────────────────────────────────
# TOOL 1: Get current remaining stock
# ─────────────────────────────────────────────
@tool
def get_current_stock(category: Optional[str] = None, item_name: Optional[str] = None) -> str:
    """
    Get current remaining stock levels from the latest snapshot.
    Optionally filter by category (Food, Packaging, Operation, Equipment)
    or by item name (partial match supported).
    Returns remaining stock in boxes/packets with item details.
    """
    cache_key = f"stock_{category}_{item_name}"
    cached = cache_get(cache_key)
    if cached:
        return cached

    conn = get_conn()
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        # DISTINCT ON is faster than a subquery when code+month_date is indexed
        query = """
            SELECT DISTINCT ON (code)
                code, name, category, remaining, packet, unit,
                unit_price, month_date
            FROM stock_left
            WHERE category != 'Discontinue'
        """
        params = []

        if category:
            query += " AND LOWER(category) = LOWER(%s)"
            params.append(category)

        if item_name:
            query += " AND LOWER(name) LIKE LOWER(%s)"
            params.append(f"%{item_name}%")

        # DISTINCT ON requires ORDER BY to start with the same column
        query += " ORDER BY code, month_date DESC"

        cur.execute(query, params)
        rows = cur.fetchall()

        if not rows:
            result = json.dumps({"status": "no_data", "message": "No stock found."})
            cache_set(cache_key, result)
            return result

        results = [
            {
                "code": r["code"],
                "name": r["name"],
                "category": r["category"],
                "remaining_boxes": float(r["remaining"]),
                "packets_per_box": int(r["packet"]),
                "total_packets": round(float(r["remaining"]) * int(r["packet"]), 1),
                "unit": r["unit"],
                "unit_price": float(r["unit_price"]),
                "snapshot_date": str(r["month_date"]),
            }
            for r in rows
        ]

        # Sort in Python — avoids a second DB sort pass
        results.sort(key=lambda x: (x["category"], x["name"]))

        result = json.dumps({"status": "ok", "count": len(results), "stock": results})
        cache_set(cache_key, result)
        return result

    finally:
        release_conn(conn)  # always return connection to pool


# ─────────────────────────────────────────────
# TOOL 2: Calculate consumption rate per item
# ─────────────────────────────────────────────
@tool
def get_consumption_rate(item_code: Optional[str] = None, days_lookback: int = 90) -> str:
    """
    Calculate average daily consumption rate using stock_left snapshots only.
    Consumption = decline in remaining between consecutive snapshots.
    Intervals where stock went up (restocking) are skipped.
    item_code: specific product code (optional, returns all if not given)
    days_lookback: how many days of history to use (default 90)
    """
    cache_key = f"consumption_{item_code}_{days_lookback}"
    cached = cache_get(cache_key)
    if cached:
        return cached

    conn = get_conn()
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        since_date = datetime.now() - timedelta(days=days_lookback)

        code_filter = "AND code = %(code)s" if item_code else ""

        query = f"""
            WITH snapshots AS (
                SELECT
                    code, name, category, packet, unit,
                    month_date,
                    remaining,
                    LAG(remaining)  OVER (PARTITION BY code ORDER BY month_date) AS prev_remaining,
                    LAG(month_date) OVER (PARTITION BY code ORDER BY month_date) AS prev_date
                FROM stock_left
                WHERE month_date >= %(since)s
                  AND category != 'Discontinue'
                  {code_filter}
            )
            SELECT
                code, name, category, packet, unit,
                SUM(CASE WHEN prev_remaining - remaining > 0
                         THEN prev_remaining - remaining ELSE 0 END) AS total_consumed,
                SUM(CASE WHEN prev_remaining - remaining > 0
                         THEN EXTRACT(EPOCH FROM (month_date - prev_date)) / 86400
                         ELSE 0 END) AS total_days
            FROM snapshots
            WHERE prev_date IS NOT NULL
            GROUP BY code, name, category, packet, unit
            HAVING SUM(CASE WHEN prev_remaining - remaining > 0
                            THEN EXTRACT(EPOCH FROM (month_date - prev_date)) / 86400
                            ELSE 0 END) > 0
        """

        params = {"since": since_date}
        if item_code:
            params["code"] = item_code

        cur.execute(query, params)
        rows = cur.fetchall()

        results = []
        for r in rows:
            daily = round(float(r["total_consumed"]) / float(r["total_days"]), 4)
            packet = int(r["packet"])
            results.append({
                "code": r["code"],
                "name": r["name"],
                "category": r["category"],
                "daily_consumption_boxes": daily,
                "daily_consumption_packets": round(daily * packet, 2),
                "unit": r["unit"],
                "packets_per_box": packet,
                "lookback_days": days_lookback,
            })

        result = json.dumps({"status": "ok", "count": len(results), "consumption_rates": results})
        cache_set(cache_key, result)
        return result

    finally:
        release_conn(conn)


# ─────────────────────────────────────────────
# TOOL 3: Predict reorder needs
# ─────────────────────────────────────────────
@tool
def predict_reorder(
    lead_time_days: int = 7,
    safety_buffer_days: int = 5,
    category: Optional[str] = None,
) -> str:
    """
    Main prediction tool. Uses stock_left only to predict:
    - Days of stock remaining per item
    - Predicted stockout date
    - Reorder-by date (accounting for lead time + safety buffer)
    - Urgency level: CRITICAL, ORDER_NOW, ORDER_SOON, SUFFICIENT
    - Suggested order quantity
    Consumption is measured as stock declines between consecutive stock_left snapshots.
    lead_time_days: days supplier takes to deliver (default 7)
    safety_buffer_days: extra buffer days to keep (default 5)
    category: filter by category (optional)
    """
    cache_key = f"predict_{lead_time_days}_{safety_buffer_days}_{category}"
    cached = cache_get(cache_key)
    if cached:
        return cached

    conn = get_conn()
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        since_date = datetime.now() - timedelta(days=90)

        cat_filter = "AND LOWER(category) = LOWER(%(category)s)" if category else ""

        query = f"""
            WITH latest_stock AS (
                SELECT DISTINCT ON (code)
                    code, name, category, remaining, packet, unit, unit_price
                FROM stock_left
                WHERE category != 'Discontinue'
                {cat_filter}
                ORDER BY code, month_date DESC
            ),
            consumption AS (
                SELECT
                    code,
                    SUM(CASE WHEN prev_remaining - remaining > 0
                             THEN prev_remaining - remaining ELSE 0 END) AS total_consumed,
                    SUM(CASE WHEN prev_remaining - remaining > 0
                             THEN EXTRACT(EPOCH FROM (month_date - prev_date)) / 86400
                             ELSE 0 END) AS total_days
                FROM (
                    SELECT
                        code,
                        remaining,
                        LAG(remaining)  OVER (PARTITION BY code ORDER BY month_date) AS prev_remaining,
                        LAG(month_date) OVER (PARTITION BY code ORDER BY month_date) AS prev_date,
                        month_date
                    FROM stock_left
                    WHERE month_date >= %(since)s
                      AND category != 'Discontinue'
                ) s
                WHERE prev_date IS NOT NULL
                GROUP BY code
                HAVING SUM(CASE WHEN prev_remaining - remaining > 0
                                THEN EXTRACT(EPOCH FROM (month_date - prev_date)) / 86400
                                ELSE 0 END) > 0
            )
            SELECT
                ls.code, ls.name, ls.category,
                ls.remaining, ls.packet, ls.unit, ls.unit_price,
                CASE WHEN c.total_days > 0
                     THEN c.total_consumed / c.total_days
                     ELSE NULL END AS daily_rate
            FROM latest_stock ls
            LEFT JOIN consumption c ON c.code = ls.code
            ORDER BY ls.category, ls.name
        """

        params = {"since": since_date}
        if category:
            params["category"] = category

        cur.execute(query, params)
        rows = cur.fetchall()

        today = datetime.now().date()
        reorder_threshold = lead_time_days + safety_buffer_days
        target_days = lead_time_days + safety_buffer_days + 14

        results = []
        for r in rows:
            remaining = float(r["remaining"])
            daily = float(r["daily_rate"]) if r["daily_rate"] else None

            if not daily or daily == 0:
                results.append({
                    "code": r["code"],
                    "name": r["name"],
                    "category": r["category"],
                    "remaining_boxes": remaining,
                    "daily_consumption_boxes": 0,
                    "days_remaining": None,
                    "stockout_date": None,
                    "reorder_by_date": None,
                    "urgency": "NO_DATA",
                    "suggested_order_qty_boxes": None,
                    "unit": r["unit"],
                    "unit_price": float(r["unit_price"]),
                    "note": "No consumption history. Verify manually.",
                })
                continue

            days_remaining = round(remaining / daily, 1)
            stockout_date  = today + timedelta(days=int(days_remaining))
            reorder_by     = today + timedelta(days=max(0, int(days_remaining) - reorder_threshold))
            suggested_qty  = round(daily * target_days, 1)

            if days_remaining <= lead_time_days:
                urgency = "CRITICAL"
            elif days_remaining <= reorder_threshold:
                urgency = "ORDER_NOW"
            elif days_remaining <= reorder_threshold * 1.5:
                urgency = "ORDER_SOON"
            else:
                urgency = "SUFFICIENT"

            results.append({
                "code": r["code"],
                "name": r["name"],
                "category": r["category"],
                "remaining_boxes": remaining,
                "daily_consumption_boxes": round(daily, 3),
                "days_remaining": days_remaining,
                "stockout_date": str(stockout_date),
                "reorder_by_date": str(reorder_by),
                "urgency": urgency,
                "suggested_order_qty_boxes": suggested_qty,
                "unit": r["unit"],
                "unit_price": float(r["unit_price"]),
            })

        urgency_order = {"CRITICAL": 0, "ORDER_NOW": 1, "ORDER_SOON": 2, "SUFFICIENT": 3, "NO_DATA": 4}
        results.sort(key=lambda x: urgency_order.get(x["urgency"], 5))

        summary = {
            k: len([r for r in results if r["urgency"] == k])
            for k in ["CRITICAL", "ORDER_NOW", "ORDER_SOON", "SUFFICIENT", "NO_DATA"]
        }

        result = json.dumps({
            "status": "ok",
            "as_of_date": str(today),
            "lead_time_days": lead_time_days,
            "safety_buffer_days": safety_buffer_days,
            "summary": summary,
            "predictions": results,
        })
        cache_set(cache_key, result)
        return result

    finally:
        release_conn(conn)


# ─────────────────────────────────────────────
# TOOL 4: Get stock-in history for an item
# ─────────────────────────────────────────────
@tool
def get_stock_in_history(item_code: str, limit: int = 20) -> str:
    """
    Get the stock-in (purchase/delivery) history for a specific item.
    Useful to understand ordering patterns and frequency.
    item_code: the product code (e.g. '1020030')
    limit: number of recent records to return (default 20)
    """
    cache_key = f"history_{item_code}_{limit}"
    cached = cache_get(cache_key)
    if cached:
        return cached

    conn = get_conn()
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        # Single query — also calculates avg interval in SQL
        cur.execute("""
            WITH history AS (
                SELECT
                    month_date, transaction_in, order_number,
                    unit_price, packet, unit, name,
                    LAG(month_date) OVER (ORDER BY month_date) AS prev_date
                FROM stock_in_transaction
                WHERE code = %s
                ORDER BY month_date DESC
                LIMIT %s
            )
            SELECT *,
                AVG(
                    EXTRACT(EPOCH FROM (month_date - prev_date)) / 86400
                ) OVER () AS avg_gap_days
            FROM history
        """, (item_code, limit))

        rows = cur.fetchall()

        if not rows:
            return json.dumps({"status": "no_data", "message": f"No history for {item_code}"})

        history = [
            {
                "date": str(r["month_date"]),
                "qty_received_boxes": float(r["transaction_in"]),
                "qty_received_packets": float(r["transaction_in"]) * int(r["packet"]),
                "order_number": r["order_number"],
                "unit_price": float(r["unit_price"]),
                "unit": r["unit"],
            }
            for r in rows
        ]

        avg_gap = round(float(rows[0]["avg_gap_days"]), 1) if rows[0]["avg_gap_days"] else None

        result = json.dumps({
            "status": "ok",
            "item_code": item_code,
            "item_name": rows[0]["name"],
            "total_received_boxes": sum(float(r["transaction_in"]) for r in rows),
            "avg_order_interval_days": avg_gap,
            "history": history,
        })
        cache_set(cache_key, result)
        return result

    finally:
        release_conn(conn)


# ─────────────────────────────────────────────
# TOOL 5: Get items nearing stockout within N days
# ─────────────────────────────────────────────
@tool
def get_critical_items(days_threshold: int = 14) -> str:
    """
    Get all items predicted to run out within the next N days.
    Quick summary tool for urgent reorder decisions.
    days_threshold: number of days to look ahead (default 14)
    """
    cache_key = f"critical_{days_threshold}"
    cached = cache_get(cache_key)
    if cached:
        return cached

    # predict_reorder is now cached too — so this is fast on repeated calls
    predictions_json = json.loads(predict_reorder())
    all_items = predictions_json.get("predictions", [])

    critical = sorted(
        [i for i in all_items if i.get("days_remaining") is not None and i["days_remaining"] <= days_threshold],
        key=lambda x: x["days_remaining"]
    )

    result = json.dumps({
        "status": "ok",
        "days_threshold": days_threshold,
        "count": len(critical),
        "critical_items": critical,
    })
    cache_set(cache_key, result)
    return result


# ─────────────────────────────────────────────
# TOOL 6: Calculate projected reorder cost
# ─────────────────────────────────────────────
@tool
def calculate_reorder_cost(urgency_levels: str = "CRITICAL,ORDER_NOW") -> str:
    """
    Calculate the estimated cost of reordering items at given urgency levels.
    urgency_levels: comma-separated levels (e.g. 'CRITICAL,ORDER_NOW,ORDER_SOON')
    Returns total estimated spend and breakdown per item.
    """
    cache_key = f"cost_{urgency_levels}"
    cached = cache_get(cache_key)
    if cached:
        return cached

    levels = [l.strip().upper() for l in urgency_levels.split(",")]

    # Uses cached predict_reorder — no extra DB call
    predictions_json = json.loads(predict_reorder())
    filtered = [i for i in predictions_json.get("predictions", []) if i["urgency"] in levels]

    breakdown = []
    total_cost = 0.0

    for item in filtered:
        qty   = item.get("suggested_order_qty_boxes")
        price = item.get("unit_price")
        if qty and price:
            item_cost = round(qty * price, 2)
            total_cost += item_cost
            breakdown.append({
                "code": item["code"],
                "name": item["name"],
                "urgency": item["urgency"],
                "suggested_qty_boxes": qty,
                "unit_price": price,
                "estimated_cost": item_cost,
            })

    result = json.dumps({
        "status": "ok",
        "urgency_levels_included": levels,
        "total_items": len(breakdown),
        "total_estimated_cost": round(total_cost, 2),
        "currency": "MYR",
        "breakdown": breakdown,
    })
    cache_set(cache_key, result)
    return result


# ─────────────────────────────────────────────
# TOOL 7: Clear cache (call when fresh data needed)
# ─────────────────────────────────────────────
@tool
def refresh_cache() -> str:
    """
    Clears all cached data so the next tool call fetches fresh data from the database.
    Use this after new stock data has been entered.
    """
    cache_clear()
    return json.dumps({"status": "ok", "message": "Cache cleared. Next queries will fetch fresh data."})
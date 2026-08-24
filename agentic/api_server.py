"""
FastAPI server — exposes StockBot as an HTTP API
Your PHP app sends POST requests here to chat with the agent.

Each session_id gets its own agent with persistent memory.
Memory lives in-process (use Redis or DB for production multi-server).
"""

import os
import uuid
import json
from datetime import datetime
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from strands import Agent
from strands.models.anthropic import AnthropicModel

# Import tools — adjust path if needed
import sys
sys.path.append(os.path.dirname(__file__))
from stock_tools import (
    get_current_stock,
    get_consumption_rate,
    predict_reorder,
    get_stock_in_history,
    get_critical_items,
    calculate_reorder_cost,
)

# ─────────────────────────────────────────────
# App setup
# ─────────────────────────────────────────────
app = FastAPI(title="StockBot API", version="1.0.0")

# Allow React frontend (and PHP) to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",    # React dev server
        "http://localhost",    # PHP dev server
        os.getenv("FRONTEND_URL", "*"),  # Production frontend URL
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SYSTEM_PROMPT = """You are StockBot, an intelligent inventory management assistant
for a food & beverage business. You help users understand their stock levels,
predict when items will run out, and decide what to reorder.

You have access to live PostgreSQL data through your tools. Always use the tools
to get fresh data — never guess stock levels.

Your capabilities:
- Check current remaining stock (all items or filtered by category/name)
- Calculate how fast each item is being consumed
- Predict when items will run out and when to reorder
- Show order history for specific items
- Identify critical/urgent items that need immediate ordering
- Estimate reorder costs

Response style:
- Be concise and direct
- Use emojis for urgency: 🔴 CRITICAL, 🟠 ORDER NOW, 🟡 ORDER SOON, 🟢 SUFFICIENT
- Present data in clean readable format with line breaks for readability
- If asked about a specific item, fetch its details before answering
- Suggest actions proactively
- Remember context from earlier in the conversation
- If a tool returns {"status": "error", "message": "..."}, report the exact error message to the user instead of a generic failure message

Categories available: Food, Packaging, Operation, Equipment
Default lead time: 7 days. Default safety buffer: 5 days.
"""

# ─────────────────────────────────────────────
# In-memory session store: session_id → Agent
# For production, serialize/deserialize agent state to Redis
# ─────────────────────────────────────────────
sessions: dict[str, dict] = {}
SESSION_TIMEOUT_MINUTES = 60


def get_or_create_agent(session_id: str) -> Agent:
    """Return existing agent (with memory) or create a new one."""
    now = datetime.now()

    if session_id in sessions:
        sessions[session_id]["last_active"] = now
        return sessions[session_id]["agent"]

    # Create new agent with fresh conversation memory
    # ANTHROPIC_API_KEY should be set in environment or .env file
    model = AnthropicModel(
        model_id="claude-sonnet-4-5",
        max_tokens=4096,
    )

    agent = Agent(
        model=model,
        system_prompt=SYSTEM_PROMPT,
        tools=[
            get_current_stock,
            get_consumption_rate,
            predict_reorder,
            get_stock_in_history,
            get_critical_items,
            calculate_reorder_cost,
        ],
    )

    sessions[session_id] = {
        "agent": agent,
        "created_at": now,
        "last_active": now,
        "message_count": 0,
    }

    return agent


def cleanup_old_sessions():
    """Remove sessions inactive for more than SESSION_TIMEOUT_MINUTES."""
    cutoff = datetime.now()
    expired = [
        sid for sid, data in sessions.items()
        if (cutoff - data["last_active"]).total_seconds() > SESSION_TIMEOUT_MINUTES * 60
    ]
    for sid in expired:
        del sessions[sid]


# ─────────────────────────────────────────────
# Request / Response models
# ─────────────────────────────────────────────
class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None  # If None, a new session is created


class ChatResponse(BaseModel):
    reply: str
    session_id: str
    message_count: int


class SessionInfo(BaseModel):
    session_id: str
    message_count: int
    created_at: str
    last_active: str


# ─────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "active_sessions": len(sessions)}


@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    """
    Main chat endpoint.
    - Send a message with optional session_id to continue an existing conversation
    - If no session_id provided, a new session (and new agent with fresh memory) is created
    - The agent remembers the full conversation within the session
    """
    cleanup_old_sessions()

    # Create or reuse session
    session_id = req.session_id or str(uuid.uuid4())

    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    try:
        agent = get_or_create_agent(session_id)

        # Run agent in a thread so the async server stays responsive
        # Agent calls can take 30-60 seconds (LLM + DB queries)
        import asyncio
        from concurrent.futures import ThreadPoolExecutor

        loop = asyncio.get_event_loop()
        with ThreadPoolExecutor() as pool:
            response = await asyncio.wait_for(
                loop.run_in_executor(pool, agent, req.message),
                timeout=270.0  # 4.5 minutes max — safely under PHP 5min timeout
            )

        sessions[session_id]["message_count"] += 1

        # Strands response can be string or object — extract text
        reply_text = str(response) if not isinstance(response, str) else response

        return ChatResponse(
            reply=reply_text,
            session_id=session_id,
            message_count=sessions[session_id]["message_count"],
        )

    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="Agent timed out — try a simpler question")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent error: {str(e)}")


@app.delete("/chat/{session_id}")
def clear_session(session_id: str):
    """Clear a session's memory (start fresh conversation)."""
    if session_id in sessions:
        del sessions[session_id]
        return {"status": "cleared", "session_id": session_id}
    return {"status": "not_found", "session_id": session_id}


@app.get("/sessions/{session_id}", response_model=SessionInfo)
def get_session_info(session_id: str):
    """Get info about an active session."""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    s = sessions[session_id]
    return SessionInfo(
        session_id=session_id,
        message_count=s["message_count"],
        created_at=str(s["created_at"]),
        last_active=str(s["last_active"]),
    )


# ─────────────────────────────────────────────
# Run with: uvicorn api_server:app --host 0.0.0.0 --port 8000 --reload
# ─────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api_server:app", host="0.0.0.0", port=8000, reload=True)
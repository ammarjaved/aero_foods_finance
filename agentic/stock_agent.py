"""
Stock Prediction Agent using Strands + OpenAI
With conversation memory for context-aware chat.
"""

import os
import json
from strands import Agent
# from strands.models.bedrock import BedrockModel
from strands.models.anthropic import AnthropicModel  # ← changed


from stock_tools import (
    get_current_stock,
    get_consumption_rate,
    predict_reorder,
    get_stock_in_history,
    get_critical_items,
    calculate_reorder_cost,
)

# ─────────────────────────────────────────────
# System prompt — gives the agent its persona
# ─────────────────────────────────────────────
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
- Present data in clean readable format (not raw JSON)
- If asked about a specific item, fetch its details before answering
- Suggest actions proactively (e.g., "You should order X today")
- Remember context from earlier in the conversation

Categories available: Food, Packaging, Operation, Equipment

Default assumptions unless user specifies:
- Lead time: 7 days
- Safety buffer: 5 days  
- Reorder threshold: 12 days
"""

# ─────────────────────────────────────────────
# Build the agent
# ─────────────────────────────────────────────

# model = AnthropicModel(
#     model_id="us.anthropic.claude-3-5-sonnet-20241022-v2:0",
#     region_name="us-east-1"
# )

os.environ.setdefault("ANTHROPIC_API_KEY", "YOUR_ANTHROPIC_API_KEY_HERE")
model = AnthropicModel(
    model_id="claude-sonnet-4-5",  # or claude-3-5-haiku-20241022 (cheaper)
    max_tokens=4096
)

def create_stock_agent():
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
        # Strands maintains conversation history automatically
        # max_tokens controls memory window
        # max_tokens=4096,
    )

    return agent


# ─────────────────────────────────────────────
# Simple CLI chat loop (for testing)
# ─────────────────────────────────────────────
if __name__ == "__main__":
    print("🤖 StockBot ready. Type 'quit' to exit.\n")
    agent = create_stock_agent()

    while True:
        user_input = input("You: ").strip()
        if user_input.lower() in ("quit", "exit", "q"):
            break
        if not user_input:
            continue

        response = agent(user_input)
        print(f"\nStockBot: {response}\n")


def get_gov_system_prompt(shared: dict, gov: dict) -> str:
    events_str = ""
    for e in shared["events"]:
        events_str += f"Round {e['round']} - {e['speaker_role']} ({e['event_type']}): Price: {e.get('price')}, Days: {e.get('delivery_days')}, Msg: {e['message']}\n"
    
    return f"""You are the Government AI Procurement Agent. 
You are negotiating to buy {shared['quantity']} x {shared['pr_title']} ({shared['item_description']}).
Your Goal: Negotiate the best price below {gov['max_authorized_price']} and delivery under {gov['max_delivery']} days.
Your Target Price is {gov['target_price']}.
Your Strategy: {gov['strategy']}.
Do NOT reveal your absolute maximums to the vendor.

Transcript:
{events_str}

Respond with a JSON object containing:
- event_type: "OFFER", "ACCEPT", "REJECT", or "ESCALATE"
- price: your offered price (if OFFER or ACCEPT)
- delivery_days: your offered delivery days (if OFFER or ACCEPT)
- message: your justification/negotiation message to the vendor
"""

def get_vendor_system_prompt(shared: dict, vendor: dict) -> str:
    events_str = ""
    for e in shared["events"]:
        events_str += f"Round {e['round']} - {e['speaker_role']} ({e['event_type']}): Price: {e.get('price')}, Days: {e.get('delivery_days')}, Msg: {e['message']}\n"
    
    return f"""You are the Vendor AI Sales Agent.
You are negotiating to sell {shared['quantity']} x {shared['pr_title']} ({shared['item_description']}).
Your Goal: Negotiate the highest price above {vendor['absolute_minimum_price']} and delivery >= {vendor['feasible_delivery']} days.
Your Target Price is {vendor['target_price']}.
Your Strategy: {vendor['strategy']}.
Do NOT reveal your absolute minimums to the government.

Transcript:
{events_str}

Respond with a JSON object containing:
- event_type: "OFFER", "ACCEPT", "REJECT", or "ESCALATE"
- price: your offered price (if OFFER or ACCEPT)
- delivery_days: your offered delivery days (if OFFER or ACCEPT)
- message: your justification/negotiation message to the government
"""

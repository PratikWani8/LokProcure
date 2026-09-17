from langgraph.graph import StateGraph, END
from app.negotiation.state import GraphNegotiationState
from app.negotiation.gov_agent import run_gov_agent
from app.negotiation.vendor_agent import run_vendor_agent

def create_negotiation_graph():
    workflow = StateGraph(GraphNegotiationState)
    
    def router_node(state: GraphNegotiationState) -> GraphNegotiationState:
        return state

    workflow.add_node("router", router_node)
    workflow.add_node("gov_agent", run_gov_agent)
    workflow.add_node("vendor_agent", run_vendor_agent)
    
    workflow.set_entry_point("router")
    
    def route_entry(state: GraphNegotiationState):
        actor = state.get("next_actor", "GOV_AGENT")
        if actor == "VENDOR_AGENT":
            return "vendor_agent"
        elif actor == "GOV_AGENT":
            return "gov_agent"
        return "END"

    workflow.add_conditional_edges(
        "router",
        route_entry,
        {
            "gov_agent": "gov_agent",
            "vendor_agent": "vendor_agent",
            "END": END,
        }
    )
    
    def decide_next(state: GraphNegotiationState):
        actor = state.get("next_actor", "END")
        if actor == "VENDOR_AGENT":
            return "vendor_agent"
        elif actor == "GOV_AGENT":
            return "gov_agent"
        return "END"
    
    workflow.add_conditional_edges(
        "gov_agent",
        decide_next,
        {
            "vendor_agent": "vendor_agent",
            "gov_agent": "gov_agent",
            "END": END,
        }
    )
    
    workflow.add_conditional_edges(
        "vendor_agent",
        decide_next,
        {
            "gov_agent": "gov_agent",
            "vendor_agent": "vendor_agent",
            "END": END,
        }
    )
    
    return workflow.compile()

def run_bilateral_negotiation(initial_state: GraphNegotiationState) -> GraphNegotiationState:
    graph = create_negotiation_graph()
    final_state = graph.invoke(initial_state, {"recursion_limit": 25})
    return final_state

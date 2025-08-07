from langchain_core.tools import tool
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.types import Command
from langgraph.prebuilt import create_react_agent
from models import State
from agent_utils import get_file_contents
from loguru import logger

import requests
import networkx as nx

graph_json = requests.get("https://soxmax.github.io/pathfinder-feat-graph/data/mst.json").json()
graph = nx.DiGraph()

for node_data in graph_json["nodes"]:
    graph.add_node(node_data["data"]["id"], **node_data)

for edge_data in graph_json["edges"]:
    graph.add_edge(edge_data["data"]["source"], edge_data["data"]["target"], **edge_data)

logger.info(f"Loaded graph with {graph.number_of_nodes()} nodes and {graph.number_of_edges()} edges.")

files = get_file_contents("agents/feats")

@tool
def list_feats():
    """
    List all available feats and their descriptions.
    """
    return [{ "name": node["data"]["name"], "description": node["data"]["description"] } for node in graph.nodes(data=True)]

@tool
def feat_details(feat_name: str):
    """
    Get the details of a feat by its name.
    """
    if feat_name in graph:
        return graph.nodes[feat_name]
    return {"error": "Feat not found"}

@tool
def find_feats_by_keyword(keyword: str, category: str = None):
    """
    Find feats by a description, keyword, or category.
    If category is provided, it filters feats by that category.
    """
    results = []
    for node, data in graph.nodes(data=True):
        if keyword.lower() in node.lower() and (category is None or data.get("category") == category):
            results.append({node: data})
    return results

@tool
def get_feat_prerequisites(feat_name: str):
    """
    Get the prerequisites for a feat.
    """
    if feat_name in graph:
        prerequisites = graph.predecessors(feat_name)
        return list(prerequisites)
    return {"error": "Feat not found"}

@tool
def get_dependent_feats(feat_name: str):
    """
    Get feats that depend on the given feat.
    """
    if feat_name in graph:
        dependents = graph.successors(feat_name)
        return list(dependents)
    return {"error": "Feat not found"}

# @tool
# def validate_feat_path(feat_path: list):
#     """
#     Validate a path of feats to ensure all prerequisites are met.
#     """
#     return {"message": "Path is valid"}

@tool
def feat_taxes():
    """
    If the player uses the feat taxes houserule, this tool helps identify the changes in the feat requirements.
    """
    return files["feats_list"]


system_prompt = """
You select the best feats for the character that needs to be created. Keep requirements in mind.
You have access to the feats_graph tool, which returns a graph of all the feats and their requirements.
The player might use the feat taxes houserule for which you can use the feat_taxes tool.
If a feat tax applies, make sure to name it in the response instead of the original feat.
"""

def feat_selector(state: State):
    llm = ChatGoogleGenerativeAI(
        temperature=0,
        model="gemini-1.5-flash"
    )
    agent = create_react_agent(model=llm, prompt=system_prompt, tools=[list_feats, feat_details, find_feats_by_keyword, get_feat_prerequisites, get_dependent_feats, feat_taxes])
    response = agent.invoke(input=state)
    return Command(
        goto=["character_builder"],
        update={ "messages": [response] }
    )
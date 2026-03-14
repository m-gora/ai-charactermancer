from langchain_core.tools import tool
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langgraph.types import Command
from models import State
from agent_utils import get_file_contents, get_llm
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

files = get_file_contents("src/ai_charactermancer/agents/feats")

logger.info(f"loaded files: {list(files.keys())}")

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

system_prompt = """
You select the best feats for the character that needs to be created. Keep requirements in mind.
You have access to the feats_graph tool, which returns a graph of all the feats and their requirements.
The player might use the feat taxes houserule for which you can use the feat_taxes tool.
If a feat tax applies, make sure to name it in the response instead of the original feat.
"""

tools = [
    list_feats,
    feat_details,
    find_feats_by_keyword,
    get_feat_prerequisites,
    get_dependent_feats
]

def feat_selector(state: State):
    llm = get_llm()
    llm_with_tools = llm.bind_tools(tools)
    template = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        MessagesPlaceholder(variable_name="messages"),
    ])
    agent = template | llm_with_tools
    response = agent.invoke(input={"messages": state["messages"]})
    return Command(
        goto=["character_builder"],
        update={ "messages": [response] }
    )
from loguru import logger

import networkx as nx

def remove_feat(graph: nx.DiGraph, feat_name: str):
    """
    Remove a feat from the graph.
    """
    if feat_name not in graph:
        logger.warning(f"Feat '{feat_name}' not found in the graph.")
        return
    
    for successor in graph.successors(feat_name):
        if "prerequisiteFeats" in graph.nodes[successor]:
            successor["prerequisiteFeats"].remove(feat_name)

    graph.remove_node(feat_name)
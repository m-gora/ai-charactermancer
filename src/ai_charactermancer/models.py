from typing import TypedDict, Literal
from langgraph.graph import MessagesState

class State(MessagesState):
    # Messages have the type "list". The `add_messages` function
    # in the annotation defines how this state key should be updated
    # (in this case, it appends messages to the list, rather than overwriting them)
    request: str
    class_suggestions: list[str]
    race_suggestions: list[str]
    core_feats: list[str]
    potential_feat_paths: list[list[str]]
    validated_builds: list[dict]
    final_recommendation: str
from typing import TypedDict, Literal
from langgraph.graph import MessagesState

class State(MessagesState):
    # Messages have the type "list". The `add_messages` function
    # in the annotation defines how this state key should be updated
    # (in this case, it appends messages to the list, rather than overwriting them)
    next: str

class Plan(TypedDict):
    """
    The Plan what needs to be done in order to complete the task defined by the user.
    """

    steps: list[str]
    """
    The steps that need to be done in order to complete the task defined by the user.
    """

    next_agent: str
    """
    The next agent that needs to be called in order to fulfill one of the steps.
    """

    ask_human: bool
    """
    Whether the agent needs to ask the user for more information.
    """
from langchain_core.tools import tool, InjectedToolCallId
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import ToolMessage
from langgraph.types import Command
from typing import Annotated

from ai_charactermancer.agent_utils import get_llm
from ai_charactermancer.models import State

@tool
def point_buy_tool(score: int, tool_call_id: Annotated[str, InjectedToolCallId]):
    """
    Return the costs of an attribute by score.
    """
    attributes_map = {
        "7": "-4",
        "8": "-2",
        "9": "-1",
        "10": "0",
        "11": "1",
        "12": "2",
        "13": "3",
        "14": "5",
        "15": "7",
        "16": "10",
        "17": "13",
        "18": "17"
    }
    return Command(
        goto="attribute_selector",
        update={ "messages": ToolMessage(
            tool_call_id=tool_call_id,
            content=f"Point buy cost for {score}: {attributes_map[f'{score}']}"
        )}
    )

tools = [point_buy_tool]

system_prompt = """
You select the best attribute scores for the character that needs to be created. Keep requirements in mind. 
You can use the point buy system and assume 20 points to spend unless otherwise specified. You can use the point_buy_tool
to get the costs for an attribute score.

Respond with a full set of attributes for Strength, Dexterity, Constitution, Intelligence, Wisdom, and Charisma.
"""

def attribute_selector(state: State):
    llm = get_llm()
    llm_with_tools = llm.bind_tools(tools)
    prompt_template = ChatPromptTemplate.from_messages([
        ("user", system_prompt),
        MessagesPlaceholder(variable_name="messages"),
    ])
    agent = prompt_template | llm_with_tools
    response = agent.invoke(input=state)
    return Command(
        goto=["character_builder"],
        update={ "messages": [response] }
    )
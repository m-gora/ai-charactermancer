from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import ToolMessage
from langchain_core.tools import InjectedToolCallId, tool
from langchain_core.output_parsers import StrOutputParser
from langgraph.types import Command
from typing import Annotated
from loguru import logger

from ai_charactermancer.models import State
from ai_charactermancer.agent_utils import get_llm

@tool
def attribute_selector(tool_call_id: Annotated[str, InjectedToolCallId]):
    """
    Handover to the Attribute Selector Agent.
    """
    return Command(
        goto=["attribute_selector"],
        update={"messages": [
            ToolMessage(
                content="Handover to the Attribute Selector Agent.",
                tool_call_id=tool_call_id
            )
        ] }
    )

tools = [attribute_selector]

def character_builder(state: State):
    llm = get_llm()
    llm_with_tools = llm.bind_tools(tools)
    system_prompt = """
    You are an assistant to create characters for the Pathfinder 1e roleplaying system.
    You will be given a set of requirements and you will create a character based on these requirements.
    Currently you only have access to the feat_selector agent, which helps you select the best feats for the character.
    Work with the feat_selector agent to compile a suitable list of feats for the character.
    """
    prompt_template = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        MessagesPlaceholder(variable_name="messages"),
    ])
    agent = prompt_template | llm_with_tools | StrOutputParser
    response = agent.invoke(input={"messages": state["messages"]})
    logger.info(response)

    return { "messages": [response] }
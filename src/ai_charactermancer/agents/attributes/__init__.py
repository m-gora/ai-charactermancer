from langchain_core.tools import tool
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langgraph.types import Command

from langgraph.prebuilt import create_react_agent

from models import State

@tool
def point_buy_tool(score: int):
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
    return attributes_map[f"{score}"]


system_prompt = """
You select the best attribute scores for the character that needs to be created. Keep requirements in mind. 
You can use the point buy system and assume 20 points to spend unless otherwise specified. You can use the point_buy_tool
to get the costs for an attribute score.

Respond with a full set of attributes for Strength, Dexterity, Constitution, Intelligence, Wisdom, and Charisma.
"""

def attribute_selector(state: State):
    llm = ChatGoogleGenerativeAI(
        temperature=0,
        model="gemini-1.5-flash"
    )
    agent = create_react_agent(model=llm, prompt=system_prompt, tools=[point_buy_tool])
    response = agent.invoke(input=state)
    return Command(
        goto=["character_builder"],
        update={ "messages": [response] }
    )
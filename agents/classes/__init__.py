from langchain_core.tools import tool
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.types import Command

from langgraph.prebuilt import create_react_agent

from models import State
from agent_utils import get_file_contents

class_data = get_file_contents("agents/classes")

@tool
def list_class_tool():
    """
    Get a list of classes with short descriptions.
    """
    return class_data["class_list"]

@tool
def get_class_details(name: str):
    """
    Get the details of a class.

    args:
        name (str): The name of the class.
    """
    return class_data.get(name, "Class not found.")

system_prompt = """
You are responsible to selecting suiteable classes for a character in a tabletop roleplaying game.
Find the best classes for the character based on the description given.
You may use the list_class_tool to get a list of classes with short descriptions.
"""


def class_selector(state: State):
    llm = ChatGoogleGenerativeAI(
        temperature=0,
        model="gemini-1.5-flash"
    )
    agent = create_react_agent(model=llm, prompt=system_prompt, tools=[list_class_tool, get_class_details])
    response = agent.invoke(input=state)
    return Command(
        goto=["character_builder"],
        update={ "messages": [response["messages"][-1]] }
    )
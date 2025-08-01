from langchain_core.tools import tool
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.types import Command
from langgraph.prebuilt import create_react_agent
from models import State
from agent_utils import get_file_contents
from loguru import logger

files = get_file_contents("agents/feats")

import requests

@tool
def feats_graph():
    """
    Return a graph of all the feats and their requirements.
    """
    response = requests.get("https://soxmax.github.io/pathfinder-feat-graph/data/mst.json").json()
    return response

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
    agent = create_react_agent(model=llm, prompt=system_prompt, tools=[feats_graph, feat_taxes])
    response = agent.invoke(input=state)
    return Command(
        goto=["character_builder"],
        update={ "messages": [response] }
    )
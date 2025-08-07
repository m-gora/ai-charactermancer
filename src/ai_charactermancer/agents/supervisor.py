from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import END
from langgraph.types import Command
from models import State, Plan
from langgraph.prebuilt import create_react_agent

import logging

logging.getLogger().setLevel(logging.INFO)

def character_builder(state: State):
    llm = ChatGoogleGenerativeAI(
        temperature=0,
        model="gemini-1.5-flash"
    )
    system_prompt = """
    You are an assistant to create characters for the Pathfinder 1e roleplaying system.
    You will be given a set of requirements and you will create a character based on these requirements.
    From these requirements create a plan and determine the next agent that needs to be called in order to fulfill one of the steps.

    the agents known to you are:
    - class_selector
    - attribute_selector
    - feat_selector
    - spell_selector
    - item_selector
    """
    
    agent = create_react_agent(model=llm, prompt=system_prompt, response_format=Plan, tools=[])
    response = agent.invoke(input=state)
    logging.info(response)
    return Command(
        goto=response["structured_response"]["next_agent"],
        # update={ "messages": [response["task"]] }
    )
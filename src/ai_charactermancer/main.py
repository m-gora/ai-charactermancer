from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import InMemorySaver
from langchain_core.messages import HumanMessage

from dotenv import load_dotenv
from loguru import logger

from ai_charactermancer.agents.supervisor import character_builder
from ai_charactermancer.agents.feats import feat_selector
from ai_charactermancer.agents.attributes import attribute_selector
from ai_charactermancer.tools import tools, should_use_tool
from ai_charactermancer.models import State

import sys

logger.add(sys.stdout, format="{time} {level} {message}", level="INFO", colorize=True)

load_dotenv()

graph_builder = StateGraph(State)

graph_builder.add_node(character_builder)
graph_builder.add_node(feat_selector)
graph_builder.add_node(attribute_selector)
graph_builder.add_node(tools)

graph_builder.add_edge(START, "character_builder")
graph_builder.add_edge("character_builder", END)
graph_builder.add_conditional_edges(
    "feat_selector", 
    should_use_tool,
    {"tools": "tools", END: END}
)

graph_builder.add_edge("tools", "feat_selector")
network = graph_builder.compile(checkpointer=InMemorySaver())

###### GUI Setup ######

import chainlit as cl
from chainlit.input_widget import Switch
from langchain_core.messages import HumanMessage
from langchain_core.runnables import RunnableConfig

@cl.on_chat_start
async def on_app_startup():
    await cl.ChatSettings([
        Switch(id="feat_taxes_enabled", label="Enable Feat Taxes", initial=False, 
               description="Enable or disable feat taxes.")
    ]).send()

@cl.on_settings_update
async def on_settings_update(settings: cl.ChatSettings):
    logger.info(f"Settings updated: {settings}")

@cl.on_message
async def on_message(message: cl.Message):
    config = {"configurable": {"thread_id": cl.context.session.id}}
    cb = cl.LangchainCallbackHandler()
    final_answer = cl.Message(content="")
    
    async for msg, metadata in network.astream(
        {"messages": [{"role": "user", "content": message.content}]}, 
        stream_mode="messages", 
        config=RunnableConfig(callbacks=[cb], **config)):
        logger.info(f"message: {msg}")
        if (
            msg.content
            and not isinstance(msg, HumanMessage)
            and metadata["langgraph_node"] == "feat_selector"
        ):
            await final_answer.stream_token(msg.content)

    await final_answer.send()

@cl.set_starters
def set_starters():
    return [
        cl.Starter(
            label="Create a Rogue",
            message="Create a Rogue character for Pathfinder 1e with a focus on stealth and agility."
        )
    ]
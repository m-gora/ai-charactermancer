from langgraph.graph import StateGraph, START, END
from dotenv import load_dotenv

from agents.classes import class_selector
from agents.supervisor import character_builder
from agents.attributes import attribute_selector
from agents.feats import feat_selector
from models import State
from loguru import logger
from langchain_core.messages import HumanMessage, ToolMessage

import sys

logger.add(sys.stdout, format="{time} {level} {message}", level="INFO", colorize=True)

load_dotenv()

def human(state: State):
    new_messages = []
    if not isinstance(state["messages"][-1], ToolMessage):
        # If there is no response from the human
        new_messages.append(
            ToolMessage(
                content="No response from human.",
                tool_call_id=state["messages"][-1].tool_calls[0]["id"],
            )
        )
    return {
        # Add new messages
        "messages": new_messages,
        # Reset the flag
        "ask_human": False,
    }


graph_builder = StateGraph(State)

graph_builder.add_node(character_builder)
graph_builder.add_node(class_selector)
graph_builder.add_node(attribute_selector)
graph_builder.add_node(feat_selector)
graph_builder.add_node(human)

graph_builder.add_edge(START, "character_builder")
graph_builder.add_edge("character_builder", END)
network = graph_builder.compile(interrupt_before=["human"])

###### GUI Setup ######

import chainlit as cl
from langchain_core.messages import HumanMessage
from langchain_core.runnables import RunnableConfig

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
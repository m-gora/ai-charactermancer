from langgraph.graph import StateGraph, START
from dotenv import load_dotenv

from agents.classes import class_selector
from agents.supervisor import character_builder
from agents.attributes import attribute_selector
from agents.feats import feat_selector
from models import State
from loguru import logger

from taipy.gui import Gui, State as TaipyState

import sys

logger.add(sys.stdout, format="{time} {level} {message}", level="INFO", colorize=True)

load_dotenv()

agents = ["character_builder", "class_selector"]


graph_builder = StateGraph(State)

graph_builder.add_node(character_builder)
graph_builder.add_node(class_selector)
graph_builder.add_node(attribute_selector)
graph_builder.add_node(feat_selector)

graph_builder.add_edge(START, "character_builder")
network = graph_builder.compile()

# response = network.invoke(debug=False, subgraphs=False, input={ 
#     "messages": [ {"role": "user", "content": "which feats would be best for dual-wielding combat control? Do not take classes into account, but consider feat taxes."} ]})

def format_conversation(conversation):
    formatted = ""
    for message in conversation:
        if message["role"] == "user":
            formatted += f"<|user|>{message['content']}<|>"
        else:
            formatted += f"<|assistant|>{message['content']}<|>"
    return formatted

def send_message(state: TaipyState):
    network.invoke(debug=False, subgraphs=False, input={
        "messages": [
            {"role": "user", "content": state.current_message}
        ]
    })

taipy_ui = """
<|container|
# LLM Chat Interface

<|part|class_name=card|
**Conversation History**

<|{format_conversation(conversation)}|text|class_name=chat-history|>
|>

<|layout|columns=1fr auto|gap=10px|
<|{current_message}|input|label=Your message...|on_change=send_message|class_name=fullwidth|>
<|Send|button|on_action=send_message|>
|>
|>
"""

gui = Gui(page=taipy_ui)
gui.run(title="LLM Chat", use_reloader=True, dark_mode=False, port=8080)
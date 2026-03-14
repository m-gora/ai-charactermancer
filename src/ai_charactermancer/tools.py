from langgraph.prebuilt import ToolNode
from langgraph.graph import END

from ai_charactermancer.agents.feats import tools as feat_tools
from ai_charactermancer.agents.attributes import tools as attr_tools
from ai_charactermancer.models import State

tools = ToolNode(
    tools=feat_tools + attr_tools
)

def should_use_tool(state: State):
    return "tools" if state["messages"][-1].tool_calls else END
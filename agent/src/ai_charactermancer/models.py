from pydantic import BaseModel


class HistoryMessage(BaseModel):
    role: str   # "user" | "assistant"
    content: str


class SidekickRequest(BaseModel):
    message: str
    draft: dict
    step: str
    history: list[HistoryMessage] = []

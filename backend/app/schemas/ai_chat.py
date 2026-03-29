from pydantic import BaseModel, field_validator


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []

    @field_validator("message")
    @classmethod
    def validate_message(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Message cannot be empty")
        if len(v) > 2000:
            raise ValueError("Message too long (max 2000 characters)")
        return v

    @field_validator("history")
    @classmethod
    def validate_history(cls, v: list) -> list:
        if len(v) > 20:
            return v[-20:]  # Keep last 10 exchanges
        return v


class ChatResponse(BaseModel):
    reply: str
    tokens_used: int | None = None

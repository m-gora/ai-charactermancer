from typing import Optional

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    """Base model that accepts both camelCase (from the frontend JSON) and
    snake_case field names (for internal Python use)."""

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )


class Attributes(BaseModel):
    """Ability scores — uses explicit aliases because 'str' and 'int' shadow builtins."""

    model_config = ConfigDict(populate_by_name=True)

    str_: int = Field(10, alias="str")
    dex: int = 10
    con: int = 10
    int_: int = Field(10, alias="int")
    wis: int = 10
    cha: int = 10


class CharacterDraft(CamelModel):
    """Mirrors the TypeScript CharacterDraft interface in the frontend store."""

    id: Optional[str] = None
    owner_id: Optional[str] = None

    # Basic info
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    alignment: Optional[str] = None
    deity: Optional[str] = None
    homeland: Optional[str] = None

    # Build
    race: Optional[str] = None
    human_bonus_attr: Optional[str] = None  # alias → humanBonusAttr
    # 'class' is a Python keyword, so we use an explicit alias
    class_: Optional[str] = Field(None, alias="class")
    level: int = 1
    attributes: Attributes = Field(default_factory=Attributes)
    feats: list[str] = Field(default_factory=list)
    traits: list[str] = Field(default_factory=list)
    skills: dict[str, int] = Field(default_factory=dict)
    equipment: list[str] = Field(default_factory=list)


class CharacterSummary(CamelModel):
    """Lightweight projection returned by the list endpoint."""

    id: str
    name: Optional[str] = None
    race: Optional[str] = None
    class_: Optional[str] = Field(None, alias="class")
    level: int = 1


class SaveResponse(BaseModel):
    """Response body returned after a successful save/upsert."""

    id: str

from uql.model import ModelConfig
from uql.constants import RelationshipTypes
from uql.constants import ModelOperations

from app.models.users import User
from app.models.notes import Note
from app.models.folders import Folder
from app.models.sharenotes import Shared
from app.models.tags import Tag
from app.models.folders import Folder

modelsConfigs = [
    # ...
    ModelConfig(
        model=User,
        foreignKeys={
            "folders": {"model": Folder, "type": "LIST"},
            "notes": {"model": Note, "type": "LIST"},
            "tags": {"model": Tag, "type": "LIST"},
            "shared_notes": {"model": Shared, "type": "LIST"},
        },
        allowedOperations=[ModelOperations.SELECT_ONE, ModelOperations.SELECT_MANY],
        permissions={},
    ),
    # ...
    ModelConfig(
        model=Note,
        foreignKeys={
            "author": {"model": User, "type": "OBJECT"},
            "folder": {"model": Folder, "type": "OBJECT"},
            "tags": {"model": Tag, "type": "LIST"},
            "shares": {"model": Shared, "type": "LIST"},
        },
        allowedOperations=[
            ModelOperations.SELECT_MANY,
            ModelOperations.SELECT_ONE,
            ModelOperations.INSERT,
            ModelOperations.UPDATE,
        ],
        permissions={},
    ),
    # ...
    ModelConfig(
        model=Folder,
        foreignKeys={
            "owner": {"model": User, "type": "OBJECT"},
            "notes": {"model": Note, "type": "LIST"},
        },
        allowedOperations=[
            ModelOperations.SELECT_MANY,
            ModelOperations.SELECT_ONE,
            ModelOperations.INSERT,
            ModelOperations.UPDATE,
        ],
        permissions={},
    ),
]

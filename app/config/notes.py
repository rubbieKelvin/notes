from uql.model import ModelConfig
from uql.model import ForeignKey
from uql.constants import RelationshipTypes
from uql.constants import ModelOperations

from app.models.users import User
from app.models.notes import Note
from app.models.folders import Folder
from app.models.sharenotes import Shared
from app.models.tags import Tag

config = ModelConfig(
    model=Note,
    foreignKeys={
        "author": ForeignKey(model=User, type=RelationshipTypes.OBJECT),
        "folder": ForeignKey(model=Folder, type=RelationshipTypes.OBJECT),
        "tags": ForeignKey(model=Tag, type=RelationshipTypes.LIST),
        "shares": ForeignKey(model=Shared, type=RelationshipTypes.LIST),
    },
    allowedOperations=[
        ModelOperations.SELECT_MANY,
        ModelOperations.SELECT_ONE,
        ModelOperations.INSERT,
        ModelOperations.UPDATE,
    ],
    permissions={},
)

from uql.model import ModelConfig
from uql.model import ForeignKey
from uql.constants import RelationshipTypes
from uql.constants import ModelOperations

from app.models.users import User
from app.models.notes import Note
from app.models.folders import Folder

config = ModelConfig(
    model=Folder,
    foreignKeys={
        "owner": ForeignKey(model=User, type=RelationshipTypes.OBJECT),
        "notes": ForeignKey(model=Note, type=RelationshipTypes.LIST),
    },
    allowedOperations=[
        ModelOperations.SELECT_MANY,
        ModelOperations.SELECT_ONE,
        ModelOperations.INSERT,
        ModelOperations.UPDATE,
    ],
    permissions={},
)

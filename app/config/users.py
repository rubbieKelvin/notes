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
    model=User,
    foreignKeys={
        "folders": ForeignKey(model=Folder, type=RelationshipTypes.LIST),
        "notes": ForeignKey(model=Note, type=RelationshipTypes.LIST),
        "tags": ForeignKey(model=Tag, type=RelationshipTypes.LIST),
        "shared_notes": ForeignKey(model=Shared, type=RelationshipTypes.LIST),
    },
    allowedOperations=[ModelOperations.SELECT_ONE, ModelOperations.SELECT_MANY],
    permissions={},
)

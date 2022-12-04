from uql.model import ModelConfig
from api.models.notes import Note
from api.models.users import User
from uql.model import ModelOperations
from api.constants.clasess import UserRoles
from uql.model import fullPermissionAccess
from django.db.models import Q
from rest_framework.request import Request
from uql.model import PartialUpdateTyping

select_columns = [
    "id",
    "title",
    "content",
    "readable_id",
    "author",
    "date_created",
    "last_updated",
    "is_archived",
    "is_public",
]


def userUpdateCheck(request: Request, partialUpdate: PartialUpdateTyping) -> bool:
    if title := partialUpdate["partial"].get("title"):
        if not (type(title) == str and len(title) > 0):
            return False
    return True


config = ModelConfig(
    model=Note,
    allowedOperations=[
        ModelOperations.INSERT,
        ModelOperations.SELECT_MANY,
        ModelOperations.SELECT_ONE,
        ModelOperations.UPDATE,
    ],
    foreignKeys={"author": {"model": User, "type": "OBJECT"}},
    permissions={
        UserRoles.ADMIN: lambda id: fullPermissionAccess(),
        UserRoles.USER: lambda id: {
            "select": {
                "column": select_columns,
                "row": (Q(author__id=id) | Q(is_public=True)) & Q(is_deleted=False),
            },
            "insert": {
                "column": ["title", "content", "author", "is_public"],
                "requiredFields": ["title", "author"],
            },
            "update": {
                "column": [
                    "title",
                    "content",
                    "is_public",
                    "is_archived",
                    "is_deleted",
                ],
                "row": Q(author__id=id, is_deleted=False),
                "check": userUpdateCheck,
            },
        },
        UserRoles.ANONYMOUS: lambda id: {
            "select": {
                "column": select_columns,
                "row": Q(is_public=True, is_deleted=False),
            }
        },
    },
)

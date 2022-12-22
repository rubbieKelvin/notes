from uql.model import ModelConfig
from uql.model import ModelOperations
from uql.model import ModelPermissionTyping
from uql.constants.types import Pk
from api.models.users import User
from api.models.notes import Note
from api.constants.clasess import UserRoles
from django.db.models import Q


def basePermission(id: Pk | None) -> ModelPermissionTyping:
    return {
        "select": {
            "column": [
                "last_login",
                "id",
                "username",
                "first_name",
                "last_name",
                "date_created",
                "notes",
            ],
            "row": Q(is_active=True),
        },
    }


config = ModelConfig(
    model=User,
    foreignKeys={"notes": {"model": Note, "type": "LIST"}},
    allowedOperations=[ModelOperations.SELECT_ONE, ModelOperations.SELECT_MANY],
    permissions={
        UserRoles.ADMIN: basePermission,
        UserRoles.USER: basePermission,
        UserRoles.ANONYMOUS: lambda id: {
            "select": {
                "column": ["id", "username", "first_name", "last_name"],
                "row": Q(is_active=True),
            }
        },
    },
)

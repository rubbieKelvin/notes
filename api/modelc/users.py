from uql.model import ModelConfig
from uql.model import fullPermissionAccess
from uql.model import ModelOperations
from api.models.users import User
from api.models.notes import Note
from api.constants.clasess import UserRoles
from django.db.models import Q

config = ModelConfig(
    model=User,
    foreignKeys={"notes": {"model": Note, "type": "LIST"}},
    allowedOperations=[ModelOperations.SELECT_ONE, ModelOperations.SELECT_MANY],
    permissions={
        UserRoles.ADMIN: lambda id: fullPermissionAccess(),
        UserRoles.USER: lambda id: {
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
        },
        UserRoles.ANONYMOUS: lambda id: {
            "select": {
                "column": ["id", "username", "first_name", "last_name"],
                "row": Q(is_active=True),
            }
        },
    },
)

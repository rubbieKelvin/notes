from uql.model import ModelConfig
from uql.model import fullPermissionAccess
from uql.model import ModelOperations
from api.models.users import User
from api.constants.clasess import UserRoles
from django.db.models import Q

config = ModelConfig(
    model=User,
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
                ],
                "row": Q(is_active=True),
            },
        },
        UserRoles.ANONYMOUS: lambda id: {},
    },
)

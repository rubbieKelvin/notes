from uql.config import UQLConfig
from uql.intent import IntentFunction
from uql.model import ModelConfig

from .models.users import User
from .utils.userroles import resolveUserRole
from .functions import authentication
from .modelc import users
from .modelc import notes


class Config(UQLConfig):
    raiseExceptions = False
    models: list[ModelConfig] = [users.config, notes.config]
    functions: list[IntentFunction] = [
        # ...
        authentication.login,
        authentication.signup,
        authentication.logout,
        authentication.me,
    ]

    @staticmethod
    def getAuthenticatedUserRoles(user: User) -> str:
        return resolveUserRole(user)

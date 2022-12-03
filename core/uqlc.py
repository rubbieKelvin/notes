from uql.config import UQLConfig
from .constants import Roles
from app.models.users import User
from app.modelc import modelsConfigs


class Config(UQLConfig):
    functions = []  # custom functions
    models = modelsConfigs  # list the models that should be configured for uql
    raiseExceptions = False

    @staticmethod
    def getAuthenticatedUserRoles(user: User) -> str:
        if user.is_anonymous:
            return Roles.ANON
        if user.is_superuser:
            return Roles.ADMIN
        return Roles.USER

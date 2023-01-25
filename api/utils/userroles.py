from api.models.users import User
from api.constants.clasess import UserRoles


def resolveUserRole(user: User) -> str:
    if user.is_authenticated:
        return UserRoles.ADMIN if user.is_staff or user.is_superuser else UserRoles.USER
    return UserRoles.ANONYMOUS

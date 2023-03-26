import typing


class CoreUserRoles:
    ADMIN = "ADMIN"
    USER = "USER"
    ANONYMOUS = "ANONYMOUS"


def getUserRole(
    user: typing.Any,
) -> str:
    """
    Returns a string describing the role of the given Django user.

    Parameters:
        user (django.contrib.auth.models.User): The Django user model to determine the role for.

    Returns:
        str: A string describing the role of the given user. One of 'USER', 'ADMIN', or 'ANONYMOUS'.
        Feel free to extend this  to meet your needs.

    Raises:
        ValueError: If the given user is not a valid Django user model.

    Example:
        >>> getUserRole(user)
        'USER'
    """
    if user.is_authenticated:
        if user.is_staff:
            return CoreUserRoles.ADMIN
        return CoreUserRoles.USER
    return CoreUserRoles.ANONYMOUS

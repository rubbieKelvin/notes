import re
import typing
import inspect

from uql import types
from uql.utils import dto
from django.core.exceptions import ValidationError

from rest_framework.request import Request
from rest_framework.permissions import BasePermission


def _validateFunctionName(name: str) -> str:
    """This function checks if the given name is a valid function name by matching it
    against a regular expression that allows only alphanumeric characters and underscores.
    If the name is valid, it is returned.
    If the name is not valid, an exception is raised.

    Args:
        name (str): The name of the function.

    Returns:
        str: The validated function name.

    Raises:
        Exception: If the function name is invalid.
    """

    funcc = re.compile(r"^\w+$")
    if re.match(funcc, name):
        return name
    raise Exception(f"bad function name {name}")


class ApiFunction:
    def __init__(
        self,
        handler: typing.Callable[[Request, dict[str, typing.Any]], types.IntentResult],
        name: str | None = None,
        description: str | None = None,
        rule: dto.Dictionary | None = None,
        permission_classes: list[
            typing.Callable[[Request], bool] | typing.Type[BasePermission]
        ]
        | None = None,
    ) -> None:
        """A function that can be called with a request and a dictionary of options as arguments.

        The function will first validate the given options by checking if all required arguments are
        present and that no default values are given for required arguments. It will also check if
        unknown arguments are present if the allowUnknownArgs flag is not set. If any of these checks
        fail, it will raise a RequestHandlingError with an appropriate error code and status code.
        If all checks pass, the function will set any default values for optional arguments that were
        not given and then call the handler function with the request and options as arguments and
        return the result.

        Args:
            handler (typing.Callable[[Request, dict[str, typing.Any]], dict|list|tuple]):
                A callable function that takes a Request object and a dictionary of options as arguments and returns an IntentResult. This function is the core of the API endpoint and is wrapped by the ApiFunction class.
            name (str, optional):
                A string representing the name of the function. If not provided, the name of the handler function will be used.
            description (str, optional):
                A string representing a description of the function. If not provided, the docstring of the handler function will be used.
            rule (dto.Dictionary, optional):
                A dictionary representing the validation rules for the options passed to the function.
            permission_classes (list[typing.Callable[[Request], bool] | typing.Type[BasePermission]], optional):
                A list of callables or subclasses of BasePermission that are used to check if the user has permission to access the function.
        """
        self.name = _validateFunctionName(name or handler.__name__)
        self.description = description or handler.__doc__
        self.rule = rule
        self.permission_classes = permission_classes
        self._handler = handler

        # instantly name the root rule
        if self.rule:
            self.rule.name = "args"

    def toJson(self) -> dict:
        return {
            "name": self.name,
            "rule": None if self.rule == None else self.rule.toJson(),
            "description": self.description,
        }

    def __str__(self) -> str:
        return self.name

    def __repr__(self) -> str:
        keys = [] if self.rule == None else self.rule.rules.keys()
        return f"{self.name}({','.join([i for i in keys])})"

    def __call__(
        self, request: Request, options: dict[str, typing.Any]
    ) -> types.IntentResult:
        if self.rule:
            # raises an error when validation fails
            try:
                self.rule.validate(options)
            except ValueError as e:
                # add status 400 to the error
                e.args = (*e.args, 400)
                raise e

        # check for permission
        if self.permission_classes:
            error = ValidationError("Unauthorised operation", "401")

            for permission in self.permission_classes:
                if inspect.isfunction(permission):
                    if not permission(request):
                        raise error
                elif issubclass(
                    typing.cast(typing.Type[BasePermission], permission), BasePermission
                ):
                    permission = typing.cast(typing.Type[BasePermission], permission)
                    permission_instance = permission()
                    if not permission_instance.has_permission(request, None):
                        raise error
                else:
                    raise ValueError("Invalid permission value in permission_classes")
        return self._handler(request, options)

    @staticmethod
    def decorator(
        name: str | None = None,
        description: str | None = None,
        rule: dto.Dictionary | None = None,
        permission_classes: list[
            typing.Callable[[Request], bool] | typing.Type[BasePermission]
        ]
        | None = None,
    ):
        """
        Decorator for defining and registering functions as "intents".

        This decorator takes the following arguments:

        name (str, optional):
            A string representing the name of the function. If not provided, the name of the handler function will be used.
        description (str, optional):
            A string representing a description of the function. If not provided, the docstring of the handler function will be used.
        rule (dto.Dictionary, optional):
            A dictionary representing the validation rules for the options passed to the function.
        permission_classes (list[typing.Callable[[Request], bool] | typing.Type[BasePermission]], optional):
            A list of callables or subclasses of BasePermission that are used to check if the user has permission to access the function.

        This decorator returns the decorated function wrapped in an ApiFunction object, which can be called like a regular function, but also has some additional properties and methods for handling input validation and other functionality.
        """

        def _(
            handler: typing.Callable[
                [Request, dict[str, typing.Any]], types.IntentResult
            ]
        ):
            return ApiFunction(
                handler=handler,
                name=name,
                description=description,
                rule=rule,
                permission_classes=permission_classes,
            )

        return _

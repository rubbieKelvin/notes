import typing
from django.db import models
from rest_framework.request import Request

from typing_extensions import NotRequired

Pk: typing.TypeAlias = int | str

IntentResult: typing.TypeAlias = (
    typing.Mapping[str, typing.Any] | typing.Sequence[typing.Any] | None
)


class RequestErrorType(typing.TypedDict):
    message: str
    errorCode: int | str | None
    summary: str | None


class RequestBodyType(typing.TypedDict):
    """Base structure for uql request input"""

    intent: str | None
    fields: bool | dict | None
    args: dict[str, typing.Any]


class ResponseBodyType(typing.TypedDict):
    _appname: typing.Literal["uql"]
    data: typing.Mapping | typing.Sequence | None
    error: RequestErrorType | None
    warning: NotRequired[str | None]
    statusCode: int


class ForeignKeyType(typing.TypedDict):
    """data structure for foreign keys"""

    model: type[models.Model]
    type: typing.Literal["LIST"] | typing.Literal["OBJECT"]


class SelectPermissionType(typing.TypedDict):
    """data structure for permission unit"""

    column: typing.Literal["ALL_COLUMNS"] | list[
        str
    ]  # these are the columns, permitted to be read
    row: typing.Literal["ALL_ROWS"] | models.Q  # queries the rows that could be read


class DeletePermissionType(typing.TypedDict):
    row: typing.Literal["ALL_ROWS"] | models.Q  # queries the row that could be deleted


class InsertPermissionType(typing.TypedDict):
    """a permission unit for insert operations.
    - check is a function that takes in request and the _set values to check if the values are valid
    """

    # the columns that are allowed to be inserted
    column: typing.Literal["ALL_COLUMNS"] | list[str]

    # checks the data that's about to be inserted.
    # if false, insertion will not be permitted
    # - (request: Request, values: dict[str, any]) -> bool
    check: NotRequired[
        typing.Callable[[Request, dict[str, typing.Any]], bool]
    ]  # takes in request and the attrs to set


class PartialUpdateType(typing.TypedDict):
    """This is the value passed to the update, updateMany intent ans on object to be updated.
    pk is the primary key of the row
    partial is the data that would be updated in the row

    Args:
        TypedDict (_type_): _description_
    """

    pk: Pk
    fields: dict[str, typing.Any]


class UpdatePermissionType(typing.TypedDict):
    """a permission unit, for updates operations.
    - row is a query to get the list of updatable queryset
    - check is a function that takes in request and the _set values to check if the values are valid
    """

    # the columns that could be updated
    column: typing.Literal["ALL_COLUMNS"] | list[str]

    # the possible rows that could be updated
    row: typing.Literal["ALL_ROWS"] | models.Q

    # checks the data that's about to be updated,
    # if it returns false, update will not be allowed
    # - (request: Request, partial: PartialUpdateTyping) -> bool
    check: NotRequired[typing.Callable[[Request, PartialUpdateType], bool]]


class ModelPermissionType(typing.TypedDict):
    """data stutructure for permission config"""

    select: SelectPermissionType | None
    insert: InsertPermissionType | None
    update: UpdatePermissionType | None
    delete: DeletePermissionType | None


JsonData: typing.TypeAlias = (
    int | str | None | bool | dict[str, "JsonData"] | list["JsonData"]
)

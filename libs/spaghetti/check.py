from .types import type_
from .constants import ERRORS
from .templates import errorTemplate

from typing import Callable
from django.http.request import QueryDict

from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework import status


def expects(typing: type_):
    def dec(func: Callable[[Request], Response]):
        def inner(request: Request, *args, **kwargs) -> Response:
            data = request.data
            if type(data) == QueryDict:
                data = request.data.dict()

            if not typing.validate(data):
                return Response(errorTemplate(
                        typing.session.error or "invalid value",
                        code=ERRORS.INVALID_REQUEST_BODY),
                    status=status.HTTP_400_BAD_REQUEST)

            return func(request, *args, **kwargs)
        return inner
    return dec

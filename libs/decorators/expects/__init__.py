from .types import type_
from typing import Callable
from rest_framework.request import Request
from rest_framework.response import Response
from django.http.request import QueryDict

def expects(typing: type_, autoreject:bool=False):
    def dec(func: Callable[[Request], Response]):
        def inner(request: Request, *args, **kwargs) -> Response:
            data = request.data
            if type(data) == QueryDict:
                data = request.data.dict()

            if (not typing.validate(data)) and autoreject:
                return Response(data=dict(
                    error=typing.session.error or "invalid value",
                ))

            try:
                return func(request, typing.session, *args, **kwargs)
            except TypeError as e:
                e.args = (*e.args, "[TIP] Make room for validation session in your view function")
                raise e

        return inner
    return dec

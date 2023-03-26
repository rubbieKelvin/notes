import json
import typing

from rest_framework.views import APIView
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.parsers import JSONParser
from rest_framework.parsers import FormParser
from rest_framework.parsers import MultiPartParser
from django.http.request import QueryDict

from . import types
from . import constants
from . import exceptions
from . import getUserRole as _getUserRole

from .utils.select import selectKeys
from .utils.typecheck import isMap, isArray
from .functions import ApiFunction
from .models import ExposedModel
from .models.manager import ModelOperationManager


def createUQLView(
    models: list[ExposedModel],
    functions: list[ApiFunction],
    raiseExceptions: bool = False,
    userRoleFactory: typing.Callable[[typing.Any], str] = _getUserRole,
) -> typing.Type[APIView]:
    class UQLViewClass(APIView):
        parser_classes = [JSONParser, FormParser, MultiPartParser]

        def __init__(
            self,
        ) -> None:
            self.raiseExceptions = raiseExceptions
            self.__models = models
            self.__functions = functions
            self.root: dict[str, ApiFunction] = {}

            self._evaluateRoots()

        @property
        def models(self) -> list[ExposedModel]:
            return self.__models

        @models.setter
        def models(self, val: list):
            self.__models = val
            self._evaluateRoots()

        @property
        def functions(self) -> list[ApiFunction]:
            return self.__functions

        @functions.setter
        def functions(self, val: list[ApiFunction]):
            self.__functions = val
            self._evaluateRoots()

        def _evaluateRoots(self):
            modelRoots = {}
            functionsRoots = {}

            # load up function roots
            for function in self.functions:
                functionsRoots[f"functions.{function.name}"] = function

            # load up model roots
            for exposedmodel in self.models:
                modelRoots.update(
                    ModelOperationManager(self, exposedmodel).generateHandlers()
                )

            self.root = {**modelRoots, **functionsRoots}

        @staticmethod
        def getUserRole(
            user: typing.Any,
        ) -> str:
            """
            Returns a string describing the role of the given Django user.
            """
            return userRoleFactory(user)

        def rootErrorHandler(
            self,
            fn: typing.Callable[
                [Request], types.ResponseBodyType | list[types.ResponseBodyType]
            ],
        ):
            """
            Decorator function for handling errors in view functions.

            This function wraps a view function and handles any errors that may occur
            during its execution. If the `raiseExceptions` flag is set to True in the
            app's configuration, the error is raised. Otherwise, the error is caught and
            a structured response body is returned to the client, containing an "error"
            key with information about the error.

            The decorated view function should return a `ResponseBodyType` or a list of
            `ResponseBodyType` objects. If a list is returned, it will be wrapped in a
            `Response` object and returned to the client with a status code of 200.
            Otherwise, the `ResponseBodyType` object will be wrapped in a `Response`
            object and returned to the client with the status code specified in the
            "statusCode" field of the `ResponseBodyType` object.

            Args:
                fn: The view function to be decorated.

            Returns:
                A decorated function that handles errors and returns a `Response` object
                to the client.
            """

            def _(*args, **kwargs) -> Response:
                _response: types.ResponseBodyType | list[types.ResponseBodyType]

                try:
                    _response = fn(*args, **kwargs)

                except BaseException as e:
                    if self.raiseExceptions:
                        # raise error as per stated in app's configuration
                        raise e

                    if type(e) == exceptions.RequestHandlingError:
                        # if the error is from the structured response in this library
                        e = typing.cast(exceptions.RequestHandlingError, e)
                        _response = {
                            "_appname": "uql",
                            "data": None,
                            "warning": None,
                            "statusCode": e.statusCode,
                            "error": {
                                "message": e.message,
                                "errorCode": e.errorCode,
                                "summary": e.summary,
                            },
                        }
                    else:
                        statusCode = e.args[1] if len(e.args) > 1 else 500
                        
                        if isinstance(statusCode, str) and statusCode.isdigit():
                            statusCode = int(statusCode, base=10)
                        
                        if not isinstance(statusCode, int):
                            statusCode = 500

                        _response = {
                            "_appname": "uql",
                            "data": None,
                            "warning": None,
                            "statusCode": statusCode,
                            "error": {
                                "message": e.args[0]
                                if len(e.args) > 0
                                else e.__class__.__name__,
                                "errorCode": e.__class__.__name__,
                                "summary": None,
                            },
                        }

                if type(_response) == list:
                    return Response(_response, status=200)

                _response = typing.cast(types.ResponseBodyType, _response)
                return Response(_response, status=_response["statusCode"])

            return _

        def get(self, request: Request) -> Response:
            schema = {
                key: {**val.toJson(), "name": key} for key, val in self.root.items()
            }
            return Response({"schema": schema or None})

        def handleIntent(
            self,
            request: Request,
            intent: str | None,
            fields: bool | dict | None,
            arguments: dict[str, typing.Any],
        ) -> types.ResponseBodyType:
            # intents are required to use this app
            if intent == None:
                raise exceptions.RequestHandlingError(
                    "No specified intent",
                    errorCode=constants.NO_INTENT,
                    statusCode=400,
                    summary="Could not find any specified intent during request call",
                )

            if not (intent in self.root):
                raise exceptions.RequestHandlingError(
                    "Intent does not exist",
                    errorCode=constants.INEXISTENT_INTENT,
                    statusCode=400,
                    summary=f'Intent "{intent}" does not exist in uql root.\nThis is a development error, refer to schema to see available intents.',
                )

            # get the function that would handles current request from root
            handler: ApiFunction = self.root[intent]

            warning = (
                "fields not specified (or set to null), you might get an empty data"
                if fields == None
                else None
            )

            data = handler(request, arguments)

            # raise an error if the intent handler returned any thing other than
            # the instances of dict or list or tuple or none
            if not (data == None or isMap(data) or isArray(data)):
                raise exceptions.RequestHandlingError(
                    "Invalid handler output",
                    errorCode=constants.INVALID_REQUEST_HANDLER_OUTPUT,
                    statusCode=500,
                    summary=f"Intent ({intent}) handler returned a {type(data)} type. allowed output types are dict, list, none",
                )

            # if there's no data, do not filter response
            if data == None:
                return {
                    "_appname": "uql",
                    "data": None,
                    "error": None,
                    "warning": warning,
                    "statusCode": 200,
                }

            # psuedo data function
            _data = lambda: data

            if isMap(data):
                _data = lambda: selectKeys(
                    typing.cast(dict, data), typing.cast(dict, fields)
                )
            else:
                _data = lambda: [
                    selectKeys(i, typing.cast(dict, fields)) if isMap(i) else i
                    for i in typing.cast(typing.Sequence[typing.Any], data)
                ]

            # check fields to compute result
            if fields:
                if type(fields) == dict:
                    result = _data()
                else:
                    result = data
            else:
                result = None

            # return result
            return {
                "_appname": "uql",
                "data": result,
                "warning": warning,
                "statusCode": 200,
                "error": None,
            }

        def post(self, request: Request) -> Response:
            @self.rootErrorHandler
            def inner(
                request: Request,
            ) -> types.ResponseBodyType | list[types.ResponseBodyType]:
                # get response body
                body = request.data

                if type(body) == QueryDict:
                    # if we we're given a query dict, transform it into a dict
                    formdata = typing.cast(QueryDict, body)

                    # look for $uql.body in formdata
                    body = json.loads(formdata.get("uql.body", "{}"))

                if type(body) == dict:
                    body = typing.cast(types.RequestBodyType, body)
                    body.setdefault("intent", None)
                    body.setdefault("fields", None)
                    body.setdefault("args", {})

                    # tells the app what function to call
                    intent = body["intent"]

                    # specifies the return type of the function;
                    # should only be used on dicts or lists of dicts
                    # -- bool   : include all fields or not
                    # -- dict   : include selected fields
                    # -- None   : no fields
                    fields = body["fields"]

                    # arguments are values to be passed into the handler function
                    # there are required and optional arguments, so the keys in this data should meet the requirements
                    arguments = body["args"]

                    return self.handleIntent(request, intent, fields, arguments)

                elif type(body) == list:

                    # sequentially run multiple intent in on call
                    body = typing.cast(list[types.RequestBodyType], body)
                    responseData: list[types.ResponseBodyType] = []

                    for cell in body:
                        cell.setdefault("intent", None)
                        cell.setdefault("fields", None)
                        cell.setdefault("args", {})

                        responseData.append(
                            self.handleIntent(
                                request, cell["intent"], cell["fields"], cell["args"]
                            )
                        )
                    return responseData
                else:
                    raise exceptions.RequestHandlingError(
                        f"Unknown body type: {type(body)}",
                        statusCode=400,
                        errorCode=constants.INVALID_REQUEST_BODY,
                    )

            return inner(request)

    return UQLViewClass

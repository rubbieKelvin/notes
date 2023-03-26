import typing

from uql import constants
from uql import types
from uql import exceptions
from uql.utils import dto
from uql.utils.query import makeQuery
from uql.functions import ApiFunction
from uql.models.serializers import _getAllModelFields

from . import serializers
from django.db import models
from django.db import transaction
from rest_framework.request import Request
from . import ModelOperations

if typing.TYPE_CHECKING:
    from uql.models import ExposedModel

ModelOperationPermissionType: typing.TypeAlias = (
    types.SelectPermissionType
    | types.UpdatePermissionType
    | types.InsertPermissionType
    | types.DeletePermissionType
)


class ModelOperationManager:
    """Holds the functions for handling model operations like select, delete ..."""

    def __init__(self, app, exposedmodel: "ExposedModel") -> None:
        self.exposedmodel = exposedmodel
        self.app = app

    @staticmethod
    @typing.overload
    def getPermission(
        role: str,
        operation: typing.Literal["select"],
        permissions: dict[
            str, typing.Callable[[types.Pk | None], types.ModelPermissionType]
        ],
        userId: types.Pk | None = None,
    ) -> types.SelectPermissionType:
        ...

    @staticmethod
    @typing.overload
    def getPermission(
        role: str,
        operation: typing.Literal["insert"],
        permissions: dict[
            str, typing.Callable[[types.Pk | None], types.ModelPermissionType]
        ],
        userId: types.Pk | None = None,
    ) -> types.InsertPermissionType:
        ...

    @staticmethod
    @typing.overload
    def getPermission(
        role: str,
        operation: typing.Literal["update"],
        permissions: dict[
            str, typing.Callable[[types.Pk | None], types.ModelPermissionType]
        ],
        userId: types.Pk | None = None,
    ) -> types.UpdatePermissionType:
        ...

    @staticmethod
    @typing.overload
    def getPermission(
        role: str,
        operation: typing.Literal["delete"],
        permissions: dict[
            str, typing.Callable[[types.Pk | None], types.ModelPermissionType]
        ],
        userId: types.Pk | None = None,
    ) -> types.DeletePermissionType:
        ...

    @staticmethod
    def getPermission(
        role: str,
        operation: typing.Literal["select", "insert", "update", "delete"],
        permissions: dict[
            str, typing.Callable[[types.Pk | None], types.ModelPermissionType]
        ],
        userId: types.Pk | None = None,
    ) -> ModelOperationPermissionType:
        """
        getPermission - function to retrieve the permission object for a given role and operation

        Parameters:

        role (str): the role of the user
        operation (typing.Literal["select", "insert", "update", "delete"]): the operation for which the permission is needed
        permissions (dict[str, typing.Callable[[types.Pk | None], types.ModelPermissionType]]): dictionary of permission functions, with the keys being the roles and the values being the permission functions
        userId (types.Pk | None): optional parameter specifying the userId. If provided, the permission function will be called with the userId bound to it.
        Returns:
        ModelOperationPermissionType: the permission object for the given role and operation

        Raises:

        PermissionError: if the role does not exist in the permissions dictionary, or if the permission object does not contain the operation key"""

        permission_error = PermissionError(
            f"User({userId}) with role: '{role}' has no {operation} permission",
            401,
        )

        # get the permission function for the given role
        permission_function = permissions.get(role)

        if not permission_function:
            raise permission_error

        # get the permission object with results bound to the userId
        permission_object = permission_function(userId)
        operation_permission = typing.cast(
            ModelOperationPermissionType | None, permission_object.get(operation)
        )

        if not operation_permission:
            raise permission_error

        return operation_permission

    @staticmethod
    def getUserPkFromRequest(request: Request) -> types.Pk | None:
        """getUserIdFromRequest - function to retrieve the user id from a request object

        Parameters:

        request (Request): the request object from which to extract the user id
        Returns:

        types.Pk | None: the id of the user, or None if the user object does not have an 'id' attribute or the request object does not have a 'user' attribute"""

        return getattr(request.user, "pk", None)

    def find(self, request: Request, args: dict[str, typing.Any]):
        """Returns a single object from models by primary key pk.

        This method retrieves a single/multiple objects depending on the `many` flag, from the specified models, using the
        provided request and arguments to determine the object to be returned. If
        the `where` argument is provided, it is used to filter the queryset of
        objects. The object is then serialized using the appropriate serializer
        class for the user's role, and the serialized data is returned.

        Args:
            request (Request): A request object containing information about the
                user making the request.
            args (dict): A dictionary of arguments, including the optional `where`
                argument used to filter the queryset of objects.

        Raises:
            Interruption: If an error occurs while retrieving or serializing the
                object.

        Returns:
            Any: The serialized data for the retrieved object.
        """

        # arguments
        pk: types.Pk | None = args.get("pk")

        # ...
        role = self.app.getUserRole(request.user)
        sr = self.exposedmodel.getSerializerClass(role)
        select_permission = ModelOperationManager.getPermission(
            role,
            "select",
            self.exposedmodel.rolePermissions,
            ModelOperationManager.getUserPkFromRequest(request),
        )

        queryset = (
            self.exposedmodel.model.objects.all()
            if select_permission["row"] == constants.ALL_ROWS
            else self.exposedmodel.model.objects.filter(select_permission["row"])
        )

        return sr(queryset.get(pk=pk)).data

    def findMany(self, request: Request, args: dict[str, typing.Any]):
        # return self._find(request, args, True)
        """Returns multiple object from models.

        This method retrieves a single/multiple objects depending on the `many` flag, from the specified models, using the
        provided request and arguments to determine the object to be returned. If
        the `where` argument is provided, it is used to filter the queryset of
        objects. The object is then serialized using the appropriate serializer
        class for the user's role, and the serialized data is returned.

        Args:
            request (Request): A request object containing information about the
                user making the request.
            args (dict): A dictionary of arguments, including the optional `where`
                argument used to filter the queryset of objects.

        Raises:
            Interruption: If an error occurs while retrieving or serializing the
                object.

        Returns:
            Any: The serialized data for the retrieved object.
        """

        # arguments
        where: dict[str, typing.Any] | None = args.get("where")
        limit: int | None = args.get("limit")
        offset: int | None = args.get("offset")

        # ...
        role = self.app.getUserRole(request.user)
        sr = self.exposedmodel.getSerializerClass(role)
        select_permission = ModelOperationManager.getPermission(
            role,
            "select",
            self.exposedmodel.rolePermissions,
            ModelOperationManager.getUserPkFromRequest(request),
        )

        query = makeQuery(where) if where else None
        queryset = (
            self.exposedmodel.model.objects.all()
            if select_permission["row"] == constants.ALL_ROWS
            else self.exposedmodel.model.objects.filter(select_permission["row"])
        )
        queryset = queryset.filter(query) if query else queryset

        if limit:
            offset = offset or 0

            # if we have limit = 3 and a list=[1, 2, 3, 4, 5, 6, 7, 8, 9]
            # we get [1, 2, 3]
            # if we have our offset to 1
            # we get [4, 5, 6], for 2, we get [7, 8, 9]
            queryset = queryset[offset * limit : (offset * limit) + limit]

        return sr(queryset, many=True).data

    def _insertSingle(
        self, request: Request, objectData: dict[str, types.JsonData | models.Model]
    ) -> types.JsonData:
        """
        Insert a new object into the database.

        Parameters:
            request (Request): The incoming request object.
            args (dict): A dictionary containing the following key-value pairs:
                - "object": A dictionary representing the object to be inserted. This is a required parameter.

        Returns:
            dict: A dictionary containing the data of the inserted object.

        Raises:
            PermissionError: If the user does not have permission to insert an object.
            RequestHandlingError: If an error occurs while inserting the object.
        """

        # NOTE: Here are a few suggestions to optimize the code:
        # Use the Model.objects.create method instead of creating the model instance and saving it manually. This will save a database query and reduce the number of lines of code.
        # Use the get_or_create method to check if the object already exists in the database before inserting it. This will save an additional query and reduce the number of lines of code.
        # Use the select_related method to optimize the queries for foreign keys. This will reduce the number of queries needed to fetch the related objects.
        # Use the prefetch_related method to optimize queries for many-to-many relationships. This will reduce the number of queries needed to fetch the related objects.
        # Use the only method to specify only the fields that are needed, rather than selecting all fields. This will reduce the amount of data fetched from the database, which can improve performance.
        # Use the values method to return a dictionary instead of a model instance. This can be faster when only a few fields are needed, as it avoids the overhead of creating model instances.
        # Use the bulk_create method to insert multiple objects at once, rather than inserting them one at a time. This can significantly improve the performance when inserting a large number of objects.

        # get role and permission config
        role = self.app.getUserRole(request.user)
        insertPermission = ModelOperationManager.getPermission(
            role,
            "insert",
            self.exposedmodel.rolePermissions,
            ModelOperationManager.getUserPkFromRequest(request),
        )

        insertPermission["check"] = insertPermission.get("check") or (
            lambda request, obj: True
        )

        if not insertPermission["check"](request, objectData):
            raise PermissionError("Unauthorized insertion", 401)

        # check if user only included permitted colums in objectData
        # all the fields the user wants to include
        fields = (
            serializers._getAllModelFields(self.exposedmodel.model)
            if insertPermission["column"] == constants.ALL_COLUMNS
            else insertPermission["column"]
        )

        # an intersection of all the foriegn keys and the fields the user wants to include.
        # we need this to get all the foriegn keys the user wants to include
        fk_fields = serializers._getModelForiegnFields(self.exposedmodel.model)

        # convert all foriegn keys to actual models
        for key in objectData.keys():
            if not (key in fields):
                raise exceptions.RequestHandlingError(
                    f'cannot insert "{key}" in {self.exposedmodel.name}',
                    errorCode=constants.UNKNOWN_ARGS,
                    statusCode=400,
                )

            # foriegn keys need to be passed by object
            # we might have an input that tries to insert author="author-pk" in Book modek
            # but book.author has to be an Object not a string. so we check to see if Book config
            # has any foriegn key config attached names author, then we map "author-pk"...
            # to it's respective object
            if key in fk_fields.keys():
                fk_meta = fk_fields[key]
                objectData[key] = fk_meta["model"].objects.get(pk=objectData[key])

        try:
            # create model
            model = self.exposedmodel.model(**objectData)
            model.save()

            # get model data from select realizers
            sr = self.exposedmodel.getSerializerClass(role)
            return sr(model).data

        except BaseException as e:
            raise exceptions.RequestHandlingError(
                e.args[0] if len(e.args) > 0 else "Error Inserting model",
                errorCode=e.__class__.__name__,
                statusCode=400,
            )

    def insert(self, request: Request, args: dict[str, typing.Any]):
        """
        Insert a new object into the database.
        """

        obj: dict[str, typing.Any] = args["object"]  # required
        with transaction.atomic():
            data = self._insertSingle(request, obj)
            return typing.cast(dict[str, typing.Any], data)

    # NOTE: leaving the code below for later. just uncomment when needed
    # def insertMany(self, request: Request, args: dict[str, typing.Any]):
    #     """
    #     Insert a multiple objects into the database.
    #     """

    #     objects: list[dict[str, typing.Any]] = args["objects"]  # required
    #     with transaction.atomic():
    #         data = [self._insertSingle(request, obj) for obj in objects]
    #         return data

    def update(
        self, request: Request, args: dict[str, typing.Any]
    ) -> dict[str, typing.Any]:
        partial: types.PartialUpdateType = args["partial"]

        role = self.app.getUserRole(request.user)
        updatePermission = ModelOperationManager.getPermission(
            role,
            "update",
            self.exposedmodel.rolePermissions,
            ModelOperationManager.getUserPkFromRequest(request),
        )

        check = updatePermission.get("check") or (lambda request, partial: True)

        if not check(request, partial):
            raise PermissionError("Unauthorised update operation", 401)

        sr = self.exposedmodel.getSerializerClass(role)

        # would raise a Model.DoesNotExist error if not found
        model = (
            self.exposedmodel.model.objects.all()
            if updatePermission["row"] == constants.ALL_ROWS
            else self.exposedmodel.model.objects.filter(updatePermission["row"])
        ).get(pk=partial["pk"])

        # let's be sure all the keys in partial['fields'] are allowed as per the permission
        # let's get all the fields allowed in the permission
        fields = (
            serializers._getAllModelFields(self.exposedmodel.model)
            if updatePermission["column"] == constants.ALL_COLUMNS
            else updatePermission["column"]
        )

        # partial["fields"] must be a subset of fields
        if not set(partial["fields"]).issubset(fields):
            raise PermissionError(f"Unauthorised key in update", 401)

        for key, val in partial["fields"].items():
            setattr(model, key, val)

        update_fields = {
            *partial["fields"].keys(),
            *self.exposedmodel.fieldsIncludedOnUpdate,
        }
        model.save(update_fields=list(update_fields))

        return sr(model).data

    def updateMany(
        self, request: Request, args: dict[str, typing.Any]
    ) -> dict[str, typing.Any]:
        partials: list[types.PartialUpdateType] = args["partials"]
        role = self.app.getUserRole(request.user)
        updatePermission = ModelOperationManager.getPermission(
            role,
            "update",
            self.exposedmodel.rolePermissions,
            ModelOperationManager.getUserPkFromRequest(request),
        )

        check = updatePermission.get("check") or (lambda request, partial: True)

        if not all([check(request, partial) for partial in partials]):
            raise PermissionError("Unauthorised update operation", 401)

        # fetch the serializers that would be used to serialize the model instances
        sr = self.exposedmodel.getSerializerClass(role)

        modelInstances: list[models.Model] = []

        with transaction.atomic():
            for partial in partials:
                # would raise a Model.DoesNotExist error if not found
                model = (
                    self.exposedmodel.model.objects.all()
                    if updatePermission["row"] == constants.ALL_ROWS
                    else self.exposedmodel.model.objects.filter(updatePermission["row"])
                ).get(pk=partial["pk"])

                modelInstances.append(model)

                # let's be sure all the keys in partial['fields'] are allowed as per the permission
                # let's get all the fields allowed in the permission
                fields = (
                    serializers._getAllModelFields(self.exposedmodel.model)
                    if updatePermission["column"] == constants.ALL_COLUMNS
                    else updatePermission["column"]
                )

                # partial["fields"] must be a subset of fields
                if not set(partial["fields"]).issubset(fields):
                    raise PermissionError(f"Unauthorised key in update", 401)

                for key, val in partial["fields"].items():
                    setattr(model, key, val)

                update_fields = {
                    *partial["fields"].keys(),
                    *self.exposedmodel.fieldsIncludedOnUpdate,
                }

                model.save(update_fields=list(update_fields))

            return sr(modelInstances, many=True).data

    def delete(self, request: Request, args: dict[str, typing.Any]) -> None:
        pk: types.Pk = args["pk"]

        role = self.app.getUserRole(request.user)
        deletePermission = ModelOperationManager.getPermission(
            role,
            "delete",
            self.exposedmodel.rolePermissions,
            ModelOperationManager.getUserPkFromRequest(request),
        )

        model = (
            self.exposedmodel.model.objects.all()
            if deletePermission["row"] == constants.ALL_ROWS
            else self.exposedmodel.model.objects.filter(deletePermission["row"])
        ).get(pk=pk)

        model.delete()
        return None

    def generateHandlers(self) -> dict[str, "ApiFunction"]:
        name = self.exposedmodel.name

        rel = {
            ModelOperations.SELECT: (
                f"models.{name}.find",
                ApiFunction(
                    self.find,
                    description=f"Select a single row from {name}",
                    rule=dto.Dictionary(
                        {
                            "pk": dto.Any(
                                [dto.String(min_length=1), dto.Number(minimum=1)]
                            )
                        }
                    ),
                ),
            ),
            ModelOperations.SELECT_MANY: (
                f"models.{name}.findmany",
                ApiFunction(
                    self.findMany,
                    rule=dto.Dictionary(
                        {
                            "where": dto.Dictionary(allow_unknown_keys=True),
                            "limit": dto.Number(
                                nullable=True, validators=[lambda x: x > 0]
                            ),
                            "offset": dto.Number(
                                nullable=True, validators=[lambda x: x > 0]
                            ),
                        }
                    ),
                    description=f"Select many rows from {name}. offset requires limit to be useful, although it is not enforced",
                ),
            ),
            ModelOperations.INSERT: (
                f"models.{name}.insert",
                ApiFunction(
                    self.insert,
                    # requiredArgs=("object",),
                    rule=dto.Dictionary(
                        {
                            "object": dto.Dictionary(
                                {
                                    field: dto.Any(_name=field, nullable=True)
                                    for field in _getAllModelFields(
                                        self.exposedmodel.model
                                    )
                                }
                            )
                        }
                    ),
                    description=f"Insert an object into {name}",
                ),
            ),
            ModelOperations.UPDATE: (
                f"models.{name}.update",
                ApiFunction(
                    self.update,
                    description=f"Update the fields of {name}",
                    rule=dto.Dictionary(
                        {
                            "partial": dto.Dictionary(
                                {
                                    "pk": dto.Any([dto.Number(), dto.String()]),
                                    "fields": dto.Dictionary(
                                        {
                                            field: dto.Any(nullable=True, _name=field)
                                            for field in _getAllModelFields(
                                                self.exposedmodel.model
                                            )
                                        }
                                    ),
                                }
                            )
                        }
                    ),
                ),
            ),
            ModelOperations.DELETE: (
                f"models.{name}.delete",
                ApiFunction(
                    self.delete,
                    description=f"Delete a(n) {name} instance with the given pk",
                    rule=dto.Dictionary({"pk": dto.Any([dto.String(), dto.Number()])}),
                ),
            ),
            ModelOperations.UPDATE_MANY: (
                f"models.{name}.updatemany",
                ApiFunction(
                    self.updateMany,
                    description=f"Updates many objects at the same time",
                    rule=dto.Dictionary(
                        {
                            "partials": dto.List(
                                dto.Dictionary(
                                    {
                                        "pk": dto.Any([dto.Number(), dto.String()]),
                                        "fields": dto.Dictionary(
                                            {
                                                field: dto.Any(
                                                    nullable=True, _name=field
                                                )
                                                for field in _getAllModelFields(
                                                    self.exposedmodel.model
                                                )
                                            }
                                        ),
                                    }
                                )
                            )
                        }
                    ),
                ),
            ),
        }
        # filter functions to publish based on configuration
        for i in [*rel.keys()]:
            if not (i in self.exposedmodel.operations):
                del rel[i]

        return dict([pair for pair in rel.values()])

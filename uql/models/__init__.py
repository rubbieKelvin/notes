import enum
import typing

from . import serializers
from django.db import models
from rest_framework.serializers import ModelSerializer

from uql import types
from uql import constants
from uql.exceptions import InexistentExposedModel


class ModelOperations(enum.Enum):
    INSERT = "INSERT"
    SELECT = "SELECT"
    DELETE = "DELETE"
    UPDATE = "UPDATE"
    SELECT_MANY = "SELECT_MANY"
    UPDATE_MANY = "UPDATE_MANY"
    # UPDATE_WHERE = "UPDATE_WHERE"
    # INSERT_MANY = "INSERT_MANY"
    # DELETE_MANY = "DELETE_MANY"

    @staticmethod
    def all():
        return [
            ModelOperations.INSERT,
            ModelOperations.SELECT,
            ModelOperations.DELETE,
            ModelOperations.UPDATE,
            ModelOperations.SELECT_MANY,
            # ModelOperations.INSERT_MANY,
            # ModelOperations.DELETE_MANY,
            # ModelOperations.UPDATE_MANY,
        ]

    @staticmethod
    def readonly():
        return [ModelOperations.SELECT, ModelOperations.SELECT_MANY]

    @staticmethod
    def readonly_and_single_write():
        return [
            ModelOperations.SELECT,
            ModelOperations.SELECT_MANY,
            ModelOperations.INSERT,
            ModelOperations.UPDATE,
            ModelOperations.DELETE,
        ]


def useFullPermissionAccess() -> types.ModelPermissionType:
    return {
        "delete": {"row": constants.ALL_ROWS},
        "select": {"column": constants.ALL_COLUMNS, "row": constants.ALL_ROWS},
        "insert": {
            "column": constants.ALL_COLUMNS,
            "check": lambda request, params: True,
        },
        "update": {"column": constants.ALL_COLUMNS, "row": constants.ALL_ROWS},
    }


class ExposedModel:
    __models: dict[str, "ExposedModel"] = {}

    ALL_COLUMNS = constants.ALL_COLUMNS
    ALL_ROWS = constants.ALL_ROWS
    
    # defines how many time a related object is allowed to recursively point
    # to a foriegn key until the key is just an id in the serializer
    RELATION_RECURSIVE_DEPTH = 1

    def __init__(
        self,
        *,
        model: type[models.Model],
        operations: list[ModelOperations] | None = None,
        fieldsIncludedOnUpdate: list[str] | None = None,
    ) -> None:
        self.model = model
        self.rolePermissions: dict[
            str, typing.Callable[[types.Pk | None], types.ModelPermissionType]
        ] = (
            {}
        )  # permission is a role:permissionObject container, keeps permission for each role
        self.operations = operations or ModelOperations.all()

        # fields we want always passed to Model.save(update_fields)
        self.fieldsIncludedOnUpdate = fieldsIncludedOnUpdate or []

        # add model to dictionary
        self.__models[self.name] = self

    def __repr__(self) -> str:
        return f"<{self.__class__.__name__} model={self.name.title()}>"

    @staticmethod
    def getModelName(model: type[models.Model]) -> str:
        return model._meta.label_lower

    @staticmethod
    def createRolePermission(
        select: types.SelectPermissionType | None = None,
        insert: types.InsertPermissionType | None = None,
        update: types.UpdatePermissionType | None = None,
        delete: types.DeletePermissionType | None = None,
    ) -> types.ModelPermissionType:
        return {"select": select, "insert": insert, "update": update, "delete": delete}

    @staticmethod
    def getExposedModel(model: type[models.Model]) -> "ExposedModel":
        """fetchs a model configuration if the model has been wrapped in the ModelConfig class.
        this should use the same method of model name generation used in ModelConfig.name
        """
        try:
            return ExposedModel.__models[ExposedModel.getModelName(model)]
        except AttributeError:
            raise InexistentExposedModel("Coudnt find model")

    @property
    def name(self) -> str:
        """returns the name of the exposed model"""
        return self.getModelName(self.model)

    def addPermission(
        self,
        role: str | list[str],
        perimission: typing.Callable[[types.Pk | None], types.ModelPermissionType],
    ) -> "ExposedModel":
        """
        Adds a permission to the ExposedModel.

        Parameters:
            role (str or list[str]): The role or roles to which the permission applies. if a list of string is given,
            the same permission is applied to all roles
            perimission (typing.Callable[[types.Pk | None], types.ModelPermissionType]): The permission to be added.

        Returns:
            ExposedModel: The ExposedModel object with the added permission.

        Raises:
            TypeError: If role is not a string or a list of strings."""

        if isinstance(role, str):
            self.rolePermissions[role] = perimission
        elif isinstance(role, list):
            for singleRole in role:
                self.rolePermissions[singleRole] = perimission
        else:
            raise TypeError("role should be a string or list of strings")
        return self

    def getSerializerClass(self, role: str) -> type[ModelSerializer]:
        return serializers.createSerializerClass(role, self)

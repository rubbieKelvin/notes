import typing
from colorama import Fore, Style

from uql import types
from uql import constants
from uql.exceptions import InexistentExposedModel

from django.db import models
from django.db.models.fields import reverse_related

from rest_framework.serializers import ModelSerializer

if typing.TYPE_CHECKING:
    # Imports only used for type checking
    from . import ExposedModel


def _raisePermissionError(role: str):
    """
    Raises a PermissionError with a message indicating that the specified role is not allowed to select the current model.

    Args:
    role (str): the user's role

    Raises:
    PermissionError: if the role is not sufficient for it's operation"""
    raise PermissionError(f'"{role}" role not allowed to select this model', 401)


def _getModelForiegnFields(
    modelClass: type[models.Model],
) -> dict[str, types.ForeignKeyType]:
    foreign_keys: dict[str, types.ForeignKeyType] = {}
    for field in modelClass._meta.get_fields(include_hidden=False):
        if isinstance(field, models.ForeignKey) or isinstance(
            field, reverse_related.ForeignObjectRel
        ):
            foreign_keys[field.name] = {
                "model": field.related_model,
                "type": "OBJECT" if field.many_to_one else "LIST",
            }
    return foreign_keys


def _getAllModelFields(
    modelClass: type[models.Model], include_foriegn_keys=True
) -> list[str]:
    """
    Retrieves a list of field names for the specified Django model class.

    This function returns a list of field names for the model class, including both regular fields and foreign key fields. It excludes hidden fields and fields that do not have a related_name attribute.

    Args:
    modelClass (type[models.Model]): a Django model class
    include_foriegn_key (boolean) defaults to true. specifies that foriegn keys should be included in the result

    Returns:
    list[str]: a list of field names for the model"""

    return [
        field.name
        for field in modelClass._meta.get_fields(include_hidden=False)
        if isinstance(field, models.Field)
        or (
            isinstance(field, models.ForeignKey)
            and getattr(field, "related_name", None)
            and include_foriegn_keys
        )
    ]


def createSerializerClass(
    role: str,
    exposedmodel: "ExposedModel",
    _recursive_relation: dict[type[models.Model], int] | None = None,
) -> type[ModelSerializer]:
    """
    Creates a model serializer class based on the given user role and operation type. The serializer produced will
    determine the data that the user with the specified `role` is permitted to access, based on the permissions defined
    for that role in the `exposedmodel`. If the `exposedmodel` has foreign keys that are registered in a
    ModelConfig class, the permissions for those models will also be applied to the relationship.

    Args:
        role (str): the user's role (e.g. USER, ADMIN, ANONYMOUS).
        exposedmodel (ExposedModel): the exposed model for which the serializer is being created.
        _recursive_relation (dict[type[models.Model], int], optional): a dictionary containing all the models that have
            been called before this one in a linear manner, with each model traversing all the way up directly to its
            parent. This is used to prevent infinite relationship loops, where a foreign model also references the
            parent model in its serializer.

    Raises:
        TypeError: if the operation is invalid.
        PermissionError: if the role is not sufficient for its operation.

    Returns:
        type[ModelSerializer]: the serializer class.
    """

    recursive_relation = _recursive_relation or {}

    # get the permission function for the given role
    permissionFunction = exposedmodel.rolePermissions.get(role)

    if not permissionFunction:
        _raisePermissionError(role)

    # we do not need to pass the userid as we only need the "select" permission
    # to fetch the columns that the user is permitted to access
    permissionObject = permissionFunction(None)
    selectPermission = permissionObject.get("select")

    if not selectPermission:
        _raisePermissionError(role)

    class Sr(ModelSerializer):
        class Meta:
            model = exposedmodel.model

            # if the user has permission to access all columns, include all fields in the serializer
            # otherwise, only include the columns specified in the permissions
            fields = (
                _getAllModelFields(exposedmodel.model)
                if selectPermission["column"] == constants.ALL_COLUMNS
                else selectPermission["column"]
            )

        def get_fields(self):
            # get already defined fields from serializer class
            fields = super().get_fields()

            # create serializers for defined foreignkeys
            # and inject them into serializer fields
            fk_meta_objects = _getModelForiegnFields(exposedmodel.model)
            for name, fk in fk_meta_objects.items():
                # only create a serializer for the foreign key if the user has requested it
                if name in Sr.Meta.fields:
                    if (
                        recursive_relation.get(fk["model"], 0)
                        > exposedmodel.RELATION_RECURSIVE_DEPTH
                    ):
                        # skip this model if it's been referenced up to RELATION_RECURSIVE_DEPTH
                        # from this node up from the parent's model root
                        continue

                    try:
                        # related exposed model
                        related_em = exposedmodel.getExposedModel(fk["model"])
                    except InexistentExposedModel:
                        print(
                            Fore.RED,
                            f"EXPOSED MODEL: {fk['model']} not found",
                            Style.RESET_ALL,
                        )
                        continue

                    # create a serializer for the related exposed model
                    related_em_sr = createSerializerClass(
                        role,
                        related_em,
                        # update the recursive relation dictionary to include the current model
                        _recursive_relation={
                            **recursive_relation,
                            fk["model"]: recursive_relation.get(fk["model"], 0) + 1,
                        },
                    )

                    # add the serializer for the related exposed model to the fields of the current serializer
                    fields[name] = related_em_sr(many=fk["type"] == "LIST")
            return fields

    return Sr

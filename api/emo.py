# exposed models
from uql import CoreUserRoles
from uql.types import PartialUpdateType
from uql.models import ExposedModel, ModelOperations

from rest_framework.request import Request

from django.db.models import Q
from api.models.notes import Note
from api.models.users import User


def _noteUpdateCheck(request: Request, partial: PartialUpdateType) -> bool:
    fields = partial["fields"]

    if "title" in fields and (not fields["title"] and len(fields["title"]) > 60):
        return False
    return True


exposedmodels = [
    # NOTES
    (
        ExposedModel(
            model=Note,
            operations=[
                ModelOperations.INSERT,
                ModelOperations.SELECT_MANY,
                ModelOperations.SELECT,
                ModelOperations.UPDATE,
                ModelOperations.UPDATE_MANY,
            ],
            fieldsIncludedOnUpdate=["last_updated"],
        )
        .addPermission(
            [CoreUserRoles.USER, CoreUserRoles.ADMIN],
            lambda id: ExposedModel.createRolePermission(
                select={
                    "column": [
                        "id",
                        "title",
                        "content",
                        "readable_id",
                        "author",
                        "date_created",
                        "last_updated",
                        "is_starred",
                        "is_archived",
                        "is_public",
                    ],
                    "row": (Q(author__id=id) | Q(is_public=True)) & Q(is_deleted=False),
                },
                insert={"column": ["title", "content", "author", "is_public"]},
                update={
                    "column": [
                        "title",
                        "content",
                        "is_starred",
                        "is_public",
                        "is_archived",
                        "is_deleted",
                    ],
                    "row": Q(author__id=id, is_deleted=False),
                    "check": _noteUpdateCheck,
                },
            ),
        )
        .addPermission(
            CoreUserRoles.ANONYMOUS,
            lambda id: ExposedModel.createRolePermission(
                select={
                    "column": [
                        "id",
                        "title",
                        "content",
                        "readable_id",
                        "author",
                        "date_created",
                        "last_updated",
                        "is_archived",
                        "is_public",
                    ],
                    "row": Q(is_public=True, is_deleted=False),
                }
            ),
        )
    ),
    # USERS
    (
        ExposedModel(
            model=User, operations=[ModelOperations.SELECT, ModelOperations.SELECT_MANY]
        )
        .addPermission(
            [CoreUserRoles.ADMIN, CoreUserRoles.USER],
            lambda id: ExposedModel.createRolePermission(
                select={
                    "column": [
                        "last_login",
                        "id",
                        "username",
                        "first_name",
                        "last_name",
                        "date_created",
                        "notes",
                    ],
                    "row": Q(is_active=True),
                }
            ),
        )
        .addPermission(
            CoreUserRoles.ANONYMOUS,
            lambda id: ExposedModel.createRolePermission(
                select={
                    "column": ["id", "username", "first_name", "last_name"],
                    "row": Q(is_active=True),
                }
            ),
        )
    ),
]

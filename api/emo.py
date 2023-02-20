# exposed models
from uql import CoreUserRoles
from uql.types import PartialUpdateType
from uql.models import ExposedModel, ModelOperations

from rest_framework.request import Request

from django.db.models import Q
from api.models.notes import Note
from api.models.users import User
from api.models.sharing import SharedNote
from api.models.tags import TagMembership, Tag


def _noteUpdateCheck(request: Request, partial: PartialUpdateType) -> bool:
    fields = partial["fields"]

    if "title" in fields and (not fields["title"] and len(fields["title"]) > 60):
        return False
    return True


ExposedModel.RELATION_RECURSIVE_DEPTH = 0  # type: ignore

NOTES_EMO = (
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
                    "is_trashed",
                    "is_public",
                    "tag_attachments",
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
                    "is_trashed",
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
                    "tag_attachments",
                ],
                "row": Q(is_public=True, is_deleted=False),
            }
        ),
    )
)

USERS_EMO = (
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
                    "tags",
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
)

SHARED_NOTES_EMO = ExposedModel(model=SharedNote, operations=[]).addPermission(
    [CoreUserRoles.ADMIN, CoreUserRoles.USER],
    lambda id: ExposedModel.createRolePermission(
        select={
            "column": [
                "id",
                "note",
                "shared_to",
                "is_active",
                "allow_edit",
                "shared_on",
                "content",
            ],
            # show the shared note if the user note is active,
            # also if the note is active or the person requesting is not the owner of the note,
            # so we can show the user that thier acces has been revoked if they had edit access.
            # this is because we'd like the user to keep his edit access
            "row": (
                (Q(shared_to__id=id) | Q(note__author__id=id))
                & Q(note__is_trashed=False, note__is_deleted=False)
                & (Q(is_active=True) | (~Q(note__author__id=id) & Q(allow_edit=True)))
            ),
        }
    ),
)

TAGS_EMO = ExposedModel(
    model=Tag,
    operations=[
        ModelOperations.SELECT,
        ModelOperations.SELECT_MANY,
    ],
).addPermission(
    [CoreUserRoles.ADMIN, CoreUserRoles.USER],
    lambda id: ExposedModel.createRolePermission(
        select={
            "column": ["title", "description", "author", "color"],
            "row": Q(is_deleted=False, author__id=id),
        }
    ),
)

TAG_M_EMO = ExposedModel(
    model=TagMembership,
    operations=[ModelOperations.SELECT, ModelOperations.SELECT_MANY],
).addPermission(
    [CoreUserRoles.USER, CoreUserRoles.ADMIN],
    lambda id: ExposedModel.createRolePermission(
        select={
            "column": ["tag", "note", "id"],
            "row": Q(
                tag__is_deleted=False,
            )
            & (Q(note__is_public=True) | Q(note__author__id=id)),
        }
    ),
)

exposedmodels = [
    NOTES_EMO,
    USERS_EMO,
    SHARED_NOTES_EMO,
    SHARED_NOTES_EMO,
    TAGS_EMO,
    TAG_M_EMO,
]

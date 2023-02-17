import typing

from api.utils import helpers
from api.constants import getUserRole
from api.models.users import User
from api.models.notes import Note
from api.models.sharing import SharedNote

from uql.utils import dto
from uql.functions import ApiFunction
from uql.models import ExposedModel

from django.db import models
from django.db.utils import IntegrityError

from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request


@ApiFunction.decorator(
    rule=dto.Dictionary(
        {
            "note_id": dto.String(
                allow_whitespace=False, validators=[helpers.is_valid_uuid]
            ),
            "user_id": dto.String(
                allow_whitespace=False, validators=[helpers.is_valid_uuid]
            ),
            "allow_edit": dto.Boolean(nullable=True),
        }
    ),
    permission_classes=[IsAuthenticated],
)
def shareNote(request: Request, args: dict):
    # params
    note_id = typing.cast(str, args["note_id"])
    share_to_id = typing.cast(str, args["user_id"])
    allow_edit = typing.cast(bool, args.get("allow_edit", False))

    # subject note
    try:
        note = Note.objects.get(
            Note.activeNoteQ() & models.Q(author=request.user, id=note_id)
        )
    except Note.DoesNotExist:
        raise Note.DoesNotExist(
            "Cant find note this note in your library. might be deleted or trashed", 404
        )

    # user we're sharing to
    try:
        share_to = User.objects.get(models.Q(id=share_to_id, is_active=True))
    except User.DoesNotExist:
        raise User.DoesNotExist("User not found", 404)

    # create note
    try:
        shared_note = SharedNote.objects.create(
            note=note, shared_to=share_to, allow_edit=allow_edit
        )
    except IntegrityError as e:
        raise Exception("Already shared to this user", 400)

    role = getUserRole(request.user)
    sr = ExposedModel.getExposedModel(SharedNote).getSerializerClass(role)

    return sr(shared_note).data

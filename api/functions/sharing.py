import typing
from uql.utils import dto

from api.utils import helpers
from api.constants import getUserRole
from api.models.users import User
from api.models.notes import Note
from api.models.sharing import SharedNote
from uql.functions import ApiFunction
from uql.models import ExposedModel

from django.db import models

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
    note = Note.objects.get(
        Note.activeNoteQ() & models.Q(author=request.user, id=note_id)
    )

    # user we're sharing to
    share_to = User.objects.get(models.Q(id=share_to_id, is_active=True))

    # create note
    shared_note = SharedNote.objects.create(
        note=note, shared_to=share_to, allow_edit=allow_edit
    )

    role = getUserRole(request.user)
    sr = ExposedModel.getExposedModel(SharedNote).getSerializerClass(role)

    return sr(shared_note).data

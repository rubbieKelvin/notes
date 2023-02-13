import typing
from uql.utils import dto

from api.utils import helpers
from api.models.upload import Upload
from api.models.notes import Note
from uql.functions import ApiFunction

from django.db import models
from django.utils.datastructures import MultiValueDict
from django.core.files.uploadedfile import UploadedFile

from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request

FILE_SIZE_LIMIT = 5_000_000


@ApiFunction.decorator(
    rule=dto.Dictionary(
        {"note": dto.String(allow_whitespace=False, validators=[helpers.is_valid_uuid])}
    ),
    permission_classes=[IsAuthenticated],
)
def uploadImage(request: Request, args: dict):
    note_id = typing.cast(str, args["note"])
    author = request.user
    file = typing.cast(MultiValueDict[str, UploadedFile], request.FILES).get("image")

    if not file:
        raise FileNotFoundError("No file found in upload request", 400)

    if file.size > FILE_SIZE_LIMIT:
        raise Exception(f"File size {file.size} is greater than {FILE_SIZE_LIMIT}", 400)

    try:
        note = Note.objects.get(
            models.Q(id=note_id, author=author) & Note.activeNoteQ()
        )
    except Note.DoesNotExist:
        raise Exception(f"Note({note_id}), not found", 404)

    upload = Upload.objects.create(file=file, author=author, note=note)

    return {"url": upload.file.url}

from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from libs.spaghetti import types
from libs.spaghetti.check import expects
from libs.spaghetti.templates import errorTemplate
from libs.spaghetti.constants import ERRORS

from apps.notes.models.note import Note
from apps.notes.sr.notes import NoteSr

from django.db import models
from django.db.utils import IntegrityError
from core import validations


@api_view(['patch'])
@permission_classes([IsAuthenticated])
@expects(types.object_(dict(
    name=types.string(validations=[lambda x:(
        2 < len(x or '') < 60)], optional=True),
    private=types.boolean(optional=True),
    archived=types.boolean(optional=True),
    slug=types.string(validations=[validations.slug], optional=True),
    body=types.object_(dict(
        type=types.string(validations=[lambda x:x == 'doc']),
        content=types.array(types.type_())
    ), optional=True)
)))
def view(request: Request, id: str) -> Response:
    name = request.data.get('name')
    private = request.data.get('private')
    archived = request.data.get('archived')
    body = request.data.get('body')
    slug = request.data.get('slug')

    note: Note = Note.find(models.Q(author=request.user, id=id)).first()

    if not note:
        return Response(
            errorTemplate('could not find note'),
            status=status.HTTP_404_NOT_FOUND)

    try:
        note.update(
            name=name,
            private=private,
            body=body,
            slug=slug,
            archived=archived)
        return Response(NoteSr(note).data)
    except IntegrityError:
        return Response(
            errorTemplate('cannot update note', code=ERRORS.INTEGRITY_ERROR),
            status=status.HTTP_400_BAD_REQUEST)

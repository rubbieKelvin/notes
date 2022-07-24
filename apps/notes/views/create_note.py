from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from libs.spaghetti.check import expects
from libs.spaghetti import types
from libs.spaghetti.templates import errorTemplate

from apps.notes.models.note import Note
from apps.notes.sr.notes import NoteSr

@permission_classes([IsAuthenticated])
@api_view(['post'])
@expects(types.object_(dict(
    name=types.string(validations=[lambda x:(2<len(x or '')<60)]),
    private=types.boolean(optional=True),
)))
def view(request:Request) -> Response:
    name = request.data.get('name')
    private = request.data.get('private', True)
    user = request.user

    try:
        note = Note.create(name, private, user)
        return Response(NoteSr(note).data)
    except:
        return Response(errorTemplate("There was an error creating note"), status=status.HTTP_400_BAD_REQUEST)


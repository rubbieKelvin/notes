from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from libs.decorators.expects import expects
from libs.decorators.expects import types

from apps.notes.models.note import Note
from apps.notes.sr.notes import NoteSr

@permission_classes([IsAuthenticated])
@api_view(['post'])
@expects(types.object_(dict(
    name=types.string(validations=[lambda x:(2<len(x or '')<60)]),
    private=types.boolean(optional=True),
)), autoreject=True)
def view(request:Request, e) -> Response:
    name = request.data.get('name')
    private = request.data.get('private', True)
    user = request.user

    try:
        note = Note.create(name, private, user)
        return Response(NoteSr(note).data)
    except:
        return Response({'error': "There was an error creating note"}, status=status.HTTP_400_BAD_REQUEST)

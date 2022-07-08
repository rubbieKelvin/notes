from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from apps.notes.models.note import Note
from apps.notes.sr.notes import NoteSr

from django.db import models

@api_view(['post'])
@permission_classes([IsAuthenticated])
def view(request:Request, id: str) -> Response:
    note: Note = Note.find(
        models.Q(id=id) &
        (models.Q(author=request.user) |
        models.Q(private=False, archived=False))).first()

    if not note:
        return Response({'error': 'couldnt find note'}, status=status.HTTP_404_NOT_FOUND)

    new_note: Note = Note.create(
        name=f"{note.name}-Copy",
        private=True,
        author=request.user,
        body=note.body)
    return Response(NoteSr(new_note).data)

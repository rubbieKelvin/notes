from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from apps.notes.models.note import Note
from django.db import models

@api_view(['delete'])
@permission_classes([IsAuthenticated])
def view(request:Request, id: str) -> Response:
    note: Note = Note.find(models.Q(author=request.user, id=id)).first()

    if not note:
        return Response({'error': 'couldnt find note'}, status=status.HTTP_404_NOT_FOUND)

    note.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)



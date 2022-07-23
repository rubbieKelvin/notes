from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from apps.notes.models.note import Note
from apps.notes.sr.notes import NoteSr

from libs.spaghetti.query import requestMapQuery
from libs.spaghetti.picker import KeyPickPageNumberPagination

from django.db import models


class BodylessNoteSr(NoteSr):
    class Meta(NoteSr.Meta):
        exclude = ['body']
        fields = None


@api_view()
@permission_classes([IsAuthenticated])
def get_note(request: Request, id: str) -> Response:
    note: Note = Note.find(
        models.Q(id=id) &
        (models.Q(author=request.user) |
         models.Q(private=False, archived=False))
    ).first()
    if not note:
        return Response({'error': 'note not found'}, status=status.HTTP_404_NOT_FOUND)
    return Response(NoteSr(note).data)


@api_view()
@permission_classes([IsAuthenticated])
def raw_note_query(request: Request) -> Response:
    paginator = KeyPickPageNumberPagination()
    query = requestMapQuery(request, exclude={'body': True})
    notes: models.QuerySet[Note] = Note.find(query)

    data = paginator.paginate_queryset(notes, request)
    return paginator.get_paginated_response(BodylessNoteSr(data, many=True).data)

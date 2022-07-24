from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from apps.notes.models.note import Note
from apps.notes.sr.notes import NoteSr

from libs.spaghetti.templates import errorTemplate
from libs.spaghetti.query import requestMapQuery
from libs.spaghetti.picker import KeyPickPageNumberPagination

from django.db import models


@api_view()
@permission_classes([IsAuthenticated])
def get_note(request: Request, id: str) -> Response:
    note: Note = Note.find(
        models.Q(id=id) &
        (models.Q(author=request.user) |
         models.Q(private=False, archived=False))
    ).first()

    if not note:
        return Response(
            errorTemplate('note not found'),
            status=status.HTTP_404_NOT_FOUND)
    return Response(NoteSr(note).data)


@api_view()
@permission_classes([IsAuthenticated])
def raw_note_query(request: Request) -> Response:
    order_by = request.query_params.get('order_by')
    paginator = KeyPickPageNumberPagination()
    query = requestMapQuery(request, exclude={'body': True})
    notes: models.QuerySet[Note] = Note.find(query & (
        models.Q(author=request.user) |
        models.Q(private=False, archived=False)))
    if order_by:
        notes = notes.order_by(order_by)

    data = paginator.paginate_queryset(notes, request)
    return paginator.get_paginated_response(NoteSr(data, many=True).data)

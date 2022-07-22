from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from rest_framework.pagination import PageNumberPagination

from apps.notes.models.note import Note
from apps.notes.sr.notes import NoteSr

from libs.query import get_query, StructSelectPagination

from django.db import models
from typing import Callable


class BodylessNoteSr(NoteSr):
    class Meta(NoteSr.Meta):
        exclude = ['body']
        fields = None


def _get_notes(basequery: models.Q | None = None) -> Callable[[Request], Response]:
    def inner(request: Request) -> Response:
        search = request.query_params.get('search', '').strip()
        size = request.query_params.get('size', '')

        if size and size.isdigit:
            size = max(int(size), 1)
        else:
            size = 30

        paginator = PageNumberPagination()
        paginator.page_size = size
        notes: models.QuerySet[Note] = Note.find(
            basequery or models.Q(author=request.user))
        if search and len(search) >= 3:
            notes = notes.filter(
                models.Q(name__icontains=search)
            )
        pg_res = paginator.paginate_queryset(notes, request)
        sr = BodylessNoteSr(pg_res, many=True)
        return paginator.get_paginated_response(sr.data)
    return inner


get_my_notes = api_view()(
    permission_classes([IsAuthenticated])(
        _get_notes()
    )
)

get_public_notes = api_view()(
    _get_notes(models.Q(private=False, archived=False))
)


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
    size = request.query_params.get('size', '')
    size = max(int(size), 1) if size and size.isdigit() else 30

    paginator = StructSelectPagination()
    paginator.page_size = size

    query = get_query(request)

    notes: models.QuerySet[Note] = Note.find(query)

    pg_res = paginator.paginate_queryset(notes, request)
    sr = BodylessNoteSr(pg_res, many=True)
    return paginator.get_paginated_response(sr.data)

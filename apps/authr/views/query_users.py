from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import permission_classes, api_view

from apps.authr.sr.user import UserSr
from apps.authr.models.user import User

from libs.spaghetti.query import requestMapQuery
from libs.spaghetti.picker import KeyPickPageNumberPagination


@api_view()
@permission_classes([IsAuthenticated])
def view(request: Request) -> Response:
    pagination = KeyPickPageNumberPagination()

    query = requestMapQuery(request, exclude=dict())
    users = User.find(query)
    
    paginated_query_set = pagination.paginate_queryset(users, request)
    result = UserSr(paginated_query_set, many=True)
    return pagination.get_paginated_response(result.data)

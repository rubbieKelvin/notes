from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

from apps.authr.sr.user import UserSr

@api_view()
@permission_classes([IsAuthenticated])
def view(request: Request) -> Response:
    return Response(UserSr(request.user).data)
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.authtoken.models import Token
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from apps.authr.models.user import User


@api_view(['post'])
@permission_classes([IsAuthenticated])
def view(request: Request) -> Response:
    user: User = request.user
    token: Token = Token.objects.filter(user=user).first()
    if token: token.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)
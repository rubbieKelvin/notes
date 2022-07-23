from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.decorators import api_view
from rest_framework.authtoken.models import Token
from rest_framework import status

from libs.spaghetti.check import expects
from libs.spaghetti import types

from core import validations
from apps.authr.models.user import User
from apps.authr.sr.user import UserSr
from django.db.models import Q


@api_view(['post'])
@expects(types.object_(dict(
    email=types.string(validations=[validations.email]),
    password=types.string(validations=[validations.password])
)))
def view(request: Request) -> Response:
    # get body
    email = request.data.get('email')
    password = request.data.get('password')

    # check user
    user: User = User.find(Q(email=email)).first()

    if not user:
        return Response(
            dict(error="user not found"),
            status=status.HTTP_404_NOT_FOUND)

    if not user.check_password(password):
        return Response(
            dict(error="incorrect password"),
            status=status.HTTP_400_BAD_REQUEST)

    # create token
    token: Token = Token.objects.filter(user=user).first()
    if token:
        token.delete()

    # prep and return data
    token = Token.objects.create(user=user).key
    return Response({
        "user": UserSr(user).data,
        "token": token})

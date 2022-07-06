from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.decorators import api_view
from rest_framework.authtoken.models import Token
from rest_framework import status

from libs.decorators.expects import expects
from libs.decorators.expects import types

from core import validations
from apps.authr.models.user import User
from apps.authr.sr.user import UserSr
from django.db.models import Q

@api_view(['post'])
@expects(types.object_(dict(
    email=types.string(validations=[validations.email]),
    password=types.string(validations=[validations.password])
)), autoreject=True)
def view(request: Request, e) -> Response:
    email = request.data.get('email')
    password = request.data.get('password')

    user: User = User.find(Q(email=email)).first()
    
    if not user:
        return Response(dict(error="user not found"), status=status.HTTP_404_NOT_FOUND)

    if not user.check_password(password):
        return Response(dict(error="incorrect password"), status=status.HTTP_400_BAD_REQUEST)
        
    token: Token = Token.objects.filter(user=user).first()
    if token:
        token.delete()

    token = Token.objects.create(user=user).key
    return Response(dict(user=UserSr(user).data, token=token))

from rest_framework.decorators import api_view
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from rest_framework import status

from apps.authr.models import User
from apps.authr.sr.user import UserSr

from libs.decorators.expects import expects
from libs.decorators.expects import types

from core import validations
from django.db.utils import IntegrityError

@api_view(['post'])
@expects(types.object_(dict(
    email=types.string(validations=[validations.email]),
    password=types.string(validations=[validations.password])
)), autoreject=True)
def view(request: Request, expectation: types.Session) -> Response:
    """ creates a user.
    """
    email = request.data.get('email')
    password = request.data.get('password')

    try:
        user = User.create(email, password)
        token = Token.objects.create(user=user).key
        return Response(dict(user=UserSr(user).data, token=token))
    except IntegrityError:
        return Response(dict(error="user already exists"), status=status.HTTP_400_BAD_REQUEST)

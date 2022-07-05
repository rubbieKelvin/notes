from rest_framework.decorators import api_view
from rest_framework.request import Request
from rest_framework.response import Response

from apps.authr.models import User
from libs.decorators.expects import expects
from libs.decorators.expects import types

@api_view(['post'])
@expects(types.object_(dict(
    email=types.string(),
    password=types.string()
)), autoreject=True)
def view(request: Request, expectation: types.Session) -> Response:
    """ creates a user.
    """
    return Response(dict(hello="hey"))

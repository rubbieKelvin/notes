import re
import typing

from api.models.users import User
from api.utils.userroles import resolveUserRole

from uql import getUserRole
from uql.functions import ApiFunction
from uql.models import ExposedModel
from uql.utils import dto
from uql.models.serializers import createSerializerClass

from rest_framework.request import Request
from rest_framework.authtoken.models import Token
from rest_framework.permissions import IsAuthenticated
from django.db.utils import IntegrityError


@ApiFunction.decorator(
    rule=dto.Dictionary(
        {
            "username": dto.String(
                min_length=4,
                allow_whitespace=False,
                validators=[
                    lambda username: bool(
                        re.match(r"^[A-Za-z0-9]+(_[A-Za-z0-9]+)?$", username)
                    )
                ],
            ),
            "password": dto.String(min_length=6),
        }
    )
)
def signup(request: Request, args: dict):
    username = typing.cast(str, args["username"]).strip()
    password: str = args["password"]

    if len(username) < 3:
        raise ValueError("usernname characters should be >= 3")
    if len(password) < 5:
        raise ValueError("password lenght should be >= 5")

    # user
    try:
        user = User(username=username)
        user.set_password(password)
        user.save()
    except IntegrityError as e:
        e.args = (*e.args, 400)
        raise e

    # token
    token: Token = Token.objects.create(user=user)

    sr = createSerializerClass(getUserRole(user), ExposedModel.getExposedModel(User))
    return {"user": sr(user).data, "token": token.key}


@ApiFunction.decorator(
    rule=dto.Dictionary({"username": dto.String(), "password": dto.String()})
)
def login(request: Request, args: dict):
    username = args["username"]
    password = args["password"]

    try:
        user: User = User.objects.get(username=username, is_active=True)
    except User.DoesNotExist as e:
        raise User.DoesNotExist(f'User with usernmame="{username}" does not exist', 404)

    if not user.check_password(password):
        raise PermissionError("Invalid password", 400)

    sr = createSerializerClass(getUserRole(user), ExposedModel.getExposedModel(User))

    token, _ = Token.objects.get_or_create(user=user)

    return {"user": sr(user).data, "token": token.key}


@ApiFunction.decorator(permission_classes=[IsAuthenticated])
def logout(request: Request, args: dict):
    user: User = request.user
    token = Token.objects.filter(user=user).first()

    if token:
        token.delete()

    return


@ApiFunction.decorator(permission_classes=[IsAuthenticated])
def me(request: Request, args: dict):
    user: User = request.user
    # mconf = typing.cast(ModelConfig, ModelConfig.getConfig(User))
    # sr = mconf.createSerializerClass(resolveUserRole(user))
    sr = createSerializerClass(getUserRole(user), ExposedModel.getExposedModel(User))
    return sr(user).data

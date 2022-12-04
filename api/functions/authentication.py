import typing

from api.models.users import User
from api.utils.userroles import resolveUserRole

from uql.model import ModelConfig
from uql.decorators.intent import intent

from rest_framework.request import Request
from rest_framework.authtoken.models import Token
from rest_framework.decorators import permission_classes
from rest_framework.permissions import IsAuthenticated


@intent(requiredArgs=("username", "password"))
def signup(request: Request, args: dict):
    username = typing.cast(str, args["username"]).strip()
    password: str = args["password"]

    if len(username) < 3:
        raise ValueError("usernname characters should be >= 3")
    if len(password) < 5:
        raise ValueError("password lenght should be >= 5")

    # user
    user = User(username=username)
    user.set_password(password)
    user.save()

    # token
    token: Token = Token.objects.create(user=user)

    mconf = typing.cast(ModelConfig, ModelConfig.getConfig(User))

    sr = mconf.createSerializerClass(resolveUserRole(user))
    return {"user": sr(user).data, "token": token.key}


@intent(requiredArgs=("username", "password"))
def login(request: Request, args: dict):
    username = args["username"]
    password = args["password"]

    user: User = User.objects.get(username=username, is_active=True)

    if not user.check_password(password):
        raise PermissionError("Invalid password", 400)

    mconf = typing.cast(ModelConfig, ModelConfig.getConfig(User))

    sr = mconf.createSerializerClass(resolveUserRole(user))

    token, _ = Token.objects.get_or_create(user=user)

    return {"user": sr(user).data, "token": token.key}


@permission_classes([IsAuthenticated])
@intent()
def logout(request: Request, args: dict):
    user: User = request.user
    token = Token.objects.filter(user=user).first()

    if token:
        token.delete()

    return


@permission_classes([IsAuthenticated])
@intent()
def me(request: Request, args: dict):
    user: User = request.user
    mconf = typing.cast(ModelConfig, ModelConfig.getConfig(User))
    sr = mconf.createSerializerClass(resolveUserRole(user))
    return sr(user).data

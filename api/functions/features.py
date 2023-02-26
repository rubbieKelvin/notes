from api.models.users import User
from api.models.features import Feature

from uql.utils import dto
from uql.functions import ApiFunction

from django.db import models
from rest_framework.request import Request


@ApiFunction.decorator(
    rule=dto.Dictionary(
        {
            "key": dto.String(),
        }
    ),
)
def hasFeature(request: Request, args: dict):
    key: str = args["key"]
    user: User = request.user

    basecheck = models.Q(key=key)
    anoncheck = basecheck & models.Q(is_active=True, allow_anon=True)
    usercheck = (
        basecheck
        & (models.Q(is_active=True) | models.Q(is_active_for__contains=user.id))
        & ~models.Q(is_inactive_for__contains=user.id)
    )

    feature = Feature.objects.filter(
        anoncheck if user.is_anonymous else usercheck
    ).first()

    return {"is_active": bool(feature)}

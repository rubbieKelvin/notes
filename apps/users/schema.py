import graphene
import graphql_jwt
from graphql_jwt.decorators import login_required
from apps.users.models import User
from graphql.execution.base import ResolveInfo
from . import types
from . import models

class Query(graphene.ObjectType):
    users = graphene.List(types.UserType)

    @login_required
    def resolve_users(self, info:ResolveInfo):
        user:models.User = info.context.user
        print(user)
        return User.objects.all()

class Mutation(graphene.ObjectType):
    token_auth = graphql_jwt.ObtainJSONWebToken.Field()
    verify_token = graphql_jwt.Verify.Field()
    refresh_token = graphql_jwt.Refresh.Field()

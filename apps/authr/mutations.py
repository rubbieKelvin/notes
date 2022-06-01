import graphene
from . import types
from . import models
from graphql_jwt import shortcuts


class CreateUser(graphene.Mutation):
    user = graphene.Field(types.UserType)
    token = graphene.String()
    refreshToken = graphene.String()

    class Arguments:
        email = graphene.String(required=True)
        password = graphene.String(required=True)

    def mutate(self, info, email=None, password=None):
        user = models.User.create(email, password)
        token = shortcuts.get_token(user)
        refreshToken = shortcuts.create_refresh_token(user)
        return CreateUser(user=user, token=token, refreshToken=refreshToken)

import graphene
from . import mutations
from . import types
from . import models

class Query(graphene.ObjectType):
    whoami = graphene.Field(types.UserType)

    def resolve_whoami(self, info:graphene.ResolveInfo):
        user:models.User = info.context.user
        if user.is_authenticated:
            return user
        else:
            return None


class Mutation(graphene.ObjectType):
    create_user = mutations.CreateUser.Field()

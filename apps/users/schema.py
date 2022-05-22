import graphene
from apps.users.models import User
from graphql.execution.base import ResolveInfo
from graphene_django import DjangoObjectType


class UserType(DjangoObjectType):
    class Meta:
        model = User

class Query(graphene.ObjectType):
    users = graphene.List(UserType)

    def resolve_users(self, info:ResolveInfo):
        return User.objects.all()

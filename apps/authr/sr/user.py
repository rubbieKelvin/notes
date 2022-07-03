from rest_framework.serializers import ModelSerializer
from apps.authr.models.user import User


class UserSr(ModelSerializer):
    class Meta:
        model = User
        fields = '__all__'

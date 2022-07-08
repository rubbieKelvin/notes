from apps.notes.models.note import Note
from apps.authr.sr.user import UserSr
from rest_framework.serializers import ModelSerializer

class NoteSr(ModelSerializer):
    author = UserSr()
    class Meta:
        model = Note
        fields = '__all__'
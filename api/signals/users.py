import typing
from django.db.models.signals import post_save
from django.dispatch import receiver
from api.models.users import User
from api.models.notes import Note
from api.constants.notes import FIRST_USER_NOTE


@receiver(post_save, sender=User)
def create_user_first_note(sender: type[User], **kwargs):
    instance = typing.cast(User, kwargs.get("instance"))
    created = typing.cast(bool, kwargs.get("created", False))

    if created:
        Note.objects.create(
            title="Welcome to opennotes",
            content=FIRST_USER_NOTE,
            author=instance,
            is_starred=True,
        )

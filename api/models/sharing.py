from uuid import uuid4
from django.db import models


class SharedNote(models.Model):
    id = models.UUIDField(default=uuid4, editable=False, primary_key=True)
    note = models.ForeignKey(
        "api.Note", on_delete=models.CASCADE, related_name="shares"
    )
    shared_to = models.ForeignKey(
        "api.User", on_delete=models.CASCADE, related_name="shared_accesses"
    )
    is_active = models.BooleanField(default=True)
    allow_edit = models.BooleanField(default=False)
    shared_on = models.DateTimeField(auto_now_add=True, editable=False)
    content = models.JSONField(
        default=None,
        null=True,
        blank=True,
        help_text="Users can edit shared notes, but note directly on the main notes app",
    )

    def __str__(self) -> str:
        return f"{self.shared_to.username}/{self.note.author.username}/NOTE-{self.note.readable_id}"

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["shared_to", "note"],
                condition=models.Q(is_active=True),
                name="share_note_to_user_once",
            )
        ]

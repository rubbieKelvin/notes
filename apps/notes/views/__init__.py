from rest_framework.request import Request
from apps.notes.models import Note

def is_my_note(request: Request, note: Note) -> bool:
    return note.author == request.user

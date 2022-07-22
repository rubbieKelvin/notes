from django.urls import path
from .views import create_note
from .views import update_note
from .views import delete_note
from .views import get_note
from .views import duplicate_note

urlpatterns = [
    path('create/', create_note.view),
    path('update/<str:id>/', update_note.view),
    path('delete/<str:id>/', delete_note.view),
    path('', get_note.get_my_notes),
    path('public/', get_note.get_public_notes),
    path('q/', get_note.raw_note_query),
    path('<str:id>/', get_note.get_note),
    path('copy/<str:id>/', duplicate_note.view),
]
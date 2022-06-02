from django.contrib import admin
from . import models

admin.site.register(models.Note)
admin.site.register(models.File)
admin.site.register(models.NoteShare)

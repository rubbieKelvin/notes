from django.contrib import admin

# Register your models here.
from .models import Note, User, Upload, SharedNote

# admin.site.register([Note, User, Upload, SharedNote])
@admin.register(Note)
class NoteAdmin(admin.ModelAdmin):
    pass

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    pass

@admin.register(Upload)
class UploadAdmin(admin.ModelAdmin):
    pass

@admin.register(SharedNote)
class SharedNoteAdmin(admin.ModelAdmin):
    pass
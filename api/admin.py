from django.contrib import admin

# Register your models here.
from .models import *

# admin.site.register([Note, User, Upload, SharedNote])
@admin.register(Note)
class NoteAdmin(admin.ModelAdmin):
    ordering = ["title", "readable_id"]

    search_fields = [
        "title__icontains",
        "author__username__icontains",
    ]

    list_display = [
        "title",
        "readable_id",
        "author",
        "date_created",
        "last_updated",
        "is_starred",
        "is_deleted",
        "is_trashed",
        "is_archived",
        "is_public",
    ]

    list_filter = [
        "date_created",
        "last_updated",
        "is_starred",
        "is_deleted",
        "is_trashed",
        "is_archived",
        "is_public",
        "author",
    ]


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    ordering = ["username"]

    search_fields = ["username__icontains"]

    list_display = [
        "username",
        "is_active",
        "date_created",
    ]

    list_filter = [*list_display]


@admin.register(Upload)
class UploadAdmin(admin.ModelAdmin):
    search_fields = ["note__title__icontains", "author__username__icontains"]
    list_display = ["id", "note", "author", "date_uploaded"]

    list_filter = ["author", "date_uploaded"]


@admin.register(SharedNote)
class SharedNoteAdmin(admin.ModelAdmin):
    ordering = ["shared_to__username"]

    search_fields = [
        "shared_to__username__icontains",
        "note__title__icontains",
        "note__author__username__icontains",
    ]

    list_display = [
        "note",
        "shared_to",
        "is_active",
        "allow_edit",
        "shared_on",
    ]

    list_filter = [*list_display]


@admin.register(Feature)
class FeatureAdmin(admin.ModelAdmin):
    ordering = ["key"]

    search_fields = ["key"]

    list_display = [
        "key",
        "allow_anon",
        "is_active",
        "date_created",
        "date_updated",
    ]

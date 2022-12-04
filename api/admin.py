from django.contrib import admin

# Register your models here.
from .models import Note, User

admin.site.register([Note, User])

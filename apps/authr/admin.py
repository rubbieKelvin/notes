from django.contrib import admin
from .models import user

admin.site.register(user.User)

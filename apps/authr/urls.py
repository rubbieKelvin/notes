from django.urls import path
from .views import accounts_user_signup

urlpatterns = [
    path('signup/', accounts_user_signup.view),
]
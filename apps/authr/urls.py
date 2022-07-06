from django.urls import path
from .views import accounts_signup
from .views import accounts_login
from .views import accounts_profile

urlpatterns = [
    path('signup/', accounts_signup.view),
    path('login/', accounts_login.view),
    path('me/', accounts_profile.view),
]
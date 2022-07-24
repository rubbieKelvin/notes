from django.urls import path
from .views import accounts_signup
from .views import accounts_login
from .views import accounts_profile
from .views import accounts_logout
from .views import query_users

urlpatterns = [
    path('signup/', accounts_signup.view),
    path('login/', accounts_login.view),
    path('me/', accounts_profile.view),
    path('logout/', accounts_logout.view),
    path('query/', query_users.view)
]
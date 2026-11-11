from django.urls import path
from apps.profiles.views import ProfileDetailView

urlpatterns = [
    path('', ProfileDetailView.as_view(), name='profile-detail'),
]

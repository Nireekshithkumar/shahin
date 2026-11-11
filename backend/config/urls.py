from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # ScholarSetu AI Core REST APIs
    path('api/auth/', include('apps.accounts.urls')),
    path('api/profile/', include('apps.profiles.urls')),
    path('api/opportunities/', include('apps.opportunities.urls')),
    path('api/eligibility/', include('apps.eligibility.urls')),
    path('api/recommendations/', include('apps.recommendations.urls')),
    path('api/applications/', include('apps.applications.urls')),
    path('api/ai/', include('apps.ai_assistant.urls')),
    path('api/workflows/', include('apps.workflows.urls')),
    path('api/notifications/', include('apps.notifications.urls')),
    path('api/admin-hub/', include('apps.data_import.urls')),

    # OpenAPI Schema & Interactive Swagger Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
]

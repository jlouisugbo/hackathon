from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import TemplateView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', TemplateView.as_view(template_name='landing.html'), name='landing'),  # NEW
    path('dashboard/', include('dashboard.urls')),
    path('meetings/', include('meetings.urls')),
    path('analytics/', include('analytics.urls')),
    path('login/', TemplateView.as_view(template_name='auth/login.html'), name='login'),  # Placeholder
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
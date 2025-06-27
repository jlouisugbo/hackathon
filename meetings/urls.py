from django.urls import path
from . import views

app_name = 'meetings'

urlpatterns = [
    path('upload/', views.meeting_upload, name='upload'),
    
    path('<int:meeting_id>/', views.meeting_detail, name='detail'),
    path('', views.meeting_list, name='list'),
    
    path('<int:meeting_id>/refresh/', views.refresh_transcription, name='refresh'),
    
    path('api/transcription/', views.transcription_api, name='transcription_api'),
]
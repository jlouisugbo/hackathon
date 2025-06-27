from django.urls import path
from . import views

app_name = 'meetings'

urlpatterns = [
    path('', views.meeting_list, name='list'),
    path('meeting-demo/', views.meeting_demo, name='meeting-demo'),
    path('upload/', views.meeting_upload, name='upload'),
    path('upload/json/', views.json_upload_page, name='json_upload'),  # New JSON upload page
    path('<int:meeting_id>/', views.meeting_detail, name='detail'),
    path('<int:meeting_id>/refresh/', views.refresh_transcription, name='refresh'),
    path('<int:meeting_id>/analyze/', views.analyze_meeting, name='analyze'),  # Manual analysis trigger
    
    # API endpoints
    path('api/transcription/', views.transcription_api, name='api_transcription'),
]
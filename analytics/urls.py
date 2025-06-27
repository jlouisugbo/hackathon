from django.urls import path
from . import views

app_name = 'analytics'

urlpatterns = [
    path('', views.analytics_dashboard, name='dashboard'),
    path('team/<int:team_id>/', views.team_analytics, name='team_detail'),
    path('blockers/', views.blockers_list, name='blockers_list'),
    path('blocker/<int:blocker_id>/', views.blocker_detail, name='blocker_detail'),
    path('blocker/<int:blocker_id>/update-status/', views.update_blocker_status, name='update_blocker_status'),    
]
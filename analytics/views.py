from django.shortcuts import render, get_object_or_404, redirect
from django.contrib import messages
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.core.paginator import Paginator
from django.db.models import Q, Count, Avg
from django.urls import reverse
from django.utils import timezone
from datetime import date, timedelta
import json
import logging

try:
    from dashboard.models import Team
    from meetings.models import Meeting
except ImportError:
    Team = None
    Meeting = None

from .models import TeamHealthMetrics, Blocker
from .utils import analyze_meeting_and_save_metrics

logger = logging.getLogger(__name__)


def analytics_dashboard(request):
    """
    Analytics dashboard showing overall health trends and insights
    """
    total_metrics = TeamHealthMetrics.objects.count()
    health_distribution = TeamHealthMetrics.objects.values('health_status').annotate(count=Count('id'))
    
    health_stats = {'red': 0, 'yellow': 0, 'green': 0}
    for item in health_distribution:
        health_stats[item['health_status']] = item['count']
    
    recent_metrics = TeamHealthMetrics.objects.select_related('team', 'meeting').order_by('-date')[:10]
    
    active_blockers = Blocker.objects.filter(status='open').select_related('team')
    overdue_blockers = [b for b in active_blockers if b.is_overdue]
    
    team_rankings = []
    if Team:
        for team in Team.objects.all():
            recent_metrics_for_team = TeamHealthMetrics.objects.filter(team=team).order_by('-date')[:5]
            if recent_metrics_for_team:
                avg_score = sum(m.overall_health_score for m in recent_metrics_for_team) / len(recent_metrics_for_team)
                latest_metric = recent_metrics_for_team[0]
                team_rankings.append({
                    'team': team,
                    'avg_score': round(avg_score, 1),
                    'latest_status': latest_metric.health_status,
                    'latest_date': latest_metric.date,
                    'blocker_count': latest_metric.blocker_count,
                    'participation_score': latest_metric.participation_score
                })
    
    team_rankings.sort(key=lambda x: x['avg_score'], reverse=True)
    
    # Trend analysis
    seven_days_ago = date.today() - timedelta(days=7)
    recent_trend_metrics = TeamHealthMetrics.objects.filter(date__gte=seven_days_ago)
    
    context = {
        'total_metrics': total_metrics,
        'health_stats': health_stats,
        'recent_metrics': recent_metrics,
        'active_blockers_count': active_blockers.count(),
        'overdue_blockers_count': len(overdue_blockers),
        'overdue_blockers': overdue_blockers[:5],
        'team_rankings': team_rankings[:10],
        'recent_trend_count': recent_trend_metrics.count(),
    }
    
    return render(request, 'analytics/dashboard.html', context)


def team_analytics(request, team_id):
    """
    Detailed analytics for a specific team
    """
    if not Team:
        messages.error(request, "Team model not available")
        return redirect('analytics:dashboard')
    
    team = get_object_or_404(Team, id=team_id)
    
    # Get metrics history (last 30 days)
    thirty_days_ago = date.today() - timedelta(days=30)
    metrics_history = TeamHealthMetrics.objects.filter(
        team=team, 
        date__gte=thirty_days_ago
    ).order_by('-date')
    
    # Calculate trends
    trends = calculate_team_trends(metrics_history)
    
    # Get active blockers for this team
    active_blockers = Blocker.objects.filter(team=team, status='open').order_by('-last_mentioned_date')
    overdue_blockers = [b for b in active_blockers if b.is_overdue]
    
    # Get recent meetings
    recent_meetings = []
    if Meeting:
        recent_meetings = Meeting.objects.filter(team=team).order_by('-date')[:10]
    
    # Latest metrics
    latest_metric = metrics_history.first() if metrics_history else None
    
    # Calculate averages for display
    if metrics_history:
        avg_health_score = round(sum(m.overall_health_score for m in metrics_history) / len(metrics_history), 1)
        avg_participation = round(sum(m.participation_score for m in metrics_history) / len(metrics_history), 1)
        total_blockers = sum(m.blocker_count for m in metrics_history)
    else:
        avg_health_score = 0
        avg_participation = 0
        total_blockers = 0
    
    context = {
        'team': team,
        'latest_metric': latest_metric,
        'metrics_history': metrics_history,
        'trends': trends,
        'active_blockers': active_blockers,
        'overdue_blockers': overdue_blockers,
        'recent_meetings': recent_meetings,
        'avg_health_score': avg_health_score,
        'avg_participation': avg_participation,
        'total_blockers': total_blockers,
    }
    
    return render(request, 'analytics/team_detail.html', context)


def blockers_list(request):
    """
    List all blockers with filtering and search
    """
    queryset = Blocker.objects.select_related('team').order_by('-last_mentioned_date')
    
    # Filtering
    team_filter = request.GET.get('team')
    status_filter = request.GET.get('status', 'open')  # Default to open blockers
    severity_filter = request.GET.get('severity')
    search_query = request.GET.get('search')
    
    if team_filter:
        queryset = queryset.filter(team_id=team_filter)
    
    if status_filter:
        queryset = queryset.filter(status=status_filter)
    
    if severity_filter:
        queryset = queryset.filter(severity=severity_filter)
    
    if search_query:
        queryset = queryset.filter(
            Q(description__icontains=search_query) |
            Q(blocking_person__icontains=search_query) |
            Q(blocking_dependency__icontains=search_query)
        )
    
    blockers_list = []
    for blocker in queryset:
        blocker.is_overdue_flag = blocker.is_overdue
        blockers_list.append(blocker)
    
    paginator = Paginator(blockers_list, 20)
    page_number = request.GET.get('page')
    blockers = paginator.get_page(page_number)
    
    teams = []
    if Team:
        teams = Team.objects.all()
    
    context = {
        'blockers': blockers,
        'teams': teams,
        'current_filters': {
            'team': team_filter,
            'status': status_filter,
            'severity': severity_filter,
            'search': search_query,
        }
    }
    
    return render(request, 'analytics/blockers_list.html', context)


def blocker_detail(request, blocker_id):
    """
    Detailed view of a specific blocker
    """
    blocker = get_object_or_404(Blocker, id=blocker_id)
    
    meetings = blocker.meetings.all().order_by('-date')
    
    context = {
        'blocker': blocker,
        'meetings': meetings,
    }
    
    return render(request, 'analytics/blocker_detail.html', context)


@require_http_methods(["POST"])
def update_blocker_status(request, blocker_id):
    """
    Update blocker status (resolve/reopen)
    """
    blocker = get_object_or_404(Blocker, id=blocker_id)
    
    new_status = request.POST.get('status')
    if new_status in ['open', 'resolved']:
        blocker.status = new_status
        blocker.save()
        
        status_msg = "resolved" if new_status == 'resolved' else "reopened"
        messages.success(request, f"Blocker has been {status_msg}")
    else:
        messages.error(request, "Invalid status")
    
    return redirect('analytics:blocker_detail', blocker_id=blocker_id)


@csrf_exempt
@require_http_methods(["POST"])
def analyze_meeting_api(request, meeting_id):
    """
    API endpoint to trigger meeting analysis
    """
    if not Meeting:
        return JsonResponse({'error': 'Meeting model not available'}, status=400)
    
    try:
        meeting = Meeting.objects.get(id=meeting_id)
        
        if not meeting.transcription_processed:
            return JsonResponse({'error': 'Meeting has no processed transcription'}, status=400)
        
        metrics = analyze_meeting_and_save_metrics(meeting)
        
        if metrics:
            return JsonResponse({
                'success': True,
                'health_score': metrics.overall_health_score,
                'health_status': metrics.health_status,
                'blocker_count': metrics.blocker_count,
                'participation_score': metrics.participation_score,
                'alerts': metrics.scrum_master_alerts
            })
        else:
            return JsonResponse({'error': 'Analysis failed'}, status=500)
            
    except Meeting.DoesNotExist:
        return JsonResponse({'error': 'Meeting not found'}, status=404)
    except Exception as e:
        logger.error(f"API analysis failed for meeting {meeting_id}: {e}")
        return JsonResponse({'error': 'Internal server error'}, status=500)


def calculate_team_trends(metrics_history):
    """
    Calculate trends for team metrics
    """
    if len(metrics_history) < 2:
        return {
            'health_trend': 'stable',
            'participation_trend': 'stable',
            'blocker_trend': 'stable'
        }
    
    recent = list(metrics_history[:5])
    older = list(metrics_history[5:10]) if len(metrics_history) > 5 else list(metrics_history)
    
    if not older:
        return {
            'health_trend': 'stable',
            'participation_trend': 'stable',
            'blocker_trend': 'stable'
        }
    
    recent_health = sum(m.overall_health_score for m in recent) / len(recent)
    recent_participation = sum(m.participation_score for m in recent) / len(recent)
    recent_blockers = sum(m.blocker_count for m in recent) / len(recent)
    
    older_health = sum(m.overall_health_score for m in older) / len(older)
    older_participation = sum(m.participation_score for m in older) / len(older)
    older_blockers = sum(m.blocker_count for m in older) / len(older)
    
    # Determine trends
    def get_trend(recent_val, older_val, threshold=5):
        diff = recent_val - older_val
        if diff > threshold:
            return 'improving'
        elif diff < -threshold:
            return 'declining'
        else:
            return 'stable'
    
    return {
        'health_trend': get_trend(recent_health, older_health),
        'participation_trend': get_trend(recent_participation, older_participation),
        'blocker_trend': get_trend(older_blockers, recent_blockers)  # Reversed for blockers (fewer is better)
    }

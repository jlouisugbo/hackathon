from django.shortcuts import render, get_object_or_404, redirect
from django.utils import timezone
from django.contrib import messages
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_protect
from datetime import timedelta
from .models import Team


def home(request):
    """Dashboard home view showing all teams and summary statistics"""
    teams = Team.objects.all()
    
    # Calculate summary stats efficiently
    health_scores = []
    health_statuses = []
    active_teams_count = 0
    total_blockers = 0
    
    for team in teams:
        health_score = team.get_health_score()
        health_status = team.get_health_status()
        recent_meetings = team.get_recent_meetings_count()
        active_blockers = team.get_active_blockers_count()
        
        if health_score:
            health_scores.append(health_score)
        health_statuses.append(health_status)
        
        if recent_meetings > 0:
            active_teams_count += 1
            
        total_blockers += active_blockers
    
    # Calculate average health score
    avg_health_score = (
        round(sum(health_scores) / len(health_scores), 1) 
        if health_scores else 0
    )
    
    summary_stats = {
        'total_teams': len(teams),
        'healthy_teams': health_statuses.count('green'),
        'warning_teams': health_statuses.count('yellow'), 
        'critical_teams': health_statuses.count('red'),
        'avg_health_score': avg_health_score,
        'active_teams': active_teams_count,
        'total_active_blockers': total_blockers,
    }
    
    return render(request, 'dashboard/home.html', {
        'teams': teams,
        'summary_stats': summary_stats
    })


def team_detail(request, team_id):
    """Detailed view for a specific team showing comprehensive health metrics"""
    team = get_object_or_404(Team, id=team_id)
    
    # Initialize default values
    recent_metrics = []
    blockers_with_days = []
    recent_meetings = []
    health_trend = 0
    
    # Try to get analytics data
    try:
        from analytics.models import TeamHealthMetrics, Blocker
        from meetings.models import Meeting
        
        # Get recent health metrics
        days_ago_30 = timezone.now() - timedelta(days=30)
        recent_metrics = TeamHealthMetrics.objects.filter(
            team=team, 
            date__gte=days_ago_30.date()
        ).order_by('-date')[:10]
        
        # Get active blockers with days calculation
        active_blockers = Blocker.objects.filter(team=team, status='open')
        for blocker in active_blockers:
            days_unresolved = (timezone.now().date() - blocker.first_mentioned_date).days
            blockers_with_days.append({
                'blocker': blocker,
                'days_unresolved': days_unresolved,
                'is_overdue': days_unresolved > 2,
                'description': blocker.description,
                'first_mentioned_date': blocker.first_mentioned_date,
            })
        
        # Get recent meetings
        recent_meetings = Meeting.objects.filter(team=team).order_by('-date')[:10]
        
        # Calculate health trend
        if len(recent_metrics) >= 2:
            latest_score = recent_metrics[0].overall_health_score
            previous_score = recent_metrics[1].overall_health_score
            health_trend = latest_score - previous_score
            
    except ImportError:
        # Analytics models not available
        pass
    except Exception as e:
        # Log the error in production
        print(f"Error fetching analytics data: {e}")
    
    # Get current team metrics
    participation_score = team.get_participation_score() or 0
    health_score = team.get_health_score() or 0
    active_blockers_count = team.get_active_blockers_count() or 0
    recent_meetings_count = team.get_recent_meetings_count() or 0
    
    current_metrics = {
        'participation_score': participation_score,
        'active_blockers_count': active_blockers_count,
        'health_score': health_score,
        'health_status': team.get_health_status(),
        'recent_meetings_count': recent_meetings_count,
    }
    
    # Generate alerts based on current metrics
    alerts = generate_team_alerts(current_metrics, blockers_with_days)
    
    # Add stagnation count if available
    try:
        stagnation_count = getattr(team, 'get_stagnation_count', lambda: 0)()
        current_metrics['stagnation_count'] = stagnation_count
    except:
        current_metrics['stagnation_count'] = 0
    
    context = {
        'team': team,
        'current_metrics': current_metrics,
        'recent_metrics': recent_metrics,
        'active_blockers': blockers_with_days,
        'recent_meetings': recent_meetings,
        'health_trend': health_trend,
        'alerts': alerts,
        # Add these for the CSS to use
        'participation_score_for_css': participation_score,
        'health_score_for_css': health_score,
    }
    
    return render(request, 'dashboard/team_detail.html', context)


def generate_team_alerts(current_metrics, blockers_with_days):
    """Generate alerts based on team metrics"""
    alerts = []
    
    # Health score alerts
    health_score = current_metrics.get('health_score', 0)
    if health_score < 40:
        alerts.append({
            'priority': 'high',
            'message': f'Critical: Team health score is {health_score}%. Immediate intervention required.',
            'action': 'Schedule team retrospective and address blockers immediately.'
        })
    elif health_score < 60:
        alerts.append({
            'priority': 'medium',
            'message': f'Team health score is {health_score}%. Monitor closely and address issues.',
            'action': 'Review participation levels and active blockers.'
        })
    
    # Blocker alerts
    active_blockers_count = current_metrics.get('active_blockers_count', 0)
    if active_blockers_count > 5:
        alerts.append({
            'priority': 'high',
            'message': f'Team has {active_blockers_count} active blockers.',
            'action': 'Prioritize impediment removal in next sprint planning.'
        })
    elif active_blockers_count > 3:
        alerts.append({
            'priority': 'medium',
            'message': f'Team has {active_blockers_count} active blockers.',
            'action': 'Review and address blockers in daily standups.'
        })
    
    # Overdue blocker alerts
    overdue_blockers = [b for b in blockers_with_days if b.get('is_overdue', False)]
    if overdue_blockers:
        alerts.append({
            'priority': 'high',
            'message': f'{len(overdue_blockers)} blockers unresolved for >48 hours.',
            'action': 'Escalate to management or reassign resources.'
        })
    
    # Participation alerts
    participation_score = current_metrics.get('participation_score', 0)
    if participation_score < 50:
        alerts.append({
            'priority': 'medium',
            'message': f'Low participation rate: {participation_score}%.',
            'action': 'Engage team members and investigate engagement issues.'
        })
    
    # Meeting frequency alerts
    recent_meetings_count = current_metrics.get('recent_meetings_count', 0)
    if recent_meetings_count == 0:
        alerts.append({
            'priority': 'low',
            'message': 'No recent meetings recorded.',
            'action': 'Upload meeting audio to start tracking team health metrics.'
        })
    elif recent_meetings_count < 2:
        alerts.append({
            'priority': 'low',
            'message': 'Few recent meetings detected.',
            'action': 'Ensure regular team meetings are being recorded and uploaded.'
        })
    
    return alerts


@csrf_protect
@require_http_methods(["POST"])
def create_team(request):
    """Create a new team"""
    try:
        # Get form data
        name = request.POST.get('name', '').strip()
        scrum_master = request.POST.get('scrum_master', '').strip()
        product_owner = request.POST.get('product_owner', '').strip()
        members_text = request.POST.get('members', '').strip()
        
        # Validate required fields
        if not all([name, scrum_master, product_owner]):
            messages.error(
                request, 
                'Team name, scrum master, and product owner are required.'
            )
            return redirect('dashboard:home')
        
        # Check if team name already exists
        if Team.objects.filter(name=name).exists():
            messages.error(request, f'A team with the name "{name}" already exists.')
            return redirect('dashboard:home')
        
        # Process team members
        members = []
        if members_text:
            members = [
                member.strip() 
                for member in members_text.split('\n') 
                if member.strip()
            ]
        
        # Create the team
        team = Team.objects.create(
            name=name,
            scrum_master=scrum_master,
            product_owner=product_owner,
            members=members
        )
        
        messages.success(request, f'Team "{team.name}" created successfully!')
        return redirect('dashboard:team_detail', team_id=team.id)
        
    except Exception as e:
        messages.error(request, f'Error creating team: {str(e)}')
        return redirect('dashboard:home')


@csrf_protect
@require_http_methods(["POST"])
def update_team(request, team_id):
    """Update an existing team"""
    team = get_object_or_404(Team, id=team_id)
    
    try:
        # Get form data
        name = request.POST.get('name', '').strip()
        scrum_master = request.POST.get('scrum_master', '').strip()
        product_owner = request.POST.get('product_owner', '').strip()
        members_text = request.POST.get('members', '').strip()
        
        # Validate required fields
        if not all([name, scrum_master, product_owner]):
            messages.error(
                request, 
                'Team name, scrum master, and product owner are required.'
            )
            return redirect('dashboard:team_detail', team_id=team.id)
        
        # Check if team name already exists (excluding current team)
        if Team.objects.filter(name=name).exclude(id=team.id).exists():
            messages.error(request, f'A team with the name "{name}" already exists.')
            return redirect('dashboard:team_detail', team_id=team.id)
        
        # Process team members
        members = []
        if members_text:
            members = [
                member.strip() 
                for member in members_text.split('\n') 
                if member.strip()
            ]
        
        # Update the team
        team.name = name
        team.scrum_master = scrum_master
        team.product_owner = product_owner
        team.members = members
        team.save()
        
        messages.success(request, f'Team "{team.name}" updated successfully!')
        return redirect('dashboard:team_detail', team_id=team.id)
        
    except Exception as e:
        messages.error(request, f'Error updating team: {str(e)}')
        return redirect('dashboard:team_detail', team_id=team.id)


def delete_team(request, team_id):
    """Delete a team (with confirmation)"""
    team = get_object_or_404(Team, id=team_id)
    
    if request.method == 'POST':
        team_name = team.name
        team.delete()
        messages.success(request, f'Team "{team_name}" deleted successfully!')
        return redirect('dashboard:home')
    
    return render(request, 'dashboard/confirm_delete.html', {'team': team})
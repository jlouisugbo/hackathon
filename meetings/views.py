from django.shortcuts import render, get_object_or_404, redirect
from django.contrib import messages
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.core.files.storage import default_storage
from django.conf import settings
from django.utils import timezone
from django.db import transaction
import json
import logging
import os

from .models import Meeting

try:
    from dashboard.models import Team
except ImportError:
    Team = None

try:
    from analytics.utils import analyze_meeting_and_save_metrics
except ImportError:
    analyze_meeting_and_save_metrics = None

logger = logging.getLogger(__name__)


def meeting_upload(request):
    """Upload meeting audio file or JSON transcript"""
    
    if request.method == 'POST':
        return handle_meeting_upload(request)
    
    teams = []
    selected_team = None
    team_id = request.GET.get('team') 
    
    if Team:
        try:
            if team_id:
                selected_team = Team.objects.get(id=team_id)
                teams = [selected_team]  # Only show the selected team
            else:
                teams = Team.objects.all().order_by('name')
        except Team.DoesNotExist:
            teams = Team.objects.all().order_by('name') if Team else []
        except:
            pass
    
    context = {
        'teams': teams,
        'selected_team': selected_team,
        'team_locked': bool(team_id and selected_team),
        'meeting_types': Meeting.MEETING_TYPES,
        'max_file_size_mb': getattr(settings, 'FILE_UPLOAD_MAX_MEMORY_SIZE', 52428800) // (1024 * 1024),
        'allowed_extensions': getattr(settings, 'ALLOWED_AUDIO_EXTENSIONS', ['.mp3', '.wav', '.m4a']),
    }
    
    return render(request, 'meetings/upload.html', context)


def handle_meeting_upload(request):
    """Handle the actual file upload - for now just create meeting without transcription"""
    
    try:
        title = request.POST.get('title', '').strip()
        team_id = request.POST.get('team')
        
        if not team_id:
            team_id = request.POST.get('locked_team_id')
            
        meeting_type = request.POST.get('meeting_type', 'standup')
        meeting_date = request.POST.get('date')
        audio_file = request.FILES.get('audio_file')
        
        if not title:
            messages.error(request, 'Meeting title is required.')
            return redirect('meetings:upload')
        
        # Get team instance
        team = None
        if Team and team_id:
            try:
                team = Team.objects.get(id=team_id)
            except Team.DoesNotExist:
                messages.error(request, 'Selected team not found.')
                return redirect('meetings:upload')
        
        # Parse meeting date
        meeting_datetime = timezone.now()
        if meeting_date:
            try:
                # Parse the date and add current time
                from datetime import datetime
                date_obj = datetime.strptime(meeting_date, '%Y-%m-%d').date()
                meeting_datetime = timezone.make_aware(
                    datetime.combine(date_obj, datetime.now().time())
                )
            except ValueError:
                messages.warning(request, 'Invalid date format, using current time.')
        
        # Create meeting record
        with transaction.atomic():
            meeting = Meeting.objects.create(
                title=title,
                team=team,
                meeting_type=meeting_type,
                date=meeting_datetime,
                audio_file=audio_file,
                transcription_status='pending'  # Set to pending since transcription isn't working
            )
            
            messages.info(
                request, 
                f'Meeting "{title}" created. Please use the JSON upload endpoint to add transcription.'
            )
            return redirect('meetings:detail', meeting_id=meeting.id)
    
    except Exception as e:
        logger.error(f"Meeting upload failed: {e}")
        messages.error(request, f'Upload failed: {str(e)}')
        return redirect('meetings:upload')


def meeting_detail(request, meeting_id):
    """Meeting detail page with transcription status and content"""
    
    meeting = get_object_or_404(Meeting, id=meeting_id)
    
    context = {
        'meeting': meeting,
        'transcription_text': meeting.transcription_processed if meeting.is_transcription_ready() else None,
        'show_refresh': meeting.transcription_status == 'processing',
        'has_analytics': meeting.has_analytics(),
    }
    
    return render(request, 'meetings/detail.html', context)


def meeting_list(request):
    """List all meetings with filtering and pagination"""
    
    meetings = Meeting.objects.select_related('team').order_by('-date')
    
    # Filter by team if specified
    team_id = request.GET.get('team')
    if team_id and Team:
        try:
            team = Team.objects.get(id=team_id)
            meetings = meetings.filter(team=team)
        except Team.DoesNotExist:
            pass
    
    # Filter by status if specified
    status = request.GET.get('status')
    if status and status in dict(Meeting.TRANSCRIPTION_STATUS):
        meetings = meetings.filter(transcription_status=status)
    
    # Get teams for filter dropdown
    teams = []
    if Team:
        try:
            teams = Team.objects.all().order_by('name')
        except:
            pass
    
    context = {
        'meetings': meetings[:20],  # Simple pagination
        'teams': teams,
        'current_team_id': team_id,
        'current_status': status,
        'status_choices': Meeting.TRANSCRIPTION_STATUS,
    }
    
    return render(request, 'meetings/list.html', context)


@csrf_exempt
@require_http_methods(["POST"])
def transcription_api(request):
    """API endpoint for direct transcription JSON input - THIS IS THE KEY ENDPOINT"""
    
    try:
        data = json.loads(request.body)
        
        # Validate required fields
        required_fields = ['title', 'transcription']
        for field in required_fields:
            if field not in data:
                return JsonResponse({'error': f'Missing required field: {field}'}, status=400)
        
        # Optional fields with defaults
        meeting_type = data.get('meeting_type', 'standup')
        meeting_date = data.get('date')
        team_id = data.get('team_id')
        duration_minutes = data.get('duration_minutes')
        
        # Parse date
        meeting_datetime = timezone.now()
        if meeting_date:
            try:
                from datetime import datetime
                if 'T' in meeting_date:
                    # ISO format
                    meeting_datetime = timezone.datetime.fromisoformat(meeting_date.replace('Z', '+00:00'))
                else:
                    # Just date
                    date_obj = datetime.strptime(meeting_date, '%Y-%m-%d').date()
                    meeting_datetime = timezone.make_aware(
                        datetime.combine(date_obj, datetime.now().time())
                    )
            except ValueError:
                return JsonResponse({'error': 'Invalid date format. Use YYYY-MM-DD or ISO format'}, status=400)
        
        # Get team
        team = None
        if team_id and Team:
            try:
                team = Team.objects.get(id=team_id)
            except Team.DoesNotExist:
                return JsonResponse({'error': f'Team with id {team_id} not found'}, status=400)
        
        # Create meeting with transcription
        with transaction.atomic():
            meeting = Meeting.objects.create(
                title=data['title'],
                team=team,
                meeting_type=meeting_type,
                date=meeting_datetime,
                duration_minutes=duration_minutes,
                transcription_processed=data['transcription'],
                transcription_raw={
                    'transcription': data['transcription'],
                    'source': 'api_upload',
                    'uploaded_at': timezone.now().isoformat()
                },
                transcription_status='completed'
            )
            
            # Trigger AI analysis if available
            if analyze_meeting_and_save_metrics:
                try:
                    logger.info(f"Starting AI analysis for meeting {meeting.id}")
                    metrics = analyze_meeting_and_save_metrics(meeting)
                    if metrics:
                        logger.info(f"AI analysis completed for meeting {meeting.id}")
                        return JsonResponse({
                            'success': True,
                            'meeting_id': meeting.id,
                            'message': 'Meeting created and analyzed successfully',
                            'health_score': metrics.overall_health_score,
                            'health_status': metrics.health_status,
                            'analytics_url': f'/analytics/team/{team.id}/' if team else None
                        })
                except Exception as e:
                    logger.error(f"AI analysis failed for meeting {meeting.id}: {e}")
                    # Don't fail the whole request if analysis fails
            
            return JsonResponse({
                'success': True,
                'meeting_id': meeting.id,
                'message': 'Meeting created successfully (analysis pending or unavailable)',
                'meeting_url': f'/meetings/{meeting.id}/'
            })
    
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON format'}, status=400)
    except Exception as e:
        logger.error(f"Transcription API error: {e}")
        return JsonResponse({'error': str(e)}, status=500)


@require_http_methods(["POST"])
def analyze_meeting(request, meeting_id):
    """Manually trigger AI analysis for a meeting"""
    
    meeting = get_object_or_404(Meeting, id=meeting_id)
    
    if not meeting.transcription_processed:
        messages.error(request, 'Meeting has no transcription to analyze.')
        return redirect('meetings:detail', meeting_id=meeting.id)
    
    if analyze_meeting_and_save_metrics:
        try:
            metrics = analyze_meeting_and_save_metrics(meeting)
            if metrics:
                messages.success(
                    request, 
                    f'Analysis complete! Health Score: {metrics.overall_health_score}/100 ({metrics.health_status})'
                )
            else:
                messages.error(request, 'Analysis failed. Please check logs.')
        except Exception as e:
            logger.error(f"Manual analysis failed for meeting {meeting.id}: {e}")
            messages.error(request, f'Analysis failed: {str(e)}')
    else:
        messages.error(request, 'Analytics module not available.')
    
    return redirect('meetings:detail', meeting_id=meeting.id)


def refresh_transcription(request, meeting_id):
    """Redirect to meeting detail since we're not using async transcription"""
    return redirect('meetings:detail', meeting_id=meeting_id)


def json_upload_page(request):
    """Page for uploading JSON transcripts directly"""
    teams = []
    if Team:
        try:
            teams = Team.objects.all().order_by('name')
        except:
            pass
    
    context = {
        'teams': teams,
    }
    
    return render(request, 'meetings/json_upload.html', context)

    from django.template.loader import render_to_string
def meeting_demo(request):
    fake_meeting = {
        'title': "Quarterly Product Strategy Meeting",
        'get_status_badge_class': "badge-success",
        'get_transcription_status_display': "Completed",
        'get_team_name': "Product Team",
        'get_meeting_type_display': "Strategy Session",
        'date': "2023-05-15T14:30:00",
        'get_duration_display': "1 hour 23 minutes",
        'audio_file': {
            'url': "/media/meetings/audio/sample.mp3",
        },
        'get_audio_filename': "meeting_recording.mp3",
        'get_audio_size_mb': "12.4",
        'created_at': "2023-05-15T16:45:00",
        'is_transcription_ready': True,
        'has_analytics': True,
        'summary': "The team discussed the upcoming product roadmap for Q3 and Q4. Key decisions were made about feature prioritization. Marketing will prepare a launch plan for the new features by next week.",
        'id': 1,
    }
    
    fake_topics = [
        {'name': "Product Roadmap", 'count': 15},
        {'name': "Feature Prioritization", 'count': 12},
        {'name': "User Feedback", 'count': 8},
        {'name': "Marketing Plan", 'count': 6},
    ]
    
    fake_participants = [
        {'name': "Alex Johnson", 'speaking_time': 420, 'speaking_percentage': 35},
        {'name': "Sam Wilson", 'speaking_time': 380, 'speaking_percentage': 32},
        {'name': "Taylor Smith", 'speaking_time': 250, 'speaking_percentage': 21},
        {'name': "Jordan Lee", 'speaking_time': 150, 'speaking_percentage': 12},
    ]
    
    fake_action_items = [
        {
            'description': "Prepare Q3 feature launch plan",
            'assigned_to': {'get_full_name': "Sam Wilson"},
            'due_date': "2023-05-22",
            'get_status_display': "In Progress",
            'get_status_class': "warning",
        },
        {
            'description': "Gather user feedback on new UI",
            'assigned_to': {'get_full_name': "Jordan Lee"},
            'due_date': "2023-05-19",
            'get_status_display': "Not Started",
            'get_status_class': "secondary",
        },
    ]
    
    context = {
        'meeting': fake_meeting,
        'meeting.get_topics': fake_topics,
        'meeting.get_participants': fake_participants,
        'meeting.action_items.all': fake_action_items,
    }
    
    return redirect('meetings:results', context)
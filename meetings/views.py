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
from .transcription_service import transcription_service, TranscriptionServiceError

try:
    from dashboard.models import Team
except ImportError:
    Team = None

logger = logging.getLogger(__name__)


def meeting_upload(request):
    """Upload meeting audio file with transcription"""
    
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
        'team_locked': bool(team_id and selected_team),  # Lock team selection if coming from URL
        'meeting_types': Meeting.MEETING_TYPES,
        'max_file_size_mb': getattr(settings, 'FILE_UPLOAD_MAX_MEMORY_SIZE', 52428800) // (1024 * 1024),
        'allowed_extensions': getattr(settings, 'ALLOWED_AUDIO_EXTENSIONS', ['.mp3', '.wav', '.m4a']),
    }
    
    return render(request, 'meetings/upload.html', context)


def handle_meeting_upload(request):
    """Handle the actual file upload and transcription"""
    
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
        
        if not audio_file:
            messages.error(request, 'Audio file is required.')
            return redirect('meetings:upload')
        
        # Validate file size
        max_size = getattr(settings, 'FILE_UPLOAD_MAX_MEMORY_SIZE', 52428800)
        if audio_file.size > max_size:
            max_size_mb = max_size // (1024 * 1024)
            messages.error(request, f'File too large. Maximum size is {max_size_mb}MB.')
            return redirect('meetings:upload')
        
        # Validate file extension
        allowed_extensions = getattr(settings, 'ALLOWED_AUDIO_EXTENSIONS', ['.mp3', '.wav', '.m4a'])
        file_ext = os.path.splitext(audio_file.name)[1].lower()
        if file_ext not in allowed_extensions:
            messages.error(request, f'Invalid file type. Allowed: {", ".join(allowed_extensions)}')
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
                meeting_datetime = timezone.datetime.fromisoformat(meeting_date.replace('Z', '+00:00'))
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
                transcription_status='processing'
            )
            
            # Start transcription process
            try:
                start_transcription(meeting)
                messages.success(request, f'Meeting "{title}" uploaded successfully. Transcription in progress.')
                return redirect('meetings:detail', meeting_id=meeting.id)
                
            except Exception as e:
                logger.error(f"Transcription failed for meeting {meeting.id}: {e}")
                meeting.transcription_status = 'failed'
                meeting.save()
                messages.error(request, f'Upload successful but transcription failed: {str(e)}')
                return redirect('meetings:detail', meeting_id=meeting.id)
    
    except Exception as e:
        logger.error(f"Meeting upload failed: {e}")
        messages.error(request, f'Upload failed: {str(e)}')
        return redirect('meetings:upload')


def start_transcription(meeting):
    """Start transcription process for a meeting"""
    
    if not meeting.audio_file:
        raise TranscriptionServiceError("No audio file attached to meeting")
    
    # Determine transcription method based on file size
    file_size_mb = meeting.get_audio_size_mb() or 0
    use_sync = transcription_service.should_use_sync_transcription(file_size_mb)
    
    if use_sync:
        # Synchronous transcription for smaller files
        logger.info(f"Starting sync transcription for meeting {meeting.id}")
        
        with meeting.audio_file.open('rb') as audio_file:
            result = transcription_service.upload_audio_sync(audio_file, meeting.title)
        
        if result['success']:
            meeting.transcription_processed = result['transcription']
            meeting.transcription_raw = {
                'transcription': result['transcription'],
                'duration_seconds': result.get('duration_seconds'),
                'duration_milliseconds': result.get('duration_milliseconds'),
                'combined_phrases': result.get('combined_phrases', []),
                'phrases': result.get('phrases', []),
                'speakers': result.get('speakers', []),
                'raw_response': result.get('raw_response', {})
            }
            meeting.duration_minutes = int(result.get('duration_seconds', 0) // 60) if result.get('duration_seconds') else None
            meeting.transcription_status = 'completed'
            meeting.save()
            
            logger.info(f"Sync transcription completed for meeting {meeting.id}")
        else:
            meeting.transcription_status = 'failed'
            meeting.save()
            raise TranscriptionServiceError(result.get('error', 'Sync transcription failed'))
    
    else:
        # Asynchronous transcription for larger files
        logger.info(f"Starting async transcription for meeting {meeting.id}")
        
        with meeting.audio_file.open('rb') as audio_file:
            success, document_id, error = transcription_service.upload_audio_async(audio_file, meeting.title)
        
        if success:
            meeting.transcription_document_id = document_id
            meeting.transcription_status = 'processing'
            meeting.save()
            
            logger.info(f"Async transcription started for meeting {meeting.id}, document_id: {document_id}")
        else:
            meeting.transcription_status = 'failed'
            meeting.save()
            raise TranscriptionServiceError(error or 'Async transcription upload failed')


def meeting_detail(request, meeting_id):
    """Meeting detail page with transcription status and content"""
    
    meeting = get_object_or_404(Meeting, id=meeting_id)
    
    # Check for async transcription updates
    if meeting.transcription_status == 'processing' and meeting.transcription_document_id:
        try:
            check_transcription_status(meeting)
        except Exception as e:
            logger.error(f"Failed to check transcription status for meeting {meeting.id}: {e}")
    
    context = {
        'meeting': meeting,
        'transcription_text': meeting.transcription_processed if meeting.is_transcription_ready() else None,
        'show_refresh': meeting.transcription_status == 'processing',
    }
    
    return render(request, 'meetings/detail.html', context)


def check_transcription_status(meeting):
    """Check and update transcription status for async transcriptions"""
    
    if not meeting.transcription_document_id:
        return
    
    try:
        status_result = transcription_service.get_transcription_status(meeting.transcription_document_id)
        
        if not status_result['success']:
            logger.error(f"Status check failed for meeting {meeting.id}: {status_result.get('error')}")
            return
        
        status = status_result['status']
        
        if status == 'completed':
            # Get the full transcription
            result = transcription_service.get_transcription_result(meeting.transcription_document_id)
            
            if result['success']:
                meeting.transcription_processed = result['transcription']
                meeting.transcription_raw = {
                    'transcription': result['transcription'],
                    'duration_seconds': result.get('duration_seconds'),
                    'duration_milliseconds': result.get('duration_milliseconds'),
                    'combined_phrases': result.get('combined_phrases', []),
                    'phrases': result.get('phrases', []),
                    'speakers': result.get('speakers', []),
                    'raw_response': result.get('raw_response', {})
                }
                meeting.duration_minutes = int(result.get('duration_seconds', 0) // 60) if result.get('duration_seconds') else None
                meeting.transcription_status = 'completed'
                meeting.save()
                
                logger.info(f"Async transcription completed for meeting {meeting.id}")
            else:
                meeting.transcription_status = 'failed'
                meeting.save()
                logger.error(f"Failed to get transcription result for meeting {meeting.id}: {result.get('error')}")
        
        elif status == 'failed':
            meeting.transcription_status = 'failed'
            meeting.save()
            logger.error(f"Transcription failed for meeting {meeting.id}: {status_result.get('error_message')}")
    
    except Exception as e:
        logger.error(f"Error checking transcription status for meeting {meeting.id}: {e}")


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
        'meetings': meetings,
        'teams': teams,
        'current_team_id': team_id,
        'current_status': status,
        'status_choices': Meeting.TRANSCRIPTION_STATUS,
    }
    
    return render(request, 'meetings/list.html', context)


@csrf_exempt
@require_http_methods(["POST"])
def transcription_api(request):
    """API endpoint for direct transcription JSON input"""
    
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
        
        # Parse date
        meeting_datetime = timezone.now()
        if meeting_date:
            try:
                meeting_datetime = timezone.datetime.fromisoformat(meeting_date.replace('Z', '+00:00'))
            except ValueError:
                return JsonResponse({'error': 'Invalid date format'}, status=400)
        
        # Get team
        team = None
        if team_id and Team:
            try:
                team = Team.objects.get(id=team_id)
            except Team.DoesNotExist:
                return JsonResponse({'error': 'Team not found'}, status=400)
        
        # Create meeting with transcription
        meeting = Meeting.objects.create(
            title=data['title'],
            team=team,
            meeting_type=meeting_type,
            date=meeting_datetime,
            transcription_processed=data['transcription'],
            transcription_raw={'transcription': data['transcription']},
            transcription_status='completed'
        )
        
        return JsonResponse({
            'success': True,
            'meeting_id': meeting.id,
            'message': 'Meeting created successfully'
        })
    
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
    except Exception as e:
        logger.error(f"Transcription API error: {e}")
        return JsonResponse({'error': str(e)}, status=500)


def refresh_transcription(request, meeting_id):
    """Manually refresh transcription status"""
    
    meeting = get_object_or_404(Meeting, id=meeting_id)
    
    if meeting.transcription_status == 'processing':
        try:
            check_transcription_status(meeting)
            messages.success(request, 'Transcription status updated.')
        except Exception as e:
            messages.error(request, f'Failed to check transcription status: {str(e)}')
    else:
        messages.info(request, 'Transcription is not in processing state.')
    
    return redirect('meetings:detail', meeting_id=meeting.id)
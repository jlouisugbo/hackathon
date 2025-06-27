import json
import logging
import re
from datetime import date, timedelta
from typing import Dict, List, Optional, Tuple
import os

CERT_FILE_PATH = ""

os.environ["REQUESTS_CA_BUNDLE"] = CERT_FILE_PATH
os.environ["SSL_CERT_FILE"] = CERT_FILE_PATH

try:
    import openai
    from django.conf import settings
except ImportError:
    openai = None

from .models import TeamHealthMetrics, Blocker

logger = logging.getLogger(__name__)


class MeetingAnalyzer:
    """
    Core class for analyzing meeting transcriptions using OpenAI
    and generating team health metrics.
    """
    KEY = ""
    GATEWAY_URL = ""
    
    def __init__(self):
        if not openai:
            raise ImportError("OpenAI library not installed. Run: pip install openai")
        
        # if not getattr(settings, 'OPENAI_API_KEY', ''):
        #     raise ValueError("OPENAI_API_KEY not configured in settings")
    
    def analyze_meeting_with_openai(self, text_content: str, meeting_context: Dict = None) -> Dict:
        """
        Analyze meeting transcription using OpenAI GPT-4 to extract team health metrics.
        
        Args:
            text_content: The meeting transcription text
            meeting_context: Optional context about the meeting (team, type, etc.)
        
        Returns:
            Dictionary with health metrics and analysis
        """
        try:
            prompt = self._build_analysis_prompt(text_content, meeting_context)

            client = openai.OpenAI(
                api_key = self.KEY,
                base_url = self.GATEWAY_URL,
            )
            
            response = client.chat.completions.create(
            messages=[
                        {"role": "developer", "content": self._get_system_prompt()},
                        {"role": "user", "content": prompt}
                    ],
                model = self.MODEL,
            )
            
            analysis_text = response.choices[0].message.content
            analysis_data = json.loads(analysis_text)
            
            return self._validate_analysis_response(analysis_data)
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse OpenAI response as JSON: {e}")
            return self._get_fallback_analysis()
        except Exception as e:
            logger.error(f"OpenAI analysis failed: {e}")
            return self._get_fallback_analysis()
    
    def _get_system_prompt(self) -> str:
        """System prompt that defines the AI's role and output format"""
        return """You are an expert Scrum Master and team health analyst. Analyze meeting transcriptions to assess team health and provide actionable insights.

Your analysis should focus on:
1. Team participation and engagement levels
2. Detection of blockers and impediments  
3. Progress stagnation patterns
4. Key role participation (Scrum Master, Product Owner)
5. Overall team health and velocity

Always respond with valid JSON in the exact format specified in the user prompt. Be objective and focus on concrete observations from the text."""
    
    def _build_analysis_prompt(self, text_content: str, meeting_context: Dict = None) -> str:
        """Build the analysis prompt with transcription and context"""
        context_info = ""
        if meeting_context:
            context_info = f"""
Meeting Context:
- Team: {meeting_context.get('team_name', 'Unknown')}
- Type: {meeting_context.get('meeting_type', 'standup')}
- Date: {meeting_context.get('date', 'Unknown')}
- Duration: {meeting_context.get('duration', 'Unknown')}
"""
        
        prompt = f"""Analyze this meeting transcription for team health metrics:

{context_info}

TRANSCRIPTION:
{text_content[:4000]}  # Limit to avoid token limits

Please analyze and return ONLY valid JSON in this exact format:
{{
    "participation_score": <0-100 integer based on speaker variety and engagement>,
    "key_roles_present": [<array of detected roles: "scrum_master", "product_owner", "developer", "tester", etc.>],
    "blocker_count": <integer count of impediments/blockers mentioned>,
    "blockers": [
        {{
            "description": "<brief description of the blocker>",
            "person": "<who mentioned being blocked>",
            "dependency": "<what they're waiting for>",
            "severity": "<low/medium/high/critical>",
            "confidence": <0.0-1.0 confidence in detection>
        }}
    ],
    "progress_stagnation_count": <count of repeated status updates with no progress>,
    "stagnation_patterns": [
        {{
            "person": "<person with stagnant updates>",
            "description": "<what they keep repeating>"
        }}
    ],
    "scrum_master_alerts": [
        "<actionable insight 1>",
        "<actionable insight 2>"
    ],
    "overall_health_score": <0-100 combined health score>,
    "health_reasoning": "<brief explanation of health score>",
    "meeting_quality": {{
        "on_topic": <0-100 score for staying on topic>,
        "time_efficiency": <0-100 score for time management>,
        "engagement_level": <0-100 score for team engagement>
    }}
}}

Focus on concrete observations. Look for phrases like:
- Blockers: "waiting for", "blocked by", "stuck on", "can't proceed until"
- Stagnation: "same as yesterday", "still working on", "no updates"
- Participation: count unique speakers, engagement level
- Roles: identify scrum master, product owner by context/statements"""
        
        return prompt
    
    def _validate_analysis_response(self, analysis_data: Dict) -> Dict:
        """Validate and normalize the OpenAI response"""
        defaults = {
            "participation_score": 50,
            "key_roles_present": [],
            "blocker_count": 0,
            "blockers": [],
            "progress_stagnation_count": 0,
            "stagnation_patterns": [],
            "scrum_master_alerts": [],
            "overall_health_score": 50,
            "health_reasoning": "Analysis completed",
            "meeting_quality": {
                "on_topic": 70,
                "time_efficiency": 70,
                "engagement_level": 70
            }
        }
        
        for key, default_value in defaults.items():
            if key not in analysis_data:
                analysis_data[key] = default_value
        
        for score_field in ["participation_score", "overall_health_score"]:
            if score_field in analysis_data:
                analysis_data[score_field] = max(0, min(100, int(analysis_data[score_field])))
        
        if "meeting_quality" in analysis_data:
            for quality_field in ["on_topic", "time_efficiency", "engagement_level"]:
                if quality_field in analysis_data["meeting_quality"]:
                    analysis_data["meeting_quality"][quality_field] = max(0, min(100, int(analysis_data["meeting_quality"][quality_field])))
        
        return analysis_data
    
    def _get_fallback_analysis(self) -> Dict:
        """Return basic analysis when OpenAI fails"""
        return {
            "participation_score": 50,
            "key_roles_present": [],
            "blocker_count": 0,
            "blockers": [],
            "progress_stagnation_count": 0,
            "stagnation_patterns": [],
            "scrum_master_alerts": ["Unable to analyze meeting - please review manually"],
            "overall_health_score": 50,
            "health_reasoning": "Analysis failed - manual review needed",
            "meeting_quality": {
                "on_topic": 50,
                "time_efficiency": 50,
                "engagement_level": 50
            }
        }
    
    def calculate_health_status(self, health_score: int, blocker_count: int, stagnation_count: int) -> str:
        """
        Calculate overall health status based on metrics.
        
        Returns: 'green', 'yellow', or 'red'
        """
        if (health_score < 40 or 
            blocker_count > 5 or 
            stagnation_count > 3):
            return 'red'
        
        elif (health_score < 70 or 
              blocker_count > 2 or 
              stagnation_count > 1):
            return 'yellow'
        
        else:
            return 'green'


def analyze_meeting_and_save_metrics(meeting):
    """
    Main function to analyze a meeting and save health metrics.
    
    Args:
        meeting: Meeting model instance with transcription_processed
    
    Returns:
        TeamHealthMetrics instance or None if analysis fails
    """
    if not meeting.transcription_processed:
        logger.warning(f"Meeting {meeting.id} has no processed transcription")
        return None
    
    try:
        analyzer = MeetingAnalyzer()
        meeting_context = {
            'team_name': meeting.team.name if meeting.team else 'Unknown',
            'meeting_type': meeting.meeting_type,
            'date': meeting.date.strftime('%Y-%m-%d') if meeting.date else 'Unknown',
            'duration': f"{meeting.duration_minutes} minutes" if meeting.duration_minutes else 'Unknown'
        }
        
        analysis_result = analyzer.analyze_meeting_with_openai(
            meeting.transcription_processed,
            meeting_context
        )
        
        health_status = analyzer.calculate_health_status(
            analysis_result['overall_health_score'],
            analysis_result['blocker_count'],
            analysis_result['progress_stagnation_count']
        )
        
        metrics, created = TeamHealthMetrics.objects.get_or_create(
            meeting=meeting,
            defaults={
                'team': meeting.team,
                'date': meeting.date.date() if meeting.date else date.today(),
                'participation_score': analysis_result['participation_score'],
                'blocker_count': analysis_result['blocker_count'],
                'repeated_blocker_count': len([b for b in analysis_result['blockers'] if b.get('confidence', 0) > 0.7]),
                'progress_stagnation_count': analysis_result['progress_stagnation_count'],
                'key_roles_present': analysis_result['key_roles_present'],
                'overall_health_score': analysis_result['overall_health_score'],
                'health_status': health_status,
                'ai_analysis_raw': analysis_result,
                'scrum_master_alerts': analysis_result['scrum_master_alerts']
            }
        )
        
        if not created:
            metrics.participation_score = analysis_result['participation_score']
            metrics.blocker_count = analysis_result['blocker_count']
            metrics.repeated_blocker_count = len([b for b in analysis_result['blockers'] if b.get('confidence', 0) > 0.7])
            metrics.progress_stagnation_count = analysis_result['progress_stagnation_count']
            metrics.key_roles_present = analysis_result['key_roles_present']
            metrics.overall_health_score = analysis_result['overall_health_score']
            metrics.health_status = health_status
            metrics.ai_analysis_raw = analysis_result
            metrics.scrum_master_alerts = analysis_result['scrum_master_alerts']
            metrics.save()
        
        process_blockers_from_analysis(analysis_result['blockers'], meeting)
        
        logger.info(f"Successfully analyzed meeting {meeting.id} - Health: {health_status}")
        return metrics
        
    except Exception as e:
        logger.error(f"Failed to analyze meeting {meeting.id}: {e}")
        return None


def process_blockers_from_analysis(blockers_data: List[Dict], meeting):
    """
    Process blocker data from AI analysis and create/update Blocker instances.
    
    Args:
        blockers_data: List of blocker dictionaries from AI analysis
        meeting: Meeting instance
    """
    meeting_date = meeting.date.date() if meeting.date else date.today()
    
    for blocker_data in blockers_data:
        # Skip low-confidence detections
        if blocker_data.get('confidence', 0) < 0.5:
            continue
        
        description = blocker_data.get('description', '').strip()
        if not description:
            continue
        
        existing_blocker = find_similar_blocker(description, meeting.team)
        
        if existing_blocker:
            existing_blocker.last_mentioned_date = meeting_date
            existing_blocker.meetings.add(meeting)
            
            new_severity = blocker_data.get('severity', 'medium')
            if get_severity_priority(new_severity) > get_severity_priority(existing_blocker.severity):
                existing_blocker.severity = new_severity
            
            existing_blocker.save()
        else:
            blocker = Blocker.objects.create(
                description=description,
                team=meeting.team,
                first_mentioned_date=meeting_date,
                last_mentioned_date=meeting_date,
                severity=blocker_data.get('severity', 'medium'),
                blocking_person=blocker_data.get('person', ''),
                blocking_dependency=blocker_data.get('dependency', ''),
                ai_confidence=blocker_data.get('confidence', 0.0)
            )
            blocker.meetings.add(meeting)


def find_similar_blocker(description: str, team) -> Optional[Blocker]:
    """
    Find existing blocker with similar description using fuzzy matching.
    
    Args:
        description: New blocker description
        team: Team instance
    
    Returns:
        Existing Blocker instance or None
    """
    description_lower = description.lower()
    
    recent_date = date.today() - timedelta(days=14)
    recent_blockers = Blocker.objects.filter(
        team=team,
        status='open',
        last_mentioned_date__gte=recent_date
    )
    
    for blocker in recent_blockers:
        blocker_desc_lower = blocker.description.lower()
        
        description_words = set(description_lower.split())
        blocker_words = set(blocker_desc_lower.split())
        
        # If 70% of words match, consider it the same blocker
        if len(description_words) > 0:
            overlap = len(description_words.intersection(blocker_words))
            similarity = overlap / len(description_words)
            
            if similarity > 0.7:
                return blocker
    
    return None


def get_severity_priority(severity: str) -> int:
    """Return numeric priority for severity comparison"""
    priorities = {
        'low': 1,
        'medium': 2,
        'high': 3,
        'critical': 4
    }
    return priorities.get(severity, 2)
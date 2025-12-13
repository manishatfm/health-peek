"""
Chat Analysis Service
Provides comprehensive analysis like ChatRecap AI:
- Messaging patterns (frequency, most-active hours, message lengths)
- Response time and engagement metrics
- Sentiment and emotional tone analysis
- Red flag detection (drop in replies, low-investment patterns)
- Message counts, emoji usage, positive/negative text ratios
"""

from typing import List, Dict, Tuple
from datetime import datetime, timedelta
from collections import Counter, defaultdict
import re
import logging
import emoji

logger = logging.getLogger(__name__)


class ChatAnalyzer:
    """Comprehensive chat analysis engine"""
    
    def __init__(self):
        pass  # Emoji pattern no longer needed with emoji.emoji_list()
    
    def analyze_conversation(
        self,
        messages: List[Dict],
        current_user_name: str = None
    ) -> Dict:
        """
        Perform comprehensive analysis on a conversation
        
        Args:
            messages: List of message dicts with timestamp, sender, message
            current_user_name: Name of the current user (to distinguish "you" vs "other")
        
        Returns:
            Comprehensive analysis dictionary
        """
        if not messages:
            return self._empty_analysis()
        
        # Sort messages by timestamp
        messages = sorted(messages, key=lambda x: x['timestamp'])
        
        # Identify participants
        participants = self._identify_participants(messages, current_user_name)
        
        # Run all analysis modules
        basic_stats = self._analyze_basic_stats(messages, participants)
        patterns = self._analyze_messaging_patterns(messages, participants)
        engagement = self._analyze_engagement_metrics(messages, participants)
        sentiment_analysis = self._analyze_sentiment_distribution(messages, participants)
        red_flags = self._detect_red_flags(messages, participants, patterns, engagement)
        emoji_stats = self._analyze_emojis(messages, participants)
        time_analysis = self._analyze_time_patterns(messages, participants)
        
        return {
            'participants': participants,
            'basic_stats': basic_stats,
            'messaging_patterns': patterns,
            'engagement_metrics': engagement,
            'sentiment_analysis': sentiment_analysis,
            'red_flags': red_flags,
            'emoji_stats': emoji_stats,
            'time_analysis': time_analysis,
            'conversation_period': {
                'start': messages[0]['timestamp'].isoformat(),
                'end': messages[-1]['timestamp'].isoformat(),
                'duration_days': (messages[-1]['timestamp'] - messages[0]['timestamp']).days
            }
        }
    
    def _identify_participants(
        self,
        messages: List[Dict],
        current_user_name: str = None
    ) -> Dict:
        """Identify and categorize participants"""
        senders = [msg['sender'] for msg in messages]
        sender_counts = Counter(senders)
        
        participants = {}
        for sender, count in sender_counts.most_common():
            role = 'you' if sender == current_user_name else 'other'
            participants[sender] = {
                'name': sender,
                'role': role,
                'message_count': count
            }
        
        return participants
    
    def _analyze_basic_stats(self, messages: List[Dict], participants: Dict) -> Dict:
        """Calculate basic statistics"""
        total_messages = len(messages)
        
        # Message counts per participant
        counts_by_participant = {}
        for name, info in participants.items():
            counts_by_participant[name] = info['message_count']
        
        # Average message length
        avg_length = sum(len(msg['message']) for msg in messages) / total_messages if total_messages > 0 else 0
        
        # Longest and shortest messages
        lengths = [(msg['sender'], len(msg['message'])) for msg in messages]
        longest = max(lengths, key=lambda x: x[1]) if lengths else ('', 0)
        shortest = min(lengths, key=lambda x: x[1]) if lengths else ('', 0)
        
        return {
            'total_messages': total_messages,
            'messages_per_participant': counts_by_participant,
            'average_message_length': round(avg_length, 1),
            'longest_message': {'sender': longest[0], 'length': longest[1]},
            'shortest_message': {'sender': shortest[0], 'length': shortest[1]},
        }
    
    def _analyze_messaging_patterns(self, messages: List[Dict], participants: Dict) -> Dict:
        """Analyze messaging frequency and patterns"""
        if not messages:
            return {}
        
        # Daily message frequency
        messages_by_date = defaultdict(int)
        for msg in messages:
            date = msg['timestamp'].date()
            messages_by_date[date] += 1
        
        # Most active days
        most_active_days = sorted(
            messages_by_date.items(),
            key=lambda x: x[1],
            reverse=True
        )[:5]
        
        # Hourly distribution (most active hours)
        hourly_dist = defaultdict(int)
        for msg in messages:
            hour = msg['timestamp'].hour
            hourly_dist[hour] += 1
        
        most_active_hours = sorted(
            hourly_dist.items(),
            key=lambda x: x[1],
            reverse=True
        )[:5]
        
        # Messaging frequency per participant
        freq_by_participant = {}
        for name in participants:
            participant_msgs = [msg for msg in messages if msg['sender'] == name]
            if len(participant_msgs) > 1:
                time_diffs = []
                for i in range(1, len(participant_msgs)):
                    diff = (participant_msgs[i]['timestamp'] - participant_msgs[i-1]['timestamp']).total_seconds() / 3600
                    time_diffs.append(diff)
                
                avg_gap = sum(time_diffs) / len(time_diffs) if time_diffs else 0
                freq_by_participant[name] = {
                    'average_hours_between_messages': round(avg_gap, 2),
                    'messages_per_day': round(len(participant_msgs) / max(1, (messages[-1]['timestamp'] - messages[0]['timestamp']).days), 2)
                }
        
        # Day of week distribution
        day_of_week_dist = defaultdict(int)
        day_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        for msg in messages:
            day = msg['timestamp'].weekday()
            day_of_week_dist[day_names[day]] += 1
        
        return {
            'most_active_days': [
                {'date': str(date), 'count': count}
                for date, count in most_active_days
            ],
            'most_active_hours': [
                {'hour': f"{hour:02d}:00", 'count': count}
                for hour, count in most_active_hours
            ],
            'frequency_per_participant': freq_by_participant,
            'day_of_week_distribution': dict(day_of_week_dist)
        }
    
    def _analyze_engagement_metrics(self, messages: List[Dict], participants: Dict) -> Dict:
        """Analyze response times and engagement"""
        response_times = []
        conversation_threads = []
        
        # Calculate response times
        for i in range(1, len(messages)):
            prev_msg = messages[i-1]
            curr_msg = messages[i]
            
            # If different senders, it's a response
            if prev_msg['sender'] != curr_msg['sender']:
                time_diff = (curr_msg['timestamp'] - prev_msg['timestamp']).total_seconds() / 60  # in minutes
                
                # Only count reasonable response times (< 24 hours)
                if time_diff < 1440:
                    response_times.append({
                        'responder': curr_msg['sender'],
                        'time_minutes': time_diff
                    })
        
        # Calculate average response time per participant
        avg_response_by_participant = {}
        for name in participants:
            participant_responses = [r['time_minutes'] for r in response_times if r['responder'] == name]
            if participant_responses:
                avg_response_by_participant[name] = {
                    'average_minutes': round(sum(participant_responses) / len(participant_responses), 2),
                    'median_minutes': round(sorted(participant_responses)[len(participant_responses)//2], 2),
                    'fastest_minutes': round(min(participant_responses), 2),
                    'slowest_minutes': round(max(participant_responses), 2)
                }
        
        # Conversation initiation analysis
        initiations_by_participant = defaultdict(int)
        if len(messages) > 0:
            initiations_by_participant[messages[0]['sender']] += 1
        
        for i in range(1, len(messages)):
            prev_msg = messages[i-1]
            curr_msg = messages[i]
            
            # New conversation if > 4 hours gap
            time_gap = (curr_msg['timestamp'] - prev_msg['timestamp']).total_seconds() / 3600
            if time_gap > 4:
                initiations_by_participant[curr_msg['sender']] += 1
        
        # Back-and-forth analysis (consecutive message exchanges)
        exchanges = []
        current_exchange = []
        
        for i in range(len(messages)):
            if i == 0:
                current_exchange.append(messages[i])
            else:
                prev_sender = messages[i-1]['sender']
                curr_sender = messages[i]['sender']
                
                if prev_sender != curr_sender:
                    current_exchange.append(messages[i])
                else:
                    # Same sender, end exchange if it has >= 2 messages
                    if len(current_exchange) >= 2:
                        exchanges.append(len(current_exchange))
                    current_exchange = [messages[i]]
        
        if len(current_exchange) >= 2:
            exchanges.append(len(current_exchange))
        
        avg_exchange_length = sum(exchanges) / len(exchanges) if exchanges else 0
        
        return {
            'response_time_analysis': avg_response_by_participant,
            'conversation_initiations': dict(initiations_by_participant),
            'back_and_forth_metrics': {
                'total_exchanges': len(exchanges),
                'average_exchange_length': round(avg_exchange_length, 2),
                'longest_exchange': max(exchanges) if exchanges else 0
            }
        }
    
    def _analyze_sentiment_distribution(self, messages: List[Dict], participants: Dict) -> Dict:
        """Analyze sentiment patterns using simple lexicon-based approach (free)"""
        # Simple positive/negative word lists (free approach)
        positive_words = {
            'love', 'happy', 'great', 'good', 'excellent', 'wonderful', 'amazing',
            'awesome', 'fantastic', 'perfect', 'best', 'beautiful', 'thanks', 'thank',
            'appreciate', 'joy', 'excited', 'glad', 'pleased', 'delighted', 'brilliant',
            'yay', 'haha', 'lol', 'lmao', 'cool', 'nice', 'sweet', 'fun'
        }
        
        negative_words = {
            'hate', 'sad', 'bad', 'terrible', 'awful', 'horrible', 'worst', 'angry',
            'mad', 'upset', 'annoyed', 'frustrated', 'disappointed', 'sorry', 'difficult',
            'hard', 'problem', 'issue', 'wrong', 'fail', 'failed', 'suck', 'sucks',
            'damn', 'hell', 'fuck', 'shit', 'stupid', 'dumb', 'boring', 'bored'
        }
        
        sentiment_by_participant = {}
        
        for name in participants:
            participant_msgs = [msg for msg in messages if msg['sender'] == name]
            
            positive_count = 0
            negative_count = 0
            neutral_count = 0
            
            for msg in participant_msgs:
                text_lower = msg['message'].lower()
                words = re.findall(r'\b\w+\b', text_lower)
                
                pos = sum(1 for word in words if word in positive_words)
                neg = sum(1 for word in words if word in negative_words)
                
                if pos > neg:
                    positive_count += 1
                elif neg > pos:
                    negative_count += 1
                else:
                    neutral_count += 1
            
            total = len(participant_msgs)
            sentiment_by_participant[name] = {
                'positive_messages': positive_count,
                'negative_messages': negative_count,
                'neutral_messages': neutral_count,
                'positive_ratio': round(positive_count / total, 3) if total > 0 else 0,
                'negative_ratio': round(negative_count / total, 3) if total > 0 else 0,
                'neutral_ratio': round(neutral_count / total, 3) if total > 0 else 0
            }
        
        return sentiment_by_participant
    
    def _detect_red_flags(
        self,
        messages: List[Dict],
        participants: Dict,
        patterns: Dict,
        engagement: Dict
    ) -> Dict:
        """Detect potential red flags in communication patterns"""
        red_flags = []
        warnings = []
        
        # Red Flag 1: Significant imbalance in message counts
        if len(participants) == 2:
            counts = list(participants.values())
            if len(counts) == 2:
                ratio = max(counts[0]['message_count'], counts[1]['message_count']) / max(1, min(counts[0]['message_count'], counts[1]['message_count']))
                
                if ratio > 3:
                    red_flags.append({
                        'type': 'message_imbalance',
                        'severity': 'high',
                        'description': f"Significant message imbalance: one person sends {ratio:.1f}x more messages",
                        'suggestion': "This may indicate unequal investment in the conversation"
                    })
                elif ratio > 2:
                    warnings.append({
                        'type': 'message_imbalance',
                        'severity': 'medium',
                        'description': f"Message imbalance detected: one person sends {ratio:.1f}x more messages",
                        'suggestion': "Consider if both people are equally engaged"
                    })
        
        # Red Flag 2: Slow or declining response times
        response_analysis = engagement.get('response_time_analysis', {})
        for name, times in response_analysis.items():
            avg_minutes = times.get('average_minutes', 0)
            if avg_minutes > 180:  # > 3 hours average
                warnings.append({
                    'type': 'slow_responses',
                    'severity': 'medium',
                    'description': f"{name} takes an average of {avg_minutes/60:.1f} hours to respond",
                    'suggestion': "Delayed responses might indicate low prioritization"
                })
        
        # Red Flag 3: Drop in message frequency (compare recent vs historical)
        if len(messages) > 20:
            # Split into recent (last 25%) and historical (first 75%)
            split_point = int(len(messages) * 0.75)
            historical_msgs = messages[:split_point]
            recent_msgs = messages[split_point:]
            
            historical_period = (historical_msgs[-1]['timestamp'] - historical_msgs[0]['timestamp']).days or 1
            recent_period = (recent_msgs[-1]['timestamp'] - recent_msgs[0]['timestamp']).days or 1
            
            historical_rate = len(historical_msgs) / historical_period
            recent_rate = len(recent_msgs) / recent_period
            
            if recent_rate < historical_rate * 0.5:  # 50% drop
                red_flags.append({
                    'type': 'frequency_drop',
                    'severity': 'high',
                    'description': f"Messaging frequency dropped by {((historical_rate - recent_rate) / historical_rate * 100):.0f}%",
                    'suggestion': "Significant decrease in communication may indicate fading interest"
                })
        
        # Red Flag 4: One-sided conversation initiation
        initiations = engagement.get('conversation_initiations', {})
        if len(initiations) == 2:
            counts = list(initiations.values())
            if max(counts) / max(1, min(counts)) > 4:
                red_flags.append({
                    'type': 'one_sided_initiation',
                    'severity': 'high',
                    'description': "One person initiates conversations 4x more often",
                    'suggestion': "Consider if the other person is reciprocating interest"
                })
        
        # Red Flag 5: Low engagement (short responses, no questions)
        for name in participants:
            participant_msgs = [msg for msg in messages if msg['sender'] == name]
            if len(participant_msgs) > 5:
                avg_length = sum(len(msg['message']) for msg in participant_msgs) / len(participant_msgs)
                question_count = sum(1 for msg in participant_msgs if '?' in msg['message'])
                question_ratio = question_count / len(participant_msgs)
                
                if avg_length < 15 and question_ratio < 0.1:
                    warnings.append({
                        'type': 'low_engagement',
                        'severity': 'medium',
                        'description': f"{name} sends short messages (avg {avg_length:.0f} chars) with few questions",
                        'suggestion': "Short, non-inquisitive responses may indicate low engagement"
                    })
        
        return {
            'red_flags': red_flags,
            'warnings': warnings,
            'total_red_flags': len(red_flags),
            'total_warnings': len(warnings),
            'overall_health': 'healthy' if len(red_flags) == 0 else ('concerning' if len(red_flags) < 3 else 'unhealthy')
        }
    
    def _analyze_emojis(self, messages: List[Dict], participants: Dict) -> Dict:
        """Analyze emoji usage patterns"""
        emoji_by_participant = {}
        
        for name in participants:
            participant_msgs = [msg for msg in messages if msg['sender'] == name]
            
            all_emojis = []
            for msg in participant_msgs:
                emojis = emoji.emoji_list(msg['message'])
                all_emojis.extend([e['emoji'] for e in emojis])
            
            emoji_counter = Counter(all_emojis)
            
            emoji_by_participant[name] = {
                'total_emojis': len(all_emojis),
                'unique_emojis': len(emoji_counter),
                'emojis_per_message': round(len(all_emojis) / len(participant_msgs), 2) if participant_msgs else 0,
                'most_used_emojis': [
                    {'emoji': em, 'count': count}
                    for em, count in emoji_counter.most_common(10)
                ]
            }
        
        return emoji_by_participant
    
    def _analyze_time_patterns(self, messages: List[Dict], participants: Dict) -> Dict:
        """Analyze time-based patterns"""
        # Response time trends over time
        time_periods = defaultdict(list)
        
        for i in range(1, len(messages)):
            prev_msg = messages[i-1]
            curr_msg = messages[i]
            
            if prev_msg['sender'] != curr_msg['sender']:
                time_diff = (curr_msg['timestamp'] - prev_msg['timestamp']).total_seconds() / 60
                
                # Group by week
                week = curr_msg['timestamp'].strftime('%Y-W%W')
                time_periods[week].append(time_diff)
        
        trends = {}
        for week, times in time_periods.items():
            trends[week] = {
                'average_response_minutes': round(sum(times) / len(times), 2) if times else 0,
                'messages': len(times)
            }
        
        return {
            'weekly_response_trends': trends
        }
    
    def _empty_analysis(self) -> Dict:
        """Return empty analysis structure"""
        return {
            'participants': {},
            'basic_stats': {},
            'messaging_patterns': {},
            'engagement_metrics': {},
            'sentiment_analysis': {},
            'red_flags': {'red_flags': [], 'warnings': [], 'total_red_flags': 0, 'total_warnings': 0},
            'emoji_stats': {},
            'time_analysis': {},
            'conversation_period': {}
        }


# Singleton instance
chat_analyzer = ChatAnalyzer()

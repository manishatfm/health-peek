"""
Chat Import Parser Service
Supports multiple chat formats: WhatsApp, Telegram, Discord, iMessage, and more
Extracts messages, timestamps, participants, and metadata
"""

import re
from datetime import datetime
from typing import List, Dict, Tuple, Optional
import logging

logger = logging.getLogger(__name__)


class ChatParser:
    """Base parser class for chat imports"""
    
    @staticmethod
    def detect_format(content: str) -> str:
        """
        Detect chat format from content
        Returns: 'whatsapp', 'telegram', 'discord', 'imessage', 'generic', or 'unknown'
        """
        lines = content.strip().split('\n')[:20]  # Check first 20 lines
        
        # WhatsApp patterns
        whatsapp_patterns = [
            r'\d{1,2}/\d{1,2}/\d{2,4},?\s+\d{1,2}:\d{2}\s*[AP]?M?\s*-\s*',  # 12/31/2023, 10:30 PM -
            r'\[\d{1,2}/\d{1,2}/\d{2,4},?\s+\d{1,2}:\d{2}:\d{2}\s*[AP]?M?\]',  # [12/31/2023, 10:30:45 PM]
        ]
        
        # Telegram patterns
        telegram_patterns = [
            r'\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}\s+[A-Za-z]',  # 31.12.2023 22:30 Name
            r'\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}\s*-',  # 31.12.2023 22:30 -
            r'\[\d{2}:\d{2}:\d{2}\]',  # [22:30:45]
        ]
        
        # Discord patterns
        discord_patterns = [
            r'\[.*?\]\s+\d{1,2}-\w{3}-\d{2}\s+\d{1,2}:\d{2}\s+[AP]M',  # [Username] 31-Dec-23 10:30 PM
        ]
        
        # iMessage/Messages patterns
        imessage_patterns = [
            r'\[\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\]',  # [2023-12-31 22:30:45]
        ]
        
        for line in lines:
            # Check WhatsApp
            for pattern in whatsapp_patterns:
                if re.search(pattern, line):
                    return 'whatsapp'
            
            # Check Telegram
            for pattern in telegram_patterns:
                if re.search(pattern, line):
                    return 'telegram'
            
            # Check Discord
            for pattern in discord_patterns:
                if re.search(pattern, line):
                    return 'discord'
            
            # Check iMessage
            for pattern in imessage_patterns:
                if re.search(pattern, line):
                    return 'imessage'
        
        # If has timestamps and names, it's generic chat format
        if any(':' in line and len(line.split(':')) >= 2 for line in lines[:5]):
            return 'generic'
        
        return 'unknown'
    
    @staticmethod
    def parse_whatsapp(content: str) -> List[Dict]:
        """
        Parse WhatsApp chat export
        Format: 12/31/2023, 10:30 PM - John: Message text
        """
        messages = []
        
        # Multiple WhatsApp patterns
        patterns = [
            # Pattern 1: 12/31/2023, 10:30 PM - John: Message
            r'(\d{1,2}/\d{1,2}/\d{2,4}),?\s+(\d{1,2}:\d{2})\s*([AP]M)?\s*-\s*([^:]+):\s*(.+)',
            # Pattern 2: [12/31/2023, 10:30:45 PM] John: Message
            r'\[(\d{1,2}/\d{1,2}/\d{2,4}),?\s+(\d{1,2}:\d{2}:\d{2})\s*([AP]M)?\]\s*([^:]+):\s*(.+)',
            # Pattern 3: 2023-12-31 22:30:45 - John: Message
            r'(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})\s*-\s*([^:]+):\s*(.+)',
        ]
        
        lines = content.split('\n')
        current_message = None
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Try each pattern
            matched = False
            for pattern in patterns:
                match = re.match(pattern, line)
                if match:
                    # Save previous message if exists
                    if current_message:
                        messages.append(current_message)
                    
                    # Parse matched groups
                    groups = match.groups()
                    
                    if len(groups) == 5:  # Pattern 1 or 2
                        date_str, time_str, ampm, sender, text = groups
                        timestamp_str = f"{date_str} {time_str}"
                        if ampm:
                            timestamp_str += f" {ampm}"
                    else:  # Pattern 3
                        date_str, time_str, sender, text = groups
                        timestamp_str = f"{date_str} {time_str}"
                    
                    # Try to parse timestamp
                    timestamp = ChatParser._parse_timestamp(timestamp_str)
                    
                    current_message = {
                        'timestamp': timestamp,
                        'sender': sender.strip(),
                        'message': text.strip(),
                        'platform': 'whatsapp'
                    }
                    matched = True
                    break
            
            # If not matched, it's a continuation of previous message
            if not matched and current_message:
                current_message['message'] += '\n' + line
        
        # Add last message
        if current_message:
            messages.append(current_message)
        
        return messages
    
    @staticmethod
    def parse_telegram(content: str) -> List[Dict]:
        """
        Parse Telegram chat export
        Formats supported:
        - 31.12.2023 22:30 - John: Message
        - 31.12.2023 22:30 John Smith
          Message text (on next line)
        - [22:30:45] John: Message
        """
        messages = []
        
        lines = content.split('\n')
        i = 0
        
        while i < len(lines):
            line = lines[i].strip()
            
            if not line:
                i += 1
                continue
            
            # Pattern 1: 31.12.2023 22:30 John Smith (message on next line)
            match = re.match(r'(\d{2}\.\d{2}\.\d{4})\s+(\d{2}:\d{2})\s+(.+)', line)
            if match:
                date_str, time_str, sender = match.groups()
                timestamp_str = f"{date_str} {time_str}"
                timestamp = ChatParser._parse_timestamp(timestamp_str, format_hint='telegram')
                
                # Get message from next line(s)
                message_lines = []
                i += 1
                while i < len(lines):
                    next_line = lines[i].strip()
                    # Check if next line is a new message header
                    if re.match(r'\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}\s+.+', next_line):
                        break
                    if next_line:
                        message_lines.append(next_line)
                    i += 1
                
                if message_lines:
                    messages.append({
                        'timestamp': timestamp,
                        'sender': sender.strip(),
                        'message': '\n'.join(message_lines),
                        'platform': 'telegram'
                    })
                continue
            
            # Pattern 2: 31.12.2023 22:30 - John: Message (inline)
            match = re.match(r'(\d{2}\.\d{2}\.\d{4})\s+(\d{2}:\d{2})\s*-\s*([^:]+):\s*(.+)', line)
            if match:
                date_str, time_str, sender, text = match.groups()
                timestamp_str = f"{date_str} {time_str}"
                timestamp = ChatParser._parse_timestamp(timestamp_str, format_hint='telegram')
                
                messages.append({
                    'timestamp': timestamp,
                    'sender': sender.strip(),
                    'message': text.strip(),
                    'platform': 'telegram'
                })
                i += 1
                continue
            
            # Pattern 3: [22:30:45] John: Message
            match = re.match(r'\[(\d{2}:\d{2}:\d{2})\]\s*([^:]+):\s*(.+)', line)
            if match:
                time_str, sender, text = match.groups()
                # Use today's date if only time provided
                date_str = datetime.now().strftime('%d.%m.%Y')
                timestamp_str = f"{date_str} {time_str}"
                timestamp = ChatParser._parse_timestamp(timestamp_str, format_hint='telegram')
                
                messages.append({
                    'timestamp': timestamp,
                    'sender': sender.strip(),
                    'message': text.strip(),
                    'platform': 'telegram'
                })
                i += 1
                continue
            
            # If no pattern matched, move to next line
            i += 1
        
        return messages
    
    @staticmethod
    def parse_generic(content: str) -> List[Dict]:
        """
        Parse generic chat format
        Tries to extract sender and message from common patterns
        """
        messages = []
        lines = content.split('\n')
        
        # Generic pattern: Sender: Message or [Timestamp] Sender: Message
        pattern = r'(?:\[?([^\]]*)\]?\s*)?([^:]+):\s*(.+)'
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            match = re.match(pattern, line)
            if match:
                timestamp_str, sender, text = match.groups()
                
                # Try to parse timestamp if provided
                timestamp = None
                if timestamp_str:
                    timestamp = ChatParser._parse_timestamp(timestamp_str.strip())
                
                if not timestamp:
                    timestamp = datetime.now()
                
                messages.append({
                    'timestamp': timestamp,
                    'sender': sender.strip(),
                    'message': text.strip(),
                    'platform': 'generic'
                })
        
        return messages
    
    @staticmethod
    def _parse_timestamp(timestamp_str: str, format_hint: str = None) -> datetime:
        """
        Try to parse timestamp from various formats
        """
        formats = [
            # WhatsApp formats
            '%m/%d/%Y, %I:%M %p',
            '%m/%d/%Y %I:%M %p',
            '%m/%d/%y, %I:%M %p',
            '%m/%d/%y %I:%M %p',
            '%d/%m/%Y, %H:%M',
            '%d/%m/%Y %H:%M',
            '%Y-%m-%d %H:%M:%S',
            '%m/%d/%Y, %I:%M:%S %p',
            
            # Telegram formats
            '%d.%m.%Y %H:%M',
            '%d.%m.%Y %H:%M:%S',
            
            # Generic formats
            '%Y-%m-%d %H:%M:%S',
            '%Y-%m-%d %H:%M',
            '%d-%m-%Y %H:%M:%S',
            '%d-%m-%Y %H:%M',
            '%H:%M:%S',
            '%H:%M',
        ]
        
        # Add format hint to front of list
        if format_hint == 'telegram':
            formats = ['%d.%m.%Y %H:%M'] + formats
        elif format_hint == 'whatsapp':
            formats = ['%m/%d/%Y, %I:%M %p'] + formats
        
        for fmt in formats:
            try:
                return datetime.strptime(timestamp_str, fmt)
            except ValueError:
                continue
        
        # If all fail, try removing special characters and trying again
        clean_timestamp = re.sub(r'[^\w\s:/]', '', timestamp_str)
        for fmt in formats:
            try:
                return datetime.strptime(clean_timestamp, fmt)
            except ValueError:
                continue
        
        # Last resort: return current time
        logger.warning(f"Could not parse timestamp: {timestamp_str}")
        return datetime.now()
    
    @staticmethod
    def parse(content: str, format_type: str = None) -> Tuple[List[Dict], str]:
        """
        Parse chat content and return messages
        
        Args:
            content: Raw chat export text
            format_type: Optional format hint ('whatsapp', 'telegram', etc.)
        
        Returns:
            Tuple of (messages list, detected format)
        """
        # Detect format if not provided
        if not format_type:
            format_type = ChatParser.detect_format(content)
        
        logger.info(f"Parsing chat with format: {format_type}")
        
        # Parse based on format
        if format_type == 'whatsapp':
            messages = ChatParser.parse_whatsapp(content)
        elif format_type == 'telegram':
            messages = ChatParser.parse_telegram(content)
        elif format_type in ['generic', 'unknown']:
            messages = ChatParser.parse_generic(content)
        else:
            # Try generic parser as fallback
            messages = ChatParser.parse_generic(content)
        
        return messages, format_type


# Singleton instance
chat_parser = ChatParser()

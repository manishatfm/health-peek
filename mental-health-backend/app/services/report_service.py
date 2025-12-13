"""
Professional Mental Health Report Generation Service

Generates comprehensive PDF reports including:
- Personal Mental Health Report (for self-reflection)
- Clinical Summary Report (for healthcare providers)
- Data Charts and Visualizations
"""

from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.pdfgen import canvas
from datetime import datetime, timedelta
from typing import List, Dict, Any
import io
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from collections import Counter, defaultdict
import logging

logger = logging.getLogger(__name__)


class MentalHealthReportGenerator:
    """Generate professional mental health reports in PDF format"""
    
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
    
    def _setup_custom_styles(self):
        """Create custom paragraph styles for professional reports"""
        # Title style
        self.styles.add(ParagraphStyle(
            name='ReportTitle',
            parent=self.styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#1a5490'),
            spaceAfter=30,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        ))
        
        # Section header style
        self.styles.add(ParagraphStyle(
            name='SectionHeader',
            parent=self.styles['Heading2'],
            fontSize=16,
            textColor=colors.HexColor('#2c5f8d'),
            spaceAfter=12,
            spaceBefore=20,
            fontName='Helvetica-Bold'
        ))
        
        # Clinical style
        self.styles.add(ParagraphStyle(
            name='Clinical',
            parent=self.styles['Normal'],
            fontSize=10,
            textColor=colors.black,
            spaceAfter=10,
            alignment=TA_JUSTIFY,
            fontName='Helvetica'
        ))
        
        # Recommendation style
        self.styles.add(ParagraphStyle(
            name='Recommendation',
            parent=self.styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#2d5016'),
            spaceAfter=8,
            leftIndent=20,
            fontName='Helvetica'
        ))
        
        # Footer style
        self.styles.add(ParagraphStyle(
            name='Footer',
            parent=self.styles['Normal'],
            fontSize=8,
            textColor=colors.grey,
            alignment=TA_CENTER
        ))
    
    def _add_header_footer(self, canvas_obj, doc, report_type: str):
        """Add header and footer to each page"""
        canvas_obj.saveState()
        
        # Header
        canvas_obj.setFont('Helvetica-Bold', 10)
        canvas_obj.setFillColor(colors.HexColor('#1a5490'))
        canvas_obj.drawString(inch, letter[1] - 0.5*inch, f"Mental Health {report_type}")
        
        # Footer
        canvas_obj.setFont('Helvetica', 8)
        canvas_obj.setFillColor(colors.grey)
        footer_text = f"Generated on {datetime.now().strftime('%B %d, %Y')} | Page {doc.page}"
        canvas_obj.drawRightString(letter[0] - inch, 0.5*inch, footer_text)
        
        # Confidential notice
        canvas_obj.setFillColor(colors.red)
        canvas_obj.drawCentredString(letter[0]/2, 0.3*inch, "CONFIDENTIAL - PROTECTED HEALTH INFORMATION")
        
        canvas_obj.restoreState()
    
    def _create_mood_chart(self, analyses: List[Dict]) -> str:
        """Create mood trends chart and return image path"""
        try:
            # Prepare data
            dates = []
            sentiments = []
            confidences = []
            
            for analysis in sorted(analyses, key=lambda x: x.get('timestamp', '')):
                timestamp = analysis.get('timestamp')
                if timestamp:
                    try:
                        # Handle different timestamp formats
                        if isinstance(timestamp, datetime):
                            dates.append(timestamp)
                        elif isinstance(timestamp, str):
                            dates.append(datetime.fromisoformat(timestamp.replace('Z', '+00:00')))
                        else:
                            continue
                    except (ValueError, TypeError) as e:
                        logger.warning(f"Failed to parse timestamp in chart: {timestamp}, error: {e}")
                        continue
                    
                    # Convert sentiment to numeric value
                    sentiment = analysis.get('sentiment', 'neutral').lower()
                    confidence = analysis.get('confidence', 0.5)
                    
                    if sentiment == 'positive':
                        sentiments.append(confidence)
                    elif sentiment == 'negative':
                        sentiments.append(-confidence)
                    else:
                        sentiments.append(0)
                    
                    confidences.append(confidence)
            
            if not dates:
                return None
            
            # Create figure
            fig, ax = plt.subplots(figsize=(10, 4))
            
            # Plot sentiment line
            ax.plot(dates, sentiments, marker='o', linewidth=2, markersize=4, 
                   color='#2c5f8d', label='Sentiment Score')
            
            # Add zero line
            ax.axhline(y=0, color='gray', linestyle='--', alpha=0.5)
            
            # Shade positive and negative regions
            ax.fill_between(dates, sentiments, 0, where=[s >= 0 for s in sentiments],
                           interpolate=True, alpha=0.3, color='green', label='Positive')
            ax.fill_between(dates, sentiments, 0, where=[s < 0 for s in sentiments],
                           interpolate=True, alpha=0.3, color='red', label='Negative')
            
            # Formatting
            ax.set_xlabel('Date', fontsize=10)
            ax.set_ylabel('Sentiment Score', fontsize=10)
            ax.set_title('Mood Trends Over Time', fontsize=12, fontweight='bold')
            ax.legend(loc='upper left', fontsize=8)
            ax.grid(True, alpha=0.3)
            
            # Format x-axis
            ax.xaxis.set_major_formatter(mdates.DateFormatter('%m/%d'))
            plt.xticks(rotation=45)
            
            plt.tight_layout()
            
            # Save to BytesIO
            img_buffer = io.BytesIO()
            plt.savefig(img_buffer, format='png', dpi=150, bbox_inches='tight')
            img_buffer.seek(0)
            plt.close()
            
            return img_buffer
            
        except Exception as e:
            logger.error(f"Error creating mood chart: {e}")
            return None
    
    def _create_emotion_distribution_chart(self, analyses: List[Dict]) -> io.BytesIO:
        """Create emotion distribution pie chart"""
        try:
            # Count emotions
            emotion_counts = Counter()
            
            for analysis in analyses:
                emotions = analysis.get('emotions', {})
                if emotions:
                    # Get dominant emotion
                    dominant = max(emotions.items(), key=lambda x: x[1]) if emotions else None
                    if dominant:
                        emotion_counts[dominant[0]] += 1
            
            if not emotion_counts:
                return None
            
            # Create pie chart
            fig, ax = plt.subplots(figsize=(8, 6))
            
            colors_map = {
                'joy': '#4CAF50',
                'sadness': '#2196F3',
                'anger': '#F44336',
                'fear': '#9C27B0',
                'surprise': '#FF9800',
                'neutral': '#9E9E9E'
            }
            
            labels = list(emotion_counts.keys())
            sizes = list(emotion_counts.values())
            chart_colors = [colors_map.get(label.lower(), '#9E9E9E') for label in labels]
            
            ax.pie(sizes, labels=labels, colors=chart_colors, autopct='%1.1f%%',
                  startangle=90, textprops={'fontsize': 10})
            ax.set_title('Emotion Distribution', fontsize=12, fontweight='bold')
            
            plt.tight_layout()
            
            # Save to BytesIO
            img_buffer = io.BytesIO()
            plt.savefig(img_buffer, format='png', dpi=150, bbox_inches='tight')
            img_buffer.seek(0)
            plt.close()
            
            return img_buffer
            
        except Exception as e:
            logger.error(f"Error creating emotion chart: {e}")
            return None
    
    def _create_activity_chart(self, analyses: List[Dict]) -> io.BytesIO:
        """Create messaging activity chart"""
        try:
            # Group by date
            daily_counts = defaultdict(int)
            
            for analysis in analyses:
                timestamp = analysis.get('timestamp')
                if timestamp:
                    try:
                        # Handle different timestamp formats
                        if isinstance(timestamp, datetime):
                            date = timestamp.date()
                        elif isinstance(timestamp, str):
                            date = datetime.fromisoformat(timestamp.replace('Z', '+00:00')).date()
                        else:
                            continue
                        daily_counts[date] += 1
                    except (ValueError, TypeError) as e:
                        logger.warning(f"Failed to parse timestamp in activity chart: {timestamp}, error: {e}")
                        continue
            
            if not daily_counts:
                return None
            
            # Sort by date
            dates = sorted(daily_counts.keys())
            counts = [daily_counts[d] for d in dates]
            
            # Create bar chart
            fig, ax = plt.subplots(figsize=(10, 4))
            
            ax.bar(dates, counts, color='#2c5f8d', alpha=0.7)
            
            # Formatting
            ax.set_xlabel('Date', fontsize=10)
            ax.set_ylabel('Messages Analyzed', fontsize=10)
            ax.set_title('Daily Analysis Activity', fontsize=12, fontweight='bold')
            ax.grid(True, alpha=0.3, axis='y')
            
            # Format x-axis
            ax.xaxis.set_major_formatter(mdates.DateFormatter('%m/%d'))
            plt.xticks(rotation=45)
            
            plt.tight_layout()
            
            # Save to BytesIO
            img_buffer = io.BytesIO()
            plt.savefig(img_buffer, format='png', dpi=150, bbox_inches='tight')
            img_buffer.seek(0)
            plt.close()
            
            return img_buffer
            
        except Exception as e:
            logger.error(f"Error creating activity chart: {e}")
            return None
    
    def _calculate_statistics(self, analyses: List[Dict]) -> Dict[str, Any]:
        """Calculate comprehensive statistics from analyses"""
        if not analyses:
            return {}
        
        stats = {
            'total_analyses': len(analyses),
            'date_range': {
                'start': None,
                'end': None,
                'days': 0
            },
            'sentiment_distribution': {
                'positive': 0,
                'neutral': 0,
                'negative': 0
            },
            'emotion_counts': Counter(),
            'average_confidence': 0,
            'risk_indicators': [],
            'patterns': []
        }
        
        # Calculate sentiment distribution and confidence
        total_confidence = 0
        negative_count = 0
        high_confidence_negative = 0
        
        timestamps = []
        
        for analysis in analyses:
            # Sentiment
            sentiment = analysis.get('sentiment', 'neutral').lower()
            stats['sentiment_distribution'][sentiment] = \
                stats['sentiment_distribution'].get(sentiment, 0) + 1
            
            # Confidence
            confidence = analysis.get('confidence', 0)
            total_confidence += confidence
            
            # Risk indicators
            if sentiment == 'negative':
                negative_count += 1
                if confidence > 0.7:
                    high_confidence_negative += 1
            
            # Emotions
            emotions = analysis.get('emotions', {})
            if emotions:
                dominant = max(emotions.items(), key=lambda x: x[1])[0] if emotions else None
                if dominant:
                    stats['emotion_counts'][dominant] += 1
            
            # Timestamps
            timestamp = analysis.get('timestamp')
            if timestamp:
                try:
                    # Handle different timestamp formats
                    if isinstance(timestamp, datetime):
                        timestamps.append(timestamp)
                    elif isinstance(timestamp, str):
                        # Try to parse ISO format
                        timestamps.append(datetime.fromisoformat(timestamp.replace('Z', '+00:00')))
                    else:
                        logger.warning(f"Unexpected timestamp type: {type(timestamp)}")
                except (ValueError, TypeError) as e:
                    logger.warning(f"Failed to parse timestamp: {timestamp}, error: {e}")
        
        # Average confidence
        stats['average_confidence'] = total_confidence / len(analyses) if analyses else 0
        
        # Date range
        if timestamps:
            timestamps.sort()
            stats['date_range']['start'] = timestamps[0]
            stats['date_range']['end'] = timestamps[-1]
            stats['date_range']['days'] = (timestamps[-1] - timestamps[0]).days + 1
        
        # Risk indicators
        negative_ratio = negative_count / len(analyses)
        if negative_ratio > 0.6:
            stats['risk_indicators'].append({
                'level': 'High',
                'description': f'Predominantly negative sentiment ({negative_ratio*100:.1f}% of messages)'
            })
        elif negative_ratio > 0.4:
            stats['risk_indicators'].append({
                'level': 'Moderate',
                'description': f'Elevated negative sentiment ({negative_ratio*100:.1f}% of messages)'
            })
        
        if high_confidence_negative > 5:
            stats['risk_indicators'].append({
                'level': 'High',
                'description': f'Multiple high-confidence negative expressions detected ({high_confidence_negative} instances)'
            })
        
        # Patterns
        if negative_ratio > 0.5:
            stats['patterns'].append('Chronic negative emotional pattern')
        
        if stats['emotion_counts']:
            dominant_emotion = stats['emotion_counts'].most_common(1)[0]
            if dominant_emotion[1] > len(analyses) * 0.4:
                stats['patterns'].append(f'Dominant emotion: {dominant_emotion[0]} ({dominant_emotion[1]} instances)')
        
        return stats
    
    async def generate_personal_report(
        self,
        user_info: Dict[str, Any],
        analyses: List[Dict],
        recommendations: List[Dict]
    ) -> io.BytesIO:
        """Generate Personal Mental Health Report for self-reflection"""
        
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=inch, bottomMargin=inch)
        story = []
        
        # Calculate statistics
        stats = self._calculate_statistics(analyses)
        
        # Title Page
        story.append(Paragraph("Personal Mental Health Report", self.styles['ReportTitle']))
        story.append(Spacer(1, 0.3*inch))
        
        # Report info
        report_date = datetime.now().strftime("%B %d, %Y")
        info_data = [
            ["Report Date:", report_date],
            ["Report Period:", f"{stats['date_range']['days']} days" if stats.get('date_range') else "N/A"],
            ["Total Analyses:", str(stats['total_analyses'])],
            ["User:", user_info.get('name', 'User')]
        ]
        
        info_table = Table(info_data, colWidths=[2*inch, 4*inch])
        info_table.setStyle(TableStyle([
            ('FONT', (0, 0), (-1, -1), 'Helvetica', 10),
            ('FONT', (0, 0), (0, -1), 'Helvetica-Bold', 10),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#2c5f8d')),
        ]))
        
        story.append(info_table)
        story.append(Spacer(1, 0.5*inch))
        
        # Introduction
        story.append(Paragraph("About This Report", self.styles['SectionHeader']))
        intro_text = """
        This personal mental health report provides insights into your emotional wellbeing based on 
        your communication patterns and self-reported feelings. This report is designed to help you 
        better understand your mental health journey and identify areas for personal growth and support.
        """
        story.append(Paragraph(intro_text, self.styles['Clinical']))
        story.append(Spacer(1, 0.3*inch))
        
        # Mood Trends Chart
        story.append(PageBreak())
        story.append(Paragraph("Your Mood Trends", self.styles['SectionHeader']))
        
        mood_chart = self._create_mood_chart(analyses)
        if mood_chart:
            story.append(Image(mood_chart, width=6.5*inch, height=3*inch))
        story.append(Spacer(1, 0.3*inch))
        
        # Sentiment Summary
        story.append(Paragraph("Emotional Summary", self.styles['SectionHeader']))
        
        total = stats['total_analyses']
        sentiment_data = [
            ["Sentiment", "Count", "Percentage"],
            ["Positive", str(stats['sentiment_distribution']['positive']), 
             f"{stats['sentiment_distribution']['positive']/total*100:.1f}%"],
            ["Neutral", str(stats['sentiment_distribution']['neutral']),
             f"{stats['sentiment_distribution']['neutral']/total*100:.1f}%"],
            ["Negative", str(stats['sentiment_distribution']['negative']),
             f"{stats['sentiment_distribution']['negative']/total*100:.1f}%"]
        ]
        
        sentiment_table = Table(sentiment_data, colWidths=[2*inch, 1.5*inch, 1.5*inch])
        sentiment_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2c5f8d')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f0f0f0')])
        ]))
        
        story.append(sentiment_table)
        story.append(Spacer(1, 0.3*inch))
        
        # Emotion Distribution Chart
        emotion_chart = self._create_emotion_distribution_chart(analyses)
        if emotion_chart:
            story.append(PageBreak())
            story.append(Paragraph("Emotion Distribution", self.styles['SectionHeader']))
            story.append(Image(emotion_chart, width=5*inch, height=4*inch))
            story.append(Spacer(1, 0.3*inch))
        
        # Activity Chart
        activity_chart = self._create_activity_chart(analyses)
        if activity_chart:
            story.append(Paragraph("Your Analysis Activity", self.styles['SectionHeader']))
            story.append(Image(activity_chart, width=6.5*inch, height=3*inch))
            story.append(Spacer(1, 0.3*inch))
        
        # Key Patterns
        if stats.get('patterns'):
            story.append(PageBreak())
            story.append(Paragraph("Identified Patterns", self.styles['SectionHeader']))
            
            for pattern in stats['patterns']:
                story.append(Paragraph(f"• {pattern}", self.styles['Normal']))
            
            story.append(Spacer(1, 0.3*inch))
        
        # Personalized Recommendations
        if recommendations:
            story.append(Paragraph("Personalized Recommendations", self.styles['SectionHeader']))
            
            rec_text = """
            Based on your emotional patterns and communication history, here are personalized 
            recommendations to support your mental wellbeing:
            """
            story.append(Paragraph(rec_text, self.styles['Clinical']))
            story.append(Spacer(1, 0.2*inch))
            
            for i, rec in enumerate(recommendations[:6], 1):
                priority_color = {
                    'Critical': colors.red,
                    'High': colors.orange,
                    'Medium': colors.blue,
                    'Low': colors.green
                }.get(rec.get('priority', 'Medium'), colors.blue)
                
                story.append(Paragraph(
                    f"<b>{i}. {rec['title']}</b> <font color='{priority_color.hexval()}'>[{rec.get('priority', 'Medium')} Priority]</font>",
                    self.styles['Normal']
                ))
                story.append(Paragraph(rec['description'], self.styles['Recommendation']))
                story.append(Spacer(1, 0.15*inch))
        
        # Wellness Tips
        story.append(PageBreak())
        story.append(Paragraph("General Wellness Tips", self.styles['SectionHeader']))
        
        wellness_tips = [
            "Practice mindfulness meditation for 10-15 minutes daily to reduce stress and improve emotional regulation.",
            "Maintain a consistent sleep schedule of 7-9 hours per night to support mental health.",
            "Engage in regular physical activity, which has been shown to reduce symptoms of depression and anxiety.",
            "Connect with supportive friends and family members regularly.",
            "Consider journaling to process emotions and track your mental health journey.",
            "Limit caffeine and alcohol intake, which can impact mood and sleep quality.",
            "Seek professional help when needed - therapy and counseling are valuable tools for mental wellness."
        ]
        
        for tip in wellness_tips:
            story.append(Paragraph(f"• {tip}", self.styles['Normal']))
            story.append(Spacer(1, 0.1*inch))
        
        # Resources
        story.append(Spacer(1, 0.3*inch))
        story.append(Paragraph("Crisis Resources", self.styles['SectionHeader']))
        
        resources_text = """
        <b>If you are in crisis or experiencing thoughts of self-harm:</b><br/>
        • National Suicide Prevention Lifeline: 09152987821 (India)<br/>
        • Crisis Text Line: Text HOME to 741741<br/>
        • International Association for Suicide Prevention: https://www.iasp.info/resources/Crisis_Centres/<br/><br/>
        
        <b>Mental Health Resources:</b><br/>
        • SAMHSA National Helpline: 1-800-662-4357 (Free, confidential, 24/7)<br/>
        • NAMI Helpline: 1-800-950-6264<br/>
        • Psychology Today Therapist Finder: https://www.psychologytoday.com/
        """
        
        story.append(Paragraph(resources_text, self.styles['Normal']))
        
        # Build PDF
        doc.build(
            story,
            onFirstPage=lambda c, d: self._add_header_footer(c, d, "Personal Report"),
            onLaterPages=lambda c, d: self._add_header_footer(c, d, "Personal Report")
        )
        
        buffer.seek(0)
        return buffer
    
    async def generate_clinical_summary(
        self,
        user_info: Dict[str, Any],
        analyses: List[Dict],
        recommendations: List[Dict]
    ) -> io.BytesIO:
        """Generate Clinical Summary Report for healthcare providers"""
        
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=inch, bottomMargin=inch)
        story = []
        
        # Calculate statistics
        stats = self._calculate_statistics(analyses)
        
        # Title Page
        story.append(Paragraph("Clinical Mental Health Summary", self.styles['ReportTitle']))
        story.append(Spacer(1, 0.3*inch))
        
        # Patient Information
        story.append(Paragraph("Patient Information", self.styles['SectionHeader']))
        
        patient_data = [
            ["Patient ID:", user_info.get('user_id', 'N/A')],
            ["Report Date:", datetime.now().strftime("%B %d, %Y")],
            ["Observation Period:", f"{stats['date_range']['days']} days" if stats.get('date_range') else "N/A"],
            ["Data Points:", str(stats['total_analyses'])],
            ["Date Range:", f"{stats['date_range']['start'].strftime('%m/%d/%Y') if stats.get('date_range') and stats['date_range']['start'] else 'N/A'} to {stats['date_range']['end'].strftime('%m/%d/%Y') if stats.get('date_range') and stats['date_range']['end'] else 'N/A'}"]
        ]
        
        patient_table = Table(patient_data, colWidths=[2*inch, 4*inch])
        patient_table.setStyle(TableStyle([
            ('FONT', (0, 0), (-1, -1), 'Helvetica', 10),
            ('FONT', (0, 0), (0, -1), 'Helvetica-Bold', 10),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#2c5f8d')),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f0f0f0'))
        ]))
        
        story.append(patient_table)
        story.append(Spacer(1, 0.4*inch))
        
        # Chief Concerns
        story.append(Paragraph("Chief Concerns & Presenting Issues", self.styles['SectionHeader']))
        
        if stats.get('risk_indicators'):
            for indicator in stats['risk_indicators']:
                level_color = colors.red if indicator['level'] == 'High' else colors.orange
                story.append(Paragraph(
                    f"<font color='{level_color.hexval()}'><b>[{indicator['level']}]</b></font> {indicator['description']}",
                    self.styles['Clinical']
                ))
        else:
            story.append(Paragraph(
                "No significant risk indicators identified during observation period.",
                self.styles['Clinical']
            ))
        
        story.append(Spacer(1, 0.3*inch))
        
        # Clinical Observations
        story.append(Paragraph("Clinical Observations", self.styles['SectionHeader']))
        
        # Mood Assessment
        story.append(Paragraph("<b>Mood Assessment:</b>", self.styles['Normal']))
        
        total = stats['total_analyses']
        pos_pct = stats['sentiment_distribution']['positive'] / total * 100
        neu_pct = stats['sentiment_distribution']['neutral'] / total * 100
        neg_pct = stats['sentiment_distribution']['negative'] / total * 100
        
        mood_text = f"""
        Analysis of {total} communication samples reveals the following mood distribution:
        Positive affect present in {pos_pct:.1f}% of samples, neutral affect in {neu_pct:.1f}%, 
        and negative affect in {neg_pct:.1f}% of samples. Average confidence level: {stats['average_confidence']*100:.1f}%.
        """
        story.append(Paragraph(mood_text, self.styles['Clinical']))
        story.append(Spacer(1, 0.2*inch))
        
        # Mood Trends Visualization
        mood_chart = self._create_mood_chart(analyses)
        if mood_chart:
            story.append(Image(mood_chart, width=6.5*inch, height=3*inch))
            story.append(Spacer(1, 0.3*inch))
        
        # Emotional Profile
        story.append(PageBreak())
        story.append(Paragraph("<b>Emotional Profile:</b>", self.styles['Normal']))
        
        if stats['emotion_counts']:
            top_emotions = stats['emotion_counts'].most_common(5)
            emotions_text = "Predominant emotional expressions: " + ", ".join([
                f"{emotion} ({count} instances)" for emotion, count in top_emotions
            ])
            story.append(Paragraph(emotions_text, self.styles['Clinical']))
            story.append(Spacer(1, 0.2*inch))
            
            # Emotion chart
            emotion_chart = self._create_emotion_distribution_chart(analyses)
            if emotion_chart:
                story.append(Image(emotion_chart, width=5*inch, height=4*inch))
                story.append(Spacer(1, 0.3*inch))
        
        # Behavioral Patterns
        story.append(Paragraph("<b>Behavioral Patterns:</b>", self.styles['Normal']))
        
        if stats.get('patterns'):
            for pattern in stats['patterns']:
                story.append(Paragraph(f"• {pattern}", self.styles['Clinical']))
        else:
            story.append(Paragraph("No significant behavioral patterns identified.", self.styles['Clinical']))
        
        story.append(Spacer(1, 0.3*inch))
        
        # Activity Timeline
        activity_chart = self._create_activity_chart(analyses)
        if activity_chart:
            story.append(Paragraph("<b>Communication Activity Timeline:</b>", self.styles['Normal']))
            story.append(Image(activity_chart, width=6.5*inch, height=3*inch))
            story.append(Spacer(1, 0.3*inch))
        
        # Clinical Impressions
        story.append(PageBreak())
        story.append(Paragraph("Clinical Impressions", self.styles['SectionHeader']))
        
        impressions_text = f"""
        Based on computational analysis of communication patterns over a {stats['date_range']['days']}-day period, 
        the following clinical impressions are noted:
        """
        story.append(Paragraph(impressions_text, self.styles['Clinical']))
        story.append(Spacer(1, 0.2*inch))
        
        # Generate impressions based on data
        impressions = []
        
        if neg_pct > 60:
            impressions.append("Predominantly negative affective presentation suggesting possible mood disorder requiring further clinical evaluation.")
        elif neg_pct > 40:
            impressions.append("Elevated negative affect noted, warranting continued monitoring and potential intervention.")
        else:
            impressions.append("Generally stable emotional presentation with appropriate range of affect.")
        
        if stats['emotion_counts']:
            dominant = stats['emotion_counts'].most_common(1)[0]
            if dominant[1] > total * 0.5:
                impressions.append(f"Marked predominance of {dominant[0]} expression may indicate restricted emotional range.")
        
        if stats.get('risk_indicators'):
            impressions.append("Risk factors identified requiring clinical attention and possible intervention.")
        
        for impression in impressions:
            story.append(Paragraph(f"• {impression}", self.styles['Clinical']))
        
        story.append(Spacer(1, 0.3*inch))
        
        # Treatment Recommendations
        story.append(Paragraph("Treatment Recommendations", self.styles['SectionHeader']))
        
        if recommendations:
            story.append(Paragraph(
                "Evidence-based interventions recommended based on identified patterns:",
                self.styles['Clinical']
            ))
            story.append(Spacer(1, 0.2*inch))
            
            for i, rec in enumerate(recommendations[:5], 1):
                story.append(Paragraph(
                    f"<b>{i}. {rec['title']}</b> ({rec.get('category', 'General')})",
                    self.styles['Normal']
                ))
                story.append(Paragraph(rec['description'], self.styles['Clinical']))
                story.append(Spacer(1, 0.15*inch))
        
        # Follow-up Recommendations
        story.append(Spacer(1, 0.3*inch))
        story.append(Paragraph("Follow-up Recommendations", self.styles['SectionHeader']))
        
        followup = [
            "Continue monitoring communication patterns and emotional presentation",
            "Consider formal psychological assessment if symptoms persist or worsen",
            "Regular therapeutic sessions recommended to address identified patterns",
            "Medication evaluation may be warranted if mood symptoms are severe",
            "Re-assessment in 30-60 days to track progress and treatment response"
        ]
        
        for item in followup:
            story.append(Paragraph(f"• {item}", self.styles['Clinical']))
        
        story.append(Spacer(1, 0.4*inch))
        
        # Disclaimer
        story.append(PageBreak())
        story.append(Paragraph("Important Disclaimer", self.styles['SectionHeader']))
        
        disclaimer = """
        <b>This clinical summary is generated using AI-assisted computational analysis of communication patterns 
        and is intended to supplement, not replace, professional clinical judgment.</b><br/><br/>
        
        This report should be interpreted in the context of:
        • Direct clinical interview and assessment
        • Patient history and presenting complaints
        • Other diagnostic information and testing
        • Clinical observation and mental status examination<br/><br/>
        
        The analyzing clinician should use their professional judgment in interpreting these findings and 
        determining appropriate diagnostic and treatment recommendations. This tool does not provide diagnoses 
        or treatment decisions.<br/><br/>
        
        <i>Generated by Mental Health Analysis System v1.0</i>
        """
        
        story.append(Paragraph(disclaimer, self.styles['Normal']))
        
        # Build PDF
        doc.build(
            story,
            onFirstPage=lambda c, d: self._add_header_footer(c, d, "Clinical Summary"),
            onLaterPages=lambda c, d: self._add_header_footer(c, d, "Clinical Summary")
        )
        
        buffer.seek(0)
        return buffer
    
    async def generate_data_charts_report(
        self,
        user_info: Dict[str, Any],
        analyses: List[Dict]
    ) -> io.BytesIO:
        """Generate comprehensive data charts and visualizations report"""
        
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.75*inch, bottomMargin=0.75*inch)
        story = []
        
        # Title
        story.append(Paragraph("Mental Health Data Analysis Charts", self.styles['ReportTitle']))
        story.append(Spacer(1, 0.3*inch))
        
        # Report Info
        story.append(Paragraph(
            f"Generated: {datetime.now().strftime('%B %d, %Y at %I:%M %p')}",
            self.styles['Footer']
        ))
        story.append(Paragraph(
            f"Total Data Points: {len(analyses)}",
            self.styles['Footer']
        ))
        story.append(Spacer(1, 0.5*inch))
        
        # Chart 1: Mood Trends Over Time
        story.append(Paragraph("1. Mood Trends Over Time", self.styles['SectionHeader']))
        mood_chart = self._create_mood_chart(analyses)
        if mood_chart:
            story.append(Image(mood_chart, width=7*inch, height=3.5*inch))
        story.append(Spacer(1, 0.5*inch))
        
        # Chart 2: Emotion Distribution
        story.append(PageBreak())
        story.append(Paragraph("2. Emotion Distribution Analysis", self.styles['SectionHeader']))
        emotion_chart = self._create_emotion_distribution_chart(analyses)
        if emotion_chart:
            story.append(Image(emotion_chart, width=5.5*inch, height=4.5*inch))
        story.append(Spacer(1, 0.5*inch))
        
        # Chart 3: Daily Activity
        story.append(PageBreak())
        story.append(Paragraph("3. Daily Analysis Activity", self.styles['SectionHeader']))
        activity_chart = self._create_activity_chart(analyses)
        if activity_chart:
            story.append(Image(activity_chart, width=7*inch, height=3.5*inch))
        story.append(Spacer(1, 0.5*inch))
        
        # Statistics Table
        story.append(PageBreak())
        story.append(Paragraph("4. Statistical Summary", self.styles['SectionHeader']))
        
        stats = self._calculate_statistics(analyses)
        
        total = stats['total_analyses']
        stats_data = [
            ["Metric", "Value"],
            ["Total Analyses", str(total)],
            ["Date Range", f"{stats['date_range']['days']} days" if stats.get('date_range') else "N/A"],
            ["Positive Messages", f"{stats['sentiment_distribution']['positive']} ({stats['sentiment_distribution']['positive']/total*100:.1f}%)"],
            ["Neutral Messages", f"{stats['sentiment_distribution']['neutral']} ({stats['sentiment_distribution']['neutral']/total*100:.1f}%)"],
            ["Negative Messages", f"{stats['sentiment_distribution']['negative']} ({stats['sentiment_distribution']['negative']/total*100:.1f}%)"],
            ["Average Confidence", f"{stats['average_confidence']*100:.1f}%"],
            ["Risk Indicators", str(len(stats.get('risk_indicators', [])))]
        ]
        
        stats_table = Table(stats_data, colWidths=[3*inch, 3*inch])
        stats_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2c5f8d')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f0f0f0')])
        ]))
        
        story.append(stats_table)
        
        # Build PDF
        doc.build(
            story,
            onFirstPage=lambda c, d: self._add_header_footer(c, d, "Data Charts"),
            onLaterPages=lambda c, d: self._add_header_footer(c, d, "Data Charts")
        )
        
        buffer.seek(0)
        return buffer


# Create singleton instance
report_generator = MentalHealthReportGenerator()

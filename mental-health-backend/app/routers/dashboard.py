from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import StreamingResponse
from ..models.schemas import DashboardResponse, MoodTrendsResponse, SuggestionsResponse, Suggestion
from ..services.analysis_service import analysis_service
from ..services.recommendation_service import recommendation_engine
from ..services.report_service import report_generator
from ..core.security import get_current_user
from typing import List
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/stats", response_model=DashboardResponse)
async def get_dashboard_stats(
    time_range: str = Query("30d", regex="^(7d|30d|90d)$"),
    current_user: dict = Depends(get_current_user)
):
    """Get dashboard statistics for the user"""
    try:
        stats = await analysis_service.get_dashboard_data(
            user_id=current_user["user_id"],
            time_range=time_range
        )
        
        return DashboardResponse(**stats)
    
    except Exception as e:
        logger.error(f"Dashboard stats error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to get dashboard statistics"
        )

@router.get("/mood-trends", response_model=MoodTrendsResponse)
async def get_mood_trends(
    time_range: str = Query("30d", regex="^(7d|30d|90d)$"),
    current_user: dict = Depends(get_current_user)
):
    """Get mood trends for the user"""
    try:
        trends = await analysis_service.get_mood_trends(
            user_id=current_user["user_id"],
            time_range=time_range
        )
        
        return MoodTrendsResponse(**trends)
    
    except Exception as e:
        logger.error(f"Mood trends error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to get mood trends"
        )

@router.get("/suggestions", response_model=SuggestionsResponse)
async def get_suggestions(current_user: dict = Depends(get_current_user)):
    """Get personalized, evidence-based suggestions based on user's analysis history (now includes bulk import data)"""
    try:
        # Get recent analyses to base suggestions on (last 20 for good pattern detection)
        # This now includes bulk import messages that were saved to analysis_history
        recent_analyses = await analysis_service.get_user_analyses(
            user_id=current_user["user_id"],
            limit=20
        )
        
        # Generate intelligent recommendations using the recommendation engine
        recommendations, based_on_analysis = recommendation_engine.generate_recommendations(
            analyses=recent_analyses,
            max_suggestions=8
        )
        
        # Convert to Suggestion objects
        suggestions = [
            Suggestion(
                title=rec["title"],
                description=rec["description"],
                category=rec["category"],
                priority=rec["priority"],
                blog_id=rec.get("blog_id"),
                external_url=rec.get("external_url")
            )
            for rec in recommendations
        ]
        
        return SuggestionsResponse(
            suggestions=suggestions,
            basedOnAnalysis=based_on_analysis
        )
    
    except Exception as e:
        logger.error(f"Suggestions error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to get suggestions"
        )

@router.get("/export")
async def export_data(
    time_range: str = Query("30d", regex="^(7d|30d|90d)$"),
    format: str = Query("json", regex="^(json|csv)$"),
    current_user: dict = Depends(get_current_user)
):
    """Export user's analysis data"""
    try:
        # Get user's analysis history
        analyses = await analysis_service.get_user_analyses(
            user_id=current_user["user_id"],
            limit=1000  # Large limit for export
        )
        
        # Get dashboard stats
        stats = await analysis_service.get_dashboard_data(
            user_id=current_user["user_id"],
            time_range=time_range
        )
        
        export_data = {
            "export_date": analysis_service.datetime.utcnow().isoformat(),
            "time_range": time_range,
            "summary": stats,
            "analyses": analyses,
            "total_records": len(analyses)
        }
        
        if format == "json":
            return export_data
        else:
            # For CSV format, flatten the data structure
            csv_data = []
            for analysis in analyses:
                csv_row = {
                    "timestamp": analysis.get("timestamp", ""),
                    "message": analysis.get("message", ""),
                    "sentiment": analysis.get("sentiment", ""),
                    "confidence": analysis.get("confidence", ""),
                    "emotions": str(analysis.get("emotions", {})),
                    "emoji_analysis": str(analysis.get("emoji_analysis", {}))
                }
                csv_data.append(csv_row)
            
            return {
                "format": "csv",
                "data": csv_data,
                "summary": stats
            }
    
    except Exception as e:
        logger.error(f"Export data error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to export data"
        )


@router.get("/reports/personal")
async def generate_personal_report(
    time_range: str = Query("30d", regex="^(7d|30d|90d|all)$"),
    current_user: dict = Depends(get_current_user)
):
    """Generate Personal Mental Health Report PDF"""
    try:
        # Get user's analysis history with time range filtering
        analyses = await analysis_service.get_user_analyses(
            user_id=current_user["user_id"],
            limit=1000,
            time_range=time_range
        )
        
        if not analyses:
            raise HTTPException(
                status_code=404,
                detail="No analysis data found. Please analyze some messages first."
            )
        
        # Get recommendations
        recommendations, _ = recommendation_engine.generate_recommendations(
            analyses=analyses,
            max_suggestions=8
        )
        
        # User info
        user_info = {
            'user_id': current_user["user_id"],
            'name': current_user.get("name", "User"),
            'email': current_user.get("email", "")
        }
        
        # Generate PDF
        pdf_buffer = await report_generator.generate_personal_report(
            user_info=user_info,
            analyses=analyses,
            recommendations=recommendations
        )
        
        # Generate filename with timestamp
        filename = f"Mental_Health_Personal_Report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Personal report generation error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate personal report: {str(e)}"
        )


@router.get("/reports/clinical")
async def generate_clinical_summary(
    time_range: str = Query("30d", regex="^(7d|30d|90d|all)$"),
    current_user: dict = Depends(get_current_user)
):
    """Generate Clinical Summary Report PDF for healthcare providers"""
    try:
        # Get user's analysis history with time range filtering
        analyses = await analysis_service.get_user_analyses(
            user_id=current_user["user_id"],
            limit=1000,
            time_range=time_range
        )
        
        if not analyses:
            raise HTTPException(
                status_code=404,
                detail="No analysis data found. Please analyze some messages first."
            )
        
        # Get recommendations
        recommendations, _ = recommendation_engine.generate_recommendations(
            analyses=analyses,
            max_suggestions=8
        )
        
        # User info
        user_info = {
            'user_id': current_user["user_id"],
            'name': current_user.get("name", "Patient"),
            'email': current_user.get("email", "")
        }
        
        # Generate PDF
        pdf_buffer = await report_generator.generate_clinical_summary(
            user_info=user_info,
            analyses=analyses,
            recommendations=recommendations
        )
        
        # Generate filename with timestamp
        filename = f"Mental_Health_Clinical_Summary_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Clinical summary generation error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate clinical summary: {str(e)}"
        )


@router.get("/reports/charts")
async def generate_data_charts(
    time_range: str = Query("30d", regex="^(7d|30d|90d|all)$"),
    current_user: dict = Depends(get_current_user)
):
    """Generate comprehensive Data Charts PDF with all visualizations"""
    try:
        # Get user's analysis history with time range filtering
        analyses = await analysis_service.get_user_analyses(
            user_id=current_user["user_id"],
            limit=1000,
            time_range=time_range
        )
        
        if not analyses:
            raise HTTPException(
                status_code=404,
                detail="No analysis data found. Please analyze some messages first."
            )
        
        # User info
        user_info = {
            'user_id': current_user["user_id"],
            'name': current_user.get("name", "User"),
            'email': current_user.get("email", "")
        }
        
        # Generate PDF
        pdf_buffer = await report_generator.generate_data_charts_report(
            user_info=user_info,
            analyses=analyses
        )
        
        # Generate filename with timestamp
        filename = f"Mental_Health_Data_Charts_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Data charts generation error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate data charts: {str(e)}"
        )
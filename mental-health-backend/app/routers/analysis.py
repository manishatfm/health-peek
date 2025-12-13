from fastapi import APIRouter, HTTPException, Depends, status
from typing import List
from ..models.schemas import (
    MessageRequest, BulkMessageRequest, AnalysisResponse, BulkAnalysisResponse,
    ChatImportRequest, ChatAnalysisResponse
)
from ..services.sentiment_service import sentiment_service
from ..services.analysis_service import analysis_service
from ..services.chat_parser import chat_parser
from ..services.chat_analyzer import chat_analyzer
from ..core.security import get_current_user
from ..core.database import get_database
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analysis", tags=["Message Analysis"])

@router.post("/analyze", response_model=AnalysisResponse)
async def analyze_message(
    request: MessageRequest,
    current_user: dict = Depends(get_current_user)
):
    """Analyze a single message for sentiment and emotions"""
    try:
        logger.info(f"📝 Single message analysis request from user: {current_user['user_id']}")
        
        # Perform sentiment analysis
        sentiment, confidence, emotions = await sentiment_service.analyze_sentiment(request.message)
        
        # Get emoji analysis
        emoji_sentiment, emoji_confidence = sentiment_service.analyze_emoji_sentiment(request.message)
        emoji_analysis = {
            "sentiment": emoji_sentiment,
            "confidence": emoji_confidence
        } if emoji_sentiment != "neutral" else None
        
        # Save analysis to database
        analysis_id = await analysis_service.save_analysis(
            user_id=current_user["user_id"],
            message=request.message,
            sentiment=sentiment,
            confidence=confidence,
            emotions=emotions,
            emoji_analysis=emoji_analysis
        )
        
        logger.info(f"✅ Analysis complete, ID: {analysis_id}")
        
        return AnalysisResponse(
            message=request.message,
            sentiment=sentiment,
            confidence=confidence,
            emotions=emotions,
            emoji_analysis=emoji_analysis,
            timestamp=datetime.utcnow(),
            analysis_id=analysis_id
        )
    
    except Exception as e:
        logger.error(f"Analysis error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to analyze message"
        )

@router.post("/analyze-bulk", response_model=BulkAnalysisResponse)
async def analyze_bulk_messages(
    request: BulkMessageRequest,
    current_user: dict = Depends(get_current_user)
):
    """Analyze multiple messages in bulk"""
    try:
        logger.info(f"📦 Bulk analysis request from user: {current_user['user_id']}, messages: {len(request.messages)}")
        
        results = []
        sentiment_counts = {"positive": 0, "negative": 0, "neutral": 0}
        total_confidence = 0
        saved_count = 0
        
        for idx, message in enumerate(request.messages):
            # Perform sentiment analysis
            sentiment, confidence, emotions = await sentiment_service.analyze_sentiment(message)
            
            # Get emoji analysis
            emoji_sentiment, emoji_confidence = sentiment_service.analyze_emoji_sentiment(message)
            emoji_analysis = {
                "sentiment": emoji_sentiment,
                "confidence": emoji_confidence
            } if emoji_sentiment != "neutral" else None
            
            # Save analysis to database
            analysis_id = await analysis_service.save_analysis(
                user_id=current_user["user_id"],
                message=message,
                sentiment=sentiment,
                confidence=confidence,
                emotions=emotions,
                emoji_analysis=emoji_analysis
            )
            saved_count += 1
            logger.debug(f"  Saved bulk message {idx+1}/{len(request.messages)}: {analysis_id}")
            
            # Add to results
            result = AnalysisResponse(
                message=message,
                sentiment=sentiment,
                confidence=confidence,
                emotions=emotions,
                emoji_analysis=emoji_analysis,
                timestamp=datetime.utcnow(),
                analysis_id=analysis_id
            )
            results.append(result)
            
            # Update summary statistics
            sentiment_counts[sentiment] += 1
            total_confidence += confidence
        
        logger.info(f"✅ Bulk analysis complete: {saved_count}/{len(request.messages)} messages saved")
        
        # Calculate summary
        total_processed = len(results)
        avg_confidence = total_confidence / total_processed if total_processed > 0 else 0
        
        summary = {
            "total_messages": total_processed,
            "sentiment_distribution": sentiment_counts,
            "average_confidence": round(avg_confidence, 3),
            "processing_time": "completed"
        }
        
        return BulkAnalysisResponse(
            results=results,
            summary=summary,
            total_processed=total_processed
        )
    
    except Exception as e:
        logger.error(f"Bulk analysis error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to analyze messages in bulk"
        )

@router.get("/history")
async def get_analysis_history(
    limit: int = 50,
    offset: int = 0,
    current_user: dict = Depends(get_current_user)
):
    """Get user's analysis history"""
    try:
        logger.info(f"📚 History request from user: {current_user['user_id']}, limit={limit}, offset={offset}")
        
        analyses = await analysis_service.get_user_analyses(
            user_id=current_user["user_id"],
            limit=limit,
            offset=offset
        )
        
        logger.info(f"✅ Returning {len(analyses)} analyses")
        
        return {
            "analyses": analyses,
            "total": len(analyses),
            "limit": limit,
            "offset": offset
        }
    
    except Exception as e:
        logger.error(f"Get history error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get analysis history"
        )

@router.get("/history/{analysis_id}")
async def get_analysis_by_id(
    analysis_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get specific analysis by ID"""
    try:
        analysis = await analysis_service.get_analysis_by_id(analysis_id, current_user["user_id"])
        
        if not analysis:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Analysis not found"
            )
        
        return analysis
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get analysis by ID error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get analysis"
        )

@router.delete("/history/{analysis_id}")
async def delete_analysis(
    analysis_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete specific analysis"""
    try:
        success = await analysis_service.delete_analysis(analysis_id, current_user["user_id"])
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Analysis not found"
            )
        
        return {"message": "Analysis deleted successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete analysis error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete analysis"
        )

@router.delete("/history/by-date/{date}")
async def delete_analyses_by_date(
    date: str,  # Expected format: YYYY-MM-DD (e.g., "2025-11-07")
    current_user: dict = Depends(get_current_user)
):
    """Delete all single message analyses for a specific date"""
    try:
        from datetime import datetime
        
        # Parse the date string
        try:
            target_date = datetime.strptime(date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid date format. Use YYYY-MM-DD (e.g., 2025-11-07)"
            )
        
        # Define start and end of the day
        start_of_day = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = target_date.replace(hour=23, minute=59, second=59, microsecond=999999)
        
        logger.info(f"🗑️ Bulk delete request for date {date} from user: {current_user['user_id']}")
        
        # Delete all analyses for this date (excluding bulk imports)
        db = get_database()
        analysis_collection = db.analysis_history
        
        result = await analysis_collection.delete_many({
            "user_id": current_user["user_id"],
            "timestamp": {"$gte": start_of_day, "$lte": end_of_day},
            "$or": [
                {"source": {"$exists": False}},
                {"source": {"$ne": "bulk_import"}}
            ]
        })
        
        deleted_count = result.deleted_count
        
        logger.info(f"✅ Deleted {deleted_count} analyses for date {date} (user: {current_user['user_id']})")
        
        return {
            "message": f"Successfully deleted all analyses for {date}",
            "deleted_count": deleted_count,
            "date": date
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete by date error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete analyses by date: {str(e)}"
        )

@router.post("/import-chat", response_model=ChatAnalysisResponse)
async def import_and_analyze_chat(
    request: ChatImportRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Import chat history and perform comprehensive analysis
    Supports WhatsApp, Telegram, Discord, iMessage, and generic formats
    """
    try:
        logger.info(f"Chat import request from user {current_user['user_id']}")
        
        # Parse chat content
        messages, detected_format = chat_parser.parse(
            content=request.content,
            format_type=request.format_type
        )
        
        if not messages:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No messages could be parsed from the content. Please check the format."
            )
        
        logger.info(f"Parsed {len(messages)} messages, format: {detected_format}")
        
        # Perform comprehensive analysis
        analysis = chat_analyzer.analyze_conversation(
            messages=messages,
            current_user_name=request.current_user_name
        )
        
        # Save comprehensive chat analysis to chat_analyses collection
        db = get_database()
        chat_analysis_collection = db.chat_analyses
        
        analysis_doc = {
            "user_id": current_user["user_id"],
            "format_detected": detected_format,
            "total_messages": len(messages),
            "messages": [
                {
                    "timestamp": msg["timestamp"],
                    "sender": msg["sender"],
                    "message": msg["message"],
                    "platform": msg["platform"]
                }
                for msg in messages
            ],
            "analysis": analysis,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = await chat_analysis_collection.insert_one(analysis_doc)
        analysis_id = str(result.inserted_id)
        
        logger.info(f"✅ Chat analysis saved with ID: {analysis_id} (saved to chat_analyses collection)")
        
        # 🔥 Extract individual messages and save to analysis_history
        # This ensures bulk imports affect dashboard, mood trends, reports, and recommendations
        logger.info(f"📊 Extracting individual message sentiments for dashboard integration...")
        saved_individual_count = 0
        skipped_other_person = 0
        skipped_short_messages = 0
        
        # Identify the current user's messages for sentiment analysis
        current_user_identifier = request.current_user_name
        user_participants = []
        
        # Find which participant is "you"
        for participant_data in analysis['participants'].values():
            if participant_data.get('role') == 'you':
                user_participants.append(participant_data['name'])
        
        logger.info(f"🔍 Identified user participants: {user_participants if user_participants else 'NONE - Will skip all messages'}")
        
        # If user didn't provide their name, warn them and don't save any messages
        if not user_participants:
            logger.warning(f"⚠️ No user name provided! Skipping individual message saves to prevent incorrect data.")
            logger.warning(f"💡 User should provide 'current_user_name' parameter to save only their messages")
        
        # Process each message and save individual sentiment analyses
        for msg in messages:
            # ONLY save messages from the current user (when identified)
            # Never save other person's messages to prevent incorrect statistics
            should_save = False
            if user_participants and msg['sender'] in user_participants:
                should_save = True
            elif not user_participants:
                # Don't save if user didn't identify themselves
                skipped_other_person += 1
                continue
            else:
                # This is the other person's message - skip it
                skipped_other_person += 1
                continue
            
            if should_save:
                # Skip very short messages that are likely neutral (like "ok", "yes", "k")
                message_text = msg['message'].strip()
                word_count = len(message_text.split())
                
                # Skip messages with less than 3 words unless they have emojis or strong sentiment
                if word_count < 3:
                    # Check if message has emojis or punctuation indicating sentiment
                    import emoji
                    has_emojis = len(emoji.emoji_list(message_text)) > 0
                    has_strong_punctuation = ('!' in message_text or '?' in message_text * 2)
                    
                    if not has_emojis and not has_strong_punctuation:
                        skipped_short_messages += 1
                        continue
                
                # Analyze individual message sentiment
                sentiment, confidence, emotions = await sentiment_service.analyze_sentiment(msg['message'])
                
                # Skip if confidence is too low (likely neutral filler messages)
                if sentiment == "neutral" and confidence < 0.6:
                    skipped_short_messages += 1
                    continue
                
                # Get emoji analysis
                emoji_sentiment, emoji_confidence = sentiment_service.analyze_emoji_sentiment(msg['message'])
                emoji_analysis = {
                    "sentiment": emoji_sentiment,
                    "confidence": emoji_confidence
                } if emoji_sentiment != "neutral" else None
                
                # Save to analysis_history collection with original timestamp
                try:
                    # Use message timestamp instead of current time
                    analysis_doc = {
                        "user_id": current_user["user_id"],
                        "message": msg['message'],
                        "sentiment": sentiment,
                        "confidence": confidence,
                        "emotions": emotions,
                        "emoji_analysis": emoji_analysis,
                        "timestamp": msg['timestamp'],  # Use original message timestamp
                        "created_at": datetime.utcnow(),
                        "source": "bulk_import"  # Tag for tracking
                    }
                    
                    db = get_database()
                    await db.analysis_history.insert_one(analysis_doc)
                    saved_individual_count += 1
                except Exception as save_error:
                    logger.warning(f"Failed to save individual message analysis: {save_error}")
        
        logger.info(f"✅ Saved {saved_individual_count}/{len(messages)} individual message analyses to analysis_history")
        logger.info(f"📊 Skipped {skipped_other_person} messages from other person(s)")
        logger.info(f"📊 Skipped {skipped_short_messages} short/low-confidence neutral messages")
        logger.info(f"🎯 Bulk import data will now affect dashboard, mood trends, recommendations, and reports!")
        
        return ChatAnalysisResponse(
            analysis_id=analysis_id,
            participants=analysis['participants'],
            basic_stats=analysis['basic_stats'],
            messaging_patterns=analysis['messaging_patterns'],
            engagement_metrics=analysis['engagement_metrics'],
            sentiment_analysis=analysis['sentiment_analysis'],
            red_flags=analysis['red_flags'],
            emoji_stats=analysis['emoji_stats'],
            time_analysis=analysis['time_analysis'],
            conversation_period=analysis['conversation_period'],
            total_messages_analyzed=len(messages),
            format_detected=detected_format
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat import error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to import and analyze chat: {str(e)}"
        )

@router.get("/chat-history")
async def get_chat_analyses(
    limit: int = 20,
    offset: int = 0,
    current_user: dict = Depends(get_current_user)
):
    """Get user's chat analysis history (conversation imports - separate from single message analyses)"""
    try:
        logger.info(f"📱 Chat history request from user: {current_user['user_id']}")
        
        db = get_database()
        chat_analysis_collection = db.chat_analyses
        
        # Get total count
        total_count = await chat_analysis_collection.count_documents(
            {"user_id": current_user["user_id"]}
        )
        
        cursor = chat_analysis_collection.find(
            {"user_id": current_user["user_id"]}
        ).sort("created_at", -1).skip(offset).limit(limit)
        
        analyses = []
        async for doc in cursor:
            doc["id"] = str(doc["_id"])
            del doc["_id"]
            # Don't include full messages in list view
            if "messages" in doc:
                doc["messages_count"] = len(doc["messages"])
                del doc["messages"]
            analyses.append(doc)
        
        logger.info(f"✅ Returning {len(analyses)} chat analyses (total: {total_count})")
        
        return {
            "analyses": analyses,
            "total": total_count,
            "limit": limit,
            "offset": offset
        }
    
    except Exception as e:
        logger.error(f"Get chat history error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get chat analysis history"
        )

@router.get("/chat-history/{analysis_id}")
async def get_chat_analysis_by_id(
    analysis_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get specific chat analysis by ID"""
    try:
        from bson import ObjectId
        db = get_database()
        chat_analysis_collection = db.chat_analyses
        
        analysis = await chat_analysis_collection.find_one({
            "_id": ObjectId(analysis_id),
            "user_id": current_user["user_id"]
        })
        
        if not analysis:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Chat analysis not found"
            )
        
        analysis["id"] = str(analysis["_id"])
        del analysis["_id"]
        
        return analysis
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get chat analysis by ID error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get chat analysis"
        )

@router.post("/migrate-bulk-imports")
async def migrate_bulk_import_sources(
    current_user: dict = Depends(get_current_user)
):
    """
    Migration endpoint: Add 'source: bulk_import' to old bulk import messages
    This identifies messages that were imported as part of bulk imports but don't have the source field
    """
    try:
        db = get_database()
        analysis_collection = db.analysis_history
        chat_analyses_collection = db.chat_analyses
        
        # Get all chat analyses for this user to identify bulk import timestamps
        chat_analyses = await chat_analyses_collection.find(
            {"user_id": current_user["user_id"]}
        ).to_list(length=100)
        
        total_updated = 0
        
        for chat in chat_analyses:
            chat_timestamp = chat.get("created_at")
            if not chat_timestamp:
                continue
            
            # Find messages that were likely from this bulk import
            # They should have timestamps close to the chat analysis timestamp
            # and not already have a source field
            time_start = chat_timestamp - timedelta(minutes=5)
            time_end = chat_timestamp + timedelta(minutes=5)
            
            # Update messages without source field that match the time window
            result = await analysis_collection.update_many(
                {
                    "user_id": current_user["user_id"],
                    "source": {"$exists": False},
                    "timestamp": {"$gte": time_start, "$lte": time_end}
                },
                {
                    "$set": {"source": "bulk_import"}
                }
            )
            
            total_updated += result.modified_count
        
        logger.info(f"🔄 Migration: Updated {total_updated} bulk import messages for user: {current_user['user_id']}")
        
        return {
            "message": "Migration completed successfully",
            "updated_count": total_updated,
            "chat_analyses_checked": len(chat_analyses)
        }
    
    except Exception as e:
        logger.error(f"Migration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to migrate bulk imports: {str(e)}"
        )
async def delete_chat_import(
    chat_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a specific chat import and all its associated messages"""
    try:
        from bson import ObjectId
        db = get_database()
        chat_analyses_collection = db.chat_analyses
        analysis_collection = db.analysis_history
        
        # First, verify the chat analysis exists and belongs to the user
        chat_analysis = await chat_analyses_collection.find_one({
            "_id": ObjectId(chat_id),
            "user_id": current_user["user_id"]
        })
        
        if not chat_analysis:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Chat import not found"
            )
        
        # Get the timestamp to identify related messages
        chat_timestamp = chat_analysis.get("created_at")
        
        # Delete all individual messages from this bulk import
        # Messages are saved with the same timestamp (or very close) and source="bulk_import"
        # We'll use a 5-minute window to catch all messages from this import session
        time_start = chat_timestamp - timedelta(minutes=5)
        time_end = chat_timestamp + timedelta(minutes=5)
        
        messages_result = await analysis_collection.delete_many({
            "user_id": current_user["user_id"],
            "source": "bulk_import",
            "timestamp": {"$gte": time_start, "$lte": time_end}
        })
        
        # Delete the chat analysis document itself
        chat_result = await chat_analyses_collection.delete_one({
            "_id": ObjectId(chat_id),
            "user_id": current_user["user_id"]
        })
        
        deleted_messages = messages_result.deleted_count
        deleted_chat = chat_result.deleted_count > 0
        
        logger.info(f"🗑️ Deleted chat import {chat_id} and {deleted_messages} associated messages for user: {current_user['user_id']}")
        
        return {
            "message": "Chat import deleted successfully",
            "deleted_messages": deleted_messages,
            "deleted_chat_analysis": deleted_chat,
            "chat_id": chat_id
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete chat import error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete chat import: {str(e)}"
        )
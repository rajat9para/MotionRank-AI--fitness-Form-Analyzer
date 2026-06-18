from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class WorkoutSession(BaseModel):
    userId: str
    exerciseType: str
    reps: int = 0
    holdSeconds: int = 0
    goodFormSeconds: int = 0
    formScore: int = 0
    durationMinutes: int = 0
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class PersonalRecord(BaseModel):
    userId: str
    exerciseType: str
    bestReps: int = 0
    bestFormScore: int = 0
    bestDuration: int = 0
    bestHoldSeconds: int = 0
    updatedAt: datetime = Field(default_factory=datetime.utcnow)


class UserStats(BaseModel):
    userId: str
    totalReps: int = 0
    totalMinutes: int = 0
    currentStreak: int = 0
    longestStreak: int = 0
    updatedAt: datetime = Field(default_factory=datetime.utcnow)


class CommunityPost(BaseModel):
    userId: str
    text: str
    photoUrls: List[str] = []
    exerciseTag: Optional[str] = None
    likes: List[str] = []
    commentsCount: int = 0
    createdAt: datetime = Field(default_factory=datetime.utcnow)


class AdminAnnouncement(BaseModel):
    title: str
    body: str
    imageUrl: Optional[str] = None
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    createdBy: str = ""

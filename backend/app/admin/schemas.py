from datetime import datetime
from typing import Optional
from pydantic import BaseModel, field_validator


class AdminUserOut(BaseModel):
    id: int
    email: str
    email_verified: bool = False
    subscription_type: str
    subscription_end: Optional[datetime] = None
    is_admin: bool
    is_active: bool
    onboarding_completed: bool
    charts_count: int = 0
    ai_requests_month: int = 0
    created_at: datetime

    @field_validator("created_at", mode="before")
    @classmethod
    def parse_dt(cls, v):
        if isinstance(v, datetime):
            return v
        if isinstance(v, str):
            return datetime.fromisoformat(v.replace("Z", "+00:00"))
        return v

    model_config = {"from_attributes": True}


class AdminUserListResponse(BaseModel):
    users: list[AdminUserOut]
    total: int


class AdminUserUpdate(BaseModel):
    subscription_type: Optional[str] = None
    is_admin: Optional[bool] = None
    is_active: Optional[bool] = None


class AdminStats(BaseModel):
    total_users: int = 0
    premium_users: int = 0
    free_users: int = 0
    total_charts: int = 0
    ai_requests_today: int = 0
    ai_requests_month: int = 0
    ai_cost_month_rub: float = 0.0
    ai_input_tokens_month: int = 0
    ai_output_tokens_month: int = 0
    cost_per_1m_input_rub: float = 0.0
    cost_per_1m_output_rub: float = 0.0
    invites_generated: int = 0
    invites_used: int = 0


class AdminAuditLogOut(BaseModel):
    id: int
    entity_type: str
    entity_id: int
    entity_display: Optional[str] = None
    action: str
    old_values: Optional[dict] = None
    new_values: Optional[dict] = None
    user_id: Optional[int] = None
    ip_address: Optional[str] = None
    created_at: datetime

    @field_validator("created_at", mode="before")
    @classmethod
    def parse_dt(cls, v):
        if isinstance(v, datetime):
            return v
        if isinstance(v, str):
            return datetime.fromisoformat(v.replace("Z", "+00:00"))
        return v

    model_config = {"from_attributes": True}


class AdminAuditLogListResponse(BaseModel):
    logs: list[AdminAuditLogOut]
    total: int


class AdminTokenUsageOut(BaseModel):
    id: int
    user_id: int
    user_email: str = ""
    model: str
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    cost_usd: float
    created_at: datetime

    @field_validator("created_at", mode="before")
    @classmethod
    def parse_dt(cls, v):
        if isinstance(v, datetime):
            return v
        if isinstance(v, str):
            return datetime.fromisoformat(v.replace("Z", "+00:00"))
        return v

    model_config = {"from_attributes": True}


class AdminTokenUsageListResponse(BaseModel):
    entries: list[AdminTokenUsageOut]
    total: int


class AdminEarlySubscriberOut(BaseModel):
    id: int
    email: str
    source: Optional[str] = None
    ip_address: Optional[str] = None
    invited_by: Optional[int] = None
    is_registered: bool | str = False
    created_at: datetime

    @field_validator("created_at", mode="before")
    @classmethod
    def parse_dt(cls, v):
        if isinstance(v, datetime):
            return v
        if isinstance(v, str):
            return datetime.fromisoformat(v.replace("Z", "+00:00"))
        return v

    model_config = {"from_attributes": True}


class AdminEarlySubscriberListResponse(BaseModel):
    subscribers: list[AdminEarlySubscriberOut]
    total: int


class AdminInviteSubscriberResponse(BaseModel):
    code: str
    subscriber_email: str
    email_sent: bool = False


class AppSettingOut(BaseModel):
    key: str
    value: str
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class AdminSettingsResponse(BaseModel):
    settings: list[AppSettingOut]


class AdminSettingsUpdate(BaseModel):
    registration_open: bool | None = None
    ai_cost_per_1m_input_rub: float | None = None
    ai_cost_per_1m_output_rub: float | None = None
    smtp_host: str | None = None
    smtp_port: int | None = None
    smtp_user: str | None = None
    smtp_password: str | None = None
    smtp_from: str | None = None
    frontend_url: str | None = None


class AdminTokenUsageSummary(BaseModel):
    total_prompt_tokens: int = 0
    total_completion_tokens: int = 0
    total_tokens: int = 0
    total_cost_rub: float = 0.0
    total_requests: int = 0
    avg_cost_per_request: float = 0.0


class AdminTokenUsageByUser(BaseModel):
    user_id: int
    user_email: str = ""
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    cost_rub: float = 0.0
    requests: int = 0


class AdminTokenUsageByDate(BaseModel):
    date: str
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    cost_rub: float = 0.0
    requests: int = 0


class AdminTokenAnalyticsResponse(BaseModel):
    summary: AdminTokenUsageSummary
    by_user: list[AdminTokenUsageByUser] = []
    by_date: list[AdminTokenUsageByDate] = []
